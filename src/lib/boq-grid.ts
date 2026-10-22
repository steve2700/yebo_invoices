// Turns a spreadsheet (as a plain grid of cells) into BOQ lines. No libraries, so it is easy to test.
// A BOQ sheet usually has a header row with Description and Qty, section headings such as "GROUND FLOOR",
// item rows, and total rows at the bottom. Anything we cannot place is kept and flagged, never silently dropped.

export type Cell = string | number | null | undefined;

export type ParsedLine = {
  kind: "heading" | "item";
  itemNo: string;
  description: string;
  unit: string;
  quantity: number | null;
  rateCents: number | null;
  estRateCents: number | null;
  raw: string;
  aiUnsure: boolean;
  sourceRef: string;
};

export type GridResult = {
  lines: ParsedLine[];
  itemCount: number;
  skippedTotals: number;
  headerRow: number | null;
};

const text = (c: Cell) => (c == null ? "" : String(c).replace(/ /g, " ").replace(/\s+/g, " ").trim());

export function toNumber(c: Cell): number | null {
  if (c == null || c === "") return null;
  if (typeof c === "number") return Number.isFinite(c) ? c : null;
  let s = String(c).replace(/[Rr\s ]/g, "");
  if (!s) return null;
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, "");
  else if (/^\d+,\d+$/.test(s)) s = s.replace(",", ".");
  else s = s.replace(/,/g, "");
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const TOTAL_ROW = /^(grand\s*total|sub\s*-?\s*total|total|vat\b|v\.a\.t|carried forward|brought forward|c\/f|b\/f|page total|collection|summary|tender (sum|total))/i;

type Cols = { desc: number; qty: number; unit: number; itemNo: number; rate: number; est: number };

function findHeader(grid: Cell[][]): { row: number; cols: Cols } | null {
  for (let r = 0; r < Math.min(grid.length, 60); r++) {
    const cells = (grid[r] ?? []).map((c) => text(c).toLowerCase());
    const desc = cells.findIndex((c) => /^(description|descript\.?|details?|item description|work description)$/.test(c));
    const qty = cells.findIndex((c) => /^(qty\.?|quantity|quantities|qnty|amount of units)$/.test(c));
    if (desc < 0 || qty < 0) continue;
    const unit = cells.findIndex((c) => /^(unit|units|uom|u\/m|unit of measure)$/.test(c));
    const itemNo = cells.findIndex((c) => /^(item|item no\.?|no\.?|nr\.?|ref\.?|item ref|clause)$/.test(c));
    const rateCol = cells.findIndex((c) => /^(rate|your rate|tender rate|rate \(r\)|rate r)$/.test(c));
    const priceCol = cells.findIndex((c) => /^(unit price|price|unit rate|rate per unit)$/.test(c));
    // A sheet with both a "Rate" and a "Unit Price" column: Rate is for the contractor, Unit Price is the client's estimate.
    const rate = rateCol >= 0 ? rateCol : priceCol;
    const est = rateCol >= 0 && priceCol >= 0 ? priceCol : -1;
    return { row: r, cols: { desc, qty, unit, itemNo, rate, est } };
  }
  return null;
}

const looksLikeHeading = (desc: string) => {
  if (desc.length > 90) return false;
  const letters = desc.replace(/[^A-Za-z]/g, "");
  if (!letters) return false;
  const upper = letters.replace(/[^A-Z]/g, "").length / letters.length;
  return upper > 0.7 || desc.length <= 40;
};

const cents = (n: number | null) => (n == null || n < 0 ? null : Math.round(n * 100));

export function parseBoqGrid(grid: Cell[][], sourceRef: string): GridResult {
  const header = findHeader(grid);
  if (!header) return { lines: [], itemCount: 0, skippedTotals: 0, headerRow: null };
  const { cols } = header;
  const lines: ParsedLine[] = [];
  let skippedTotals = 0;
  // Some BOQs put the first item's number on the section heading row ("1 | GROUND FLOOR"). Hand it to the next item.
  let carriedNo = "";

  for (let r = header.row + 1; r < grid.length; r++) {
    const row = grid[r] ?? [];
    const desc = text(row[cols.desc]);
    const qty = toNumber(row[cols.qty]);
    const unit = cols.unit >= 0 ? text(row[cols.unit]) : "";
    const itemNo = cols.itemNo >= 0 ? text(row[cols.itemNo]) : "";
    const raw = `Row ${r + 1}: ` + row.map(text).filter(Boolean).join(" | ");
    if (!desc && qty == null) continue;
    if (TOTAL_ROW.test(desc) && qty == null) { skippedTotals++; continue; }

    const rate = cols.rate >= 0 ? toNumber(row[cols.rate]) : null;
    const est = cols.est >= 0 ? toNumber(row[cols.est]) : null;
    const base = { raw, aiUnsure: false, sourceRef };

    if (qty == null && !unit) {
      const prev = lines[lines.length - 1];
      // A line of text with no number, starting in lower case, continues the item above it.
      if (prev && prev.kind === "item" && !itemNo && /^[a-z(]/.test(desc)) {
        prev.description = `${prev.description} ${desc}`.trim();
        prev.raw += ` // ${raw}`;
        continue;
      }
      if (looksLikeHeading(desc)) {
        carriedNo = itemNo;
        lines.push({ ...base, kind: "heading", itemNo: "", description: desc, unit: "", quantity: null, rateCents: null, estRateCents: null });
        continue;
      }
    }
    const numberForItem = itemNo || carriedNo;
    carriedNo = "";
    lines.push({
      ...base,
      kind: "item",
      itemNo: numberForItem,
      description: desc,
      unit,
      quantity: qty,
      rateCents: cents(rate),
      estRateCents: cents(est),
    });
  }
  return { lines, itemCount: lines.filter((l) => l.kind === "item").length, skippedTotals, headerRow: header.row };
}

// A small CSV reader that understands quotes and both comma and semicolon files.
export function parseCsv(input: string): Cell[][] {
  const textIn = input.replace(/^﻿/, "");
  const firstLine = textIn.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < textIn.length; i++) {
    const ch = textIn[i];
    if (quoted) {
      if (ch === '"' && textIn[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && textIn[i + 1] === "\n") i++;
      row.push(cell); cell = ""; rows.push(row); row = [];
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

// Cuts long text into pieces of roughly `size` characters on line boundaries, so each piece can be read separately.
export function chunkText(input: string, size = 6000): string[] {
  const chunks: string[] = [];
  let current = "";
  for (const line of input.split("\n")) {
    if (current && current.length + line.length + 1 > size) { chunks.push(current); current = ""; }
    current += (current ? "\n" : "") + line;
  }
  if (current.trim()) chunks.push(current);
  return chunks;
}
