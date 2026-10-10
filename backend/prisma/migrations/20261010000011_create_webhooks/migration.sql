-- Table: webhooks (inbound webhook endpoints)

CREATE TABLE IF NOT EXISTS "webhooks" (
  "id"                UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"           UUID        NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "name"              TEXT        NOT NULL,
  "unique_path"       TEXT        NOT NULL UNIQUE,
  "method"            TEXT        NOT NULL DEFAULT 'POST',
  "secret_token"      TEXT,
  "is_active"         BOOLEAN     NOT NULL DEFAULT true,
  "action_type"       TEXT,
  "action_config"     JSONB       NOT NULL DEFAULT '{}',
  "mode"              TEXT        NOT NULL DEFAULT 'test',
  "status"            TEXT        NOT NULL DEFAULT 'active',
  "full_url"          TEXT,
  "workflow_id"       UUID        REFERENCES "workflows"("id") ON DELETE SET NULL,
  "last_triggered_at" TIMESTAMPTZ,
  "expires_at"        TIMESTAMPTZ,
  "deleted_at"        TIMESTAMPTZ,
  "created_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"        TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'webhooks'
               AND column_name = 'mode' AND data_type = 'USER-DEFINED') THEN
    ALTER TABLE "webhooks" ALTER COLUMN "mode" DROP DEFAULT;
    ALTER TABLE "webhooks" ALTER COLUMN "mode" TYPE TEXT USING "mode"::text;
    ALTER TABLE "webhooks" ALTER COLUMN "mode" SET DEFAULT 'test';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'webhooks'
               AND column_name = 'status' AND data_type = 'USER-DEFINED') THEN
    ALTER TABLE "webhooks" ALTER COLUMN "status" DROP DEFAULT;
    ALTER TABLE "webhooks" ALTER COLUMN "status" TYPE TEXT USING "status"::text;
    ALTER TABLE "webhooks" ALTER COLUMN "status" SET DEFAULT 'active';
  END IF;
END $$;

DO $$ BEGIN
  ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_mode_check"
    CHECK ("mode" IN ('test', 'live'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_status_check"
    CHECK ("status" IN ('active', 'inactive', 'archived'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP TRIGGER IF EXISTS "trg_webhooks_upd" ON "webhooks";
CREATE TRIGGER "trg_webhooks_upd"
  BEFORE UPDATE ON "webhooks"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
