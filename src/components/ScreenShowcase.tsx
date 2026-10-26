import PhoneFrame from "@/components/PhoneFrame";

export type Screen = { src: string; alt: string; label: string; title: string; caption: string };

export const appScreens: Screen[] = [
  {
    src: "/screens/home-dashboard.png",
    alt: "Yebo home screen: collected this month, outstanding, overdue and what needs your attention",
    label: "Home",
    title: "Your money, at a glance",
    caption: "Collected, outstanding and overdue, on one screen.",
  },
  {
    src: "/screens/quote-voice.png",
    alt: "Yebo new quote screen with a voice assistant to speak your quote",
    label: "Voice quote",
    title: "Say it. Yebo types it.",
    caption: "Say who it is for, the work and the prices. Yebo fills it in, you check it.",
  },
  {
    src: "/screens/quote-items.png",
    alt: "Yebo quote items: quantities, unit prices, VAT and the total",
    label: "Line items",
    title: "Numbers that add up",
    caption: "Quantities, prices and VAT worked out for you.",
  },
  {
    src: "/screens/home-targets.png",
    alt: "Yebo monthly targets: money to collect and quotes to send this month",
    label: "Targets",
    title: "Busy becomes progress",
    caption: "Set a number for the month and watch your progress.",
  },
  {
    src: "/screens/tenders-list.png",
    alt: "Yebo tenders screen with the tender hub, compliance vault and open tenders",
    label: "Tenders",
    title: "Tenders for your trade",
    caption: "Live tenders for your trade, with your compliance papers checked before you bid.",
  },
  {
    src: "/screens/tender-boq.png",
    alt: "Yebo tender bid: a bill of quantities read into editable line items",
    label: "BOQ pricing",
    title: "The BOQ, already read",
    caption: "Yebo reads the bill of quantities into lines. You just add your rates.",
  },
];

type Props = {
  title?: string;
  intro?: string;
  screens?: Screen[];
  tone?: "chalk" | "white";
};

export default function ScreenShowcase({
  title = "The real app, on a real phone",
  intro = "Every screen here is a screenshot from Yebo.",
  screens = appScreens,
  tone = "chalk",
}: Props) {
  return (
    <section id="screens" className={`scroll-mt-24 border-t border-yebo-deep/10 py-16 sm:py-24 ${tone === "chalk" ? "bg-yebo-chalk" : "bg-white"}`}>
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        <h2 className="max-w-2xl text-balance text-3xl font-extrabold leading-[1.02] tracking-[-.04em] text-yebo-deep sm:text-5xl">{title}</h2>
        <p className="mt-4 max-w-xl text-base leading-7 text-yebo-deep/75">{intro}</p>
      </div>

      <div className="mt-10">
        <ul
          aria-label="App screenshots"
          tabIndex={0}
          className="mx-auto flex max-w-7xl snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-6 [scrollbar-width:thin] focus-visible:outline-none sm:gap-6 sm:px-8 lg:px-12"
        >
          {screens.map((screen, index) => (
            <li key={screen.src} className="w-[72vw] max-w-[270px] shrink-0 snap-start sm:w-[250px]">
              <figure>
                <PhoneFrame src={screen.src} alt={screen.alt} tone={index % 2 ? "light" : "dark"} />
                <figcaption className="mt-4 px-1">
                  <span className="block text-lg font-extrabold tracking-tight text-yebo-deep">{screen.title}</span>
                  <span className="mt-1 block text-sm leading-6 text-yebo-deep/75">{screen.caption}</span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
