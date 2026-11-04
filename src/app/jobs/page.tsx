import type { Metadata } from "next";
import Link from "next/link";
import InfoPage from "@/components/InfoPage";
import { PAGES } from "@/lib/opportunities";
import { appUrl } from "@/lib/url";

export const metadata: Metadata = {
  title: "Get quotes from local carpenters | Yebo",
  description: "Tell us about your job once and up to 3 local carpenters reply with a quote. Free to ask.",
  alternates: { canonical: `${appUrl()}/jobs` },
};

export default function Jobs() {
  return (
    <InfoPage title="Get quotes from local carpenters" intro="Pick the page that fits your job. Tell us once, and up to 3 local carpenters who use Yebo reply with a quote. It is free to ask.">
      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:px-12">
        <p role="note" className="mb-6 rounded-2xl bg-orange/10 p-4 text-sm leading-6 text-yebo-deep"><b>New:</b> Yebo local jobs is still being rolled out. We are adding carpenters area by area, so in some areas we may not have anyone available yet. If so, we will tell you straight away and nothing is sent.</p>
        <ul className="grid gap-4 sm:grid-cols-2">
          {PAGES.map((p) => (
            <li key={p.slug}>
              <Link href={`/jobs/${p.slug}`} className="block rounded-3xl bg-yebo-chalk p-6 transition hover:shadow-md">
                <h2 className="text-xl font-extrabold tracking-tight">{p.h1}</h2>
                <p className="mt-2 text-base leading-7 text-yebo-deep/70">{p.description}</p>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-10 text-base text-yebo-deep/70">Are you a carpenter? Yebo Opportunities sends local jobs to the businesses that use Yebo. <Link href="/login" className="font-bold underline">Sign in</Link> and open Opportunities to switch it on.</p>
      </section>
    </InfoPage>
  );
}
