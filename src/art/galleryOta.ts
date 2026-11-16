/**
 * Ota's pieces for qa and Tp (debug only; art O2a, docs/ogun.md 2.2, 3.3, 3.4, 4.1, 7):
 * ?gallery=ota   the street (with a small Lagos street beside it to compare), mud (and in grey),
 *                footprints filling in, the splash, ikokore on the road and as HUD icons, the
 *                Ijebu garri crate and food, the shade-roof platform, the three traders' stalls with
 *                their traders and calls, and Ota's cast of 16.
 * &t=1.5 holds the time; &still=1 draws the reduced-motion look.
 * Ota's art is in the lazy Ogun part, so it is fetched here with import(), never bundled in.
 */
import { drawBackdrop } from './backdrop';
import { drawFolkFrame, drawBubble, type FolkLook } from './folk';
import { drawGoat } from './hazards';
import { drawHero } from './hero';
import { drawFoodIcon, drawKobo } from './items';
import { INK } from './palette';
import { GROUND_Y, drawRoad } from './street';
import { drawGateArch } from './ogunGate';
import { OGUN_WORDS } from '../screens/words';

type Ota = typeof import('../worlds/ogun');
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

function road(g: CanvasRenderingContext2D, x: number, w: number, y: number, h = 40): void {
  g.fillStyle = '#3e3e42';
  g.fillRect(x, y, w, h);
  g.fillStyle = '#d8c27a';
  g.fillRect(x, y, w, 5);
}

function folk(g: CanvasRenderingContext2D, look: FolkLook, x: number, y: number, s: number, f: Parameters<typeof drawFolkFrame>[2] = 'stand'): void {
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  drawFolkFrame(g, look, f);
  g.restore();
}

/** One street strip: the backdrop and road at scale s, clipped to w x h. */
function strip(g: CanvasRenderingContext2D, o: Ota, x: number, y: number, s: number, viewW: number, time: number, still: boolean, lagos: boolean): void {
  const camX = 1000;
  g.save();
  g.translate(x, y);
  g.beginPath();
  g.rect(0, 0, viewW * s, 360 * s);
  g.clip();
  g.scale(s, s);
  if (lagos) drawBackdrop(g, 'morning', camX, viewW, time, 420);
  else o.drawOtaBackdrop(g, camX, viewW, time, 420, GROUND_Y, still);
  g.translate(-camX, 0);
  const ground: [number, number][] = [[camX - 50, camX + 560], [camX + 620, camX + viewW + 50]];
  drawRoad(g, camX, viewW, ground, GROUND_Y, 360);
  if (lagos) {
    g.restore();
    return;
  }
  drawGateArch(g, camX + 120, GROUND_Y, 1, { lit: false, time, still });
  o.drawMud(g, camX + 300, 160, GROUND_Y, time, still);
  for (let k = 0; k < 4; k++) o.drawMudPrint(g, camX + 330 + k * 18, GROUND_Y, k * 0.3, k % 2 === 0);
  o.drawOtaStall(g, camX + 660, 240, 140);
  for (let k = 0; k < 4; k++) drawKobo(g, camX + 690 + k * 24, 220, still ? 0 : time);
  o.drawIkokore(g, camX + 520, 272, still ? 0 : time);
  drawGoat(g, camX + 880, GROUND_Y, still ? 0 : time);
  g.save();
  g.translate(camX + 380, GROUND_Y);
  drawHero(g, { skin: 3, hair: 2, outfit: 1 }, { phase: still ? 0 : (time * 0.9) % 1, inAir: false, facing: 1, glow: false, time: still ? 0 : time });
  g.restore();
  g.restore();
}

function page(g: CanvasRenderingContext2D, o: Ota, time: number, still: boolean): void {
  label(g, 'O2a Ota (Ogun street 1): lilac-to-apricot morning, pale indigo factory sheds, laterite pavement, indigo awnings. No brands, logos, uniforms or party colours.', 12, 4, 12);
  // Ota big, Lagos small beside it
  frame(g, 12, 22, 600, 270);
  strip(g, o, 12, 22, 600 / 800, 800, time, still, false);
  label(g, 'Ota: the arch, mud with fresh prints filling in, the hero, ikokore, the shade-roof platform, a goat', 14, 294, 10);
  frame(g, 624, 22, 324, 146);
  strip(g, o, 624, 22, 324 / 800, 800, time, still, true);
  label(g, 'Lagos, Alausa (to compare)', 626, 170, 10);

  // Mud: close up, and in grey (it reads without colour)
  const my = 192;
  frame(g, 624, my, 160, 100, '#efe2c6');
  frame(g, 788, my, 160, 100, '#efe2c6');
  for (const [i, gx] of [[0, 624], [1, 788]] as const) {
    g.save();
    if (i === 1) g.filter = 'grayscale(1)';
    road(g, gx, 160, my + 50, 50);
    g.translate(gx, my + 50 - GROUND_Y * 0.9);
    g.scale(0.9, 0.9);
    o.drawMud(g, 22, 130, GROUND_Y, time, still);
    g.restore();
  }
  label(g, 'Mud, 130 wide', 628, my + 2, 10);
  label(g, 'Mud in grey (qa: reads?)', 792, my + 2, 10);

  // Prints filling in, splash frames
  const py = 312;
  frame(g, 12, py, 300, 92);
  label(g, 'Footprints filling in (k 0, .25, .5, .75) and the step splash (k 0 to .8)', 16, py + 2, 10);
  g.save();
  road(g, 12, 300, py + 52);
  g.translate(12, py + 52 - GROUND_Y);
  o.drawMud(g, 10, 130, GROUND_Y, 0, true);
  for (let k = 0; k < 4; k++) o.drawMudPrint(g, 30 + k * 26, GROUND_Y, k * 0.25, k % 2 === 0);
  o.drawMud(g, 160, 130, GROUND_Y, 0, true);
  for (let k = 0; k < 5; k++) o.drawMudSplash(g, 175 + k * 25, GROUND_Y, k * 0.2);
  g.restore();

  // Ikokore and Ijebu garri
  frame(g, 324, py, 300, 92);
  label(g, 'Ikokore: road pickup, HUD 56 px, 28 px, and 16 px', 328, py + 2, 10);
  o.drawIkokore(g, 360, py + 52, still ? 0 : time);
  g.fillStyle = 'rgba(0,0,0,0.55)';
  g.fillRect(400, py + 22, 56, 56);
  g.save();
  g.translate(400, py + 22);
  g.scale(56 / 32, 56 / 32);
  o.drawIkokoreIcon(g, 16, 16, 0.85);
  g.restore();
  g.fillRect(466, py + 36, 28, 28);
  g.save();
  g.translate(466, py + 36);
  g.scale(28 / 32, 28 / 32);
  o.drawIkokoreIcon(g, 16, 16, 0.85);
  g.restore();
  g.save();
  g.translate(504, py + 42);
  g.scale(16 / 32, 16 / 32);
  o.drawIkokoreIcon(g, 16, 16, 0.85);
  g.restore();
  label(g, OGUN_WORDS.hud.ikokore(12), 530, py + 44, 11);

  frame(g, 636, py, 312, 92);
  o.drawIjebuGarriCrate(g, 680, py + 86, { open: false, angle: still ? 0 : Math.sin(time * 2) * 0.08 });
  o.drawIjebuGarriCrate(g, 740, py + 86, { open: true, angle: 0 });
  o.drawIjebuGarriIcon(g, 820, py + 56, 1);
  drawFoodIcon(g, 'garri', 880, py + 56, 1);
  label(g, 'Ijebu garri: crate shut and open, its food, Lagos garri to compare', 640, py + 2, 10);
  label(g, 'Ijebu', 820, py + 76, 9, 'center');
  label(g, 'Lagos', 880, py + 76, 9, 'center');

  // Traders' stalls with their traders and calls
  const ty = 420;
  frame(g, 12, ty, 936, 132, '#f3e3cf');
  label(g, "The traders' stalls (scenery behind the walking line), each trader with their own goods and call", 16, ty + 2, 10);
  g.fillStyle = '#c9794a';
  g.fillRect(12, ty + 96, 936, 36);
  const calls = OGUN_WORDS.folk.traders.ota;
  o.OTA_TRADERS.forEach((kind, i) => {
    const sx = 130 + i * 300;
    g.save();
    g.translate(sx, ty + 112 - GROUND_Y * 1.3);
    g.scale(1.3, 1.3);
    o.drawOtaTraderStall(g, kind, 0, GROUND_Y, still ? 0 : time);
    g.restore();
    folk(g, o.OTA_TRADER_LOOKS[kind], sx - 70, ty + 118, 1.3, 'call');
    drawBubble(g, calls[i] ?? '', sx - 70, ty + 50, { tail: 'centre' });
  });

  // The cast of 16
  const cy = 566;
  frame(g, 12, cy, 936, 140, '#eef0f8');
  label(g, 'Ota cast (part 7): factory workers (plain, no logos), market woman in iro and buba, student, 3 traders, the truck driver resting, 2 children, 3 travellers, elder, wheelchair user, walker', 16, cy + 2, 10);
  o.OTA_CAST.forEach((look, i) => {
    const fx = 44 + i * 57;
    const f = look.stool ? 'sit' : i === 8 || i === 9 ? 'clap0' : i >= 10 && i <= 12 ? 'wave0' : 'stand';
    folk(g, look, fx, cy + 112, 1.7, f);
    label(g, String(i + 1), fx, cy + 120, 9, 'center');
  });
}

export function drawOtaGallery(g: CanvasRenderingContext2D, viewW: number, viewH: number, time: number, still = false): void {
  if (!ota && !asked) {
    asked = true;
    void import('../worlds/ogun').then((m) => (ota = m));
  }
  g.save();
  g.fillStyle = '#fbf3df';
  g.fillRect(0, 0, viewW, viewH);
  const s = Math.min(viewW / 960, viewH / 720);
  g.scale(s, s);
  if (ota) page(g, ota, time, still);
  else label(g, 'Loading Ota...', 12, 12, 14);
  g.restore();
}
