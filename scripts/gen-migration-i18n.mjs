/**
 * Extrait la migration additive « multilingue » du schema SQL Server complet.
 *
 * Le script de schema complet part d'une base vide : le rejouer sur une base
 * en production effacerait tout. Cette migration-ci n'ajoute que les quatre
 * tables de traduction et les reglages de bandeau par langue, sans toucher a
 * l'existant, et se relance sans dommage.
 *
 * Usage : node scripts/gen-migration-i18n.mjs
 */
import fs from "node:fs";
import path from "node:path";

const SCHEMA = path.join("dist-sql", "pravia-schema.sql");
const OUTPUT = path.join("dist-sql", "pravia-migration-i18n.sql");

const TABLES = [
  "ProductTranslation",
  "ProductSpecTranslation",
  "CategoryTranslation",
  "SeoPageTranslation",
];

if (!fs.existsSync(SCHEMA)) {
  console.error(`${SCHEMA} absent : lancez d'abord npm run sql:schema`);
  process.exit(1);
}

const schema = fs.readFileSync(SCHEMA, "utf8");
// Chaque enonce est precede d'un commentaire genere : on ne garde que le SQL.
const statements = schema
  .split(/;\s*\n/)
  .map((block) =>
    block
      .split("\n")
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n")
      .trim()
  )
  .filter(Boolean);

/** Un enonce concerne la migration s'il nomme une table de traduction. */
const relevant = statements.filter((statement) =>
  TABLES.some((table) => statement.includes(`[${table}]`))
);

const creates = relevant.filter((s) => s.startsWith("CREATE TABLE"));
// Prisma ecrit CREATE NONCLUSTERED INDEX pour SQL Server.
const indexes = relevant.filter((s) => /^CREATE (?:UNIQUE )?(?:NONCLUSTERED |CLUSTERED )?INDEX/.test(s));
const keys = relevant.filter((s) => s.startsWith("ALTER TABLE"));

if (creates.length !== TABLES.length) {
  console.error(`Tables trouvees : ${creates.length}/${TABLES.length}. Schema inattendu.`);
  process.exit(1);
}

/** Nom de la table creee par un enonce CREATE TABLE. */
function tableOf(statement) {
  return /CREATE TABLE \[dbo\]\.\[(\w+)\]/.exec(statement)?.[1] ?? "";
}

const parts = [
  `-- Pravia : migration multilingue (i18n)`,
  `--`,
  `-- A jouer sur une base DEJA installee, apres avoir mis a jour le code.`,
  `-- Purement additive : aucune table existante n'est modifiee ni supprimee.`,
  `-- Relancable : chaque creation est conditionnee a l'absence de l'objet.`,
  ``,
  `SET XACT_ABORT ON;`,
  `BEGIN TRANSACTION;`,
  ``,
];

for (const statement of creates) {
  const table = tableOf(statement);
  parts.push(
    `IF OBJECT_ID(N'[dbo].[${table}]', N'U') IS NULL`,
    `BEGIN`,
    statement
      .split("\n")
      .map((line) => `    ${line}`)
      .join("\n") + ";",
    `END;`,
    ``
  );
}

for (const statement of indexes) {
  const name = /INDEX \[(\w+)\]/.exec(statement)?.[1];
  const table = /ON \[dbo\]\.\[(\w+)\]/.exec(statement)?.[1];
  if (!name || !table) continue;
  parts.push(
    `IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'${name}' AND object_id = OBJECT_ID(N'[dbo].[${table}]'))`,
    `    ${statement};`,
    ``
  );
}

for (const statement of keys) {
  const name = /ADD CONSTRAINT \[(\w+)\]/.exec(statement)?.[1];
  if (!name) continue;
  parts.push(
    `IF OBJECT_ID(N'[dbo].[${name}]', N'F') IS NULL`,
    `    ${statement.replace(/\n/g, " ")};`,
    ``
  );
}

parts.push(
  `-- Bandeau promotionnel decline par langue. La cle nue reste le repli.`,
  `MERGE [dbo].[Setting] AS cible`,
  `USING (VALUES`,
  `    (N'banner.text.fr', N'Livraison offerte des 150 EUR - Retours gratuits sous 30 jours'),`,
  `    (N'banner.text.en', N'Free delivery over 150 EUR - Free returns within 30 days'),`,
  `    (N'banner.text.ar', N'شحن مجاني ابتداءً من 150 يورو - إرجاع مجاني خلال 30 يومًا')`,
  `) AS source ([key], [value]) ON cible.[key] = source.[key]`,
  `WHEN NOT MATCHED THEN INSERT ([key], [value]) VALUES (source.[key], source.[value]);`,
  ``,
  `COMMIT TRANSACTION;`,
  ``,
  `-- Verification : quatre tables et les reglages de bandeau.`,
  `SELECT name FROM sys.tables WHERE name LIKE '%Translation' ORDER BY name;`,
  `SELECT [key] FROM [dbo].[Setting] WHERE [key] LIKE 'banner.text%' ORDER BY [key];`,
  ``
);

fs.writeFileSync(OUTPUT, parts.join("\n"));
console.log(
  `${OUTPUT} : ${creates.length} table(s), ${indexes.length} index, ${keys.length} cle(s) etrangere(s)`
);
