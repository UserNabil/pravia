import type { MetadataRoute } from "next";
import { getSeoSettings } from "@/lib/seo";

export const revalidate = 3600;

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getSeoSettings();

  return {
    name: settings["seo.defaultTitle"],
    short_name: settings["seo.siteName"],
    description: settings["seo.defaultDescription"],
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#4f46e5",
    lang: "fr-FR",
    categories: ["shopping", "business"],
    icons: [
      { src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
