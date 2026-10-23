import type { Metadata } from "next";
import InfoPage from "@/components/InfoPage";
import FaqSection, { questions } from "@/components/FaqSection";

const title = "Yebo questions | Answers before you start";
const description = "Do clients need an account? How do I get paid? Can I cancel? Straight answers about quotes, invoices, plans and your information on Yebo.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/faq" },
  openGraph: { type: "website", locale: "en_ZA", siteName: "Yebo Invoices", title, description, url: "/faq" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: questions.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
};

export default function Faq() {
  return (
    <InfoPage eyebrow="Questions" title="Good questions, straight answers" intro="Everything people ask before they send their first quote on Yebo." roast="Asking questions before you commit? Already more organised than your last quote." jsonLd={jsonLd}>
      <FaqSection />
    </InfoPage>
  );
}
