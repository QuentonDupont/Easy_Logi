import { redirect } from "next/navigation";
import { accountKind, getCurrentProfile, type AccountKind, type Profile } from "@/lib/auth";

/**
 * Server-side page guard: only the given sides of the platform may open the page. Others are
 * sent to their dashboard (signed-out users to /login). The sidebar hides these links too —
 * this stops anyone reaching a page by typing its URL.
 */
export async function requireKind(allowed: AccountKind[]): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!allowed.includes(accountKind(profile))) redirect("/dashboard");
  return profile;
}
