import Link from "next/link";
import { Boxes } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth";
import { getAccessibleOrgs, getActiveOrgId } from "@/lib/org-actions";
import { OrgSwitcher } from "@/components/org-switcher";
import { SidebarNav } from "@/components/sidebar-nav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/dashboard" className="flex items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Boxes className="h-4 w-4" />
      </span>
      <span className="font-display text-lg font-bold tracking-tight">Easy&nbsp;Logi</span>
      {!compact && <Badge variant="secondary" className="ml-1">Console</Badge>}
    </Link>
  );
}

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
  const orgs = isOps ? await getAccessibleOrgs() : [];
  const activeOrgId = await getActiveOrgId();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar — desktop */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-card md:flex">
        <div className="flex h-14 items-center border-b px-4">
          <Brand />
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <SidebarNav isOps={isOps} />
        </div>
        <div className="border-t p-4">
          <p className="truncate text-xs font-medium">{profile.fullName ?? profile.email}</p>
          <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
          {isOps && <Badge variant="secondary" className="mt-2">Ops admin</Badge>}
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-3 border-b bg-card/90 px-4 backdrop-blur md:px-8">
          <div className="md:hidden">
            <Brand compact />
          </div>
          <div className="hidden md:block" />
          <div className="flex items-center gap-3">
            {isOps && orgs.length > 0 && <OrgSwitcher orgs={orgs} activeOrgId={activeOrgId} />}
            <form action="/auth/signout" method="post">
              <Button variant="ghost" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </header>

        {/* Nav — mobile */}
        <div className="border-b bg-card px-2 py-2 md:hidden">
          <SidebarNav isOps={isOps} orientation="horizontal" />
        </div>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-8">{children}</main>
      </div>
    </div>
  );
}
