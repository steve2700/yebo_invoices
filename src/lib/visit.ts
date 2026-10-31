// Site visits: reading the owner's date and time (always South African time), the calendar file, and the message text.

// "2026-11-04T10:00" (from a datetime-local box) -> a real moment, treating it as South African time (UTC+2, no daylight saving).
export function parseSaDateTime(raw: unknown, now: Date = new Date()): Date | null {
  if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) return null;
  const d = new Date(`${raw}:00+02:00`);
  if (Number.isNaN(d.getTime())) return null;
  const [y, mo, da] = raw.slice(0, 10).split("-").map(Number);
  const check = new Date(Date.UTC(y, mo - 1, da));
  if (check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== da) return null; // 31 Feb and similar
  if (d.getTime() < now.getTime() - 60000 || d.getTime() > now.getTime() + 180 * 86400000) return null;
  return d;
}

export const newVisitToken = () => crypto.randomUUID().replace(/-/g, "").slice(0, 20);
export const validVisitToken = (t: unknown): t is string => typeof t === "string" && /^[a-z0-9]{16,32}$/.test(t);

const icsText = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const icsStamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

// A calendar file any phone or computer can add: one hour, with a reminder an hour before.
export function buildIcs(input: { id: string; start: Date; title: string; where?: string | null; description?: string }): string {
  const end = new Date(input.start.getTime() + 60 * 60 * 1000);
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Yebo Invoices//Site visit//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${input.id}@yeboinvoices.com`,
    `DTSTAMP:${icsStamp(new Date())}`,
    `DTSTART:${icsStamp(input.start)}`,
    `DTEND:${icsStamp(end)}`,
    `SUMMARY:${icsText(input.title)}`,
    ...(input.where ? [`LOCATION:${icsText(input.where)}`] : []),
    ...(input.description ? [`DESCRIPTION:${icsText(input.description)}`] : []),
    "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:Site visit in 1 hour", "TRIGGER:-PT1H", "END:VALARM",
    "END:VEVENT", "END:VCALENDAR",
  ];
  return lines.join("\r\n") + "\r\n";
}

const visitFmt = new Intl.DateTimeFormat("en-ZA", { timeZone: "Africa/Johannesburg", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
export const formatVisit = (value: string | Date) => visitFmt.format(new Date(value));

export const visitMessage = (businessName: string, when: string | Date, link: string) =>
  `Hi, this is ${businessName}. I can come and look at the job on ${formatVisit(when)}. Please confirm here, or pick another day: ${link}`;
