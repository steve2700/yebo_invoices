import Reveal from "@/components/Reveal";
import PhoneFrame from "@/components/PhoneFrame";

const rows: { task: string; chat: boolean; yebo: boolean }[] = [
  { task: "Writes the words of a quote", chat: true, yebo: true },
  { task: "Sends it to your client in one tap, by email or WhatsApp", chat: false, yebo: true },
  { task: "Tells you the moment your client opens it", chat: false, yebo: true },
  { task: "Lets your client accept it with one tap", chat: false, yebo: true },
  { task: "Lets your client pay by card or instant EFT", chat: false, yebo: true },
  { task: "Counts how many quotes you sent this month", chat: false, yebo: true },
  { task: "Shows your progress against a monthly target", chat: false, yebo: true },
  { task: "Reminds you who to follow up, and who owes you", chat: false, yebo: true },
  { task: "Remembers your logo, bank details and clients once", chat: false, yebo: true },
];

function Tick({ yes, label }: { yes: boolean; label: string }) {
  return yes ? (
    <span className="inline-flex size-7 items-center justify-center rounded-full bg-yebo text-sm font-black text-white" role="img" aria-label={`${label}: yes`}>✓</span>
  ) : (
    <span className="inline-flex size-7 items-center justify-center rounded-full bg-orange/10 text-sm font-black text-orange" role="img" aria-label={`${label}: no`}>✕</span>
  );
}

export default function WhyNotAChatbot() {
  return (
    <section id="why" className="scroll-mt-24 border-y border-yebo-deep/10 bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 lg:px-12">
        <Reveal>
          <p className="text-xs font-extrabold uppercase tracking-[.2em] text-yebo">Why not just ask a chatbot?</p>
          <h2 className="mt-4 max-w-3xl text-balance text-4xl font-extrabold leading-[.98] tracking-[-.05em] text-yebo-deep sm:text-5xl">
            A chatbot wrote your quote. Cute. <span className="text-yebo-deep/40">Now what?</span>
          </h2>
          <p className="mt-5 max-w-2xl text-pretty text-base leading-7 text-yebo-deep/65">
            General AI chat tools are clever, but they only write words. Then you are on your own: copy, paste, fix the formatting, send, chase, count, and wonder if anyone even looked at it. Yebo does the whole job.
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mt-10 overflow-hidden rounded-[1.75rem] border border-yebo-deep/10 bg-yebo-chalk/50">
            <div className="grid grid-cols-[1fr_72px_72px] items-center gap-2 border-b border-yebo-deep/10 bg-white px-4 py-4 text-center text-[10px] font-extrabold uppercase tracking-[.1em] text-yebo-deep/55 sm:grid-cols-[1fr_150px_150px] sm:px-7 sm:text-[11px]">
              <span className="text-left">What you need</span>
              <span>A chatbot</span>
              <span className="rounded-full bg-yebo py-1 text-white">Yebo</span>
            </div>
            <ul className="divide-y divide-yebo-deep/10">
              {rows.map((row) => (
                <li key={row.task} className="grid grid-cols-[1fr_72px_72px] items-center gap-2 px-4 py-3.5 text-sm font-semibold text-yebo-deep transition-colors hover:bg-white/70 sm:grid-cols-[1fr_150px_150px] sm:px-7">
                  <span>{row.task}</span>
                  <span className="text-center"><Tick yes={row.chat} label={`${row.task}, general AI chat tool`} /></span>
                  <span className="text-center"><Tick yes={row.yebo} label={`${row.task}, Yebo`} /></span>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-3 text-xs text-yebo-deep/50">Comparison is with general-purpose AI chat tools used on their own, with no business connected to them.</p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mt-12 grid items-center gap-8 overflow-hidden rounded-[2rem] bg-yebo-deep p-7 text-white sm:p-10 md:grid-cols-[1fr_auto] md:gap-12">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[.16em] text-lime">What you can&apos;t see, you can&apos;t fix</p>
              <p className="mt-4 text-balance text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
                &ldquo;Business was busy this month&rdquo; is a vibe. R18 400 collected from 12 quotes is a fact.
              </p>
              <p className="mt-4 max-w-lg text-sm leading-6 text-white/65">
                Yebo shows you how many quotes you sent, how many you won and how much you collected, every single month.
              </p>
            </div>
            <PhoneFrame
              src="/screens/home-targets.png"
              alt="Yebo monthly targets screen with money collected, quotes sent and quotes won"
              tone="light"
              className="mx-auto w-[220px] rotate-2 md:mb-[-6rem] md:w-[230px]"
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
