"use client";
import { useEffect } from "react";

// Tells Yebo the customer has really opened this page. It waits a couple of seconds, so a glance by a robot
// or a quick preview does not count, and it stays silent on devices that belong to the business owner.
export default function ViewBeacon({ token }: { token: string }) {
  useEffect(() => {
    try {
      if (localStorage.getItem("yebo_owner") === "1") return;
      if (new URLSearchParams(window.location.search).get("preview") === "1") return;
    } catch { /* storage blocked: carry on, the server still skips a signed-in owner */ }
    const timer = window.setTimeout(() => {
      fetch(`/d/${encodeURIComponent(token)}/seen`, { method: "POST", keepalive: true }).catch(() => {});
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [token]);
  return null;
}
