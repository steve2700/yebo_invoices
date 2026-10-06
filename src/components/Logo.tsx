import Link from "next/link";

export default function Logo({ href = "/", light = false }: { href?: string; light?: boolean }) {
  return (
    <Link href={href} aria-label="Yebo Invoices home" className="group flex items-center gap-2.5 text-lg font-extrabold tracking-tight">
      <svg aria-hidden="true" viewBox="0 0 40 40" className="size-9 shrink-0 transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-105">
        <rect width="40" height="40" rx="12" className="fill-yebo" />
        <path d="M10.5 11.5 20 22l9.5-10.5M20 22v8" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" className="text-white" />
        <circle cx="29.5" cy="11.5" r="3" className="fill-lime" />
      </svg>
      <span className={light ? "text-white" : "text-yebo-deep"}>Yebo</span>
    </Link>
  );
}
