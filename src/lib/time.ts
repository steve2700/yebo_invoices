// Everything the user sees is shown in South African time, whatever timezone the server runs in.
const TIME_ZONE = "Africa/Johannesburg";

const dateTime = new Intl.DateTimeFormat("en-ZA", {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const clock = new Intl.DateTimeFormat("en-ZA", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE });

export const formatSouthAfricaDateTime = (value: string | Date) => dateTime.format(new Date(value));
export const formatSouthAfricaClock = (value: string | Date) => clock.format(new Date(value));
// "2026-10-12": today (or the given moment) as a South African calendar date.
export const southAfricaDate = (value: string | Date = new Date()) => dayKey.format(new Date(value));

// The first and last day of the current South African month, plus how many days are left in it.
export function southAfricaMonth(now: Date = new Date()) {
  const [year, month, day] = southAfricaDate(now).split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    year,
    month,
    key: `${year}-${pad(month)}-01`, // the month's id in the database
    label: new Intl.DateTimeFormat("en-ZA", { timeZone: TIME_ZONE, month: "long", year: "numeric" }).format(now),
    monthName: new Intl.DateTimeFormat("en-ZA", { timeZone: TIME_ZONE, month: "long" }).format(now),
    day,
    daysInMonth,
    daysLeft: daysInMonth - day, // days after today
    // South Africa is UTC+2 all year, so local midnight is 22:00 UTC the day before.
    startIso: new Date(Date.UTC(year, month - 1, 1) - 2 * 60 * 60 * 1000).toISOString(),
    endIso: new Date(Date.UTC(year, month, 1) - 2 * 60 * 60 * 1000).toISOString(),
  };
}
