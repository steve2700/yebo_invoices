import type { Metadata } from "next";
import LandingHeader from "@/components/LandingHeader";
import { appUrl } from "@/lib/url";
import LandingHero from "@/components/LandingHero";
import WorkflowSection from "@/components/WorkflowSection";
import ProductStorySection from "@/components/ProductStorySection";
import ClosingSection from "@/components/ClosingSection";
import LandingFooter from "@/components/LandingFooter";

const description =
  "Create professional quotes and invoices for South African small businesses. Draft from a voice note, share a clear client link and turn accepted quotes into invoices.";

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
        <WorkflowSection />
        <ProductStorySection />
        <ClosingSection />
      </main>
      <LandingFooter />
    </>
  );
}
