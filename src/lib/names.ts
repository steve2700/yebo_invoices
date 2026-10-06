const TITLES = /^(mr|mrs|ms|miss|mx|dr|prof|sir|madam)\.?$/i;

// "Thabo Mokoena" -> "Thabo", "Mr Stewart" -> "Mr Stewart" (never just "Mr")
export function greetingName(full: string | null | undefined): string {
  const parts = (full ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "there";
  if (TITLES.test(parts[0])) return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1]}` : parts[0];
  return parts[0];
}
