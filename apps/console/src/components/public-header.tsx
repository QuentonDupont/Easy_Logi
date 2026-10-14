import Link from "next/link";
import { Logo } from "@easy-logi/ui";

/** Minimal top bar for the public (no-login) buyer/supplier pages. */
export function PublicHeader() {
  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex max-w-2xl items-center px-5 py-4">
        <Link href="/" aria-label="Easy Logi — home">
          <Logo size={28} variant="dark" />
        </Link>
      </div>
    </header>
  );
}
