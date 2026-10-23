import Reveal from "@/components/Reveal";
import PhoneFrame from "@/components/PhoneFrame";

export type Screen = { src: string; alt: string; label: string; title: string; caption: string };

export const appScreens: Screen[] = [
  {
    src: "/screens/home-dashboard.png",
    alt: "Yebo home screen: collected this month, outstanding, overdue and what needs your attention",
    label: "Home",
    title: "Your money, at a glance",
    caption: "Collected, outstanding and overdue. No more doing maths on the back of a till slip.",
  },
  {
    src: "/screens/quote-voice.png",
    alt: "Yebo new quote screen with a voice assistant to speak your quote",
    label: "Voice quote",
    title: "Talk. Yebo types.",
    caption: "Say who it is for, the work and the prices. Yebo fills it in, you check it.",
  },
  {
    src: "/screens/quote-items.png",
    alt: "Yebo quote items: quantities, unit prices, VAT and the total",
    label: "Line items",
    title: "Numbers that add up",
    caption: "Quantities, prices and VAT worked out properly. Your calculator can retire.",
  },
  {
    src: "/screens/home-targets.png",
    alt: "Yebo monthly targets: money to collect and quotes to send this month",
    label: "Targets",
    title: "Busy becomes progress",
    caption: "Set a number for the month. Yebo tracks it, so \u201Cbusy\u201D finally means something.",
  },
  {
    src: "/screens/tenders-list.png",
    alt: "Yebo tenders screen with the tender hub, compliance vault and open tenders",
    label: "Tenders",
    title: "Government work, sorted",
    caption: "Live tenders for your trade, with your compliance papers checked before you bid.",
  },
  {
    src: "/screens/tender-boq.png",
    alt: "Yebo tender bid: a bill of quantities read into editable line items",
    label: "BOQ pricing",
    title: "The BOQ, already typed",
    caption: "Yebo reads the bill of quantities into lines. You just add your rates.",
  },
];

type Props = {
  eyebrow?: string;
  title?: string;
  intro?: string;
  screens?: Screen[];
  tone?: "chalk" | "white";
};

export default function ScreenShowcase({
  eyebrow = "Real screens, not a mock-up",
  title = "This is the actual app. On an actual phone.",
  intro = "Every screen below is a live screenshot from Yebo. No stock-photo laptop, no designer fantasy. What you see is what you get.",
  screens = appScreens,
  tone = "chalk",
}: Props) {
  return (
    <section id="screens" className={`scroll-mt-24 py-20 sm:py-28 ${tone === "chalk" ? "bg-yebo-chalk" : "bg-white"}`}>
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        <Reveal>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[.2em] text-yebo">{eyebrow}</p>
              <h2 className="mt-4 max-w-2xl text-balance text-4xl font-extrabold leading-[.98] tracking-[-.05em] text-yebo-deep sm:text-5xl">{title}</h2>
            </div>
            <p className="max-w-md text-pretty text-base leading-7 text-yebo-deep/65">{intro}</p>
          </div>
        </Reveal>
      </div>

      <div className="mt-12">
        <ul
          aria-label="App screenshots"
          tabIndex={0}
          className="mx-auto flex max-w-7xl snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-6 [scrollbar-width:thin] focus-visible:outline-none sm:gap-6 sm:px-8 lg:px-12"
        >
          {screens.map((screen, index) => (
            <li key={screen.src} className="w-[72vw] max-w-[270px] shrink-0 snap-start sm:w-[250px]">
              <Reveal delay={Math.min(index, 4) * 0.06}>
                <figure>
                  <PhoneFrame src={screen.src} alt={screen.alt} tone={index % 2 ? "light" : "dark"} />
                  <figcaption className="mt-5 px-1">
                    <span className="inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.14em] text-yebo">
                      <span className="font-mono text-yebo-deep/35">0{index + 1}</span>
                      {screen.label}
                    </span>
                    <span className="mt-2 block text-lg font-extrabold tracking-tight text-yebo-deep">{screen.title}</span>
                    <span className="mt-1 block text-sm leading-6 text-yebo-deep/60">{screen.caption}</span>
                  </figcaption>
                </figure>
              </Reveal>
            </li>
          ))}
        </ul>
        <p className="mx-auto mt-2 max-w-7xl px-5 text-xs font-semibold text-yebo-deep/45 sm:px-8 lg:px-12" aria-hidden="true">
          Swipe for more →
        </p>
      </div>
    </section>
  );
}
