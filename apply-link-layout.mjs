// The client link now lays out items and the scope the way the PDF does, and the PDF shares the same text rules.
// Safe to run twice.
import fs from "node:fs";
const log = (s, l) => console.log(s.padEnd(8), l);
const read = (f) => { const raw = fs.readFileSync(f, "utf8"); return { crlf: raw.includes("\r\n"), t: raw.replace(/\r\n/g, "\n") }; };
const write = (f, o, t) => fs.writeFileSync(f, o.crlf ? t.replace(/\n/g, "\r\n") : t);

// 1. The client link page.
{
  const f = "src/app/d/[token]/page.tsx";
  const o = read(f); let t = o.t;
  if (t.includes("ItemName")) log("already", "client link");
  else {
    const item = '<span className="font-semibold">{l.description}{Number(l.quantity) !== 1 && <span className="mt-1 block text-xs font-normal text-ink/50">Qty {Number(l.quantity)} × {formatRand(l.unit_price_cents)}</span>}</span>';
    const scope = '<p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink/80">{d.description}</p>';
    const excl = '<p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink/80">{d.exclusions}</p>';
    const assume = '<p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink/80">{d.assumptions}</p>';
    const imp = 'import AnswerBar, { DECLINE_REASONS } from "./AnswerBar";\n';
    if (![item, scope, excl, assume, imp].every((x) => t.includes(x))) log("MISSING", "client link (send me src/app/d/[token]/page.tsx). Nothing changed.");
    else {
      t = t.split(item).join('<ItemName description={l.description} quantity={Number(l.quantity)} unitCents={l.unit_price_cents} />');
      t = t.replace(scope, "<ScopeList text={d.description} color={color} />")
           .replace(excl, "<ScopeList text={d.exclusions} color={color} />")
           .replace(assume, "<ScopeList text={d.assumptions} color={color} />")
           .replace(imp, imp + 'import { ItemName, ScopeList } from "@/components/DocText";\n');
      write(f, o, t); log("done", "client link");
    }
  }
}

// 2. The PDF uses the shared rules instead of its own copy.
{
  const f = "src/lib/pdf.ts";
  const o = read(f); let t = o.t;
  if (t.includes('from "./doc-text"')) log("already", "pdf shares text rules");
  else {
    const a = t.indexOf('// "Name(details)"');
    const b = t.indexOf("export async function buildDocumentPdf(");
    if (a < 0 || b < a) log("MISSING", "pdf text rules (send me src/lib/pdf.ts). Nothing changed.");
    else {
      t = t.slice(0, a) + t.slice(b);
      const firstImport = t.indexOf("import ");
      t = t.slice(0, firstImport) + 'import { scopeRows, splitItem } from "./doc-text";\n' + t.slice(firstImport);
      write(f, o, t); log("done", "pdf shares text rules");
    }
  }
}
