"use client";
import type { CheckItem } from "@/lib/quote-check";

// Moves to a field, opening the section it is hidden in, and puts the cursor there.
function jumpTo(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  if (el instanceof HTMLDetailsElement) el.open = true;
  el.closest("details")?.setAttribute("open", "");
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  const focusable = el.matches("input,textarea,select,button") ? el : el.querySelector<HTMLElement>("input,textarea,select,button");
  window.setTimeout(() => focusable?.focus({ preventScroll: true }), 250);
}

const TITLES: Record<CheckItem["level"], string> = {
  contact: "Contact details",
  important: "Worth fixing",
  nice: "Nice to have",
};

// "Check before you send": what a customer would notice, with a button that jumps to each fix.
export default function QuoteCheck({ items, kind, children }: { items: CheckItem[]; kind: "quote" | "invoice"; children?: React.ReactNode }) {
  const levels: CheckItem["level"][] = ["contact", "important", "nice"];
  const urgent = items.filter((i) => i.level !== "nice").length;
  return (
    <section aria-label="Check before you send" className="mt-5 rounded-[2rem] bg-white p-5 shadow-[0_16px_60px_rgba(20,42,31,.08)] ring-1 ring-ink/5 sm:p-7">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-orange">Before you send</p>
          <h2 className="mt-2 text-xl font-black tracking-tight">{items.length === 0 ? `This ${kind} looks professional` : urgent === 0 ? "Nearly perfect" : `${urgent} thing${urgent === 1 ? "" : "s"} to check`}</h2>
        </div>
        <span aria-hidden="true" className={`grid size-10 shrink-0 place-items-center rounded-2xl text-lg font-black ${urgent === 0 ? "bg-lime text-ink" : "bg-orange/15 text-orange"}`}>{urgent === 0 ? "✓" : "!"}</span>
      </div>
      {items.length === 0 && <p className="mt-2 text-sm text-ink/60">Your client can be reached, the work is described and the items are clear. Send it with confidence.</p>}
      {levels.map((level) => {
        const group = items.filter((i) => i.level === level);
        if (!group.length) return null;
        return (
          <div key={level} className="mt-4">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-ink/45">{TITLES[level]}</p>
            <ul className="mt-2 space-y-2">
              {group.map((item) => (
                <li key={item.id} className={`flex items-start justify-between gap-3 rounded-2xl p-3 text-sm ${level === "contact" ? "bg-orange/10" : "bg-paper/70"}`}>
                  <span className="leading-5 text-ink/85">{item.message}</span>
                  <button type="button" onClick={() => jumpTo(item.fixId)} className="min-h-9 shrink-0 rounded-full border border-ink/15 bg-white px-3 text-xs font-bold text-ink">Fix</button>
                </li>
              ))}
            </ul>
            {level === "contact" && children}
          </div>
        );
      })}
    </section>
  );
}
