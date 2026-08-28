-- Up Migration

CREATE TABLE submitter_access_history (
    submitter_access_history_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    app_user_id bigint NOT NULL REFERENCES app_user (app_user_id) ON DELETE CASCADE,
    action text NOT NULL CHECK (action IN ('requested', 'approved', 'rejected', 'revoked')),
    competition_id bigint REFERENCES competition (competition_id) ON DELETE SET NULL,
    administrator_app_user_id bigint REFERENCES app_user (app_user_id) ON DELETE SET NULL,
    occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX submitter_access_history_user_occurred_at_idx
    ON submitter_access_history (app_user_id, occurred_at DESC, submitter_access_history_id DESC);

CREATE INDEX submitter_access_history_revoked_idx
    ON submitter_access_history (app_user_id)
    WHERE action = 'revoked';

INSERT INTO submitter_access_history (app_user_id, action, competition_id, administrator_app_user_id, occurred_at)
SELECT app_user_id, 'revoked', submitter_requested_competition_id, submitter_access_updated_by,
       COALESCE(submitter_access_updated_at, updated_at)
FROM app_user
WHERE application_role = 'viewer'
  AND submitter_approval_state = 'approved';

COMMENT ON TABLE submitter_access_history IS
    'Immutable submitter-access request, decision and revocation history.';

-- Down Migration

DROP TABLE IF EXISTS submitter_access_history;
