// Yebo's OWN PayFast account, the one that receives subscription fees.
// (This is different from each business's PayFast account, which receives that business's client payments.)
export function yeboPayfast() {
  const merchantId = process.env.YEBO_PAYFAST_MERCHANT_ID?.trim();
  const merchantKey = process.env.YEBO_PAYFAST_MERCHANT_KEY?.trim();
  if (!merchantId || !merchantKey) return null;
  return {
    merchantId,
    merchantKey,
    passphrase: process.env.YEBO_PAYFAST_PASSPHRASE?.trim() || null,
    // Test mode unless you explicitly say YEBO_PAYFAST_SANDBOX=false, so you cannot go live by accident.
    sandbox: process.env.YEBO_PAYFAST_SANDBOX?.trim().toLowerCase() !== "false",
  };
}

// One month after a South African calendar date (2026-10-13 -> 2026-11-13). A 31st becomes the last day of a shorter month.
export function addOneMonth(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const target = new Date(Date.UTC(year, month, 1)); // the 1st of next month
  const daysInTarget = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${target.getUTCFullYear()}-${pad(target.getUTCMonth() + 1)}-${pad(Math.min(day, daysInTarget))}`;
}
