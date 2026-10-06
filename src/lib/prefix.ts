// "Granite Carpentry" -> "GC". Used in document numbers like GC-QT-2026-308.
const SKIP = /^(pty|ltd|cc|the|and)$/i;

export function businessPrefix(name: string): string {
  const letters = name
    .split(/\s+/)
    .filter((w) => /^[a-z]/i.test(w) && !SKIP.test(w))
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 4);
  return letters || "YB";
}
