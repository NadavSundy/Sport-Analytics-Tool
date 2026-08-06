-- Up Migration

-- Delivery event schema.
--
-- Implements the event model approved on 6 August 2026 and documented in
-- docs/database/schema.md. Every design decision below traces to a property of
-- the Cricsheet source data recorded in section 1 of that document.
--
-- Refs #27

-- ---------------------------------------------------------------------------
-- Reference entities
-- ---------------------------------------------------------------------------

CREATE TABLE dismissal_kind (
    code           text PRIMARY KEY,
    display_name   text NOT NULL,
    credits_bowler boolean NOT NULL,
    is_retirement  boolean NOT NULL DEFAULT false
);

COMMENT ON TABLE dismissal_kind IS
    'Controlled vocabulary for dismissals. A lookup table rather than an
     enumeration because the set is open: two kinds present in the full corpus
     were absent from the earlier subset, and extending an enumeration requires a
     migration.';

COMMENT ON COLUMN dismissal_kind.credits_bowler IS
    'Whether the dismissal is credited to the bowler. A run out is not.';

INSERT INTO dismissal_kind (code, display_name, credits_bowler, is_retirement) VALUES
    ('caught',                'Caught',                true,  false),
    ('bowled',                'Bowled',                true,  false),
    ('lbw',                   'LBW',                   true,  false),
    ('stumped',               'Stumped',               true,  false),
    ('caught and bowled',     'Caught and bowled',     true,  false),
    ('hit wicket',            'Hit wicket',            true,  false),
    ('run out',               'Run out',               false, false),
    ('obstructing the field', 'Obstructing the field', false, false),
    ('timed out',             'Timed out',             false, false),
    ('hit the ball twice',    'Hit the ball twice',    false, false),
    ('handled the ball',      'Handled the ball',      false, false),
    ('retired hurt',          'Retired hurt',          false, true),
    ('retired out',           'Retired out',           false, true),
    ('retired not out',       'Retired not out',       false, true);

CREATE TABLE person (
    person_id    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    source_ref   text NOT NULL UNIQUE,
    display_name text NOT NULL
);

COMMENT ON COLUMN person.source_ref IS
    'Stable identifier from info.registry.people. Names are not stable: 168 names
     in the corpus map to more than one person and 40 identifiers map to more than
     one name. Names must never be used as a join key.';

CREATE TABLE person_alias (
    person_id  bigint NOT NULL REFERENCES person ON DELETE CASCADE,
    name       text   NOT NULL,
    first_seen date,
    PRIMARY KEY (person_id, name)
);

COMMENT ON TABLE person_alias IS
    'Every name ever observed for a person, so that a name in an older submission
     still resolves after the source renames or disambiguates it.';

CREATE TABLE official (
    official_id  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    display_name text NOT NULL,
    source       text NOT NULL DEFAULT 'cricsheet',
    external_ref text
);

COMMENT ON TABLE official IS
    'Officials are kept separate from person because the source provides no stable
     identifier for them. Merging them on name would assert an identity that
     cannot be established.';

CREATE TABLE team (
    team_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name    text NOT NULL UNIQUE
);

CREATE TABLE venue (
    venue_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name     text NOT NULL,
    city     text,
    CONSTRAINT venue_name_city_key UNIQUE NULLS NOT DISTINCT (name, city)
);

CREATE TABLE competition (
    competition_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name           text NOT NULL UNIQUE
);

-- ---------------------------------------------------------------------------
-- Identity and provenance
-- ---------------------------------------------------------------------------

CREATE TABLE app_user (
    app_user_id      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    auth_provider    text NOT NULL,
    auth_subject     text NOT NULL,
    display_name     text,
    application_role text NOT NULL DEFAULT 'viewer',
    created_at       timestamptz NOT NULL DEFAULT now(),
    disabled_at      timestamptz,
    UNIQUE (auth_provider, auth_subject)
);

COMMENT ON TABLE app_user IS
    'Minimal local identity record. Keyed on provider and provider subject rather
     than on any provider-specific column, so the schema does not depend on the
     current authentication provider. Personal data remains with that provider.';

CREATE TYPE submission_status AS ENUM ('pending', 'accepted', 'rejected');

CREATE TABLE submission (
    submission_id    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    submitted_by     bigint REFERENCES app_user,
    received_at      timestamptz NOT NULL DEFAULT now(),
    source_filename  text,
    source_sha256    char(64),
    status           submission_status NOT NULL DEFAULT 'pending',
    rejection_detail jsonb,
    CONSTRAINT submission_rejection_detail_ck
        CHECK ((status = 'rejected') = (rejection_detail IS NOT NULL))
);

-- ---------------------------------------------------------------------------
-- Fixtures
-- ---------------------------------------------------------------------------

CREATE TYPE outcome_kind AS ENUM ('won', 'tie', 'draw', 'no result');

CREATE TABLE fixture (
    fixture_id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    source_ref          text NOT NULL UNIQUE,
    competition_id      bigint REFERENCES competition,
    event_match_number  int,
    event_group         text,
    event_stage         text,
    season              text NOT NULL,
    match_type          text NOT NULL,
    team_type           text NOT NULL,
    gender              text NOT NULL,
    balls_per_over      smallint NOT NULL,
    scheduled_overs     smallint,
    venue_id            bigint REFERENCES venue,
    start_date          date NOT NULL,
    end_date            date NOT NULL,
    toss_winner_id      bigint REFERENCES team,
    toss_decision       text CHECK (toss_decision IN ('bat', 'field')),
    toss_uncontested    boolean NOT NULL DEFAULT false,
    outcome             outcome_kind NOT NULL,
    winner_id           bigint REFERENCES team,
    eliminator_id       bigint REFERENCES team,
    outcome_by_runs     int,
    outcome_by_wickets  int,
    outcome_method      text,
    decided_by_bowl_out boolean NOT NULL DEFAULT false,
    missing_fields      text[] NOT NULL DEFAULT '{}',
    source_version      text NOT NULL,
    source_revision     int NOT NULL,
    first_seen_in       bigint REFERENCES submission,

    CONSTRAINT fixture_dates_ck  CHECK (end_date >= start_date),
    CONSTRAINT fixture_winner_ck CHECK ((outcome = 'won') = (winner_id IS NOT NULL)),
    CONSTRAINT fixture_margin_ck
        CHECK (num_nonnulls(outcome_by_runs, outcome_by_wickets) <= 1)
);

COMMENT ON COLUMN fixture.season IS
    'Stored as text. Seasons take the form 2016/17 and are not integers.';

COMMENT ON COLUMN fixture.decided_by_bowl_out IS
    'Two matches in the corpus were decided by a bowl-out, an obsolete
     tie-breaker. The individual attempts are deliberately not modelled; only the
     fact that the fixture was decided this way is recorded.';

CREATE TABLE fixture_team (
    fixture_id bigint   NOT NULL REFERENCES fixture ON DELETE CASCADE,
    team_id    bigint   NOT NULL REFERENCES team,
    ordinal    smallint NOT NULL CHECK (ordinal IN (1, 2)),
    PRIMARY KEY (fixture_id, team_id),
    UNIQUE (fixture_id, ordinal)
);

CREATE TABLE fixture_squad (
    fixture_id bigint NOT NULL REFERENCES fixture ON DELETE CASCADE,
    person_id  bigint NOT NULL REFERENCES person,
    team_id    bigint NOT NULL REFERENCES team,
    role       text,
    PRIMARY KEY (fixture_id, person_id)
);

COMMENT ON COLUMN fixture_squad.role IS
    'Null for an ordinary squad member. Set to supersub for the 42 matches
     carrying the Big Bash substitute rule.';

CREATE TABLE fixture_official (
    fixture_id  bigint NOT NULL REFERENCES fixture ON DELETE CASCADE,
    official_id bigint NOT NULL REFERENCES official,
    role        text   NOT NULL,
    PRIMARY KEY (fixture_id, official_id, role)
);

CREATE TABLE fixture_player_of_match (
    fixture_id bigint NOT NULL REFERENCES fixture ON DELETE CASCADE,
    person_id  bigint NOT NULL REFERENCES person,
    PRIMARY KEY (fixture_id, person_id)
);

-- ---------------------------------------------------------------------------
-- Innings
-- ---------------------------------------------------------------------------

CREATE TABLE innings (
    innings_id      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    fixture_id      bigint   NOT NULL REFERENCES fixture ON DELETE CASCADE,
    ordinal         smallint NOT NULL,
    batting_team_id bigint   NOT NULL REFERENCES team,
    is_super_over   boolean  NOT NULL DEFAULT false,
    declared        boolean  NOT NULL DEFAULT false,
    forfeited       boolean  NOT NULL DEFAULT false,
    target_runs     int,
    target_overs    numeric(4,1),
    penalty_pre     int,
    penalty_post    int,
    UNIQUE (fixture_id, ordinal)
);

COMMENT ON COLUMN innings.ordinal IS
    'Zero-based, matching the source order. Not constrained to two values: 99
     matches carry four innings, the last two being a super over.';

COMMENT ON COLUMN innings.penalty_pre IS
    'Penalty runs belong to the innings and to no delivery. A team total cannot be
     derived from delivery rows alone.';

CREATE TABLE innings_powerplay (
    innings_id bigint       NOT NULL REFERENCES innings ON DELETE CASCADE,
    from_ball  numeric(5,2) NOT NULL,
    to_ball    numeric(5,2) NOT NULL,
    type       text         NOT NULL,
    PRIMARY KEY (innings_id, from_ball, type)
);

CREATE TABLE innings_absent (
    innings_id bigint NOT NULL REFERENCES innings ON DELETE CASCADE,
    person_id  bigint NOT NULL REFERENCES person,
    reason     text   NOT NULL DEFAULT 'absent_hurt',
    PRIMARY KEY (innings_id, person_id)
);

CREATE TABLE innings_miscounted_over (
    innings_id  bigint   NOT NULL REFERENCES innings ON DELETE CASCADE,
    over_number smallint NOT NULL,
    balls       smallint NOT NULL,
    PRIMARY KEY (innings_id, over_number)
);

COMMENT ON TABLE innings_miscounted_over IS
    'Records overs the umpire miscounted, which legitimately hold five or seven
     legal balls. The source supplies the ball count as a string in some matches
     and an integer in others; ingestion coerces it. This table explains an
     irregularity and is not a derivation input: legal balls are counted from the
     delivery rows themselves.';

-- ---------------------------------------------------------------------------
-- Deliveries
-- ---------------------------------------------------------------------------

CREATE TABLE delivery (
    delivery_id      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    innings_id       bigint   NOT NULL REFERENCES innings ON DELETE CASCADE,
    over_number      smallint NOT NULL,
    position_in_over smallint NOT NULL,
    innings_sequence int      NOT NULL,
    ball_number      text     NOT NULL,

    striker_id       bigint NOT NULL REFERENCES person,
    non_striker_id   bigint NOT NULL REFERENCES person,
    bowler_id        bigint NOT NULL REFERENCES person,

    runs_off_bat     smallint NOT NULL DEFAULT 0,
    runs_extras      smallint NOT NULL DEFAULT 0,
    runs_total       smallint NOT NULL,
    non_boundary     boolean  NOT NULL DEFAULT false,

    extra_wides      smallint,
    extra_noballs    smallint,
    extra_byes       smallint,
    extra_legbyes    smallint,
    extra_penalty    smallint,

    revision         int NOT NULL DEFAULT 1,
    submission_id    bigint NOT NULL REFERENCES submission,
    recorded_at      timestamptz NOT NULL DEFAULT now(),
    superseded_at    timestamptz,
    superseded_by    bigint REFERENCES delivery (delivery_id),

    CONSTRAINT delivery_runs_ck    CHECK (runs_total = runs_off_bat + runs_extras),
    CONSTRAINT delivery_striker_ck CHECK (striker_id <> non_striker_id),
    CONSTRAINT delivery_supersede_ck
        CHECK ((superseded_at IS NULL) = (superseded_by IS NULL))
);

COMMENT ON COLUMN delivery.position_in_over IS
    'Zero-based index within the source array. This is the identifying column: the
     printed ball number repeats within an over in 20.4% of overs, and one over
     holds nineteen deliveries of which six share the number 5.1.';

COMMENT ON COLUMN delivery.ball_number IS
    'Display only. Never unique, and never used to join.';

COMMENT ON COLUMN delivery.innings_sequence IS
    'Assigned at ingestion, not derived on read. A correction inherits the
     sequence of the revision it supersedes, so that the order of an innings does
     not shift beneath a consumer paging through it.';

-- Exactly one live row per natural key. Superseded revisions are exempt.
CREATE UNIQUE INDEX delivery_natural_key_live
    ON delivery (innings_id, over_number, position_in_over)
    WHERE superseded_at IS NULL;

CREATE UNIQUE INDEX delivery_sequence_live
    ON delivery (innings_id, innings_sequence)
    WHERE superseded_at IS NULL;

CREATE VIEW delivery_current AS
    SELECT * FROM delivery WHERE superseded_at IS NULL;

COMMENT ON VIEW delivery_current IS
    'The live state of every delivery. All derivation reads this view; correction
     history is available from the base table.';

CREATE TABLE delivery_wicket (
    wicket_id     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    delivery_id   bigint   NOT NULL REFERENCES delivery ON DELETE CASCADE,
    ordinal       smallint NOT NULL DEFAULT 0,
    kind          text     NOT NULL REFERENCES dismissal_kind (code),
    source_kind   text     NOT NULL,
    player_out_id bigint   NOT NULL REFERENCES person,
    UNIQUE (delivery_id, ordinal)
);

COMMENT ON COLUMN delivery_wicket.source_kind IS
    'The raw value from the source, retained for provenance even where it matches
     the resolved code.';

CREATE TABLE delivery_wicket_fielder (
    wicket_id     bigint   NOT NULL REFERENCES delivery_wicket ON DELETE CASCADE,
    ordinal       smallint NOT NULL,
    person_id     bigint   REFERENCES person,
    is_substitute boolean  NOT NULL DEFAULT false,
    PRIMARY KEY (wicket_id, ordinal),
    CONSTRAINT fielder_identified_ck
        CHECK (person_id IS NOT NULL OR is_substitute)
);

COMMENT ON COLUMN delivery_wicket_fielder.person_id IS
    'Nullable. 127 fielder records in the corpus identify a substitute with no
     name at all.';

CREATE TABLE delivery_review (
    delivery_id bigint PRIMARY KEY REFERENCES delivery ON DELETE CASCADE,
    by_team_id  bigint NOT NULL REFERENCES team,
    umpire_id   bigint REFERENCES official,
    batter_id   bigint REFERENCES person,
    decision    text NOT NULL,
    type        text
);

CREATE TABLE delivery_replacement (
    replacement_id   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    delivery_id      bigint NOT NULL REFERENCES delivery ON DELETE CASCADE,
    replacement_type text   NOT NULL CHECK (replacement_type IN ('role', 'player')),
    in_person_id     bigint NOT NULL REFERENCES person,
    out_person_id    bigint REFERENCES person,
    reason           text,
    role             text
);

COMMENT ON COLUMN delivery_replacement.out_person_id IS
    'Nullable: some replacement records name an incoming player and a reason
     without naming anyone replaced.';

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
-- Each index exists for a stated query path.

-- Batting and bowling aggregates across a player's career.
CREATE INDEX delivery_striker_idx ON delivery (striker_id) WHERE superseded_at IS NULL;
CREATE INDEX delivery_bowler_idx  ON delivery (bowler_id)  WHERE superseded_at IS NULL;

-- Correction history for one delivery.
CREATE INDEX delivery_superseded_by_idx ON delivery (superseded_by)
    WHERE superseded_by IS NOT NULL;

-- Retrieving the deliveries of one fixture.
CREATE INDEX innings_fixture_idx ON innings (fixture_id);

-- Filtering fixtures by competition, season and date.
CREATE INDEX fixture_competition_season_idx ON fixture (competition_id, season);
CREATE INDEX fixture_start_date_idx ON fixture (start_date);

-- Dismissal aggregates.
CREATE INDEX delivery_wicket_player_out_idx ON delivery_wicket (player_out_id);
CREATE INDEX delivery_wicket_delivery_idx   ON delivery_wicket (delivery_id);

-- Squad membership by player.
CREATE INDEX fixture_squad_person_idx ON fixture_squad (person_id);

-- Resolving a name to a person during ingestion.
CREATE INDEX person_alias_name_idx ON person_alias (name);

-- Down Migration

DROP INDEX IF EXISTS person_alias_name_idx;
DROP INDEX IF EXISTS fixture_squad_person_idx;
DROP INDEX IF EXISTS delivery_wicket_delivery_idx;
DROP INDEX IF EXISTS delivery_wicket_player_out_idx;
DROP INDEX IF EXISTS fixture_start_date_idx;
DROP INDEX IF EXISTS fixture_competition_season_idx;
DROP INDEX IF EXISTS innings_fixture_idx;
DROP INDEX IF EXISTS delivery_superseded_by_idx;
DROP INDEX IF EXISTS delivery_bowler_idx;
DROP INDEX IF EXISTS delivery_striker_idx;

DROP VIEW IF EXISTS delivery_current;

DROP TABLE IF EXISTS delivery_replacement;
DROP TABLE IF EXISTS delivery_review;
DROP TABLE IF EXISTS delivery_wicket_fielder;
DROP TABLE IF EXISTS delivery_wicket;
DROP TABLE IF EXISTS delivery;
DROP TABLE IF EXISTS innings_miscounted_over;
DROP TABLE IF EXISTS innings_absent;
DROP TABLE IF EXISTS innings_powerplay;
DROP TABLE IF EXISTS innings;
DROP TABLE IF EXISTS fixture_player_of_match;
DROP TABLE IF EXISTS fixture_official;
DROP TABLE IF EXISTS fixture_squad;
DROP TABLE IF EXISTS fixture_team;
DROP TABLE IF EXISTS fixture;
DROP TYPE  IF EXISTS outcome_kind;
DROP TABLE IF EXISTS submission;
DROP TYPE  IF EXISTS submission_status;
DROP TABLE IF EXISTS app_user;
DROP TABLE IF EXISTS competition;
DROP TABLE IF EXISTS venue;
DROP TABLE IF EXISTS team;
DROP TABLE IF EXISTS official;
DROP TABLE IF EXISTS person_alias;
DROP TABLE IF EXISTS person;
DROP TABLE IF EXISTS dismissal_kind;