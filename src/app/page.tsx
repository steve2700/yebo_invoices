import Link from "next/link";
import Logo from "@/components/Logo";

const steps = [
  ["Set up once", "Add your logo, registration and VAT status, and banking details if you like. Every quote then looks like it came from an established business."],
  ["Quote in minutes", "Yebo remembers your clients and items, fills in what it can, and gives short tips while you describe the job."],
  ["Send, then get the yes", "Share a link on WhatsApp. Your client opens it on their phone and accepts. You turn the accepted quote into an invoice in one tap."],
];

const features: [string, string, boolean?][] = [
  ["Made for South Africa", "Rands, South African VAT rules, and banking details clients can trust. If you are not VAT registered, no VAT is charged and the document says so."],
  ["Looks established from day one", "Your logo, address, registration number, website and VAT number sit on every document, with an optional workmanship guarantee."],
  ["Document numbers that match your name", "Granite Carpentry gets GC-QT-2026-1 for quotes and GC-INV-2026-1 for invoices, without gaps."],
  ["Send on WhatsApp", "One tap opens WhatsApp with the quote link ready to send. No attachments, no app for your client to install."],
  ["Quote to invoice in one tap", "When a client accepts, create the invoice from the same quote. Nothing to retype."],
  ["Your clients, remembered", "Autocomplete for clients, addresses and items. Clients who always pay after the job are set up that way automatically."],
  ["Automatic follow-ups", "Gentle reminders if a quote goes quiet, and before an invoice is due.", true],
  ["Pay online by scanning", "A QR code on every invoice that opens a secure payment page.", true],
];

export default function Home() {
  return (
    <>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <nav className="hidden gap-8 text-sm font-semibold text-yebo-deep/70 md:flex">
          <a href="#how" className="hover:text-yebo-deep">How it works</a>
          <a href="#features" className="hover:text-yebo-deep">Features</a>
          <a href="#coach" className="hover:text-yebo-deep">Quote coach</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-semibold">Sign in</Link>
          <Link href="/login" className="rounded-full bg-yebo-deep px-5 py-2.5 text-sm font-bold text-white hover:bg-yebo">Start free</Link>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-40 -top-40 h-[560px] w-[560px] rounded-full bg-[radial-gradient(circle,#cdeedd_0%,transparent_68%)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 pb-24 pt-12 lg:grid-cols-[1.1fr_0.9fr] lg:pt-20">
          <div>
            <h1 className="text-5xl font-extrabold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
              Quotes clients say yes to.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-yebo-deep/75">
              Yebo helps South African small businesses send clear, professional quotes and invoices from their phone, and coaches you to win the job while you write it.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link href="/login" className="rounded-full bg-yebo px-7 py-4 text-base font-bold text-white shadow-lg shadow-yebo/25 hover:bg-yebo-deep">Create your first quote</Link>
              <a href="#how" className="rounded-full border-2 border-yebo-deep/15 px-7 py-4 text-base font-bold hover:border-yebo-deep">See how it works</a>
            </div>
            <p className="mt-5 text-sm text-yebo-deep/60">Free while we launch. Works on any phone, no app to install.</p>
          </div>

          {/* the memorable thing: a real-looking quote with the Yebo stamp */}
          <div className="relative mx-auto w-full max-w-sm rotate-2">
            <div className="rounded-xl bg-white p-6 text-sm shadow-2xl shadow-yebo-deep/20" style={{ borderTop: "6px solid #B45309" }}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-lg font-extrabold text-white" style={{ background: "#B45309" }}>GC</span>
                  <b>Granite Carpentry</b>
                </div>
                <div className="text-right text-xs text-yebo-deep/60"><b className="block text-sm" style={{ color: "#B45309" }}>QUOTE</b>GC-QT-2026-1</div>
              </div>
              <p className="mt-1 text-xs text-yebo-deep/55">22 Workshop Rd, Kya Sand · Reg. 2019/123456/07</p>
              <p className="mt-4">For <b>Thabo Mokoena</b>, kitchen cupboards</p>
              <div className="mt-3 divide-y divide-yebo-deep/10">
                {[["Build and install 6 cupboards", "R18 500"], ["Hinges, handles and fittings", "R2 400"], ["Remove and dispose of old units", "R1 200"]].map(([a, b]) => (
                  <div key={a} className="flex justify-between py-2"><span>{a}</span><span>{b}</span></div>
                ))}
                <div className="flex justify-between py-2 text-xs text-yebo-deep/55"><span>VAT</span><span>Not applicable</span></div>
              </div>
              <div className="flex justify-between border-t-2 pt-2 text-lg font-extrabold" style={{ borderColor: "#B45309", color: "#B45309" }}><span>Total</span><span>R22 100</span></div>
              <div className="mt-4 rounded-xl bg-yebo py-3 text-center font-bold text-white">Accept quote</div>
              <p className="mt-3 text-center text-xs text-yebo-deep/55">12-month workmanship guarantee</p>
            </div>
            <div className="stamp absolute -right-4 -top-5 rounded-xl border-4 border-yebo-deep bg-yebo-sun px-4 py-2 text-xl font-extrabold text-yebo-deep">Yebo! Accepted</div>
            <div className="absolute -bottom-5 -left-6 -rotate-3 rounded-xl bg-white px-4 py-2 text-xs font-semibold shadow-lg ring-1 ring-black/5">Thabo viewed your quote 2 hours ago</div>
          </div>
        </div>
      </section>

      <p className="mx-auto max-w-6xl px-6 pb-16 text-center text-yebo-deep/60">
        Built for plumbers, carpenters, electricians, photographers, caterers, tutors and everyone else who sends quotes from their phone.
      </p>

      {/* HOW IT WORKS: a real sequence, so numbered */}
      <section id="how" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="max-w-2xl text-4xl font-extrabold tracking-tight">Your first quote takes about three minutes.</h2>
        <div className="mt-12 grid gap-10 md:grid-cols-3">
          {steps.map(([t, d], i) => (
            <div key={t} className="border-t-4 border-yebo-deep pt-5">
              <div className="text-5xl font-extrabold text-yebo">{i + 1}</div>
              <h3 className="mt-3 text-xl font-extrabold">{t}</h3>
              <p className="mt-2 leading-relaxed text-yebo-deep/70">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES: rows, not identical cards */}
      <section id="features" className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="lg:sticky lg:top-8 lg:self-start">
          <h2 className="text-4xl font-extrabold tracking-tight">Everything a small business needs to look established.</h2>
          <p className="mt-4 text-yebo-deep/70">Clients decide in seconds whether they trust you. Yebo puts the right details in front of them, so you do not have to think about it.</p>
        </div>
        <div className="divide-y divide-yebo-deep/10 border-y border-yebo-deep/10">
          {features.map(([t, d, soon]) => (
            <div key={t} className="py-5">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-extrabold">{t}</h3>
                {soon && <span className="rounded-full bg-yebo-sun px-3 py-0.5 text-xs font-bold">Coming soon</span>}
              </div>
              <p className="mt-1 max-w-xl leading-relaxed text-yebo-deep/70">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* COACH */}
      <section id="coach" className="bg-yebo-deep text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-24 lg:grid-cols-2">
          <div>
            <h2 className="text-4xl font-extrabold tracking-tight">A coach in every quote.</h2>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-white/75">
              Most quotes are lost to small things: a vague description, no start date, no mention of what is not included. Yebo spots them while you write and suggests the fix, one tip at a time. Every tip can be dismissed, and you can switch them off.
            </p>
          </div>
          <div className="space-y-4">
            {[["Say what is not included to avoid arguments later.", "Add it"], ["Big job with no deposit. Ask for a deposit to cover materials?", "Ask for 50%"], ["Add a short personal note. Friendly, Professional or Short.", "Use friendly"]].map(([t, a]) => (
              <div key={t} className="rounded-xl border-l-4 border-yebo-sun bg-white p-4 text-yebo-deep">
                <p className="font-semibold">{t}</p>
                <span className="mt-2 inline-block text-sm font-bold text-yebo">{a}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-6 py-28 text-center">
        <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Send your first quote today.</h2>
        <p className="mt-4 text-lg text-yebo-deep/70">Free while we launch. Sign in with Google or an email link and you are ready in minutes.</p>
        <Link href="/login" className="mt-9 inline-block rounded-full bg-yebo px-9 py-4 text-lg font-bold text-white shadow-lg shadow-yebo/25 hover:bg-yebo-deep">Get started</Link>
      </section>

      <footer className="border-t border-yebo-deep/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-sm text-yebo-deep/60">
          <Logo />
          <span>Made in South Africa for small business.</span>
          <Link href="/login" className="font-semibold text-yebo-deep">Sign in</Link>
        </div>
      </footer>
    </>
  );
}
