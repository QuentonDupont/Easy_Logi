import { BuyerPurchasePage } from "@/components/buyer-purchase";

export const metadata = {
  title: "Buyer purchase page (preview) · Easy Logi",
};

/**
 * Design preview of the buyer purchase page (Manifest §4.3). The live pay-the-seller flow
 * depends on the Purchase Pack / payment-evidence model from docs/commerce-model.md, which is
 * plan-first and not built yet — so this route renders the screen with illustrative data only.
 */
export default function PurchasePreviewPage() {
  return (
    <div className="min-h-screen bg-muted py-8">
      <div className="mx-auto mb-6 max-w-sm px-4">
        <p className="rounded-md border border-ink bg-ink px-3 py-2 text-xs font-medium text-white">
          Design preview · illustrative data. The live payment flow is built with the commerce model.
        </p>
      </div>
      <BuyerPurchasePage />
    </div>
  );
}
