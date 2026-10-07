const toRgb = (hex: string) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex ?? "");
  const n = m ? parseInt(m[1], 16) : 0x0f8a5f;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};

// White or dark text, whichever is readable on this brand colour
export function readableOn(hex: string): "#ffffff" | "#0b1f1a" {
  const { r, g, b } = toRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62 ? "#0b1f1a" : "#ffffff";
}

const h2 = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, "0");

// Browser only: finds the main colour of a logo file. Returns null for white, grey or black logos.
export async function dominantColor(file: Blob): Promise<string | null> {
  try {
    const url = URL.createObjectURL(file);
    const img = await new Promise<HTMLImageElement>((ok, fail) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = fail;
      i.src = url;
    });
    URL.revokeObjectURL(url);
    const S = 48;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = S;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, S, S);
    const px = ctx.getImageData(0, 0, S, S).data;
    const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
    for (let i = 0; i < px.length; i += 4) {
      const [r, g, b, a] = [px[i], px[i + 1], px[i + 2], px[i + 3]];
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      if (a < 200 || max < 40 || min > 225 || (max - min) / max < 0.28) continue; // skip transparent, black, white, grey
      const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
      const e = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
      e.n++; e.r += r; e.g += g; e.b += b;
      buckets.set(key, e);
    }
    let best: { n: number; r: number; g: number; b: number } | null = null;
    for (const e of buckets.values()) if (!best || e.n > best.n) best = e;
    if (!best) return null;
    let [r, g, b] = [best.r / best.n, best.g / best.n, best.b / best.n];
    if ((0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.7) { r *= 0.75; g *= 0.75; b *= 0.75; } // keep light colours visible on white
    return `#${h2(r)}${h2(g)}${h2(b)}`;
  } catch {
    return null;
  }
}
