import Link from "next/link";
import PhoneFrame from "@/components/PhoneFrame";

export default function ClosingSection() {
  return (
    <section className="bg-yebo-deep text-white">
      <div className="mx-auto grid max-w-7xl items-end gap-10 px-5 pt-14 sm:px-8 lg:grid-cols-[1.2fr_.8fr] lg:px-12 lg:pt-0">
        <div className="pb-14 lg:py-20">
          <h2 className="max-w-2xl text-balance text-4xl font-extrabold leading-[1] tracking-[-.04em] sm:text-6xl">Send your first quote today.</h2>
          <p className="mt-5 max-w-xl text-pretty text-lg leading-8 text-white/80">
            Set up once with your logo and bank details. After that, each quote is a few minutes of work, and your client gets a clear page with a yes button and a way to pay.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-3">
            <Link className="inline-flex min-h-[52px] items-center justify-center rounded-md bg-yebo-sun px-7 text-base font-bold text-yebo-deep transition hover:bg-white" href="/login">
              Get started
            </Link>
            <Link className="text-base font-semibold text-white underline decoration-white/40 underline-offset-4 transition hover:decoration-white" href="/pricing">
              See pricing
            </Link>
          </div>
        </div>
        <div className="flex justify-center">
          <PhoneFrame
            src="/screens/quote-client.png"
            alt="Yebo quote screen with client name, WhatsApp, email and address fields"
            tone="light"
            className="w-[230px] translate-y-6 sm:w-[250px]"
          />
        </div>
      </div>
    </section>
  );
}
