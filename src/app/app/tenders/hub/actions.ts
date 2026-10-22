"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { UUID_RE, tenderAccess } from "@/lib/tender-access";
import { TENDER_CATEGORIES } from "@/lib/tenders";
import { PROVINCES } from "@/lib/tender-feed";

type Result = { ok: true } | { ok: false; error: string };

export type PreferencesInput = {
  categories: string[];
  provinces: string[];
  autoDraft: boolean;
  emailAlerts: boolean;
  markupPercent: number;
};

export async function saveTenderPreferences(input: PreferencesInput): Promise<Result> {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in again." };
  if (!(await tenderAccess(sb)).allowed) return { ok: false, error: "The Tender Engine is part of The Industry King plan." };
  const { data: business } = await sb.from("businesses").select("id").maybeSingle();
  if (!business) return { ok: false, error: "Finish setting up your business first." };

  const categories = (input.categories ?? []).filter((c) => (TENDER_CATEGORIES as readonly string[]).includes(c));
  const provinces = (input.provinces ?? []).filter((p) => (PROVINCES as readonly string[]).includes(p));
  const markup = Number(input.markupPercent);
  if (!Number.isFinite(markup) || markup < 0 || markup > 500) return { ok: false, error: "Markup must be between 0 and 500 percent." };
  if (input.autoDraft && categories.length === 0) return { ok: false, error: "Pick at least one trade before you switch on auto-draft." };

  const { error } = await sb.from("tender_preferences").upsert({
    business_id: business.id,
    categories,
    provinces,
    auto_draft: Boolean(input.autoDraft),
    email_alerts: Boolean(input.emailAlerts),
    default_markup_percent: Math.round(markup * 100) / 100,
    updated_at: new Date().toISOString(),
  }, { onConflict: "business_id" });
  if (error) {
    console.error("[tender-hub] save preferences failed:", error.message);
    return { ok: false, error: "We could not save your preferences. Please try again." };
  }
  revalidatePath("/app/tenders/hub");
  return { ok: true };
}

// Opens a bid for a tender from the hub (or goes to the one that is already open), then sends the owner to it.
export async function startBid(feedId: string): Promise<void> {
  if (!UUID_RE.test(feedId)) redirect("/app/tenders/hub?error=missing");
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  if (!(await tenderAccess(sb)).allowed) redirect("/app/tenders");
  const { data: business } = await sb.from("businesses").select("id,vat_registered").maybeSingle();
  if (!business) redirect("/app/onboarding");

  const { data: have } = await sb.from("tenders").select("id").eq("feed_id", feedId).maybeSingle();
  if (have) redirect(`/app/tenders/${have.id}`);

  const { data: f } = await sb
    .from("tender_feed")
    .select("id,reference,title,buyer,category,province,location,closing_at,submission_email")
    .eq("id", feedId)
    .maybeSingle();
  if (!f) redirect("/app/tenders/hub?error=missing");
  if (f.closing_at && new Date(f.closing_at).getTime() <= Date.now()) redirect("/app/tenders/hub?error=closed");

  const { data: made, error } = await sb
    .from("tenders")
    .insert({
      business_id: business.id,
      feed_id: f.id,
      reference: f.reference,
      title: f.title,
      client_name: f.buyer,
      category: f.category,
      location: f.location ?? f.province,
      closing_at: f.closing_at,
      submission_email: f.submission_email,
      status: "draft",
      vat_percent: business.vat_registered ? 15 : 0,
    })
    .select("id")
    .single();
  if (error || !made) {
    // Someone (or the daily job) may have just made it. Go to that one.
    const { data: again } = await sb.from("tenders").select("id").eq("feed_id", feedId).maybeSingle();
    if (again) redirect(`/app/tenders/${again.id}`);
    redirect("/app/tenders/hub?error=failed");
  }
  revalidatePath("/app/tenders");
  redirect(`/app/tenders/${made.id}`);
}
