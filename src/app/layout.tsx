import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque } from "next/font/google";

const font = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display" });

export const metadata: Metadata = {
  title: "Yebo Invoices: quotes clients say yes to",
  description: "Professional quotes and invoices for South African small businesses. Send on WhatsApp, get a yes, get paid.",
};
export const viewport: Viewport = { themeColor: "#0C3B2E" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={font.variable}>
      <body className="bg-yebo-chalk font-sans text-yebo-deep antialiased">{children}</body>
    </html>
  );
}
