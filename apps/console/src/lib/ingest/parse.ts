import type { ParsedRow } from "./types";

/**
 * Catalogue upload parsing. CSV is parsed natively (RFC4180-ish: quoted fields, escaped quotes,
 * CRLF). XLSX is read via the `xlsx` package (first sheet). Both produce the same ParsedRow[].
 * Headers are matched flexibly (case/spacing/punctuation-insensitive) to known columns.
 */

/** The string-valued ParsedRow fields a CSV/XLSX column can map to (everything except rowNumber). */
type StringCol = Exclude<keyof ParsedRow, "rowNumber">;

const HEADER_MAP: Record<string, StringCol> = {
  partnumber: "partNumber",
  partno: "partNumber",
  partnum: "partNumber",
  part: "partNumber",
  sku: "partNumber",
  brand: "brand",
  manufacturer: "brand",
  category: "category",
  cat: "category",
  description: "description",
  desc: "description",
  name: "description",
  make: "make",
  vehiclemake: "make",
  model: "model",
  vehiclemodel: "model",
  position: "position",
  pos: "position",
  confidence: "confidence",
  conf: "confidence",
  crossrefbrand: "crossrefBrand",
  xrefbrand: "crossrefBrand",
  crossrefnumber: "crossrefNumber",
  xrefnumber: "crossrefNumber",
  crossref: "crossrefNumber",
};

function normHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** RFC4180-ish CSV tokenizer into a grid of string cells. */
export function tokenizeCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  let sawAny = false;
  for (let i = 0; i < text.length; i++) {
    const c = text.charAt(i);
    sawAny = true;
    if (inQuotes) {
      if (c === '"') {
        if (text.charAt(i + 1) === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") {
      field += c;
    }
  }
  if (sawAny && (field.length > 0 || row.length > 0)) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function gridToRows(grid: string[][]): ParsedRow[] {
  const nonEmpty = grid.filter((r) => r.some((c) => String(c).trim().length > 0));
  if (nonEmpty.length < 2) return [];
  const header = nonEmpty[0]!;
  const colMap = new Map<number, StringCol>();
  header.forEach((h, idx) => {
    const key = HEADER_MAP[normHeader(String(h))];
    if (key) colMap.set(idx, key);
  });

  const out: ParsedRow[] = [];
  for (let i = 1; i < nonEmpty.length; i++) {
    const cells = nonEmpty[i]!;
    const r: ParsedRow = {
      rowNumber: i,
      partNumber: "",
      brand: "",
      category: "",
      description: "",
      make: "",
      model: "",
      position: "",
      confidence: "",
      crossrefBrand: "",
      crossrefNumber: "",
    };
    for (const [idx, key] of colMap) {
      r[key] = String(cells[idx] ?? "").trim();
    }
    out.push(r);
  }
  return out;
}

export function parseCsv(text: string): ParsedRow[] {
  return gridToRows(tokenizeCsv(text));
}

/** Parse an uploaded catalogue file (CSV or XLSX) into ParsedRow[]. Server-side only. */
export async function parseUpload(file: File): Promise<ParsedRow[]> {
  const name = file.name.toLowerCase();
  const isXlsx = name.endsWith(".xlsx") || file.type.includes("spreadsheetml");
  if (isXlsx) {
    const XLSX = (await import("xlsx")) as typeof import("xlsx");
    const buf = new Uint8Array(await file.arrayBuffer());
    const wb = XLSX.read(buf, { type: "array" });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) return [];
    const sheet = wb.Sheets[sheetName]!;
    const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false, defval: "" });
    return gridToRows(grid.map((r) => r.map((c) => String(c ?? ""))));
  }
  const text = await file.text();
  return parseCsv(text);
}
