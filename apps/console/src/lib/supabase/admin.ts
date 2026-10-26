import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@easy-logi/shared";
import { isMockMode, requirePublicEnv, requireServiceRoleKey } from "@/env";
import { createClient } from "./server";

/**
 * Client for the one call that needs the service role: change_order_status(). The RPC is not
 * executable by signed-in users (migration 20261026090002), so a buyer can't skip the status
 * machine or the document gate by calling it directly. Only use this AFTER the order was loaded
 * through the user's own (RLS-scoped) client and the move was approved — and pass p_actor.
 *
 * Mock mode has no service role; its RPC is scope-checked against the session instead.
 */
export async function createStatusClient() {
  if (isMockMode()) return createClient();
  const { supabaseUrl } = requirePublicEnv();
  return createSupabaseClient<Database>(supabaseUrl, requireServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
