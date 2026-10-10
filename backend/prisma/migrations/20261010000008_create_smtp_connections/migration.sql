-- Table: smtp_connections (user-owned outgoing mail servers)

CREATE TABLE IF NOT EXISTS "smtp_connections" (
  "id"                 UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"            UUID        NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "name"               TEXT        NOT NULL,
  "host"               TEXT        NOT NULL,
  "port"               INTEGER     NOT NULL,
  "username"           TEXT        NOT NULL,
  "encrypted_password" TEXT        NOT NULL,
  "use_tls"            BOOLEAN     NOT NULL DEFAULT true,
  "status"             TEXT        NOT NULL DEFAULT 'active',
  "total_sent"         INTEGER     NOT NULL DEFAULT 0,
  "total_failed"       INTEGER     NOT NULL DEFAULT 0,
  "created_at"         TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"         TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'smtp_connections'
               AND column_name = 'status' AND data_type = 'USER-DEFINED') THEN
    ALTER TABLE "smtp_connections" ALTER COLUMN "status" DROP DEFAULT;
    ALTER TABLE "smtp_connections" ALTER COLUMN "status" TYPE TEXT USING "status"::text;
    ALTER TABLE "smtp_connections" ALTER COLUMN "status" SET DEFAULT 'active';
  END IF;
END $$;

DO $$ BEGIN
  ALTER TABLE "smtp_connections" ADD CONSTRAINT "smtp_connections_status_check"
    CHECK ("status" IN ('active', 'inactive'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP TRIGGER IF EXISTS "trg_smtp_connections_upd" ON "smtp_connections";
CREATE TRIGGER "trg_smtp_connections_upd"
  BEFORE UPDATE ON "smtp_connections"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
