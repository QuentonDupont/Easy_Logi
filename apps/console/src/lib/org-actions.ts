"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_ORG_COOKIE, type OrgOption } from "@/lib/org";

/** Organisations the signed-in user may act within (ops sees all; others see their own). */
export async function getAccessibleOrgs(): Promise<OrgOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("organisations")
    .select("id, name")
    .order("name", { ascending: true });
  return data ?? [];
}

/** The currently selected org id (from cookie), if any. */
export async function getActiveOrgId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(ACTIVE_ORG_COOKIE)?.value ?? null;
}

/** Server action used by the org switcher to change the active org. */
export async function setActiveOrg(formData: FormData): Promise<void> {
  const orgId = formData.get("orgId");
  if (typeof orgId === "string" && orgId) {
    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_ORG_COOKIE, orgId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  revalidatePath("/orders");
}
