-- Table: page_permissions (per-user page access; page_key = dashboard | workflow | assets | integrations | analytics)

CREATE TABLE IF NOT EXISTS "page_permissions" (
  "id"         UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"    UUID        NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "page_key"   TEXT        NOT NULL,
  "can_view"   BOOLEAN     NOT NULL DEFAULT false,
  "can_edit"   BOOLEAN     NOT NULL DEFAULT false,
  "can_delete" BOOLEAN     NOT NULL DEFAULT false,
  "granted_by" UUID        REFERENCES "profiles"("id") ON DELETE SET NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("user_id", "page_key")
);

DROP TRIGGER IF EXISTS "trg_page_permissions_upd" ON "page_permissions";
CREATE TRIGGER "trg_page_permissions_upd"
  BEFORE UPDATE ON "page_permissions"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
