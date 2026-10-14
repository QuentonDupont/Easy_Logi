"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ClipboardList, PackageSearch, Calculator, Wrench, UploadCloud, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: typeof LayoutDashboard; ops: boolean; badgeKey?: string };

const ITEMS: Item[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, ops: false },
  { href: "/orders", label: "Orders", icon: ClipboardList, ops: false },
  { href: "/catalogue", label: "Parts catalogue", icon: PackageSearch, ops: false },
  { href: "/planner", label: "Import planner", icon: Calculator, ops: false },
  { href: "/fitment", label: "Fitment queue", icon: Wrench, ops: false, badgeKey: "fitment" },
  { href: "/ingest", label: "Catalogue import", icon: UploadCloud, ops: true },
  { href: "/ops", label: "Ops health", icon: Activity, ops: true, badgeKey: "ops" },
];

export function SidebarNav({
  isOps,
  orientation = "vertical",
  badges = {},
}: {
  isOps: boolean;
  orientation?: "vertical" | "horizontal";
  badges?: Record<string, number>;
}) {
  const pathname = usePathname();
  const items = ITEMS.filter((i) => !i.ops || isOps);

  return (
    <nav
      aria-label="Console"
      className={cn(
        orientation === "vertical" ? "flex flex-col gap-0.5" : "flex gap-1 overflow-x-auto",
      )}
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
            <span className="flex-1">{label}</span>
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
