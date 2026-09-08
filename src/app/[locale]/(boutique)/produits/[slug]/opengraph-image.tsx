import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { getSeoSettings } from "@/lib/seo";
import { resolveCategory, resolveProduct, translationFilter } from "@/lib/content";
import { ogFonts, OG_FONT_FAMILY } from "@/lib/og-fonts";
import { formatPrice } from "@/lib/format";
import { LOCALE_DIRECTION, LOCALE_TAGS, toLocale } from "@/i18n/routing";

export const alt = "Pravia";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Image sociale propre a chaque produit : titre, marque et prix. */
export default async function Image({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale: rawLocale } = await params;
  const locale = toLocale(rawLocale);

  const [row, settings, t, tCondition, fonts] = await Promise.all([
    db.product.findUnique({
      where: { slug },
      select: {
        title: true,
        subtitle: true,
        description: true,
        price: true,
        compareAtPrice: true,
        condition: true,
        stock: true,
        metaTitle: true,
        metaDescription: true,
        brand: { select: { name: true } },
        category: { select: { name: true, description: true, translations: translationFilter(locale) } },
        translations: translationFilter(locale),
      },
    }),
    getSeoSettings(),
    getTranslations({ locale, namespace: "og" }),
    getTranslations({ locale, namespace: "condition" }),
    ogFonts(locale),
  ]);

  const product = row
    ? { ...resolveProduct(row), category: resolveCategory(row.category) }
    : null;

  const direction = LOCALE_DIRECTION[locale];
  const price = product ? formatPrice(product.price, LOCALE_TAGS[locale]) : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          alignItems: direction === "rtl" ? "flex-end" : "flex-start",
          textAlign: direction === "rtl" ? "right" : "left",
          padding: 72,
          background: "linear-gradient(135deg, #16070a 0%, #2b0b10 60%, #6b0d13 100%)",
          color: "#f8fafc",
          fontFamily: OG_FONT_FAMILY,
        }}
      >
        <div
          style={{
            width: "100%",
            display: "flex",
            flexDirection: direction === "rtl" ? "row-reverse" : "row",
            alignItems: "center",
            gap: 18,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "linear-gradient(135deg, #F60A0A 0%, #FF5A3C 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              fontWeight: 800,
            }}
          >
            P
          </div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{settings["seo.siteName"]}</div>
          {product && (
            <div style={{ marginInlineStart: "auto", fontSize: 26, color: "#e4b4b4" }}>
              {product.category.name}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 26, color: "#FF6B5A", fontWeight: 600, display: "flex" }}>
            {product?.brand.name ?? "Pravia"}
          </div>
          <div
            style={{
              marginTop: 12,
              fontSize: 68,
              fontWeight: 800,
              lineHeight: 1.12,
              maxWidth: 1000,
              display: "flex",
            }}
          >
            {product?.title ?? t("notFound")}
          </div>
          {product?.subtitle && (
            <div
              style={{ marginTop: 18, fontSize: 28, color: "#e4b4b4", maxWidth: 950, display: "flex" }}
            >
              {product.subtitle}
            </div>
          )}
        </div>

        {product && (
          <div
            style={{
              width: "100%",
              display: "flex",
              flexDirection: direction === "rtl" ? "row-reverse" : "row",
              alignItems: "center",
              gap: 20,
            }}
          >
            <div style={{ fontSize: 60, fontWeight: 800 }}>{price}</div>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <div
                style={{
                  padding: "10px 20px",
                  borderRadius: 999,
                  background: "rgba(255, 90, 60, 0.2)",
                  border: "1px solid rgba(255, 90, 60, 0.5)",
                  color: "#ffc9c2",
                  fontSize: 26,
                  fontWeight: 700,
                }}
              >
                {`-${Math.round((1 - product.price / product.compareAtPrice) * 100)}%`}
              </div>
            )}
            <div
              style={{
                marginInlineStart: "auto",
                display: "flex",
                flexDirection: direction === "rtl" ? "row-reverse" : "row",
                gap: 14,
                fontSize: 24,
              }}
            >
              <div
                style={{
                  padding: "10px 20px",
                  borderRadius: 999,
                  background: "rgba(246, 10, 10, 0.18)",
                  border: "1px solid rgba(246, 10, 10, 0.45)",
                  color: "#ffc9c2",
                }}
              >
                {tCondition(product.condition)}
              </div>
              <div
                style={{
                  padding: "10px 20px",
                  borderRadius: 999,
                  background:
                    product.stock > 0 ? "rgba(16, 185, 129, 0.18)" : "rgba(148, 163, 184, 0.18)",
                  border: `1px solid ${
                    product.stock > 0 ? "rgba(16, 185, 129, 0.45)" : "rgba(148, 163, 184, 0.4)"
                  }`,
                  color: product.stock > 0 ? "#6ee7b7" : "#cbd5e1",
                }}
              >
                {product.stock > 0 ? t("inStock") : t("outOfStock")}
              </div>
            </div>
          </div>
        )}
      </div>
    ),
    { ...size, fonts }
  );
}
