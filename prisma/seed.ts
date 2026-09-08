/**
 * Jeu de donnees de demarrage pour Pravia.
 * Idempotent : relancable a volonte (`npm run db:seed`).
 */
import fs from "node:fs";
import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { writeDevice, type DeviceKind, type ScreenPalette } from "../scripts/gen-images.mjs";
import bcrypt from "bcryptjs";
import { buildSearchText } from "../src/lib/search.js";
import { EXTRA_DESCRIPTIONS } from "./descriptions.js";
import * as ACCESSOIRES from "./accessoires.js";

for (const file of [".env.local", ".env"]) {
  if (fs.existsSync(file)) process.loadEnvFile(file);
}

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" });
const db = new PrismaClient({ adapter });

/* ------------------------------------------------------------------ helpers */

/**
 * Les prix du catalogue de demonstration ont ete ecrits en euros. La boutique
 * facture en dinars : on convertit au taux courant, puis on arrondit a la
 * centaine de dinars pour ne pas afficher des montants a rallonge. Les valeurs
 * restent stockees en centimes, comme partout ailleurs.
 */
const TAUX_EUR_DZD = 145;
const prix = (euros: number) => Math.round((euros * TAUX_EUR_DZD) / 100) * 10000;

/** Generateur pseudo-aleatoire deterministe : le seed produit toujours la meme demo. */
function makeRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}
const rand = makeRandom(20260907);
const pick = <T,>(items: readonly T[]): T => items[Math.floor(rand() * items.length)];
const between = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

/* ------------------------------------------------------------------ donnees */

/**
 * Categories, marques et articles vivent dans prisma/accessoires.ts : la
 * boutique ne vend que des accessoires de telephone, et separer l'assortiment
 * de la mecanique d'insertion permet de le retoucher sans relire ce script.
 */
const CATEGORIES = ACCESSOIRES.CATEGORIES;
const BRANDS = ACCESSOIRES.BRANDS;
const PRODUCTS = ACCESSOIRES.ARTICLES;


const REVIEW_POOL: { rating: number; title: string; body: string }[] = [
  { rating: 5, title: "Conforme a la description", body: "Livraison en 48 h, emballage soigne et produit strictement conforme a l'annonce. Rien a redire." },
  { rating: 5, title: "Excellent achat", body: "Je l'utilise quotidiennement depuis un mois, aucune mauvaise surprise. Le rapport qualite-prix est vraiment la." },
  { rating: 4, title: "Tres bon, un bemol", body: "Produit de qualite, mais l'autonomie annoncee me semble un peu optimiste dans un usage intensif." },
  { rating: 5, title: "Je recommande", body: "Deuxieme commande chez Pravia, meme serieux que la premiere fois. Le suivi de colis est precis." },
  { rating: 4, title: "Bien mais cher", body: "Aucun defaut sur le produit lui-meme. Le prix reste eleve, meme si la promo aide." },
  { rating: 3, title: "Correct sans plus", body: "Fait le travail, mais je m'attendais a mieux sur la finition a ce niveau de gamme." },
  { rating: 5, title: "Au-dela de mes attentes", body: "La prise en main est immediate et les performances sont au rendez-vous. Tres satisfait." },
  { rating: 4, title: "Bon compromis", body: "Choisi apres avoir compare plusieurs modeles, je ne regrette pas. La garantie annoncee rassure." },
];

const CUSTOMERS = [
  { first: "Camille", last: "Fournier", email: "camille@exemple.fr", color: "#f97316" },
  { first: "Yanis", last: "Bertrand", email: "yanis@exemple.fr", color: "#06b6d4" },
  { first: "Sofia", last: "Nakamura", email: "sofia@exemple.fr", color: "#a855f7" },
  { first: "Lucas", last: "Moreau", email: "lucas@exemple.fr", color: "#22c55e" },
  { first: "Ines", last: "Dubois", email: "ines@exemple.fr", color: "#ec4899" },
  { first: "Thomas", last: "Leroy", email: "thomas@exemple.fr", color: "#eab308" },
];

/* -------------------------------------------------------------------- seed */

async function main() {
  console.log("Nettoyage de la base...");
  await db.orderItem.deleteMany();
  await db.order.deleteMany();
  await db.review.deleteMany();
  await db.cartItem.deleteMany();
  await db.wishlistItem.deleteMany();
  await db.productSpec.deleteMany();
  await db.productImage.deleteMany();
  await db.product.deleteMany();
  await db.address.deleteMany();
  await db.user.deleteMany();
  await db.brand.deleteMany();
  await db.category.deleteMany();
  await db.commune.deleteMany();
  await db.wilaya.deleteMany();
  await db.setting.deleteMany();

  console.log("Decoupage administratif algerien...");
  // Source : prisma/algerie.json, issu du decoupage 2026 (69 wilayas). Les
  // tarifs qu'il porte ne sont qu'une proposition de depart, echelonnee du nord
  // vers le sud : le back-office les redefinit librement.
  const geo = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "prisma", "algerie.json"), "utf8")
  ) as {
    wilayas: { code: number; name: string; nameAr: string; shippingFee: number }[];
    communes: { wilaya: number; name: string; nameAr: string; postCode: string }[];
  };

  await db.wilaya.createMany({
    data: geo.wilayas.map((w) => ({
      code: w.code,
      name: w.name,
      nameAr: w.nameAr,
      shippingFee: w.shippingFee,
    })),
  });

  // 1600 communes : on insere par lots, un createMany unique saturant SQLite.
  for (let i = 0; i < geo.communes.length; i += 200) {
    await db.commune.createMany({
      data: geo.communes.slice(i, i + 200).map((c) => ({
        wilayaCode: c.wilaya,
        name: c.name,
        nameAr: c.nameAr,
        postCode: c.postCode,
      })),
    });
  }
  console.log(`  ${geo.wilayas.length} wilayas, ${geo.communes.length} communes`);

  /**
   * Destinations tirees au sort pour les commandes de demonstration : les
   * grandes agglomerations, pour que le back-office montre des livraisons
   * plausibles plutot que 48 villages differents.
   */
  const destinations = [16, 31, 25, 19, 9, 6, 15, 23, 13, 5]
    .map((code) => {
      const wilaya = geo.wilayas.find((w) => w.code === code)!;
      const communes = geo.communes.filter((c) => c.wilaya === code);
      return {
        code,
        name: wilaya.name,
        commune: communes[0]?.name ?? wilaya.name,
        fee: wilaya.shippingFee,
      };
    })
    .filter(Boolean);

  console.log("Categories et marques...");
  const categories = new Map<string, string>();
  for (const c of CATEGORIES) {
    // nameAr sert la traduction arabe, il n'est pas une colonne de Category.
    const { nameAr, ...donnees } = c;
    const row = await db.category.create({ data: donnees });
    categories.set(c.slug, row.id);
    if (nameAr) {
      await db.categoryTranslation.create({
        data: { categoryId: row.id, locale: "ar", name: nameAr },
      });
    }
  }
  const brands = new Map<string, string>();
  for (const b of BRANDS) {
    const row = await db.brand.create({ data: b });
    brands.set(b.slug, row.id);
  }

  console.log(`Produits et visuels (${PRODUCTS.length})...`);
  const productIds: string[] = [];
  for (const [index, p] of PRODUCTS.entries()) {
    const mainUrl = writeDevice(p.slug, p.kind, p.frame, p.screen);
    const images = [{ url: mainUrl, alt: p.title, sortOrder: 0 }];

    /**
     * Une declinaison recoit son propre visuel : la meme forme, dessinee avec
     * la teinte de la couleur. C'est ce qui permet a la fiche de changer
     * d'image quand on choisit une pastille.
     */
    const declinaisons = (p.variants ?? []).map((v, rang) => {
      const nomFichier = `${p.slug}-${v.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
      const url = writeDevice(nomFichier, p.kind, v.hex, p.screen);
      if (rang > 0) images.push({ url, alt: `${p.title} - ${v.name}`, sortOrder: rang });
      return {
        name: v.name,
        nameAr: v.nameAr,
        hex: v.hex,
        stock: v.stock,
        imageUrl: url,
        sortOrder: rang,
      };
    });

    const sku = `PRV-${String(index + 1).padStart(4, "0")}`;
    const extra = EXTRA_DESCRIPTIONS[p.slug];
    const description = extra ? `${p.description}\n\n${extra}` : p.description;

    const product = await db.product.create({
      data: {
        slug: p.slug,
        title: p.title,
        subtitle: p.subtitle,
        description,
        price: p.price,
        compareAtPrice: p.compareAtPrice ?? null,
        stock: declinaisons.length
          ? declinaisons.reduce((somme, v) => somme + v.stock, 0)
          : p.stock,
        sku,
        condition: "NEW",
        minOrder: p.minOrder ?? 1,
        readyToShip: p.stock > 0,
        featured: p.featured ?? false,
        active: true,
        soldCount: p.soldCount,
        warrantyValue: p.warrantyValue ?? 12,
        warrantyUnit: p.warrantyUnit ?? "MONTH",
        categoryId: categories.get(p.category)!,
        brandId: brands.get(p.brand)!,
        searchText: buildSearchText({
          title: p.title,
          subtitle: p.subtitle,
          description,
          sku,
          brand: BRANDS.find((b) => b.slug === p.brand)!.name,
          category: CATEGORIES.find((c) => c.slug === p.category)!.name,
          specs: p.specs.map(([label, value]) => ({ label, value })),
        }),
        createdAt: daysAgo(between(2, 180)),
        images: { create: images },
        variants: declinaisons.length ? { create: declinaisons } : undefined,
        specs: {
          create: p.specs.map(([label, value], i) => ({ label, value, sortOrder: i })),
        },
      },
    });
    productIds.push(product.id);
  }

  console.log("Comptes utilisateurs...");
  const adminPassword = await bcrypt.hash("admin123", 10);
  const customerPassword = await bcrypt.hash("demo1234", 10);

  const admin = await db.user.create({
    data: {
      email: "admin@pravia.com",
      passwordHash: adminPassword,
      name: "Nabil Ould Terki",
      role: "ADMIN",
      avatarColor: "#6366f1",
      phone: "+33 6 12 34 56 78",
    },
  });

  const customers = [];
  for (const c of CUSTOMERS) {
    const user = await db.user.create({
      data: {
        email: c.email,
        passwordHash: customerPassword,
        name: `${c.first} ${c.last}`,
        role: "CUSTOMER",
        avatarColor: c.color,
        createdAt: daysAgo(between(30, 300)),
        addresses: {
          create: {
            label: "Domicile",
            firstName: c.first,
            lastName: c.last,
            wilayaCode: pick(destinations).code,
            commune: pick(destinations).commune,
            isDefault: true,
          },
        },
      },
      include: { addresses: true },
    });
    customers.push(user);
  }

  console.log("Avis clients...");
  for (const productId of productIds) {
    const count = between(0, 4);
    const shuffled = [...customers].sort(() => rand() - 0.5).slice(0, count);
    for (const customer of shuffled) {
      const review = pick(REVIEW_POOL);
      await db.review.create({
        data: {
          productId,
          userId: customer.id,
          rating: review.rating,
          title: review.title,
          body: review.body,
          status: rand() > 0.9 ? "PENDING" : "PUBLISHED",
          createdAt: daysAgo(between(1, 120)),
        },
      });
    }
  }

  console.log("Commandes de demonstration...");
  const allProducts = await db.product.findMany({
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
  });

  const statuses = ["PENDING", "PAID", "PAID", "SHIPPED", "SHIPPED", "DELIVERED", "DELIVERED", "DELIVERED", "CANCELLED"];

  for (let i = 0; i < 48; i++) {
    const customer = pick(customers);
    const address = customer.addresses[0];
    const destination = pick(destinations);
    const lineCount = between(1, 3);
    const chosen: typeof allProducts = [];
    while (chosen.length < lineCount) {
      const candidate = pick(allProducts);
      if (!chosen.some((c) => c.id === candidate.id)) chosen.push(candidate);
    }

    const items = chosen.map((product) => ({
      productId: product.id,
      titleSnapshot: product.title,
      priceSnapshot: product.price,
      imageSnapshot: product.images[0]?.url ?? null,
      quantity: between(1, 2),
    }));

    const subtotal = items.reduce((sum, item) => sum + item.priceSnapshot * item.quantity, 0);
    // Memes regles que la boutique : gratuit au-dela du seuil, sinon le tarif
    // de la wilaya de destination.
    const shipping = subtotal >= 30000000 ? 0 : destination.fee;
    const tax = Math.round((subtotal * 0.19) / 1.19);
    const createdAt = daysAgo(between(0, 89));
    const status = pick(statuses);

    await db.order.create({
      data: {
        number: `PRV-${createdAt.getFullYear()}-${String(1000 + i)}`,
        userId: customer.id,
        status,
        subtotal,
        shipping,
        tax,
        total: subtotal + shipping,
        paymentMethod: "CASH",
        shipFirstName: address.firstName,
        shipLastName: address.lastName,
        shipWilayaCode: destination.code,
        shipWilaya: destination.name,
        shipCommune: destination.commune,
        trackingNumber: ["SHIPPED", "DELIVERED"].includes(status)
          ? `PRV${between(100000000, 999999999)}DZ`
          : null,
        createdAt,
        updatedAt: createdAt,
        items: { create: items },
      },
    });
  }

  console.log("Panier de demonstration...");
  await db.cartItem.createMany({
    data: [
      { userId: customers[0].id, productId: productIds[0], quantity: 1 },
      { userId: customers[0].id, productId: productIds[21], quantity: 2 },
    ],
  });
  await db.wishlistItem.createMany({
    data: [
      { userId: customers[0].id, productId: productIds[3] },
      { userId: customers[0].id, productId: productIds[10] },
    ],
  });

  console.log("Reglages de la boutique...");
  await db.setting.createMany({
    data: [
      { key: "store.name", value: "Pravia" },
      { key: "store.tagline", value: "La marketplace du materiel technologique" },
      { key: "store.email", value: "contact@pravia.com" },
      { key: "store.phone", value: "+33 1 84 80 00 00" },
      { key: "store.currency", value: "DZD" },
      { key: "shipping.freeThreshold", value: "30000000" },
      { key: "banner.text", value: "Livraison offerte des 300 000 DA - Retours gratuits sous 30 jours" },
      // Le bandeau se decline par langue : la cle suffixee prime sur la generique.
      { key: "banner.text.en", value: "Free delivery over 300,000 DA - Free returns within 30 days" },
      { key: "banner.text.ar", value: "شحن مجاني ابتداءً من 300000 دج - إرجاع مجاني خلال 30 يومًا" },
    ],
  });

  console.log("Referencement et recherche...");
  await db.seoPage.deleteMany();
  await db.searchSynonym.deleteMany();
  await db.searchQuery.deleteMany();

  await db.seoPage.createMany({
    data: [
      {
        path: "/",
        label: "Accueil",
        metaTitle: "Pravia - Materiel technologique neuf et reconditionne",
        metaDescription:
          "40 references high-tech selectionnees : smartphones, ordinateurs, audio, gaming et composants. Garantie jusqu'a 24 mois, livraison offerte des 150 EUR, retours gratuits 30 jours.",
        changeFrequency: "daily",
        priority: 1,
      },
      {
        path: "/produits",
        label: "Catalogue",
        metaTitle: "Catalogue high-tech - smartphones, ordinateurs, gaming",
        metaDescription:
          "Parcourez tout le catalogue Pravia et filtrez par categorie, marque, etat et budget. Produits neufs et reconditionnes, expedies sous 24 h.",
        changeFrequency: "daily",
        priority: 0.9,
      },
      {
        path: "/aide",
        label: "Centre d'aide",
        metaTitle: "Centre d'aide - livraison, retours et garanties",
        metaDescription:
          "Delais de livraison, retours gratuits sous 30 jours, garanties jusqu'a 24 mois, moyens de paiement et espace vendeur : toutes les reponses.",
        changeFrequency: "monthly",
        priority: 0.6,
      },
      {
        path: "/connexion",
        label: "Connexion",
        metaTitle: "Connexion a votre compte",
        metaDescription: "Accedez a vos commandes, vos favoris et votre panier Pravia.",
        noIndex: true,
        inSitemap: false,
        priority: 0.1,
      },
      {
        path: "/inscription",
        label: "Inscription",
        metaTitle: "Creer un compte Pravia",
        metaDescription:
          "Creez votre compte pour suivre vos commandes et retrouver votre panier sur tous vos appareils.",
        changeFrequency: "yearly",
        priority: 0.3,
      },
    ],
  });

  await db.searchSynonym.createMany({
    data: [
      { term: "pc portable", targets: "ordinateur portable" },
      { term: "laptop", targets: "ordinateur portable" },
      { term: "portable", targets: "ordinateur portable" },
      { term: "telephone", targets: "smartphone" },
      { term: "mobile", targets: "smartphone" },
      { term: "casque", targets: "audio casque" },
      { term: "ecouteurs", targets: "audio ecouteurs" },
      { term: "carte graphique", targets: "geforce rtx" },
      { term: "console", targets: "gaming console playstation xbox nintendo" },
      { term: "montre", targets: "montres connectees watch" },
      { term: "apple", targets: "apple" },
    ],
  });

  // Quelques recherches passees pour que les statistiques ne soient pas vides.
  const SAMPLE_SEARCHES: [string, number][] = [
    ["iphone", 5], ["iphone", 5], ["iphone", 5], ["macbook", 3], ["macbook", 3],
    ["samsung", 6], ["casque bluetooth", 0], ["rtx 4090", 0], ["ipad", 2],
    ["playstation", 1], ["pc portable gamer", 2], ["montre connectee", 3],
    ["chargeur usb c", 0], ["ecran 4k", 2], ["xiaomi", 2], ["airpods", 1],
  ];
  for (const [term, results] of SAMPLE_SEARCHES) {
    await db.searchQuery.create({
      data: {
        term,
        normalized: term,
        results,
        createdAt: daysAgo(between(0, 25)),
      },
    });
  }

  const counts = {
    categories: CATEGORIES.length,
    marques: BRANDS.length,
    produits: PRODUCTS.length,
    utilisateurs: customers.length + 1,
    commandes: 48,
    avis: await db.review.count(),
  };

  console.log("\nBase prete :", counts);
  console.log(`\n  Admin    : admin@pravia.com / admin123`);
  console.log(`  Client   : camille@exemple.fr / demo1234`);
  void admin;
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
