/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { formatRand } from "@/lib/money";
import { formatDate, waLink } from "@/lib/dates";
import { formatSouthAfricaDateTime } from "@/lib/time";
import { appUrl } from "@/lib/url";
import { readableOn } from "@/lib/color";
import { notifyChangeRequested, notifyDepositClaimed, notifyPromise, notifyQuoteAnswered } from "@/lib/notify-quote";
import { depositCents } from "@/lib/deposit";
import { OPTION_LABELS, linesForChoice, optionsPresent, subtotalFor, withVat, type OptionKey } from "@/lib/quote-options";
import { BADGE_LABELS, parseReviews } from "@/lib/trust";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailClientCopy, requestRevive } from "@/lib/quote-followup";
import ViewBeacon from "./ViewBeacon";
import CopyButton from "./CopyButton";
import AnswerBar, { DECLINE_REASONS } from "./AnswerBar";

type Line = { description: string; quantity: number; unit_price_cents: number; line_total_cents: number; option_key?: string | null };

export default async function PublicDocument({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ payment?: string; undo?: string; proof?: string; until?: string }> }) {
  const { token } = await params;
  const { payment, undo, proof, until } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_public_document", { p_token: token });
  if (!data) notFound();

  const { document: d, lines, business: b, client: c } = data as any;
  const isQuote = d.type === "quote";
  const { data: signature } = isQuote && d.status === "accepted" ? await supabase.rpc("get_quote_signature", { p_token: token }) : { data: null };
  const color: string = /^#[0-9a-f]{6}$/i.test(b.brand_color) ? b.brand_color : "#0F8A5F";
  const fg = readableOn(color);
  const { data: links } = d.type === "invoice" || d.type === "credit_note" ? await supabase.rpc("get_credit_links", { p_token: token }) : { data: null };
  const creditsOnInvoice: { number: string; token: string; total_cents: number; issue_date: string }[] = d.type === "invoice" ? (links?.credits ?? []) : [];
  const creditedTotal = creditsOnInvoice.reduce((sum, credit) => sum + Number(credit.total_cents), 0);

  if (d.type === "credit_note") {
    const original = links?.invoice as { number: string; token: string; total_cents: number } | null | undefined;
    return (
      <main className="mx-auto min-h-screen max-w-2xl px-4 py-8 sm:px-6">
        <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-black/5">
          <div className="p-6 sm:p-8" style={{ background: color, color: fg }}>
            <p className="text-xs font-black uppercase tracking-[0.18em] opacity-80">Credit note</p>
            <p className="mt-2 text-4xl font-black tracking-tight">{formatRand(d.total_cents)}</p>
            <p className="mt-1 text-sm opacity-85">{d.number} · {formatDate(d.issue_date)}</p>
          </div>
          <div className="p-6 text-sm sm:p-8">
            <p className="text-ink/70"><b>{b.name}</b> has credited <b>{c?.name}</b>. This lowers the amount owed{original ? <> on invoice <b>{original.number}</b></> : null}.</p>
            {d.note && <p className="mt-4 border-l-4 pl-4 leading-relaxed text-ink/80" style={{ borderColor: color }}>{d.note}</p>}
            <ul className="mt-5 divide-y divide-ink/10">
              {(lines as Line[]).map((l, i) => <li key={i} className="flex items-start justify-between gap-3 py-2"><span>{l.description}</span><b className="shrink-0">{formatRand(l.line_total_cents)}</b></li>)}
            </ul>
            <div className="mt-2 border-t border-ink/10 pt-3">
              <div className="flex justify-between py-1 text-ink/55"><span>Subtotal</span><span>{formatRand(d.subtotal_cents)}</span></div>
              <div className="flex justify-between py-1 text-ink/55"><span>VAT</span><span>{b.vat_registered ? formatRand(d.vat_cents) : "Not applicable"}</span></div>
              <div className="mt-2 flex justify-between rounded-xl px-3 py-3 text-lg font-black" style={{ background: `${color}12` }}><span>Total credit</span><span style={{ color }}>{formatRand(d.total_cents)}</span></div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={`/d/${token}/pdf`} className="inline-flex min-h-11 items-center rounded-xl border-2 border-ink/15 px-4 font-bold">Download PDF</a>
              {original && <a href={`/d/${original.token}`} className="inline-flex min-h-11 items-center rounded-xl border-2 border-ink/15 px-4 font-bold">View invoice {original.number}</a>}
            </div>
            <p className="mt-6 text-xs text-ink/50">{b.name}{b.email ? ` · ${b.email}` : ""}{b.phone ? ` · ${b.phone}` : ""}{b.vat_registered && b.vat_number ? ` · VAT no: ${b.vat_number}` : ""}</p>
          </div>
        </div>
      </main>
    );
  }
  // A revised quote may have replaced this one: the client is sent to the new one instead of answering the old one.
  const adminDb = createAdminClient();
  const { data: me } = isQuote ? await adminDb.from("documents").select("id").eq("public_token", token).maybeSingle() : { data: null };
  const { data: newer } = me ? await adminDb.from("documents").select("public_token,number").eq("revises_id", me.id).neq("status", "draft").order("created_at", { ascending: false }).limit(1).maybeSingle() : { data: null };
  const replacedBy = newer && !["accepted", "paid"].includes(d.status) ? newer : null;
  // "Today" in South Africa, so a quote does not expire a couple of hours early or late.
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(new Date());
  const expired = isQuote && (d.status === "expired" || (["sent", "viewed"].includes(d.status) && d.expiry_date && d.expiry_date < today));
  const canAnswer = isQuote && ["sent", "viewed"].includes(d.status) && !expired && !replacedBy;
  // Good / Better / Best: until the client chooses, the quote shows each option; afterwards only the chosen one.
  const hasOptions = isQuote && Boolean(d.has_options);
  const chosen: string | null = d.chosen_option ?? null;
  const unpaidInvoice = !isQuote && d.status !== "paid" && d.status !== "draft";
  const hasBank = b.bank_account_holder && b.bank_account_number && b.bank_branch_code;
  const showBank = hasBank && (!isQuote || d.status === "accepted");
  const canPayOnline = unpaidInvoice && Boolean(b.online_payments);
  // Photos the business attached. The token has already been checked above, so short-lived links are safe to make.
  const photoLinks: string[] = [];
  try {
    const admin = createAdminClient();
    const { data: photos } = await admin.from("document_photos").select("path").eq("document_id", d.id).order("created_at");
    for (const ph of photos ?? []) {
      const { data: signed } = await admin.storage.from("quote-photos").createSignedUrl(ph.path as string, 3600);
      if (signed?.signedUrl) photoLinks.push(signed.signedUrl);
    }
  } catch { /* photos are optional: the page works without them */ }
  const allLines = lines as Line[];
  const shownLines = hasOptions && chosen ? linesForChoice(allLines, chosen) : allLines;
  const showOptionCards = hasOptions && !chosen;
  const sharedLines = allLines.filter((l) => !l.option_key);
  const optionCards = optionsPresent(allLines).map((key) => ({ key, lines: allLines.filter((l) => l.option_key === key), total: withVat(subtotalFor(allLines, key), Number(d.vat_percent ?? 0)).total }));
  const defaultOption: OptionKey | undefined = optionCards.find((card) => card.key === "better")?.key ?? optionCards[0]?.key;
  // Deposit after acceptance: online with PayFast when the business has it, otherwise by EFT with an "I've paid" button.
  const depositDue = isQuote && d.status === "accepted" ? depositCents(d) : 0;
  const depositOutstanding = Math.max(depositDue - Number(data.paid_cents ?? 0), 0);
  const depositClaimed = Boolean(data.deposit_claimed_at);
  const depositActive = depositDue > 0;
  const payDepositOnline = depositOutstanding > 0 && Boolean(b.online_payments) && depositOutstanding >= 500;
  const badges: string[] = Array.isArray(b.badges) ? (b.badges as string[]).filter((id) => BADGE_LABELS[id]) : [];
  const reviews = parseReviews(b.reviews);
  const googleUrl: string | null = typeof b.google_reviews_url === "string" && /^https:\/\//.test(b.google_reviews_url) ? b.google_reviews_url : null;
  const pageUrl = `${appUrl()}/d/${token}`;
  const shareMessage = `Payment received by ${b.name}: ${formatRand(d.total_cents)} for invoice ${d.number}. Receipt: ${pageUrl}`;
  const qr = await QRCode.toDataURL(pageUrl, { margin: 1, width: 240 });
  const label = isQuote ? "Quote" : b.vat_registered ? "Tax invoice" : "Invoice";
  const web = b.website ? (/^https?:/.test(b.website) ? b.website : `https://${b.website}`) : null;
  const plan = !isQuote ? `Please pay ${formatRand(d.total_cents)} by ${formatDate(d.due_date)}. Use ${d.number} as your payment reference.` : d.payment_plan === "full" ? "Payment in full is needed to confirm the booking."
    : d.payment_plan === "deposit"
      ? (hasOptions && !chosen
        ? `A ${d.deposit_percent}% deposit confirms the booking. The balance is due ${d.payment_terms}.`
        : `A ${d.deposit_percent}% deposit (${formatRand(Math.round((d.total_cents * d.deposit_percent) / 100))}) confirms the booking. The balance is due ${d.payment_terms}.`)
      : `No deposit needed. Full payment is due ${d.payment_terms}.`;

  async function answer(formData: FormData) {
    "use server";
    if (formData.get("event") === "change") {
      const sbc = await createClient();
      const text = String(formData.get("message") ?? "").slice(0, 600);
      const { data: sent } = await sbc.rpc("request_quote_change", { p_token: token, p_body: text });
      if (sent) after(() => notifyChangeRequested(token, text));
      redirect(`/d/${token}?undo=${sent ? "changed" : "failed"}`);
    }
    const ev = formData.get("event") === "accepted" ? "accepted" : "declined";
    const sb = await createClient();
    if (ev === "accepted") {
      // Accepting needs the client's typed name. Without it nothing is accepted.
      const { data: signed } = await sb.rpc("sign_quote", { p_token: token, p_name: String(formData.get("signature") ?? "") });
      if (!signed) redirect(`/d/${token}?undo=sign`);
    }
    if (ev === "accepted" && hasOptions) {
      // The chosen option fixes the quote's total on the server. If that fails, nothing is accepted.
      const { error: chooseError } = await sb.rpc("choose_quote_option", { p_token: token, p_option: String(formData.get("option") ?? "") });
      if (chooseError) { revalidatePath(`/d/${token}`); return; }
    }
    await sb.rpc("record_document_event", { p_token: token, p_event: ev });
    // Only the listed reasons are accepted, so nothing typed by a stranger ends up in the owner's email.
    const rawReason = String(formData.get("reason") ?? "");
    const reason = ev === "declined" && DECLINE_REASONS[rawReason] ? DECLINE_REASONS[rawReason] : undefined;
    if (reason) await sb.rpc("set_decline_reason", { p_token: token, p_reason: rawReason });
    // Email the owner after the response is sent, so the client's tap is not slowed down.
    after(() => notifyQuoteAnswered(token, ev, reason));
    after(() => emailClientCopy(token, ev));
    revalidatePath(`/d/${token}`);
  }

  async function claimDeposit() {
    "use server";
    const sb = await createClient();
    const { data: isNew } = await sb.rpc("claim_deposit_paid", { p_token: token });
    if (isNew) after(() => notifyDepositClaimed(token));
    revalidatePath(`/d/${token}`);
  }

  const invoiceBalance = Math.max(Number(d.total_cents) - Number(data.paid_cents ?? 0), 0);
  const invoiceClaimed = unpaidInvoice && Boolean(data.deposit_claimed_at);

  async function promise(formData: FormData) {
    "use server";
    const date = String(formData.get("date") ?? "");
    const sb = await createClient();
    const { data: ok } = /^\d{4}-\d{2}-\d{2}$/.test(date) ? await sb.rpc("promise_to_pay", { p_token: token, p_date: date }) : { data: false };
    if (ok) after(() => notifyPromise(token, date));
    redirect(`/d/${token}?undo=${ok ? "promised" : "nodate"}${ok ? `&until=${date}` : ""}`);
  }

  async function revive() {
    "use server";
    const ok = await requestRevive(token);
    redirect(`/d/${token}?undo=${ok ? "revived" : "failed"}`);
  }

  async function reopen() {
    "use server";
    const sb = await createClient();
    const { data: ok } = await sb.rpc("reopen_declined_quote", { p_token: token });
    revalidatePath(`/d/${token}`);
    redirect(`/d/${token}${ok ? "" : "?undo=late"}`);
  }

  const bar = "fixed inset-x-0 bottom-0 z-20 flex gap-3 border-t border-black/10 bg-white/95 p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] backdrop-blur md:static md:mt-6 md:border-0 md:bg-transparent md:p-0 md:pb-0";
  const soft = { background: fg === "#ffffff" ? "rgba(0,0,0,.2)" : "rgba(255,255,255,.55)" };
  const Row = ({ k, v, copy }: { k: string; v: string; copy?: string }) => (<div className="flex items-center justify-between gap-4 py-1.5"><dt className="text-ink/55">{k}</dt><dd className="flex items-center text-right font-semibold">{v}{copy && <CopyButton value={copy} label={k.toLowerCase()} />}</dd></div>);

  return (
    <main className="min-h-dvh bg-paper pb-28 text-ink md:pb-12">
      <ViewBeacon token={token} />
      {/* header: colours come from the business's logo */}
      <div className="px-5 pb-16 pt-6 md:pb-20" style={{ background: color, color: fg }}>
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white p-2 text-xl font-black shadow-sm" style={{ color }}>
                {b.logo_url ? <img src={b.logo_url} alt="" className="block max-h-full max-w-full object-contain" /> : String(b.name)[0]}
              </span>
              <div className="min-w-0"><p className="truncate text-lg font-black leading-tight">{b.name}</p><p className="text-xs opacity-80">{label} {d.number}</p></div>
            </div>
            <a href={`/d/${token}/pdf`} className="shrink-0 rounded-full px-3.5 py-2 text-xs font-bold" style={soft}>Download PDF</a>
          </div>
          <div className="mt-7 border-t border-current/20 pt-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] opacity-75">{isQuote ? "Prepared for" : "Invoice for"} {c.name}</p>
            <h1 className="mt-2 max-w-2xl text-3xl font-black leading-tight tracking-tight sm:text-4xl">{d.title || (isQuote ? "A clear plan for your project" : label)}</h1>
            <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] opacity-75">{isQuote ? "Estimated total" : "Amount due"}</p>
                <p className="mt-1 text-4xl font-black tracking-tight sm:text-5xl">{showOptionCards && optionCards.length > 1 && <span className="mr-2 text-lg font-bold opacity-75">From</span>}{formatRand(d.total_cents)}</p>
              </div>
              <p className="rounded-full px-3 py-1.5 text-xs font-bold" style={soft}>{isQuote ? `Valid until ${formatDate(d.expiry_date)}` : `Due ${formatDate(d.due_date)}`}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto -mt-8 max-w-2xl px-4">
        <article className="rounded-3xl bg-white p-5 shadow-xl ring-1 ring-black/5 sm:p-7">
          {d.status === "accepted" && (
            <div className="mb-5 rounded-2xl bg-lime p-3 text-center">
              <p className="font-black">Yebo! Quote accepted. Thank you.</p>
              {signature?.name && <p className="mt-1 text-sm">Signed by <b>{signature.name}</b> on {formatSouthAfricaDateTime(signature.at)}</p>}
              <p className="mt-1 text-sm font-semibold">{b.name} has been told{depositOutstanding > 0 ? ". Pay the deposit below to confirm your booking." : " and will be in touch about the next steps."}</p>
              <ol className="mx-auto mt-2 max-w-xs list-decimal space-y-0.5 pl-5 text-left text-xs">
                {depositOutstanding > 0 && <li>Pay the deposit to lock in your date</li>}
                <li>{b.name} contacts you to agree the date</li>
                <li>The job is done, then you receive the invoice</li>
              </ol>
            </div>
          )}
          {d.status === "declined" && (
            <div className="mb-5 rounded-2xl bg-ink/5 p-3 text-center">
              <p className="font-bold">You declined this quote.</p>
              {undo === "late" && <p role="status" className="mt-1 text-sm">This can no longer be undone here. Please message {b.name} instead.</p>}
              <form action={reopen} className="mt-2"><button type="submit" className="inline-flex min-h-10 items-center rounded-full border border-ink/20 bg-white px-4 text-sm font-bold">Undo, I changed my mind</button></form>
              {b.phone && <a href={waLink(b.phone, `Hi, about quote ${d.number}: I would like to talk about changing it.`)} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-10 items-center rounded-full bg-white px-4 text-sm font-bold">Changed your mind? Message {b.name}</a>}
            </div>
          )}
          {d.status === "paid" && (
            <div className="mb-5 rounded-2xl bg-lime p-3 text-center">
              <p className="font-black">Paid. Thank you!</p>
              {!isQuote && (
                <a href={waLink(null, shareMessage)} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-10 items-center rounded-full bg-white/70 px-4 text-sm font-bold">
                  Share receipt on WhatsApp
                </a>
              )}
              {!isQuote && googleUrl && (
                <a href={googleUrl} target="_blank" rel="noopener noreferrer" className="mt-2 ml-2 inline-flex min-h-10 items-center rounded-full bg-white/70 px-4 text-sm font-bold">
                  Happy with the service? Leave a review
                </a>
              )}
            </div>
          )}
          {undo === "sign" && <p role="alert" className="mb-5 rounded-2xl bg-orange/15 p-3 text-center text-sm font-bold">Please type your full name to accept the quote.</p>}
          {undo === "promised" && until && /^\d{4}-\d{2}-\d{2}$/.test(until) && <p role="status" className="mb-5 rounded-2xl bg-lime p-3 text-center text-sm font-bold">Thanks! {b.name} knows you will pay by {formatDate(until)}.</p>}
          {undo === "nodate" && <p role="alert" className="mb-5 rounded-2xl bg-orange/15 p-3 text-center text-sm font-bold">Please pick a date between tomorrow and 30 days from now.</p>}
          {undo === "changed" && <p role="status" className="mb-5 rounded-2xl bg-lime p-3 text-center text-sm font-bold">Thanks! {b.name} has your message and will update the quote or get back to you.</p>}
          {undo === "failed" && <p role="alert" className="mb-5 rounded-2xl bg-orange/15 p-3 text-center text-sm font-bold">We could not send that message. Please try again, or contact {b.name} directly.</p>}
          {replacedBy && (
            <div className="mb-5 rounded-2xl bg-orange/15 p-3 text-center text-sm font-bold">
              <p>{b.name} sent you an updated quote ({replacedBy.number}). This older one can no longer be accepted.</p>
              <a href={`/d/${replacedBy.public_token}`} className="mt-2 inline-flex min-h-11 items-center rounded-full px-5 font-black" style={{ background: color, color: fg }}>See the updated quote</a>
            </div>
          )}
          {undo === "revived" && <p role="status" className="mb-5 rounded-2xl bg-lime p-3 text-center text-sm font-bold">Thanks! {b.name} knows you still want this and will send you a fresh quote or extend this one.</p>}
          {expired && !replacedBy && (
            <div className="mb-5 rounded-2xl bg-orange/15 p-3 text-center text-sm font-bold">
              <p>This quote has expired. Please contact {b.name} for an updated one.</p>
              <form action={revive} className="mt-2"><button type="submit" className="inline-flex min-h-11 items-center rounded-full px-5 font-black" style={{ background: color, color: fg }}>Yes, I still want this</button></form>
              {b.phone && <a href={waLink(b.phone, `Hi, quote ${d.number} has expired. Could you send me an updated one?`)} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-10 items-center rounded-full bg-white px-4">Ask for an updated quote</a>}
            </div>
          )}
          {unpaidInvoice && d.due_date && d.due_date < today && <p role="note" className="mb-5 rounded-2xl bg-orange/15 p-3 text-center text-sm font-bold">This invoice was due on {formatDate(d.due_date)}. Please pay as soon as you can, or contact {b.name} if there is a problem.</p>}
          {payment === "cancelled" && unpaidInvoice && <p role="status" className="mb-5 rounded-2xl bg-ink/5 p-3 text-center text-sm font-bold">Your payment was cancelled and you have not been charged. You can try again whenever you are ready.</p>}
          {canPayOnline && b.payments_sandbox && <p role="note" className="mb-5 rounded-2xl bg-orange/15 p-3 text-center text-sm font-bold">Test mode: payments on this page are practice only and no real money will be taken.</p>}

          {(d.location || d.job_date || d.job_date_tbd) && (
            <section className="rounded-2xl border border-ink/10 bg-paper/60 p-4">
              <h2 className="text-[10px] font-bold uppercase tracking-[.14em] text-ink/45">{isQuote ? "Project details" : "Job details"}</h2>
              <dl className="mt-1 text-sm">
                {d.location && <Row k="Where" v={d.location} />}
                {(d.job_date || d.job_date_tbd) && <Row k="When" v={d.job_date_tbd ? "To be agreed" : formatDate(d.job_date)} />}
              </dl>
            </section>
          )}
          {photoLinks.length > 0 && (
            <section className="mt-5" aria-label="Photos">
              <h2 className="text-xs font-bold uppercase tracking-[.14em] text-ink/45">Photos</h2>
              <ul className="mt-2 grid grid-cols-3 gap-2">
                {photoLinks.map((url) => (
                  <li key={url} className="aspect-square overflow-hidden rounded-xl bg-ink/5">
                    <a href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt={`Photo from ${b.name}`} loading="lazy" className="size-full object-cover" /></a>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {d.note && <p className="mt-4 border-l-4 pl-4 text-sm leading-relaxed text-ink/80" style={{ borderColor: color }}>{d.note}</p>}
          {d.description && (<section className="mt-6"><h2 className="text-xs font-bold uppercase tracking-[.14em] text-ink/45">{isQuote ? "What is included" : "What you will get"}</h2><p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink/80">{d.description}</p></section>)}
          {isQuote && d.exclusions && (<section className="mt-5"><h2 className="text-xs font-bold uppercase tracking-[.14em] text-ink/45">Not included</h2><p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink/80">{d.exclusions}</p></section>)}
          {isQuote && d.assumptions && (<section className="mt-5"><h2 className="text-xs font-bold uppercase tracking-[.14em] text-ink/45">Assumptions</h2><p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink/80">{d.assumptions}</p></section>)}
          {isQuote && d.timeline && (<section className="mt-5"><h2 className="text-xs font-bold uppercase tracking-[.14em] text-ink/45">Timeline</h2><p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink/80">{d.timeline}</p></section>)}
          {d.labour_only && <p className="mt-3 inline-block rounded-full bg-ink/5 px-3 py-1 text-xs font-bold">No materials needed for this job</p>}

          <section className="mt-6">
            <h2 className="text-xs font-bold uppercase tracking-[.14em] text-ink/45">{isQuote ? "Investment breakdown" : "Invoice breakdown"}</h2>
            {showOptionCards ? (
              <>
                {sharedLines.length > 0 && (
                  <>
                    <p className="mt-3 text-xs font-bold text-ink/55">Included in every option</p>
                    <ul className="mt-1 divide-y divide-ink/10">
                      {sharedLines.map((l, i) => (
                        <li key={i} className="flex items-start justify-between gap-4 py-3 text-sm">
                          <span className="font-semibold">{l.description}{Number(l.quantity) !== 1 && <span className="mt-1 block text-xs font-normal text-ink/50">Qty {Number(l.quantity)} × {formatRand(l.unit_price_cents)}</span>}</span>
                          <b className="shrink-0">{formatRand(l.line_total_cents)}</b>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                <p className="mt-5 text-xs font-bold text-ink/55">{canAnswer ? "Choose your option, then tap Accept" : "Options"}</p>
                <div className="mt-2 grid gap-3">
                  {optionCards.map((card) => (
                    <label key={card.key} className={`relative block rounded-2xl border border-ink/15 p-4 ${canAnswer ? "cursor-pointer" : ""}`}>
                      {canAnswer && <input type="radio" name="option" value={card.key} form="answer-form" defaultChecked={card.key === defaultOption} className="absolute right-4 top-4 size-5" style={{ accentColor: color }} />}
                      <span className="block text-base font-black" style={{ color }}>{OPTION_LABELS[card.key]}</span>
                      <ul className="mt-2 divide-y divide-ink/10 text-sm">
                        {card.lines.map((l, i) => (
                          <li key={i} className="flex items-start justify-between gap-4 py-2.5">
                            <span className="font-semibold">{l.description}{Number(l.quantity) !== 1 && <span className="mt-1 block text-xs font-normal text-ink/50">Qty {Number(l.quantity)} × {formatRand(l.unit_price_cents)}</span>}</span>
                            <b className="shrink-0">{formatRand(l.line_total_cents)}</b>
                          </li>
                        ))}
                      </ul>
                      <span className="mt-3 flex justify-between border-t border-ink/10 pt-3 text-sm"><span className="text-ink/55">{b.vat_registered ? "Total incl. VAT" : "Total"}</span><b className="text-lg" style={{ color }}>{formatRand(card.total)}</b></span>
                    </label>
                  ))}
                </div>
              </>
            ) : (
              <>
                {hasOptions && chosen && <p className="mt-2 inline-block rounded-full bg-ink/5 px-3 py-1 text-xs font-bold">Option chosen: {OPTION_LABELS[chosen as OptionKey] ?? chosen}</p>}
                <ul className="mt-2 divide-y divide-ink/10">
                  {shownLines.map((l, i) => (
                    <li key={i} className="flex items-start justify-between gap-4 py-4 text-sm">
                      <span className="font-semibold">{l.description}{Number(l.quantity) !== 1 && <span className="mt-1 block text-xs font-normal text-ink/50">Qty {Number(l.quantity)} × {formatRand(l.unit_price_cents)}</span>}</span>
                      <b className="shrink-0">{formatRand(l.line_total_cents)}</b>
                    </li>
                  ))}
                </ul>
                <div className="mt-1 border-t border-ink/10 pt-3 text-sm">
                  <div className="flex justify-between py-1 text-ink/55"><span>Subtotal</span><span>{formatRand(d.subtotal_cents)}</span></div>
                  <div className="flex justify-between py-1 text-ink/55"><span>VAT</span><span>{b.vat_registered ? formatRand(d.vat_cents) : "Not applicable"}</span></div>
                  <div className="mt-2 flex justify-between rounded-xl px-3 py-3 text-lg font-black" style={{ background: `${color}12` }}><span>Total</span><span style={{ color }}>{formatRand(d.total_cents)}</span></div>
                  {creditsOnInvoice.map((credit) => (
                    <div key={credit.token} className="flex justify-between px-3 py-1 text-ink/70"><a className="underline" href={`/d/${credit.token}`}>Credit note {credit.number}</a><span>-{formatRand(credit.total_cents)}</span></div>
                  ))}
                  {creditedTotal > 0 && <div className="flex justify-between px-3 py-1 font-bold"><span>Amount now owed</span><span>{formatRand(Math.max(Number(d.total_cents) - Number(data.paid_cents ?? 0), 0))}</span></div>}
                </div>
              </>
            )}
          </section>

          <section className="mt-5 rounded-2xl p-4 text-sm" style={{ background: `${color}1A` }}>
            <b className="block">{isQuote ? "Payment & booking terms" : "How payment works"}</b><span className="mt-0.5 block leading-relaxed">{plan}</span>
          </section>

          {depositActive && (
            <section id="pay" className="mt-5 rounded-2xl border-2 p-4 text-sm" style={{ borderColor: color }}>
              {depositOutstanding <= 0 ? (
                <>
                  <b className="block text-base">Deposit received. Thank you!</b>
                  <p className="mt-1 leading-relaxed text-ink/75">{b.name} has your deposit and will be in touch to confirm your booking.</p>
                </>
              ) : (
                <>
                  <b className="block text-base">{d.payment_plan === "full" ? "Pay to confirm your booking" : "Pay your deposit to confirm your booking"}</b>
                  <p className="mt-1 text-2xl font-black" style={{ color }}>{formatRand(depositOutstanding)}</p>
                  {payDepositOnline && (
                    <form method="post" action={`/d/${token}/pay`} className="mt-3">
                      <button type="submit" className="min-h-12 w-full rounded-2xl px-4 text-base font-black active:scale-[.98]" style={{ background: color, color: fg }}>Pay {formatRand(depositOutstanding)} online</button>
                      <p className="mt-2 text-center text-xs text-ink/55">Card or instant EFT. You come straight back here when you are done.</p>
                    </form>
                  )}
                  {hasBank ? (
                    <div className="mt-4 border-t border-ink/10 pt-3">
                      <b className="block">{payDepositOnline ? "Or pay by EFT" : "Pay by EFT"}</b>
                      <dl className="mt-1">
                        <Row k="Amount" v={formatRand(depositOutstanding)} copy={(depositOutstanding / 100).toFixed(2)} />
                        <Row k="Account holder" v={b.bank_account_holder} /><Row k="Bank" v={`${b.bank_name ?? ""} ${b.bank_account_type ?? ""}`.trim()} />
                        <Row k="Account number" v={b.bank_account_number} copy={String(b.bank_account_number)} /><Row k="Branch code" v={b.bank_branch_code} copy={String(b.bank_branch_code)} /><Row k="Reference" v={d.number} copy={String(d.number)} />
                      </dl>
                      {depositClaimed ? (
                        <p role="status" className="mt-3 rounded-xl bg-lime p-3 text-center text-sm font-bold">Thanks! {b.name} has been told and will confirm once the money reaches their account.</p>
                      ) : (
                        <form action={claimDeposit} className="mt-3">
                          <button type="submit" className="min-h-12 w-full rounded-2xl border border-black/15 px-4 text-sm font-black active:scale-[.98]">I have paid the deposit by EFT</button>
                          <p className="mt-2 text-center text-xs text-ink/55">Tap this after you have paid, so {b.name} knows to look for it.</p>
                        </form>
                      )}
                    </div>
                  ) : !payDepositOnline ? (
                    <p className="mt-2 leading-relaxed text-ink/75">Please contact {b.name} to arrange the payment{b.phone ? ` on ${b.phone}` : ""}.</p>
                  ) : null}
                </>
              )}
            </section>
          )}

          {isQuote && (b.year_started || b.about || badges.length > 0 || reviews.length > 0 || googleUrl || (Array.isArray(b.work_photos) && b.work_photos.length > 0)) && (
            <section className="mt-5 rounded-2xl border border-ink/10 p-4 text-sm">
              <h2 className="text-[10px] font-bold uppercase tracking-[.14em] text-ink/45">Why hire {b.name}</h2>
              {(b.year_started || badges.length > 0) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {b.year_started && <span className="rounded-full bg-ink/5 px-3 py-1 text-xs font-bold">Trading since {b.year_started}</span>}
                  {badges.map((id) => <span key={id} className="rounded-full bg-ink/5 px-3 py-1 text-xs font-bold">{BADGE_LABELS[id]}</span>)}
                </div>
              )}
              {b.about && <p className="mt-3 leading-relaxed text-ink/80">{b.about}</p>}
              {Array.isArray(b.work_photos) && b.work_photos.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-bold text-ink/55">Recent work</p>
                  <ul className="mt-2 grid grid-cols-3 gap-2">
                    {(b.work_photos as string[]).map((url) => (
                      <li key={url} className="aspect-square overflow-hidden rounded-xl bg-ink/5">
                        <a href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt={`Recent work by ${b.name}`} loading="lazy" className="size-full object-cover" /></a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {reviews.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-bold text-ink/55">From past customers</p>
                  <ul className="mt-2 grid gap-3">
                    {reviews.map((r, i) => (
                      <li key={i} className="rounded-xl bg-paper/60 p-3">
                        <p className="leading-relaxed text-ink/80">“{r.text}”</p>
                        <p className="mt-1.5 text-xs font-bold text-ink/55">{r.name}{r.place ? `, ${r.place}` : ""}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {googleUrl && <a href={googleUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-10 items-center rounded-full border border-ink/15 px-4 text-xs font-bold" style={{ color }}>See our Google reviews</a>}
              <p className="mt-3 text-[11px] text-ink/40">Details provided by {b.name}.</p>
            </section>
          )}

          {unpaidInvoice && !invoiceClaimed && (() => {
            const plus = (n: number) => { const [y, m, dd] = today.split("-").map(Number); return new Date(Date.UTC(y, m - 1, dd + n)).toISOString().slice(0, 10); };
            return (
              <details className="mt-5 rounded-2xl border border-ink/10 p-4 text-sm">
                <summary className="cursor-pointer font-bold">Cannot pay today?</summary>
                <form action={promise} className="mt-3">
                  <label className="block text-xs font-bold text-ink/60">Tell {b.name} the day you will pay
                    <input type="date" name="date" required min={plus(1)} max={plus(30)} defaultValue={plus(7)} className="mt-1 block min-h-12 w-full rounded-xl border border-ink/20 px-3 text-base font-normal" />
                  </label>
                  <button type="submit" className="mt-3 min-h-12 w-full rounded-2xl border border-black/15 px-4 text-sm font-black active:scale-[.98]">I will pay on this day</button>
                  <p className="mt-2 text-center text-xs text-ink/55">{b.name} will not send reminders before then.</p>
                </form>
              </details>
            );
          })()}

          {showBank && !depositActive && (
            <section id="pay" className="mt-5 rounded-2xl border border-ink/10 p-4 text-sm">
              <b className="block">Pay by EFT</b>
              <dl className="mt-1">
                <Row k="Account holder" v={b.bank_account_holder} /><Row k="Bank" v={`${b.bank_name ?? ""} ${b.bank_account_type ?? ""}`.trim()} />
                {unpaidInvoice && invoiceBalance > 0 && <Row k="Amount" v={formatRand(invoiceBalance)} copy={(invoiceBalance / 100).toFixed(2)} />}
                <Row k="Account number" v={b.bank_account_number} copy={String(b.bank_account_number)} /><Row k="Branch code" v={b.bank_branch_code} copy={String(b.bank_branch_code)} /><Row k="Reference" v={d.number} copy={String(d.number)} />
              </dl>
              {unpaidInvoice && (
                invoiceClaimed ? (
                  <>
                    <p role="status" className="mt-3 rounded-xl bg-lime p-3 text-center text-sm font-bold">Thanks! {b.name} has been told and will confirm once the money reaches their account.</p>
                    <form method="post" action={`/d/${token}/proof`} encType="multipart/form-data" className="mt-3">
                      <label className="block text-xs font-bold text-ink/55">Want to add your proof of payment?
                        <input type="file" name="file" required accept="image/jpeg,image/png,image/webp,application/pdf" className="mt-1 block w-full text-sm font-normal file:mr-3 file:min-h-10 file:rounded-xl file:border file:border-ink/15 file:bg-white file:px-3 file:font-bold" />
                      </label>
                      <button type="submit" className="mt-2 min-h-11 w-full rounded-2xl border border-black/15 px-4 text-sm font-bold">Send proof of payment</button>
                      {proof === "bad" && <p role="alert" className="mt-2 rounded-xl bg-orange/15 p-2 text-center text-xs font-bold">That file could not be used. Send a photo or PDF under 5 MB.</p>}
                    </form>
                  </>
                ) : (
                  <form method="post" action={`/d/${token}/proof`} encType="multipart/form-data" className="mt-3">
                    <label className="block text-xs font-bold text-ink/55">Attach your proof of payment (optional)
                      <input type="file" name="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="mt-1 block w-full text-sm font-normal file:mr-3 file:min-h-10 file:rounded-xl file:border file:border-ink/15 file:bg-white file:px-3 file:font-bold" />
                    </label>
                    <button type="submit" className="mt-3 min-h-12 w-full rounded-2xl border border-black/15 px-4 text-sm font-black active:scale-[.98]">I have paid by EFT</button>
                    <p className="mt-2 text-center text-xs text-ink/55">Tap this after you have paid, so {b.name} knows to look for it.</p>
                    {proof === "bad" && <p role="alert" className="mt-2 rounded-xl bg-orange/15 p-2 text-center text-xs font-bold">That file could not be used. Send a photo or PDF under 5 MB.</p>}
                  </form>
                )
              )}
            </section>
          )}

          <section className="mt-6 border-t border-ink/10 pt-5 text-sm">
            <h2 className="text-xs font-bold uppercase tracking-[.14em] text-ink/45">About {b.name}</h2>
            <p className="mt-2 text-ink/70">{b.address}</p>
            <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 font-semibold">
              {b.phone && <a href={`tel:${String(b.phone).replace(/\s/g, "")}`} style={{ color }}>{b.phone}</a>}
              {b.email && <a href={`mailto:${b.email}`} style={{ color }}>{b.email}</a>}
              {web && <a href={web} style={{ color }}>{b.website}</a>}
            </p>
            <p className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
              <span className="rounded-full bg-ink/5 px-3 py-1">{b.company_reg ? `Reg. ${b.company_reg}` : "Sole proprietor"}</span>
              <span className="rounded-full bg-ink/5 px-3 py-1">{b.vat_registered ? `VAT ${b.vat_number}` : "Not VAT registered"}</span>
              {b.guarantee_months && <span className="rounded-full bg-lime px-3 py-1">{b.guarantee_months}-month guarantee</span>}
            </p>
          </section>

          <section className="mt-6 hidden items-center gap-4 rounded-2xl border border-ink/10 p-4 md:flex">
            <img src={qr} alt="QR code for this page" className="size-24" />
            <p className="text-sm"><b className="block">Scan to open this on your phone</b><span className="text-ink/55">Reference {d.number}</span></p>
          </section>

          {canAnswer && (
            <AnswerBar
              action={answer}
              color={color}
              fg={fg}
              total={formatRand(d.total_cents)}
              businessName={b.name}
              askHref={b.phone ? waLink(b.phone, `Hi, I have a question about ${isQuote ? "quote" : "invoice"} ${d.number}.`) : null}
              optionLabels={OPTION_LABELS}
              barClass={bar}
            />
          )}
          {depositActive && depositOutstanding > 0 && (
            <div className={bar}>
              {payDepositOnline ? (
                <form method="post" action={`/d/${token}/pay`} className="flex-1">
                  <button type="submit" className="min-h-12 w-full rounded-2xl px-4 text-base font-black active:scale-[.98]" style={{ background: color, color: fg }}>Pay deposit</button>
                </form>
              ) : (
                <a href="#pay" className="grid min-h-12 flex-1 place-items-center rounded-2xl px-4 text-base font-black" style={{ background: color, color: fg }}>Pay deposit</a>
              )}
              <a href={`/d/${token}/pdf`} className="hidden min-h-12 flex-1 place-items-center rounded-2xl border border-black/15 px-4 text-sm font-bold sm:grid">Download PDF</a>
            </div>
          )}
          {unpaidInvoice && (
            <div className={bar}>
              {canPayOnline && (
                <form method="post" action={`/d/${token}/pay`} className="flex-1">
                  <button type="submit" className="min-h-12 w-full rounded-2xl px-4 text-base font-black active:scale-[.98]" style={{ background: color, color: fg }}>Pay now</button>
                </form>
              )}
              {showBank && (
                <a
                  href="#pay"
                  className={canPayOnline
                    ? "grid min-h-12 flex-1 place-items-center rounded-2xl border border-black/15 px-4 text-sm font-bold"
                    : "grid min-h-12 flex-1 place-items-center rounded-2xl px-4 text-base font-black"}
                  style={canPayOnline ? undefined : { background: color, color: fg }}
                >
                  Pay by EFT
                </a>
              )}
              <a
                href={`/d/${token}/pdf`}
                className={`${canPayOnline ? "hidden sm:grid" : "grid"} min-h-12 flex-1 place-items-center rounded-2xl border border-black/15 px-4 text-sm font-bold`}
              >
                Download PDF
              </a>
            </div>
          )}
        </article>
      </div>
    </main>
  );
}
