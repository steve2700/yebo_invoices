import type { Metadata } from "next";
import Link from "next/link";
import SurveyForm from "./SurveyForm";
import { cleanSource } from "@/lib/survey";

export const metadata: Metadata = {
  title: "Quick survey | Yebo Invoices",
  description: "Ten taps about how you handle quotes and invoices. No typing.",
  robots: { index: false, follow: false },
};

export default async function SurveyPage({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const { s } = await searchParams;
  return (
    <main className="min-h-dvh bg-paper">
      <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-5 py-6 sm:px-8">
        <Link href="/" className="text-sm font-extrabold tracking-tight text-yebo-deep">Yebo Invoices</Link>
        <div className="flex flex-1 flex-col justify-center py-8">
          <SurveyForm source={cleanSource(s)} />
        </div>
        <p className="text-xs leading-5 text-ink/55">Your answers are anonymous. We do not ask for your name or number.</p>
      </div>
    </main>
  );
}
