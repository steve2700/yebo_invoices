// Wires "Not yet" into the client quote page, the daily reminders job and the activity labels. Safe to run twice.
import fs from "node:fs";
const out = (ok, what) => console.log(ok ? "done   " : "MISSING", what);
function edit(file, what, fn) {
  const raw = fs.readFileSync(file, "utf8");
  const crlf = raw.includes("\r\n");
  const t = raw.replace(/\r\n/g, "\n");
  const r = fn(t);
  if (r === "already") return console.log("already", what);
  if (!r) return out(false, `${what} (send me ${file})`);
  fs.writeFileSync(file, crlf ? r.replace(/\n/g, "\r\n") : r);
  out(true, what);
}
const swap = (t, from, to) => (t.includes(from) ? t.replace(from, to) : null);

edit("src/app/d/[token]/page.tsx", "client quote page", (t) => {
  if (t.includes("notifySnoozed")) return "already";
  let x = t;
  x = swap(x, 'import AnswerBar, { DECLINE_REASONS } from "./AnswerBar";', 'import AnswerBar, { DECLINE_REASONS } from "./AnswerBar";\nimport { notifySnoozed, snoozeDate } from "@/lib/snooze";\nimport { validLabel } from "@/lib/held";\nimport { southAfricaDate } from "@/lib/time";'); if (!x) return null;
  x = swap(x, '  async function answer(formData: FormData) {\n    "use server";\n', '  async function answer(formData: FormData) {\n    "use server";\n    if (formData.get("event") === "snooze") {\n      const days = [3, 7, 14].includes(Number(formData.get("days"))) ? Number(formData.get("days")) : 7;\n      const date = snoozeDate(days);\n      const sbs = await createClient();\n      const { data: ok } = await sbs.rpc("snooze_quote", { p_token: token, p_date: date });\n      if (ok) after(() => notifySnoozed(token, date));\n      redirect(`/d/${token}?undo=${ok ? "snoozed" : "failed"}${ok ? `&until=${date}` : ""}`);\n    }\n'); if (!x) return null;
  x = swap(x, '          {undo === "failed" &&', '          {undo === "snoozed" && until && /^\\d{4}-\\d{2}-\\d{2}$/.test(until) && <p role="status" className="mb-5 rounded-2xl bg-lime p-3 text-center text-sm font-bold">No rush. {b.name} knows, and we will remind you on {formatDate(until)}. Your price is held until then.</p>}\n          {undo === "failed" &&'); if (!x) return null;
  x = swap(x, '{isQuote ? `Valid until ${formatDate(d.expiry_date)}` :', '{isQuote ? validLabel(d.expiry_date, southAfricaDate()) :'); if (!x) return null;
  return x;
});

edit("src/app/api/cron/reminders/route.ts", "daily reminders job", (t) => {
  if (t.includes("runSnoozes")) return "already";
  let x = swap(t, 'import { runWinbacks } from "@/lib/quote-followup";', 'import { runWinbacks } from "@/lib/quote-followup";\nimport { runSnoozes } from "@/lib/snooze";'); if (!x) return null;
  x = swap(x, '  // After a client says yes:', '  // The day a client asked to be followed up ("Not yet"): the owner and the client are both reminded.\n  const snoozes = await runSnoozes(admin).catch((e) => { console.error("[snoozes] failed:", e); return null; });\n  // After a client says yes:'); if (!x) return null;
  return x;
});

edit("src/app/app/documents/[id]/page.tsx", "activity labels", (t) => {
  if (t.includes("snooze_followup")) return "already";
  return swap(t, '  promise_to_pay: "Client promised a payment date",\n', '  promise_to_pay: "Client promised a payment date",\n  snoozed: "Client said \\"not yet\\" and picked a follow-up day",\n  snooze_followup: "Follow-up day reached, you and the client were reminded",\n');
});
