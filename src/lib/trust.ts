// Trust badges and customer reviews a business can show on the page where a client accepts a quote.
// Badges are what the business says about itself (a fixed list, so the wording is always clean).

export const BADGES = [
  { id: "insured", label: "Fully insured" },
  { id: "certified", label: "Certified and qualified" },
  { id: "licensed", label: "Licensed for this work" },
  { id: "registered", label: "Registered business" },
  { id: "references", label: "References on request" },
  { id: "safety", label: "Safety compliant" },
] as const;

export const BADGE_LABELS: Record<string, string> = Object.fromEntries(BADGES.map((b) => [b.id, b.label]));

export type Review = { name: string; place: string; text: string };
export const MAX_REVIEWS = 5;

// Reads reviews saved as JSON and keeps only well-formed ones, so the page can never break on odd data.
export function parseReviews(value: unknown): Review[] {
  if (!Array.isArray(value)) return [];
  const out: Review[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const text = typeof r.text === "string" ? r.text.trim().slice(0, 240) : "";
    const name = typeof r.name === "string" ? r.name.trim().slice(0, 60) : "";
    const place = typeof r.place === "string" ? r.place.trim().slice(0, 60) : "";
    if (text && name) out.push({ name, place, text });
  }
  return out.slice(0, MAX_REVIEWS);
}
