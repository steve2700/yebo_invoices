import Link from "next/link";

// Shown to anyone not on The Industry King, in the same style as the VAT report's upgrade card.
export default function TenderUpgrade() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <h1 className="text-3xl font-black tracking-tight text-ink">Tenders</h1>
      <div className="fade-up mt-6 rounded-3xl border border-ink/10 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-extrabold uppercase tracking-[.16em] text-yebo">Part of The Industry King</p>
        <p className="mt-3 text-lg font-bold leading-7 text-ink">Stop losing tenders to paperwork. Upload the BOQ and Yebo reads it, you add your rates, and your compliance documents go out with it.</p>
        <ul className="mt-4 space-y-2 text-sm leading-6 text-ink/70">
          <li>Reads Excel and PDF Bills of Quantities, including very big ones</li>
          <li>Every line can be checked against the original and adjusted</li>
          <li>Warns you when a CSD, SARS, B-BBEE or COIDA document has expired</li>
          <li>Sends one tidy bid email with the priced schedule and your documents</li>
        </ul>
        <Link href="/app/subscribe?change=1" className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-yebo px-6 text-sm font-extrabold text-white shadow-sm transition hover:bg-yebo-deep">See the plans</Link>
      </div>
    </main>
  );
}
