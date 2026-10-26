// Hooks the morning list into the daily job and adds links to it, WITHOUT replacing whole files.
// Safe to run twice. The daily job and Settings must patch cleanly or nothing is written. The header link is optional.
import { readFileSync, writeFileSync } from "node:fs";

const edits = [
  {
    file: "src/app/api/cron/reminders/route.ts",
    done: (s) => s.includes("sendMorningLists"),
    apply: (s) => {
      const nl = s.includes("\r\n") ? "\r\n" : "\n";
      const imp = s.match(/^import \{ runRecurring \} from "@\/lib\/recurring-run";\r?\n/m);
      const hook = s.match(/^[ \t]*\/\/ Repeating invoices ride on this same daily run/m);
      const ret = s.match(/return Response\.json\(\{ \.\.\.result, expiry, recurring \}\);/);
      if (!imp || !hook || !ret) throw new Error("could not find the right places in the daily reminders job");
      let out = s;
      out = out.replace(ret[0], "return Response.json({ ...result, expiry, morning, recurring });");
      const call =
        "  // The owner's morning list: reminders left after the automatic emails, ready to send on WhatsApp." + nl +
        '  const morning = await sendMorningLists(admin, planAllows).catch((e) => { console.error("[morning list] failed:", e); return null; });' + nl + nl;
      out = out.slice(0, hook.index) + call + out.slice(hook.index);
      const i2 = out.indexOf(imp[0]) + imp[0].length;
      out = out.slice(0, i2) + 'import { sendMorningLists } from "@/lib/morning-list";' + nl + out.slice(i2);
      return out;
    },
  },
  {
    file: "src/app/app/settings/page.tsx",
    done: (s) => s.includes('href="/app/reminders"'),
    apply: (s) => {
      const anchor = s.match(/^[ \t]*<Link href="\/app\/(help|reports\/wins|reports\/vat)"/m);
      if (!anchor) throw new Error("could not find the cards in Settings");
      const nl = s.includes("\r\n") ? "\r\n" : "\n";
      const card = [
        '          <Link href="/app/reminders" className="group flex items-center justify-between gap-4 rounded-3xl border border-yebo-deep/10 bg-white px-6 py-5 shadow-[0_12px_40px_rgba(12,59,46,0.06)] transition hover:border-yebo/30 sm:px-8">',
        "            <span>",
        '              <span className="block text-xs font-bold uppercase tracking-[0.16em] text-yebo">Reminders</span>',
        '              <span className="mt-1 block text-lg font-black">Ready to send on WhatsApp</span>',
        '              <span className="mt-0.5 block text-sm text-yebo-deep/55">Clients to nudge today, one tap each. Optional morning email.</span>',
        "            </span>",
        '            <span aria-hidden="true" className="text-xl text-yebo-deep/40 transition group-hover:translate-x-1">→</span>',
        "          </Link>",
      ].join(nl) + nl;
      return s.slice(0, anchor.index) + card + s.slice(anchor.index);
    },
  },
  {
    optional: true,
    file: "src/app/app/layout.tsx",
    done: (s) => s.includes('href="/app/reminders"'),
    apply: (s) => {
      const anchor = s.match(/^[ \t]*<Link href="\/app\/reports\/vat" className=\{`\$\{link\} hidden sm:inline-flex`\}>Reports<\/Link>\r?\n/m);
      if (!anchor) throw new Error("could not find the Reports link in the header");
      const nl = s.includes("\r\n") ? "\r\n" : "\n";
      const line = '            <Link href="/app/reminders" className={`${link} hidden sm:inline-flex`}>Reminders</Link>' + nl;
      return s.slice(0, anchor.index) + line + s.slice(anchor.index);
    },
  },
];

const planned = [];
for (const e of edits) {
  try {
    const text = readFileSync(e.file, "utf8");
    planned.push({ e, text, skipped: e.done(text), next: e.done(text) ? text : e.apply(text) });
  } catch (error) {
    if (e.optional) { console.log(`skipped (optional)  ${e.file}: ${error.message}`); continue; }
    console.error(`Nothing was changed. Problem in ${e.file}: ${error.message}`);
    process.exit(1);
  }
}
for (const r of planned) {
  if (!r.skipped) writeFileSync(r.e.file, r.next);
  console.log(`${r.skipped ? "already done" : "patched     "}  ${r.e.file}`);
}
