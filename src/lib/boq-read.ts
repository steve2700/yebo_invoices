/* eslint-disable @typescript-eslint/no-explicit-any */
// Server only. Reads Excel workbooks into plain grids and pulls text out of PDFs, keeping table rows on one line.
import ExcelJS from "exceljs";
import { getDocumentProxy } from "unpdf";
import type { Cell } from "./boq-grid";

function cellValue(v: any): Cell {
  if (v == null) return null;
  if (typeof v === "number" || typeof v === "string") return v;
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    if ("result" in v) return cellValue(v.result); // a formula: use the number it worked out
    if (Array.isArray(v.richText)) return v.richText.map((t: any) => t.text).join("");
    if ("text" in v) return String(v.text);
    if ("error" in v) return null;
  }
  return null;
}

const MAX_ROWS = 20_000;

export async function readWorkbookGrids(data: Uint8Array): Promise<{ name: string; grid: Cell[][] }[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(data) as any);
  const out: { name: string; grid: Cell[][] }[] = [];
  workbook.eachSheet((sheet) => {
    const grid: Cell[][] = [];
    const columns = Math.min(sheet.columnCount, 40);
    sheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      if (rowNumber > MAX_ROWS) return;
      const cells: Cell[] = [];
      for (let c = 1; c <= columns; c++) cells.push(cellValue(row.getCell(c).value));
      grid[rowNumber - 1] = cells;
    });
    out.push({ name: sheet.name, grid });
  });
  return out;
}

// The grid as plain text lines, used when a sheet has no recognisable header and needs the AI reader instead.
export const gridToText = (grid: Cell[][]) =>
  grid.map((row) => (row ?? []).map((c) => (c == null ? "" : String(c).trim())).filter(Boolean).join(" | ")).filter(Boolean).join("\n");

type PdfItem = { str: string; x: number; y: number; w: number };

export async function extractPdfText(data: Uint8Array, maxPages = 400): Promise<{ text: string; pages: number; readPages: number }> {
  const pdf = await getDocumentProxy(data);
  const readPages = Math.min(pdf.numPages, maxPages);
  const pages: string[] = [];
  for (let p = 1; p <= readPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const items: PdfItem[] = [];
    for (const it of content.items as any[]) {
      if (typeof it?.str !== "string" || !it.str.trim()) continue;
      items.push({ str: it.str, x: it.transform[4], y: it.transform[5], w: it.width ?? 0 });
    }
    // Top of the page first. Items whose heights are within a few points are on the same row.
    items.sort((a, b) => b.y - a.y || a.x - b.x);
    const rows: PdfItem[][] = [];
    for (const item of items) {
      const last = rows[rows.length - 1];
      if (last && Math.abs(last[0].y - item.y) <= 3) last.push(item);
      else rows.push([item]);
    }
    const lines = rows.map((row) => {
      row.sort((a, b) => a.x - b.x);
      let line = "";
      let end = 0;
      row.forEach((item, i) => {
        if (i > 0) line += item.x - end > 10 ? " | " : " ";
        line += item.str.trim();
        end = item.x + item.w;
      });
      return line;
    });
    if (lines.length) pages.push(`--- Page ${p} ---\n${lines.join("\n")}`);
  }
  return { text: pages.join("\n"), pages: pdf.numPages, readPages };
}
