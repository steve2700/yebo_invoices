import Image from "next/image";
import Link from "next/link";

export default function LandingHero() {
  return (
    <section className="relative overflow-hidden bg-yebo-chalk">
      <div aria-hidden="true" className="pointer-events-none absolute -left-48 -top-40 size-[32rem] rounded-full bg-yebo-sun/15 blur-3xl" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-6 px-4 py-8 sm:gap-8 sm:px-8 sm:py-20 md:grid-cols-[.92fr_1.08fr] lg:gap-16 lg:px-12 lg:py-24">
        <div className="relative z-10">
          <p className="inline-flex items-center gap-2 rounded-full border border-yebo-deep/10 bg-white/70 px-3 py-1.5 text-[9px] font-extrabold uppercase leading-4 tracking-[.1em] text-yebo-deep/70 sm:px-3.5 sm:py-2 sm:text-[11px] sm:tracking-[.16em]">
            <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-yebo" />
            For South African small businesses
          </p>
          <h1 className="mt-5 max-w-2xl text-[clamp(2.6rem,8vw,6.3rem)] font-extrabold leading-[.91] tracking-[-.075em] text-yebo-deep sm:text-[clamp(3rem,7vw,4.5rem)] lg:text-[clamp(3.35rem,7vw,6.3rem)]">
            Quote clearly.<br />Get the <span className="text-yebo">yes.</span>
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-5 text-yebo-deep/70 sm:mt-7 sm:text-lg sm:leading-8">
            Create a clear quote, share one easy client link, then turn accepted work into an invoice — all from your phone.
          </p>
          <div className="mt-5 flex flex-col items-stretch gap-1.5 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <Link className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-yebo px-6 py-3 text-sm font-bold text-white shadow-lg shadow-yebo/15 transition hover:-translate-y-0.5 hover:bg-yebo-deep sm:min-h-13 sm:w-auto sm:py-3.5" href="/login">
              Create your first quote <span aria-hidden="true" className="ml-2">→</span>
            </Link>
            <Link className="inline-flex min-h-10 items-center justify-center px-2 text-sm font-bold text-yebo-deep underline decoration-yebo-deep/25 underline-offset-4 transition hover:decoration-yebo-deep sm:min-h-12" href="#workflow">
              See the flow
            </Link>
          </div>
          <p className="mt-6 hidden text-xs font-semibold text-yebo-deep/50 sm:block">
            Share by link, email or WhatsApp · Prices in rands · VAT when registered
          </p>
        </div>

        <figure className="relative isolate aspect-[1.08/1] min-h-[240px] overflow-hidden rounded-[2rem] bg-yebo-deep shadow-[0_28px_80px_rgba(12,59,46,.18)] sm:aspect-[1.25/1] sm:min-h-[350px] lg:aspect-[1.04/1]">
          <Image
            src="/images/yebo-hero-workshop.png"
            alt="A South African cabinetmaker checking a quote on her phone in her workshop"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 56vw"
            className="object-cover object-[62%_center]"
          />
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-yebo-deep/55 via-transparent to-yebo-deep/10" />
          <div className="absolute right-4 top-4 rounded-full border border-white/25 bg-yebo-deep/35 px-3.5 py-2 text-[10px] font-bold uppercase tracking-[.14em] text-white backdrop-blur sm:right-6 sm:top-6">
            Made for work on the move
          </div>
          <figcaption className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/70 bg-white/95 p-4 text-yebo-deep shadow-xl backdrop-blur sm:inset-x-auto sm:bottom-6 sm:left-6 sm:w-[min(100%-3rem,22rem)] sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-extrabold uppercase tracking-[.16em] text-yebo">Sample quote</span>
              <span className="rounded-full bg-yebo-chalk px-2.5 py-1 text-[10px] font-bold text-yebo-deep/60">Example only</span>
            </div>
            <p className="mt-3 text-lg font-extrabold tracking-tight">Kitchen cabinetry</p>
            <p className="mt-0.5 text-xs text-yebo-deep/55">Scope, itemised costs and clear terms</p>
            <div className="mt-4 flex items-center justify-between border-t border-yebo-deep/10 pt-3">
              <span className="text-xs font-semibold text-yebo-deep/55">Example total</span>
              <span className="text-xl font-extrabold tracking-tight">R 22 100</span>
            </div>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
