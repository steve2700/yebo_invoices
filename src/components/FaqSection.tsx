import Reveal from "@/components/Reveal";

const questions = [
  { q: "Do my clients need an account?", a: "No. They open a link on any phone, view the quote, accept it, and pay. There is nothing for them to install or sign up for." },
  { q: "Can I use it on my phone?", a: "Yes. Yebo is built for phones, and you can add it to your home screen so it opens like an app." },
  { q: "What happens when I send a quote?", a: "You choose email or WhatsApp. Yebo shows you straight away that it was sent, and tells you when your client opens, accepts or pays." },
  { q: "Where do my clients' replies go?", a: "Straight to the business email you set up in Yebo, so nothing gets lost in a no-reply inbox." },
  { q: "How do I get paid?", a: "Clients can pay your invoices online by card or instant EFT through PayFast, straight into your own PayFast account. You can also record EFT and cash payments yourself." },
  { q: "Can I cancel?", a: "Yes, any time, from Settings. You keep access until the end of the month you have paid for, and you will not be charged again." },
  { q: "Is my information safe?", a: "Your information is stored securely and is never sold. You can read exactly what we collect and why in our Privacy Notice." },
];

export default function FaqSection() {
  return (
    <section id="faq" className="scroll-mt-24 border-t border-yebo-deep/10 bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <Reveal>
          <p className="text-xs font-extrabold uppercase tracking-[.2em] text-yebo">Good questions</p>
          <h2 className="mt-4 text-4xl font-extrabold leading-[.98] tracking-[-.06em] text-yebo-deep sm:text-5xl">Before you start</h2>
        </Reveal>
        <div className="mt-8 divide-y divide-yebo-deep/10 rounded-3xl border border-yebo-deep/10 bg-yebo-chalk/50">
          {questions.map((item) => (
            <details key={item.q} className="group px-5 py-1 sm:px-7">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-base font-bold text-yebo-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yebo">
                {item.q}
                <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-full bg-white text-lg font-black text-yebo transition group-open:rotate-45">+</span>
              </summary>
              <p className="pb-4 text-sm leading-7 text-yebo-deep/70">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
