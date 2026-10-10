-- Table: workflow_field_mappings (field mapping for one workflow node)

CREATE TABLE IF NOT EXISTS "workflow_field_mappings" (
  "id"               UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "workflow_node_id" UUID        NOT NULL UNIQUE REFERENCES "workflow_nodes"("id") ON DELETE CASCADE,
  "mappings"         JSONB       NOT NULL DEFAULT '[]',
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now()
);
