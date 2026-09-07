/**
 * Jeu de donnees de demarrage pour Pravia.
 * Idempotent : relancable a volonte (`npm run db:seed`).
 */
import fs from "node:fs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { writeDevice, type DeviceKind, type ScreenPalette } from "../scripts/gen-images.mjs";
import bcrypt from "bcryptjs";
import { buildSearchText } from "../src/lib/search.js";
import { EXTRA_DESCRIPTIONS } from "./descriptions.js";

for (const file of [".env.local", ".env"]) {
  if (fs.existsSync(file)) process.loadEnvFile(file);
}

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" });
const db = new PrismaClient({ adapter });

/* ------------------------------------------------------------------ helpers */

const euros = (value: number) => Math.round(value * 100);

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

const CATEGORIES = [
  {
    name: "Smartphones",
    slug: "smartphones",
    icon: "smartphone",
    sortOrder: 1,
    description: "Les derniers flagships et les meilleurs rapports qualite-prix.",
    metaTitle: "Smartphones neufs et reconditionnes",
    metaDescription:
      "Comparez les smartphones Apple, Samsung, Xiaomi et Google : fiches detaillees, avis verifies et garantie jusqu'a 24 mois. Livraison offerte des 150 EUR.",
  },
  {
    name: "Ordinateurs portables",
    slug: "ordinateurs-portables",
    icon: "laptop",
    sortOrder: 2,
    description: "Ultrabooks, stations de travail et portables gaming.",
    metaTitle: "Ordinateurs portables : ultrabooks, gaming et pro",
    metaDescription:
      "Ultrabooks, stations de travail et portables gaming selectionnes. Caracteristiques completes, conseils d'usage et garantie constructeur incluse.",
  },
  {
    name: "Tablettes",
    slug: "tablettes",
    icon: "tablet",
    sortOrder: 3,
    description: "Pour creer, lire et travailler en mobilite.",
    metaTitle: "Tablettes tactiles Apple, Samsung et Xiaomi",
    metaDescription:
      "iPad, Galaxy Tab et alternatives Android pour creer, lire et travailler en mobilite. Comparatif des formats, des stylets et des autonomies.",
  },
  {
    name: "Audio",
    slug: "audio",
    icon: "headphones",
    sortOrder: 4,
    description: "Casques, ecouteurs et enceintes haute fidelite.",
    metaTitle: "Casques, ecouteurs et enceintes sans fil",
    metaDescription:
      "Reduction de bruit active, autonomie et qualite sonore : notre selection de casques, ecouteurs et enceintes Bluetooth, testes et garantis 24 mois.",
  },
  {
    name: "Montres connectees",
    slug: "montres-connectees",
    icon: "watch",
    sortOrder: 5,
    description: "Sante, sport et notifications au poignet.",
    metaTitle: "Montres connectees sport et sante",
    metaDescription:
      "Suivi cardiaque, sommeil et notifications au poignet. Apple Watch, Galaxy Watch et Pixel Watch avec garantie et retours gratuits sous 30 jours.",
  },
  {
    name: "Gaming",
    slug: "gaming",
    icon: "gamepad-2",
    sortOrder: 6,
    description: "Consoles, manettes et peripheriques de competition.",
    metaTitle: "Consoles, manettes et peripheriques gaming",
    metaDescription:
      "PlayStation, Xbox, Nintendo Switch et peripheriques esport. Stock verifie, expedition sous 24 h et garantie constructeur de 24 mois.",
  },
  {
    name: "Photo & Video",
    slug: "photo-video",
    icon: "camera",
    sortOrder: 7,
    description: "Hybrides, action cams et drones.",
    metaTitle: "Appareils photo hybrides, action cams et drones",
    metaDescription:
      "Boitiers plein format, action cams etanches et drones de moins de 250 g. Fiches techniques completes et conseils de prise en main.",
  },
  {
    name: "Composants",
    slug: "composants",
    icon: "cpu",
    sortOrder: 8,
    description: "Cartes graphiques et pieces pour monter sa machine.",
    metaTitle: "Cartes graphiques et composants PC",
    metaDescription:
      "GeForce RTX et composants pour monter ou faire evoluer sa machine. Performances reelles en 1440p et 4K detaillees sur chaque fiche produit.",
  },
  {
    name: "Ecrans & Peripheriques",
    slug: "ecrans-peripheriques",
    icon: "monitor",
    sortOrder: 9,
    description: "Moniteurs, claviers et souris.",
    metaTitle: "Ecrans, claviers et souris",
    metaDescription:
      "Moniteurs 4K et OLED haute frequence, claviers et souris pour le travail comme pour le jeu. Ergonomie, connectique et garanties detaillees.",
  },
];

const BRANDS = [
  { name: "Apple", slug: "apple", accent: "#0ea5e9" },
  { name: "Samsung", slug: "samsung", accent: "#3b82f6" },
  { name: "Xiaomi", slug: "xiaomi", accent: "#f97316" },
  { name: "Google", slug: "google", accent: "#22c55e" },
  { name: "Sony", slug: "sony", accent: "#8b5cf6" },
  { name: "Dell", slug: "dell", accent: "#0284c7" },
  { name: "Asus", slug: "asus", accent: "#e11d48" },
  { name: "Lenovo", slug: "lenovo", accent: "#dc2626" },
  { name: "Microsoft", slug: "microsoft", accent: "#0891b2" },
  { name: "Nvidia", slug: "nvidia", accent: "#84cc16" },
  { name: "Bose", slug: "bose", accent: "#64748b" },
  { name: "Logitech", slug: "logitech", accent: "#06b6d4" },
  { name: "DJI", slug: "dji", accent: "#475569" },
  { name: "Nintendo", slug: "nintendo", accent: "#ef4444" },
  { name: "GoPro", slug: "gopro", accent: "#0d9488" },
];

type SeedProduct = {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  category: string;
  brand: string;
  kind: DeviceKind;
  frame: string;
  screen: ScreenPalette;
  altKind?: DeviceKind;
  storage?: string;
  color?: string;
  carrier?: string;
  condition?: "NEW" | "REFURBISHED" | "SECOND_HAND";
  stock: number;
  featured?: boolean;
  tradeAssurance?: boolean;
  minOrder?: number;
  soldCount: number;
  specs: [string, string][];
};

const PRODUCTS: SeedProduct[] = [
  {
    slug: "galaxy-s23-ultra",
    title: "Galaxy S23 Ultra",
    subtitle: "Ecran 6.8\" Dynamic AMOLED 2X, S Pen integre",
    description:
      "Le Galaxy S23 Ultra combine un capteur principal de 200 Mpx, un Snapdragon 8 Gen 2 optimise pour Galaxy et un S Pen loge dans le chassis. Son ecran 6.8 pouces monte a 120 Hz adaptatif et culmine a 1750 nits en plein soleil. La batterie 5000 mAh tient sans effort une journee intensive.",
    price: euros(1199.99),
    compareAtPrice: euros(1419.99),
    category: "smartphones",
    brand: "samsung",
    kind: "phone",
    frame: "#3f4b3f",
    screen: "jade",
    altKind: "phoneBack",
    storage: "256GB",
    color: "Vert",
    carrier: "T-Mobile",
    stock: 42,
    featured: true,
    tradeAssurance: true,
    soldCount: 1284,
    specs: [
      ["Ecran", "6.8\" Dynamic AMOLED 2X, 120 Hz"],
      ["Processeur", "Snapdragon 8 Gen 2 for Galaxy"],
      ["Camera", "200 Mpx + 12 Mpx UW + 2x 10 Mpx tele"],
      ["Batterie", "5000 mAh, charge 45 W"],
      ["RAM", "12 Go"],
    ],
  },
  {
    slug: "galaxy-s23",
    title: "Galaxy S23",
    subtitle: "Le flagship compact, 6.1 pouces",
    description:
      "Format compact, performances de haut vol. Le Galaxy S23 embarque le meme Snapdragon 8 Gen 2 que son grand frere dans un chassis de 6.1 pouces facile a tenir en main. Photo de nuit nettement amelioree et autonomie en hausse de 20 %.",
    price: euros(799.99),
    compareAtPrice: euros(959.0),
    category: "smartphones",
    brand: "samsung",
    kind: "phone",
    frame: "#e8e3d8",
    screen: "ember",
    altKind: "phoneBack",
    storage: "128GB",
    color: "Cream",
    carrier: "T-Mobile",
    stock: 63,
    featured: true,
    tradeAssurance: true,
    soldCount: 2140,
    specs: [
      ["Ecran", "6.1\" Dynamic AMOLED 2X, 120 Hz"],
      ["Processeur", "Snapdragon 8 Gen 2 for Galaxy"],
      ["Camera", "50 Mpx + 12 Mpx UW + 10 Mpx tele"],
      ["Batterie", "3900 mAh, charge 25 W"],
      ["RAM", "8 Go"],
    ],
  },
  {
    slug: "galaxy-z-fold4",
    title: "Galaxy Z Fold4",
    subtitle: "Pliable, ecran interne 7.6 pouces",
    description:
      "Un smartphone qui devient tablette. Le Z Fold4 deplie un ecran interne de 7.6 pouces avec support du S Pen, gere le multitache sur trois fenetres et repose sur une charniere Flex certifiee 200 000 pliages.",
    price: euros(1600.99),
    compareAtPrice: euros(1899.0),
    category: "smartphones",
    brand: "samsung",
    kind: "foldable",
    frame: "#4b5563",
    screen: "aurora",
    storage: "512GB",
    color: "Graygreen",
    carrier: "SM-F936U1",
    stock: 18,
    featured: true,
    tradeAssurance: true,
    soldCount: 486,
    specs: [
      ["Ecran interne", "7.6\" AMOLED 120 Hz"],
      ["Ecran externe", "6.2\" AMOLED 120 Hz"],
      ["Processeur", "Snapdragon 8+ Gen 1"],
      ["Batterie", "4400 mAh"],
      ["RAM", "12 Go"],
    ],
  },
  {
    slug: "iphone-14-pro-max",
    title: "iPhone 14 Pro Max",
    subtitle: "Dynamic Island et capteur 48 Mpx",
    description:
      "L'iPhone 14 Pro Max introduit la Dynamic Island, un ecran always-on et un capteur principal de 48 Mpx. La puce A16 Bionic reste la reference en photo computationnelle et en efficacite energetique.",
    price: euros(1000.99),
    compareAtPrice: euros(1279.0),
    category: "smartphones",
    brand: "apple",
    kind: "phone",
    frame: "#4c3f5a",
    screen: "violet",
    altKind: "phoneBack",
    storage: "512GB",
    color: "Deep Purple",
    carrier: "T-Mobile",
    stock: 37,
    featured: true,
    tradeAssurance: true,
    soldCount: 3021,
    specs: [
      ["Ecran", "6.7\" Super Retina XDR, ProMotion"],
      ["Puce", "A16 Bionic"],
      ["Camera", "48 Mpx + 12 Mpx UW + 12 Mpx tele"],
      ["Autonomie", "Jusqu'a 29 h de video"],
      ["Resistance", "IP68"],
    ],
  },
  {
    slug: "galaxy-s21-fe-5g",
    title: "Galaxy S21 FE 5G",
    subtitle: "Fan Edition, le flagship accessible",
    description:
      "La Fan Edition reprend l'essentiel du S21 : ecran 120 Hz, triple capteur et 5G, a un tarif nettement plus doux. Un excellent choix en reconditionne.",
    price: euros(499.99),
    compareAtPrice: euros(699.0),
    category: "smartphones",
    brand: "samsung",
    kind: "phone",
    frame: "#c8b6c8",
    screen: "rose",
    storage: "128GB",
    color: "Lavender",
    carrier: "SM-F721U1",
    condition: "REFURBISHED",
    stock: 24,
    soldCount: 892,
    specs: [
      ["Ecran", "6.4\" Dynamic AMOLED 2X, 120 Hz"],
      ["Processeur", "Exynos 2100"],
      ["Camera", "12 Mpx + 12 Mpx UW + 8 Mpx tele"],
      ["Batterie", "4500 mAh"],
      ["RAM", "6 Go"],
    ],
  },
  {
    slug: "iphone-14",
    title: "iPhone 14",
    subtitle: "A15 Bionic, detection des accidents",
    description:
      "L'iPhone 14 mise sur l'essentiel : puce A15 Bionic cinq coeurs, mode Action pour la video et detection des accidents. Un capteur principal plus lumineux ameliore nettement les photos de nuit.",
    price: euros(699.0),
    compareAtPrice: euros(869.0),
    category: "smartphones",
    brand: "apple",
    kind: "phone",
    frame: "#1e293b",
    screen: "aurora",
    altKind: "phoneBack",
    storage: "512GB",
    color: "Midnight",
    carrier: "T-Mobile",
    stock: 55,
    tradeAssurance: true,
    soldCount: 1976,
    specs: [
      ["Ecran", "6.1\" Super Retina XDR"],
      ["Puce", "A15 Bionic"],
      ["Camera", "12 Mpx + 12 Mpx ultra grand-angle"],
      ["Autonomie", "Jusqu'a 20 h de video"],
      ["Resistance", "IP68"],
    ],
  },
  {
    slug: "iphone-13",
    title: "iPhone 13",
    subtitle: "Le meilleur rapport qualite-prix Apple",
    description:
      "Toujours d'actualite, l'iPhone 13 offre un ecran Super Retina XDR, la puce A15 et le mode Cinematique. Une valeur sure pour qui veut entrer dans l'ecosysteme Apple sans se ruiner.",
    price: euros(599.0),
    compareAtPrice: euros(749.0),
    category: "smartphones",
    brand: "apple",
    kind: "phone",
    frame: "#2f5241",
    screen: "jade",
    storage: "256GB",
    color: "Alpine Green",
    carrier: "T-Mobile",
    stock: 48,
    soldCount: 2687,
    specs: [
      ["Ecran", "6.1\" Super Retina XDR"],
      ["Puce", "A15 Bionic"],
      ["Camera", "12 Mpx double capteur"],
      ["Autonomie", "Jusqu'a 19 h de video"],
      ["Resistance", "IP68"],
    ],
  },
  {
    slug: "iphone-12",
    title: "iPhone 12",
    subtitle: "Design a bords plats, 5G",
    description:
      "Le modele qui a inaugure le design a bords plats et la 5G chez Apple. Reconditionne grade A, batterie testee a plus de 85 % de sa capacite d'origine.",
    price: euros(449.0),
    compareAtPrice: euros(609.0),
    category: "smartphones",
    brand: "apple",
    kind: "phone",
    frame: "#7c5aa8",
    screen: "violet",
    storage: "128GB",
    color: "Purple",
    carrier: "T-Mobile",
    condition: "REFURBISHED",
    stock: 31,
    soldCount: 3410,
    specs: [
      ["Ecran", "6.1\" Super Retina XDR"],
      ["Puce", "A14 Bionic"],
      ["Camera", "12 Mpx double capteur"],
      ["Reseau", "5G"],
      ["Resistance", "IP68"],
    ],
  },
  {
    slug: "xiaomi-14-ultra",
    title: "Xiaomi 14 Ultra",
    subtitle: "Optique Leica, capteur 1 pouce",
    description:
      "Un veritable appareil photo dote d'un telephone. Capteur 1 pouce signe Leica, ouverture variable f/1.63-f/4.0 et enregistrement 8K. Le Snapdragon 8 Gen 3 assure la puissance.",
    price: euros(1299.0),
    category: "smartphones",
    brand: "xiaomi",
    kind: "phone",
    frame: "#111827",
    screen: "gold",
    altKind: "phoneBack",
    storage: "512GB",
    color: "Noir",
    stock: 21,
    featured: true,
    tradeAssurance: true,
    soldCount: 340,
    specs: [
      ["Ecran", "6.73\" AMOLED LTPO 120 Hz"],
      ["Processeur", "Snapdragon 8 Gen 3"],
      ["Camera", "Quad 50 Mpx Leica, capteur 1\""],
      ["Batterie", "5300 mAh, charge 90 W"],
      ["RAM", "16 Go"],
    ],
  },
  {
    slug: "pixel-8-pro",
    title: "Pixel 8 Pro",
    subtitle: "Tensor G3 et 7 ans de mises a jour",
    description:
      "Le Pixel 8 Pro pousse la photo computationnelle avec Gomme magique audio et Retouche magique. Google s'engage sur sept ans de mises a jour systeme et de securite.",
    price: euros(1099.0),
    compareAtPrice: euros(1199.0),
    category: "smartphones",
    brand: "google",
    kind: "phone",
    frame: "#334155",
    screen: "cyan",
    storage: "256GB",
    color: "Bay",
    stock: 29,
    tradeAssurance: true,
    soldCount: 712,
    specs: [
      ["Ecran", "6.7\" Super Actua LTPO 120 Hz"],
      ["Processeur", "Google Tensor G3"],
      ["Camera", "50 Mpx + 48 Mpx UW + 48 Mpx tele"],
      ["Suivi", "7 ans de mises a jour"],
      ["RAM", "12 Go"],
    ],
  },

  /* -------------------------------------------------- ordinateurs portables */
  {
    slug: "macbook-pro-14-m3-pro",
    title: "MacBook Pro 14\" M3 Pro",
    subtitle: "Ecran Liquid Retina XDR, 18 Go",
    description:
      "La puce M3 Pro grave en 3 nm apporte un bond de performance sur les charges creatives : montage multicam, compilation, rendu 3D. L'ecran Liquid Retina XDR monte a 1600 nits en pointe HDR.",
    price: euros(2499.0),
    compareAtPrice: euros(2699.0),
    category: "ordinateurs-portables",
    brand: "apple",
    kind: "laptop",
    frame: "#3f3f46",
    screen: "violet",
    storage: "512GB SSD",
    color: "Noir sideral",
    stock: 16,
    featured: true,
    tradeAssurance: true,
    soldCount: 428,
    specs: [
      ["Puce", "Apple M3 Pro 11 coeurs"],
      ["Ecran", "14.2\" Liquid Retina XDR 120 Hz"],
      ["Memoire", "18 Go unifiee"],
      ["Autonomie", "Jusqu'a 18 h"],
      ["Connectique", "3x Thunderbolt 4, HDMI, SDXC"],
    ],
  },
  {
    slug: "macbook-air-15-m3",
    title: "MacBook Air 15\" M3",
    subtitle: "1,51 kg, silencieux, sans ventilateur",
    description:
      "Le grand ecran du Air 15 pouces dans un chassis de 11,5 mm. Aucun ventilateur, donc aucun bruit, et une autonomie qui depasse largement la journee de travail.",
    price: euros(1599.0),
    category: "ordinateurs-portables",
    brand: "apple",
    kind: "laptop",
    frame: "#94a3b8",
    screen: "aurora",
    storage: "512GB SSD",
    color: "Lumiere stellaire",
    stock: 27,
    featured: true,
    soldCount: 651,
    specs: [
      ["Puce", "Apple M3 8 coeurs"],
      ["Ecran", "15.3\" Liquid Retina"],
      ["Memoire", "16 Go unifiee"],
      ["Autonomie", "Jusqu'a 18 h"],
      ["Poids", "1,51 kg"],
    ],
  },
  {
    slug: "dell-xps-15",
    title: "Dell XPS 15",
    subtitle: "OLED 3.5K, Core Ultra 7",
    description:
      "Chassis usine dans la masse, ecran OLED 3.5K couvrant 100 % du DCI-P3 et Core Ultra 7 avec NPU dedie. Un portable de creation credible face au MacBook Pro.",
    price: euros(2199.0),
    compareAtPrice: euros(2449.0),
    category: "ordinateurs-portables",
    brand: "dell",
    kind: "laptop",
    frame: "#71717a",
    screen: "cyan",
    storage: "1TB SSD",
    color: "Platine",
    stock: 12,
    tradeAssurance: true,
    soldCount: 218,
    specs: [
      ["Processeur", "Intel Core Ultra 7 155H"],
      ["Ecran", "15.6\" OLED 3.5K tactile"],
      ["Memoire", "32 Go DDR5"],
      ["Graphique", "RTX 4050 6 Go"],
      ["Poids", "1,86 kg"],
    ],
  },
  {
    slug: "asus-rog-zephyrus-g14",
    title: "Asus ROG Zephyrus G14",
    subtitle: "Gaming 14 pouces, RTX 4070",
    description:
      "Le portable gaming compact de reference. Ryzen 9, RTX 4070 et ecran OLED 120 Hz dans 1,5 kg. Le systeme de refroidissement a metal liquide garde les temperatures sous controle.",
    price: euros(1899.0),
    compareAtPrice: euros(2099.0),
    category: "ordinateurs-portables",
    brand: "asus",
    kind: "laptop",
    frame: "#18181b",
    screen: "rose",
    storage: "1TB SSD",
    color: "Eclipse Gray",
    stock: 14,
    featured: true,
    soldCount: 376,
    specs: [
      ["Processeur", "AMD Ryzen 9 8945HS"],
      ["Graphique", "GeForce RTX 4070 8 Go"],
      ["Ecran", "14\" OLED 3K 120 Hz"],
      ["Memoire", "32 Go LPDDR5X"],
      ["Poids", "1,5 kg"],
    ],
  },
  {
    slug: "lenovo-thinkpad-x1-carbon",
    title: "ThinkPad X1 Carbon Gen 12",
    subtitle: "1,09 kg, certifie MIL-STD",
    description:
      "Le portable professionnel par excellence : clavier de reference, chassis en fibre de carbone certifie MIL-STD-810H et connectique complete. Gestion a distance vPro incluse.",
    price: euros(1749.0),
    category: "ordinateurs-portables",
    brand: "lenovo",
    kind: "laptop",
    frame: "#27272a",
    screen: "slate",
    storage: "512GB SSD",
    color: "Noir",
    stock: 19,
    tradeAssurance: true,
    minOrder: 1,
    soldCount: 289,
    specs: [
      ["Processeur", "Intel Core Ultra 7 165U vPro"],
      ["Ecran", "14\" WUXGA IPS antireflet"],
      ["Memoire", "32 Go LPDDR5X"],
      ["Poids", "1,09 kg"],
      ["Securite", "TPM 2.0, lecteur d'empreinte"],
    ],
  },
  {
    slug: "surface-laptop-studio-2",
    title: "Surface Laptop Studio 2",
    subtitle: "Ecran pivotant, stylet Slim Pen 2",
    description:
      "Une charniere unique permet de basculer l'ecran en mode studio pour dessiner au stylet. RTX 4060 et Core i7 13e generation pour les charges creatives lourdes.",
    price: euros(2399.0),
    compareAtPrice: euros(2599.0),
    category: "ordinateurs-portables",
    brand: "microsoft",
    kind: "laptop",
    frame: "#52525b",
    screen: "cyan",
    storage: "1TB SSD",
    color: "Platine",
    stock: 9,
    soldCount: 134,
    specs: [
      ["Processeur", "Intel Core i7-13700H"],
      ["Graphique", "GeForce RTX 4060 8 Go"],
      ["Ecran", "14.4\" PixelSense Flow 120 Hz"],
      ["Memoire", "32 Go LPDDR5X"],
      ["Stylet", "Compatible Slim Pen 2"],
    ],
  },

  /* ------------------------------------------------------------- tablettes */
  {
    slug: "ipad-pro-13-m4",
    title: "iPad Pro 13\" M4",
    subtitle: "Ecran Ultra Retina XDR tandem OLED",
    description:
      "Le plus fin des produits Apple, 5,1 mm, avec un ecran tandem OLED qui atteint 1600 nits en HDR. La puce M4 devance la plupart des ordinateurs portables du marche.",
    price: euros(1469.0),
    category: "tablettes",
    brand: "apple",
    kind: "tablet",
    frame: "#3f3f46",
    screen: "aurora",
    storage: "512GB",
    color: "Noir sideral",
    stock: 23,
    featured: true,
    tradeAssurance: true,
    soldCount: 512,
    specs: [
      ["Puce", "Apple M4"],
      ["Ecran", "13\" Ultra Retina XDR tandem OLED"],
      ["Epaisseur", "5,1 mm"],
      ["Stylet", "Apple Pencil Pro"],
      ["Connectique", "Thunderbolt / USB 4"],
    ],
  },
  {
    slug: "galaxy-tab-s9-ultra",
    title: "Galaxy Tab S9 Ultra",
    subtitle: "14.6 pouces AMOLED, S Pen inclus",
    description:
      "La plus grande tablette Android : 14,6 pouces AMOLED 120 Hz, certification IP68 et S Pen fourni. DeX transforme la tablette en poste de travail complet.",
    price: euros(1249.0),
    compareAtPrice: euros(1419.0),
    category: "tablettes",
    brand: "samsung",
    kind: "tablet",
    frame: "#4b5563",
    screen: "violet",
    storage: "512GB",
    color: "Graphite",
    stock: 17,
    tradeAssurance: true,
    soldCount: 246,
    specs: [
      ["Ecran", "14.6\" Dynamic AMOLED 2X 120 Hz"],
      ["Processeur", "Snapdragon 8 Gen 2 for Galaxy"],
      ["Memoire", "12 Go"],
      ["Etancheite", "IP68"],
      ["Stylet", "S Pen inclus"],
    ],
  },
  {
    slug: "ipad-air-11-m2",
    title: "iPad Air 11\" M2",
    subtitle: "La polyvalence au juste prix",
    description:
      "La puce M2 dans un chassis leger, avec camera frontale recentree sur le bord paysage pour les visios. Compatible Apple Pencil Pro et Magic Keyboard.",
    price: euros(719.0),
    category: "tablettes",
    brand: "apple",
    kind: "tablet",
    frame: "#7dd3fc",
    screen: "cyan",
    storage: "256GB",
    color: "Bleu",
    stock: 34,
    soldCount: 703,
    specs: [
      ["Puce", "Apple M2"],
      ["Ecran", "11\" Liquid Retina"],
      ["Camera avant", "12 Mpx paysage"],
      ["Stylet", "Apple Pencil Pro"],
      ["Autonomie", "Jusqu'a 10 h"],
    ],
  },
  {
    slug: "xiaomi-pad-6-pro",
    title: "Xiaomi Pad 6 Pro",
    subtitle: "144 Hz, charge 67 W",
    description:
      "Une dalle 11 pouces 144 Hz, quatre haut-parleurs Dolby Atmos et une charge 67 W qui remplit la batterie en moins d'une heure. Rapport prix-prestations imbattable.",
    price: euros(449.0),
    compareAtPrice: euros(529.0),
    category: "tablettes",
    brand: "xiaomi",
    kind: "tablet",
    frame: "#1f2937",
    screen: "ember",
    storage: "256GB",
    color: "Noir",
    stock: 41,
    soldCount: 588,
    specs: [
      ["Ecran", "11\" IPS 144 Hz"],
      ["Processeur", "Snapdragon 8+ Gen 1"],
      ["Batterie", "8600 mAh, charge 67 W"],
      ["Audio", "4 haut-parleurs Dolby Atmos"],
      ["Memoire", "8 Go"],
    ],
  },

  /* ----------------------------------------------------------------- audio */
  {
    slug: "sony-wh-1000xm5",
    title: "Sony WH-1000XM5",
    subtitle: "Reduction de bruit de reference",
    description:
      "Huit microphones et deux processeurs pilotent une reduction de bruit qui reste la meilleure du marche. Trente heures d'autonomie et une charge rapide de 3 minutes pour 3 heures d'ecoute.",
    price: euros(349.0),
    compareAtPrice: euros(419.0),
    category: "audio",
    brand: "sony",
    kind: "headphones",
    frame: "#1f2937",
    screen: "violet",
    color: "Noir",
    stock: 58,
    featured: true,
    tradeAssurance: true,
    soldCount: 1893,
    specs: [
      ["Type", "Circum-aural sans fil"],
      ["Reduction de bruit", "Active, 8 micros"],
      ["Autonomie", "30 h avec ANC"],
      ["Codecs", "LDAC, AAC, SBC"],
      ["Poids", "250 g"],
    ],
  },
  {
    slug: "airpods-pro-2-usb-c",
    title: "AirPods Pro 2 USB-C",
    subtitle: "Audio adaptatif, boitier USB-C",
    description:
      "La puce H2 double la reduction de bruit par rapport a la premiere generation et introduit l'audio adaptatif, qui ajuste le niveau sonore en continu selon l'environnement.",
    price: euros(279.0),
    compareAtPrice: euros(299.0),
    category: "audio",
    brand: "apple",
    kind: "earbuds",
    frame: "#f4f4f5",
    screen: "aurora",
    color: "Blanc",
    stock: 76,
    featured: true,
    soldCount: 2450,
    specs: [
      ["Puce", "Apple H2"],
      ["Reduction de bruit", "Active + audio adaptatif"],
      ["Autonomie", "6 h, 30 h avec le boitier"],
      ["Connecteur", "USB-C"],
      ["Etancheite", "IP54"],
    ],
  },
  {
    slug: "bose-quietcomfort-ultra",
    title: "Bose QuietComfort Ultra",
    subtitle: "Audio immersif spatialise",
    description:
      "Bose signe son casque le plus confortable, avec un mode Immersive Audio qui spatialise n'importe quelle source stereo. Le silence obtenu en mode Quiet est saisissant.",
    price: euros(399.0),
    category: "audio",
    brand: "bose",
    kind: "headphones",
    frame: "#3f3f46",
    screen: "slate",
    color: "Noir",
    stock: 33,
    tradeAssurance: true,
    soldCount: 617,
    specs: [
      ["Type", "Circum-aural sans fil"],
      ["Modes", "Quiet, Aware, Immersion"],
      ["Autonomie", "24 h avec ANC"],
      ["Codecs", "aptX Adaptive, AAC, SBC"],
      ["Poids", "254 g"],
    ],
  },
  {
    slug: "sony-srs-xg300",
    title: "Sony SRS-XG300",
    subtitle: "Enceinte portable 25 h, IP67",
    description:
      "Une enceinte de fete transportable : 25 heures d'autonomie, certification IP67 et fonction batterie externe pour recharger un telephone.",
    price: euros(279.0),
    compareAtPrice: euros(349.0),
    category: "audio",
    brand: "sony",
    kind: "speaker",
    frame: "#27272a",
    screen: "ember",
    color: "Noir",
    stock: 29,
    soldCount: 421,
    specs: [
      ["Autonomie", "25 h"],
      ["Etancheite", "IP67"],
      ["Fonctions", "Batterie externe, eclairage"],
      ["Connexion", "Bluetooth 5.2, multipoint"],
      ["Poids", "3,1 kg"],
    ],
  },

  /* ------------------------------------------------------ montres connectees */
  {
    slug: "apple-watch-ultra-2",
    title: "Apple Watch Ultra 2",
    subtitle: "Titane, 3000 nits, plongee 40 m",
    description:
      "Boitier titane de 49 mm, ecran le plus lumineux jamais produit par Apple a 3000 nits, et une autonomie de 36 heures qui monte a 72 en mode economie. Certifiee pour la plongee jusqu'a 40 metres.",
    price: euros(899.0),
    category: "montres-connectees",
    brand: "apple",
    kind: "watch",
    frame: "#a1a1aa",
    screen: "ember",
    color: "Titane",
    stock: 26,
    featured: true,
    tradeAssurance: true,
    soldCount: 734,
    specs: [
      ["Boitier", "Titane 49 mm"],
      ["Ecran", "3000 nits, always-on"],
      ["Autonomie", "36 h, 72 h en economie"],
      ["Plongee", "Jusqu'a 40 m"],
      ["Puce", "S9 SiP"],
    ],
  },
  {
    slug: "galaxy-watch6-classic",
    title: "Galaxy Watch6 Classic",
    subtitle: "Lunette rotative, 47 mm",
    description:
      "Le retour de la lunette rotative physique, la meilleure facon de naviguer sur une montre. Suivi du sommeil avance et mesure de la composition corporelle.",
    price: euros(419.0),
    compareAtPrice: euros(489.0),
    category: "montres-connectees",
    brand: "samsung",
    kind: "watch",
    frame: "#3f3f46",
    screen: "aurora",
    color: "Noir",
    stock: 38,
    soldCount: 496,
    specs: [
      ["Boitier", "Acier 47 mm"],
      ["Ecran", "1.5\" Super AMOLED"],
      ["Navigation", "Lunette rotative"],
      ["Capteurs", "ECG, tension, composition corporelle"],
      ["Autonomie", "40 h"],
    ],
  },
  {
    slug: "pixel-watch-2",
    title: "Pixel Watch 2",
    subtitle: "Capteurs Fitbit, Wear OS 4",
    description:
      "Google integre les capteurs Fitbit de derniere generation : suivi cardiaque continu, capteur de temperature cutanee et detection du stress par activite electrodermale.",
    price: euros(349.0),
    compareAtPrice: euros(399.0),
    category: "montres-connectees",
    brand: "google",
    kind: "watch",
    frame: "#d4d4d8",
    screen: "jade",
    color: "Champagne",
    stock: 31,
    soldCount: 288,
    specs: [
      ["Boitier", "Aluminium 41 mm"],
      ["Systeme", "Wear OS 4"],
      ["Capteurs", "cEDA, temperature, ECG"],
      ["Autonomie", "24 h always-on"],
      ["Etancheite", "5 ATM + IP68"],
    ],
  },

  /* ---------------------------------------------------------------- gaming */
  {
    slug: "playstation-5-slim",
    title: "PlayStation 5 Slim",
    subtitle: "Lecteur Blu-ray amovible, 1 To",
    description:
      "Trente pour cent plus compacte que la PS5 originale, avec un lecteur de disque detachable et 1 To de stockage. Manette DualSense fournie.",
    price: euros(549.0),
    category: "gaming",
    brand: "sony",
    kind: "gamepad",
    frame: "#e4e4e7",
    screen: "aurora",
    storage: "1TB SSD",
    color: "Blanc",
    stock: 44,
    featured: true,
    tradeAssurance: true,
    soldCount: 1567,
    specs: [
      ["Stockage", "1 To SSD NVMe"],
      ["Lecteur", "Blu-ray Ultra HD amovible"],
      ["Resolution", "Jusqu'a 4K 120 Hz / 8K"],
      ["Manette", "DualSense incluse"],
      ["Retour", "Gachettes adaptatives"],
    ],
  },
  {
    slug: "nintendo-switch-oled",
    title: "Nintendo Switch OLED",
    subtitle: "Ecran 7 pouces OLED, 64 Go",
    description:
      "L'ecran OLED de 7 pouces transforme l'experience en mode portable : noirs profonds et couleurs saturees. Le support ajustable et le port Ethernet du dock completent le tableau.",
    price: euros(349.0),
    compareAtPrice: euros(369.0),
    category: "gaming",
    brand: "nintendo",
    kind: "gamepad",
    frame: "#ef4444",
    screen: "rose",
    storage: "64GB",
    color: "Neon",
    stock: 52,
    soldCount: 2103,
    specs: [
      ["Ecran", "7\" OLED 720p"],
      ["Stockage", "64 Go extensible microSD"],
      ["Autonomie", "4,5 a 9 h"],
      ["Dock", "Port Ethernet integre"],
      ["Modes", "TV, table, portable"],
    ],
  },
  {
    slug: "xbox-series-x",
    title: "Xbox Series X",
    subtitle: "12 TFLOPS, 4K natif 120 fps",
    description:
      "La console la plus puissante de Microsoft : 12 teraflops, 1 To de SSD personnalise et Quick Resume pour reprendre plusieurs jeux instantanement.",
    price: euros(499.0),
    compareAtPrice: euros(549.0),
    category: "gaming",
    brand: "microsoft",
    kind: "gamepad",
    frame: "#18181b",
    screen: "jade",
    storage: "1TB SSD",
    color: "Noir",
    stock: 27,
    tradeAssurance: true,
    soldCount: 987,
    specs: [
      ["Puissance", "12 TFLOPS RDNA 2"],
      ["Stockage", "1 To SSD NVMe custom"],
      ["Resolution", "4K natif jusqu'a 120 fps"],
      ["Fonction", "Quick Resume"],
      ["Retrocompatibilite", "4 generations"],
    ],
  },
  {
    slug: "logitech-g-pro-x-superlight-2",
    title: "Logitech G Pro X Superlight 2",
    subtitle: "60 g, capteur Hero 2 a 32K",
    description:
      "La souris esport de reference : 60 grammes, capteur Hero 2 monte a 32 000 DPI et 95 heures d'autonomie. Switches hybrides optique-mecanique.",
    price: euros(159.0),
    compareAtPrice: euros(179.0),
    category: "gaming",
    brand: "logitech",
    kind: "keyboard",
    frame: "#27272a",
    screen: "cyan",
    color: "Noir",
    stock: 64,
    soldCount: 1245,
    specs: [
      ["Poids", "60 g"],
      ["Capteur", "Hero 2, 32 000 DPI"],
      ["Autonomie", "95 h"],
      ["Switches", "Hybrides optique-mecanique"],
      ["Connexion", "Lightspeed sans fil"],
    ],
  },

  /* ----------------------------------------------------------- photo video */
  {
    slug: "sony-alpha-7-iv",
    title: "Sony Alpha 7 IV",
    subtitle: "Plein format 33 Mpx, video 4K 60p",
    description:
      "L'hybride polyvalent par excellence : capteur plein format de 33 Mpx, autofocus a detection de sujets par intelligence artificielle et video 4K 60p en 10 bits 4:2:2.",
    price: euros(2699.0),
    compareAtPrice: euros(2899.0),
    category: "photo-video",
    brand: "sony",
    kind: "camera",
    frame: "#18181b",
    screen: "gold",
    color: "Noir",
    stock: 11,
    featured: true,
    tradeAssurance: true,
    soldCount: 187,
    specs: [
      ["Capteur", "Plein format Exmor R 33 Mpx"],
      ["Video", "4K 60p 10 bits 4:2:2"],
      ["Autofocus", "759 points, detection IA"],
      ["Stabilisation", "5 axes, 5,5 IL"],
      ["Ecran", "Orientable tactile 3\""],
    ],
  },
  {
    slug: "gopro-hero-12-black",
    title: "GoPro HERO12 Black",
    subtitle: "5.3K 60p, HDR, etanche 10 m",
    description:
      "Stabilisation HyperSmooth 6.0, video 5.3K 60p en HDR et compatibilite Bluetooth avec les capteurs cardiaques. Etanche a 10 metres sans caisson.",
    price: euros(449.0),
    compareAtPrice: euros(499.0),
    category: "photo-video",
    brand: "gopro",
    kind: "camera",
    frame: "#0f766e",
    screen: "cyan",
    color: "Noir",
    stock: 47,
    soldCount: 856,
    specs: [
      ["Video", "5.3K 60p / 4K 120p"],
      ["Stabilisation", "HyperSmooth 6.0"],
      ["Etancheite", "10 m sans caisson"],
      ["HDR", "Photo et video"],
      ["Fixation", "Filetage 1/4\" integre"],
    ],
  },
  {
    slug: "dji-mini-4-pro",
    title: "DJI Mini 4 Pro",
    subtitle: "249 g, evitement omnidirectionnel",
    description:
      "Moins de 249 grammes, donc sans obligation de formation dans la plupart des pays. Detection d'obstacles sur 360 degres et video 4K 60p HDR.",
    price: euros(1099.0),
    category: "photo-video",
    brand: "dji",
    kind: "drone",
    frame: "#52525b",
    screen: "slate",
    color: "Gris",
    stock: 22,
    featured: true,
    tradeAssurance: true,
    soldCount: 341,
    specs: [
      ["Poids", "249 g"],
      ["Video", "4K 60p HDR"],
      ["Evitement", "Omnidirectionnel"],
      ["Autonomie", "34 min"],
      ["Transmission", "O4, 20 km"],
    ],
  },

  /* ----------------------------------------------------------- composants */
  {
    slug: "nvidia-rtx-4080-super",
    title: "GeForce RTX 4080 SUPER",
    subtitle: "16 Go GDDR6X, ray tracing",
    description:
      "Le haut de gamme accessible : 10 240 coeurs CUDA, 16 Go de GDDR6X et DLSS 3.5 avec reconstruction de rayons. Taillee pour le 4K a haut rafraichissement.",
    price: euros(1149.0),
    compareAtPrice: euros(1299.0),
    category: "composants",
    brand: "nvidia",
    kind: "gpu",
    frame: "#1f2937",
    screen: "jade",
    color: "Noir",
    stock: 15,
    featured: true,
    tradeAssurance: true,
    soldCount: 264,
    specs: [
      ["Coeurs CUDA", "10 240"],
      ["Memoire", "16 Go GDDR6X"],
      ["DLSS", "3.5 avec Ray Reconstruction"],
      ["TDP", "320 W"],
      ["Sorties", "3x DisplayPort 1.4a, HDMI 2.1"],
    ],
  },
  {
    slug: "nvidia-rtx-4070-ti-super",
    title: "GeForce RTX 4070 Ti SUPER",
    subtitle: "16 Go, le bon compromis 1440p",
    description:
      "Le meilleur equilibre performance-prix du catalogue Nvidia. Ses 16 Go de memoire securisent le 1440p en ultra pour plusieurs annees.",
    price: euros(889.0),
    compareAtPrice: euros(949.0),
    category: "composants",
    brand: "nvidia",
    kind: "gpu",
    frame: "#27272a",
    screen: "cyan",
    color: "Noir",
    stock: 23,
    tradeAssurance: true,
    minOrder: 1,
    soldCount: 397,
    specs: [
      ["Coeurs CUDA", "8 448"],
      ["Memoire", "16 Go GDDR6X"],
      ["Bus", "256 bits"],
      ["TDP", "285 W"],
      ["Resolution cible", "1440p ultra / 4K"],
    ],
  },

  /* --------------------------------------------------- ecrans peripheriques */
  {
    slug: "dell-ultrasharp-u2723qe",
    title: "Dell UltraSharp U2723QE",
    subtitle: "27\" 4K IPS Black, hub USB-C 90 W",
    description:
      "La dalle IPS Black double le contraste des IPS classiques. Le hub USB-C delivre 90 W et remplace la station d'accueil : un seul cable pour l'image, le reseau et la charge.",
    price: euros(679.0),
    compareAtPrice: euros(759.0),
    category: "ecrans-peripheriques",
    brand: "dell",
    kind: "monitor",
    frame: "#3f3f46",
    screen: "aurora",
    color: "Argent",
    stock: 26,
    tradeAssurance: true,
    soldCount: 312,
    specs: [
      ["Dalle", "27\" IPS Black 4K"],
      ["Contraste", "2000:1"],
      ["Couleurs", "98 % DCI-P3"],
      ["Hub", "USB-C 90 W, RJ45"],
      ["Ergonomie", "Pivot, hauteur, inclinaison"],
    ],
  },
  {
    slug: "asus-rog-swift-oled-pg27",
    title: "ROG Swift OLED PG27AQDM",
    subtitle: "27\" OLED 240 Hz, 0.03 ms",
    description:
      "Une dalle OLED 1440p a 240 Hz avec un temps de reponse de 0,03 ms. Le dissipateur personnalise et l'uniform brightness limitent le risque de marquage.",
    price: euros(999.0),
    compareAtPrice: euros(1099.0),
    category: "ecrans-peripheriques",
    brand: "asus",
    kind: "monitor",
    frame: "#18181b",
    screen: "rose",
    color: "Noir",
    stock: 13,
    featured: true,
    soldCount: 178,
    specs: [
      ["Dalle", "27\" OLED WQHD"],
      ["Rafraichissement", "240 Hz"],
      ["Temps de reponse", "0,03 ms GtG"],
      ["Luminosite", "1000 nits pic HDR"],
      ["Synchronisation", "G-Sync compatible"],
    ],
  },
  {
    slug: "logitech-mx-keys-s",
    title: "Logitech MX Keys S",
    subtitle: "Clavier retroeclairage adaptatif",
    description:
      "Frappe silencieuse et precise, retroeclairage qui s'adapte a la lumiere ambiante et appairage simultane sur trois machines. Dix jours d'autonomie retroeclairage actif.",
    price: euros(129.0),
    compareAtPrice: euros(149.0),
    category: "ecrans-peripheriques",
    brand: "logitech",
    kind: "keyboard",
    frame: "#3f3f46",
    screen: "slate",
    color: "Graphite",
    stock: 71,
    soldCount: 934,
    specs: [
      ["Type", "Membrane a course courte"],
      ["Retroeclairage", "Adaptatif par capteur"],
      ["Appairage", "3 appareils, Bolt / Bluetooth"],
      ["Autonomie", "10 jours retroeclaire"],
      ["Compatibilite", "Windows, macOS, Linux, iPadOS"],
    ],
  },
  {
    slug: "samsung-odyssey-g9-oled",
    title: "Odyssey OLED G9 49\"",
    subtitle: "Ultra-large 32:9, 240 Hz",
    description:
      "Deux ecrans 27 pouces QHD fusionnes en une seule dalle incurvee 1800R. La courbure et le format 32:9 offrent une immersion inegalee en simulation et en course.",
    price: euros(1799.0),
    compareAtPrice: euros(2099.0),
    category: "ecrans-peripheriques",
    brand: "samsung",
    kind: "monitor",
    frame: "#e4e4e7",
    screen: "violet",
    color: "Blanc",
    stock: 8,
    featured: true,
    tradeAssurance: true,
    soldCount: 96,
    specs: [
      ["Dalle", "49\" QD-OLED 32:9"],
      ["Definition", "5120 x 1440"],
      ["Rafraichissement", "240 Hz"],
      ["Courbure", "1800R"],
      ["Temps de reponse", "0,03 ms GtG"],
    ],
  },
];

const REVIEW_POOL: { rating: number; title: string; body: string }[] = [
  { rating: 5, title: "Conforme a la description", body: "Livraison en 48 h, emballage soigne et produit strictement conforme a l'annonce. Rien a redire." },
  { rating: 5, title: "Excellent achat", body: "Je l'utilise quotidiennement depuis un mois, aucune mauvaise surprise. Le rapport qualite-prix est vraiment la." },
  { rating: 4, title: "Tres bon, un bemol", body: "Produit de qualite, mais l'autonomie annoncee me semble un peu optimiste dans un usage intensif." },
  { rating: 5, title: "Je recommande", body: "Deuxieme commande chez Pravia, meme serieux que la premiere fois. Le suivi de colis est precis." },
  { rating: 4, title: "Bien mais cher", body: "Aucun defaut sur le produit lui-meme. Le prix reste eleve, meme si la promo aide." },
  { rating: 3, title: "Correct sans plus", body: "Fait le travail, mais je m'attendais a mieux sur la finition a ce niveau de gamme." },
  { rating: 5, title: "Au-dela de mes attentes", body: "La prise en main est immediate et les performances sont au rendez-vous. Tres satisfait." },
  { rating: 4, title: "Bon compromis", body: "Choisi apres avoir compare plusieurs modeles, je ne regrette pas. La garantie 24 mois rassure." },
];

const CUSTOMERS = [
  { name: "Camille Fournier", email: "camille@exemple.fr", color: "#f97316" },
  { name: "Yanis Bertrand", email: "yanis@exemple.fr", color: "#06b6d4" },
  { name: "Sofia Nakamura", email: "sofia@exemple.fr", color: "#a855f7" },
  { name: "Lucas Moreau", email: "lucas@exemple.fr", color: "#22c55e" },
  { name: "Ines Dubois", email: "ines@exemple.fr", color: "#ec4899" },
  { name: "Thomas Leroy", email: "thomas@exemple.fr", color: "#eab308" },
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
  await db.setting.deleteMany();

  console.log("Categories et marques...");
  const categories = new Map<string, string>();
  for (const c of CATEGORIES) {
    const row = await db.category.create({ data: c });
    categories.set(c.slug, row.id);
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
    if (p.altKind) {
      const altUrl = writeDevice(`${p.slug}-2`, p.altKind, p.frame, p.screen);
      images.push({ url: altUrl, alt: `${p.title} - dos`, sortOrder: 1 });
    }

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
        stock: p.stock,
        sku,
        condition: p.condition ?? "NEW",
        minOrder: p.minOrder ?? 1,
        tradeAssurance: p.tradeAssurance ?? false,
        readyToShip: p.stock > 0,
        featured: p.featured ?? false,
        active: true,
        soldCount: p.soldCount,
        storage: p.storage ?? null,
        color: p.color ?? null,
        carrier: p.carrier ?? null,
        warrantyMonths: p.condition === "SECOND_HAND" ? 6 : 24,
        categoryId: categories.get(p.category)!,
        brandId: brands.get(p.brand)!,
        searchText: buildSearchText({
          title: p.title,
          subtitle: p.subtitle,
          description,
          sku,
          storage: p.storage,
          color: p.color,
          carrier: p.carrier,
          brand: BRANDS.find((b) => b.slug === p.brand)!.name,
          category: CATEGORIES.find((c) => c.slug === p.category)!.name,
          specs: p.specs.map(([label, value]) => ({ label, value })),
        }),
        createdAt: daysAgo(between(2, 180)),
        images: { create: images },
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
        name: c.name,
        role: "CUSTOMER",
        avatarColor: c.color,
        createdAt: daysAgo(between(30, 300)),
        addresses: {
          create: {
            label: "Domicile",
            fullName: c.name,
            line1: `${between(1, 180)} rue ${pick(["Victor Hugo", "de la Republique", "Gambetta", "des Lilas", "Pasteur"])}`,
            city: pick(["Paris", "Lyon", "Marseille", "Bordeaux", "Lille", "Nantes"]),
            zip: String(between(10000, 95000)),
            country: "France",
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
    const shipping = subtotal >= 15000 ? 0 : 990;
    const tax = Math.round((subtotal * 0.2) / 1.2);
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
        paymentMethod: pick(["CARD", "CARD", "CARD", "PAYPAL", "TRANSFER"]),
        shipFullName: address.fullName,
        shipLine1: address.line1,
        shipCity: address.city,
        shipZip: address.zip,
        shipCountry: address.country,
        trackingNumber: ["SHIPPED", "DELIVERED"].includes(status)
          ? `PRV${between(100000000, 999999999)}FR`
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
      { key: "store.currency", value: "EUR" },
      { key: "shipping.freeThreshold", value: "15000" },
      { key: "shipping.flatRate", value: "990" },
      { key: "banner.text", value: "Livraison offerte des 150 EUR - Retours gratuits sous 30 jours" },
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
