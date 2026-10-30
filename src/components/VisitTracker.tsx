"use client";

import { useEffect } from "react";
import { trackVisit } from "@/app/track-visit";

// Counts one visit per browser tab session, with where it came from. No cookies, no personal details.
export default function VisitTracker() {
  useEffect(() => {
    try {
      if (window.sessionStorage.getItem("yebo-visit")) return;
      window.sessionStorage.setItem("yebo-visit", "1");
      const sid = window.sessionStorage.getItem("yebo-sid") || Math.random().toString(36).slice(2) + Date.now().toString(36);
      window.sessionStorage.setItem("yebo-sid", sid);
      const q = new URLSearchParams(window.location.search);
      const tag = q.get("utm_source") || q.get("s") || q.get("ref") || "";
      void trackVisit(sid, document.referrer, tag, window.location.pathname, window.location.hostname).catch(() => {});
    } catch {
      /* storage can be blocked */
    }
  }, []);
  return null;
}
