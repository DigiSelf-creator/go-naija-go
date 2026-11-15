// Draws the store app's icons and splash screens (plan ST2, decision 51) and saves them in
// app-assets/, outside the web build, so the first load does not grow. Run: npm run app-icons
//
// The picture is our own: the Wheel (decision 25) as a gold cog wheel with spokes, rolling right
// with three running streaks behind it, on the web icon's green (scripts/make-icons.mjs). No text
// on the icons and none on the splash (docs/design.md ST0 part 6: our icon on #0f1a12, one
// picture for light and dark mode). Only the Play feature picture, a store listing image, adds
// the name "Gbese!" in a bold sans-serif font (Inter here; another machine may pick a close font).
//
// Uses Playwright's Chromium (already a dev dependency) to turn SVG into PNG, and plain Node
// (node:zlib) to drop the alpha channel where a store wants none (every iOS icon, the Play
// feature picture, the splash pictures).
//
// Where the files go (Capacitor, plan ST1a and ST1c):
//   app-assets/android/res/...   copy into android/app/src/main/res/
//   app-assets/ios/AppIcon.appiconset, Splash.imageset   copy into ios/App/App/Assets.xcassets/
//   app-assets/store/            upload by hand to Play Console and App Store Connect
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { deflateSync, inflateSync, crc32 } from 'node:zlib';
import { chromium } from '@playwright/test';

// Colours: the web icon's (scripts/make-icons.mjs) and the game's (src/art/palette.ts).
const GREEN = '#0e7a3e';
const GREEN_LIGHT = '#1a9a50';
const GREEN_DEEP = '#0a5f30';
const HOLE = '#0b5a2d'; // the green seen between the spokes
const DARK = '#0f1a12';
const INK = '#1d1a14';
const GOLD = '#f2b300';
const GOLD_DARK = '#a87900';
const GOLD_SHINE = '#fff1b8';
const CREAM = '#fffaf0';
const ROAD = '#3e3e42';
const ROAD_LINE = '#f4f1e6';
const SKY_TOP = '#6fc2f0';
const SKY_LOW = '#fbe6b4';
const SKYLINE = '#a9c3cf';
const SPLASH_BG = DARK; // ST0 part 6: the game's own first-screen colour, light and dark mode

const OUT = 'app-assets';
const FONT = "Inter, Verdana, 'DejaVu Sans', Arial, sans-serif";

// ---------- the art ----------

/** A cog wheel outline centred on 0,0: n teeth between radius root and tip. */
function gearPath(n, root, tip) {
  const step = (Math.PI * 2) / n;
  const wr = step * 0.3; // half width of a tooth at the root
  const wt = step * 0.2; // half width at the tip
  const p = (r, a) => `${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`;
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = i * step - Math.PI / 2;
    d += `${i === 0 ? 'M' : 'L'}${p(root, a - wr)} L${p(tip, a - wt)} L${p(tip, a + wt)} L${p(root, a + wr)} `;
    d += `A${root} ${root} 0 0 1 ${p(root, a + step - wr)} `;
  }
  return `${d}Z`;
}

/**
 * The Wheel and its streaks in a 512 box (the same layout as the web icon: streaks on the left,
 * round thing on the right). mono: one flat colour, for Android's themed icon.
 */
function wheelArt({ mono = null, hole = HOLE } = {}) {
  const c = (col) => mono ?? col;
  const spokes = Array.from({ length: 6 }, (_, i) => {
    const a = (i * Math.PI) / 3 + 0.26;
    return `<path d="M0 0 L${(118 * Math.cos(a)).toFixed(1)} ${(118 * Math.sin(a)).toFixed(1)}"/>`;
  }).join('');
  const shadow = mono
    ? ''
    : `<path d="${gearPath(14, 150, 178)} M112 0 A112 112 0 1 0 -112 0 A112 112 0 1 0 112 0 Z" transform="translate(8 9)" fill="${GOLD_DARK}" fill-rule="evenodd"/>`;
  return `
  <g stroke-linecap="round" fill="none">
    <path d="M36 196 H168" stroke="${c(CREAM)}" stroke-width="34"/>
    <path d="M70 268 H150" stroke="${c(GOLD)}" stroke-width="34"/>
    <path d="M36 340 H168" stroke="${c(CREAM)}" stroke-width="34"/>
  </g>
  <g transform="translate(318 266) rotate(8)">
    ${shadow}
    ${mono ? '' : `<circle r="120" fill="${hole}"/>`}
    <path d="${gearPath(14, 150, 178)} M112 0 A112 112 0 1 0 -112 0 A112 112 0 1 0 112 0 Z"
      fill="${c(GOLD)}" fill-rule="evenodd"/>
    <circle r="112" fill="none" stroke="${c(GOLD_DARK)}" stroke-width="${mono ? 0 : 10}"/>
    <g stroke="${c(GOLD)}" stroke-width="30" stroke-linecap="round">${spokes}</g>
    <circle r="46" fill="${c(CREAM)}"/>
    <circle r="46" fill="none" stroke="${c(GOLD_DARK)}" stroke-width="${mono ? 0 : 10}"/>
    ${mono ? '' : `<circle r="13" fill="${GOLD_DARK}"/>`}
    ${mono ? '' : `<path d="M-120 -86 A148 148 0 0 1 -40 -142" stroke="${GOLD_SHINE}" stroke-width="12" fill="none" stroke-linecap="round" opacity="0.9"/>`}
  </g>`;
}

/** The art centred on cx, cy with the 512 box scaled to side px. */
function placed(cx, cy, side, opts) {
  const k = side / 512;
  return `<g transform="translate(${cx - side / 2} ${cy - side / 2}) scale(${k})">${wheelArt(opts)}</g>`;
}

/** The green ground with a soft glow behind the wheel. */
function greenGround(w, h, id = 'g') {
  return `<defs><radialGradient id="${id}" cx="0.58" cy="0.48" r="0.62">
    <stop offset="0" stop-color="${GREEN_LIGHT}"/><stop offset="0.7" stop-color="${GREEN}"/>
    <stop offset="1" stop-color="${GREEN_DEEP}"/></radialGradient></defs>
  <rect width="${w}" height="${h}" fill="url(#${id})"/>`;
}

const svg = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${body}</svg>`;

// A whole square icon. shape: 'square' (full bleed), 'rounded' (Android legacy), 'circle'.
// Art fills the square less the pad on each side.
function fullIcon(shape, pad) {
  const s = 512;
  const clip =
    shape === 'rounded'
      ? `<clipPath id="c"><rect width="${s}" height="${s}" rx="96"/></clipPath>`
      : shape === 'circle'
        ? `<clipPath id="c"><circle cx="256" cy="256" r="256"/></clipPath>`
        : '';
  const art = placed(256, 256, s * (1 - pad * 2));
  return svg(s, s, `<defs>${clip}</defs><g ${clip ? 'clip-path="url(#c)"' : ''}>${greenGround(s, s)}${art}</g>`);
}

// Android adaptive icon layers: 108 dp, drawn at 432 (xxxhdpi). The safe zone is the middle
// 66 dp circle (radius 132 at 432); the art stays inside radius 128.
const ADAPT = 432;
const ADAPT_SIDE = 282; // 512 box side that keeps the art inside the safe circle
const adaptiveFg = () => svg(ADAPT, ADAPT, placed(216, 216, ADAPT_SIDE));
const adaptiveBg = () => svg(ADAPT, ADAPT, greenGround(ADAPT, ADAPT));
const adaptiveMono = () => svg(ADAPT, ADAPT, placed(216, 216, ADAPT_SIDE, { mono: '#ffffff' }));

// Android 12+ splash icon, "with icon background" kind drawn into the picture: 288 dp canvas,
// the visible part is the 192 dp circle in the middle. A green disc there holds the wheel on the
// dark splash colour.
const splashIcon12 = () =>
  svg(
    288,
    288,
    `<clipPath id="d"><circle cx="144" cy="144" r="96"/></clipPath>
     <g clip-path="url(#d)">${greenGround(288, 288, 'sg')}</g>
     ${placed(144, 144, 132)}`,
  );

/** The name, drawn as text. */
function wordmark(x, y, size, fill, anchor = 'middle', shadow = null) {
  const t = (dx, dy, col) =>
    `<text x="${x + dx}" y="${y + dy}" font-family="${FONT}" font-size="${size}" font-weight="900"
      text-anchor="${anchor}" fill="${col}" letter-spacing="${(size * 0.01).toFixed(1)}">Gbese!</text>`;
  return (shadow ? t(size * 0.05, size * 0.06, shadow) : '') + t(0, 0, fill);
}

/** A road strip with lane dashes across the bottom. */
function road(w, h, top, col) {
  const dash = Math.round((h - top) * 0.12);
  const y = top + (h - top) * 0.5;
  const step = dash * 9;
  let lines = '';
  for (let x = -step / 3; x < w; x += step)
    lines += `<rect x="${x.toFixed(0)}" y="${(y - dash / 2).toFixed(0)}" width="${(dash * 4.5).toFixed(0)}" height="${dash}" rx="${dash / 2}" fill="${ROAD_LINE}" opacity="0.85"/>`;
  return `<rect y="${top}" width="${w}" height="${h - top}" fill="${col}"/>
    <rect y="${top}" width="${w}" height="${Math.max(2, dash * 0.6)}" fill="${GOLD_DARK}" opacity="0.7"/>${lines}`;
}

/** A splash screen of any size, sideways or square: our icon alone in the middle, on #0f1a12. */
function splash(w, h) {
  const m = Math.min(w, h);
  // A square splash (iOS) is cropped to the screen's shape: keep the icon in its middle band.
  const band = w === h ? m * 0.56 : m;
  const icon = band * 0.42;
  const cx = w / 2;
  const cy = h / 2;
  const r = icon * 0.2;
  const tile = `<defs><clipPath id="t"><rect x="${cx - icon / 2}" y="${cy - icon / 2}" width="${icon}" height="${icon}" rx="${r}"/></clipPath>
    <radialGradient id="tg" cx="0.58" cy="0.48" r="0.62"><stop offset="0" stop-color="${GREEN_LIGHT}"/><stop offset="0.7" stop-color="${GREEN}"/><stop offset="1" stop-color="${GREEN_DEEP}"/></radialGradient></defs>
    <g clip-path="url(#t)"><rect x="${cx - icon / 2}" y="${cy - icon / 2}" width="${icon}" height="${icon}" fill="url(#tg)"/>
    ${placed(cx, cy, icon * 0.9)}</g>`;
  return svg(w, h, `<rect width="${w}" height="${h}" fill="${SPLASH_BG}"/>${tile}`);
}

/** Play feature picture, 1024 x 500: sky, far skyline, road, the Wheel rolling, the name. */
function featureGraphic() {
  const w = 1024;
  const h = 500;
  let sky = '';
  const blocks = [
    [0, 70, 120], [60, 50, 170], [120, 80, 140], [210, 60, 190], [280, 90, 130], [380, 70, 175],
    [460, 60, 150], [530, 100, 200], [640, 70, 160], [720, 60, 210], [790, 90, 150], [890, 70, 185], [960, 64, 140],
  ];
  for (const [x, bw, bh] of blocks) sky += `<rect x="${x}" y="${390 - bh}" width="${bw}" height="${bh}" fill="${SKYLINE}"/>`;
  return svg(
    w,
    h,
    `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${SKY_TOP}"/><stop offset="1" stop-color="${SKY_LOW}"/></linearGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#sky)"/>
    <circle cx="880" cy="96" r="54" fill="#ffd34d"/>
    ${sky}
    ${road(w, h, 390, ROAD)}
    ${placed(232, 258, 360, { hole: '#8fc0da' })}
    ${wordmark(704, 296, 132, CREAM, 'middle', INK)}`,
  );
}

// ---------- PNG helpers (plain Node) ----------

/** Makes sure a PNG has no alpha channel: an 8-bit RGBA PNG becomes RGB; RGB is kept. */
function dropAlpha(png) {
  let pos = 8;
  let w = 0;
  let h = 0;
  const idat = [];
  while (pos < png.length) {
    const len = png.readUInt32BE(pos);
    const type = png.toString('ascii', pos + 4, pos + 8);
    const data = png.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      if (data[8] === 8 && data[9] === 2) return png; // already RGB with no alpha
      if (data[8] !== 8 || data[9] !== 6 || data[12] !== 0) throw new Error('expected 8-bit RGBA, not interlaced');
    } else if (type === 'IDAT') idat.push(data);
    pos += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const bpp = 4;
  const stride = w * bpp;
  const cur = Buffer.alloc(stride);
  const prev = Buffer.alloc(stride);
  const out = Buffer.alloc(h * (w * 3 + 1));
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    const row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0;
      const b = prev[i];
      const c = i >= bpp ? prev[i - bpp] : 0;
      let v = row[i];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[i] = v & 255;
    }
    // Write the row as RGB with the "Up" filter (small for flat art).
    const o = y * (w * 3 + 1);
    out[o] = 2;
    for (let x = 0; x < w; x++) {
      for (let k = 0; k < 3; k++) {
        const now = cur[x * 4 + k];
        const up = y > 0 ? prev[x * 4 + k] : 0;
        out[o + 1 + x * 3 + k] = (now - up) & 255;
      }
    }
    cur.copy(prev);
  }
  const chunk = (type, data) => {
    const head = Buffer.alloc(8);
    head.writeUInt32BE(data.length, 0);
    head.write(type, 4, 'ascii');
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])) >>> 0, 0);
    return Buffer.concat([head, data, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(out, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- the jobs ----------

const DENS = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
const jobs = []; // { file, art, w, h, opaque }
const add = (file, art, w, h = w, opaque = false) => jobs.push({ file, art, w, h, opaque });
const files = []; // text files

// Android: legacy icons (48 dp), adaptive layers (108 dp), themed (monochrome) layer.
for (const [d, k] of Object.entries(DENS)) {
  const res = `${OUT}/android/res/mipmap-${d}`;
  add(`${res}/ic_launcher.png`, fullIcon('rounded', 0.07), 48 * k);
  add(`${res}/ic_launcher_round.png`, fullIcon('circle', 0.13), 48 * k);
  add(`${res}/ic_launcher_foreground.png`, adaptiveFg(), 108 * k);
  add(`${res}/ic_launcher_background.png`, adaptiveBg(), 108 * k, 108 * k, true);
  add(`${res}/ic_launcher_monochrome.png`, adaptiveMono(), 108 * k);
  // Android 12+ splash icon (288 dp canvas).
  add(`${OUT}/android/res/drawable-${d}/splash_icon.png`, splashIcon12(), 288 * k);
}
const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
    <monochrome android:drawable="@mipmap/ic_launcher_monochrome"/>
</adaptive-icon>
`;
files.push([`${OUT}/android/res/mipmap-anydpi-v26/ic_launcher.xml`, adaptiveXml]);
files.push([`${OUT}/android/res/mipmap-anydpi-v26/ic_launcher_round.xml`, adaptiveXml]);
const colours = (bg) => `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- Gbese! splash and icon colours (scripts/make-app-icons.mjs) -->
    <color name="ic_launcher_background">${GREEN}</color>
    <color name="splash_background">${bg}</color>
</resources>
`;
// One colour file: ST0 part 6 keeps the splash the same in dark mode, so no values-night.
files.push([`${OUT}/android/res/values/gbese_colours.xml`, colours(SPLASH_BG)]);

// Android sideways splash pictures (older phones, and Capacitor's splash plugin). One set for
// light and dark mode (ST0 part 6), so no -night folders.
const LAND = { mdpi: [480, 320], hdpi: [800, 480], xhdpi: [1280, 720], xxhdpi: [1600, 960], xxxhdpi: [1920, 1280] };
for (const [d, [w, h]] of Object.entries(LAND)) add(`${OUT}/android/res/drawable-land-${d}/splash.png`, splash(w, h), w, h, true);
add(`${OUT}/android/res/drawable/splash.png`, splash(1920, 1280), 1920, 1280, true);

// Store uploads.
add(`${OUT}/store/play-icon-512.png`, fullIcon('square', 0.06), 512, 512, true);
add(`${OUT}/store/play-feature-1024x500.png`, featureGraphic(), 1024, 500, true);
add(`${OUT}/store/app-store-icon-1024.png`, fullIcon('square', 0.07), 1024, 1024, true);

// iOS app icon set: every iPhone and iPad size, plus the 1024 store icon. All opaque.
const IOS = [
  ['iphone', 20, 2], ['iphone', 20, 3], ['iphone', 29, 2], ['iphone', 29, 3], ['iphone', 40, 2], ['iphone', 40, 3],
  ['iphone', 60, 2], ['iphone', 60, 3],
  ['ipad', 20, 1], ['ipad', 20, 2], ['ipad', 29, 1], ['ipad', 29, 2], ['ipad', 40, 1], ['ipad', 40, 2],
  ['ipad', 76, 1], ['ipad', 76, 2], ['ipad', 83.5, 2],
  ['ios-marketing', 1024, 1],
];
const iconSet = `${OUT}/ios/AppIcon.appiconset`;
const px = new Set(IOS.map(([, s, k]) => s * k));
for (const p of px) add(`${iconSet}/AppIcon-${p}.png`, fullIcon('square', 0.07), p, p, true);
files.push([
  `${iconSet}/Contents.json`,
  `${JSON.stringify(
    {
      images: IOS.map(([idiom, s, k]) => ({
        filename: `AppIcon-${s * k}.png`,
        idiom,
        scale: `${k}x`,
        size: `${s}x${s}`,
      })),
      info: { author: 'xcode', version: 1 },
    },
    null,
    2,
  )}\n`,
]);

// iOS launch picture: one square 2732 picture, shown "aspect fill" by the launch screen, so it
// fits any phone or iPad held sideways. One picture for light and dark mode (ST0 part 6).
const splashSet = `${OUT}/ios/Splash.imageset`;
add(`${splashSet}/splash-2732x2732.png`, splash(2732, 2732), 2732, 2732, true);
files.push([
  `${splashSet}/Contents.json`,
  `${JSON.stringify(
    {
      images: ['1x', '2x', '3x'].map((scale) => ({ filename: 'splash-2732x2732.png', idiom: 'universal', scale })),
      info: { author: 'xcode', version: 1 },
    },
    null,
    2,
  )}\n`,
]);

// The one source picture, for anyone redrawing by hand.
files.push([`${OUT}/source/icon.svg`, `${fullIcon('square', 0.07)}\n`]);
files.push([`${OUT}/source/adaptive-foreground.svg`, `${adaptiveFg()}\n`]);

// ---------- render ----------

rmSync(OUT, { recursive: true, force: true });
// PW_CHROMIUM=/path/to/chrome uses another Chromium when Playwright's own is not installed.
const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const page = await browser.newPage();
let total = 0;
for (const j of jobs) {
  const w = Math.round(j.w);
  const h = Math.round(j.h);
  await page.setViewportSize({ width: w, height: h });
  const art = j.art.replace(/width="\d+" height="\d+"/, `width="${w}" height="${h}" preserveAspectRatio="none"`);
  await page.setContent(`<html><body style="margin:0;background:transparent">${art}</body></html>`);
  let png = await page.screenshot({ omitBackground: !j.opaque, clip: { x: 0, y: 0, width: w, height: h } });
  if (j.opaque) png = dropAlpha(png);
  mkdirSync(j.file.slice(0, j.file.lastIndexOf('/')), { recursive: true });
  writeFileSync(j.file, png);
  total += png.length;
}
await browser.close();
for (const [f, text] of files) {
  mkdirSync(f.slice(0, f.lastIndexOf('/')), { recursive: true });
  writeFileSync(f, text);
  total += text.length;
}
console.log(`${jobs.length} pictures and ${files.length} text files in ${OUT}/, ${(total / 1000).toFixed(1)} KB in all.`);
