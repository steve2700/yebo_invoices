import Link from "next/link";
import Reveal from "@/components/Reveal";

export const questions = [
  { q: "Do my clients need an account?", a: "No. They open a link on any phone, view the quote, accept it, and pay. There is nothing for them to install or sign up for." },
  { q: "Can I use it on my phone?", a: "Yes. Yebo is built for phones, and you can add it to your home screen so it opens like an app." },
  { q: "What happens when I send a quote?", a: "You choose email or WhatsApp. Yebo shows you straight away that it was sent, and tells you when your client opens, accepts or pays." },
  { q: "Where do my clients' replies go?", a: "Straight to the business email you set up in Yebo, so nothing gets lost in a no-reply inbox." },
  { q: "How do I get paid?", a: "Clients can pay your invoices online by card or instant EFT through PayFast, straight into your own PayFast account. You can also record EFT and cash payments yourself." },
  { q: "Which plan should I pick?", a: "Pick the one that matches a normal month for your business. If you are not busy yet, start with The Side-Hustler. If you quote every week, The Real Business is built for you. You can change plan any time." },
  { q: "Can I cancel?", a: "Yes, any time, from Settings. You keep access until the end of the month you have paid for, and you will not be charged again." },
  { q: "Is my information safe?", a: "Your information is stored securely and is never sold. You can read exactly what we collect and why in our Privacy Notice." },
];

export default function FaqSection() {
  return (
    <section id="faq" className="scroll-mt-24 border-t border-yebo-deep/10 bg-white py-20 sm:py-28">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 sm:px-8 lg:grid-cols-[.8fr_1.2fr] lg:gap-16 lg:px-12">
        <Reveal className="lg:sticky lg:top-28 lg:self-start">
          <p className="text-xs font-extrabold uppercase tracking-[.2em] text-yebo">Good questions</p>
          <h2 className="mt-4 text-balance text-4xl font-extrabold leading-[.98] tracking-[-.05em] text-yebo-deep sm:text-5xl">Before you start</h2>
          <p className="mt-5 max-w-sm text-pretty text-base leading-7 text-yebo-deep/65">
            No question is too basic. Except &ldquo;can I just keep using Excel?&rdquo; Technically yes. Emotionally, we&apos;re worried about you.
          </p>
          <Link href="/login" className="mt-7 inline-flex min-h-12 items-center rounded-full bg-yebo-deep px-6 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-yebo">
            Try it yourself <span aria-hidden="true" className="ml-2">→</span>
          </Link>
        </Reveal>

        <div className="flex flex-col gap-3">
          {questions.map((item) => (
            <details key={item.q} className="group rounded-2xl border border-yebo-deep/10 bg-yebo-chalk/50 px-5 transition-colors open:border-yebo/30 open:bg-white open:shadow-[0_18px_40px_-28px_rgba(12,59,46,.5)] sm:px-6">
              <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-4 text-base font-bold text-yebo-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yebo [&::-webkit-details-marker]:hidden">
                {item.q}
                <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-lg font-black text-yebo ring-1 ring-yebo-deep/10 transition group-open:rotate-45 group-open:bg-yebo group-open:text-white group-open:ring-yebo">+</span>
              </summary>
              <p className="pb-5 pr-10 text-sm leading-7 text-yebo-deep/70">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
