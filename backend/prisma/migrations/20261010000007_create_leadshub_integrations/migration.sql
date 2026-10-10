-- Table: leadshub_integrations (OAuth credentials only — a user can connect several locations)

CREATE TABLE IF NOT EXISTS "leadshub_integrations" (
  "id"            UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"       UUID        NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "company_id"    TEXT,
  "location_id"   TEXT,
  "access_token"  TEXT,
  "refresh_token" TEXT,
  "expires_in"    BIGINT,
  "expires_at"    TIMESTAMPTZ,
  "user_type"     TEXT,
  "is_active"     BOOLEAN     NOT NULL DEFAULT true,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS "trg_leadshub_integrations_upd" ON "leadshub_integrations";
CREATE TRIGGER "trg_leadshub_integrations_upd"
  BEFORE UPDATE ON "leadshub_integrations"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
