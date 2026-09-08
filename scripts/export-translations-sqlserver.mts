/**
 * Exporte les seules traductions de contenu vers un script T-SQL.
 *
 * Le script complet de donnees purge toutes les tables : il ne convient qu'a
 * une premiere installation. Celui-ci ne touche qu'aux quatre tables de
 * traduction, ce qui permet de rafraichir les textes traduits d'une base
 * deja en service sans perdre commandes, comptes ni avis.
 *
 * Usage : npx tsx scripts/export-translations-sqlserver.mts [sortie.sql]
 */
import fs from "node:fs";
import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client.js";

for (const file of [".env.local", ".env"]) {
  if (fs.existsSync(file)) process.loadEnvFile(file);
}

const OUTPUT = process.argv[2] ?? path.join("dist-sql", "pravia-translations.sql");

const db = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./prisma/dev.db" }),
});

const TABLES = [
  { name: "ProductTranslation", read: () => db.productTranslation.findMany() },
  { name: "ProductSpecTranslation", read: () => db.productSpecTranslation.findMany() },
  { name: "CategoryTranslation", read: () => db.categoryTranslation.findMany() },
  { name: "SeoPageTranslation", read: () => db.seoPageTranslation.findMany() },
];

/** Litteral T-SQL pour une valeur JavaScript. */
function literal(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "1" : "0";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (value instanceof Date) return `'${value.toISOString().replace("T", " ").replace("Z", "")}'`;
  // N'...' impose l'Unicode, indispensable pour l'arabe ; les apostrophes se doublent.
  return `N'${String(value).replace(/'/g, "''")}'`;
}

const BATCH = 500;

const parts = [
  "-- Traductions de contenu Pravia",
  `-- Genere le ${new Date().toISOString()}`,
  "-- Application : sqlcmd -S SERVEUR -d Pravia -i pravia-translations.sql",
  "--",
  "-- Ne remplace que les traductions. Produits, commandes, comptes et avis",
  "-- ne sont pas touches. Relancable a volonte.",
  "",
  "SET NOCOUNT ON;",
  "SET XACT_ABORT ON;",
  "BEGIN TRANSACTION;",
  "",
];

const counts: Record<string, number> = {};

for (const table of TABLES) {
  const rows = (await table.read()) as Record<string, unknown>[];
  counts[table.name] = rows.length;

  parts.push(`-- ${table.name} (${rows.length})`);
  parts.push(`DELETE FROM [dbo].[${table.name}];`);

  if (rows.length) {
    const columns = Object.keys(rows[0]);
    const quoted = columns.map((c) => `[${c}]`).join(", ");

    for (let i = 0; i < rows.length; i += BATCH) {
      const chunk = rows.slice(i, i + BATCH);
      const values = chunk
        .map((row) => `  (${columns.map((c) => literal(row[c])).join(", ")})`)
        .join(",\n");
      parts.push(`INSERT INTO [dbo].[${table.name}] (${quoted}) VALUES\n${values};`);
    }
  }
  parts.push("");
}

parts.push("COMMIT TRANSACTION;", "GO", "");

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
// Marque d'ordre des octets : sans elle, sqlcmd lit le fichier comme de l'ANSI
// et fait entrer chaque octet UTF-8 en base comme un caractere distinct —
// l'arabe en ressort illisible et deux fois trop long. Le BOM lui fait detecter
// l'UTF-8 seul, sans dependre du drapeau -f 65001.
fs.writeFileSync(OUTPUT, "﻿" + parts.join("\n"), "utf8");

console.log(`${OUTPUT}`);
for (const [name, count] of Object.entries(counts)) {
  console.log(`  ${name.padEnd(24)} ${count}`);
}

await db.$disconnect();
