/**
 * Art gallery for checking every asset at once (debug only).
 * drawGallery fills a viewW x viewH area (world units, after the view scale) and
 * fits a fixed 960 x 720 layout into it.
 */
import { drawBoss, drawDustPop, drawGoLight, drawHitCounter, drawHonkCloud, type BossMode } from './boss';
import { drawGoat, drawTyre } from './hazards';
import { HAIRS, OUTFITS, SKINS, drawHero, type HeroPose } from './hero';
import { drawFood, drawKobo, drawShield, drawSparkle, type FoodKind } from './items';
import { INK } from './palette';
import { drawBusStop, drawPassingBus, drawRoad, drawShopRow, drawSkyline, drawSky, drawStall } from './street';

const LAYOUT_W = 960;
const LAYOUT_H = 720;

function label(g: CanvasRenderingContext2D, text: string, x: number, y: number): void {
  g.fillStyle = INK;
  g.font = '8px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'top';
  g.fillText(text, x, y);
}

function hero(g: CanvasRenderingContext2D, x: number, y: number, skin: number, hair: number, outfit: number, pose: HeroPose): void {
  g.save();
  g.translate(x, y);
  drawHero(g, { skin, hair, outfit }, pose);
  g.restore();
}

export function drawGallery(g: CanvasRenderingContext2D, viewW: number, viewH: number, time: number): void {
  g.save();
  g.fillStyle = '#fbf3df';
  g.fillRect(0, 0, viewW, viewH);
  const s = Math.min(viewW / LAYOUT_W, viewH / LAYOUT_H);
  g.scale(s, s);

  // 1. Street strip at the top (a 360-tall slice squeezed to half size)
  g.save();
  g.beginPath();
  g.rect(0, 0, LAYOUT_W, 180);
  g.clip();
  g.scale(0.5, 0.5);
  const camX = time * 60;
  const w = LAYOUT_W * 2;
  drawSky(g, camX, w, time);
  drawSkyline(g, camX, w);
  drawShopRow(g, camX, w);
  drawPassingBus(g, camX, w, time);
  g.translate(-camX, 0);
  const base = Math.floor(camX / 600) * 600;
  drawRoad(g, camX, w, [[base - 600, base + 200], [base + 260, base + 800], [base + 860, base + 3000]]);
  drawStall(g, base + 400, 250, 140);
  drawStall(g, base + 1000, 190, 120);
  drawBusStop(g, base + 1400, false, time);
  drawBusStop(g, base + 1900, true, time, 300, false);
  g.restore();

  // 2. Every skin (rows) x every hair (columns); outfits rotate so all appear
  const run: HeroPose = { phase: (time * 1.6) % 1, inAir: false, facing: 1, glow: false, time };
  for (let r = 0; r < SKINS.length; r++) {
    for (let c = 0; c < HAIRS.length; c++) {
      const o = (r + c) % OUTFITS.length;
      const x = 40 + c * 52;
      const y = 264 + r * 66;
      hero(g, x, y, r, c, o, { ...run, phase: (run.phase + r * 0.13 + c * 0.07) % 1 });
    }
  }
  for (let c = 0; c < HAIRS.length; c++) label(g, HAIRS[c]?.label ?? '', 40 + c * 52, 184);

  // 3. Each outfit standing, plus poses
  for (let o = 0; o < OUTFITS.length; o++) {
    const x = 330 + o * 50;
    hero(g, x, 250, o, (o + 2) % HAIRS.length, o, { phase: 0, inAir: false, facing: 1, glow: false, standing: true, blink: Math.floor(time * 2) % 6 === 0, time });
    label(g, OUTFITS[o]?.label ?? '', x, 254);
  }
  const poses: [string, HeroPose][] = [
    ['run 0', { phase: 0, inAir: false, facing: 1, glow: false }],
    ['run .25', { phase: 0.25, inAir: false, facing: 1, glow: false }],
    ['run .5', { phase: 0.5, inAir: false, facing: 1, glow: false }],
    ['jump', { phase: 0, inAir: true, facing: 1, glow: false }],
    ['left', { phase: (time * 1.6) % 1, inAir: false, facing: -1, glow: false }],
    ['amala', { phase: (time * 1.6) % 1, inAir: false, facing: 1, glow: true, time }],
    ['corn', { phase: (time * 2.4) % 1, inAir: false, facing: 1, glow: false, fast: true, time }],
  ];
  poses.forEach(([name, pose], i) => {
    const x = 330 + i * 50;
    hero(g, x, 340, i % 5, (i + 1) % 5, (i + 3) % 5, pose);
    label(g, name, x, 344);
  });
  // Shield on a hero
  hero(g, 700, 340, 4, 4, 2, run);
  drawShield(g, 700, 340, time);
  label(g, 'shield', 700, 344);

  // 4. Items
  const foods: FoodKind[] = ['corn', 'garri', 'amala'];
  foods.forEach((k, i) => {
    drawFood(g, k, 350 + i * 50, 400, time);
    label(g, k, 350 + i * 50, 420);
  });
  for (let i = 0; i < 4; i++) drawKobo(g, 510 + i * 24, 400, time + i * 0.2);
  drawSparkle(g, 630, 400, (time % 0.8) / 0.8);
  label(g, 'kobo, sparkle', 560, 420);

  // 5. Hazards
  drawGoat(g, 350, 490, time, 'walk', -1);
  label(g, 'goat', 350, 494);
  drawGoat(g, 430, 490, time, 'runAway', 1);
  label(g, 'goat runs off', 430, 494);
  drawTyre(g, 510, 490, -time * 6);
  label(g, 'tyre', 510, 494);
  drawHonkCloud(g, 580, 470, time);
  drawDustPop(g, 640, 475, (time % 0.7) / 0.7);
  drawHitCounter(g, 700, 470, Math.floor(time) % 4);

  // 6. Boss states and green-light platforms
  const modes: BossMode[] = ['idle', 'hit', 'attack', 'defeat'];
  modes.forEach((m, i) => {
    const x = 90 + i * 160;
    const cycle = m === 'defeat' ? 4 : 1.5;
    drawBoss(g, x, 690, { mode: m, t: time % cycle, hits: m === 'defeat' ? 3 : 1, time });
    label(g, m, x, 694);
  });
  drawGoLight(g, 740, 600, 90, 'lit', time, 690);
  drawGoLight(g, 850, 600, 90, 'off', time, 690);
  drawGoLight(g, 740, 660, 90, 'done', time, 690);

  g.restore();
}
