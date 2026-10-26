// Simple, forgiving checks for the contact details of a client. Used by the quote form and checked again on the server.
export const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());

// South African numbers: 0821234567 (10 digits starting with 0) or +27821234567 (11 digits starting with 27).
export function saPhoneOk(value: string): boolean {
  let d = value.replace(/[\s().-]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  else if (d.startsWith("00")) d = d.slice(2);
  if (!/^\d+$/.test(d)) return false;
  return (d.startsWith("0") && d.length === 10) || (d.startsWith("27") && d.length === 11);
}
