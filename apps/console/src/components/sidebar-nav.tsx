"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ClipboardList, Wrench, UploadCloud, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: typeof LayoutDashboard; ops: boolean };

const ITEMS: Item[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, ops: false },
  { href: "/orders", label: "Orders", icon: ClipboardList, ops: false },
  { href: "/fitment", label: "Fitment", icon: Wrench, ops: false },
  { href: "/ingest", label: "Catalogue", icon: UploadCloud, ops: true },
  { href: "/ops", label: "Ops health", icon: Activity, ops: true },
];

export function SidebarNav({
  isOps,
  orientation = "vertical",
}: {
  isOps: boolean;
  orientation?: "vertical" | "horizontal";
}) {
  const pathname = usePathname();
  const items = ITEMS.filter((i) => !i.ops || isOps);

  return (
    <nav
      className={cn(
        orientation === "vertical"
          ? "flex flex-col gap-0.5"
          : "flex gap-1 overflow-x-auto",
      )}
    >
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
              orientation === "horizontal" && "whitespace-nowrap py-1.5",
              active
                ? "bg-primary/10 font-medium text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
