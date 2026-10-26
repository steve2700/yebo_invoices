import Link from "next/link";
import { InstallAppButton } from "@/app/app/InstallPrompt";
import SignRotator from "@/components/SignRotator";

const facts = [
  ["From R49 a month", "Cancel any time"],
  ["Card and instant EFT", "Paid through your own PayFast account"],
  ["No client sign up", "They open a link on any phone"],
  ["Installs on your phone", "Free, no app store"],
];

export default function LandingHero() {
  return (
    <section className="bg-yebo-chalk">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 pb-12 pt-10 sm:px-8 sm:pt-14 lg:grid-cols-[1fr_1fr] lg:gap-14 lg:px-12 lg:pb-16 lg:pt-16">
        <div>
          <h1 className="text-balance text-[clamp(2.75rem,7.5vw,5.5rem)] font-extrabold leading-[.92] tracking-[-.05em] text-yebo-deep">
            Quotes clients say yes to.
          </h1>
          <p className="mt-6 max-w-xl text-pretty text-lg leading-8 text-yebo-deep/75">
            Yebo is the quoting and invoicing app for South African small business. Say the job out loud, send the quote on WhatsApp or email, see when it is opened, and get paid by card or instant EFT.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-3">
            <Link className="inline-flex min-h-[52px] items-center justify-center rounded-md bg-yebo px-7 text-base font-bold text-white transition hover:bg-yebo-deep" href="/login">
              Send your first quote
            </Link>
            <Link className="text-base font-semibold text-yebo-deep underline decoration-yebo-deep/30 underline-offset-4 transition hover:decoration-yebo-deep" href="/features">
              See everything it does
            </Link>
          </div>
          <div className="mt-4">
            <InstallAppButton className="press inline-flex min-h-11 items-center text-sm font-semibold text-yebo underline decoration-yebo/30 underline-offset-4 transition hover:text-yebo-deep">
              Add Yebo to your phone
            </InstallAppButton>
          </div>
        </div>
        <SignRotator />
      </div>

      <div className="border-t border-yebo-deep/15">
        <dl className="mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-5 px-5 py-6 sm:px-8 lg:grid-cols-4 lg:px-12">
          {facts.map(([value, label]) => (
            <div key={value}>
              <dt className="text-base font-bold text-yebo-deep">{value}</dt>
              <dd className="mt-0.5 text-sm text-yebo-deep/65">{label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
