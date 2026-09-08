import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { configR2, deposerSurR2 } from "./r2";

/**
 * Visuels televerses depuis le back-office.
 *
 * Destination par defaut : Cloudflare R2. L'image part directement dans le
 * stockage objet de Cloudflare et sera servie par son domaine public — elle ne
 * transite plus jamais par ce serveur, qui ne la stocke pas et ne la resert
 * pas. C'est le comportement des que R2_* est renseigne.
 *
 * A defaut — developpement local, ou R2 pas encore configure — on retombe sur
 * un dossier du disque designe par MEDIA_DIR. Ce dossier est volontairement
 * hors de public/ : l'installation remplace le dossier deploye a chaque mise a
 * jour, les images y seraient perdues.
 *
 * Dans les deux cas le nom de fichier derive du contenu : deux envois du meme
 * visuel n'ecrivent qu'un objet, et une adresse donnee designe toujours le meme
 * octet. C'est ce qui autorise un cache immuable d'un an.
 */

/** Types acceptes, avec l'extension employee pour chacun. */
const TYPES: Record<string, string> = {
  "image/webp": "webp",
  "image/avif": "avif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/svg+xml": "svg",
};

/** 8 Mo : au-dela, c'est une photo brute d'appareil, pas un visuel de fiche. */
export const TAILLE_MAX = 8 * 1024 * 1024;

export function mediaDir(): string {
  const configure = process.env.MEDIA_DIR?.trim();
  if (configure) return configure;
  // En developpement, un dossier local ignore par git suffit.
  return path.join(process.cwd(), ".media");
}

export function typesAcceptes(): string[] {
  return Object.keys(TYPES);
}

export type ResultatEnvoi =
  | { ok: true; url: string; nom: string; taille: number }
  | { ok: false; erreur: "type" | "taille" | "vide" | "stockage" };

/**
 * Enregistre un visuel et rend son adresse publique.
 *
 * Le contenu est stocke tel quel : la mise a l'echelle et la conversion en
 * WebP sont deja faites a la volee par le pipeline d'images de Next, il serait
 * inutile de les refaire ici.
 */
export async function enregistrerMedia(fichier: File): Promise<ResultatEnvoi> {
  if (!fichier || fichier.size === 0) return { ok: false, erreur: "vide" };
  if (fichier.size > TAILLE_MAX) return { ok: false, erreur: "taille" };

  const extension = TYPES[fichier.type];
  if (!extension) return { ok: false, erreur: "type" };

  const octets = Buffer.from(await fichier.arrayBuffer());
  const empreinte = crypto.createHash("sha256").update(octets).digest("hex").slice(0, 32);
  const nom = `${empreinte}.${extension}`;

  const r2 = configR2();
  if (r2) {
    const depot = await deposerSurR2(r2, nom, octets, fichier.type);
    if (!depot.ok) {
      console.error(`[media] depot R2 refuse : HTTP ${depot.statut} — ${depot.message}`);
      return { ok: false, erreur: "stockage" };
    }
    return { ok: true, url: depot.url, nom, taille: octets.length };
  }

  // Repli disque : aucun R2 configure.
  const dossier = mediaDir();
  await fs.mkdir(dossier, { recursive: true });
  const cible = path.join(dossier, nom);

  // Meme empreinte, meme contenu : inutile de reecrire.
  try {
    await fs.access(cible);
  } catch {
    await fs.writeFile(cible, octets);
  }

  return { ok: true, url: `/media/${nom}`, nom, taille: octets.length };
}

/**
 * Lit un visuel pour le servir. Le nom est verifie caractere par caractere
 * plutot que nettoye : un chemin remontant vers le disque n'a aucune raison
 * d'exister, et le refuser franchement vaut mieux que de le corriger.
 */
export async function lireMedia(nom: string): Promise<{ octets: Buffer; type: string } | null> {
  if (!/^[a-f0-9]{32}\.(webp|avif|jpg|png|svg)$/.test(nom)) return null;

  const extension = nom.split(".").pop()!;
  const type = Object.entries(TYPES).find(([, ext]) => ext === extension)?.[0];
  if (!type) return null;

  try {
    const octets = await fs.readFile(path.join(mediaDir(), nom));
    return { octets, type };
  } catch {
    return null;
  }
}
