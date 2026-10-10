-- Table: organizations (tenants — every profile belongs to one)

CREATE TABLE IF NOT EXISTS "organizations" (
  "id"         UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"       TEXT        NOT NULL,
  "owner_id"   UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Replaces the older organizations_set_updated_at trigger
DROP TRIGGER IF EXISTS "organizations_set_updated_at" ON "organizations";

DROP TRIGGER IF EXISTS "trg_organizations_upd" ON "organizations";
CREATE TRIGGER "trg_organizations_upd"
  BEFORE UPDATE ON "organizations"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
