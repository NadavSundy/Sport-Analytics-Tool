import { randomUUID } from 'node:crypto';

import { DefaultAzureCredential } from '@azure/identity';
import { ServiceBusClient } from '@azure/service-bus';
import { z } from 'zod';

const environmentSchema = z.object({
  SERVICE_BUS_FULLY_QUALIFIED_NAMESPACE: z.string().trim().min(1),
  SERVICE_BUS_QUEUE_NAME: z.string().trim().min(1),
  AZURE_CLIENT_ID: z.string().trim().min(1).optional(),
});
const environment = environmentSchema.parse(process.env);
const commandId = randomUUID();
const messageId = `worker-probe-${commandId}`;
const credential = new DefaultAzureCredential(
  environment.AZURE_CLIENT_ID
    ? { managedIdentityClientId: environment.AZURE_CLIENT_ID }
    : undefined,
);
const client = new ServiceBusClient(environment.SERVICE_BUS_FULLY_QUALIFIED_NAMESPACE, credential);
const sender = client.createSender(environment.SERVICE_BUS_QUEUE_NAME);

try {
  await sender.sendMessages({
    messageId,
    contentType: 'application/json',
    subject: 'worker.probe.v1',
    body: {
      type: 'worker.probe',
      version: 1,
      commandId,
      traceId: process.env.WORKER_PROBE_TRACE_ID ?? 'manual-deployment-check',
    },
  });
  console.log(JSON.stringify({ status: 'enqueued', commandId, messageId }));
} finally {
  await sender.close();
  await client.close();
}
