import type { SupabaseClient } from "@supabase/supabase-js";
import { appUrl } from "./url";
import { greetingName } from "./names";
import { southAfricaDate } from "./time";
import { sortReminders, type ReminderItem, type ReminderKind } from "./reminder-queue";

export type FollowupRow = { document_id: string; kind: ReminderKind; number: string; client_name: string; total_cents: number | string; days_waiting: number; reminders_sent: number };

const CHUNK = 100;
const MAX_ROWS = 400;

function chunks<T>(list: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += CHUNK) out.push(list.slice(i, i + CHUNK));
  return out;
}

// Turns the follow-ups the database says are due into things you can send. Works with the signed-in owner's client
// (their own business only) or the server's admin client (every business, for the morning email).
// Left out: invoices a client promised to pay later, anything already settled, and anything not yet ready to send.
export async function loadReminderItems(sb: SupabaseClient, rows: FollowupRow[]): Promise<ReminderItem[]> {
  const wanted = rows.slice(0, MAX_ROWS);
  if (!wanted.length) return [];
  const ids = wanted.map((row) => row.document_id);
  const today = southAfricaDate();

  const docs = new Map<string, { business_id: string; client_id: string; public_token: string; due_date: string | null; expiry_date: string | null; type: string }>();
  const paid = new Map<string, number>();
  const promisedUntil = new Map<string, string>();
  for (const part of chunks(ids)) {
    const [{ data: d }, { data: p }, { data: m }] = await Promise.all([
      sb.from("documents").select("id,business_id,client_id,public_token,due_date,expiry_date,type").in("id", part),
      sb.from("payments").select("document_id,amount_cents").in("document_id", part),
      sb.from("document_messages").select("document_id,body,created_at").eq("kind", "promise").in("document_id", part).order("created_at", { ascending: false }),
    ]);
    for (const row of d ?? []) docs.set(row.id as string, row as never);
    for (const row of p ?? []) paid.set(row.document_id as string, (paid.get(row.document_id as string) ?? 0) + Number(row.amount_cents));
    for (const row of m ?? []) if (!promisedUntil.has(row.document_id as string)) promisedUntil.set(row.document_id as string, String(row.body ?? ""));
  }

  const clientIds = [...new Set([...docs.values()].map((d) => d.client_id))];
  const businessIds = [...new Set([...docs.values()].map((d) => d.business_id))];
  const clients = new Map<string, { name: string; whatsapp_number: string | null }>();
  const businesses = new Map<string, string>();
  for (const part of chunks(clientIds)) {
    const { data } = await sb.from("clients").select("id,name,whatsapp_number").in("id", part);
    for (const row of data ?? []) clients.set(row.id as string, row as never);
  }
  for (const part of chunks(businessIds)) {
    const { data } = await sb.from("businesses").select("id,name").in("id", part);
    for (const row of data ?? []) businesses.set(row.id as string, String(row.name ?? ""));
  }

  const items: ReminderItem[] = [];
  for (const row of wanted) {
    const doc = docs.get(row.document_id);
    if (!doc) continue;
    const client = clients.get(doc.client_id);
    let amount = Number(row.total_cents);
    if (doc.type === "invoice") {
      amount = Math.max(amount - (paid.get(row.document_id) ?? 0), 0);
      if (amount <= 0) continue;
      const promise = promisedUntil.get(row.document_id);
      if (promise && promise >= today) continue; // they promised a date, leave them alone until then
    }
    items.push({
      documentId: row.document_id,
      businessId: doc.business_id,
      kind: row.kind,
      number: row.number,
      clientName: client?.name ?? row.client_name,
      firstName: greetingName(client?.name ?? row.client_name),
      whatsapp: client?.whatsapp_number ?? null,
      amountCents: amount,
      daysWaiting: Number(row.days_waiting),
      dueDate: doc.due_date,
      expiryDate: doc.expiry_date,
      link: `${appUrl()}/d/${doc.public_token}`,
      businessName: businesses.get(doc.business_id) || "our team",
    });
  }
  return sortReminders(items);
}
