// Cleaner invoice PDF: bold item names with the details underneath, a bulleted scope box, totals kept with the items,
// payment details kept together, and a roomier header. It copes with however the quote was typed. Safe to run twice.
import fs from "node:fs";
const file = "src/lib/pdf.ts";
const raw = fs.readFileSync(file, "utf8");
const crlf = raw.includes("\r\n");
let t = raw.replace(/\r\n/g, "\n");
if (t.includes("export function splitItem")) { console.log("already  pdf layout"); process.exit(0); }
const fail = (what) => { console.log("MISSING  " + what + " (send me src/lib/pdf.ts). Nothing was changed."); process.exit(1); };

// 1. Helpers, placed just before the invoice builder.
const anchor = "export async function buildDocumentPdf(";
const at = t.indexOf(anchor);
if (at < 0) fail("invoice builder");
const helpers = `// "Name(details)" or "Name" then a new line becomes a bold name with the details under it, however the person typed it.
export function splitItem(raw: string): { title: string; detail: string } {
  const text = String(raw ?? "").replace(/\\r/g, "").trim();
  const nl = text.indexOf("\\n");
  if (nl > 0) return { title: text.slice(0, nl).trim(), detail: text.slice(nl + 1).replace(/\\s*\\n\\s*/g, " ").trim() };
  const open = text.indexOf("(");
  const close = text.lastIndexOf(")");
  if (open >= 6 && close > open + 3) {
    const title = text.slice(0, open).trim();
    const inside = text.slice(open + 1, close).trim();
    const after = text.slice(close + 1).replace(/^[\\s.,;:]+/, "").trim();
    if (title && inside && (!after || inside.length >= 25)) return { title, detail: [inside, after].filter(Boolean).join(". ") };
  }
  return { title: text.replace(/(\\S)\\(/g, "$1 ("), detail: "" };
}

// Turns the "What you will get" text into paragraphs, small headings (lines ending in a colon) and bullets.
export type ScopeRow = { text: string; kind: "para" | "head" | "bullet" };
export function scopeRows(desc: string): ScopeRow[] {
  const out: ScopeRow[] = [];
  let bullets = false;
  for (const rawLine of String(desc ?? "").replace(/\\r/g, "").split("\\n")) {
    let line = rawLine.trim();
    if (!line) continue;
    const marked = /^[-\\u2022*\\u2013]\\s+/.test(line);
    line = line.replace(/^[-\\u2022*\\u2013]\\s+/, "");
    if (line.endsWith(":")) { out.push({ text: line, kind: "head" }); bullets = true; continue; }
    out.push({ text: line, kind: marked || bullets ? "bullet" : "para" });
  }
  return out;
}

`;
t = t.slice(0, at) + helpers + t.slice(at);

// 2. Everything below only touches the invoice builder.
const start = t.indexOf(anchor);
let head = t.slice(0, start), tail = t.slice(start);
const swap = (from, to, what) => { if (!tail.includes(from)) fail(what); tail = tail.replace(from, to); };

swap("leftY = top - 56;", "leftY = top - 66;", "header spacing");

swap(`  if (d.description) { need(30); put("What you will get", M, 8.5, font, mute); y -= 14; para(d.description); y -= 6; }`,
`  const scope = d.description ? scopeRows(d.description) : [];
  if (scope.length) {
    type Ln = { t: string; x: number; f: PDFFont; gap: number; dot: boolean };
    const lns: Ln[] = [];
    for (const r of scope) {
      const f = r.kind === "head" ? bold : font;
      const indent = r.kind === "bullet" ? 12 : 0;
      const parts = wrap(r.text, f, 9.5, R - M - 32 - indent);
      parts.forEach((p, i) => lns.push({ t: p, x: M + 16 + indent, f, gap: i === parts.length - 1 ? (r.kind === "head" ? 4 : 3) : 0, dot: r.kind === "bullet" && i === 0 }));
    }
    const lineH = 12.5;
    const boxH = 34 + lns.reduce((s, l) => s + lineH + l.gap, 0);
    if (boxH <= 380) {
      need(boxH + 8);
      page.drawRectangle({ x: M, y: y - boxH, width: R - M, height: boxH, color: rgb(0.96, 0.975, 0.965) });
      page.drawRectangle({ x: M, y: y - boxH, width: 3, height: boxH, color: brand });
      put("What you will get", M + 16, 8.5, bold, mute, y - 17);
      let sy = y - 34;
      for (const l of lns) { if (l.dot) page.drawCircle({ x: l.x - 6, y: sy + 3.4, size: 1.7, color: brand }); put(l.t, l.x, 9.5, l.f, ink, sy); sy -= lineH + l.gap; }
      y -= boxH + 16;
    } else {
      need(30); put("What you will get", M, 8.5, bold, mute); y -= 15;
      for (const l of lns) { need(lineH); if (l.dot) page.drawCircle({ x: l.x - 18, y: y + 3.4, size: 1.7, color: brand }); put(l.t, l.x - 16 + 4, 9.5, l.f, ink); y -= lineH + l.gap; }
      y -= 8;
    }
  }`, "scope");

// Items table.
const i1 = tail.indexOf("  // ---- items ----");
const i2 = tail.indexOf("  // ---- totals ----");
if (i1 < 0 || i2 < i1) fail("items");
const items = `  // ---- items ----
  const paidNow = !isQuote && !isCredit && d.status !== "paid" ? Math.min(Number(paid_cents ?? 0), Number(d.total_cents)) : 0;
  const totalsH = 104 + (paidNow > 0 ? 46 : 0);
  const itemsHeader = () => {
    put("Description", M, 8.5, bold, mute); put("Qty", 340, 8.5, bold, mute);
    putRight("Price", 450, 8.5, bold, mute); putRight("Total", R, 8.5, bold, mute);
    y -= 8; page.drawLine({ start: { x: M, y }, end: { x: R, y }, thickness: 1.2, color: brand }); y -= 17;
  };
  need(80);
  itemsHeader();
  const itemList = lines ?? [];
  itemList.forEach((l: any, idx: number) => {
    const { title, detail } = splitItem(l.description);
    const tRows = wrap(title, bold, 10, 278);
    const dRows = detail ? wrap(detail, font, 8.5, 278) : [];
    const textH = tRows.length * 13 + (dRows.length ? dRows.length * 11 + 2 : 0);
    const rowH = textH + 16 + (idx === itemList.length - 1 ? totalsH : 0);
    if (y - rowH < 56) { page = pdf.addPage([W, H]); topBar(); y = H - 48; itemsHeader(); }
    tRows.forEach((tx, i) => put(tx, M, 10, bold, ink, y - i * 13));
    dRows.forEach((tx, i) => put(tx, M, 8.5, font, mute, y - tRows.length * 13 - 1 - i * 11));
    put(String(Number(l.quantity)), 340, 10, font, ink);
    putRight(formatRand(l.unit_price_cents), 450);
    putRight(formatRand(l.line_total_cents), R, 10, bold);
    y -= textH + 2;
    page.drawLine({ start: { x: M, y }, end: { x: R, y }, thickness: 0.5, color: rule });
    y -= 14;
  });

`;
tail = tail.slice(0, i1) + items + tail.slice(i2);

swap("  need(boxH + 10);\n",
`  const bankH = !isCredit && ((b.bank_account_holder && b.bank_account_number && b.bank_branch_code) || formatPayshap(b.payshap_number)) && (!isQuote || d.status === "accepted") ? 90 : 0;
  need(boxH + 16 + 116 + bankH);
`, "payment grouping");

t = head + tail;
fs.writeFileSync(file, crlf ? t.replace(/\n/g, "\r\n") : t);
console.log("done     pdf layout");
