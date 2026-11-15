/**
 * Abeokuta's pieces and the Ogun well room for qa and Tp (debug only; art O3a, docs/ogun.md 3.3,
 * 3.5, 3.7, 4.1, 7):
 * ?gallery=abeokuta   the street (with small Ota and Lagos streets beside it to compare), rock steps
 *                     and the ledge over a pothole, cracks shut, opening and open (and in grey),
 *                     the crack sign beside the pothole sign, water potholes (and in grey), ofada on
 *                     the road and as HUD icons, the roof platform, the three traders' stalls with
 *                     their traders and calls, the tailor, the well room with the store keeper and
 *                     the Ijebu garri parcel, and Abeokuta's cast of 16.
 * &t=1.5 holds the time; &still=1 draws the reduced-motion look.
 * The art is in the lazy Ogun part, so it is fetched here with import(), never bundled in.
 */
import { drawBackdrop } from './backdrop';
import { drawFolkFrame, drawBubble, type FolkFrame, type FolkLook } from './folk';
import { drawHero } from './hero';
import { drawKobo } from './items';
import { INK } from './palette';
import { drawPotholeSign } from './sign';
import { GROUND_Y, drawRoad } from './street';
import { drawRoomRope, ROOM_ROPE_BUCKET_Y } from './wellRoom';
import { OGUN_WORDS } from '../screens/words';

type Abk = typeof import('../worlds/ogun/abeokuta');
type Ota = typeof import('../worlds/ogun/ota');
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

/** A small street to compare: Ota or Lagos backdrop and a plain road. */
function compare(g: CanvasRenderingContext2D, x: number, y: number, s: number, time: number, still: boolean, which: 'ota' | 'lagos'): void {
  const camX = 1000;
  const viewW = 800;
  g.save();
  g.translate(x, y);
  g.beginPath();
  g.rect(0, 0, viewW * s, 360 * s);
  g.clip();
  g.scale(s, s);
  if (which === 'lagos' || !ota) drawBackdrop(g, 'morning', camX, viewW, time, 420);
  else ota.drawOtaBackdrop(g, camX, viewW, time, 420, GROUND_Y, still);
  g.translate(-camX, 0);
  drawRoad(g, camX, viewW, [[camX - 50, camX + viewW + 50]], GROUND_Y, 360);
  g.restore();
}

/** The main Abeokuta strip, 1000 u wide at scale s. */
function strip(g: CanvasRenderingContext2D, a: Abk, x: number, y: number, s: number, time: number, still: boolean): void {
  const cx = 2000;
  const viewW = 1000;
  const t = still ? 0 : time;
  g.save();
  g.translate(x, y);
  g.beginPath();
  g.rect(0, 0, viewW * s, 360 * s);
  g.clip();
  g.scale(s, s);
  a.drawAbeokutaBackdrop(g, cx, viewW, time, 420, GROUND_Y, still);
  g.translate(-cx, 0);
  drawRoad(g, cx, viewW, [[cx - 50, cx + 510], [cx + 590, cx + 800], [cx + 860, cx + 1050]], GROUND_Y, 360);
  // Rock steps (50, 100, 150 high) and the long ledge over a pothole
  a.drawRock(g, cx + 40, 100, 50);
  a.drawRock(g, cx + 170, 100, 100);
  a.drawRock(g, cx + 300, 100, 150);
  a.drawRock(g, cx + 430, 220, 90, GROUND_Y, [cx + 510, cx + 590]);
  drawPotholeSign(g, cx + 415);
  for (let k = 0; k < 3; k++) drawKobo(g, cx + 205 + k * 20, 176, t);
  a.drawOfada(g, cx + 470, 186, t);
  // A crack with its sign, a water pothole, a roof platform
  a.drawCrackSign(g, cx + 680);
  a.drawCrack(g, cx + 720, 40, GROUND_Y, 360, 0, time, still);
  a.drawWaterPothole(g, cx + 800, cx + 860, GROUND_Y, 360, time, still);
  a.drawAbeokutaStall(g, cx + 880, 180, 110);
  g.save();
  g.translate(cx + 220, 200);
  drawHero(g, { skin: 5, hair: 1, outfit: 2 }, { phase: 0, inAir: false, facing: 1, glow: false, time: t });
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

function page(g: CanvasRenderingContext2D, a: Abk, time: number, still: boolean): void {
  const t = still ? 0 : time;
  label(g, 'O3a Abeokuta (Ogun street 2): turquoise-to-lemon midday, our own unnamed granite rocks behind rust roofs, adire drying, granite paving. No brands, shrine, carvings or holy things.', 12, 4, 11);

  // The street big, Ota and Lagos small beside it
  frame(g, 12, 22, 600, 216);
  strip(g, a, 12, 22, 0.6, time, still);
  label(g, 'Abeokuta: rock steps 50/100/150, the ledge over a pothole (with ofada), crack sign and crack, water pothole, the drying-shed roof', 14, 241, 10);
  frame(g, 624, 22, 324, 146);
  compare(g, 624, 22, 324 / 800, time, still, 'ota');
  label(g, 'Ota (to compare)', 626, 170, 10);
  frame(g, 624, 186, 324, 146);
  compare(g, 624, 186, 324 / 800, time, still, 'lagos');
  label(g, 'Lagos, Alausa (to compare)', 626, 334, 10);

  // Crack frames: shut, opening, open; the signs side by side; in grey
  const cy = 258;
  frame(g, 12, cy, 600, 120, '#efe2c6');
  label(g, 'Crack 40: shut, opening k .25 .5 .75, open. Crack 60 in grey (qa: reads?). Crack sign beside the pothole sign', 16, cy + 2, 10);
  const roadY = cy + 70;
  roadAt(g, 12, 600, roadY, 50);
  g.save();
  g.beginPath();
  g.rect(12, cy, 600, 120);
  g.clip();
  g.translate(12, roadY - GROUND_Y);
  [0, 0.25, 0.5, 0.75, 1].forEach((k, i) => a.drawCrack(g, 20 + i * 66, 40, GROUND_Y, GROUND_Y + 50, k, time, still));
  g.save();
  g.filter = 'grayscale(1)';
  a.drawCrack(g, 360, 60, GROUND_Y, GROUND_Y + 50, 0, time, still);
  a.drawCrack(g, 440, 60, GROUND_Y, GROUND_Y + 50, 1, time, still);
  g.restore();
  a.drawCrackSign(g, 540);
  drawPotholeSign(g, 580);
  g.restore();

  // Water potholes, colour and grey
  frame(g, 624, 348, 324, 120, '#efe2c6');
  label(g, 'Water potholes: tap 40, hold 60, and in grey', 628, 350, 10);
  const wy = 348 + 70;
  roadAt(g, 624, 324, wy, 50);
  g.save();
  g.beginPath();
  g.rect(624, 348, 324, 120);
  g.clip();
  g.translate(624, wy - GROUND_Y);
  a.drawWaterPothole(g, 30, 70, GROUND_Y, GROUND_Y + 50, time, still);
  a.drawWaterPothole(g, 110, 170, GROUND_Y, GROUND_Y + 50, time, still);
  g.filter = 'grayscale(1)';
  a.drawWaterPothole(g, 220, 280, GROUND_Y, GROUND_Y + 50, time, still);
  g.restore();

  // Ofada: on the road and at three HUD sizes
  frame(g, 12, 388, 600, 80);
  label(g, 'Ofada: road pickup, HUD 56, 28 and 16 px', 16, 390, 10);
  a.drawOfada(g, 50, 436, t);
  g.fillStyle = 'rgba(0,0,0,0.55)';
  g.fillRect(90, 404, 56, 56);
  g.save();
  g.translate(90, 404);
  g.scale(56 / 32, 56 / 32);
  a.drawOfadaIcon(g, 16, 16, 0.85);
  g.restore();
  g.fillRect(156, 418, 28, 28);
  g.save();
  g.translate(156, 418);
  g.scale(28 / 32, 28 / 32);
  a.drawOfadaIcon(g, 16, 16, 0.85);
  g.restore();
  g.save();
  g.translate(194, 424);
  g.scale(16 / 32, 16 / 32);
  a.drawOfadaIcon(g, 16, 16, 0.85);
  g.restore();
  label(g, OGUN_WORDS.hud.ofada(12), 218, 426, 11);
  label(g, OGUN_WORDS.toast.ofada, 290, 426, 11);

  // Traders' stalls with their traders and calls, and the tailor at the table
  const ty = 478;
  frame(g, 12, ty, 600, 118, '#f3e3cf');
  label(g, "Traders' stalls (scenery behind the walking line), each with its trader and call; the tailor on a stool", 16, ty + 2, 10);
  g.fillStyle = '#b8b2a5';
  g.fillRect(12, ty + 88, 600, 30);
  const calls = OGUN_WORDS.folk.traders.abeokuta;
  a.ABEOKUTA_TRADERS.forEach((kind, i) => {
    const sx = 112 + i * 168;
    g.save();
    g.translate(sx, ty + 104 - GROUND_Y * 1.15);
    g.scale(1.15, 1.15);
    a.drawAbeokutaTraderStall(g, kind, 0, GROUND_Y, t);
    g.restore();
    folk(g, a.ABEOKUTA_TRADER_LOOKS[kind], sx - 58, ty + 108, 1.15, 'call');
    drawBubble(g, calls[i] ?? '', sx - 58, ty + 46, { tail: 'centre' });
  });
  g.save();
  g.translate(568, ty + 104 - GROUND_Y * 1.15);
  g.scale(1.15, 1.15);
  a.drawTailorTable(g, 0, GROUND_Y);
  g.restore();
  folk(g, a.ABEOKUTA_TAILOR, 540, ty + 108, 1.15, 'sit');

  // The well room, the store keeper, the parcel
  const ry = 478;
  frame(g, 624, ry, 324, 118, '#1a1a1a');
  g.save();
  g.beginPath();
  g.rect(624, ry, 324, 118);
  g.clip();
  const rs = 0.5;
  g.translate(624 + 22, ry - 96 * rs);
  g.scale(rs, rs);
  a.drawOgunWellRoom(g, -44, 648, time, 420, still);
  a.drawSackStack(g, 110, 240, 90);
  a.drawOgunShelf(g, 240, 200, 90);
  a.drawSackStack(g, 380, 250, 90);
  a.drawIjebuParcel(g, 285, 176, t);
  drawRoomRope(g, a.OGUN_ROOM.exitX, ROOM_ROPE_BUCKET_Y, t);
  const keeperFrame: FolkFrame = still ? 'sit' : (['sit', 'wave0', 'wave1', 'clap0', 'clap1'] as const)[Math.floor(time) % 5]!;
  folk(g, a.OGUN_STORE_KEEPER, a.OGUN_STORE_KEEPER_SPOT.x, a.OGUN_STORE_KEEPER_SPOT.y, 1, keeperFrame);
  g.restore();
  g.save();
  g.translate(624, ry);
  drawBubble(g, OGUN_WORDS.folk.storeKeeper, 120, 22, { tail: 'centre', px: 10 });
  g.restore();

  // The cast of 16, the store keeper and the parcel icon
  const cy2 = 604;
  frame(g, 12, cy2, 936, 112, '#eef0f8');
  label(g, 'Abeokuta cast (part 7): 4 adire dyers, adire, new cloth and ofada traders, tailor, buyer, woman with head basket, man in buba and fila, woman in hijab, student, child, wheelchair user, elder | store keeper | parcel', 16, cy2 + 2, 10);
  a.ABEOKUTA_CAST.forEach((look, i) => {
    const fx = 36 + i * 50;
    const f: FolkFrame = look.stool ? 'sit' : i >= 4 && i <= 6 ? 'call' : i === 13 ? 'wave0' : 'stand';
    folk(g, look, fx, cy2 + 92, 1.5, f);
    label(g, String(i + 1), fx, cy2 + 98, 9, 'center');
  });
  folk(g, a.OGUN_STORE_KEEPER, 846, cy2 + 92, 1.5, 'sit');
  label(g, 'keeper', 846, cy2 + 98, 9, 'center');
  a.drawIjebuParcel(g, 892, cy2 + 70, t);
  a.drawIjebuParcelIcon(g, 926, cy2 + 70, 24);
  label(g, 'room / HUD', 909, cy2 + 98, 9, 'center');
}

export function drawAbeokutaGallery(g: CanvasRenderingContext2D, viewW: number, viewH: number, time: number, still = false): void {
  if (!abk && !asked) {
    asked = true;
    void import('../worlds/ogun/abeokuta').then((m) => (abk = m));
    void import('../worlds/ogun/ota').then((m) => (ota = m));
  }
  g.save();
  g.fillStyle = '#fbf3df';
  g.fillRect(0, 0, viewW, viewH);
  const s = Math.min(viewW / 960, viewH / 720);
  g.scale(s, s);
  if (abk) page(g, abk, time, still);
  else label(g, 'Loading Abeokuta...', 12, 12, 14);
  g.restore();
}
