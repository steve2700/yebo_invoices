import Link from "next/link";
import LandingHeader from "@/components/LandingHeader";
import LandingFooter from "@/components/LandingFooter";
import { legalContact, legalContactIsIncomplete, legalSectionsForToc, type LegalDocument } from "@/lib/legal-content";

type Props = {
  doc: LegalDocument;
  other: { href: string; label: string };
};

// Shared layout for the Privacy Notice and the Terms of Service.
export default function LegalPage({ doc, other }: Props) {
  const toc = legalSectionsForToc(doc);
  const incomplete = legalContactIsIncomplete();

  return (
    <>
      <LandingHeader />
      <main className="bg-yebo-chalk text-yebo-deep">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
          <header className="fade-up max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-yebo">{doc.eyebrow}</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">{doc.title}</h1>
            <p className="mt-4 text-base leading-7 text-yebo-deep/65">{doc.description}</p>
            <p className="mt-4 inline-flex rounded-full bg-white px-3 py-1.5 text-xs font-bold text-yebo-deep/60 ring-1 ring-yebo-deep/10">Last updated {doc.updated}</p>
          </header>

          <div className="mt-10 grid gap-10 lg:grid-cols-[230px_minmax(0,1fr)]">
            <nav aria-label="On this page" className="hidden lg:block">
              <div className="sticky top-24 rounded-2xl border border-yebo-deep/10 bg-white/70 p-2">
                {toc.map((item, index) => (
                  <a key={item.id} href={`#${item.id}`} className="flex items-start gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-yebo-deep/65 transition hover:bg-yebo-chalk hover:text-yebo-deep">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-yebo-chalk text-[10px] font-black text-yebo">{index + 1}</span>
                    {item.title}
                  </a>
                ))}
              </div>
            </nav>

            <div className="flex flex-col gap-5">
              {doc.sections.map((section, index) => (
                <section key={section.id} id={section.id} className="scroll-mt-24 rounded-3xl border border-yebo-deep/10 bg-white p-6 shadow-sm sm:p-8">
                  <h2 className="flex items-start gap-3 text-xl font-extrabold tracking-tight">
                    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-yebo-chalk text-xs font-black text-yebo">{index + 1}</span>
                    {section.title}
                  </h2>
                  <div className="mt-4 flex flex-col gap-3 text-[15px] leading-7 text-yebo-deep/75">
                    {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                    {section.bullets && (
                      <ul className="ml-1 flex list-disc flex-col gap-2 pl-5 marker:text-yebo">
                        {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
                      </ul>
                    )}
                  </div>
                </section>
              ))}

              <section id="contact" className="scroll-mt-24 rounded-3xl border border-yebo-deep/10 bg-white p-6 shadow-sm sm:p-8">
                <h2 className="flex items-start gap-3 text-xl font-extrabold tracking-tight">
                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-yebo-chalk text-xs font-black text-yebo">{doc.sections.length + 1}</span>
                  Operator and contact
                </h2>
                <dl className="mt-4 grid gap-3 text-[15px] leading-7 sm:grid-cols-[170px_1fr]">
                  {legalContact.legalName && (<><dt className="font-bold text-yebo-deep/55">Operator</dt><dd>{legalContact.legalName}</dd></>)}
                  {legalContact.registeredAddress && (<><dt className="font-bold text-yebo-deep/55">Address</dt><dd>{legalContact.registeredAddress}</dd></>)}
                  {legalContact.contactEmail && (<><dt className="font-bold text-yebo-deep/55">Email</dt><dd><a className="font-semibold text-yebo underline underline-offset-2" href={`mailto:${legalContact.contactEmail}`}>{legalContact.contactEmail}</a></dd></>)}
                </dl>
                {incomplete && process.env.NODE_ENV !== "production" && (
                  <p role="note" className="mt-4 rounded-xl border border-orange/30 bg-orange/10 p-3 text-sm font-semibold">
                    Developer note: add LEGAL_NAME, LEGAL_ADDRESS and CONTACT_EMAIL to your environment variables before launch. This note only shows while you build.
                  </p>
                )}
              </section>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/70 px-5 py-4 text-sm font-semibold ring-1 ring-yebo-deep/10">
                <Link href="/" className="text-yebo-deep/65 transition hover:text-yebo">← Back to Yebo</Link>
                <Link href={other.href} className="text-yebo transition hover:text-yebo-deep">{other.label} →</Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      <LandingFooter />
    </>
  );
}
