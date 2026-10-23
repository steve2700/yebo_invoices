import Reveal from "@/components/Reveal";

const roasts = [
  {
    tag: "The voice-note quote",
    roast: "\u201CEish, it\u2019s about R8 000, maybe R9, depends.\u201D Your client heard \u201Cmaybe\u201D and phoned someone else.",
    fix: "Speak it into Yebo. It comes out as a clean, itemised quote with real numbers.",
  },
  {
    tag: "The Word doc from 2014",
    roast: "A stretched logo, three fonts and a table that breaks if you breathe on it. Very \u201Cmy cousin did it.\u201D",
    fix: "Your logo and colours on a page that looks like you mean business.",
  },
  {
    tag: "The \u201Cdid you get it?\u201D text",
    roast: "Sent on Monday. Blue ticks on Tuesday. Radio silence ever since. You are not ghosted, you are just unorganised.",
    fix: "See the moment they open it, then nudge them in one tap.",
  },
  {
    tag: "The \u201CI\u2019ll remember who owes me\u201D",
    roast: "You won\u2019t. There is R12 000 living in your head rent-free, and none of it is in your bank account.",
    fix: "Outstanding and overdue money, on your home screen every morning.",
  },
];

export default function RoastSection() {
  return (
    <section id="roast" className="relative scroll-mt-24 overflow-hidden bg-yebo-deep py-20 text-white sm:py-28">
      <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-32 size-[28rem] rounded-full bg-yebo/40 blur-3xl" />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        <Reveal>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[.2em] text-lime">A gentle roast</p>
              <h2 className="mt-4 max-w-3xl text-balance text-4xl font-extrabold leading-[.98] tracking-[-.05em] sm:text-6xl">
                Let&apos;s be honest about your current &ldquo;system.&rdquo;
              </h2>
            </div>
            <p className="max-w-sm text-base leading-7 text-white/65">No judgement. Okay, a little judgement. Then we fix it.</p>
          </div>
        </Reveal>

        <ul className="mt-12 grid gap-4 md:grid-cols-2">
          {roasts.map((item, index) => (
            <li key={item.tag}>
              <Reveal delay={index * 0.06} className="h-full">
                <article className="group flex h-full flex-col rounded-[1.75rem] border border-white/10 bg-white/[.04] p-6 transition hover:border-white/20 hover:bg-white/[.07] sm:p-8">
                  <div className="flex items-center justify-between gap-4">
                    <span className="rounded-full bg-orange/15 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[.12em] text-orange">{item.tag}</span>
                    <span aria-hidden="true" className="font-mono text-sm font-bold text-white/25">0{index + 1}</span>
                  </div>
                  <p className="mt-6 flex-1 text-pretty text-xl font-bold leading-snug tracking-tight text-white sm:text-2xl">{item.roast}</p>
                  <div className="mt-7 flex items-start gap-3 border-t border-white/10 pt-5">
                    <span aria-hidden="true" className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-lime text-xs font-black text-yebo-deep">✓</span>
                    <p className="text-sm leading-6 text-white/75">
                      <span className="font-extrabold text-lime">The Yebo fix: </span>
                      {item.fix}
                    </p>
                  </div>
                </article>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
