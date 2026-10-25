import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatRand } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { greetingName } from "@/lib/names";
import { appUrl } from "@/lib/url";
import { formatSouthAfricaDateTime, southAfricaDate } from "@/lib/time";
import { entitlement } from "@/lib/subscription";
import { depositCents } from "@/lib/deposit";
import SubmitButton from "@/components/SubmitButton";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import CopyButton from "../CopyButton";
import AiMessageComposer from "../AiMessageComposer";
import SendEmailCard from "../SendEmailCard";
import ConfirmForm from "../ConfirmForm";
import { convertToInvoice, deleteDraft, duplicateDocument, markDepositReceived, markPaid, sendDraft } from "../actions";

const EVENT_LABELS: Record<string, string> = {
  sent: "Sent to client",
  emailed: "Emailed to client",
  viewed: "Opened by client",
  accepted: "Accepted by client",
  declined: "Declined by client",
  reminder_sent: "Reminder sent",
  paid: "Payment received",
  deposit_claimed: "Client says they have paid",
  expiry_reminder: "Expiry reminder emailed to client",
};

type StepState = "done" | "current" | "todo" | "bad";

// Where this document is on its journey, shown as a simple strip so nobody wonders what happens next.
function journey(type: string, status: string): { label: string; state: StepState }[] {
  const isQuote = type === "quote";
  const lastLabel = isQuote ? (status === "declined" ? "Declined" : "Accepted") : "Paid";
  const position: Record<string, number> = { draft: 0, sent: 1, viewed: 2, partially_paid: 2, accepted: 3, declined: 3, paid: 3, expired: 1 };
  const at = position[status] ?? 0;
  const labels = ["Draft", "Sent", "Opened", lastLabel];
  return labels.map((label, index) => {
    if (index === 3 && status === "declined") return { label, state: "bad" as const };
    if (index < at) return { label, state: "done" as const };
    if (index === at) return { label, state: at === 3 ? ("done" as const) : ("current" as const) };
    return { label, state: "todo" as const };
  });
}

function JourneyStrip({ steps }: { steps: { label: string; state: StepState }[] }) {
  return (
    <ol aria-label="Progress" className="mt-5 flex items-center">
      {steps.map((step, index) => (
        <li key={step.label} className="flex flex-1 items-center last:flex-none">
          <div className="flex flex-col items-center gap-1.5">
            <span
              style={{ "--d": `${index * 0.12}s` } as React.CSSProperties}
              className={`pop-in grid size-8 place-items-center rounded-full text-xs font-extrabold ${
                step.state === "done" ? "bg-yebo text-white" : step.state === "current" ? "bg-white text-yebo ring-2 ring-yebo" : step.state === "bad" ? "bg-orange text-white" : "bg-ink/5 text-ink/35"
              }`}
            >
              {step.state === "done" ? "✓" : step.state === "bad" ? "✕" : index + 1}
            </span>
            <span className={`text-[11px] font-bold ${step.state === "todo" ? "text-ink/35" : "text-ink/75"}`}>{step.label}</span>
          </div>
          {index < steps.length - 1 && (
            <span aria-hidden="true" className={`mx-1.5 mb-5 h-0.5 flex-1 rounded-full ${step.state === "done" ? "bg-yebo" : "bg-ink/10"}`} />
          )}
        </li>
      ))}
    </ol>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 print:hidden">
      <h2 className="text-xs font-extrabold uppercase tracking-[0.16em] text-ink/50">{title}</h2>
      {hint && <p className="mt-1 text-sm text-ink/55">{hint}</p>}
      <div className="mt-3 flex flex-col gap-3">{children}</div>
    </section>
  );
}

// One action: what it does, written for a busy person, with the control underneath.
function ActionCard({ icon, title, description, children }: { icon: React.ReactNode; title: string; description: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-ink/5 text-lg">{icon}</span>
        <div className="min-w-0 flex-1">
          <h3 className="font-extrabold text-ink">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-ink/65">{description}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

const btnPrimary = "inline-flex min-h-11 items-center justify-center rounded-xl bg-yebo px-5 py-2.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-yebo-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yebo focus-visible:ring-offset-2";
const btnDark = "inline-flex min-h-11 items-center justify-center rounded-xl bg-ink px-5 py-2.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-ink/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2";
const btnOutline = "inline-flex min-h-11 items-center justify-center rounded-xl border-2 border-ink/15 px-4 py-2 text-sm font-bold text-ink transition hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yebo focus-visible:ring-offset-2";

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await createClient();
  const { data: d } = await sb.from("documents").select("*,clients(name,email,whatsapp_number)").eq("id", id).single();
  if (!d) notFound();
  const [{ data: biz }, { data: events }, { data: payments }] = await Promise.all([
    sb.from("businesses").select("name,email").single(),
    sb.from("events").select("type,created_at").eq("document_id", id).order("created_at", { ascending: false }),
    sb.from("payments").select("amount_cents").eq("document_id", id),
  ]);
  const client = Array.isArray(d.clients) ? d.clients[0] : d.clients;
  const ent = await entitlement(sb);
  const remindersAllowed = !ent.enforced || Boolean(ent.plan?.reminders);

  const isQuote = d.type === "quote";
  const kind = isQuote ? "quote" : "invoice";
  const clientName: string = client?.name ?? "your client";
  const first = greetingName(client?.name);
  const link = `${appUrl()}/d/${d.public_token}`;
  const msg = `Hi ${first}, here is your ${kind} ${d.number} from ${biz?.name}: ${link}`;
  const businessEmail: string | null = typeof biz?.email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(biz.email.trim()) ? biz.email.trim() : null;

  const amountPaid = (payments ?? []).reduce((total, payment) => total + Number(payment.amount_cents), 0);
  const balanceDue = Math.max(Number(d.total_cents) - amountPaid, 0);
  const isDraft = d.status === "draft";
  const today = southAfricaDate();
  const expired = isQuote && d.expiry_date && d.expiry_date < today;
  const waitingOnQuote = isQuote && (d.status === "sent" || d.status === "viewed") && !expired;
  const waitingOnPayment = !isQuote && !isDraft && d.status !== "paid" && balanceDue > 0;
  const views = (events ?? []).filter((event) => event.type === "viewed");
  const viewsText = views.length ? `Opened ${views.length} time${views.length === 1 ? "" : "s"} · last ${formatSouthAfricaDateTime(views[0].created_at)}` : null;
  const invoiceClaimed = !isQuote && !isDraft && d.status !== "paid" && balanceDue > 0 && (events ?? []).some((event) => event.type === "deposit_claimed");
  const lastEmailed = (events ?? []).find((event) => event.type === "emailed");
  // Deposit on an accepted quote: what is due, what has arrived, and whether the client says they have paid.
  const depositDue = isQuote && d.status === "accepted" ? depositCents(d) : 0;
  const depositOutstanding = Math.max(depositDue - amountPaid, 0);
  const depositClaimed = depositOutstanding > 0 && (events ?? []).some((event) => event.type === "deposit_claimed");

  const reminderMsg = [
    `Hi ${first},`,
    `A friendly reminder from ${biz?.name ?? "our team"} that invoice ${d.number} has an outstanding balance of ${formatRand(balanceDue)}.`,
    d.due_date ? `Due date: ${formatDate(d.due_date)}.` : null,
    `Please use ${d.number} as your payment reference.`,
    "If you have already paid, thank you. Please disregard this reminder.",
    `View invoice: ${link}`,
  ].filter(Boolean).join("\n\n");
  const followUpMsg = [
    `Hi ${first},`,
    `Just checking in on quote ${d.number} for ${formatRand(d.total_cents)} from ${biz?.name ?? "our team"}.`,
    d.expiry_date ? `It is valid until ${formatDate(d.expiry_date)}.` : null,
    `View and accept it here: ${link}`,
    "If you would like anything changed, just reply to this message.",
  ].filter(Boolean).join("\n\n");

  // The single most useful thing to do right now, in plain words.
  let next: { tone: "go" | "wait" | "done" | "stop"; title: string; text: string };
  if (isDraft) next = { tone: "go", title: `Next step: send it to ${first}`, text: `Your ${kind} is saved as a draft and ${first} cannot see it yet. Email it or send it on WhatsApp below.` };
  else if (d.status === "accepted" && depositClaimed) next = { tone: "go", title: `${first} says the deposit is paid`, text: `Check your bank for ${formatRand(depositOutstanding)} with the reference ${d.number}. When it has arrived, tap "Deposit received" below.` };
  else if (d.status === "accepted" && depositOutstanding > 0) next = { tone: "wait", title: `${first} said yes. Waiting for the ${formatRand(depositOutstanding)} deposit`, text: "They can pay it from the quote page, online or by EFT. You will get an email the moment they do. If they paid you another way, record it below." };
  else if (d.status === "accepted" && depositDue > 0) next = { tone: "go", title: `${first} said yes and the deposit is in`, text: "Create the invoice below. The deposit is credited to it automatically, so your client only pays the balance." };
  else if (d.status === "accepted") next = { tone: "go", title: `${first} said yes!`, text: "Turn this accepted quote into an invoice in one tap. The job details carry over, so there is no retyping." };
  else if (d.status === "declined") next = { tone: "stop", title: `${first} declined this quote`, text: "A friendly message asking what they would like changed can win it back. You can also duplicate it, adjust it and send a new one." };
  else if (d.status === "paid") next = { tone: "done", title: "Paid in full. Well done.", text: "Nothing more to do. A quick thank you on WhatsApp goes a long way, and your dashboard has already been updated." };
  else if (expired) next = { tone: "stop", title: "This quote has expired", text: `${first} can no longer accept it. Duplicate it to send a fresh one.` };
  else if (d.status === "sent") next = { tone: "wait", title: `Waiting for ${first} to open it`, text: "You will see it here the moment they do. If you have not heard anything in a day or two, send a gentle follow-up." };
  else if (d.status === "viewed" && isQuote) next = { tone: "wait", title: `${first} has opened your quote`, text: "They are looking at it. If you have not heard back in a couple of days, a friendly follow-up helps." };
  else if (invoiceClaimed) next = { tone: "go", title: `${first} says they have paid`, text: `Check your bank for ${formatRand(balanceDue)} with the reference ${d.number}. When it has arrived, record the payment below. Bank transfers can take a day to show.` };
  else next = { tone: "wait", title: `Waiting for ${first} to pay`, text: `${formatRand(balanceDue)} is still due. Clients can pay online, or by EFT with your reference ${d.number}. A friendly reminder helps if it goes quiet.` };

  const toneClasses = {
    go: "border-yebo/30 bg-lime/25",
    wait: "border-ink/10 bg-white",
    done: "border-yebo/30 bg-lime/35",
    stop: "border-orange/30 bg-orange/10",
  }[next.tone];

  return (
    <main className="mx-auto max-w-xl px-5 py-8">
      <Link href="/app/documents" className="text-sm font-semibold text-ink/50 hover:text-ink">← All documents</Link>
      <h1 className="mt-2 text-2xl font-extrabold">{d.number}</h1>
      <p className="text-ink/65">{clientName} · {formatRand(d.total_cents)} · <b className="capitalize">{String(d.status).replace("_", " ")}</b></p>

      <JourneyStrip steps={journey(d.type, d.status)} />

      <div role="status" className={`fade-up mt-6 rounded-2xl border p-4 ${toneClasses}`}>
        <p className="font-extrabold text-ink">{next.title}</p>
        <p className="mt-1 text-sm leading-6 text-ink/70">{next.text}</p>
        {viewsText && !isDraft && <p className="mt-2 inline-flex rounded-full bg-ink/5 px-3 py-1 text-xs font-bold text-ink/70">👀 {viewsText}</p>}
      </div>

      {/* ---------- 1. SEND ---------- */}
      <Section title={isDraft ? `1 · Send the ${kind} to ${first}` : `Send the ${kind} again`} hint="Pick whichever way suits your client. Both take one tap.">
        <SendEmailCard
          documentId={d.id}
          kind={kind}
          clientName={clientName}
          clientFirstName={first}
          clientEmail={client?.email ?? null}
          businessEmail={businessEmail}
          lastEmailedAt={lastEmailed ? formatSouthAfricaDateTime(lastEmailed.created_at) : null}
        />

        <ActionCard
          icon={<WhatsAppIcon className="size-6 text-[#25D366]" />}
          title="Send on WhatsApp in one tap"
          description={<>WhatsApp opens with the message and the link already written. You read it and tap send. <b>Nothing is sent without you.</b></>}
        >
          <div className="w-full">
            <AiMessageComposer mode="intro" documentId={d.id} whatsappNumber={client?.whatsapp_number ?? null} fallbackMessage={msg} />
          </div>
        </ActionCard>

        {isDraft && (
          <ActionCard
            icon="✓"
            title="I already sent it myself"
            description={<>Use this only if you have already shared the link outside Yebo. It marks the {kind} as <b>sent</b> so you can track it. It does not email or message anyone.</>}
          >
            <form action={sendDraft}>
              <input type="hidden" name="id" value={d.id} />
              <SubmitButton pendingLabel="Marking as sent…" className={btnOutline}>Mark as sent</SubmitButton>
            </form>
          </ActionCard>
        )}
      </Section>

      {/* ---------- 2. SHARE AND CHECK ---------- */}
      <Section title="Share it another way, or see what your client sees">
        <ActionCard
          icon="🔗"
          title="Copy the client link"
          description={`Paste it into any chat or email. Anyone with the link can view the ${kind}${isQuote ? " and accept it" : ""}.`}
        >
          <CopyButton text={link} />
        </ActionCard>
        {!isDraft && (
          <ActionCard icon="📄" title="Download the PDF" description="Save or print a copy for your records. It looks exactly like the PDF your client gets.">
            <a href={`/d/${d.public_token}/pdf`} className={btnOutline}>Download PDF</a>
          </ActionCard>
        )}
        <ActionCard icon="👀" title="See it as your client does" description="Opens the client page in a new tab. Looking at it yourself will not count as your client opening it.">
          <a href={`${link}?preview=1`} target="_blank" rel="noreferrer" className={btnOutline}>Open client view</a>
        </ActionCard>
      </Section>

      {/* ---------- 3. WHAT TO DO NEXT ---------- */}
      {(d.status === "accepted" && isQuote) || waitingOnQuote || waitingOnPayment ? (
        <Section title="What to do next">
          {isQuote && d.status === "accepted" && depositOutstanding > 0 && (
            <ActionCard
              icon="💰"
              title={`Deposit: ${formatRand(depositOutstanding)} still to come`}
              description={`${depositClaimed ? `${first} says they have paid. ` : ""}Payments made online on the quote page are recorded for you automatically. If the deposit reached your bank or you were paid cash, record it here.`}
            >
              <form action={markDepositReceived}>
                <input type="hidden" name="id" value={d.id} /><input type="hidden" name="method" value="eft" />
                <SubmitButton pendingLabel="Recording deposit…" className={btnPrimary}>Deposit received (EFT)</SubmitButton>
              </form>
              <form action={markDepositReceived}>
                <input type="hidden" name="id" value={d.id} /><input type="hidden" name="method" value="cash" />
                <SubmitButton pendingLabel="Recording deposit…" className={btnOutline}>Paid cash</SubmitButton>
              </form>
            </ActionCard>
          )}

          {isQuote && d.status === "accepted" && (
            <ActionCard icon="🧾" title="Create the invoice" description="Makes an invoice from this accepted quote and sends it to the same client page. The job details carry over, so there is no retyping.">
              <form action={convertToInvoice}>
                <input type="hidden" name="id" value={d.id} />
                <SubmitButton pendingLabel="Creating your invoice…" className={btnDark}>Create invoice from this quote</SubmitButton>
              </form>
            </ActionCard>
          )}

          {waitingOnQuote && !remindersAllowed && (
            <ActionCard icon="⏰" title="Reminders are on The Real Business plan" description="Quotes that go quiet are often just forgotten. Upgrade for one-tap reminders with the message already written.">
              <Link href="/app/subscribe?change=1" className={btnOutline}>See the plans</Link>
            </ActionCard>
          )}

          {waitingOnQuote && remindersAllowed && (
            <ActionCard
              icon="⏰"
              title={`Nudge ${first} about this quote`}
              description="Quotes that go quiet are often just forgotten. Opens WhatsApp with a friendly follow-up. You review it and tap send."
            >
              <div id="remind" className="w-full scroll-mt-24">
                <AiMessageComposer mode="quote_followup" documentId={d.id} whatsappNumber={client?.whatsapp_number ?? null} fallbackMessage={followUpMsg} />
              </div>
            </ActionCard>
          )}

          {waitingOnPayment && (
            <>
              {!remindersAllowed ? (
                <ActionCard icon="⏰" title="Reminders are on The Real Business plan" description={`${formatRand(balanceDue)} is still outstanding. Upgrade for one-tap payment reminders with the message already written.`}>
                  <Link href="/app/subscribe?change=1" className={btnOutline}>See the plans</Link>
                </ActionCard>
              ) : (
              <ActionCard
                icon="⏰"
                title={`Remind ${first} to pay`}
                description={`${formatRand(balanceDue)} is still outstanding. Opens WhatsApp with a polite reminder that includes the amount and the payment link. You review it and tap send.`}
              >
                <div id="remind" className="w-full scroll-mt-24">
                  <AiMessageComposer mode="reminder" documentId={d.id} whatsappNumber={client?.whatsapp_number ?? null} fallbackMessage={reminderMsg} balanceLabel={formatRand(balanceDue)} />
                </div>
              </ActionCard>
              )}
              <ActionCard
                icon="💰"
                title="Did they pay you outside Yebo?"
                description="If the client paid by EFT or cash, record it here so your dashboard and targets stay right. Payments made on the client page are recorded for you automatically."
              >
                <form action={markPaid}>
                  <input type="hidden" name="id" value={d.id} /><input type="hidden" name="method" value="eft" />
                  <SubmitButton pendingLabel="Recording payment…" className={btnPrimary}>They paid by EFT</SubmitButton>
                </form>
                <form action={markPaid}>
                  <input type="hidden" name="id" value={d.id} /><input type="hidden" name="method" value="cash" />
                  <SubmitButton pendingLabel="Recording payment…" className={btnOutline}>They paid cash</SubmitButton>
                </form>
              </ActionCard>
            </>
          )}
        </Section>
      ) : null}

      {/* ---------- 4. FIX OR REUSE ---------- */}
      <Section title="Fix or reuse">
        {isDraft && (
          <ActionCard icon="✏️" title="Edit this draft" description="Change the items, prices or details. Your client has not seen it yet, so you can edit freely.">
            <Link href={`/app/documents/${d.id}/edit`} className={btnOutline}>Edit draft</Link>
          </ActionCard>
        )}
        <ActionCard
          icon="📑"
          title="Make a copy"
          description={isDraft ? "Start a new draft from this one, for example for another client." : "Sent documents are locked so your client's copy never changes. To fix a mistake, copy it, correct the copy and send that instead."}
        >
          <form action={duplicateDocument}>
            <input type="hidden" name="id" value={d.id} />
            <SubmitButton pendingLabel="Making a copy…" className={btnOutline}>Duplicate</SubmitButton>
          </form>
        </ActionCard>
        {isDraft && (
          <div className="px-1">
            <ConfirmForm action={deleteDraft} id={d.id} message="Delete this draft? This cannot be undone." label="Delete draft" className="min-h-11 rounded-xl px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50" />
          </div>
        )}
      </Section>

      <h2 className="mt-10 text-xs font-extrabold uppercase tracking-[0.16em] text-ink/50">Activity</h2>
      <ul className="mt-3 divide-y rounded-2xl bg-white text-sm shadow-sm ring-1 ring-black/5">
        {(events ?? []).map((e, i) => (
          <li key={i} className="flex justify-between gap-3 p-3">
            <span className="font-semibold">{EVENT_LABELS[e.type] ?? e.type}</span>
            <span className="shrink-0 text-ink/50">{formatSouthAfricaDateTime(e.created_at)}</span>
          </li>
        ))}
        {!events?.length && <li className="p-3 text-ink/55">Nothing yet. Once you send this {kind}, every step shows up here.</li>}
      </ul>
    </main>
  );
}
