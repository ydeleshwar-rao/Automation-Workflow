-- Table: organizations — workspace type and company SSO enforcement
--   type          'individual' (personal workspace) | 'company' (Google Workspace / Microsoft 365 linked)
--   sso_required  company only: employees must sign in with company SSO, password login is rejected

ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'individual';
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "sso_required" BOOLEAN NOT NULL DEFAULT false;

DO $$ BEGIN
  ALTER TABLE "organizations" ADD CONSTRAINT "organizations_type_check"
    CHECK ("type" IN ('individual', 'company'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
