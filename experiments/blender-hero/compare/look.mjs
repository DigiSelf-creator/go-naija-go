// Test only: draws the code hero big, in a few run phases, to a PNG.
// node look.mjs <bundle.js> <out.png>
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const [bundle, out] = process.argv.slice(2);
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const page = await browser.newPage({ viewport: { width: 1200, height: 560 } });
await page.setContent('<canvas id=c width=1200 height=560></canvas>');
await page.addScriptTag({ content: readFileSync(bundle, 'utf8') });
await page.evaluate(() => {
  const g = document.getElementById('c').getContext('2d');
  g.fillStyle = '#eee'; g.fillRect(0, 0, 1200, 560);
  const look = { skin: 4, hair: 0, outfit: 0, body: 0, age: 1 };
  const poses = [
    { phase: 0, inAir: false, facing: 1, glow: false, standing: true, time: 0 },
    { phase: 0, inAir: false, facing: 1, glow: false, time: 0 },
    { phase: 0.25, inAir: false, facing: 1, glow: false, time: 0 },
    { phase: 0.5, inAir: false, facing: 1, glow: false, time: 0 },
    { phase: 0, inAir: true, vy: -300, facing: 1, glow: false, time: 0 },
  ];
  poses.forEach((p, i) => { g.save(); g.translate(120 + i * 235, 520); g.scale(8, 8); window.G.drawHero(g, look, p); g.restore(); });
});
await page.locator('#c').screenshot({ path: out });
await browser.close();
