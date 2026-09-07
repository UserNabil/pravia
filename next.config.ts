import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sortie autonome : le dossier .next/standalone contient le serveur et ses
  // dependances tracees, ce qui evite de deployer node_modules en entier.
  output: "standalone",

  experimental: {
    serverActions: { bodySizeLimit: "4mb" },
  },

  // Derriere IIS puis Cloudflare, l'adresse du client arrive dans les en-tetes
  // de transfert : sans cette option, Next les ignore.
  poweredByHeader: false,
};

export default nextConfig;
