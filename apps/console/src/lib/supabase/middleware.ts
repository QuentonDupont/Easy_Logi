import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options?: CookieOptions };
import { hasSupabaseConfig, publicEnv } from "@/env";

/**
 * Refreshes the Supabase session on every request and gates the app: unauthenticated users are
 * redirected to /login (except for public auth routes). Called from middleware.ts.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  // Without Supabase configured there is nothing to refresh; let pages render (they show a
  // "configure Supabase" notice rather than crashing).
  if (!hasSupabaseConfig()) return response;

  const supabase = createServerClient(publicEnv.supabaseUrl!, publicEnv.supabaseAnonKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic =
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname === "/favicon.ico";

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/orders";
    return NextResponse.redirect(url);
  }

  return response;
}
