-- Table: ai_workflow_executions (runs of an AI workflow)
-- Not modelled in schema.prisma — accessed through the Supabase client.

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
