import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { termsOfService } from "@/lib/legal-content";

export const metadata: Metadata = {
  title: "Terms of Service | Yebo Invoices",
  description: "The terms for using Yebo Invoices, including how the subscription, online payments and cancellation work.",
};

export default function TermsPage() {
  return <LegalPage doc={termsOfService} other={{ href: "/privacy", label: "Read the Privacy Notice" }} />;
}
