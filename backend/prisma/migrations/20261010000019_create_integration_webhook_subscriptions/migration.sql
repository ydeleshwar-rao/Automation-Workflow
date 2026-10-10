-- Table: integration_webhook_subscriptions (workflow triggers fired by external webhooks)

CREATE TABLE IF NOT EXISTS "integration_webhook_subscriptions" (
  "id"                       UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "workflow_id"              UUID        NOT NULL REFERENCES "workflows"("id") ON DELETE CASCADE,
  "node_id"                  UUID        NOT NULL UNIQUE REFERENCES "workflow_nodes"("id") ON DELETE CASCADE,
  "user_id"                  UUID        NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "integration_key"          TEXT        NOT NULL,
  "event_key"                TEXT        NOT NULL,
  "config"                   JSONB       NOT NULL DEFAULT '{}',
  "external_subscription_id" TEXT,
  "target_path"              TEXT        NOT NULL,
  "signing_secret"           TEXT,
  "is_active"                BOOLEAN     NOT NULL DEFAULT true,
  "last_received_at"         TIMESTAMPTZ,
  "total_received"           INTEGER     NOT NULL DEFAULT 0,
  "error_count"              INTEGER     NOT NULL DEFAULT 0,
  "last_error"               TEXT,
  "created_at"               TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"               TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS "trg_integration_webhook_subscriptions_upd" ON "integration_webhook_subscriptions";
CREATE TRIGGER "trg_integration_webhook_subscriptions_upd"
  BEFORE UPDATE ON "integration_webhook_subscriptions"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
