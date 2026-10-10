import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { createPostgresClient } from "../lib/db/postgres-client.js";
import { createPostgresAuth } from "../lib/db/postgres-auth.js";

/**
 * Database provider — set DB_PROVIDER in the backend .env file:
 *
 *   postgres (default)  Any PostgreSQL server. Needs DATABASE_URL.
 *                       Queries go through our pg-based query builder and auth
 *                       uses the public.auth_users table.
 *   supabase            Supabase. Needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 *                       Queries go through PostgREST, auth through Supabase Auth.
 *
 * Both expose the same client API (`supabase.from(...)`, `supabase.rpc(...)`,
 * `supabase.auth...`), so services work unchanged on either provider.
 */
export type DbProvider = "postgres" | "supabase";

export const DB_PROVIDER: DbProvider =
  (process.env.DB_PROVIDER ?? "postgres").toLowerCase() === "supabase" ? "supabase" : "postgres";

function createSupabase(): SupabaseClient {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      "DB_PROVIDER=supabase requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  /**
   * Service-role client — bypasses Row Level Security (backend is trusted).
   * NEVER expose this key or this client to the frontend.
   */
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession:   false,
      autoRefreshToken: false,
    },
  });
}

function createPostgres(): SupabaseClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DB_PROVIDER=postgres requires DATABASE_URL");
  }

  const client = createPostgresClient(connectionString);
  return { ...client, auth: createPostgresAuth(client.pool) } as unknown as SupabaseClient;
}

/**
 * Database client used for ALL backend DB operations (name kept for history —
 * it is a plain PostgreSQL client when DB_PROVIDER=postgres).
 *
 * Auth note:
 *   - Login: supabase.auth.signInWithPassword() validates credentials
 *   - Sessions: we issue our own custom JWTs — provider sessions are NOT used
 *   - Middleware: verifies our custom JWT locally, no provider call needed
 */
export const supabase: SupabaseClient = DB_PROVIDER === "supabase" ? createSupabase() : createPostgres();
export const db = supabase;
