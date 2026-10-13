"use server";

import { redirect } from "next/navigation";
import { runFitmentPipeline } from "@/lib/fitment/pipeline";
import { createClient } from "@/lib/supabase/server";
import { mockFitmentData, addRequest, DEMO_ORG_ID } from "@/lib/mock/backend";
import { issueMagicLink } from "@/lib/magic-link";
import { INITIAL_BUYER, type BuyerFindState } from "./types";

function generateReference(): string {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `EL-${date}-${rand}`;
}

/** Public: a buyer describes the part; we run the fitment engine and show what we can source. */
export async function findMyPart(_prev: BuyerFindState, formData: FormData): Promise<BuyerFindState> {
  const request = ((formData.get("request") as string | null) ?? "").trim();
  if (!request) return { ...INITIAL_BUYER, error: "Tell us what part you need.", ts: Date.now() };
  if (request.length > 500)
    return { ...INITIAL_BUYER, error: "Please keep it under 500 characters.", ts: Date.now() };

  const result = await runFitmentPipeline({ requestText: request, data: mockFitmentData() });
  return { result, ts: Date.now() };
}

/** Public: a buyer confirms the part — create the order and send them to a tracking link. */
export async function submitRequest(formData: FormData): Promise<void> {
  const request = ((formData.get("request") as string | null) ?? "").trim();
  const partNumber = ((formData.get("partNumber") as string | null) ?? "").trim();
  const description = ((formData.get("description") as string | null) ?? "").trim();

  const reference = generateReference();
  const summary = `${description || "Part request"}${partNumber ? ` (${partNumber})` : ""} — buyer request`.slice(
    0,
    200,
  );

  const supabase = await createClient();
  const { data: order, error } = await supabase
    .from("orders")
    .insert({ org_id: DEMO_ORG_ID, reference, status: "requested", summary })
    .select("id")
    .single();
  if (error || !order) redirect("/request");
  const orderId = (order as { id: string }).id;

  addRequest({ orgId: DEMO_ORG_ID, orderId, rawText: request });
  const { token } = issueMagicLink({ orgId: DEMO_ORG_ID, orderId, pageType: "tracking" });
  redirect(`/track/${token}`);
}
