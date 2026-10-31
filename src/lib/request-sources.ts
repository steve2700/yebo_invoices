// Where a request link is shared. Each place gets its own link (…/r/token?s=facebook-page), so the owner can see which one brings jobs.

export type SourcePreset = { key: string; label: string; group: string; tip: string };

export const SOURCE_GROUPS = ["Facebook and Instagram", "WhatsApp", "Google and your website", "Printed and on the road", "Other places"] as const;

export const SOURCES: SourcePreset[] = [
  { key: "facebook-page", label: "Facebook page", group: "Facebook and Instagram", tip: "Put it in the page's button or the About section." },
  { key: "facebook-post", label: "Facebook post", group: "Facebook and Instagram", tip: "Paste it under a post about your work." },
  { key: "facebook-group", label: "Facebook community group", group: "Facebook and Instagram", tip: "Local groups are full of people asking for tradespeople." },
  { key: "facebook-marketplace", label: "Facebook Marketplace", group: "Facebook and Instagram", tip: "Add it to your listing description." },
  { key: "instagram-bio", label: "Instagram bio", group: "Facebook and Instagram", tip: "Instagram gives you one link: use this one." },
  { key: "instagram-story", label: "Instagram story", group: "Facebook and Instagram", tip: "Add it as a link sticker." },
  { key: "whatsapp-status", label: "WhatsApp status", group: "WhatsApp", tip: "Post it with a photo of your latest job." },
  { key: "whatsapp-business", label: "WhatsApp Business profile", group: "WhatsApp", tip: "Put it in the website field of your profile." },
  { key: "whatsapp-chat", label: "WhatsApp chat", group: "WhatsApp", tip: "Send it to someone who asked you about a job." },
  { key: "whatsapp-group", label: "WhatsApp group", group: "WhatsApp", tip: "Street, estate and community groups." },
  { key: "google-business", label: "Google Business Profile", group: "Google and your website", tip: "Use it as the booking or appointment link." },
  { key: "google-ads", label: "Google ad", group: "Google and your website", tip: "Send people from an ad straight to the form." },
  { key: "website", label: "Your website", group: "Google and your website", tip: "A button on your home page." },
  { key: "website-contact", label: "Website contact page", group: "Google and your website", tip: "Next to your phone number." },
  { key: "email-signature", label: "Email signature", group: "Google and your website", tip: "Every email you send becomes an invitation." },
  { key: "quote-pdf", label: "Quote or invoice", group: "Google and your website", tip: "A note at the bottom of your documents." },
  { key: "van-sticker", label: "Van or bakkie sticker", group: "Printed and on the road", tip: "Print the QR code: people scan it at the robot." },
  { key: "business-card", label: "Business card", group: "Printed and on the road", tip: "Print the QR code on the back." },
  { key: "flyer", label: "Flyer", group: "Printed and on the road", tip: "Drop them in the area you want work in." },
  { key: "signboard", label: "Site signboard", group: "Printed and on the road", tip: "A board outside a job tells the neighbours you are good." },
  { key: "shop-poster", label: "Poster in a shop", group: "Printed and on the road", tip: "Hardware shops and spaza notice boards." },
  { key: "gumtree", label: "Gumtree", group: "Other places", tip: "Add it to your advert." },
  { key: "olx", label: "OLX", group: "Other places", tip: "Add it to your advert." },
  { key: "tiktok", label: "TikTok", group: "Other places", tip: "Put it in your bio." },
  { key: "youtube", label: "YouTube", group: "Other places", tip: "Put it in the video description." },
  { key: "linkedin", label: "LinkedIn", group: "Other places", tip: "Good for office and company work." },
  { key: "x-twitter", label: "X (Twitter)", group: "Other places", tip: "Put it in your bio." },
  { key: "sms", label: "SMS", group: "Other places", tip: "For clients without WhatsApp." },
  { key: "referral", label: "Word of mouth", group: "Other places", tip: "Give it to happy clients to pass on." },
];

const LABELS = new Map(SOURCES.map((s) => [s.key, s.label]));

// Letters, numbers and dashes only, so a source can never carry anything odd into the database or a link.
export function cleanSource(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.toLowerCase().trim().replace(/[\s_]+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 30);
}

export function sourceLabel(key: string | null | undefined): string {
  if (!key) return "Direct link";
  const known = LABELS.get(key);
  if (known) return known;
  return key.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
}

export const sourceUrl = (base: string, token: string, source?: string) => `${base}/r/${token}${source ? `?s=${cleanSource(source)}` : ""}`;

// The first of ?s=, ?utm_source=, ?ref= that has something usable.
export function sourceFromParams(p: Record<string, string | string[] | undefined>): string {
  for (const k of ["s", "utm_source", "ref"]) {
    const v = Array.isArray(p[k]) ? p[k]![0] : p[k];
    const c = cleanSource(v);
    if (c) return c;
  }
  return "";
}

// A preferred date must be today or later, and within a year. Returns "" when it is empty or does not make sense.
export function cleanPreferredDate(raw: unknown, today: string): string {
  if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return "";
  const t = Date.parse(raw + "T00:00:00Z");
  if (Number.isNaN(t) || new Date(t).toISOString().slice(0, 10) !== raw) return "";
  const min = Date.parse(today + "T00:00:00Z");
  if (t < min || t > min + 366 * 86400000) return "";
  return raw;
}
