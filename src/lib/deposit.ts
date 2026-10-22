// The amount a client pays to confirm a booking, in cents.
// "Deposit first" is a percentage of the total, "Full upfront" is the whole total, "After the job" is nothing now.
export function depositCents(doc: { total_cents: number | string; payment_plan?: string | null; deposit_percent?: number | null }): number {
  const total = Number(doc.total_cents);
  if (doc.payment_plan === "full") return total;
  if (doc.payment_plan === "deposit" && doc.deposit_percent) return Math.round((total * Number(doc.deposit_percent)) / 100);
  return 0;
}
