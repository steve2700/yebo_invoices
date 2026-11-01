// PayShap lets a client pay a cellphone number that is linked to a bank account. The money arrives in minutes, also on weekends and holidays.
// We keep the number as +27XXXXXXXXX and show it the way people write it (082 123 4567).

export type PayshapResult = { value: string | null; error?: string };

export function normalizePayshap(raw: string | null | undefined): PayshapResult {
  const cleaned = String(raw ?? "").replace(/[‎‏‪-‮⁦-⁩]/g, "").trim();
  if (!cleaned) return { value: null };
  let digits = cleaned.replace(/[^\d+]/g, "");
  if (digits.startsWith("00")) digits = "+" + digits.slice(2);
  if (/^27\d{9}$/.test(digits)) digits = "+" + digits;
  if (/^0\d{9}$/.test(digits)) digits = "+27" + digits.slice(1);
  // South African mobile numbers start 06, 07 or 08 once the leading 0 is dropped.
  if (!/^\+27[678]\d{8}$/.test(digits)) return { value: null, error: "Enter a South African cellphone number, like 082 123 4567." };
  return { value: digits };
}

export function formatPayshap(stored: string | null | undefined): string {
  const match = /^\+27(\d{2})(\d{3})(\d{4})$/.exec(stored ?? "");
  return match ? `0${match[1]} ${match[2]} ${match[3]}` : stored ?? "";
}
