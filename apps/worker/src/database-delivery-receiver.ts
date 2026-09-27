import type { Pool } from 'pg';

import type { DeliveryReceiver, DeliverySubscription, ReceivedJob } from './delivery-pump';

interface DatabaseReceivedJob extends ReceivedJob {
  outboxMessageId: string;
}

function requireDatabaseMessage(message: ReceivedJob): DatabaseReceivedJob {
  if (!('outboxMessageId' in message))
    throw new Error('The received job has no database outbox context.');
  return message as DatabaseReceivedJob;
}

/** Local-only transport that consumes the transactional outbox without Azure Service Bus. */
export class DatabaseDeliveryReceiver implements DeliveryReceiver {
  private timer: NodeJS.Timeout | undefined;
  private closed = false;
  private polling = false;

  constructor(
    private readonly database: Pool,
    private readonly workerId: string,
    private readonly pollMs: number,
  ) {}

  subscribe(handlers: {
    processError(error: Error): Promise<void>;
    processMessage(message: ReceivedJob): Promise<void>;
  }): DeliverySubscription {
    const poll = async () => {
      if (this.closed || this.polling) return;
      this.polling = true;
      try {
        const result = await this.database.query<{
          outboxMessageId: string;
          body: unknown;
          deliveryCount: number;
        }>(
          `
          WITH candidate AS (
            SELECT outbox_message_id FROM outbox_message
            WHERE published_at IS NULL AND (claim_expires_at IS NULL OR claim_expires_at < now())
            ORDER BY created_at,outbox_message_id FOR UPDATE SKIP LOCKED LIMIT 1
          )
          UPDATE outbox_message m SET claim_owner=$1,claim_expires_at=now()+interval '5 minutes',publish_attempts=publish_attempts+1
          FROM candidate WHERE m.outbox_message_id=candidate.outbox_message_id
          RETURNING m.outbox_message_id::text AS "outboxMessageId",m.body,m.publish_attempts AS "deliveryCount"`,
          [this.workerId],
        );
        const row = result.rows[0];
        if (row) await handlers.processMessage({ ...row, messageId: row.outboxMessageId });
      } catch (error) {
        await handlers.processError(
          error instanceof Error ? error : new Error('Database delivery failed.'),
        );
      } finally {
        this.polling = false;
      }
    };
    this.timer = setInterval(() => void poll(), this.pollMs);
    void poll();
    return {
      close: async () => {
        if (this.timer) clearInterval(this.timer);
      },
    };
  }

  async complete(message: ReceivedJob): Promise<void> {
    const item = requireDatabaseMessage(message);
    await this.database.query(
      `UPDATE outbox_message SET published_at=now(),claim_owner=NULL,claim_expires_at=NULL WHERE outbox_message_id=$1::uuid AND claim_owner=$2`,
      [item.outboxMessageId, this.workerId],
    );
  }

  async abandon(message: ReceivedJob): Promise<void> {
    const item = requireDatabaseMessage(message);
    await this.database.query(
      `UPDATE outbox_message SET claim_owner=NULL,claim_expires_at=NULL WHERE outbox_message_id=$1::uuid AND claim_owner=$2`,
      [item.outboxMessageId, this.workerId],
    );
  }

  async deadLetter(message: ReceivedJob, reason: string, description: string): Promise<void> {
    const item = requireDatabaseMessage(message);
    const client = await this.database.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE background_job j SET state='dead_lettered',completed_at=now(),last_error_code=$2,last_error_message=$3 FROM outbox_message m WHERE m.outbox_message_id=$1::uuid AND j.job_id=m.job_id AND j.state<>'succeeded'`,
        [item.outboxMessageId, reason, description.slice(0, 500)],
      );
      await client.query(
        `UPDATE outbox_message SET published_at=now(),claim_owner=NULL,claim_expires_at=NULL WHERE outbox_message_id=$1::uuid AND claim_owner=$2`,
        [item.outboxMessageId, this.workerId],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    this.closed = true;
    if (this.timer) clearInterval(this.timer);
  }
}
