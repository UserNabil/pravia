/**
 * Exporte le contenu de la base SQLite vers un script T-SQL applicable a
 * SQL Server avec sqlcmd.
 *
 * Interet : le chargement initial ne demande aucune connexion reseau vers
 * SQL Server. On peut donc peupler la base de production avant meme d'avoir
 * ouvert TCP/IP, puis verifier le resultat avant de brancher l'application.
 *
 * Usage : node scripts/export-sqlserver.mjs [fichier-de-sortie]
 */
import fs from "node:fs";
import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client.js";

for (const file of [".env.local", ".env"]) {
  if (fs.existsSync(file)) process.loadEnvFile(file);
}

const OUTPUT = process.argv[2] ?? path.join("dist-sql", "pravia-data.sql");

const db = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./prisma/dev.db" }),
});

/** Ordre d'insertion respectant les cles etrangeres. */
const TABLES = [
  // Le decoupage administratif d'abord : Commune reference Wilaya, et les
  // adresses comme les commandes portent un code de wilaya.
  { name: "Wilaya", read: () => db.wilaya.findMany() },
  { name: "Commune", read: () => db.commune.findMany() },
  { name: "Category", read: () => db.category.findMany() },
  { name: "Brand", read: () => db.brand.findMany() },
  { name: "User", read: () => db.user.findMany() },
  { name: "Address", read: () => db.address.findMany() },
  { name: "Product", read: () => db.product.findMany() },
  // Les declinaisons precedent le panier et les commandes, qui les referencent.
  { name: "ProductVariant", read: () => db.productVariant.findMany() },
  { name: "ProductImage", read: () => db.productImage.findMany() },
  { name: "ProductSpec", read: () => db.productSpec.findMany() },
  // Traductions : elles dependent de leur entite parente, donc juste apres elle.
  { name: "ProductTranslation", read: () => db.productTranslation.findMany() },
  { name: "ProductSpecTranslation", read: () => db.productSpecTranslation.findMany() },
  { name: "CategoryTranslation", read: () => db.categoryTranslation.findMany() },
  { name: "Review", read: () => db.review.findMany() },
  { name: "CartItem", read: () => db.cartItem.findMany() },
  { name: "WishlistItem", read: () => db.wishlistItem.findMany() },
  { name: "Order", read: () => db.order.findMany() },
  { name: "OrderItem", read: () => db.orderItem.findMany() },
  { name: "Setting", read: () => db.setting.findMany() },
  { name: "SeoPage", read: () => db.seoPage.findMany() },
  { name: "SeoPageTranslation", read: () => db.seoPageTranslation.findMany() },
  { name: "SearchSynonym", read: () => db.searchSynonym.findMany() },
  { name: "SearchQuery", read: () => db.searchQuery.findMany() },
];

/** Litteral T-SQL pour une valeur JavaScript. */
function literal(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "1" : "0";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (value instanceof Date) return `'${value.toISOString().replace("T", " ").replace("Z", "")}'`;
  // N'...' impose l'Unicode ; les apostrophes se doublent.
  return `N'${String(value).replace(/'/g, "''")}'`;
}

/** SQL Server limite un INSERT ... VALUES a 1000 lignes. */
const BATCH = 500;

async function main() {
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });

  const parts = [
    "-- Donnees Pravia exportees depuis SQLite",
    `-- Genere le ${new Date().toISOString()}`,
    "-- Application : sqlcmd -S SERVEUR -d Pravia -i pravia-data.sql",
    "",
    "SET NOCOUNT ON;",
    "SET XACT_ABORT ON;",
    "BEGIN TRANSACTION;",
    "",
  ];

  // Purge en ordre inverse : les enfants avant les parents.
  parts.push("-- Purge du contenu existant");
  for (const table of [...TABLES].reverse()) {
    parts.push(`DELETE FROM [dbo].[${table.name}];`);
  }
  parts.push("");

  const counts = {};

  for (const table of TABLES) {
    const rows = await table.read();
    counts[table.name] = rows.length;
    if (!rows.length) continue;

    const columns = Object.keys(rows[0]);
    const quoted = columns.map((c) => `[${c}]`).join(", ");

    parts.push(`-- ${table.name} (${rows.length})`);

    for (let i = 0; i < rows.length; i += BATCH) {
      const chunk = rows.slice(i, i + BATCH);
      const values = chunk
        .map((row) => `  (${columns.map((c) => literal(row[c])).join(", ")})`)
        .join(",\n");
      parts.push(`INSERT INTO [dbo].[${table.name}] (${quoted}) VALUES\n${values};`);
    }
    parts.push("");
  }

  parts.push("COMMIT TRANSACTION;");
  parts.push("GO");
  parts.push("");

  // Marque d'ordre des octets : sans elle, sqlcmd lit le fichier comme de
  // l'ANSI et fait entrer chaque octet UTF-8 en base comme un caractere
  // distinct — l'arabe en ressort illisible et deux fois trop long. Le BOM lui
  // fait detecter l'UTF-8 seul, sans dependre du drapeau -f 65001.
  fs.writeFileSync(OUTPUT, "﻿" + parts.join("\n"), "utf8");

  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  console.log(`Export ecrit : ${OUTPUT}`);
  console.log(`${total} lignes reparties sur ${Object.keys(counts).length} tables`);
  for (const [name, count] of Object.entries(counts)) {
    if (count) console.log(`  ${name.padEnd(16)} ${count}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
