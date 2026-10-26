const items = [
  {
    title: "The voice note price",
    problem: "“Eish, it’s about R8 000, maybe R9, depends.” Your client heard “maybe” and phoned someone else.",
    fix: "Speak it into Yebo. It comes out as an itemised quote with real numbers.",
  },
  {
    title: "The Word document from years ago",
    problem: "A stretched logo, three fonts and a table that breaks when you edit it.",
    fix: "Your logo and colours on a page that looks like you mean business.",
  },
  {
    title: "The “did you get it?” message",
    problem: "Sent on Monday. Blue ticks on Tuesday. Nothing since.",
    fix: "See when your client opens it, then follow up in one tap.",
  },
  {
    title: "Remembering who owes you",
    problem: "R12 000 is sitting in your head, and none of it is in your bank account.",
    fix: "Outstanding and overdue money on your home screen every morning.",
  },
];

export default function OldWaySection() {
  return (
    <section id="old-way" className="scroll-mt-24 bg-yebo-deep py-16 text-white sm:py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        <h2 className="max-w-3xl text-balance text-3xl font-extrabold leading-[1.02] tracking-[-.04em] sm:text-5xl">Four ways quotes go wrong</h2>
        <p className="mt-4 max-w-xl text-base leading-7 text-white/80">You will recognise at least two.</p>
        <ul className="mt-10 grid gap-x-12 gap-y-10 md:grid-cols-2">
          {items.map((item) => (
            <li key={item.title} className="border-t border-white/25 pt-5">
              <h3 className="text-xl font-bold">{item.title}</h3>
              <p className="mt-2 text-base leading-7 text-white/85">{item.problem}</p>
              <p className="mt-3 text-base leading-7 text-yebo-sun"><span className="font-bold">With Yebo: </span>{item.fix}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
