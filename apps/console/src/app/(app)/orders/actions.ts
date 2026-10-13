"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  transition,
  TransitionError,
  changeStatusInputSchema,
  type OrderStatus,
} from "@easy-logi/shared";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, toConsoleRole } from "@/lib/auth";
import { ACTIVE_ORG_COOKIE } from "@/lib/org";
import { issueMagicLink } from "@/lib/magic-link";

function generateReference(): string {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `EL-${date}-${rand}`;
}

export interface ActionState {
  ok: boolean;
  error?: string;
}

/** Create a new order in the caller's (or ops-selected) org and record an order.created event. */
export async function createOrder(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, error: "Not signed in." };

  const supabase = await createClient();

  // Ops admins may be acting within a selected org; everyone else uses their own org.
  const cookieStore = await cookies();
  const selected = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;
  const orgId = profile.role === "ops_admin" && selected ? selected : profile.orgId;

  const summary = (formData.get("summary") as string | null)?.trim() || null;
  const reference = generateReference();

  const { data: order, error } = await supabase
    .from("orders")
    .insert({ org_id: orgId, reference, status: "requested", summary })
    .select("id")
    .single();

  if (error || !order) {
    return { ok: false, error: error?.message ?? "Could not create the order." };
  }

  await supabase.from("events").insert({
    org_id: orgId,
    name: "order.created",
    order_id: order.id,
    payload: { reference },
    dedupe_key: `order.created:${order.id}`,
  });

  revalidatePath("/orders");
  redirect(`/orders/${order.id}`);
}

/**
 * Change an order's status. The transition is validated by the status machine
 * (packages/shared) — an illegal transition or a role that may not trigger it is rejected and
 * the order is left unchanged. On success the change is recorded and an event emitted.
 */
export async function changeStatus(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, error: "Not signed in." };

  const parsed = changeStatusInputSchema.safeParse({
    orderId: formData.get("orderId"),
    to: formData.get("to"),
    role: toConsoleRole(profile.role),
    note: (formData.get("note") as string | null) || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: "Invalid status change request." };
  }
  const { orderId, to, role, note } = parsed.data;

  const supabase = await createClient();
  const { data: order, error: loadError } = await supabase
    .from("orders")
    .select("id, org_id, status")
    .eq("id", orderId)
    .maybeSingle();

  if (loadError || !order) {
    return { ok: false, error: "Order not found or not accessible." };
  }

  const from = order.status as OrderStatus;

  // The ONLY place a status change is decided (CLAUDE.md rule 3).
  try {
    transition(from, to, role);
  } catch (err) {
    if (err instanceof TransitionError) {
      return { ok: false, error: err.message };
    }
    throw err;
  }

  // The DB enforces that orders.status only changes through this one audited function
  // (migration 20261011090008). It performs the update AND writes the order_status_changes
  // row atomically; the actor's application role (profile.role) is recorded, since the
  // status-machine `role` is derived from it.
  const { error: rpcError } = await supabase.rpc("change_order_status", {
    p_order_id: orderId,
    p_to: to,
    p_role: profile.role,
    p_note: note ?? null,
  });
  if (rpcError) {
    return { ok: false, error: rpcError.message };
  }

  await supabase.from("events").insert({
    org_id: order.org_id,
    name: "order.status_changed",
    order_id: orderId,
    payload: { from, to },
    dedupe_key: `order.status_changed:${orderId}:${from}:${to}:${Date.now()}`,
  });

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  return { ok: true };
}

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

/** Ops: issue a no-login buyer tracking link for an order (repeatable to view). */
export async function issueTrackingLink(
  _prev: { url?: string; error?: string },
  formData: FormData,
): Promise<{ url?: string; error?: string }> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "ops_admin") return { error: "Ops admins only." };
  const orderId = String(formData.get("orderId") ?? "");
  if (!orderId) return { error: "Missing order." };
  const { token } = issueMagicLink({
    orgId: profile.orgId,
    orderId,
    pageType: "tracking",
    createdBy: profile.id,
  });
  return { url: `${baseUrl()}/track/${token}` };
}

/** Ops: issue a single-use supplier quote link for an order. */
export async function issueSupplierLink(
  _prev: { url?: string; error?: string },
  formData: FormData,
): Promise<{ url?: string; error?: string }> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "ops_admin") return { error: "Ops admins only." };
  const orderId = String(formData.get("orderId") ?? "");
  if (!orderId) return { error: "Missing order." };
  const { token } = issueMagicLink({
    orgId: profile.orgId,
    orderId,
    pageType: "supplier_quote",
    createdBy: profile.id,
  });
  return { url: `${baseUrl()}/quote/${token}` };
}
