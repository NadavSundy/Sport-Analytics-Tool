-- Up Migration

-- Extend the existing provider-neutral application account with the minimum
-- server-owned state needed for approval and competition-scoped authorisation.

ALTER TABLE app_user
    ADD COLUMN submitter_approval_state text NOT NULL DEFAULT 'not_requested',
    ADD COLUMN last_authenticated_at timestamptz NOT NULL DEFAULT now(),
    ADD CONSTRAINT app_user_application_role_ck
        CHECK (application_role IN ('viewer', 'administrator')),
    ADD CONSTRAINT app_user_submitter_approval_state_ck
        CHECK (submitter_approval_state IN ('not_requested', 'pending', 'approved', 'rejected'));

CREATE TABLE submitter_competition_scope (
    app_user_id   bigint NOT NULL REFERENCES app_user ON DELETE CASCADE,
    competition_id bigint NOT NULL REFERENCES competition ON DELETE CASCADE,
    created_at    timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (app_user_id, competition_id)
);

COMMENT ON COLUMN app_user.submitter_approval_state IS
    'Server-owned submission approval state. Authentication alone never changes this value.';

COMMENT ON TABLE submitter_competition_scope IS
    'Server-owned competition grants for approved submitters. Client-supplied role or scope values are never authoritative.';

CREATE INDEX submitter_competition_scope_competition_idx
    ON submitter_competition_scope (competition_id, app_user_id);

-- Down Migration

DROP INDEX IF EXISTS submitter_competition_scope_competition_idx;
DROP TABLE IF EXISTS submitter_competition_scope;

ALTER TABLE app_user
    DROP CONSTRAINT IF EXISTS app_user_submitter_approval_state_ck,
    DROP CONSTRAINT IF EXISTS app_user_application_role_ck,
    DROP COLUMN IF EXISTS last_authenticated_at,
    DROP COLUMN IF EXISTS submitter_approval_state;
