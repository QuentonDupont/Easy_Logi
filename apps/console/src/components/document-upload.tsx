"use client";

import { useActionState } from "react";
import { CheckCircle2, Circle, FileText, Upload } from "lucide-react";
import { uploadDocument, type UploadState } from "@/lib/documents/actions";
import type { UploadRequirement } from "@/lib/documents/requirements";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type UploadedFile = {
  id: string;
  filename: string;
  created_at: string;
  status: string;
};

const INITIAL: UploadState = { ok: false };

/** One checklist item: what is needed, what is on file, and how to add it. */
export function DocumentUploadRow({
  orderId,
  req,
  files,
  canUpload,
}: {
  orderId: string | null;
  req: UploadRequirement;
  files: UploadedFile[];
  canUpload: boolean;
}) {
  const [state, formAction, pending] = useActionState(uploadDocument, INITIAL);
  const present = files.length > 0;
  const inputId = `file-${req.key}`;

  return (
    <li className="rounded-md border px-3 py-3 text-sm">
      <div className="flex items-start gap-2">
        {present ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
        ) : (
          <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <p className="flex flex-wrap items-center gap-2 font-medium">
            {req.label}
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                req.required ? "bg-ink text-white" : "bg-border-soft text-foreground",
              )}
            >
              {req.required ? "Required to move on" : "Optional"}
            </span>
            {req.scope === "account" && (
              <span className="rounded-full bg-border-soft px-2 py-0.5 text-[11px] font-semibold">
                Saved to your account
              </span>
            )}
            <span className="sr-only">{present ? "On file." : "Not on file yet."}</span>
          </p>
          {req.hint && <p className="text-xs text-muted-foreground">{req.hint}</p>}
          {req.verified === false && (
            <p className="text-xs text-muted-foreground">Rule not yet verified — confirm with your clearing agent.</p>
          )}

          {files.length > 0 && (
            <ul className="list-none space-y-1 p-0">
              {files.map((f) => (
                <li key={f.id} className="flex flex-wrap items-center gap-2 text-xs">
                  <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <a href={`/files/${f.id}`} target="_blank" rel="noopener noreferrer" className="font-medium underline">
                    {f.filename}
                  </a>
                  <span className="text-muted-foreground">
                    {new Date(f.created_at).toLocaleDateString("en-ZA")} ·{" "}
                    {f.status === "received" ? "Received — not yet checked" : f.status}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {canUpload ? (
            <form action={formAction} className="flex flex-wrap items-center gap-2 pt-1">
              {orderId && <input type="hidden" name="orderId" value={orderId} />}
              <input type="hidden" name="docKey" value={req.key} />
              <label htmlFor={inputId} className="sr-only">
                Choose a file for {req.label}
              </label>
              <input
                id={inputId}
                name="file"
                type="file"
                required
                accept="application/pdf,image/jpeg,image/png,image/webp"
                className="max-w-full text-xs file:mr-2 file:rounded-md file:border file:border-ink file:bg-background file:px-2 file:py-1 file:text-xs file:font-medium"
              />
              <button type="submit" disabled={pending} className={buttonVariants({ size: "sm" })}>
                <Upload className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                {pending ? "Uploading…" : present ? "Upload another" : "Upload"}
              </button>
            </form>
          ) : (
            !present && <p className="text-xs text-muted-foreground">Easy Logi adds this document for you.</p>
          )}
          {state.error && (
            <p role="alert" className="text-xs text-destructive">
              {state.error}
            </p>
          )}
          {state.ok && state.message && (
            <p role="status" className="text-xs text-success">
              {state.message}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}
