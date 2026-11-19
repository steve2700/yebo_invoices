// Shared by the PDF and the client link, so both read the same way however a quote was typed.
// "Name(details)" or "Name" then a new line becomes a bold name with the details under it, however the person typed it.
export function splitItem(raw: string): { title: string; detail: string } {
  const text = String(raw ?? "").replace(/\r/g, "").trim();
  const nl = text.indexOf("\n");
  if (nl > 0) return { title: text.slice(0, nl).trim(), detail: text.slice(nl + 1).replace(/\s*\n\s*/g, " ").trim() };
  const open = text.indexOf("(");
  const close = text.lastIndexOf(")");
  if (open >= 6 && close > open + 3) {
    const title = text.slice(0, open).trim();
    const inside = text.slice(open + 1, close).trim();
    const after = text.slice(close + 1).replace(/^[\s.,;:]+/, "").trim();
    if (title && inside && (!after || inside.length >= 25)) return { title, detail: [inside, after].filter(Boolean).join(". ") };
  }
  return { title: text.replace(/(\S)\(/g, "$1 ("), detail: "" };
}

// Turns the "What you will get" text into paragraphs, small headings (lines ending in a colon) and bullets.
export type ScopeRow = { text: string; kind: "para" | "head" | "bullet" };
export function scopeRows(desc: string): ScopeRow[] {
  const out: ScopeRow[] = [];
  let bullets = false;
  for (const rawLine of String(desc ?? "").replace(/\r/g, "").split("\n")) {
    let line = rawLine.trim();
    if (!line) continue;
    const marked = /^[-\u2022*\u2013]\s+/.test(line);
    line = line.replace(/^[-\u2022*\u2013]\s+/, "");
    if (line.endsWith(":")) { out.push({ text: line, kind: "head" }); bullets = true; continue; }
    out.push({ text: line, kind: marked || bullets ? "bullet" : "para" });
  }
  return out;
}
