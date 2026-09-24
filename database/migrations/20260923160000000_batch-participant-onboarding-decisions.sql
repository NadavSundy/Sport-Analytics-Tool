-- Up Migration
-- Issue #708, Pull Request 2. A reviewer needs a handle to address a task by,
-- and the task needs to record who settled it.

ALTER TABLE batch_participant_onboarding_task
    ADD COLUMN task_reference uuid NOT NULL DEFAULT gen_random_uuid(),
    ADD COLUMN decided_by     bigint REFERENCES app_user (app_user_id) ON DELETE RESTRICT,
    ADD COLUMN decision_key   text;

ALTER TABLE batch_participant_onboarding_task
    ADD CONSTRAINT batch_participant_onboarding_task_reference_key UNIQUE (task_reference);

-- An onboarded task now names the reviewer who decided it as well as the person
-- it became. Provenance for a created squad membership is the point of the row:
-- without the actor it records that something happened but not who did it.
ALTER TABLE batch_participant_onboarding_task
    DROP CONSTRAINT batch_participant_onboarding_task_state_ck;

ALTER TABLE batch_participant_onboarding_task
    ADD CONSTRAINT batch_participant_onboarding_task_state_ck CHECK (
        (
            state = 'onboarded'
            AND person_id IS NOT NULL
            AND onboarded_at IS NOT NULL
            AND decided_by IS NOT NULL
        )
        OR (
            state = 'outstanding'
            AND person_id IS NULL
            AND onboarded_at IS NULL
            AND decided_by IS NULL
        )
    );

COMMENT ON COLUMN batch_participant_onboarding_task.task_reference IS
    'The handle a reviewer decision addresses this task by. Opaque and unique, so a decision
     never derives an identity from what it supplies: answering a no_durable_identifier task
     with an identifier, or a team_not_recognised task with a team, changes the value
     participant_key would derive, and a decision that re-derived it would match no task,
     leave the original outstanding for ever and hold the batch in awaiting_review
     permanently. participant_key is also not unique within a batch, since two fixtures can
     each name the same person.';

COMMENT ON COLUMN batch_participant_onboarding_task.decided_by IS
    'The reviewer whose decision onboarded this participant. Null while the task is
     outstanding, and required once it is not.';

COMMENT ON COLUMN batch_participant_onboarding_task.decision_key IS
    'The idempotency key of the request that settled this task, for audit consistency with
     the other reviewer decision endpoints. Replay is decided by task state rather than by
     this key: a decision against an already onboarded task is a no-op.';

-- Supersedes the instruction recorded with the table in Pull Request 1, which named
-- participant_key as the handle before it was established that a decision can mutate it.
COMMENT ON COLUMN batch_participant_onboarding_task.participant_key IS
    'Stable identity of the submitted participant within its fixture: the source identifier
     where one was submitted, otherwise the name and team. Matches the key fixture onboarding
     collects by, so a repeated decision updates its task rather than adding another.
     It is how onboarding finds a task, not how a reviewer addresses one: a decision uses
     task_reference, because supplying an identifier or a team changes what this value would
     derive to.';

-- Down Migration

ALTER TABLE batch_participant_onboarding_task
    DROP CONSTRAINT batch_participant_onboarding_task_state_ck;

ALTER TABLE batch_participant_onboarding_task
    ADD CONSTRAINT batch_participant_onboarding_task_state_ck CHECK (
        (state = 'onboarded' AND person_id IS NOT NULL AND onboarded_at IS NOT NULL)
        OR (state = 'outstanding' AND person_id IS NULL AND onboarded_at IS NULL)
    );

ALTER TABLE batch_participant_onboarding_task
    DROP CONSTRAINT batch_participant_onboarding_task_reference_key;

ALTER TABLE batch_participant_onboarding_task
    DROP COLUMN decision_key,
    DROP COLUMN decided_by,
    DROP COLUMN task_reference;
