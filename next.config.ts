import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Sortie autonome : le dossier .next/standalone contient le serveur et ses
  // dependances tracees, ce qui evite de deployer node_modules en entier.
  output: "standalone",

  experimental: {
    serverActions: { bodySizeLimit: "4mb" },
  },

  poweredByHeader: false,
};

export default withNextIntl(nextConfig);
