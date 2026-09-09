-- Up Migration

CREATE TABLE dataset_release (
    release_id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    version         text NOT NULL UNIQUE,
    created_at      timestamptz NOT NULL DEFAULT now(),
    format_version  text NOT NULL,
    scope           text NOT NULL,
    event_count     integer NOT NULL CHECK (event_count >= 0),
    fields           jsonb NOT NULL,
    artifact_text    text NOT NULL,
    checksum_sha256  char(64) NOT NULL CHECK (checksum_sha256 ~ '^[a-f0-9]{64}$'),
    CONSTRAINT dataset_release_scope_ck CHECK (scope = 'published-accepted-deliveries')
);

COMMENT ON TABLE dataset_release IS
    'Immutable, checksummed snapshots of current accepted delivery data.';

CREATE FUNCTION prevent_dataset_release_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Dataset releases are immutable.';
END;
$$;

CREATE TRIGGER dataset_release_immutable
BEFORE UPDATE OR DELETE ON dataset_release
FOR EACH ROW EXECUTE FUNCTION prevent_dataset_release_mutation();

-- Down Migration

DROP TRIGGER IF EXISTS dataset_release_immutable ON dataset_release;
DROP FUNCTION IF EXISTS prevent_dataset_release_mutation();
DROP TABLE IF EXISTS dataset_release;
