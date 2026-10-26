"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { findRequirement } from "./requirements";
import { ALLOWED_MIME, MAX_UPLOAD_BYTES, orgAccountType, saveDocument } from "./store";

export interface UploadState {
  ok: boolean;
  message?: string;
  error?: string;
}

/**
 * Upload one document against an order, or against the account (ID, proof of address, customs
 * registration…). Who may upload is part of the requirement: individuals supply their own
 * identity, payments and delivery proof; seller/agent papers on their orders are added by
 * Easy Logi staff. Stored as "received — not yet checked"; the automatic cross-check is a
 * later slice.
 */
export async function uploadDocument(_prev: UploadState, formData: FormData): Promise<UploadState> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, error: "Please sign in again." };
  const isOps = profile.role === "ops_admin";

  const orderId = String(formData.get("orderId") ?? "") || null;
  const docKey = String(formData.get("docKey") ?? "");
  const file = formData.get("file");

  // Resolve the organisation the document belongs to. Reading the order through the scoped
  // client means a user can only attach documents to their own organisation's orders.
  let orgId = profile.orgId;
  if (orderId) {
    const supabase = await createClient();
    const { data: order } = await supabase.from("orders").select("id, org_id").eq("id", orderId).maybeSingle();
    if (!order) return { ok: false, error: "Order not found." };
    orgId = order.org_id as string;
  }

  const accountType = orgAccountType(orgId);
  const req = findRequirement(accountType, docKey);
  if (!req) return { ok: false, error: "That document isn't part of this order's checklist." };
  if (req.scope === "order" && !orderId) return { ok: false, error: "Upload this from the order page." };
  if (req.uploader === "easylogi" && !isOps) {
    return { ok: false, error: "Easy Logi collects this document for you — nothing to upload." };
  }

  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose a file to upload." };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: "That file is over 10 MB — please upload a smaller copy." };
  if (!(ALLOWED_MIME as readonly string[]).includes(file.type)) {
    return { ok: false, error: "Upload a PDF, JPG, PNG or WebP file." };
  }

  saveDocument({
    orgId,
    orderId: req.scope === "account" ? null : orderId,
    docKey: req.key,
    label: req.label,
    filename: file.name,
    mimeType: file.type,
    bytes: await file.arrayBuffer(),
    uploadedBy: profile.id,
  });

  if (orderId) revalidatePath(`/orders/${orderId}`);
  revalidatePath("/documents");
  return { ok: true, message: `Received ${file.name} — not yet checked.` };
}
