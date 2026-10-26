// Finds the past quote (or invoice) that looks most like the one being started. Pure functions, no database.

export type PastLine = { description: string; quantity: number; unitPriceCents: number };
export type PastDoc = {
  id: string;
  clientId: string;
  title: string;
  description: string;
  exclusions: string;
  assumptions: string;
  timeline: string;
  status: string;
  totalCents: number;
  createdAt: string; // ISO date
  lines: PastLine[];
};

const STOP = new Set(["and", "the", "for", "with", "from", "this", "that", "per", "new", "job", "work", "all", "incl", "including"]);

// Lowercase words of 3+ letters, with a simple plural trimmed ("cupboards" matches "cupboard").
export function tokens(text: string): Set<string> {
  const out = new Set<string>();
  for (const raw of text.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").split(/[^a-z0-9]+/)) {
    if (raw.length < 3 || STOP.has(raw) || /^\d+$/.test(raw)) continue;
    out.add(raw.length > 4 && raw.endsWith("s") ? raw.slice(0, -1) : raw);
  }
  return out;
}

const WON = new Set(["accepted", "paid", "partially_paid"]);

export type Match = { doc: PastDoc; score: number; reason: "similar" | "same-client" };

// With typed words: the best word overlap (a past quote for the same client counts a little extra).
// With nothing typed yet: this client's most recent document, so a repeat customer starts from last time.
export function findSimilar(past: PastDoc[], text: string, clientId: string | null): Match | null {
  const query = tokens(text);
  let best: Match | null = null;
  if (query.size === 0) {
    if (!clientId) return null;
    const mine = past.filter((doc) => doc.clientId === clientId && doc.lines.length > 0).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return mine[0] ? { doc: mine[0], score: 1, reason: "same-client" } : null;
  }
  for (const doc of past) {
    if (!doc.lines.length) continue;
    const words = tokens([doc.title, doc.description, ...doc.lines.map((line) => line.description)].join(" "));
    let shared = 0;
    for (const word of query) if (words.has(word)) shared++;
    if (shared === 0) continue;
    const containment = shared / query.size;
    const jaccard = shared / (query.size + words.size - shared);
    let score = containment * 0.7 + jaccard * 0.3;
    if (clientId && doc.clientId === clientId) score += 0.15;
    if (WON.has(doc.status)) score += 0.08;
    if (score < 0.4) continue;
    if (!best || score > best.score || (score === best.score && doc.createdAt > best.doc.createdAt)) best = { doc, score, reason: "similar" };
  }
  return best;
}
