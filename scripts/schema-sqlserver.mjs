/**
 * Genere prisma/schema.sqlserver.prisma a partir du schema SQLite de reference.
 *
 * Le schema source reste l'unique verite ; ce script applique les differences
 * imposees par SQL Server, chacune documentee ci-dessous. Il est relance
 * automatiquement par les commandes de deploiement, il n'y a donc jamais deux
 * schemas a maintenir en parallele.
 */
import fs from "node:fs";
import path from "node:path";

const SOURCE = path.join("prisma", "schema.prisma");
const TARGET = path.join("prisma", "schema.sqlserver.prisma");

/**
 * Colonnes de texte long. Sans annotation, Prisma les crée en NVARCHAR(1000)
 * sur SQL Server, ce qui tronquerait descriptions et index de recherche.
 */
const LONG_TEXT = [
  ["Product", "description"],
  ["Product", "searchText"],
  ["Product", "metaDescription"],
  ["Category", "metaDescription"],
  ["Review", "body"],
  ["Order", "notes"],
  ["Setting", "value"],
  ["SeoPage", "metaDescription"],
];

/**
 * SQL Server refuse plusieurs chemins de suppression en cascade aboutissant a
 * la meme table. On conserve la cascade la plus naturelle et on bascule
 * l'autre en NoAction : le nettoyage correspondant est fait explicitement dans
 * les actions serveur (voir deleteProductAction et deleteUserAction).
 */
const RELATION_OVERRIDES = [
  {
    model: "CartItem",
    line: 'product Product @relation(fields: [productId], references: [id], onDelete: Cascade)',
    replacement: 'product Product @relation(fields: [productId], references: [id], onDelete: NoAction, onUpdate: NoAction)',
  },
  {
    model: "WishlistItem",
    line: 'product Product @relation(fields: [productId], references: [id], onDelete: Cascade)',
    replacement: 'product Product @relation(fields: [productId], references: [id], onDelete: NoAction, onUpdate: NoAction)',
  },
  {
    model: "Review",
    line: 'user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)',
    replacement: 'user    User    @relation(fields: [userId], references: [id], onDelete: NoAction, onUpdate: NoAction)',
  },
  {
    model: "OrderItem",
    line: 'product Product? @relation(fields: [productId], references: [id], onDelete: SetNull)',
    replacement: 'product Product? @relation(fields: [productId], references: [id], onDelete: NoAction, onUpdate: NoAction)',
  },
];

/**
 * Longueurs des colonnes de texte participant a une cle ou a un index.
 * Sans elles, Prisma genere NVARCHAR(1000), soit 2000 octets : au-dela de la
 * limite de 900 octets d'un index clusterise, SQL Server accepte la creation
 * mais avertit qu'une insertion pourra echouer.
 */
const KEY_LENGTHS = { identifier: 36, email: 320, code: 200 };

function lengthFor(field) {
  if (field === "id" || /Id$/.test(field)) return KEY_LENGTHS.identifier;
  if (field === "email") return KEY_LENGTHS.email;
  return KEY_LENGTHS.code;
}

/**
 * Releve les champs d'un modele soumis a une contrainte : cle primaire, unicite,
 * index, ou cle etrangere (qui doit avoir exactement le type de la cle visee).
 */
function constrainedFields(body) {
  const fields = new Set();

  for (const line of body.split("\n")) {
    const name = line.trim().split(/\s+/)[0];
    if (!name || name.startsWith("@@") || name.startsWith("//")) continue;
    if (/\s@id\b/.test(line) || /\s@unique\b/.test(line)) fields.add(name);
  }

  for (const match of body.matchAll(/@@(?:index|unique)\(\[([^\]]+)\]\)/g)) {
    for (const name of match[1].split(",")) fields.add(name.trim());
  }

  for (const match of body.matchAll(/@relation\([^)]*fields:\s*\[([^\]]+)\]/g)) {
    for (const name of match[1].split(",")) fields.add(name.trim());
  }

  return fields;
}

/** Ajoute @db.NVarChar(n) aux colonnes de texte contraintes d'un modele. */
function sizeKeyColumns(body) {
  const constrained = constrainedFields(body);

  return body
    .split("\n")
    .map((line) => {
      const name = line.trim().split(/\s+/)[0];
      if (!constrained.has(name)) return line;
      if (!/^\s+\S+\s+String\b/.test(line)) return line; // seules les colonnes texte
      if (line.includes("@db.")) return line;
      return appendAttribute(line, `@db.NVarChar(${lengthFor(name)})`);
    })
    .join("\n");
}

/**
 * Ajoute un attribut a une ligne de champ, en le placant avant un eventuel
 * commentaire de fin de ligne : sinon l'attribut serait avale par le commentaire.
 * La detection ignore les "//" situes a l'interieur d'une chaine.
 */
function appendAttribute(line, attribute) {
  let inString = false;
  let commentAt = -1;

  for (let i = 0; i < line.length - 1; i++) {
    if (line[i] === '"') inString = !inString;
    else if (!inString && line[i] === "/" && line[i + 1] === "/") {
      commentAt = i;
      break;
    }
  }

  if (commentAt === -1) return `${line} ${attribute}`;

  const code = line.slice(0, commentAt).trimEnd();
  const comment = line.slice(commentAt);
  return `${code} ${attribute} ${comment}`;
}

/** Isole le corps d'un modele pour n'appliquer un remplacement qu'a l'interieur. */
function editModel(schema, model, edit) {
  const pattern = new RegExp(`(model ${model} \\{)([\\s\\S]*?)(\\n\\})`);
  const match = schema.match(pattern);
  if (!match) throw new Error(`Modele introuvable dans le schema : ${model}`);
  return schema.replace(pattern, (_, open, body, close) => `${open}${edit(body)}${close}`);
}

function generate() {
  if (!fs.existsSync(SOURCE)) throw new Error(`Schema source introuvable : ${SOURCE}`);
  let schema = fs.readFileSync(SOURCE, "utf8");

  // 1. Fournisseur et emplacement du client generé.
  schema = schema.replace('provider = "sqlite"', 'provider = "sqlserver"');
  if (!schema.includes('provider = "sqlserver"')) {
    throw new Error("Le fournisseur sqlite n'a pas ete trouve dans le schema source.");
  }

  // 2. Texte long : NVARCHAR(MAX) plutot que la longueur par defaut.
  for (const [model, field] of LONG_TEXT) {
    schema = editModel(schema, model, (body) => {
      const fieldPattern = new RegExp(`(\\n\\s+${field}\\s+String\\??[^\\n]*)`);
      if (!fieldPattern.test(body)) {
        throw new Error(`Champ ${model}.${field} introuvable : le schema source a change.`);
      }
      return body.replace(fieldPattern, (line) =>
        line.includes("@db.") ? line : appendAttribute(line, "@db.NVarChar(Max)")
      );
    });
  }

  // 3. Un index sur une colonne NVARCHAR(MAX) est refuse par SQL Server. Il ne
  //    servait de toute facon a rien : une recherche LIKE '%terme%' ne peut pas
  //    exploiter un index B-tree, quel que soit le moteur.
  schema = schema.replace(/\n\s+@@index\(\[searchText\]\)/g, "");

  // 4. Dimensionnement des colonnes de cle et d'index, modele par modele.
  for (const model of [...schema.matchAll(/model (\w+) \{/g)].map((m) => m[1])) {
    schema = editModel(schema, model, sizeKeyColumns);
  }

  // 5. Actions referentielles compatibles avec SQL Server.
  for (const override of RELATION_OVERRIDES) {
    schema = editModel(schema, override.model, (body) => {
      if (!body.includes(override.line)) {
        throw new Error(
          `Relation attendue introuvable dans ${override.model} : le schema source a change.`
        );
      }
      return body.replace(override.line, override.replacement);
    });
  }

  const header = `// FICHIER GENERE - NE PAS MODIFIER A LA MAIN
// Source : prisma/schema.prisma
// Regenerer avec : npm run schema:sqlserver
//
// Differences appliquees pour SQL Server :
//   - fournisseur sqlserver
//   - colonnes de texte long en NVARCHAR(MAX)
//   - index sur searchText retire (inutilisable par un LIKE '%...%')
//   - cascades en doublon converties en NoAction, nettoyage fait par le code

`;

  fs.writeFileSync(TARGET, header + schema, "utf8");
  console.log(`Schema SQL Server genere : ${TARGET}`);
}

generate();
