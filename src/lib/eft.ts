// Where customers pay by EFT when their card will not work.
// The bank details live in environment variables (not in the code), so they never appear in the public repository.
export type EftDetails = { bank: string; holder: string; account: string; branch: string; type: string };

export function eftDetails(): EftDetails | null {
  const get = (key: string) => process.env[key]?.trim() ?? "";
  const bank = get("YEBO_EFT_BANK"), holder = get("YEBO_EFT_HOLDER"), account = get("YEBO_EFT_ACCOUNT");
  if (!bank || !holder || !account) return null; // not set up: the EFT section stays hidden
  return { bank, holder, account, branch: get("YEBO_EFT_BRANCH"), type: get("YEBO_EFT_TYPE") || "Current" };
}

// A short reference the customer puts on the payment, so you can match it in your bank app.
export const eftReference = (businessId: string) => "YEBO-" + businessId.replace(/-/g, "").slice(0, 6).toUpperCase();
