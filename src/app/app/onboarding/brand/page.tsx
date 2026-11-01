import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SubmitButton from "@/components/SubmitButton";
import { billingEnforced } from "@/lib/access";
import BankFields from "@/components/BankFields";
import { isValidBankName } from "@/lib/sa-banks";
import { formatPayshap, normalizePayshap } from "@/lib/payshap";
import Frame, { field } from "../Frame";

// Where a new user lands when onboarding is finished. The goal is their first quote, so go straight there.
// With billing switched on, the next step is choosing a plan. Otherwise it is the welcome tour.
const AFTER_ONBOARDING = billingEnforced() ? "/app/subscribe?onboarding=1" : "/app/onboarding/welcome";

// Step 3 of sign-up: how clients pay. Instant payment (PayShap) first, because it arrives on weekends too.
async function saveGetPaid(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const fail = (message: string): never => redirect(`/app/onboarding/brand?error=${encodeURIComponent(message)}`);
  const text = (k: string) => String(formData.get(k) ?? "").trim() || null;

  const payshap = normalizePayshap(text("payshap_number"));
  if (payshap.error) return fail(payshap.error);

  const holder = text("bank_account_holder");
  const number = text("bank_account_number")?.replace(/\s/g, "") ?? null;
  const branch = text("bank_branch_code")?.replace(/\s/g, "") ?? null;
  const bankName = text("bank_name");
  const anyBank = Boolean(holder || number || branch || bankName);

  const update: Record<string, string | null> = { payshap_number: payshap.value };
  if (anyBank) {
    if (!isValidBankName(bankName)) return fail("Please choose your bank from the list.");
    if (number && !/^\d{8,11}$/.test(number)) return fail("Your account number should be 8 to 11 digits.");
    if (branch && !/^\d{6}$/.test(branch)) return fail("Your branch code should be 6 digits.");
    // Clients only see the EFT details if all three are there, so ask for them together.
    if (!holder || !number || !branch) {
      return fail("Please add the account holder, account number and branch code together, so clients can pay you by EFT. Or skip the bank details for now.");
    }
    Object.assign(update, {
      bank_name: bankName,
      bank_account_type: text("bank_account_type") ?? "Business cheque",
      bank_account_holder: holder,
      bank_account_number: number,
      bank_branch_code: branch,
    });
  }

  const { error } = await supabase.from("businesses").update(update).eq("owner_id", user.id);
  if (error) {
    console.error("[onboarding] could not save payment details:", error);
    return fail("We could not save your payment details. Please check them and try again.");
  }
  redirect(AFTER_ONBOARDING);
}

export default async function OnboardingBrand({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: business } = await supabase.from("businesses").select("*").maybeSingle();
  if (!business) redirect("/app/onboarding");

  return (
    <Frame
      step={3}
      eyebrow="Nearly there"
      headline="Get paid, even on a weekend."
      blurb="Instant payments reach you in minutes, any day. Normal EFTs can take until Monday or Tuesday. Add what you use and it appears on every quote and invoice."
      footnote={billingEnforced() ? "Next: choose your plan" : "Next: meet your tools"}
      back="/app/onboarding/look"
      title="How should clients pay you?"
      intro="Both are optional, and you can add them later in Settings."
      error={error}
    >
      <form action={saveGetPaid} className="fade-up mt-7 flex flex-col gap-6">
        <div className="rounded-2xl border border-lime/60 bg-lime/15 p-4">
          <p className="text-sm font-bold text-ink">Instant payment (PayShap)</p>
          <p className="mt-1 text-xs leading-5 text-ink/65">The cellphone number linked to your bank account. Clients pay it from their banking app and the money arrives in minutes, also on weekends and holidays.</p>
          <label className="mt-3 block text-sm font-semibold text-ink">Cellphone number
            <input name="payshap_number" type="tel" inputMode="tel" autoComplete="tel" defaultValue={formatPayshap(business.payshap_number)} placeholder="082 123 4567" className={field} />
          </label>
          <p className="mt-2 text-xs leading-5 text-ink/60">Set up PayShap in your banking app first, otherwise clients&apos; payments will fail. This number is shown to clients on your quotes and invoices.</p>
        </div>

        <div>
          <p className="text-sm font-bold text-ink">Bank details for normal EFT <span className="font-normal text-ink/40">(optional)</span></p>
          <p className="mt-1 text-xs text-ink/50">Shown to clients on your quotes and invoices. Normal EFTs can take longer on weekends.</p>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <BankFields defaultBank={business.bank_name} defaultBranchCode={business.bank_branch_code} labelClass="text-sm font-semibold text-ink" inputClass={field} placeholder="Choose your bank" />
            <label className="text-sm font-semibold text-ink">Account type
              <select name="bank_account_type" defaultValue={business.bank_account_type ?? "Business cheque"} className={field}>
                {["Business cheque", "Savings", "Current"].map((type) => <option key={type}>{type}</option>)}
              </select>
            </label>
            <label className="text-sm font-semibold text-ink">Account holder<input name="bank_account_holder" defaultValue={business.bank_account_holder ?? ""} placeholder="Your registered business name" className={field} /></label>
            <label className="text-sm font-semibold text-ink">Account number<input name="bank_account_number" inputMode="numeric" defaultValue={business.bank_account_number ?? ""} placeholder="8 to 11 digits" className={field} /></label>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link href={AFTER_ONBOARDING} className="rounded-xl px-3 py-3 text-center text-sm font-bold text-ink/55 transition hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange">Skip for now</Link>
          <SubmitButton pendingLabel="Saving…" className="rounded-xl bg-orange px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange/20 transition hover:-translate-y-0.5 hover:shadow-xl">Save and continue <span aria-hidden>→</span></SubmitButton>
        </div>
      </form>
    </Frame>
  );
}
