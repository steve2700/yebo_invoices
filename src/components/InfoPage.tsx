import LandingHeader from "@/components/LandingHeader";
import LandingFooter from "@/components/LandingFooter";
import ClosingSection from "@/components/ClosingSection";

type Props = {
  eyebrow: string;
  title: string; // the one h1 on the page
  intro: string;
  children: React.ReactNode;
  jsonLd?: object;
};

// Shared shell for the public pages (How it works, Why Yebo, Pricing, Questions): header, a short intro with the page's
// own heading, the content, a closing call to action and the footer. Each page has its own address so it can be found on its own.
export default function InfoPage({ eyebrow, title, intro, children, jsonLd }: Props) {
  return (
    <>
      <LandingHeader />
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />}
      <main className="text-yebo-deep">
        <div className="mx-auto max-w-7xl px-5 pt-12 sm:px-8 sm:pt-16 lg:px-12">
          <p className="text-xs font-extrabold uppercase tracking-[.2em] text-yebo">{eyebrow}</p>
          <h1 className="mt-3 max-w-4xl text-4xl font-black leading-[1.02] tracking-tight sm:text-6xl">{title}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-yebo-deep/70">{intro}</p>
        </div>
        <div className="mt-10">{children}</div>
        <ClosingSection />
      </main>
      <LandingFooter />
    </>
  );
}
