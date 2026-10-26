import { isValidEmail, saPhoneOk } from "./contact";

// What a customer would notice about a quote or invoice before the owner sends it. Rules only, so it is instant.
export type CheckItem = {
  id: string;
  level: "contact" | "important" | "nice";
  message: string;
  /** The id of the field to jump to. */
  fixId: string;
};

export type CheckInput = {
  isInvoice: boolean;
  firstName: string;
  hasClient: boolean;
  email: string;
  whatsapp: string;
  title: string;
  location: string;
  description: string;
  lines: { description: string; price: number; quantity: number }[];
  exclusions: string;
  timeline: string;
  note: string;
};

const VAGUE = new Set(["labour", "labor", "material", "materials", "work", "service", "services", "supply", "supplies", "item", "items", "misc", "miscellaneous", "other", "parts", "stuff", "job", "install", "repair", "fix"]);

export function checkQuote(c: CheckInput): CheckItem[] {
  const out: CheckItem[] = [];
  const who = c.hasClient ? c.firstName : "your client";
  const email = c.email.trim();
  const phone = c.whatsapp.trim();

  // Contact details come first: a quote nobody can reach quietly goes nowhere.
  if (c.hasClient) {
    if (!email && !phone) out.push({ id: "contact-none", level: "contact", fixId: "contact-fix", message: `You have no way to reach ${who}. Add an email or a WhatsApp number, ideally both, so you can send this and follow up.` });
    else {
      if (!email) out.push({ id: "contact-email", level: "contact", fixId: "contact-fix", message: `Add ${who}'s email so the ${c.isInvoice ? "invoice" : "quote"} can be emailed with the PDF attached.` });
      if (!phone) out.push({ id: "contact-wa", level: "contact", fixId: "contact-fix", message: `Add ${who}'s WhatsApp number so you can send it, follow up and say thank you in one tap.` });
    }
    if (email && !isValidEmail(email)) out.push({ id: "contact-email-bad", level: "contact", fixId: "contact-fix", message: `That email address does not look right. Check it for typing mistakes.` });
    if (phone && !saPhoneOk(phone)) out.push({ id: "contact-wa-bad", level: "contact", fixId: "contact-fix", message: `That WhatsApp number does not look like a South African number (for example 082 123 4567). Check it before you send.` });
  }

  const filled = c.lines.filter((l) => l.description.trim());
  const unpriced = filled.filter((l) => !(l.price > 0 && l.quantity > 0));
  if (unpriced.length) out.push({ id: "unpriced", level: "important", fixId: "amount-section", message: unpriced.length === 1 ? `"${unpriced[0].description.trim().slice(0, 40)}" has no price, so it will be left out of the ${c.isInvoice ? "invoice" : "quote"}.` : `${unpriced.length} items have no price, so they will be left out.` });
  const vague = filled.filter((l) => {
    const words = l.description.trim().toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/).filter(Boolean);
    return words.length > 0 && (words.length === 1 ? VAGUE.has(words[0]) : words.length <= 2 && words.every((w) => VAGUE.has(w)));
  });
  if (vague.length) out.push({ id: "vague", level: "important", fixId: "amount-section", message: `"${vague[0].description.trim().slice(0, 40)}" is vague. Say what it covers, for example "Labour: install 6 light fittings".` });
  if (!c.description.trim()) out.push({ id: "description", level: "important", fixId: "work-description", message: `Describe the work in a sentence or two. ${who === "your client" ? "Clients" : who} will trust a quote that says exactly what is included.` });
  if (!c.title.trim()) out.push({ id: "title", level: "important", fixId: "job-title", message: "Give the job a name, for example \"Kitchen cupboards\"." });
  if (!c.location.trim()) out.push({ id: "location", level: "important", fixId: "job-location", message: "Add where the work is happening." });
  if (!c.isInvoice && !c.exclusions.trim() && !c.timeline.trim()) out.push({ id: "scope", level: "nice", fixId: "scope-extras", message: "Say what is not included and how long it will take. It prevents arguments later and makes the quote look more professional." });
  if (!c.note.trim()) out.push({ id: "note", level: "nice", fixId: "personal-note", message: "A short personal note makes the quote feel like it came from a person, not a template." });
  return out;
}
