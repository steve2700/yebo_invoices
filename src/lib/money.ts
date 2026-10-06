// Money is always stored as integer cents. Never use floats for amounts.
export function formatRand(cents: number): string {
  return "R" + Math.round(cents / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
