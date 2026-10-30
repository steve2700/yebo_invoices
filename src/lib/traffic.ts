// Works out where a visitor came from: a ?utm_source= or ?s= tag wins, then the site they came from, else "Direct".
export function classifySource(referrer: string, tag: string, ownHost: string): string {
  const t = tag.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 40);
  if (t) return t;
  if (!referrer) return "direct";
  let host = "";
  try {
    host = new URL(referrer).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "direct";
  }
  const own = ownHost.toLowerCase().replace(/^www\./, "");
  if (!host || host === own) return "direct";
  if (/(^|\.)google\./.test(host)) return "google";
  if (/(^|\.)(facebook|fb)\.com$|^l\.facebook\.com$|^lm\.facebook\.com$/.test(host)) return "facebook";
  if (/(^|\.)reddit\.com$/.test(host)) return "reddit";
  if (/(^|\.)(whatsapp\.com|wa\.me)$/.test(host)) return "whatsapp";
  if (/(^|\.)(instagram\.com)$/.test(host)) return "instagram";
  if (/(^|\.)(bing\.com|duckduckgo\.com|yahoo\.com)$/.test(host)) return "search";
  if (/(^|\.)(t\.co|twitter\.com|x\.com)$/.test(host)) return "x";
  if (/(^|\.)(chatgpt\.com|openai\.com)$/.test(host)) return "chatgpt";
  return host.slice(0, 40);
}
