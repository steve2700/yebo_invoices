// Single source of truth for South African banks and their universal branch codes.
// Used by onboarding and Settings so the two can never drift apart.

export type SaBank = { name: string; branchCode: string };

export const SA_BANKS: SaBank[] = [
  { name: "Absa Bank", branchCode: "632005" },
  { name: "African Bank", branchCode: "430000" },
  { name: "Bank Zero", branchCode: "888000" },
  { name: "Bank Zero (Mukuru)", branchCode: "435000" },
  { name: "Bidvest Bank", branchCode: "462005" },
  { name: "Capitec Bank", branchCode: "470010" },
  { name: "Discovery Bank", branchCode: "679000" },
  { name: "First National Bank (FNB)", branchCode: "250655" },
  { name: "Investec Bank", branchCode: "580105" },
  { name: "Nedbank", branchCode: "198765" },
  { name: "Old Mutual Bank", branchCode: "462005" },
  { name: "Rand Merchant Bank (RMB)", branchCode: "261251" },
  { name: "Sasfin Bank", branchCode: "683000" },
  { name: "South African Postbank", branchCode: "460005" },
  { name: "Standard Bank", branchCode: "051001" },
  { name: "TymeBank", branchCode: "678910" },
];

export const SA_BANK_NAMES = SA_BANKS.map((b) => b.name);

// Old saved values from earlier drops, mapped to the new names so nobody loses their bank.
const LEGACY_NAMES: Record<string, string> = {
  "FNB": "First National Bank (FNB)",
  "Standard Bank": "Standard Bank",
  "Absa": "Absa Bank",
  "Nedbank": "Nedbank",
  "Capitec": "Capitec Bank",
};

export function normaliseBankName(value: string | null | undefined): string {
  if (!value) return "";
  if (SA_BANK_NAMES.includes(value)) return value;
  return LEGACY_NAMES[value] ?? ""; // "Other" and anything unknown becomes "Not set"
}

export function branchCodeFor(bankName: string): string {
  return SA_BANKS.find((b) => b.name === bankName)?.branchCode ?? "";
}

export function isValidBankName(value: string | null): boolean {
  return value === null || SA_BANK_NAMES.includes(value);
}
