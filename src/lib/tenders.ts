// Pure helpers for the Tender Engine. No server-only imports, so the browser editor and the server share them.
// Money is integer cents. Quantities are plain numbers (steel can be 0.04746 of a ton).

export type LineKind = "heading" | "item";

export type TenderLine = {
  id: string;
  kind: LineKind;
  itemNo: string;
  description: string;
  unit: string;
  quantity: number | null;
  rateCents: number | null; // null = not priced yet
  estRateCents: number | null; // the client's own estimate, shown as a cross-check
  raw: string; // the original BOQ text
  aiUnsure: boolean;
};

export const TENDER_CATEGORIES = [
  "Building & Construction",
  "Carpentry & Joinery",
  "Electrical",
  "Plumbing",
  "HVAC & Refrigeration",
  "Aluminium & Glass",
  "Painting & Finishes",
  "Civil & Concrete",
  "Steel & Welding",
  "Roofing",
  "Cleaning & Maintenance",
  "Other",
] as const;

export const TENDER_STATUSES = ["draft", "ready", "submitted", "won", "lost"] as const;
export type TenderStatus = (typeof TENDER_STATUSES)[number];

export const STATUS_LABEL: Record<TenderStatus, string> = {
  draft: "Draft",
  ready: "Ready to send",
  submitted: "Submitted",
  won: "Won",
  lost: "Lost",
};

// ---------- money ----------

export const lineTotalCents = (l: Pick<TenderLine, "kind" | "quantity" | "rateCents">) =>
  l.kind === "item" && l.quantity != null && l.rateCents != null ? Math.round(l.quantity * l.rateCents) : 0;

export function tenderTotals(lines: Pick<TenderLine, "kind" | "quantity" | "rateCents">[], vatPercent: number) {
  const subtotal = lines.reduce((sum, l) => sum + lineTotalCents(l), 0);
  const vat = Math.round((subtotal * vatPercent) / 100);
  return { subtotalCents: subtotal, vatCents: vat, totalCents: subtotal + vat };
}

// Money typed by a person: "1250", "R 1 250,50", "1,250.50". Returns cents, or null when empty or not a number.
export function parseRandToCents(input: string): number | null {
  let s = input.replace(/[Rr\s ]/g, "");
  if (!s) return null;
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, "");
  else if (/^\d+,\d{1,2}$/.test(s)) s = s.replace(",", ".");
  else s = s.replace(/,/g, "");
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export const centsToInput = (cents: number | null) => (cents == null ? "" : String(Math.round(cents) / 100));

export const randWithCents = (cents: number) =>
  "R" + (cents / 100).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/ /g, " ");

// Quantities are shown without trailing zeros (67.62, 0.04746, 3).
export const formatQty = (q: number | null) => (q == null ? "" : String(Number(q.toFixed(5))));

// ---------- cross-checking a line ----------

export type LineFlag = { level: "warn" | "info"; text: string };

const COUNT_UNITS = new Set(["item", "items", "no", "no.", "nr", "each", "ea", "sum", "ls", "lump sum", "set", "pc", "pcs"]);

export function lineFlags(l: TenderLine): LineFlag[] {
  if (l.kind !== "item") return [];
  const flags: LineFlag[] = [];
  const unit = l.unit.trim().toLowerCase();
  if (!l.description.trim()) flags.push({ level: "warn", text: "No description" });
  if (l.quantity == null) flags.push({ level: "warn", text: "No quantity in the BOQ. Check the original." });
  if (!unit) flags.push({ level: "warn", text: "No unit in the BOQ. Check the original." });
  if (l.quantity != null && unit && COUNT_UNITS.has(unit) && !Number.isInteger(l.quantity) && l.quantity > 0) {
    flags.push({ level: "warn", text: `Unit is "${l.unit.trim()}" but the quantity is ${formatQty(l.quantity)}. Is the unit wrong?` });
  }
  if (l.aiUnsure) flags.push({ level: "warn", text: "Read from a PDF and not certain. Compare with the original text." });
  if (l.rateCents === 0) flags.push({ level: "warn", text: "Rate is R0." });
  if (l.rateCents != null && l.rateCents > 0 && l.estRateCents != null && l.estRateCents > 0) {
    const ratio = l.rateCents / l.estRateCents;
    if (ratio > 3 || ratio < 1 / 3) {
      flags.push({ level: "info", text: `Far from the client's estimate of ${randWithCents(l.estRateCents)}.` });
    }
  }
  return flags;
}

export type BoqSummary = {
  itemCount: number;
  pricedCount: number;
  unpricedCount: number;
  flaggedCount: number;
  noQtyCount: number;
};

export function summarise(lines: TenderLine[]): BoqSummary {
  const items = lines.filter((l) => l.kind === "item");
  const priced = items.filter((l) => l.rateCents != null && l.quantity != null);
  return {
    itemCount: items.length,
    pricedCount: priced.length,
    unpricedCount: items.length - priced.length,
    flaggedCount: items.filter((l) => lineFlags(l).some((f) => f.level === "warn")).length,
    noQtyCount: items.filter((l) => l.quantity == null).length,
  };
}

// Used to match a BOQ line to a rate the business has used before.
export const normaliseDescription = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 140);

// ---------- closing date ----------

export function closingInfo(closingAt: string | null | undefined, now: Date = new Date()) {
  if (!closingAt) return { label: "No closing date", tone: "none" as const, msLeft: null as number | null };
  const ms = new Date(closingAt).getTime() - now.getTime();
  if (ms <= 0) return { label: "Closed", tone: "closed" as const, msLeft: ms };
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 24) return { label: `Closes in ${Math.max(hours, 1)}h`, tone: "urgent" as const, msLeft: ms };
  const days = Math.floor(hours / 24);
  return { label: `Closes in ${days} day${days === 1 ? "" : "s"}`, tone: days <= 3 ? ("urgent" as const) : ("ok" as const), msLeft: ms };
}

// ---------- compliance vault ----------

export type Vault = {
  csd_number: string | null;
  csd_path: string | null;
  sars_pin: string | null;
  sars_expiry: string | null;
  sars_path: string | null;
  bbbee_level: number | null;
  bbbee_expiry: string | null;
  bbbee_path: string | null;
  coida_expiry: string | null;
  coida_path: string | null;
};

export type VaultCheck = {
  key: "csd" | "sars" | "bbbee" | "coida";
  label: string;
  ok: boolean;
  detail: string; // e.g. "Supplier number: MAAA0492810" or "EXPIRED on 12 Oct 2026"
  fix: string; // what the user must do
  hasFile: boolean;
  expiry: string | null;
  /** Whole days from today to the expiry, or null when there is no expiry date. */
  daysLeft: number | null;
  /** Still valid, but lapses within SOON_DAYS. */
  soon: boolean;
};

export const SOON_DAYS = 14;

// Where the owner gets each document. These are the official sites; the owner logs in with their own details.
export const VAULT_SOURCES: Record<VaultCheck["key"], { name: string; url: string; how: string }> = {
  csd: { name: "National Treasury CSD", url: "https://secure.csd.gov.za", how: "Log in, open your supplier profile and download the summary report." },
  sars: { name: "SARS eFiling", url: "https://www.sarsefiling.co.za", how: "Log in, request your Tax Compliance Status and keep the PIN and the PDF." },
  bbbee: { name: "DTIC (affidavit template)", url: "https://www.thedtic.gov.za", how: "Small businesses sign the B-BBEE affidavit in front of a commissioner of oaths." },
  coida: { name: "Compensation Fund (CompEasy)", url: "https://compeasy.labour.gov.za", how: "Log in and request your Letter of Good Standing." },
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function prettyDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[(m ?? 1) - 1]} ${y}`;
}

// The expiry must still be in the future on the day the bid is sent. "today" is a YYYY-MM-DD string (South African date).
function expiryCheck(expiry: string | null, today: string, closingDay: string | null) {
  if (!expiry) return { ok: false, detail: "No expiry date saved" };
  if (expiry < today) return { ok: false, detail: `EXPIRED on ${prettyDate(expiry)}` };
  if (closingDay && expiry < closingDay) return { ok: false, detail: `Expires ${prettyDate(expiry)}, before this tender closes` };
  return { ok: true, detail: `Valid until ${prettyDate(expiry)}` };
}

function daysBetween(from: string, to: string) {
  const a = from.split("-").map(Number), b = to.split("-").map(Number);
  return Math.round((Date.UTC(b[0], b[1] - 1, b[2]) - Date.UTC(a[0], a[1] - 1, a[2])) / 86_400_000);
}

export const CSD_PATTERN = /^MAAA\d{7}$/;

export function vaultChecks(vault: Vault | null, today: string, closingDay: string | null = null): VaultCheck[] {
  const v = vault;
  const daysTo = (e: string | null) => (e ? daysBetween(today, e) : null);
  const csdNumber = (v?.csd_number ?? "").trim().toUpperCase();
  const csdOk = CSD_PATTERN.test(csdNumber);
  const sars = expiryCheck(v?.sars_expiry ?? null, today, closingDay);
  const sarsHasPin = Boolean((v?.sars_pin ?? "").trim());
  const bbbee = expiryCheck(v?.bbbee_expiry ?? null, today, closingDay);
  const coida = expiryCheck(v?.coida_expiry ?? null, today, closingDay);
  const checks: VaultCheck[] = [
    {
      key: "csd",
      label: "CSD Summary",
      ok: csdOk && Boolean(v?.csd_path),
      detail: csdOk ? `Supplier number: ${csdNumber}${v?.csd_path ? "" : " (no file attached)"}` : csdNumber ? "Supplier number does not look right (MAAA + 7 digits)" : "No supplier number saved",
      fix: csdOk ? "Attach your CSD summary report" : "Add your CSD supplier number and summary report",
      hasFile: Boolean(v?.csd_path),
      expiry: null,
      daysLeft: null,
      soon: false,
    },
    {
      key: "sars",
      label: "SARS Tax Compliance Status",
      ok: sars.ok && sarsHasPin && Boolean(v?.sars_path),
      detail: !sarsHasPin ? "No compliance PIN saved" : sars.ok ? `PIN ${v?.sars_pin?.trim()} · ${sars.detail}${v?.sars_path ? "" : " (no file attached)"}` : `PIN ${v?.sars_pin?.trim()}: ${sars.detail}`,
      fix: "Update your SARS Tax Compliance Status in the vault",
      hasFile: Boolean(v?.sars_path),
      expiry: v?.sars_expiry ?? null,
      daysLeft: daysTo(v?.sars_expiry ?? null),
      soon: false,
    },
    {
      key: "bbbee",
      label: "B-BBEE Sworn Affidavit",
      ok: bbbee.ok && Boolean(v?.bbbee_path),
      detail: bbbee.ok ? `${v?.bbbee_level ? `Level ${v.bbbee_level}` : "Level not set"} · ${bbbee.detail}${v?.bbbee_path ? "" : " (no file attached)"}` : bbbee.detail,
      fix: "Update your B-BBEE affidavit in the vault",
      hasFile: Boolean(v?.bbbee_path),
      expiry: v?.bbbee_expiry ?? null,
      daysLeft: daysTo(v?.bbbee_expiry ?? null),
      soon: false,
    },
    {
      key: "coida",
      label: "COIDA Certificate",
      ok: coida.ok && Boolean(v?.coida_path),
      detail: coida.ok ? `${coida.detail}${v?.coida_path ? "" : " (no file attached)"}` : coida.detail,
      fix: "Update your COIDA Letter of Good Standing in the vault",
      hasFile: Boolean(v?.coida_path),
      expiry: v?.coida_expiry ?? null,
      daysLeft: daysTo(v?.coida_expiry ?? null),
      soon: false,
    },
  ];
  return checks.map((c) => ({ ...c, soon: c.ok && c.daysLeft != null && c.daysLeft <= SOON_DAYS }));
}

export const isCompliant = (checks: VaultCheck[]) => checks.every((c) => c.ok);

export function lockMessage(checks: VaultCheck[]) {
  const bad = checks.filter((c) => !c.ok);
  if (!bad.length) return null;
  if (bad.length === 1) return `You cannot submit this tender until your ${bad[0].label} is updated in the vault.`;
  return `You cannot submit this tender until these are updated in the vault: ${bad.map((c) => c.label).join(", ")}.`;
}
