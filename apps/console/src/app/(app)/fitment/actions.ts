"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { transition, TransitionError, type OrderStatus } from "@easy-logi/shared";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, toConsoleRole } from "@/lib/auth";
import {
  addOrderLine,
  addRequest,
  mockFitmentData,
  recordAgentRuns,
} from "@/lib/mock/backend";
import { runFitmentPipeline } from "@/lib/fitment/pipeline";
import type { AgentRunSummary, FitmentResult } from "@/lib/fitment/types";

export interface FindState {
  result: FitmentResult | null;
  error?: string;
}

/** Run the fitment pipeline on a buyer's free-text request and return the result for display. */
export async function findParts(_prev: FindState, formData: FormData): Promise<FindState> {
  const request = ((formData.get("request") as string | null) ?? "").trim();
  if (!request) return { result: null, error: "Describe the part you need." };
  if (request.length > 500) return { result: null, error: "Please keep the request under 500 characters." };

  const result = await runFitmentPipeline({ requestText: request, data: mockFitmentData() });
  return { result };
}

function generateReference(): string {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `EL-${date}-${rand}`;
}

function parseRuns(raw: string): AgentRunSummary[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((r): r is AgentRunSummary => r && typeof r === "object" && typeof r.agent === "string");
  } catch {
    return [];
  }
}

/**
 * Confirm a candidate part as the fit: create an order, write the order line (the part number the
 * human approved — CLAUDE.md rules 1 & 2), move it requested -> fitment_in_progress -> fit_confirmed
 * through the status machine, and persist the agent-run log. Then open the new order.
 */
export async function confirmFit(formData: FormData): Promise<void> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const partId = ((formData.get("partId") as string | null) ?? "").trim();
  const partNumber = ((formData.get("partNumber") as string | null) ?? "").trim();
  const brand = ((formData.get("brand") as string | null) ?? "").trim();
  const description = ((formData.get("description") as string | null) ?? "").trim();
  const request = ((formData.get("request") as string | null) ?? "").trim();
  const runs = parseRuns((formData.get("runs") as string | null) ?? "[]");
  if (!partNumber) redirect("/fitment");

  const orgId = profile.orgId;
  const role = profile.role;
  const consoleRole = toConsoleRole(role);
  const supabase = await createClient();

  const summary = `${description} (${partNumber}) — from: "${request}"`.slice(0, 200);
  const reference = generateReference();
  const { data: order, error } = await supabase
    .from("orders")
    .insert({ org_id: orgId, reference, status: "requested", summary })
    .select("id")
    .single();
  if (error || !order) redirect("/fitment");
  const orderId = (order as { id: string }).id;

  addRequest({ orgId, orderId, rawText: request });
  addOrderLine({ orderId, partId, partNumber, brand, description, qty: 1 });

  recordAgentRuns(
    orderId,
    runs.map((r) => ({
      agent: r.agent,
      model: r.model,
      tokens_in: r.tokensIn,
      tokens_out: r.tokensOut,
      latency_ms: r.latencyMs,
      tool_calls: 0,
      outcome: r.outcome,
      error: null,
    })),
  );

  // Walk the status machine: requested -> fitment_in_progress -> fit_confirmed (human approval).
  const steps: Array<[OrderStatus, OrderStatus, string]> = [
    ["requested", "fitment_in_progress", "Fitment started from buyer request."],
    ["fitment_in_progress", "fit_confirmed", `Fit confirmed: ${partNumber}.`],
  ];
  for (const [from, to, note] of steps) {
    try {
      transition(from, to, consoleRole);
    } catch (err) {
      if (err instanceof TransitionError) break;
      throw err;
    }
    const { error: rpcError } = await supabase.rpc("change_order_status", {
      p_order_id: orderId,
      p_to: to,
      p_role: role,
      p_note: note,
    });
    if (rpcError) break;
  }

  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
  redirect(`/orders/${orderId}`);
}
