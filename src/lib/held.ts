import { formatDate } from "@/lib/dates";

// "Valid until 21 Nov" normally, and "Price held until 21 Nov, 3 days left" in the last week so the client knows there is a deadline.
export function validLabel(expiry: string | null | undefined, today: string): string {
  if (!expiry) return "Valid for 14 days";
  const days = Math.round((Date.parse(`${expiry}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86400000);
  if (days < 0) return `Expired ${formatDate(expiry)}`;
  if (days === 0) return "Price held until today";
  if (days === 1) return `Price held until tomorrow, ${formatDate(expiry)}`;
  if (days <= 7) return `Price held for ${days} more days, until ${formatDate(expiry)}`;
  return `Valid until ${formatDate(expiry)}`;
}
