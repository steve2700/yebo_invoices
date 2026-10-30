"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string; badge?: number };

export default function AdminNav({ items }: { items: NavItem[] }) {
  const path = usePathname();
  return (
    <nav aria-label="Admin sections" className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
      {items.map((item) => {
        const active = item.href === "/admin" ? path === "/admin" : path.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 shrink-0 items-center justify-between gap-3 rounded-xl px-4 text-sm font-bold transition ${active ? "bg-white text-yebo-deep" : "text-white/80 hover:bg-white/10 hover:text-white"}`}
          >
            <span>{item.label}</span>
            {item.badge ? <span className="rounded-full bg-yebo-sun px-2 py-0.5 text-xs font-extrabold text-yebo-deep">{item.badge}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
