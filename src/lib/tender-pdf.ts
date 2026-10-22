/* eslint-disable @typescript-eslint/no-explicit-any */
// Server only. Builds the priced bid PDF and merges it with the compliance documents into one packet.
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { clean, hex, wrap } from "./pdf";
import { formatQty, lineTotalCents, randWithCents, type TenderLine } from "./tenders";

type BidInput = {
  business: { name: string; brand_color?: string | null; email?: string | null; phone?: string | null; address?: string | null; company_reg?: string | null; vat_registered?: boolean; vat_number?: string | null };
  tender: { reference: string | null; title: string; client_name: string | null; closing_at: string | null; vat_percent: number };
  lines: TenderLine[];
  totals: { subtotalCents: number; vatCents: number; totalCents: number };
  csdNumber: string | null;
  today: string;
};

const W = 595, H = 842, M = 40;
// Columns: item no, description, unit, qty, rate, amount (right edges for the numbers)
const X = { no: M, desc: M + 34, unit: 326, qty: 408, rate: 482, amount: W - M - 3 }; // qty, rate, amount are right edges

export async function buildBidPdf(input: BidInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const brand = hex(input.business.brand_color ?? "#0F8A5F");
  const ink = rgb(0.06, 0.14, 0.11);
  const grey = rgb(0.4, 0.45, 0.43);

  let page: PDFPage = pdf.addPage([W, H]);
  let y = H - M;

  const right = (text: string, edge: number, yy: number, f: PDFFont, size: number, color = ink) => {
    const t = clean(text);
    page.drawText(t, { x: edge - f.widthOfTextAtSize(t, size), y: yy, size, font: f, color });
  };
  const tableHead = () => {
    page.drawRectangle({ x: M, y: y - 4, width: W - 2 * M, height: 18, color: brand });
    const white = rgb(1, 1, 1);
    page.drawText("No.", { x: X.no + 3, y, size: 8.5, font: bold, color: white });
    page.drawText("Description", { x: X.desc, y, size: 8.5, font: bold, color: white });
    page.drawText("Unit", { x: X.unit, y, size: 8.5, font: bold, color: white });
    right("Qty", X.qty, y, bold, 8.5, white);
    right("Rate", X.rate, y, bold, 8.5, white);
    right("Amount", X.amount, y, bold, 8.5, white);
    y -= 20;
  };
  const newPage = () => {
    page = pdf.addPage([W, H]);
    y = H - M;
    tableHead();
  };
  const need = (h: number) => { if (y - h < M + 40) newPage(); };

  // ----- header -----
  page.drawText(clean(input.business.name), { x: M, y, size: 18, font: bold, color: brand });
  y -= 16;
  const contact = [input.business.phone, input.business.email, input.business.address].filter(Boolean).join("  |  ");
  for (const l of wrap(contact, font, 8.5, W - 2 * M)) { page.drawText(l, { x: M, y, size: 8.5, font, color: grey }); y -= 11; }
  const regs = [
    input.business.company_reg ? `Reg: ${input.business.company_reg}` : "",
    input.business.vat_registered && input.business.vat_number ? `VAT: ${input.business.vat_number}` : "",
    input.csdNumber ? `CSD: ${input.csdNumber}` : "",
  ].filter(Boolean).join("   ");
  if (regs) { page.drawText(clean(regs), { x: M, y, size: 8.5, font: bold, color: ink }); y -= 14; }
  y -= 8;

  page.drawText("PRICED BILL OF QUANTITIES", { x: M, y, size: 13, font: bold, color: ink });
  y -= 18;
  const meta: [string, string][] = [
    ["Tender", input.tender.title],
    ["Reference", input.tender.reference ?? "-"],
    ["Submitted to", input.tender.client_name ?? "-"],
    ["Date", input.today],
  ];
  for (const [k, v] of meta) {
    page.drawText(clean(k), { x: M, y, size: 9, font: bold, color: grey });
    const wrapped = wrap(v, font, 9.5, W - 2 * M - 90);
    wrapped.forEach((l, i) => page.drawText(l, { x: M + 90, y: y - i * 12, size: 9.5, font, color: ink }));
    y -= Math.max(wrapped.length, 1) * 12 + 2;
  }
  y -= 10;
  tableHead();

  // ----- lines -----
  for (const l of input.lines) {
    if (l.kind === "heading") {
      const head = wrap(l.description, bold, 9.5, W - 2 * M - 8);
      need(head.length * 12 + 14);
      y -= 4;
      page.drawRectangle({ x: M, y: y - 3 - (head.length - 1) * 12, width: W - 2 * M, height: head.length * 12 + 3, color: rgb(0.93, 0.96, 0.94) });
      head.forEach((t, i) => page.drawText(t, { x: M + 4, y: y - i * 12, size: 9.5, font: bold, color: ink }));
      y -= head.length * 12 + 4;
      continue;
    }
    const desc = wrap(l.description, font, 8.5, X.unit - X.desc - 8);
    const h = Math.max(desc.length, 1) * 10.5 + 5;
    need(h);
    page.drawText(clean(l.itemNo).slice(0, 6), { x: X.no + 3, y, size: 8.5, font, color: grey });
    desc.forEach((t, i) => page.drawText(t, { x: X.desc, y: y - i * 10.5, size: 8.5, font, color: ink }));
    page.drawText(clean(l.unit).slice(0, 9), { x: X.unit, y, size: 8.5, font, color: ink });
    right(formatQty(l.quantity), X.qty, y, font, 8.5);
    right(l.rateCents == null ? "" : randWithCents(l.rateCents), X.rate, y, font, 8.5);
    right(l.rateCents == null || l.quantity == null ? "" : randWithCents(lineTotalCents(l)), X.amount, y, font, 8.5);
    y -= h;
    page.drawLine({ start: { x: M, y: y + 9 }, end: { x: W - M, y: y + 9 }, thickness: 0.3, color: rgb(0.85, 0.88, 0.86) });
  }

  // ----- totals -----
  need(80);
  y -= 10;
  const row = (label: string, value: string, strong = false) => {
    const f = strong ? bold : font;
    const size = strong ? 11 : 9.5;
    page.drawText(clean(label), { x: 330, y, size, font: f, color: ink });
    right(value, X.amount, y, f, size);
    y -= strong ? 18 : 14;
  };
  row("Total excl. VAT", randWithCents(input.totals.subtotalCents));
  row(input.tender.vat_percent > 0 ? `VAT ${input.tender.vat_percent}%` : "VAT (not registered)", randWithCents(input.totals.vatCents));
  page.drawLine({ start: { x: 330, y: y + 10 }, end: { x: W - M, y: y + 10 }, thickness: 0.8, color: brand });
  row("TOTAL incl. VAT", randWithCents(input.totals.totalCents), true);

  y -= 10;
  page.drawText("Compliance documents are attached after this schedule.", { x: M, y, size: 8.5, font, color: grey });

  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    const t = `Page ${i + 1} of ${pages.length}`;
    p.drawText(t, { x: W - M - font.widthOfTextAtSize(t, 8), y: 20, size: 8, font, color: grey });
    p.drawText(clean(input.tender.reference ? `${input.tender.reference} | ${input.business.name}` : input.business.name), { x: M, y: 20, size: 8, font, color: grey });
  });
  return pdf.save();
}

export type PacketFile = { name: string; bytes: Uint8Array };

// One PDF: the priced schedule first, then every compliance document (PDFs are merged page by page; photos get a page each).
export async function mergePacket(bid: Uint8Array, files: PacketFile[]): Promise<{ bytes: Uint8Array; skipped: string[] }> {
  const out = await PDFDocument.create();
  const skipped: string[] = [];
  const bidDoc = await PDFDocument.load(bid);
  for (const p of await out.copyPages(bidDoc, bidDoc.getPageIndices())) out.addPage(p);

  for (const file of files) {
    const lower = file.name.toLowerCase();
    try {
      if (lower.endsWith(".pdf")) {
        const doc = await PDFDocument.load(file.bytes, { ignoreEncryption: true });
        for (const p of await out.copyPages(doc, doc.getPageIndices())) out.addPage(p);
      } else if (/\.(jpe?g|png)$/.test(lower)) {
        const image = lower.endsWith(".png") ? await out.embedPng(file.bytes) : await out.embedJpg(file.bytes);
        const page = out.addPage([595, 842]);
        const scale = Math.min((595 - 60) / image.width, (842 - 60) / image.height, 1);
        const w = image.width * scale, h = image.height * scale;
        page.drawImage(image, { x: (595 - w) / 2, y: (842 - h) / 2, width: w, height: h });
      } else skipped.push(file.name);
    } catch {
      skipped.push(file.name);
    }
  }
  return { bytes: await out.save(), skipped };
}
