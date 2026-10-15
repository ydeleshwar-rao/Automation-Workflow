-- Table: organization_sso_connections (links a company workspace to its identity provider)
--   google     tenant_key = Google Workspace primary domain (the verified "hd" claim), e.g. acme.com
--   microsoft  tenant_key = Microsoft Entra tenant ID (the "tid" claim)
-- A tenant can belong to only one workspace, so nobody else can claim a company's employees.

CREATE TABLE IF NOT EXISTS "organization_sso_connections" (
  "id"              UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID        NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "provider"        TEXT        NOT NULL,
  "tenant_key"      TEXT        NOT NULL,
  "domain"          TEXT        NOT NULL,
  "created_by"      UUID        REFERENCES "profiles"("id") ON DELETE SET NULL,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("provider", "tenant_key")
);

DO $$ BEGIN
  ALTER TABLE "organization_sso_connections" ADD CONSTRAINT "organization_sso_connections_provider_check"
    CHECK ("provider" IN ('google', 'microsoft'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "idx_organization_sso_connections_org" ON "organization_sso_connections" ("organization_id");
CREATE INDEX IF NOT EXISTS "idx_organization_sso_connections_domain" ON "organization_sso_connections" (lower("domain"));

DROP TRIGGER IF EXISTS "trg_organization_sso_connections_upd" ON "organization_sso_connections";
CREATE TRIGGER "trg_organization_sso_connections_upd"
  BEFORE UPDATE ON "organization_sso_connections"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
