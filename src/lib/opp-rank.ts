// Who gets shown first (and who gets a job first) on the Yebo local pages. Out of 100, in the open, so nobody has to guess:
//   Profile (0 to 40)  a complete profile that clients can trust: logo, phone, a line about you, work photos, year started, reviews link
//   Replies (0 to 40)  of the local jobs sent to you in the last 30 days, how many you handled (quoted or dismissed). New with fewer than 3 jobs: 20, a fair start.
//   Turn (0 to 20)     the longer since you were last given a job, the higher you sit, so everyone gets a turn
export type RankInput = {
  logo_url?: string | null; phone?: string | null; about?: string | null; year_started?: number | null;
  work_photos?: unknown; google_reviews_url?: string | null; reviews?: unknown;
  jobs30: number; handled30: number; opp_last_at?: string | null;
};

export function profileScore(b: RankInput): { score: number; missing: string[] } {
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

export function rankScore(b: RankInput, now = Date.now()): number {
  const replies = b.jobs30 < 3 ? 20 : Math.round(40 * (b.handled30 / b.jobs30));
  const hours = b.opp_last_at ? Math.max(0, (now - Date.parse(b.opp_last_at)) / 3600000) : 120;
  return profileScore(b).score + replies + Math.min(20, Math.round(hours / 6));
}
