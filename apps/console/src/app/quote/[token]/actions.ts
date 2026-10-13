"use server";

import { redirect } from "next/navigation";
import { redeemMagicLink } from "@/lib/magic-link";
import { addQuote, DEMO_ORG_ID } from "@/lib/mock/backend";

function intOrNull(v: FormDataEntryValue | null): number | null {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** Public: a supplier submits a quote against the order the magic link is scoped to (single-use). */
export async function submitQuote(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const token = String(formData.get("token") ?? "");
  const supplierName = (String(formData.get("supplierName") ?? "").trim() || "Supplier").slice(0, 120);
  const priceMajor = Number(formData.get("unitPrice"));
  if (!Number.isFinite(priceMajor) || priceMajor <= 0) {
    return { error: "Enter a unit price." };
  }
  const currency = (String(formData.get("currency") ?? "ZAR").trim() || "ZAR").toUpperCase().slice(0, 3);
  const leadTimeDays = intOrNull(formData.get("leadTimeDays"));
  const moq = intOrNull(formData.get("moq"));

  const res = redeemMagicLink(token, { pageType: "supplier_quote" });
  if (res.ok) {
    addQuote({
      orgId: DEMO_ORG_ID,
      orderId: res.orderId,
      supplierName,
      currency,
      unitPriceMinor: Math.round(priceMajor * 100),
      leadTimeDays,
      moq,
    });
  }
  // Whether it recorded or the link was already used, the page reflects the result.
  redirect(`/quote/${token}`);
}
