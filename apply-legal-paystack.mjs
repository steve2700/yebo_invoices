import fs from "node:fs";
const file = "src/lib/legal-content.ts";
let s = fs.readFileSync(file, "utf8");
const crlf = s.includes("\r\n");
let changed = 0;
function rep(label, from, to) {
  if (s.includes(to)) { console.log("SKIP (already done):", label); return; }
  if (!s.includes(from)) { console.log("MISSING:", label); return; }
  s = s.split(from).join(to); changed++; console.log("OK:", label);
}
rep("privacy: subscription card details",
  "Card or bank details for your Yebo subscription are handled by PayFast, not stored by Yebo.",
  "Card details for your Yebo subscription are handled by our payment provider, Paystack, and are not stored by Yebo.");
rep("privacy: providers",
  "and PayFast to process online payments and subscription payments.",
  "PayFast to process the online invoice payments of contractors who connect their own PayFast account, and Paystack to process Yebo subscription payments.");
rep("terms: billed monthly",
  "It is billed monthly in advance through PayFast and renews automatically",
  "It is billed monthly in advance through our payment provider, Paystack, and renews automatically");
rep("terms: price change",
  "Payments are also subject to PayFast's terms.",
  "Subscription payments are also subject to Paystack's terms.");
rep("updated dates", 'updated: "12 October 2026"', 'updated: "10 November 2026"');
if (changed) fs.writeFileSync(file, crlf ? s.replace(/\r?\n/g, "\r\n") : s);
console.log(changed ? "Done." : "Nothing to change.");
