import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@easy-logi/shared";

export type AdminClient = SupabaseClient<Database>;

/**
 * A service-role Supabase client for trusted server code (the queue worker, jobs). The service
 * role bypasses RLS, so this must NEVER run in the browser — it reads SUPABASE_SERVICE_ROLE_KEY,
 * a server-only secret. Callers pass the worker/job context, not a user session.
 */
export function createAdminClient(): AdminClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — required for the worker.",
    );
  }
  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
