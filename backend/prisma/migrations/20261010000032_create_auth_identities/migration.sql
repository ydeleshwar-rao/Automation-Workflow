-- Table: auth_identities (Google / Microsoft accounts linked to a login account, DB_PROVIDER=postgres)
-- Users are matched by (provider, subject) — the IdP's stable user ID — never by email alone.

CREATE TABLE IF NOT EXISTS "auth_identities" (
  "id"           UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"      UUID        NOT NULL REFERENCES "auth_users"("id") ON DELETE CASCADE,
  "provider"     TEXT        NOT NULL,
  "subject"      TEXT        NOT NULL,
  "email"        TEXT,
  "tenant_key"   TEXT,
  "last_used_at" TIMESTAMPTZ,
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("provider", "subject")
);

DO $$ BEGIN
  ALTER TABLE "auth_identities" ADD CONSTRAINT "auth_identities_provider_check"
    CHECK ("provider" IN ('google', 'microsoft'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "idx_auth_identities_user" ON "auth_identities" ("user_id");
