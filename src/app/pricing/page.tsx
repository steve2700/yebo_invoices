import type { Metadata } from "next";
import InfoPage from "@/components/InfoPage";
import PricingSection from "@/components/PricingSection";
import { PLANS, PLAN_ORDER } from "@/lib/plans";

const title = "Yebo pricing | Plans from R49 a month";
const description = "Three simple plans for South African small businesses, from R49 a month. Quotes, invoices, voice quotes, online payments, and tenders on The Industry King. Cancel any time.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/pricing" },
  openGraph: { type: "website", locale: "en_ZA", siteName: "Yebo Invoices", title, description, url: "/pricing" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  itemListElement: PLAN_ORDER.map((id, i) => ({
    "@type": "ListItem",
    position: i + 1,
    item: { "@type": "Offer", name: PLANS[id].name, price: String(PLANS[id].priceRand), priceCurrency: "ZAR", description: PLANS[id].who },
  })),
};

export default function Pricing() {
  return (
    <InfoPage eyebrow="Pricing" title="Pick the plan that fits a normal month" intro="Start small and change plan any time. Every plan includes quotes, invoices, online payments and your own logo and colours. Cancel from Settings whenever you like." roast="Cheaper than the one client who “forgot” to pay you last month." jsonLd={jsonLd}>
      <PricingSection />
    </InfoPage>
  );
}
