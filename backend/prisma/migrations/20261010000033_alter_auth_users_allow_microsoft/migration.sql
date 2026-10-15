-- Table: auth_users — allow accounts created through Microsoft sign-in

ALTER TABLE "auth_users" DROP CONSTRAINT IF EXISTS "auth_users_provider_check";
ALTER TABLE "auth_users" ADD CONSTRAINT "auth_users_provider_check"
  CHECK ("provider" IN ('email', 'google', 'microsoft'));
