"use server";

import { logError } from "@/lib/log-error";

// Browser errors are reported here. Strangers can call this, so it is strict: short text only, and a small limit per server.
const recent: number[] = [];

export async function reportBrowserError(message: string, stack: string | null, path: string) {
  if (typeof message !== "string" || !message || message.length > 800) return;
  const now = Date.now();
  while (recent.length && now - recent[0] > 60_000) recent.shift();
  if (recent.length >= 30) return;
  recent.push(now);
  await logError({ source: "browser", message, stack: typeof stack === "string" ? stack : null, path: typeof path === "string" ? path : null });
}
