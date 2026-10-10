-- Table: workflow_template_mappings (field mappings for template nodes)

CREATE TABLE IF NOT EXISTS "workflow_template_mappings" (
  "id"               UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "template_id"      UUID        NOT NULL REFERENCES "workflow_templates"("id") ON DELETE CASCADE,
  "template_node_id" UUID        NOT NULL REFERENCES "workflow_template_nodes"("id") ON DELETE CASCADE,
  "mappings"         JSONB,
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS "trg_workflow_template_mappings_upd" ON "workflow_template_mappings";
CREATE TRIGGER "trg_workflow_template_mappings_upd"
  BEFORE UPDATE ON "workflow_template_mappings"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
