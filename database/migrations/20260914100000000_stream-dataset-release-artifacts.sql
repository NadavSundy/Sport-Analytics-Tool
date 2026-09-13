-- Up Migration

ALTER TABLE dataset_release
    ADD COLUMN artifact_storage_key text,
    ADD COLUMN artifact_provider_version_id text,
    ALTER COLUMN artifact_text DROP NOT NULL;

ALTER TABLE dataset_release
    ADD CONSTRAINT dataset_release_artifact_location_ck CHECK (
        (artifact_storage_key IS NOT NULL AND artifact_text IS NULL)
        OR (artifact_storage_key IS NULL AND artifact_text IS NOT NULL)
    );

COMMENT ON COLUMN dataset_release.artifact_storage_key IS
    'Opaque private-object key for a streamed immutable release artifact.';

COMMENT ON COLUMN dataset_release.artifact_provider_version_id IS
    'Provider version returned when the immutable release artifact was stored.';

-- Down Migration

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM dataset_release WHERE artifact_storage_key IS NOT NULL
    ) THEN
        RAISE EXCEPTION
            'Cannot remove streamed dataset release references while stored artifacts exist.';
    END IF;
END;
$$;

ALTER TABLE dataset_release
    DROP CONSTRAINT dataset_release_artifact_location_ck,
    DROP COLUMN artifact_provider_version_id,
    DROP COLUMN artifact_storage_key,
    ALTER COLUMN artifact_text SET NOT NULL;
