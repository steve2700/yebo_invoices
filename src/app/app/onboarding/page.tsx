import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { businessPrefix } from "@/lib/prefix";
import SubmitButton from "@/components/SubmitButton";
import { billingEnforced } from "@/lib/access";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function createBusiness(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const fail = (message: string): never => redirect(`/app/onboarding?error=${encodeURIComponent(message)}`);
  const text = (k: string) => String(formData.get(k) ?? "").trim() || null;

  const name = text("name");
  if (!name || name.length < 2) return fail("Please enter your business name.");

  const email = text("email");
  if (!email || !EMAIL_PATTERN.test(email)) {
    return fail("Please enter a valid business email. Your clients' replies and payment alerts will come to it.");
  }

  const vatRegistered = formData.get("vat_registered") === "on";
  const vatNumber = text("vat_number")?.replace(/\s/g, "") ?? null;
  if (vatRegistered && (!vatNumber || !/^\d{10}$/.test(vatNumber))) {
    return fail("Your VAT number should be 10 digits. Untick \"I am VAT registered\" if you are not registered.");
  }

  const { error } = await supabase.from("businesses").insert({
    owner_id: user.id,
    name,
    prefix: businessPrefix(name),
    email,
    phone: text("phone"),
    website: text("website"),
    address: text("address"),
    company_reg: text("company_reg"),
    vat_registered: vatRegistered,
    vat_number: vatRegistered ? vatNumber : null,
  });
  if (error) {
    // 23505 = this account already has a business (for example the form was submitted twice).
    if (error.code === "23505") redirect("/app/onboarding/brand");
    console.error("[onboarding] could not create business:", error);
    return fail("We could not save your business details. Please check them and try again.");
  }
  redirect("/app/onboarding/brand");
}

const field = "mt-2 w-full rounded-xl border border-ink/10 bg-paper/60 px-3.5 py-3 text-sm text-ink placeholder:text-ink/35 transition focus:border-orange focus:bg-white focus:outline-none";

function Progress({ step, total }: { step: number; total: number }) {
  return (
    <div className="mb-6" role="group" aria-label={`Step ${step} of ${total}`}>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange">Step {step} of {total}</p>
      <div className="mt-2 flex gap-1.5" aria-hidden="true">
        {Array.from({ length: total }, (_, index) => (
          <span key={index} className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/10">
            {index < step && <span style={{ "--d": `${index * 0.15}s` } as React.CSSProperties} className="bar-grow block h-full w-full rounded-full bg-orange" />}
          </span>
        ))}
      </div>
    </div>
  );
}

export default async function Onboarding({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  // Someone who already has a business does not need to do this again.
  const supabase = await createClient();
  const { data: existing } = await supabase.from("businesses").select("id").maybeSingle();
  if (existing) redirect("/app");

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-[0_24px_80px_rgba(22,45,37,0.12)] ring-1 ring-black/5 lg:grid-cols-[.8fr_1.2fr]">
        <section className="relative overflow-hidden bg-ink px-7 py-9 text-paper sm:px-10 sm:py-12">
          <div className="absolute -right-16 -top-16 size-48 rounded-full bg-lime/20 blur-2xl" />
          <div className="relative flex h-full flex-col">
            <div className="flex items-center gap-2 text-sm font-bold tracking-tight"><span className="grid size-8 place-items-center rounded-lg bg-lime text-ink">Y</span> yebo</div>
            <div className="mt-auto pt-20">
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.22em] text-lime">One good first step</p>
              <h1 className="max-w-sm text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">Make your business look the part.</h1>
              <p className="mt-5 max-w-sm text-sm leading-6 text-paper/65">Add your details once and they will appear beautifully across every quote and invoice you send.</p>
              <div className="mt-9 flex items-center gap-3 text-xs text-paper/60"><span className="h-px w-10 bg-lime" /> Takes about 2 minutes · Then your first quote</div>
            </div>
          </div>
        </section>

        <section className="px-7 py-8 sm:px-10 sm:py-12">
          <Progress step={1} total={billingEnforced() ? 4 : 3} />
          <div className="mb-7"><h2 className="text-2xl font-extrabold tracking-tight text-ink">Tell us about your business</h2><p className="mt-2 text-sm leading-6 text-ink/55">You can always fine-tune these details later in Settings.</p></div>

          {error && <div role="alert" className="mb-5 rounded-xl border border-orange/25 bg-orange/10 px-4 py-3 text-sm font-semibold text-ink">{error}</div>}

          <div style={{ "--d": "0.1s" } as React.CSSProperties} className="fade-up mb-6 rounded-2xl border border-lime/60 bg-lime/15 p-4 text-sm leading-6 text-ink">
            <p className="font-bold">Fill this in once. It works for you every time.</p>
            <p className="mt-1 text-ink/70">These details are saved once and appear automatically on every quote, invoice, email and PDF you send, so you never type them again. Clients feel safer paying a business that looks complete and professional.</p>
          </div>

          <form action={createBusiness} style={{ "--d": "0.2s" } as React.CSSProperties} className="fade-up flex flex-col gap-5">
            <label className="text-sm font-semibold text-ink">Business name<input name="name" required minLength={2} autoComplete="organization" placeholder="e.g. Acme Studio" className={field} /><span className="mt-1.5 block text-xs font-normal text-ink/50">Shown at the top of every quote and invoice.</span></label>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="text-sm font-semibold text-ink">Business email
                <input name="email" type="email" required autoComplete="email" placeholder="hello@acme.co.za" className={field} />
                <span className="mt-1.5 block text-xs font-normal text-ink/50">Client replies and payment alerts come here.</span>
              </label>
              <label className="text-sm font-semibold text-ink">Phone<input name="phone" type="tel" autoComplete="tel" placeholder="+27 82 000 0000" className={field} /><span className="mt-1.5 block text-xs font-normal text-ink/50">Clients can tap it to call you.</span></label>
            </div>
            <label className="text-sm font-semibold text-ink">Website <span className="font-normal text-ink/40">(optional)</span><input name="website" inputMode="url" autoComplete="url" placeholder="acme.co.za" className={field} /></label>
            <label className="text-sm font-semibold text-ink">Business address<input name="address" autoComplete="street-address" placeholder="Street, suburb, city" className={field} /><span className="mt-1.5 block text-xs font-normal text-ink/50">Shows clients you are a real, established business.</span></label>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="text-sm font-semibold text-ink">Registration number <span className="font-normal text-ink/40">(optional)</span><input name="company_reg" className={field} /></label>
              <label className="text-sm font-semibold text-ink">VAT number <span className="font-normal text-ink/40">(if applicable)</span><input name="vat_number" inputMode="numeric" pattern="\d{10}" title="A VAT number is 10 digits" className={field} /></label>
            </div>
            <p className="-mt-2 text-xs text-ink/50">VAT-registered businesses need these details on their tax invoices, so we add them for you.</p>
            <label className="flex items-start gap-3 rounded-xl border border-ink/10 bg-paper/50 p-3.5 text-sm text-ink"><input type="checkbox" name="vat_registered" className="mt-0.5 size-4 accent-orange" /> <span><span className="font-semibold">I am VAT registered</span><span className="mt-0.5 block text-xs text-ink/50">We will show VAT details on your invoices.</span></span></label>
            <SubmitButton pendingLabel="Saving your business…" className="mt-1 w-full rounded-xl bg-orange px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange/20 transition hover:-translate-y-0.5 hover:shadow-xl">Continue <span aria-hidden>→</span></SubmitButton>
          </form>
        </section>
      </div>
    </main>
  );
}
