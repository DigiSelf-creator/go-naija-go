/**
 * Sagamu's pieces for qa and Tp (debug only; art O4a, docs/ogun.md 3.3, 3.6, 7):
 * ?gallery=sagamu   the two roads as in ogun-3.json (steps up, the flyover deck with kobo and
 *                   fufu, steps down; the low road under it with mud, gravel and the secret well),
 *                   small Abeokuta, Ota and Lagos streets to compare, the hopping gravel's frames,
 *                   dust, crumble and knocked (and in grey), the roof platform, the three traders'
 *                   stalls with their traders and calls, and Sagamu's cast of 16.
 * &t=1.5 holds the time; &still=1 draws the reduced-motion look.
 * The art is in the lazy Ogun part, so it is fetched here with import(), never bundled in.
 */
import { drawBackdrop } from './backdrop';
import { drawFolkFrame, drawBubble, type FolkFrame, type FolkLook } from './folk';
import { drawHero } from './hero';
import { drawFood, drawKobo } from './items';
import { INK } from './palette';
import { GROUND_Y, drawRoad } from './street';
import { drawWell } from './well';
import { OGUN_WORDS } from '../screens/words';

type Sag = typeof import('../worlds/ogun');
type Abk = typeof import('../worlds/ogun/abeokuta');
type Ota = typeof import('../worlds/ogun');
let sag: Sag | null = null;
let abk: Abk | null = null;
let ota: Ota | null = null;
let asked = false;

function label(g: CanvasRenderingContext2D, text: string, x: number, y: number, size = 10, align: CanvasTextAlign = 'left'): void {
  g.fillStyle = INK;
  g.font = `${size}px sans-serif`;
  g.textAlign = align;
  g.textBaseline = 'top';
  g.fillText(text, x, y);
}

function frame(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill = '#fffaf0'): void {
  g.fillStyle = fill;
  g.fillRect(x, y, w, h);
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
}

function folk(g: CanvasRenderingContext2D, look: FolkLook, x: number, y: number, s: number, f: FolkFrame = 'stand'): void {
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  drawFolkFrame(g, look, f);
  g.restore();
}

/** A small street to compare: Abeokuta, Ota or Lagos backdrop and a plain road. */
function compare(g: CanvasRenderingContext2D, x: number, y: number, s: number, time: number, still: boolean, which: 'abk' | 'ota' | 'lagos'): void {
  const camX = 1000;
  const viewW = 800;
  g.save();
  g.translate(x, y);
  g.beginPath();
  g.rect(0, 0, viewW * s, 360 * s);
  g.clip();
  g.scale(s, s);
  if (which === 'abk' && abk) abk.drawAbeokutaBackdrop(g, camX, viewW, time, 420, GROUND_Y, still);
  else if (which === 'ota' && ota) ota.drawOtaBackdrop(g, camX, viewW, time, 420, GROUND_Y, still);
  else drawBackdrop(g, 'morning', camX, viewW, time, 420);
  g.translate(-camX, 0);
  drawRoad(g, camX, viewW, [[camX - 50, camX + viewW + 50]], GROUND_Y, 360);
  g.restore();
}

/** The two roads, as placed in ogun-3.json, from x 3700 to 5250, at scale s. */
function strip(g: CanvasRenderingContext2D, a: Sag, x: number, y: number, s: number, time: number, still: boolean): void {
  const cx = 3700;
  const viewW = 1450;
  const t = still ? 0 : time;
  g.save();
  g.translate(x, y);
  g.beginPath();
  g.rect(0, 0, viewW * s, 360 * s);
  g.clip();
  g.scale(s, s);
  a.drawSagamuBackdrop(g, cx, viewW, time, 420, GROUND_Y, still);
  g.translate(-cx, 0);
  drawRoad(g, cx, viewW, [[cx - 50, cx + viewW + 50]], GROUND_Y, 360);
  // The low road first, then what is on it, then the deck and steps over it
  a.drawLowRoad(g, 4000, 4900, 160, GROUND_Y, time, still);
  ota?.drawMud(g, 4100, 160, GROUND_Y, time, still);
  drawWell(g, 4700, GROUND_Y, { kind: 'entrance', time: t, arrow: false });
  const hop = a.gravelHop(time + 0.4, still);
  a.drawGravel(g, 4450, GROUND_Y - hop.lift, hop.frame, GROUND_Y, 1);
  a.drawFlyoverStep(g, 3800, 240, 100, GROUND_Y);
  a.drawFlyoverStep(g, 3900, 180, 100, GROUND_Y);
  a.drawFlyoverDeck(g, 4000, 160, 900);
  a.drawFlyoverStep(g, 4950, 200, 100, GROUND_Y);
  a.drawFlyoverStep(g, 5050, 250, 100, GROUND_Y);
  for (let k = 0; k < 14; k++) drawKobo(g, 4030 + k * 24, 136, t);
  drawFood(g, 'fufu', 4600, 132, t);
  // A gravel on the open road before the steps, mid hop
  const hop2 = a.gravelHop(time, still);
  a.drawGravel(g, 3740, GROUND_Y - hop2.lift, hop2.frame, GROUND_Y, 0);
  g.save();
  g.translate(4300, 160);
  drawHero(g, { skin: 2, hair: 3, outfit: 1 }, { phase: still ? 0 : time * 8, inAir: false, facing: 1, glow: false, time: t });
  g.restore();
  g.restore();
}

/** A piece of road at (x, y) for close-ups: y is the road line on the page. */
function roadAt(g: CanvasRenderingContext2D, x: number, w: number, y: number, h = 46): void {
  g.fillStyle = '#3e3e42';
  g.fillRect(x, y, w, h);
  g.fillStyle = '#d8c27a';
  g.fillRect(x, y, w, 4);
}

function page(g: CanvasRenderingContext2D, a: Sag, time: number, still: boolean): void {
  const t = still ? 0 : time;
  label(g, 'O4a Sagamu (Ogun street 3): coral-to-gold evening, the interchange and a far quarry in plum, the kola market under flat cloth shades, dusk-grey concrete. No brands, umbrellas, pipes or blocks.', 12, 4, 11);

  // The two roads, big
  frame(g, 12, 22, 936, 232);
  strip(g, a, 12, 22, 936 / 1450, time, still);
  label(g, 'Two roads (ogun-3.json 3700 to 5150): steps up 60/120, the flyover deck 140 high with kobo and fufu, steps down 100/50; under it the low road with mud, gravel and the secret well', 14, 257, 10);

  // Gravel frames, dust, crumble, knocked, and in grey
  const gy = 276;
  frame(g, 12, gy, 450, 128, '#efe2c6');
  label(g, 'Hopping gravel 18 x 16: sit, land, rise, top (40 up), fall | dust | crumble | knocked | grey', 16, gy + 2, 10);
  const roadY = gy + 96;
  roadAt(g, 12, 450, roadY, 32);
  g.save();
  g.beginPath();
  g.rect(12, gy, 450, 128);
  g.clip();
  g.translate(12, roadY - GROUND_Y);
  const lifts: readonly (readonly [string, number])[] = [['sit', 0], ['land', 0], ['rise', 22], ['top', 40], ['fall', 22]];
  lifts.forEach(([f, lift], i) => a.drawGravel(g, 22 + i * 30, GROUND_Y - lift, f as never, GROUND_Y, i));
  [0.2, 0.6].forEach((k, i) => a.drawGravelDust(g, 176 + i * 34, GROUND_Y, k));
  [0.2, 0.5, 0.8].forEach((k, i) => a.drawGravelCrumble(g, 250 + i * 40, GROUND_Y, k));
  a.drawGravelKnocked(g, 356, GROUND_Y - 4, 0.3);
  g.filter = 'grayscale(1)';
  a.drawGravel(g, 404, GROUND_Y, 'sit', GROUND_Y, 0);
  a.drawGravel(g, 432, GROUND_Y - 30, 'top', GROUND_Y, 1);
  g.restore();

  // Sagamu's backdrop alone (the far interchange and quarry show between the roofs)
  const bs = 474 / 800;
  frame(g, 474, gy, 474, 360 * bs);
  g.save();
  g.translate(474, gy);
  g.beginPath();
  g.rect(0, 0, 474, 360 * bs);
  g.clip();
  g.scale(bs, bs);
  a.drawSagamuBackdrop(g, 640, 800, time, 420, GROUND_Y, still);
  g.translate(-640, 0);
  drawRoad(g, 640, 800, [[590, 1490]], GROUND_Y, 360);
  g.restore();
  label(g, 'Sagamu backdrop alone: kola market, GARRI IJEBU, lorry park, IKOKORE, VULCANIZER, BATTERY CHARGING', 476, gy + 360 * bs + 2, 10);

  // Three small streets to compare
  const cs = 146 / 800;
  const my = gy + 140;
  (['abk', 'ota', 'lagos'] as const).forEach((w, i) => {
    const fx = 12 + i * 152;
    frame(g, fx, my, 146, 360 * cs);
    compare(g, fx, my, cs, time, still, w);
    label(g, ['Abeokuta', 'Ota', 'Lagos'][i]!, fx + 2, my + 360 * cs + 2, 10);
  });

  // Traders' stalls with their traders and calls, and the roof platform
  const ty = 512;
  frame(g, 12, ty, 696, 150, '#f3e3cf');
  label(g, "Traders' stalls (scenery behind the walking line), each with its trader and call. Kola is only sold, whole, never broken. Roof platform: a kola shade", 16, ty + 2, 10);
  g.fillStyle = '#8f828a';
  g.fillRect(12, ty + 120, 696, 30);
  const calls = OGUN_WORDS.folk.traders.sagamu;
  a.SAGAMU_TRADERS.forEach((kind, i) => {
    const sx = 124 + i * 168;
    g.save();
    g.translate(sx, ty + 136 - GROUND_Y * 1.15);
    g.scale(1.15, 1.15);
    a.drawSagamuTraderStall(g, kind, 0, GROUND_Y, t);
    g.restore();
    folk(g, a.SAGAMU_TRADER_LOOKS[kind], sx - 54, ty + 140, 1.15, 'call');
    drawBubble(g, calls[i] ?? '', sx - 54, ty + 78, { tail: 'centre' });
  });
  folk(g, a.SAGAMU_KOLA_BUYER, 34, ty + 140, 1.15, still ? 'stand' : 'cheer0');
  g.save();
  g.translate(566, ty + 136 - GROUND_Y);
  a.drawSagamuStall(g, 0, 245, 130, GROUND_Y);
  g.restore();

  // Porter, mechanic, travellers
  frame(g, 720, ty, 228, 150, '#f3e3cf');
  label(g, 'Porter, mechanic, travellers', 724, ty + 2, 10);
  folk(g, a.SAGAMU_PORTER, 752, ty + 130, 1.3, still ? 'stand' : (['walk0', 'walk1', 'walk2', 'walk3'] as const)[Math.floor(time * 6) % 4]!);
  folk(g, a.SAGAMU_MECHANIC, 800, ty + 130, 1.3, 'stand');
  a.SAGAMU_TRAVELLERS.slice(0, 3).forEach((l, i) => folk(g, l, 850 + i * 36, ty + 130, 1.3, 'stand'));

  // The cast of 16
  const cy2 = 672;
  frame(g, 12, cy2, 936, 120, '#eef0f8');
  label(g, 'Sagamu cast (part 7): kola trader, kola buyer, garri trader, ikokore seller, porter, travellers, mechanic, man in isiagu, elder in etibo, child, teen, bus stop three (wheelchair, anger cloth, elder with gele)', 16, cy2 + 2, 10);
  a.SAGAMU_CAST.forEach((look, i) => {
    const fx = 40 + i * 56;
    const f: FolkFrame = i === 0 || i === 2 || i === 3 ? 'call' : i === 11 ? 'wave0' : 'stand';
    folk(g, look, fx, cy2 + 100, 1.5, f);
    label(g, String(i + 1), fx, cy2 + 104, 9, 'center');
  });
}

export function drawSagamuGallery(g: CanvasRenderingContext2D, viewW: number, viewH: number, time: number, still = false): void {
  if (!sag && !asked) {
    asked = true;
    void import('../worlds/ogun').then((m) => (sag = m));
    void import('../worlds/ogun/abeokuta').then((m) => (abk = m));
    void import('../worlds/ogun').then((m) => (ota = m));
  }
  g.save();
  g.fillStyle = '#fbf3df';
  g.fillRect(0, 0, viewW, viewH);
  const s = Math.min(viewW / 960, viewH / 800);
  g.scale(s, s);
  if (sag) page(g, sag, time, still);
  else label(g, 'Loading Sagamu...', 12, 12, 14);
  g.restore();
}
