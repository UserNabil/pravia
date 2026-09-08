/**
 * Genere les illustrations produits en SVG dans public/products.
 * Aucune ressource externe : le catalogue reste net et disponible hors-ligne.
 */
import fs from "node:fs";
import path from "node:path";

const OUT = path.join(process.cwd(), "public", "products");
fs.mkdirSync(OUT, { recursive: true });

const S = 800;

function defs(id, screen) {
  const [a, b, c] = screen;
  return `
  <defs>
    <linearGradient id="scr-${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${a}"/>
      <stop offset="55%" stop-color="${b}"/>
      <stop offset="100%" stop-color="${c}"/>
    </linearGradient>
    <radialGradient id="orb-${id}" cx="50%" cy="45%" r="55%">
      <stop offset="0%" stop-color="${c}" stop-opacity="0.95"/>
      <stop offset="60%" stop-color="${b}" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="${a}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="body-${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.22"/>
      <stop offset="45%" stop-color="#ffffff" stop-opacity="0.04"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.22"/>
    </linearGradient>
  </defs>`;
}

const wrap = (id, screen, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}" role="img">${defs(id, screen)}${body}</svg>`;

/* ------------------------------------------------------------------ formes */

function phone(id, frame, screen, { notch = "island" } = {}) {
  const x = 268, y = 96, w = 264, h = 560, r = 46;
  return wrap(id, screen, `
  <g>
    <ellipse cx="400" cy="712" rx="150" ry="20" fill="#000" opacity="0.16"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${frame}"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="url(#body-${id})"/>
    <rect x="${x + 10}" y="${y + 10}" width="${w - 20}" height="${h - 20}" rx="${r - 10}" fill="#07090d"/>
    <rect x="${x + 16}" y="${y + 16}" width="${w - 32}" height="${h - 32}" rx="${r - 16}" fill="url(#scr-${id})"/>
    <ellipse cx="400" cy="${y + 240}" rx="118" ry="150" fill="url(#orb-${id})"/>
    ${notch === "island"
      ? `<rect x="${400 - 44}" y="${y + 34}" width="88" height="26" rx="13" fill="#05070a"/>`
      : `<circle cx="400" cy="${y + 44}" r="9" fill="#05070a"/>`}
    <rect x="${x + 4}" y="${y + 150}" width="3" height="60" rx="2" fill="#fff" opacity="0.25"/>
  </g>`);
}

function phoneBack(id, frame, lens, { cameras = 3 } = {}) {
  const x = 268, y = 96, w = 264, h = 560, r = 46;
  const lensY = [176, 246, 316].slice(0, cameras);
  return wrap(id, [frame, frame, lens], `
  <g>
    <ellipse cx="400" cy="712" rx="150" ry="20" fill="#000" opacity="0.16"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${frame}"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="url(#body-${id})"/>
    ${lensY.map((cy) => `
    <circle cx="${x + 62}" cy="${cy}" r="30" fill="#0b0d12"/>
    <circle cx="${x + 62}" cy="${cy}" r="21" fill="${lens}" opacity="0.85"/>
    <circle cx="${x + 54}" cy="${cy - 8}" r="6" fill="#fff" opacity="0.5"/>`).join("")}
    <circle cx="${x + 62}" cy="${lensY[lensY.length - 1] + 62}" r="9" fill="#fde68a" opacity="0.8"/>
  </g>`);
}

function foldable(id, frame, screen) {
  return wrap(id, screen, `
  <g>
    <ellipse cx="400" cy="700" rx="190" ry="20" fill="#000" opacity="0.16"/>
    <g transform="translate(150 120) skewY(4)">
      <rect x="0" y="0" width="230" height="500" rx="18" fill="${frame}"/>
      <rect x="0" y="0" width="230" height="500" rx="18" fill="url(#body-${id})"/>
      <rect x="10" y="12" width="210" height="476" rx="12" fill="url(#scr-${id})"/>
      <ellipse cx="115" cy="230" rx="105" ry="150" fill="url(#orb-${id})"/>
    </g>
    <g transform="translate(388 96) skewY(-4)">
      <rect x="0" y="0" width="240" height="500" rx="18" fill="${frame}"/>
      <rect x="0" y="0" width="240" height="500" rx="18" fill="url(#body-${id})"/>
      <rect x="10" y="12" width="220" height="476" rx="12" fill="#0a0c11" opacity="0.9"/>
      <rect x="18" y="20" width="204" height="460" rx="10" fill="url(#scr-${id})" opacity="0.85"/>
    </g>
    <rect x="378" y="104" width="12" height="500" rx="6" fill="#000" opacity="0.35"/>
  </g>`);
}

function tablet(id, frame, screen) {
  const x = 176, y = 132, w = 448, h = 560, r = 30;
  return wrap(id, screen, `
  <g>
    <ellipse cx="400" cy="726" rx="210" ry="18" fill="#000" opacity="0.14"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${frame}"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="url(#body-${id})"/>
    <rect x="${x + 16}" y="${y + 16}" width="${w - 32}" height="${h - 32}" rx="${r - 14}" fill="url(#scr-${id})"/>
    <ellipse cx="400" cy="${y + 280}" rx="180" ry="190" fill="url(#orb-${id})"/>
    <circle cx="400" cy="${y + 8}" r="4" fill="#0b0d12"/>
  </g>`);
}

function laptop(id, frame, screen) {
  return wrap(id, screen, `
  <g>
    <ellipse cx="400" cy="640" rx="270" ry="20" fill="#000" opacity="0.16"/>
    <rect x="176" y="152" width="448" height="304" rx="16" fill="${frame}"/>
    <rect x="176" y="152" width="448" height="304" rx="16" fill="url(#body-${id})"/>
    <rect x="192" y="168" width="416" height="266" rx="8" fill="url(#scr-${id})"/>
    <ellipse cx="400" cy="300" rx="180" ry="120" fill="url(#orb-${id})"/>
    <path d="M120 456 H680 L716 604 H84 Z" fill="${frame}"/>
    <path d="M120 456 H680 L716 604 H84 Z" fill="url(#body-${id})"/>
    <rect x="330" y="576" width="140" height="10" rx="5" fill="#000" opacity="0.3"/>
  </g>`);
}

function monitor(id, frame, screen) {
  return wrap(id, screen, `
  <g>
    <ellipse cx="400" cy="700" rx="200" ry="18" fill="#000" opacity="0.14"/>
    <rect x="96" y="128" width="608" height="368" rx="18" fill="${frame}"/>
    <rect x="96" y="128" width="608" height="368" rx="18" fill="url(#body-${id})"/>
    <rect x="114" y="146" width="572" height="316" rx="8" fill="url(#scr-${id})"/>
    <ellipse cx="400" cy="304" rx="250" ry="140" fill="url(#orb-${id})"/>
    <rect x="360" y="496" width="80" height="120" fill="${frame}"/>
    <rect x="272" y="612" width="256" height="26" rx="13" fill="${frame}"/>
  </g>`);
}

function watch(id, frame, screen) {
  return wrap(id, screen, `
  <g>
    <ellipse cx="400" cy="716" rx="120" ry="16" fill="#000" opacity="0.14"/>
    <rect x="326" y="80" width="148" height="180" rx="46" fill="${frame}" opacity="0.75"/>
    <rect x="326" y="540" width="148" height="180" rx="46" fill="${frame}" opacity="0.75"/>
    <rect x="288" y="228" width="224" height="344" rx="72" fill="${frame}"/>
    <rect x="288" y="228" width="224" height="344" rx="72" fill="url(#body-${id})"/>
    <rect x="308" y="248" width="184" height="304" rx="58" fill="#07090d"/>
    <rect x="318" y="258" width="164" height="284" rx="50" fill="url(#scr-${id})"/>
    <ellipse cx="400" cy="400" rx="90" ry="120" fill="url(#orb-${id})"/>
    <rect x="512" y="336" width="18" height="60" rx="9" fill="${frame}"/>
  </g>`);
}

function headphones(id, frame, accent) {
  return wrap(id, [accent, frame, accent], `
  <g>
    <ellipse cx="400" cy="716" rx="150" ry="16" fill="#000" opacity="0.14"/>
    <path d="M176 440 V344 a224 224 0 0 1 448 0 V440" fill="none" stroke="${frame}" stroke-width="46" stroke-linecap="round"/>
    <rect x="128" y="400" width="112" height="216" rx="52" fill="${frame}"/>
    <rect x="128" y="400" width="112" height="216" rx="52" fill="url(#body-${id})"/>
    <rect x="560" y="400" width="112" height="216" rx="52" fill="${frame}"/>
    <rect x="560" y="400" width="112" height="216" rx="52" fill="url(#body-${id})"/>
    <ellipse cx="184" cy="508" rx="36" ry="74" fill="${accent}" opacity="0.55"/>
    <ellipse cx="616" cy="508" rx="36" ry="74" fill="${accent}" opacity="0.55"/>
  </g>`);
}

function earbuds(id, frame, accent) {
  return wrap(id, [accent, frame, accent], `
  <g>
    <ellipse cx="400" cy="700" rx="170" ry="18" fill="#000" opacity="0.14"/>
    <rect x="240" y="380" width="320" height="240" rx="60" fill="${frame}"/>
    <rect x="240" y="380" width="320" height="240" rx="60" fill="url(#body-${id})"/>
    <rect x="240" y="470" width="320" height="8" fill="#000" opacity="0.25"/>
    <circle cx="400" cy="560" r="16" fill="${accent}" opacity="0.8"/>
    <g transform="translate(276 150)">
      <circle cx="46" cy="46" r="46" fill="${frame}"/><circle cx="46" cy="46" r="46" fill="url(#body-${id})"/>
      <rect x="30" y="76" width="32" height="120" rx="16" fill="${frame}"/>
      <circle cx="46" cy="46" r="18" fill="${accent}" opacity="0.55"/>
    </g>
    <g transform="translate(408 150)">
      <circle cx="46" cy="46" r="46" fill="${frame}"/><circle cx="46" cy="46" r="46" fill="url(#body-${id})"/>
      <rect x="30" y="76" width="32" height="120" rx="16" fill="${frame}"/>
      <circle cx="46" cy="46" r="18" fill="${accent}" opacity="0.55"/>
    </g>
  </g>`);
}

function camera(id, frame, accent) {
  return wrap(id, [accent, frame, accent], `
  <g>
    <ellipse cx="400" cy="672" rx="200" ry="18" fill="#000" opacity="0.14"/>
    <rect x="304" y="140" width="192" height="60" rx="14" fill="${frame}" opacity="0.85"/>
    <rect x="120" y="196" width="560" height="360" rx="42" fill="${frame}"/>
    <rect x="120" y="196" width="560" height="360" rx="42" fill="url(#body-${id})"/>
    <circle cx="400" cy="382" r="150" fill="#0a0c11"/>
    <circle cx="400" cy="382" r="122" fill="${accent}" opacity="0.35"/>
    <circle cx="400" cy="382" r="86" fill="#05070a"/>
    <circle cx="400" cy="382" r="60" fill="${accent}" opacity="0.55"/>
    <circle cx="368" cy="348" r="22" fill="#fff" opacity="0.35"/>
    <circle cx="596" cy="256" r="16" fill="#fca5a5" opacity="0.8"/>
  </g>`);
}

function gamepad(id, frame, accent) {
  // Silhouette de manette : corps central etroit et poignees ecartees vers le bas.
  const body =
    "M256 286 h288 q60 0 76 54 l44 152 q22 76 -42 92 q-46 12 -74 -34 l-40 -66 q-14 -22 -42 -22 h-132 " +
    "q-28 0 -42 22 l-40 66 q-28 46 -74 34 q-64 -16 -42 -92 l44 -152 q16 -54 76 -54 Z";
  return wrap(id, [accent, frame, accent], `
  <g>
    <ellipse cx="400" cy="592" rx="196" ry="16" fill="#000" opacity="0.14"/>
    <path d="${body}" fill="${frame}"/>
    <path d="${body}" fill="url(#body-${id})"/>
    <g transform="translate(292 372)">
      <rect x="-13" y="-40" width="26" height="80" rx="9" fill="#0b0d12"/>
      <rect x="-40" y="-13" width="80" height="26" rx="9" fill="#0b0d12"/>
    </g>
    <g transform="translate(508 372)">
      <circle cx="0" cy="-26" r="14" fill="${accent}" opacity="0.9"/>
      <circle cx="0" cy="26" r="14" fill="${accent}" opacity="0.55"/>
      <circle cx="-26" cy="0" r="14" fill="${accent}" opacity="0.7"/>
      <circle cx="26" cy="0" r="14" fill="${accent}" opacity="0.7"/>
    </g>
    <circle cx="352" cy="452" r="34" fill="#0b0d12"/>
    <circle cx="352" cy="452" r="20" fill="${accent}" opacity="0.45"/>
    <circle cx="448" cy="452" r="34" fill="#0b0d12"/>
    <circle cx="448" cy="452" r="20" fill="${accent}" opacity="0.45"/>
    <rect x="366" y="334" width="68" height="20" rx="10" fill="${accent}" opacity="0.35"/>
    <rect x="288" y="262" width="72" height="26" rx="12" fill="${frame}" opacity="0.9"/>
    <rect x="440" y="262" width="72" height="26" rx="12" fill="${frame}" opacity="0.9"/>
  </g>`);
}

function gpu(id, frame, accent) {
  const blades = [248, 552]
    .map((cx) =>
      Array.from({ length: 9 }, (_, i) => {
        const a = (i * 40 * Math.PI) / 180;
        const bx = (cx + Math.cos(a) * 54).toFixed(1);
        const by = (368 + Math.sin(a) * 54).toFixed(1);
        return `<ellipse cx="${bx}" cy="${by}" rx="34" ry="14" transform="rotate(${i * 40} ${bx} ${by})" fill="${accent}" opacity="0.5"/>`;
      }).join("")
    )
    .join("");
  return wrap(id, [accent, frame, accent], `
  <g>
    <ellipse cx="400" cy="628" rx="240" ry="18" fill="#000" opacity="0.14"/>
    <rect x="80" y="216" width="640" height="304" rx="26" fill="${frame}"/>
    <rect x="80" y="216" width="640" height="304" rx="26" fill="url(#body-${id})"/>
    <circle cx="248" cy="368" r="104" fill="#0a0c11"/>
    <circle cx="552" cy="368" r="104" fill="#0a0c11"/>
    ${blades}
    <circle cx="248" cy="368" r="26" fill="${accent}"/><circle cx="552" cy="368" r="26" fill="${accent}"/>
    <rect x="80" y="520" width="640" height="26" rx="8" fill="${frame}" opacity="0.85"/>
    <rect x="300" y="546" width="200" height="26" rx="4" fill="#d4a017" opacity="0.8"/>
  </g>`);
}

function keyboard(id, frame, accent) {
  const keys = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 13; c++) {
      const opacity = (r + c) % 5 === 0 ? 0.55 : 0.16;
      keys.push(
        `<rect x="${118 + c * 44}" y="${292 + r * 52}" width="36" height="42" rx="8" fill="#0d1017"/>` +
        `<rect x="${118 + c * 44}" y="${292 + r * 52}" width="36" height="36" rx="8" fill="${accent}" opacity="${opacity}"/>`
      );
    }
  }
  return wrap(id, [accent, frame, accent], `
  <g>
    <ellipse cx="400" cy="580" rx="270" ry="16" fill="#000" opacity="0.14"/>
    <rect x="88" y="256" width="624" height="288" rx="26" fill="${frame}"/>
    <rect x="88" y="256" width="624" height="288" rx="26" fill="url(#body-${id})"/>
    ${keys.join("")}
    <rect x="228" y="500" width="344" height="30" rx="8" fill="#0d1017"/>
  </g>`);
}

function drone(id, frame, accent) {
  const rotors = [[180, 220], [620, 220], [180, 500], [620, 500]]
    .map(([cx, cy]) => `
      <line x1="400" y1="360" x2="${cx}" y2="${cy}" stroke="${frame}" stroke-width="30" stroke-linecap="round"/>
      <circle cx="${cx}" cy="${cy}" r="34" fill="${frame}"/>
      <ellipse cx="${cx}" cy="${cy}" rx="118" ry="12" fill="${accent}" opacity="0.28"/>
      <circle cx="${cx}" cy="${cy}" r="12" fill="${accent}"/>`)
    .join("");
  return wrap(id, [accent, frame, accent], `
  <g>
    <ellipse cx="400" cy="660" rx="200" ry="18" fill="#000" opacity="0.14"/>
    ${rotors}
    <rect x="300" y="292" width="200" height="140" rx="40" fill="${frame}"/>
    <rect x="300" y="292" width="200" height="140" rx="40" fill="url(#body-${id})"/>
    <circle cx="400" cy="452" r="46" fill="#0a0c11"/>
    <circle cx="400" cy="452" r="30" fill="${accent}" opacity="0.6"/>
    <circle cx="388" cy="440" r="10" fill="#fff" opacity="0.4"/>
  </g>`);
}

function speaker(id, frame, accent) {
  return wrap(id, [accent, frame, accent], `
  <g>
    <ellipse cx="400" cy="700" rx="150" ry="18" fill="#000" opacity="0.14"/>
    <rect x="264" y="132" width="272" height="536" rx="72" fill="${frame}"/>
    <rect x="264" y="132" width="272" height="536" rx="72" fill="url(#body-${id})"/>
    <circle cx="400" cy="290" r="86" fill="#0a0c11"/>
    <circle cx="400" cy="290" r="60" fill="${accent}" opacity="0.4"/>
    <circle cx="400" cy="290" r="24" fill="#05070a"/>
    <circle cx="400" cy="500" r="86" fill="#0a0c11"/>
    <circle cx="400" cy="500" r="60" fill="${accent}" opacity="0.3"/>
    <circle cx="400" cy="500" r="24" fill="#05070a"/>
    <rect x="336" y="618" width="128" height="8" rx="4" fill="${accent}" opacity="0.6"/>
  </g>`);
}

/* ------------------------------------------------------------------ palettes */

export const SCREENS = {
  aurora: ["#0b1220", "#1e3a8a", "#38bdf8"],
  ember: ["#1a0b0b", "#7c2d12", "#fb923c"],
  jade: ["#04140f", "#065f46", "#34d399"],
  violet: ["#120a1f", "#5b21b6", "#c084fc"],
  rose: ["#1a0713", "#9d174d", "#fb7185"],
  cyan: ["#04121a", "#0e7490", "#22d3ee"],
  gold: ["#1a1405", "#a16207", "#fcd34d"],
  slate: ["#0b0f16", "#334155", "#94a3b8"],
  emerald: ["#022c22", "#047857", "#6ee7b7"],
};

/* ------------------------------------------------- accessoires de telephone */

/**
 * Coque : dos de telephone vu de face, avec sa decoupe d'objectifs et le
 * rebord qui deborde de l'ecran. C'est la forme la plus declinee en couleurs,
 * l'accent porte donc le corps entier plutot qu'un detail.
 */
function phoneCase(id, frame, accent) {
  return wrap(id, [accent, frame, accent], `
  <g>
    <ellipse cx="400" cy="742" rx="150" ry="16" fill="#000" opacity="0.14"/>
    <rect x="236" y="86" width="328" height="628" rx="72" fill="${accent}"/>
    <rect x="236" y="86" width="328" height="628" rx="72" fill="url(#body-${id})"/>
    <rect x="258" y="108" width="284" height="584" rx="56" fill="#000" opacity="0.16"/>
    <rect x="272" y="122" width="256" height="556" rx="46" fill="${accent}"/>
    <g transform="translate(296 148)">
      <rect x="0" y="0" width="164" height="164" rx="42" fill="#000" opacity="0.28"/>
      <circle cx="52" cy="52" r="30" fill="${frame}"/><circle cx="52" cy="52" r="13" fill="${accent}" opacity="0.7"/>
      <circle cx="118" cy="52" r="30" fill="${frame}"/><circle cx="118" cy="52" r="13" fill="${accent}" opacity="0.7"/>
      <circle cx="52" cy="118" r="30" fill="${frame}"/><circle cx="52" cy="118" r="13" fill="${accent}" opacity="0.7"/>
      <circle cx="120" cy="120" r="14" fill="${frame}" opacity="0.8"/>
    </g>
    <rect x="566" y="238" width="14" height="76" rx="7" fill="${accent}"/>
    <rect x="566" y="336" width="14" height="52" rx="7" fill="${accent}"/>
  </g>`);
}

/** Verre trempe : la plaque, sa brillance en diagonale, et le telephone dessous. */
function screenProtector(id, frame, accent) {
  return wrap(id, [accent, frame, accent], `
  <g>
    <ellipse cx="400" cy="744" rx="150" ry="16" fill="#000" opacity="0.14"/>
    <rect x="248" y="128" width="304" height="590" rx="60" fill="${frame}"/>
    <rect x="248" y="128" width="304" height="590" rx="60" fill="url(#body-${id})"/>
    <rect x="268" y="150" width="264" height="546" rx="46" fill="#000" opacity="0.35"/>
    <g transform="translate(0 -46)">
      <rect x="286" y="112" width="304" height="590" rx="52" fill="${accent}" opacity="0.20"/>
      <rect x="286" y="112" width="304" height="590" rx="52" fill="none" stroke="${accent}" stroke-width="6" opacity="0.85"/>
      <path d="M310 640 L560 190 L590 250 L346 686 Z" fill="#fff" opacity="0.16"/>
      <circle cx="438" cy="152" r="10" fill="${accent}" opacity="0.6"/>
    </g>
  </g>`);
}

/** Chargeur secteur : bloc, broches, et port en facade. */
function charger(id, frame, accent) {
  return wrap(id, [accent, frame, accent], `
  <g>
    <ellipse cx="400" cy="686" rx="150" ry="16" fill="#000" opacity="0.14"/>
    <rect x="352" y="112" width="30" height="118" rx="12" fill="${frame}" opacity="0.85"/>
    <rect x="418" y="112" width="30" height="118" rx="12" fill="${frame}" opacity="0.85"/>
    <rect x="238" y="214" width="324" height="330" rx="76" fill="${frame}"/>
    <rect x="238" y="214" width="324" height="330" rx="76" fill="url(#body-${id})"/>
    <rect x="330" y="470" width="140" height="34" rx="17" fill="#000" opacity="0.4"/>
    <rect x="342" y="480" width="116" height="14" rx="7" fill="${accent}" opacity="0.75"/>
    <circle cx="400" cy="350" r="52" fill="${accent}" opacity="0.22"/>
    <path d="M412 306 L366 372 h34 l-12 60 46 -70 h-34 z" fill="${accent}"/>
  </g>`);
}

/** Cable : la boucle, un connecteur a chaque bout. */
function cable(id, frame, accent) {
  return wrap(id, [accent, frame, accent], `
  <g>
    <ellipse cx="400" cy="716" rx="180" ry="16" fill="#000" opacity="0.12"/>
    <path d="M228 196 C 228 430, 572 350, 572 592" fill="none" stroke="${frame}" stroke-width="30" stroke-linecap="round"/>
    <path d="M228 196 C 228 430, 572 350, 572 592" fill="none" stroke="${accent}" stroke-width="10" stroke-linecap="round" opacity="0.45"/>
    <g transform="translate(184 96)">
      <rect x="0" y="0" width="88" height="116" rx="20" fill="${frame}"/>
      <rect x="0" y="0" width="88" height="116" rx="20" fill="url(#body-${id})"/>
      <rect x="20" y="26" width="48" height="20" rx="8" fill="${accent}" opacity="0.8"/>
    </g>
    <g transform="translate(528 588)">
      <rect x="0" y="0" width="88" height="104" rx="30" fill="${frame}"/>
      <rect x="0" y="0" width="88" height="104" rx="30" fill="url(#body-${id})"/>
      <rect x="22" y="58" width="44" height="16" rx="8" fill="${accent}" opacity="0.8"/>
    </g>
  </g>`);
}

/** Batterie externe : bloc epais, temoins de charge, port lateral. */
function powerBank(id, frame, accent) {
  return wrap(id, [accent, frame, accent], `
  <g>
    <ellipse cx="400" cy="700" rx="170" ry="16" fill="#000" opacity="0.14"/>
    <rect x="226" y="168" width="348" height="502" rx="62" fill="${frame}"/>
    <rect x="226" y="168" width="348" height="502" rx="62" fill="url(#body-${id})"/>
    <rect x="256" y="198" width="288" height="200" rx="40" fill="#000" opacity="0.22"/>
    <text x="400" y="322" text-anchor="middle" font-family="Inter,Segoe UI,sans-serif" font-size="86" font-weight="700" fill="${accent}" opacity="0.9">20K</text>
    <g transform="translate(292 456)">
      <rect x="0" y="0" width="46" height="14" rx="7" fill="${accent}"/>
      <rect x="58" y="0" width="46" height="14" rx="7" fill="${accent}"/>
      <rect x="116" y="0" width="46" height="14" rx="7" fill="${accent}" opacity="0.45"/>
      <rect x="174" y="0" width="46" height="14" rx="7" fill="${accent}" opacity="0.2"/>
    </g>
    <rect x="330" y="540" width="140" height="38" rx="19" fill="#000" opacity="0.35"/>
    <rect x="344" y="552" width="112" height="14" rx="7" fill="${accent}" opacity="0.7"/>
  </g>`);
}

/** Support : socle, bras incline, telephone pose dessus. */
function phoneHolder(id, frame, accent) {
  return wrap(id, [accent, frame, accent], `
  <g>
    <ellipse cx="400" cy="700" rx="190" ry="18" fill="#000" opacity="0.14"/>
    <g transform="rotate(-12 400 380)">
      <rect x="286" y="126" width="228" height="404" rx="34" fill="${accent}" opacity="0.28"/>
      <rect x="286" y="126" width="228" height="404" rx="34" fill="none" stroke="${accent}" stroke-width="6"/>
      <rect x="308" y="150" width="184" height="356" rx="22" fill="#000" opacity="0.35"/>
    </g>
    <path d="M330 560 L470 560 L500 648 L300 648 Z" fill="${frame}"/>
    <path d="M330 560 L470 560 L500 648 L300 648 Z" fill="url(#body-${id})"/>
    <rect x="268" y="640" width="264" height="34" rx="17" fill="${frame}"/>
    <rect x="268" y="640" width="264" height="34" rx="17" fill="url(#body-${id})"/>
    <rect x="352" y="516" width="96" height="58" rx="14" fill="${frame}"/>
    <rect x="376" y="534" width="48" height="10" rx="5" fill="${accent}" opacity="0.7"/>
  </g>`);
}

/** Boitier TV : le boitier, sa diode, et la telecommande posee a cote. */
function tvBox(id, frame, accent) {
  return wrap(id, [accent, frame, accent], `
  <g>
    <ellipse cx="400" cy="616" rx="210" ry="18" fill="#000" opacity="0.14"/>
    <rect x="176" y="356" width="448" height="232" rx="40" fill="${frame}"/>
    <rect x="176" y="356" width="448" height="232" rx="40" fill="url(#body-${id})"/>
    <rect x="176" y="356" width="448" height="18" rx="9" fill="#fff" opacity="0.10"/>
    <circle cx="238" cy="546" r="13" fill="${accent}"/>
    <circle cx="238" cy="546" r="24" fill="${accent}" opacity="0.22"/>
    <g transform="translate(316 408)">
      <rect x="0" y="0" width="170" height="96" rx="18" fill="#000" opacity="0.28"/>
      <path d="M42 26 h86 M42 48 h86 M42 70 h56" stroke="${accent}" stroke-width="10" stroke-linecap="round" opacity="0.75"/>
    </g>
    <g transform="translate(556 150)">
      <rect x="0" y="0" width="96" height="248" rx="34" fill="${frame}"/>
      <rect x="0" y="0" width="96" height="248" rx="34" fill="url(#body-${id})"/>
      <circle cx="48" cy="62" r="26" fill="#000" opacity="0.3"/>
      <circle cx="48" cy="62" r="11" fill="${accent}" opacity="0.8"/>
      <rect x="26" y="118" width="44" height="12" rx="6" fill="${accent}" opacity="0.55"/>
      <rect x="26" y="150" width="44" height="12" rx="6" fill="${accent}" opacity="0.35"/>
      <rect x="26" y="182" width="44" height="12" rx="6" fill="${accent}" opacity="0.2"/>
    </g>
  </g>`);
}

const BUILDERS = {
  phone,
  phoneCase,
  screenProtector,
  charger,
  cable,
  powerBank,
  phoneHolder,
  tvBox,
  phoneBack,
  foldable,
  tablet,
  laptop,
  monitor,
  watch,
  headphones,
  earbuds,
  camera,
  gamepad,
  gpu,
  keyboard,
  drone,
  speaker,
};

/** Les formes sans ecran recoivent une couleur d'accent plutot qu'un degrade. */
const FLAT = new Set([
  "phoneBack",
  "phoneCase",
  "screenProtector",
  "charger",
  "cable",
  "powerBank",
  "phoneHolder",
  "tvBox",
  "headphones",
  "earbuds",
  "camera",
  "gamepad",
  "gpu",
  "keyboard",
  "drone",
  "speaker",
]);

export function renderDevice(name, kind, frame, screenKey, opts = {}) {
  const builder = BUILDERS[kind];
  if (!builder) throw new Error(`Type d'appareil inconnu : ${kind}`);
  const screen = SCREENS[screenKey] ?? SCREENS.slate;
  const id = name.replace(/[^a-z0-9]/gi, "");
  const svg = FLAT.has(kind) ? builder(id, frame, screen[2], opts) : builder(id, frame, screen, opts);
  return svg.replace(/\n\s*/g, " ").trim();
}

export function writeDevice(name, kind, frame, screenKey, opts = {}) {
  fs.writeFileSync(path.join(OUT, `${name}.svg`), renderDevice(name, kind, frame, screenKey, opts), "utf8");
  return `/products/${name}.svg`;
}
