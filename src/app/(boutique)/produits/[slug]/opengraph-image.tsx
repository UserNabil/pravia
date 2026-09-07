import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { getSeoSettings } from "@/lib/seo";
import { CONDITION_LABELS } from "@/lib/constants";

export const alt = "Fiche produit Pravia";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Image sociale propre a chaque produit : titre, marque et prix. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const [product, settings] = await Promise.all([
    db.product.findUnique({
      where: { slug },
      select: {
        title: true,
        subtitle: true,
        price: true,
        compareAtPrice: true,
        condition: true,
        stock: true,
        brand: { select: { name: true } },
        category: { select: { name: true } },
      },
    }),
    getSeoSettings(),
  ]);

  const price = product
    ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
        product.price / 100
      )
    : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(135deg, #0d1117 0%, #161b2e 60%, #1e2a5a 100%)",
          color: "#f8fafc",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "linear-gradient(135deg, #6366f1 0%, #22d3ee 100%)",
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
            <div style={{ marginLeft: "auto", fontSize: 26, color: "#94a3b8" }}>
              {product.category.name}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 26, color: "#818cf8", fontWeight: 600 }}>
            {product?.brand.name ?? "Pravia"}
          </div>
          <div
            style={{
              marginTop: 12,
              fontSize: 68,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -2,
              maxWidth: 1000,
            }}
          >
            {product?.title ?? "Produit introuvable"}
          </div>
          {product?.subtitle && (
            <div style={{ marginTop: 18, fontSize: 28, color: "#94a3b8", maxWidth: 950 }}>
              {product.subtitle}
            </div>
          )}
        </div>

        {product && (
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ fontSize: 60, fontWeight: 800, letterSpacing: -2 }}>{price}</div>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <div
                style={{
                  padding: "10px 20px",
                  borderRadius: 999,
                  background: "rgba(244, 63, 94, 0.18)",
                  border: "1px solid rgba(244, 63, 94, 0.45)",
                  color: "#fda4af",
                  fontSize: 26,
                  fontWeight: 700,
                }}
              >
                {`-${Math.round((1 - product.price / product.compareAtPrice) * 100)} %`}
              </div>
            )}
            <div
              style={{
                marginLeft: "auto",
                display: "flex",
                gap: 14,
                fontSize: 24,
                color: "#c7d2fe",
              }}
            >
              <div
                style={{
                  padding: "10px 20px",
                  borderRadius: 999,
                  background: "rgba(99, 102, 241, 0.18)",
                  border: "1px solid rgba(99, 102, 241, 0.45)",
                }}
              >
                {CONDITION_LABELS[product.condition] ?? "Neuf"}
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
                {product.stock > 0 ? "En stock" : "Rupture"}
              </div>
            </div>
          </div>
        )}
      </div>
    ),
    size
  );
}
