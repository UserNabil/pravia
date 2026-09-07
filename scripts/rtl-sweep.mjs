/**
 * Convertit les utilitaires Tailwind directionnels en proprietes logiques.
 *
 * En arabe la page se lit de droite a gauche : une marge posee a gauche doit
 * devenir une marge « au debut ». Les proprietes logiques (ms, me, ps, pe,
 * start, end) s'inversent d'elles-memes selon l'attribut dir, ce qui evite de
 * maintenir deux jeux de styles.
 *
 * Usage : node scripts/rtl-sweep.mjs [--verifier]
 */
import fs from "node:fs";
import path from "node:path";

const CHECK_ONLY = process.argv.includes("--verifier");

/** Un utilitaire commence apres un espace, un guillemet ou un prefixe de variante. */
const BEFORE = String.raw`(?<=[\s"'\`:{(])`;

const RULES = [
  ["ml-", "ms-"],
  ["mr-", "me-"],
  ["pl-", "ps-"],
  ["pr-", "pe-"],
  ["-ml-", "-ms-"],
  ["-mr-", "-me-"],
  ["left-", "start-"],
  ["right-", "end-"],
  ["-left-", "-start-"],
  ["-right-", "-end-"],
  ["border-l-", "border-s-"],
  ["border-r-", "border-e-"],
  ["rounded-l-", "rounded-s-"],
  ["rounded-r-", "rounded-e-"],
].map(([from, to]) => [new RegExp(BEFORE + from.replace(/[-]/g, "\\-"), "g"), to]);

// Ces utilitaires n'ont pas de suffixe : il faut s'assurer qu'aucune lettre
// ne suit, sans quoi "rounded-lg" ou "text-left" seraient mal decoupes.
const EXACT = [
  [new RegExp(BEFORE + String.raw`text-left(?![\w-])`, "g"), "text-start"],
  [new RegExp(BEFORE + String.raw`text-right(?![\w-])`, "g"), "text-end"],
  [new RegExp(BEFORE + String.raw`border-l(?![\w-])`, "g"), "border-s"],
  [new RegExp(BEFORE + String.raw`border-r(?![\w-])`, "g"), "border-e"],
  [new RegExp(BEFORE + String.raw`rounded-l(?![\w-])`, "g"), "rounded-s"],
  [new RegExp(BEFORE + String.raw`rounded-r(?![\w-])`, "g"), "rounded-e"],
];

const ALL = [...EXACT, ...RULES];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "generated") walk(full, out);
    } else if (/\.(tsx?|css)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

let touched = 0;
let replacements = 0;
const details = [];

for (const file of walk("src")) {
  const original = fs.readFileSync(file, "utf8");
  let updated = original;

  for (const [pattern, replacement] of ALL) {
    updated = updated.replace(pattern, () => {
      replacements += 1;
      return replacement;
    });
  }

  if (updated !== original) {
    touched += 1;
    details.push(path.relative("src", file));
    if (!CHECK_ONLY) fs.writeFileSync(file, updated);
  }
}

if (CHECK_ONLY) {
  if (touched) {
    console.log(`${replacements} utilitaire(s) directionnel(s) restant(s) dans ${touched} fichier(s) :`);
    for (const file of details) console.log(`  ${file}`);
    process.exit(1);
  }
  console.log("Aucun utilitaire directionnel : la mise en page suit le sens de lecture.");
} else {
  console.log(`${replacements} remplacement(s) dans ${touched} fichier(s).`);
}
