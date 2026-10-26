import type { AccountTypeEnum, Role, UserRoleEnum } from "@easy-logi/shared";
import { createClient } from "@/lib/supabase/server";

export interface Profile {
  id: string;
  orgId: string;
  orgName: string | null;
  email: string;
  fullName: string | null;
  role: UserRoleEnum;
  /** The organisation's account type: a business, or an individual buying for themselves. */
  accountType: AccountTypeEnum;
}

/** Which side of the platform a profile belongs to. Staff (ops) sit above both. */
export type AccountKind = "business" | "individual" | "staff";

export function accountKind(profile: Pick<Profile, "role" | "accountType">): AccountKind {
  if (profile.role === "ops_admin") return "staff";
  return profile.accountType === "individual" ? "individual" : "business";
}

/**
 * Map an application user_role to a status-machine Role. Individuals act as `buyer` (they can
 * confirm fit and raise disputes; Easy Logi moves sourcing/shipping steps for them).
 */
export function toConsoleRole(role: UserRoleEnum): Role {
  if (role === "ops_admin") return "ops_admin";
  if (role === "buyer") return "buyer";
  return "importer";
}

/**
 * Load the signed-in user's profile row (org + role + account type). Returns null when there is
 * no session or no matching profile. Runs under the user's RLS.
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

  const { data: org } = await supabase
    .from("organisations")
    .select("id, name, account_type")
    .eq("id", data.org_id)
    .maybeSingle();

  return {
    id: data.id,
    orgId: data.org_id,
    orgName: org?.name ?? null,
    email: data.email,
    fullName: data.full_name,
    role: data.role,
    accountType: (org?.account_type as AccountTypeEnum | undefined) ?? "business",
  };
}
