#!/usr/bin/env python3
"""
Build the A/C catalogue seed (db/seed/ac_catalogue.json) from the China Vehicle A/C
Sourcing workbook the user maintains on their Desktop, plus a curated India A/C set.

Provenance: China_Vehicle_AC_Suppliers_Minibus_Truck_Tractor.xlsx (auto-refreshed 2026-08-19).
Every row is seeded verified=false with its source_url + as_of — prices are indicative FOB
bands, not firm quotes (rule-data discipline, confirm by RFQ). Run with -I.

Usage: python3 -I scripts/build-ac-catalogue.py <workbook.json> <out.json>
"""
import json, re, sys, hashlib

AS_OF = "2026-08-19"

SEG_MAP = [
    ("minibus", ["minibus"]),
    ("bus", ["bus", "coach"]),
    ("truck", ["truck", "semi", "lorry"]),
    ("tractor", ["tractor", "agricultur", "harvester"]),
    ("van", ["van", "rv", "caravan", "camper", "sprinter", "motorhome"]),
    ("construction", ["construction", "excavator", "forklift", "crane", "mining"]),
]


def segments_of(*texts):
    blob = " ".join(str(t) for t in texts).lower()
    # Word-boundary match so "van" doesn't hit "advanced" or "bus" "business".
    found = [seg for seg, kws in SEG_MAP if any(re.search(r"\b" + re.escape(k), blob) for k in kws)]
    return found or ["truck"]


def parse_price(raw):
    """'US$1,000.00-3,000.00' -> (1000.0, 3000.0, placeholder?)."""
    if raw is None:
        return (None, None, False)
    s = str(raw)
    nums = []
    for tok in re.findall(r"[\d,]+(?:\.\d+)?", s):
        if not any(c.isdigit() for c in tok):  # skip a stray comma token
            continue
        try:
            n = float(tok.replace(",", ""))
        except ValueError:
            continue
        if n > 0:
            nums.append(n)
    if not nums:
        return (None, None, False)
    low, high = min(nums), max(nums)
    placeholder = high <= 5  # a US$1-2 listing forces an enquiry, not a real price
    return (low, high, placeholder)


def weight_kg(raw):
    if not raw:
        return None
    m = re.search(r"(\d+(?:\.\d+)?)\s*kg", str(raw).lower())
    if not m:
        return None
    try:
        return float(m.group(1))
    except ValueError:
        return None


def hid(*parts):
    return "ac-" + hashlib.sha1("|".join(str(p) for p in parts).encode()).hexdigest()[:12]


def header_index(rows, needle):
    for i, r in enumerate(rows):
        if any(str(c).strip().lower() == needle for c in r):
            return i
    return 0


def main():
    wb = json.load(open(sys.argv[1]))
    suppliers, listings = {}, []

    def add_supplier(name, brand=None, country="CN", **extra):
        if not name or not str(name).strip():
            return None
        sid = hid("sup", name)
        if sid not in suppliers:
            suppliers[sid] = {"id": sid, "name": str(name).strip(), "brand": brand or str(name).split()[0],
                              "country": country, "verified": False, **extra}
        return sid

    # ---- Supplier Directory (CN) ----
    rows = wb["Supplier Directory"]
    h = header_index(rows, "company (legal name)")
    for r in rows[h + 1:]:
        if not str(r[0]).strip():
            continue
        add_supplier(r[0], brand=r[1], country="CN", location=r[2], business_type=r[3],
                     segments=segments_of(r[6] if len(r) > 6 else "", r[5] if len(r) > 5 else ""),
                     storefront_url=r[12] if len(r) > 12 else "", website=r[13] if len(r) > 13 else "",
                     price_band=r[11] if len(r) > 11 else "", main_products=r[5] if len(r) > 5 else "")

    def unit_listing(title, supplier, price, segment_text, spec, hs, weight, url, brand=None, extra=None):
        if not str(title).strip():
            return
        sid = add_supplier(supplier, brand=brand)
        low, high, ph = parse_price(price)
        lst = {
            "id": hid("unit", title, url or supplier),
            "title": str(title).strip(), "category": "unit",
            "segments": segments_of(segment_text, title), "country": "CN",
            "supplier_id": sid, "brand": brand or (suppliers.get(sid, {}).get("brand") if sid else None),
            "price_low": low, "price_high": high, "currency": "USD",
            "price_is_placeholder": ph, "spec_summary": str(spec).strip()[:600] if spec else "",
            "hs_code": str(hs).strip() or None, "gross_weight_kg": weight_kg(weight),
            "image_url": None, "source_url": url or "", "source_name": "Made-in-China.com",
            "as_of": AS_OF, "verified": False,
        }
        if extra:
            lst.update(extra)
        listings.append(lst)

    # ---- Priced Units - LIVE ----
    rows = wb["Priced Units - LIVE"]
    h = header_index(rows, "segment")
    for r in rows[h + 1:]:
        r = list(r) + [""] * (19 - len(r))
        status = str(r[15]).upper()
        if "UNREACHABLE" in status or "DELISTED" in status or not str(r[1]).strip():
            continue
        unit_listing(r[1], r[2], r[3], r[0], r[7], r[13], r[12], r[18])

    # ---- Corunclima Range ----
    rows = wb["Corunclima Range"]
    h = header_index(rows, "model")
    for r in rows[h + 1:]:
        r = list(r) + [""] * (12 - len(r))
        if not str(r[0]).strip():
            continue
        spec = f"{r[2]} · {r[3]} · {r[4]} · {r[5]} · compressor {r[6]} · {r[7]} · {r[8]}"
        unit_listing(f"Corunclima {r[0]}", "Zhengzhou Corunclima Co., Ltd.", r[10], r[1], spec,
                     "", r[8], r[11], brand="Corunclima", extra={"model": str(r[0]).strip()})

    # ---- Vethy Range ----
    rows = wb["Vethy Range"]
    h = header_index(rows, "model")
    for r in rows[h + 1:]:
        r = list(r) + [""] * (13 - len(r))
        if not str(r[0]).strip():
            continue
        spec = f"{r[2]} · {r[3]} · {r[4]} · {r[5]} · compressor {r[6]} · {r[7]}"
        unit_listing(f"Vethy {r[0]}", "Qingdao Vethy Industrial Co., Ltd", r[9], r[1], spec,
                     "", r[8], r[12], brand="Vethy", extra={"model": str(r[0]).strip(), "moq": str(r[10]).strip()})

    # ---- SENTIENT Full Catalogue (compressors, part numbers + OEM cross-refs) ----
    rows = wb["SENTIENT Full Catalogue"]
    h = header_index(rows, "part no.")
    sid = add_supplier("Guangzhou Sentient Auto Part Co., Ltd", brand="SENTIENT")
    for r in rows[h + 1:]:
        r = list(r) + [""] * (10 - len(r))
        pn = str(r[0]).strip()
        if not pn or pn.lower().startswith("part no"):
            continue
        crossrefs = [x for x in re.split(r"[\s,]+", str(r[6]).strip()) if x]
        listings.append({
            "id": hid("sentient", pn), "title": f"SENTIENT {pn} — {r[4] or 'A/C compressor'}",
            "category": "compressor", "segments": segments_of(r[1], r[2]), "country": "CN",
            "supplier_id": sid, "brand": "SENTIENT", "part_number": pn,
            "compressor_model": str(r[4]).strip() or None, "application": str(r[2]).strip() or None,
            "model_year": str(r[3]).strip() or None, "pulley_clutch": str(r[5]).strip() or None,
            "oem_crossrefs": crossrefs, "refrigerant_oil": str(r[7]).strip() or None,
            "price_low": None, "price_high": None, "currency": "USD", "price_is_placeholder": False,
            "spec_summary": f"{r[4]} compressor · {r[5]} · oil {r[7]}".strip(" ·"),
            "hs_code": "8414301390", "gross_weight_kg": None, "image_url": None,
            "source_url": "", "source_name": "SENTIENT catalogue (PDF)", "as_of": AS_OF,
            "verified": False,
        })

    # ---- India A/C set (curated; verified=false, confirm with supplier) ----
    india = json.load(open(sys.argv[3])) if len(sys.argv) > 3 else {"suppliers": [], "listings": []}
    for s in india["suppliers"]:
        suppliers[s["id"]] = s
    listings.extend(india["listings"])

    # ---- Flagship images (hotlinked from the source product pages) ----
    try:
        imgs = json.load(open("db/seed/ac_catalogue_images.json"))["images"]
    except FileNotFoundError:
        imgs = {}
    matched = 0
    for l in listings:
        url = l.get("source_url") or ""
        if url in imgs:
            l["image_url"] = imgs[url]
            matched += 1
    print(f"images applied: {matched}")

    # Dedupe listings by id (the workbook repeats some rows; hid() collapses identical title+url).
    deduped, seen = [], set()
    for l in listings:
        if l["id"] in seen:
            continue
        seen.add(l["id"])
        deduped.append(l)
    dupes = len(listings) - len(deduped)
    listings = deduped

    out = {
        "as_of": AS_OF,
        "provenance": "China Vehicle A/C Sourcing workbook (user, 2026-08-19) + curated India A/C set",
        "note": "Indicative FOB price bands, not firm quotes. Every row verified=false — confirm by RFQ.",
        "suppliers": list(suppliers.values()),
        "listings": listings,
    }
    json.dump(out, open(sys.argv[2], "w"), ensure_ascii=False, indent=2)
    units = sum(1 for l in listings if l["category"] == "unit")
    comps = sum(1 for l in listings if l["category"] == "compressor")
    print(f"suppliers={len(suppliers)} listings={len(listings)} (units={units} compressors={comps}) deduped={dupes}")
    bysrc = {}
    for s in suppliers.values():
        bysrc[s["country"]] = bysrc.get(s["country"], 0) + 1
    print("suppliers by country:", bysrc)


if __name__ == "__main__":
    main()
