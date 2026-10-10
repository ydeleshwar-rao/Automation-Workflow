-- Table: simpro_integrations (OAuth credentials only — one per user)

CREATE TABLE IF NOT EXISTS "simpro_integrations" (
  "id"            UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"       UUID        NOT NULL UNIQUE REFERENCES "profiles"("id") ON DELETE CASCADE,
  "build_name"    TEXT        NOT NULL DEFAULT '',
  "base_url"      TEXT        NOT NULL DEFAULT '',
  "company_id"    INTEGER     NOT NULL DEFAULT 0,
  "access_token"  TEXT        NOT NULL DEFAULT '',
  "refresh_token" TEXT,
  "expires_at"    TIMESTAMPTZ,
  "scopes"        TEXT,
  "needs_reauth"  BOOLEAN     NOT NULL DEFAULT false,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS "trg_simpro_integrations_upd" ON "simpro_integrations";
CREATE TRIGGER "trg_simpro_integrations_upd"
  BEFORE UPDATE ON "simpro_integrations"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
