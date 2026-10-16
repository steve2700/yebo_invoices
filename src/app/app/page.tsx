/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDate, waLink } from "@/lib/dates";
import { formatRand } from "@/lib/money";
import { greetingName } from "@/lib/names";
import { appUrl } from "@/lib/url";
import DashboardView, { type DashboardActionItem, type DashboardRecentPayment } from "./DashboardView";
import type { MonthlyStats } from "./MonthlyTargets";
import { southAfricaMonth } from "@/lib/time";
import { entitlement } from "@/lib/subscription";

type DocumentRow = {
  id: string;
  type: "invoice" | "quote";
  number: string;
  status: string;
  total_cents: number;
  due_date: string | null;
  clients: { name: string } | { name: string }[] | null;
};

// One row from the followups_due() database function (see 0002_followups.sql).
type Followup = {
  document_id: string;
  kind: "quote_followup" | "invoice_due_soon" | "invoice_overdue";
  days_waiting: number;
  reminders_sent: number;
};

const OPEN_STATUSES = ["sent", "viewed", "partially_paid"];
const SOUTH_AFRICA_TIMEZONE = "Africa/Johannesburg";

function clientName(document: DocumentRow) {
  const client = Array.isArray(document.clients) ? document.clients[0] : document.clients;
  return client?.name ?? "Client";
}

function timeAgo(iso: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 2) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

const PAYMENT_METHODS: Record<string, string> = { payfast: "Paid online", eft: "EFT", cash: "Cash" };

function dayCount(days: number) {
  return `${days} day${days === 1 ? "" : "s"}`;
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
  const [{ data: documentData }, { data: conversionData }, { data: monthPayments }, { data: followupData, error: followupError }] = await Promise.all([
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
    supabase.rpc("followups_due"),
  ]);

  // Payments from the last 7 days the owner has not yet thanked the client for. If the 0006 migration has not
  // been run yet this query fails, and the section simply does not appear.
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentPaymentRows } = await supabase
    .from("payments")
    .select("id,amount_cents,method,paid_at,documents(number,public_token,clients(name,whatsapp_number))")
    .is("thanked_at", null)
    .gte("paid_at", sevenDaysAgo)
    .order("paid_at", { ascending: false })
    .limit(3);
  const first = <T,>(value: T | T[] | null | undefined): T | null => (Array.isArray(value) ? value[0] ?? null : value ?? null);
  const recentPayments: DashboardRecentPayment[] = [];
  for (const row of (recentPaymentRows ?? []) as any[]) {
    const paidDocument = first<any>(row.documents);
    const paidClient = first<any>(paidDocument?.clients);
    if (!paidDocument || !paidClient) continue;
    const firstName = greetingName(paidClient.name);
    const amountText = formatRand(Number(row.amount_cents));
    const message = `Hi ${firstName}, thank you for your payment of ${amountText} for invoice ${paidDocument.number}. We've received it and really appreciate it! Your receipt: ${appUrl()}/d/${paidDocument.public_token}`;
    recentPayments.push({
      id: row.id,
      clientName: paidClient.name ?? "Your client",
      firstName,
      invoiceNumber: paidDocument.number,
      amountCents: Number(row.amount_cents),
      methodLabel: PAYMENT_METHODS[row.method] ?? "Payment",
      paidAgo: timeAgo(row.paid_at),
      whatsappHref: waLink(paidClient.whatsapp_number ?? null, message),
    });
  }

  // If the 0002 migration has not been run yet, followups_due() errors. In that case we fall back
  // to offering a reminder on every overdue invoice (quotes get no button) instead of breaking.
  const followupsAvailable = !followupError;
  const followups = new Map<string, Followup>(
    followupsAvailable ? ((followupData ?? []) as Followup[]).map((followup) => [followup.document_id, followup]) : [],
  );

  const ent = await entitlement(supabase);
  const remindersAllowed = !ent.enforced || Boolean(ent.plan?.reminders);
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

  // This month's targets and progress. If this month has no target yet, last month's is carried over.
  // If the 0007 migration has not been run yet these queries return nothing and the card shows its "set a target" state.
  const currentMonth = southAfricaMonth();
  const [{ count: quotesSentCount }, { count: quotesAcceptedCount }, { data: currentTarget }, { data: lastTarget }] = await Promise.all([
    supabase.from("documents").select("id", { count: "exact", head: true }).eq("type", "quote").neq("status", "draft").gte("created_at", currentMonth.startIso).lt("created_at", currentMonth.endIso),
    supabase.from("events").select("id", { count: "exact", head: true }).eq("type", "accepted").gte("created_at", currentMonth.startIso).lt("created_at", currentMonth.endIso),
    supabase.from("monthly_targets").select("revenue_cents,quotes_count").eq("month", currentMonth.key).maybeSingle(),
    supabase.from("monthly_targets").select("revenue_cents,quotes_count").lt("month", currentMonth.key).order("month", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const activeTarget = currentTarget ?? lastTarget;
  const monthly: MonthlyStats = {
    monthName: currentMonth.monthName,
    daysLeft: currentMonth.daysLeft,
    collectedCents: paidThisMonth,
    revenueTargetCents: Number(activeTarget?.revenue_cents ?? 0),
    quotesSent: quotesSentCount ?? 0,
    quotesTarget: Number(activeTarget?.quotes_count ?? 0),
    quotesAccepted: quotesAcceptedCount ?? 0,
    carriedOver: !currentTarget && Boolean(lastTarget),
  };
  const outstandingCents = openInvoices.reduce((total, document) => total + balanceDue(document), 0);
  const overdueCents = overdueInvoices.reduce((total, document) => total + balanceDue(document), 0);

  const actionItems: DashboardActionItem[] = [
    ...openInvoices.map((document): DashboardActionItem => {
      const overdue = !!document.due_date && document.due_date < today;
      const followup = followups.get(document.id);
      const dueText = document.due_date ? `Due ${formatDate(document.due_date)}` : "No due date set";
      const detail = followup?.kind === "invoice_overdue" && followup.days_waiting > 0
        ? `${dueText} · ${dayCount(followup.days_waiting)} overdue`
        : dueText;
      return {
        id: document.id,
        type: "invoice",
        number: document.number,
        clientName: clientName(document),
        amountCents: balanceDue(document),
        dueDate: document.due_date,
        detail,
        badge: overdue ? "Overdue" : "Payment due",
        kind: overdue ? "overdue" : "invoice",
        // Offer a reminder only when one is due (not nudged in the last 3 days, fewer than 3 sent).
        canRemind: remindersAllowed && (followupsAvailable ? followups.has(document.id) : overdue),
      };
    }),
    ...readyQuotes.map((document): DashboardActionItem => ({
      id: document.id,
      type: "quote",
      number: document.number,
      clientName: clientName(document),
      amountCents: Number(document.total_cents),
      dueDate: null,
      detail: "Your client accepted this quote",
      badge: "Ready to invoice",
      kind: "ready",
      canRemind: false,
    })),
    ...waitingQuotes.map((document): DashboardActionItem => {
      const followup = followups.get(document.id);
      const seen = document.status === "viewed" ? "Seen by your client" : "Shared with your client";
      return {
        id: document.id,
        type: "quote",
        number: document.number,
        clientName: clientName(document),
        amountCents: Number(document.total_cents),
        dueDate: null,
        detail: followup && followup.days_waiting > 0 ? `${seen} · no reply after ${dayCount(followup.days_waiting)}` : seen,
        badge: "Awaiting reply",
        kind: "waiting",
        // Offer a follow-up only when one is due (3+ days with no reply and not nudged recently).
        canRemind: remindersAllowed && (followupsAvailable ? followups.has(document.id) : false),
      };
    }),
  ].sort((first, second) => {
    const priority = { overdue: 0, ready: 1, invoice: 2, waiting: 3 };
    const priorityDifference = priority[first.kind] - priority[second.kind];
    if (priorityDifference !== 0) return priorityDifference;
    if (first.dueDate && second.dueDate) return first.dueDate.localeCompare(second.dueDate);
    if (first.dueDate) return -1;
    if (second.dueDate) return 1;
    return 0;
  }).slice(0, 6);

  return (
    <DashboardView
      businessName={business.name}
      greeting={greeting}
      today={today}
      displayDate={displayDate}
      collectedCents={paidThisMonth}
      outstandingCents={outstandingCents}
      overdueCents={overdueCents}
      openInvoiceCount={openInvoices.length}
      overdueInvoiceCount={overdueInvoices.length}
      waitingQuoteCount={waitingQuotes.length}
      readyToInvoiceCount={readyQuotes.length}
      actionItems={actionItems}
      recentPayments={recentPayments}
      monthly={monthly}
    />
  );
}
