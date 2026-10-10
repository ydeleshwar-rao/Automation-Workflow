-- Table: webhook_event_log (events received for an integration webhook subscription)

CREATE TABLE IF NOT EXISTS "webhook_event_log" (
  "id"                UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "subscription_id"   UUID        NOT NULL REFERENCES "integration_webhook_subscriptions"("id") ON DELETE CASCADE,
  "external_event_id" TEXT,
  "event_type"        TEXT,
  "payload"           JSONB,
  "status"            TEXT        NOT NULL DEFAULT 'received',
  "processed_at"      TIMESTAMPTZ,
  "error"             TEXT,
  "received_at"       TIMESTAMPTZ NOT NULL DEFAULT now()
);
