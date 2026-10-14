"use client";

import { Printer } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

/** Opens the browser print dialog (save-as-PDF) for the current document page. */
export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className={buttonVariants({ size: "sm" })}>
      <Printer className="mr-2 h-4 w-4" aria-hidden="true" />
      Print / save as PDF
    </button>
  );
}
