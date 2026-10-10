-- Table: profiles (one row per Supabase auth user; id = auth.users.id)

CREATE TABLE IF NOT EXISTS "profiles" (
  "id"              UUID        NOT NULL PRIMARY KEY,
  "email"           TEXT        NOT NULL UNIQUE,
  "full_name"       TEXT        NOT NULL DEFAULT '',
  "avatar_url"      TEXT,
  "role"            TEXT        NOT NULL DEFAULT 'developer',
  "organization_id" UUID        NOT NULL,
  "is_active"       BOOLEAN     NOT NULL DEFAULT true,
  "created_by"      UUID,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Older databases: add organization_id, backfill into a default organization, then enforce it
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "organization_id" UUID;

INSERT INTO "organizations" ("name", "owner_id")
SELECT 'Default Organization',
       (SELECT "id" FROM "profiles" WHERE "role" = 'admin' ORDER BY "created_at" LIMIT 1)
WHERE EXISTS (SELECT 1 FROM "profiles" WHERE "organization_id" IS NULL)
  AND NOT EXISTS (SELECT 1 FROM "organizations");

UPDATE "profiles"
SET "organization_id" = (SELECT "id" FROM "organizations" ORDER BY "created_at" LIMIT 1)
WHERE "organization_id" IS NULL;

ALTER TABLE "profiles" ALTER COLUMN "organization_id" SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE "profiles" ADD CONSTRAINT "profiles_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "profiles" ADD CONSTRAINT "profiles_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "profiles"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'profiles'
               AND column_name = 'role' AND data_type = 'USER-DEFINED') THEN
    ALTER TABLE "profiles" ALTER COLUMN "role" DROP DEFAULT;
    ALTER TABLE "profiles" ALTER COLUMN "role" TYPE TEXT USING "role"::text;
    ALTER TABLE "profiles" ALTER COLUMN "role" SET DEFAULT 'developer';
  END IF;
END $$;

DO $$ BEGIN
  ALTER TABLE "profiles" ADD CONSTRAINT "profiles_role_check"
    CHECK ("role" IN ('admin', 'developer'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Link to Supabase auth (skipped on plain Postgres, e.g. a local or shadow database)
DO $$ BEGIN
  IF to_regclass('auth.users') IS NOT NULL THEN
    ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_fkey"
      FOREIGN KEY ("id") REFERENCES auth.users("id") ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "idx_profiles_organization_id" ON "profiles" ("organization_id");

DROP TRIGGER IF EXISTS "trg_profiles_upd" ON "profiles";
CREATE TRIGGER "trg_profiles_upd"
  BEFORE UPDATE ON "profiles"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
