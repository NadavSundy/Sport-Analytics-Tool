import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { DefaultAzureCredential } from '@azure/identity';
import {
  ServiceBusClient,
  type ServiceBusReceivedMessage,
  type ServiceBusReceiver,
} from '@azure/service-bus';
import { BlobServiceClient, type ContainerClient } from '@azure/storage-blob';
import { FilesystemObjectStore, type ObjectStore } from '@sport-analytics/object-storage';
import { Pool } from 'pg';

import { AzureBlobObjectStore } from './azure-blob-object-store';
import type { WorkerEnvironment } from './config';
import { DatabaseDeliveryReceiver } from './database-delivery-receiver';
import type { DeliveryReceiver, DeliverySubscription, ReceivedJob } from './delivery-pump';
import type { OutboxSender } from './outbox-relay';

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
  complete(message: ReceivedJob) {
    return this.receiver.completeMessage(requireAzureMessage(message).raw);
  }
  abandon(message: ReceivedJob) {
    return this.receiver.abandonMessage(requireAzureMessage(message).raw);
  }
  deadLetter(message: ReceivedJob, reason: string, description: string) {
    return this.receiver.deadLetterMessage(requireAzureMessage(message).raw, {
      deadLetterReason: reason,
      deadLetterErrorDescription: description,
    });
  }
  close() {
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
  outboxSender: OutboxSender;
  useOutboxRelay: boolean;
  ingestionObjectStorage: Pick<ObjectStore, 'read'>;
  releaseObjectStorage: ObjectStore;
}

async function checkPrivate(container: ContainerClient) {
  const properties = await container.getProperties();
  if (properties.blobPublicAccess !== undefined)
    throw new Error('Configured object-storage container permits public access.');
}

export function createRuntimeDependencies(environment: WorkerEnvironment): RuntimeDependencies {
  const database = new Pool({
    connectionString: environment.DATABASE_URL,
    ssl:
      environment.DATABASE_SSL_MODE === 'disable'
        ? false
        : { ca: readFileSync(environment.DATABASE_CA_CERT_PATH, 'utf8'), rejectUnauthorized: true },
    max: Math.max(2, environment.WORKER_CONCURRENCY + 1),
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
    application_name: 'sport-analytics-worker',
  });
  database.on('error', () => console.error('Unexpected PostgreSQL worker pool error.'));

  const closeables: Array<{ close(): Promise<void> }> = [];
  let ingestionObjectStorage: ObjectStore;
  let releaseObjectStorage: ObjectStore;
  let storageCheck: () => Promise<void>;
  const credential = new DefaultAzureCredential(
    environment.AZURE_CLIENT_ID
      ? { managedIdentityClientId: environment.AZURE_CLIENT_ID }
      : undefined,
  );

  if (environment.OBJECT_STORAGE_PROVIDER === 'azure') {
    const account = environment.AZURE_STORAGE_ACCOUNT_NAME!;
    const ingestionName =
      environment.AZURE_STORAGE_INGESTION_CONTAINER_NAME ??
      environment.AZURE_STORAGE_CONTAINER_NAME!;
    const releaseName = environment.AZURE_STORAGE_RELEASE_CONTAINER_NAME!;
    const blobService = new BlobServiceClient(
      `https://${account}.blob.core.windows.net`,
      credential,
    );
    const ingestion = blobService.getContainerClient(ingestionName);
    const releases = blobService.getContainerClient(releaseName);
    ingestionObjectStorage = new AzureBlobObjectStore(ingestion);
    releaseObjectStorage = new AzureBlobObjectStore(releases);
    storageCheck = async () => {
      await Promise.all([checkPrivate(ingestion), checkPrivate(releases)]);
    };
  } else {
    const root = environment.OBJECT_STORAGE_FILESYSTEM_ROOT!;
    ingestionObjectStorage = new FilesystemObjectStore(resolve(root, 'staged-ingestion'));
    releaseObjectStorage = new FilesystemObjectStore(resolve(root, 'dataset-releases'));
    storageCheck = async () => undefined;
  }

  let deliveryReceiver: DeliveryReceiver;
  let outboxSender: OutboxSender;
  let serviceBusCheck: () => Promise<void>;
  let useOutboxRelay = false;
  if (environment.WORKER_TRANSPORT_PROVIDER === 'azure-service-bus') {
    const serviceBus = new ServiceBusClient(
      environment.SERVICE_BUS_FULLY_QUALIFIED_NAMESPACE!,
      credential,
    );
    const sender = serviceBus.createSender(environment.SERVICE_BUS_QUEUE_NAME!);
    const receiver = serviceBus.createReceiver(environment.SERVICE_BUS_QUEUE_NAME!, {
      receiveMode: 'peekLock',
      maxAutoLockRenewalDurationInMs: environment.SERVICE_BUS_LOCK_RENEWAL_MS,
    });
    const healthReceiver = serviceBus.createReceiver(environment.SERVICE_BUS_QUEUE_NAME!, {
      receiveMode: 'peekLock',
    });
    closeables.push(sender, healthReceiver, serviceBus);
    deliveryReceiver = new AzureServiceBusDeliveryReceiver(
      receiver,
      environment.WORKER_CONCURRENCY,
    );
    outboxSender = {
      async send(messages) {
        for (const message of messages)
          await sender.sendMessages({
            messageId: message.messageId,
            body: message.body,
            contentType: 'application/json',
          });
      },
    };
    serviceBusCheck = async () => {
      await healthReceiver.peekMessages(1);
    };
    useOutboxRelay = true;
  } else {
    deliveryReceiver = new DatabaseDeliveryReceiver(
      database,
      environment.workerId,
      environment.OUTBOX_POLL_INTERVAL_MS,
    );
    outboxSender = {
      async send() {
        throw new Error('The local database transport does not use an outbox relay.');
      },
    };
    serviceBusCheck = async () => {
      await database.query('SELECT 1');
    };
  }

  return {
    checks: {
      async database() {
        await database.query('SELECT 1');
      },
      objectStorage: storageCheck,
      serviceBus: serviceBusCheck,
    },
    database,
    deliveryReceiver,
    outboxSender,
    useOutboxRelay,
    ingestionObjectStorage,
    releaseObjectStorage,
    async close() {
      await Promise.allSettled([...closeables.map((item) => item.close()), database.end()]);
    },
  };
}
