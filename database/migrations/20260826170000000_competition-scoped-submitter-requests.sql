-- Up Migration

ALTER TABLE app_user
    ADD COLUMN submitter_requested_competition_id bigint
        REFERENCES competition (competition_id) ON DELETE RESTRICT;

COMMENT ON COLUMN app_user.submitter_requested_competition_id IS
    'Competition requested through the submitter-access workflow. This is request state, not an authorization grant.';

-- Down Migration

ALTER TABLE app_user
    DROP COLUMN IF EXISTS submitter_requested_competition_id;
