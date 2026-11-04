// Who gets shown first (and who gets a job first) on the Yebo local pages. Out of 100, in the open:
//   Profile (0 to 40)     a complete profile clients can trust: logo, phone, a line about you, work photos, year started, reviews
//   Replies (0 to 30)     of the local jobs sent to you in the last 30 days: up to 18 for how many you responded to (started a quote or
//                         proposed a visit; dismissing does not count) and up to 12 for how fast (within 1 hour is full marks). New with fewer than 3 jobs: 15.
//   Closing the loop (0 to 15)  telling us how each job ended (won or lost). Winning does not matter, answering does. New with fewer than 3 jobs: 7.
//   Turn (0 to 15)        the longer since you were last given a job, the higher you sit, so everyone gets a turn
// Scores within a few points of each other swap places every few minutes, so nobody sits first all the time.
export type RankInput = {
  logo_url?: string | null; phone?: string | null; about?: string | null; year_started?: number | null;
  work_photos?: unknown; google_reviews_url?: string | null; reviews?: unknown;
  jobs30: number; responded30: number; speedSum30: number; closed30: number; opp_last_at?: string | null;
};

export const speedFactor = (hours: number) => (hours <= 1 ? 1 : hours <= 4 ? 0.75 : hours <= 24 ? 0.5 : 0.25);

export function profileScore(b: Pick<RankInput, "logo_url" | "phone" | "about" | "year_started" | "work_photos" | "google_reviews_url" | "reviews">): { score: number; missing: string[] } {
  const photos = Array.isArray(b.work_photos) ? b.work_photos.length : 0;
  const parts: [boolean, number, string][] = [
    [Boolean(b.logo_url), 8, "your logo"],
    [Boolean(b.phone), 8, "your phone number"],
    [Boolean((b.about ?? "").trim()), 8, "a line about your business"],
    [photos >= 3, 8, "at least 3 photos of your work"],
    [Boolean(b.year_started), 4, "the year you started"],
    [Boolean(b.google_reviews_url) || (Array.isArray(b.reviews) && b.reviews.length > 0), 4, "reviews (a Google reviews link or added reviews)"],
  ];
  return { score: parts.reduce((n, [ok, pts]) => n + (ok ? pts : 0), 0), missing: parts.filter(([ok]) => !ok).map(([, , label]) => label) };
}

export function rankParts(b: RankInput, now = Date.now()) {
  const n = b.jobs30;
  const replies = n < 3 ? 15 : Math.round(18 * (b.responded30 / n) + 12 * (b.speedSum30 / n));
  const loop = n < 3 ? 7 : Math.round(15 * (b.closed30 / n));
  const hours = b.opp_last_at ? Math.max(0, (now - Date.parse(b.opp_last_at)) / 3600000) : 120;
  const turn = Math.min(15, Math.round(hours / 8));
  const profile = profileScore(b).score;
  return { profile, replies, loop, turn, total: profile + replies + loop + turn };
}

export const rankScore = (b: RankInput, now = Date.now()) => rankParts(b, now).total;
