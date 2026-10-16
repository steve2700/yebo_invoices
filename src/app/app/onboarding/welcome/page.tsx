import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { billingEnforced } from "@/lib/access";

const features = [
  { icon: "🎙️", title: "Speak your quote", text: "Press record and say who it is for and what you are charging. Yebo writes the quote. You check it and tap send." },
  { icon: "📤", title: "Send it in one tap", text: "Email it with a PDF, or send it on WhatsApp. Yebo tells you straight away that it was sent." },
  { icon: "👀", title: "See what happens next", text: "You will see when your client opens a quote, accepts it, or pays. No more wondering." },
  { icon: "💳", title: "Get paid online", text: "Clients can pay by card or instant EFT. You get an alert, and they get a receipt. You can switch this on in Settings." },
  { icon: "🎯", title: "Hit your monthly target", text: "Set a goal for money collected and quotes sent. Your dashboard shows your progress all month." },
];

export default async function Welcome() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: business } = await supabase.from("businesses").select("name").maybeSingle();
  if (!business) redirect("/app/onboarding");

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-3xl overflow-hidden rounded-[2rem] bg-white shadow-[0_24px_80px_rgba(22,45,37,0.12)] ring-1 ring-black/5">
        <div className="relative overflow-hidden bg-ink px-7 py-10 text-paper sm:px-10">
          <div className="absolute -right-16 -top-16 size-48 rounded-full bg-lime/20 blur-2xl" />
          <div className="relative">
            <div className="mb-6" role="group" aria-label={`Step ${billingEnforced() ? 4 : 3} of ${billingEnforced() ? 4 : 3}`}>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-lime">Step {billingEnforced() ? 4 : 3} of {billingEnforced() ? 4 : 3}</p>
              <div className="mt-2 flex gap-1.5" aria-hidden="true">
                {Array.from({ length: billingEnforced() ? 4 : 3 }, (_, index) => index).map((index) => (
                  <span key={index} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15">
                    <span style={{ "--d": `${index * 0.15}s` } as React.CSSProperties} className="bar-grow block h-full w-full rounded-full bg-lime" />
                  </span>
                ))}
              </div>
            </div>
            <h1 className="pop-in text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">You are all set, {business.name}.</h1>
            <p className="fade-up mt-3 max-w-xl text-sm leading-6 text-paper/70 sm:text-base" style={{ "--d": "0.15s" } as React.CSSProperties}>Here is what Yebo does for you, in plain English. Your first quote takes about three minutes.</p>
          </div>
        </div>

        <ul className="grid gap-3 px-5 py-6 sm:grid-cols-2 sm:px-8 sm:py-8">
          {features.map((feature, index) => (
            <li key={feature.title} style={{ "--d": `${0.2 + index * 0.1}s` } as React.CSSProperties} className="fade-up rounded-2xl border border-ink/10 bg-paper/50 p-4 sm:p-5">
              <span aria-hidden="true" className="grid size-10 place-items-center rounded-xl bg-white text-xl shadow-sm">{feature.icon}</span>
              <h2 className="mt-3 text-base font-extrabold text-ink">{feature.title}</h2>
              <p className="mt-1 text-sm leading-6 text-ink/65">{feature.text}</p>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-3 border-t border-ink/10 px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Link href="/app" className="rounded-xl px-3 py-3 text-center text-sm font-bold text-ink/55 transition hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange">Take me to my dashboard</Link>
          <Link href="/app/quotes/new" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-orange px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange/20 transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange focus-visible:ring-offset-2">
            Make my first quote <span aria-hidden="true" className="ml-2">→</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
