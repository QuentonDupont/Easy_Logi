import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options?: CookieOptions };
import { hasSupabaseConfig, isMockMode, publicEnv } from "@/env";
import { MOCK_SESSION_COOKIE } from "@/lib/mock/backend";

function gate(request: NextRequest, response: NextResponse, authed: boolean): NextResponse {
  const { pathname } = request.nextUrl;
  const isPublic =
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname === "/favicon.ico";

  if (!authed && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (authed && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/orders";
    return NextResponse.redirect(url);
  }
  return response;
}

/**
 * Refreshes the Supabase session on every request and gates the app: unauthenticated users are
 * redirected to /login (except for public auth routes). Called from middleware.ts.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  // Local mock backend: gate on the mock session cookie, no Supabase round-trip.
  if (isMockMode()) {
    const authed = Boolean(request.cookies.get(MOCK_SESSION_COOKIE)?.value);
    return gate(request, response, authed);
  }

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

  return gate(request, response, Boolean(user));
}
