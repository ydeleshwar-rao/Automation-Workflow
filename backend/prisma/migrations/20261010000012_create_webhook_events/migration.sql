-- Table: webhook_events (requests received by a webhook)

CREATE TABLE IF NOT EXISTS "webhook_events" (
  "id"              UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "webhook_id"      UUID        REFERENCES "webhooks"("id") ON DELETE SET NULL,
  "request_headers" JSONB,
  "request_body"    JSONB,
  "status"          TEXT        NOT NULL DEFAULT 'pending',
  "error_message"   TEXT,
  "received_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "processed_at"    TIMESTAMPTZ
);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'webhook_events'
               AND column_name = 'status' AND data_type = 'USER-DEFINED') THEN
    ALTER TABLE "webhook_events" ALTER COLUMN "status" DROP DEFAULT;
    ALTER TABLE "webhook_events" ALTER COLUMN "status" TYPE TEXT USING "status"::text;
    ALTER TABLE "webhook_events" ALTER COLUMN "status" SET DEFAULT 'pending';
  END IF;
END $$;

DO $$ BEGIN
  ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_status_check"
    CHECK ("status" IN ('pending', 'processing', 'done', 'failed'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
