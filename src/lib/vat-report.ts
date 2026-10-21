// Turns invoices and payments into the sales and VAT figures an accountant asks for.
// Pure functions only (no database, no server code), so they are easy to test.

export type InvoiceRow = {
  number: string;
  issueDate: string; // YYYY-MM-DD
  clientName: string;
  title: string;
  subtotalCents: number;
  vatCents: number;
  totalCents: number;
  vatPercent: number;
  status: string;
  paidCents: number;
  lastPaidDate: string | null; // YYYY-MM-DD
};

export type PaymentRow = {
  paidDate: string; // YYYY-MM-DD, South African date
  invoiceNumber: string;
  clientName: string;
  method: string;
  amountCents: number;
  vatCents: number; // the VAT part of this payment
  netCents: number; // the part without VAT
  vatPercent: number;
};

// 123456 -> "1234.56". Integer maths only, so there is never a rounding surprise.
export function money(cents: number) {
  const negative = cents < 0;
  const abs = Math.abs(Math.round(cents));
  return `${negative ? "-" : ""}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

// The VAT part of a payment: the same share of the invoice's VAT as the payment is of the invoice's total.
export function vatPortion(paymentCents: number, invoiceVatCents: number, invoiceTotalCents: number) {
  if (invoiceTotalCents <= 0 || invoiceVatCents <= 0) return 0;
  return Math.round((paymentCents * invoiceVatCents) / invoiceTotalCents);
}

// Text cells starting with = + - @ can be run as formulas when a CSV is opened in Excel. Defuse them.
function textCell(value: string) {
  const clean = value.replace(/[\r\n]+/g, " ").trim();
  const safe = /^[=+\-@\t]/.test(clean) ? `'${clean}` : clean;
  return /[",;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

const row = (cells: string[]) => cells.join(",");
const BOM = "\uFEFF"; // lets Excel read names with accents correctly

export function totalsOfInvoices(rows: InvoiceRow[]) {
  return rows.reduce(
    (sum, item) => ({
      count: sum.count + 1,
      netCents: sum.netCents + item.subtotalCents,
      vatCents: sum.vatCents + item.vatCents,
      grossCents: sum.grossCents + item.totalCents,
      paidCents: sum.paidCents + item.paidCents,
    }),
    { count: 0, netCents: 0, vatCents: 0, grossCents: 0, paidCents: 0 },
  );
}

export function totalsOfPayments(rows: PaymentRow[]) {
  return rows.reduce(
    (sum, item) => ({
      count: sum.count + 1,
      grossCents: sum.grossCents + item.amountCents,
      vatCents: sum.vatCents + item.vatCents,
      netCents: sum.netCents + item.netCents,
    }),
    { count: 0, grossCents: 0, vatCents: 0, netCents: 0 },
  );
}

// Invoice basis: every invoice dated in the period, with its VAT.
export function invoiceRegisterCsv(rows: InvoiceRow[]) {
  const header = row(["Invoice number", "Invoice date", "Client", "Job", "Amount excl VAT (R)", "VAT (R)", "Amount incl VAT (R)", "VAT rate %", "Status", "Amount paid (R)", "Last payment date"]);
  const lines = rows.map((item) =>
    row([
      textCell(item.number), item.issueDate, textCell(item.clientName), textCell(item.title),
      money(item.subtotalCents), money(item.vatCents), money(item.totalCents), String(item.vatPercent),
      textCell(item.status.replace("_", " ")), money(item.paidCents), item.lastPaidDate ?? "",
    ]),
  );
  const total = totalsOfInvoices(rows);
  lines.push(row(["TOTAL", "", "", `${total.count} invoices`, money(total.netCents), money(total.vatCents), money(total.grossCents), "", "", money(total.paidCents), ""]));
  return `${BOM}${[header, ...lines].join("\r\n")}\r\n`;
}

// Payments basis: every payment received in the period, split into its VAT part and the rest.
export function paymentRegisterCsv(rows: PaymentRow[]) {
  const header = row(["Date received", "Invoice number", "Client", "How it was paid", "Amount received (R)", "VAT part (R)", "Amount excl VAT (R)", "VAT rate %"]);
  const lines = rows.map((item) =>
    row([item.paidDate, textCell(item.invoiceNumber), textCell(item.clientName), textCell(item.method), money(item.amountCents), money(item.vatCents), money(item.netCents), String(item.vatPercent)]),
  );
  const total = totalsOfPayments(rows);
  lines.push(row(["TOTAL", "", `${total.count} payments`, "", money(total.grossCents), money(total.vatCents), money(total.netCents), ""]));
  return `${BOM}${[header, ...lines].join("\r\n")}\r\n`;
}

// ---- dates ----
const DATE = /^\d{4}-\d{2}-\d{2}$/;
export const isIsoDate = (value: string | undefined | null): value is string => {
  if (!value || !DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const pad = (n: number) => String(n).padStart(2, "0");
const lastDay = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();

// Quick choices for the period picker, worked out from today's South African date (YYYY-MM-DD).
export function periodPresets(today: string) {
  const [year, month] = today.split("-").map(Number);
  const monthRange = (y: number, m: number) => ({ from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${pad(lastDay(y, m))}` });
  const shift = (back: number) => {
    const index = year * 12 + (month - 1) - back;
    return { y: Math.floor(index / 12), m: (index % 12) + 1 };
  };
  const last = shift(1);
  const twoAgo = shift(2);
  return [
    { id: "this", label: "This month", ...monthRange(year, month) },
    { id: "last", label: "Last month", ...monthRange(last.y, last.m) },
    { id: "two", label: "Last 2 months", from: `${twoAgo.y}-${pad(twoAgo.m)}-01`, to: monthRange(last.y, last.m).to },
  ];
}
