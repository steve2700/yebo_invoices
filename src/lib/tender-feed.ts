// Pure helpers for the Tender Hub. No server-only imports, so the daily job, the pages and tests can share them.
// It turns one OCDS "release" (the format National Treasury's eTenders uses) into a row for the tender_feed table,
// works out the trade category and province from the text, and decides whether a tender matches a business's preferences.

export const PROVINCES = [
  "Gauteng",
  "Western Cape",
  "Eastern Cape",
  "Northern Cape",
  "KwaZulu-Natal",
  "Free State",
  "Limpopo",
  "Mpumalanga",
  "North West",
] as const;

export type FeedDoc = { title: string; url: string };

export type FeedRow = {
  source: string;
  external_id: string;
  reference: string | null;
  title: string;
  buyer: string | null;
  category: string | null;
  province: string | null;
  location: string | null;
  published_at: string | null;
  closing_at: string | null;
  submission_email: string | null;
  description: string | null;
  documents: FeedDoc[];
  source_url: string | null;
};

// First match wins, so the more specific trades come first. The names must match TENDER_CATEGORIES in tenders.ts.
const CATEGORY_RULES: [string, RegExp][] = [
  ["HVAC & Refrigeration", /\b(hvac|air[\s-]?condition|refrigerat|cold\s?room|ventilat|chiller|heat\s?pump)/i],
  ["Electrical", /\b(electric|wiring|lighting|solar|photovoltaic|generator|substation|transformer|switchgear|cabling|distribution board)/i],
  ["Plumbing", /\b(plumb|sanitary|geyser|water\s(supply|reticulation)|sewer|drainage|borehole|ablution|toilet|taps?\b)/i],
  ["Aluminium & Glass", /\b(alumin|glass|glazing|mirror|window|shopfront|curtain\swall)/i],
  ["Roofing", /\b(roof|gutter|sheeting|truss|waterproofing)/i],
  ["Steel & Welding", /\b(steel|weld|fabricat|palisade|fenc(e|ing)|gates?\b|balustrade|burglar)/i],
  ["Painting & Finishes", /\b(paint|plaster|tiling|tiles?\b|screed|flooring|finishes)/i],
  ["Carpentry & Joinery", /\b(carpent|joiner|cabinet|furniture|timber|wood|shelving|partition|ceiling|drywall|dry\swall|mdf|doors?\b)/i],
  ["Civil & Concrete", /\b(civil|concrete|road|paving|culvert|bridge|earthwork|kerb|stormwater|bulk\sservices)/i],
  ["Building & Construction", /\b(construct|building|renovat|refurbish|alteration|extension|erection|brick|structure)/i],
  ["Cleaning & Maintenance", /\b(clean|janitor|hygiene|pest\scontrol|gardening|landscap|maintenance|repair)/i],
];

export function categoryFromText(text: string): string | null {
  for (const [category, pattern] of CATEGORY_RULES) if (pattern.test(text)) return category;
  return null;
}

const PROVINCE_RULES: [string, RegExp][] = [
  ["KwaZulu-Natal", /\b(kwazulu|kzn|durban|ethekwini|pietermaritzburg|richards bay|newcastle|ladysmith)\b/i],
  ["Western Cape", /\b(western cape|cape town|stellenbosch|george|paarl|worcester|mossel bay|overberg)\b/i],
  ["Eastern Cape", /\b(eastern cape|gqeberha|port elizabeth|east london|buffalo city|mthatha|nelson mandela bay|komani)\b/i],
  ["Northern Cape", /\b(northern cape|kimberley|upington|sol plaatje)\b/i],
  ["Free State", /\b(free state|bloemfontein|mangaung|welkom|bethlehem)\b/i],
  ["Limpopo", /\b(limpopo|polokwane|tzaneen|thohoyandou|musina|lephalale)\b/i],
  ["Mpumalanga", /\b(mpumalanga|mbombela|nelspruit|witbank|emalahleni|secunda|middelburg)\b/i],
  ["North West", /\b(north west|north-west|rustenburg|mahikeng|mafikeng|klerksdorp|potchefstroom|brits)\b/i],
  ["Gauteng", /\b(gauteng|johannesburg|pretoria|tshwane|ekurhuleni|sandton|soweto|midrand|centurion|benoni|germiston|roodepoort|vereeniging|krugersdorp|springs|boksburg)\b/i],
];

export function provinceFromText(text: string): string | null {
  for (const [province, pattern] of PROVINCE_RULES) if (pattern.test(text)) return province;
  return null;
}

// ---------------------------------------------------------------- OCDS mapping

type Json = Record<string, unknown>;
const obj = (v: unknown): Json => (v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown, max = 500): string | null => {
  if (typeof v !== "string" && typeof v !== "number") return null;
  const s = String(v).replace(/\s+/g, " ").trim();
  return s ? s.slice(0, max) : null;
};
const iso = (v: unknown): string | null => {
  const s = str(v, 40);
  if (!s) return null;
  const t = new Date(s);
  return Number.isNaN(t.getTime()) ? null : t.toISOString();
};
const EMAIL = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;
const httpUrl = (v: unknown): string | null => {
  const s = str(v, 1000);
  return s && /^https?:\/\//i.test(s) ? s : null;
};

// Returns null for a release we cannot use (no id, no title, or no closing date).
export function mapRelease(raw: unknown, source = "etenders"): FeedRow | null {
  const release = obj(raw);
  const tender = obj(release.tender);
  const externalId = str(release.ocid, 200) ?? str(release.id, 200) ?? str(tender.id, 200);
  const title = str(tender.title, 300) ?? str(tender.description, 300);
  const closing = iso(obj(tender.tenderPeriod).endDate);
  if (!externalId || !title || !closing) return null;

  const buyerName = str(obj(release.buyer).name, 200) ?? str(obj(tender.procuringEntity).name, 200);
  const description = str(tender.description, 4000);

  // Collect every place a location or contact email might be written.
  const parties = arr(release.parties).map(obj);
  const places: string[] = [];
  let email: string | null = null;
  const candidates = [obj(tender.procuringEntity), obj(release.buyer), ...parties];
  for (const party of candidates) {
    const address = obj(party.address);
    for (const key of ["region", "locality", "streetAddress"]) {
      const v = str(address[key], 200);
      if (v) places.push(v);
    }
    const contactEmail = str(obj(party.contactPoint).email, 200);
    if (!email && contactEmail && EMAIL.test(contactEmail)) email = contactEmail.toLowerCase();
  }
  for (const d of arr(tender.deliveryAddresses).map(obj)) {
    for (const key of ["region", "locality", "streetAddress"]) {
      const v = str(d[key], 200);
      if (v) places.push(v);
    }
  }

  const items = arr(tender.items).map(obj);
  const itemText = items.map((i) => `${str(i.description, 200) ?? ""} ${str(obj(i.classification).description, 200) ?? ""}`).join(" ");
  const haystack = `${title} ${description ?? ""} ${itemText}`;

  let category = categoryFromText(haystack);
  // Works contracts that match no trade are still construction tenders.
  if (!category && str(tender.mainProcurementCategory, 40)?.toLowerCase() === "works") category = "Building & Construction";

  const placeText = places.join(" ");
  const province = provinceFromText(placeText) ?? provinceFromText(`${title} ${description ?? ""} ${buyerName ?? ""}`);

  const documents: FeedDoc[] = [];
  for (const doc of arr(tender.documents).map(obj)) {
    const url = httpUrl(doc.url);
    if (!url) continue;
    documents.push({ title: str(doc.title, 160) ?? str(doc.description, 160) ?? "Tender document", url });
    if (documents.length >= 12) break;
  }

  return {
    source,
    external_id: externalId,
    reference: str(tender.id, 120) ?? str(release.id, 120),
    title,
    buyer: buyerName,
    category,
    province,
    location: places[0] ?? null,
    published_at: iso(release.date) ?? iso(obj(tender.tenderPeriod).startDate),
    closing_at: closing,
    submission_email: email,
    description,
    documents,
    source_url: null,
  };
}

// The API wraps its list in different ways. Accept a bare list, or one of the usual wrapper keys.
export function releasesFromResponse(body: unknown): unknown[] {
  if (Array.isArray(body)) return body;
  const o = obj(body);
  for (const key of ["releases", "data", "items", "results"]) {
    if (Array.isArray(o[key])) return o[key] as unknown[];
  }
  return [];
}

// ---------------------------------------------------------------- matching

export type FeedPrefs = { categories: string[]; provinces: string[] };

// A tender matches when its trade is one the business chose, and it is in a chosen province (or the province is unknown,
// or the business did not pick any province, which means anywhere).
export function matchesPrefs(row: { category: string | null; province: string | null }, prefs: FeedPrefs): boolean {
  if (!row.category || !prefs.categories.includes(row.category)) return false;
  if (!prefs.provinces.length || !row.province) return true;
  return prefs.provinces.includes(row.province);
}
