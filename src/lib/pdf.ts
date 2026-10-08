import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import QRCode from "qrcode";
import { formatRand } from "./money";
import { formatDate } from "./dates";
import { readableOn } from "./color";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Pub = { document: any; lines: any[]; business: any; client: any };

// Standard PDF fonts only support Latin-1. Instead of turning every other character into "?",
// swap common typographic characters (curly quotes, dashes, ellipsis) for plain equivalents,
// strip accents where possible and drop emoji.
const CHAR_MAP: Record<string, string> = {
  "\u2018": "'",
  "\u2019": "'",
  "\u201A": ",",
  "\u201B": "'",
  "\u201C": '"',
  "\u201D": '"',
  "\u201E": '"',
  "\u2010": "-",
  "\u2011": "-",
  "\u2012": "-",
  "\u2013": "-",
  "\u2014": "-",
  "\u2015": "-",
  "\u2026": "...",
  "\u2022": "-",
  "\u00A0": " ",
  "\u2009": " ",
  "\u202F": " ",
  "\u20AC": "EUR",
};

function toLatin1(ch: string): string {
  if (ch === "\n") return ch;
  const code = ch.codePointAt(0) ?? 0;
  if (code < 0x20 || code === 0x7f) return " ";
  if ((code >= 0x20 && code <= 0x7e) || (code >= 0xa1 && code <= 0xff)) return ch;
  if (CHAR_MAP[ch] !== undefined) return CHAR_MAP[ch];
  // Emoji, symbols, variation selectors and joiners: drop them.
  if (code >= 0x1f000 || (code >= 0x2600 && code <= 0x27bf) || code === 0xfe0f || code === 0x200d || code === 0x200b) return "";
  // Letters with accents outside Latin-1: keep the base letter.
  const base = ch.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (base !== ch && /^[\x20-\x7E]+$/.test(base)) return base;
  return "?";
}

const clean = (s: unknown) =>
  Array.from(String(s ?? "").replace(/\r/g, "").normalize("NFC")).map(toLatin1).join("");

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

async function buildQuotePdf({ document: d, lines, business: b, client: c }: Pub, link: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const brand = hex(b.brand_color);
  const ink = rgb(0.05, 0.14, 0.11);
  const mute = rgb(0.4, 0.45, 0.43);
  const rule = rgb(0.86, 0.89, 0.87);
  const panel = rgb(0.95, 0.97, 0.96);
  const onBrand = readableOn(b.brand_color) === "#ffffff" ? rgb(1, 1, 1) : ink;
  const W = 595, H = 842, M = 48, R = W - M;
  let page = pdf.addPage([W, H]);
  let y = H - 42;

  const topBand = () => page.drawRectangle({ x: 0, y: H - 6, width: W, height: 6, color: brand });
  topBand();
  const nextPage = () => { page = pdf.addPage([W, H]); topBand(); y = H - 46; };
  const need = (height: number) => { if (y - height < 48) nextPage(); };
  const put = (text: string, x: number, size = 10, face = font, color = ink, atY = y) =>
    page.drawText(clean(text), { x, y: atY, size, font: face, color });
  const putRight = (text: string, right: number, size = 10, face = font, color = ink, atY = y) => {
    const value = clean(text);
    page.drawText(value, { x: right - face.widthOfTextAtSize(value, size), y: atY, size, font: face, color });
  };
  const paragraph = (text: string, size = 10, face = font, color = ink, maxWidth = R - M, gap = 14) => {
    for (const row of wrap(text, face, size, maxWidth)) {
      need(gap + 4);
      put(row, M, size, face, color);
      y -= gap;
    }
  };
  const heading = (text: string) => {
    need(34);
    put(text.toUpperCase(), M, 8.5, bold, brand);
    y -= 13;
    page.drawLine({ start: { x: M, y }, end: { x: R, y }, thickness: 0.7, color: rule });
    y -= 14;
  };

  const top = y;
  const nameX = b.logo_url ? M + 58 : M;
  let businessY = top - 14;
  if (b.logo_url) {
    try {
      const response = await fetch(b.logo_url);
      const bytes = new Uint8Array(await response.arrayBuffer());
      const contentType = response.headers.get("content-type") ?? "";
      const image = contentType.includes("png") ? await pdf.embedPng(bytes) : contentType.includes("jp") ? await pdf.embedJpg(bytes) : null;
      if (image) {
        const scale = Math.min(46 / image.height, 46 / image.width);
        page.drawImage(image, { x: M, y: top - 48, width: image.width * scale, height: image.height * scale });
      }
    } catch { /* logo is optional */ }
  }
  put(String(b.name ?? ""), nameX, 16, bold, ink, businessY);
  businessY -= 17;
  const businessDetails = [
    b.address,
    [b.email, b.phone, b.website].filter(Boolean).join("  |  "),
    `${b.company_reg ? `Reg. no: ${b.company_reg}` : "Sole proprietor"}${b.vat_registered ? `  |  VAT no: ${b.vat_number}` : "  |  Not VAT registered"}`,
  ].filter(Boolean) as string[];
  for (const detail of businessDetails) {
    for (const row of wrap(detail, font, 8, 270)) {
      put(row, nameX, 8, font, mute, businessY);
      businessY -= 11;
    }
  }

  putRight("PROJECT QUOTE", R, 18, bold, brand, top - 14);
  putRight(String(d.number), R, 10, bold, ink, top - 34);
  putRight(`Prepared ${formatDate(d.issue_date)}`, R, 8.5, font, mute, top - 49);
  putRight(`Valid through ${formatDate(d.expiry_date)}`, R, 8.5, font, mute, top - 62);
  y = Math.min(businessY, top - 74) - 14;
  page.drawLine({ start: { x: M, y }, end: { x: R, y }, thickness: 1.5, color: brand });
  y -= 20;

  const projectTitle = String(d.title || "Project quotation");
  const titleRows = wrap(projectTitle, bold, 17, 274);
  const heroHeight = Math.max(112, titleRows.length * 19 + 72);
  need(heroHeight + 12);
  const heroTop = y;
  const summaryWidth = R - M;
  const termsX = R - 166;
  page.drawRectangle({ x: M, y: heroTop - heroHeight, width: summaryWidth, height: heroHeight, color: panel });
  page.drawRectangle({ x: M, y: heroTop - heroHeight, width: 4, height: heroHeight, color: brand });
  page.drawRectangle({ x: termsX, y: heroTop - heroHeight, width: R - termsX, height: heroHeight, color: brand });
  put("PROJECT SUMMARY", M + 17, 8, bold, mute, heroTop - 19);
  titleRows.forEach((row, index) => put(row, M + 17, 17, bold, ink, heroTop - 43 - index * 19));
  put("Prepared for", M + 17, 8, font, mute, heroTop - heroHeight + 30);
  put(String(c.name ?? ""), M + 17, 10, bold, ink, heroTop - heroHeight + 15);

  put("ESTIMATED TOTAL", termsX + 13, 7.5, bold, onBrand, heroTop - 20);
  const total = formatRand(d.total_cents);
  const amountSize = Math.min(20, Math.max(13, 142 / bold.widthOfTextAtSize(clean(total), 1)));
  putRight(total, R - 12, amountSize, bold, onBrand, heroTop - 52);
  put("Valid through", termsX + 13, 7.5, font, onBrand, heroTop - 74);
  put(String(formatDate(d.expiry_date)), termsX + 13, 9, bold, onBrand, heroTop - 88);
  y = heroTop - heroHeight - 20;

  const jobDetails = [
    d.location ? ["PROJECT LOCATION", String(d.location)] as const : null,
    d.job_date_tbd || d.job_date ? ["SCHEDULE", d.job_date_tbd ? "To be agreed" : formatDate(d.job_date)] as const : null,
  ].filter(Boolean) as [string, string][];
  if (jobDetails.length) {
    const detailsHeight = 48;
    need(detailsHeight + 8);
    const columnWidth = summaryWidth / jobDetails.length;
    page.drawRectangle({ x: M, y: y - detailsHeight, width: summaryWidth, height: detailsHeight, color: rgb(0.98, 0.985, 0.98) });
    jobDetails.forEach(([label, value], index) => {
      const x = M + index * columnWidth;
      if (index > 0) page.drawLine({ start: { x, y: y - detailsHeight + 7 }, end: { x, y: y - 3 }, thickness: 0.7, color: rule });
      put(label, x + 12, 7.5, bold, mute, y - 15);
      wrap(value, font, 9, columnWidth - 26).forEach((row, rowIndex) => put(row, x + 12, 9, font, ink, y - 31 - rowIndex * 12));
    });
    y -= detailsHeight + 17;
  }

  if (d.description) {
    heading("What is included");
    paragraph(String(d.description), 9.5, font, ink, summaryWidth, 13);
    y -= 7;
  }
  if (d.labour_only) {
    need(22);
    put("Labour only - materials are not included.", M, 9, bold, mute);
    y -= 20;
  }
  if (d.note) {
    const noteRows = wrap(String(d.note), font, 9, summaryWidth - 34);
    const noteHeight = Math.max(42, noteRows.length * 13 + 22);
    need(noteHeight + 10);
    page.drawRectangle({ x: M, y: y - noteHeight, width: summaryWidth, height: noteHeight, color: panel });
    page.drawRectangle({ x: M, y: y - noteHeight, width: 3, height: noteHeight, color: brand });
    put("A NOTE FOR YOU", M + 14, 7.5, bold, brand, y - 15);
    noteRows.forEach((row, index) => put(row, M + 14, 9, font, ink, y - 30 - index * 13));
    y -= noteHeight + 15;
  }

  heading("Investment breakdown");
  const descriptionX = M + 2;
  const qtyRight = 350;
  const unitRight = 448;
  put("DESCRIPTION", descriptionX, 7.5, bold, mute);
  putRight("QTY", qtyRight, 7.5, bold, mute);
  putRight("UNIT PRICE", unitRight, 7.5, bold, mute);
  putRight("AMOUNT", R, 7.5, bold, mute);
  y -= 9;
  page.drawLine({ start: { x: M, y }, end: { x: R, y }, thickness: 0.8, color: rule });
  y -= 15;

  for (const item of lines ?? []) {
    const itemRows = wrap(String(item.description ?? ""), font, 9.5, 235);
    const rowHeight = Math.max(29, itemRows.length * 13 + 12);
    need(rowHeight + 5);
    itemRows.forEach((row, index) => put(row, descriptionX, 9.5, index === 0 ? bold : font, ink, y - index * 13));
    putRight(String(Number(item.quantity)), qtyRight, 9, font, ink, y);
    putRight(formatRand(item.unit_price_cents), unitRight, 9, font, ink, y);
    putRight(formatRand(item.line_total_cents), R, 9, bold, ink, y);
    y -= rowHeight;
    page.drawLine({ start: { x: M, y }, end: { x: R, y }, thickness: 0.5, color: rule });
    y -= 8;
  }

  const totalsX = R - 220;
  const totalsWidth = R - totalsX;
  const totalsHeight = 91;
  need(totalsHeight + 14);
  const totalsTop = y;
  page.drawRectangle({ x: totalsX, y: totalsTop - totalsHeight, width: totalsWidth, height: totalsHeight, color: rgb(0.985, 0.99, 0.985), borderColor: rule, borderWidth: 0.7 });
  put("Subtotal", totalsX + 12, 8.5, font, mute, totalsTop - 18);
  putRight(formatRand(d.subtotal_cents), R - 12, 8.5, font, ink, totalsTop - 18);
  put("VAT", totalsX + 12, 8.5, font, mute, totalsTop - 36);
  putRight(b.vat_registered ? formatRand(d.vat_cents) : "Not applicable", R - 12, 8.5, font, ink, totalsTop - 36);
  page.drawLine({ start: { x: totalsX + 12, y: totalsTop - 48 }, end: { x: R - 12, y: totalsTop - 48 }, thickness: 0.6, color: rule });
  page.drawRectangle({ x: totalsX + 1, y: totalsTop - 82, width: totalsWidth - 2, height: 33, color: brand });
  put("TOTAL", totalsX + 12, 10, bold, onBrand, totalsTop - 70);
  putRight(formatRand(d.total_cents), R - 12, 12, bold, onBrand, totalsTop - 71);
  y = totalsTop - totalsHeight - 16;

  const paymentPlan = d.payment_plan === "full"
    ? "Payment in full is needed to confirm the booking."
    : d.payment_plan === "deposit"
      ? `A ${d.deposit_percent}% deposit (${formatRand(Math.round((d.total_cents * d.deposit_percent) / 100))}) confirms the booking. The balance is due ${d.payment_terms}.`
      : `No deposit is needed. Full payment is due ${d.payment_terms}.`;
  const paymentRows = wrap(paymentPlan, font, 9, 300);
  const nextStepHeight = Math.max(80, paymentRows.length * 13 + 34);
  need(nextStepHeight);
  const nextStepTop = y;
  const actionX = R - 172;
  const qrX = R - 66;
  page.drawRectangle({ x: M, y: nextStepTop - nextStepHeight, width: summaryWidth, height: nextStepHeight, color: panel });
  page.drawRectangle({ x: M, y: nextStepTop - nextStepHeight, width: 3, height: nextStepHeight, color: brand });
  page.drawLine({ start: { x: actionX, y: nextStepTop - nextStepHeight + 8 }, end: { x: actionX, y: nextStepTop - 8 }, thickness: 0.7, color: rule });
  put("PAYMENT & BOOKING", M + 14, 7.5, bold, brand, nextStepTop - 17);
  paymentRows.forEach((row, index) => put(row, M + 14, 9, font, ink, nextStepTop - 32 - index * 13));
  put("REVIEW ONLINE", actionX + 12, 7, bold, brand, nextStepTop - 22);
  put("Scan to respond", actionX + 12, 7, font, mute, nextStepTop - 35);
  try {
    const qrData = await QRCode.toDataURL(link, { margin: 1, width: 160 });
    const qr = await pdf.embedPng(Buffer.from(qrData.split(",")[1], "base64"));
    page.drawImage(qr, { x: qrX, y: nextStepTop - nextStepHeight + 12, width: 52, height: 52 });
  } catch { /* QR is optional */ }
  y -= nextStepHeight + 10;

  const hasBank = b.bank_account_holder && b.bank_account_number && b.bank_branch_code;
  if (hasBank && d.status === "accepted") {
    need(53);
    put("PAY BY EFT", M, 8, bold, brand);
    y -= 14;
    paragraph(`${b.bank_account_holder}  |  ${b.bank_name ?? ""}  |  ${b.bank_account_type ?? ""}`, 8.5, font, ink, summaryWidth, 12);
    paragraph(`Account: ${b.bank_account_number}  |  Branch: ${b.bank_branch_code}  |  Reference: ${d.number}`, 8.5, font, ink, summaryWidth, 12);
    y -= 8;
  }

  return pdf.save();
}

export async function buildDocumentPdf({ document: d, lines, business: b, client: c }: Pub, link: string): Promise<Uint8Array> {
  if (d.type === "quote") return buildQuotePdf({ document: d, lines, business: b, client: c }, link);
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
  if (d.description) { need(30); put("What you will get", M, 8.5, font, mute); y -= 14; para(d.description); y -= 6; }
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
