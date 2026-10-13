import { Lock } from "lucide-react";
import { Logo, VerifiedFitChip } from "@easy-logi/ui";

/**
 * Buyer purchase page (Manifest §4.3) — the "pay the seller" screen from the commerce model
 * (docs/commerce-model.md). The live flow depends on the Purchase Pack + payment-evidence data
 * model, which is plan-first and not built yet, so this is a static, fixture-backed PREVIEW:
 * amounts are shown as bracketed placeholders and no button performs a real payment.
 */
export function BuyerPurchasePage() {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col bg-background">
      {/* Ink header + progress */}
      <header className="flex flex-col gap-3.5 bg-ink px-5 pb-5 pt-4 text-white">
        <div className="flex items-center justify-between">
          <Logo size={28} variant="light" />
          <span className="font-mono text-[13px] text-on-ink-muted">EL-7K3Q-0192</span>
        </div>
        <ol aria-label="Order progress" className="grid grid-cols-4 gap-1.5 text-[11px] font-semibold">
          <ProgressStep label="Quote" done />
          <ProgressStep label="Pay seller" done />
          <ProgressStep label="QC" />
          <ProgressStep label="Delivery" />
        </ol>
      </header>

      <div className="flex flex-col gap-3.5 p-4">
        {/* Part */}
        <section aria-label="Part" className="flex flex-col gap-2 rounded-lg border bg-card p-4">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-xl font-semibold tracking-[-0.01em]">Front brake pads</h1>
            <VerifiedFitChip />
          </div>
          <p className="text-sm text-muted-foreground">Toyota Hilux 2.5 D-4D (2012) · Qty 2 sets</p>
          <p className="font-mono text-[13px]">OEM 04465-0K290 · Quality aftermarket</p>
        </section>

        {/* Value line */}
        <section
          aria-label="Your value"
          className="flex flex-col gap-1.5 rounded-lg border border-[color:var(--el-signal-border)] bg-signal-tint p-4"
        >
          <p className="text-[17px] font-semibold">You save R [amount] vs local retail</p>
          <p className="text-sm text-muted-foreground">
            Fit guaranteed · Arrives ~6 weeks · Local in 2 days for R [amount] more
          </p>
        </section>

        {/* Landed price breakdown */}
        <section aria-labelledby="cost-h" className="flex flex-col gap-2.5 rounded-lg border bg-card p-4">
          <h2 id="cost-h" className="text-[15px] font-semibold">Landed price breakdown</h2>
          <dl className="flex flex-col gap-2 text-sm">
            <CostRow label="Goods (pay seller)" value="R [x]" />
            <CostRow label="Freight share" value="R [x]" />
            <CostRow label="Duty + VAT (at clearance)" value="R [x]" />
            <CostRow label="Easy Logi fee (incl. guarantee)" value="R [x]" />
            <div className="flex justify-between border-t pt-2.5 font-bold">
              <dt>Total landed</dt>
              <dd className="font-mono">R [total]</dd>
            </div>
          </dl>
        </section>

        {/* Pay the seller */}
        <section aria-labelledby="pay-h" className="flex flex-col gap-3 rounded-lg border bg-card p-4">
          <div className="flex flex-col gap-1">
            <h2 id="pay-h" className="text-[15px] font-semibold">Pay the seller · 30% deposit</h2>
            <p className="text-[13px] text-muted-foreground">
              Ningbo Brake Components Co. · Verified factory · Trust 92
            </p>
          </div>
          <div className="flex min-h-14 flex-col justify-center rounded-lg bg-primary px-4 py-2 text-primary-foreground">
            <span className="text-base font-semibold">Pay via protected checkout</span>
            <span className="text-xs text-primary-foreground/80">Recommended · buyer protection</span>
          </div>
          <div className="flex min-h-12 items-center rounded-lg border border-ink px-4 text-[15px] font-semibold">
            Pay by card link
          </div>
          <div className="flex min-h-[52px] flex-col justify-center rounded-lg border px-4 py-1.5">
            <span className="text-[15px] font-semibold">Bank transfer</span>
            <span className="text-xs text-muted-foreground">Verified details · use ref EL-7K3Q-0192</span>
          </div>
          <div className="flex items-start gap-2.5 rounded-md bg-background p-3">
            <Lock className="mt-0.5 h-[18px] w-[18px] shrink-0 text-muted-foreground" aria-hidden="true" />
            <p className="text-[13px] leading-snug text-muted-foreground">
              Balance (70%) unlocks after QC photos pass. Easy Logi never holds your money.
            </p>
          </div>
        </section>

        <div className="flex min-h-[52px] items-center justify-center rounded-lg border border-dashed border-muted-foreground text-[15px] font-semibold">
          Upload proof of payment
        </div>

        <p className="py-2 text-center text-sm font-medium">Questions? Chat with us</p>
      </div>
    </div>
  );
}

function ProgressStep({ label, done = false }: { label: string; done?: boolean }) {
  return (
    <li className={`flex flex-col gap-1.5 ${done ? "" : "text-on-ink-muted"}`}>
      <span className={`h-1 rounded-sm ${done ? "bg-signal" : "bg-ink-2"}`} />
      {label}
    </li>
  );
}

function CostRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono">{value}</dd>
    </div>
  );
}
