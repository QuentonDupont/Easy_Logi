import Link from "next/link";
import { Package } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth";
import { getAccessibleOrgs, getActiveOrgId } from "@/lib/org-actions";
import { OrgSwitcher } from "@/components/org-switcher";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();

  if (!profile) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-4">
          <h1 className="text-xl font-semibold">Login not linked to an organisation</h1>
          <p className="text-sm text-muted-foreground">
            Your account is authenticated but has no profile row yet. An ops admin needs to link
            it to an organisation (see <code>db/seed/README.md</code>).
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
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <Link href="/orders" className="font-semibold">
                Easy Logi
              </Link>
              {isOps && <Badge variant="secondary">Ops</Badge>}
            </div>
            <nav className="flex items-center gap-3 text-sm">
              <Link href="/orders" className="text-muted-foreground hover:text-foreground">
                Orders
              </Link>
              <Link href="/fitment" className="text-muted-foreground hover:text-foreground">
                Fitment
              </Link>
              {isOps && (
                <Link href="/ingest" className="text-muted-foreground hover:text-foreground">
                  Ingest
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            {isOps && orgs.length > 0 && <OrgSwitcher orgs={orgs} activeOrgId={activeOrgId} />}
            <span className="hidden text-xs text-muted-foreground sm:inline">{profile.email}</span>
            <form action="/auth/signout" method="post">
              <Button variant="ghost" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
