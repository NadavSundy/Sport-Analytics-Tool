-- Up Migration

ALTER TABLE app_user
    ADD COLUMN submitter_access_updated_at timestamptz,
    ADD COLUMN submitter_access_updated_by bigint REFERENCES app_user (app_user_id) ON DELETE SET NULL;

COMMENT ON COLUMN app_user.submitter_access_updated_at IS
    'Time of the most recent administrator change to submitter approval, role, or competition scope.';

COMMENT ON COLUMN app_user.submitter_access_updated_by IS
    'Application administrator account that most recently changed submitter access.';

CREATE INDEX app_user_submitter_access_updated_by_idx
    ON app_user (submitter_access_updated_by)
    WHERE submitter_access_updated_by IS NOT NULL;

-- Down Migration

DROP INDEX IF EXISTS app_user_submitter_access_updated_by_idx;

ALTER TABLE app_user
    DROP COLUMN IF EXISTS submitter_access_updated_by,
    DROP COLUMN IF EXISTS submitter_access_updated_at;
