-- Up Migration

-- Refuse to guess how an unexpected role should map. The preceding account
-- authorisation migration permits only viewer and administrator. The two target
-- roles are also accepted so the guard remains safe if a deployment was repaired
-- manually before this migration runs.
DO $$
DECLARE
    unsupported_roles text;
BEGIN
    SELECT string_agg(role_value, ', ' ORDER BY role_value)
    INTO unsupported_roles
    FROM (
        SELECT DISTINCT COALESCE(quote_literal(application_role), 'NULL') AS role_value
        FROM app_user
        WHERE application_role IS NULL
           OR application_role NOT IN ('viewer', 'administrator', 'submitter', 'admin')
    ) unsupported;

    IF unsupported_roles IS NOT NULL THEN
        RAISE EXCEPTION
            'Cannot standardise app_user.application_role; unsupported values: %',
            unsupported_roles;
    END IF;
END;
$$;

ALTER TABLE app_user
    DROP CONSTRAINT IF EXISTS app_user_application_role_ck;

UPDATE app_user
SET application_role = 'admin'
WHERE application_role = 'administrator';

UPDATE app_user
SET application_role = 'submitter'
WHERE application_role = 'viewer'
  AND submitter_approval_state = 'approved';

ALTER TABLE app_user
    ALTER COLUMN application_role SET DEFAULT 'viewer',
    ALTER COLUMN application_role SET NOT NULL,
    ADD CONSTRAINT app_user_application_role_ck
        CHECK (application_role IN ('viewer', 'submitter', 'admin'));

COMMENT ON COLUMN app_user.application_role IS
    'Server-owned application role. Valid values are viewer, submitter and admin. Submission still requires a matching competition scope.';

COMMENT ON COLUMN app_user.submitter_approval_state IS
    'Deprecated submitter-request workflow state retained for compatibility. application_role is authoritative for submission access.';

-- Down Migration

DO $$
DECLARE
    unsupported_roles text;
BEGIN
    SELECT string_agg(role_value, ', ' ORDER BY role_value)
    INTO unsupported_roles
    FROM (
        SELECT DISTINCT COALESCE(quote_literal(application_role), 'NULL') AS role_value
        FROM app_user
        WHERE application_role IS NULL
           OR application_role NOT IN ('viewer', 'submitter', 'admin', 'administrator')
    ) unsupported;

    IF unsupported_roles IS NOT NULL THEN
        RAISE EXCEPTION
            'Cannot restore legacy app_user.application_role; unsupported values: %',
            unsupported_roles;
    END IF;
END;
$$;

ALTER TABLE app_user
    DROP CONSTRAINT IF EXISTS app_user_application_role_ck;

UPDATE app_user
SET submitter_approval_state = 'approved'
WHERE application_role = 'submitter';

UPDATE app_user
SET application_role = 'viewer'
WHERE application_role = 'submitter';

UPDATE app_user
SET application_role = 'administrator'
WHERE application_role = 'admin';

ALTER TABLE app_user
    ALTER COLUMN application_role SET DEFAULT 'viewer',
    ALTER COLUMN application_role SET NOT NULL,
    ADD CONSTRAINT app_user_application_role_ck
        CHECK (application_role IN ('viewer', 'administrator'));

COMMENT ON COLUMN app_user.application_role IS
    'Server-owned application role. Legacy valid values are viewer and administrator. Submitter approval and competition scope are independent.';

COMMENT ON COLUMN app_user.submitter_approval_state IS
    'Server-owned submission approval state. Authentication alone never changes this value.';
