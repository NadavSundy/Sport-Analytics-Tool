-- Up Migration

-- Account deletion preserves the app_user row and every provenance relationship.
-- The state machine makes the non-transactional Supabase Auth step recoverable
-- without ever re-enabling an account whose deletion has started.

ALTER TABLE app_user
    ADD COLUMN deletion_state text NOT NULL DEFAULT 'active',
    ADD COLUMN deletion_requested_at timestamptz,
    ADD COLUMN auth_deleted_at timestamptz,
    ADD COLUMN deletion_failed_at timestamptz,
    ADD COLUMN deleted_at timestamptz,
    ADD COLUMN deleted_auth_subject_hash varchar(64),
    ADD CONSTRAINT app_user_deletion_state_ck
        CHECK (deletion_state IN (
          'active',
          'auth_pending',
          'auth_failed',
          'finalization_pending',
          'finalization_failed',
          'deleted'
        )),
    ADD CONSTRAINT app_user_deleted_subject_hash_ck
        CHECK (
          deleted_auth_subject_hash IS NULL
          OR deleted_auth_subject_hash ~ '^[0-9a-f]{64}$'
        ),
    ADD CONSTRAINT app_user_deletion_lifecycle_ck
        CHECK (
          (
            deletion_state = 'active'
            AND deletion_requested_at IS NULL
            AND auth_deleted_at IS NULL
            AND deletion_failed_at IS NULL
            AND deleted_at IS NULL
            AND deleted_auth_subject_hash IS NULL
          )
          OR
          (
            deletion_state = 'auth_pending'
            AND disabled_at IS NOT NULL
            AND deletion_requested_at IS NOT NULL
            AND auth_deleted_at IS NULL
            AND deletion_failed_at IS NULL
            AND deleted_at IS NULL
            AND deleted_auth_subject_hash IS NULL
          )
          OR
          (
            deletion_state = 'auth_failed'
            AND disabled_at IS NOT NULL
            AND deletion_requested_at IS NOT NULL
            AND auth_deleted_at IS NULL
            AND deletion_failed_at IS NOT NULL
            AND deleted_at IS NULL
            AND deleted_auth_subject_hash IS NULL
          )
          OR
          (
            deletion_state = 'finalization_pending'
            AND disabled_at IS NOT NULL
            AND deletion_requested_at IS NOT NULL
            AND auth_deleted_at IS NOT NULL
            AND deletion_failed_at IS NULL
            AND deleted_at IS NULL
            AND deleted_auth_subject_hash IS NULL
          )
          OR
          (
            deletion_state = 'finalization_failed'
            AND disabled_at IS NOT NULL
            AND deletion_requested_at IS NOT NULL
            AND auth_deleted_at IS NOT NULL
            AND deletion_failed_at IS NOT NULL
            AND deleted_at IS NULL
            AND deleted_auth_subject_hash IS NULL
          )
          OR
          (
            deletion_state = 'deleted'
            AND disabled_at IS NOT NULL
            AND deletion_requested_at IS NOT NULL
            AND auth_deleted_at IS NOT NULL
            AND deletion_failed_at IS NULL
            AND deleted_at IS NOT NULL
            AND deleted_auth_subject_hash IS NOT NULL
          )
        );

CREATE UNIQUE INDEX app_user_deleted_auth_subject_hash_unique
    ON app_user (deleted_auth_subject_hash)
    WHERE deleted_auth_subject_hash IS NOT NULL;

COMMENT ON COLUMN app_user.deletion_state IS
    'Recoverable account-deletion stage. Any non-active value must remain disabled.';

COMMENT ON COLUMN app_user.deleted_auth_subject_hash IS
    'One-way revocation marker for the former high-entropy Auth subject. Never exposed through the API.';

-- The submission.submitted_by foreign key intentionally remains RESTRICT/NO ACTION.
-- No submission, delivery, fixture, statistic, or provenance row cascades from app_user.

-- Down Migration

-- Recovery guard: dropping these columns after deletion starts would discard the
-- revocation marker and could let an old JWT create a replacement account.
DO $$
BEGIN
    IF EXISTS (
      SELECT 1
      FROM app_user
      WHERE deletion_state <> 'active'
         OR deletion_requested_at IS NOT NULL
         OR auth_deleted_at IS NOT NULL
         OR deletion_failed_at IS NOT NULL
         OR deleted_at IS NOT NULL
         OR deleted_auth_subject_hash IS NOT NULL
    ) THEN
      RAISE EXCEPTION
        'Cannot roll back account deletion schema while deletion state exists';
    END IF;
END;
$$;

DROP INDEX IF EXISTS app_user_deleted_auth_subject_hash_unique;

ALTER TABLE app_user
    DROP CONSTRAINT IF EXISTS app_user_deletion_lifecycle_ck,
    DROP CONSTRAINT IF EXISTS app_user_deleted_subject_hash_ck,
    DROP CONSTRAINT IF EXISTS app_user_deletion_state_ck,
    DROP COLUMN IF EXISTS deleted_auth_subject_hash,
    DROP COLUMN IF EXISTS deleted_at,
    DROP COLUMN IF EXISTS deletion_failed_at,
    DROP COLUMN IF EXISTS auth_deleted_at,
    DROP COLUMN IF EXISTS deletion_requested_at,
    DROP COLUMN IF EXISTS deletion_state;
