// Where and when people can reach Yebo support. One place to change it.
export const SUPPORT = {
  phoneDisplay: "069 382 4908",
  phoneTel: "+27693824908",
  whatsappDigits: "27693824908", // the same number, for wa.me links
  email: "noreply@yeboinvoices.com",
  openHour: 8, // 08:00
  closeHour: 17, // 17:00
  hoursText: "8am to 5pm, South African time",
};

// Whether support is inside its hours right now, judged on the South African clock.
export function supportOpen(now: Date = new Date()): boolean {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Johannesburg", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  return hour >= SUPPORT.openHour && hour < SUPPORT.closeHour;
}

// A ready-written first message, so support knows who is asking and does not have to ask again.
export function supportMessage(businessName: string | null, userEmail: string | null): string {
  return `Hi Yebo, I need help. Business: ${businessName || "(not set)"}. Account email: ${userEmail || "(unknown)"}. My question: `;
}
