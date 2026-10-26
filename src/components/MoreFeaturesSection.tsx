import Link from "next/link";
import Reveal from "@/components/Reveal";

// Plain-words list of what Yebo does after the quote leaves your phone. Every item here exists in the app today.
const groups = [
  {
    title: "Before you send",
    items: [
      ["Check before you send", "A short checklist flags a missing email or WhatsApp number, vague lines and unpriced items, with a button that takes you to each fix."],
      ["Start from a similar job", "Quoting something you have done before? Yebo offers the items and wording from your last one, ready to adjust."],
      ["Not included, assumptions, timeline", "Say what is outside the price and when work starts, so there are no surprises after the yes."],
    ],
  },
  {
    title: "When your client answers",
    items: [
      ["Accept, ask for a change, or decline", "Clients sign with their name, ask for changes, or say why it is a no. You get the reason, and a declined quote can be reopened."],
      ["Only real client views", "Your own opens and link previews do not count as “viewed”, so the tick means a client really looked."],
      ["Photos on the quote", "Add the site, the old unit or a sketch so your client sees what you saw."],
    ],
  },
  {
    title: "Getting paid and staying tidy",
    items: [
      ["Proof of payment and “I have paid”", "Clients can upload their EFT proof or tell you they have paid, and promise a date. Reminders pause until that day."],
      ["Receipts, reminders and statements", "Automatic receipts, expiry and overdue reminders, and one private statement link for a client with several open invoices."],
      ["Repeat invoices and credit notes", "Monthly clients get a draft invoice made for you. Mistakes and discounts get a proper numbered credit note."],
    ],
  },
  {
    title: "Know what is working",
    items: [
      ["Quote results", "See how many quotes you win, what they were worth, and the main reasons clients say no."],
      ["Tender helper", "Upload a tender document and Yebo pulls out what needs pricing, how to submit, and checks your compliance papers for expiry."],
      ["VAT summary for your accountant", "Every invoice and payment for any period, in one file. Credit notes are included."],
    ],
  },
];

export default function MoreFeaturesSection() {
  return (
    <section id="more" className="scroll-mt-24 border-t border-yebo-deep/10 bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        <Reveal>
          <p className="text-xs font-extrabold uppercase tracking-[.2em] text-yebo">After you tap send</p>
          <h2 className="mt-4 max-w-2xl text-balance text-4xl font-extrabold leading-[.98] tracking-[-.06em] text-yebo-deep sm:text-5xl">
            The quote is only the start.
          </h2>
          <p className="mt-5 max-w-2xl text-pretty text-sm leading-7 text-yebo-deep/65 sm:text-base">
            Yebo helps before you send, when your client answers, and until the money is in. Here is what that looks like day to day.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-10 lg:grid-cols-2">
          {groups.map((group, groupIndex) => (
            <Reveal key={group.title} delay={groupIndex * 60}>
              <h3 className="text-xs font-extrabold uppercase tracking-[.18em] text-orange">{group.title}</h3>
              <ul className="mt-4 grid gap-3">
                {group.items.map(([title, text]) => (
                  <li key={title} className="rounded-2xl border border-yebo-deep/10 bg-yebo-chalk/60 p-5">
                    <p className="text-base font-extrabold tracking-tight text-yebo-deep">{title}</p>
                    <p className="mt-1.5 text-sm leading-6 text-yebo-deep/65">{text}</p>
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <Link className="inline-flex min-h-12 items-center rounded-full bg-yebo px-7 text-sm font-extrabold text-white shadow-lg shadow-yebo/25 transition hover:-translate-y-0.5 hover:bg-yebo-deep" href="/login">
            Send your first quote <span aria-hidden="true" className="ml-2">→</span>
          </Link>
          <Link className="inline-flex min-h-12 items-center rounded-full border-2 border-yebo-deep/15 px-6 text-sm font-extrabold text-yebo-deep transition hover:border-yebo-deep/30" href="/how-it-works">
            How it works
          </Link>
        </div>
      </div>
    </section>
  );
}
