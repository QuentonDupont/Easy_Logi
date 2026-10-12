"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEMO_USER_ID, MOCK_SESSION_COOKIE } from "@/lib/mock/backend";

/**
 * Dev-only sign-in for the local mock backend: there is no email/magic-link, so this just
 * sets the mock session cookie to the seeded demo ops-admin and drops you into the app.
 */
export async function mockSignIn(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(MOCK_SESSION_COOKIE, DEMO_USER_ID, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  redirect("/orders");
}
