// The steps of signing in, in order. The admin page counts how many different visits reached each one.
export const SIGNIN_STEPS = [
  { id: "page_view", label: "Opened the sign-in page" },
  { id: "code_requested", label: "Asked for an email code" },
  { id: "verified", label: "Typed a correct code and got in" },
] as const;

// Things that go wrong, shown separately.
export const SIGNIN_PROBLEMS = [
  { id: "request_failed", label: "Could not send the code" },
  { id: "verify_failed", label: "Wrong or expired code" },
  { id: "link_failed", label: "Opened a link in the wrong browser" },
  { id: "google_clicked", label: "Tapped Continue with Google" },
  { id: "google_failed", label: "Google sign-in failed" },
  { id: "resend", label: "Asked for a new code" },
] as const;

export const ALL_STEP_IDS: string[] = [...SIGNIN_STEPS, ...SIGNIN_PROBLEMS].map((s) => s.id);

// Counts distinct visits per step. A visit that asked for 3 codes still counts once.
export function countSessions(rows: { session_id: string; step: string }[]): Record<string, number> {
  const seen = new Map<string, Set<string>>();
  for (const r of rows) {
    if (!seen.has(r.step)) seen.set(r.step, new Set());
    seen.get(r.step)!.add(r.session_id);
  }
  return Object.fromEntries([...seen].map(([k, v]) => [k, v.size]));
}
