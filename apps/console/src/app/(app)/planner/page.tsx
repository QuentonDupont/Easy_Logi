import {
  chargeableWeight,
  modeRecommendation,
  saTaxes,
  szTaxes,
  toCustomsValueFOB,
  gates,
  incotermAdvice,
  buildTimeline,
  type Mode,
  type Incoterm,
  type DestCountry,
  type Condition,
  type Carton,
  type Gate,
} from "@easy-logi/import-planner";
import {
  dutySeedFor,
  preferenceFor,
  FREIGHT_SEEDS,
  EASY_LOGI_FEE,
  SZ_VALUE_BASIS,
} from "@easy-logi/import-planner/rules";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { requireKind } from "@/lib/guards";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const num = (v: string, d = 0) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : d;
};

const MODES: Mode[] = ["courier", "air", "sea_lcl", "sea_fcl"];
const MODE_LABEL: Record<Mode, string> = { courier: "Courier", air: "Air", sea_lcl: "Sea LCL", sea_fcl: "Sea FCL (20ft)" };
const ORIGINS: [string, string][] = [["CN", "China"], ["IN", "India"], ["TH", "Thailand"], ["JP", "Japan"], ["AE", "UAE"], ["TR", "Turkey"], ["DE", "Germany (EU)"], ["GB", "United Kingdom"]];
const INCOTERMS: Incoterm[] = ["EXW", "FCA", "FOB", "CFR", "CIF", "DAP", "DDP"];

function money(usd: number): string {
  return `US$${Math.round(usd).toLocaleString("en-US")}`;
}

export default async function PlannerPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireKind(["business", "staff"]);
  const sp = await searchParams;
  const submitted = first(sp.value) !== "";

  const dest = (first(sp.dest) || "SZ") as DestCountry;
  const origin = first(sp.origin) || "CN";
  const importedFrom = first(sp.importedFrom) || origin;
  const part = first(sp.part) || "Front brake pads";
  const hs = first(sp.hs) || "8708.30";
  const condition = (first(sp.condition) || "new") as Condition;
  const incoterm = (first(sp.incoterm) || "FOB") as Incoterm;
  const goodsValue = num(first(sp.value), submitted ? 0 : 5000);
  const destTown = first(sp.town) || (dest === "SZ" ? "Matsapha" : "Johannesburg");
  const urgency = num(first(sp.urgency), 42);
  const carton: Carton = {
    count: num(first(sp.cartons), 1) || 1,
    lengthCm: num(first(sp.l), 60),
    widthCm: num(first(sp.w), 40),
    heightCm: num(first(sp.h), 40),
    grossKg: num(first(sp.kg), 30),
  };

  return (
    <div className="space-y-8">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-[-0.02em]">Import planner</h1>
          <p className="text-muted-foreground">
            See the gates, the cheapest way to ship, the landed-cost estimate and every step — before you order.
          </p>
        </div>

        <form method="get" aria-label="Import planner inputs" className="grid gap-4 rounded-lg border bg-card p-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Destination">
            <Select name="dest" value={dest} options={[["SZ", "Eswatini"], ["ZA", "South Africa"]]} />
          </Field>
          <Field label="Destination town"><Input name="town" defaultValue={destTown} /></Field>
          <Field label="Country of manufacture"><Select name="origin" value={origin} options={ORIGINS} /></Field>
          <Field label="Part"><Input name="part" defaultValue={part} /></Field>
          <Field label="HS code (8-digit)"><Input name="hs" defaultValue={hs} mono /></Field>
          <Field label="Condition"><Select name="condition" value={condition} options={[["new", "New"], ["used", "Used"], ["refurbished", "Refurbished"], ["remanufactured", "Remanufactured"]]} /></Field>
          <Field label="Goods value (US$)"><Input name="value" type="number" defaultValue={submitted ? String(goodsValue) : ""} placeholder="5000" /></Field>
          <Field label="Incoterm"><Select name="incoterm" value={incoterm} options={INCOTERMS.map((i) => [i, i])} /></Field>
          <Field label="Days you can wait"><Input name="urgency" type="number" defaultValue={String(urgency)} /></Field>
          <Field label="Cartons"><Input name="cartons" type="number" defaultValue={String(carton.count)} /></Field>
          <Field label="Carton L×W×H (cm)">
            <div className="flex gap-2">
              <Input name="l" type="number" defaultValue={String(carton.lengthCm)} ariaLabel="Carton length (cm)" />
              <Input name="w" type="number" defaultValue={String(carton.widthCm)} ariaLabel="Carton width (cm)" />
              <Input name="h" type="number" defaultValue={String(carton.heightCm)} ariaLabel="Carton height (cm)" />
            </div>
          </Field>
          <Field label="Gross kg / carton"><Input name="kg" type="number" defaultValue={String(carton.grossKg)} /></Field>
          <div className="flex items-end">
            <button type="submit" className={cn(buttonVariants({ size: "lg" }), "w-full")}>Plan the import</button>
          </div>
        </form>

        {submitted && goodsValue > 0 && (
          <Results
            dest={dest}
            destTown={destTown}
            origin={origin}
            importedFrom={importedFrom}
            part={part}
            hs={hs}
            condition={condition}
            incoterm={incoterm}
            goodsValue={goodsValue}
            urgency={urgency}
            carton={carton}
          />
        )}

        <p className="rounded-lg border border-[color:var(--el-signal-border)] bg-signal-tint px-4 py-3 text-sm">
          Every figure here is an <strong>estimate, not a quote</strong>, built from dated rule data that is not yet
          verified. Confirm duties, permits, freight and fit with your clearing agent before you commit.
        </p>
    </div>
  );
}

function Results(props: {
  dest: DestCountry;
  destTown: string;
  origin: string;
  importedFrom: string;
  part: string;
  hs: string;
  condition: Condition;
  incoterm: Incoterm;
  goodsValue: number;
  urgency: number;
  carton: Carton;
}) {
  const { dest, destTown, origin, importedFrom, part, hs, condition, incoterm, goodsValue, urgency, carton } = props;
  const originLabel = ORIGINS.find(([c]) => c === origin)?.[1] ?? origin;

  // --- gates (registration treated as satisfied; this is a per-shipment estimate) ---
  const g = gates({
    dest,
    countryOfManufacture: origin,
    importedFrom,
    condition,
    partText: part,
    hs,
    // The estimate doesn't know intended use — assume the lawful case (ITAC permit path). The hard
    // "resale of used car parts not permitted" block applies in the guided journey, where the user
    // states that the part is a body/mechanical part for resale.
    isCarBodyOrMechanical: false,
    forResale: false,
    sarsCodeActive: true,
    ersRegistered: true,
  });

  // --- duty + preference ---
  const seed = dutySeedFor(hs);
  const pref = preferenceFor(origin);
  const dutyRate = pref.dutyFree ? 0 : seed?.rate ?? 0.2;
  const fob = toCustomsValueFOB(Math.round(goodsValue * 100), incoterm);
  const taxes =
    dest === "ZA"
      ? saTaxes(fob.fobMinor, dutyRate, { origin, importedFrom })
      : szTaxes(fob.fobMinor, dutyRate);

  // --- mode comparison ---
  const rec = modeRecommendation([carton], urgency);
  const modeRows = MODES.map((m) => {
    const cw = chargeableWeight(m, [carton]);
    const seedF = FREIGHT_SEEDS[m]!;
    const qty = seedF.per === "shipment" ? 1 : cw.chargeable;
    return { mode: m, cw, freightLow: seedF.lowUsd * qty, freightHigh: seedF.highUsd * qty };
  });
  const recRow = modeRows.find((r) => r.mode === rec.recommended)!;

  // --- landed cost (recommended mode), USD ---
  const duty = taxes.dutyMinor / 100;
  const vat = taxes.vatMinor / 100;
  const fee = goodsValue * EASY_LOGI_FEE.rate;
  const totalLow = goodsValue + recRow.freightLow + duty + vat + fee;
  const totalHigh = goodsValue + recRow.freightHigh + duty + vat + fee;

  const inc = incotermAdvice(incoterm);
  const timeline = buildTimeline({
    dest,
    mode: rec.recommended,
    incoterm,
    route: dest === "SZ" ? (rec.recommended === "sea_fcl" ? "rib_matsapha" : "durban_clear") : undefined,
    permitNeeded: dest === "SZ" && !["ZA", "SZ", "BW", "LS", "NA"].includes(importedFrom),
  });

  return (
    <div className="space-y-6">
      {/* Lane */}
      <p className="font-mono text-sm text-muted-foreground">
        {originLabel} → {dest === "SZ" ? "Durban → " : ""}{destTown}, {dest === "SZ" ? "Eswatini" : "South Africa"} · {MODE_LABEL[rec.recommended]} · {incoterm} · Made in {originLabel}
      </p>

      {/* Gates */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Gates</h2>
        {g.length === 0 ? (
          <p className="text-sm text-muted-foreground">No blocking part/permit gates for this lane.</p>
        ) : (
          <ul className="grid list-none gap-2 p-0 sm:grid-cols-2">
            {g.map((gate) => (<GateCard key={gate.key} gate={gate} />))}
          </ul>
        )}
      </section>

      {/* Mode comparison */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">How to ship it</h2>
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="border-b px-4 py-3 font-semibold">Mode</th>
                <th className="border-b px-4 py-3 font-semibold">Chargeable</th>
                <th className="border-b px-4 py-3 font-semibold">Freight (indic.)</th>
                <th className="border-b px-4 py-3 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {modeRows.map((r) => (
                <tr key={r.mode} className={r.mode === rec.recommended ? "bg-signal-tint" : undefined}>
                  <td className="border-b border-border-soft px-4 py-3 font-medium">{MODE_LABEL[r.mode]}</td>
                  <td className="border-b border-border-soft px-4 py-3 font-mono">{r.cw.chargeable.toFixed(r.cw.unit === "kg" ? 0 : 2)} {r.cw.unit}</td>
                  <td className="border-b border-border-soft px-4 py-3 font-mono">{money(r.freightLow)}–{money(r.freightHigh)}</td>
                  <td className="border-b border-border-soft px-4 py-3">{r.mode === rec.recommended && <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold text-white">Recommended</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-muted-foreground">Recommended: <strong>{MODE_LABEL[rec.recommended]}</strong> — {rec.reason}. Freight seeds are USD, dated 2026; get a live lane quote.</p>
      </section>

      {/* Landed cost */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Landed-cost estimate</h2>
        <div className="rounded-lg border bg-card p-5">
          <dl className="space-y-2 text-sm">
            <Row label={`Goods (FOB${fob.incomplete ? " — itemise freight/insurance" : ""})`} value={money(fob.fobMinor / 100)} />
            <Row label={`Freight (${MODE_LABEL[rec.recommended]})`} value={`${money(recRow.freightLow)}–${money(recRow.freightHigh)}`} />
            <Row label={`Duty (${pref.dutyFree ? "0% — " + pref.basis : (dutyRate * 100).toFixed(0) + "%"})`} value={money(duty)} />
            <Row label={`${dest === "ZA" ? "VAT 15% (+10% ATV uplift)" : "VAT 15% (no uplift)"}`} value={money(vat)} />
            <Row label={`Easy Logi fee (${(EASY_LOGI_FEE.rate * 100).toFixed(0)}%)`} value={money(fee)} />
            <div className="flex justify-between border-t pt-2 font-bold"><dt>Total landed (indic.)</dt><dd className="font-mono">{money(totalLow)}–{money(totalHigh)}</dd></div>
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">
            Duty/VAT are assessed in ZAR at clearance{dest === "SZ" ? ` (this estimate taxes the FOB value; your agent's Eswatini base may be "${SZ_VALUE_BASIS.basis}" — unverified)` : ""}. {pref.dutyFree ? pref.note : pref.basis === "none" ? "No tariff preference — general rates apply." : ""}
          </p>
        </div>
      </section>

      {/* Incoterm advice */}
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Incoterm: {incoterm}</h2>
        {inc.recommended && <p className="text-sm text-success">A recommended Incoterm — you keep control of freight and clearance.</p>}
        {inc.warnings.map((w) => (<p key={w} className="text-sm text-primary">⚠ {w}</p>))}
        {inc.needsItemisedFreight && <p className="text-sm text-muted-foreground">SARS needs the FOB value, so freight and insurance must be itemised on the invoice.</p>}
      </section>

      {/* Timeline */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Step-by-step</h2>
        <ol className="list-none space-y-1.5 p-0">
          {timeline.map((s) => (
            <li key={s.code + s.title} className="flex gap-3 rounded-md border bg-card px-4 py-2.5 text-sm">
              <span className="font-mono text-xs text-muted-foreground">{s.code}</span>
              <span className="flex-1">
                <span className="font-medium">{s.title}</span>
                <span className="block text-xs text-muted-foreground">{s.who}{s.payTo ? ` · pay → ${s.payTo}` : ""}{s.docs ? ` · ${s.docs.join(", ")}` : ""}</span>
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{s.phase}</span>
            </li>
          ))}
        </ol>
      </section>

      <a href="/request" className={cn(buttonVariants({ size: "lg" }))}>Book this through Easy Logi</a>
    </div>
  );
}

function GateCard({ gate }: { gate: Gate }) {
  const tone = gate.status === "red" ? "border-primary bg-signal-tint" : gate.status === "amber" ? "border-border bg-card" : "border-success/40 bg-cleared-tint";
  const dot = gate.status === "red" ? "bg-primary" : gate.status === "amber" ? "bg-signal" : "bg-success";
  // Explicit text label so state isn't carried by colour alone (WCAG 1.4.1).
  const label = gate.status === "red" ? "Blocked" : gate.status === "amber" ? "Action needed" : "Ready";
  const labelTone = gate.status === "red" ? "bg-primary text-primary-foreground" : gate.status === "amber" ? "bg-border-soft text-foreground" : "bg-success text-success-foreground";
  return (
    <li className={cn("flex flex-col gap-1 rounded-lg border p-3", tone)}>
      <span className="flex items-center gap-2 font-semibold">
        <span className={cn("h-2.5 w-2.5 rounded-full", dot)} aria-hidden="true" />
        <span className="flex-1">{gate.title}</span>
        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", labelTone)}>{label}</span>
      </span>
      <span className="text-sm text-muted-foreground">{gate.message}</span>
      {gate.provenance && !gate.provenance.verified && (
        <span className="text-xs text-muted-foreground">Estimate — confirm with your clearing agent.</span>
      )}
    </li>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono">{value}</dd>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-muted-foreground">
      {label}
      {children}
    </label>
  );
}

function Input({ name, defaultValue, placeholder, type = "text", mono = false, ariaLabel }: { name: string; defaultValue?: string; placeholder?: string; type?: string; mono?: boolean; ariaLabel?: string }) {
  return (
    <input
      name={name}
      type={type}
      defaultValue={defaultValue}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className={cn("h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", mono && "font-mono")}
    />
  );
}

function Select({ name, value, options }: { name: string; value: string; options: [string, string][] }) {
  return (
    <select name={name} defaultValue={value} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {options.map(([v, l]) => (<option key={v} value={v}>{l}</option>))}
    </select>
  );
}
