import type {
  ProvenanceDecision,
  ProvenanceEventSource,
  ProvenanceSubmission,
  ProvenanceSubmissionKind,
  StatisticProvenanceContributor,
} from '@sport-analytics/contracts';
import type { Pool } from 'pg';

import { executeQuery, getDatabasePool } from '../../database';

interface ProvenanceListOptions {
  accountId: string;
  reviewerCompetitionIds: string[];
  kind?: ProvenanceSubmissionKind;
  before?: { receivedAt: string; kind: ProvenanceSubmissionKind; reference: string };
  limit: number;
}

interface ProvenanceLifecycleRecord {
  fromState: string | null;
  toState: string;
  at: string;
  actorKind: string;
  actorIdentifier: string;
  reason: string;
}

interface EventProvenanceRecord {
  eventId: string;
  sourceEventId: string | null;
  fixtureId: string;
  competitionId: string | null;
  currentDeliveryId: string;
  submitterId: string | null;
  revisions: Array<{
    deliveryId: string;
    revision: number;
    recordedAt: string;
    supersededAt: string | null;
    current: boolean;
    source: ProvenanceEventSource;
    correction: {
      correctionId: string;
      requester: { accountId: string; displayName: string | null };
      correctedAt: string;
      reason: string;
      review: ProvenanceDecision | null;
    } | null;
  }>;
}

export interface ProvenanceRepository {
  listSubmissions(options: ProvenanceListOptions): Promise<ProvenanceSubmission[]>;
  findSubmission(
    reference: string,
    accountId: string,
    reviewerCompetitionIds: string[],
  ): Promise<ProvenanceSubmission | null>;
  listBatchLifecycle(batchReference: string): Promise<ProvenanceLifecycleRecord[]>;
  listBatchDecisions(batchReference: string): Promise<ProvenanceDecision[]>;
  findEvent(eventId: string): Promise<EventProvenanceRecord | null>;
  findFixtureCompetition(fixtureId: string): Promise<string | null | undefined>;
  listContributorSources(deliveryIds: string[]): Promise<StatisticProvenanceContributor[]>;
}

interface SubmissionRow {
  kind: ProvenanceSubmissionKind;
  reference: string;
  submissionId: string | null;
  batchReference: string | null;
  fixtureId: string | null;
  competitionId: string | null;
  submitterId: string | null;
  submitterDisplayName: string | null;
  status: string;
  receivedAt: Date;
  updatedAt: Date;
  eventCount: number;
  fileName: string | null;
  mediaType: string | null;
  sizeBytes: string | null;
  checksum: string | null;
  packageVersion: string | null;
}

interface BatchLifecycleRow {
  fromState: string | null;
  toState: string;
  at: Date;
  actorKind: string;
  actorIdentifier: string;
  reason: string;
}

interface DecisionRow {
  decision: 'approved' | 'rejected' | 'returned_for_correction';
  actorId: string;
  actorDisplayName: string | null;
  decidedAt: Date;
  reason: string | null;
}

interface EventRow {
  deliveryId: string;
  sourceEventId: string | null;
  fixtureId: string;
  competitionId: string | null;
  revision: number;
  recordedAt: Date;
  supersededAt: Date | null;
  current: boolean;
  submissionId: string;
  submissionEventOrdinal: number | null;
  submissionStatus: 'pending' | 'accepted' | 'rejected';
  submissionReceivedAt: Date;
  sourceFileName: string | null;
  legacySourceFileName: string | null;
  sourceChecksum: string | null;
  submitterId: string | null;
  submitterDisplayName: string | null;
  batchItemId: string | null;
  batchReference: string | null;
  batchChecksum: string | null;
  batchDecision: 'approved' | 'rejected' | 'returned_for_correction' | null;
  batchDecisionActorId: string | null;
  batchDecisionActorDisplayName: string | null;
  batchDecidedAt: Date | null;
  batchDecisionReason: string | null;
  correctionId: string | null;
  correctionRequesterId: string | null;
  correctionRequesterDisplayName: string | null;
  correctedAt: Date | null;
  correctionReason: string | null;
  correctionReviewDecision: 'approved' | 'rejected' | 'returned_for_correction' | null;
  correctionReviewerId: string | null;
  correctionReviewerDisplayName: string | null;
  correctionReviewedAt: Date | null;
  correctionReviewReason: string | null;
}

const submissionUnion = `
  WITH visible_submission AS (
    SELECT
      CASE
        WHEN s.source_file_name IS NOT NULL OR s.source_filename IS NOT NULL THEN 'file'
        ELSE 'direct'
      END::text AS kind,
      s.submission_id::text AS reference,
      s.submission_id::text AS "submissionId",
      NULL::text AS "batchReference",
      s.fixture_id::text AS "fixtureId",
      f.competition_id::text AS "competitionId",
      s.submitted_by::text AS "submitterId",
      account.display_name AS "submitterDisplayName",
      s.status::text AS status,
      s.received_at AS "receivedAt",
      s.received_at AS "updatedAt",
      COALESCE(s.event_count, (
        SELECT count(*)::int FROM delivery d WHERE d.submission_id = s.submission_id
      )) AS "eventCount",
      COALESCE(s.source_file_name, s.source_filename) AS "fileName",
      s.source_file_media_type AS "mediaType",
      s.source_file_size_bytes::text AS "sizeBytes",
      lower(s.source_sha256) AS checksum,
      s.schema_version AS "packageVersion"
    FROM submission s
    JOIN app_user account ON account.app_user_id = s.submitted_by
    LEFT JOIN fixture f ON f.fixture_id = s.fixture_id
    WHERE s.submitted_by IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM delivery batch_delivery
        WHERE batch_delivery.submission_id = s.submission_id
          AND batch_delivery.source_batch_item_id IS NOT NULL
      )
      AND (
        s.submitted_by = $1::bigint
        OR f.competition_id = ANY($2::bigint[])
      )

    UNION ALL

    SELECT
      'batch'::text AS kind,
      b.batch_reference::text AS reference,
      NULL::text AS "submissionId",
      b.batch_reference::text AS "batchReference",
      NULL::text AS "fixtureId",
      b.competition_id::text AS "competitionId",
      b.submitter_id::text AS "submitterId",
      account.display_name AS "submitterDisplayName",
      b.state::text AS status,
      b.created_at AS "receivedAt",
      b.updated_at AS "updatedAt",
      b.item_count AS "eventCount",
      stored.original_filename AS "fileName",
      stored.media_type AS "mediaType",
      COALESCE(stored.byte_size, b.source_size_bytes)::text AS "sizeBytes",
      lower(COALESCE(stored.sha256, b.source_checksum)) AS checksum,
      b.package_version AS "packageVersion"
    FROM batch b
    JOIN app_user account ON account.app_user_id = b.submitter_id
    LEFT JOIN stored_object stored
      ON b.source_uri = 'stored-object:' || stored.object_id::text
    WHERE b.submitter_id = $1::bigint
       OR b.competition_id = ANY($2::bigint[])
  )
`;

function mapSubmission(row: SubmissionRow): ProvenanceSubmission {
  return {
    kind: row.kind,
    reference: row.reference,
    submissionId: row.submissionId,
    batchReference: row.batchReference,
    fixtureId: row.fixtureId,
    competitionId: row.competitionId,
    submitter: {
      accountId: row.submitterId,
      displayName: row.submitterDisplayName,
    },
    status: row.status,
    receivedAt: row.receivedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    eventCount: row.eventCount,
    source: {
      fileName: row.fileName,
      mediaType: row.mediaType,
      sizeBytes: row.sizeBytes === null ? null : Number(row.sizeBytes),
      checksum: row.checksum,
      packageVersion: row.packageVersion,
    },
  };
}

function sourceForEvent(row: EventRow): ProvenanceEventSource {
  const kind: ProvenanceSubmissionKind = row.batchItemId
    ? 'batch'
    : row.sourceFileName || row.legacySourceFileName
      ? 'file'
      : 'direct';
  const batchDecision: ProvenanceDecision | null =
    row.batchDecision && row.batchDecisionActorId && row.batchDecidedAt
      ? {
          decision: row.batchDecision,
          actor: {
            accountId: row.batchDecisionActorId,
            displayName: row.batchDecisionActorDisplayName,
          },
          decidedAt: row.batchDecidedAt.toISOString(),
          reason: row.batchDecisionReason,
        }
      : null;
  const directDecision: ProvenanceDecision | null =
    row.submissionStatus === 'accepted' || row.submissionStatus === 'rejected'
      ? {
          decision: row.submissionStatus,
          actor: null,
          decidedAt: row.submissionReceivedAt.toISOString(),
          reason: null,
        }
      : null;

  return {
    kind,
    reference: row.batchReference ?? row.submissionId,
    submissionId: row.submissionId,
    batchReference: row.batchReference,
    batchItemId: row.batchItemId,
    submissionEventOrdinal: row.submissionEventOrdinal,
    submitter: { accountId: row.submitterId, displayName: row.submitterDisplayName },
    checksum: (row.batchChecksum ?? row.sourceChecksum)?.toLowerCase() ?? null,
    decision: row.batchItemId ? batchDecision : directDecision,
  };
}

function correctionForEvent(
  row: EventRow,
): EventProvenanceRecord['revisions'][number]['correction'] {
  if (
    !row.correctionId ||
    !row.correctionRequesterId ||
    !row.correctedAt ||
    !row.correctionReason
  ) {
    return null;
  }

  const review: ProvenanceDecision | null =
    row.correctionReviewDecision && row.correctionReviewerId && row.correctionReviewedAt
      ? {
          decision: row.correctionReviewDecision,
          actor: {
            accountId: row.correctionReviewerId,
            displayName: row.correctionReviewerDisplayName,
          },
          decidedAt: row.correctionReviewedAt.toISOString(),
          reason: row.correctionReviewReason,
        }
      : null;

  return {
    correctionId: row.correctionId,
    requester: {
      accountId: row.correctionRequesterId,
      displayName: row.correctionRequesterDisplayName,
    },
    correctedAt: row.correctedAt.toISOString(),
    reason: row.correctionReason,
    review,
  };
}

const eventSelection = `
  d.delivery_id::text AS "deliveryId",
  d.source_event_id::text AS "sourceEventId",
  i.fixture_id::text AS "fixtureId",
  f.competition_id::text AS "competitionId",
  d.revision,
  d.recorded_at AS "recordedAt",
  d.superseded_at AS "supersededAt",
  (d.superseded_at IS NULL) AS current,
  s.submission_id::text AS "submissionId",
  d.submission_event_ordinal AS "submissionEventOrdinal",
  s.status::text AS "submissionStatus",
  s.received_at AS "submissionReceivedAt",
  s.source_file_name AS "sourceFileName",
  s.source_filename AS "legacySourceFileName",
  s.source_sha256 AS "sourceChecksum",
  submitter.app_user_id::text AS "submitterId",
  submitter.display_name AS "submitterDisplayName",
  item.batch_item_id::text AS "batchItemId",
  b.batch_reference::text AS "batchReference",
  b.source_checksum AS "batchChecksum",
  review.decision::text AS "batchDecision",
  review_actor.app_user_id::text AS "batchDecisionActorId",
  review_actor.display_name AS "batchDecisionActorDisplayName",
  review.decided_at AS "batchDecidedAt",
  review.reason AS "batchDecisionReason",
  correction.delivery_correction_history_id::text AS "correctionId",
  correction.requester_id::text AS "correctionRequesterId",
  requester.display_name AS "correctionRequesterDisplayName",
  correction.requested_at AS "correctedAt",
  correction.reason AS "correctionReason",
  correction.review_decision::text AS "correctionReviewDecision",
  correction.reviewer_id::text AS "correctionReviewerId",
  correction_reviewer.display_name AS "correctionReviewerDisplayName",
  correction.reviewed_at AS "correctionReviewedAt",
  correction.review_reason AS "correctionReviewReason"
`;

const eventJoins = `
  JOIN innings i ON i.innings_id = d.innings_id
  JOIN fixture f ON f.fixture_id = i.fixture_id
  JOIN submission s ON s.submission_id = d.submission_id
  LEFT JOIN app_user submitter ON submitter.app_user_id = s.submitted_by
  LEFT JOIN batch_item item ON item.batch_item_id = d.source_batch_item_id
  LEFT JOIN batch b ON b.batch_id = item.batch_id
  LEFT JOIN LATERAL (
    SELECT decision.*
    FROM batch_review_decision decision
    WHERE decision.batch_id = b.batch_id
    ORDER BY decision.decided_at DESC, decision.batch_review_decision_id DESC
    LIMIT 1
  ) review ON true
  LEFT JOIN app_user review_actor ON review_actor.app_user_id = review.actor_id
  LEFT JOIN delivery_correction_history correction
    ON correction.replacement_delivery_id = d.delivery_id
  LEFT JOIN app_user requester ON requester.app_user_id = correction.requester_id
  LEFT JOIN app_user correction_reviewer ON correction_reviewer.app_user_id = correction.reviewer_id
`;

export function createProvenanceRepository(pool?: Pool): ProvenanceRepository {
  const database = () => pool ?? getDatabasePool();

  return {
    async listSubmissions(options) {
      const values: unknown[] = [options.accountId, options.reviewerCompetitionIds];
      const filters: string[] = [];
      if (options.kind) {
        values.push(options.kind);
        filters.push(`kind = $${values.length}`);
      }
      if (options.before) {
        values.push(options.before.receivedAt, options.before.kind, options.before.reference);
        const first = values.length - 2;
        filters.push(
          `("receivedAt", kind, reference) < (` +
            `$${first}::timestamptz, $${first + 1}::text, $${first + 2}::text)`,
        );
      }
      values.push(options.limit);
      const result = await executeQuery<SubmissionRow>(
        database(),
        `${submissionUnion}
         SELECT * FROM visible_submission
         ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
         ORDER BY "receivedAt" DESC, kind DESC, reference DESC
         LIMIT $${values.length}`,
        values,
      );
      return result.rows.map(mapSubmission);
    },

    async findSubmission(reference, accountId, reviewerCompetitionIds) {
      const result = await executeQuery<SubmissionRow>(
        database(),
        `${submissionUnion}
         SELECT * FROM visible_submission
         WHERE reference = $3
         LIMIT 1`,
        [accountId, reviewerCompetitionIds, reference],
      );
      return result.rows[0] ? mapSubmission(result.rows[0]) : null;
    },

    async listBatchLifecycle(batchReference) {
      const result = await executeQuery<BatchLifecycleRow>(
        database(),
        `SELECT transition.from_state::text AS "fromState",
                transition.to_state::text AS "toState",
                transition.created_at AS at,
                transition.actor_kind AS "actorKind",
                transition.actor_identifier AS "actorIdentifier",
                transition.reason
         FROM batch_state_transition transition
         JOIN batch b ON b.batch_id = transition.batch_id
         WHERE b.batch_reference = $1::uuid
         ORDER BY transition.created_at, transition.batch_state_transition_id`,
        [batchReference],
      );
      return result.rows.map((row) => ({
        ...row,
        at: row.at.toISOString(),
      }));
    },

    async listBatchDecisions(batchReference) {
      const result = await executeQuery<DecisionRow>(
        database(),
        `SELECT decision.decision::text AS decision,
                actor.app_user_id::text AS "actorId",
                actor.display_name AS "actorDisplayName",
                decision.decided_at AS "decidedAt",
                decision.reason
         FROM batch_review_decision decision
         JOIN batch b ON b.batch_id = decision.batch_id
         JOIN app_user actor ON actor.app_user_id = decision.actor_id
         WHERE b.batch_reference = $1::uuid
         ORDER BY decision.decided_at, decision.batch_review_decision_id`,
        [batchReference],
      );
      return result.rows.map((row) => ({
        decision: row.decision,
        actor: { accountId: row.actorId, displayName: row.actorDisplayName },
        decidedAt: row.decidedAt.toISOString(),
        reason: row.reason,
      }));
    },

    async findEvent(eventId) {
      const anchor = await executeQuery<{
        sourceEventId: string | null;
        fixtureId: string;
        competitionId: string | null;
        submitterId: string | null;
      }>(
        database(),
        `SELECT d.source_event_id::text AS "sourceEventId",
                i.fixture_id::text AS "fixtureId",
                f.competition_id::text AS "competitionId",
                s.submitted_by::text AS "submitterId"
         FROM delivery d
         JOIN innings i ON i.innings_id = d.innings_id
         JOIN fixture f ON f.fixture_id = i.fixture_id
         JOIN submission s ON s.submission_id = d.submission_id
         WHERE d.delivery_id = $1::bigint`,
        [eventId],
      );
      const target = anchor.rows[0];
      if (!target) return null;

      const result = await executeQuery<EventRow>(
        database(),
        `SELECT ${eventSelection}
         FROM delivery d
         ${eventJoins}
         WHERE ($2::uuid IS NOT NULL AND d.source_event_id = $2::uuid)
            OR ($2::uuid IS NULL AND d.delivery_id = $1::bigint)
         ORDER BY d.revision, d.delivery_id`,
        [eventId, target.sourceEventId],
      );
      const current = result.rows.find((row) => row.current) ?? result.rows.at(-1);
      if (!current) return null;

      return {
        eventId,
        sourceEventId: target.sourceEventId,
        fixtureId: target.fixtureId,
        competitionId: target.competitionId,
        currentDeliveryId: current.deliveryId,
        submitterId: target.submitterId,
        revisions: result.rows.map((row) => ({
          deliveryId: row.deliveryId,
          revision: row.revision,
          recordedAt: row.recordedAt.toISOString(),
          supersededAt: row.supersededAt?.toISOString() ?? null,
          current: row.current,
          source: sourceForEvent(row),
          correction: correctionForEvent(row),
        })),
      };
    },

    async findFixtureCompetition(fixtureId) {
      const result = await executeQuery<{ competitionId: string | null }>(
        database(),
        `SELECT competition_id::text AS "competitionId"
         FROM fixture WHERE fixture_id = $1::bigint`,
        [fixtureId],
      );
      return result.rows[0]?.competitionId;
    },

    async listContributorSources(deliveryIds) {
      if (deliveryIds.length === 0) return [];
      const result = await executeQuery<EventRow>(
        database(),
        `SELECT ${eventSelection}
         FROM delivery d
         ${eventJoins}
         WHERE d.delivery_id = ANY($1::bigint[])
         ORDER BY d.innings_id, d.innings_sequence, d.delivery_id`,
        [deliveryIds],
      );
      return result.rows.map((row) => ({
        deliveryId: row.deliveryId,
        revision: row.revision,
        sourceEventId: row.sourceEventId,
        source: sourceForEvent(row),
      }));
    },
  };
}
