// Generates PWA icons and iOS splash screens from inline SVG. Run: npm run icons
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";

const BOARD = "#13171c";
const INK = "#fff3d6";
const ACCENT = "#7aa5ff";

// Paths instead of text so rendering does not depend on installed fonts.
// Digits drawn as a simple pump-sign style: "1,7" + superscript "9".
function glyphs(scale = 1) {
  const s = (n) => n * scale;
  return `
  <g fill="${INK}">
    <!-- 1 -->
    <path d="M${s(118)} ${s(178)} l${s(44)} -${s(26)} h${s(30)} v${s(212)} h-${s(36)} v-${s(170)} l-${s(30)} ${s(18)} z"/>
    <!-- , -->
    <path d="M${s(214)} ${s(338)} h${s(34)} v${s(30)} l-${s(18)} ${s(36)} h-${s(20)} l${s(12)} -${s(36)} h-${s(8)} z"/>
    <!-- 7 -->
    <path d="M${s(270)} ${s(152)} h${s(132)} v${s(30)} l-${s(78)} ${s(182)} h-${s(40)} l${s(78)} -${s(180)} h-${s(92)} z"/>
    <!-- superscript 9 -->
    <g fill="none" stroke="${INK}" stroke-width="${s(22)}" stroke-linecap="square">
      <circle cx="${s(452)}" cy="${s(190)}" r="${s(27)}"/>
      <path d="M${s(478)} ${s(200)} L${s(446)} ${s(262)}"/>
    </g>
  </g>`;
}

function iconSvg(size, { padding = 0, radius = 112 } = {}) {
  const inner = 512 - padding * 2;
  const k = inner / 512;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${padding ? 0 : radius}" fill="${BOARD}"/>
  <g transform="translate(${padding} ${padding}) scale(${k})">
    <rect x="96" y="96" width="320" height="22" rx="11" fill="${ACCENT}"/>
    <g transform="translate(-24 24)">${glyphs(1)}</g>
  </g>
</svg>`;
}

mkdirSync("public/icons", { recursive: true });
mkdirSync("public/splash", { recursive: true });

writeFileSync("public/icons/icon.svg", iconSvg(512));
const outputs = [
  ["public/icons/icon-192.png", iconSvg(192), 192],
  ["public/icons/icon-512.png", iconSvg(512), 512],
  ["public/icons/icon-maskable-512.png", iconSvg(512, { padding: 72 }), 512],
  // iOS applies its own corner mask; use a full-bleed square.
  ["public/icons/apple-touch-icon.png", iconSvg(180, { padding: 24 }), 180],
];
for (const [file, svg, size] of outputs) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(file);
}

// Splash: light background, centred icon, matches the app's first paint.
const SPLASH = [
  [1290, 2796], [1179, 2556], [1284, 2778], [1170, 2532], [1125, 2436],
  [1242, 2688], [828, 1792], [750, 1334], [1206, 2622], [1320, 2868],
];
for (const [w, h] of SPLASH) {
  const icon = Math.round(w * 0.28);
  const png = await sharp(Buffer.from(iconSvg(icon))).resize(icon, icon).png().toBuffer();
  await sharp({ create: { width: w, height: h, channels: 3, background: "#f2f3f5" } })
    .composite([{ input: png, top: Math.round(h * 0.42 - icon / 2), left: Math.round((w - icon) / 2) }])
    .png({ compressionLevel: 9 })
    .toFile(`public/splash/splash-${w}x${h}.png`);
}
console.log("icons + splash generated");
