/**
 * Numeros de telephone algeriens.
 *
 * Le livreur appelle avant de se presenter : le numero doit etre exploitable,
 * pas seulement present. On accepte donc les formes qu'un client ecrit
 * spontanement — espaces, points, tirets, prefixe +213 ou 00213 — et on
 * enregistre une forme unique. Les chiffres arabo-indiens sont convertis :
 * la boutique s'affiche en arabe par defaut, un client peut tres bien saisir
 * son numero au clavier arabe.
 */

const CHIFFRES_NON_LATINS = /[٠-٩۰-۹]/g;

function versChiffresLatins(texte: string): string {
  return texte.replace(CHIFFRES_NON_LATINS, (c) => {
    const code = c.codePointAt(0) as number;
    const base = code >= 0x06f0 ? 0x06f0 : 0x0660;
    return String(code - base);
  });
}

/**
 * Ramene une saisie a la forme nationale, ou rend null si le numero ne peut
 * pas exister. Mobile : 05, 06 ou 07 suivis de huit chiffres. Fixe :
 * indicatif puis six chiffres, neuf en tout.
 */
export function normaliserTelephone(saisie: string): string | null {
  let numero = versChiffresLatins(saisie).replace(/[\s.\-()‎‏]/g, "");

  if (numero.startsWith("+213")) numero = `0${numero.slice(4)}`;
  else if (numero.startsWith("00213")) numero = `0${numero.slice(5)}`;
  else if (/^213\d{9}$/.test(numero)) numero = `0${numero.slice(3)}`;

  if (/^0[567]\d{8}$/.test(numero)) return numero;
  if (/^0[1-4]\d{7}$/.test(numero)) return numero;
  return null;
}

/** Forme lisible : 06 61 23 45 67 pour un mobile, 021 23 45 67 pour un fixe. */
export function afficherTelephone(numero: string): string {
  if (/^0[567]\d{8}$/.test(numero)) return numero.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
  if (/^0[1-4]\d{7}$/.test(numero)) {
    return `${numero.slice(0, 3)} ${numero.slice(3).replace(/(\d{2})(?=\d)/g, "$1 ")}`.trim();
  }
  return numero;
}
