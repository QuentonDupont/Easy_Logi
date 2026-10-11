import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Database } from "@easy-logi/shared";

type CookieToSet = { name: string; value: string; options?: CookieOptions };
import { requirePublicEnv } from "@/env";

/**
 * Supabase client for server components, route handlers and server actions. Reads the user's
 * session from cookies; all queries run under that user's RLS (CLAUDE.md: org scoping).
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { supabaseUrl, supabaseAnonKey } = requirePublicEnv();

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component where cookies are read-only. The session is
          // refreshed by middleware, so this can be safely ignored.
        }
      },
    },
  });
}
