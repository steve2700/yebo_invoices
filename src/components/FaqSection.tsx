import Link from "next/link";

export const questions = [
  { q: "Do my clients need an account?", a: "No. They open a link on any phone, view the quote, accept it, and pay. There is nothing for them to install or sign up for." },
  { q: "Can I use it on my phone?", a: "Yes. Yebo is built for phones, and you can add it to your home screen so it opens like an app." },
  { q: "What happens when I send a quote?", a: "You choose email or WhatsApp. Yebo shows you straight away that it was sent, and tells you when your client opens, accepts or pays." },
  { q: "Where do my clients' replies go?", a: "Straight to the business email you set up in Yebo, so nothing gets lost in a no-reply inbox." },
  { q: "How do I get paid?", a: "Clients can pay your invoices online by card or instant EFT through PayFast, straight into your own PayFast account. You can also record EFT and cash payments yourself." },
  { q: "What if my client wants a change or says no?", a: "They can ask for a change right on the quote page, or decline and choose a reason. You see it straight away, and you can reopen a declined quote and send a fixed version. The Quote results page shows your win rate and the most common reasons." },
  { q: "What if I made a mistake on an invoice?", a: "Issue a credit note. It gets its own number and PDF, lowers what your client owes, and is not counted as income. It works on invoices that are not fully paid yet." },
  { q: "Does Yebo help me avoid sending a sloppy quote?", a: "Yes. Before you send, a short checklist points out a missing email or WhatsApp number, vague lines such as \u201Clabour\u201D, and unpriced items. You can also start from a similar job you quoted before." },
  { q: "Which plan should I pick?", a: "Pick the one that matches a normal month for your business. If you are not busy yet, start with The Side-Hustler. If you quote every week, The Real Business is built for you. You can change plan any time." },
  { q: "Can I cancel?", a: "Yes, any time, from Settings. You keep access until the end of the month you have paid for, and you will not be charged again." },
  { q: "Is my information safe?", a: "Your information is stored securely and is never sold. You can read exactly what we collect and why in our Privacy Notice." },
];

export default function FaqSection() {
  return (
    <section id="faq" className="scroll-mt-24 border-t border-yebo-deep/10 bg-white py-16 sm:py-24">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 sm:px-8 lg:grid-cols-[.8fr_1.2fr] lg:gap-16 lg:px-12">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <h2 className="text-balance text-3xl font-extrabold leading-[1.02] tracking-[-.04em] text-yebo-deep sm:text-5xl">Before you start</h2>
          <p className="mt-4 max-w-sm text-pretty text-base leading-7 text-yebo-deep/75">The questions people ask most before sending their first quote.</p>
          <Link href="/login" className="mt-6 inline-flex min-h-11 items-center text-base font-semibold text-yebo underline decoration-yebo/30 underline-offset-4 transition hover:text-yebo-deep">
            Try it yourself
          </Link>
        </div>

        <div className="flex flex-col divide-y divide-yebo-deep/15 border-y border-yebo-deep/15">
          {questions.map((item) => (
            <details key={item.q} className="group">
              <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-4 text-base font-bold text-yebo-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yebo [&::-webkit-details-marker]:hidden">
                {item.q}
                <span aria-hidden="true" className="shrink-0 text-2xl font-normal text-yebo transition group-open:rotate-45">+</span>
              </summary>
              <p className="pb-5 pr-10 text-sm leading-7 text-yebo-deep/75">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
