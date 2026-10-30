import type { ReactNode } from "react";

export const card = "rounded-2xl border border-yebo-deep/10 bg-white p-5 shadow-sm";
export const th = "px-3 py-2 text-left text-xs font-extrabold uppercase tracking-[.12em] text-yebo-deep/55";
export const td = "px-3 py-2 text-sm text-yebo-deep";
export const link = "font-bold text-yebo underline decoration-yebo/30 underline-offset-4";

export function PageHead({ title, note }: { title: string; note?: string }) {
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-black tracking-tight text-yebo-deep sm:text-3xl">{title}</h1>
      {note && <p className="mt-1 max-w-2xl text-sm leading-6 text-yebo-deep/60">{note}</p>}
    </header>
  );
}

export function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="mt-8 first:mt-0">
      <h2 className="text-lg font-black text-yebo-deep">{title}</h2>
      {note && <p className="mt-1 text-sm text-yebo-deep/60">{note}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: string; tone?: "warn" }) {
  return (
    <div className={card + (tone === "warn" ? " border-orange/40" : "")}>
      <p className="text-xs font-extrabold uppercase tracking-[.12em] text-yebo-deep/55">{label}</p>
      <p className="mt-2 text-3xl font-black tabular-nums text-yebo-deep">{value}</p>
      {hint && <p className="mt-1 text-xs text-yebo-deep/55">{hint}</p>}
    </div>
  );
}

export const Missing = ({ what }: { what: string }) => <p className="text-sm text-yebo-deep/60">{what} has not been set up yet. Run its SQL first.</p>;
