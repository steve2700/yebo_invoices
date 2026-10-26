import fs from "node:fs";
import path from "node:path";
import Image from "next/image";

// Real photographs of real work, read from public/photos/credits.json.
// Nothing renders until you add photos, so the page never shows an empty box or a made-up picture.
// Every entry needs a credit, because most free photo licences ask for one. See public/photos/README.md.
type Entry = { file: string; alt: string; credit: string; license?: string; source?: string };

function load(): Entry[] {
  try {
    const dir = path.join(process.cwd(), "public", "photos");
    const raw = JSON.parse(fs.readFileSync(path.join(dir, "credits.json"), "utf8")) as Entry[];
    return raw.filter((e) => e.file && e.alt && e.credit && fs.existsSync(path.join(dir, e.file)));
  } catch {
    return [];
  }
}

export default function PhotoStrip({ heading, max = 3 }: { heading: string; max?: number }) {
  const photos = load().slice(0, max);
  if (photos.length === 0) return null;
  return (
    <section className="border-t border-yebo-deep/10 bg-white py-14 sm:py-20" aria-label={heading}>
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        <h2 className="max-w-2xl text-balance text-2xl font-extrabold tracking-tight text-yebo-deep sm:text-4xl">{heading}</h2>
        <ul className={`mt-8 grid gap-6 ${photos.length === 2 ? "md:grid-cols-2" : photos.length >= 3 ? "md:grid-cols-3" : ""}`}>
          {photos.map((p) => (
            <li key={p.file}>
              <figure>
                <div className="relative aspect-[3/2] overflow-hidden bg-yebo-chalk">
                  <Image src={`/photos/${p.file}`} alt={p.alt} fill sizes="(max-width: 768px) 100vw, 400px" className="object-cover" />
                </div>
                <figcaption className="mt-2 text-xs leading-5 text-yebo-deep/65">
                  Photo: {p.credit}
                  {p.license ? `, ${p.license}` : ""}
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
