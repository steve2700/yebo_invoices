// "looked for 2 min · read to the end": what the owner sees about how a client read the page.
export function viewDetail(seconds?: number | null, scroll?: number | null): string {
  const parts: string[] = [];
  const s = Number(seconds ?? 0);
  if (s >= 5) parts.push(s < 60 ? `looked for ${s} sec` : `looked for ${Math.round(s / 60)} min`);
  const p = Number(scroll ?? 0);
  if (p >= 90) parts.push("read to the end");
  else if (p >= 50) parts.push("read about half");
  return parts.join(" · ");
}
