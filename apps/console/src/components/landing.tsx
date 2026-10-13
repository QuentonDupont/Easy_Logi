import Link from "next/link";
import { Boxes, Camera, Ship, ArrowDown } from "lucide-react";
import { ORDER_PHASES } from "@/lib/status";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Public landing page. Subject: cross-border auto-parts sourcing + customs clearance for
 * Eswatini & South Africa — the promise is a correct part, cleared and landed. The bold element
 * is the headline + the six-phase journey (this product's signature); everything else stays quiet.
 */
export function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Boxes className="h-4 w-4" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">Easy&nbsp;Logi</span>
        </div>
        <Link href="/dashboard" className={buttonVariants({ size: "sm" })}>
          Open the console
        </Link>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-5 pb-16 pt-10 sm:pt-16">
        <p className="text-sm font-medium text-primary">Eswatini &amp; South Africa</p>
        <h1 className="mt-3 max-w-3xl font-display text-5xl font-extrabold leading-[1.04] tracking-tight sm:text-6xl">
          The right part, landed and cleared.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
          A buyer sends a photo or a few words. Easy Logi reads the exact part number, sources it from
          vetted suppliers, clears it through customs at Durban or Maputo, and gets it to their door —
          all on one order you can follow end to end.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/dashboard" className={buttonVariants({ size: "lg" })}>
            Open the console
          </Link>
          <Link href="#how" className={buttonVariants({ variant: "outline", size: "lg" })}>
            <ArrowDown className="mr-2 h-4 w-4" />
            See how it works
          </Link>
        </div>
      </section>

      {/* The journey — the product's signature */}
      <section id="how" className="border-y bg-card">
        <div className="mx-auto max-w-5xl px-5 py-14">
          <h2 className="font-display text-2xl font-bold tracking-tight">One order, six phases</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Every request becomes a single order record that moves through the same clear path —
            so the buyer, the importer and the clearing agent are always looking at the same truth.
          </p>
          <ol className="mt-8 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {ORDER_PHASES.map((p, i) => (
              <li key={p.key} className="relative">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 font-display text-sm font-bold text-primary">
                  {i + 1}
                </div>
                <p className="mt-3 text-sm font-semibold">{p.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{phaseBlurb(p.key)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Two engines */}
      <section className="mx-auto max-w-5xl px-5 py-16">
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Camera className="h-5 w-5" />
            </span>
            <h3 className="mt-4 font-display text-xl font-semibold">Find the exact part</h3>
            <p className="mt-2 text-muted-foreground">
              A photo of the part, a licence disc, or a plain description is enough. We read the part
              number off the label or match it to the buyer&apos;s vehicle — always verified against
              the catalogue, never guessed. A person confirms before a cent is spent.
            </p>
          </div>
          <div>
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Ship className="h-5 w-5" />
            </span>
            <h3 className="mt-4 font-display text-xl font-semibold">Source, clear and deliver</h3>
            <p className="mt-2 text-muted-foreground">
              We send the request to vetted suppliers, handle the quotes, payment, quality check and
              shipping via Durban or Maputo, then customs and the final road leg — every step tracked
              on the one order, with the buyer kept in the loop.
            </p>
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="border-t bg-card">
        <div className="mx-auto max-w-5xl px-5 py-14">
          <h2 className="font-display text-2xl font-bold tracking-tight">Built for the whole chain</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <AudienceCard
              title="Importers & ops"
              body="Run fitment, manage orders through every phase, grow the parts catalogue, and watch what needs a human."
              cta="Open the console"
              href="/dashboard"
            />
            <AudienceCard
              title="Buyers"
              body="Describe the part you need and follow your order to the door — by a simple link, no account to create."
              cta="Request a part"
              href="/request"
            />
            <AudienceCard
              title="Suppliers"
              body="Receive a request and send back a quote through a secure link — no login, no portal to learn."
              cta="How it works"
              href="#how"
            />
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-5xl px-5 py-10 text-sm text-muted-foreground">
        Easy Logi — auto-parts sourcing and customs clearance for Eswatini and South Africa.
      </footer>
    </div>
  );
}

function AudienceCard({
  title,
  body,
  cta,
  href,
}: {
  title: string;
  body: string;
  cta: string;
  href: string;
}) {
  return (
    <div className="flex flex-col rounded-lg border bg-background p-5">
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <p className="mt-2 flex-1 text-sm text-muted-foreground">{body}</p>
      <Link href={href} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4 self-start")}>
        {cta}
      </Link>
    </div>
  );
}

function phaseBlurb(key: string): string {
  switch (key) {
    case "fitment":
      return "Identify the exact part for the vehicle.";
    case "sourcing":
      return "RFQ to suppliers, collect quotes, issue the PO.";
    case "build":
      return "Deposit, production, QC, balance.";
    case "shipping":
      return "Consolidate and ship to Durban or Maputo.";
    case "clearance":
      return "Clear customs, then road to destination.";
    case "delivery":
      return "Delivered, and the buyer confirms it fits.";
    default:
      return "";
  }
}
