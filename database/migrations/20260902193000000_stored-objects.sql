-- Up Migration

-- Provider-independent metadata for private retained objects. Blob bytes may
-- expire, but this record is permanent provenance.
--
-- Refs #358

CREATE TYPE stored_object_retention_state AS ENUM (
    'retained',
    'deletion_pending',
    'expired',
    'deletion_failed'
);

CREATE TABLE stored_object (
    object_id             uuid PRIMARY KEY,
    owner_id              bigint NOT NULL REFERENCES app_user (app_user_id) ON DELETE RESTRICT,
    original_filename     text NOT NULL,
    media_type            text NOT NULL,
    byte_size             bigint NOT NULL,
    sha256                 char(64) NOT NULL,
    storage_key           text NOT NULL UNIQUE,
    provider_version_id   text,
    retention_state       stored_object_retention_state NOT NULL DEFAULT 'retained',
    retention_expires_at  timestamptz NOT NULL,
    created_at            timestamptz NOT NULL DEFAULT now(),
    deleted_at            timestamptz,

    CONSTRAINT stored_object_filename_ck CHECK (
        length(original_filename) BETWEEN 1 AND 255
        AND original_filename = btrim(original_filename)
    ),
    CONSTRAINT stored_object_media_type_ck CHECK (
        media_type IN ('application/json', 'text/csv', 'application/x-ndjson')
    ),
    CONSTRAINT stored_object_byte_size_ck CHECK (byte_size > 0),
    CONSTRAINT stored_object_sha256_ck CHECK (sha256 ~ '^[0-9a-f]{64}$'),
    CONSTRAINT stored_object_storage_key_ck CHECK (length(btrim(storage_key)) > 0),
    CONSTRAINT stored_object_retention_dates_ck CHECK (
        retention_expires_at > created_at
        AND (
            (retention_state = 'expired' AND deleted_at IS NOT NULL)
            OR (retention_state <> 'expired' AND deleted_at IS NULL)
        )
    )
);

COMMENT ON TABLE stored_object IS
    'Permanent provenance for private object bytes, retained after the provider object expires.';

COMMENT ON COLUMN stored_object.storage_key IS
    'Server-generated provider key. Never a submitted filename or a public URL.';

CREATE FUNCTION prevent_stored_object_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Stored-object provenance records cannot be deleted.'
        USING ERRCODE = '23514';
END;
$$;

CREATE TRIGGER stored_object_prevent_delete
    BEFORE DELETE ON stored_object
    FOR EACH ROW
    EXECUTE FUNCTION prevent_stored_object_delete();

-- Down Migration

DROP TRIGGER IF EXISTS stored_object_prevent_delete ON stored_object;
DROP FUNCTION IF EXISTS prevent_stored_object_delete();
DROP TABLE IF EXISTS stored_object;
DROP TYPE IF EXISTS stored_object_retention_state;
