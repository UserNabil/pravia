import { ImageResponse } from "next/og";
import { getSeoSettings } from "@/lib/seo";

export const alt = "Pravia - La marketplace du materiel technologique";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Generee a la demande : le nom du site provient de la base.
export const dynamic = "force-dynamic";

export default async function Image() {
  const settings = await getSeoSettings();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 90px",
          background: "linear-gradient(135deg, #0d1117 0%, #161b2e 55%, #1e2a5a 100%)",
          color: "#f8fafc",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <div
            style={{
              width: 76,
              height: 76,
              borderRadius: 20,
              background: "linear-gradient(135deg, #6366f1 0%, #22d3ee 100%)",
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
            lineHeight: 1.1,
            letterSpacing: -2,
            maxWidth: 950,
          }}
        >
          La marketplace du materiel technologique
        </div>

        <div style={{ marginTop: 26, fontSize: 30, color: "#94a3b8", maxWidth: 900 }}>
          Smartphones, ordinateurs, audio, gaming et composants — neufs ou reconditionnes.
        </div>

        <div style={{ marginTop: 48, display: "flex", gap: 16 }}>
          {["Garantie 24 mois", "Livraison offerte des 150 EUR", "Retours 30 jours"].map(
            (label) => (
              <div
                key={label}
                style={{
                  padding: "12px 22px",
                  borderRadius: 999,
                  background: "rgba(99, 102, 241, 0.18)",
                  border: "1px solid rgba(99, 102, 241, 0.45)",
                  color: "#c7d2fe",
                  fontSize: 24,
                }}
              >
                {label}
              </div>
            )
          )}
        </div>
      </div>
    ),
    size
  );
}
