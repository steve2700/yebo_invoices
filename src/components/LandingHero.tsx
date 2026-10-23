import Link from "next/link";
import PhoneFrame from "@/components/PhoneFrame";

const proof = [
  ["1 tap", "to send on WhatsApp or email"],
  ["0 apps", "for your client to install"],
  ["Card + EFT", "online payments via PayFast"],
  ["From R49", "a month. Cancel any time"],
];

export default function LandingHero() {
  return (
    <section className="relative overflow-hidden bg-yebo-chalk">
      <div aria-hidden="true" className="pointer-events-none absolute -right-40 top-10 size-[36rem] rounded-full bg-lime/30 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -left-48 -top-40 size-[30rem] rounded-full bg-yebo-sun/15 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-10 sm:px-8 sm:pt-16 lg:grid-cols-[1.05fr_.95fr] lg:gap-10 lg:px-12 lg:pb-24 lg:pt-20">
        <div className="relative z-10">
          <p className="fade-up inline-flex items-center gap-2 rounded-full border border-yebo-deep/10 bg-white/80 py-1.5 pl-1.5 pr-4 text-xs font-bold text-yebo-deep/75">
            <span className="rounded-full bg-orange px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[.12em] text-white">Roast</span>
            Still quoting from a blurry WhatsApp photo? We need to talk.
          </p>
          <h1
            className="fade-up mt-6 max-w-2xl text-balance text-[clamp(2.75rem,8.5vw,5.9rem)] font-extrabold leading-[.9] tracking-[-.065em] text-yebo-deep"
            style={{ "--d": ".08s" } as React.CSSProperties}
          >
            Quote like a pro. <span className="relative whitespace-nowrap text-yebo">Get paid<svg aria-hidden="true" viewBox="0 0 300 20" className="absolute -bottom-2 left-0 h-3 w-full text-lime" preserveAspectRatio="none"><path d="M4 14c70-10 150-12 292-4" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" /></svg></span> like one.
          </h1>
          <p
            className="fade-up mt-7 max-w-xl text-pretty text-base leading-7 text-yebo-deep/70 sm:text-lg sm:leading-8"
            style={{ "--d": ".16s" } as React.CSSProperties}
          >
            Speak your quote, send it in one tap, see the moment your client opens it, and get paid online. Built for South African trades who are done chasing money on WhatsApp.
          </p>
          <div className="fade-up mt-8 flex flex-col gap-3 sm:flex-row sm:items-center" style={{ "--d": ".24s" } as React.CSSProperties}>
            <Link className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-yebo px-7 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-yebo/25 transition hover:-translate-y-0.5 hover:bg-yebo-deep" href="/login">
              Send your first quote <span aria-hidden="true" className="ml-2">→</span>
            </Link>
            <Link className="inline-flex min-h-[52px] items-center justify-center rounded-full border-2 border-yebo-deep/15 bg-white/60 px-7 py-3 text-sm font-extrabold text-yebo-deep transition hover:border-yebo-deep/30 hover:bg-white" href="#screens">
              See the real app
            </Link>
          </div>
          <p className="mt-5 text-xs font-semibold text-yebo-deep/50">No laptop. No Excel. No &ldquo;sorry, the PDF won&apos;t open.&rdquo;</p>
        </div>

        <div className="relative mx-auto flex w-full max-w-md justify-center lg:max-w-none" aria-label="Screenshots of the Yebo app on a phone">
          <div aria-hidden="true" className="absolute inset-x-6 bottom-0 top-16 rounded-[3rem] bg-yebo-deep sm:inset-x-10" />
          <div className="relative flex items-end justify-center gap-0 pt-6 pb-10">
            <PhoneFrame
              src="/screens/quote-voice.png"
              alt="Yebo new quote screen with the voice assistant: speak your quote and Yebo fills it in"
              className="pop-in relative z-0 w-[44vw] max-w-[230px] -rotate-6 translate-x-6 translate-y-6 sm:w-[210px]"
              tone="light"
            />
            <PhoneFrame
              src="/screens/home-dashboard.png"
              alt="Yebo home screen showing money collected this month, outstanding and overdue invoices"
              className="pop-in relative z-10 w-[50vw] max-w-[260px] rotate-3 -translate-x-4 sm:w-[250px]"
              priority
            />
          </div>

          <div className="fade-up absolute left-0 top-24 z-20 hidden rounded-2xl border border-yebo-deep/10 bg-white p-3 pr-4 shadow-xl sm:flex sm:items-center sm:gap-3" style={{ "--d": ".6s" } as React.CSSProperties}>
            <span aria-hidden="true" className="grid size-9 place-items-center rounded-full bg-lime text-sm font-black text-yebo-deep">●</span>
            <span>
              <span className="block text-[11px] font-extrabold uppercase tracking-[.12em] text-yebo">Quote opened</span>
              <span className="block text-sm font-bold text-yebo-deep">Mr Stewart · just now</span>
            </span>
          </div>
          <div className="stamp absolute bottom-6 right-0 z-20 rounded-2xl bg-orange px-4 py-3 text-white shadow-xl sm:right-2">
            <span className="block text-[10px] font-extrabold uppercase tracking-[.14em] text-white/80">Accepted</span>
            <span className="block text-xl font-black tracking-tight">R 22 100</span>
          </div>
        </div>
      </div>

      <div className="relative border-t border-yebo-deep/10 bg-white/60">
        <dl className="mx-auto grid max-w-7xl grid-cols-2 gap-px px-5 sm:px-8 lg:grid-cols-4 lg:px-12">
          {proof.map(([value, label]) => (
            <div key={value} className="flex flex-col gap-1 py-6 lg:py-7">
              <dt className="sr-only">{label}</dt>
              <dd className="text-2xl font-black tracking-tight text-yebo-deep sm:text-3xl">{value}</dd>
              <dd className="text-xs font-semibold text-yebo-deep/55 sm:text-sm">{label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
