-- Table: workflow_tag_links (many-to-many workflows <-> workflow_tags)

CREATE TABLE IF NOT EXISTS "workflow_tag_links" (
  "id"          UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "workflow_id" UUID        NOT NULL REFERENCES "workflows"("id") ON DELETE CASCADE,
  "tag_id"      UUID        NOT NULL REFERENCES "workflow_tags"("id") ON DELETE CASCADE,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("workflow_id", "tag_id")
);
