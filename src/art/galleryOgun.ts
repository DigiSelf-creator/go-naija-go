/**
 * Ogun's gateway pieces for qa and Tp (debug only; docs/ogun.md 1.2 to 1.7, art O1a):
 * ?gallery=ogun   the arch: front faded, front bright (cog turning), bright at night, back faded
 *                 and bright; the small arch; the icons at three sizes; the wheel's pennant;
 * ?gallery=ogun2  the bus ride to Ogun (five frames and a live loop), the ride back to Lagos,
 *                 and the reduced-motion end picture;
 * ?gallery=ogun3  the challenge road with the "To Ogun" branch: locked, open, open and bright.
 * Same fixed 960 x 720 layout as the other pages; &t=1.5 holds the time.
 */
import { drawGateIcon, drawMiniArch, drawOgunBranch, GATE_ICONS, gateIconSvg, OGUN_STOP_BOX } from './gateway';
import type { HeroLook } from './hero';
import { drawBusRide, drawGateArch, BUS_RIDE } from './ogunGate';
import { INK } from './palette';
import { drawRoadPicture, drawStopPlate, PLATE, ROAD, ROAD_STOPS, STOP_BOX, type PlateState, type StopId } from './road';
import { wheelSvg } from './wheel';

type Page = (g: CanvasRenderingContext2D, time: number) => void;

function label(g: CanvasRenderingContext2D, text: string, x: number, y: number, size = 11): void {
  g.fillStyle = INK;
  g.font = `${size}px sans-serif`;
  g.textAlign = 'left';
  g.textBaseline = 'top';
  g.fillText(text, x, y);
}

function frame(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string): void {
  g.fillStyle = fill;
  g.fillRect(x, y, w, h);
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
}

const HEROES: readonly HeroLook[] = [
  { skin: 4, hair: 3, outfit: 1, body: 1, age: 1 },
  { skin: 0, hair: 0, outfit: 0, body: 0, age: 0 },
  { skin: 2, hair: 1, outfit: 2, body: 1, age: 0 },
  { skin: 3, hair: 4, outfit: 4, body: 1, age: 2 },
  { skin: 1, hair: 2, outfit: 3, body: 0, age: 1 },
];

let wheelImg: HTMLImageElement | null = null;

const arches: Page = (g, time) => {
  label(g, 'O1a the gateway arch: our own, no crest, emblem or logo. Faded before King Pothole (cog still), bright after (cog turns).', 12, 6, 13);
  const cells: [string, string, boolean, 'front' | 'back', boolean][] = [
    ['Front, faded', '#cfe8f5', false, 'front', false],
    ['Front, bright (cog turns)', '#cfe8f5', true, 'front', false],
    ['Front, bright, night (lamps)', '#2c3557', true, 'front', true],
    ['Back, faded', '#cfe8f5', false, 'back', false],
    ['Back, bright', '#cfe8f5', true, 'back', false],
  ];
  cells.forEach(([name, bg, lit, face, night], i) => {
    const x = 12 + (i % 3) * 312;
    const y = 30 + Math.floor(i / 3) * 252;
    frame(g, x, y, 300, 230, bg);
    g.fillStyle = '#8a8a90';
    g.fillRect(x, y + 200, 300, 30);
    drawGateArch(g, x + 150, y + 202, 1, { lit, face, night, time });
    label(g, name, x + 4, y + 234);
  });
  // The small arch, faded and bright, at the road and card sizes
  const mx = 636;
  const my = 282;
  frame(g, mx, my, 300, 230, '#f4ead2');
  label(g, 'Small arch (road branch, stop card)', mx + 4, my + 4);
  drawMiniArch(g, mx + 60, my + 90, 1.4, false);
  drawMiniArch(g, mx + 150, my + 90, 1.4, true);
  drawMiniArch(g, mx + 230, my + 90, 0.72, false);
  drawMiniArch(g, mx + 265, my + 90, 0.72, true);
  drawMiniArch(g, mx + 150, my + 210, 3, true);
  // Icons on a yellow plate, on sand, on dark, at 16, 24 and 48
  const iy = 552;
  label(g, 'Icons: arch ("To Ogun" open), travel (city Travel button), pennant (Ogun next, wheel and list)', 12, iy - 18);
  GATE_ICONS.forEach((icon, i) => {
    const x = 12 + i * 200;
    frame(g, x, iy, 92, 56, PLATE.open);
    drawGateIcon(g, icon, x + 6, iy + 20, 16);
    drawGateIcon(g, icon, x + 28, iy + 16, 24);
    drawGateIcon(g, icon, x + 58, iy + 4, 48 * 0.66);
    frame(g, x + 100, iy, 44, 56, PLATE.locked);
    drawGateIcon(g, icon, x + 106, iy + 16, 24);
    frame(g, x + 152, iy, 40, 56, INK);
    drawGateIcon(g, icon, x + 160, iy + 16, 24, '#fffaf0');
  });
  // The wheel with Lagos turning and Ogun's pennant (SVG markup, as the wheel screen uses)
  if (!wheelImg) {
    wheelImg = new Image();
    wheelImg.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(wheelSvg(['lagos'], { next: ['ogun'], turn: false }).replace('width="100%" height="100%"', 'width="412" height="412"'))}`;
  }
  frame(g, 612, 530, 336, 180, '#fbf3df');
  if (wheelImg.complete) g.drawImage(wheelImg, 40, 160, 200, 110, 612, 530, 327, 180);
  label(g, 'Ogun, next (pennant)', 616, 532, 10);
  g.save();
  g.translate(616, 690);
  g.fillStyle = INK;
  g.font = '12px sans-serif';
  g.fillText('List:', 0, 0);
  drawGateIcon(g, 'pennant', 32, -1, 16);
  g.fillText('Ogun, next', 52, 0);
  g.restore();
  label(g, `SVG check: ${gateIconSvg('arch').length} + ${gateIconSvg('travel').length} + ${gateIconSvg('pennant').length} chars`, 12, 618, 10);
};

const ride: Page = (g, time) => {
  label(g, 'O1a the bus ride to Ogun (568 x 320 shown at half size): p = 0, 0.25, 0.5, 0.75, 1, and a live 4 s loop', 12, 6, 13);
  const w = 284;
  const h = 160;
  [0, 0.25, 0.5, 0.75, 1].forEach((p, i) => {
    const x = 12 + (i % 3) * 312;
    const y = 30 + Math.floor(i / 3) * 186;
    g.save();
    g.translate(x, y);
    g.beginPath();
    g.rect(0, 0, w, h);
    g.clip();
    drawBusRide(g, w, h, p, { look: HEROES[i]!, time: p * BUS_RIDE.first });
    g.restore();
    g.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
    label(g, `p = ${p}`, x, y + h + 4);
  });
  const lp = ((time % (BUS_RIDE.first + 1)) / BUS_RIDE.first);
  g.save();
  g.translate(636, 216);
  g.beginPath();
  g.rect(0, 0, w, h);
  g.clip();
  drawBusRide(g, w, h, Math.min(1, lp), { look: HEROES[3]!, time });
  g.restore();
  label(g, 'Live (loops every 5 s)', 636, 380);
  // Back to Lagos, bright; reduced motion; a narrow 320 x 240 and a wide 851 x 393
  const rows: [string, number, number, number, number, Parameters<typeof drawBusRide>[4], number][] = [
    ['To Lagos, under the back (bright), p = 1', 12, 412, 284, 160, { look: HEROES[1]!, toLagos: true, lit: true, time }, 1],
    ['Reduced motion: the end picture only', 324, 412, 284, 160, { look: HEROES[2]!, still: true }, 0.3],
    ['320 x 240 at half size, p = 1', 636, 412, 160, 120, { look: HEROES[4]!, time }, 1],
    ['851 x 393 at 0.6, p = 0.6, bright', 12, 600, 511, 236 * 0.45, { look: HEROES[0]!, lit: true, time }, 0.6],
  ];
  for (const [name, x, y, rw, rh, o, p] of rows) {
    g.save();
    g.translate(x, y);
    g.beginPath();
    g.rect(0, 0, rw, rh);
    g.clip();
    drawBusRide(g, rw, rh, p, o);
    g.restore();
    g.strokeRect(x - 0.5, y - 0.5, rw + 1, rh + 1);
    label(g, name, x, y + rh + 4);
  }
};

const NAMES: Record<StopId, string> = { alausa: 'Alausa', lane: 'Lane run', computerVillage: 'Computer Village', ikeja: 'Ikeja', hall: 'Go-Slow Hall', ferry: 'Ferry' };

function roadWith(g: CanvasRenderingContext2D, x: number, y: number, s: number, open: boolean, lit: boolean): void {
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  drawRoadPicture(g, { jetty: 'after', next: null });
  drawOgunBranch(g, open, lit);
  for (const id of ROAD_STOPS) {
    const st: PlateState = id === 'ferry' ? 'soon' : open ? 'done' : id === 'hall' ? 'next' : 'done';
    drawStopPlate(g, STOP_BOX[id], st, { name: NAMES[id], status: st === 'done' ? 'Done ✓' : st === 'soon' ? 'Coming soon' : 'Ready to play' }, 0, id === 'ferry');
  }
  const b = OGUN_STOP_BOX;
  drawStopPlate(g, b, open ? 'open' : 'locked', { name: 'To Ogun', status: open ? 'Open' : 'Locked', line3: open ? undefined : 'Win Go-Slow Hall' });
  if (open) {
    // The arch icon in place of the bus icon
    g.fillStyle = PLATE.open;
    g.fillRect(b.x + PLATE.pad + 1, b.y + 26, 18, 18);
    drawGateIcon(g, 'arch', b.x + PLATE.pad + 2, b.y + 27, PLATE.icon);
  }
  g.restore();
}

const road: Page = (g) => {
  label(g, 'O1a the "To Ogun" stop and its branch (box 484, 4, 112, 64): locked (top), open (middle), open with the arch bright (bottom)', 12, 6, 13);
  const s = 1.36;
  roadWith(g, 10, 26, s, false, false);
  roadWith(g, 10, 258, s, true, false);
  roadWith(g, 10, 486, s, true, true);
  label(g, `Road ${ROAD.w} x ${ROAD.h}. Locked: sand plate, padlock, "Locked", striped barrier. Open: yellow plate, arch icon, "Open", arrow painted up the branch.`, 12, 712, 10);
};

export const OGUN_PAGES: readonly Page[] = [arches, ride, road];

export function drawOgunGallery(g: CanvasRenderingContext2D, viewW: number, viewH: number, time: number, page: number): void {
  g.save();
  g.fillStyle = '#fbf3df';
  g.fillRect(0, 0, viewW, viewH);
  const s = Math.min(viewW / 960, viewH / 720);
  g.scale(s, s);
  (OGUN_PAGES[page] ?? OGUN_PAGES[0]!)(g, time);
  g.restore();
}
