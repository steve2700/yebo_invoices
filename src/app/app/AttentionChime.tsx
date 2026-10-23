"use client";
import { useEffect } from "react";

export const SOUND_KEY = "yebo-alert-sound"; // "off" turns the chime off
const SEEN_KEY = "yebo-alert-seen";

export function playChime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    // Two soft notes (a gentle "ding-ding"), about half a second in total.
    [[880, 0], [1175, 0.16]].forEach(([freq, delay]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.18, now + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.32);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + 0.35);
    });
    setTimeout(() => ctx.close().catch(() => undefined), 800);
    navigator.vibrate?.(80);
  } catch { /* sound is a nice-to-have, never break the page */ }
}

// Browsers only allow sound after the person has tapped something, so the chime plays on their first tap or key press.
// It plays once per new situation (new overdue invoice or tender closing soon), not on every page load.
export default function AttentionChime({ signature, count }: { signature: string; count: number }) {
  useEffect(() => {
    if (count <= 0) return;
    let off = false, seen = "";
    try { off = localStorage.getItem(SOUND_KEY) === "off"; seen = localStorage.getItem(SEEN_KEY) ?? ""; } catch { /* storage blocked */ }
    if (off || seen === signature) return;
    const go = () => {
      playChime();
      try { localStorage.setItem(SEEN_KEY, signature); } catch { /* ignore */ }
      remove();
    };
    const remove = () => { window.removeEventListener("pointerdown", go); window.removeEventListener("keydown", go); };
    window.addEventListener("pointerdown", go, { once: true });
    window.addEventListener("keydown", go, { once: true });
    return remove;
  }, [signature, count]);
  return null;
}
