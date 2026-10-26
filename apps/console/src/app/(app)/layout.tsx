import Link from "next/link";
import type { OrderStatus } from "@easy-logi/shared";
import { Logo } from "@easy-logi/ui";
import { accountKind, getCurrentProfile } from "@/lib/auth";
import { getAccessibleOrgs, getActiveOrgId } from "@/lib/org-actions";
import { listAllOrders, listAllAgentRuns, listAllEvents, listOrdersForOrg } from "@/lib/mock/backend";
import { needsHumanRuns, needsHumanEvents } from "@/lib/ops/health";
import { OrgSwitcher } from "@/components/org-switcher";
import { SidebarNav } from "@/components/sidebar-nav";
import { Button } from "@/components/ui/button";

const FITMENT_QUEUE: OrderStatus[] = ["requested", "fitment_in_progress"];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();

  if (!profile) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-4">
          <h1 className="text-xl font-semibold">This account isn&apos;t linked to an organisation yet</h1>
          <p className="text-sm text-muted-foreground">
            You&apos;re signed in, but an ops admin needs to connect your account to an organisation
            before you can work. Ask them to add you, then sign in again.
          </p>
          <form action="/auth/signout" method="post">
            <Button variant="outline">Sign out</Button>
          </form>
        </div>
      </main>
    );
  }

  const isOps = profile.role === "ops_admin";
  const kind = accountKind(profile);
  // Staff switch between CUSTOMER accounts; their own staff organisation isn't one.
  const orgs = isOps ? (await getAccessibleOrgs()).filter((o) => o.id !== profile.orgId) : [];
  const activeOrgId = await getActiveOrgId();

  // Real badge counts (no fabricated numbers), scoped to what this user can see: staff see every
  // account's fitment queue; a business sees its own. Individuals have no queue.
  const orders = isOps ? listAllOrders() : listOrdersForOrg(profile.orgId);
  const badges: Record<string, number> = {
    fitment: orders.filter((o) => FITMENT_QUEUE.includes(o.status as OrderStatus)).length,
  };
  if (isOps) {
    badges.ops = needsHumanRuns(listAllAgentRuns()).length + needsHumanEvents(listAllEvents()).length;
  }
  const accountChip =
    kind === "staff" ? "Easy Logi staff" : kind === "business" ? `Business · ${profile.orgName ?? ""}` : "Personal account";

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar — desktop (Ink) */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-ink text-white md:flex print:hidden">
        <div className="flex h-16 items-center px-5">
          <Link href="/dashboard" aria-label="Easy Logi — dashboard">
            <Logo size={28} variant="light" />
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2">
          <SidebarNav kind={kind} badges={badges} />
        </div>
        <div className="border-t border-ink-2 px-5 py-4">
          <p className="truncate text-sm font-medium text-white">{profile.fullName ?? profile.email}</p>
          <p className="truncate text-xs text-on-ink-muted">{profile.email}</p>
          <span className="mt-2 inline-flex max-w-full truncate rounded-full bg-ink-2 px-2.5 py-0.5 text-xs font-medium text-on-ink-muted">
            {accountChip}
          </span>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-3 border-b bg-card/90 px-4 backdrop-blur md:px-8 print:hidden">
          <Link href="/dashboard" className="md:hidden" aria-label="Easy Logi — dashboard">
            <Logo size={24} variant="dark" />
          </Link>
          <p className="hidden text-sm text-muted-foreground md:block">{accountChip}</p>
          <div className="flex items-center gap-3">
            {isOps && orgs.length > 0 && <OrgSwitcher orgs={orgs} activeOrgId={activeOrgId} />}
            <form action="/auth/signout" method="post">
              <Button variant="ghost" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </header>

        {/* Nav — mobile (Ink strip) */}
        <div className="bg-ink px-2 py-2 md:hidden print:hidden">
          <SidebarNav kind={kind} orientation="horizontal" badges={badges} />
        </div>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-8">{children}</main>
      </div>
    </div>
  );
}
