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
  if (error) redirect(`/app/settings?error=${encodeURIComponent("Please check your banking details: account number is 8 to 11 digits and branch code is 6 digits.")}`);
  redirect("/app/settings?saved=1");
}

const input = "mt-2 w-full rounded-xl border border-yebo-deep/10 bg-yebo-chalk/40 px-3.5 py-3 text-sm text-yebo-deep outline-none transition placeholder:text-yebo-deep/35 focus:border-yebo focus:bg-white focus:ring-4 focus:ring-yebo/10";
const label = "text-[11px] font-bold uppercase tracking-[0.14em] text-yebo-deep/55";

export default async function Settings({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const sp = await searchParams;
  const sb = await createClient();
  const { data: b } = await sb.from("businesses").select("*").maybeSingle();
  if (!b) redirect("/app/onboarding");

  return (
    <main className="min-h-[calc(100vh-65px)] bg-yebo-chalk px-5 py-8 text-yebo-deep sm:py-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-9 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <Link href="/app" className="inline-flex items-center gap-2 text-sm font-semibold text-yebo-deep/55 transition hover:text-yebo">
              <span aria-hidden="true">←</span> Back to dashboard
            </Link>
            <p className="mt-7 text-xs font-bold uppercase tracking-[0.2em] text-yebo">Workspace settings</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">Make it yours.</h1>
            <p className="mt-3 max-w-lg text-base leading-7 text-yebo-deep/60">Set up the details that make every quote feel unmistakably like your business.</p>
          </div>
          <div className="hidden rounded-2xl border border-yebo-deep/10 bg-white px-4 py-3 text-right shadow-sm sm:block">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-yebo-deep/45">Your workspace</p>
            <p className="mt-1 font-bold">Ready to impress</p>
            <div className="mt-2 h-1.5 w-32 overflow-hidden rounded-full bg-yebo-chalk"><div className="h-full w-4/5 rounded-full bg-yebo" /></div>
          </div>
        </div>

        {sp.saved && <div role="status" className="mb-5 rounded-2xl border border-yebo/20 bg-lime/30 px-4 py-3 text-sm font-semibold text-yebo-deep">Your settings are saved and ready for the next quote.</div>}
        {sp.error && <div role="alert" className="mb-5 rounded-2xl border border-orange/20 bg-orange/10 px-4 py-3 text-sm font-semibold text-yebo-deep">{sp.error}</div>}

        <div className="grid gap-6 lg:grid-cols-[210px_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-2xl border border-yebo-deep/10 bg-white/70 p-2">
              {[['#identity', 'Brand identity'], ['#banking', 'Banking details'], ['#defaults', 'Quote defaults']].map(([href, text], index) => (
                <a key={href} href={href} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-yebo-deep/60 transition hover:bg-yebo-chalk hover:text-yebo-deep">
                  <span className="flex size-6 items-center justify-center rounded-full bg-yebo-chalk text-[10px] font-black text-yebo">0{index + 1}</span>{text}
                </a>
              ))}
            </div>
          </aside>

          <form action={save} className="flex flex-col gap-6">
            <section id="identity" className="overflow-hidden rounded-3xl border border-yebo-deep/10 bg-white shadow-[0_12px_40px_rgba(12,59,46,0.06)]">
              <div className="border-b border-yebo-deep/10 bg-gradient-to-br from-white to-yebo-chalk/70 px-6 py-6 sm:px-8">
                <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-yebo">01 · First impression</p><h2 className="mt-2 text-xl font-black">Brand identity</h2><p className="mt-1 text-sm text-yebo-deep/55">Give your documents a recognizable signature.</p></div><span className="rounded-full bg-lime px-3 py-1 text-xs font-black text-yebo-deep">Visible on quotes</span></div>
              </div>
              <div className="grid gap-7 px-6 py-7 sm:grid-cols-[150px_1fr] sm:px-8"><div><p className={label}>Your logo</p><div className="mt-2 flex size-28 items-center justify-center rounded-2xl border border-dashed border-yebo/30 bg-yebo-chalk/70 p-3"><LogoUpload current={b.logo_url} compact /></div></div><div className="flex flex-col justify-center gap-3"><p className="text-sm font-semibold">A little polish goes a long way.</p><p className="max-w-md text-sm leading-6 text-yebo-deep/55">Upload a square or horizontal logo. We&apos;ll place it neatly on your client-facing quote pages.</p><p className="text-xs font-semibold text-yebo-deep/40">PNG, JPG or SVG · Max 5 MB</p></div></div>
            </section>

            <section id="banking" className="rounded-3xl border border-yebo-deep/10 bg-white px-6 py-7 shadow-[0_12px_40px_rgba(12,59,46,0.06)] sm:px-8"><p className="text-xs font-bold uppercase tracking-[0.16em] text-yebo">02 · Get paid</p><h2 className="mt-2 text-xl font-black">Banking details <span className="text-sm font-medium text-yebo-deep/40">(optional)</span></h2><p className="mt-1 text-sm text-yebo-deep/55">Add these once and they&apos;ll be ready on every quote.</p><div className="mt-6 grid gap-5 sm:grid-cols-2"><label className={label}>Bank<select name="bank_name" defaultValue={b.bank_name ?? ""} className={input}><option value="">Not set</option>{["FNB", "Standard Bank", "Absa", "Nedbank", "Capitec", "Other"].map((x) => <option key={x}>{x}</option>)}</select></label><label className={label}>Account type<select name="bank_account_type" defaultValue={b.bank_account_type ?? "Business cheque"} className={input}>{["Business cheque", "Savings", "Current"].map((x) => <option key={x}>{x}</option>)}</select></label><label className={label}>Account holder<input name="bank_account_holder" placeholder="Your registered business name" defaultValue={b.bank_account_holder ?? ""} className={input} /></label><label className={label}>Account number<input name="bank_account_number" inputMode="numeric" placeholder="8–11 digits" defaultValue={b.bank_account_number ?? ""} className={input} /></label><label className={label}>Branch code<input name="bank_branch_code" inputMode="numeric" placeholder="6 digits" defaultValue={b.bank_branch_code ?? ""} className={input} /></label></div></section>

            <section id="defaults" className="rounded-3xl border border-yebo-deep/10 bg-white px-6 py-7 shadow-[0_12px_40px_rgba(12,59,46,0.06)] sm:px-8"><p className="text-xs font-bold uppercase tracking-[0.16em] text-yebo">03 · Your signature</p><h2 className="mt-2 text-xl font-black">Quote defaults</h2><p className="mt-1 text-sm text-yebo-deep/55">Set the details you use most often. You can always change them per quote.</p><div className="mt-6 grid gap-5 sm:grid-cols-2"><label className={label}>Brand colour<div className="mt-2 flex items-center gap-3 rounded-xl border border-yebo-deep/10 bg-yebo-chalk/40 p-2"><input type="color" name="brand_color" defaultValue={b.brand_color} className="size-10 cursor-pointer rounded-lg border-0 bg-transparent" /><span className="text-sm font-semibold">Your accent colour</span></div></label><label className={label}>Workmanship guarantee<select name="guarantee_months" defaultValue={b.guarantee_months ?? ""} className={input}><option value="">None</option>{[3, 6, 12].map((m) => <option key={m} value={m}>{m} months</option>)}</select></label><label className={label}>Quotes are valid for<select name="default_expiry_days" defaultValue={b.default_expiry_days} className={input}>{[7, 14, 30].map((d) => <option key={d} value={d}>{d} days</option>)}</select></label></div><div className="mt-8 flex justify-end border-t border-yebo-deep/10 pt-6"><button className="rounded-xl bg-yebo px-6 py-3 text-sm font-black text-white shadow-lg shadow-yebo/20 transition hover:-translate-y-0.5 hover:bg-yebo-deep focus-visible:outline-none">Save changes <span aria-hidden="true">→</span></button></div></section>
          </form>
        </div>
      </div>
    </main>
  );
}
