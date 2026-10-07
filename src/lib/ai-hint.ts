// When AI features fail on your own computer, the usual cause is a missing AI Gateway key.
export function aiSetupHint(): string | null {
  if (process.env.NODE_ENV !== "production" && !process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
    return "AI isn\u2019t set up on this computer yet. Add AI_GATEWAY_API_KEY to .env.local, then restart pnpm dev.";
  }
  return null;
}
