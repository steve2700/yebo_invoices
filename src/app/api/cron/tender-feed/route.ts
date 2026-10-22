import { createAdminClient } from "@/lib/supabase/admin";
import { appUrl } from "@/lib/url";
import { isEmail, renderEmail, sendEmail } from "@/lib/email";
import { billingEnforced, hasAccess, planOf } from "@/lib/access";
import { mapRelease, matchesPrefs, releasesFromResponse, type FeedRow } from "@/lib/tender-feed";
import { formatSouthAfricaDateTime } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Admin = ReturnType<typeof createAdminClient>;

// Where the live tenders come from. National Treasury publishes every advertised tender on eTenders in the OCDS format.
// If the address or the parameter names ever change, set ETENDERS_API_URL in Vercel, no code change needed.
const API_URL = () => (process.env.ETENDERS_API_URL ?? "https://ocds-api.etenders.gov.za/api/OCDSReleases").trim();
const PAGE_SIZE = 100;
const MAX_PAGES = 12; // 1200 tenders a run is far more than appears in a few days
const LOOKBACK_DAYS = 3;
const KEEP_EXPIRED_DAYS = 7;
const MAX_DRAFTS_PER_BUSINESS = 5;

const ymd = (d: Date) => d.toISOString().slice(0, 10);

async function fetchRecent(): Promise<{ rows: FeedRow[]; pages: number; status: string }> {
  const to = new Date();
  const from = new Date(to.getTime() - LOOKBACK_DAYS * 86_400_000);
  const rows = new Map<string, FeedRow>();
  let pages = 0;
  let status = "ok";
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = new URL(API_URL());
    url.searchParams.set("PageNumber", String(page));
    url.searchParams.set("PageSize", String(PAGE_SIZE));
    url.searchParams.set("dateFrom", ymd(from));
    url.searchParams.set("dateTo", ymd(to));
    let body: unknown;
    try {
      const res = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(15_000), cache: "no-store" });
      if (!res.ok) { status = `source answered ${res.status}`; break; }
      body = await res.json();
    } catch (error) {
      console.error("[tender-feed] could not reach the source:", error);
      status = "could not reach the source";
      break;
    }
    pages++;
    const releases = releasesFromResponse(body);
    for (const release of releases) {
      const row = mapRelease(release);
      if (row && row.closing_at && new Date(row.closing_at).getTime() > Date.now()) rows.set(`${row.source}:${row.external_id}`, row);
    }
    if (releases.length < PAGE_SIZE) break;
  }
  return { rows: [...rows.values()], pages, status };
}

// Runs once a day (see vercel.json). 1) reads new tenders into the feed, 2) removes tenders that closed over a week ago,
// 3) for businesses that switched on auto-draft, makes a draft bid for each new tender that matches their trades,
// and emails them once. Nothing is ever sent to a client from here: the owner always reviews and sends.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  let admin: Admin;
  try {
    admin = createAdminClient();
  } catch (error) {
    console.error("[tender-feed] admin client unavailable:", error);
    return new Response("Not configured", { status: 503 });
  }

  const result = { source: "", pages: 0, fetched: 0, saved: 0, purged: 0, drafts: 0, emails: 0 };

  // ---- 1) ingest ----
  const { rows, pages, status } = await fetchRecent();
  result.source = status;
  result.pages = pages;
  result.fetched = rows.length;
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await admin.from("tender_feed").upsert(rows.slice(i, i + 200), { onConflict: "source,external_id" });
    if (error) console.error("[tender-feed] save failed:", error.message);
    else result.saved += Math.min(200, rows.length - i);
  }

  // ---- 2) purge tenders that closed more than a week ago (bids already made keep working, the link is just cleared) ----
  const cutoff = new Date(Date.now() - KEEP_EXPIRED_DAYS * 86_400_000).toISOString();
  const { count } = await admin.from("tender_feed").delete({ count: "exact" }).lt("closing_at", cutoff);
  result.purged = count ?? 0;

  // ---- 3) auto-draft ----
  const { data: prefsList } = await admin
    .from("tender_preferences")
    .select("business_id,categories,provinces,email_alerts")
    .eq("auto_draft", true);
  if (prefsList?.length) {
    const since = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000).toISOString();
    const nowIso = new Date().toISOString();
    const { data: recent } = await admin
      .from("tender_feed")
      .select("id,reference,title,buyer,category,province,location,closing_at,submission_email,documents,created_at")
      .gt("closing_at", nowIso)
      .gt("created_at", since)
      .order("closing_at", { ascending: true })
      .limit(1000);
    const feed = recent ?? [];

    for (const prefs of prefsList) {
      const businessId = prefs.business_id as string;
      const { data: business } = await admin
        .from("businesses")
        .select("id,name,email,brand_color,vat_registered")
        .eq("id", businessId)
        .maybeSingle();
      if (!business) continue;

      // The Tender Engine is part of The Industry King. With billing off, everyone who switched it on gets it.
      if (billingEnforced()) {
        const { data: sub } = await admin.from("subscriptions").select("status,plan,current_period_end").eq("business_id", businessId).maybeSingle();
        if (!hasAccess(sub) || planOf(sub) !== "king") continue;
      }

      const matches = feed.filter((f) => matchesPrefs(f, { categories: prefs.categories ?? [], provinces: prefs.provinces ?? [] }));
      if (!matches.length) continue;
      const { data: existing } = await admin.from("tenders").select("feed_id").eq("business_id", businessId).in("feed_id", matches.map((m) => m.id));
      const have = new Set((existing ?? []).map((e) => e.feed_id as string));
      const fresh = matches.filter((m) => !have.has(m.id)).slice(0, MAX_DRAFTS_PER_BUSINESS);

      const made: { title: string; closing_at: string | null }[] = [];
      for (const f of fresh) {
        const { error } = await admin.from("tenders").insert({
          business_id: businessId,
          feed_id: f.id,
          auto_drafted: true,
          reference: f.reference,
          title: f.title,
          client_name: f.buyer,
          category: f.category,
          location: f.location ?? f.province,
          closing_at: f.closing_at,
          submission_email: f.submission_email,
          status: "draft",
          vat_percent: business.vat_registered ? 15 : 0,
        });
        if (error) { if (error.code !== "23505") console.error("[tender-feed] draft failed:", error.message); continue; }
        made.push({ title: f.title, closing_at: f.closing_at });
      }
      result.drafts += made.length;

      if (made.length && prefs.email_alerts && isEmail(business.email)) {
        const sent = await sendEmail({
          to: business.email.trim(),
          fromName: "Yebo Invoices",
          idempotencyKey: `tender-drafts/${businessId}/${ymd(new Date())}`,
          subject: `${made.length} new tender draft${made.length === 1 ? "" : "s"} ready for review`,
          html: renderEmail({
            brandColor: business.brand_color,
            heading: `${made.length} new tender${made.length === 1 ? "" : "s"} match your trades`,
            intro: "Yebo has opened a draft for each one. Upload the BOQ, add your rates, check every line and approve. Nothing is sent to the client until you do.",
            rows: made.slice(0, 5).map((m) => [m.title.slice(0, 70), m.closing_at ? `Closes ${formatSouthAfricaDateTime(m.closing_at)}` : "No closing date"] as [string, string]),
            buttonLabel: "Review the drafts",
            buttonUrl: `${appUrl()}/app/tenders`,
          }),
        });
        if (sent) result.emails++;
      }
    }
  }

  return Response.json(result);
}
