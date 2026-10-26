import type { AccountTypeEnum, OrderStatus } from "@easy-logi/shared";

/** Document types Easy Logi generates (order-docs.md §3). Official government forms are linked,
 * never recreated. */
export type DocType =
  | "part-match"
  | "quote"
  | "purchase-order"
  | "supplier-instruction"
  | "order-summary"
  | "proof-of-delivery";

/** Who supplies an uploaded document. For individuals, seller- and agent-side papers are
 * collected by Easy Logi on their behalf; a business runs its own import and supplies them. */
export type Uploader = "customer" | "easylogi";

/**
 * Evidence uploaded against an order (scope "order") or once against the account (scope
 * "account" — ID, proof of address, customs-number letter — reused for every order).
 * A `required` upload must be present before the order can move on from that status.
 */
export interface UploadRequirement {
  key: string;
  label: string;
  scope: "order" | "account";
  required: boolean;
  uploader: Uploader;
  /** What the document must show to pass the cross-check. */
  hint?: string;
  /** false = the rule behind it is unverified → "confirm with your clearing agent". */
  verified?: boolean;
}

export interface StatusDocs {
  /** Templates Easy Logi generates at this status. */
  downloads: DocType[];
  /** Evidence needed at this status (required ones gate the move to the next status). */
  uploads: UploadRequirement[];
}

const none: StatusDocs = { downloads: [], uploads: [] };

// --- shared building blocks -------------------------------------------------------------------

const partPhoto: UploadRequirement = {
  key: "part_photo",
  label: "Photo of the old part or your licence disc",
  scope: "order",
  required: false,
  uploader: "customer",
  hint: "Helps us match the exact part. Optional.",
};
const depositProof: UploadRequirement = {
  key: "proof_of_payment_deposit",
  label: "Proof of payment — deposit",
  scope: "order",
  required: true,
  uploader: "customer",
  hint: "Bank or payment confirmation showing the amount, currency, the verified seller as payee, and the Easy Logi order reference.",
};
const balanceProof: UploadRequirement = {
  key: "proof_of_payment_balance",
  label: "Proof of payment — balance",
  scope: "order",
  required: true,
  uploader: "customer",
  hint: "Same checks as the deposit. Only pay the balance after QC has passed.",
};
const proofOfDelivery: UploadRequirement = {
  key: "proof_of_delivery",
  label: "Signed proof of delivery or a delivery photo",
  scope: "order",
  required: true,
  uploader: "customer",
  hint: "Use the proof-of-delivery form, or a photo of the parts as received.",
};
const claimPhotos: UploadRequirement = {
  key: "claim_photos",
  label: "Photos of the problem",
  scope: "order",
  required: false,
  uploader: "customer",
};

// --- BUSINESS: the business is the importer of record and runs its own clearance -------------

export const BUSINESS_DOCS: Record<OrderStatus, StatusDocs> = {
  requested: { downloads: [], uploads: [partPhoto] },
  fitment_in_progress: none,
  matched: { downloads: ["part-match"], uploads: [] },
  rfq_sent: none,
  quoted: {
    downloads: ["quote"],
    uploads: [
      {
        key: "customs_client_number",
        label: "Customs registration — SARS customs client number (SA) or ERS importer number (Eswatini)",
        scope: "account",
        required: true,
        uploader: "customer",
        hint: "SARS RLA confirmation letter or ERS registration letter in the company's legal name. Saved to your account for every order.",
      },
      {
        key: "company_registration",
        label: "Company registration (CIPC / certificate of incorporation)",
        scope: "account",
        required: true,
        uploader: "customer",
        hint: "Must show the same legal name as the customs registration.",
      },
      {
        key: "vat_certificate",
        label: "VAT registration certificate (if VAT-registered)",
        scope: "account",
        required: false,
        uploader: "customer",
        hint: "Lets you claim import VAT back as input tax.",
      },
    ],
  },
  po_issued: {
    downloads: ["purchase-order", "supplier-instruction"],
    uploads: [
      {
        key: "proforma_invoice",
        label: "Seller's pro forma invoice",
        scope: "order",
        required: true,
        uploader: "customer",
        hint: "Consignee = your company's exact legal name, address and customs number; Incoterm + named place; 8-digit HS code per line; country of manufacture; Easy Logi reference.",
      },
      depositProof,
    ],
  },
  // The deposit proof is required to ENTER "deposit paid" (it sits on po_issued above).
  deposit_paid: none,
  in_production: none,
  qc_pending: {
    downloads: [],
    uploads: [
      {
        key: "qc_report",
        label: "QC photos or inspection report",
        scope: "order",
        required: true,
        uploader: "customer",
        hint: "Photos must show the part number and match the confirmed part; an inspection report must say pass.",
      },
    ],
  },
  qc_passed: { downloads: [], uploads: [balanceProof] },
  balance_paid: {
    downloads: ["supplier-instruction"],
    uploads: [
      {
        key: "commercial_invoice",
        label: "Commercial invoice (draft)",
        scope: "order",
        required: true,
        uploader: "customer",
        hint: "Matches the PO; consignee = your company; HS codes; under CIF/CFR freight and insurance itemised.",
      },
      {
        key: "packing_list",
        label: "Packing list",
        scope: "order",
        required: true,
        uploader: "customer",
        hint: "Gross/net kg, carton count and dimensions — must agree with the invoice.",
      },
    ],
  },
  at_consolidation: {
    downloads: [],
    uploads: [{ key: "warehouse_receipt", label: "Warehouse receipt", scope: "order", required: false, uploader: "customer" }],
  },
  in_transit: {
    downloads: [],
    uploads: [
      {
        key: "bill_of_lading",
        label: "Bill of lading or air waybill",
        scope: "order",
        required: true,
        uploader: "customer",
        hint: "Consignee = your company (importer of record); weights agree with the packing list.",
      },
      {
        key: "certificate_of_origin",
        label: "Certificate of origin (only if claiming a tariff preference)",
        scope: "order",
        required: false,
        uploader: "customer",
        hint: "EU/UK/EFTA/SADC preference only — confirm eligibility with your clearing agent.",
        verified: false,
      },
    ],
  },
  at_port_durban: {
    downloads: ["order-summary"],
    uploads: [
      {
        key: "agent_receipt",
        label: "Clearing agent's acknowledgement of the document pack",
        scope: "order",
        required: true,
        uploader: "customer",
      },
    ],
  },
  at_port_maputo: {
    downloads: ["order-summary"],
    uploads: [
      {
        key: "agent_receipt",
        label: "Clearing agent's acknowledgement of the document pack",
        scope: "order",
        required: true,
        uploader: "customer",
      },
    ],
  },
  customs_clearance: {
    downloads: [],
    uploads: [
      {
        key: "bill_of_entry",
        label: "Bill of entry / release notice (SAD 500 at Durban; Documento Único via Maputo)",
        scope: "order",
        required: true,
        uploader: "customer",
      },
      {
        key: "duty_vat_assessment",
        label: "Duty & VAT assessment",
        scope: "order",
        required: true,
        uploader: "customer",
        hint: "Compared against the planner estimate; a large gap is flagged for review.",
      },
    ],
  },
  cleared: none,
  in_transit_road: {
    downloads: [],
    uploads: [{ key: "delivery_note", label: "Delivery note", scope: "order", required: false, uploader: "customer" }],
  },
  delivered: { downloads: ["proof-of-delivery"], uploads: [proofOfDelivery] },
  fit_confirmed: { downloads: ["order-summary"], uploads: [] },
  closed: { downloads: ["order-summary"], uploads: [] },
  on_hold: none,
  disputed: { downloads: [], uploads: [claimPhotos] },
  cancelled: none,
};

// --- INDIVIDUAL: a person buying for their own vehicle. The courier (or Easy Logi's agent)
// clears the parcel; the buyer supplies identity, payments and delivery proof, Easy Logi
// collects the seller/agent papers. ------------------------------------------------------------

const easyLogi = (key: string, label: string, hint?: string, required = true): UploadRequirement => ({
  key,
  label,
  scope: "order",
  required,
  uploader: "easylogi",
  hint,
});

export const INDIVIDUAL_DOCS: Record<OrderStatus, StatusDocs> = {
  requested: { downloads: [], uploads: [partPhoto] },
  fitment_in_progress: none,
  matched: { downloads: ["part-match"], uploads: [] },
  rfq_sent: none,
  quoted: {
    downloads: ["quote"],
    uploads: [
      {
        key: "id_document",
        label: "ID or passport",
        scope: "account",
        required: true,
        uploader: "customer",
        hint: "Your name must match the name on the invoice and the delivery. Saved to your account for every order.",
      },
      {
        key: "proof_of_address",
        label: "Proof of address (not older than 3 months)",
        scope: "account",
        required: true,
        uploader: "customer",
        hint: "Easy Logi's own requirement for personal accounts, so we can name you as the consignee. A utility bill, bank statement or lease.",
      },
      {
        key: "used_part_reports",
        label: "Only for a USED part: police (SAPS) case number + insurance assessment",
        scope: "order",
        required: false,
        uploader: "customer",
        hint: "Private imports of used car parts into South Africa are allowed only for your own accident repair. Confirm with your clearing agent.",
        verified: false,
      },
    ],
  },
  po_issued: {
    downloads: [],
    uploads: [
      easyLogi("proforma_invoice", "Seller's pro forma invoice in your name", "Easy Logi gets this from the seller and checks your name and the price."),
      depositProof,
    ],
  },
  deposit_paid: none,
  in_production: none,
  qc_pending: {
    downloads: [],
    uploads: [easyLogi("qc_report", "QC photos or inspection report", "Easy Logi checks the photos match your part before you pay the balance.")],
  },
  qc_passed: { downloads: [], uploads: [balanceProof] },
  balance_paid: {
    downloads: [],
    uploads: [
      easyLogi("commercial_invoice", "Commercial invoice in your name", "The value must match what you paid — customs uses it to work out duty and VAT."),
      easyLogi("packing_list", "Packing list", undefined, false),
    ],
  },
  at_consolidation: none,
  in_transit: {
    downloads: [],
    uploads: [easyLogi("courier_waybill", "Courier waybill / tracking number", "Your parcel's tracking reference.")],
  },
  at_port_durban: {
    downloads: [],
    uploads: [easyLogi("courier_clearance_notice", "Courier customs-clearance notice", undefined, false)],
  },
  at_port_maputo: {
    downloads: [],
    uploads: [easyLogi("courier_clearance_notice", "Courier customs-clearance notice", undefined, false)],
  },
  customs_clearance: {
    downloads: [],
    uploads: [
      {
        key: "courier_duty_invoice",
        label: "Courier's duty & VAT invoice — paid",
        scope: "order",
        required: true,
        uploader: "customer",
        hint: "Personal parcels usually pay VAT and duty (low-value parcels may be charged at a flat rate). The courier invoices you before delivery — upload the paid invoice. Confirm the rate with the courier or your clearing agent.",
      },
      {
        key: "personal_declaration",
        label: "Eswatini only: personal declaration (Form E) for imports under E15,000",
        scope: "order",
        required: false,
        uploader: "customer",
        hint: "Confirm with your clearing agent whether it applies to your parcel.",
        verified: false,
      },
    ],
  },
  cleared: none,
  in_transit_road: none,
  delivered: { downloads: ["proof-of-delivery"], uploads: [proofOfDelivery] },
  fit_confirmed: { downloads: ["order-summary"], uploads: [] },
  closed: { downloads: ["order-summary"], uploads: [] },
  on_hold: none,
  disputed: { downloads: [], uploads: [claimPhotos] },
  cancelled: none,
};

export function statusDocs(status: OrderStatus, accountType: AccountTypeEnum = "business"): StatusDocs {
  return (accountType === "individual" ? INDIVIDUAL_DOCS : BUSINESS_DOCS)[status];
}

/** Every distinct upload requirement for an account type (keys are unique per side). */
export function allRequirements(accountType: AccountTypeEnum): UploadRequirement[] {
  const table = accountType === "individual" ? INDIVIDUAL_DOCS : BUSINESS_DOCS;
  const seen = new Map<string, UploadRequirement>();
  for (const docs of Object.values(table)) for (const u of docs.uploads) if (!seen.has(u.key)) seen.set(u.key, u);
  return [...seen.values()];
}

export function findRequirement(accountType: AccountTypeEnum, key: string): UploadRequirement | undefined {
  return allRequirements(accountType).find((u) => u.key === key);
}

/** Account-level documents (ID, address, customs registration…) for one side. */
export function accountRequirements(accountType: AccountTypeEnum): UploadRequirement[] {
  return allRequirements(accountType).filter((u) => u.scope === "account");
}
