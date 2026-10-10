-- Table: workflow_folders (nested folders for organising workflows)

CREATE TABLE IF NOT EXISTS "workflow_folders" (
  "id"         UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"    UUID        NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "name"       TEXT        NOT NULL,
  "parent_id"  UUID        REFERENCES "workflow_folders"("id"),
  "position"   INTEGER     NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS "trg_workflow_folders_upd" ON "workflow_folders";
CREATE TRIGGER "trg_workflow_folders_upd"
  BEFORE UPDATE ON "workflow_folders"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
