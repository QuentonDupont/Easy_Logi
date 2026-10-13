"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@easy-logi/shared";
import { isMockMode, requirePublicEnv } from "@/env";
import { createMockClient } from "@/lib/mock/backend";

/** Supabase client for use in client components (browser). Uses the anon key + user session. */
export function createClient() {
  // Local mock backend: the browser has no session of its own (sign-in is a server action).
  if (isMockMode()) {
    return createMockClient({ getUserId: () => null });
  }
  const { supabaseUrl, supabaseAnonKey } = requirePublicEnv();
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
