-- Table: workflow_templates

CREATE TABLE IF NOT EXISTS "workflow_templates" (
  "id"                 UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"               TEXT        NOT NULL,
  "description"        TEXT,
  "category"           TEXT,
  "tag"                TEXT,
  "source_workflow_id" UUID        REFERENCES "workflows"("id") ON DELETE SET NULL,
  "created_by"         UUID        REFERENCES "profiles"("id") ON DELETE SET NULL,
  "is_public"          BOOLEAN     NOT NULL DEFAULT false,
  "usage_count"        INTEGER     NOT NULL DEFAULT 0,
  "status"             TEXT        NOT NULL DEFAULT 'active',
  "template_folder_id" UUID        REFERENCES "template_folders"("id") ON DELETE SET NULL,
  "created_at"         TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"         TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'workflow_templates'
               AND column_name = 'status' AND data_type = 'USER-DEFINED') THEN
    ALTER TABLE "workflow_templates" ALTER COLUMN "status" DROP DEFAULT;
    ALTER TABLE "workflow_templates" ALTER COLUMN "status" TYPE TEXT USING "status"::text;
    ALTER TABLE "workflow_templates" ALTER COLUMN "status" SET DEFAULT 'active';
  END IF;
END $$;

DO $$ BEGIN
  ALTER TABLE "workflow_templates" ADD CONSTRAINT "workflow_templates_status_check"
    CHECK ("status" IN ('active', 'inactive', 'draft'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP TRIGGER IF EXISTS "trg_workflow_templates_upd" ON "workflow_templates";
CREATE TRIGGER "trg_workflow_templates_upd"
  BEFORE UPDATE ON "workflow_templates"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
