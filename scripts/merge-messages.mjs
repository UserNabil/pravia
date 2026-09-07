/**
 * Fusionne un lot de traductions dans les trois catalogues.
 *
 * Le lot est un module qui exporte `{ fr, en, ar }`, chacun etant un objet
 * imbrique fusionne en profondeur dans le catalogue correspondant. Les cles
 * existantes sont ecrasees : c'est ce qui permet de rejouer un lot corrige.
 *
 * Le lot est un fichier de travail : une fois fusionne, les catalogues
 * deviennent la source de verite et le lot peut etre supprime.
 *
 * Usage : node scripts/merge-messages.mjs <chemin-du-lot.mjs>
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const LOCALES = ["fr", "en", "ar"];

function mergeDeep(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      if (!target[key] || typeof target[key] !== "object") target[key] = {};
      mergeDeep(target[key], value);
    } else {
      target[key] = value;
    }
  }
  return target;
}

const input = process.argv[2];
if (!input) {
  console.error("Usage : node scripts/merge-messages.mjs <lot.mjs>");
  process.exit(1);
}

const batch = await import(pathToFileURL(path.resolve(input)).href);

let added = 0;
for (const locale of LOCALES) {
  const file = `messages/${locale}.json`;
  const json = JSON.parse(fs.readFileSync(file, "utf8"));
  const before = JSON.stringify(json).length;
  mergeDeep(json, batch[locale] ?? {});
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n");
  if (locale === "fr") added = JSON.stringify(json).length - before;
}

console.log(`lot fusionne (${added > 0 ? "+" : ""}${added} caracteres en francais)`);
