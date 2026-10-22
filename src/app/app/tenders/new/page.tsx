import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { tenderAccess } from "@/lib/tender-access";
import NewTenderForm from "../NewTenderForm";
import TenderUpgrade from "../TenderUpgrade";

export default async function NewTender() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const { data: business } = await sb.from("businesses").select("id").maybeSingle();
  if (!business) redirect("/app/onboarding");
  if (!(await tenderAccess(sb)).allowed) return <TenderUpgrade />;
  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Link href="/app/tenders" className="text-sm font-bold text-yebo">← Tenders</Link>
      <h1 className="mt-3 text-3xl font-black tracking-tight text-ink">New tender</h1>
      <p className="mt-1 text-sm text-ink/60">Enter the basics from the tender notice. You can change them later.</p>
      <div className="mt-6"><NewTenderForm /></div>
    </main>
  );
}
