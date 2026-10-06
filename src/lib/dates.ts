export const addDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
// "082 555 0142" -> wa.me/27825550142. With no phone, WhatsApp lets the user pick a contact.
export const waLink = (phone: string | null, text: string) => {
  const digits = (phone ?? "").replace(/\D/g, "");
  const n = digits.startsWith("0") ? "27" + digits.slice(1) : digits;
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
};

// "2026-10-06" -> "6 Oct 2026" (avoids the timezone shift of new Date("2026-10-06"))
export const formatDate = (iso: string | null | undefined) =>
  iso ? new Date(iso + "T00:00:00").toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }) : "";
