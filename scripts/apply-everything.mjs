// Applies every sign-in and tracking patch in the right order. Each one skips itself if it is already done,
// and stops with a clear message if it can not be applied. Safe to run any number of times.
import { spawnSync } from "node:child_process";
const steps = ["apply-google-logo-patch", "apply-signin-code-patch", "apply-signin-auto-patch", "apply-signin-hint-patch", "apply-signin-polish-patch", "apply-signin-codeonly-patch", "apply-signin-remember-patch", "apply-tracking-patch", "apply-traffic-patch"];
for (const s of steps) {
  console.log("--- " + s);
  const r = spawnSync(process.execPath, ["scripts/" + s + ".mjs"], { stdio: "inherit" });
  if (r.status !== 0) { console.error("\nStopped at " + s + ". Copy everything above and send it to me."); process.exit(1); }
}
console.log("\nAll patches are in place.");
