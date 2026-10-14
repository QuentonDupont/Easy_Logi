import type { OrderStatus } from "@easy-logi/shared";

/** Document types Easy Logi generates (order-docs.md §3). A subset is rendered as printable
 * templates; the rest are listed as planned. Official government forms are linked, never recreated. */
export type DocType =
  | "part-match"
  | "quote"
  | "purchase-order"
  | "supplier-instruction"
  | "order-summary"
  | "proof-of-delivery";

/** Per-status documents (order-docs.md §2): templates to download + evidence to upload. */
export interface StatusDocs {
  downloads: DocType[];
  /** Evidence the buyer/seller uploads for cross-check (labels; the pipeline is a later slice). */
  uploads: string[];
}

export const STATUS_DOCS: Record<OrderStatus, StatusDocs> = {
  requested: { downloads: [], uploads: ["Part photo or licence disc (optional)"] },
  fitment_in_progress: { downloads: [], uploads: [] },
  matched: { downloads: ["part-match"], uploads: [] },
  quoted: { downloads: ["quote"], uploads: [] },
  rfq_sent: { downloads: [], uploads: [] },
  po_issued: { downloads: ["purchase-order", "supplier-instruction"], uploads: ["Seller's pro forma invoice"] },
  deposit_paid: { downloads: [], uploads: ["Proof of payment (deposit)"] },
  in_production: { downloads: [], uploads: [] },
  qc_pending: { downloads: [], uploads: ["QC photos or inspection report"] },
  qc_passed: { downloads: [], uploads: ["Proof of payment (balance)"] },
  balance_paid: { downloads: ["supplier-instruction"], uploads: ["Draft commercial invoice", "Packing list"] },
  at_consolidation: { downloads: [], uploads: ["Warehouse receipt (if supplier-delivered)"] },
  in_transit: { downloads: [], uploads: ["Bill of lading / air waybill", "Final invoice + packing list"] },
  at_port_durban: { downloads: ["order-summary"], uploads: ["Agent receipt"] },
  at_port_maputo: { downloads: ["order-summary"], uploads: ["Agent receipt"] },
  customs_clearance: { downloads: [], uploads: ["Bill of entry / release notice (SAD 500 at Durban; Documento Único via Maputo)", "Duty & VAT assessment"] },
  cleared: { downloads: [], uploads: [] },
  in_transit_road: { downloads: [], uploads: ["Delivery note"] },
  delivered: { downloads: ["proof-of-delivery"], uploads: ["Signed POD or delivery photo"] },
  fit_confirmed: { downloads: ["order-summary"], uploads: [] },
  closed: { downloads: ["order-summary"], uploads: [] },
  on_hold: { downloads: [], uploads: [] },
  disputed: { downloads: [], uploads: ["Claim photos"] },
  cancelled: { downloads: [], uploads: [] },
};

export function statusDocs(status: OrderStatus): StatusDocs {
  return STATUS_DOCS[status];
}
