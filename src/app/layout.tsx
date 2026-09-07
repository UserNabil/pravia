import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/toast";
import { getSeoSettings, jsonLd, organizationSchema, websiteSchema } from "@/lib/seo";
import "./globals.css";

/** Les metadonnees globales sont pilotees depuis le back-office (/admin/seo). */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSeoSettings();
  const siteUrl = settings["seo.siteUrl"].replace(/\/+$/, "");
  const indexable = settings["seo.indexable"] === "1";

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: settings["seo.defaultTitle"],
      template: settings["seo.titleTemplate"],
    },
    description: settings["seo.defaultDescription"],
    applicationName: settings["seo.siteName"],
    generator: "Next.js",
    keywords: [
      "marketplace high-tech",
      "smartphone",
      "ordinateur portable",
      "reconditionne",
      "gaming",
      "composants PC",
      "audio",
    ],
    authors: [{ name: settings["seo.siteName"], url: siteUrl }],
    creator: settings["seo.siteName"],
    publisher: settings["seo.organizationLegalName"],
    referrer: "origin-when-cross-origin",
    formatDetection: { email: false, address: false, telephone: false },
    alternates: { canonical: "/" },
    robots: indexable
      ? {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        }
      : { index: false, follow: false },
    openGraph: {
      type: "website",
      locale: "fr_FR",
      url: siteUrl,
      siteName: settings["seo.siteName"],
      title: settings["seo.defaultTitle"],
      description: settings["seo.defaultDescription"],
    },
    twitter: {
      card: "summary_large_image",
      title: settings["seo.defaultTitle"],
      description: settings["seo.defaultDescription"],
      ...(settings["seo.twitterHandle"] ? { site: settings["seo.twitterHandle"] } : {}),
    },
    verification: {
      ...(settings["seo.googleVerification"]
        ? { google: settings["seo.googleVerification"] }
        : {}),
      ...(settings["seo.bingVerification"]
        ? { other: { "msvalidate.01": settings["seo.bingVerification"] } }
        : {}),
    },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#111318" },
  ],
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [organization, website] = await Promise.all([organizationSchema(), websiteSchema()]);

  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/favicon.svg" />
        {/* Identite du site et moteur de recherche interne, declares aux robots. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(organization) }}
        />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(website) }} />
      </head>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
