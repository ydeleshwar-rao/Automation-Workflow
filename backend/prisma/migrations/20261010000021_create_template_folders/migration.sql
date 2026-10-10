-- Table: template_folders (nested folders for workflow templates)

CREATE TABLE IF NOT EXISTS "template_folders" (
  "id"          UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"        TEXT        NOT NULL,
  "description" TEXT,
  "parent_id"   UUID        REFERENCES "template_folders"("id"),
  "created_by"  UUID        REFERENCES "profiles"("id") ON DELETE SET NULL,
  "is_public"   BOOLEAN     NOT NULL DEFAULT false,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS "trg_template_folders_upd" ON "template_folders";
CREATE TRIGGER "trg_template_folders_upd"
  BEFORE UPDATE ON "template_folders"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
