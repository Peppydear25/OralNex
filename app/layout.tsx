import type { Metadata } from "next";
import { headers } from "next/headers";
import localFont from "next/font/local";
import { CatalogProvider } from "./data/catalog-store";
import { getPublicCatalog } from "./data/server-catalog";
import { BuyerAccountProvider } from "./data/buyer-account-store";
import { CartProvider } from "./data/cart-store";
import { BUSINESS_ADDRESS } from "../lib/business";
import { ConnectivityStatus } from "./components/connectivity-status";
import { StorefrontUnavailable } from "./components/storefront-unavailable";
import { isStandaloneRoute } from "../lib/routing/standalone-routes";
import "./globals.css";

const inter = localFont({
  src: "../public/inter-variable.ttf",
  weight: "100 900",
  display: "swap",
  variable: "--font-inter",
});

const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";
const siteName = "OralNex";
const siteDescription =
  "Shop dental and medical supplies, including nitrile examination gloves and disposable surgical face masks, with clear specifications and secure checkout.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Dental & Medical Supplies | OralNex",
    template: "%s | OralNex",
  },
  description: siteDescription,
  alternates: { canonical: "/" },
  applicationName: siteName,
  category: "Dental and medical supplies",
  creator: siteName,
  publisher: siteName,
  icons: {
    icon: [{ url: "/logo.jpg?v=oralnex", type: "image/jpeg" }],
    apple: [{ url: "/logo.jpg?v=oralnex", type: "image/jpeg" }],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title: "Dental & Medical Supplies | OralNex",
    description: siteDescription,
    url: siteUrl,
    type: "website",
    locale: "en_US",
    siteName,
    images: [{ url: "/logo.jpg", alt: "OralNex" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Dental & Medical Supplies | OralNex",
    description: siteDescription,
    images: ["/logo.jpg"],
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const requestHeaders = await headers();
  const nonce = requestHeaders.get("x-nonce") ?? undefined;
  const pathname = requestHeaders.get("x-oralnex-pathname") ?? "";
  const standalone = isStandaloneRoute(pathname);
  const adminRoute = pathname === "/admin";
  const homeRoute = pathname === "/";
  const initialCatalog = standalone || adminRoute || homeRoute ? null : await getPublicCatalog();
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteUrl}/#organization`,
    name: siteName,
    url: siteUrl,
    logo: `${siteUrl}/logo.jpg`,
    description: siteDescription,
    address: {
      "@type": "PostalAddress",
      streetAddress: BUSINESS_ADDRESS.street,
      addressLocality: "San Angelo",
      addressRegion: "TX",
      postalCode: "76901",
      addressCountry: "US",
    },
  };
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    url: siteUrl,
    name: siteName,
    description: siteDescription,
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  if (!standalone && !adminRoute && !homeRoute && !initialCatalog) {
    return (
      <html lang="en" className={inter.variable}>
        <body>
          <StorefrontUnavailable />
        </body>
      </html>
    );
  }

  return (
    <html lang="en" className={inter.variable} data-scroll-behavior="smooth">
      <body>
        <script
          nonce={nonce}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([organizationSchema, websiteSchema]).replace(/</g, "\\u003c"),
          }}
        />
        {standalone ? (
          children
        ) : adminRoute ? (
          <CatalogProvider>{children}</CatalogProvider>
        ) : (
          <CatalogProvider initialCatalog={initialCatalog ?? undefined}>
            <BuyerAccountProvider>
              <CartProvider>
                {children}
                <ConnectivityStatus />
              </CartProvider>
            </BuyerAccountProvider>
          </CatalogProvider>
        )}
      </body>
    </html>
  );
}
