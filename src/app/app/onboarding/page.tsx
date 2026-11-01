import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { businessPrefix } from "@/lib/prefix";
import SubmitButton from "@/components/SubmitButton";
import { tidyPhone, tidyEmail } from "@/lib/contact-tidy";
import Frame, { field } from "./Frame";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Step 1 of sign-up: just the three things Yebo needs. It also works as "go back and change" from step 2.
async function saveBusiness(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const edit = formData.get("edit") === "1";
  const fail = (message: string): never => redirect(`/app/onboarding?${edit ? "edit=1&" : ""}error=${encodeURIComponent(message)}`);
  const text = (k: string) => String(formData.get(k) ?? "").trim() || null;

  const name = text("name");
  if (!name || name.length < 2) return fail("Please enter your business name.");

  const email = tidyEmail(text("email") ?? "");
  if (!email || !EMAIL_PATTERN.test(email)) {
    return fail("Please enter a valid business email. Your clients' replies and payment alerts will come to it.");
  }
  const phone = tidyPhone(text("phone") ?? "") || null;

  const { data: existing } = await supabase.from("businesses").select("id").eq("owner_id", user.id).maybeSingle();
  if (existing) {
    const { error } = await supabase.from("businesses").update({ name, email, phone }).eq("owner_id", user.id);
    if (error) {
      console.error("[onboarding] could not update business:", error);
      return fail("We could not save your business details. Please check them and try again.");
    }
    redirect("/app/onboarding/look");
  }

  const { error } = await supabase.from("businesses").insert({ owner_id: user.id, name, prefix: businessPrefix(name), email, phone });
  if (error) {
    // 23505 = this account already has a business (for example the form was submitted twice).
    if (error.code === "23505") redirect("/app/onboarding/look");
    console.error("[onboarding] could not create business:", error);
    return fail("We could not save your business details. Please check them and try again.");
  }
  redirect("/app/onboarding/look");
}

export default async function Onboarding({ searchParams }: { searchParams: Promise<{ error?: string; edit?: string }> }) {
  const { error, edit } = await searchParams;

  const supabase = await createClient();
  const { data: existing } = await supabase.from("businesses").select("name, email, phone").maybeSingle();
  // Someone who already has a business does not need to do this again, unless they came back from step 2 to change it.
  if (existing && edit !== "1") redirect("/app");

  return (
    <Frame
      step={1}
      eyebrow="One good first step"
      headline="Make your business look the part."
      blurb="Add your details once and they will appear beautifully across every quote and invoice you send."
      footnote="Takes about 2 minutes · Then your first quote"
      title="Tell us about your business"
      intro="Just three things. You can fine-tune everything later in Settings."
      error={error}
    >
      <form action={saveBusiness} className="fade-up mt-7 flex flex-col gap-5">
        {existing && <input type="hidden" name="edit" value="1" />}
        <label className="text-sm font-semibold text-ink">Business name
          <input name="name" required minLength={2} autoComplete="organization" defaultValue={existing?.name ?? ""} placeholder="e.g. Granite Carpentry" className={field} />
          <span className="mt-1.5 block text-xs font-normal text-ink/50">The name clients see on every quote and invoice.</span>
        </label>
        <label className="text-sm font-semibold text-ink">Business email
          <input name="email" type="email" required autoComplete="email" defaultValue={existing?.email ?? ""} placeholder="hello@yourbusiness.co.za" className={field} />
          <span className="mt-1.5 block text-xs font-normal text-ink/50">Client replies and payment alerts come here.</span>
        </label>
        <label className="text-sm font-semibold text-ink">Phone or WhatsApp
          <input name="phone" type="tel" autoComplete="tel" defaultValue={existing?.phone ?? ""} placeholder="082 123 4567" className={field} />
          <span className="mt-1.5 block text-xs font-normal text-ink/50">Clients can call or message you from your quotes.</span>
        </label>
        <SubmitButton pendingLabel="Saving…" className="mt-1 w-full rounded-xl bg-orange px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange/20 transition hover:-translate-y-0.5 hover:shadow-xl">Next <span aria-hidden>→</span></SubmitButton>
      </form>
    </Frame>
  );
}
