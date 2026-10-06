import Link from "next/link";

export default function Logo({ href = "/", light = false }: { href?: string; light?: boolean }) {
  return (
    <Link href={href} className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-yebo text-white">Y</span>
      <span className={light ? "text-white" : "text-yebo-deep"}>Yebo</span>
    </Link>
  );
}
