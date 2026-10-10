-- Table: workflow_template_nodes (steps of a workflow template)

CREATE TABLE IF NOT EXISTS "workflow_template_nodes" (
  "id"                   UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "template_id"          UUID        NOT NULL REFERENCES "workflow_templates"("id") ON DELETE CASCADE,
  "type"                 TEXT        NOT NULL,
  "node_category"        TEXT,
  "integration_key"      TEXT        NOT NULL,
  "action_key"           TEXT,
  "config_schema"        JSONB,
  "required_credentials" JSONB,
  "output_schema"        JSONB,
  "position"             INTEGER     NOT NULL,
  "created_at"           TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"           TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS "trg_workflow_template_nodes_upd" ON "workflow_template_nodes";
CREATE TRIGGER "trg_workflow_template_nodes_upd"
  BEFORE UPDATE ON "workflow_template_nodes"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
