-- Up Migration
-- Refs #286

CREATE TABLE statistics_refresh_dependency (
    statistics_refresh_dependency_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    source_event_id uuid NOT NULL,
    delivery_revision integer NOT NULL CHECK (delivery_revision > 0),
    fixture_id bigint NOT NULL REFERENCES fixture,
    scope text NOT NULL CHECK (scope IN ('fixture', 'season', 'competition', 'career')),
    participant_id bigint REFERENCES person,
    competition_id bigint REFERENCES competition,
    season text,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (source_event_id, delivery_revision, scope, participant_id)
);

COMMENT ON TABLE statistics_refresh_dependency IS
    'Atomic, observable dependency journal for correction-driven statistic refreshes. The current API derives values from delivery_current; rows name only the scopes whose inputs changed, so a future materialized projection or cache can refresh or invalidate them without scanning unrelated history.';

CREATE INDEX statistics_refresh_dependency_fixture_idx
    ON statistics_refresh_dependency (fixture_id, created_at DESC);

CREATE INDEX statistics_refresh_dependency_participant_idx
    ON statistics_refresh_dependency (participant_id, scope, created_at DESC)
    WHERE participant_id IS NOT NULL;

-- Down Migration
DROP TABLE IF EXISTS statistics_refresh_dependency;
