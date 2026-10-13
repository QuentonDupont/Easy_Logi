"use client";

import { useActionState } from "react";
import { Link2 } from "lucide-react";
import { issueTrackingLink, issueSupplierLink } from "@/app/(app)/orders/actions";
import { Button } from "@/components/ui/button";

type LinkState = { url?: string; error?: string };
const INITIAL: LinkState = {};

function LinkOut({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="mt-2 block truncate rounded-md border bg-muted/40 px-2 py-1 font-mono text-xs text-primary hover:underline"
    >
      {url}
    </a>
  );
}

export function ShareLinks({ orderId }: { orderId: string }) {
  const [track, trackAction, trackPending] = useActionState(issueTrackingLink, INITIAL);
  const [supp, suppAction, suppPending] = useActionState(issueSupplierLink, INITIAL);

  return (
    <div className="space-y-4">
      <div>
        <form action={trackAction}>
          <input type="hidden" name="orderId" value={orderId} />
          <Button type="submit" variant="outline" size="sm" disabled={trackPending} className="w-full justify-start">
            <Link2 className="mr-2 h-4 w-4" />
            {trackPending ? "Creating…" : "Buyer tracking link"}
          </Button>
        </form>
        {track.url && <LinkOut url={track.url} />}
        {track.error && <p className="mt-1 text-xs text-destructive">{track.error}</p>}
      </div>
      <div>
        <form action={suppAction}>
          <input type="hidden" name="orderId" value={orderId} />
          <Button type="submit" variant="outline" size="sm" disabled={suppPending} className="w-full justify-start">
            <Link2 className="mr-2 h-4 w-4" />
            {suppPending ? "Creating…" : "Supplier quote link"}
          </Button>
        </form>
        {supp.url && <LinkOut url={supp.url} />}
        {supp.error && <p className="mt-1 text-xs text-destructive">{supp.error}</p>}
      </div>
    </div>
  );
}
