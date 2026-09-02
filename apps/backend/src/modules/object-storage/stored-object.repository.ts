import { executeQuery, getDatabasePool, type QueryExecutor } from '../../database';

export type StoredObjectRetentionState =
  'retained' | 'deletion_pending' | 'expired' | 'deletion_failed';

export interface StoredObjectRecord {
  objectId: string;
  ownerId: string;
  originalFilename: string;
  mediaType: string;
  byteSize: number;
  sha256: string;
  storageKey: string;
  providerVersionId: string | null;
  retentionState: StoredObjectRetentionState;
  retentionExpiresAt: string;
  createdAt: string;
  deletedAt: string | null;
}

export interface CreateStoredObjectInput {
  objectId: string;
  ownerId: string;
  originalFilename: string;
  mediaType: string;
  byteSize: number;
  sha256: string;
  storageKey: string;
  providerVersionId: string | null;
  retentionExpiresAt: string;
}

export interface StoredObjectRepository {
  create(input: CreateStoredObjectInput): Promise<StoredObjectRecord>;
  findById(objectId: string): Promise<StoredObjectRecord | null>;
  updateRetentionState(
    objectId: string,
    state: StoredObjectRetentionState,
    deletedAt?: string | null,
  ): Promise<StoredObjectRecord>;
}

interface StoredObjectRow {
  objectId: string;
  ownerId: string;
  originalFilename: string;
  mediaType: string;
  byteSize: string;
  sha256: string;
  storageKey: string;
  providerVersionId: string | null;
  retentionState: StoredObjectRetentionState;
  retentionExpiresAt: Date;
  createdAt: Date;
  deletedAt: Date | null;
}

const selection = `
  object_id::text AS "objectId",
  owner_id::text AS "ownerId",
  original_filename AS "originalFilename",
  media_type AS "mediaType",
  byte_size::text AS "byteSize",
  sha256,
  storage_key AS "storageKey",
  provider_version_id AS "providerVersionId",
  retention_state::text AS "retentionState",
  retention_expires_at AS "retentionExpiresAt",
  created_at AS "createdAt",
  deleted_at AS "deletedAt"
`;

function mapStoredObject(row: StoredObjectRow): StoredObjectRecord {
  return {
    ...row,
    byteSize: Number(row.byteSize),
    retentionExpiresAt: row.retentionExpiresAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    deletedAt: row.deletedAt?.toISOString() ?? null,
  };
}

function requireRow(row: StoredObjectRow | undefined): StoredObjectRecord {
  if (!row) {
    throw new Error('Stored-object operation returned no record');
  }
  return mapStoredObject(row);
}

export function createStoredObjectRepository(executor?: QueryExecutor): StoredObjectRepository {
  const database = () => executor ?? getDatabasePool();

  return {
    async create(input) {
      const result = await executeQuery<StoredObjectRow>(
        database(),
        `
          INSERT INTO stored_object (
            object_id, owner_id, original_filename, media_type, byte_size,
            sha256, storage_key, provider_version_id, retention_expires_at
          )
          VALUES ($1::uuid, $2::bigint, $3, $4, $5, $6, $7, $8, $9::timestamptz)
          RETURNING ${selection}
        `,
        [
          input.objectId,
          input.ownerId,
          input.originalFilename,
          input.mediaType,
          input.byteSize,
          input.sha256,
          input.storageKey,
          input.providerVersionId,
          input.retentionExpiresAt,
        ],
      );
      return requireRow(result.rows[0]);
    },

    async findById(objectId) {
      const result = await executeQuery<StoredObjectRow>(
        database(),
        `SELECT ${selection} FROM stored_object WHERE object_id = $1::uuid`,
        [objectId],
      );
      return result.rows[0] ? mapStoredObject(result.rows[0]) : null;
    },

    async updateRetentionState(objectId, state, deletedAt = null) {
      const result = await executeQuery<StoredObjectRow>(
        database(),
        `
          UPDATE stored_object
          SET retention_state = $2::stored_object_retention_state,
              deleted_at = $3::timestamptz
          WHERE object_id = $1::uuid
          RETURNING ${selection}
        `,
        [objectId, state, deletedAt],
      );
      return requireRow(result.rows[0]);
    },
  };
}
