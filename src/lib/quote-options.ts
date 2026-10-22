// Good / Better / Best: one quote, up to three price options. Lines with no option are shared by every option.

export const OPTION_KEYS = ["good", "better", "best"] as const;
export type OptionKey = (typeof OPTION_KEYS)[number];
export const OPTION_LABELS: Record<OptionKey, string> = { good: "Good", better: "Better", best: "Best" };

export const isOptionKey = (value: unknown): value is OptionKey =>
  typeof value === "string" && (OPTION_KEYS as readonly string[]).includes(value);

type OptionLine = { line_total_cents: number | string; option_key?: string | null };

// The options that actually have at least one line of their own, in Good, Better, Best order.
export function optionsPresent(lines: OptionLine[]): OptionKey[] {
  return OPTION_KEYS.filter((key) => lines.some((line) => line.option_key === key));
}

// Shared lines plus the lines of one option.
export function subtotalFor(lines: OptionLine[], option: OptionKey): number {
  return lines
    .filter((line) => !line.option_key || line.option_key === option)
    .reduce((sum, line) => sum + Number(line.line_total_cents), 0);
}

// What the quote header shows before the client has chosen: the lowest option ("from").
export function lowestSubtotal(lines: OptionLine[]): number {
  const present = optionsPresent(lines);
  if (!present.length) return lines.reduce((sum, line) => sum + Number(line.line_total_cents), 0);
  return Math.min(...present.map((key) => subtotalFor(lines, key)));
}

// Once an option is chosen, only the shared lines and that option's lines count.
export function linesForChoice<T extends OptionLine>(lines: T[], chosen: string | null | undefined): T[] {
  if (!isOptionKey(chosen)) return lines;
  return lines.filter((line) => !line.option_key || line.option_key === chosen);
}

export const withVat = (subtotalCents: number, vatPercent: number) => {
  const vat = Math.round((subtotalCents * vatPercent) / 100);
  return { subtotal: subtotalCents, vat, total: subtotalCents + vat };
};
