// Words about instant payment, used on the client page, the PDF and the emails, so they always say the same thing.

export const INSTANT_HELP = "Arrives in minutes, also on weekends and holidays. In your banking app, choose PayShap and pay this cellphone number.";

// Said next to the normal EFT details. Small businesses live on prompt payment, and clients rarely know a normal EFT can take days.
export function eftNote(businessName: string, hasInstant: boolean): string {
  return hasInstant
    ? `A normal EFT also works, but on weekends and holidays it can take until Monday or Tuesday to reach ${businessName}. Paying instantly means ${businessName} gets the money today, and a small business really feels the difference.`
    : `Tip: if your banking app has an instant or immediate payment option, please use it. A normal EFT can take until Monday or Tuesday on weekends and holidays, and a small business like ${businessName} depends on being paid promptly.`;
}

// One line for emails and the PDF.
export function instantLine(formattedNumber: string): string {
  return `Instant payment (PayShap): ${formattedNumber}`;
}
