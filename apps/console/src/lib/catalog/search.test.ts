import { describe, it, expect } from "vitest";
import type { CatalogListing } from "./types";
import { filterListings, matchesQuery, facetCounts, priceLabel, paginate } from "./search";

function unit(over: Partial<CatalogListing> = {}): CatalogListing {
  return {
    id: "u1", title: "Corunclima AC100T minibus rooftop air conditioner", category: "unit",
    segments: ["minibus", "bus"], country: "CN", supplier_id: "s-cor", brand: "Corunclima",
    price_low: 1000, price_high: 3000, currency: "USD", image_url: null,
    source_url: "https://x", source_name: "MIC", as_of: "2026-08-19", verified: false,
    supplierName: "Zhengzhou Corunclima Co., Ltd.", ...over,
  };
}
function compressor(over: Partial<CatalogListing> = {}): CatalogListing {
  return {
    id: "c1", title: "SENTIENT ST-10001 — 6SEU14C", category: "compressor",
    segments: ["truck"], country: "CN", supplier_id: "s-sen", brand: "SENTIENT",
    price_low: null, price_high: null, currency: "USD", image_url: null,
    source_url: "", source_name: "SENTIENT catalogue (PDF)", as_of: "2026-08-19", verified: false,
    part_number: "ST-10001", compressor_model: "6SEU14C", application: "Corolla",
    oem_crossrefs: ["447260-1493", "88310-02370"], supplierName: "Guangzhou Sentient Auto Part Co., Ltd", ...over,
  };
}

describe("matchesQuery", () => {
  it("matches a plain term in the title", () => {
    expect(matchesQuery(unit(), "corunclima")).toBe(true);
    expect(matchesQuery(unit(), "vethy")).toBe(false);
  });
  it("matches an OEM cross-ref hyphen/space-insensitively", () => {
    expect(matchesQuery(compressor(), "88310-02370")).toBe(true);
    expect(matchesQuery(compressor(), "8831002370")).toBe(true);
    expect(matchesQuery(compressor(), "88310 02370")).toBe(true);
  });
  it("matches the part number and the application", () => {
    expect(matchesQuery(compressor(), "ST-10001")).toBe(true);
    expect(matchesQuery(compressor(), "corolla")).toBe(true);
  });
  it("requires all terms (AND)", () => {
    expect(matchesQuery(unit(), "corunclima minibus")).toBe(true);
    expect(matchesQuery(unit(), "corunclima tractor")).toBe(false);
  });
  it("empty query matches everything", () => {
    expect(matchesQuery(unit(), "")).toBe(true);
  });
  it("matches on the supplier name alone", () => {
    expect(matchesQuery(compressor(), "sentient")).toBe(true);
    expect(matchesQuery(compressor({ supplierName: "Subros Limited" }), "subros")).toBe(true);
  });
  it("ANDs terms that live in different fields of one listing", () => {
    // "corolla" is in application, "6seu14c" is the compressor model
    expect(matchesQuery(compressor(), "corolla 6seu14c")).toBe(true);
    expect(matchesQuery(compressor(), "corolla tm31")).toBe(false);
  });
  it("matches a part number typed with a space instead of a hyphen", () => {
    expect(matchesQuery(compressor({ part_number: "ST-10001" }), "st 10001")).toBe(true);
  });
  it("a lone hyphen (empty once normalised) does not match everything", () => {
    // hay has no literal "-" and normNum("-") === "" — the guard must stop it matching.
    const l = unit({ title: "Corunclima AC100T", spec_summary: "", application: undefined, compressor_model: undefined, oem_crossrefs: undefined, part_number: undefined, supplierName: "Corunclima" });
    expect(matchesQuery(l, "-")).toBe(false);
  });
});

describe("filterListings", () => {
  const data = [unit(), compressor(), unit({ id: "u2", country: "IN", supplierName: "Subros Limited", title: "Subros bus A/C", segments: ["bus"] })];
  it("filters by category", () => {
    expect(filterListings(data, { category: "unit" }).map((l) => l.id)).toEqual(["u1", "u2"]);
    expect(filterListings(data, { category: "compressor" }).map((l) => l.id)).toEqual(["c1"]);
  });
  it("filters by country and segment", () => {
    expect(filterListings(data, { country: "IN" }).map((l) => l.id)).toEqual(["u2"]);
    expect(filterListings(data, { segment: "minibus" }).map((l) => l.id)).toEqual(["u1"]);
  });
  it("combines filters with query", () => {
    expect(filterListings(data, { category: "unit", q: "subros" }).map((l) => l.id)).toEqual(["u2"]);
  });
});

describe("facetCounts", () => {
  it("counts units, compressors, countries and segments", () => {
    const f = facetCounts([unit(), compressor(), unit({ country: "IN", segments: ["bus"] })]);
    expect(f.total).toBe(3);
    expect(f.units).toBe(2);
    expect(f.compressors).toBe(1);
    expect(f.byCountry).toEqual({ CN: 2, IN: 1 });
    expect(f.bySegment.bus).toBe(2);
  });
});

describe("priceLabel", () => {
  it("shows a band, a single price, or On RFQ", () => {
    expect(priceLabel(unit({ price_low: 1000, price_high: 3000 }))).toBe("US$1,000–US$3,000");
    expect(priceLabel(unit({ price_low: 200, price_high: 200 }))).toBe("US$200");
    expect(priceLabel(compressor())).toBe("On RFQ");
    expect(priceLabel(unit({ price_low: 1, price_high: 2, price_is_placeholder: true }))).toBe("On RFQ");
  });
});

describe("paginate", () => {
  it("slices and clamps the page", () => {
    const items = Array.from({ length: 50 }, (_, i) => i);
    const p = paginate(items, 2, 20);
    expect(p.items).toEqual(Array.from({ length: 20 }, (_, i) => i + 20));
    expect(p.pageCount).toBe(3);
    expect(paginate(items, 99, 20).page).toBe(3);
  });
});
