import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/dates";
import DashboardView, { type DashboardActionItem } from "./DashboardView";

type DocumentRow = {
  id: string;
  type: "invoice" | "quote";
  number: string;
  status: string;
  total_cents: number;
  due_date: string | null;
  clients: { name: string } | { name: string }[] | null;
};

const OPEN_STATUSES = ["sent", "viewed", "partially_paid"];
const SOUTH_AFRICA_TIMEZONE = "Africa/Johannesburg";

function clientName(document: DocumentRow) {
  const client = Array.isArray(document.clients) ? document.clients[0] : document.clients;
  return client?.name ?? "Client";
}

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: business } = await supabase.from("businesses").select("id,name").maybeSingle();
  if (!business) redirect("/app/onboarding");

  const now = new Date();
  const dateParts = new Intl.DateTimeFormat("en-ZA", {
    timeZone: SOUTH_AFRICA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => dateParts.find((datePart) => datePart.type === type)?.value ?? "00";
  const year = Number(part("year"));
  const month = Number(part("month"));
  const today = `${part("year")}-${part("month")}-${part("day")}`;
  const monthStart = new Date(Date.UTC(year, month - 1, 1) - 2 * 60 * 60 * 1000);
  const nextMonthStart = new Date(Date.UTC(year, month, 1) - 2 * 60 * 60 * 1000);
  const hourInSouthAfrica = Number(new Intl.DateTimeFormat("en-ZA", {
    timeZone: SOUTH_AFRICA_TIMEZONE,
    hour: "2-digit",
    hourCycle: "h23",
  }).format(now));
  const greeting = hourInSouthAfrica < 12 ? "Good morning" : hourInSouthAfrica < 17 ? "Good afternoon" : "Good evening";
  const displayDate = new Intl.DateTimeFormat("en-ZA", {
    timeZone: SOUTH_AFRICA_TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);
  const monthLabel = new Intl.DateTimeFormat("en-ZA", {
    timeZone: SOUTH_AFRICA_TIMEZONE,
    month: "long",
  }).format(now);

  const [{ data: documentData }, { data: conversionData }, { data: monthPayments }] = await Promise.all([
    supabase
      .from("documents")
      .select("id,type,number,status,total_cents,due_date,clients(name)")
      .in("status", ["sent", "viewed", "accepted", "partially_paid"])
      .order("created_at", { ascending: false }),
    supabase.from("documents").select("source_quote_id").not("source_quote_id", "is", null),
    supabase
      .from("payments")
      .select("amount_cents")
      .gte("paid_at", monthStart.toISOString())
      .lt("paid_at", nextMonthStart.toISOString()),
  ]);

  const documents = (documentData ?? []) as unknown as DocumentRow[];
  const convertedQuoteIds = new Set((conversionData ?? []).map((document) => document.source_quote_id));
  const invoiceIds = documents
    .filter((document) => document.type === "invoice" && OPEN_STATUSES.includes(document.status))
    .map((document) => document.id);
  let invoicePayments: { document_id: string; amount_cents: number }[] = [];

  if (invoiceIds.length) {
    const { data: payments } = await supabase
      .from("payments")
      .select("document_id,amount_cents")
      .in("document_id", invoiceIds);
    invoicePayments = (payments ?? []).map((payment) => ({
      document_id: payment.document_id,
      amount_cents: Number(payment.amount_cents),
    }));
  }

  const paidByInvoice = new Map<string, number>();
  for (const payment of invoicePayments) {
    paidByInvoice.set(payment.document_id, (paidByInvoice.get(payment.document_id) ?? 0) + payment.amount_cents);
  }

  const balanceDue = (document: DocumentRow) => Math.max(Number(document.total_cents) - (paidByInvoice.get(document.id) ?? 0), 0);
  const openInvoices = documents.filter(
    (document) => document.type === "invoice" && OPEN_STATUSES.includes(document.status) && balanceDue(document) > 0,
  );
  const overdueInvoices = openInvoices.filter((document) => document.due_date && document.due_date < today);
  const waitingQuotes = documents.filter(
    (document) => document.type === "quote" && (document.status === "sent" || document.status === "viewed"),
  );
  const readyQuotes = documents.filter(
    (document) => document.type === "quote" && document.status === "accepted" && !convertedQuoteIds.has(document.id),
  );
  const paidThisMonth = (monthPayments ?? []).reduce((total, payment) => total + Number(payment.amount_cents), 0);
  const outstandingCents = openInvoices.reduce((total, document) => total + balanceDue(document), 0);
  const overdueCents = overdueInvoices.reduce((total, document) => total + balanceDue(document), 0);

  const actionItems: DashboardActionItem[] = [
    ...openInvoices.map((document): DashboardActionItem => {
      const overdue = !!document.due_date && document.due_date < today;
      return {
        id: document.id,
        type: "invoice",
        number: document.number,
        clientName: clientName(document),
        amountCents: balanceDue(document),
        detail: document.due_date ? `Due ${formatDate(document.due_date)}` : "No due date set",
        badge: overdue ? "Overdue" : "Payment due",
        kind: overdue ? "overdue" : "invoice",
      };
    }),
    ...readyQuotes.map((document): DashboardActionItem => ({
      id: document.id,
      type: "quote",
      number: document.number,
      clientName: clientName(document),
      amountCents: Number(document.total_cents),
      detail: "Your client accepted this quote",
      badge: "Ready to invoice",
      kind: "ready",
    })),
    ...waitingQuotes.map((document): DashboardActionItem => ({
      id: document.id,
      type: "quote",
      number: document.number,
      clientName: clientName(document),
      amountCents: Number(document.total_cents),
      detail: document.status === "viewed" ? "Seen by your client" : "Shared with your client",
      badge: "Awaiting reply",
      kind: "waiting",
    })),
  ].sort((first, second) => {
    const priority = { overdue: 0, ready: 1, invoice: 2, waiting: 3 };
    return priority[first.kind] - priority[second.kind];
  }).slice(0, 6);

  return (
    <DashboardView
      businessName={business.name}
      greeting={greeting}
      today={today}
      displayDate={displayDate}
      monthLabel={monthLabel}
      collectedCents={paidThisMonth}
      outstandingCents={outstandingCents}
      overdueCents={overdueCents}
      openInvoiceCount={openInvoices.length}
      overdueInvoiceCount={overdueInvoices.length}
      waitingQuoteCount={waitingQuotes.length}
      readyToInvoiceCount={readyQuotes.length}
      actionItems={actionItems}
    />
  );
}
