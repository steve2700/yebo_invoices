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

export default function WhyNotAChatbot() {
  return (
    <section id="why" className="scroll-mt-24 border-t border-yebo-deep/10 bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 lg:px-12">
        <h2 className="max-w-3xl text-balance text-3xl font-extrabold leading-[1.02] tracking-[-.04em] text-yebo-deep sm:text-5xl">
          A chatbot can write the quote. Then what?
        </h2>
        <p className="mt-4 max-w-2xl text-pretty text-base leading-7 text-yebo-deep/75">
          General AI chat tools write words. After that you copy, paste, fix the formatting, send, chase, count, and wonder if anyone looked at it. Yebo does the rest of the job.
        </p>

        <div className="mt-10 overflow-hidden rounded-lg border border-yebo-deep/15">
          <table className="w-full border-collapse text-left text-sm">
            <caption className="sr-only">What a general AI chat tool does compared with Yebo</caption>
            <thead>
              <tr className="border-b border-yebo-deep/15 bg-yebo-chalk text-yebo-deep">
                <th scope="col" className="px-4 py-3 font-bold sm:px-6">What you need</th>
                <th scope="col" className="w-24 px-2 py-3 text-center font-bold sm:w-36">A chatbot</th>
                <th scope="col" className="w-24 px-2 py-3 text-center font-bold text-yebo sm:w-36">Yebo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-yebo-deep/10">
              {rows.map((row) => (
                <tr key={row.task}>
                  <th scope="row" className="px-4 py-3.5 font-semibold text-yebo-deep sm:px-6">{row.task}</th>
                  <td className="px-2 py-3.5 text-center text-yebo-deep/70">{row.chat ? "Yes" : "No"}</td>
                  <td className="px-2 py-3.5 text-center font-bold text-yebo">{row.yebo ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-yebo-deep/65">Compared with general AI chat tools used on their own, with no business connected to them.</p>

        <div className="mt-14 grid items-center gap-8 bg-yebo-deep p-7 text-white sm:p-10 md:grid-cols-[1fr_auto] md:gap-12">
          <div>
            <h3 className="text-balance text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">&ldquo;Business was busy this month&rdquo; is a feeling. Numbers you can act on are better.</h3>
            <p className="mt-4 max-w-lg text-base leading-7 text-white/80">Yebo shows how many quotes you sent, how many you won and how much you collected, every month.</p>
          </div>
          <PhoneFrame
            src="/screens/home-targets.png"
            alt="Yebo monthly targets screen with money collected, quotes sent and quotes won"
            tone="light"
            className="mx-auto w-[220px] md:mb-[-6rem] md:w-[230px]"
          />
        </div>
      </div>
    </section>
  );
}
