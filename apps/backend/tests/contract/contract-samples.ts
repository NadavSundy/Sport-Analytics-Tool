/**
 * Response samples for the contract tests (issue #609).
 *
 * The batch status and report samples were captured from the real batch
 * repository and batch service against PostgreSQL, with a staged item at
 * position 0 in its over, and only their identifiers and timestamps replaced.
 * The other samples reuse the shapes asserted by the existing API tests.
 */

export const BATCH_REFERENCE = '42ccc588-e75e-4dc7-8724-a0f1c7f93cf5';

const reportContext = {
  eventReference: 'contract:delivery:first',
  fixtureId: null,
  fixtureLabel: null,
  inningsId: null,
  overNumber: 0,
  positionInOver: 0,
  description: 'Event contract:delivery:first at over 0, delivery 0.',
};

const reportLocation = {
  filePath: null,
  sheetName: null,
  rowNumber: null,
  jsonPath: null,
  ordinal: 0,
};

export const batchStatus = {
  batchReference: BATCH_REFERENCE,
  competitionId: '1',
  status: 'stored',
  statusUrl: `/api/v1/batches/${BATCH_REFERENCE}`,
  receivedAt: '2026-09-17T09:55:28.307Z',
  updatedAt: '2026-09-17T09:55:28.307Z',
  source: {
    fileName: null,
    checksum: 'a'.repeat(64),
    packageVersion: '1.0',
    submitter: { accountId: '1', displayName: null },
  },
  progress: { total: 0, processed: 0, accepted: 0, rejected: 1 },
  counts: { accepted: 0, rejected: 1, unresolved: 1, duplicate: 0, conflicting: 0 },
  lineage: { replacesBatchReference: null, supersededByBatchReference: null },
  review: null,
};

const reportItem = {
  ordinal: 0,
  outcome: 'unresolved',
  location: reportLocation,
  context: reportContext,
  stagedRecordId: '1',
  acceptedRecordId: null,
  operation: 'upsert',
  correctionTarget: null,
  publishedConflict: null,
  referenceResolutions: [],
  errors: [
    {
      ruleCode: 'REFERENCE_RESOLUTION_FAILED',
      message: 'Choose one candidate.',
      location: reportLocation,
      context: reportContext,
    },
  ],
};

export const batchReport = {
  data: {
    batch: batchStatus,
    errorGroups: [{ ruleCode: 'REFERENCE_RESOLUTION_FAILED', count: 1 }],
    reviewSummary: {
      validation: { accepted: 0, rejected: 1, blockingErrors: 0, duplicate: 0, conflicting: 0 },
      resolution: { resolved: 0, ambiguous: 1, unresolved: 0, invalid: 0, proposed: 0 },
      approvalBlocked: true,
      blockingReasons: ['Ambiguous references remain.'],
    },
    fixtureSummaries: [
      {
        fixtureId: null,
        label: 'Fixture unresolved',
        total: 1,
        accepted: 0,
        rejected: 1,
        unresolved: 1,
      },
    ],
    acceptedSamples: [],
    blockingItems: [reportItem],
    items: [reportItem],
    pagination: { nextCursor: null },
    downloadUrl: `/api/v1/batches/${BATCH_REFERENCE}/report/download`,
  },
};

export const batchReceipt = {
  data: {
    batchReference: BATCH_REFERENCE,
    status: 'stored',
    statusUrl: `/api/v1/batches/${BATCH_REFERENCE}`,
    receivedAt: '2026-09-03T10:00:00.000Z',
  },
};

export const batchDecisionReceipt = {
  data: {
    batchReference: BATCH_REFERENCE,
    decisionReference: '688a0bf0-e168-4b67-bf6f-f5857dbb1f87',
    status: 'queued',
    statusUrl: `/api/v1/batches/${BATCH_REFERENCE}`,
    submittedAt: '2026-09-07T12:00:00.000Z',
  },
};

/**
 * The canonical-fixture decision as it is returned when the fixture is newly
 * created: issue #584 attaches an onboarding summary, and issue #708 gives each
 * participant it could not onboard the reason a reviewer needs to act on it.
 * Every reason value appears once so the contract check covers the whole enum.
 */
export const batchDecisionReceiptWithOnboarding = {
  data: {
    ...batchDecisionReceipt.data,
    onboarding: {
      inningsCreated: 2,
      squadCreated: 20,
      unresolvedParticipants: [
        { name: 'A Solo', reason: 'no_durable_identifier', candidates: [] },
        {
          name: 'A Namesake',
          teamName: 'North XI',
          reason: 'ambiguous_name',
          candidates: [
            { personId: '11', displayName: 'A Namesake' },
            { personId: '12', displayName: 'A Namesake' },
          ],
        },
        {
          name: 'A Stranger',
          teamName: 'Unknown XI',
          reason: 'team_not_recognised',
          candidates: [],
        },
        { name: 'A Ghost', teamName: 'North XI', reason: 'identifier_not_found', candidates: [] },
      ],
    },
  },
};

export const provenanceSubmissionDetail = {
  data: {
    kind: 'direct',
    reference: '30',
    submissionId: '30',
    batchReference: null,
    fixtureId: '7',
    competitionId: '5',
    submitter: { accountId: '1', displayName: 'Submitter' },
    status: 'accepted',
    receivedAt: '2026-09-09T09:00:00.000Z',
    updatedAt: '2026-09-09T09:00:00.000Z',
    eventCount: 1,
    source: {
      fileName: null,
      mediaType: null,
      sizeBytes: null,
      checksum: 'a'.repeat(64),
      packageVersion: '1.0',
    },
    lifecycle: [
      {
        fromState: null,
        toState: 'accepted',
        at: '2026-09-09T09:00:00.000Z',
        actorKind: 'api',
        actorIdentifier: '1',
        reason: 'Submission validated and accepted.',
      },
    ],
    decisions: [
      { decision: 'accepted', actor: null, decidedAt: '2026-09-09T09:00:00.000Z', reason: null },
    ],
  },
};

export const datasetRelease = {
  releaseId: '01234567-89ab-cdef-0123-456789abcdef',
  version: '2026.09.1',
  createdAt: '2026-09-09T10:00:00.000Z',
  snapshotId: '1e3af729-8ced-4f49-ae61-7f0d74eab8f8',
  snapshotAsOf: '2026-09-09T10:00:00.000Z',
  formatVersion: '1.0' as const,
  scope: 'published-accepted-deliveries' as const,
  eventCount: 2,
  checksum: 'a'.repeat(64),
  fields: [
    { name: 'eventId', description: 'Stable identifier of the accepted delivery revision.' },
  ],
};

export const apiConsumer = {
  id: '7',
  name: 'Partner dashboard',
  rateLimitPerMinute: 60,
  dailyQuota: 10000,
  createdAt: '2026-09-07T10:00:00.000Z',
  keys: [
    { id: '9', prefix: 'sat_live_example', createdAt: '2026-09-07T10:00:00.000Z', revokedAt: null },
  ],
};

export const submissionReceipt = {
  data: {
    submissionId: '30',
    fixtureId: '7',
    submitterId: '1',
    status: 'accepted',
    receivedAt: '2026-08-13T16:00:00.000Z',
    schemaVersion: '1.0',
    eventCount: 1,
  },
};

export const correctionReceipt = {
  data: {
    eventId: '123e4567-e89b-42d3-a456-426614174000',
    fixtureId: '7',
    revision: 2,
    refreshedScopes: [
      { scope: 'fixture', participantId: null, competitionId: '5', season: '2026' },
    ],
  },
};

export const submissionPayload = {
  fixtureId: '7',
  schemaVersion: '1.0',
  events: [
    {
      eventId: '123e4567-e89b-42d3-a456-426614174000',
      inningsId: '10',
      sequenceNumber: 1,
      overNumber: 0,
      positionInOver: 0,
      ballNumber: '0.1',
      strikerId: '20',
      nonStrikerId: '21',
      bowlerId: '22',
      runs: { offBat: 4, extras: 0, total: 4 },
    },
  ],
};

export const correctionPayload = {
  fixtureId: '7',
  schemaVersion: '1.0',
  reason: 'Correct the scorer transcription.',
  event: {
    inningsId: '10',
    overNumber: 0,
    positionInOver: 0,
    ballNumber: '0.1',
    strikerId: '20',
    nonStrikerId: '21',
    bowlerId: '22',
    runs: { offBat: 6, extras: 0, total: 6 },
  },
};
