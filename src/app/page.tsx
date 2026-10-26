import type { Metadata } from "next";
import LandingHeader from "@/components/LandingHeader";
import { appUrl } from "@/lib/url";
import LandingHero from "@/components/LandingHero";
import RoastSection from "@/components/RoastSection";
import ScreenShowcase from "@/components/ScreenShowcase";
import WorkflowSection from "@/components/WorkflowSection";
import ProductStorySection from "@/components/ProductStorySection";
import MoreFeaturesSection from "@/components/MoreFeaturesSection";
import WhyNotAChatbot from "@/components/WhyNotAChatbot";
import PricingSection from "@/components/PricingSection";
import FaqSection from "@/components/FaqSection";
import ClosingSection from "@/components/ClosingSection";
import LandingFooter from "@/components/LandingFooter";

const description =
  "Quotes and invoices for South African small businesses. Speak a quote, check it before you send, see when your client opens it, get paid online and know why you win or lose work.";

export const metadata: Metadata = {
  title: "Yebo Invoices | Clear quotes, faster invoicing",
  description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_ZA",
    siteName: "Yebo Invoices",
    title: "Yebo Invoices | Clear quotes, faster invoicing",
    description,
    url: appUrl(),
    images: [
      {
        url: "/images/yebo-hero-workshop.png",
        alt: "A South African cabinetmaker checking a quote on her phone in her workshop.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Yebo Invoices | Clear quotes, faster invoicing",
    description,
    images: ["/images/yebo-hero-workshop.png"],
  },
};

export default function Home() {
  return (
    <>
      <LandingHeader />
      <main>
        <LandingHero />
        <RoastSection />
        <ScreenShowcase />
        <WorkflowSection />
        <WhyNotAChatbot />
        <ProductStorySection />
        <MoreFeaturesSection />
        <PricingSection />
        <FaqSection />
        <ClosingSection />
      </main>
      <LandingFooter />
    </>
  );
}
