import type { Metadata } from "next";
import LandingHeader from "@/components/LandingHeader";
import { appUrl } from "@/lib/url";
import LandingHero from "@/components/LandingHero";
import OldWaySection from "@/components/OldWaySection";
import WorkflowSection from "@/components/WorkflowSection";
import PhotoStrip from "@/components/PhotoStrip";
import FeatureBands from "@/components/FeatureBands";
import ScreenShowcase from "@/components/ScreenShowcase";
import WhyNotAChatbot from "@/components/WhyNotAChatbot";
import PricingSection from "@/components/PricingSection";
import FaqSection from "@/components/FaqSection";
import ClosingSection from "@/components/ClosingSection";
import LandingFooter from "@/components/LandingFooter";

const description =
  "Quotes and invoices for South African small businesses. Say the job out loud, send the quote, see when your client opens it, get paid by card or instant EFT, and find government tenders.";

export const metadata: Metadata = {
  title: "Yebo Invoices | Quotes clients say yes to",
  description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_ZA",
    siteName: "Yebo Invoices",
    title: "Yebo Invoices | Quotes clients say yes to",
    description,
    url: appUrl(),
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Yebo Invoices: quotes clients say yes to. A yard sign reading: Bro, you didn't put your quotes in Yebo already?" }],
  },
  twitter: { card: "summary_large_image", title: "Yebo Invoices | Quotes clients say yes to", description, images: ["/og.png"] },
};

export default function Home() {
  return (
    <>
      <LandingHeader />
      <main>
        <LandingHero />
        <OldWaySection />
        <WorkflowSection />
        <PhotoStrip heading="Real jobs, quoted on Yebo" />
        <FeatureBands />
        <ScreenShowcase />
        <WhyNotAChatbot />
        <PricingSection />
        <FaqSection />
        <ClosingSection />
      </main>
      <LandingFooter />
    </>
  );
}
