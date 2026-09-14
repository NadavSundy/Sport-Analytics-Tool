-- Up Migration
-- Issue #533: generate immutable dataset releases in the existing durable worker.

ALTER TABLE dataset_release
    ADD COLUMN deployment_environment text NOT NULL DEFAULT 'dev',
    ADD COLUMN artifact_storage_provider text,
    ADD COLUMN artifact_storage_location text;

ALTER TABLE dataset_release ALTER COLUMN deployment_environment DROP DEFAULT;
ALTER TABLE dataset_release DROP CONSTRAINT dataset_release_version_key;
ALTER TABLE dataset_release
    ADD CONSTRAINT dataset_release_environment_version_key
        UNIQUE (deployment_environment, version),
    ADD CONSTRAINT dataset_release_deployment_environment_ck
        CHECK (deployment_environment ~ '^[a-z0-9][a-z0-9-]{0,31}$'),
    ADD CONSTRAINT dataset_release_storage_provider_ck
        CHECK (artifact_storage_provider IS NULL OR artifact_storage_provider IN ('azure', 'filesystem')),
    ADD CONSTRAINT dataset_release_storage_location_ck
        CHECK (artifact_storage_location IS NULL OR artifact_storage_location = 'release');

COMMENT ON COLUMN dataset_release.deployment_environment IS
    'Deployment namespace preventing filesystem-backed local releases from shadowing deployed releases in a shared database.';
COMMENT ON COLUMN dataset_release.artifact_storage_provider IS
    'Provider used for new object-backed artifacts; null identifies a legacy artifact.';
COMMENT ON COLUMN dataset_release.artifact_storage_location IS
    'Logical store used for new artifacts; null identifies legacy database/shared-container storage.';

CREATE TABLE dataset_release_job (
    job_id                  uuid PRIMARY KEY REFERENCES background_job (job_id) ON DELETE RESTRICT,
    requested_version       text NOT NULL,
    deployment_environment  text NOT NULL,
    storage_provider        text NOT NULL,
    release_id              uuid REFERENCES dataset_release (release_id) ON DELETE RESTRICT,
    events_processed        bigint NOT NULL DEFAULT 0,
    bytes_written           bigint NOT NULL DEFAULT 0,
    page_number             integer NOT NULL DEFAULT 0,
    last_fixture_id         bigint,
    last_innings_ordinal    integer,
    last_sequence_number    integer,
    last_event_id           bigint,
    lease_owner             text,
    lease_expires_at        timestamptz,
    attempt_storage_key     text,

    CONSTRAINT dataset_release_job_environment_version_key
        UNIQUE (deployment_environment, requested_version),
    CONSTRAINT dataset_release_job_version_ck
        CHECK (requested_version ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$'),
    CONSTRAINT dataset_release_job_environment_ck
        CHECK (deployment_environment ~ '^[a-z0-9][a-z0-9-]{0,31}$'),
    CONSTRAINT dataset_release_job_provider_ck
        CHECK (storage_provider IN ('azure', 'filesystem')),
    CONSTRAINT dataset_release_job_progress_ck
        CHECK (events_processed >= 0 AND bytes_written >= 0 AND page_number >= 0),
    CONSTRAINT dataset_release_job_cursor_ck CHECK (
        (last_fixture_id IS NULL AND last_innings_ordinal IS NULL
            AND last_sequence_number IS NULL AND last_event_id IS NULL)
        OR
        (last_fixture_id IS NOT NULL AND last_innings_ordinal IS NOT NULL
            AND last_sequence_number IS NOT NULL AND last_event_id IS NOT NULL)
    ),
    CONSTRAINT dataset_release_job_lease_ck CHECK (
        (lease_owner IS NULL) = (lease_expires_at IS NULL)
    )
);

COMMENT ON TABLE dataset_release_job IS
    'Mutable generation state. A public immutable dataset_release exists only after object publication succeeds.';
COMMENT ON COLUMN dataset_release_job.attempt_storage_key IS
    'Attempt-specific opaque key used to identify and clean an interrupted or unreferenced object.';

-- Down Migration

DROP TABLE IF EXISTS dataset_release_job;

ALTER TABLE dataset_release
    DROP CONSTRAINT dataset_release_storage_location_ck,
    DROP CONSTRAINT dataset_release_storage_provider_ck,
    DROP CONSTRAINT dataset_release_deployment_environment_ck,
    DROP CONSTRAINT dataset_release_environment_version_key,
    ADD CONSTRAINT dataset_release_version_key UNIQUE (version),
    DROP COLUMN artifact_storage_location,
    DROP COLUMN artifact_storage_provider,
    DROP COLUMN deployment_environment;
