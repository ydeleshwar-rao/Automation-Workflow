-- Table: ai_workflows (AI workflow builder canvases)
-- Not modelled in schema.prisma — accessed through the Supabase client.

CREATE TABLE IF NOT EXISTS "ai_workflows" (
  "id"          UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"     UUID        NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "name"        TEXT        NOT NULL,
  "description" TEXT,
  "status"      TEXT        NOT NULL DEFAULT 'draft' CHECK ("status" IN ('draft', 'active', 'paused')),
  "nodes"       JSONB       NOT NULL DEFAULT '[]',
  "edges"       JSONB       NOT NULL DEFAULT '[]',
  "viewport"    JSONB,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_ai_workflows_user_updated"
  ON "ai_workflows" ("user_id", "updated_at" DESC);

DROP TRIGGER IF EXISTS "trg_ai_workflows_upd" ON "ai_workflows";
CREATE TRIGGER "trg_ai_workflows_upd"
  BEFORE UPDATE ON "ai_workflows"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
