/**
 * Catalogue de demonstration : accessoires de telephone.
 *
 * La boutique ne vend que cela. Le fichier porte donc les categories, les
 * marques et les articles, separes du script de peuplement pour que retoucher
 * l'assortiment ne demande pas de relire la mecanique d'insertion.
 *
 * Les coques et les supports se declinent en couleurs : chaque teinte a son
 * stock et son visuel, generes a partir de la meme forme avec un accent
 * different.
 */

import type { DeviceKind, ScreenPalette } from "../scripts/gen-images.mjs";

export type Declinaison = {
  name: string;
  nameAr: string;
  /** Pastille du selecteur, et accent du visuel genere. */
  hex: string;
  stock: number;
};

export type ArticleSeed = {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  /** En dinars entiers : le script convertit en centimes. */
  price: number;
  compareAtPrice?: number;
  category: string;
  brand: string;
  kind: DeviceKind;
  frame: string;
  screen: ScreenPalette;
  stock: number;
  featured?: boolean;
  minOrder?: number;
  soldCount: number;
  /** Duree de garantie ; par defaut 12 mois. */
  warrantyValue?: number;
  warrantyUnit?: "DAY" | "MONTH" | "YEAR";
  specs: [string, string][];
  variants?: Declinaison[];
};

export const CATEGORIES = [
  {
    name: "Coques & protections",
    nameAr: "أغطية وحمايات",
    slug: "coques",
    icon: "smartphone",
    description: "Coques silicone, antichoc et transparentes pour tous les modeles.",
  },
  {
    name: "Verres trempes",
    nameAr: "زجاج واقٍ",
    slug: "verres-trempes",
    icon: "shield",
    description: "Protections d'ecran 9H, bords incurves et pose sans bulles.",
  },
  {
    name: "Chargeurs",
    nameAr: "شواحن",
    slug: "chargeurs",
    icon: "plug",
    description: "Adaptateurs secteur, charge rapide et chargeurs sans fil.",
  },
  {
    name: "Cables",
    nameAr: "كابلات",
    slug: "cables",
    icon: "cable",
    description: "USB-C, Lightning et tresses renforcees.",
  },
  {
    name: "Power bank",
    nameAr: "بطاريات متنقلة",
    slug: "power-bank",
    icon: "battery",
    description: "De la batterie de poche au modele 30 000 mAh.",
  },
  {
    name: "Airpods",
    nameAr: "سماعات لاسلكية",
    slug: "airpods",
    icon: "airpods",
    description: "Ecouteurs sans fil, avec ou sans reduction de bruit.",
  },
  {
    name: "Ecouteurs",
    nameAr: "سماعات",
    slug: "ecouteurs",
    icon: "headphones",
    description: "Casques et ecouteurs filaires.",
  },
  {
    name: "Smartwatch",
    nameAr: "ساعات ذكية",
    slug: "smartwatch",
    icon: "watch",
    description: "Montres connectees et bracelets de rechange.",
  },
  {
    name: "TV box",
    nameAr: "أجهزة استقبال",
    slug: "tv-box",
    icon: "tv",
    description: "Boitiers Android TV et telecommandes.",
  },
  {
    name: "Supports",
    nameAr: "حوامل",
    slug: "supports",
    icon: "stand",
    description: "Supports voiture, bureau et anneaux de maintien.",
  },
];

export const BRANDS = [
  { name: "Anker", slug: "anker", accent: "#0ea5e9" },
  { name: "Baseus", slug: "baseus", accent: "#6366f1" },
  { name: "Ugreen", slug: "ugreen", accent: "#22c55e" },
  { name: "Spigen", slug: "spigen", accent: "#f97316" },
  { name: "Hoco", slug: "hoco", accent: "#ef4444" },
  { name: "Joyroom", slug: "joyroom", accent: "#8b5cf6" },
  { name: "Nillkin", slug: "nillkin", accent: "#0f766e" },
  { name: "Borofone", slug: "borofone", accent: "#eab308" },
  { name: "Remax", slug: "remax", accent: "#db2777" },
  { name: "Belkin", slug: "belkin", accent: "#334155" },
  { name: "Xiaomi", slug: "xiaomi", accent: "#f97316" },
  { name: "Samsung", slug: "samsung", accent: "#1428a0" },
];

/** Teintes reutilisees d'un article a l'autre, pour rester coherent. */
const NOIR = { name: "Noir", nameAr: "أسود", hex: "#111827" };
const BLEU = { name: "Bleu nuit", nameAr: "أزرق داكن", hex: "#1e3a8a" };
const ROUGE = { name: "Rouge", nameAr: "أحمر", hex: "#dc2626" };
const VERT = { name: "Vert", nameAr: "أخضر", hex: "#15803d" };
const ROSE = { name: "Rose", nameAr: "وردي", hex: "#ec4899" };
const TRANSPARENT = { name: "Transparent", nameAr: "شفاف", hex: "#cbd5e1" };
const VIOLET = { name: "Violet", nameAr: "بنفسجي", hex: "#7c3aed" };
const BEIGE = { name: "Beige", nameAr: "بيج", hex: "#d6c3a5" };

const teintes = (liste: { name: string; nameAr: string; hex: string }[], stocks: number[]): Declinaison[] =>
  liste.map((t, i) => ({ ...t, stock: stocks[i] ?? 12 }));

export const ARTICLES: ArticleSeed[] = [
  /* ------------------------------------------------------------- coques */
  {
    slug: "coque-silicone-iphone-15",
    title: "Coque silicone iPhone 15",
    subtitle: "Toucher doux, interieur microfibre",
    description:
      "Coque en silicone liquide moulee sur l'iPhone 15. L'interieur en microfibre evite les micro-rayures au dos de l'appareil, et les bords surelevent l'ecran et le bloc photo pour les tenir a distance de la table. Les boutons restent nets sous le doigt.",
    price: 2400,
    compareAtPrice: 3200,
    category: "coques",
    brand: "spigen",
    kind: "phoneCase",
    frame: "#0f172a",
    screen: "slate",
    stock: 180,
    featured: true,
    soldCount: 640,
    specs: [
      ["Compatibilite", "iPhone 15 / 15 Plus"],
      ["Matiere", "Silicone liquide, interieur microfibre"],
      ["Protection", "Bords surelevees ecran et photo"],
      ["Charge sans fil", "Compatible"],
    ],
    variants: teintes([NOIR, BLEU, ROUGE, VERT, ROSE], [64, 41, 28, 30, 17]),
  },
  {
    slug: "coque-antichoc-samsung-a54",
    title: "Coque antichoc Galaxy A54",
    subtitle: "Double matiere, coins renforces",
    description:
      "Coque hybride associant un cadre souple absorbant et un dos rigide. Les quatre coins sont doubles pour encaisser les chutes d'angle, celles qui cassent les ecrans. Le motif interieur limite les traces de doigts visibles par transparence.",
    price: 2900,
    category: "coques",
    brand: "nillkin",
    kind: "phoneCase",
    frame: "#0f172a",
    screen: "slate",
    stock: 140,
    soldCount: 412,
    specs: [
      ["Compatibilite", "Samsung Galaxy A54 5G"],
      ["Norme", "Chute testee a 1,8 m"],
      ["Matiere", "TPU souple + polycarbonate"],
    ],
    variants: teintes([NOIR, TRANSPARENT, BLEU, VIOLET], [52, 38, 30, 20]),
  },
  {
    slug: "coque-transparente-antijaunissement",
    title: "Coque transparente anti-jaunissement",
    subtitle: "Traitement UV, reste claire",
    description:
      "Le defaut des coques transparentes est de virer au jaune en quelques mois. Celle-ci recoit un traitement anti-UV qui repousse nettement l'echeance. Le dos rigide ne se deforme pas et laisse voir la finition d'origine du telephone.",
    price: 1900,
    compareAtPrice: 2500,
    category: "coques",
    brand: "baseus",
    kind: "phoneCase",
    frame: "#0f172a",
    screen: "cyan",
    stock: 220,
    featured: true,
    soldCount: 890,
    specs: [
      ["Compatibilite", "iPhone 13 a 15, Galaxy S23"],
      ["Traitement", "Anti-UV, anti-jaunissement"],
      ["Epaisseur", "1,2 mm"],
    ],
    variants: teintes([TRANSPARENT, NOIR, BLEU], [120, 60, 40]),
  },
  {
    slug: "coque-cuir-magsafe",
    title: "Coque cuir compatible MagSafe",
    subtitle: "Aimants integres, cuir pleine fleur",
    description:
      "Coque en cuir pleine fleur dont l'anneau magnetique retient les chargeurs et supports compatibles MagSafe sans intermediaire. Le cuir prend une patine avec l'usage, la coque ne ressemble a aucune autre au bout de quelques mois.",
    price: 5400,
    compareAtPrice: 6900,
    category: "coques",
    brand: "spigen",
    kind: "phoneCase",
    frame: "#1c1917",
    screen: "gold",
    stock: 60,
    soldCount: 155,
    specs: [
      ["Compatibilite", "iPhone 14 / 15 / 16"],
      ["Matiere", "Cuir pleine fleur"],
      ["Aimants", "Anneau MagSafe integre"],
    ],
    variants: teintes([NOIR, BEIGE, BLEU], [26, 18, 16]),
  },
  {
    slug: "coque-renforcee-militaire",
    title: "Coque renforcee grade militaire",
    subtitle: "Norme MIL-STD 810G",
    description:
      "Coque a double paroi pour les usages exigeants : chantier, atelier, randonnee. Les ports sont obtures par des volets souples qui tiennent la poussiere a distance, et la coque passe la norme MIL-STD 810G de resistance aux chutes.",
    price: 4200,
    category: "coques",
    brand: "hoco",
    kind: "phoneCase",
    frame: "#0f172a",
    screen: "slate",
    stock: 85,
    soldCount: 210,
    specs: [
      ["Norme", "MIL-STD 810G"],
      ["Protection", "Volets anti-poussiere sur les ports"],
      ["Compatibilite", "iPhone 15 Pro, Galaxy S24"],
    ],
    variants: teintes([NOIR, VERT, ROUGE], [40, 25, 20]),
  },

  /* ------------------------------------------------------ verres trempes */
  {
    slug: "verre-trempe-9h-iphone",
    title: "Verre trempe 9H iPhone",
    subtitle: "Lot de 2 avec gabarit de pose",
    description:
      "Deux verres de durete 9H livres avec un gabarit qui les aligne seul sur l'ecran. La pose sans bulles ni decalage ne demande aucune adresse particuliere, et le second verre remplace le premier le jour ou il encaisse un choc a votre place.",
    price: 1600,
    compareAtPrice: 2200,
    category: "verres-trempes",
    brand: "spigen",
    kind: "screenProtector",
    frame: "#0f172a",
    screen: "cyan",
    stock: 300,
    featured: true,
    soldCount: 1420,
    specs: [
      ["Durete", "9H"],
      ["Contenu", "2 verres + gabarit de pose"],
      ["Compatibilite", "iPhone 12 a 16"],
      ["Bords", "2,5D, compatible coque"],
    ],
  },
  {
    slug: "verre-trempe-confidentialite",
    title: "Verre trempe confidentialite",
    subtitle: "Filtre de vision a 28 degres",
    description:
      "Au-dela de vingt-huit degres, l'ecran devient noir pour le voisin. Utile dans les transports et les salles d'attente, sans perte de nettete de face. La couche oleophobe limite les traces de doigts.",
    price: 2300,
    category: "verres-trempes",
    brand: "belkin",
    kind: "screenProtector",
    frame: "#0f172a",
    screen: "slate",
    stock: 110,
    soldCount: 260,
    specs: [
      ["Angle de vision", "28 degres"],
      ["Durete", "9H"],
      ["Traitement", "Oleophobe anti-traces"],
    ],
  },
  {
    slug: "verre-trempe-bords-incurves",
    title: "Verre trempe bords incurves",
    subtitle: "Colle sur toute la surface",
    description:
      "Pour les ecrans incurves, la colle couvre toute la surface et non le seul pourtour : le verre ne se decolle pas sur les bords au bout de quelques semaines. La decoupe laisse le capteur d'empreinte sous l'ecran fonctionner normalement.",
    price: 2100,
    category: "verres-trempes",
    brand: "nillkin",
    kind: "screenProtector",
    frame: "#111827",
    screen: "violet",
    stock: 95,
    soldCount: 180,
    specs: [
      ["Colle", "Pleine surface"],
      ["Compatibilite", "Galaxy S23 / S24 Ultra"],
      ["Empreinte sous ecran", "Compatible"],
    ],
  },
  {
    slug: "protection-objectif-camera",
    title: "Protection objectifs camera",
    subtitle: "Verre par lentille, sans reflet",
    description:
      "Un anneau de verre par objectif, colle sur le bloc photo. Le bloc depasse du chassis et frotte a chaque pose du telephone : cette protection encaisse les rayures a sa place, sans halo ni reflet sur les photos de nuit.",
    price: 1200,
    category: "verres-trempes",
    brand: "baseus",
    kind: "screenProtector",
    frame: "#1f2937",
    screen: "gold",
    stock: 160,
    soldCount: 340,
    specs: [
      ["Contenu", "3 anneaux + support de pose"],
      ["Traitement", "Anti-reflet"],
    ],
  },

  /* --------------------------------------------------------- chargeurs */
  {
    slug: "chargeur-secteur-33w",
    title: "Chargeur secteur 33 W",
    subtitle: "Charge rapide USB-C, format compact",
    description:
      "Trente-trois watts dans un bloc a peine plus gros qu'un chargeur d'origine. Le circuit en nitrure de gallium chauffe moins et tient dans une poche. La sortie s'adapte au telephone branche, du plus ancien au plus recent.",
    price: 2800,
    compareAtPrice: 3600,
    category: "chargeurs",
    brand: "anker",
    kind: "charger",
    frame: "#e2e8f0",
    screen: "gold",
    stock: 130,
    featured: true,
    soldCount: 720,
    specs: [
      ["Puissance", "33 W"],
      ["Technologie", "GaN, PD 3.0 et QC 4+"],
      ["Sortie", "1 x USB-C"],
    ],
  },
  {
    slug: "chargeur-double-port-45w",
    title: "Chargeur double port 45 W",
    subtitle: "Deux appareils a pleine vitesse",
    description:
      "Deux ports qui se partagent quarante-cinq watts : telephone et ecouteurs, ou telephone et tablette, sans debrancher l'un pour l'autre. La repartition se fait seule selon ce qui est branche.",
    price: 4100,
    category: "chargeurs",
    brand: "ugreen",
    kind: "charger",
    frame: "#f1f5f9",
    screen: "cyan",
    stock: 90,
    soldCount: 310,
    specs: [
      ["Puissance", "45 W repartis"],
      ["Sorties", "1 x USB-C + 1 x USB-A"],
      ["Technologie", "GaN II"],
    ],
  },
  {
    slug: "chargeur-sans-fil-15w",
    title: "Chargeur sans fil 15 W",
    subtitle: "Pose magnetique, socle antiderapant",
    description:
      "Le telephone se pose et s'aimante au bon endroit du premier coup : pas de recherche de la zone de charge. Le socle reste stable sur le bureau et la surface caoutchoutee ne marque pas le dos de la coque.",
    price: 3600,
    compareAtPrice: 4500,
    category: "chargeurs",
    brand: "baseus",
    kind: "charger",
    frame: "#334155",
    screen: "violet",
    stock: 75,
    soldCount: 265,
    specs: [
      ["Puissance", "15 W"],
      ["Fixation", "Magnetique"],
      ["Compatibilite", "Qi et MagSafe"],
    ],
  },
  {
    slug: "chargeur-voiture-30w",
    title: "Chargeur voiture 30 W",
    subtitle: "Deux ports, allume-cigare",
    description:
      "Un bloc court qui ne depasse pas de l'allume-cigare et ne gene pas le levier de vitesse. Deux ports pour le conducteur et le passager, avec une protection contre les surtensions du circuit du vehicule.",
    price: 2200,
    category: "chargeurs",
    brand: "hoco",
    kind: "charger",
    frame: "#1f2937",
    screen: "slate",
    stock: 145,
    soldCount: 480,
    specs: [
      ["Puissance", "30 W"],
      ["Sorties", "USB-C + USB-A"],
      ["Protection", "Surtension et surchauffe"],
    ],
  },

  /* ------------------------------------------------------------ cables */
  {
    slug: "cable-usb-c-tresse-2m",
    title: "Cable USB-C tresse 2 m",
    subtitle: "Nylon tresse, 60 W",
    description:
      "Deux metres de nylon tresse, la longueur qui permet de continuer a utiliser le telephone branche depuis un lit ou un canape. La gaine tressee resiste aux pliures repetees a la sortie du connecteur, la ou les cables cedent d'ordinaire.",
    price: 1400,
    compareAtPrice: 1900,
    category: "cables",
    brand: "ugreen",
    kind: "cable",
    frame: "#111827",
    screen: "cyan",
    stock: 260,
    featured: true,
    soldCount: 1150,
    specs: [
      ["Longueur", "2 m"],
      ["Puissance", "60 W (20 V / 3 A)"],
      ["Gaine", "Nylon tresse"],
      ["Endurance", "20 000 pliures testees"],
    ],
    variants: teintes([NOIR, BLEU, ROUGE], [140, 70, 50]),
  },
  {
    slug: "cable-lightning-certifie",
    title: "Cable Lightning certifie",
    subtitle: "Puce d'authentification Apple",
    description:
      "Cable certifie, reconnu sans message d'alerte a chaque branchement et compatible avec les mises a jour du telephone. La puce d'authentification est celle prevue par Apple, pas une copie qui cesse de fonctionner au bout de trois mois.",
    price: 2600,
    category: "cables",
    brand: "belkin",
    kind: "cable",
    frame: "#e2e8f0",
    screen: "slate",
    stock: 120,
    soldCount: 390,
    specs: [
      ["Longueur", "1 m"],
      ["Certification", "MFi"],
      ["Compatibilite", "iPhone jusqu'au 14"],
    ],
  },
  {
    slug: "cable-multi-3en1",
    title: "Cable 3 en 1",
    subtitle: "USB-C, Lightning et micro-USB",
    description:
      "Trois embouts sur un seul cable : de quoi depanner n'importe quel appareil de la maison sans chercher lequel va avec quoi. Les embouts inutilises se rangent le long de la gaine plutot que de pendre.",
    price: 1700,
    category: "cables",
    brand: "borofone",
    kind: "cable",
    frame: "#1f2937",
    screen: "gold",
    stock: 190,
    soldCount: 560,
    specs: [
      ["Embouts", "USB-C, Lightning, micro-USB"],
      ["Longueur", "1,2 m"],
      ["Puissance", "18 W"],
    ],
    variants: teintes([NOIR, TRANSPARENT], [120, 70]),
  },
  {
    slug: "cable-usb-c-vers-c-100w",
    title: "Cable USB-C vers USB-C 100 W",
    subtitle: "Charge un ordinateur portable",
    description:
      "Cent watts, de quoi charger un ordinateur portable autant qu'un telephone, avec le transfert de donnees a 480 Mb/s. Un seul cable a emporter pour tout l'equipement.",
    price: 2400,
    category: "cables",
    brand: "anker",
    kind: "cable",
    frame: "#0f172a",
    screen: "emerald",
    stock: 105,
    soldCount: 275,
    specs: [
      ["Puissance", "100 W (20 V / 5 A)"],
      ["Longueur", "1,8 m"],
      ["Donnees", "480 Mb/s"],
    ],
  },

  /* ------------------------------------------------ batteries externes */
  {
    slug: "batterie-externe-20000",
    title: "Batterie externe 20 000 mAh",
    subtitle: "Charge rapide 22,5 W, ecran de charge",
    description:
      "Vingt mille milliamperes-heures, soit quatre a cinq charges completes d'un telephone courant. L'ecran indique le pourcentage restant au lieu de quatre temoins approximatifs, et la charge rapide fonctionne dans les deux sens.",
    price: 6800,
    compareAtPrice: 8500,
    category: "power-bank",
    brand: "xiaomi",
    kind: "powerBank",
    frame: "#1f2937",
    screen: "emerald",
    stock: 70,
    featured: true,
    soldCount: 430,
    specs: [
      ["Capacite", "20 000 mAh"],
      ["Puissance", "22,5 W en entree et en sortie"],
      ["Sorties", "2 x USB-A + 1 x USB-C"],
      ["Affichage", "Pourcentage a l'ecran"],
    ],
  },
  {
    slug: "batterie-magnetique-10000",
    title: "Batterie magnetique 10 000 mAh",
    subtitle: "Se colle au dos du telephone",
    description:
      "Elle s'aimante au dos du telephone et le recharge sans fil pendant qu'il reste utilisable d'une main. Le format tient dans une poche de veste, ce qui n'est pas le cas des modeles de meme capacite a brancher.",
    price: 5900,
    category: "power-bank",
    brand: "anker",
    kind: "powerBank",
    frame: "#0f172a",
    screen: "violet",
    stock: 55,
    soldCount: 210,
    specs: [
      ["Capacite", "10 000 mAh"],
      ["Charge sans fil", "15 W magnetique"],
      ["Compatibilite", "MagSafe"],
    ],
    variants: teintes([NOIR, BLEU, ROSE], [24, 18, 13]),
  },
  {
    slug: "batterie-poche-5000",
    title: "Batterie de poche 5 000 mAh",
    subtitle: "Connecteur integre, sans cable",
    description:
      "Un connecteur sort directement du boitier : rien a emporter en plus. Une charge complete de secours dans un objet plus petit qu'un paquet de cartes, a laisser au fond d'un sac.",
    price: 3200,
    category: "power-bank",
    brand: "baseus",
    kind: "powerBank",
    frame: "#334155",
    screen: "cyan",
    stock: 130,
    soldCount: 385,
    specs: [
      ["Capacite", "5 000 mAh"],
      ["Connecteur", "USB-C integre"],
      ["Poids", "110 g"],
    ],
    variants: teintes([NOIR, BLEU, ROSE, VERT], [50, 32, 26, 22]),
  },
  {
    slug: "batterie-externe-30000",
    title: "Batterie externe 30 000 mAh",
    subtitle: "Trois appareils a la fois, 65 W",
    description:
      "Pour les longs deplacements ou les chantiers sans prise : trois appareils simultanement, dont un ordinateur portable en charge rapide. Elle se recharge elle-meme en moins de trois heures.",
    price: 11500,
    compareAtPrice: 13900,
    category: "power-bank",
    brand: "ugreen",
    kind: "powerBank",
    frame: "#111827",
    screen: "slate",
    stock: 35,
    soldCount: 120,
    specs: [
      ["Capacite", "30 000 mAh"],
      ["Puissance", "65 W"],
      ["Sorties", "2 x USB-C + 1 x USB-A"],
    ],
  },

  /* --------------------------------------------------------- ecouteurs */
  {
    slug: "ecouteurs-sans-fil-anc",
    title: "Ecouteurs sans fil a reduction de bruit",
    subtitle: "ANC hybride, 30 h d'autonomie",
    description:
      "La reduction de bruit efface le ronronnement d'un bus ou d'un open space sans souffler dans l'oreille. Trente heures avec le boitier, et un mode transparence pour entendre une annonce sans retirer les ecouteurs.",
    price: 8900,
    compareAtPrice: 11500,
    category: "airpods",
    brand: "anker",
    kind: "earbuds",
    frame: "#0f172a",
    screen: "violet",
    stock: 65,
    featured: true,
    soldCount: 340,
    specs: [
      ["Reduction de bruit", "ANC hybride, jusqu'a 42 dB"],
      ["Autonomie", "8 h + 22 h avec le boitier"],
      ["Bluetooth", "5.3, multipoint"],
      ["Etancheite", "IPX5"],
    ],
    variants: teintes([NOIR, TRANSPARENT, BLEU], [30, 20, 15]),
  },
  {
    slug: "ecouteurs-sport-crochet",
    title: "Ecouteurs sport a crochet",
    subtitle: "Tiennent a la course, IPX7",
    description:
      "Le crochet passe derriere l'oreille : les ecouteurs ne bougent pas, meme en courant ou en salle. La certification IPX7 les rend insensibles a la transpiration comme a la pluie.",
    price: 4600,
    category: "airpods",
    brand: "joyroom",
    kind: "earbuds",
    frame: "#134e4a",
    screen: "emerald",
    stock: 95,
    soldCount: 280,
    specs: [
      ["Maintien", "Crochet auriculaire"],
      ["Etancheite", "IPX7"],
      ["Autonomie", "9 h"],
    ],
    variants: teintes([NOIR, VERT, ROUGE], [45, 28, 22]),
  },
  {
    slug: "ecouteurs-filaires-usb-c",
    title: "Ecouteurs filaires USB-C",
    subtitle: "DAC integre, telecommande",
    description:
      "Pour les telephones sans prise casque : le convertisseur est dans le cable, le son ne depend donc pas de l'appareil. Telecommande a trois boutons et microphone pour les appels.",
    price: 1800,
    category: "ecouteurs",
    brand: "hoco",
    kind: "earbuds",
    frame: "#1f2937",
    screen: "slate",
    stock: 175,
    soldCount: 620,
    specs: [
      ["Connecteur", "USB-C avec DAC"],
      ["Telecommande", "3 boutons + micro"],
      ["Longueur", "1,2 m"],
    ],
    variants: teintes([NOIR, TRANSPARENT], [110, 65]),
  },
  {
    slug: "casque-bluetooth-pliable",
    title: "Casque Bluetooth pliable",
    subtitle: "Circum-aural, 40 h",
    description:
      "Un casque qui se plie pour tenir dans un sac a dos, avec des coussinets qui entourent l'oreille au lieu d'appuyer dessus. Quarante heures d'ecoute, et il fonctionne aussi en filaire une fois la batterie vide.",
    price: 7400,
    category: "ecouteurs",
    brand: "remax",
    kind: "headphones",
    frame: "#1e1b4b",
    screen: "violet",
    stock: 48,
    soldCount: 165,
    specs: [
      ["Type", "Circum-aural ferme"],
      ["Autonomie", "40 h"],
      ["Repli", "Pliable, etui inclus"],
      ["Filaire", "Jack 3,5 mm de secours"],
    ],
    variants: teintes([NOIR, BEIGE, BLEU], [22, 14, 12]),
  },

  /* ------------------------------------------------------- smartwatch */
  {
    slug: "montre-connectee-amoled",
    title: "Montre connectee ecran AMOLED",
    subtitle: "Appels Bluetooth, 10 jours d'autonomie",
    description:
      "Ecran AMOLED lisible en plein soleil, appels en Bluetooth depuis le poignet et suivi du sommeil et du rythme cardiaque. Dix jours entre deux charges en usage courant, contre deux pour la plupart des montres a systeme complet.",
    price: 9800,
    compareAtPrice: 12500,
    category: "smartwatch",
    brand: "xiaomi",
    kind: "watch",
    frame: "#111827",
    screen: "violet",
    stock: 55,
    featured: true,
    soldCount: 240,
    warrantyValue: 12,
    warrantyUnit: "MONTH",
    specs: [
      ["Ecran", "1,43\" AMOLED"],
      ["Autonomie", "10 jours"],
      ["Appels", "Bluetooth 5.3"],
      ["Etancheite", "5 ATM"],
    ],
    variants: teintes([NOIR, BLEU, ROSE], [24, 18, 13]),
  },
  {
    slug: "bracelet-silicone-rechange",
    title: "Bracelet silicone de rechange",
    subtitle: "Attache universelle 22 mm",
    description:
      "Bracelet en silicone souple a fixation universelle : il s'adapte a la plupart des montres a cornes de 22 mm. Le silicone se rince a l'eau apres le sport, contrairement au cuir d'origine.",
    price: 1100,
    category: "smartwatch",
    brand: "hoco",
    kind: "watch",
    frame: "#334155",
    screen: "cyan",
    stock: 190,
    soldCount: 420,
    warrantyValue: 15,
    warrantyUnit: "DAY",
    specs: [
      ["Largeur", "22 mm"],
      ["Matiere", "Silicone alimentaire"],
      ["Fixation", "Universelle a ressort"],
    ],
    variants: teintes([NOIR, ROUGE, VERT, ROSE, BLEU], [60, 38, 34, 30, 28]),
  },
  {
    slug: "montre-sport-gps",
    title: "Montre sport avec GPS",
    subtitle: "Tracage sans telephone",
    description:
      "Le GPS est dans la montre : les parcours sont enregistres sans emporter le telephone. Plus de vingt modes sportifs, et un ecran qui reste lisible sous la pluie grace aux boutons physiques.",
    price: 15900,
    category: "smartwatch",
    brand: "joyroom",
    kind: "watch",
    frame: "#0f172a",
    screen: "emerald",
    stock: 30,
    soldCount: 95,
    warrantyValue: 2,
    warrantyUnit: "YEAR",
    specs: [
      ["GPS", "Integre, sans telephone"],
      ["Modes sportifs", "24"],
      ["Autonomie", "14 jours"],
      ["Etancheite", "5 ATM"],
    ],
    variants: teintes([NOIR, VERT], [18, 12]),
  },

  /* ----------------------------------------------------------- tv box */
  {
    slug: "box-android-tv-4k",
    title: "Box Android TV 4K",
    subtitle: "4 Go de RAM, telecommande vocale",
    description:
      "Transforme n'importe quel televiseur a prise HDMI en televiseur connecte. Quatre gigaoctets de memoire pour que l'interface reste fluide au bout d'un an, et une telecommande a commande vocale.",
    price: 12500,
    compareAtPrice: 15000,
    category: "tv-box",
    brand: "xiaomi",
    kind: "tvBox",
    frame: "#1f2937",
    screen: "cyan",
    stock: 45,
    featured: true,
    soldCount: 180,
    warrantyValue: 12,
    warrantyUnit: "MONTH",
    specs: [
      ["Definition", "4K HDR"],
      ["Memoire", "4 Go RAM / 32 Go"],
      ["Connectique", "HDMI 2.1, USB, Ethernet"],
      ["Telecommande", "Vocale"],
    ],
  },
  {
    slug: "box-tv-entree-gamme",
    title: "Box TV entree de gamme",
    subtitle: "Full HD, format compact",
    description:
      "Le modele economique pour un poste secondaire : Full HD, wifi, et les applications de lecture courantes. Il tient derriere le televiseur et se branche sur un port USB pour son alimentation.",
    price: 6900,
    category: "tv-box",
    brand: "borofone",
    kind: "tvBox",
    frame: "#334155",
    screen: "slate",
    stock: 70,
    soldCount: 210,
    warrantyValue: 6,
    warrantyUnit: "MONTH",
    specs: [
      ["Definition", "1080p"],
      ["Memoire", "2 Go RAM / 16 Go"],
      ["Alimentation", "USB"],
    ],
  },
  {
    slug: "telecommande-tv-universelle",
    title: "Telecommande universelle",
    subtitle: "Remplace la telecommande perdue",
    description:
      "Se programme sur la plupart des televiseurs et boitiers du marche en quelques secondes. Les touches sont larges et le retour tactile franc, ce qui compte plus qu'il n'y parait a l'usage quotidien.",
    price: 1800,
    category: "tv-box",
    brand: "remax",
    kind: "tvBox",
    frame: "#111827",
    screen: "gold",
    stock: 120,
    soldCount: 340,
    warrantyValue: 7,
    warrantyUnit: "DAY",
    specs: [
      ["Compatibilite", "Televiseurs et boitiers courants"],
      ["Alimentation", "2 piles AAA"],
    ],
  },

  /* ---------------------------------------------------------- supports */
  {
    slug: "support-voiture-magnetique",
    title: "Support voiture magnetique",
    subtitle: "Grille d'aeration, aimants N52",
    description:
      "Le telephone s'aimante d'une main, sans pince a ouvrir. La fixation sur la grille d'aeration ne masque pas le pare-brise et resiste aux dos-d'ane, ce qui n'est pas donne a tous les supports a ventouse.",
    price: 2100,
    compareAtPrice: 2800,
    category: "supports",
    brand: "baseus",
    kind: "phoneHolder",
    frame: "#334155",
    screen: "slate",
    stock: 150,
    featured: true,
    soldCount: 520,
    specs: [
      ["Fixation", "Grille d'aeration"],
      ["Aimants", "6 x N52"],
      ["Rotation", "360 degres"],
    ],
    variants: teintes([NOIR, TRANSPARENT], [95, 55]),
  },
  {
    slug: "support-bureau-reglable",
    title: "Support bureau reglable",
    subtitle: "Aluminium, angle libre",
    description:
      "Socle en aluminium lourd qui ne recule pas quand on touche l'ecran. L'angle se regle librement, du visionnage a la visioconference, et le telephone reste chargeable, le cable passant sous le socle.",
    price: 2700,
    category: "supports",
    brand: "ugreen",
    kind: "phoneHolder",
    frame: "#475569",
    screen: "cyan",
    stock: 110,
    soldCount: 300,
    specs: [
      ["Matiere", "Aluminium"],
      ["Reglage", "Angle libre 0-100 degres"],
      ["Passage de cable", "Oui"],
    ],
    variants: teintes([NOIR, BEIGE], [70, 40]),
  },
  {
    slug: "anneau-support-adhesif",
    title: "Anneau de maintien adhesif",
    subtitle: "Se colle a la coque, sert de bequille",
    description:
      "Un anneau colle au dos de la coque : le telephone tient au bout d'un doigt, et l'anneau fait bequille pour regarder une video posee sur une table. Il se replie a plat et ne gene pas dans la poche.",
    price: 900,
    category: "supports",
    brand: "borofone",
    kind: "phoneHolder",
    frame: "#1f2937",
    screen: "gold",
    stock: 240,
    soldCount: 780,
    specs: [
      ["Fixation", "Adhesif repositionnable"],
      ["Rotation", "360 degres, inclinaison 180"],
      ["Epaisseur repliee", "4 mm"],
    ],
    variants: teintes([NOIR, ROSE, BLEU, VERT], [90, 60, 50, 40]),
  },
  {
    slug: "support-velo-guidon",
    title: "Support velo guidon",
    subtitle: "Serrage a vis, silicone antichoc",
    description:
      "Fixation a vis plutot qu'a clip : le support ne saute pas au premier trottoir. Les angles du telephone sont tenus par des blocs de silicone qui absorbent les vibrations du pave.",
    price: 2300,
    category: "supports",
    brand: "joyroom",
    kind: "phoneHolder",
    frame: "#0f172a",
    screen: "emerald",
    stock: 80,
    soldCount: 190,
    specs: [
      ["Fixation", "Serrage a vis, guidon 22-32 mm"],
      ["Maintien", "4 coins silicone"],
      ["Rotation", "360 degres"],
    ],
  },
];
