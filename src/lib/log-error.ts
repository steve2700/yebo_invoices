import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { escapeHtml, renderEmail, sendEmail } from "@/lib/email";
import { SUPPORT } from "@/lib/support";
import { appUrl } from "@/lib/url";

// Errors that are not worth anyone's attention (browser extensions, scanners, normal navigation).
const NOISE = /ResizeObserver loop|Script error\.?$|NEXT_REDIRECT|NEXT_NOT_FOUND|ChunkLoadError|Loading chunk|Failed to fetch dynamically imported|AbortError|Non-Error promise rejection|extension:\/\//i;

export const isNoise = (message: string) => NOISE.test(message);

// The same problem always gets the same id, so a bug that happens 200 times is one line with a count.
export function fingerprint(source: string, message: string): string {
  const cleaned = message.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/gi, "<id>").replace(/\d+/g, "#").slice(0, 200);
  return createHash("sha1").update(source + "|" + cleaned).digest("hex").slice(0, 24);
}

// Email me on the first time, then at 5, 25 and 100 repeats, never more.
export const shouldAlert = (count: number) => count === 1 || count === 5 || count === 25 || count === 100;

type Input = { source: "server" | "browser" | "action"; message: string; stack?: string | null; path?: string | null };

// Records an error. It never throws, because a broken error log must not break the page that is already failing.
export async function logError(input: Input): Promise<void> {
  try {
    const message = String(input.message ?? "").slice(0, 500);
    if (!message || isNoise(message)) return;
    const stack = input.stack ? String(input.stack).slice(0, 2000) : null;
    const path = input.path ? String(input.path).slice(0, 200) : null;
    const key = fingerprint(input.source, message);
    const admin = createAdminClient();
    // One row per occurrence, so the admin page can show the last 24 hours. Old rows are tidied now and then.
    await admin.from("error_hits").insert({ fingerprint: key });
    if (Math.random() < 0.02) await admin.from("error_hits").delete().lt("created_at", new Date(Date.now() - 7 * 86_400_000).toISOString());
    const { data: existing } = await admin.from("error_log").select("id,count").eq("fingerprint", key).maybeSingle();
    let count = 1;
    if (existing) {
      count = Number(existing.count) + 1;
      await admin.from("error_log").update({ count, last_seen: new Date().toISOString(), last_path: path, resolved: false }).eq("id", existing.id);
    } else {
      const { error } = await admin.from("error_log").insert({ fingerprint: key, source: input.source, message, stack, last_path: path });
      if (error) return;
    }
    if (shouldAlert(count)) {
      await sendEmail({
        to: process.env.SURVEY_NOTIFY_EMAIL || SUPPORT.email,
        fromName: "Yebo alerts",
        idempotencyKey: `error/${key}/${count}`,
        subject: `Yebo error${count > 1 ? ` (x${count})` : ""}: ${message.slice(0, 70)}`,
        html: renderEmail({
          heading: count === 1 ? "A new error happened" : `This error has now happened ${count} times`,
          intro: `${escapeHtml(input.source)} error${path ? " on " + path : ""}: ${message}`,
          buttonLabel: "Open the admin page",
          buttonUrl: `${appUrl()}/admin`,
        }),
      });
    }
  } catch (caught) {
    console.error("[log-error] could not record an error:", caught);
  }
}
