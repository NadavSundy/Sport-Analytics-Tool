-- Up Migration
--
-- Persistence-only gaps identified for #277-#284 after auditing the #276 batch,
-- batch_item and batch_checkpoint foundation. This migration deliberately adds
-- no worker, validation, review, state-transition, or publication behaviour.
--
-- Refs #359

CREATE TYPE batch_reference_resolution_state AS ENUM (
    'unresolved',
    'resolved',
    'ambiguous',
    'invalid'
);

CREATE TYPE batch_validation_severity AS ENUM ('error', 'warning');

CREATE TYPE batch_review_decision_kind AS ENUM ('approved', 'rejected');

ALTER TABLE batch
    ADD COLUMN package_version text NOT NULL DEFAULT '1.0',
    ADD CONSTRAINT batch_package_version_ck CHECK (length(btrim(package_version)) > 0);

COMMENT ON COLUMN batch.package_version IS
    'Version declared by the received batch package; independent from the delivery-event schema version.';

ALTER TABLE batch_item
    ADD COLUMN source_identity text,
    ADD COLUMN source_location jsonb,
    ADD COLUMN reference_resolution_state batch_reference_resolution_state NOT NULL DEFAULT 'resolved',
    ADD COLUMN resolved_references jsonb,
    ADD CONSTRAINT batch_item_source_identity_ck CHECK (
        source_identity IS NULL OR length(btrim(source_identity)) > 0
    ),
    ADD CONSTRAINT batch_item_source_location_ck CHECK (
        source_location IS NULL OR jsonb_typeof(source_location) = 'object'
    ),
    ADD CONSTRAINT batch_item_resolved_references_ck CHECK (
        resolved_references IS NULL OR jsonb_typeof(resolved_references) = 'object'
    );

CREATE UNIQUE INDEX batch_item_source_identity_key
    ON batch_item (batch_id, source_identity)
    WHERE source_identity IS NOT NULL;

COMMENT ON COLUMN batch_item.source_identity IS
    'Stable externally supplied delivery identity, unique within the received batch when present.';

COMMENT ON COLUMN batch_item.source_location IS
    'Normalised source location such as file, record/row and field path; never an application database key.';

COMMENT ON COLUMN batch_item.reference_resolution_state IS
    'Outcome of resolving submitted fixture, innings, team and participant references.';

COMMENT ON COLUMN batch_item.resolved_references IS
    'Provenance mapping from submitted references to canonical records or resolution candidates.';

CREATE TABLE batch_validation_result (
    batch_validation_result_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    batch_id                   bigint NOT NULL REFERENCES batch (batch_id) ON DELETE RESTRICT,
    batch_item_id              bigint REFERENCES batch_item (batch_item_id) ON DELETE RESTRICT,
    source_ordinal             integer,
    rule_code                  text NOT NULL,
    rule_version               text NOT NULL,
    severity                   batch_validation_severity NOT NULL,
    file_path                  text,
    row_number                 integer,
    field_path                 text,
    message                    text NOT NULL,
    created_at                 timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT batch_validation_result_subject_ck CHECK (
        batch_item_id IS NOT NULL OR source_ordinal IS NOT NULL
    ),
    CONSTRAINT batch_validation_result_source_ordinal_ck CHECK (
        source_ordinal IS NULL OR source_ordinal >= 0
    ),
    CONSTRAINT batch_validation_result_rule_code_ck CHECK (length(btrim(rule_code)) > 0),
    CONSTRAINT batch_validation_result_rule_version_ck CHECK (length(btrim(rule_version)) > 0),
    CONSTRAINT batch_validation_result_file_path_ck CHECK (
        file_path IS NULL OR length(btrim(file_path)) > 0
    ),
    CONSTRAINT batch_validation_result_row_number_ck CHECK (
        row_number IS NULL OR row_number > 0
    ),
    CONSTRAINT batch_validation_result_field_path_ck CHECK (
        field_path IS NULL OR length(btrim(field_path)) > 0
    ),
    CONSTRAINT batch_validation_result_message_ck CHECK (length(btrim(message)) > 0)
);

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

CREATE TRIGGER batch_validation_result_prevent_delete
    BEFORE DELETE ON batch_validation_result
    FOR EACH ROW
    EXECUTE FUNCTION prevent_batch_provenance_delete();

COMMENT ON TABLE batch_validation_result IS
    'Immutable, structured result of one validation or reference-resolution rule for a staged batch source location.';

ALTER TABLE batch_checkpoint
    DROP CONSTRAINT batch_checkpoint_pkey,
    ADD PRIMARY KEY (batch_id, phase);

COMMENT ON TABLE batch_checkpoint IS
    'Independent durable validation and publication checkpoints, each with its own worker lease and attempt count.';

CREATE TABLE batch_review_decision (
    batch_review_decision_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    batch_id                 bigint NOT NULL REFERENCES batch (batch_id) ON DELETE RESTRICT,
    actor_id                 bigint NOT NULL REFERENCES app_user (app_user_id) ON DELETE RESTRICT,
    decision                 batch_review_decision_kind NOT NULL,
    reason                   text,
    decided_at               timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT batch_review_decision_reason_ck CHECK (
        reason IS NULL OR length(btrim(reason)) > 0
    )
);

CREATE TRIGGER batch_review_decision_prevent_delete
    BEFORE DELETE ON batch_review_decision
    FOR EACH ROW
    EXECUTE FUNCTION prevent_batch_provenance_delete();

COMMENT ON TABLE batch_review_decision IS
    'Append-only review provenance. Applying a decision to lifecycle state is a later workflow concern.';

ALTER TABLE delivery
    ADD COLUMN source_batch_item_id bigint REFERENCES batch_item (batch_item_id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX delivery_source_batch_item_key
    ON delivery (source_batch_item_id)
    WHERE source_batch_item_id IS NOT NULL;

COMMENT ON COLUMN delivery.source_batch_item_id IS
    'The immutable staged batch item from which this delivery revision was published.';

-- Down Migration

DROP INDEX IF EXISTS delivery_source_batch_item_key;
ALTER TABLE delivery DROP COLUMN IF EXISTS source_batch_item_id;

DROP TRIGGER IF EXISTS batch_review_decision_prevent_delete ON batch_review_decision;
DROP TABLE IF EXISTS batch_review_decision;

ALTER TABLE batch_checkpoint
    DROP CONSTRAINT IF EXISTS batch_checkpoint_pkey,
    ADD PRIMARY KEY (batch_id);

DROP TRIGGER IF EXISTS batch_validation_result_prevent_delete ON batch_validation_result;
DROP INDEX IF EXISTS batch_validation_result_deterministic_key;
DROP TABLE IF EXISTS batch_validation_result;

DROP INDEX IF EXISTS batch_item_source_identity_key;
ALTER TABLE batch_item
    DROP CONSTRAINT IF EXISTS batch_item_resolved_references_ck,
    DROP CONSTRAINT IF EXISTS batch_item_source_location_ck,
    DROP CONSTRAINT IF EXISTS batch_item_source_identity_ck,
    DROP COLUMN IF EXISTS resolved_references,
    DROP COLUMN IF EXISTS reference_resolution_state,
    DROP COLUMN IF EXISTS source_location,
    DROP COLUMN IF EXISTS source_identity;

ALTER TABLE batch
    DROP CONSTRAINT IF EXISTS batch_package_version_ck,
    DROP COLUMN IF EXISTS package_version;

DROP TYPE IF EXISTS batch_review_decision_kind;
DROP TYPE IF EXISTS batch_validation_severity;
DROP TYPE IF EXISTS batch_reference_resolution_state;
