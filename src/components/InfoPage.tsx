import LandingHeader from "@/components/LandingHeader";
import LandingFooter from "@/components/LandingFooter";
import ClosingSection from "@/components/ClosingSection";

type Props = {
  eyebrow: string;
  title: string; // the one h1 on the page
  intro: string;
  roast?: string;
  children: React.ReactNode;
  jsonLd?: object;
};

// Shared shell for the public pages (How it works, Why Yebo, Pricing, Questions): header, a short intro with the page's
// own heading, the content, a closing call to action and the footer. Each page has its own address so it can be found on its own.
export default function InfoPage({ eyebrow, title, intro, roast, children, jsonLd }: Props) {
  return (
    <>
      <LandingHeader />
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />}
      <main className="text-yebo-deep">
        <div className="relative overflow-hidden bg-yebo-chalk">
          <div aria-hidden="true" className="pointer-events-none absolute -right-40 -top-40 size-[30rem] rounded-full bg-lime/30 blur-3xl" />
          <div className="relative mx-auto max-w-7xl px-5 pb-14 pt-14 sm:px-8 sm:pb-20 sm:pt-20 lg:px-12">
            <p className="fade-up inline-flex items-center gap-2 rounded-full border border-yebo-deep/10 bg-white/80 px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[.16em] text-yebo">
              <span aria-hidden="true" className="size-2 rounded-full bg-yebo" />
              {eyebrow}
            </p>
            <h1 className="fade-up mt-5 max-w-4xl text-balance text-[clamp(2.5rem,7vw,5rem)] font-extrabold leading-[.95] tracking-[-.055em]" style={{ "--d": ".06s" } as React.CSSProperties}>
              {title}
            </h1>
            <p className="fade-up mt-6 max-w-2xl text-pretty text-lg leading-8 text-yebo-deep/70" style={{ "--d": ".12s" } as React.CSSProperties}>{intro}</p>
            {roast && (
              <p className="fade-up mt-6 inline-flex max-w-2xl items-start gap-3 rounded-2xl border-l-4 border-orange bg-white px-4 py-3 text-sm font-semibold italic leading-6 text-yebo-deep" style={{ "--d": ".18s" } as React.CSSProperties}>
                {roast}
              </p>
            )}
          </div>
        </div>
        <div>{children}</div>
        <ClosingSection />
      </main>
      <LandingFooter />
    </>
  );
}
