// Stops the sign-in check from running on pictures, icons and fonts, which can make a picture fail to load.
import { readFileSync, writeFileSync } from "node:fs";
const file = "src/middleware.ts";
const text = readFileSync(file, "utf8");
const from = `matcher: ["/((?!_next/static|_next/image|favicon.ico|d/).*)"]`;
const to = `matcher: ["/((?!_next/static|_next/image|favicon.ico|d/|images/|screens/|.*\\\\.(?:png|jpg|jpeg|webp|svg|ico|gif|woff2?)$).*)"]`;
if (text.includes("images/|screens/")) { console.log("already done  " + file); process.exit(0); }
if (text.split(from).length !== 2) { console.error("Nothing was changed. Could not find the matcher line in " + file); process.exit(1); }
writeFileSync(file, text.replace(from, () => to));
console.log("patched       " + file);
