import { beforeEach, describe, expect, it, vi } from 'vitest';

const runtime = vi.hoisted(() => {
  const ingestion = { getProperties: vi.fn() };
  const releases = { getProperties: vi.fn() };
  const sender = { sendMessages: vi.fn(), close: vi.fn() };
  const receiver = {
    subscribe: vi.fn(),
    completeMessage: vi.fn(),
    abandonMessage: vi.fn(),
    deadLetterMessage: vi.fn(),
    close: vi.fn(),
  };
  const healthReceiver = { peekMessages: vi.fn(), close: vi.fn() };
  const serviceBus = {
    createSender: vi.fn(),
    createReceiver: vi.fn(),
    close: vi.fn(),
  };
  const database = {
    on: vi.fn(),
    query: vi.fn(),
    end: vi.fn(),
    options: {},
  };
  return {
    blobUrls: [] as string[],
    credentialOptions: [] as unknown[],
    database,
    healthReceiver,
    ingestion,
    poolOptions: undefined as unknown,
    receiver,
    releases,
    sender,
    serviceBus,
    subscribedHandlers: undefined as
      | {
          processError(args: { error: Error }): Promise<void>;
          processMessage(raw: Record<string, unknown>): Promise<void>;
        }
      | undefined,
  };
});

vi.mock('pg', () => ({
  Pool: function FakePool(options: unknown) {
    runtime.poolOptions = options;
    return runtime.database;
  },
}));

vi.mock('@azure/identity', () => ({
  DefaultAzureCredential: class {
    constructor(options: unknown) {
      runtime.credentialOptions.push(options);
    }
  },
}));

vi.mock('@azure/storage-blob', () => ({
  BlobServiceClient: class {
    constructor(url: string) {
      runtime.blobUrls.push(url);
    }
    getContainerClient(name: string) {
      return name === 'private-ingestion' ? runtime.ingestion : runtime.releases;
    }
  },
}));

vi.mock('@azure/service-bus', () => ({
  ServiceBusClient: class {
    constructor(namespace: string) {
      expect(namespace).toBe('sportanalytics.servicebus.windows.net');
    }
    createSender = runtime.serviceBus.createSender;
    createReceiver = runtime.serviceBus.createReceiver;
    close = runtime.serviceBus.close;
  },
}));

import { loadWorkerEnvironment } from '../src/config';
import { createRuntimeDependencies } from '../src/runtime-dependencies';

function azureEnvironment() {
  return loadWorkerEnvironment({
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://worker:secret@database.test:5432/sport',
    DATABASE_SSL_MODE: 'disable',
    DEPLOYMENT_ENVIRONMENT: 'test',
    WORKER_ID: 'worker-866',
    WORKER_CONCURRENCY: '3',
    WORKER_TRANSPORT_PROVIDER: 'azure-service-bus',
    SERVICE_BUS_FULLY_QUALIFIED_NAMESPACE: 'sportanalytics.servicebus.windows.net',
    SERVICE_BUS_QUEUE_NAME: 'worker-jobs',
    SERVICE_BUS_LOCK_RENEWAL_MS: '180000',
    OBJECT_STORAGE_PROVIDER: 'azure',
    AZURE_STORAGE_ACCOUNT_NAME: 'sportanalytics',
    AZURE_STORAGE_INGESTION_CONTAINER_NAME: 'private-ingestion',
    AZURE_STORAGE_RELEASE_CONTAINER_NAME: 'private-releases',
    AZURE_CLIENT_ID: 'managed-identity-client',
  });
}

describe('Azure worker runtime composition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runtime.blobUrls.length = 0;
    runtime.credentialOptions.length = 0;
    runtime.poolOptions = undefined;
    runtime.subscribedHandlers = undefined;
    runtime.database.query.mockResolvedValue({ rows: [], rowCount: 1 });
    runtime.database.end.mockResolvedValue(undefined);
    runtime.ingestion.getProperties.mockResolvedValue({});
    runtime.releases.getProperties.mockResolvedValue({});
    runtime.sender.sendMessages.mockResolvedValue(undefined);
    runtime.sender.close.mockResolvedValue(undefined);
    runtime.receiver.completeMessage.mockResolvedValue(undefined);
    runtime.receiver.abandonMessage.mockResolvedValue(undefined);
    runtime.receiver.deadLetterMessage.mockResolvedValue(undefined);
    runtime.receiver.close.mockResolvedValue(undefined);
    runtime.healthReceiver.peekMessages.mockResolvedValue([]);
    runtime.healthReceiver.close.mockResolvedValue(undefined);
    runtime.serviceBus.close.mockResolvedValue(undefined);
    runtime.serviceBus.createSender.mockReturnValue(runtime.sender);
    runtime.serviceBus.createReceiver
      .mockReturnValueOnce(runtime.receiver)
      .mockReturnValueOnce(runtime.healthReceiver);
    runtime.receiver.subscribe.mockImplementation((handlers) => {
      runtime.subscribedHandlers = handlers;
      return { close: vi.fn().mockResolvedValue(undefined) };
    });
  });

  it('wires private Blob storage, peek-lock delivery, health checks, and cleanup', async () => {
    const dependencies = createRuntimeDependencies(azureEnvironment());

    expect(dependencies.useOutboxRelay).toBe(true);
    expect(runtime.poolOptions).toMatchObject({
      max: 4,
      ssl: false,
      statement_timeout: 60_000,
      application_name: 'sport-analytics-worker',
    });
    expect(runtime.credentialOptions).toEqual([
      { managedIdentityClientId: 'managed-identity-client' },
    ]);
    expect(runtime.blobUrls).toEqual(['https://sportanalytics.blob.core.windows.net']);
    expect(runtime.serviceBus.createReceiver).toHaveBeenNthCalledWith(1, 'worker-jobs', {
      receiveMode: 'peekLock',
      maxAutoLockRenewalDurationInMs: 180_000,
    });

    await dependencies.checks.database();
    await dependencies.checks.objectStorage();
    await dependencies.checks.serviceBus();
    expect(runtime.database.query).toHaveBeenCalledWith('SELECT 1');
    expect(runtime.ingestion.getProperties).toHaveBeenCalledOnce();
    expect(runtime.releases.getProperties).toHaveBeenCalledOnce();
    expect(runtime.healthReceiver.peekMessages).toHaveBeenCalledWith(1);

    await dependencies.outboxSender.send([
      { messageId: 'message-1', body: { type: 'worker.probe', version: 1 } },
      { messageId: 'message-2', body: { type: 'batch.validate', version: 1 } },
    ]);
    expect(runtime.sender.sendMessages).toHaveBeenNthCalledWith(1, {
      messageId: 'message-1',
      body: { type: 'worker.probe', version: 1 },
      contentType: 'application/json',
    });
    expect(runtime.sender.sendMessages).toHaveBeenNthCalledWith(2, {
      messageId: 'message-2',
      body: { type: 'batch.validate', version: 1 },
      contentType: 'application/json',
    });

    await dependencies.close();
    expect(runtime.sender.close).toHaveBeenCalledOnce();
    expect(runtime.healthReceiver.close).toHaveBeenCalledOnce();
    expect(runtime.serviceBus.close).toHaveBeenCalledOnce();
    expect(runtime.database.end).toHaveBeenCalledOnce();
  });

  it('maps broker deliveries and settlement to the original peek-lock message', async () => {
    const dependencies = createRuntimeDependencies(azureEnvironment());
    const processMessage = vi.fn().mockResolvedValue(undefined);
    const processError = vi.fn().mockResolvedValue(undefined);

    dependencies.deliveryReceiver.subscribe({ processMessage, processError });
    const raw = {
      body: { type: 'worker.probe', version: 1 },
      deliveryCount: 4,
      messageId: 'broker-1',
    };
    await runtime.subscribedHandlers!.processMessage(raw);
    const received = processMessage.mock.calls[0]![0];

    expect(received).toEqual({
      raw,
      body: raw.body,
      deliveryCount: 4,
      messageId: 'broker-1',
    });
    await dependencies.deliveryReceiver.complete(received);
    await dependencies.deliveryReceiver.abandon(received);
    await dependencies.deliveryReceiver.deadLetter(received, 'Permanent', 'invalid command');
    expect(runtime.receiver.completeMessage).toHaveBeenCalledWith(raw);
    expect(runtime.receiver.abandonMessage).toHaveBeenCalledWith(raw);
    expect(runtime.receiver.deadLetterMessage).toHaveBeenCalledWith(raw, {
      deadLetterReason: 'Permanent',
      deadLetterErrorDescription: 'invalid command',
    });

    const brokerError = new Error('lock lost');
    await runtime.subscribedHandlers!.processError({ error: brokerError });
    expect(processError).toHaveBeenCalledWith(brokerError);
    expect(() =>
      dependencies.deliveryReceiver.complete({ messageId: 'missing', deliveryCount: 1, body: {} }),
    ).toThrow('no Azure message context');
    await dependencies.deliveryReceiver.close();
    expect(runtime.receiver.close).toHaveBeenCalledOnce();
  });

  it('rejects a storage health check when either configured container is public', async () => {
    runtime.releases.getProperties.mockResolvedValueOnce({ blobPublicAccess: 'blob' });
    const dependencies = createRuntimeDependencies(azureEnvironment());

    await expect(dependencies.checks.objectStorage()).rejects.toThrow(
      'Configured object-storage container permits public access.',
    );
  });
});
