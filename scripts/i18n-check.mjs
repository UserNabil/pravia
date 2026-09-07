/**
 * Controle des catalogues de traduction.
 *
 * Verifie que les trois langues declarent exactement les memes cles, que les
 * variables d'interpolation concordent, et que chaque message ICU compile.
 * Une cle oubliee dans une langue ne se voit pas a l'oeil nu ; elle se voit ici.
 *
 * Usage : npm run i18n:check
 */
import fs from "node:fs";
import path from "node:path";
import IntlMessageFormat from "intl-messageformat";

const LOCALES = ["fr", "en", "ar"];
const REFERENCE = "fr";
const DIR = path.join(process.cwd(), "messages");

const problems = [];
const note = (message) => problems.push(message);

/** Aplatit un objet imbrique en cles pointees : "cart.title". */
function flatten(value, prefix = "", output = {}) {
  for (const [key, entry] of Object.entries(value)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (entry && typeof entry === "object" && !Array.isArray(entry)) flatten(entry, full, output);
    else output[full] = entry;
  }
  return output;
}

/** Releve les variables citees par un message, hors syntaxe de pluriel. */
function variables(message) {
  const found = new Set();
  for (const match of String(message).matchAll(/\{\s*([a-zA-Z0-9_]+)\s*[,}]/g)) {
    found.add(match[1]);
  }
  return found;
}

const catalogues = {};
for (const locale of LOCALES) {
  const file = path.join(DIR, `${locale}.json`);
  if (!fs.existsSync(file)) {
    note(`Catalogue manquant : ${file}`);
    continue;
  }
  try {
    catalogues[locale] = flatten(JSON.parse(fs.readFileSync(file, "utf8")));
  } catch (error) {
    note(`${locale}.json illisible : ${error.message}`);
  }
}

const reference = catalogues[REFERENCE];
if (!reference) {
  console.error("Le catalogue de reference est introuvable.");
  process.exit(1);
}

const referenceKeys = Object.keys(reference);
console.log(`Reference : ${REFERENCE} (${referenceKeys.length} cles)\n`);

for (const locale of LOCALES) {
  const catalogue = catalogues[locale];
  if (!catalogue) continue;

  const keys = Object.keys(catalogue);
  const missing = referenceKeys.filter((key) => !(key in catalogue));
  const extra = keys.filter((key) => !(key in reference));

  for (const key of missing) note(`${locale} : cle absente — ${key}`);
  for (const key of extra) note(`${locale} : cle en trop — ${key}`);

  let empty = 0;
  let mismatched = 0;
  let broken = 0;

  for (const [key, message] of Object.entries(catalogue)) {
    if (typeof message !== "string" || !message.trim()) {
      note(`${locale} : message vide — ${key}`);
      empty += 1;
      continue;
    }

    // Les variables doivent concorder avec la reference, sans quoi le message
    // afficherait un trou ou une accolade brute.
    if (key in reference) {
      const expected = variables(reference[key]);
      const actual = variables(message);
      const absent = [...expected].filter((v) => !actual.has(v));
      const unknown = [...actual].filter((v) => !expected.has(v));
      if (absent.length || unknown.length) {
        note(
          `${locale} : variables divergentes sur ${key}` +
            (absent.length ? ` — manquantes : ${absent.join(", ")}` : "") +
            (unknown.length ? ` — inattendues : ${unknown.join(", ")}` : "")
        );
        mismatched += 1;
      }
    }

    // Compilation ICU : detecte un pluriel mal forme.
    try {
      new IntlMessageFormat(message, locale);
    } catch (error) {
      note(`${locale} : message ICU invalide — ${key} : ${error.message}`);
      broken += 1;
    }
  }

  const status = missing.length + extra.length + empty + mismatched + broken === 0 ? "OK  " : "ECHEC";
  console.log(
    `${status} ${locale} : ${keys.length} cles` +
      (missing.length ? `, ${missing.length} absente(s)` : "") +
      (extra.length ? `, ${extra.length} en trop` : "") +
      (empty ? `, ${empty} vide(s)` : "") +
      (mismatched ? `, ${mismatched} variable(s) divergente(s)` : "") +
      (broken ? `, ${broken} ICU invalide(s)` : "")
  );
}

/* --------------------------------------- verification des pluriels arabes */

const arabicPlurals = Object.entries(catalogues.ar ?? {}).filter(([, message]) =>
  String(message).includes("plural")
);

if (arabicPlurals.length) {
  console.log(`\nPluriels arabes : ${arabicPlurals.length} message(s)`);
  // L'arabe distingue six formes ; un message qui n'en couvre pas assez
  // affichera la forme "other" a contretemps.
  for (const [key, message] of arabicPlurals) {
    const forms = ["zero", "one", "two", "few", "many", "other"].filter((form) =>
      new RegExp(`\\b${form}\\s*\\{`).test(message)
    );
    if (forms.length < 6) {
      note(`ar : ${key} ne couvre que ${forms.length} formes de pluriel sur 6 (${forms.join(", ")})`);
    }
  }
}

if (problems.length) {
  console.log(`\n${problems.length} probleme(s) :`);
  for (const problem of problems.slice(0, 40)) console.log(`  ${problem}`);
  if (problems.length > 40) console.log(`  ... et ${problems.length - 40} autre(s)`);
  process.exit(1);
}

console.log("\nLes catalogues sont coherents.");
