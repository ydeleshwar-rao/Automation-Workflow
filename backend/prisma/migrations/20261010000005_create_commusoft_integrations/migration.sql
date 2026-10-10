-- Table: commusoft_integrations (credentials only — one per user; password is stored encrypted)

CREATE TABLE IF NOT EXISTS "commusoft_integrations" (
  "id"             UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"        UUID        NOT NULL UNIQUE REFERENCES "profiles"("id") ON DELETE CASCADE,
  "client_id"      TEXT,
  "username"       TEXT,
  "password"       TEXT,
  "application_id" TEXT,
  "access_token"   TEXT,
  "needs_reauth"   BOOLEAN     NOT NULL DEFAULT false,
  "created_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"     TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS "trg_commusoft_integrations_upd" ON "commusoft_integrations";
CREATE TRIGGER "trg_commusoft_integrations_upd"
  BEFORE UPDATE ON "commusoft_integrations"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
