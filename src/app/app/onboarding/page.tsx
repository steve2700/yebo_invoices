import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { businessPrefix } from "@/lib/prefix";

async function createBusiness(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const text = (k: string) => String(formData.get(k) ?? "").trim() || null;
  const name = text("name");
  if (!name) return;
  const vatRegistered = formData.get("vat_registered") === "on";

  const { error } = await supabase.from("businesses").insert({
    owner_id: user.id,
    name,
    prefix: businessPrefix(name),
    email: text("email"),
    phone: text("phone"),
    website: text("website"),
    address: text("address"),
    company_reg: text("company_reg"),
    vat_registered: vatRegistered,
    vat_number: vatRegistered ? text("vat_number") : null,
  });
  if (error) throw new Error(error.message);
  redirect("/app");
}

const field = "mt-2 w-full rounded-xl border border-ink/10 bg-paper/60 px-3.5 py-3 text-sm text-ink placeholder:text-ink/35 transition focus:border-orange focus:bg-white focus:outline-none";

export default function Onboarding() {
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
              <div className="mt-9 flex items-center gap-3 text-xs text-paper/60"><span className="h-px w-10 bg-lime" /> Takes about 2 minutes</div>
            </div>
          </div>
        </section>

        <section className="px-7 py-8 sm:px-10 sm:py-12">
          <div className="mb-7"><p className="text-xs font-bold uppercase tracking-[0.18em] text-orange">Business profile</p><h2 className="mt-2 text-2xl font-extrabold tracking-tight text-ink">Tell us about your business</h2><p className="mt-2 text-sm leading-6 text-ink/55">You can always fine-tune these details later in Settings.</p></div>
          <form action={createBusiness} className="flex flex-col gap-5">
            <label className="text-sm font-semibold text-ink">Business name<input name="name" required placeholder="e.g. Acme Studio" className={field} /></label>
            <div className="grid gap-5 sm:grid-cols-2"><label className="text-sm font-semibold text-ink">Email<input name="email" type="email" placeholder="hello@acme.co.za" className={field} /></label><label className="text-sm font-semibold text-ink">Phone<input name="phone" placeholder="+27 82 000 0000" className={field} /></label></div>
            <label className="text-sm font-semibold text-ink">Website <span className="font-normal text-ink/40">(optional)</span><input name="website" placeholder="acme.co.za" className={field} /></label>
            <label className="text-sm font-semibold text-ink">Business address<input name="address" placeholder="Street, suburb, city" className={field} /></label>
            <div className="grid gap-5 sm:grid-cols-2"><label className="text-sm font-semibold text-ink">Registration number <span className="font-normal text-ink/40">(optional)</span><input name="company_reg" className={field} /></label><label className="text-sm font-semibold text-ink">VAT number <span className="font-normal text-ink/40">(if applicable)</span><input name="vat_number" inputMode="numeric" className={field} /></label></div>
            <label className="flex items-start gap-3 rounded-xl border border-ink/10 bg-paper/50 p-3.5 text-sm text-ink"><input type="checkbox" name="vat_registered" className="mt-0.5 size-4 accent-orange" /> <span><span className="font-semibold">I am VAT registered</span><span className="mt-0.5 block text-xs text-ink/50">We will show VAT details on your invoices.</span></span></label>
            <button className="mt-1 w-full rounded-xl bg-orange px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange/20 transition hover:-translate-y-0.5 hover:shadow-xl">Save and continue <span aria-hidden>→</span></button>
          </form>
        </section>
      </div>
    </main>
  );
}
