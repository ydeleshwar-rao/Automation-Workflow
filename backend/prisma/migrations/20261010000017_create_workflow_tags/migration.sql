-- Table: workflow_tags

CREATE TABLE IF NOT EXISTS "workflow_tags" (
  "id"         UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"    UUID        NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "name"       TEXT        NOT NULL,
  "color"      TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS "trg_workflow_tags_upd" ON "workflow_tags";
CREATE TRIGGER "trg_workflow_tags_upd"
  BEFORE UPDATE ON "workflow_tags"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
