-- Table: workflow_execution_logs (per-node log lines of a workflow run)

CREATE TABLE IF NOT EXISTS "workflow_execution_logs" (
  "id"              UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "execution_id"    UUID        NOT NULL REFERENCES "workflow_executions"("id") ON DELETE CASCADE,
  "workflow_id"     UUID,
  "node_id"         UUID        NOT NULL REFERENCES "workflow_nodes"("id") ON DELETE CASCADE,
  "node_position"   INTEGER,
  "integration_key" TEXT,
  "action_key"      TEXT,
  "log_level"       TEXT        NOT NULL DEFAULT 'info',
  "resolved_value"  TEXT,
  "status"          TEXT        NOT NULL,
  "error_message"   TEXT,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now()
);
