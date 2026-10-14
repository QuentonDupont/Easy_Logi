import type { OrderStatus } from "@easy-logi/shared";

/** Buyer-facing status content (order-docs.md §2). Editable copy; typed exhaustively over
 * ORDER_STATUSES so a new status fails typecheck until it has a summary. */
export interface StatusContent {
  summary: string;
  next: string;
  who: string;
}

export const STATUS_CONTENT: Record<OrderStatus, StatusContent> = {
  requested: { summary: "We've got your request and are identifying the exact part.", next: "Easy Logi matches the part.", who: "Easy Logi" },
  fitment_in_progress: { summary: "We're matching the exact part for your vehicle.", next: "We confirm the part number, then you approve.", who: "Easy Logi" },
  matched: { summary: "We've found the part that fits your vehicle.", next: "You confirm the match.", who: "You" },
  rfq_sent: { summary: "We've asked verified suppliers to quote.", next: "Suppliers reply with prices.", who: "Suppliers" },
  quoted: { summary: "Your landed-price quote is ready to review.", next: "You accept or ask questions.", who: "You" },
  po_issued: { summary: "The purchase order is issued to the seller.", next: "You pay the deposit.", who: "You" },
  deposit_paid: { summary: "Your deposit reached the seller. Production can start.", next: "The seller produces or picks the parts.", who: "Seller" },
  in_production: { summary: "Your parts are being made or picked.", next: "The seller updates; we chase.", who: "Seller" },
  qc_pending: { summary: "Quality-check photos or an inspection report are being reviewed.", next: "We review QC before you pay the balance.", who: "Easy Logi / inspector" },
  qc_passed: { summary: "Quality check passed. You can now pay the balance.", next: "You pay the balance.", who: "You" },
  balance_paid: { summary: "Balance paid. The seller is preparing shipping documents.", next: "The seller books freight.", who: "Seller" },
  at_consolidation: { summary: "Your goods are at the consolidation warehouse for the shared container.", next: "The container is loaded and sails.", who: "Warehouse" },
  in_transit: { summary: "Your parts are on the water.", next: "The vessel arrives at the port.", who: "Carrier" },
  at_port_durban: { summary: "Your goods have arrived at Durban and are being cleared.", next: "The clearing agent lodges the entry.", who: "Clearing agent" },
  at_port_maputo: { summary: "Your goods have arrived at Maputo and are being cleared.", next: "The clearing agent lodges the entry.", who: "Clearing agent" },
  customs_clearance: { summary: "Customs is assessing your goods. Duty and VAT are being recorded.", next: "Customs releases the goods once paid.", who: "Clearing agent / customs" },
  cleared: { summary: "Customs has released your goods.", next: "Road transport to you.", who: "Haulier" },
  in_transit_road: { summary: "Your goods are on the road to you.", next: "Delivery to your address.", who: "Haulier" },
  delivered: { summary: "Delivered. Please check the parts.", next: "You confirm they fit.", who: "You" },
  fit_confirmed: { summary: "The part fitted. Thank you.", next: "The order closes.", who: "—" },
  closed: { summary: "This order is complete and closed.", next: "—", who: "—" },
  on_hold: { summary: "Your order is paused while we sort something out.", next: "We clear the hold.", who: "Easy Logi" },
  disputed: { summary: "We're resolving a problem with this order.", next: "Easy Logi and the seller reach a decision.", who: "Easy Logi + seller" },
  cancelled: { summary: "This order was cancelled.", next: "—", who: "—" },
};

export function statusContent(status: OrderStatus): StatusContent {
  return STATUS_CONTENT[status];
}
