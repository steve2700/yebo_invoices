import type { Metadata } from "next";
import InfoPage from "@/components/InfoPage";
import WorkflowSection from "@/components/WorkflowSection";
import ProductStorySection from "@/components/ProductStorySection";

const title = "How Yebo works | Quotes and invoices for South African small business";
const description = "See how Yebo turns a voice note into a clear quote, sends it by email or WhatsApp, shows you when your client opens it, and gets you paid online.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/how-it-works" },
  openGraph: { type: "website", locale: "en_ZA", siteName: "Yebo Invoices", title, description, url: "/how-it-works" },
};

export default function HowItWorks() {
  return (
    <InfoPage eyebrow="How it works" title="From a voice note to a paid invoice" intro="Speak the job, check the quote, send it in one tap and see exactly when your client opens it, accepts it and pays.">
      <WorkflowSection />
      <ProductStorySection />
    </InfoPage>
  );
}
