// The reminders waiting to be sent on WhatsApp, and the message for each. Pure functions, easy to test.
import { formatRand } from "./money";
import { formatDate } from "./dates";

export type ReminderKind = "quote_followup" | "invoice_due_soon" | "invoice_overdue";

export type ReminderItem = {
  documentId: string;
  businessId: string;
  kind: ReminderKind;
  number: string;
  clientName: string;
  firstName: string;
  whatsapp: string | null;
  amountCents: number; // what is still owed (invoices) or the quote total
  daysWaiting: number;
  dueDate: string | null;
  expiryDate: string | null;
  link: string;
  businessName: string;
};

// The same friendly wording as the buttons on each invoice and quote, so clients hear one consistent voice.
export function reminderMessage(item: ReminderItem): string {
  const amount = formatRand(item.amountCents);
  if (item.kind === "quote_followup") {
    return [
      `Hi ${item.firstName},`,
      `Just checking in on quote ${item.number} for ${amount} from ${item.businessName}.`,
      item.expiryDate ? `It is valid until ${formatDate(item.expiryDate)}.` : null,
      `View and accept it here: ${item.link}`,
      "If you would like anything changed, just reply to this message.",
    ].filter(Boolean).join("\n\n");
  }
  return [
    `Hi ${item.firstName},`,
    item.kind === "invoice_overdue"
      ? `A friendly reminder from ${item.businessName} that invoice ${item.number} has an outstanding balance of ${amount}${item.dueDate ? ` and was due on ${formatDate(item.dueDate)}` : ""}.`
      : `A friendly reminder from ${item.businessName} that invoice ${item.number} for ${amount} is due${item.dueDate ? ` on ${formatDate(item.dueDate)}` : " soon"}.`,
    `Please use ${item.number} as your payment reference.`,
    "If you have already paid, thank you. Please disregard this reminder.",
    `View and pay: ${item.link}`,
  ].join("\n\n");
}

const days = (n: number) => `${n} day${n === 1 ? "" : "s"}`;

// A short line for the list: "R2 400 · 5 days overdue".
export function reminderDetail(item: ReminderItem): string {
  const amount = formatRand(item.amountCents);
  if (item.kind === "quote_followup") return `${amount} · no reply after ${days(Math.max(item.daysWaiting, 0))}`;
  if (item.kind === "invoice_overdue") return `${amount} · ${days(Math.max(item.daysWaiting, 1))} overdue`;
  return `${amount} · due soon`;
}

export const reminderKindLabel = (kind: ReminderKind) =>
  kind === "quote_followup" ? "Quote follow-up" : kind === "invoice_overdue" ? "Overdue invoice" : "Due soon";

// Overdue invoices first (the money you are owed), longest wait first, then due soon, then quotes.
export function sortReminders(items: ReminderItem[]): ReminderItem[] {
  const rank: Record<ReminderKind, number> = { invoice_overdue: 0, invoice_due_soon: 1, quote_followup: 2 };
  return [...items].sort((a, b) => rank[a.kind] - rank[b.kind] || b.daysWaiting - a.daysWaiting || b.amountCents - a.amountCents);
}
