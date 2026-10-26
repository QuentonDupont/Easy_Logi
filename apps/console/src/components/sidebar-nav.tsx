"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  PackageSearch,
  Calculator,
  Wrench,
  FolderCheck,
  UploadCloud,
  Activity,
} from "lucide-react";
import type { AccountKind } from "@/lib/auth";
import { cn } from "@/lib/utils";

type Item = {
  href: string;
  /** Label per side; falls back to `default`. */
  label: Partial<Record<AccountKind, string>> & { default: string };
  icon: typeof LayoutDashboard;
  /** Which sides of the platform see this item. */
  for: AccountKind[];
  badgeKey?: string;
};

const ITEMS: Item[] = [
  { href: "/dashboard", label: { default: "Dashboard", individual: "Overview" }, icon: LayoutDashboard, for: ["business", "individual", "staff"] },
  { href: "/orders", label: { default: "Orders", individual: "My orders" }, icon: ClipboardList, for: ["business", "individual", "staff"] },
  { href: "/documents", label: { default: "Documents", business: "Company documents", individual: "My documents" }, icon: FolderCheck, for: ["business", "individual"] },
  { href: "/catalogue", label: { default: "Parts catalogue" }, icon: PackageSearch, for: ["business", "staff"] },
  { href: "/planner", label: { default: "Import planner" }, icon: Calculator, for: ["business", "staff"] },
  { href: "/fitment", label: { default: "Fitment queue" }, icon: Wrench, for: ["business", "staff"], badgeKey: "fitment" },
  { href: "/ingest", label: { default: "Catalogue import" }, icon: UploadCloud, for: ["staff"] },
  { href: "/ops", label: { default: "Ops health" }, icon: Activity, for: ["staff"], badgeKey: "ops" },
];

export function SidebarNav({
  kind,
  orientation = "vertical",
  badges = {},
}: {
  kind: AccountKind;
  orientation?: "vertical" | "horizontal";
  badges?: Record<string, number>;
}) {
  const pathname = usePathname();
  const items = ITEMS.filter((i) => i.for.includes(kind));

  return (
    <nav
      aria-label="Console"
      className={cn(orientation === "vertical" ? "flex flex-col gap-0.5" : "flex gap-1 overflow-x-auto")}
    >
      {items.map(({ href, label, icon: Icon, badgeKey }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        const count = badgeKey ? badges[badgeKey] ?? 0 : 0;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-2.5 rounded-md px-3 text-sm transition-colors",
              orientation === "horizontal" && "whitespace-nowrap",
              active
                ? "bg-ink-2 font-semibold text-white"
                : "font-medium text-on-ink-muted hover:bg-ink-2/60 hover:text-white",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="flex-1">{label[kind] ?? label.default}</span>
            {count > 0 && (
              <span className="rounded-full bg-signal px-2 py-0.5 text-xs font-bold text-ink">
                {count}
                <span className="sr-only"> waiting</span>
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
