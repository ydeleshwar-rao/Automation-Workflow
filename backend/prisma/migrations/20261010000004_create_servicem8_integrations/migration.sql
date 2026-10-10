-- Table: servicem8_integrations (OAuth credentials only — one per user)

CREATE TABLE IF NOT EXISTS "servicem8_integrations" (
  "id"               UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"          UUID        NOT NULL UNIQUE REFERENCES "profiles"("id") ON DELETE CASCADE,
  "access_token"     TEXT        NOT NULL,
  "refresh_token"    TEXT,
  "expires_at"       TIMESTAMPTZ,
  "scopes"           TEXT,
  "sm8_account_uuid" TEXT,
  "needs_reauth"     BOOLEAN     NOT NULL DEFAULT false,
  "last_synced_at"   TIMESTAMPTZ,
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS "trg_servicem8_integrations_upd" ON "servicem8_integrations";
CREATE TRIGGER "trg_servicem8_integrations_upd"
  BEFORE UPDATE ON "servicem8_integrations"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
