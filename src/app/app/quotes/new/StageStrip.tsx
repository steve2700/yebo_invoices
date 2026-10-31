"use client";

// The three steps at the top of the form. Tap a finished step to go back to it; Next at the bottom moves forward.
export default function StageStrip({ step, hasClient, hasItems, onGo }: { step: 1 | 2 | 3; hasClient: boolean; hasItems: boolean; onGo: (step: 1 | 2 | 3) => void }) {
  const steps: { n: 1 | 2 | 3; label: string; done: boolean }[] = [
    { n: 1, label: "Who", done: hasClient && step > 1 },
    { n: 2, label: "What and price", done: hasItems && step > 2 },
    { n: 3, label: "Review and send", done: false },
  ];
  return (
    <nav aria-label="Steps" className="mb-5 flex items-center gap-2 text-xs font-bold">
      {steps.map((s, i) => (
        <div key={s.n} className="flex flex-1 items-center gap-2">
          <button type="button" onClick={() => onGo(s.n)} aria-current={step === s.n ? "step" : undefined} className={`flex min-h-10 flex-1 items-center justify-center gap-2 rounded-full px-3 ${s.done ? "bg-lime text-ink" : step === s.n ? "bg-ink text-paper" : "bg-ink/5 text-ink/55"}`}>
            <span aria-hidden="true" className={`grid size-5 place-items-center rounded-full text-[10px] ${s.done ? "bg-ink text-lime" : "bg-white/20"}`}>{s.done ? "✓" : s.n}</span>
            <span className="truncate">{s.label}</span>
          </button>
          {i < steps.length - 1 && <span aria-hidden="true" className="h-px w-2 shrink-0 bg-ink/20" />}
        </div>
      ))}
    </nav>
  );
}
