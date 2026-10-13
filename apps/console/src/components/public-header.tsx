import Link from "next/link";
import { Boxes } from "lucide-react";

/** Minimal top bar for the public (no-login) buyer/supplier pages. */
export function PublicHeader() {
  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex max-w-2xl items-center px-5 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Boxes className="h-4 w-4" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">Easy&nbsp;Logi</span>
        </Link>
      </div>
    </header>
  );
}
