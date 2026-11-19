import { scopeRows, splitItem, type ScopeRow } from "@/lib/doc-text";
import { formatRand } from "@/lib/money";

// One item line: a bold name, the details underneath in small grey text, then the quantity if it is not 1.
export function ItemName({ description, quantity, unitCents }: { description: string; quantity: number; unitCents: number }) {
  const { title, detail } = splitItem(description);
  return (
    <span className="min-w-0">
      <span className="block font-bold leading-snug">{title}</span>
      {detail && <span className="mt-1 block text-xs font-normal leading-relaxed text-ink/55">{detail}</span>}
      {quantity !== 1 && <span className="mt-1 block text-xs font-normal text-ink/50">Qty {quantity} × {formatRand(unitCents)}</span>}
    </span>
  );
}

// The "What you will get" text: paragraphs stay paragraphs, a line ending in a colon becomes a small heading,
// and the lines under it become bullet points. Lines typed with a dash or bullet are bullets too.
export function ScopeList({ text, color }: { text: string; color: string }) {
  const rows = scopeRows(text);
  const blocks: ({ kind: "para" | "head"; text: string } | { kind: "list"; items: string[] })[] = [];
  for (const r of rows as ScopeRow[]) {
    if (r.kind === "bullet") {
      const last = blocks[blocks.length - 1];
      if (last && last.kind === "list") last.items.push(r.text);
      else blocks.push({ kind: "list", items: [r.text] });
    } else blocks.push({ kind: r.kind, text: r.text });
  }
  return (
    <div className="mt-2 space-y-2 rounded-2xl p-4" style={{ background: `${color}0F` }}>
      {blocks.map((b, i) =>
        b.kind === "list" ? (
          <ul key={i} className="space-y-1.5">
            {b.items.map((it, j) => (
              <li key={j} className="flex items-start gap-2.5 text-sm leading-relaxed text-ink/80">
                <span aria-hidden className="mt-[7px] size-1.5 shrink-0 rounded-full" style={{ background: color }} />
                <span className="min-w-0">{it}</span>
              </li>
            ))}
          </ul>
        ) : b.kind === "head" ? (
          <p key={i} className="pt-1 text-sm font-bold text-ink">{b.text}</p>
        ) : (
          <p key={i} className="text-sm leading-relaxed text-ink/80">{b.text}</p>
        ),
      )}
    </div>
  );
}
