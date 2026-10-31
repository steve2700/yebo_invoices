// Cleans up what people paste from WhatsApp, a contact card or an AI chat, so they do not have to retype it.

// "+27 76 142 4550", "(076) 142-4550", "‪+27 76 142 4550‬" or "0027761424550" -> digits, keeping a leading +. Leaves anything odd as typed.
export function tidyPhone(raw: string): string {
  const stripped = raw.replace(/[‎‏‪-‮⁦-⁩]/g, "").trim(); // invisible direction marks WhatsApp adds
  if (!stripped) return "";
  if (/[a-z]/i.test(stripped)) return stripped;
  let out = stripped.replace(/[^\d+]/g, "");
  if (out.startsWith("00")) out = "+" + out.slice(2);
  out = out.replace(/(?!^)\+/g, "");
  if (/^27\d{9}$/.test(out)) out = "+" + out;
  return out.length >= 7 && out.length <= 16 ? out : stripped;
}

// "<Name@Mail.com>", "mailto:name@mail.com " -> "name@mail.com"
export function tidyEmail(raw: string): string {
  return raw.replace(/[‎‏‪-‮]/g, "").trim().replace(/^mailto:/i, "").replace(/^<|>$/g, "").replace(/\s+/g, "").toLowerCase();
}

// AI chats add markdown that looks wrong in a quote: **bold**, # headings, "* " bullets. Keeps the line breaks.
export function tidyPasted(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[ \t]*[*•][ \t]+/gm, "- ")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
