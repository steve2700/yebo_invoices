import Image from "next/image";
import Link from "next/link";

const details = [
  "Project scope, job details and itemised costs",
  "Payment terms, deposits and clear due dates",
  "VAT shown for VAT-registered businesses",
  "Online quote responses and downloadable PDFs",
];

export default function ProductStorySection() {
  return (
    <section id="features" className="scroll-mt-24 bg-yebo-chalk py-20 sm:py-28">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 sm:px-8 lg:grid-cols-[1.03fr_.97fr] lg:gap-16 lg:px-12">
        <figure className="relative isolate aspect-[1.12/1] overflow-hidden rounded-[2rem] bg-yebo-deep shadow-[0_24px_70px_rgba(12,59,46,.15)] sm:aspect-[1.28/1]">
          <Image
            src="/images/yebo-client-handoff.png"
            alt="A South African contractor and homeowner reviewing a project estimate in a finished kitchen"
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-yebo-deep/65 via-transparent to-transparent" />
          <figcaption className="absolute bottom-5 left-5 right-5 text-sm font-semibold leading-6 text-white sm:bottom-7 sm:left-7 sm:right-7 sm:text-base">
            A clear plan makes the next conversation easier.
          </figcaption>
        </figure>

        <div>
          <p className="text-xs font-extrabold uppercase tracking-[.2em] text-yebo">Made for the way you work</p>
          <h2 className="mt-4 max-w-xl text-4xl font-extrabold leading-[.98] tracking-[-.06em] text-yebo-deep sm:text-5xl">
            Give every client the full picture.
          </h2>
          <p className="mt-5 max-w-xl text-sm leading-7 text-yebo-deep/65 sm:text-base">
            A client-ready quote is more than a number. Put the scope, costs and payment plan together in a link that is easy to read on a phone.
          </p>

          <ul className="mt-7 grid gap-3">
            {details.map((detail) => (
              <li key={detail} className="flex items-start gap-3 text-sm font-semibold leading-6 text-yebo-deep/80">
                <span aria-hidden="true" className="mt-2 size-2 shrink-0 rounded-full bg-yebo" />
                {detail}
              </li>
            ))}
          </ul>

          <div id="voice-notes" className="mt-8 scroll-mt-24 rounded-2xl border border-yebo-deep/10 bg-white p-5 sm:p-6">
            <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-yebo">Voice note to quote draft</p>
            <p className="mt-2 text-sm leading-6 text-yebo-deep/70">
              Record or upload a voice note to start a draft. Check the client, quantities and prices before you share it.
            </p>
          </div>
          <Link className="mt-7 inline-flex min-h-12 items-center rounded-full bg-yebo-deep px-6 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-yebo" href="/login">
            Start a quote <span aria-hidden="true" className="ml-2">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
