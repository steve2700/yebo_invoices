// Pure helpers (no server imports) that read a tender's documents the way a bidder does:
//   1. find the pricing pages inside a big RFQ, instead of reading the whole thing,
//   2. read small pricing tables exactly, and
//   3. find how and where to submit, when it closes, and what has to be returned with the bid.
// Nothing here guesses. Anything it cannot find in the text stays empty for the owner to fill in.

export type DocKind = "pricing" | "rfq" | "scope" | "other";

// Decides what a document is from its file name or title, e.g. "PRICING SCHEDULE - INDUSTRIAL SWEEPERS.pdf".
export function classifyDoc(title: string): DocKind {
  const t = ` ${title.toLowerCase().replace(/[_\-.()]+/g, " ").replace(/\s+/g, " ")} `;
  if (/\b(pricing|price schedule|schedule of (rates|prices|quantities)|boq|bill of quantit\w*|rates? schedule|price list)\b/.test(t)) return "pricing";
  if (/\b(rfq|rfp|rfb|itt|request for (quot\w*|bid|tender|proposal)|invitation to (bid|tender|quote)|tender document|bid document)\b/.test(t)) return "rfq";
  if (/\b(sow|scope|specifications?|terms of reference|tor|drawings?)\b/.test(t)) return "scope";
  return "other";
}

// ---------------------------------------------------------------- pages

export type Page = { n: number; text: string };

// The PDF reader writes "--- Page 3 ---" before each page. This splits it back apart.
export function splitPages(text: string): Page[] {
  const marks: { n: number; start: number; end: number }[] = [];
  const re = /^--- Page (\d+) ---$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) marks.push({ n: Number(m[1]), start: m.index, end: m.index + m[0].length });
  if (!marks.length) return text.trim() ? [{ n: 1, text: text.trim() }] : [];
  return marks.map((mk, i) => ({ n: mk.n, text: text.slice(mk.end, i + 1 < marks.length ? marks[i + 1].start : undefined).trim() }));
}

export const joinPages = (pages: Page[]) => pages.map((p) => `--- Page ${p.n} ---\n${p.text}`).join("\n");

const PRICING_TITLE = /pricing schedule|price schedule|schedule of (prices|rates|quantities)|bill of quantities|\bboq\b|my quotation is as follows|rates? schedule|quotation schedule|price list/i;
const ITEM_ROW = /^\d{1,3}(?:\.\d{1,3}){0,3}\.?\s*(?:\||\s)\s*\S/;

function headerRoles(line: string): Set<string> {
  const roles = new Set<string>();
  if (!line.includes("|")) return roles;
  for (const raw of line.split(" | ")) {
    const c = raw.trim().toLowerCase();
    if (/^(item|item no\.?|no\.?|nr\.?|ref\.?)$/.test(c)) roles.add("no");
    else if (/description|equipment|goods|service|works?\b/.test(c)) roles.add("desc");
    else if (/^(unit|units|uom|u\/m)$|unit of measure/.test(c)) roles.add("unit");
    else if (/quantit|^qty\.?$/.test(c)) roles.add("qty");
    else if (/unit price|^rate\b|rate per|^price$|unit rate/.test(c)) roles.add("rate");
    else if (/^total\b|^amount\b|total amount/.test(c)) roles.add("amount");
  }
  return roles;
}

const isPricingHeader = (line: string) => {
  const r = headerRoles(line);
  return r.has("desc") && (r.has("qty") || r.has("unit") || r.has("rate")) && r.size >= 3;
};

// How much a page looks like the page a bidder has to price.
export function pricingScore(page: string): number {
  let s = 0;
  if (PRICING_TITLE.test(page)) s += 5;
  if (page.split("\n").some(isPricingHeader)) s += 4;
  if (/sub-?\s?total/i.test(page)) s += 2;
  if (/\bvat\b/i.test(page) && /total/i.test(page)) s += 1;
  if (/table of contents|list of abbreviations|declaration of interest|conditions of (tender|contract)|evaluation (criteria|methodology)/i.test(page)) s -= 4;
  return s;
}

const itemRowCount = (page: string) => page.split("\n").filter((l) => ITEM_ROW.test(l.trim())).length;

export type PricingPick = { text: string; pages: number[]; totalPages: number; targeted: boolean };

// Keeps only the pricing pages (and the pages that continue them). If no page looks like a pricing page,
// everything is kept and `targeted` is false, so the caller can say so.
export function pickPricingPages(text: string): PricingPick {
  const pages = splitPages(text);
  const scores = pages.map((p) => pricingScore(p.text));
  const keep = new Set<number>();
  scores.forEach((s, i) => {
    if (s < 9) return;
    keep.add(i);
    // The page before (a title or supplier details page) and the pages after (more rows, totals, VAT).
    if (i > 0 && scores[i - 1] >= 4) keep.add(i - 1);
    for (let j = i + 1; j < pages.length; j++) {
      const t = pages[j].text;
      const continues = scores[j] >= 4 || itemRowCount(t) >= 3 || /brought forward|carried forward/i.test(t);
      if (!continues || j - i > 40) break;
      keep.add(j);
    }
  });
  if (!keep.size) return { text, pages: pages.map((p) => p.n), totalPages: pages.length, targeted: false };
  const chosen = pages.filter((_, i) => keep.has(i));
  return { text: joinPages(chosen), pages: chosen.map((p) => p.n), totalPages: pages.length, targeted: true };
}

// "11, 12 and 13" or "3 to 9"
export function describePages(nums: number[]): string {
  if (!nums.length) return "";
  const parts: string[] = [];
  let start = nums[0], prev = nums[0];
  for (const n of [...nums.slice(1), Infinity]) {
    if (n === prev + 1) { prev = n; continue; }
    parts.push(start === prev ? `${start}` : prev === start + 1 ? `${start} and ${prev}` : `${start} to ${prev}`);
    start = prev = n;
  }
  return parts.join(", ");
}

// ---------------------------------------------------------------- reading a small pricing table exactly

export type TableLine = { itemNo: string; description: string; unit: string; quantity: number | null; unsure: boolean; raw: string };
export type TableResult = { lines: TableLine[]; confident: boolean; why: string };

const UNIT_WORDS = /^(hours?|hrs?|days?|weeks?|months?|years?|no\.?|nr\.?|each|ea|item|items|sum|ls|lump sum|set|sets|pairs?|pcs?|units?|m|m2|m²|m3|m³|km|mm|kg|tons?|tonnes?|l|litres?|sqm|lm|rolls?|bags?|boxes|box|trips?|visits?)$/i;
const TIME_UNIT = /^(hours?|hrs?|days?|weeks?|months?|years?)$/i;
const NUMBER = /^\d+(?:[.,]\d+)?$/;
const SKIP_LINE = /^(page \d+(?: of \d+)?|initials\b|date:|-\d+-(?:\s*\|.*)?$|rfq no|tender no|bid no|--- page)/i;
const STOP_LINE = /^(sub-?\s?total|vat\b|total\b|grand total)/i;
const ITEM_START = /^(\d{1,3}(?:\.\d{1,3}){0,3})\.?(?:\s*\|\s*|\s+)([A-Za-z0-9(“"'][^]*)$/;

const num = (s: string) => Number(s.replace(",", "."));
const clean = (s: string) => s.replace(/[•·●▪]/g, " ").replace(/\s+/g, " ").trim();

// For the common shape of a quotation form: a header row such as NO | DESCRIPTION | UNIT PRICE | QUANTITY | TOTAL, then one
// row per item. Quantities can land on a different line from the item, so rows are built from everything up to the next
// item number. If anything looks unusual the result is marked not confident, and the AI reader is used instead.
export function readPricingTable(pricingText: string): TableResult {
  const rawLines = pricingText.split("\n").map((l) => l.trim()).filter(Boolean);
  const headerAt = rawLines.findIndex(isPricingHeader);
  if (headerAt < 0) return { lines: [], confident: false, why: "no table header" };
  const roles = headerRoles(rawLines[headerAt]);
  const hasUnitCol = roles.has("unit");

  type Row = { itemNo: string; desc: string[]; notes: string[]; unit: string; qty: number | null; raw: string[] };
  const rows: Row[] = [];
  let cur: Row | null = null;

  for (let i = headerAt + 1; i < rawLines.length; i++) {
    const line = rawLines[i];
    if (isPricingHeader(line)) continue; // header repeated on the next page
    if (STOP_LINE.test(line)) break;
    if (SKIP_LINE.test(line)) continue;

    // quantity written as  R | 2 | R   (blank price, quantity, blank total)
    let rest = line;
    let qty: number | null = null;
    const q = rest.match(/(?:^|\|\s*)R\s*\|\s*(\d+(?:[.,]\d+)?)\s*\|\s*R\s*$/);
    if (q) { qty = num(q[1]); rest = rest.slice(0, q.index).replace(/\|\s*$/, "").trim(); }

    const start = rest.match(ITEM_START);
    if (start) {
      const cells = start[2].split(" | ").map((c) => c.trim()).filter((c) => c && c !== "R");
      const description = cells[0] ?? "";
      if (description) {
        cur = { itemNo: start[1], desc: [description], notes: [], unit: "", qty, raw: [line] };
        rows.push(cur);
        for (const c of cells.slice(1)) {
          if (!cur.unit && UNIT_WORDS.test(c)) cur.unit = c;
          else if (hasUnitCol && cur.qty == null && NUMBER.test(c) && cur.unit) cur.qty = num(c);
        }
        continue;
      }
    }
    if (!cur) continue;
    cur.raw.push(line);
    if (qty != null && cur.qty == null) cur.qty = qty;
    const text = clean(rest.replace(/^\s*[•·●▪-]\s*(\|\s*)?/, ""));
    if (!text || /^R$/i.test(text)) continue;
    if (/^[•·●▪]/.test(rest)) cur.notes.push(text.replace(/\s*\|\s*/g, " "));
    else if (cur.notes.length) cur.notes[cur.notes.length - 1] += ` ${text.replace(/\s*\|\s*/g, " ")}`;
    else if (!/^R(\s*\|\s*R)?$/i.test(text)) cur.desc.push(text.replace(/\s*\|\s*/g, " "));
  }

  const lines: TableLine[] = rows.map((r) => {
    const description = clean(r.desc.join(" ")) + (r.notes.length ? ` – ${clean(r.notes.join("; "))}` : "");
    let unit = r.unit;
    let quantity = r.qty;
    let unsure = false;
    // "2x Industrial Sweepers" at a rate per hour: the 2 is the number of machines, not the hours. Never use it as the quantity.
    if (unit && TIME_UNIT.test(unit) && quantity == null) unsure = true;
    if (!unit && quantity != null && !hasUnitCol) unit = "No"; // goods lists with no unit column: each
    if (quantity == null) unsure = true;
    return { itemNo: r.itemNo.replace(/\.$/, ""), description, unit, quantity, unsure, raw: r.raw.join("\n").slice(0, 600) };
  });

  if (!lines.length) return { lines, confident: false, why: "no item rows" };
  if (lines.length > 60) return { lines: [], confident: false, why: "long list: the AI reader handles it" };
  const complete = lines.filter((l) => l.quantity != null || l.unit).length;
  if (complete < lines.length) return { lines, confident: false, why: "some rows have no quantity or unit" };
  return { lines, confident: true, why: "table read exactly" };
}

// ---------------------------------------------------------------- tidying what the AI reader returns

export type AiLine = { kind: "heading" | "item"; itemNo: string | null; description: string; unit: string | null; quantity: number | null; unsure: boolean; sourceText: string | null };

const BOILERPLATE_HEADING = /^(features?|specifications?|description|notes?|dimensions?|material|colour|color|size|warranty)\s*:?$/i;
const TOTAL_LINE = /^(sub-?\s?total|vat\b|total( price| amount)?\b|carried forward|brought forward|grand total)/i;

// Fixes the small, predictable slips: item numbers with a trailing full stop, total rows read as items,
// feature lists read as section headings, and goods lists whose table has no unit column.
export function tidyAiLines(lines: AiLine[], chunk: string): AiLine[] {
  const headerLine = chunk.split("\n").find(isPricingHeader);
  const noUnitColumn = headerLine ? !headerRoles(headerLine).has("unit") && (headerRoles(headerLine).has("qty") || /unit price/i.test(headerLine)) : false;
  const out: AiLine[] = [];
  for (const l of lines) {
    const description = l.description.replace(/\s+/g, " ").trim();
    if (!description) continue;
    if (TOTAL_LINE.test(description)) continue;
    if (l.kind === "heading" && BOILERPLATE_HEADING.test(description)) continue;
    const itemNo = l.itemNo ? l.itemNo.trim().replace(/[.:]+$/, "") || null : null;
    let unit = l.unit?.trim() || null;
    if (l.kind === "item" && !unit && l.quantity != null && noUnitColumn) unit = "No";
    // A time unit with the number of machines in the description ("2x Sweepers", per hour) must not become the hours.
    let { quantity, unsure } = l;
    if (l.kind === "item" && unit && TIME_UNIT.test(unit) && /^\s*\d+\s*x\b/i.test(description) && quantity === 2 && !/\bhours?\b.*\d|\d.*\bhours?\b/i.test(l.sourceText ?? "")) {
      quantity = null; unsure = true;
    }
    out.push({ ...l, itemNo, description, unit, quantity, unsure });
  }
  return out;
}

// ---------------------------------------------------------------- how to submit, when, and what to return

export type TenderInfo = {
  method: "email" | "portal" | "unknown";
  submitEmail: string | null;
  portalUrl: string | null;
  closingAt: string | null;   // ISO, South African time converted to UTC
  closingText: string | null; // as written, e.g. "29 October 2026 at 11:00"
  rfqNumber: string | null;
  enquiries: { name: string | null; phone: string | null; email: string | null } | null;
  validityDays: number | null;
  vatBasis: "inclusive" | "exclusive" | null;
  priceNotes: string[];
  required: string[];
  sources: string[];
};

export const emptyInfo = (): TenderInfo => ({
  method: "unknown", submitEmail: null, portalUrl: null, closingAt: null, closingText: null, rfqNumber: null,
  enquiries: null, validityDays: null, vatBasis: null, priceNotes: [], required: [], sources: [],
});

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const monthIndex = (s: string) => MONTHS.findIndex((m) => m.startsWith(s.toLowerCase().slice(0, 3)));
const DATE_PATTERNS: [RegExp, (m: RegExpMatchArray) => [number, number, number] | null][] = [
  [/(\d{1,2})\s*(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?,?\s+(\d{4})/i, (m) => [Number(m[3]), monthIndex(m[2]) + 1, Number(m[1])]],
  [/(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})/, (m) => [Number(m[3]), Number(m[2]), Number(m[1])]],
  [/(\d{4})[\/\-](\d{2})[\/\-](\d{2})/, (m) => [Number(m[1]), Number(m[2]), Number(m[3])]],
];

function findDate(s: string): { y: number; mo: number; d: number; at: number; len: number } | null {
  let best: { y: number; mo: number; d: number; at: number; len: number } | null = null;
  for (const [re, f] of DATE_PATTERNS) {
    const m = s.match(re);
    if (!m || m.index == null) continue;
    const v = f(m);
    if (!v || v[1] < 1 || v[1] > 12 || v[2] < 1 || v[2] > 31 || v[0] < 2000 || v[0] > 2100) continue;
    if (!best || m.index < best.at) best = { y: v[0], mo: v[1], d: v[2], at: m.index, len: m[0].length };
  }
  return best;
}

function findTime(s: string): { h: number; min: number } | null {
  const m = s.match(/(?<![\d/.-])(\d{1,2})\s*[hH:.]\s*(\d{2})(?!\d)\s*(am|pm)?/i);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  const ap = m[3]?.toLowerCase();
  if (ap === "pm" && h < 12) h += 12; // "16:00 PM" is already 24-hour, so only 1 to 11 get 12 added
  if (ap === "am" && h === 12) h = 0;
  return { h, min };
}

const pad = (n: number) => String(n).padStart(2, "0");

function closingFrom(text: string): { iso: string | null; text: string } | null {
  const flat = text.replace(/\s*\|\s*/g, " ").replace(/\s+/g, " ");
  const label = /closing\s*(?:date|time)(?:\s*(?:&|and)\s*(?:date|time))?\s*[:\-–@]?\s*/gi;
  let m: RegExpExecArray | null;
  while ((m = label.exec(flat))) {
    const tail = flat.slice(m.index + m[0].length, m.index + m[0].length + 80);
    const date = findDate(tail);
    if (!date || date.at > 14) continue; // the date must follow the label, not just appear somewhere nearby
    const around = flat.slice(m.index, m.index + m[0].length + 100).replace(tail.slice(date.at, date.at + date.len), " ");
    const time = findTime(around);
    const dateText = `${date.d} ${MONTHS[date.mo - 1][0].toUpperCase()}${MONTHS[date.mo - 1].slice(1)} ${date.y}`;
    if (!time) return { iso: null, text: dateText };
    // South Africa is UTC+2 all year.
    const iso = new Date(Date.UTC(date.y, date.mo - 1, date.d, time.h - 2, time.min)).toISOString();
    return { iso, text: `${dateText} at ${pad(time.h)}:${pad(time.min)}` };
  }
  return null;
}

const NOT_A_SUBMISSION = /quer(?:y|ies)|enquir|clarif|question/i;
const NOISE_EMAIL = /ethic|hotline|tip-?offs?|fraud|corrupt|whistle|complaint|reportit|no-?reply|privacy|popia|webmaster/i;
const SUBMIT_PHRASE = /(?:(?:submit|submitted|send|sent|email|e-?mail|e-?mailed|forward|deliver|return)\b[^.]{0,80}\b(?:quot\w*|bids?|tenders?|proposals?|offers?|responses?)\b)|(?:\b(?:quot\w*|bids?|tenders?|proposals?|offers?|responses?)\b[^.]{0,60}\b(?:must|should|shall|are to|to)\s+be\s+(?:submitted|sent|e-?mailed|delivered|returned))/i;

type EmailHit = { email: string; line: number; prefix: string; before: string };

function emailsIn(text: string): EmailHit[] {
  const lines = text.split("\n");
  const hits: EmailHit[] = [];
  lines.forEach((line, i) => {
    const re = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line))) {
      hits.push({ email: m[0], line: i, prefix: line.slice(0, m.index), before: `${lines[i - 2] ?? ""} ${lines[i - 1] ?? ""} ${line.slice(0, m.index)}` });
    }
  });
  return hits;
}

function findSubmitEmail(text: string): string | null {
  let best: { email: string; score: number } | null = null;
  for (const h of emailsIn(text)) {
    if (NOISE_EMAIL.test(h.email) || NOISE_EMAIL.test(h.before)) continue;
    const near = `${h.before.split(" ").slice(-1).join(" ")}`; // keep a reference to avoid unused warnings
    void near;
    const sameLine = h.prefix;
    const lastLines = text.split("\n").slice(Math.max(0, h.line - 1), h.line).join(" ") + " " + sameLine;
    let score = 0;
    if (SUBMIT_PHRASE.test(lastLines)) score += 6;
    if (/^(quotations?|quotes?|tenders?|bids?|rfq|rfqs|submissions?|procurement|scm|supplychain)s?@/i.test(h.email)) score += 3;
    // Questions go to a different person. Only a clear "quotations must be submitted ..." beats that.
    if (NOT_A_SUBMISSION.test(`${h.before}`) && !/\b(?:quot\w*|bids?|tenders?|proposals?)\b[^.]{0,60}\b(?:must|should|shall)\s+be\s+(?:submitted|sent|e-?mailed)/i.test(sameLine)) score -= 8;
    if (score >= 6 && (!best || score > best.score)) best = { email: h.email, score };
  }
  return best ? best.email.toLowerCase() : null;
}

const PORTAL_CONTEXT = /portal|e-?tender|upload|submission (?:system|platform)|submit[^.]{0,40}online/i;
const PORTAL_SKIP = /csd\.gov\.za|sars\.gov\.za|ethicshelpdesk|linkedin|facebook|google|microsoft\.com|treasury\.gov\.za/i;

function findPortal(text: string): string | null {
  const lines = text.split("\n");
  const re = /(?<![@\w.-])((?:https?:\/\/)?(?:[a-z0-9-]+\.)+(?:azurewebsites\.net|gov\.za|org\.za|co\.za|com|net|org|io))(?:\/[^\s)|]*)?/gi;
  for (let i = 0; i < lines.length; i++) {
    let m: RegExpExecArray | null;
    re.lastIndex = 0;
    while ((m = re.exec(lines[i]))) {
      const full = m[0].replace(/[.,;)]+$/, "");
      if (PORTAL_SKIP.test(full) || /^www\.[a-z0-9-]+\.gov\.za$/i.test(full)) continue;
      const context = `${lines[i - 1] ?? ""} ${lines[i]} ${lines[i + 1] ?? ""}`;
      if (!PORTAL_CONTEXT.test(context)) continue;
      const host = full.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
      return `https://${host}`;
    }
  }
  return null;
}

const NAME_LINE = /^[A-Za-z][A-Za-z'’.\-]+(?:\s+[A-Za-z][A-Za-z'’.\-]+){1,3}$/;
const LABEL_WORDS = /contact|number|telephone|tel\b|fax|facsimile|e-?mail|address|please|enquir|person|name|bidder|supplier/i;
const titleCase = (s: string) => (s === s.toUpperCase() ? s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase()) : s);

function findEnquiries(text: string, skip: string | null): TenderInfo["enquiries"] {
  const lines = text.split("\n");
  const hits = emailsIn(text).filter((h) => !NOISE_EMAIL.test(h.email) && !NOISE_EMAIL.test(h.before) && h.email.toLowerCase() !== skip);
  const phoneRe = /(?:\+27|\b0)\s?\d{2}[\s-]?\d{3}[\s-]?\d{4}\b/;
  const labelled = hits.find((h) => /enquir|contact|queries|technical|e-?mail address/i.test(`${h.before} ${lines[h.line]}`)) ?? hits[0];
  const from = labelled ? Math.max(0, labelled.line - 6) : 0;
  const to = labelled ? Math.min(lines.length, labelled.line + 3) : Math.min(lines.length, 0);
  const win = lines.slice(from, to);
  const phone = win.join(" ").match(phoneRe)?.[0]?.replace(/\s+/g, " ") ?? null;
  let name: string | null = null;
  for (let i = 0; i < win.length && !name; i++) {
    const cells = win[i].split(" | ").map((c) => c.trim());
    const at = cells.findIndex((c) => /^(contact person|please contact|for enquiries[^|]*contact:?)\s*:?$/i.test(c.replace(/:$/, "")) || /(?:please contact|contact person):?$/i.test(c));
    if (at < 0) continue;
    const same = cells.slice(at + 1).find((c) => NAME_LINE.test(c) && !LABEL_WORDS.test(c));
    const next = (win[i + 1] ?? "").split(" | ")[0].trim();
    const pick = same ?? (NAME_LINE.test(next) && !LABEL_WORDS.test(next) ? next : null);
    if (pick) name = titleCase(pick);
  }
  if (!labelled && !phone && !name) return null;
  return { name, phone, email: labelled ? labelled.email.toLowerCase() : null };
}

function findRfqNumber(text: string): string | null {
  const flat = text.replace(/\s*\|\s*/g, " ");
  const pats = [
    /\bRFQ\s*(?:no\.?|number|nr\.?)?[:\s]+(CRD\s*\(\d+\)\s*\d{4}\/\d{2}|[A-Z0-9][A-Z0-9/().\-]{3,30})/i,
    /\bbid\s*number[:\s]+([A-Z0-9][A-Z0-9/().\-]{3,30})/i,
    /\brequest for quotation\s*\[?rfq\]?\s*(?:no\.?)?\s*([A-Z0-9][A-Z0-9/().\-]{3,30})/i,
  ];
  for (const p of pats) {
    const m = flat.match(p);
    if (m && /\d/.test(m[1])) return m[1].replace(/\s+/g, " ").trim();
  }
  return null;
}

function findValidity(text: string): number | null {
  const flat = text.replace(/\s*\|\s*/g, " ").replace(/\s+/g, " ");
  const pats = [
    /must be valid for\s+(\d{2,3})\s*(?:\[[^\]]*\]\s*)?days/i,
    /validity period of\s+(\d{2,3})\b/i,
    /valid for\s+(\d{2,3})\s*(?:\[[^\]]*\]\s*)?days/i,
    /(\d{2,3})\s*days?\s+validity/i,
  ];
  for (const p of pats) {
    const m = flat.match(p);
    if (m) return Number(m[1]);
  }
  return null;
}

function findVatBasis(all: string, pricingText: string): TenderInfo["vatBasis"] {
  const inc = /vat[\s-]*inclusive|inclusive of vat|include vat/i.test(all);
  const exc = /vat[\s-]*exclusive|exclusive of vat|excl(?:uding|\.)?\s*vat/i.test(all) || (/sub-?\s?total/i.test(pricingText) && /vat\s*@\s*\d+\s*%/i.test(pricingText));
  if (inc && !exc) return "inclusive";
  if (exc && !inc) return "exclusive";
  return null;
}

function findPriceNotes(all: string, pricingText: string): string[] {
  const notes: string[] = [];
  const flat = all.replace(/\n/g, " ").replace(/\s*\|\s*/g, " ").replace(/\s+/g, " ");
  const dry = pricingText.split("\n").map((l) => l.replace(/^\d+\s*\|\s*/, "").trim()).find((l) => /^(dry|wet) rate/i.test(l));
  if (dry) notes.push(dry.slice(0, 220));
  if (/only firm prices will be accepted/i.test(flat)) notes.push("Firm prices only. Prices that change with exchange rates are not accepted.");
  return notes.slice(0, 4);
}

const REQUIRED: [RegExp, string][] = [
  [/central supplier database|\bcsd (?:no|number|report|registration)/i, "CSD registration number (and the CSD report if they ask for it)"],
  [/tax compliance (?:status )?(?:system )?pin|\btcs pin|tax clearance/i, "SARS tax compliance PIN"],
  [/b-?bbee (?:status level )?(?:verification )?certificate|sworn affidavit/i, "B-BBEE certificate or sworn affidavit"],
  [/company registration|identity document copies|id copies of the directors/i, "Company registration and directors' ID copies"],
  [/banking information|bank details|bank confirmation|bank letter/i, "Bank details or a bank letter"],
  [/guarantee letter|warranty (?:plans?|certificate|document)/i, "Warranty or guarantee letters"],
  [/catalogue|clear pictures/i, "Pictures or a catalogue of what you are offering"],
  [/coida|letter of good standing/i, "COIDA letter of good standing"],
  [/safety file|health and safety (?:plan|file)/i, "Safety file or plan"],
  [/proof of authority|company resolution/i, "Proof of authority to sign (company resolution)"],
];

function findRequired(all: string): string[] {
  const out: string[] = [];
  for (const [re, label] of REQUIRED) if (re.test(all)) out.push(label);
  const sbd = Array.from(new Set(Array.from(all.matchAll(/\bSBD\s?(\d(?:\.\d)?)\b/gi)).map((m) => m[1]))).sort();
  if (sbd.length) out.push(`Government forms: ${sbd.map((s) => `SBD ${s}`).join(", ")}`);
  out.push("Your signature and date on the form");
  return out;
}

// Reads every document of a tender. Earlier documents win, so pass the RFQ first.
export function extractTenderInfo(docs: { name: string; kind: DocKind; text: string }[]): TenderInfo {
  const info = emptyInfo();
  const order: Record<DocKind, number> = { rfq: 0, scope: 1, other: 2, pricing: 3 };
  const sorted = [...docs].sort((a, b) => order[a.kind] - order[b.kind]);
  const all = sorted.map((d) => d.text).join("\n");
  if (!all.trim()) return info;
  info.sources = sorted.map((d) => d.name).slice(0, 10);
  for (const d of sorted) {
    info.submitEmail ??= findSubmitEmail(d.text);
    info.portalUrl ??= findPortal(d.text);
    if (!info.closingText) { const c = closingFrom(d.text); if (c) { info.closingAt = c.iso; info.closingText = c.text; } }
    info.rfqNumber ??= findRfqNumber(d.text);
    info.validityDays ??= findValidity(d.text);
  }
  for (const d of sorted) { info.enquiries = findEnquiries(d.text, info.submitEmail); if (info.enquiries) break; }
  const pricingText = sorted.filter((d) => d.kind === "pricing").map((d) => d.text).join("\n") || pickPricingPages(all).text;
  info.vatBasis = findVatBasis(all, pricingText);
  info.priceNotes = findPriceNotes(all, pricingText);
  info.required = findRequired(all);
  info.method = info.submitEmail ? "email" : info.portalUrl ? "portal" : "unknown";
  return info;
}

// Fills gaps only: what is already known is never replaced by something empty.
export function mergeInfo(oldInfo: Partial<TenderInfo> | null | undefined, next: TenderInfo): TenderInfo {
  const o = { ...emptyInfo(), ...(oldInfo ?? {}) };
  const union = (a: string[], b: string[]) => Array.from(new Set([...a, ...b]));
  const merged: TenderInfo = {
    method: "unknown",
    submitEmail: next.submitEmail ?? o.submitEmail,
    portalUrl: next.portalUrl ?? o.portalUrl,
    closingAt: next.closingAt ?? o.closingAt,
    closingText: next.closingText ?? o.closingText,
    rfqNumber: next.rfqNumber ?? o.rfqNumber,
    enquiries: next.enquiries ?? o.enquiries,
    validityDays: next.validityDays ?? o.validityDays,
    vatBasis: next.vatBasis ?? o.vatBasis,
    priceNotes: union(o.priceNotes, next.priceNotes).slice(0, 5),
    required: union(o.required, next.required).slice(0, 14),
    sources: union(o.sources, next.sources).slice(0, 12),
  };
  merged.method = merged.submitEmail ? "email" : merged.portalUrl ? "portal" : "unknown";
  return merged;
}

// What comes back from the database is untrusted JSON. Keep only the shape we expect.
export function parseInfo(raw: unknown): TenderInfo | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const s = (v: unknown, max = 300) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
  const list = (v: unknown, n: number) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map((x) => x.slice(0, 240)).slice(0, n) : []);
  const e = r.enquiries && typeof r.enquiries === "object" ? (r.enquiries as Record<string, unknown>) : null;
  const info: TenderInfo = {
    method: "unknown",
    submitEmail: s(r.submitEmail, 200),
    portalUrl: s(r.portalUrl, 300),
    closingAt: s(r.closingAt, 40),
    closingText: s(r.closingText, 80),
    rfqNumber: s(r.rfqNumber, 80),
    enquiries: e ? { name: s(e.name, 80), phone: s(e.phone, 30), email: s(e.email, 200) } : null,
    validityDays: typeof r.validityDays === "number" && r.validityDays > 0 && r.validityDays < 1000 ? r.validityDays : null,
    vatBasis: r.vatBasis === "inclusive" || r.vatBasis === "exclusive" ? r.vatBasis : null,
    priceNotes: list(r.priceNotes, 5),
    required: list(r.required, 14),
    sources: list(r.sources, 12),
  };
  if (info.portalUrl && !/^https:\/\/[a-z0-9.-]+(\/\S*)?$/i.test(info.portalUrl)) info.portalUrl = null;
  if (info.submitEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(info.submitEmail)) info.submitEmail = null;
  info.method = info.submitEmail ? "email" : info.portalUrl ? "portal" : "unknown";
  return info;
}
