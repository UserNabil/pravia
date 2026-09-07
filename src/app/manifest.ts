import type { MetadataRoute } from "next";
import { getSeoSettings } from "@/lib/seo";
import { routing, LOCALE_TAGS } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getSeoSettings();

  return {
    name: settings["seo.defaultTitle"],
    short_name: settings["seo.siteName"],
    description: settings["seo.defaultDescription"],
    // Le manifeste est unique : il pointe sur la langue par defaut.
    start_url: `/${routing.defaultLocale}`,
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#F60A0A",
    lang: LOCALE_TAGS[routing.defaultLocale],
    categories: ["shopping", "business"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
