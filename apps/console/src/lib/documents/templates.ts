import type { OrderStatus } from "@easy-logi/shared";
import type { DocType } from "./requirements";

export const DOC_TITLES: Record<DocType, string> = {
  "part-match": "Part match sheet",
  quote: "Quote & landed-cost breakdown",
  "purchase-order": "Purchase order",
  "supplier-instruction": "Supplier instruction sheet",
  "order-summary": "Order summary & reconciliation",
  "proof-of-delivery": "Proof of delivery",
};

export const DOC_FOR: Record<DocType, string> = {
  "part-match": "Buyer",
  quote: "Buyer",
  "purchase-order": "Seller",
  "supplier-instruction": "Seller / forwarder",
  "order-summary": "Buyer",
  "proof-of-delivery": "Buyer / driver",
};

export interface OrderForDoc {
  id: string;
  reference: string;
  status: OrderStatus;
  summary: string | null;
  created_at: string;
}

/** A minimal order lane. The mock order has no lane yet, so fields default to a placeholder set
 * at quote stage (order-docs.md §1). */
export interface OrderLane {
  countryOfManufacture: string;
  shipFrom: string;
  entryPort: string;
  dest: string;
  mode: string;
  incoterm: string;
}

const PLACEHOLDER = "[set at quote]";

export function deriveLane(_order: OrderForDoc): OrderLane {
  return {
    countryOfManufacture: PLACEHOLDER,
    shipFrom: PLACEHOLDER,
    entryPort: PLACEHOLDER,
    dest: PLACEHOLDER,
    mode: PLACEHOLDER,
    incoterm: PLACEHOLDER,
  };
}

export function laneHeader(lane: OrderLane): string {
  return `${lane.shipFrom} → ${lane.entryPort} → ${lane.dest} · ${lane.mode} · ${lane.incoterm} · Made in ${lane.countryOfManufacture}`;
}

export interface DocRow {
  label: string;
  value: string;
}
export interface DocSection {
  heading: string;
  rows?: DocRow[];
  text?: string;
  /** A signature/field line left blank for a human to complete. */
  blanks?: string[];
}
export interface BuiltDoc {
  docType: DocType;
  title: string;
  forWhom: string;
  intro: string;
  sections: DocSection[];
}

const GENERATED = "Prepared by Easy Logi from your order data. Estimates are not quotes. Check official requirements with your clearing agent.";

export const DOC_FOOTER = GENERATED;

/** Build a document's structured content from an order (order-docs.md §3). Pure; no I/O. */
export function buildDocument(order: OrderForDoc, docType: DocType): BuiltDoc {
  const base = { docType, title: DOC_TITLES[docType], forWhom: DOC_FOR[docType] };
  const part = order.summary ?? "[part — confirmed at fitment]";

  switch (docType) {
    case "part-match":
      return {
        ...base,
        intro: "The part matched to the buyer's vehicle. Part numbers come only from the catalogue — never invented.",
        sections: [
          { heading: "Part", rows: [{ label: "Description", value: part }, { label: "OEM / part no.", value: "[from catalogue match]" }, { label: "Grade", value: "[OEM / aftermarket]" }] },
          { heading: "Fitment", text: "To be verified against catalogue fitment data for the buyer's vehicle before ordering — confirm the vehicle details." },
        ],
      };
    case "quote":
      return {
        ...base,
        intro: "Indicative landed-cost breakdown — an estimate, not a firm quote.",
        sections: [
          { heading: "Landed cost (indicative)", rows: [{ label: "Goods (FOB)", value: "[from quote]" }, { label: "Freight", value: "[from lane]" }, { label: "Duty + VAT", value: "[at clearance]" }, { label: "Easy Logi fee", value: "[% of goods]" }] },
          { heading: "Validity", text: "Prices are indicative and subject to a firm quote and FX on the day. Confirm with your clearing agent." },
        ],
      };
    case "purchase-order":
      return {
        ...base,
        intro: "Draft purchase order — authorises the seller to supply the parts below to the consignee on the stated Incoterm, once the bracketed fields are confirmed.",
        sections: [
          { heading: "Seller", rows: [{ label: "Supplier", value: "[verified supplier]" }, { label: "Country of manufacture", value: "[lane]" }] },
          { heading: "Consignee (importer of record)", rows: [{ label: "Name", value: "[legal name]" }, { label: "Customs number", value: "[SARS / ERS]" }, { label: "Address", value: "[consignee address]" }] },
          { heading: "Line items", rows: [{ label: "Part", value: part }, { label: "Qty", value: "[qty]" }, { label: "Unit price", value: "[price]" }, { label: "HS (8-digit)", value: "[hs]" }, { label: "Incoterm", value: "[lane]" }] },
        ],
      };
    case "supplier-instruction":
      return {
        ...base,
        intro: "How the seller must prepare the invoice, packing list and goods so the shipment clears cleanly.",
        sections: [
          { heading: "On every document", text: "Show the exact consignee name, address and customs number; the Incoterm + named place; the 8-digit HS code per line; the country of manufacture; and the Easy Logi reference on the invoice and packing list." },
          { heading: "If CIF or CFR", text: "Itemise freight and insurance separately so SARS can use the FOB value." },
          { heading: "Regulated parts", text: "Some parts (e.g. brake friction, glass, fluids, tyres, lighting) are NRCS-regulated and must match the LOA manufacturer — confirm the current NRCS scope with your clearing agent. A certificate of origin is needed only when claiming a tariff preference (e.g. EU/EFTA/UK/SADC); confirm eligibility with your agent." },
          { heading: "Packing", rows: [{ label: "Reference on packaging", value: order.reference }, { label: "Weights + dimensions", value: "per carton" }] },
        ],
      };
    case "proof-of-delivery":
      return {
        ...base,
        intro: "Sign on delivery to confirm the parts arrived and match the order.",
        sections: [
          { heading: "Order", rows: [{ label: "Reference", value: order.reference }, { label: "Part", value: part }] },
          { heading: "Received", blanks: ["Received by (name)", "Signature", "Date", "Condition / notes"] },
        ],
      };
    case "order-summary":
      return {
        ...base,
        intro: "A summary of the order and where each cost line stands.",
        sections: [
          { heading: "Order", rows: [{ label: "Reference", value: order.reference }, { label: "Created", value: new Date(order.created_at).toLocaleDateString() }, { label: "Summary", value: part }] },
          { heading: "Reconciliation", text: "Estimated vs actual per cost line (goods, freight, duty, VAT, fees) appears here once actuals are recorded." },
        ],
      };
    default: {
      // Exhaustiveness guard: a new DocType without a case fails typecheck here.
      const _exhaustive: never = docType;
      return _exhaustive;
    }
  }
}
