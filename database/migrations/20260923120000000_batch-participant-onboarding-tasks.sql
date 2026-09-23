-- Up Migration
-- Issue #708. Fixture onboarding reported the participants it could not place
-- only in the HTTP response body of the decision that found them. Nothing was
-- persisted, so the work existed for exactly one request: the batch report
-- could not show it, revalidation could not know it was outstanding, and a
-- reviewer who closed the tab lost it. This is that work, recorded.

CREATE TABLE batch_participant_onboarding_task (
    batch_id            bigint NOT NULL REFERENCES batch (batch_id) ON DELETE CASCADE,
    fixture_id          bigint NOT NULL REFERENCES fixture (fixture_id) ON DELETE CASCADE,
    participant_key     text NOT NULL,
    submitted_name      text NOT NULL CHECK (length(btrim(submitted_name)) > 0),
    submitted_source_id text,
    submitted_team_name text,
    reason              text NOT NULL CHECK (
                            reason IN (
                                'team_not_recognised',
                                'no_durable_identifier',
                                'ambiguous_name',
                                'identifier_not_found'
                            )
                        ),
    candidates          jsonb NOT NULL DEFAULT '[]'::jsonb,
    state               text NOT NULL DEFAULT 'outstanding'
                            CHECK (state IN ('outstanding', 'onboarded')),
    person_id           bigint REFERENCES person (person_id),
    first_reported_at   timestamptz NOT NULL DEFAULT now(),
    last_reported_at    timestamptz NOT NULL DEFAULT now(),
    onboarded_at        timestamptz,

    PRIMARY KEY (batch_id, fixture_id, participant_key),

    -- An onboarded task names the person it became and when; an outstanding one
    -- names neither. The two states cannot be told apart by a null check alone,
    -- so the constraint is what keeps them honest.
    CONSTRAINT batch_participant_onboarding_task_state_ck CHECK (
        (state = 'onboarded' AND person_id IS NOT NULL AND onboarded_at IS NOT NULL)
        OR (state = 'outstanding' AND person_id IS NULL AND onboarded_at IS NULL)
    )
);

-- The validation job asks one question of this table, once per batch: is any
-- task still outstanding? The partial index answers it without reading the
-- tasks already dealt with.
CREATE INDEX batch_participant_onboarding_task_outstanding_idx
    ON batch_participant_onboarding_task (batch_id)
    WHERE state = 'outstanding';

COMMENT ON TABLE batch_participant_onboarding_task IS
    'Participants a reviewer-created fixture could not onboard deterministically, and the
     decision each one needs. A row is the unit of outstanding onboarding work for a batch:
     while any row is outstanding the batch is not terminally rejected.';

COMMENT ON COLUMN batch_participant_onboarding_task.participant_key IS
    'Stable identity of the submitted participant within its fixture: the source identifier
     where one was submitted, otherwise the name and team. Matches the key fixture onboarding
     collects by, so a repeated decision updates its task rather than adding another.
     A reviewer decision must address a task by this value, never by re-deriving a key from
     what the decision itself supplies: answering "no durable identifier" with an identifier
     changes the derived key from name:... to source:..., so the original task would never be
     matched, would stay outstanding for ever, and would hold the batch in awaiting_review
     permanently - the mirror of the defect this table exists to fix.';

COMMENT ON COLUMN batch_participant_onboarding_task.candidates IS
    'Existing people sharing the submitted name, by display name or alias. Offered to the
     reviewer as candidates; never matched automatically, because a name is not an identity.';

COMMENT ON COLUMN batch_participant_onboarding_task.first_reported_at IS
    'When this participant was first found to need a decision. Retained across repeated
     decisions so the provenance of the work is not reset by looking at it again.';

-- Down Migration

DROP TABLE IF EXISTS batch_participant_onboarding_task;
