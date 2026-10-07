import Image from "next/image";
import Link from "next/link";
import { formatRand } from "@/lib/money";

export type DashboardActionItem = {
  id: string;
  type: "invoice" | "quote";
  number: string;
  clientName: string;
  amountCents: number;
  detail: string;
  badge: string;
  kind: "overdue" | "invoice" | "ready" | "waiting";
};

type DashboardViewProps = {
  businessName: string;
  greeting: string;
  today: string;
  displayDate: string;
  monthLabel: string;
  collectedCents: number;
  outstandingCents: number;
  overdueCents: number;
  openInvoiceCount: number;
  overdueInvoiceCount: number;
  waitingQuoteCount: number;
  readyToInvoiceCount: number;
  actionItems: DashboardActionItem[];
};

const actionStyle = {
  overdue: {
    marker: "!",
    markerClass: "bg-orange/10 text-orange",
    badgeClass: "bg-orange/10 text-orange",
  },
  invoice: {
    marker: "R",
    markerClass: "bg-yebo-chalk text-yebo-deep",
    badgeClass: "bg-yebo-chalk text-yebo-deep",
  },
  ready: {
    marker: "✓",
    markerClass: "bg-lime text-ink",
    badgeClass: "bg-lime/60 text-ink",
  },
  waiting: {
    marker: "↗",
    markerClass: "bg-paper text-ink/55",
    badgeClass: "bg-paper text-ink/65",
  },
} as const;

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="size-4 shrink-0 text-ink/35 transition group-hover:translate-x-0.5 group-hover:text-yebo">
      <path d="M5 15 15 5M6 5h9v9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MetricCard({
  label,
  value,
  detail,
  featured = false,
  alert = false,
  monthLabel,
}: {
  label: string;
  value: string;
  detail: string;
  featured?: boolean;
  alert?: boolean;
  monthLabel?: string;
}) {
  return (
    <article
      className={`rounded-3xl p-4 sm:p-5 ${
        featured
          ? "col-span-2 bg-ink text-paper shadow-[0_18px_45px_-26px_rgba(17,45,35,.75)] sm:col-span-1"
          : "border border-ink/10 bg-white text-ink shadow-[0_8px_30px_-24px_rgba(17,45,35,.35)]"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className={`text-[11px] font-bold uppercase tracking-[0.13em] ${featured ? "text-paper/65" : "text-ink/50"}`}>
          {label}
        </p>
        {featured ? (
          <span className="rounded-full bg-lime/15 px-2.5 py-1 text-[10px] font-bold text-lime">{monthLabel}</span>
        ) : (
          <span className={`size-2 rounded-full ${alert ? "bg-orange" : "bg-yebo/70"}`} aria-hidden="true" />
        )}
      </div>
      <p className={`mt-3 truncate font-extrabold leading-none tracking-[-0.045em] tabular-nums ${featured ? "text-3xl sm:text-[2rem]" : "text-[1.7rem] sm:text-3xl"}`}>
        {value}
      </p>
      <p className={`mt-2 text-xs leading-5 ${featured ? "text-paper/55" : alert ? "text-orange" : "text-ink/50"}`}>
        {detail}
      </p>
    </article>
  );
}

function AttentionRow({ item }: { item: DashboardActionItem }) {
  const style = actionStyle[item.kind];
  const documentLabel = item.type === "invoice" ? "invoice" : "quote";

  return (
    <li>
      <Link
        href={`/app/documents/${item.id}`}
        aria-label={`Open ${documentLabel} ${item.number} for ${item.clientName}`}
        className="group grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-ink/10 bg-white px-3 py-3 transition hover:border-yebo/25 hover:bg-yebo-chalk/35 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yebo sm:grid-cols-[2.75rem_minmax(0,1fr)_auto_auto] sm:gap-3.5 sm:px-4"
      >
        <span className={`grid size-10 place-items-center rounded-xl text-sm font-extrabold ${style.markerClass}`} aria-hidden="true">
          {style.marker}
        </span>
        <span className="min-w-0">
          <span className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] text-ink/45">{documentLabel}</span>
            <span className="truncate text-sm font-extrabold text-ink">{item.number}</span>
          </span>
          <span className="mt-1 block truncate text-xs text-ink/55">{item.clientName} <span aria-hidden="true">·</span> {item.detail}</span>
        </span>
        <span className="min-w-0 text-right sm:min-w-[7.5rem]">
          <span className="block truncate text-sm font-extrabold tabular-nums text-ink">{formatRand(item.amountCents)}</span>
          <span className={`mt-1 inline-flex max-w-full truncate rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] ${style.badgeClass}`}>
            {item.badge}
          </span>
        </span>
        <span className="hidden sm:block"><ArrowIcon /></span>
      </Link>
    </li>
  );
}

function PipelineRow({ label, detail, count }: { label: string; detail: string; count: number }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-ink">{label}</p>
        <p className="mt-1 truncate text-xs text-ink/50">{detail}</p>
      </div>
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-paper text-sm font-extrabold tabular-nums text-ink">
        {count}
      </span>
    </div>
  );
}

export default function DashboardView({
  businessName,
  greeting,
  today,
  displayDate,
  monthLabel,
  collectedCents,
  outstandingCents,
  overdueCents,
  openInvoiceCount,
  overdueInvoiceCount,
  waitingQuoteCount,
  readyToInvoiceCount,
  actionItems,
}: DashboardViewProps) {
  return (
    <main className="min-h-full bg-paper px-4 pb-32 pt-6 text-ink sm:px-6 sm:pb-10 sm:pt-8 lg:px-8 lg:pt-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:gap-8">
        <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-yebo">
              Your workspace <span className="mx-1.5 text-ink/25" aria-hidden="true">/</span>
              <time dateTime={today} className="font-semibold tracking-normal text-ink/45">{displayDate}</time>
            </p>
            <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-[-0.05em] text-ink sm:text-4xl lg:text-[2.75rem]">
              {greeting}<span className="text-orange">.</span>
            </h1>
            <p className="mt-2 max-w-xl truncate text-sm text-ink/55 sm:text-base">
              Here&apos;s the latest for <span className="font-bold text-ink">{businessName}</span>.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:flex sm:shrink-0">
            <Link
              href="/app/quotes/new"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-yebo px-4 text-sm font-extrabold text-white shadow-[0_8px_22px_-12px_rgba(15,138,95,.75)] transition hover:-translate-y-0.5 hover:bg-yebo-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yebo focus-visible:ring-offset-2"
            >
              <span className="text-lg leading-none" aria-hidden="true">+</span> New quote
            </Link>
            <Link
              href="/app/quotes/new?type=invoice"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-ink/15 bg-white px-4 text-sm font-bold text-ink transition hover:border-ink/30 hover:bg-yebo-chalk/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yebo focus-visible:ring-offset-2"
            >
              <span className="text-lg leading-none text-yebo" aria-hidden="true">+</span> New invoice
            </Link>
          </div>
        </header>

        <section aria-label="Business overview" className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          <MetricCard
            label="Collected this month"
            value={formatRand(collectedCents)}
            detail="Payments received so far"
            featured
            monthLabel={monthLabel}
          />
          <MetricCard
            label="Outstanding"
            value={formatRand(outstandingCents)}
            detail={`${openInvoiceCount} open invoice${openInvoiceCount === 1 ? "" : "s"}`}
          />
          <MetricCard
            label="Overdue"
            value={formatRand(overdueCents)}
            detail={overdueInvoiceCount ? `${overdueInvoiceCount} invoice${overdueInvoiceCount === 1 ? " needs" : "s need"} follow-up` : "You're all caught up"}
            alert={overdueInvoiceCount > 0}
          />
        </section>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(17rem,.75fr)] lg:gap-5">
          <section aria-labelledby="attention-heading" className="min-w-0 rounded-3xl border border-ink/10 bg-white p-4 shadow-[0_12px_40px_-32px_rgba(17,45,35,.45)] sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-yebo">Your next steps</p>
                <h2 id="attention-heading" className="mt-1.5 text-xl font-extrabold tracking-tight text-ink sm:text-2xl">Needs your attention</h2>
              </div>
              <Link href="/app/documents" className="rounded-full px-3 py-2 text-xs font-bold text-yebo transition hover:bg-yebo-chalk focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yebo">
                All documents <span aria-hidden="true">→</span>
              </Link>
            </div>

            {actionItems.length ? (
              <ul className="mt-5 flex flex-col gap-2.5">
                {actionItems.map((item) => <AttentionRow key={item.id} item={item} />)}
              </ul>
            ) : (
              <div className="mt-5 flex min-h-40 items-center justify-between gap-3 overflow-hidden rounded-2xl bg-yebo-chalk/60 px-4 py-4 sm:min-h-48 sm:px-6">
                <div className="max-w-sm">
                  <span className="inline-flex rounded-full bg-lime px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.13em] text-ink">All clear</span>
                  <p className="mt-3 text-base font-extrabold tracking-tight text-ink sm:text-lg">Nothing needs a follow-up.</p>
                  <p className="mt-1 text-xs leading-5 text-ink/55 sm:text-sm">Your latest quotes and invoices are up to date. Start the next job with a clear quote.</p>
                  <Link href="/app/quotes/new" className="mt-3 inline-flex items-center gap-1 text-xs font-extrabold text-yebo hover:text-yebo-deep">
                    Create a quote <span aria-hidden="true">→</span>
                  </Link>
                </div>
                <Image
                  src="/yebo-dashboard-art.png"
                  alt=""
                  width={128}
                  height={192}
                  sizes="128px"
                  className="hidden h-36 w-24 shrink-0 object-contain sm:block"
                />
              </div>
            )}
          </section>

          <section aria-labelledby="pipeline-heading" className="rounded-3xl border border-ink/10 bg-white p-4 shadow-[0_12px_40px_-32px_rgba(17,45,35,.45)] sm:p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-orange">Quote pipeline</p>
            <h2 id="pipeline-heading" className="mt-1.5 text-xl font-extrabold tracking-tight text-ink sm:text-2xl">Keep work moving</h2>
            <div className="mt-2 divide-y divide-ink/10">
              <PipelineRow label="Awaiting a reply" detail="Quotes with your clients" count={waitingQuoteCount} />
              <PipelineRow label="Ready to invoice" detail="Accepted quotes not yet invoiced" count={readyToInvoiceCount} />
            </div>
            <Link
              href="/app/documents"
              className="mt-1 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-paper px-4 text-sm font-bold text-ink transition hover:bg-yebo-chalk focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yebo"
            >
              Review your documents <span aria-hidden="true">→</span>
            </Link>
          </section>
        </div>
      </div>
    </main>
  );
}
