/** Raw parsed row from a catalogue upload (all strings, before validation/normalisation). */
export interface ParsedRow {
  rowNumber: number;
  partNumber: string;
  brand: string;
  category: string;
  description: string;
  make: string;
  model: string;
  position: string;
  confidence: string;
  crossrefBrand: string;
  crossrefNumber: string;
}

export type RowStatus = "new" | "duplicate" | "conflict" | "invalid" | "published" | "skipped";

/** A staged row after normalisation + dedupe classification. */
export interface StagedRow {
  rowNumber: number;
  partNumber: string;
  normalizedNumber: string;
  brand: string;
  category: string;
  description: string;
  make: string | null;
  model: string | null;
  position: string | null;
  confidence: number | null;
  crossrefBrand: string | null;
  crossrefNumber: string | null;
  status: RowStatus;
  message: string;
}

export interface ExistingPart {
  part_number: string;
  brand: string;
  category: string;
  description: string;
}

/** Shared state shape for the ingest server actions + client console (kept out of the
 * "use server" module, which may only export async functions). */
export interface UploadState {
  batchId: string | null;
  filename: string | null;
  rows: StagedRow[];
  counts: Record<string, number>;
  error?: string;
  published?: number;
  ts?: number;
}

export const INITIAL_UPLOAD: UploadState = { batchId: null, filename: null, rows: [], counts: {} };
