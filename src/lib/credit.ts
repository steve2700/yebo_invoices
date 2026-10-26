// Pure helpers for credit notes (no database, so they are easy to test).

export const CREDIT_REASONS: Record<string, string> = {
  discount: "Discount agreed with the client",
  goodwill: "Goodwill gesture",
  not_done: "Work or items not delivered",
  error: "Invoice raised in error",
  other: "Other (see description)",
};

// "1 250,50" / "R1250.5" / "1,250.50" -> 125050 cents. Returns null when it is not a sensible positive amount.
export function randToCents(input: string): number | null {
  let s = String(input ?? "").replace(/[Rr\s ]/g, "");
  if (!s) return null;
  // A comma followed by one or two digits at the end is a decimal comma; any other comma is a thousands separator.
  if (/,\d{1,2}$/.test(s) && !s.includes(".")) s = s.replace(",", ".");
  s = s.replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const [whole, frac = ""] = s.split(".");
  const cents = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

// Splits an amount that includes VAT into its VAT and the rest. Matches the database function exactly.
export function splitVat(totalCents: number, vatPercent: number): { vatCents: number; subtotalCents: number } {
  const vatCents = Math.round((totalCents * vatPercent) / (100 + vatPercent));
  return { vatCents, subtotalCents: totalCents - vatCents };
}
