"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const SLIDES = [
  { src: "/hero/hero-smile.jpg", alt: "A smiling electrician in a white hard hat looking at the camera on a job site", pos: "object-[64%_22%] lg:object-[50%_28%]" },
  { src: "/hero/hero-electrician.jpg", alt: "An electrician in a hard hat and safety glasses wiring a distribution board", pos: "object-[50%_30%] lg:object-[50%_38%]" },
  { src: "/hero/team-tablet.jpg", alt: "Three builders in hard hats and safety vests checking a tablet on site", pos: "object-[55%_30%] lg:object-[50%_30%]" },
  { src: "/hero/hero-workshop.jpg", alt: "Two carpenters at work in a bright workshop with timber and cabinets", pos: "object-[50%_55%] lg:object-[50%_50%]" },
];

const EVERY_MS = 6000;

export default function HeroPhotos({ initial = 0 }: { initial?: number }) {
  const [i, setI] = useState(initial);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || paused) return;
    const id = window.setInterval(() => {
      if (!document.hidden) setI((n) => (n + 1) % SLIDES.length);
    }, EVERY_MS);
    return () => window.clearInterval(id);
  }, [paused]);

  return (
    <div className="relative h-[56svh] max-h-[480px] min-h-[340px] overflow-hidden lg:absolute lg:inset-y-0 lg:right-0 lg:-z-20 lg:h-auto lg:max-h-none lg:min-h-0 lg:w-[66%]">
      {SLIDES.map((s, n) => (
        <div
          key={s.src}
          aria-hidden={n !== i}
          className={`absolute inset-0 transition-[opacity,transform] ease-out motion-reduce:transition-none ${n === i ? "scale-100 opacity-100 duration-[1200ms,9000ms]" : "scale-[1.06] opacity-0 duration-[1200ms,0ms]"}`}
        >
          <Image src={s.src} alt={s.alt} fill priority={n === 0} sizes="(min-width: 1024px) 66vw, 100vw" className={`object-cover ${s.pos}`} />
        </div>
      ))}
      {/* Phone: fade the photo into the green below it. Desktop: fade its left edge into the green behind the words. */}
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-yebo-deep to-transparent lg:hidden" />
      <div aria-hidden="true" className="absolute inset-y-0 left-0 hidden w-1/2 bg-gradient-to-r from-yebo-deep via-yebo-deep/60 to-transparent lg:block" />
      <div className="absolute bottom-14 right-5 flex gap-2 lg:bottom-6 lg:right-8" role="group" aria-label="Choose a photo">
        {SLIDES.map((s, n) => (
          <button
            key={s.src}
            type="button"
            aria-label={`Show photo ${n + 1} of ${SLIDES.length}`}
            aria-current={n === i}
            onClick={() => { setI(n); setPaused(true); }}
            className="flex h-6 w-6 items-center justify-center"
          >
            <span className={`block h-2 rounded-full transition-all ${n === i ? "w-6 bg-yebo-sun" : "w-2 bg-white/60"}`} />
          </button>
        ))}
      </div>
    </div>
  );
}
