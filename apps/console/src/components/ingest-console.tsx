"use client";

import { useActionState, useRef, useState } from "react";
import { Upload, UploadCloud } from "lucide-react";
import { uploadCatalogue, publishBatch } from "@/app/(app)/ingest/actions";
import { INITIAL_UPLOAD, type RowStatus, type UploadState } from "@/lib/ingest/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const SAMPLE_CSV = `part_number,brand,category,description,make,model,position,confidence
11-22-333,Toyota,brakes,Rear brake pad set Hilux,Toyota,Hilux,rear,0.9
44-55-666,Isuzu,cooling,Water pump D-Max,Isuzu,D-Max,,0.88
11-22-333,Toyota,brakes,Rear brake pad set Hilux,Toyota,Hilux,rear,0.9
90915-YZZE1,Toyota,suspension,Mislabelled oil filter,Toyota,Corolla,,0.8
,NoBrand,,missing required fields,,,,
77-88-999,Ford,electrical,Alternator Ranger,Ford,Ranger,,0.85`;

function statusVariant(s: RowStatus): "default" | "secondary" | "success" | "warning" | "destructive" {
  switch (s) {
    case "new":
    case "published":
      return "success";
    case "conflict":
      return "warning";
    case "invalid":
      return "destructive";
    default:
      return "secondary";
  }
}

export function IngestConsole() {
  const [uploadState, uploadAction, uploadPending] = useActionState(uploadCatalogue, INITIAL_UPLOAD);
  const [publishState, publishAction, publishPending] = useActionState(publishBatch, INITIAL_UPLOAD);
  const [csv, setCsv] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const latest: UploadState = (publishState.ts ?? 0) >= (uploadState.ts ?? 0) ? publishState : uploadState;
  const rows = latest.rows;
  const counts = latest.counts;
  const newCount = counts.new ?? 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <UploadCloud className="h-4 w-4" /> Upload a catalogue
          </CardTitle>
          <CardDescription>
            Columns: part_number, brand, category, description, and optional make, model, position,
            confidence, crossref_brand, crossref_number.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form ref={formRef} action={uploadAction} className="space-y-3">
            <input
              type="file"
              name="file"
              accept=".csv,.xlsx,text/csv"
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm hover:file:bg-muted"
            />
            <textarea
              name="csvText"
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              rows={4}
              placeholder="…or paste CSV here"
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={uploadPending} size="sm">
                <Upload className="mr-2 h-4 w-4" />
                {uploadPending ? "Reading…" : "Upload & review"}
              </Button>
              <button
                type="button"
                onClick={() => setCsv(SAMPLE_CSV)}
                className="rounded-full border px-3 py-1 text-xs text-muted-foreground hover:bg-muted"
              >
                Use sample CSV
              </button>
            </div>
            {latest.error && <p className="text-sm text-destructive">{latest.error}</p>}
          </form>
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="text-base">
                Review {latest.filename ? `— ${latest.filename}` : ""}
              </CardTitle>
              <CardDescription className="flex flex-wrap gap-2 pt-1">
                {Object.entries(counts).map(([k, v]) => (
                  <Badge key={k} variant={statusVariant(k as RowStatus)}>
                    {v} {k}
                  </Badge>
                ))}
              </CardDescription>
            </div>
            {latest.published !== undefined ? (
              <Badge variant="success">Published {latest.published}</Badge>
            ) : (
              <form action={publishAction}>
                <input type="hidden" name="batchId" value={latest.batchId ?? ""} />
                <Button type="submit" size="sm" disabled={publishPending || newCount === 0}>
                  {publishPending ? "Publishing…" : `Publish ${newCount} new`}
                </Button>
              </form>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Part number</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={`${r.rowNumber}-${r.partNumber}`}>
                    <TableCell className="text-muted-foreground">{r.rowNumber}</TableCell>
                    <TableCell className="font-mono text-xs">{r.partNumber || "—"}</TableCell>
                    <TableCell>{r.brand || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{r.category || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.make ? `${r.make} ${r.model ?? ""}`.trim() : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                      {r.message}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
