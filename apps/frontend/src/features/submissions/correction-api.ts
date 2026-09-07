import {
  correctionResponseSchema,
  DIRECT_SUBMISSION_SCHEMA_VERSION,
  type CorrectionResponse,
  type SubmissionEvent,
} from '@sport-analytics/contracts';
import type { AuthenticatedApiClient } from '../../api/client';

class CorrectionInterfaceContractError extends Error {
  constructor() {
    super('The API returned an unexpected correction response. Please try again.');
    this.name = 'CorrectionInterfaceContractError';
  }
}

export async function correctEvent(
  client: AuthenticatedApiClient,
  fixtureId: string,
  event: SubmissionEvent,
  reason: string,
): Promise<CorrectionResponse> {
  const { eventId, sequenceNumber: _sequenceNumber, ...correctedEvent } = event;
  void _sequenceNumber;

  const response = await client.request<unknown>(
    `/submissions/events/${encodeURIComponent(eventId)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fixtureId,
        schemaVersion: DIRECT_SUBMISSION_SCHEMA_VERSION,
        reason,
        event: correctedEvent,
      }),
    },
  );
  const parsed = correctionResponseSchema.safeParse(response);

  if (!parsed.success) {
    throw new CorrectionInterfaceContractError();
  }

  return parsed.data;
}
