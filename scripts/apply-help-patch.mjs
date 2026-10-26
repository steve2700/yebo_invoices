// Adds the Help link, the "?" button and the Help icon WITHOUT replacing whole files, so nothing else in them is lost.
// Safe to run twice: each edit is skipped if it is already there. Nothing is written unless every file can be patched.
import { readFileSync, writeFileSync } from "node:fs";

const edits = [
  {
    file: "src/app/app/icons.tsx",
    done: (s) => /\bhelp:\s*</.test(s),
    apply: (s) => {
      const i = s.lastIndexOf("} as const;");
      if (i < 0) throw new Error("could not find the end of the icon list");
      const add = '  help: <><circle cx="12" cy="12" r="10" /><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01" /></>,\n';
      return s.slice(0, i) + add + s.slice(i);
    },
  },
  {
    file: "src/app/app/layout.tsx",
    done: (s) => s.includes('href="/app/help"'),
    apply: (s) => {
      const desktop = s.match(/^[ \t]*<Link href="\/app\/settings" className=\{`\$\{link\} hidden sm:inline-flex`\}>Settings<\/Link>\r?\n/m);
      const phone = s.match(/^[ \t]*<Link href="\/app\/settings" aria-label="Settings"/m);
      if (!desktop || !phone) throw new Error("could not find the Settings links in the header");
      const nl = s.includes("\r\n") ? "\r\n" : "\n";
      const helpDesktop = '            <Link href="/app/help" className={`${link} hidden sm:inline-flex`}>Help</Link>' + nl;
      const helpPhone =
        '            <Link href="/app/help" aria-label="Help and support" className="inline-flex size-10 items-center justify-center rounded-full text-yebo-deep/70 hover:bg-yebo-deep/5 hover:text-yebo-deep sm:hidden">' + nl +
        '              <Icon name="help" size={22} />' + nl +
        "            </Link>" + nl;
      // Insert the later one first so the earlier index stays valid.
      let out = s.slice(0, phone.index) + helpPhone + s.slice(phone.index);
      out = out.slice(0, desktop.index) + helpDesktop + out.slice(desktop.index);
      return out;
    },
  },
  {
    file: "src/app/app/settings/page.tsx",
    done: (s) => s.includes('href="/app/help"'),
    apply: (s) => {
      const anchor = s.match(/^[ \t]*<Link href="\/app\/reports\/(wins|vat)"/m);
      if (!anchor) throw new Error("could not find the Reports card in Settings");
      const nl = s.includes("\r\n") ? "\r\n" : "\n";
      const card = [
        '          <Link href="/app/help" className="group flex items-center justify-between gap-4 rounded-3xl border border-yebo-deep/10 bg-white px-6 py-5 shadow-[0_12px_40px_rgba(12,59,46,0.06)] transition hover:border-yebo/30 sm:px-8">',
        "            <span>",
        '              <span className="block text-xs font-bold uppercase tracking-[0.16em] text-yebo">Help</span>',
        '              <span className="mt-1 block text-lg font-black">Talk to a person</span>',
        '              <span className="mt-0.5 block text-sm text-yebo-deep/55">Call, WhatsApp or email us, 8am to 5pm.</span>',
        "            </span>",
        '            <span aria-hidden="true" className="text-xl text-yebo-deep/40 transition group-hover:translate-x-1">→</span>',
        "          </Link>",
      ].join(nl) + nl;
      return s.slice(0, anchor.index) + card + s.slice(anchor.index);
    },
  },
];

const results = [];
try {
  for (const e of edits) {
    const text = readFileSync(e.file, "utf8");
    results.push({ e, text, next: e.done(text) ? text : e.apply(text), skipped: e.done(text) });
  }
} catch (error) {
  console.error("Nothing was changed. Problem:", error.message);
  process.exit(1);
}
for (const r of results) {
  if (!r.skipped) writeFileSync(r.e.file, r.next);
  console.log(`${r.skipped ? "already done" : "patched     "}  ${r.e.file}`);
}
