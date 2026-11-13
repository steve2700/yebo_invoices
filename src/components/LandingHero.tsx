import Link from "next/link";
import HeroPhotos from "@/components/HeroPhotos";
import { InstallAppButton } from "@/app/app/InstallPrompt";

const trades = ["Carpenters", "Electricians", "Plumbers", "Painters", "Builders"];

const facts = [
  ["From R49 a month", "Cancel any time"],
  ["Card and instant EFT", "Paid through your own PayFast account"],
  ["No client sign up", "They open a link on any phone"],
  ["Installs on your phone", "Free, no app store"],
];

export default function LandingHero() {
  return (
    <section className="bg-yebo-chalk">
      <style>{`
        .hero-mark{background-image:linear-gradient(#F2B21B,#F2B21B);background-repeat:no-repeat;background-size:0 100%;color:#fff;animation:heroMark .8s .45s cubic-bezier(.2,.7,.2,1) forwards;-webkit-box-decoration-break:clone;box-decoration-break:clone}
        @keyframes heroMark{to{background-size:100% 100%;color:#0C3B2E}}
        @media (prefers-reduced-motion:reduce){.hero-mark{animation:none;background-size:100% 100%;color:#0C3B2E}}
      `}</style>

      <div className="relative isolate overflow-hidden bg-yebo-deep lg:flex lg:min-h-[680px] lg:items-center">
        {/* Phone: the photo on top, the words below it. Desktop: the photo fills the right side behind the words. */}
        <HeroPhotos />

        <div className="relative mx-auto -mt-10 w-full max-w-7xl px-5 pb-9 sm:px-8 sm:pb-14 lg:mt-0 lg:px-12 lg:py-20">
          <div className="max-w-xl">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-white/85">
              <span className="inline-block h-2 w-2 rounded-full bg-yebo-sun" aria-hidden="true" />
              Made for people who work with their hands
            </p>
            <h1 className="mt-4 text-balance text-[clamp(2.5rem,8.6vw,4.9rem)] font-extrabold leading-[.98] tracking-[-.045em] text-white">
              The <span className="hero-mark rounded-[.18em] px-[.12em]">first</span> sharp quote wins the job.
            </h1>
            <p className="mt-5 max-w-lg text-pretty text-lg leading-8 text-white/90">
              Say the job out loud. Yebo turns it into a branded quote you can send on WhatsApp before you leave the driveway. See when it is opened, and get paid by card or instant EFT.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-4">
              <Link
                href="/login"
                className="inline-flex min-h-[56px] items-center justify-center rounded-lg bg-yebo-sun px-8 text-lg font-extrabold text-yebo-deep shadow-[0_8px_30px_rgba(0,0,0,.28)] transition hover:brightness-95 active:scale-[.98]"
              >
                Send your first quote
              </Link>
              <Link href="/features" className="min-h-11 py-2 text-base font-semibold text-white underline decoration-white/40 underline-offset-4 transition hover:decoration-white">
                See how it works
              </Link>
            </div>
            <ul className="mt-6 flex flex-wrap gap-2" aria-label="Who Yebo is for">
              {trades.map((t) => (
                <li key={t} className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-sm font-semibold text-white backdrop-blur-sm">{t}</li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-white/75">
              Built by a working carpenter in Gauteng. <InstallAppButton className="press inline-flex min-h-11 items-center font-semibold text-white underline decoration-white/40 underline-offset-4 transition hover:decoration-white">Add Yebo to your phone</InstallAppButton>
            </p>
          </div>
        </div>
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
