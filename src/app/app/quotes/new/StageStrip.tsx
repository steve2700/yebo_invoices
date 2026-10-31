"use client";

// Three plain steps at the top of the form. They tick off as you go and jump to the part you tap.
export default function StageStrip({ hasClient, hasItems, ready }: { hasClient: boolean; hasItems: boolean; ready: boolean }) {
  const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const steps = [
    { n: 1, label: "Who", done: hasClient, onClick: () => go("who-section") },
    { n: 2, label: "What and price", done: hasItems, onClick: () => go("amount-section") },
    { n: 3, label: "Review and send", done: ready, onClick: () => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }) },
  ];
  const current = !hasClient ? 1 : !hasItems ? 2 : 3;
  return (
    <nav aria-label="Steps" className="mb-5 flex items-center gap-2 text-xs font-bold">
      {steps.map((s, i) => (
        <div key={s.n} className="flex flex-1 items-center gap-2">
          <button type="button" onClick={s.onClick} aria-current={current === s.n ? "step" : undefined} className={`flex min-h-10 flex-1 items-center justify-center gap-2 rounded-full px-3 ${s.done ? "bg-lime text-ink" : current === s.n ? "bg-ink text-paper" : "bg-ink/5 text-ink/55"}`}>
            <span aria-hidden="true" className={`grid size-5 place-items-center rounded-full text-[10px] ${s.done ? "bg-ink text-lime" : "bg-white/20"}`}>{s.done ? "✓" : s.n}</span>
            <span className="truncate">{s.label}</span>
          </button>
          {i < steps.length - 1 && <span aria-hidden="true" className="h-px w-2 shrink-0 bg-ink/20" />}
        </div>
      ))}
    </nav>
  );
}
