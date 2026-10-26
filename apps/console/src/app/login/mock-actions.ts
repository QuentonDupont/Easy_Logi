"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { MOCK_SESSION_COOKIE } from "@/lib/mock/backend";
import { DEMO_LOGINS } from "@/lib/mock/demo-logins";
import { isMockMode } from "@/env";

/**
 * Dev-only sign-in for the local mock backend: there is no email/magic-link, so this sets the
 * mock session cookie to one of the seeded demo users — a business account, a personal
 * (individual) account, or Easy Logi staff — and drops you into the app.
 */
export async function mockSignIn(formData: FormData): Promise<void> {
  if (!isMockMode()) redirect("/login");
  const userId = String(formData.get("userId") ?? "");
  const login = DEMO_LOGINS.find((l) => l.userId === userId);
  if (!login) redirect("/login");

  const cookieStore = await cookies();
  cookieStore.set(MOCK_SESSION_COOKIE, login.userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  redirect("/dashboard");
}
