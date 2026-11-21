/* eslint-disable @next/next/no-img-element */
import { readableOn } from "@/lib/color";

type Props = { name: string; logoUrl?: string | null; color?: string | null; phone?: string | null };

// A sample quote wearing the business's own name, logo and colour, so on the payment step they can already see what their clients will receive.
// The figures are clearly an example. Nothing here is saved or sent.
export default function YourQuotePreview({ name, logoUrl, color, phone }: Props) {
  const brand = color && /^#[0-9a-f]{6}$/i.test(color) ? color : "#0F8A5F";
  const on = readableOn(brand);
  const items: [string, string][] = [
    ["Supply and fit new cupboard doors", "R3 200"],
    ["Labour, 2 days", "R1 800"],
    ["Clean up and removal of old doors", "R350"],
  ];
  return (
    <section aria-label="What your clients will receive" className="mt-8 grid max-w-5xl items-center gap-6 rounded-2xl bg-white p-5 ring-1 ring-black/5 sm:p-6 md:grid-cols-[1fr_320px]">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[.18em] text-yebo">Look what your clients get</p>
        <h2 className="mt-2 text-2xl font-black leading-tight tracking-[-.03em] text-ink">That is {name}, ready to send.</h2>
        <p className="mt-2 text-sm leading-6 text-ink/70">Your logo, your colour, your details. Your client opens one clean link, taps accept, and you get a ping the moment they look at it.</p>
        <ul className="mt-3 flex flex-col gap-1.5 text-sm font-semibold text-ink">
          {["A quote in about a minute, even by voice", "Know when it is opened and when it is accepted", "Turn it into an invoice in one tap"].map((t) => (
            <li key={t} className="flex items-start gap-2"><span aria-hidden="true" className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-lime text-xs font-black">✓</span>{t}</li>
          ))}
        </ul>
      </div>
      <div className="mx-auto w-full max-w-[320px]">
        <div className="relative overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-black/10">
          <span className="absolute right-2 top-2 rounded bg-ink/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink/60">Example</span>
          <div className="flex items-center gap-3 px-4 py-3" style={{ background: brand, color: on }}>
            <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white text-base font-black" style={{ color: brand }}>
              {logoUrl ? <img src={logoUrl} alt="" className="block max-h-full max-w-full object-contain" /> : name.slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-extrabold">{name}</span>
              <span className="block truncate text-xs opacity-80">{phone || "Quote for your client"}</span>
            </span>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wider text-ink/50">Quote for Mrs Dlamini</p>
            <ul className="mt-2 divide-y divide-ink/10">
              {items.map(([label, price]) => (
                <li key={label} className="flex items-start justify-between gap-3 py-2 text-sm"><span className="font-semibold text-ink">{label}</span><span className="shrink-0 tabular-nums text-ink/80">{price}</span></li>
              ))}
            </ul>
            <p className="mt-2 flex items-baseline justify-between border-t-2 border-ink/80 pt-2 text-base font-black text-ink"><span>Total</span><span className="tabular-nums">R5 350</span></p>
            <span className="mt-3 flex min-h-11 items-center justify-center rounded-lg text-sm font-extrabold" style={{ background: brand, color: on }}>Accept this quote</span>
          </div>
        </div>
      </div>
    </section>
  );
}
