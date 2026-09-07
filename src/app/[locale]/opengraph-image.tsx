import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { getSeoSettings } from "@/lib/seo";
import { ogFonts, OG_FONT_FAMILY } from "@/lib/og-fonts";
import { LOCALE_DIRECTION, toLocale } from "@/i18n/routing";

export const alt = "Pravia";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Generee a la demande : le nom du site provient de la base.
export const dynamic = "force-dynamic";

export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = toLocale(rawLocale);

  const [settings, t, fonts] = await Promise.all([
    getSeoSettings(),
    getTranslations({ locale, namespace: "og" }),
    ogFonts(locale),
  ]);

  const direction = LOCALE_DIRECTION[locale];
  const badges = [t("badge1"), t("badge2"), t("badge3")];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: direction === "rtl" ? "flex-end" : "flex-start",
          textAlign: direction === "rtl" ? "right" : "left",
          padding: "0 90px",
          background: "linear-gradient(135deg, #16070a 0%, #2b0b10 55%, #6b0d13 100%)",
          color: "#f8fafc",
          fontFamily: OG_FONT_FAMILY,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: direction === "rtl" ? "row-reverse" : "row",
            alignItems: "center",
            gap: 22,
          }}
        >
          <div
            style={{
              width: 76,
              height: 76,
              borderRadius: 20,
              background: "linear-gradient(135deg, #F60A0A 0%, #FF5A3C 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 44,
              fontWeight: 800,
              color: "#fff",
            }}
          >
            P
          </div>
          <div style={{ fontSize: 46, fontWeight: 800, letterSpacing: -1 }}>
            {settings["seo.siteName"]}
          </div>
        </div>

        <div
          style={{
            marginTop: 44,
            fontSize: 66,
            fontWeight: 800,
            lineHeight: 1.15,
            maxWidth: 950,
            display: "flex",
          }}
        >
          {t("tagline")}
        </div>

        <div style={{ marginTop: 26, fontSize: 30, color: "#e4b4b4", maxWidth: 900, display: "flex" }}>
          {t("subtitle")}
        </div>

        <div
          style={{
            marginTop: 48,
            display: "flex",
            flexDirection: direction === "rtl" ? "row-reverse" : "row",
            gap: 16,
          }}
        >
          {badges.map((label) => (
            <div
              key={label}
              style={{
                padding: "12px 22px",
                borderRadius: 999,
                background: "rgba(246, 10, 10, 0.2)",
                border: "1px solid rgba(246, 10, 10, 0.5)",
                color: "#ffc9c2",
                fontSize: 24,
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
