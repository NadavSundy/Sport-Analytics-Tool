import type { Pool } from 'pg';

import type { Logger } from './logger';

interface ClaimedOutboxMessage {
  outboxMessageId: string;
  body: unknown;
}

interface OutboxDelivery {
  messageId: string;
  body: unknown;
}

export interface OutboxSender {
  send(messages: OutboxDelivery[]): Promise<void>;
}

export interface OutboxRelayMetrics {
  claimed: number;
  publishFailures: number;
  published: number;
  cycles: number;
}

interface OutboxRelayOptions {
  workerId: string;
  pollIntervalMs: number;
  claimTtlMs: number;
  batchSize: number;
}

/**
 * Relays committed PostgreSQL outbox commands to Service Bus.
 *
 * A row is claimed with SKIP LOCKED, sent using its stable outbox UUID as the
 * broker MessageId, and only then marked published. A crash after broker
 * acknowledgement but before the final UPDATE can therefore redeliver the
 * same MessageId; duplicate detection and consumer idempotency make that safe.
 */
export class OutboxRelay {
  readonly metrics: OutboxRelayMetrics = {
    claimed: 0,
    publishFailures: 0,
    published: 0,
    cycles: 0,
  };

  private timer: NodeJS.Timeout | undefined;
  private active: Promise<void> | undefined;
  private stopping = false;

  constructor(
    private readonly database: Pool,
    private readonly sender: OutboxSender,
    private readonly logger: Logger,
    private readonly options: OutboxRelayOptions,
  ) {}

  start(): void {
    if (this.timer || this.active) throw new Error('Outbox relay has already started.');
    this.schedule(0);
  }

  private schedule(delayMs: number): void {
    if (this.stopping) return;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      const cycle = this.runCycle();
      this.active = cycle;
      void cycle.finally(() => {
        if (this.active === cycle) this.active = undefined;
        this.schedule(this.options.pollIntervalMs);
      });
    }, delayMs);
  }

  private async claim(): Promise<ClaimedOutboxMessage[]> {
    const result = await this.database.query<ClaimedOutboxMessage>(
      `
        WITH candidates AS (
          SELECT outbox_message_id
          FROM outbox_message
          WHERE published_at IS NULL
            AND (claim_expires_at IS NULL OR claim_expires_at < now())
          ORDER BY created_at ASC, outbox_message_id ASC
          FOR UPDATE SKIP LOCKED
          LIMIT $2::integer
        )
        UPDATE outbox_message AS message
        SET claim_owner = $1,
            claim_expires_at = now() + ($3::integer * interval '1 millisecond'),
            publish_attempts = message.publish_attempts + 1
        FROM candidates
        WHERE message.outbox_message_id = candidates.outbox_message_id
        RETURNING
          message.outbox_message_id::text AS "outboxMessageId",
          message.body
      `,
      [this.options.workerId, this.options.batchSize, this.options.claimTtlMs],
    );
    return result.rows;
  }

  private async markPublished(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.database.query(
      `
        UPDATE outbox_message
        SET published_at = now(), claim_owner = NULL, claim_expires_at = NULL
        WHERE outbox_message_id = ANY($1::uuid[])
          AND claim_owner = $2
          AND published_at IS NULL
      `,
      [ids, this.options.workerId],
    );
  }

  private async release(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.database.query(
      `
        UPDATE outbox_message
        SET claim_owner = NULL, claim_expires_at = NULL
        WHERE outbox_message_id = ANY($1::uuid[])
          AND claim_owner = $2
          AND published_at IS NULL
      `,
      [ids, this.options.workerId],
    );
  }

  async runCycle(): Promise<void> {
    if (this.stopping) return;
    this.metrics.cycles += 1;

    let claimed: ClaimedOutboxMessage[];
    try {
      claimed = await this.claim();
    } catch (error) {
      this.metrics.publishFailures += 1;
      this.logger.warn('Outbox claim failed.', {
        errorName: error instanceof Error ? error.name : 'UnknownError',
      });
      return;
    }

    if (claimed.length === 0) return;
    this.metrics.claimed += claimed.length;
    const ids = claimed.map((message) => message.outboxMessageId);

    try {
      await this.sender.send(
        claimed.map((message) => ({ messageId: message.outboxMessageId, body: message.body })),
      );
      await this.markPublished(ids);
      this.metrics.published += claimed.length;
      this.logger.info('Outbox commands published.', { count: claimed.length });
    } catch (error) {
      this.metrics.publishFailures += 1;
      try {
        await this.release(ids);
      } catch {
        // The lease is time-bounded. A failed release cannot strand an outbox row.
      }
      this.logger.warn('Outbox publish failed; commands remain retryable.', {
        count: claimed.length,
        errorName: error instanceof Error ? error.name : 'UnknownError',
      });
    }
  }

  async stop(): Promise<void> {
    this.stopping = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    await this.active;
  }
}
