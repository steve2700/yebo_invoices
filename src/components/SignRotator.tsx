"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { SIGNS } from "@/lib/signs";

const SECONDS = 5;

// Cycles through the yard-sign posters. It does not start on its own for people who prefer reduced motion,
// it pauses while the pointer or keyboard focus is on it, and it has plain Previous, Next and Pause buttons.
export default function SignRotator() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [held, setHeld] = useState(false);
  const [reduced, setReduced] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const q = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(q.matches);
    if (q.matches) setPlaying(false);
  }, []);

  const go = useCallback((n: number) => setIndex((i) => (i + n + SIGNS.length) % SIGNS.length), []);

  useEffect(() => {
    if (!playing || held || reduced) return;
    timer.current = setInterval(() => go(1), SECONDS * 1000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [playing, held, reduced, go]);

  // warm the next picture so the swap is instant
  useEffect(() => {
    const next = SIGNS[(index + 1) % SIGNS.length];
    const img = new window.Image();
    img.src = `/_next/image?url=${encodeURIComponent(next.file)}&w=1080&q=75`;
  }, [index]);

  const sign = SIGNS[index];
  const btn = "min-h-11 px-2 text-sm font-semibold text-yebo-deep underline decoration-yebo-deep/30 underline-offset-4 transition hover:decoration-yebo-deep";

  return (
    <figure
      className="w-full"
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-[#68a444]">
        <Image
          key={sign.file}
          src={sign.file}
          alt={`Yard sign. ${sign.headline} ${sign.person}.`}
          fill
          priority={index === 0}
          sizes="(max-width: 1024px) 92vw, 560px"
          className="sign-swap object-cover"
        />
      </div>
      <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <span className="text-xs text-yebo-deep/60">Sign {index + 1} of {SIGNS.length}. Made-up people, real features.</span>
        <span className="flex items-center">
          <button type="button" className={btn} onClick={() => go(-1)}>Previous</button>
          <button type="button" className={btn} onClick={() => go(1)}>Next</button>
          {!reduced && (
            <button type="button" className={btn} aria-pressed={!playing} onClick={() => setPlaying((p) => !p)}>
              {playing ? "Pause" : "Play"}
            </button>
          )}
        </span>
      </figcaption>
    </figure>
  );
}
