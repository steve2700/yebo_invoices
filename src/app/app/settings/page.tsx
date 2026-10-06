import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LogoUpload from "./LogoUpload";

async function save(fd: FormData) {
  "use server";
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const t = (k: string) => String(fd.get(k) ?? "").trim() || null;
  const g = t("guarantee_months");
  const { error } = await sb.from("businesses").update({
    bank_name: t("bank_name"), bank_account_type: t("bank_account_type"), bank_account_holder: t("bank_account_holder"),
    bank_account_number: t("bank_account_number"), bank_branch_code: t("bank_branch_code"),
    guarantee_months: g ? +g : null, brand_color: t("brand_color") ?? "#0F8A5F",
    default_expiry_days: +(t("default_expiry_days") ?? 14),
  }).eq("owner_id", user.id);
  // The database enforces: account number 8-11 digits, branch code 6 digits.
  if (error) redirect(`/app/settings?error=${encodeURIComponent("Please check your banking details: account number is 8 to 11 digits and branch code is 6 digits.")}`);
  redirect("/app/settings?saved=1");
}

const box = "mt-1 w-full rounded-xl border px-3 py-2";
export default async function Settings({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const sp = await searchParams;
  const sb = await createClient();
  const { data: b } = await sb.from("businesses").select("*").maybeSingle();
  if (!b) redirect("/app/onboarding");
  return (
    <main className="mx-auto max-w-md px-5 py-8">
      <Link href="/app" className="text-sm text-neutral-500">Dashboard</Link>
      <h1 className="mt-2 text-2xl font-extrabold">Settings</h1>
      {sp.saved && <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">Saved.</p>}
      {sp.error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{sp.error}</p>}
      <section className="mt-4 rounded-2xl bg-white shadow-sm ring-1 ring-black/5 p-5"><h2 className="mb-2 font-extrabold">Logo</h2><LogoUpload current={b.logo_url} /></section>
      <form action={save} className="mt-4 space-y-3 rounded-2xl bg-white shadow-sm ring-1 ring-black/5 p-5 text-sm">
        <h2 className="font-extrabold">Banking details (optional)</h2>
        <p className="text-neutral-500">Skip this and clients can still open your quote online. Double-check every digit.</p>
        <label className="block">Bank<select name="bank_name" defaultValue={b.bank_name ?? ""} className={box}>
          <option value="">Not set</option>{["FNB", "Standard Bank", "Absa", "Nedbank", "Capitec", "Other"].map((x) => <option key={x}>{x}</option>)}</select></label>
        <label className="block">Account type<select name="bank_account_type" defaultValue={b.bank_account_type ?? "Business cheque"} className={box}>
          {["Business cheque", "Savings", "Current"].map((x) => <option key={x}>{x}</option>)}</select></label>
        <label className="block">Account holder (match your business name)<input name="bank_account_holder" defaultValue={b.bank_account_holder ?? ""} className={box} /></label>
        <label className="block">Account number<input name="bank_account_number" inputMode="numeric" defaultValue={b.bank_account_number ?? ""} className={box} /></label>
        <label className="block">Branch code (6 digits)<input name="bank_branch_code" inputMode="numeric" defaultValue={b.bank_branch_code ?? ""} className={box} /></label>
        <h2 className="pt-2 font-extrabold">Look and trust</h2>
        <label className="block">Brand colour<input type="color" name="brand_color" defaultValue={b.brand_color} className="mt-1 h-10 w-20" /></label>
        <label className="block">Workmanship guarantee<select name="guarantee_months" defaultValue={b.guarantee_months ?? ""} className={box}>
          <option value="">None</option>{[3, 6, 12].map((m) => <option key={m} value={m}>{m} months</option>)}</select></label>
        <label className="block">Quotes are valid for<select name="default_expiry_days" defaultValue={b.default_expiry_days} className={box}>
          {[7, 14, 30].map((d) => <option key={d} value={d}>{d} days</option>)}</select></label>
        <button className="w-full rounded-xl bg-yebo px-4 py-3 font-bold text-white">Save</button>
      </form>
    </main>
  );
}
