# Pravia

Marketplace de matériel technologique — boutique complète et back-office de gestion.

Smartphones, ordinateurs, tablettes, audio, montres, gaming, photo, composants et périphériques :
40 références réparties en 9 catégories et 15 marques, avec panier, commande, avis clients et
administration complète.

![Next.js](https://img.shields.io/badge/Next.js-16-black) ![React](https://img.shields.io/badge/React-19-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Prisma](https://img.shields.io/badge/Prisma-7-2D3748) ![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4)

---

## Démarrage

```bash
npm install     # dépendances
npm run setup   # génère le client Prisma, crée la base SQLite et charge le jeu de démonstration
npm run dev     # http://localhost:3000
```

C'est tout : aucune base externe à installer, aucun service tiers à configurer.

### Comptes de démonstration

| Rôle          | Adresse                | Mot de passe |
| ------------- | ---------------------- | ------------ |
| Administrateur | `admin@pravia.com`    | `admin123`   |
| Client         | `camille@exemple.fr`  | `demo1234`   |

Les autres clients du jeu de données (`yanis@`, `sofia@`, `lucas@`, `ines@`, `thomas@exemple.fr`)
partagent le mot de passe `demo1234`.

---

## Ce que fait le site

### Boutique (`/`)

- **Accueil** — sélection mise en avant, promotions, navigation par catégorie, derniers arrivages.
- **Catalogue** (`/produits`) — filtres combinables (catégorie, marques multiples, état,
  Trade Assurance, expédition immédiate, budget maximum), tri par pertinence ou 5 autres
  critères, pagination. Chaque filtre est reflété dans l'URL : les recherches sont partageables.
- **Recherche** — index normalisé (insensible aux accents et à la casse), classement par
  pertinence, autocomplétion sur produits, catégories et marques, historique local des dernières
  recherches, synonymes, et suggestions de repli quand une requête ne donne rien.
- **Fiche produit** — galerie multi-visuels, caractéristiques, stock en direct, sélecteur de
  quantité, favoris, avis clients avec distribution des notes, produits similaires.
- **Panier** — quantités modifiables, contrôle du stock, jauge vers la livraison offerte.
- **Commande** — adresse pré-remplie depuis le carnet, choix du mode de paiement, décrément du
  stock et vidage du panier dans une transaction unique.
- **Espace client** — tableau de bord, historique des commandes avec suivi par étapes, favoris,
  carnet d'adresses.
- **Centre d'aide** (`/aide`) — livraison, retours, garanties, paiement, espace vendeur.

### Back-office (`/admin`)

Réservé aux comptes `ADMIN` ; tout accès non autorisé est redirigé.

- **Tableau de bord** — chiffre d'affaires 30 jours avec tendance, panier moyen, courbe de CA,
  ventes par catégorie, dernières commandes, alertes stock faible et avis à modérer.
- **Statistiques** — analyse sur 30 / 90 / 365 jours, CA par marque, répartition des statuts,
  top 10 des produits. Tous les agrégats sont calculés sur les lignes de commande réelles.
- **Produits** — CRUD complet, recherche et filtres, édition du stock en ligne dans le tableau,
  publication/dépublication en un clic, gestion des caractéristiques.
- **Catégories / Marques** — création, édition, suppression protégée (impossible si des produits
  y sont rattachés).
- **Commandes** — filtres par statut, changement de statut depuis la liste, fiche détaillée avec
  numéro de suivi et note interne.
- **Clients** — recherche, total dépensé, changement de rôle, création et suppression de comptes.
- **Avis** — modération (publier / rejeter / supprimer).
- **Référencement** — score de santé SEO avec diagnostic actionnable, réglages globaux
  (domaine, titres, indexation, partage social, codes de vérification Google/Bing), métadonnées
  page par page avec compteurs de caractères. Les fiches produit et les catégories ont leur
  propre bloc SEO dans leur formulaire.
- **Recherche interne** — requêtes les plus fréquentes, recherches sans résultat (chaque ligne
  est une vente manquée), gestion des synonymes, reconstruction de l'index.
- **Réglages** — identité de la boutique, seuils de livraison, bandeau promotionnel.

### Référencement

Tout est piloté depuis `/admin/seo`, rien n'est codé en dur :

- `sitemap.xml` généré depuis la base (pages, produits, catégories, marques) et `robots.txt`
  qui protège le back-office et le tunnel d'achat.
- Canonique, OpenGraph et carte Twitter sur chaque page ; **image sociale générée à la volée**,
  avec un visuel propre à chaque produit (titre, marque, prix, disponibilité).
- **Données structurées JSON-LD** : `Organization`, `WebSite` avec moteur de recherche interne,
  `Product` (prix, stock, état, garantie, note agrégée, avis), `BreadcrumbList`, `ItemList` et
  `FAQPage` — de quoi obtenir des résultats enrichis dans Google.
- Les pages de recherche, le panier, la commande et l'espace client sont explicitement exclus
  de l'index ; les pages de catégorie et de marque restent de vraies pages d'atterrissage.
- Un interrupteur global ferme le site aux robots pendant la recette.

`npm run seo` vérifie l'ensemble en 34 points sur le site réellement rendu.

### Thèmes et responsive

Trois modes — **clair**, **sombre**, **système** — accessibles depuis l'en-tête, le menu mobile,
le pied de page et le back-office. Le choix est mémorisé et appliqué sans flash au chargement.

L'interface est conçue pour mobile d'abord : tiroir de navigation, tiroir de filtres, tableaux
défilants horizontalement, grilles de 2 à 4 colonnes selon la largeur.

---

## Stack technique

| Brique | Choix | Pourquoi |
| --- | --- | --- |
| Framework | **Next.js 16** (App Router) | Server Components et Server Actions : pas d'API REST à maintenir en parallèle |
| UI | **React 19**, **Tailwind CSS 4** | Thème piloté par variables CSS en OKLCH, configuration directement dans le CSS |
| Base de données | **SQLite** via **Prisma 7** | Zéro service à installer ; migration vers PostgreSQL = un changement de `provider` |
| Authentification | **jose** (JWT) + **bcryptjs** | Session en cookie `httpOnly`, sans dépendance externe |
| Validation | **zod** | Toutes les entrées serveur sont validées avant écriture |
| Icônes | **lucide-react** | |
| Tests | **Playwright** | Parcours de bout en bout scripté |

### Pourquoi pas WordPress / WooCommerce

Le modèle visuel est une interface applicative (filtres à facettes réactifs, mise à jour sans
rechargement, bascule de thème). L'obtenir sous WooCommerce aurait imposé PHP + MySQL, un thème
sur mesure et un back-office `wp-admin` qu'on ne maîtrise pas. Ici, l'ensemble démarre avec
`npm run setup` et le back-office est taillé exactement pour ce catalogue.

---

## Organisation du code

```
prisma/
  schema.prisma          Modèle de données (15 tables)
  descriptions.ts        Second paragraphe éditorial de chaque fiche
  seed.ts                Jeu de démonstration, idempotent
scripts/
  gen-images.mjs         Génère les visuels produits en SVG
  e2e.mjs                Parcours de bout en bout (31 vérifications)
  seo-check.mjs          Audit de référencement sur le site rendu (34 vérifications)
  shoot.mjs              Capture d'écran ponctuelle
src/
  app/
    (boutique)/          Boutique : accueil, catalogue, produit, panier, commande, compte
    (auth)/              Connexion et inscription
    admin/               Back-office
    actions/             Server Actions (auth, panier, commandes, administration)
  components/            Composants partagés + composants d'administration
  lib/
    db.ts                Client Prisma
    auth.ts              Sessions, hachage, gardes de rôle
    queries.ts           Requêtes catalogue, facettes, recherche, notes
    search.ts            Normalisation et score de pertinence (partagé avec le seed)
    search-index.ts      Maintenance de l'index de recherche
    seo.ts               Métadonnées, canoniques et schémas JSON-LD
    seo-audit.ts         Diagnostic de référencement du back-office
    analytics.ts         Agrégats de vente pour le back-office
    format.ts            Prix, dates, slugs
```

### Deux conventions à connaître

**Les prix sont stockés en centimes** (entiers). Aucun flottant ne circule : `formatPrice()`
convertit à l'affichage, les formulaires reconvertissent à la saisie.

**Les visuels produits sont générés**, pas téléchargés. `scripts/gen-images.mjs` produit un SVG
par appareil (téléphone, portable, casque, manette, carte graphique…) dans `public/products/`.
Le catalogue reste donc net à toute résolution, sans dépendance réseau ni question de licence.

---

## Commandes

```bash
npm run dev        # serveur de développement
npm run build      # build de production
npm run start      # serveur de production
npm run setup      # génération du client + base + jeu de données
npm run db:reset   # remet la base à zéro et recharge la démonstration
npm run db:studio  # explorateur de base Prisma Studio
npm run e2e        # parcours de bout en bout (le serveur doit tourner)
npm run seo        # audit de référencement (le serveur doit tourner)
npm run verify     # les deux à la suite
```

---

## Passer en production

1. **Adresse du site** — première chose à faire : renseigner le domaine réel dans
   `/admin/seo`. Tant qu'il pointe sur `localhost`, les URL canoniques, le sitemap et les
   images sociales sont inexploitables — le diagnostic de la page le signale en erreur.
   Le domaine peut aussi être fixé par la variable `NEXT_PUBLIC_SITE_URL`.
2. **Base de données** — remplacer `provider = "sqlite"` par `postgresql` dans
   `prisma/schema.prisma`, installer `@prisma/adapter-pg`, adapter `src/lib/db.ts`, puis
   `npx prisma migrate deploy`.
3. **Secret de session** — renseigner un `AUTH_SECRET` long et aléatoire dans l'environnement.
   Les cookies passent automatiquement en `secure` hors développement.
4. **Paiement** — le passage en caisse valide la commande sans débit réel. Brancher un
   prestataire (Stripe, par exemple) dans `placeOrderAction`, à l'endroit signalé
   (`src/app/actions/orders.ts`), et ne créer la commande qu'après confirmation du paiement.
5. **Images produits** — le champ visuel accepte une URL absolue ; ajouter le domaine
   correspondant dans `images.remotePatterns` de `next.config.ts` si l'on quitte le dossier
   `public`.
6. **Search Console** — coller le code de vérification dans `/admin/seo`, puis soumettre
   `/sitemap.xml`. Vérifier au passage que l'indexation est bien autorisée.

## Licence

Projet de démonstration. Les marques citées appartiennent à leurs détenteurs respectifs ; les
visuels sont des illustrations vectorielles génériques, sans reproduction de produits réels.
