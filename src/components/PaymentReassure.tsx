import { PLANS } from "@/lib/plans";

const WHATSAPP_URL = "https://wa.me/27693824908?text=" + encodeURIComponent("Hi Yebo, I need a hand with choosing or paying for a plan.");

// The block that answers "what if I get it wrong?" right where people decide.
// Every line here is true: cancelling keeps access to the end of the paid month, switching carries paid days over.
export default function PaymentReassure({ onboarding }: { onboarding: boolean }) {
  const items = [
    { title: "Cancel any time", body: "One tap in Settings. You keep access until the end of the month you paid for." },
    { title: "Change plan any time", body: "Go up or down whenever you like. The days you already paid for carry over, nothing is wasted." },
    { title: "Safe payment", body: "You pay through Paystack. Yebo never sees or stores your card details." },
    { title: "Card not working?", body: "Pay by EFT instead, or message us and we will sort it out with you." },
  ];
  return (
    <section aria-label="Before you pay" className="mt-8 max-w-5xl rounded-2xl bg-yebo-deep p-5 text-white sm:p-6">
      <p className="text-xs font-extrabold uppercase tracking-[.18em] text-lime">{onboarding ? "Not sure yet? That is fine." : "No lock-in"}</p>
      <h2 className="mt-2 text-xl font-black leading-tight tracking-[-.02em] sm:text-2xl">
        {onboarding ? `Start on ${"R" + PLANS.side.priceRand} and move up only when you need to.` : "You can always change your mind."}
      </h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <li key={item.title} className="flex items-start gap-2.5 rounded-xl bg-white/10 p-3.5">
            <span aria-hidden="true" className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-lime text-xs font-black text-ink">✓</span>
            <span className="text-sm leading-5 text-white/85"><b className="block text-white">{item.title}</b>{item.body}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-white/80">
        Stuck on anything? <a className="font-bold text-lime underline underline-offset-4" href={WHATSAPP_URL} target="_blank" rel="noreferrer">WhatsApp us on 069 382 4908</a> and a real person will help.
      </p>
    </section>
  );
}
