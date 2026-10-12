import { FitmentConsole } from "@/components/fitment-console";
import { hasRealModel } from "@/lib/fitment/modelClient";

export const dynamic = "force-dynamic";

export default function FitmentPage() {
  return (
    <div className="space-y-6">
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
