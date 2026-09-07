/**
 * Assemble le paquet de deploiement IIS dans dist-iis/.
 *
 * Next place le serveur autonome dans .next/standalone, mais n'y copie ni les
 * fichiers statiques ni public/ : c'est l'oubli classique qui donne un site
 * sans styles ni images. Ce script fait l'assemblage complet et verifie que
 * rien ne manque.
 *
 * Usage : npm run package:iis   (apres npm run build)
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const STANDALONE = path.join(ROOT, ".next", "standalone");
const OUT = path.join(ROOT, "dist-iis");

/**
 * Copie recursive. Next cree des liens symboliques dans le dossier autonome ;
 * dereference les suit pour produire un paquet autoportant, deplacable tel quel.
 */
function copyDir(from, to) {
  fs.cpSync(from, to, { recursive: true, dereference: true, force: true });
}

function sizeOf(dir) {
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    total += entry.isDirectory() ? sizeOf(full) : fs.statSync(full).size;
  }
  return total;
}

if (!fs.existsSync(STANDALONE)) {
  console.error("Sortie autonome introuvable. Lancez d'abord : npm run build");
  process.exit(1);
}

console.log("Assemblage du paquet IIS...");
fs.rmSync(OUT, { recursive: true, force: true });

// 1. Serveur autonome et dependances tracees par Next.
copyDir(STANDALONE, OUT);

// 2. Fichiers statiques : Next les laisse volontairement de cote.
copyDir(path.join(ROOT, ".next", "static"), path.join(OUT, ".next", "static"));

// 3. Ressources publiques (visuels produits, favicon).
copyDir(path.join(ROOT, "public"), path.join(OUT, "public"));

// 4. Configuration IIS et lanceur.
fs.copyFileSync(path.join(ROOT, "deploy", "web.config"), path.join(OUT, "web.config"));
fs.copyFileSync(
  path.join(ROOT, "deploy", "pravia-server.cjs"),
  path.join(OUT, "pravia-server.cjs")
);

// 5. Modele de configuration : jamais de secret dans le paquet.
fs.copyFileSync(
  path.join(ROOT, "deploy", "env.production.example"),
  path.join(OUT, ".env.production.example")
);

// 6. Script de donnees, s'il a ete genere.
const dataScript = path.join(ROOT, "dist-sql", "pravia-data.sql");
if (fs.existsSync(dataScript)) {
  fs.mkdirSync(path.join(OUT, "sql"), { recursive: true });
  fs.copyFileSync(dataScript, path.join(OUT, "sql", "pravia-data.sql"));
}
const schemaScript = path.join(ROOT, "dist-sql", "pravia-schema.sql");
if (fs.existsSync(schemaScript)) {
  fs.mkdirSync(path.join(OUT, "sql"), { recursive: true });
  fs.copyFileSync(schemaScript, path.join(OUT, "sql", "pravia-schema.sql"));
}

// 7. Dossier de journaux attendu par HttpPlatformHandler.
fs.mkdirSync(path.join(OUT, "logs"), { recursive: true });

/* ------------------------------------------------------------ verifications */

const required = [
  "server.js",
  "pravia-server.cjs",
  "web.config",
  "package.json",
  ".next/static",
  "public/favicon.svg",
  "node_modules/next",
];

const missing = required.filter((entry) => !fs.existsSync(path.join(OUT, entry)));
if (missing.length) {
  console.error("Paquet incomplet, elements manquants :");
  for (const entry of missing) console.error(`  ${entry}`);
  process.exit(1);
}

// L'adaptateur SQL Server doit etre present, sinon l'application ne demarrera
// pas en production : Next ne le trace pas toujours seul.
const adapter = path.join(OUT, "node_modules", "@prisma", "adapter-mssql");
if (!fs.existsSync(adapter)) {
  console.log("Adaptateur SQL Server absent du tracage, copie manuelle...");
  for (const dep of ["@prisma/adapter-mssql", "mssql", "tedious"]) {
    const from = path.join(ROOT, "node_modules", dep);
    if (fs.existsSync(from)) copyDir(from, path.join(OUT, "node_modules", dep));
  }
}

const mb = (sizeOf(OUT) / 1024 / 1024).toFixed(1);
console.log(`\nPaquet pret : dist-iis (${mb} Mo)`);
console.log("A faire sur le serveur :");
console.log("  1. copier dist-iis vers C:\\inetpub\\pravia");
console.log("  2. renommer .env.production.example en .env.production et le completer");
console.log("  3. pointer le site IIS sur ce dossier");
