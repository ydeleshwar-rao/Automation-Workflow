-- Admin switch for workflow tags (on by default, so nothing changes until an admin turns it off)
ALTER TABLE "organizations" ADD COLUMN "workflow_tags_enabled" BOOLEAN NOT NULL DEFAULT true;

-- Tags become company-wide: each tag belongs to its creator's organization
ALTER TABLE "workflow_tags" ADD COLUMN "organization_id" UUID;

UPDATE "workflow_tags" AS tag
SET "organization_id" = profile."organization_id"
FROM "profiles" AS profile
WHERE profile."id" = tag."user_id";

ALTER TABLE "workflow_tags" ALTER COLUMN "organization_id" SET NOT NULL;

ALTER TABLE "workflow_tags"
  ADD CONSTRAINT "workflow_tags_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

CREATE INDEX "idx_workflow_tags_organization_id" ON "workflow_tags"("organization_id");
