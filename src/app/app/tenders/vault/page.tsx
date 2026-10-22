import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { tenderAccess } from "@/lib/tender-access";
import { loadVault } from "@/lib/tender-data";
import { southAfricaDate } from "@/lib/time";
import { vaultChecks } from "@/lib/tenders";
import TenderUpgrade from "../TenderUpgrade";
import VaultForm from "../VaultForm";

export default async function VaultPage() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const { data: business } = await sb.from("businesses").select("id").maybeSingle();
  if (!business) redirect("/app/onboarding");
  if (!(await tenderAccess(sb)).allowed) return <TenderUpgrade />;
  const vault = await loadVault(sb, business.id);
  const checks = vaultChecks(vault, southAfricaDate());
  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Link href="/app/tenders" className="text-sm font-bold text-yebo">← Tenders</Link>
      <h1 className="mt-3 text-3xl font-black tracking-tight text-ink">Compliance vault</h1>
      <p className="mt-1 text-sm text-ink/60">Keep these valid and Yebo attaches them to every bid. An expired document locks submission so you never send a non-compliant bid.</p>
      <div className="mt-6"><VaultForm userId={user.id} initial={vault} checks={checks} /></div>
    </main>
  );
}
