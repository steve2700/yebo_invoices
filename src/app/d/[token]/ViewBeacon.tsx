"use client";
import { useEffect } from "react";

// Tells Yebo the customer has really opened this page, then how long it stayed open and how far they scrolled.
// It waits a couple of seconds, so a glance by a robot or a quick preview does not count, and it stays silent on
// devices that belong to the business owner. Time only counts while the page is on screen.
export default function ViewBeacon({ token }: { token: string }) {
  useEffect(() => {
    try {
      if (localStorage.getItem("yebo_owner") === "1") return;
      if (new URLSearchParams(window.location.search).get("preview") === "1") return;
    } catch { /* storage blocked: carry on, the server still skips a signed-in owner */ }

    const url = `/d/${encodeURIComponent(token)}/time`;
    let seconds = 0;
    let sentSeconds = 0;
    let scroll = 0;
    let sentScroll = 0;
    let counting = false;

    const readScroll = () => {
      const el = document.documentElement;
      const total = Math.max(el.scrollHeight, 1);
      scroll = Math.max(scroll, Math.min(100, Math.round(((window.scrollY + window.innerHeight) / total) * 100)));
    };
    const flush = () => {
      if (!counting) return;
      readScroll();
      const delta = seconds - sentSeconds;
      if (delta <= 0 && scroll <= sentScroll) return;
      const body = JSON.stringify({ seconds: delta, scroll });
      sentSeconds = seconds;
      sentScroll = scroll;
      try {
        if (!navigator.sendBeacon(url, new Blob([body], { type: "application/json" }))) throw new Error("beacon refused");
      } catch {
        fetch(url, { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
      }
    };

    const startTimer = window.setTimeout(() => {
      fetch(`/d/${encodeURIComponent(token)}/seen`, { method: "POST", keepalive: true }).catch(() => {});
      counting = true;
      seconds = 2;
    }, 2500);
    const tick = window.setInterval(() => {
      if (counting && document.visibilityState === "visible") seconds += 1;
    }, 1000);
    const every = window.setInterval(flush, 15000);
    const onHide = () => { if (document.visibilityState === "hidden") flush(); };
    window.addEventListener("scroll", readScroll, { passive: true });
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    return () => {
      window.clearTimeout(startTimer);
      window.clearInterval(tick);
      window.clearInterval(every);
      window.removeEventListener("scroll", readScroll);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [token]);
  return null;
}
