import { describe, it, expect } from "vitest";
import { ORDER_STATUSES } from "@easy-logi/shared";
import { STATUS_CONTENT, statusContent } from "./content";
import { STATUS_DOCS, statusDocs, type DocType } from "./requirements";
import { buildDocument, deriveLane, laneHeader, DOC_TITLES, type OrderForDoc } from "./templates";

const order: OrderForDoc = {
  id: "o1",
  reference: "EL-7K3Q-0192",
  status: "po_issued",
  summary: "Front brake pads — Hilux 2.5 D-4D 2012",
  created_at: "2026-10-14T00:00:00Z",
};

describe("status content + document requirements are exhaustive", () => {
  it("every ORDER_STATUS has buyer-facing content with non-empty fields", () => {
    for (const s of ORDER_STATUSES) {
      const c = STATUS_CONTENT[s];
      expect(c, `missing content for ${s}`).toBeDefined();
      expect(c.summary.length).toBeGreaterThan(0);
      expect(c.next.length).toBeGreaterThan(0);
      expect(c.who.length).toBeGreaterThan(0);
    }
  });
  it("every ORDER_STATUS has a document-requirements entry", () => {
    for (const s of ORDER_STATUSES) {
      expect(STATUS_DOCS[s], `missing docs for ${s}`).toBeDefined();
      expect(Array.isArray(statusDocs(s).downloads)).toBe(true);
      expect(Array.isArray(statusDocs(s).uploads)).toBe(true);
    }
  });
  it("has no content/docs keys outside ORDER_STATUSES", () => {
    const known = new Set<string>(ORDER_STATUSES);
    for (const k of Object.keys(STATUS_CONTENT)) expect(known.has(k)).toBe(true);
    for (const k of Object.keys(STATUS_DOCS)) expect(known.has(k)).toBe(true);
  });
  it("only references document types that have titles", () => {
    const titled = new Set<string>(Object.keys(DOC_TITLES));
    for (const s of ORDER_STATUSES) for (const d of statusDocs(s).downloads) expect(titled.has(d)).toBe(true);
  });
});

describe("buildDocument", () => {
  const types: DocType[] = ["part-match", "quote", "purchase-order", "supplier-instruction", "order-summary", "proof-of-delivery"];
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
