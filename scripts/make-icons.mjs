// Draws the placeholder app icons (a green and gold kobo coin with a running streak)
// and saves them as PNGs in public/icons/. Run: npm run icons
// Uses Playwright's Chromium (already a dev dependency) to turn the SVG into PNGs.
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const GREEN = '#0e7a3e';
const DARK = '#0f1a12';
const GOLD = '#f2b300';
const GOLD_DARK = '#a87900';
const CREAM = '#fffaf0';

/** pad = fraction of the icon kept clear around the art (maskable icons need about 0.1). */
function svg({ rounded, pad }) {
  const s = 512;
  const inner = s * (1 - pad * 2);
  const k = inner / 512; // scale art into the safe zone
  const o = s * pad;
  const bg = rounded
    ? `<rect width="${s}" height="${s}" rx="112" fill="${GREEN}"/>`
    : `<rect width="${s}" height="${s}" fill="${GREEN}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s} ${s}" width="${s}" height="${s}">
  ${bg}
  <g transform="translate(${o} ${o}) scale(${k})">
    <!-- running streak -->
    <g stroke-linecap="round" fill="none">
      <path d="M40 200 H190" stroke="${CREAM}" stroke-width="34" opacity="0.95"/>
      <path d="M70 272 H180" stroke="${GOLD}" stroke-width="34"/>
      <path d="M40 344 H190" stroke="${CREAM}" stroke-width="34" opacity="0.95"/>
    </g>
    <!-- kobo coin -->
    <circle cx="320" cy="272" r="160" fill="${GOLD_DARK}"/>
    <circle cx="312" cy="264" r="160" fill="${GOLD}"/>
    <circle cx="312" cy="264" r="122" fill="none" stroke="${GOLD_DARK}" stroke-width="14"/>
    <text x="312" y="322" font-family="Verdana, Arial, sans-serif" font-size="170" font-weight="bold"
      text-anchor="middle" fill="${DARK}">k</text>
  </g>
</svg>`;
}

const out = 'public/icons';
mkdirSync(out, { recursive: true });

const jobs = [
  { file: 'icon-192.png', size: 192, rounded: true, pad: 0.04 },
  { file: 'icon-512.png', size: 512, rounded: true, pad: 0.04 },
  { file: 'icon-maskable-512.png', size: 512, rounded: false, pad: 0.12 },
  { file: 'apple-touch-icon.png', size: 180, rounded: false, pad: 0.06 },
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const j of jobs) {
  await page.setViewportSize({ width: j.size, height: j.size });
  const art = svg(j).replace('width="512" height="512"', `width="${j.size}" height="${j.size}"`);
  await page.setContent(`<html><body style="margin:0;background:transparent">${art}</body></html>`);
  const png = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: j.size, height: j.size } });
  writeFileSync(`${out}/${j.file}`, png);
  console.log(`${out}/${j.file} ${png.length} bytes`);
}
writeFileSync(`${out}/icon.svg`, svg({ rounded: true, pad: 0.04 }));
await browser.close();
