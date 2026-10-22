/* eslint-disable @typescript-eslint/no-explicit-any */
// Server only. The priced BOQ as an Excel file, with real formulas so the client can see and check every number.
import ExcelJS from "exceljs";
import { lineTotalCents, type TenderLine } from "./tenders";

type XlsxInput = {
  businessName: string;
  tender: { reference: string | null; title: string; client_name: string | null; vat_percent: number };
  lines: TenderLine[];
};

export async function buildPricedBoqXlsx({ businessName, tender, lines }: XlsxInput): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Priced BOQ", {
    views: [{ state: "frozen", ySplit: 6 }],
    // Prints neatly on A4, landscape, one page wide, with the column headings on every page.
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: "6:6" },
  });
  ws.columns = [
    { key: "no", width: 8 },
    { key: "desc", width: 70 },
    { key: "unit", width: 9 },
    { key: "qty", width: 12 },
    { key: "rate", width: 14 },
    { key: "amount", width: 16 },
  ];
  ws.getCell("A1").value = businessName;
  ws.getCell("A1").font = { bold: true, size: 14 };
  ws.getCell("A2").value = "Tender";
  ws.getCell("B2").value = tender.title;
  ws.getCell("A3").value = "Reference";
  ws.getCell("B3").value = tender.reference ?? "";
  ws.getCell("A4").value = "To";
  ws.getCell("B4").value = tender.client_name ?? "";
  for (const r of [2, 3, 4]) ws.getCell(`A${r}`).font = { bold: true };

  const head = ws.getRow(6);
  head.values = ["Item", "Description", "Unit", "Qty", "Rate (R)", "Amount (R)"];
  head.font = { bold: true, color: { argb: "FFFFFFFF" } };
  head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F8A5F" } };

  let r = 7;
  const first = r;
  for (const l of lines) {
    const row = ws.getRow(r);
    if (l.kind === "heading") {
      row.getCell(2).value = l.description;
      row.font = { bold: true };
      row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEDF4F0" } };
    } else {
      row.getCell(1).value = l.itemNo || null;
      row.getCell(2).value = l.description;
      row.getCell(2).alignment = { wrapText: true, vertical: "top" };
      row.getCell(3).value = l.unit || null;
      row.getCell(4).value = l.quantity;
      row.getCell(5).value = l.rateCents == null ? null : l.rateCents / 100;
      // Amount is a formula, so changing a rate in Excel updates the total.
      row.getCell(6).value = { formula: `IF(OR(D${r}="",E${r}=""),0,ROUND(D${r}*E${r},2))`, result: lineTotalCents(l) / 100 };
      row.getCell(4).numFmt = "#,##0.00###";
      row.getCell(5).numFmt = "#,##0.00";
      row.getCell(6).numFmt = "#,##0.00";
    }
    r++;
  }
  const last = r - 1;
  r++;
  const subtotal = lines.reduce((s, l) => s + lineTotalCents(l), 0) / 100;
  const vat = Math.round(subtotal * tender.vat_percent) / 100;
  const put = (label: string, formula: string, result: number, strong = false) => {
    ws.getCell(`B${r}`).value = label;
    ws.getCell(`F${r}`).value = { formula, result };
    ws.getCell(`F${r}`).numFmt = "#,##0.00";
    if (strong) { ws.getRow(r).font = { bold: true }; }
    r++;
  };
  const subRow = r;
  put("GRAND TOTAL Excl. VAT", `SUM(F${first}:F${last})`, subtotal);
  const vatRow = r;
  put(tender.vat_percent > 0 ? `VAT ${tender.vat_percent}%` : "VAT (not registered)", `ROUND(F${subRow}*${tender.vat_percent}/100,2)`, vat);
  put("GRAND TOTAL Incl. VAT", `F${subRow}+F${vatRow}`, Math.round((subtotal + vat) * 100) / 100, true);

  return new Uint8Array(await wb.xlsx.writeBuffer());
}
