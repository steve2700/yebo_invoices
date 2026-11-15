// After a client taps "Not yet", offer a ready-written WhatsApp message to the business. Safe to run twice.
import fs from "node:fs";
const file = "src/app/d/[token]/page.tsx";
const raw = fs.readFileSync(file, "utf8");
if (raw.includes("Let {b.name} know on WhatsApp")) { console.log("already whatsapp note"); process.exit(0); }
const crlf = raw.includes("\r\n");
const t = raw.replace(/\r\n/g, "\n");
const start = t.indexOf('          {undo === "snoozed" &&');
const end = start < 0 ? -1 : t.indexOf("\n", start);
if (start < 0 || end < 0) { console.log("MISSING whatsapp note (run apply-not-yet.mjs first, or send me src/app/d/[token]/page.tsx)"); process.exit(1); }
const block = [
  '          {undo === "snoozed" && until && /^\\d{4}-\\d{2}-\\d{2}$/.test(until) && (',
  '            <div role="status" className="mb-5 rounded-2xl bg-lime p-4 text-center">',
  '              <p className="text-sm font-bold">No rush. {b.name} knows, and we will remind you on {formatDate(until)}. Your price is held until then.</p>',
  '              {b.phone && (',
  '                <a href={waLink(b.phone, `Hi ${b.name}, about quote ${d.number}: I need a little time. Please check in with me on ${formatDate(until)}.`)} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-extrabold text-white">',
  "                  Let {b.name} know on WhatsApp",
  "                </a>",
  "              )}",
  "            </div>",
  "          )}",
].join("\n");
const out = t.slice(0, start) + block + t.slice(end);
fs.writeFileSync(file, crlf ? out.replace(/\n/g, "\r\n") : out);
console.log("done    whatsapp note");
