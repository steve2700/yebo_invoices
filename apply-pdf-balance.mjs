// The invoice PDF now shows what has been paid and the balance, like the client's link does. Safe to run twice.
import fs from "node:fs";
const file = "src/lib/pdf.ts";
const raw = fs.readFileSync(file, "utf8");
const crlf = raw.includes("\r\n");
let t = raw.replace(/\r\n/g, "\n");
if (t.includes("paidSoFar")) { console.log("already  pdf balance"); process.exit(0); }
const edits = [
  ["type Pub = { document: any;", "type Pub = { paid_cents?: number | null; document: any;"],
  ["export async function buildDocumentPdf({ document: d, lines, business: b, client: c, signature }: Pub, link: string)",
   "export async function buildDocumentPdf({ document: d, lines, business: b, client: c, signature, paid_cents }: Pub, link: string)"],
  ["putRight(formatRand(d.total_cents), R - 12, 15, bold, onBrand, y - 18); y -= 54;\n",
   `putRight(formatRand(d.total_cents), R - 12, 15, bold, onBrand, y - 18); y -= 54;
  const paidSoFar = !isQuote && !isCredit && d.status !== "paid" ? Math.min(Number(paid_cents ?? 0), Number(d.total_cents)) : 0;
  const owing = paidSoFar > 0 ? Number(d.total_cents) - paidSoFar : Number(d.total_cents);
  if (paidSoFar > 0) {
    need(46);
    put("Already paid", 360); putRight("-" + formatRand(paidSoFar), R); y -= 18;
    put("Balance due", 360, 12, bold); putRight(formatRand(owing), R, 12, bold); y -= 24;
  }
`],
  ["`Please pay ${formatRand(d.total_cents)} by ${formatDate(d.due_date)}.", "`Please pay ${formatRand(owing)} by ${formatDate(d.due_date)}."],
];
for (const [from, to] of edits) {
  if (!t.includes(from)) { console.log("MISSING  pdf balance (send me src/lib/pdf.ts)"); process.exit(1); }
}
for (const [from, to] of edits) t = t.replace(from, to);
fs.writeFileSync(file, crlf ? t.replace(/\n/g, "\r\n") : t);
console.log("done     pdf balance");
