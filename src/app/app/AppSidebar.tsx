"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon, { type IconName } from "./icons";

// Wide screens only. Phones keep the bottom bar. Sign out is not here on purpose; it lives in Settings.
const main: { href: string; label: string; icon: IconName; match?: string }[] = [
  { href: "/app", label: "Home", icon: "home" },
  { href: "/app/requests", label: "Quote requests", icon: "newQuote" },
  { href: "/app/documents", label: "Quotes and invoices", icon: "documents" },
  { href: "/app/reminders", label: "Reminders", icon: "bell" },
  { href: "/app/tenders", label: "Tenders", icon: "tenders" },
  { href: "/app/reports/wins", label: "Win rate", icon: "reports" },
  { href: "/app/reports/vat", label: "VAT report", icon: "reports" },
];
const footer: { href: string; label: string; icon: IconName }[] = [
  { href: "/app/help", label: "Help", icon: "help" },
  { href: "/app/settings", label: "Settings", icon: "settings" },
];

export default function AppSidebar() {
  const path = usePathname();
  const item = (t: { href: string; label: string; icon: IconName }) => {
    const active = t.href === "/app" ? path === "/app" : path.startsWith(t.href);
    return (
      <Link
        key={t.href}
        href={t.href}
        aria-current={active ? "page" : undefined}
        className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold transition-colors ${active ? "bg-yebo-deep text-white" : "text-ink/65 hover:bg-yebo-deep/5 hover:text-ink"}`}
      >
        <Icon name={t.icon} size={20} />
        <span className="truncate">{t.label}</span>
      </Link>
    );
  };
  return (
    <aside className="hidden border-r border-ink/10 bg-white lg:block">
      <nav aria-label="Sections" className="sticky top-14 flex h-[calc(100vh-3.5rem)] flex-col justify-between gap-6 overflow-y-auto p-4">
        <div className="flex flex-col gap-1">{main.map(item)}</div>
        <div className="flex flex-col gap-1 border-t border-ink/10 pt-4">{footer.map(item)}</div>
      </nav>
    </aside>
  );
}
