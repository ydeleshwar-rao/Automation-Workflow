-- Supabase only: auto-create an organization + profile when a user signs up (auth.users insert).
-- Skipped on plain Postgres where the auth schema does not exist.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  org_id uuid;
BEGIN
  org_id := nullif(NEW.raw_user_meta_data->>'organization_id', '')::uuid;

  IF org_id IS NULL THEN
    INSERT INTO public.organizations (name, owner_id)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'organization_name', split_part(NEW.email, '@', 1) || '''s Organization'),
      NEW.id
    )
    RETURNING id INTO org_id;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, organization_id, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'developer'),
    org_id,
    true
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email           = EXCLUDED.email,
    full_name       = EXCLUDED.full_name,
    role            = EXCLUDED.role,
    organization_id = EXCLUDED.organization_id,
    is_active       = EXCLUDED.is_active;

  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF to_regclass('auth.users') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION handle_new_user();
  END IF;
END $$;
