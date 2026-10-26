"use client";

import { useRef } from "react";
import { Select } from "@/components/ui/select";
import { setActiveOrg } from "@/lib/org-actions";
import type { OrgOption } from "@/lib/org";

/** Ops-only switcher: changing the selection submits the setActiveOrg server action. */
export function OrgSwitcher({ orgs, activeOrgId }: { orgs: OrgOption[]; activeOrgId: string | null }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={setActiveOrg} className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Org</span>
      <Select
        name="orgId"
        defaultValue={activeOrgId && orgs.some((o) => o.id === activeOrgId) ? activeOrgId : ""}
        onChange={() => formRef.current?.requestSubmit()}
        className="h-8 w-56 text-xs"
        aria-label="Active organisation"
      >
        <option value="" disabled>
          Choose a customer…
        </option>
        {orgs.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </Select>
    </form>
  );
}
