"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon, { type IconName } from "./icons";

// Five equal slots with the big "New quote" button in the middle. Settings is the gear in the top bar on phones.
const tabs: { href: string; label: string; icon: IconName; fab?: boolean }[] = [
  { href: "/app", label: "Home", icon: "home" },
  { href: "/app/documents", label: "Documents", icon: "documents" },
  { href: "/app/quotes/new", label: "New quote", icon: "plus", fab: true },
  { href: "/app/tenders", label: "Tenders", icon: "tenders" },
  { href: "/app/reports/vat", label: "Reports", icon: "reports" },
];

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 grid h-[var(--tab-h)] grid-cols-5 items-start justify-items-center border-t border-ink/10 bg-white/95 px-1 pt-2 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
      {tabs.map((t) => {
        const active = t.href === "/app" ? path === "/app" : path.startsWith(t.href);
        if (t.fab)
          return (
            <Link key={t.href} href={t.href} aria-label="New quote" aria-current={active ? "page" : undefined} className="-mt-6 grid size-14 place-items-center rounded-full bg-lime text-ink shadow-[0_8px_20px_-6px_rgba(17,45,35,.55)] ring-4 ring-white transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange">
              <Icon name={t.icon} size={26} />
            </Link>
          );
        return (
          <Link key={t.href} href={t.href} aria-current={active ? "page" : undefined} className={`flex h-12 w-full min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-0.5 text-[10px] font-bold leading-none transition-colors ${active ? "text-yebo-deep" : "text-ink/45"}`}>
            <Icon name={t.icon} size={22} />
            <span className="w-full truncate text-center">{t.label}</span>
            <span className={`h-[3px] w-4 rounded-full ${active ? "bg-orange" : "bg-transparent"}`} />
          </Link>
        );
      })}
    </nav>
  );
}
