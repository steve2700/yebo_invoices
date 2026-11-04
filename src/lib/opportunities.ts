// Yebo Opportunities v0: the public local pages. Each page is one trade in one area. Requests from a page go to up to 3
// businesses that opted in for that trade and area (see submit-opportunity.ts). Keep the copy honest: no invented local facts.
export type OppPage = {
  slug: string;
  tag: string; // goes into the request source as "yebo-<tag>" (max 30 characters in total)
  trade: "carpenter";
  area: string; // key matched against a business's chosen areas
  areaName: string;
  title: string; // browser and Google title
  description: string;
  h1: string;
  intro: string;
  problems: string[];
  suburbs: string[];
  faq: { q: string; a: string }[];
};

export const TRADES = [{ key: "carpenter", label: "Carpenter" }] as const;

export const AREAS = [
  { key: "johannesburg", label: "Johannesburg" },
  { key: "midrand", label: "Midrand" },
  { key: "kempton-park", label: "Kempton Park" },
  { key: "edenvale", label: "Edenvale" },
  { key: "sandton", label: "Sandton" },
  { key: "randburg", label: "Randburg" },
  { key: "pretoria", label: "Pretoria" },
] as const;

const how = (a: string) => `Yebo connects you with up to 3 local carpenters${a}. You tell us about the job once, with photos if you can. They each reply with a quote. You pick the one you like.`;

const faq = (areaName: string, what: string) => [
  { q: "What does it cost me?", a: "Nothing. Asking for quotes is free and you do not have to accept any of them." },
  { q: "Who gets my details?", a: `Up to 3 carpenters who work in ${areaName} and have chosen to receive jobs like this. Your details go only to them, and only for this job.` },
  { q: "How fast will I hear back?", a: `Carpenters on Yebo are alerted as soon as you send the request. Most reply the same day, but we cannot promise a time. For ${what}, say if it is urgent.` },
  { q: "What if nobody is available?", a: "We will tell you straight away on the screen. Nothing is sent and nothing is kept." },
];

export const PAGES: OppPage[] = [
  {
    slug: "same-day-door-repairs-johannesburg", tag: "door-jhb", trade: "carpenter", area: "johannesburg", areaName: "Johannesburg",
    title: "Door repairs in Johannesburg: get up to 3 quotes | Yebo",
    description: "Stuck, sagging or broken door? Tell us once and up to 3 local carpenters in Johannesburg reply with a quote. Free to ask.",
    h1: "Door repairs in Johannesburg",
    intro: how(" in Johannesburg"),
    problems: ["A door that sticks, drags on the floor or will not close", "Broken or loose hinges and frames", "A lock or handle that no longer fits", "A door damaged by a break-in or forced open", "Hanging a new door or replacing an old one"],
    suburbs: [],
    faq: faq("Johannesburg", "a door that will not lock"),
  },
  {
    slug: "same-day-cupboard-repairs-johannesburg", tag: "cupboard-jhb", trade: "carpenter", area: "johannesburg", areaName: "Johannesburg",
    title: "Cupboard and kitchen repairs in Johannesburg: up to 3 quotes | Yebo",
    description: "Broken cupboard doors, hinges or drawers? Tell us once and up to 3 local carpenters in Johannesburg send you a quote. Free to ask.",
    h1: "Cupboard and kitchen repairs in Johannesburg",
    intro: how(" in Johannesburg"),
    problems: ["Cupboard doors that hang crooked or have come off", "Broken hinges, runners and drawers", "Swollen or water-damaged shelves and countertops", "Loose or sagging kitchen units", "Small changes to an existing kitchen"],
    suburbs: [],
    faq: faq("Johannesburg", "a kitchen you cannot use"),
  },
  {
    slug: "carpenter-midrand", tag: "carpenter-midrand", trade: "carpenter", area: "midrand", areaName: "Midrand",
    title: "Carpenter in Midrand: get up to 3 quotes | Yebo",
    description: "Looking for a carpenter in Midrand? Tell us about the job once and up to 3 local carpenters reply with a quote. Free to ask.",
    h1: "Carpenter in Midrand",
    intro: how(" in Midrand"),
    problems: ["Doors, frames and window repairs", "Cupboards, shelves and built-in units", "Ceilings and cornices", "Decks, pergolas and gates", "Small repairs around the house"],
    suburbs: ["Halfway House", "Noordwyk", "Vorna Valley", "Kyalami", "Carlswald"],
    faq: faq("Midrand", "a repair"),
  },
  {
    slug: "carpenter-kempton-park", tag: "carpenter-kempton", trade: "carpenter", area: "kempton-park", areaName: "Kempton Park",
    title: "Carpenter in Kempton Park: get up to 3 quotes | Yebo",
    description: "Looking for a carpenter in Kempton Park? Tell us about the job once and up to 3 local carpenters reply with a quote. Free to ask.",
    h1: "Carpenter in Kempton Park",
    intro: how(" in Kempton Park"),
    problems: ["Doors, frames and window repairs", "Cupboards, shelves and built-in units", "Ceiling and cornice repairs", "Decks, pergolas and gates", "Small repairs around the house"],
    suburbs: ["Bonaero Park", "Edleen", "Glen Marais", "Norkem Park", "Birch Acres"],
    faq: faq("Kempton Park", "a repair"),
  },
  {
    slug: "carpenter-edenvale", tag: "carpenter-edenvale", trade: "carpenter", area: "edenvale", areaName: "Edenvale",
    title: "Carpenter in Edenvale: get up to 3 quotes | Yebo",
    description: "Looking for a carpenter in Edenvale? Tell us about the job once and up to 3 local carpenters reply with a quote. Free to ask.",
    h1: "Carpenter in Edenvale",
    intro: how(" in Edenvale"),
    problems: ["Doors, frames and window repairs", "Cupboards, shelves and built-in units", "Ceiling and cornice repairs", "Decks, pergolas and gates", "Small repairs around the house"],
    suburbs: ["Bedfordview", "Primrose", "Modderfontein", "Greenstone", "Eastleigh"],
    faq: faq("Edenvale", "a repair"),
  },
  {
    slug: "carpenter-sandton", tag: "carpenter-sandton", trade: "carpenter", area: "sandton", areaName: "Sandton",
    title: "Carpenter in Sandton: get up to 3 quotes | Yebo",
    description: "Looking for a carpenter in Sandton? Tell us about the job once and up to 3 local carpenters reply with a quote. Free to ask.",
    h1: "Carpenter in Sandton",
    intro: how(" in Sandton"),
    problems: ["Doors, frames and window repairs", "Cupboards, shelves and built-in units", "Ceiling and cornice repairs", "Decks, pergolas and gates", "Small repairs around the house"],
    suburbs: ["Bryanston", "Morningside", "Rivonia", "Fourways", "Sunninghill"],
    faq: faq("Sandton", "a repair"),
  },
  {
    slug: "carpenter-randburg", tag: "carpenter-randburg", trade: "carpenter", area: "randburg", areaName: "Randburg",
    title: "Carpenter in Randburg: get up to 3 quotes | Yebo",
    description: "Looking for a carpenter in Randburg? Tell us about the job once and up to 3 local carpenters reply with a quote. Free to ask.",
    h1: "Carpenter in Randburg",
    intro: how(" in Randburg"),
    problems: ["Doors, frames and window repairs", "Cupboards, shelves and built-in units", "Ceiling and cornice repairs", "Decks, pergolas and gates", "Small repairs around the house"],
    suburbs: ["Ferndale", "Linden", "Northcliff", "Fontainebleau", "Blackheath"],
    faq: faq("Randburg", "a repair"),
  },
  {
    slug: "emergency-carpenter-pretoria", tag: "emergency-pretoria", trade: "carpenter", area: "pretoria", areaName: "Pretoria",
    title: "Emergency carpenter in Pretoria: get up to 3 quotes | Yebo",
    description: "Door forced open, storm damage or a repair that cannot wait? Up to 3 local carpenters in Pretoria are alerted. Free to ask.",
    h1: "Emergency carpenter in Pretoria",
    intro: how(" in Pretoria") + " Say clearly that it is urgent.",
    problems: ["A door or frame damaged in a break-in", "Storm or water damage to doors, ceilings and cupboards", "A door that will not lock tonight", "Anything that needs securing quickly"],
    suburbs: ["Centurion", "Brooklyn", "Waterkloof", "Menlo Park", "Moreleta Park"],
    faq: faq("Pretoria", "an urgent repair"),
  },
];

export const pageBySlug = (slug: string) => PAGES.find((p) => p.slug === slug);
export const areaLabel = (key: string) => AREAS.find((a) => a.key === key)?.label ?? key;
