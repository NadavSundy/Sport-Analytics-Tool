-- Up Migration
CREATE TABLE batch_canonical_fixture_decision (
  decision_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  batch_id bigint NOT NULL REFERENCES batch(batch_id) ON DELETE RESTRICT,
  reference_path text NOT NULL,
  fixture_id bigint NOT NULL REFERENCES fixture(fixture_id) ON DELETE RESTRICT,
  actor_id bigint NOT NULL REFERENCES app_user(app_user_id) ON DELETE RESTRICT,
  decided_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (batch_id, reference_path)
);
CREATE TRIGGER batch_canonical_fixture_decision_prevent_delete BEFORE DELETE ON batch_canonical_fixture_decision FOR EACH ROW EXECUTE FUNCTION prevent_batch_provenance_delete();

-- Down Migration
DROP TRIGGER IF EXISTS batch_canonical_fixture_decision_prevent_delete ON batch_canonical_fixture_decision;
DROP TABLE IF EXISTS batch_canonical_fixture_decision;
