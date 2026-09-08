-- Up Migration
--
-- Issue #425: retain submitter reference-mapping decisions and distinguish the
-- current validation result from immutable results produced by earlier attempts.

CREATE TYPE batch_reference_mapping_state AS ENUM ('queued', 'applied', 'failed');

CREATE TABLE batch_reference_mapping_decision (
    decision_id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    decision_reference uuid NOT NULL UNIQUE,
    batch_id           bigint NOT NULL REFERENCES batch (batch_id) ON DELETE RESTRICT,
    item_ordinal       integer NOT NULL,
    reference_path     text NOT NULL,
    entity_type        text NOT NULL,
    candidate_id       bigint NOT NULL,
    candidate_label    text NOT NULL,
    actor_id           bigint NOT NULL REFERENCES app_user (app_user_id) ON DELETE RESTRICT,
    decision_key       text NOT NULL,
    state              batch_reference_mapping_state NOT NULL DEFAULT 'queued',
    error_message      text,
    decided_at         timestamptz NOT NULL DEFAULT now(),
    applied_at         timestamptz,

    CONSTRAINT batch_reference_mapping_path_key UNIQUE (batch_id, item_ordinal, reference_path),
    CONSTRAINT batch_reference_mapping_idempotency_key UNIQUE (batch_id, decision_key),
    CONSTRAINT batch_reference_mapping_path_ck CHECK (length(btrim(reference_path)) > 0),
    CONSTRAINT batch_reference_mapping_ordinal_ck CHECK (item_ordinal >= 0),
    CONSTRAINT batch_reference_mapping_entity_ck CHECK (
        entity_type IN ('competition', 'team', 'fixture', 'innings', 'participant')
    ),
    CONSTRAINT batch_reference_mapping_label_ck CHECK (length(btrim(candidate_label)) > 0),
    CONSTRAINT batch_reference_mapping_key_ck CHECK (length(btrim(decision_key)) > 0),
    CONSTRAINT batch_reference_mapping_error_ck CHECK (
        error_message IS NULL OR length(btrim(error_message)) > 0
    ),
    CONSTRAINT batch_reference_mapping_applied_ck CHECK (
        (state = 'applied') = (applied_at IS NOT NULL)
    )
);

COMMENT ON TABLE batch_reference_mapping_decision IS
    'Append-only provenance for a user-selected canonical candidate. Candidate IDs remain internal.';

CREATE TRIGGER batch_reference_mapping_decision_prevent_delete
    BEFORE DELETE ON batch_reference_mapping_decision
    FOR EACH ROW
    EXECUTE FUNCTION prevent_batch_provenance_delete();

ALTER TABLE batch_validation_result
    ADD COLUMN active boolean NOT NULL DEFAULT true,
    ADD COLUMN superseded_at timestamptz,
    ADD CONSTRAINT batch_validation_result_current_ck CHECK (
        (active AND superseded_at IS NULL) OR (NOT active AND superseded_at IS NOT NULL)
    );

DROP INDEX batch_validation_result_deterministic_key;
CREATE UNIQUE INDEX batch_validation_result_deterministic_key
    ON batch_validation_result (
        batch_id,
        COALESCE(batch_item_id, 0),
        COALESCE(source_ordinal, -1),
        rule_code,
        rule_version,
        severity,
        COALESCE(file_path, ''),
        COALESCE(row_number, -1),
        COALESCE(field_path, '')
    )
    WHERE active;

COMMENT ON COLUMN batch_validation_result.active IS
    'False when a later mapping decision caused this retained validation result to be re-evaluated.';

-- Down Migration

DROP INDEX IF EXISTS batch_validation_result_deterministic_key;
ALTER TABLE batch_validation_result
    DROP CONSTRAINT IF EXISTS batch_validation_result_current_ck,
    DROP COLUMN IF EXISTS superseded_at,
    DROP COLUMN IF EXISTS active;
CREATE UNIQUE INDEX batch_validation_result_deterministic_key
    ON batch_validation_result (
        batch_id,
        COALESCE(batch_item_id, 0),
        COALESCE(source_ordinal, -1),
        rule_code,
        rule_version,
        severity,
        COALESCE(file_path, ''),
        COALESCE(row_number, -1),
        COALESCE(field_path, '')
    );

DROP TRIGGER IF EXISTS batch_reference_mapping_decision_prevent_delete
    ON batch_reference_mapping_decision;
DROP TABLE IF EXISTS batch_reference_mapping_decision;
DROP TYPE IF EXISTS batch_reference_mapping_state;
