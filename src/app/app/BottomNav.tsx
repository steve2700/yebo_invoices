"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const Icon = ({ d }: { d: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);
const tabs = [
  { href: "/app", label: "Home", d: "M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" },
  { href: "/app/documents", label: "Documents", d: "M7 3h7l5 5v13H7zM14 3v5h5" },
  { href: "/app/quotes/new", label: "New quote", d: "M12 5v14M5 12h14", fab: true },
  { href: "/app/settings", label: "Settings", d: "M4 7h10M18 7h2M4 17h2M10 17h10M14 5v4M6 15v4" },
];

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 grid h-[var(--tab-h)] grid-cols-4 items-start justify-items-center border-t border-ink/10 bg-white/95 px-2 pt-2 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
      {tabs.map((t) => {
        const active = t.href === "/app" ? path === "/app" : path.startsWith(t.href);
        if (t.fab)
          return (
            <Link key={t.href} href={t.href} aria-label="New quote" aria-current={active ? "page" : undefined} className="-mt-5 grid size-14 place-items-center rounded-full bg-lime text-ink shadow-[0_8px_20px_-6px_rgba(17,45,35,.55)] ring-4 ring-white transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange">
              <Icon d={t.d} />
            </Link>
          );
        return (
          <Link key={t.href} href={t.href} aria-current={active ? "page" : undefined} className={`flex h-14 w-full min-w-0 flex-col items-center gap-0.5 rounded-xl px-1 py-1 text-[10px] font-bold leading-none ${active ? "text-ink" : "text-ink/45"}`}>
            <Icon d={t.d} />
            {t.label}
            <span className={`h-1 w-4 rounded-full ${active ? "bg-orange" : "bg-transparent"}`} />
          </Link>
        );
      })}
    </nav>
  );
}
