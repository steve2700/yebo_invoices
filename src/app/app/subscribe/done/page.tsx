import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasAccess } from "@/lib/access";
import { loadSubscription } from "@/lib/subscription";
import Refresher from "./Refresher";

export const dynamic = "force-dynamic";

// Where PayFast sends the owner after they pay. This page only ever trusts our own records: it moves on
// as soon as PayFast's verified confirmation has switched the plan on.
export default async function SubscribeDone({ searchParams }: { searchParams: Promise<{ onboarding?: string }> }) {
  const { onboarding } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const sub = await loadSubscription(supabase);
  if (hasAccess(sub)) redirect(onboarding ? "/app/onboarding/welcome" : "/app?subscribed=1");

  return (
    <main className="grid min-h-[70vh] place-items-center px-5 py-12">
      <section className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-xl ring-1 ring-black/5">
        <h1 className="pop-in text-2xl font-extrabold tracking-tight text-ink">Thank you</h1>
        <p className="mt-3 text-base leading-7 text-ink/75">We are confirming your payment with PayFast. This usually takes a few seconds.</p>
        <Refresher />
        <Link href="/app/subscribe" className="mt-6 inline-block text-sm font-bold text-ink/50 underline underline-offset-2">Back to the plans</Link>
      </section>
    </main>
  );
}
