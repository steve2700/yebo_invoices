// Points the landing page feature sections at the new app screenshots. Safe to run twice.
import fs from "node:fs";
const file = "src/lib/features.ts";
let t = fs.readFileSync(file, "utf8");
const nl = t.includes("\r\n") ? "\r\n" : "\n";
const shot = (n, alt) => `{ src: "/screens/${n}.webp", alt: "${alt}" }`;
const edits = [
  [/screens: \[\{ src: "\/screens\/quote-client\.png"[^\n]*\],/, `screens: [${shot("app-opened", "Yebo quote page showing the client has opened the quote, with ways to send it again by email or WhatsApp")}, ${shot("app-documents", "Yebo documents list with quotes and invoices and their status")}],`, "send-and-track"],
  [/screens: \[\{ src: "\/screens\/home-dashboard\.png"[^\n]*\],/, `screens: [${shot("app-home", "Yebo home screen: a client said yes to a quote, with a button to make the invoice")}, ${shot("app-documents", "Yebo documents list showing paid invoices")}],`, "get-paid"],
  [/screens: \[\r?\n\s*\{ src: "\/screens\/home-targets\.png"[^\n]*\r?\n\s*\{ src: "\/screens\/home-dashboard\.png"[^\n]*\r?\n\s*\],/, `screens: [${shot("app-numbers", "Yebo home numbers: money collected, waiting for a yes, quotes sent and win rate")}, ${shot("app-results", "Yebo quote results: sent, won, lost and win rate")}],`, "know-your-numbers"],
  [/screens: \[\{ src: "\/screens\/settings-defaults\.png"[^\n]*\],/, `screens: [${shot("app-vat", "Yebo VAT report with a download for your accountant")}],`, "built-for-south-africa"],
];
for (const [re, to, label] of edits) {
  if (re.test(t)) { t = t.replace(re, to); console.log("done  ", label); }
  else console.log(t.includes(to) ? "already" : "MISSING", label);
}
fs.writeFileSync(file, t.replace(/\r?\n/g, nl));
