import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Outlasting The Middleman | Direct Dental & Medical Equipment Sales",
    template: "%s | Outlasting The Middleman",
  },
  description:
    "Buy high-quality dental and medical equipment direct from manufacturers. Save on premium dental chairs, imaging systems, tools, and clinical supplies without middleman markups.",
  keywords: [
    "dental equipment sales",
    "medical equipment supplier",
    "direct dental supplies",
    "buy dental chairs",
    "clinical medical devices",
    "B2B medical marketplace",
  ],
  openGraph: {
    title: "Outlasting The Middleman | Direct Dental & Medical Equipment Sales",
    description:
      "Cut out the middleman and save on premium dental and medical equipment. High-quality clinical tools, supplies, and technology delivered direct.",
    type: "website",
    locale: "en_US",
    siteName: "Outlasting The Middleman",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
