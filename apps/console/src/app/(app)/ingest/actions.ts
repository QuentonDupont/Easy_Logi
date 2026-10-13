"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import { parseUpload, parseCsv } from "@/lib/ingest/parse";
import { classifyRows, countByStatus } from "@/lib/ingest/classify";
import { INITIAL_UPLOAD, type StagedRow, type UploadState } from "@/lib/ingest/types";
import {
  mockFitmentData,
  createIngestionBatch,
  saveIngestionRows,
  listIngestionRows,
  updateIngestionRowStatus,
  markIngestionBatchPublished,
  addCatalogPart,
  addCatalogCrossref,
  addCatalogFitment,
  resolveVehicleId,
} from "@/lib/mock/backend";

async function requireOps() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "ops_admin") return null;
  return profile;
}

/** Upload a catalogue file, parse + classify it, and stage the rows for review. */
export async function uploadCatalogue(_prev: UploadState, formData: FormData): Promise<UploadState> {
  const profile = await requireOps();
  if (!profile) return { ...INITIAL_UPLOAD, error: "Ops admins only.", ts: Date.now() };

  const file = formData.get("file");
  const csvText = String(formData.get("csvText") ?? "").trim();
  const hasFile = file instanceof File && file.size > 0;
  if (!hasFile && !csvText) {
    return { ...INITIAL_UPLOAD, error: "Choose a CSV/XLSX file or paste CSV text.", ts: Date.now() };
  }
  if (hasFile && (file as File).size > 5_000_000) {
    return { ...INITIAL_UPLOAD, error: "File too large (max 5MB).", ts: Date.now() };
  }

  const filename = hasFile ? (file as File).name : "pasted.csv";
  let rows: StagedRow[];
  try {
    const parsed = hasFile ? await parseUpload(file as File) : parseCsv(csvText);
    if (parsed.length === 0) {
      return { ...INITIAL_UPLOAD, error: "No data rows found (need a header + at least one row).", ts: Date.now() };
    }
    rows = classifyRows(parsed, mockFitmentData().parts);
  } catch (err) {
    return {
      ...INITIAL_UPLOAD,
      error: `Could not parse the file: ${err instanceof Error ? err.message : String(err)}`,
      ts: Date.now(),
    };
  }

  const batchId = createIngestionBatch({ orgId: profile.orgId, filename, rowCount: rows.length });
  saveIngestionRows(
    batchId,
    rows.map((r) => ({ ...r }) as unknown as Record<string, unknown>),
  );

  return { batchId, filename, rows, counts: countByStatus(rows), ts: Date.now() };
}

/** Publish the "new" rows of a staged batch into the parts / crossrefs / fitments catalogue. */
export async function publishBatch(_prev: UploadState, formData: FormData): Promise<UploadState> {
  const profile = await requireOps();
  if (!profile) return { ...INITIAL_UPLOAD, error: "Ops admins only.", ts: Date.now() };

  const batchId = String(formData.get("batchId") ?? "");
  const stored = listIngestionRows(batchId);
  if (stored.length === 0) {
    return { ...INITIAL_UPLOAD, error: "Nothing staged to publish.", ts: Date.now() };
  }

  let published = 0;
  for (const raw of stored) {
    const row = raw as unknown as StagedRow & { id: string; status: string };
    if (row.status !== "new") continue;
    const partId = addCatalogPart({
      partNumber: row.partNumber,
      brand: row.brand,
      category: row.category,
      description: row.description,
    });
    if (row.crossrefNumber) {
      addCatalogCrossref({
        partId,
        crossrefBrand: row.crossrefBrand ?? row.brand,
        crossrefNumber: row.crossrefNumber,
      });
    }
    if (row.make && row.model) {
      const vehicleId = resolveVehicleId(row.make, row.model);
      if (vehicleId) {
        addCatalogFitment({
          vehicleId,
          partId,
          position: row.position,
          source: `ingest:${batchId.slice(0, 8)}`,
          confidence: row.confidence ?? 0.7,
        });
      }
    }
    updateIngestionRowStatus(row.id, "published");
    published += 1;
  }
  markIngestionBatchPublished(batchId);

  const after = listIngestionRows(batchId) as unknown as StagedRow[];
  revalidatePath("/fitment");
  return {
    batchId,
    filename: null,
    rows: after,
    counts: countByStatus(after),
    published,
    ts: Date.now(),
  };
}
