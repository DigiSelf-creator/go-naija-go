// Test only: side-by-side pictures of the code hero and the Blender hero.
// node compare.mjs <bundle.js> <frames dir> <out dir>
// bundle.js: rolldown entry.ts -o bundle.js -f iife  (see ../README.md)
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const [bundle, frames, out] = process.argv.slice(2);
const png = (n) => 'data:image/png;base64,' + readFileSync(join(frames, n)).toString('base64');
const imgs = {
  run1: png('run02_1x.png'), run2: png('run02_2x.png'), jump2: png('jump_2x.png'),
  run8: png('run02_8x.png'), run8b: png('run07_8x.png'), jump8: png('jump_8x.png'),
};

const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const page = await browser.newPage({ viewport: { width: 1000, height: 1400 } });
await page.setContent('<body style="margin:0;background:#fff"><canvas id=a width=1000 height=800></canvas><br><canvas id=b width=1000 height=620></canvas></body>');
await page.addScriptTag({ content: readFileSync(bundle, 'utf8') });
await page.evaluate(async (imgs) => {
  const G = window.G;
  const load = (src) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = src; });
  const I = {};
  for (const k of Object.keys(imgs)) I[k] = await load(imgs[k]);
  const look = { skin: 4, hair: 0, outfit: 0, body: 0, age: 1 };
  const runPose = { phase: 0.3, inAir: false, facing: 1, glow: false, time: 0 };
  const jumpPose = { phase: 0, inAir: true, vy: -300, facing: 1, glow: false, time: 0 };
  const text = (g, s, x, y, size = 16, col = '#1d1a14', bold = true) => {
    g.font = `${bold ? 'bold ' : ''}${size}px sans-serif`;
    g.lineWidth = 4; g.strokeStyle = col === '#fff' ? 'rgba(29,26,20,0.9)' : 'rgba(255,255,255,0.85)'; g.textAlign = 'center';
    g.strokeText(s, x, y); g.fillStyle = col; g.fillText(s, x, y);
  };

  // street crop: world y y0..y0+hU, k px per u, at offset (ox, oy)
  function street(g, k, ox, oy, wU, heroes, y0 = 150, hU = 220) {
    g.__m = { ox, oy, y0 };
    g.save();
    g.beginPath(); g.rect(ox, oy, wU * k, hU * k); g.clip();
    g.setTransform(k, 0, 0, k, ox, oy - y0 * k);
    const camX = 700;
    G.drawSky(g, camX, wU, 3, 420);
    G.drawSkyline(g, camX, wU, G.GROUND_Y);
    G.drawShopRow(g, camX, wU, G.GROUND_Y);
    g.translate(-camX, 0);
    G.drawRoad(g, camX, wU, [[0, 5000]], G.GROUND_Y, 420);
    g.translate(camX, 0);
    for (const h of heroes) h(g);
    g.restore();
  }
  const codeHero = (x, pose) => (g) => { g.save(); g.translate(x, G.GROUND_Y); G.drawHero(g, look, pose); g.restore(); };
  // a Blender frame is 48 x 64 u, feet at (24, 60) u in the frame; drawn 1:1 in device pixels
  const blendHero = (x, img, k) => (g) => {
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    const m = g.__m; g.drawImage(img, Math.round(m.ox + x * k - 24 * k), Math.round(m.oy + (G.GROUND_Y - m.y0) * k - 60 * k));
    g.restore();
  };

  const a = document.getElementById('a').getContext('2d');
  a.fillStyle = '#f6f2e8'; a.fillRect(0, 0, 1000, 800);
  text(a, 'In-game size on a street. Left of each pair: code hero (now). Right: Blender test.', 500, 24, 16);
  // 2 px per u (phone at DPR 2)
  street(a, 2, 40, 40, 460, [codeHero(110, runPose), blendHero(190, I.run2, 2), codeHero(300, jumpPose), blendHero(380, I.jump2, 2)]);
  text(a, 'code', 40 + 110 * 2, 455, 14, '#fff'); text(a, 'Blender', 40 + 190 * 2, 455, 14, '#fff');
  text(a, 'code', 40 + 300 * 2, 455, 14, '#fff'); text(a, 'Blender', 40 + 380 * 2, 455, 14, '#fff');
  text(a, 'Top: 2 px per unit (most phones). Bottom left: 1 px per unit (cheap phone). Bottom right: that, enlarged 3x.', 500, 505, 13);
  // 1 px per u (cheap phone, DPR 1): world y 230..330
  street(a, 1, 40, 525, 400, [codeHero(140, runPose), blendHero(190, I.run1, 1)], 230, 100);
  // the hero part of that crop, enlarged 3x so the pixels show
  a.imageSmoothingEnabled = false;
  a.drawImage(a.canvas, 40 + 110, 525 + 5, 110, 100 - 15, 480, 530, 330, 255);

  const b = document.getElementById('b').getContext('2d');
  b.fillStyle = '#ece8de'; b.fillRect(0, 0, 1000, 620);
  text(b, 'Enlarged (8 px per unit). Left: code hero. Right: Blender test.', 500, 26, 16);
  const big = (x, pose) => { b.save(); b.translate(x, 560); b.scale(8, 8); G.drawHero(b, look, pose); b.restore(); };
  big(130, runPose); big(330, jumpPose);
  b.drawImage(I.run8, 600 - 24 * 8, 560 - 60 * 8);
  b.drawImage(I.jump8, 810 - 24 * 8, 560 - 60 * 8);
  b.fillStyle = '#1d1a14'; b.fillRect(498, 50, 4, 550);
}, imgs);
await page.locator('#a').screenshot({ path: join(out, 'compare_ingame.png') });
await page.locator('#b').screenshot({ path: join(out, 'compare_enlarged.png') });
await browser.close();
