import { executeQuery, getDatabasePool, type QueryExecutor } from '../../database';

export interface DatasetReleaseSnapshot {
  releaseId: string;
  version: string;
  createdAt: string;
  eventCount: number;
  checksum: string;
}

export interface DatasetReleaseEventCursor {
  fixtureId: string;
  inningsOrdinal: number;
  sequenceNumber: number;
  eventId: string;
}

interface DatasetReleaseEventPage {
  events: unknown[];
  nextCursor: DatasetReleaseEventCursor | null;
}

export interface DatasetReleaseArtifactReference {
  storageKey: string | null;
  legacyArtifactText: string | null;
}

interface DatasetReleaseRow extends DatasetReleaseSnapshot {
  artifactStorageKey?: string | null;
  artifactText?: string | null;
}

interface DatasetReleaseEventRow extends DatasetReleaseEventCursor {
  event: unknown;
}

export interface DatasetReleaseRepository {
  loadPublishedEventPage(
    cursor: DatasetReleaseEventCursor | null,
    limit: number,
  ): Promise<DatasetReleaseEventPage>;
  createOrFind(input: {
    version: string;
    formatVersion: string;
    scope: string;
    eventCount: number;
    fields: readonly { name: string; description: string }[];
    artifactStorageKey: string;
    artifactProviderVersionId: string | null;
    checksum: string;
  }): Promise<{ snapshot: DatasetReleaseSnapshot; created: boolean }>;
  list(): Promise<DatasetReleaseSnapshot[]>;
  findByVersion(version: string): Promise<DatasetReleaseSnapshot | null>;
  findArtifactReferenceByVersion(version: string): Promise<DatasetReleaseArtifactReference | null>;
}

const snapshotColumns = `
  release_id::text AS "releaseId", version,
  created_at::text AS "createdAt", event_count AS "eventCount",
  checksum_sha256 AS checksum
`;

export function createDatasetReleaseRepository(executor?: QueryExecutor): DatasetReleaseRepository {
  const database = () => executor ?? getDatabasePool();

  async function findByVersion(version: string): Promise<DatasetReleaseSnapshot | null> {
    const result = await executeQuery<DatasetReleaseRow>(
      database(),
      `SELECT ${snapshotColumns} FROM dataset_release WHERE version = $1`,
      [version],
    );
    return result.rows[0] ?? null;
  }

  return {
    async loadPublishedEventPage(cursor, limit) {
      const result = await executeQuery<DatasetReleaseEventRow>(
        database(),
        `
          SELECT json_build_object(
            'eventId', d.delivery_id::text, 'fixtureId', i.fixture_id::text,
            'inningsId', i.innings_id::text, 'inningsOrdinal', i.ordinal,
            'sequenceNumber', d.innings_sequence, 'overNumber', d.over_number,
            'positionInOver', d.position_in_over, 'ballNumber', d.ball_number,
            'strikerParticipantId', d.striker_id::text, 'nonStrikerParticipantId', d.non_striker_id::text,
            'bowlerParticipantId', d.bowler_id::text, 'runsOffBat', d.runs_off_bat,
            'runsExtras', d.runs_extras, 'runsTotal', d.runs_total
          ) AS event,
          i.fixture_id::text AS "fixtureId", i.ordinal AS "inningsOrdinal",
          d.innings_sequence AS "sequenceNumber", d.delivery_id::text AS "eventId"
          FROM delivery_current d
          INNER JOIN innings i ON i.innings_id = d.innings_id
          INNER JOIN submission s ON s.submission_id = d.submission_id AND s.status = 'accepted'
          WHERE $1::bigint IS NULL
             OR (i.fixture_id, i.ordinal, d.innings_sequence, d.delivery_id)
                > ($1::bigint, $2::integer, $3::integer, $4::bigint)
          ORDER BY i.fixture_id ASC, i.ordinal ASC, d.innings_sequence ASC, d.delivery_id ASC
          LIMIT $5
        `,
        [
          cursor?.fixtureId ?? null,
          cursor?.inningsOrdinal ?? null,
          cursor?.sequenceNumber ?? null,
          cursor?.eventId ?? null,
          limit,
        ],
      );
      const last = result.rows.at(-1);
      return {
        events: result.rows.map((row) => row.event),
        nextCursor: last
          ? {
              fixtureId: last.fixtureId,
              inningsOrdinal: last.inningsOrdinal,
              sequenceNumber: last.sequenceNumber,
              eventId: last.eventId,
            }
          : null,
      };
    },

    async createOrFind(input) {
      const result = await executeQuery<DatasetReleaseRow>(
        database(),
        `
          INSERT INTO dataset_release
            (version, format_version, scope, event_count, fields, artifact_storage_key,
             artifact_provider_version_id, checksum_sha256)
          VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)
          ON CONFLICT (version) DO NOTHING
          RETURNING ${snapshotColumns}
        `,
        [
          input.version,
          input.formatVersion,
          input.scope,
          input.eventCount,
          JSON.stringify(input.fields),
          input.artifactStorageKey,
          input.artifactProviderVersionId,
          input.checksum,
        ],
      );
      if (result.rows[0]) {
        return { snapshot: result.rows[0], created: true };
      }

      const existing = await findByVersion(input.version);
      if (!existing) {
        throw new Error('Dataset release was not created or found.');
      }
      return { snapshot: existing, created: false };
    },

    async list() {
      const result = await executeQuery<DatasetReleaseRow>(
        database(),
        `SELECT ${snapshotColumns} FROM dataset_release ORDER BY created_at DESC, version DESC`,
      );
      return result.rows;
    },

    findByVersion,

    async findArtifactReferenceByVersion(version) {
      const result = await executeQuery<DatasetReleaseRow>(
        database(),
        `
          SELECT artifact_storage_key AS "artifactStorageKey", artifact_text AS "artifactText"
          FROM dataset_release
          WHERE version = $1
        `,
        [version],
      );
      const row = result.rows[0];
      return row
        ? {
            storageKey: row.artifactStorageKey ?? null,
            legacyArtifactText: row.artifactText ?? null,
          }
        : null;
    },
  };
}
