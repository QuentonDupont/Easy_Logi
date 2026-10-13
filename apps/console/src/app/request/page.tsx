import { PublicHeader } from "@/components/public-header";
import { BuyerRequest } from "@/components/buyer-request";

export const dynamic = "force-dynamic";

export default function RequestPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main className="mx-auto max-w-2xl px-5 py-10">
        <h1 className="font-display text-3xl font-bold tracking-tight">Find your part</h1>
        <p className="mt-2 text-muted-foreground">
          Tell us what you need — you don&apos;t need the exact part number. We&apos;ll match it to
          your vehicle and, once you confirm, start sourcing it and send you a link to follow the order.
        </p>
        <div className="mt-8">
          <BuyerRequest />
        </div>
      </main>
    </div>
  );
}
