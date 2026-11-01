import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LogoUpload from "../../settings/LogoUpload";
import SubmitButton from "@/components/SubmitButton";
import Frame, { field } from "../Frame";
import VatFields from "../VatFields";

const NEXT = "/app/onboarding/brand";

// Step 2 of sign-up: the things that make a quote look like it came from a real business. All optional.
async function saveLook(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const fail = (message: string): never => redirect(`/app/onboarding/look?error=${encodeURIComponent(message)}`);
  const text = (k: string) => String(formData.get(k) ?? "").trim() || null;

  const vatRegistered = formData.get("vat_registered") === "on";
  const vatNumber = text("vat_number")?.replace(/\s/g, "") ?? null;
  if (vatRegistered && (!vatNumber || !/^\d{10}$/.test(vatNumber))) {
    return fail("Your VAT number should be 10 digits. Untick \"I am VAT registered\" if you are not registered.");
  }

  const { error } = await supabase.from("businesses").update({
    address: text("address"),
    website: text("website"),
    company_reg: text("company_reg"),
    vat_registered: vatRegistered,
    vat_number: vatRegistered ? vatNumber : null,
  }).eq("owner_id", user.id);
  if (error) {
    console.error("[onboarding] could not save business look:", error);
    return fail("We could not save these details. Please check them and try again.");
  }
  redirect(NEXT);
}

export default async function OnboardingLook({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: business } = await supabase.from("businesses").select("*").maybeSingle();
  if (!business) redirect("/app/onboarding");

  return (
    <Frame
      step={2}
      eyebrow="Looking good"
      headline="Look like a real business."
      blurb="Your logo and address go on every quote and invoice. Clients say yes to businesses that look established."
      footnote="Next: how you get paid"
      back="/app/onboarding?edit=1"
      title="Make your quotes look professional"
      intro={`Welcome, ${business.name}. Everything on this screen is optional.`}
      error={error}
    >
      <form action={saveLook} className="fade-up mt-7 flex flex-col gap-6">
        <div className="grid gap-5 sm:grid-cols-[150px_1fr]">
          <div>
            <p className="text-sm font-semibold text-ink">Your logo</p>
            <div className="mt-2 flex size-28 items-center justify-center rounded-2xl border border-dashed border-orange/40 bg-paper/70 p-3"><LogoUpload current={business.logo_url} compact /></div>
          </div>
          <div className="flex flex-col justify-center gap-1.5">
            <p className="text-sm font-semibold text-ink">A little polish goes a long way.</p>
            <p className="max-w-md text-sm leading-6 text-ink/55">Upload a square or horizontal logo. We place it neatly on your quotes and invoices.</p>
            <p className="text-xs font-semibold text-ink/40">PNG, JPG or SVG · Max 5 MB</p>
          </div>
        </div>

        <label className="text-sm font-semibold text-ink">Business address
          <input name="address" autoComplete="street-address" defaultValue={business.address ?? ""} placeholder="Street, suburb, city" className={field} />
          <span className="mt-1.5 block text-xs font-normal text-ink/50">Shown on your quotes and invoices.</span>
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-semibold text-ink">Website <span className="font-normal text-ink/40">(optional)</span><input name="website" inputMode="url" autoComplete="url" defaultValue={business.website ?? ""} placeholder="yourbusiness.co.za" className={field} /></label>
          <label className="text-sm font-semibold text-ink">Registration number <span className="font-normal text-ink/40">(optional)</span><input name="company_reg" defaultValue={business.company_reg ?? ""} className={field} /></label>
        </div>
        <VatFields registered={Boolean(business.vat_registered)} number={business.vat_number ?? ""} inputClass={field} />

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link href={NEXT} className="rounded-xl px-3 py-3 text-center text-sm font-bold text-ink/55 transition hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange">Skip for now</Link>
          <SubmitButton pendingLabel="Saving…" className="rounded-xl bg-orange px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange/20 transition hover:-translate-y-0.5 hover:shadow-xl">Next <span aria-hidden>→</span></SubmitButton>
        </div>
      </form>
    </Frame>
  );
}
