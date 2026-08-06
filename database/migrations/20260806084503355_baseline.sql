-- Up Migration

-- Baseline migration.
--
-- This migration deliberately creates no product table. Its purpose is to
-- establish that the migration mechanism works end to end: that a migration can
-- be applied, recorded and rolled back against the hosted database.
--
-- The sport-specific schema is designed and applied by a separate issue. Nothing
-- in this file should be extended to hold it.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE database_health (
    id            integer PRIMARY KEY DEFAULT 1,
    initialised_at timestamptz NOT NULL DEFAULT now(),
    note          text NOT NULL,
    CONSTRAINT database_health_single_row CHECK (id = 1)
);

COMMENT ON TABLE database_health IS
    'Baseline table proving the migration mechanism works, and providing a target
     for the scheduled keep-alive query. Holds no product data.';

INSERT INTO database_health (note)
VALUES ('Baseline migration applied. No product schema present.');

-- Down Migration

DROP TABLE IF EXISTS database_health;