-- Table: workflows

CREATE TABLE IF NOT EXISTS "workflows" (
  "id"                     UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"                UUID        NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "folder_id"              UUID        REFERENCES "workflow_folders"("id") ON DELETE SET NULL,
  "name"                   TEXT        NOT NULL,
  "status"                 TEXT        NOT NULL DEFAULT 'draft',
  "version"                INTEGER     NOT NULL DEFAULT 1,
  "tag"                    TEXT,
  "position"               INTEGER     NOT NULL DEFAULT 0,
  "last_edited_by_user_id" UUID        REFERENCES "profiles"("id") ON DELETE SET NULL,
  "last_edited_by_name"    TEXT,
  "last_edited_at"         TIMESTAMPTZ,
  "created_at"             TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"             TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'workflows'
               AND column_name = 'status' AND data_type = 'USER-DEFINED') THEN
    ALTER TABLE "workflows" ALTER COLUMN "status" DROP DEFAULT;
    ALTER TABLE "workflows" ALTER COLUMN "status" TYPE TEXT USING "status"::text;
    ALTER TABLE "workflows" ALTER COLUMN "status" SET DEFAULT 'draft';
  END IF;
END $$;

DO $$ BEGIN
  ALTER TABLE "workflows" ADD CONSTRAINT "workflows_status_check"
    CHECK ("status" IN ('draft', 'active', 'inactive'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP TRIGGER IF EXISTS "trg_workflows_upd" ON "workflows";
CREATE TRIGGER "trg_workflows_upd"
  BEFORE UPDATE ON "workflows"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
