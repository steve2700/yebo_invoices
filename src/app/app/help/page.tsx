import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SUPPORT, supportMessage, supportOpen } from "@/lib/support";

const answers = [
  ["How do I send a quote?", "Create it with New quote, then open it from Documents. Email it to your client or send it on WhatsApp in one tap. Nothing is sent until you tap."],
  ["My client says they have paid. What now?", "Open the invoice. If they tapped “I have paid” or uploaded proof, you will see it at the top. Check your bank, then tap Mark as paid."],
  ["I made a mistake on an invoice.", "If it is not fully paid, open it and use Credit notes to lower the amount. It gets its own number and PDF. A paid invoice cannot be credited here, so contact us."],
  ["A client declined or wants a change.", "Open the quote. You will see the reason or the change they asked for. Reopen it, edit it and send the updated version."],
  ["How do I change my bank details, logo or VAT number?", "Go to Settings. Your logo, colour, bank details and VAT number are all there, and they update on new documents straight away."],
  ["How do I change or cancel my plan?", "Go to Settings, then Manage plan. You can change plan any time, and cancelling keeps your access until the end of the month you paid for."],
];

export default async function Help() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: business } = await supabase.from("businesses").select("name").maybeSingle();
  const open = supportOpen();
  const message = supportMessage(business?.name ?? null, user.email ?? null);
  const whatsapp = `https://wa.me/${SUPPORT.whatsappDigits}?text=${encodeURIComponent(message)}`;
  const mail = `mailto:${SUPPORT.email}?subject=${encodeURIComponent(`Help needed: ${business?.name ?? "Yebo account"}`)}&body=${encodeURIComponent(`${message}\n\n`)}`;
  const btn = "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-extrabold transition";

  return (
    <main className="mx-auto max-w-2xl px-5 py-8 sm:px-8">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange">Help</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-ink">We are here to help</h1>
      <p className="mt-2 text-sm text-ink/60">Stuck, or something not working? Talk to a person.</p>

      <section aria-label="Contact support" className="mt-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5 sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-yebo">Support hours</p>
            <p className="mt-1 text-lg font-black">{SUPPORT.hoursText}</p>
          </div>
          <span role="status" className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-extrabold ${open ? "bg-lime text-ink" : "bg-ink/8 text-ink/65"}`}>
            {open ? "Open now" : "Closed right now"}
          </span>
        </div>
        {!open && <p className="mt-2 text-sm text-ink/60">You can still send a message. We reply when we are back at {SUPPORT.openHour}am.</p>}

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <a href={`tel:${SUPPORT.phoneTel}`} className={`${btn} bg-ink text-white hover:bg-ink/85`}>Call {SUPPORT.phoneDisplay}</a>
          <a href={whatsapp} target="_blank" rel="noreferrer" className={`${btn} bg-[#25D366] text-ink hover:brightness-95`}>WhatsApp us</a>
          <a href={mail} className={`${btn} border-2 border-ink/15 text-ink hover:bg-paper`}>Email us</a>
        </div>
        <p className="mt-4 text-xs leading-5 text-ink/55">
          Phone: <b>{SUPPORT.phoneDisplay}</b> · Email: <b>{SUPPORT.email}</b>. WhatsApp and email open with your business name and account email already filled in, so we can find you quickly.
        </p>
      </section>

      <section aria-label="Quick answers" className="mt-8">
        <h2 className="text-lg font-extrabold text-ink">Quick answers</h2>
        <div className="mt-3 flex flex-col gap-3">
          {answers.map(([q, a]) => (
            <details key={q} className="group rounded-2xl border border-ink/10 bg-white px-5 shadow-sm">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-sm font-bold text-ink [&::-webkit-details-marker]:hidden">
                {q}
                <span aria-hidden="true" className="text-xl text-ink/40 transition group-open:rotate-45">+</span>
              </summary>
              <p className="pb-4 pr-6 text-sm leading-6 text-ink/70">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <div className="mt-8 flex flex-wrap gap-4 text-sm font-semibold text-ink/50">
        <Link href="/app" className="hover:text-orange">← Dashboard</Link>
        <Link href="/how-it-works" className="hover:text-orange">How Yebo works</Link>
        <Link href="/privacy" className="hover:text-orange">Privacy</Link>
      </div>
    </main>
  );
}
