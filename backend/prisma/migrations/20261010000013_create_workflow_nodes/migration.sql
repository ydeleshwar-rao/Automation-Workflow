-- Table: workflow_nodes (trigger/action steps of a workflow)

CREATE TABLE IF NOT EXISTS "workflow_nodes" (
  "id"              UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "workflow_id"     UUID        NOT NULL REFERENCES "workflows"("id") ON DELETE CASCADE,
  "type"            TEXT        NOT NULL,
  "integration_key" TEXT        NOT NULL,
  "action_key"      TEXT        NOT NULL,
  "config"          JSONB       NOT NULL DEFAULT '{}',
  "position"        INTEGER     NOT NULL,
  "node_category"   TEXT        NOT NULL DEFAULT 'action',
  "sample_payload"  JSONB       NOT NULL DEFAULT '{}',
  "output_schema"   JSONB       NOT NULL DEFAULT '{}',
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS "trg_workflow_nodes_upd" ON "workflow_nodes";
CREATE TRIGGER "trg_workflow_nodes_upd"
  BEFORE UPDATE ON "workflow_nodes"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
