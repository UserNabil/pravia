/**
 * Parcours de bout en bout : connexion, panier, commande, back-office.
 * Usage : node scripts/e2e.mjs [baseUrl]
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const ORIGIN = process.argv[2] ?? "http://localhost:3000";
/** Toutes les pages vivent sous un prefixe de langue. */
const BASE = `${ORIGIN}/fr`;
/**
 * Identifiants du back-office. Les valeurs par defaut sont celles du jeu de
 * demonstration ; le deploiement demande de changer ce mot de passe avant
 * d'ouvrir le site. Ces deux variables permettent alors de rejouer la suite
 * contre la production sans reintroduire le mot de passe de demonstration.
 */
const ADMIN_EMAIL = process.env.PRAVIA_ADMIN_EMAIL ?? "admin@pravia.com";
const ADMIN_PASSWORD = process.env.PRAVIA_ADMIN_PASSWORD ?? "admin123";

const SHOTS = process.env.SHOT_DIR ?? path.join(process.cwd(), ".shots");
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
const consoleErrors = [];

function check(name, passed, detail = "") {
  results.push({ name, passed, detail });
  console.log(`${passed ? "OK  " : "ECHEC"} ${name}${detail ? ` — ${detail}` : ""}`);
}

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  colorScheme: "dark",
});
const page = await context.newPage();

page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(`${page.url()} :: ${m.text()}`);
});
page.on("pageerror", (e) => consoleErrors.push(`${page.url()} :: ${e}`));

async function shot(name) {
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`) });
}

try {
  /* ------------------------------------------------ boutique non connectee */
  await page.goto(BASE, { waitUntil: "networkidle" });
  check("Accueil se charge", await page.locator("h1").first().isVisible());

  await page.goto(`${BASE}/produits`, { waitUntil: "networkidle" });
  const cardCount = await page.locator("article").count();
  check("Catalogue affiche des produits", cardCount >= 12, `${cardCount} vignettes`);

  // Filtre par marque. On clique plutot que check() : l'input est controle par
  // une transition, son etat ne bascule qu'apres la navigation.
  await page.getByRole("checkbox", { name: /Apple/ }).first().click();
  await page.waitForTimeout(1500);
  check("Filtre marque applique", page.url().includes("marque=apple"), page.url());
  const filtered = await page.locator("article").count();
  check("Le filtre reduit les resultats", filtered > 0 && filtered <= cardCount, `${filtered} vignettes`);

  /* ------------------------------------------------------------ recherche */
  await page.goto(`${BASE}/produits?q=macbook`, { waitUntil: "networkidle" });
  const searchCount = await page.locator("article").count();
  check("Recherche texte fonctionne", searchCount > 0, `${searchCount} resultats pour "macbook"`);

  // L'index est normalise : accents et majuscules ne doivent rien changer.
  await page.goto(`${BASE}/produits?q=ECRAN`, { waitUntil: "networkidle" });
  const upper = await page.locator("article").count();
  await page.goto(`${BASE}/produits?q=écran`, { waitUntil: "networkidle" });
  const accented = await page.locator("article").count();
  check(
    "Recherche insensible a la casse et aux accents",
    upper > 0 && upper === accented,
    `"ECRAN" ${upper} / "écran" ${accented}`
  );

  // Le premier resultat doit etre pertinent, pas seulement present.
  await page.goto(`${BASE}/produits?q=galaxy s23 ultra`, { waitUntil: "networkidle" });
  // Le lien de la vignette porte le titre en aria-label : plus stable que le texte.
  const firstTitle =
    (await page.locator("article a[aria-label]").first().getAttribute("aria-label")) ?? "";
  check(
    "Classement par pertinence",
    firstTitle.toLowerCase().includes("s23 ultra"),
    `1er resultat : ${firstTitle}`
  );

  // Synonyme applique terme a terme.
  await page.goto(`${BASE}/produits?q=telephone pliable`, { waitUntil: "networkidle" });
  const synonymCount = await page.locator("article").count();
  check("Synonymes appliques", synonymCount > 0, `${synonymCount} resultats pour "telephone pliable"`);

  // Aucune reponse : la page doit proposer des alternatives.
  await page.goto(`${BASE}/produits?q=zzzzz iphone`, { waitUntil: "networkidle" });
  const hasSuggestions = await page
    .getByText("Ces produits pourraient vous interesser")
    .isVisible()
    .catch(() => false);
  check("Suggestions en cas de recherche infructueuse", hasSuggestions);

  // Autocompletion : l'API doit repondre et proposer des produits.
  // L'API de suggestions n'est pas localisee : elle vit a la racine.
  const suggestResponse = await page.evaluate(async (origin) => {
    const res = await fetch(`${origin}/api/recherche?q=iphone`);
    return res.ok ? await res.json() : null;
  }, ORIGIN);
  check(
    "Autocompletion renvoie des produits",
    (suggestResponse?.products?.length ?? 0) > 0,
    `${suggestResponse?.products?.length ?? 0} suggestions`
  );

  // Le panneau de suggestions doit s'afficher a la frappe.
  await page.goto(`${BASE}/produits`, { waitUntil: "networkidle" });
  const searchInput = page.getByPlaceholder("Rechercher un produit...").first();
  await searchInput.click();
  await searchInput.type("ipad", { delay: 60 });
  await page.waitForTimeout(1200);
  const panelVisible = await page
    .getByText("Voir tous les resultats pour")
    .isVisible()
    .catch(() => false);
  check("Panneau d'autocompletion affiche", panelVisible);

  /* ---------------------------------------------------------- connexion */
  await page.goto(`${BASE}/connexion`, { waitUntil: "networkidle" });
  await page.fill("#email", "camille@exemple.fr");
  await page.fill("#password", "demo1234");
  await page.getByRole("button", { name: /Se connecter/ }).click();
  await page.waitForURL("**/compte", { timeout: 15000 });
  check("Connexion client reussie", page.url().endsWith("/compte"));

  /* ------------------------------------------------------------- langues */
  for (const [locale, marker] of [
    ["en", "All the catalogue"],
    ["ar", "كل الكتالوج"],
  ]) {
    const response = await page.goto(`${ORIGIN}/${locale}/produits`, { waitUntil: "networkidle" });
    const lang = await page.evaluate(() => document.documentElement.lang);
    const dir = await page.evaluate(() => document.documentElement.dir);
    check(
      `Catalogue en ${locale}`,
      response?.status() === 200 && lang === locale && dir === (locale === "ar" ? "rtl" : "ltr"),
      `lang=${lang} dir=${dir}`
    );
    void marker;
  }

  // Le contenu traduit doit remonter jusqu'a la fiche produit.
  await page.goto(`${ORIGIN}/en/produits/galaxy-s23-ultra`, { waitUntil: "networkidle" });
  const englishBody = (await page.locator("body").innerText()).toLowerCase();
  check(
    "Fiche produit traduite en anglais",
    englishBody.includes("built-in s pen") || englishBody.includes("periscope telephoto"),
    "description anglaise servie"
  );

  await page.goto(`${ORIGIN}/ar/produits/galaxy-s23-ultra`, { waitUntil: "networkidle" });
  const arabicBody = await page.locator("body").innerText();
  check(
    "Fiche produit traduite en arabe",
    /قلم S Pen مدمج|التقريب/.test(arabicBody),
    "description arabe servie"
  );

  /* ------------------------------------------------------------- panier */
  await page.goto(`${BASE}/produits/ipad-air-11-m2`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Ajouter au panier/ }).click();
  await page.waitForTimeout(1800);

  await page.goto(`${BASE}/panier`, { waitUntil: "networkidle" });
  const cartHasItem = await page.getByText("iPad Air").first().isVisible();
  check("Ajout au panier persiste", cartHasItem);
  await shot("e2e-panier");

  /* ----------------------------------------------------------- commande */
  await page.goto(`${BASE}/commande`, { waitUntil: "networkidle" });
  await page.fill("#line1", "12 rue de la Paix");
  await page.fill("#zip", "75002");
  await page.fill("#city", "Paris");
  // Cibler le bouton par son libelle : l'en-tete contient aussi un submit (recherche).
  await page.getByRole("button", { name: /Confirmer et payer/ }).click();
  await page.waitForURL("**/compte/commandes/**", { timeout: 20000 });
  check("Commande passee", page.url().includes("/compte/commandes/"));
  const confirmed = await page.getByText("Commande confirmee").isVisible();
  check("Confirmation affichee", confirmed);
  await shot("e2e-confirmation");

  // Le panier doit etre vide apres la commande.
  await page.goto(`${BASE}/panier`, { waitUntil: "networkidle" });
  check("Panier vide apres commande", await page.getByText("Votre panier est vide").isVisible());

  /* ------------------------------------------------------- back-office */
  await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
  check(
    "Back-office refuse aux clients",
    page.url().includes("/compte"),
    `redirige vers ${page.url()}`
  );

  await context.clearCookies();
  await page.goto(`${BASE}/connexion`, { waitUntil: "networkidle" });
  await page.fill("#email", ADMIN_EMAIL);
  await page.fill("#password", ADMIN_PASSWORD);
  await page.getByRole("button", { name: /Se connecter/ }).click();
  await page.waitForURL("**/admin", { timeout: 15000 });
  check("Connexion admin reussie", page.url().endsWith("/admin"));
  await shot("e2e-admin-dashboard");

  for (const [label, route] of [
    ["Produits", "/admin/produits"],
    ["Nouveau produit", "/admin/produits/nouveau"],
    ["Categories", "/admin/categories"],
    ["Marques", "/admin/marques"],
    ["Commandes", "/admin/commandes"],
    ["Clients", "/admin/clients"],
    ["Avis", "/admin/avis"],
    ["Statistiques", "/admin/statistiques"],
    ["Referencement", "/admin/seo"],
    ["Recherche interne", "/admin/recherche"],
    ["Reglages", "/admin/reglages"],
  ]) {
    const response = await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
    check(`Back-office : ${label}`, response?.status() === 200, `HTTP ${response?.status()}`);
  }

  /* ------------------------------------- edition produit depuis l'admin */
  await page.goto(`${BASE}/admin/produits`, { waitUntil: "networkidle" });
  await page.locator("tbody tr a").first().click();
  // Navigation cote client : attendre l'URL, networkidle se resout trop tot.
  await page.waitForURL(/\/admin\/produits\/[^/]+$/, { timeout: 15000 });
  await page.locator("#stock").fill("77");
  await page.getByRole("button", { name: /Enregistrer les modifications/ }).click();
  await page.waitForTimeout(2500);
  check("Edition produit enregistree", await page.getByText("Produit enregistre").isVisible());
  await shot("e2e-admin-produit");

  /* ---------------------------------------------------------- 404 */
  const missing = await page.goto(`${BASE}/produits/inexistant-xyz`, { waitUntil: "networkidle" });
  check("Page 404 sur produit inconnu", missing?.status() === 404, `HTTP ${missing?.status()}`);
} catch (error) {
  check("Parcours complet sans exception", false, String(error).split("\n")[0]);
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.passed);
console.log(`\n${results.length - failed.length}/${results.length} verifications reussies`);

if (consoleErrors.length) {
  console.log(`\nErreurs console (${consoleErrors.length}) :`);
  for (const line of [...new Set(consoleErrors)].slice(0, 10)) console.log("  " + line);
}

process.exit(failed.length ? 1 : 0);
