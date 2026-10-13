import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { privacyPolicy } from "@/lib/legal-content";

export const metadata: Metadata = {
  title: "Privacy Notice | Yebo Invoices",
  description: "How Yebo Invoices handles the information you and your clients put into the app.",
};

export default function PrivacyPage() {
  return <LegalPage doc={privacyPolicy} other={{ href: "/terms", label: "Read the Terms of Service" }} />;
}
