import Image from "next/image";
import Link from "next/link";
import LandingHeader from "@/components/LandingHeader";
import LandingFooter from "@/components/LandingFooter";
import ClosingSection from "@/components/ClosingSection";

type Props = {
  title: string; // the one h1 on the page
  intro: string;
  children: React.ReactNode;
  jsonLd?: object;
  eyebrow?: string; // small line above the title
  photo?: { src: string; alt: string; position?: string }; // a photo from /public/hero for the top of the page
  cta?: { label: string; href: string }; // optional main button in the top section
};

// Shared shell for the public pages: a photo top section (like the home page), the content, a closing call to action and the footer.
export default function InfoPage({ title, intro, children, jsonLd, eyebrow, photo, cta }: Props) {
  return (
    <>
      <LandingHeader overlay />
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />}
      <main className="text-yebo-deep">
        <section className="relative isolate overflow-hidden bg-yebo-deep text-white">
          {photo && (
            <div className="relative h-60 sm:h-80 lg:absolute lg:inset-y-0 lg:right-0 lg:h-auto lg:w-[56%]">
              <Image src={photo.src} alt={photo.alt} fill priority sizes="(max-width: 1024px) 100vw, 56vw" className={`object-cover ${photo.position ?? "object-center"}`} />
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-yebo-deep lg:bg-gradient-to-r lg:from-yebo-deep lg:via-yebo-deep/25 lg:to-transparent" />
            </div>
          )}
          <div className={`relative mx-auto max-w-7xl px-5 sm:px-8 lg:px-12 ${photo ? "-mt-12 pb-12 lg:mt-0 lg:flex lg:min-h-[520px] lg:items-center lg:pb-20 lg:pt-28" : "pb-14 pt-28 sm:pb-20 sm:pt-32"}`}>
            <div className="max-w-2xl">
              {eyebrow && (
                <p className="flex items-center gap-2 text-sm font-semibold text-white/85">
                  <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-yebo-sun" />
                  {eyebrow}
                </p>
              )}
              <h1 className="mt-4 max-w-4xl text-balance text-[clamp(2.25rem,6vw,4.25rem)] font-extrabold leading-[.98] tracking-[-.045em]">{title}</h1>
              <span aria-hidden="true" className="mt-5 block h-1 w-14 rounded-full bg-yebo-sun" />
              <p className="mt-5 max-w-xl text-pretty text-lg leading-8 text-white/85">{intro}</p>
              {cta && (
                <Link href={cta.href} className="mt-7 inline-flex min-h-[52px] items-center justify-center rounded-lg bg-yebo-sun px-7 text-base font-extrabold text-yebo-deep shadow-[0_8px_30px_rgba(0,0,0,.25)] transition hover:brightness-95 active:scale-[.98]">
                  {cta.label}
                </Link>
              )}
            </div>
          </div>
        </section>
        <div>{children}</div>
        <ClosingSection />
      </main>
      <LandingFooter />
    </>
  );
}
