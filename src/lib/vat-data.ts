import { createClient } from "@/lib/supabase/server";
import { southAfricaDate } from "@/lib/time";
import { vatPortion, type InvoiceRow, type PaymentRow } from "@/lib/vat-report";

type Supabase = Awaited<ReturnType<typeof createClient>>;
type Row = Record<string, unknown>;

const PAGE_SIZE = 1000; // the database returns at most 1000 rows at a time, so we read in pages
const MAX_PAGES = 20;
const CHUNK = 150;

const text = (value: unknown) => (typeof value === "string" ? value : "");
const whole = (value: unknown) => Number(value ?? 0) || 0;
const first = (value: unknown): Row => (Array.isArray(value) ? ((value[0] as Row) ?? {}) : ((value as Row) ?? {}));

async function readAll(build: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>) {
  const all: Row[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await build(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Row[];
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break;
  }
  return all;
}

// Every invoice dated within the period (drafts are never included), with what has been paid on it.
export async function loadInvoiceBasis(supabase: Supabase, from: string, to: string): Promise<InvoiceRow[]> {
  const documents = await readAll((start, end) =>
    supabase
      .from("documents")
      .select("id,number,issue_date,title,subtotal_cents,vat_cents,total_cents,vat_percent,status,clients(name)")
      .eq("type", "invoice")
      .in("status", ["sent", "viewed", "partially_paid", "paid"])
      .gte("issue_date", from)
      .lte("issue_date", to)
      .order("issue_date", { ascending: true })
      .order("number", { ascending: true })
      .range(start, end),
  );

  const paid = new Map<string, { cents: number; last: string | null }>();
  for (let index = 0; index < documents.length; index += CHUNK) {
    const ids = documents.slice(index, index + CHUNK).map((document) => text(document.id));
    const payments = await readAll((start, end) => supabase.from("payments").select("document_id,amount_cents,paid_at").in("document_id", ids).range(start, end));
    for (const payment of payments) {
      const id = text(payment.document_id);
      const day = southAfricaDate(text(payment.paid_at));
      const current = paid.get(id) ?? { cents: 0, last: null };
      paid.set(id, { cents: current.cents + whole(payment.amount_cents), last: current.last && current.last > day ? current.last : day });
    }
  }

  return documents.map((document) => {
    const payment = paid.get(text(document.id));
    return {
      number: text(document.number),
      issueDate: text(document.issue_date),
      clientName: text(first(document.clients).name) || "Client",
      title: text(document.title),
      subtotalCents: whole(document.subtotal_cents),
      vatCents: whole(document.vat_cents),
      totalCents: whole(document.total_cents),
      vatPercent: Number(document.vat_percent ?? 0),
      status: text(document.status),
      paidCents: payment?.cents ?? 0,
      lastPaidDate: payment?.last ?? null,
    };
  });
}

// Every payment received within the period, whichever invoice it belongs to.
export async function loadPaymentsBasis(supabase: Supabase, from: string, to: string): Promise<PaymentRow[]> {
  // South Africa is UTC+2 all year, so a South African day runs from 00:00+02:00 to 23:59:59+02:00.
  const startIso = `${from}T00:00:00+02:00`;
  const endIso = `${to}T23:59:59.999+02:00`;
  const payments = await readAll((start, end) =>
    supabase
      .from("payments")
      .select("amount_cents,method,paid_at,documents(number,vat_cents,total_cents,vat_percent,type,clients(name))")
      .gte("paid_at", startIso)
      .lte("paid_at", endIso)
      .order("paid_at", { ascending: true })
      .range(start, end),
  );

  return payments
    .map((payment) => {
      const document = first(payment.documents);
      const amount = whole(payment.amount_cents);
      const vat = vatPortion(amount, whole(document.vat_cents), whole(document.total_cents));
      return {
        type: text(document.type),
        row: {
          paidDate: southAfricaDate(text(payment.paid_at)),
          invoiceNumber: text(document.number),
          clientName: text(first(document.clients).name) || "Client",
          method: text(payment.method) === "payfast" ? "Online (PayFast)" : text(payment.method).toUpperCase() === "EFT" ? "EFT" : text(payment.method) === "cash" ? "Cash" : text(payment.method),
          amountCents: amount,
          vatCents: vat,
          netCents: amount - vat,
          vatPercent: Number(document.vat_percent ?? 0),
        } satisfies PaymentRow,
      };
    })
    .filter((item) => item.type === "invoice")
    .map((item) => item.row);
}
