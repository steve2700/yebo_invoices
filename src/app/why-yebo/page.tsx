import type { Metadata } from "next";
import InfoPage from "@/components/InfoPage";
import WhyNotAChatbot from "@/components/WhyNotAChatbot";
import OldWaySection from "@/components/OldWaySection";
import ScreenShowcase from "@/components/ScreenShowcase";

const title = "Why Yebo | Built for quotes and invoices, not a chatbot";
const description = "Yebo uses AI to draft your quote, but the numbers, dates and links are always yours. See why a purpose-built quoting app beats a general chatbot for a small business.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/why-yebo" },
  openGraph: { type: "website", locale: "en_ZA", siteName: "Yebo Invoices", title, description, url: "/why-yebo" },
};

export default function WhyYebo() {
  return (
    <InfoPage
      title="Made for quoting, not for chatting"
      intro="A general chatbot can write words. Yebo keeps your prices exact, tracks every quote and invoice, and never sends anything to a client without you."
    >
      <WhyNotAChatbot />
      <OldWaySection />
      <ScreenShowcase tone="white" title="See it for yourself" />
    </InfoPage>
  );
}
