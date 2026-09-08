import "server-only";
import { db } from "./db";
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FALLBACK_RATE } from "./constants";

/**
 * Frais de livraison.
 *
 * Le tarif se definit par wilaya depuis le back-office, et une commune peut le
 * surcharger quand elle coute plus cher a desservir que le reste de sa wilaya.
 * La resolution suit donc toujours le meme ordre :
 *
 *   1. le tarif de la commune, s'il est renseigne ;
 *   2. sinon celui de sa wilaya ;
 *   3. sinon un tarif de secours, pour qu'une grille incomplete n'empeche
 *      jamais une commande d'aboutir.
 *
 * Au-dessus du seuil de gratuite, la livraison est offerte quelle que soit la
 * destination.
 */

export type Destination = { wilayaCode: number; commune: string };

export type ShippingQuote = {
  /** Montant retenu, en centimes de dinar. */
  fee: number;
  /** Tarif avant la gratuite, utile pour afficher l'economie realisee. */
  baseFee: number;
  free: boolean;
  /** Vrai quand ni la commune ni la wilaya n'avaient de tarif. */
  fallback: boolean;
};

/** Tarif applicable a une destination, avant seuil de gratuite. */
export async function baseShippingFee({ wilayaCode, commune }: Destination): Promise<{ fee: number; fallback: boolean }> {
  const wilaya = await db.wilaya.findUnique({
    where: { code: wilayaCode },
    select: {
      shippingFee: true,
      active: true,
      communes: { where: { name: commune }, select: { shippingFee: true }, take: 1 },
    },
  });

  if (!wilaya || !wilaya.active) return { fee: SHIPPING_FALLBACK_RATE, fallback: true };

  const surcharge = wilaya.communes[0]?.shippingFee;
  if (surcharge != null) return { fee: surcharge, fallback: false };

  return { fee: wilaya.shippingFee, fallback: false };
}

/** Devis complet pour un panier donne. */
export async function quoteShipping(destination: Destination, subtotal: number): Promise<ShippingQuote> {
  const { fee, fallback } = await baseShippingFee(destination);
  const free = subtotal >= FREE_SHIPPING_THRESHOLD;
  return { fee: free ? 0 : fee, baseFee: fee, free, fallback };
}

/**
 * Tarif le plus bas de la grille, pour les pages qui annoncent un prix avant
 * de connaitre la destination : « livraison a partir de … ». Les surcharges de
 * commune sont prises en compte, une commune pouvant etre moins chere que sa
 * wilaya.
 */
export async function cheapestShippingFee(): Promise<number> {
  const [wilaya, commune] = await Promise.all([
    db.wilaya.findFirst({
      where: { active: true },
      orderBy: { shippingFee: "asc" },
      select: { shippingFee: true },
    }),
    db.commune.findFirst({
      where: { shippingFee: { not: null }, wilaya: { active: true } },
      orderBy: { shippingFee: "asc" },
      select: { shippingFee: true },
    }),
  ]);

  const candidats = [wilaya?.shippingFee, commune?.shippingFee].filter(
    (v): v is number => typeof v === "number"
  );
  return candidats.length ? Math.min(...candidats) : SHIPPING_FALLBACK_RATE;
}

/** Wilayas ouvertes a la commande, dans l'ordre de leur code officiel. */
export async function listWilayas() {
  return db.wilaya.findMany({
    where: { active: true },
    orderBy: { code: "asc" },
    select: { code: true, name: true, nameAr: true, shippingFee: true },
  });
}

/** Communes d'une wilaya, avec le tarif reellement applicable a chacune. */
export async function listCommunes(wilayaCode: number) {
  const wilaya = await db.wilaya.findUnique({
    where: { code: wilayaCode },
    select: {
      shippingFee: true,
      communes: {
        orderBy: { name: "asc" },
        select: { name: true, nameAr: true, shippingFee: true },
      },
    },
  });

  if (!wilaya) return [];

  return wilaya.communes.map((c) => ({
    name: c.name,
    nameAr: c.nameAr,
    fee: c.shippingFee ?? wilaya.shippingFee,
  }));
}
