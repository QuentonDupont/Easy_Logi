import type { PartIntent, FitmentRanking, Clarification, PartLabelReading } from "@easy-logi/agents";

/**
 * Deterministic offline responders — the local stand-in the offline ModelClient calls when there
 * is no ANTHROPIC_API_KEY. Each mirrors its agent's job with plain heuristics so the whole fitment
 * loop runs end-to-end with no model and no cost. With a key set, the real Claude model is used
 * instead and these are never called.
 */

function asRecord(x: unknown): Record<string, unknown> {
  return x && typeof x === "object" ? (x as Record<string, unknown>) : {};
}
function asString(x: unknown): string {
  return typeof x === "string" ? x : "";
}
function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function capFirst(s: string): string {
  return s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

const MODELS: Array<{ k: string; model: string; make: string }> = [
  { k: "hilux", model: "Hilux", make: "Toyota" },
  { k: "quantum", model: "Quantum", make: "Toyota" },
  { k: "corolla", model: "Corolla", make: "Toyota" },
  { k: "fortuner", model: "Fortuner", make: "Toyota" },
  { k: "hiace", model: "Hiace", make: "Toyota" },
  { k: "land cruiser", model: "Land Cruiser", make: "Toyota" },
  { k: "ranger", model: "Ranger", make: "Ford" },
  { k: "figo", model: "Figo", make: "Ford" },
  { k: "polo vivo", model: "Polo Vivo", make: "Volkswagen" },
  { k: "polo", model: "Polo", make: "Volkswagen" },
  { k: "np300", model: "NP300 Hardbody", make: "Nissan" },
  { k: "np200", model: "NP200", make: "Nissan" },
  { k: "almera", model: "Almera", make: "Nissan" },
  { k: "d-max", model: "D-Max", make: "Isuzu" },
  { k: "dmax", model: "D-Max", make: "Isuzu" },
  { k: "h100", model: "H100", make: "Hyundai" },
  { k: "k2700", model: "K2700", make: "Kia" },
  { k: "bolero", model: "Bolero", make: "Mahindra" },
];

const MAKES: Array<[string, string]> = [
  ["toyota", "Toyota"],
  ["ford", "Ford"],
  ["volkswagen", "Volkswagen"],
  ["vw", "Volkswagen"],
  ["nissan", "Nissan"],
  ["isuzu", "Isuzu"],
  ["hyundai", "Hyundai"],
  ["kia", "Kia"],
  ["mahindra", "Mahindra"],
];

const CATEGORIES: Array<[string, string[]]> = [
  ["brakes", ["brake", "pad", "pads", "disc", "caliper", "rotor"]],
  ["AC", ["aircon", "air con", "a/c", " ac ", "compressor", "cabin filter", "climate"]],
  ["cooling", ["radiator", "water pump", "coolant", "thermostat"]],
  ["electrical", ["alternator", "starter", "battery", "bulb", "ignition coil", "sensor"]],
  ["suspension", ["shock", "strut", "spring", "bushing", "control arm", "ball joint"]],
  ["transmission", ["clutch", "gearbox", "flywheel", "cv joint"]],
  ["engine_consumables", ["oil filter", "air filter", "fuel filter", "spark plug", "filter", "oil"]],
  ["body", ["bumper", "bracket", "mirror", "bonnet", "fender", "grille"]],
];

const POSITIONS = ["front", "rear", "left", "right", "cabin"];
const PART_WORDS = [
  "brake", "pads", "pad", "disc", "oil", "air", "fuel", "filter", "compressor", "alternator",
  "starter", "battery", "radiator", "water", "pump", "clutch", "shock", "bumper", "bracket",
  "mirror", "bearing", "belt", "plug", "sensor", "coolant",
];

export function offlinePartIntent(input: unknown): PartIntent {
  const request = asString(asRecord(input).request);
  const text = ` ${request.toLowerCase()} `;

  let make: string | null = null;
  let model: string | null = null;
  for (const m of MODELS) {
    if (text.includes(m.k)) {
      model = m.model;
      make = m.make;
      break;
    }
  }
  if (!make) {
    for (const [k, v] of MAKES) {
      if (text.includes(k)) {
        make = v;
        break;
      }
    }
  }

  const yearMatch = request.match(/\b(19|20)\d{2}\b/);
  const year = yearMatch ? Number(yearMatch[0]) : null;

  let category: string | null = null;
  for (const [cat, words] of CATEGORIES) {
    if (words.some((w) => text.includes(w))) {
      category = cat;
      break;
    }
  }

  const position = POSITIONS.find((p) => text.includes(p)) ?? null;

  const descriptors = Array.from(new Set(PART_WORDS.filter((w) => text.includes(w)))).slice(0, 12);

  let confidence = 0;
  if (category) confidence += 0.45;
  if (make || model) confidence += 0.4;
  if (make && model) confidence += 0.1;
  confidence = round2(clamp01(confidence));

  const vehiclePart = [make, model].filter(Boolean).join(" ") || "no vehicle";
  const reason = capFirst(
    `understood ${vehiclePart}; ${category ? `category ${category}` : "part unclear"}.`,
  ).slice(0, 280);

  return { make, model, year, category, position, descriptors, confidence, reason };
}

export function offlineFitmentRank(input: unknown): FitmentRanking {
  const rec = asRecord(input);
  const intent = asRecord(rec.intent);
  const make = asString(intent.make).toLowerCase();
  const category = asString(intent.category).toLowerCase();
  const descriptors = (Array.isArray(intent.descriptors) ? intent.descriptors : []).filter(
    (d): d is string => typeof d === "string",
  );
  const candidates = Array.isArray(rec.candidates) ? rec.candidates : [];

  const ranked = candidates
    .map((cu) => {
      const c = asRecord(cu);
      const partId = asString(c.partId);
      const partNumber = asString(c.partNumber);
      const brand = asString(c.brand);
      const cat = asString(c.category);
      const desc = asString(c.description);
      const prior = typeof c.priorScore === "number" ? c.priorScore : 0.3;

      let score = prior;
      const brandHit = make.length > 0 && brand.toLowerCase().includes(make);
      const catHit = category.length > 0 && cat.toLowerCase() === category;
      if (brandHit) score += 0.03;
      if (catHit) score += 0.03;
      score = round2(clamp01(score));

      const reasons: string[] = [];
      if (brandHit) reasons.push(`${brand} matches the vehicle`);
      if (catHit) reasons.push(`${cat} part`);
      const descHit = descriptors.find((d) => desc.toLowerCase().includes(d.toLowerCase()));
      if (descHit) reasons.push(`matches "${descHit}"`);
      const reason = (reasons.length ? capFirst(reasons.join(", ")) + "." : "Possible fit by catalogue match.").slice(0, 280);

      return { partId, partNumber, score, reason };
    })
    .filter((r) => r.partId.length > 0 && r.partNumber.length > 0);

  ranked.sort((a, b) => b.score - a.score);

  const top = ranked[0];
  const second = ranked[1];
  let confidence = top ? top.score : 0;
  if (top && second && Math.abs(top.score - second.score) < 0.05 && top.score > 0.6) {
    // Two near-equal strong candidates — ambiguous, nudge below the gate to trigger a clarifier.
    confidence = Math.min(confidence, 0.58);
  }
  const reason = (top
    ? `Best match: ${top.partNumber} (score ${top.score.toFixed(2)}).`
    : "No candidate fits well."
  ).slice(0, 280);

  return { ranked, confidence: round2(confidence), reason };
}

export function offlineClarifier(input: unknown): Clarification {
  const rec = asRecord(input);
  const intent = asRecord(rec.intent);
  const model = asString(intent.model);
  const category = asString(intent.category);

  const provided = (Array.isArray(rec.options) ? rec.options : [])
    .map((o) => asRecord(o))
    .map((o) => ({ label: asString(o.label).slice(0, 80), value: asString(o.value).slice(0, 80) }))
    .filter((o) => o.label.length > 0 && o.value.length > 0)
    .slice(0, 3);

  let question: string;
  let options: Array<{ label: string; value: string }>;

  if (provided.length >= 2) {
    options = provided;
    question = !model ? "Which vehicle is this part for?" : "Which of these is the right part?";
  } else if (!model && !asString(intent.make)) {
    question = "Which vehicle is this part for?";
    options = [
      { label: "Toyota Hilux", value: "Toyota Hilux" },
      { label: "Ford Ranger", value: "Ford Ranger" },
      { label: "VW Polo Vivo", value: "Volkswagen Polo Vivo" },
    ];
  } else if (!category) {
    question = "Which kind of part do you need?";
    options = [
      { label: "Brakes", value: "brakes" },
      { label: "Filters / service", value: "engine_consumables" },
      { label: "Something else", value: "other" },
    ];
  } else {
    question = "Can you confirm the exact part?";
    options = [
      { label: "Yes, that's right", value: "confirm" },
      { label: "No, something else", value: "other" },
    ];
  }

  const reason = (asString(rec.reason) || "The request needs one more detail to search confidently.").slice(0, 280);
  return { question: question.slice(0, 280), options, confidence: 0.8, reason };
}

/**
 * Sample part labels for the keyless photo demo. Each maps to a real catalogue part number, so
 * the offline reader can "read" a known label without a vision model. With ANTHROPIC_API_KEY set,
 * a real uploaded photo is read by Sonnet instead and these are not used.
 */
export const LABEL_SAMPLES: Array<{
  id: string;
  label: string;
  brand: string;
  numbers: string[];
  text: string;
}> = [
  { id: "toyota-oil", label: "Toyota oil filter box", brand: "Toyota", numbers: ["90915-YZZE1"], text: "Oil filter" },
  { id: "ford-air", label: "Ford air filter label", brand: "Ford", numbers: ["AB39-9601-AA"], text: "Air filter (Ranger)" },
  { id: "vw-clutch", label: "VW clutch kit box", brand: "Volkswagen", numbers: ["03G141015X"], text: "Clutch kit" },
];

export function offlineLabelRead(input: unknown): PartLabelReading {
  const sampleId = asString(asRecord(input).sampleId);
  const sample = LABEL_SAMPLES.find((s) => s.id === sampleId);
  if (sample) {
    return {
      brand: sample.brand,
      numbers: sample.numbers,
      text: sample.text,
      confidence: 0.9,
      reason: `Read ${sample.brand} ${sample.numbers[0] ?? ""} off the label.`.slice(0, 280),
    };
  }
  return {
    brand: null,
    numbers: [],
    text: "",
    confidence: 0.2,
    reason: "Offline model can't read an uploaded image — set ANTHROPIC_API_KEY, or pick a sample label.",
  };
}
