"use client";
import { useEffect } from "react";

const SEEN_KEY = "yebo-paid-seen";
const COLORS = ["#d9f36a", "#f26b38", "#0F8A5F", "#F2B21B", "#6fd3a1", "#0C3B2E"];

// A short burst of confetti, drawn on a canvas that removes itself. No libraries.
function burst() {
  const canvas = document.createElement("canvas");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth, h = window.innerHeight;
  canvas.width = w * dpr; canvas.height = h * dpr;
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:90";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) { canvas.remove(); return; }
  ctx.scale(dpr, dpr);
  const parts = Array.from({ length: 110 }, (_, i) => {
    const fromLeft = i % 2 === 0;
    const angle = (fromLeft ? -60 : -120) * (Math.PI / 180) + (Math.random() - 0.5) * 0.9;
    const speed = 11 + Math.random() * 9;
    return {
      x: fromLeft ? w * 0.1 : w * 0.9, y: h * 0.62,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      size: 6 + Math.random() * 6, rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)], round: Math.random() < 0.3,
    };
  });
  const start = performance.now();
  const frame = (now: number) => {
    const t = now - start;
    ctx.clearRect(0, 0, w, h);
    for (const p of parts) {
      p.vy += 0.34; p.vx *= 0.992; p.vy *= 0.992;
      p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, (2600 - t) / 700));
      ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.color;
      if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2); ctx.fill(); }
      else ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
      ctx.restore();
    }
    if (t < 2600) requestAnimationFrame(frame); else canvas.remove();
  };
  requestAnimationFrame(frame);
}

// Celebrates payments the owner has not seen yet. It remembers which ones on this device, so each payment pops confetti once.
export default function PaymentConfetti({ ids }: { ids: string[] }) {
  const key = ids.join(",");
  useEffect(() => {
    if (!ids.length || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let seen: string[] = [];
    try { seen = JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]"); } catch { /* storage blocked: treat everything as new */ }
    if (!Array.isArray(seen)) seen = [];
    if (!ids.some((id) => !seen.includes(id))) return;
    try { localStorage.setItem(SEEN_KEY, JSON.stringify([...new Set([...seen, ...ids])].slice(-60))); } catch { /* ignore */ }
    const t = setTimeout(burst, 450); // let the page settle first
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return null;
}
