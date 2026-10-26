import { describe, it, expect } from "vitest";
import { ORDER_STATUSES } from "@easy-logi/shared";
import { STATUS_CONTENT, statusContent } from "./content";
import {
  BUSINESS_DOCS,
  INDIVIDUAL_DOCS,
  statusDocs,
  allRequirements,
  accountRequirements,
  findRequirement,
  type DocType,
} from "./requirements";
import { buildDocument, deriveLane, laneHeader, DOC_TITLES, type OrderForDoc } from "./templates";

const order: OrderForDoc = {
  id: "o1",
  reference: "EL-7K3Q-0192",
  status: "po_issued",
  summary: "Front brake pads — Hilux 2.5 D-4D 2012",
  created_at: "2026-10-14T00:00:00Z",
};

describe("status content is exhaustive", () => {
  it("every ORDER_STATUS has buyer-facing content with non-empty fields", () => {
    for (const s of ORDER_STATUSES) {
      const c = STATUS_CONTENT[s];
      expect(c, `missing content for ${s}`).toBeDefined();
      expect(c.summary.length).toBeGreaterThan(0);
      expect(c.next.length).toBeGreaterThan(0);
      expect(c.who.length).toBeGreaterThan(0);
    }
  });
});

describe.each([
  ["business", BUSINESS_DOCS],
  ["individual", INDIVIDUAL_DOCS],
] as const)("%s document requirements", (accountType, table) => {
  it("cover every ORDER_STATUS and nothing else", () => {
    const known = new Set<string>(ORDER_STATUSES);
    for (const s of ORDER_STATUSES) expect(table[s], `missing ${s}`).toBeDefined();
    for (const k of Object.keys(table)) expect(known.has(k)).toBe(true);
  });
  it("only reference document types that have titles", () => {
    const titled = new Set<string>(Object.keys(DOC_TITLES));
    for (const s of ORDER_STATUSES) for (const d of statusDocs(s, accountType).downloads) expect(titled.has(d)).toBe(true);
  });
  it("use each document key with one consistent definition", () => {
    const byKey = new Map<string, string>();
    for (const s of ORDER_STATUSES) {
      for (const u of statusDocs(s, accountType).uploads) {
        const sig = `${u.label}|${u.scope}|${u.uploader}`;
        if (byKey.has(u.key)) expect(byKey.get(u.key), `key ${u.key} redefined`).toBe(sig);
        byKey.set(u.key, sig);
      }
    }
  });
  it("needs proof of both payments and proof of delivery", () => {
    expect(findRequirement(accountType, "proof_of_payment_deposit")?.required).toBe(true);
    expect(findRequirement(accountType, "proof_of_payment_balance")?.required).toBe(true);
    expect(findRequirement(accountType, "proof_of_delivery")?.required).toBe(true);
  });
});

describe("business vs individual documentation differs where the law does", () => {
  it("a business registers its company + customs number; an individual gives ID + proof of address", () => {
    const biz = accountRequirements("business").map((u) => u.key);
    const ind = accountRequirements("individual").map((u) => u.key);
    expect(biz).toEqual(expect.arrayContaining(["customs_client_number", "company_registration"]));
    expect(ind).toEqual(expect.arrayContaining(["id_document", "proof_of_address"]));
    expect(ind).not.toContain("customs_client_number");
    expect(biz).not.toContain("id_document");
  });
  it("a business supplies its own shipping papers; Easy Logi collects them for an individual", () => {
    expect(findRequirement("business", "commercial_invoice")?.uploader).toBe("customer");
    expect(findRequirement("individual", "commercial_invoice")?.uploader).toBe("easylogi");
    expect(findRequirement("business", "bill_of_lading")).toBeDefined();
    expect(findRequirement("individual", "bill_of_lading")).toBeUndefined();
    expect(findRequirement("individual", "courier_waybill")).toBeDefined();
  });
  it("individuals pay the courier's duty & VAT invoice instead of a bill of entry", () => {
    expect(findRequirement("individual", "courier_duty_invoice")?.required).toBe(true);
    expect(findRequirement("individual", "bill_of_entry")).toBeUndefined();
    expect(findRequirement("business", "bill_of_entry")?.required).toBe(true);
  });
  it("flags unverified personal-import rules", () => {
    expect(findRequirement("individual", "used_part_reports")?.verified).toBe(false);
    expect(findRequirement("individual", "personal_declaration")?.verified).toBe(false);
  });
  it("lists every requirement once per side", () => {
    for (const t of ["business", "individual"] as const) {
      const keys = allRequirements(t).map((u) => u.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });
});

describe("buildDocument", () => {
  const types = Object.keys(DOC_TITLES) as DocType[];
  it("builds every doc type with a title, intro and sections", () => {
    for (const t of types) {
      const d = buildDocument(order, t);
      expect(d.title).toBe(DOC_TITLES[t]);
      expect(d.intro.length).toBeGreaterThan(0);
      expect(d.sections.length).toBeGreaterThan(0);
    }
  });
  it("part-match never invents a part number (OEM comes from the catalogue)", () => {
    const d = buildDocument(order, "part-match");
    const oem = d.sections.flatMap((s) => s.rows ?? []).find((r) => r.label.includes("OEM"));
    expect(oem?.value).toMatch(/catalogue/i);
  });
  it("order-summary and supplier-instruction carry the order reference", () => {
    expect(JSON.stringify(buildDocument(order, "order-summary"))).toContain("EL-7K3Q-0192");
    expect(JSON.stringify(buildDocument(order, "supplier-instruction"))).toContain("EL-7K3Q-0192");
  });
  it("statusContent + laneHeader render", () => {
    expect(statusContent("quoted").summary).toMatch(/quote/i);
    expect(laneHeader(deriveLane(order))).toContain("Made in");
  });
});
