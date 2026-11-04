import { createAdminClient } from "@/lib/supabase/admin";
import { rankScore, speedFactor } from "@/lib/opp-rank";
import { BADGE_LABELS, parseReviews, type Review } from "@/lib/trust";

export type Pro = {
  id: string; token: string; name: string; logo: string | null; color: string; phone: string | null;
  about: string | null; since: number | null; photos: string[]; score: number;
  reviews: Review[]; googleUrl: string | null; badges: string[];
};

// A small wobble that changes every 5 minutes, so businesses with close scores take turns in the top spot.
function wobble(id: string, now: number) {
  const epoch = Math.floor(now / 300000);
  let h = epoch;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return (h % 7) - 3; // -3 .. +3
}

// The opted-in businesses for one trade and area, best first (see opp-rank.ts). The first 3 are shown big and get form jobs. Server only.
export async function loadPros(trade: string, area: string, limit = 12): Promise<Pro[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("businesses")
    .select("id,request_token,name,logo_url,brand_color,phone,about,year_started,work_photos,google_reviews_url,reviews,badges,opp_last_at")
    .eq("opp_enabled", true).contains("opp_trades", [trade]).contains("opp_areas", [area]).limit(60);
  if (error || !data?.length) return [];
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data: jobs } = await admin.from("quote_requests").select("business_id,created_at,responded_at,outcome").like("source", "yebo-%").gte("created_at", since).in("business_id", data.map((b) => b.id));
  const tally = new Map<string, { n: number; responded: number; speed: number; closed: number }>();
  for (const j of jobs ?? []) {
    const t = tally.get(j.business_id) ?? { n: 0, responded: 0, speed: 0, closed: 0 };
    t.n++;
    if (j.responded_at) { t.responded++; t.speed += speedFactor((Date.parse(j.responded_at) - Date.parse(j.created_at)) / 3600000); }
    if (j.outcome) t.closed++;
    tally.set(j.business_id, t);
  }
  const now = Date.now();
  return data.filter((b) => b.request_token).map((b) => {
    const t = tally.get(b.id) ?? { n: 0, responded: 0, speed: 0, closed: 0 };
    const score = rankScore({ ...b, jobs30: t.n, responded30: t.responded, speedSum30: t.speed, closed30: t.closed }, now);
    const color = /^#[0-9a-f]{6}$/i.test(b.brand_color ?? "") ? (b.brand_color as string) : "#0F8A5F";
    return {
      id: b.id, token: b.request_token as string, name: b.name, logo: b.logo_url, color, phone: b.phone, about: b.about,
      since: b.year_started, photos: (Array.isArray(b.work_photos) ? (b.work_photos as string[]) : []).filter((u) => /^https:\/\//.test(u)).slice(0, 3), score,
      reviews: parseReviews(b.reviews).slice(0, 2),
      googleUrl: typeof b.google_reviews_url === "string" && /^https:\/\//.test(b.google_reviews_url) ? b.google_reviews_url : null,
      badges: (Array.isArray(b.badges) ? (b.badges as string[]) : []).filter((id) => BADGE_LABELS[id]).map((id) => BADGE_LABELS[id]).slice(0, 3),
    };
  }).sort((a, b) => (b.score + wobble(b.id, now)) - (a.score + wobble(a.id, now)) || a.id.localeCompare(b.id)).slice(0, limit);
}
