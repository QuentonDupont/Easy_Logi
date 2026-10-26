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
import { createStatusClient } from "@/lib/supabase/admin";
import { getCurrentProfile, toConsoleRole } from "@/lib/auth";
import { ACTIVE_ORG_COOKIE } from "@/lib/org";
import { issueMagicLink } from "@/lib/magic-link";
import { gateTransition, blockedMessage, resumeFromHistory } from "@/lib/documents/gate";
import { orgAccountType, uploadedKeysForOrder } from "@/lib/documents/store";

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

  // Staff act on behalf of a customer account picked in the org switcher (never their own staff
  // organisation); businesses and individuals always order into their own organisation.
  const cookieStore = await cookies();
  const selected = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;
  let orgId = profile.orgId;
  if (profile.role === "ops_admin") {
    if (!selected || selected === profile.orgId) {
      return { ok: false, error: "Choose the customer account in the Org switcher first." };
    }
    orgId = selected;
  }

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

  // Document gate (order-docs.md §2/§4): a forward move needs every required document for the
  // current status, judged by the ORDER's account type (a business and an individual need
  // different papers). Only ops may override, with a written reason that is kept in the history.
  // A paused (on hold / disputed) order is judged from the status it was paused at, so resuming
  // — or closing it early — can't skip that status's documents.
  const { data: history } = await supabase
    .from("order_status_changes")
    .select("from_status, to_status, created_at")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });
  const overrideReason = (formData.get("overrideReason") as string | null)?.trim() || undefined;
  const gate = gateTransition({
    from,
    to,
    accountType: orgAccountType(order.org_id as string),
    uploadedKeys: uploadedKeysForOrder(order.org_id as string, orderId),
    isOps: profile.role === "ops_admin",
    overrideReason,
    resumeFrom: resumeFromHistory((history ?? []) as Array<{ from_status: string; to_status: string }>),
  });
  if (!gate.allowed) return { ok: false, error: blockedMessage(gate.missing) };

  const recordedNote = gate.overridden
    ? `[Documents override — missing: ${gate.missing.map((m) => m.label).join("; ")}] ${overrideReason}${note ? ` · ${note}` : ""}`
    : note;

  // The DB enforces that orders.status only changes through this one audited function
  // (migrations 20261011090008, 20261026090002). It performs the update AND writes the
  // order_status_changes row atomically. It is service-role only, so it runs here — after the
  // status machine and the document gate — with the acting user recorded explicitly.
  const statusClient = await createStatusClient();
  const { error: rpcError } = await statusClient.rpc("change_order_status", {
    p_order_id: orderId,
    p_to: to,
    p_role: profile.role,
    p_note: recordedNote ?? null,
    p_actor: profile.id,
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

/** The org that owns an order — links are scoped to the customer's org, not the staff member's. */
async function orderOrgId(orderId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("orders").select("org_id").eq("id", orderId).maybeSingle();
  return (data as { org_id: string } | null)?.org_id ?? null;
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
  const orgId = await orderOrgId(orderId);
  if (!orgId) return { error: "Order not found." };
  const { token } = issueMagicLink({
    orgId,
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
  const orgId = await orderOrgId(orderId);
  if (!orgId) return { error: "Order not found." };
  const { token } = issueMagicLink({
    orgId,
    orderId,
    pageType: "supplier_quote",
    createdBy: profile.id,
  });
  return { url: `${baseUrl()}/quote/${token}` };
}
