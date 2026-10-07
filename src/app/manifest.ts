import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Yebo Invoices",
    short_name: "Yebo",
    description: "Quotes and invoices for South African small businesses.",
    start_url: "/app",
    display: "standalone",
    background_color: "#F7F3EA",
    theme_color: "#0C3B2E",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/apple-icon.png", sizes: "1024x1024", type: "image/png", purpose: "any" },
    ],
  };
}

export const dynamic = "force-static";
