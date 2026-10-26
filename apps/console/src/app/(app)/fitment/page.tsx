import { FitmentConsole } from "@/components/fitment-console";
import { hasRealModel } from "@/lib/fitment/modelClient";
import { requireKind } from "@/lib/guards";

export const dynamic = "force-dynamic";

export default async function FitmentPage({
  searchParams,
}: {
  searchParams: Promise<{ needOrg?: string }>;
}) {
  await requireKind(["business", "staff"]);
  const { needOrg } = await searchParams;
  return (
    <div className="space-y-6">
      {needOrg && (
        <p role="alert" className="rounded-md border border-destructive/40 px-4 py-3 text-sm text-destructive">
          Choose the customer account in the Org switcher first, then confirm the fit again.
        </p>
      )}
      <div>
        <h1 className="text-2xl font-semibold">Fitment</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Describe a part the way a buyer would. The engine extracts the vehicle and part, retrieves
          candidate part numbers from the catalogue, and ranks them. Confirming a fit creates an order
          and walks it through the status machine. No part number is ever invented — only catalogue
          matches are offered.
        </p>
      </div>
      <FitmentConsole offline={!hasRealModel()} />
    </div>
  );
}
