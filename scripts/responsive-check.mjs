/**
 * Audit du responsive, en LTR et en RTL.
 *
 * Detecte trois defauts invisibles sur un grand ecran :
 *   - un debordement horizontal, qui force a faire defiler la page lateralement ;
 *   - un element qui sort de la zone de contenu, cause habituelle du precedent ;
 *   - une commande tactile trop petite pour un doigt.
 *
 * Les liens en pleine ligne de texte ne sont pas comptes comme cibles tactiles :
 * seuls les vrais boutons et les liens mis en forme comme tels le sont.
 *
 * Usage : node scripts/responsive-check.mjs [baseUrl]
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3000";
const SHOTS = process.env.SHOT_DIR ?? path.join(process.cwd(), ".shots");
fs.mkdirSync(SHOTS, { recursive: true });

/** Du petit Android au grand ecran de bureau. */
const VIEWPORTS = [
  { name: "320", width: 320, height: 800 },
  { name: "375", width: 375, height: 812 },
  { name: "414", width: 414, height: 896 },
  { name: "768", width: 768, height: 1024 },
  { name: "1024", width: 1024, height: 768 },
  { name: "1440", width: 1440, height: 900 },
];

const PAGES = [
  ["accueil", "/fr"],
  ["catalogue", "/fr/produits"],
  ["produit", "/fr/produits/galaxy-s23-ultra"],
  ["panier", "/fr/panier"],
  ["aide", "/fr/aide"],
  ["connexion", "/fr/connexion"],
  ["accueil-ar", "/ar"],
  ["catalogue-ar", "/ar/produits"],
  ["produit-ar", "/ar/produits/galaxy-s23-ultra"],
  ["accueil-en", "/en"],
  ["catalogue-en", "/en/produits"],
  ["inscription-ar", "/ar/inscription"],
];

/** Taille minimale confortable pour une commande tactile. */
const MIN_TARGET = 24;

async function inspect(page) {
  return page.evaluate((minTarget) => {
    const doc = document.documentElement;
    const overflow = Math.max(0, doc.scrollWidth - doc.clientWidth);

    const wide = [];
    const seen = new Set();

    for (const el of document.querySelectorAll("body *")) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (rect.width <= doc.clientWidth + 2) continue;

      // Un conteneur volontairement defilant n'est pas un defaut.
      const style = window.getComputedStyle(el);
      if (["auto", "scroll"].includes(style.overflowX)) continue;
      if (el.closest('[class*="overflow-x-auto"],[class*="overflow-auto"]')) continue;

      // Un element decoupe par un ancetre ne fait pas defiler la page :
      // il deborde visuellement mais reste sans effet sur la mise en page.
      let clipped = false;
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const ps = window.getComputedStyle(p);
        if (["hidden", "clip", "auto", "scroll"].includes(ps.overflowX)) { clipped = true; break; }
      }
      if (clipped) continue;

      const signature = `${el.tagName}.${String(el.className).slice(0, 60)}`;
      if (seen.has(signature)) continue;
      seen.add(signature);

      wide.push({
        tag: el.tagName.toLowerCase(),
        className: String(el.className).slice(0, 80),
        width: Math.round(rect.width),
        excess: Math.round(rect.width - doc.clientWidth),
      });
    }

    // Commandes tactiles : boutons, liens mis en forme, champs de saisie.
    const small = [];
    const controls = document.querySelectorAll(
      "button, [role='button'], input, select, textarea, a[href]"
    );

    for (const el of controls) {
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") continue;

      // Un lien au fil du texte n'est pas une cible tactile a dimensionner.
      if (el.tagName === "A" && style.display === "inline") continue;

      // Un titre tronque sur plusieurs lignes est du texte, pas un bouton :
      // dans une vignette produit, l'image mene deja au meme endroit.
      if (
        el.tagName === "A" &&
        /line-clamp|truncate/.test(String(el.className))
      ) continue;

      // Une case a cocher est cliquable via son libelle : c'est lui qu'on mesure.
      let target = el;
      if (el.tagName === "INPUT" && ["checkbox", "radio"].includes(el.type)) {
        target = el.closest("label") ?? el;
      }

      const rect = target.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (rect.height >= minTarget && rect.width >= minTarget) continue;

      small.push({
        tag: el.tagName.toLowerCase(),
        label: (el.getAttribute("aria-label") || el.textContent || el.type || "").trim().slice(0, 40),
        size: `${Math.round(rect.width)}x${Math.round(rect.height)}`,
      });
    }

    return { overflow, wide: wide.slice(0, 5), small: small.slice(0, 5) };
  }, MIN_TARGET);
}

const browser = await chromium.launch();
const findings = [];
let checked = 0;

try {
  for (const [label, route] of PAGES) {
    for (const viewport of VIEWPORTS) {
      checked += 1;
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        colorScheme: "dark",
        isMobile: viewport.width < 768,
        hasTouch: viewport.width < 768,
      });
      const page = await context.newPage();

      try {
        await page.goto(`${BASE}${route}`, { waitUntil: "networkidle", timeout: 40000 });
        await page.waitForTimeout(350);

        const result = await inspect(page);
        const broken = result.overflow > 2 || result.wide.length > 0 || result.small.length > 0;

        if (broken) {
          findings.push({ label, viewport: viewport.name, ...result });
          console.log(`ECHEC ${label} @ ${viewport.name}px`);
          if (result.overflow > 2) console.log(`   defilement horizontal de ${result.overflow}px`);
          for (const el of result.wide) {
            console.log(`   trop large de ${el.excess}px : <${el.tag}> ${el.className}`);
          }
          for (const el of result.small) {
            console.log(`   cible ${el.size} : <${el.tag}> ${el.label}`);
          }
          await page.screenshot({ path: path.join(SHOTS, `${label}-${viewport.name}.png`) });
        } else {
          console.log(`OK    ${label} @ ${viewport.name}px`);
        }
      } catch (error) {
        console.log(`ERREUR ${label} @ ${viewport.name}px : ${String(error).split("\n")[0]}`);
        findings.push({ label, viewport: viewport.name, error: true });
      }

      await context.close();
    }
  }
} finally {
  await browser.close();
}

console.log(`\n${checked - findings.length}/${checked} combinaisons sans defaut`);
process.exit(findings.length ? 1 : 0);
