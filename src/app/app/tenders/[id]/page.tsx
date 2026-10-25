import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UUID_RE, tenderAccess } from "@/lib/tender-access";
import { loadTenderLines, loadVault } from "@/lib/tender-data";
import { normaliseDescription, vaultChecks, type TenderStatus } from "@/lib/tenders";
import { isEmail } from "@/lib/email";
import { southAfricaDate } from "@/lib/time";
import TenderUpgrade from "../TenderUpgrade";
import { parseInfo } from "@/lib/tender-docs";
import TenderEditor, { type TenderProp } from "../TenderEditor";

export default async function TenderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const { data: business } = await sb.from("businesses").select("id,email").maybeSingle();
  if (!business) redirect("/app/onboarding");
  if (!(await tenderAccess(sb)).allowed) return <TenderUpgrade />;

  const { data: t } = await sb
    .from("tenders")
    .select("id,reference,title,client_name,category,location,closing_at,submission_email,notes,status,vat_percent,submitted_at,submitted_to,source_filename,feed_id,auto_drafted,submission_info")
    .eq("id", id)
    .maybeSingle();
  if (!t) notFound();

  const [lines, vault] = await Promise.all([loadTenderLines(sb, id), loadVault(sb, business.id)]);

  // Documents from the tender hub (if this bid started there) and the owner's usual markup.
  const [{ data: feed }, { data: prefRow }] = await Promise.all([
    t.feed_id ? sb.from("tender_feed").select("documents").eq("id", t.feed_id).maybeSingle() : Promise.resolve({ data: null }),
    sb.from("tender_preferences").select("default_markup_percent").eq("business_id", business.id).maybeSingle(),
  ]);
  const docLinks = ((feed?.documents ?? []) as { title?: unknown; url?: unknown }[])
    .filter((d) => typeof d.url === "string" && /^https?:\/\//i.test(d.url))
    .map((d) => ({ title: typeof d.title === "string" && d.title ? d.title : "Tender document", url: d.url as string }))
    .slice(0, 12);
  const defaultMarkup = prefRow?.default_markup_percent == null ? "10" : String(Number(prefRow.default_markup_percent));
  const checks = vaultChecks(vault, southAfricaDate(), t.closing_at ? southAfricaDate(t.closing_at) : null);

  // Rates from the owner's most recent other tenders, matched later by description.
  const { data: recent } = await sb.from("tenders").select("id").neq("id", id).order("updated_at", { ascending: false }).limit(15);
  const recentIds = (recent ?? []).map((r) => r.id as string);
  const rank = new Map(recentIds.map((rid, i) => [rid, i]));
  const rates = new Map<string, { cents: number; rank: number }>();
  if (recentIds.length) {
    const { data: past } = await sb
      .from("tender_lines")
      .select("tender_id,description,rate_cents")
      .in("tender_id", recentIds)
      .eq("kind", "item")
      .gt("rate_cents", 0)
      .limit(3000);
    for (const row of past ?? []) {
      const key = normaliseDescription(String(row.description ?? ""));
      if (!key) continue;
      const r = rank.get(row.tender_id as string) ?? 99;
      const have = rates.get(key);
      if (!have || r < have.rank) rates.set(key, { cents: Number(row.rate_cents), rank: r });
    }
  }
  const pastRates = Array.from(rates, ([k, v]) => [k, v.cents] as [string, number]).slice(0, 2000);

  const tender: TenderProp = {
    id: t.id,
    title: t.title ?? "",
    reference: t.reference ?? "",
    clientName: t.client_name ?? "",
    category: t.category ?? "",
    location: t.location ?? "",
    closingAt: t.closing_at ?? null,
    submissionEmail: t.submission_email ?? "",
    notes: t.notes ?? "",
    status: t.status as TenderStatus,
    vatPercent: Number(t.vat_percent),
    submittedAt: t.submitted_at ?? null,
    submittedTo: t.submitted_to ?? null,
    sourceFilename: t.source_filename ?? null,
    autoDrafted: Boolean(t.auto_drafted),
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <TenderEditor tender={tender} initialLines={lines} checks={checks} pastRates={pastRates} hasBusinessEmail={isEmail(business.email)} docLinks={docLinks} info={parseInfo(t.submission_info)} defaultMarkup={defaultMarkup} />
    </main>
  );
}
