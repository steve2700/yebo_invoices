import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-xl px-6 py-24">
      <h1 className="text-4xl font-extrabold">Yebo Invoices</h1>
      <p className="mt-3 text-neutral-600">Quotes clients say yes to. Get quoted. Get paid. Gently.</p>
      <Link href="/login" className="mt-8 inline-block rounded-xl bg-yebo px-6 py-3 font-bold text-white">
        Get started
      </Link>
    </main>
  );
}
