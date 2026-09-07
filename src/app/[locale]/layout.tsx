import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/toast";
import { routing, LOCALE_DIRECTION, LOCALE_TAGS, type Locale, toLocale } from "@/i18n/routing";
import { getSeoSettings, jsonLd, organizationSchema, websiteSchema, localeAlternates } from "@/lib/seo";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/** Metadonnees globales, traduites et pilotees depuis le back-office. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = toLocale(rawLocale);
  if (!hasLocale(routing.locales, locale)) return {};

  const [settings, t] = await Promise.all([
    getSeoSettings(),
    getTranslations({ locale, namespace: "meta" }),
  ]);

  const siteUrl = settings["seo.siteUrl"].replace(/\/+$/, "");
  const indexable = settings["seo.indexable"] === "1";

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: t("defaultTitle"),
      template: settings["seo.titleTemplate"],
    },
    description: t("defaultDescription"),
    applicationName: settings["seo.siteName"],
    keywords: t("keywords").split(","),
    authors: [{ name: settings["seo.siteName"], url: siteUrl }],
    creator: settings["seo.siteName"],
    publisher: settings["seo.organizationLegalName"],
    referrer: "origin-when-cross-origin",
    formatDetection: { email: false, address: false, telephone: false },
    alternates: localeAlternates(siteUrl, "/", locale as Locale),
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
      locale: LOCALE_TAGS[locale as Locale].replace("-", "_"),
      url: `${siteUrl}/${locale}`,
      siteName: settings["seo.siteName"],
      title: t("defaultTitle"),
      description: t("defaultDescription"),
    },
    twitter: {
      card: "summary_large_image",
      title: t("defaultTitle"),
      description: t("defaultDescription"),
      ...(settings["seo.twitterHandle"] ? { site: settings["seo.twitterHandle"] } : {}),
    },
    verification: {
      ...(settings["seo.googleVerification"] ? { google: settings["seo.googleVerification"] } : {}),
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

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = toLocale(rawLocale);
  if (!hasLocale(routing.locales, locale)) notFound();

  // Permet le rendu statique des segments qui n'ont pas besoin de la requete.
  setRequestLocale(locale);

  const [organization, website] = await Promise.all([organizationSchema(), websiteSchema(locale)]);
  const direction = LOCALE_DIRECTION[locale];

  return (
    <html lang={locale} dir={direction} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* Noto Sans Arabic couvre l'arabe, qu'Inter ne dessine pas. */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+Arabic:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png" />
        <link rel="icon" href="/icon.png" sizes="512x512" type="image/png" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(organization) }}
        />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(website) }} />
      </head>
      <body>
        <NextIntlClientProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <ToastProvider>{children}</ToastProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
