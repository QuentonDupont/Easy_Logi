import * as React from "react";
import { cn } from "../lib/cn";

/** "Verified fit" chip — cleared-tint background, cleared text, bold (Manifest §3). */
export function VerifiedFitChip({
  children = "Verified fit",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
        "bg-cleared-tint text-success",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
