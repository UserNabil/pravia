import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import type { Locale } from "@/i18n/routing";

/**
 * Textes de la banniere d'accueil que l'administrateur peut reecrire.
 *
 * Le compteur de commandes n'y figure pas : c'est un chiffre vivant, lu en
 * base a chaque affichage, que reecrire n'aurait aucun sens.
 */
export const CHAMPS_ACCUEIL = [
  "badge",
  "title",
  "titleAccent",
  "subtitle",
  "explore",
  "bestSellers",
  "securePayment",
] as const;

export type ChampAccueil = (typeof CHAMPS_ACCUEIL)[number];

export function estChampAccueil(valeur: string): valeur is ChampAccueil {
  return (CHAMPS_ACCUEIL as readonly string[]).includes(valeur);
}

/** Un reglage par champ et par langue : chaque langue se reecrit a part. */
export const cleAccueil = (champ: ChampAccueil, locale: Locale) =>
  `home.${champ}.${locale}`;

export type TexteAccueil = {
  /** Ce que voit le visiteur, jetons remplaces par les chiffres du jour. */
  rendu: string;
  /** Ce que l'on edite, jetons intacts. */
  brut: string;
  /** Vrai quand le texte vient du back-office plutot que du catalogue. */
  personnalise: boolean;
};

export type ContenuAccueil = Record<ChampAccueil, TexteAccueil>;

/**
 * Remplace les jetons d'un texte reecrit.
 *
 * Les textes du catalogue passent par la mise en forme ICU de next-intl, qui
 * gere les pluriels. Une reecriture saisie par le client, elle, ne doit pas
 * pouvoir casser la page avec une syntaxe ICU invalide : on se limite donc a
 * une substitution simple, et un jeton inconnu reste affiche tel quel.
 */
function substituer(gabarit: string, jetons: Record<string, string>): string {
  return gabarit.replace(
    /\{(\w+)\}/g,
    (entier, nom: string) => jetons[nom] ?? entier,
  );
}

/**
 * Resout la banniere : reecriture du back-office si elle existe, sinon le
 * texte d'origine. Vider un champ efface la reecriture et restaure l'original.
 */
export async function getHomeContent(
  locale: Locale,
  jetons: Record<string, string>,
): Promise<ContenuAccueil> {
  const [t, rows] = await Promise.all([
    getTranslations({ locale, namespace: "home" }),
    db.setting.findMany({
      where: {
        key: { in: CHAMPS_ACCUEIL.map((champ) => cleAccueil(champ, locale)) },
      },
    }),
  ]);

  const surcharges = new Map(rows.map((row) => [row.key, row.value]));

  const entrees = CHAMPS_ACCUEIL.map((champ) => {
    const surcharge = surcharges.get(cleAccueil(champ, locale))?.trim();
    if (!surcharge) {
      return [
        champ,
        {
          rendu: t(champ, jetons),
          brut: String(t.raw(champ)),
          personnalise: false,
        },
      ] as const;
    }
    return [
      champ,
      {
        rendu: substituer(surcharge, jetons),
        brut: surcharge,
        personnalise: true,
      },
    ] as const;
  });

  return Object.fromEntries(entrees) as ContenuAccueil;
}
