import Link from "next/link";
import { Check } from "lucide-react";
import { Logo, VerifiedFitChip } from "@easy-logi/ui";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Public parts finder (Manifest §4.1). Subject: cross-border auto-parts sourcing + customs
 * clearance for Eswatini & South Africa. The hero is the headline + the three-field search;
 * the example result table carries the value prop. Static, server-rendered.
 */
export function Landing() {
  const navLink = "text-sm font-medium hover:text-primary";
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top nav */}
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-3.5">
          <Link href="/" aria-label="Easy Logi — home">
            <Logo size={32} variant="dark" />
          </Link>
          <nav aria-label="Main" className="flex flex-wrap gap-6">
            <a href="#find" className={navLink}>Find parts</a>
            <a href="#how" className={navLink}>How it works</a>
            <a href="#importers" className={navLink}>For importers</a>
            <Link href="/request" className={navLink}>Request a part</Link>
          </nav>
          <div className="flex flex-wrap gap-3">
            <Link href="/login" className={buttonVariants({ variant: "outline", size: "default" })}>
              Sign in
            </Link>
            <Link href="/request" className={buttonVariants({ size: "default" })}>
              Request a part
            </Link>
          </div>
        </div>
      </header>

      {/* Hero + search */}
      <section id="find" className="bg-ink text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-16 sm:py-20">
          <div className="flex max-w-3xl flex-col gap-4">
            <h1 className="text-4xl font-semibold leading-[1.08] tracking-[-0.03em] sm:text-[52px]">
              The right part, landed at a known price.
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-on-ink-muted">
              Search by vehicle, VIN or part number. We match the exact part, compare verified sellers
              in South Africa, China and Thailand, and track it to your door.
            </p>
          </div>

          <form
            action="/request"
            method="get"
            className="grid items-end gap-3 rounded-xl bg-card p-5 text-foreground sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]"
          >
            <Field id="veh" name="vehicle" label="Vehicle" placeholder="Toyota Hilux 2012 2.5 D-4D" />
            <Field id="part" name="part" label="Part" placeholder="Front brake pads" />
            <Field id="vin" name="vin" label="Or VIN / part number" placeholder="AHTFR22G… or 04465-0K290" mono />
            <button type="submit" className={cn(buttonVariants({ size: "lg" }), "w-full lg:w-auto")}>
              Find the part
            </button>
          </form>

          <ul className="flex flex-wrap gap-x-7 gap-y-2 text-sm text-on-ink-muted">
            <Tick>Fit guaranteed on verified matches</Tick>
            <Tick>Verified sellers and payment details</Tick>
            <Tick>You pay the seller directly</Tick>
          </ul>
        </div>
      </section>

      {/* Example result */}
      <section aria-labelledby="res-h" className="mx-auto max-w-6xl px-6 py-14">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Example result</p>
            <h2 id="res-h" className="text-2xl font-semibold tracking-[-0.02em]">
              Toyota Hilux 2.5 D-4D (2012) · Front brake pads
            </h2>
          </div>
          <VerifiedFitChip>Verified fit · OEM 04465-0K290</VerifiedFitChip>
        </div>

        <div className="mt-5 overflow-x-auto rounded-lg border bg-card">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="border-b px-5 py-3.5 font-semibold">Source</th>
                <th scope="col" className="border-b px-5 py-3.5 font-semibold">Grade</th>
                <th scope="col" className="border-b px-5 py-3.5 font-semibold">Arrives</th>
                <th scope="col" className="border-b px-5 py-3.5 font-semibold">Landed price</th>
                <th scope="col" className="border-b px-5 py-3.5 font-semibold">
                  <span className="sr-only">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <ResultRow
                source="Verified distributor · Gauteng"
                meta="Trust 94 · local stock"
                grade="OEM-equivalent"
                arrives="2 days"
              />
              <ResultRow
                source="Verified factory · Ningbo"
                meta="Trust 92 · protected checkout"
                grade="Quality aftermarket"
                arrives="~6 weeks"
                best
              />
              <ResultRow
                source="Verified factory · Rayong"
                meta="Trust 89 · pickup specialist"
                grade="OEM"
                arrives="~5 weeks"
              />
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Seller names are shared once you accept a quote. Landed prices include freight, duty and VAT to your door.
        </p>
      </section>

      {/* How it works */}
      <section id="how" className="border-y bg-card">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-16">
          <h2 className="text-[32px] font-semibold tracking-[-0.02em]">Four steps. No guessing.</h2>
          <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Step n="01" title="Tell us the vehicle" body="Send a photo of the part, your licence disc or VIN, or search here." />
            <Step n="02" title="We match the exact part" body="OEM and aftermarket numbers checked against verified fitment data." />
            <Step n="03" title="Pay the seller directly" body="Through protected checkout or verified details. We never hold your money." />
            <Step n="04" title="Track it to your door" body="QC, shipping, customs and delivery, with one update a day." accent />
          </ol>
        </div>
      </section>

      {/* Trust cards */}
      <section aria-labelledby="trust-h" className="mx-auto max-w-6xl px-6 py-16">
        <h2 id="trust-h" className="text-[32px] font-semibold tracking-[-0.02em]">Built to remove the risk</h2>
        <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <TrustCard title="Fit guarantee" body="If a part we verified doesn't fit your vehicle, we replace it." />
          <TrustCard title="Verified sellers" body="Every seller is checked, scored on real orders, and their payment details are locked." />
          <TrustCard title="Customs handled" body="Permits, HS codes and documents checked before anything ships." />
        </div>
      </section>

      {/* Importer CTA band */}
      <section id="importers" className="mx-auto max-w-6xl px-6 pb-16">
        <div className="flex flex-wrap items-center justify-between gap-6 rounded-2xl bg-ink p-12 text-white">
          <div className="max-w-xl space-y-2.5">
            <h2 className="text-3xl font-semibold tracking-[-0.02em]">Importing parts? Run it all on Easy Logi.</h2>
            <p className="text-lg text-on-ink-muted">
              RFQs, supplier chats, quotes, QC, customs packs and shared containers in one console.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex min-h-12 items-center rounded-md bg-white px-6 text-base font-semibold text-ink hover:bg-white/90"
          >
            Open the console
          </Link>
        </div>
      </section>

      <footer className="border-t bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-7 text-sm text-muted-foreground">
          <span>Easy Logi · Eswatini and South Africa</span>
          <nav aria-label="Footer" className="flex flex-wrap gap-5">
            <a href="#how" className="hover:text-primary">How it works</a>
            <Link href="/request" className="hover:text-primary">Request a part</Link>
            <Link href="/login" className="hover:text-primary">Sign in</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function Field({
  id,
  name,
  label,
  placeholder,
  mono = false,
}: {
  id: string;
  name: string;
  label: string;
  placeholder: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-semibold text-muted-foreground">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type="text"
        placeholder={placeholder}
        className={cn(
          "min-h-12 rounded-md border border-input bg-background px-3.5 text-base",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          mono && "font-mono",
        )}
      />
    </div>
  );
}

function Tick({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <Check className="h-4 w-4 shrink-0 text-signal" aria-hidden="true" />
      {children}
    </li>
  );
}

function ResultRow({
  source,
  meta,
  grade,
  arrives,
  best = false,
}: {
  source: string;
  meta: string;
  grade: string;
  arrives: string;
  best?: boolean;
}) {
  return (
    <tr className={best ? "bg-signal-tint" : undefined}>
      <td className="border-b border-border-soft px-5 py-4">
        <p className="font-semibold">{source}</p>
        <p className="mt-1 text-[13px] text-muted-foreground">{meta}</p>
      </td>
      <td className="border-b border-border-soft px-5 py-4">{grade}</td>
      <td className="border-b border-border-soft px-5 py-4 font-semibold">{arrives}</td>
      <td className="border-b border-border-soft px-5 py-4">
        <span className="font-mono font-medium">On quote</span>
        {best && <p className="mt-1 text-[13px] font-semibold text-primary">Best value</p>}
      </td>
      <td className="border-b border-border-soft px-5 py-4 text-right">
        <Link
          href="/request"
          className={cn(
            buttonVariants({ variant: best ? "default" : "outline", size: "default" }),
            "whitespace-nowrap",
          )}
        >
          {best ? "Get guaranteed quote" : "Get quote"}
        </Link>
      </td>
    </tr>
  );
}

function Step({ n, title, body, accent = false }: { n: string; title: string; body: string; accent?: boolean }) {
  return (
    <li className={cn("flex flex-col gap-2.5 border-t-[3px] pt-4", accent ? "border-signal" : "border-ink")}>
      <span className="font-mono text-sm font-medium text-primary">{n}</span>
      <p className="text-lg font-semibold">{title}</p>
      <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
    </li>
  );
}

function TrustCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col gap-2.5 rounded-lg border bg-card p-7">
      <p className="text-lg font-semibold">{title}</p>
      <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
