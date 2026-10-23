import Link from "next/link";
import PhoneFrame from "@/components/PhoneFrame";

export default function ClosingSection() {
  return (
    <section className="px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
      <div className="relative mx-auto grid max-w-7xl items-center gap-10 overflow-hidden rounded-[2.25rem] bg-yebo-deep px-6 pt-12 text-white sm:px-10 sm:pt-16 lg:grid-cols-[1.2fr_.8fr] lg:px-14 lg:pt-0">
        <div aria-hidden="true" className="pointer-events-none absolute -left-24 -top-24 size-80 rounded-full bg-yebo/50 blur-3xl" />
        <div className="relative lg:py-16">
          <p className="text-xs font-extrabold uppercase tracking-[.2em] text-yebo-sun">Your next job starts here</p>
          <h2 className="mt-4 max-w-2xl text-balance text-4xl font-extrabold leading-[.98] tracking-[-.05em] sm:text-6xl">
            Your competitor already sent their quote. <span className="text-lime">Just saying.</span>
          </h2>
          <p className="mt-5 max-w-xl text-pretty text-base leading-7 text-white/65">
            Set up once, then every quote after that takes minutes. Your client gets a clear page, a yes button and a way to pay.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-yebo-sun px-7 text-sm font-extrabold text-yebo-deep transition hover:-translate-y-0.5 hover:bg-white" href="/login">
              Get started <span aria-hidden="true" className="ml-2">↗</span>
            </Link>
            <Link className="inline-flex min-h-[52px] items-center justify-center rounded-full border-2 border-white/20 px-7 text-sm font-extrabold text-white transition hover:bg-white/10" href="/pricing">
              See pricing
            </Link>
          </div>
        </div>
        <div className="relative flex justify-center self-end">
          <PhoneFrame
            src="/screens/quote-client.png"
            alt="Yebo quote screen: who is this for, with client name, WhatsApp, email and address fields"
            tone="light"
            className="w-[230px] translate-y-10 -rotate-3 sm:w-[250px]"
          />
        </div>
      </div>
    </section>
  );
}
