// Yebo Opportunities: the public local pages. Each page is one trade in one area. A request from a page goes to the top-ranked
// businesses that opted in for that trade and area (see opp-rank.ts and submit-opportunity.ts). No invented local facts, no invented reviews.
export type Photo = { file: string; alt: string; caption: string; group: "door" | "kitchen" | "builtin" };
export type OppPage = {
  slug: string; tag: string; trade: "carpenter"; area: string; areaName: string;
  title: string; description: string; h1: string;
  feel: string; // the human line above the form
  need: string; // finishes "I need help with ..." in the WhatsApp message
  intro: string; problems: string[]; suburbs: string[];
  groups: Photo["group"][]; chips: string[]; faq: { q: string; a: string }[];
};

export const TRADES = [{ key: "carpenter", label: "Carpenter" }] as const;
export const AREAS = [
  { key: "johannesburg", label: "Johannesburg" }, { key: "midrand", label: "Midrand" }, { key: "kempton-park", label: "Kempton Park" },
  { key: "edenvale", label: "Edenvale" }, { key: "sandton", label: "Sandton" }, { key: "randburg", label: "Randburg" }, { key: "pretoria", label: "Pretoria" },
] as const;

// Real jobs. Add a photo here and drop the file in public/jobs. Captions describe only what the photo shows.
export const PHOTOS: Photo[] = [
  { file: "sliding-barn-door-white", group: "door", alt: "White sliding barn-style door with black rail hardware, newly fitted", caption: "Sliding barn-style door, fitted and running smoothly" },
  { file: "builtin-cupboard-oak-tall-1", group: "builtin", alt: "Tall built-in cupboard with oak-finish doors and black handles, floor to ceiling", caption: "Floor-to-ceiling built-in cupboard, oak finish" },
  { file: "builtin-cupboard-oak-tall-2", group: "builtin", alt: "Close view of oak-finish built-in cupboard doors with long black handles", caption: "Clean lines and straight door gaps" },
  { file: "builtin-cupboard-oak-corner", group: "builtin", alt: "Built-in oak-finish cupboard fitted into a room corner", caption: "Built to fit the corner exactly" },
  { file: "kitchen-units-oak-1", group: "kitchen", alt: "Oak-finish kitchen units with drawers, a sink and white countertop", caption: "New kitchen units, oak finish" },
  { file: "kitchen-units-oak-sink", group: "kitchen", alt: "Oak-finish wall and base kitchen units beside a tiled splashback and sink", caption: "Wall and base units fitted to the tiling" },
  { file: "kitchen-units-oak-2", group: "kitchen", alt: "Long run of oak-finish kitchen wall units over base units with drawers", caption: "A full run of wall and base units" },
  { file: "kitchen-grey-granite", group: "kitchen", alt: "Dark grey kitchen cupboards with a black granite countertop and window", caption: "Grey kitchen with a granite top" },
];
export const photosFor = (p: OppPage) => PHOTOS.filter((x) => p.groups.includes(x.group));

// Typical prices. Left empty on purpose: fill in only numbers a technician has confirmed. The page shows the section only when this has rows.
export type PriceRow = { job: string; from: number; to: number; note?: string };
export const PRICES: PriceRow[] = [];

const how = (a: string) => `Yebo connects you with up to 3 local carpenters${a}. Tell us once, with a photo if you can. They each reply with a quote and you choose.`;
const base = (areaName: string, what: string) => [
  { q: "What does it cost me to ask?", a: "Nothing. Asking for quotes is free, and you never have to accept one." },
  { q: "Who sees my details?", a: `Only the carpenters listed for ${areaName} who have chosen to get jobs like this, and only for this job.` },
  { q: "How fast will someone reply?", a: `They are alerted the moment you send it. Many reply the same day, but we cannot promise a time. For ${what}, say it is urgent.` },
  { q: "What if nobody is free?", a: "We tell you on the screen straight away. Nothing is sent and nothing is kept." },
];
const doorFaq = [
  { q: "Can a sagging or sticking door be fixed, or must it be replaced?", a: "Often it can be re-hung or adjusted. Only a carpenter looking at it, or at a photo, can tell, which is why a photo helps." },
  { q: "My door was forced open. Can it be secured today?", a: "Choose Emergency and say so. Carpenters who can attend quickly will reply first." },
];
const cupFaq = [
  { q: "Can broken cupboard doors be repaired without replacing the whole kitchen?", a: "Usually, yes. Doors, hinges and drawer runners can be replaced one at a time. A photo of the damage helps the quote." },
  { q: "Water damage on shelves or countertops. Is it fixable?", a: "It depends on how deep the swelling goes. A carpenter can tell you whether to repair or replace." },
];
const generalFaq = [
  { q: "Can I send photos?", a: "Yes, up to 3. A clear photo often means a quote without a visit." },
  { q: "Do carpenters visit before quoting?", a: "That is up to each carpenter. Many quote from photos for small jobs and visit for bigger ones." },
];
const P = (o: Omit<OppPage, "trade" | "title" | "description" | "intro"> & { title: string; description: string; intro?: string }): OppPage => ({ trade: "carpenter", intro: how(` in ${o.areaName}`), ...o });

export const PAGES: OppPage[] = [
  P({ slug: "same-day-door-repairs-johannesburg", tag: "door-jhb", area: "johannesburg", areaName: "Johannesburg", title: "Door repairs in Johannesburg: get up to 3 quotes | Yebo", description: "Stuck, sagging or broken door? Tell us once and up to 3 local carpenters in Johannesburg reply with a quote. Free to ask.", h1: "Door repairs in Johannesburg", feel: "A door that will not shut is a small thing that drives you mad. Let us sort it.", need: "a door repair in Johannesburg", groups: ["door"], chips: ["Door will not close", "Hinges or frame", "Lock or handle", "Break-in damage", "New door"], suburbs: [], problems: ["A door that sticks, drags on the floor or will not close", "Broken or loose hinges and frames", "A lock or handle that no longer fits", "A door damaged by a break-in or forced open", "Hanging a new door or replacing an old one"], faq: [...base("Johannesburg", "a door that will not lock"), ...doorFaq, ...generalFaq] }),
  P({ slug: "same-day-cupboard-repairs-johannesburg", tag: "cupboard-jhb", area: "johannesburg", areaName: "Johannesburg", title: "Cupboard and kitchen repairs in Johannesburg: up to 3 quotes | Yebo", description: "Broken cupboard doors, hinges or drawers? Tell us once and up to 3 local carpenters in Johannesburg send you a quote. Free to ask.", h1: "Cupboard and kitchen repairs in Johannesburg", feel: "Your kitchen is where life happens. A broken cupboard should not slow it down.", need: "a cupboard or kitchen repair in Johannesburg", groups: ["kitchen", "builtin"], chips: ["Cupboard doors", "Hinges or drawers", "Water damage", "Built-in cupboard", "New kitchen units"], suburbs: [], problems: ["Cupboard doors that hang crooked or have come off", "Broken hinges, runners and drawers", "Swollen or water-damaged shelves and countertops", "Loose or sagging kitchen units", "Small changes to an existing kitchen"], faq: [...base("Johannesburg", "a kitchen you cannot use"), ...cupFaq, ...generalFaq] }),
  P({ slug: "carpenter-midrand", tag: "carpenter-midrand", area: "midrand", areaName: "Midrand", title: "Carpenter in Midrand: get up to 3 quotes | Yebo", description: "Looking for a carpenter in Midrand? Tell us about the job once and up to 3 local carpenters reply with a quote. Free to ask.", h1: "Carpenter in Midrand", feel: "Find a carpenter you can trust, without the phone tag.", need: "a carpenter job in Midrand", groups: ["builtin", "kitchen", "door"], chips: ["Doors and frames", "Cupboards", "Built-in units", "Ceilings", "Something else"], suburbs: ["Halfway House", "Noordwyk", "Vorna Valley", "Kyalami", "Carlswald"], problems: ["Doors, frames and window repairs", "Cupboards, shelves and built-in units", "Ceilings and cornices", "Decks, pergolas and gates", "Small repairs around the house"], faq: [...base("Midrand", "a repair"), ...generalFaq] }),
  P({ slug: "carpenter-kempton-park", tag: "carpenter-kempton", area: "kempton-park", areaName: "Kempton Park", title: "Carpenter in Kempton Park: get up to 3 quotes | Yebo", description: "Looking for a carpenter in Kempton Park? Tell us about the job once and up to 3 local carpenters reply with a quote. Free to ask.", h1: "Carpenter in Kempton Park", feel: "Find a carpenter you can trust, without the phone tag.", need: "a carpenter job in Kempton Park", groups: ["builtin", "kitchen", "door"], chips: ["Doors and frames", "Cupboards", "Built-in units", "Ceilings", "Something else"], suburbs: ["Bonaero Park", "Edleen", "Glen Marais", "Norkem Park", "Birch Acres"], problems: ["Doors, frames and window repairs", "Cupboards, shelves and built-in units", "Ceiling and cornice repairs", "Decks, pergolas and gates", "Small repairs around the house"], faq: [...base("Kempton Park", "a repair"), ...generalFaq] }),
  P({ slug: "carpenter-edenvale", tag: "carpenter-edenvale", area: "edenvale", areaName: "Edenvale", title: "Carpenter in Edenvale: get up to 3 quotes | Yebo", description: "Looking for a carpenter in Edenvale? Tell us about the job once and up to 3 local carpenters reply with a quote. Free to ask.", h1: "Carpenter in Edenvale", feel: "Find a carpenter you can trust, without the phone tag.", need: "a carpenter job in Edenvale", groups: ["builtin", "kitchen", "door"], chips: ["Doors and frames", "Cupboards", "Built-in units", "Ceilings", "Something else"], suburbs: ["Bedfordview", "Primrose", "Modderfontein", "Greenstone", "Eastleigh"], problems: ["Doors, frames and window repairs", "Cupboards, shelves and built-in units", "Ceiling and cornice repairs", "Decks, pergolas and gates", "Small repairs around the house"], faq: [...base("Edenvale", "a repair"), ...generalFaq] }),
  P({ slug: "carpenter-sandton", tag: "carpenter-sandton", area: "sandton", areaName: "Sandton", title: "Carpenter in Sandton: get up to 3 quotes | Yebo", description: "Looking for a carpenter in Sandton? Tell us about the job once and up to 3 local carpenters reply with a quote. Free to ask.", h1: "Carpenter in Sandton", feel: "Find a carpenter you can trust, without the phone tag.", need: "a carpenter job in Sandton", groups: ["builtin", "kitchen", "door"], chips: ["Doors and frames", "Cupboards", "Built-in units", "Ceilings", "Something else"], suburbs: ["Bryanston", "Morningside", "Rivonia", "Fourways", "Sunninghill"], problems: ["Doors, frames and window repairs", "Cupboards, shelves and built-in units", "Ceiling and cornice repairs", "Decks, pergolas and gates", "Small repairs around the house"], faq: [...base("Sandton", "a repair"), ...generalFaq] }),
  P({ slug: "carpenter-randburg", tag: "carpenter-randburg", area: "randburg", areaName: "Randburg", title: "Carpenter in Randburg: get up to 3 quotes | Yebo", description: "Looking for a carpenter in Randburg? Tell us about the job once and up to 3 local carpenters reply with a quote. Free to ask.", h1: "Carpenter in Randburg", feel: "Find a carpenter you can trust, without the phone tag.", need: "a carpenter job in Randburg", groups: ["builtin", "kitchen", "door"], chips: ["Doors and frames", "Cupboards", "Built-in units", "Ceilings", "Something else"], suburbs: ["Ferndale", "Linden", "Northcliff", "Fontainebleau", "Blackheath"], problems: ["Doors, frames and window repairs", "Cupboards, shelves and built-in units", "Ceiling and cornice repairs", "Decks, pergolas and gates", "Small repairs around the house"], faq: [...base("Randburg", "a repair"), ...generalFaq] }),
  P({ slug: "emergency-carpenter-pretoria", tag: "emergency-pretoria", area: "pretoria", areaName: "Pretoria", title: "Emergency carpenter in Pretoria: get up to 3 quotes | Yebo", description: "Door forced open, storm damage or a repair that cannot wait? Up to 3 local carpenters in Pretoria are alerted. Free to ask.", h1: "Emergency carpenter in Pretoria", feel: "Something broke and it cannot wait. Tell us, and the carpenters nearby are alerted now.", need: "an urgent carpenter repair in Pretoria", groups: ["door", "builtin"], chips: ["Door forced open", "Storm damage", "Will not lock", "Water damage", "Something else"], suburbs: ["Centurion", "Brooklyn", "Waterkloof", "Menlo Park", "Moreleta Park"], problems: ["A door or frame damaged in a break-in", "Storm or water damage to doors, ceilings and cupboards", "A door that will not lock tonight", "Anything that needs securing quickly"], intro: how(" in Pretoria") + " Say clearly that it is urgent.", faq: [...base("Pretoria", "an urgent repair"), ...doorFaq, ...generalFaq] }),
];

export const pageBySlug = (slug: string) => PAGES.find((p) => p.slug === slug);
export const areaLabel = (key: string) => AREAS.find((a) => a.key === key)?.label ?? key;
