-- Up Migration

ALTER TABLE app_user
    ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

COMMENT ON COLUMN app_user.updated_at IS
    'Time of the most recent change to the application account record.';

CREATE FUNCTION set_app_user_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER app_user_set_updated_at
    BEFORE UPDATE ON app_user
    FOR EACH ROW
    EXECUTE FUNCTION set_app_user_updated_at();

-- Down Migration

DROP TRIGGER IF EXISTS app_user_set_updated_at ON app_user;
DROP FUNCTION IF EXISTS set_app_user_updated_at();

ALTER TABLE app_user
    DROP COLUMN IF EXISTS updated_at;