import { executeQuery, getDatabasePool, type QueryExecutor } from '../../database';

export interface DatasetReleaseSnapshot {
  releaseId: string;
  version: string;
  createdAt: string;
  eventCount: number;
  checksum: string;
}

interface DatasetReleaseRow extends DatasetReleaseSnapshot {
  artifactText?: string;
}

export interface DatasetReleaseRepository {
  loadPublishedEvents(): Promise<unknown[]>;
  createOrFind(input: {
    version: string;
    formatVersion: string;
    scope: string;
    eventCount: number;
    fields: readonly { name: string; description: string }[];
    artifact: string;
    checksum: string;
  }): Promise<DatasetReleaseSnapshot>;
  findByVersion(version: string): Promise<DatasetReleaseSnapshot | null>;
  findArtifactByVersion(version: string): Promise<string | null>;
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
    async loadPublishedEvents() {
      const result = await executeQuery<{ event: unknown }>(
        database(),
        `
          SELECT jsonb_build_object(
            'eventId', d.delivery_id::text, 'fixtureId', i.fixture_id::text,
            'inningsId', i.innings_id::text, 'inningsOrdinal', i.ordinal,
            'sequenceNumber', d.innings_sequence, 'overNumber', d.over_number,
            'positionInOver', d.position_in_over, 'ballNumber', d.ball_number,
            'strikerParticipantId', d.striker_id::text, 'nonStrikerParticipantId', d.non_striker_id::text,
            'bowlerParticipantId', d.bowler_id::text, 'runsOffBat', d.runs_off_bat,
            'runsExtras', d.runs_extras, 'runsTotal', d.runs_total
          ) AS event
          FROM delivery_current d
          INNER JOIN innings i ON i.innings_id = d.innings_id
          INNER JOIN submission s ON s.submission_id = d.submission_id AND s.status = 'accepted'
          ORDER BY i.fixture_id ASC, i.ordinal ASC, d.innings_sequence ASC, d.delivery_id ASC
        `,
      );
      return result.rows.map((row) => row.event);
    },

    async createOrFind(input) {
      const result = await executeQuery<DatasetReleaseRow>(
        database(),
        `
          INSERT INTO dataset_release
            (version, format_version, scope, event_count, fields, artifact_text, checksum_sha256)
          VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
          ON CONFLICT (version) DO NOTHING
          RETURNING ${snapshotColumns}
        `,
        [
          input.version,
          input.formatVersion,
          input.scope,
          input.eventCount,
          JSON.stringify(input.fields),
          input.artifact,
          input.checksum,
        ],
      );
      if (result.rows[0]) {
        return result.rows[0];
      }

      const existing = await findByVersion(input.version);
      if (!existing) {
        throw new Error('Dataset release was not created or found.');
      }
      return existing;
    },

    findByVersion,

    async findArtifactByVersion(version) {
      const result = await executeQuery<DatasetReleaseRow>(
        database(),
        'SELECT artifact_text AS "artifactText" FROM dataset_release WHERE version = $1',
        [version],
      );
      return result.rows[0]?.artifactText ?? null;
    },
  };
}
