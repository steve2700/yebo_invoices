import type { Metadata } from "next";
import Link from "next/link";
import { validUnsub } from "@/lib/unsub-token";
import UnsubForm from "./UnsubForm";

export const metadata: Metadata = { title: "Unsubscribe | Yebo Invoices", robots: { index: false, follow: false } };

export default async function Unsubscribe({ searchParams }: { searchParams: Promise<{ e?: string; t?: string }> }) {
  const { e = "", t = "" } = await searchParams;
  const ok = validUnsub(e.trim().toLowerCase(), t);
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-12">
      <h1 className="text-3xl font-extrabold tracking-tight text-yebo-deep">Stop reminder emails</h1>
      {ok ? (
        <>
          <p className="mt-3 text-sm leading-6 text-yebo-deep/70">We will stop sending setup reminders to {e}. Emails about your own quotes and invoices are not affected.</p>
          <UnsubForm email={e.trim().toLowerCase()} token={t} />
        </>
      ) : (
        <p className="mt-3 text-sm leading-6 text-yebo-deep/70">This link is not valid. Reply to the email you received and we will remove you by hand.</p>
      )}
      <Link href="/" className="mt-8 text-sm font-bold text-yebo underline underline-offset-4">Back to Yebo</Link>
    </main>
  );
}
