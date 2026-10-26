import "server-only";
import type { AccountTypeEnum } from "@easy-logi/shared";
import {
  addOrderDocument,
  getOrderDocument,
  getOrganisation,
  listAccountDocuments,
  listDocumentsForOrder,
  type OrderDocumentRow,
} from "@/lib/mock/backend";

/**
 * Document persistence for the console. Backed by the local mock store today (bytes kept in
 * memory); the real backend writes metadata to `order_documents` and bytes to Supabase Storage
 * (migration 20261026090001). Keep callers on this module so that swap stays in one place.
 */

export type StoredDocument = Omit<OrderDocumentRow, "data_base64">;

const strip = ({ data_base64: _b, ...rest }: OrderDocumentRow): StoredDocument => rest;

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ALLOWED_MIME = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;

export function orgAccountType(orgId: string): AccountTypeEnum {
  return getOrganisation(orgId)?.account_type ?? "business";
}

/** The owning account's display name and type (for order headers). */
export function accountInfo(orgId: string): { name: string; accountType: AccountTypeEnum } {
  const org = getOrganisation(orgId);
  return { name: org?.name ?? "Unknown account", accountType: org?.account_type ?? "business" };
}

/** Documents that count for an order (its own + the account's), newest first. */
export function documentsForOrder(orgId: string, orderId: string): StoredDocument[] {
  return listDocumentsForOrder(orgId, orderId)
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(strip);
}

export function accountDocuments(orgId: string): StoredDocument[] {
  return listAccountDocuments(orgId)
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(strip);
}

/** Keys of documents that count towards the gate — a document that failed its check never does. */
export function uploadedKeysForOrder(orgId: string, orderId: string): Set<string> {
  return new Set(
    listDocumentsForOrder(orgId, orderId)
      .filter((d) => d.status !== "failed")
      .map((d) => d.doc_key),
  );
}

export function saveDocument(input: {
  orgId: string;
  orderId: string | null;
  docKey: string;
  label: string;
  filename: string;
  mimeType: string;
  bytes: ArrayBuffer;
  uploadedBy: string;
}): StoredDocument {
  const row = addOrderDocument({
    org_id: input.orgId,
    order_id: input.orderId,
    doc_key: input.docKey,
    label: input.label,
    filename: input.filename,
    mime_type: input.mimeType,
    size_bytes: input.bytes.byteLength,
    uploaded_by: input.uploadedBy,
    data_base64: Buffer.from(input.bytes).toString("base64"),
  });
  return strip(row);
}

/** The full row incl. bytes, for the download route (callers must check access). */
export function documentWithBytes(id: string): OrderDocumentRow | undefined {
  return getOrderDocument(id);
}
