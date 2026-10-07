import Link from "next/link";

export default function ClosingSection() {
  return (
    <section className="px-5 pb-20 sm:px-8 sm:pb-28 lg:px-12">
      <div className="mx-auto flex max-w-7xl flex-col gap-7 overflow-hidden rounded-[2rem] bg-yebo-deep px-6 py-12 text-white sm:px-10 sm:py-16 lg:flex-row lg:items-end lg:justify-between lg:px-14">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[.2em] text-yebo-sun">Your next job starts here</p>
          <h2 className="mt-4 max-w-2xl text-4xl font-extrabold leading-[.98] tracking-[-.06em] sm:text-5xl">
            Make your next quote easy to say yes to.
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-6 text-white/65 sm:text-base">
            Put the details in one place and give your client a clear next step.
          </p>
        </div>
        <Link className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full bg-yebo-sun px-6 py-3 text-sm font-extrabold text-yebo-deep transition hover:-translate-y-0.5 hover:bg-white" href="/login">
          Get started <span aria-hidden="true" className="ml-2">↗</span>
        </Link>
      </div>
    </section>
  );
}
