import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import QRCode from "qrcode";
import { formatRand } from "./money";
import { formatDate } from "./dates";
import { readableOn } from "./color";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Pub = { document: any; lines: any[]; business: any; client: any };

// Standard PDF fonts only support Latin-1, so replace anything else
const clean = (s: unknown) => String(s ?? "").replace(/\r/g, "").replace(/[^\n\x20-\x7E\xA0-\xFF]/g, "?");
const hex = (h: string) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(h ?? "");
  const n = m ? parseInt(m[1], 16) : 0x0f8a5f;
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};

function wrap(text: string, font: PDFFont, size: number, max: number): string[] {
  const out: string[] = [];
  for (const para of clean(text).split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const test = line ? `${line} ${word}` : word;
      if (line && font.widthOfTextAtSize(test, size) > max) { out.push(line); line = word; } else line = test;
    }
    out.push(line);
  }
  return out;
}

export async function buildDocumentPdf({ document: d, lines, business: b, client: c }: Pub, link: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const brand = hex(b.brand_color), ink = rgb(0.05, 0.14, 0.11), mute = rgb(0.4, 0.45, 0.43), rule = rgb(0.86, 0.89, 0.87);
  const W = 595, H = 842, M = 48, R = W - M;
  const isQuote = d.type === "quote";

  let page = pdf.addPage([W, H]);
  const topBar = () => page.drawRectangle({ x: 0, y: H - 8, width: W, height: 8, color: brand });
  topBar();
  let y = H - 44;
  const need = (h: number) => { if (y - h < 56) { page = pdf.addPage([W, H]); topBar(); y = H - 48; } };
  const put = (t: string, x: number, size = 10, f = font, color = ink, yy = y) => page.drawText(clean(t), { x, y: yy, size, font: f, color });
  const putRight = (t: string, xr: number, size = 10, f = font, color = ink, yy = y) =>
    page.drawText(clean(t), { x: xr - f.widthOfTextAtSize(clean(t), size), y: yy, size, font: f, color });
  const para = (t: string, size = 10, f = font, color = ink, max = R - M, gap = 14) => {
    for (const l of wrap(t, f, size, max)) { need(gap); put(l, M, size, f, color); y -= gap; }
  };

  // ---- header: logo, business name, title block ----
  const top = y;
  let leftY = y;
  if (b.logo_url) {
    try {
      const r = await fetch(b.logo_url);
      const bytes = new Uint8Array(await r.arrayBuffer());
      const ct = r.headers.get("content-type") ?? "";
      const img = ct.includes("png") ? await pdf.embedPng(bytes) : ct.includes("jp") ? await pdf.embedJpg(bytes) : null;
      if (img) {
        const s = Math.min(42 / img.height, 130 / img.width);
        page.drawImage(img, { x: M, y: top - 42, width: img.width * s, height: img.height * s });
        leftY = top - 56;
      }
    } catch { /* logo is optional */ }
  }
  put(b.name, M, 17, bold, ink, leftY);
  leftY -= 15;
  const trust = [
    b.address,
    [b.email, b.phone, b.website].filter(Boolean).join("  |  "),
    `${b.company_reg ? `Reg. no: ${b.company_reg}` : "Sole proprietor"}${b.vat_registered ? `  |  VAT no: ${b.vat_number}` : "  |  Not VAT registered"}`,
  ].filter(Boolean) as string[];
  for (const t of trust) for (const l of wrap(t, font, 8.5, 290)) { put(l, M, 8.5, font, mute, leftY); leftY -= 11.5; }

  putRight(isQuote ? "QUOTE" : b.vat_registered ? "TAX INVOICE" : "INVOICE", R, 20, bold, brand, top - 12);
  putRight(d.number, R, 10, font, ink, top - 30);
  putRight(`Date: ${formatDate(d.issue_date)}`, R, 9, font, mute, top - 44);
  putRight(isQuote ? `Valid until ${formatDate(d.expiry_date)}` : `Due: ${formatDate(d.due_date)}`, R, 9, font, mute, top - 57);
  y = Math.min(leftY, top - 70) - 6;
  page.drawLine({ start: { x: M, y }, end: { x: R, y }, thickness: 2, color: brand });
  y -= 24;

  // ---- client and job ----
  const colTop = y;
  put(isQuote ? "Prepared for" : "Billed to", M, 8.5, font, mute, colTop);
  put(c.name, M, 11, bold, ink, colTop - 14);
  let ly = colTop - 28;
  if (c.address) for (const l of wrap(c.address, font, 9, 220)) { put(l, M, 9, font, mute, ly); ly -= 12; }
  put("Job", 320, 8.5, font, mute, colTop);
  let ry = colTop - 14;
  for (const [t, f] of [[d.title, bold], [d.location, font], [d.job_date_tbd ? "Job date to be agreed" : d.job_date ? formatDate(d.job_date) : "", font]] as [string, PDFFont][]) {
    if (t) for (const l of wrap(t, f, 10, 227)) { put(l, 320, 10, f, ink, ry); ry -= 13; }
  }
  y = Math.min(ly, ry) - 12;

  if (d.note) { para(d.note, 10, font, ink); y -= 6; }
  if (d.description) { need(30); put("Scope of work", M, 8.5, font, mute); y -= 14; para(d.description); y -= 6; }
  if (d.labour_only) { para("No materials are required for this job.", 10, bold, ink); y -= 6; }

  // ---- items ----
  need(60);
  put("Description", M, 9, bold, mute); put("Qty", 340, 9, bold, mute);
  putRight("Price", 450, 9, bold, mute); putRight("Total", R, 9, bold, mute);
  y -= 6; page.drawLine({ start: { x: M, y }, end: { x: R, y }, thickness: 0.8, color: rule }); y -= 16;
  for (const l of lines ?? []) {
    const rows = wrap(l.description, font, 10, 270);
    need(rows.length * 13 + 10);
    rows.forEach((t, i) => { put(t, M, 10, font, ink, y - i * 13); });
    put(String(Number(l.quantity)), 340, 10, font, ink);
    putRight(formatRand(l.unit_price_cents), 450);
    putRight(formatRand(l.line_total_cents), R);
    y -= rows.length * 13 + 4;
    page.drawLine({ start: { x: M, y: y + 2 }, end: { x: R, y: y + 2 }, thickness: 0.4, color: rule });
    y -= 10;
  }

  // ---- totals ----
  need(80);
  put("Subtotal", 360); putRight(formatRand(d.subtotal_cents), R); y -= 16;
  put("VAT", 360); putRight(b.vat_registered ? formatRand(d.vat_cents) : "Not applicable", R); y -= 8;
  y -= 4;
  page.drawRectangle({ x: 340, y: y - 30, width: R - 340, height: 36, color: brand });
  const onBrand = readableOn(b.brand_color) === "#ffffff" ? rgb(1, 1, 1) : ink;
  put("Total", 352, 13, bold, onBrand, y - 17); putRight(formatRand(d.total_cents), R - 12, 15, bold, onBrand, y - 18); y -= 54;

  // ---- payment plan ----
  const plan = !isQuote ? `Please pay ${formatRand(d.total_cents)} by ${formatDate(d.due_date)}. Use ${d.number} as your payment reference.` : d.payment_plan === "full" ? "Payment in full is needed to confirm the booking."
    : d.payment_plan === "deposit"
      ? `A ${d.deposit_percent}% deposit (${formatRand(Math.round((d.total_cents * d.deposit_percent) / 100))}) confirms the booking. Balance due ${d.payment_terms}.`
      : `No deposit. Full payment due ${d.payment_terms}.`;
  const planRows = wrap(plan, font, 10, R - M - 28);
  const boxH = planRows.length * 13 + 30;
  need(boxH + 10);
  page.drawRectangle({ x: M, y: y - boxH, width: R - M, height: boxH, color: rgb(0.95, 0.97, 0.96) });
  page.drawRectangle({ x: M, y: y - boxH, width: 4, height: boxH, color: brand });
  put("Payment", M + 16, 10, bold, ink, y - 16);
  planRows.forEach((t, i) => put(t, M + 16, 10, font, ink, y - 31 - i * 13));
  y -= boxH + 16;

  // ---- QR ----
  need(112);
  page.drawRectangle({ x: M, y: y - 100, width: R - M, height: 100, borderColor: brand, borderWidth: 1.5 });
  try {
    const qr = await pdf.embedPng(Buffer.from((await QRCode.toDataURL(link, { margin: 1, width: 240 })).split(",")[1], "base64"));
    page.drawImage(qr, { x: M + 12, y: y - 92, width: 84, height: 84 });
  } catch { /* QR is optional */ }
  put(isQuote ? "Scan to view and accept on your phone" : "Scan to open this invoice on your phone", M + 112, 11, bold, ink, y - 26);
  put(`Reference: ${d.number}`, M + 112, 9, font, mute, y - 42);
  wrap(link, font, 8, R - M - 128).forEach((t, i) => put(t, M + 112, 8, font, mute, y - 56 - i * 10));
  y -= 116;

  // ---- banking (same rule as the web page) ----
  const hasBank = b.bank_account_holder && b.bank_account_number && b.bank_branch_code;
  if (hasBank && (!isQuote || d.status === "accepted")) {
    need(70);
    put("Pay by EFT", M, 10, bold, ink); y -= 15;
    put(`${b.bank_account_holder}  |  ${b.bank_name ?? ""}  |  ${b.bank_account_type ?? ""}`, M, 9.5); y -= 13;
    put(`Account: ${b.bank_account_number}  |  Branch: ${b.bank_branch_code}  |  Reference: ${d.number}`, M, 9.5); y -= 22;
  }
  if (b.guarantee_months) { para(`${b.guarantee_months}-month workmanship guarantee on all work by ${b.name}.`, 9, font, mute); y -= 4; }
  para(isQuote ? "Accept before the validity date to hold this price." : "Thank you for your business.", 9, font, mute);

  return pdf.save();
}
