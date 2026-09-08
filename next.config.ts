import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * Domaines autorises pour next/image.
 *
 * Les visuels televerses partent sur Cloudflare R2 et sont servis par le
 * domaine public du compartiment : sans cette liste, next/image refuse une
 * adresse qui n'est pas locale. On accepte le sous-domaine r2.dev fourni par
 * Cloudflare, un sous-domaine cdn du site, et l'adresse effectivement
 * configuree au moment de la construction.
 */
function domainesImages(): NonNullable<NextConfig["images"]>["remotePatterns"] {
  const motifs: NonNullable<NextConfig["images"]>["remotePatterns"] = [
    { protocol: "https", hostname: "**.r2.dev" },
    { protocol: "https", hostname: "cdn.pravia-dz.com" },
  ];

  const publique = process.env.R2_PUBLIC_URL?.trim();
  if (publique) {
    try {
      const hote = new URL(publique).hostname;
      if (!motifs.some((m) => m.hostname === hote)) {
        motifs.push({ protocol: "https", hostname: hote });
      }
    } catch {
      // Adresse mal formee : on l'ignore plutot que de faire echouer la
      // construction pour une variable d'environnement approximative.
    }
  }

  return motifs;
}

const nextConfig: NextConfig = {
  images: { remotePatterns: domainesImages() },

  // Sortie autonome : le dossier .next/standalone contient le serveur et ses
  // dependances tracees, ce qui evite de deployer node_modules en entier.
  output: "standalone",

  experimental: {
    serverActions: { bodySizeLimit: "4mb" },
  },

  poweredByHeader: false,
};

export default withNextIntl(nextConfig);
