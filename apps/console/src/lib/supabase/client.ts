"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@easy-logi/shared";
import { requirePublicEnv } from "@/env";

/** Supabase client for use in client components (browser). Uses the anon key + user session. */
export function createClient() {
  const { supabaseUrl, supabaseAnonKey } = requirePublicEnv();
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
