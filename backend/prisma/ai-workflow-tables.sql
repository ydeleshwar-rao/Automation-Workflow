-- AI Workflow builder tables
-- Run this in Supabase SQL Editor if your database was created before the
-- AI workflow builder was added. Safe to run multiple times.

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

CREATE TABLE IF NOT EXISTS "ai_workflow_executions" (
  "id"           UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "workflow_id"  UUID        REFERENCES "ai_workflows"("id") ON DELETE CASCADE,
  "status"       TEXT        NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending', 'running', 'success', 'failed')),
  "trigger"      TEXT        NOT NULL DEFAULT 'manual' CHECK ("trigger" IN ('manual', 'schedule', 'webhook')),
  "node_results" JSONB,
  "error"        TEXT,
  "started_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "finished_at"  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS "idx_ai_workflow_executions_workflow_started"
  ON "ai_workflow_executions" ("workflow_id", "started_at" DESC);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS "trg_ai_workflows_upd" ON "ai_workflows";
CREATE TRIGGER "trg_ai_workflows_upd"
  BEFORE UPDATE ON "ai_workflows"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
