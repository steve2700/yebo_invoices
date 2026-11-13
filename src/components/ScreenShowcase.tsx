import PhoneFrame from "@/components/PhoneFrame";

export type Screen = { src: string; alt: string; label: string; title: string; caption: string };

export const appScreens: Screen[] = [
  {
    src: "/screens/app-home.webp",
    alt: "Yebo home screen: a client said yes to a quote, with a button to make the invoice, plus new quote requests",
    label: "Home",
    title: "Know what to do next",
    caption: "A client says yes and Yebo puts the invoice one tap away.",
  },
  {
    src: "/screens/app-numbers.webp",
    alt: "Yebo home numbers: money collected this month, waiting for a yes, quotes sent and accepted, and win rate",
    label: "Your numbers",
    title: "Measure it to improve it",
    caption: "Money collected, quotes sent and accepted, and your win rate.",
  },
  {
    src: "/screens/app-opened.webp",
    alt: "Yebo quote page showing the client has opened the quote, with ways to send it again by email or WhatsApp",
    label: "Quote tracking",
    title: "See when they open it",
    caption: "Know your client has looked, then follow up at the right time.",
  },
  {
    src: "/screens/app-documents.webp",
    alt: "Yebo documents list with quotes and invoices and their status: viewed, accepted and paid",
    label: "Documents",
    title: "Quotes and invoices, one list",
    caption: "Every quote and invoice with its status, in one calm place.",
  },
  {
    src: "/screens/app-results.webp",
    alt: "Yebo quote results: quotes sent, won, lost and win rate, and why quotes are declined",
    label: "Quote results",
    title: "See what you win and lose",
    caption: "How many quotes turn into jobs, and why the others do not.",
  },
  {
    src: "/screens/app-vat.webp",
    alt: "Yebo VAT report with invoices, sales, VAT charged and a download for your accountant",
    label: "VAT report",
    title: "Ready for your accountant",
    caption: "A VAT summary for the period and a CSV your accountant can open.",
  },
  {
    src: "/screens/app-tenders.webp",
    alt: "Yebo tenders screen with the tender hub, compliance vault and open tenders",
    label: "Tenders",
    title: "Tenders for your trade",
    caption: "Live tenders for your trade, with your compliance papers checked before you bid.",
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
