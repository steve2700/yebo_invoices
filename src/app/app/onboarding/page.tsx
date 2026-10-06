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
    vat_number: vatRegistered ? text("vat_number") : null, // the DB rejects invalid VAT numbers
  });
  if (error) throw new Error(error.message);
  redirect("/app");
}

const field = "mt-1 w-full rounded-xl border px-3 py-2";

export default function Onboarding() {
  return (
    <main className="mx-auto max-w-md px-6 py-10">
      <h1 className="text-2xl font-extrabold">Set up your business</h1>
      <p className="text-sm text-neutral-600">Done once. Shown on every quote and invoice to build trust.</p>
      <form action={createBusiness} className="mt-6 space-y-3 rounded-2xl bg-white shadow-sm ring-1 ring-black/5 p-5">
        <label className="block text-sm">Business name<input name="name" required className={field} /></label>
        <label className="block text-sm">Email<input name="email" type="email" className={field} /></label>
        <label className="block text-sm">Phone<input name="phone" className={field} /></label>
        <label className="block text-sm">Website<input name="website" className={field} /></label>
        <label className="block text-sm">Address<input name="address" className={field} /></label>
        <label className="block text-sm">Company registration no. (optional)<input name="company_reg" className={field} /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="vat_registered" /> I am VAT registered</label>
        <label className="block text-sm">VAT number (10 digits)<input name="vat_number" inputMode="numeric" className={field} /></label>
        <button className="w-full rounded-xl bg-yebo px-4 py-3 font-bold text-white">Save and continue</button>
      </form>
    </main>
  );
}
