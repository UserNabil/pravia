/**
 * Point d'entree du serveur Pravia sous IIS.
 *
 * Next produit .next/standalone/server.js, qui ne lit aucun fichier .env au
 * demarrage. Ce lanceur charge .env.production, place a cote de lui, avant de
 * ceder la main : les secrets tiennent ainsi dans un seul fichier que l'on
 * protege par ACL, plutot que d'etre ecrits en clair dans web.config.
 */
const fs = require("node:fs");
const path = require("node:path");

const envFile = path.join(__dirname, ".env.production");

if (fs.existsSync(envFile)) {
  if (typeof process.loadEnvFile === "function") {
    process.loadEnvFile(envFile);
  } else {
    // Repli pour Node < 20.6 : analyse minimale du fichier.
    for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!match) continue;
      const value = match[2].replace(/^["'](.*)["']$/, "$1");
      if (process.env[match[1]] === undefined) process.env[match[1]] = value;
    }
  }
} else {
  console.warn(`[pravia] ${envFile} introuvable : variables d'environnement du systeme utilisees.`);
}

for (const key of ["DATABASE_URL", "AUTH_SECRET"]) {
  if (!process.env[key]) {
    console.error(`[pravia] Variable obligatoire manquante : ${key}`);
    process.exit(1);
  }
}

console.log(
  `[pravia] demarrage — fournisseur=${process.env.DATABASE_PROVIDER ?? "sqlite"} port=${process.env.PORT ?? 3000}`
);

require("./server.js");
