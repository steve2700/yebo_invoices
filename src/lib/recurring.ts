// Dates for "repeat this invoice every month". Days run from 1 to 28, so every month has the day.
export const DAY_MIN = 1;
export const DAY_MAX = 28;

const iso = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10);

// The first run on `day` that is after `today` (both "YYYY-MM-DD", South African dates).
export function firstRun(today: string, day: number): string {
  const [y, m, d] = today.split("-").map(Number);
  return day > d ? iso(y, m, day) : iso(y, m + 1, day);
}

// The same day next month.
export function nextMonth(runDate: string, day: number): string {
  const [y, m] = runDate.split("-").map(Number);
  return iso(y, m + 1, day);
}

export const ordinal = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"}`;
