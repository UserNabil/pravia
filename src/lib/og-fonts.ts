import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import type { Locale } from "@/i18n/routing";

/**
 * Polices embarquees pour les images sociales.
 *
 * Satori ne dispose d'aucune police systeme : sans fichier fourni, l'arabe
 * s'afficherait en carres. Les deux fichiers sont sous licence OFL et vivent
 * dans public/fonts, donc copies tels quels par la sortie standalone.
 */
type SatoriFont = {
  name: string;
  data: ArrayBuffer;
  weight: 700;
  style: "normal";
};

const FILES = {
  latin: "inter-700.ttf",
  arabic: "noto-sans-arabic-700.ttf",
} as const;

// Les fichiers ne changent pas : on ne les relit pas a chaque image.
const cache = new Map<string, Promise<Buffer>>();

function read(file: string): Promise<Buffer> {
  const existing = cache.get(file);
  if (existing) return existing;

  const pending = fs.readFile(path.join(process.cwd(), "public", "fonts", file));
  cache.set(file, pending);
  return pending;
}

/** Renvoie la police adaptee a la langue, sous la forme attendue par Satori. */
export async function ogFonts(locale: Locale): Promise<SatoriFont[]> {
  const file = locale === "ar" ? FILES.arabic : FILES.latin;

  try {
    const data = await read(file);
    return [
      {
        name: "Pravia OG",
        data: data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer,
        weight: 700,
        style: "normal",
      },
    ];
  } catch {
    // Sans police, Satori retombe sur son rendu par defaut : mieux vaut une
    // image imparfaite qu'une page produit sans visuel social.
    return [];
  }
}

/** Nom a passer a `fontFamily` ; vide si la police n'a pas pu etre chargee. */
export const OG_FONT_FAMILY = "Pravia OG, sans-serif";
