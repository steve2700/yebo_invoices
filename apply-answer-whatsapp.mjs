// "Change something" and "No thanks" also offer a ready-written WhatsApp message to the business. Safe to run twice.
import fs from "node:fs";
const file = "src/app/d/[token]/page.tsx";
const raw = fs.readFileSync(file, "utf8");
if (raw.includes("Say thanks on WhatsApp")) { console.log("already whatsapp notes"); process.exit(0); }
const crlf = raw.includes("\r\n");
let t = raw.replace(/\r\n/g, "\n");
const fail = (w) => { console.log("MISSING", w, "(send me src/app/d/[token]/page.tsx)"); process.exit(1); };

// 1. after "Change something"
const s = t.indexOf('          {undo === "changed" &&');
const e = s < 0 ? -1 : t.indexOf("\n", s);
if (s < 0 || e < 0) fail("change note");
const changed = [
  '          {undo === "changed" && (',
  '            <div role="status" className="mb-5 rounded-2xl bg-lime p-4 text-center">',
  '              <p className="text-sm font-bold">Thanks! {b.name} has your message and will update the quote or get back to you.</p>',
  '              {b.phone && (',
  '                <a href={waLink(b.phone, `Hi ${b.name}, about quote ${d.number}: I have sent a change request on the quote page. Please have a look when you can.`)} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-extrabold text-white">',
  "                  Let {b.name} know on WhatsApp",
  "                </a>",
  "              )}",
  "            </div>",
  "          )}",
].join("\n");
t = t.slice(0, s) + changed + t.slice(e);

// 2. after "No thanks"
const from = '              <p className="font-bold">You declined this quote.</p>\n';
if (!t.includes(from)) fail("declined note");
t = t.replace(from, from + '              {b.phone && <a href={waLink(b.phone, `Hi ${b.name}, thanks for quote ${d.number}. It is not for me this time, but I appreciate it.`)} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-10 items-center rounded-full bg-lime px-4 text-sm font-bold">Say thanks on WhatsApp</a>}\n');

fs.writeFileSync(file, crlf ? t.replace(/\n/g, "\r\n") : t);
console.log("done    whatsapp notes");
