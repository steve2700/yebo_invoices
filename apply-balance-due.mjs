// The client's invoice page showed the full total after a deposit was paid. It now shows the balance.
// Safe to run twice.
import fs from "node:fs";
const file = "src/app/d/[token]/page.tsx";
const raw = fs.readFileSync(file, "utf8");
const crlf = raw.includes("\r\n");
let t = raw.replace(/\r\n/g, "\n");
if (t.includes("heroPaid")) { console.log("already  balance due"); process.exit(0); }

const edits = [
  ["payment sentence",
    "Please pay ${formatRand(d.total_cents)} by ${formatDate(d.due_date)}.",
    "Please pay ${formatRand(Math.max(Number(d.total_cents) - Number(data.paid_cents ?? 0), 0))} by ${formatDate(d.due_date)}."],
  ["balance variable",
    "  const invoiceBalance = Math.max(Number(d.total_cents) - Number(data.paid_cents ?? 0), 0);\n",
    "  const invoiceBalance = Math.max(Number(d.total_cents) - Number(data.paid_cents ?? 0), 0);\n  const heroPaid = Math.min(Number(data.paid_cents ?? 0), Number(d.total_cents));\n"],
  ["big label",
    '{isQuote ? "Estimated total" : "Amount due"}',
    '{isQuote ? "Estimated total" : unpaidInvoice && heroPaid > 0 ? "Balance due" : "Amount due"}'],
  ["big amount",
    "From</span>}{formatRand(d.total_cents)}</p>",
    'From</span>}{formatRand(unpaidInvoice && heroPaid > 0 ? invoiceBalance : d.total_cents)}</p>\n                {unpaidInvoice && heroPaid > 0 && <p className="mt-1 text-sm font-semibold opacity-80">{formatRand(d.total_cents)} total, {formatRand(heroPaid)} already paid</p>}'],
  ["totals rows",
    "<span style={{ color }}>{formatRand(d.total_cents)}</span></div>\n                  {creditsOnInvoice.map",
    '<span style={{ color }}>{formatRand(d.total_cents)}</span></div>\n                  {unpaidInvoice && heroPaid > 0 && creditedTotal === 0 && (\n                    <>\n                      <div className="flex justify-between px-3 py-1 text-ink/70"><span>Already paid</span><span>-{formatRand(heroPaid)}</span></div>\n                      <div className="flex justify-between px-3 py-1 font-black"><span>Balance due</span><span>{formatRand(invoiceBalance)}</span></div>\n                    </>\n                  )}\n                  {creditsOnInvoice.map'],
];
let ok = true;
for (const [label, from, to] of edits) {
  if (!t.includes(from)) { console.log("MISSING  " + label); ok = false; continue; }
  t = t.replace(from, to);
}
if (!ok) { console.log("Nothing changed. Send me src/app/d/[token]/page.tsx."); process.exit(1); }
fs.writeFileSync(file, crlf ? t.replace(/\n/g, "\r\n") : t);
console.log("done     balance due");
