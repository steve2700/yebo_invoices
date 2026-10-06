import Link from "next/link";
import Logo from "@/components/Logo";

const features = [
  ["01", "Quote faster", "Turn a rough idea into a polished quote in minutes, with your clients and items already remembered."],
  ["02", "Look established", "Your logo, registration details, terms and guarantee arrive in one confident, professional document."],
  ["03", "Get paid sooner", "Send by WhatsApp, get a clear yes, and turn accepted quotes into invoices without retyping."],
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden">
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8 lg:px-12">
        <Logo />
        <nav className="hidden items-center gap-8 text-sm font-medium text-ink/60 md:flex">
          <a href="#workflow" className="transition-colors hover:text-ink">How it works</a>
          <a href="#features" className="transition-colors hover:text-ink">Features</a>
          <a href="#coach" className="transition-colors hover:text-ink">Quote coach</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login" className="hidden text-sm font-semibold text-ink sm:block">Sign in</Link>
          <Link href="/login" className="rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-paper transition-transform hover:-translate-y-0.5">Start free <span aria-hidden="true">↗</span></Link>
        </div>
      </header>

      <section className="relative mx-auto grid max-w-7xl items-center gap-16 px-5 pb-24 pt-14 sm:px-8 lg:grid-cols-[.9fr_1.1fr] lg:px-12 lg:pb-36 lg:pt-20">
        <div className="pointer-events-none absolute -left-40 -top-40 size-[30rem] rounded-full bg-lime/20 blur-3xl" />
        <div className="relative z-10">
          <p className="mb-7 flex items-center gap-3 text-xs font-bold uppercase tracking-[.22em] text-ink/50"><span className="size-2 rounded-full bg-lime" /> Invoicing, reimagined for SA</p>
          <h1 className="max-w-2xl text-[clamp(3.6rem,8vw,7.4rem)] font-black leading-[.88] tracking-[-.07em] text-ink">Get the<br /><span className="text-orange">yes.</span><br />Then get paid.</h1>
          <p className="mt-8 max-w-lg text-lg leading-relaxed text-ink/65 sm:text-xl">Beautiful quotes and invoices for the businesses that keep South Africa moving. From your phone, in minutes, without the admin.</p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link href="/login" className="rounded-full bg-orange px-7 py-4 text-base font-bold text-white shadow-xl shadow-orange/20 transition-all hover:-translate-y-1 hover:bg-ink">Create your first quote <span aria-hidden="true">→</span></Link>
            <a href="#workflow" className="text-sm font-bold text-ink underline decoration-ink/20 underline-offset-8 transition-colors hover:decoration-ink">See how it works</a>
          </div>
          <p className="mt-6 text-xs font-medium uppercase tracking-[.16em] text-ink/40">Free while we launch · No app to install</p>
        </div>

        <div className="relative z-10 lg:pt-8">
          <div className="absolute -inset-8 rounded-[3rem] bg-lime/20 blur-2xl" />
          <div className="relative rotate-2 rounded-[2rem] border border-ink/10 bg-white p-5 shadow-[0_30px_80px_rgba(20,25,20,.18)] sm:p-8">
            <div className="flex items-start justify-between border-b border-ink/10 pb-6"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-orange">Yebo</p><h2 className="mt-2 text-2xl font-black tracking-tight">Granite Carpentry</h2><p className="mt-1 text-xs text-ink/45">22 Workshop Road · Johannesburg</p></div><div className="text-right"><p className="text-xs font-bold uppercase tracking-[.16em] text-ink/40">Quote</p><p className="mt-1 font-mono text-xs text-ink/60">GC-QT-2026-001</p></div></div>
            <div className="flex items-end justify-between py-7"><div><p className="text-xs uppercase tracking-[.14em] text-ink/40">Prepared for</p><p className="mt-1 text-lg font-bold">Thabo Mokoena</p><p className="text-sm text-ink/55">Kitchen renovation</p></div><div className="rounded-full bg-lime/20 px-3 py-1.5 text-xs font-bold text-ink">Valid 14 days</div></div>
            <div className="divide-y divide-ink/10 border-y border-ink/10 text-sm">{[["Build & install 6 cupboards", "R18 500"], ["Handles and fittings", "R2 400"], ["Remove old units", "R1 200"]].map(([name, price]) => <div key={name} className="flex justify-between py-4"><span>{name}</span><span className="font-semibold">{price}</span></div>)}</div>
            <div className="flex items-end justify-between py-6"><span className="text-sm font-bold">Total</span><span className="text-4xl font-black tracking-tight text-orange">R22 100</span></div>
            <div className="rounded-xl bg-ink py-4 text-center text-sm font-bold text-paper">Accept quote <span aria-hidden="true">↗</span></div>
            <p className="mt-4 text-center text-xs text-ink/45">Includes a 12-month workmanship guarantee</p>
          </div>
          <div className="stamp absolute -right-2 -top-7 rounded-xl border-2 border-ink bg-lime px-4 py-3 text-sm font-black text-ink shadow-lg sm:-right-8">Yebo! Accepted</div>
          <div className="absolute -bottom-7 -left-2 rounded-xl border border-ink/10 bg-white px-4 py-3 text-xs font-semibold text-ink shadow-lg sm:-left-8"><span className="mr-2 inline-block size-2 rounded-full bg-lime" />Viewed 2 hours ago</div>
        </div>
      </section>

      <section id="workflow" className="border-y border-ink/10 bg-ink px-5 py-20 text-paper sm:px-8 lg:px-12 lg:py-28"><div className="mx-auto max-w-7xl"><div className="grid gap-10 lg:grid-cols-[.7fr_1.3fr]"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-lime">The Yebo way</p><h2 className="mt-5 max-w-md text-4xl font-black leading-[.95] tracking-[-.04em] sm:text-5xl">Less admin.<br />More momentum.</h2></div><div className="grid gap-10 sm:grid-cols-3">{features.map(([number, title, body]) => <div key={number} className="border-t border-paper/20 pt-5"><p className="font-mono text-sm text-lime">{number}</p><h3 className="mt-10 text-xl font-bold">{title}</h3><p className="mt-3 text-sm leading-relaxed text-paper/60">{body}</p></div>)}</div></div></div></section>

      <section id="features" className="mx-auto grid max-w-7xl gap-14 px-5 py-24 sm:px-8 lg:grid-cols-[.7fr_1.3fr] lg:px-12 lg:py-36"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-orange">Made for real work</p><h2 className="mt-5 max-w-md text-4xl font-black leading-[.95] tracking-[-.05em] sm:text-6xl">Your work is the hard part. Let Yebo handle the rest.</h2></div><div className="grid gap-0 border-t border-ink/15">{["South African VAT rules, built in.", "Send polished quotes straight to WhatsApp.", "Remember clients, addresses and items.", "Convert an accepted quote to an invoice."].map((item, i) => <div key={item} className="flex items-center justify-between border-b border-ink/15 py-6"><span className="text-lg font-bold sm:text-2xl">{item}</span><span className="font-mono text-xs text-orange">0{i + 1}</span></div>)}</div></section>

      <section id="coach" className="mx-5 mb-20 overflow-hidden rounded-[2rem] bg-lime px-6 py-20 sm:mx-8 sm:px-12 lg:mx-auto lg:max-w-7xl lg:px-20"><div className="grid items-center gap-12 lg:grid-cols-2"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-ink/55">A little help, right on time</p><h2 className="mt-5 max-w-xl text-4xl font-black leading-[.9] tracking-[-.05em] text-ink sm:text-6xl">A coach in every quote.</h2><p className="mt-6 max-w-lg text-lg leading-relaxed text-ink/65">Yebo spots the small things that win trust: a clear scope, a start date, a deposit for materials. One useful suggestion at a time.</p></div><div className="rounded-2xl bg-ink p-5 text-paper shadow-2xl"><div className="mb-6 flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-[.18em] text-paper/50">Quote coach</span><span className="size-2 rounded-full bg-lime" /></div>{[["Add what isn&apos;t included to avoid arguments later.", "Add it"], ["Big job with no deposit? Protect your materials.", "Ask for 50%"], ["A personal note can make the difference.", "Use friendly"]].map(([text, action]) => <div key={text} className="flex items-center justify-between gap-4 border-t border-paper/15 py-5"><p className="text-sm font-medium">{text}</p><button className="shrink-0 rounded-full bg-lime px-3 py-2 text-xs font-bold text-ink">{action}</button></div>)}</div></div></section>

      <section className="px-5 py-24 text-center sm:px-8"><p className="text-xs font-bold uppercase tracking-[.2em] text-orange">Ready when you are</p><h2 className="mx-auto mt-5 max-w-3xl text-5xl font-black leading-[.9] tracking-[-.06em] sm:text-7xl">Make your next quote your best one.</h2><Link href="/login" className="mt-10 inline-block rounded-full bg-ink px-8 py-4 text-base font-bold text-paper transition-transform hover:-translate-y-1">Get started free <span aria-hidden="true">↗</span></Link></section>

      <footer className="border-t border-ink/10"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm text-ink/50 sm:px-8 lg:px-12"><Logo /><span>Made in South Africa for small business.</span><Link href="/login" className="font-bold text-ink">Sign in</Link></div></footer>
    </main>
  );
}
