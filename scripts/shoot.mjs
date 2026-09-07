/**
 * Capture d'ecrans de controle : node scripts/shoot.mjs <nom> <url> [theme] [largeur]
 * Les captures atterrissent dans le repertoire indique par SHOT_DIR.
 */
import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";

const [, , name, url, theme = "dark", width = "1440", height = "900"] = process.argv;
const OUT = process.env.SHOT_DIR ?? path.join(process.cwd(), ".shots");
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: Number(width), height: Number(height) },
  deviceScaleFactor: 1,
  colorScheme: theme === "light" ? "light" : "dark",
  storageState: fs.existsSync(".auth.json") ? ".auth.json" : undefined,
});

const page = await context.newPage();
const errors = [];
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
page.on("pageerror", (error) => errors.push(String(error)));

await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
await page.waitForTimeout(700);

const file = path.join(OUT, `${name}.png`);
await page.screenshot({ path: file, fullPage: process.env.FULL_PAGE === "1" });

console.log(`capture: ${file}`);
if (errors.length) console.log("erreurs console:\n" + errors.slice(0, 8).join("\n"));

await browser.close();
