import Image from "next/image";
import Link from "next/link";

export default function LandingHero() {
  return (
    <section className="relative overflow-hidden bg-yebo-chalk">
      <div aria-hidden="true" className="pointer-events-none absolute -left-48 -top-40 size-[32rem] rounded-full bg-yebo-sun/15 blur-3xl" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-5 py-14 sm:px-8 sm:py-20 md:grid-cols-[.92fr_1.08fr] lg:gap-16 lg:px-12 lg:py-24">
        <div className="relative z-10">
          <p className="inline-flex items-center gap-2 rounded-full border border-yebo-deep/10 bg-white/70 px-3.5 py-2 text-[11px] font-extrabold uppercase tracking-[.16em] text-yebo-deep/70">
            <span aria-hidden="true" className="size-2 rounded-full bg-yebo" />
            Quotes and invoices for South African small business
          </p>
          <h1 className="mt-7 max-w-2xl text-[clamp(3.45rem,7.3vw,6.3rem)] font-extrabold leading-[.91] tracking-[-.075em] text-yebo-deep md:text-[clamp(2.3rem,5.5vw,4.5rem)] lg:text-[clamp(3.35rem,7vw,6.3rem)]">
            Quote clearly.<br />Get the <span className="text-yebo">yes.</span>
          </h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-yebo-deep/70 sm:text-lg sm:leading-8">
            Create a professional quote, share a clear client link, then turn accepted work into an invoice — all from your phone.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link className="inline-flex min-h-13 items-center justify-center rounded-full bg-yebo px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-yebo/15 transition hover:-translate-y-0.5 hover:bg-yebo-deep" href="/login">
              Create your first quote <span aria-hidden="true" className="ml-2">→</span>
            </Link>
            <Link className="inline-flex min-h-12 items-center px-2 text-sm font-bold text-yebo-deep underline decoration-yebo-deep/25 underline-offset-4 transition hover:decoration-yebo-deep" href="#workflow">
              See the flow
            </Link>
          </div>
          <p className="mt-6 text-xs font-semibold text-yebo-deep/50">
            Share by link, email or WhatsApp · Prices in rands · VAT when registered
          </p>
        </div>

        <figure className="relative isolate aspect-[1.08/1] min-h-[350px] overflow-hidden rounded-[2rem] bg-yebo-deep shadow-[0_28px_80px_rgba(12,59,46,.18)] sm:aspect-[1.25/1] lg:aspect-[1.04/1]">
          <Image
            src="/images/yebo-fieldwork.png"
            alt="A South African carpenter checking a quote on her phone in a kitchen workshop"
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
