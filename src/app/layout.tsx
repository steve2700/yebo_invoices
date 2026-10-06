import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Yebo Invoices",
  description: "Quotes clients say yes to.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-neutral-100 text-neutral-900 antialiased">{children}</body>
    </html>
  );
}
