-- Shared trigger function: keeps "updated_at" current on every UPDATE.
-- Used by the trg_<table>_upd triggers in the table migrations that follow.

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
