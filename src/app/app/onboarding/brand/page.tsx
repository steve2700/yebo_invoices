import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LogoUpload from "../../settings/LogoUpload";
import SubmitButton from "@/components/SubmitButton";

// Where a new user lands when onboarding is finished. The goal is their first quote, so go straight there.
const AFTER_ONBOARDING = "/app/onboarding/welcome";

async function saveBanking(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const fail = (message: string): never => redirect(`/app/onboarding/brand?error=${encodeURIComponent(message)}`);
  const text = (k: string) => String(formData.get(k) ?? "").trim() || null;

  const holder = text("bank_account_holder");
  const number = text("bank_account_number")?.replace(/\s/g, "") ?? null;
  const branch = text("bank_branch_code")?.replace(/\s/g, "") ?? null;
  const bankName = text("bank_name");

  // Nothing entered: just carry on. Banking details are optional.
  if (!holder && !number && !branch && !bankName) redirect(AFTER_ONBOARDING);

  if (number && !/^\d{8,11}$/.test(number)) return fail("Your account number should be 8 to 11 digits.");
  if (branch && !/^\d{6}$/.test(branch)) return fail("Your branch code should be 6 digits.");
  // Clients only see the EFT details if all three are there, so ask for them together.
  if (!holder || !number || !branch) {
    return fail("Please add the account holder, account number and branch code together, so clients can pay you by EFT. Or skip this for now.");
  }

  const { error } = await supabase.from("businesses").update({
    bank_name: bankName,
    bank_account_type: text("bank_account_type") ?? "Business cheque",
    bank_account_holder: holder,
    bank_account_number: number,
    bank_branch_code: branch,
  }).eq("owner_id", user.id);
  if (error) {
    console.error("[onboarding] could not save banking details:", error);
    return fail("We could not save your banking details. Please check them and try again.");
  }
  redirect(AFTER_ONBOARDING);
}

const field = "mt-2 w-full rounded-xl border border-ink/10 bg-paper/60 px-3.5 py-3 text-sm text-ink placeholder:text-ink/35 transition focus:border-orange focus:bg-white focus:outline-none";

export default async function OnboardingBrand({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: business } = await supabase.from("businesses").select("*").maybeSingle();
  if (!business) redirect("/app/onboarding");

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-[0_24px_80px_rgba(22,45,37,0.12)] ring-1 ring-black/5 lg:grid-cols-[.8fr_1.2fr]">
        <section className="relative overflow-hidden bg-ink px-7 py-9 text-paper sm:px-10 sm:py-12">
          <div className="absolute -right-16 -top-16 size-48 rounded-full bg-lime/20 blur-2xl" />
          <div className="relative flex h-full flex-col">
            <div className="flex items-center gap-2 text-sm font-bold tracking-tight"><span className="grid size-8 place-items-center rounded-lg bg-lime text-ink">Y</span> yebo</div>
            <div className="mt-auto pt-20">
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.22em] text-lime">Nearly there</p>
              <h1 className="max-w-sm text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">Look like a real business. Get paid.</h1>
              <p className="mt-5 max-w-sm text-sm leading-6 text-paper/65">Your logo goes on every quote and invoice, and your banking details let clients pay you by EFT. Both are optional, and you can add them later.</p>
              <div className="mt-9 flex items-center gap-3 text-xs text-paper/60"><span className="h-px w-10 bg-lime" /> Next: meet your tools</div>
            </div>
          </div>
        </section>

        <section className="px-7 py-8 sm:px-10 sm:py-12">
          <div className="mb-6" role="group" aria-label="Step 2 of 3">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange">Step 2 of 3</p>
            <div className="mt-2 flex gap-1.5" aria-hidden="true">
              {[0, 1, 2].map((index) => (
                <span key={index} className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/10">
                  {index < 2 && <span style={{ "--d": `${index * 0.15}s` } as React.CSSProperties} className="bar-grow block h-full w-full rounded-full bg-orange" />}
                </span>
              ))}
            </div>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-ink">Add your logo and banking details</h2>
          <p className="mt-2 text-sm leading-6 text-ink/55">Welcome, {business.name}. Everything here is optional.</p>
          <div style={{ "--d": "0.1s" } as React.CSSProperties} className="fade-up mt-5 rounded-2xl border border-lime/60 bg-lime/15 p-4 text-sm leading-6 text-ink">
            <p className="font-bold">Why add these?</p>
            <p className="mt-1 text-ink/70">Clients trust businesses that look established. A logo and clear banking details make every quote and invoice look professional, and make it easy for clients to say yes and pay. You add them once and they appear on everything you send.</p>
          </div>

          {error && <div role="alert" className="mt-5 rounded-xl border border-orange/25 bg-orange/10 px-4 py-3 text-sm font-semibold text-ink">{error}</div>}

          <form action={saveBanking} style={{ "--d": "0.15s" } as React.CSSProperties} className="fade-up mt-7 flex flex-col gap-6">
            <div className="grid gap-5 sm:grid-cols-[150px_1fr]">
              <div>
                <p className="text-sm font-semibold text-ink">Your logo</p>
                <div className="mt-2 flex size-28 items-center justify-center rounded-2xl border border-dashed border-orange/40 bg-paper/70 p-3"><LogoUpload current={business.logo_url} compact /></div>
              </div>
              <div className="flex flex-col justify-center gap-1.5">
                <p className="text-sm font-semibold text-ink">A little polish goes a long way.</p>
                <p className="max-w-md text-sm leading-6 text-ink/55">Upload a square or horizontal logo. We will place it neatly on your quotes and invoices and match their colours to it.</p>
                <p className="text-xs font-semibold text-ink/40">PNG, JPG or SVG · Max 5 MB</p>
              </div>
            </div>

            <div className="border-t border-ink/10 pt-6">
              <p className="text-sm font-bold text-ink">Banking details <span className="font-normal text-ink/40">(optional)</span></p>
              <p className="mt-1 text-xs text-ink/50">Shown to clients on your invoices so they can pay you by EFT.</p>
              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                <label className="text-sm font-semibold text-ink">Bank
                  <select name="bank_name" defaultValue={business.bank_name ?? ""} className={field}>
                    <option value="">Choose your bank</option>
                    {["FNB", "Standard Bank", "Absa", "Nedbank", "Capitec", "Other"].map((bank) => <option key={bank}>{bank}</option>)}
                  </select>
                </label>
                <label className="text-sm font-semibold text-ink">Account type
                  <select name="bank_account_type" defaultValue={business.bank_account_type ?? "Business cheque"} className={field}>
                    {["Business cheque", "Savings", "Current"].map((type) => <option key={type}>{type}</option>)}
                  </select>
                </label>
                <label className="text-sm font-semibold text-ink">Account holder<input name="bank_account_holder" defaultValue={business.bank_account_holder ?? ""} placeholder="Your registered business name" className={field} /></label>
                <label className="text-sm font-semibold text-ink">Account number<input name="bank_account_number" inputMode="numeric" defaultValue={business.bank_account_number ?? ""} placeholder="8 to 11 digits" className={field} /></label>
                <label className="text-sm font-semibold text-ink">Branch code<input name="bank_branch_code" inputMode="numeric" defaultValue={business.bank_branch_code ?? ""} placeholder="6 digits" className={field} /></label>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Link href={AFTER_ONBOARDING} className="rounded-xl px-3 py-3 text-center text-sm font-bold text-ink/55 transition hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange">Skip for now</Link>
              <SubmitButton pendingLabel="Saving…" className="rounded-xl bg-orange px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange/20 transition hover:-translate-y-0.5 hover:shadow-xl">Save and continue <span aria-hidden>→</span></SubmitButton>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
