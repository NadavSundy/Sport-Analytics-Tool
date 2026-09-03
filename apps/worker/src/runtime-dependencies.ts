import { readFileSync } from 'node:fs';

import { DefaultAzureCredential } from '@azure/identity';
import {
  ServiceBusClient,
  type ServiceBusReceivedMessage,
  type ServiceBusReceiver,
} from '@azure/service-bus';
import { BlobServiceClient } from '@azure/storage-blob';
import { Pool } from 'pg';

import type { WorkerEnvironment } from './config';
import type { DeliveryReceiver, DeliverySubscription, ReceivedJob } from './delivery-pump';

interface AzureReceivedJob extends ReceivedJob {
  raw: ServiceBusReceivedMessage;
}

function requireAzureMessage(message: ReceivedJob): AzureReceivedJob {
  if (!('raw' in message)) throw new Error('The received job has no Azure message context.');
  return message as AzureReceivedJob;
}

class AzureServiceBusDeliveryReceiver implements DeliveryReceiver {
  constructor(
    private readonly receiver: ServiceBusReceiver,
    private readonly concurrency: number,
  ) {}

  subscribe(handlers: {
    processError(error: Error): Promise<void>;
    processMessage(message: ReceivedJob): Promise<void>;
  }): DeliverySubscription {
    return this.receiver.subscribe(
      {
        processError: async (args) => handlers.processError(args.error),
        processMessage: async (raw) => {
          const message: AzureReceivedJob = {
            raw,
            body: raw.body,
            deliveryCount: raw.deliveryCount ?? 1,
            messageId: String(raw.messageId ?? 'missing-message-id'),
          };
          await handlers.processMessage(message);
        },
      },
      { autoCompleteMessages: false, maxConcurrentCalls: this.concurrency },
    );
  }

  complete(message: ReceivedJob): Promise<void> {
    return this.receiver.completeMessage(requireAzureMessage(message).raw);
  }

  abandon(message: ReceivedJob): Promise<void> {
    return this.receiver.abandonMessage(requireAzureMessage(message).raw);
  }

  deadLetter(message: ReceivedJob, reason: string, description: string): Promise<void> {
    return this.receiver.deadLetterMessage(requireAzureMessage(message).raw, {
      deadLetterReason: reason,
      deadLetterErrorDescription: description,
    });
  }

  close(): Promise<void> {
    return this.receiver.close();
  }
}

export interface RuntimeDependencies {
  checks: {
    database(): Promise<void>;
    objectStorage(): Promise<void>;
    serviceBus(): Promise<void>;
  };
  close(): Promise<void>;
  database: Pool;
  deliveryReceiver: DeliveryReceiver;
}

export function createRuntimeDependencies(environment: WorkerEnvironment): RuntimeDependencies {
  const credential = new DefaultAzureCredential(
    environment.AZURE_CLIENT_ID
      ? { managedIdentityClientId: environment.AZURE_CLIENT_ID }
      : undefined,
  );
  const database = new Pool({
    connectionString: environment.DATABASE_URL,
    ssl:
      environment.DATABASE_SSL_MODE === 'disable'
        ? false
        : {
            ca: readFileSync(environment.DATABASE_CA_CERT_PATH, 'utf8'),
            rejectUnauthorized: true,
          },
    max: Math.max(2, environment.WORKER_CONCURRENCY + 1),
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
    application_name: 'sport-analytics-worker',
  });
  database.on('error', () => console.error('Unexpected PostgreSQL worker pool error.'));

  const serviceBusClient = new ServiceBusClient(
    environment.SERVICE_BUS_FULLY_QUALIFIED_NAMESPACE,
    credential,
  );
  const queueReceiver = serviceBusClient.createReceiver(environment.SERVICE_BUS_QUEUE_NAME, {
    receiveMode: 'peekLock',
    maxAutoLockRenewalDurationInMs: environment.SERVICE_BUS_LOCK_RENEWAL_MS,
  });
  const healthReceiver = serviceBusClient.createReceiver(environment.SERVICE_BUS_QUEUE_NAME, {
    receiveMode: 'peekLock',
  });
  const blobService = new BlobServiceClient(
    `https://${environment.AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net`,
    credential,
  );
  const container = blobService.getContainerClient(environment.AZURE_STORAGE_CONTAINER_NAME);

  return {
    checks: {
      async database() {
        await database.query('SELECT 1');
      },
      async objectStorage() {
        const properties = await container.getProperties();
        if (properties.blobPublicAccess !== undefined) {
          throw new Error('Configured object-storage container permits public access.');
        }
      },
      async serviceBus() {
        await healthReceiver.peekMessages(1);
      },
    },
    database,
    deliveryReceiver: new AzureServiceBusDeliveryReceiver(
      queueReceiver,
      environment.WORKER_CONCURRENCY,
    ),
    async close() {
      await Promise.allSettled([healthReceiver.close(), serviceBusClient.close(), database.end()]);
    },
  };
}
