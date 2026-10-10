-- Table: workflow_executions (one row per workflow run)

CREATE TABLE IF NOT EXISTS "workflow_executions" (
  "id"              UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "workflow_id"     UUID        REFERENCES "workflows"("id") ON DELETE SET NULL,
  "status"          TEXT        NOT NULL DEFAULT 'running',
  "trigger_payload" JSONB,
  "started_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "finished_at"     TIMESTAMPTZ
);
