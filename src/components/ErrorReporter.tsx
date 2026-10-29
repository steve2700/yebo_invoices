"use client";

import { useEffect } from "react";
import { reportBrowserError } from "@/app/report-error";

// Sends browser errors to the admin error log. At most 3 per page visit, so a loop cannot flood it.
export default function ErrorReporter() {
  useEffect(() => {
    let sent = 0;
    const send = (message: string, stack: string | null) => {
      if (sent >= 3 || !message) return;
      sent++;
      void reportBrowserError(message.slice(0, 500), stack ? stack.slice(0, 1500) : null, window.location.pathname).catch(() => {});
    };
    const onError = (e: ErrorEvent) => send(e.message || "Unknown browser error", e.error?.stack ?? null);
    const onRejection = (e: PromiseRejectionEvent) => {
      const r = e.reason as { message?: string; stack?: string } | string | undefined;
      send(typeof r === "string" ? r : r?.message ?? "Unhandled promise rejection", typeof r === "string" ? null : r?.stack ?? null);
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
