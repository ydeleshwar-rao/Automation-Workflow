-- Table: auth_users (login accounts when DB_PROVIDER=postgres; Supabase uses auth.users instead)

CREATE TABLE IF NOT EXISTS "auth_users" (
  "id"                     UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "email"                  TEXT        NOT NULL,
  "password_hash"          TEXT,
  "provider"               TEXT        NOT NULL DEFAULT 'email',
  "user_metadata"          JSONB       NOT NULL DEFAULT '{}',
  "reset_token_hash"       TEXT,
  "reset_token_expires_at" TIMESTAMPTZ,
  "last_sign_in_at"        TIMESTAMPTZ,
  "created_at"             TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "auth_users_email_key" ON "auth_users" (lower("email"));
CREATE INDEX IF NOT EXISTS "idx_auth_users_reset_token_hash" ON "auth_users" ("reset_token_hash");

DO $$ BEGIN
  ALTER TABLE "auth_users" ADD CONSTRAINT "auth_users_provider_check"
    CHECK ("provider" IN ('email', 'google'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Plain Postgres: deleting a login account deletes its profile (Supabase links profiles to auth.users)
DO $$ BEGIN
  IF to_regclass('auth.users') IS NULL THEN
    ALTER TABLE "profiles" ADD CONSTRAINT "profiles_auth_user_id_fkey"
      FOREIGN KEY ("id") REFERENCES "auth_users"("id") ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP TRIGGER IF EXISTS "trg_auth_users_upd" ON "auth_users";
CREATE TRIGGER "trg_auth_users_upd"
  BEFORE UPDATE ON "auth_users"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
