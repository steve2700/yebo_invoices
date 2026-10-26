import LandingHeader from "@/components/LandingHeader";
import LandingFooter from "@/components/LandingFooter";
import ClosingSection from "@/components/ClosingSection";

type Props = {
  title: string; // the one h1 on the page
  intro: string;
  children: React.ReactNode;
  jsonLd?: object;
};

// Shared shell for the public pages: header, a plain intro, the content, a closing call to action and the footer.
export default function InfoPage({ title, intro, children, jsonLd }: Props) {
  return (
    <>
      <LandingHeader />
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />}
      <main className="text-yebo-deep">
        <div className="bg-yebo-chalk">
          <div className="mx-auto max-w-7xl px-5 pb-12 pt-12 sm:px-8 sm:pb-16 sm:pt-16 lg:px-12">
            <h1 className="max-w-4xl text-balance text-[clamp(2.25rem,6vw,4.5rem)] font-extrabold leading-[.98] tracking-[-.045em]">{title}</h1>
            <p className="mt-5 max-w-2xl text-pretty text-lg leading-8 text-yebo-deep/75">{intro}</p>
          </div>
        </div>
        <div>{children}</div>
        <ClosingSection />
      </main>
      <LandingFooter />
    </>
  );
}
