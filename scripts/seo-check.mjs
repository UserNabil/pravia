/**
 * Controle de referencement : metadonnees, canoniques, donnees structurees,
 * sitemap, robots et images sociales.
 * Usage : node scripts/seo-check.mjs [baseUrl]
 */
import { chromium } from "playwright";

const ORIGIN = process.argv[2] ?? "http://localhost:3000";
/** Les pages vivent sous un prefixe de langue ; les fichiers techniques non. */
const BASE = `${ORIGIN}/fr`;

const results = [];
function check(name, passed, detail = "") {
  results.push({ name, passed });
  console.log(`${passed ? "OK  " : "ECHEC"} ${name}${detail ? ` — ${detail}` : ""}`);
}

const browser = await chromium.launch();
const page = await browser.newPage();

/** Extrait les balises SEO utiles d'une page rendue. */
async function inspect(path) {
  return inspectAt(`${BASE}${path}`);
}

/** Meme releve, sur une adresse complete. */
async function inspectAt(url) {
  const response = await page.goto(url, { waitUntil: "networkidle" });
  return {
    status: response?.status(),
    ...(await page.evaluate(() => {
      const meta = (selector) => document.querySelector(selector)?.getAttribute("content") ?? null;
      return {
        title: document.title,
        description: meta('meta[name="description"]'),
        robots: meta('meta[name="robots"]'),
        canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null,
        ogTitle: meta('meta[property="og:title"]'),
        ogImage: meta('meta[property="og:image"]'),
        ogType: meta('meta[property="og:type"]'),
        twitterCard: meta('meta[name="twitter:card"]'),
        lang: document.documentElement.lang,
        dir: document.documentElement.dir,
        alternates: [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map((l) => ({
          hreflang: l.getAttribute("hreflang"),
          href: l.getAttribute("href"),
        })),
        h1Count: document.querySelectorAll("h1").length,
        imagesWithoutAlt: [...document.querySelectorAll("img")].filter(
          (img) => !img.hasAttribute("alt")
        ).length,
        jsonLd: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => {
          try {
            return JSON.parse(s.textContent ?? "{}")["@type"];
          } catch {
            return "INVALIDE";
          }
        }),
      };
    })),
  };
}

try {
  /* ------------------------------------------------------------- accueil */
  const home = await inspect("/");
  check("Accueil : titre renseigne", Boolean(home.title) && home.title.length <= 65, `"${home.title}" (${home.title.length} car.)`);
  check(
    "Accueil : description entre 70 et 160 caracteres",
    Boolean(home.description) && home.description.length >= 70 && home.description.length <= 160,
    `${home.description?.length ?? 0} car.`
  );
  check("Accueil : canonique", Boolean(home.canonical), home.canonical ?? "");
  check("Accueil : un seul H1", home.h1Count === 1, `${home.h1Count} H1`);
  check("Accueil : langue declaree", home.lang === "fr");
  check("Accueil : carte Twitter", home.twitterCard === "summary_large_image");
  check("Accueil : image OpenGraph", Boolean(home.ogImage), home.ogImage ?? "");
  check(
    "Accueil : donnees structurees Organization + WebSite",
    home.jsonLd.includes("Organization") && home.jsonLd.includes("WebSite"),
    home.jsonLd.join(", ")
  );
  check("Accueil : toutes les images ont un alt", home.imagesWithoutAlt === 0, `${home.imagesWithoutAlt} sans alt`);

  /* ------------------------------------------------------------- produit */
  const product = await inspect("/produits/galaxy-s23-ultra");
  check("Produit : titre specifique", product.title.includes("Galaxy S23 Ultra"), product.title);
  check("Produit : canonique propre", product.canonical?.endsWith("/produits/galaxy-s23-ultra") ?? false, product.canonical ?? "");
  check("Produit : schema Product", product.jsonLd.includes("Product"), product.jsonLd.join(", "));
  check("Produit : fil d'Ariane structure", product.jsonLd.includes("BreadcrumbList"));
  check("Produit : un seul H1", product.h1Count === 1, `${product.h1Count} H1`);
  check("Produit : toutes les images ont un alt", product.imagesWithoutAlt === 0, `${product.imagesWithoutAlt} sans alt`);

  // Le schema Product doit porter prix, disponibilite et note.
  const offer = await page.evaluate(() => {
    for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
      const data = JSON.parse(script.textContent ?? "{}");
      if (data["@type"] === "Product") return data;
    }
    return null;
  });
  check("Produit : offre avec prix et devise", offer?.offers?.price && offer?.offers?.priceCurrency === "EUR", `${offer?.offers?.price} ${offer?.offers?.priceCurrency}`);
  check("Produit : disponibilite declaree", Boolean(offer?.offers?.availability), offer?.offers?.availability ?? "");
  check("Produit : note agregee", Boolean(offer?.aggregateRating), offer?.aggregateRating?.ratingValue ?? "aucun avis");

  /* ------------------------------------------------------------ categorie */
  const category = await inspect("/produits?categorie=smartphones");
  check("Categorie : titre dedie", category.title.toLowerCase().includes("smartphone"), category.title);
  check("Categorie : indexable", !category.robots?.includes("noindex"), category.robots ?? "index par defaut");
  check("Categorie : canonique sans parasites", category.canonical?.includes("categorie=smartphones") ?? false, category.canonical ?? "");

  /* ------------------------------------------------------------- langues */
  check(
    "Accueil : alternances de langue declarees",
    ["fr-FR", "en-GB", "ar-MA", "x-default"].every((tag) =>
      home.alternates.some((a) => a.hreflang === tag)
    ),
    home.alternates.map((a) => a.hreflang).join(", ")
  );

  const arabic = await inspectAt(`${ORIGIN}/ar`);
  check("Accueil arabe : sens d'ecriture", arabic.lang === "ar" && arabic.dir === "rtl", `lang=${arabic.lang} dir=${arabic.dir}`);
  check(
    "Accueil arabe : canonique propre a la langue",
    (arabic.canonical ?? "").endsWith("/ar"),
    arabic.canonical ?? ""
  );

  /* ------------------------------------------------------------ recherche */
  const search = await inspect("/produits?q=iphone");
  check("Recherche : exclue de l'index", search.robots?.includes("noindex") ?? false, search.robots ?? "");

  /* ---------------------------------------------------------- pages privees */
  const cart = await inspect("/panier");
  check("Panier : exclu de l'index", cart.robots?.includes("noindex") ?? false, cart.robots ?? "");

  /* ------------------------------------------------------------------ aide */
  const help = await inspect("/aide");
  check("Aide : schema FAQPage", help.jsonLd.includes("FAQPage"), help.jsonLd.join(", "));

  /* --------------------------------------------------- fichiers techniques */
  const robots = await page.goto(`${ORIGIN}/robots.txt`);
  const robotsBody = await robots.text();
  check("robots.txt servi", robots.status() === 200);
  check("robots.txt reference le sitemap", robotsBody.includes("sitemap.xml"));
  check(
    "robots.txt protege le back-office",
    ["fr", "en", "ar"].every((locale) => robotsBody.includes(`Disallow: /${locale}/admin`))
  );

  const sitemap = await page.goto(`${ORIGIN}/sitemap.xml`);
  const sitemapBody = await sitemap.text();
  const urlCount = (sitemapBody.match(/<loc>/g) ?? []).length;
  check("sitemap.xml servi", sitemap.status() === 200);
  check("sitemap contient le catalogue", urlCount >= 45, `${urlCount} URL`);
  check(
    "sitemap exclut les pages privees",
    !sitemapBody.includes("/panier") && !sitemapBody.includes("/admin")
  );
  check(
    "sitemap declare les trois langues",
    ["fr", "en", "ar"].every((locale) => sitemapBody.includes(`/${locale}/produits/`)),
    "hreflang par URL"
  );

  const manifest = await page.goto(`${ORIGIN}/manifest.webmanifest`);
  check("manifest servi", manifest.status() === 200, `HTTP ${manifest.status()}`);

  const og = await page.goto(`${BASE}/opengraph-image`);
  check(
    "image sociale generee",
    og.status() === 200 && (og.headers()["content-type"] ?? "").includes("image"),
    og.headers()["content-type"] ?? ""
  );

  // L'URL de l'image produit porte une empreinte : on suit celle que declare la page.
  check(
    "image sociale propre au produit",
    Boolean(product.ogImage) && product.ogImage !== home.ogImage,
    product.ogImage ?? "aucune"
  );
  // Les URL absolues proviennent de l'adresse configuree en base, qui peut
  // differer du port de test : on ne garde que le chemin.
  const productOgUrl = new URL(product.ogImage);
  const productOg = await page.goto(`${ORIGIN}${productOgUrl.pathname}${productOgUrl.search}`);
  check(
    "image sociale produit generee",
    productOg.status() === 200 && (productOg.headers()["content-type"] ?? "").includes("image"),
    `HTTP ${productOg.status()}`
  );
} catch (error) {
  check("Controle complet sans exception", false, String(error).split("\n")[0]);
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.passed);
console.log(`\n${results.length - failed.length}/${results.length} verifications SEO reussies`);
process.exit(failed.length ? 1 : 0);
