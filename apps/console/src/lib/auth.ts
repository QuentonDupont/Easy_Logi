import type { Role, UserRoleEnum } from "@easy-logi/shared";
import { createClient } from "@/lib/supabase/server";

export interface Profile {
  id: string;
  orgId: string;
  email: string;
  fullName: string | null;
  role: UserRoleEnum;
}

/** Map an application user_role to a status-machine Role. */
export function toConsoleRole(role: UserRoleEnum): Role {
  return role === "ops_admin" ? "ops_admin" : "importer";
}

/**
 * Load the signed-in user's profile row (org + role). Returns null when there is no session
 * or no matching profile. Runs under the user's RLS.
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("users")
    .select("id, org_id, email, full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) return null;
  return {
    id: data.id,
    orgId: data.org_id,
    email: data.email,
    fullName: data.full_name,
    role: data.role,
  };
}
