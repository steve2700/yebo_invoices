// Takes the "Test mode" tick box out of Settings, so every business that connects PayFast takes real payments.
// Edits the file in place. Safe to run twice. If anything does not match, nothing is changed.
import { readFileSync, writeFileSync } from "node:fs";

const file = "src/app/app/settings/page.tsx";
let s = readFileSync(file, "utf8");
const original = s;

const saveLine = /sandbox: fd\.get\("sandbox"\) === "on",/;
const checkbox = /[ \t]*<label className="[^"]*">\s*<input type="checkbox" name="sandbox"[^>]*\/>\s*Test mode \(no real money moves\)\s*<\/label>\r?\n/;

const needSave = saveLine.test(s);
const needBox = checkbox.test(s);
if (!needSave && !needBox) {
  console.log("already done  " + file);
  process.exit(0);
}
if (needSave !== needBox) {
  console.error("Nothing was changed. Only part of the expected code was found in " + file + ".");
  process.exit(1);
}
s = s.replace(saveLine, "sandbox: false, // Test mode is no longer offered. Every connected business takes real payments.");
s = s.replace(checkbox, "");
if (s === original) { console.error("Nothing was changed."); process.exit(1); }
writeFileSync(file, s);
console.log("patched       " + file);
