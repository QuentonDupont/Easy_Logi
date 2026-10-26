import { describe, it, expect } from "vitest";
import {
  isForwardMove,
  missingRequired,
  gateTransition,
  blockedMessage,
  checklist,
  effectiveStatus,
  resumeFromHistory,
  requiredForMove,
} from "./gate";

const none = new Set<string>();
const keys = (reqs: { key: string }[]) => reqs.map((r) => r.key).sort();

describe("isForwardMove", () => {
  it("forward along the backbone is gated", () => {
    expect(isForwardMove("quoted", "po_issued")).toBe(true);
    expect(isForwardMove("po_issued", "deposit_paid")).toBe(true);
    expect(isForwardMove("delivered", "closed")).toBe(true);
  });
  it("hold, dispute, cancel and reopen are not", () => {
    expect(isForwardMove("quoted", "on_hold")).toBe(false);
    expect(isForwardMove("deposit_paid", "disputed")).toBe(false);
    expect(isForwardMove("quoted", "cancelled")).toBe(false);
    expect(isForwardMove("fitment_in_progress", "requested")).toBe(false);
  });
  it("judges a paused order from the status it was paused at", () => {
    // Resuming to where it was paused is not a move forward…
    expect(isForwardMove("on_hold", "po_issued", "po_issued")).toBe(false);
    // …but resuming to a LATER status is, so it can't skip that status's documents.
    expect(isForwardMove("on_hold", "deposit_paid", "po_issued")).toBe(true);
    // Unknown pause point fails closed: treated as the start of the backbone.
    expect(isForwardMove("on_hold", "deposit_paid")).toBe(true);
  });
});

describe("effectiveStatus + resumeFromHistory", () => {
  it("active statuses are their own effective status", () => {
    expect(effectiveStatus("qc_pending", "quoted")).toBe("qc_pending");
  });
  it("paused statuses fall back to the resume point, else `requested`", () => {
    expect(effectiveStatus("disputed", "delivered")).toBe("delivered");
    expect(effectiveStatus("on_hold", null)).toBe("requested");
  });
  it("finds the last backbone status left, through a hold → dispute chain", () => {
    const history = [
      { from_status: "on_hold", to_status: "disputed" },
      { from_status: "quoted", to_status: "on_hold" },
      { from_status: "rfq_sent", to_status: "quoted" },
    ];
    expect(resumeFromHistory(history)).toBe("quoted");
    expect(resumeFromHistory([])).toBeNull();
  });
});

describe("requiredForMove", () => {
  it("a one-step move needs just the current status's required documents", () => {
    expect(keys(requiredForMove("po_issued", "deposit_paid", "business"))).toEqual([
      "proforma_invoice",
      "proof_of_payment_deposit",
    ]);
  });
  it("resuming past several statuses needs every one of their documents", () => {
    const req = keys(requiredForMove("on_hold", "qc_passed", "business", "quoted"));
    expect(req).toEqual(
      expect.arrayContaining(["company_registration", "customs_client_number", "proof_of_payment_deposit", "qc_report"]),
    );
  });
  it("closing a disputed delivered order early still needs proof of delivery", () => {
    expect(keys(requiredForMove("disputed", "closed", "individual", "delivered"))).toEqual(["proof_of_delivery"]);
  });
  it("non-forward moves need nothing", () => {
    expect(requiredForMove("quoted", "on_hold", "business")).toEqual([]);
  });
});

describe("hard gate", () => {
  it("blocks a business moving past `quoted` without company + customs registration", () => {
    const g = gateTransition({ from: "quoted", to: "po_issued", accountType: "business", uploadedKeys: none, isOps: false });
    expect(g.allowed).toBe(false);
    expect(keys(g.missing)).toEqual(["company_registration", "customs_client_number"]);
    expect(blockedMessage(g.missing)).toMatch(/still missing/);
  });
  it("blocks an individual moving past `quoted` without ID + proof of address (not company docs)", () => {
    const g = gateTransition({ from: "quoted", to: "po_issued", accountType: "individual", uploadedKeys: none, isOps: false });
    expect(keys(g.missing)).toEqual(["id_document", "proof_of_address"]);
  });
  it("ignores optional documents", () => {
    const g = gateTransition({
      from: "quoted",
      to: "po_issued",
      accountType: "business",
      uploadedKeys: new Set(["customs_client_number", "company_registration"]),
      isOps: false,
    });
    expect(g.allowed).toBe(true); // vat_certificate is optional
  });
  it("needs the deposit proof to ENTER deposit paid, and lets it through once on file", () => {
    const blocked = gateTransition({ from: "po_issued", to: "deposit_paid", accountType: "individual", uploadedKeys: none, isOps: false });
    expect(keys(blocked.missing)).toEqual(["proforma_invoice", "proof_of_payment_deposit"]);
    const g = gateTransition({
      from: "po_issued",
      to: "deposit_paid",
      accountType: "individual",
      uploadedKeys: new Set(["proforma_invoice", "proof_of_payment_deposit"]),
      isOps: false,
    });
    expect(g).toMatchObject({ allowed: true, gated: true, overridden: false });
  });
  it("leaving deposit paid needs nothing more", () => {
    const g = gateTransition({ from: "deposit_paid", to: "in_production", accountType: "business", uploadedKeys: none, isOps: false });
    expect(g).toMatchObject({ allowed: true, gated: true, missing: [] });
  });
  it("blocks resuming a paused order past documents it never had", () => {
    const g = gateTransition({
      from: "on_hold",
      to: "deposit_paid",
      accountType: "business",
      uploadedKeys: new Set(["customs_client_number", "company_registration"]),
      isOps: false,
      resumeFrom: "po_issued",
    });
    expect(g.allowed).toBe(false);
    expect(keys(g.missing)).toEqual(["proforma_invoice", "proof_of_payment_deposit"]);
  });
  it("never gates non-forward moves", () => {
    const g = gateTransition({ from: "deposit_paid", to: "on_hold", accountType: "business", uploadedKeys: none, isOps: false });
    expect(g).toMatchObject({ allowed: true, gated: false });
  });
  it("only ops can override, and only with a reason", () => {
    const base = { from: "po_issued", to: "deposit_paid", accountType: "business", uploadedKeys: new Set(["proforma_invoice"]) } as const;
    expect(gateTransition({ ...base, isOps: false, overrideReason: "trust me please" }).allowed).toBe(false);
    expect(gateTransition({ ...base, isOps: true }).allowed).toBe(false);
    expect(gateTransition({ ...base, isOps: true, overrideReason: "  " }).allowed).toBe(false);
    const ok = gateTransition({ ...base, isOps: true, overrideReason: "Seller emailed it, uploading today" });
    expect(ok).toMatchObject({ allowed: true, overridden: true });
    expect(keys(ok.missing)).toEqual(["proof_of_payment_deposit"]);
  });
});

describe("checklist + missingRequired", () => {
  it("marks what is on file", () => {
    const c = checklist("quoted", "individual", new Set(["id_document"]));
    expect(c.find((x) => x.key === "id_document")?.present).toBe(true);
    expect(c.find((x) => x.key === "proof_of_address")?.present).toBe(false);
    expect(missingRequired("quoted", "individual", new Set(["id_document"])).map((m) => m.key)).toEqual(["proof_of_address"]);
  });
});
