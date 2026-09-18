-- Up Migration
-- Issue #596: pin each asynchronous dataset release to one durable database snapshot.

ALTER TABLE dataset_release
    ADD COLUMN snapshot_id uuid,
    ADD COLUMN snapshot_as_of timestamptz;

ALTER TABLE dataset_release
    ADD CONSTRAINT dataset_release_snapshot_identity_ck CHECK (
        (snapshot_id IS NULL AND snapshot_as_of IS NULL)
        OR (snapshot_id IS NOT NULL AND snapshot_as_of IS NOT NULL)
    );

ALTER TABLE dataset_release_job
    ADD COLUMN snapshot_id uuid,
    ADD COLUMN snapshot_as_of timestamptz;

ALTER TABLE dataset_release_job
    ADD CONSTRAINT dataset_release_job_snapshot_identity_ck CHECK (
        (snapshot_id IS NULL AND snapshot_as_of IS NULL)
        OR (snapshot_id IS NOT NULL AND snapshot_as_of IS NOT NULL)
    );

CREATE TABLE dataset_release_snapshot_event (
    job_id          uuid NOT NULL REFERENCES dataset_release_job (job_id) ON DELETE RESTRICT,
    fixture_id       bigint NOT NULL,
    innings_ordinal  integer NOT NULL,
    sequence_number  integer NOT NULL,
    event_id         bigint NOT NULL,
    event            jsonb NOT NULL,

    PRIMARY KEY (job_id, fixture_id, innings_ordinal, sequence_number, event_id)
);

COMMENT ON TABLE dataset_release_snapshot_event IS
    'Durable, ordered accepted-delivery rows captured atomically before asynchronous release generation pages are read.';
COMMENT ON COLUMN dataset_release.snapshot_id IS
    'Opaque identity of the durable source snapshot used to produce this immutable artifact.';
COMMENT ON COLUMN dataset_release.snapshot_as_of IS
    'Database transaction time at which the durable source snapshot was captured.';

-- Down Migration

DROP TABLE IF EXISTS dataset_release_snapshot_event;

ALTER TABLE dataset_release_job
    DROP CONSTRAINT dataset_release_job_snapshot_identity_ck,
    DROP COLUMN snapshot_as_of,
    DROP COLUMN snapshot_id;

ALTER TABLE dataset_release
    DROP CONSTRAINT dataset_release_snapshot_identity_ck,
    DROP COLUMN snapshot_as_of,
    DROP COLUMN snapshot_id;
