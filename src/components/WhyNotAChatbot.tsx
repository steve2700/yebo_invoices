import Reveal from "@/components/Reveal";

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
    <span className="inline-flex size-7 items-center justify-center rounded-full bg-yebo-deep/8 text-sm font-black text-yebo-deep/35" role="img" aria-label={`${label}: no`}>–</span>
  );
}

export default function WhyNotAChatbot() {
  return (
    <section id="why" className="scroll-mt-24 border-y border-yebo-deep/10 bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-5 sm:px-8 lg:px-12">
        <Reveal>
          <p className="text-xs font-extrabold uppercase tracking-[.2em] text-yebo">Why not just ask a chatbot?</p>
          <h2 className="mt-4 max-w-3xl text-4xl font-extrabold leading-[.98] tracking-[-.06em] text-yebo-deep sm:text-5xl">
            A chatbot can write a quote. It cannot run your quoting.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-7 text-yebo-deep/65">
            General AI chat tools are clever, but they only write words. Once the words are written, you are on your own: copying, sending, chasing, counting, and wondering whether anyone has even looked at it. Yebo does the whole job.
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mt-10 overflow-hidden rounded-3xl border border-yebo-deep/10 bg-yebo-chalk/60">
            <div className="grid grid-cols-[1fr_88px_88px] items-center gap-2 border-b border-yebo-deep/10 bg-white px-4 py-3 text-center text-[11px] font-extrabold uppercase tracking-[.1em] text-yebo-deep/55 sm:grid-cols-[1fr_130px_130px] sm:px-6">
              <span className="text-left">What you need</span>
              <span>A general AI chat tool</span>
              <span className="text-yebo">Yebo</span>
            </div>
            <ul className="divide-y divide-yebo-deep/10">
              {rows.map((row) => (
                <li key={row.task} className="grid grid-cols-[1fr_88px_88px] items-center gap-2 px-4 py-3.5 text-sm font-semibold text-yebo-deep sm:grid-cols-[1fr_130px_130px] sm:px-6">
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
          <p className="mt-10 max-w-2xl rounded-2xl bg-yebo-deep p-6 text-lg font-bold leading-8 text-white sm:p-8 sm:text-xl">
            What you cannot see, you cannot improve. Yebo shows you how many quotes you sent, how many were won and how much you collected, every month.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
