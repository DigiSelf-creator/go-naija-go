/**
 * The Booming meter you can see: gallery pages (debug only; city.md part 5 step (d), S3d1a).
 * ?gallery=25 rows 1 and 2 of Lagos, each block tired (left) and bright (right);
 * ?gallery=26 row 3, the two problem blocks tired, and the bus park tired, bright and boomed;
 * ?gallery=27 the pieces one by one, the proud people, the meter at every step (wide and small,
 *   and in greyscale), the first boom's flats growing, the bus shelter and the coming-soon pins;
 * ?gallery=28 the whole city at far zoom at 0, 8, 20 (the boom) and 24 points (d12 check 1);
 * ?gallery=29 the whole city tired, big; ?gallery=30 the whole city after the boom, big.
 * Same fixed 960 x 720 layout as the other pages; &t=1.5 holds the time.
 */
import {
  CITY_AREAS,
  CITY_BLOCKS,
  CITY_MAP,
  CITY_SPOTS,
  FLATS,
  SOON_IDS,
  drawBusShelter,
  drawCity,
  drawCityBlock,
  drawCityGround,
  drawCityLamp,
  drawBoomFlats,
  drawComingSoonPin,
  drawProblemPin,
  BUS_PARK,
  SOON_PINS,
  type CityBlock,
  type CityOpts,
  type SpotLooks,
} from './city';
import {
  BLOCK_LIFE,
  GOODS_KINDS,
  PROUD_KINDS,
  drawChildrenWithBall,
  drawCityPalm,
  drawCityTree,
  drawFoldedUmbrella,
  drawFruitUmbrella,
  drawGoods,
  drawKerbSack,
  drawPottedPlant,
  drawProudFolk,
  drawShutter,
  drawWashingLine,
} from './bright';
import { BOOM_BAR, boomBarParts, drawBoomBar, drawBoomIcon } from './boomMeter';
import { drawMamaPut, drawMarketPlace } from './places';
import { INK } from './palette';

type Page = (g: CanvasRenderingContext2D, time: number) => void;

function label(g: CanvasRenderingContext2D, text: string, x: number, y: number, size = 10, align: CanvasTextAlign = 'center'): void {
  g.fillStyle = INK;
  g.font = `${size}px sans-serif`;
  g.textAlign = align;
  g.textBaseline = 'top';
  g.fillText(text, x, y);
}

function title(g: CanvasRenderingContext2D, text: string): void {
  g.fillStyle = INK;
  g.font = 'bold 14px sans-serif';
  g.textAlign = 'left';
  g.textBaseline = 'top';
  g.fillText(text, 12, 6);
}

const NONE: readonly string[] = [];
const ALL: readonly string[] = CITY_AREAS;
const PROBLEMS: SpotLooks = { potholes: 'problem', lightsOut: 'problem', slowInternet: 'problem' };
const FIXED: SpotLooks = { potholes: 'fixed', lightsOut: 'fixed', slowInternet: 'fixed' };

/** The top of a block as drawn (its tallest roof), in map units. */
function blockTop(b: CityBlock, boom: boolean): number {
  return Math.min(...b.boxes.map((q) => q.y - q.h)) - (boom && b.id === FLATS.block ? FLATS.rise : 0) - 26;
}

/** One block in a panel, with the ground and roads around it. */
function blockPanel(g: CanvasRenderingContext2D, b: CityBlock, x: number, y: number, w: number, h: number, opts: CityOpts, look: 'problem' | 'fixed' = 'fixed'): void {
  const top = blockTop(b, opts.boom === true);
  const mw = b.w + 24;
  const mh = b.y + b.d + 12 - top;
  const s = Math.min(w / mw, h / mh);
  g.save();
  g.beginPath();
  g.rect(x, y, w, h);
  g.clip();
  g.translate(x + (w - mw * s) / 2, y + (h - mh * s) / 2);
  g.scale(s, s);
  g.translate(-b.x + 12, -top);
  g.fillStyle = '#eadfc4';
  g.fillRect(b.x - 12, top, mw, mh);
  drawCityBlock(g, b, look, opts);
  g.restore();
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.strokeRect(x, y, w, h);
}

function lifeLine(b: CityBlock): string {
  const l = BLOCK_LIFE[b.id];
  if (!l) return b.id;
  return `${b.id}: tired ${l.shutters} shutters, ${l.sacks} sack, ${l.proud}; bright ${l.people} people, ${l.extra}`;
}

/** Two rows of blocks, tired then bright. */
function rowsPage(rows: readonly number[], head: string): Page {
  return (g) => {
    title(g, head);
    const blocks = CITY_BLOCKS.filter((b) => rows.includes(Number(b.id[1])));
    blocks.forEach((b, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 10 + col * 475;
      const y = 26 + row * 172;
      blockPanel(g, b, x, y, 230, 150, { bright: NONE }, b.spot ? 'problem' : 'fixed');
      blockPanel(g, b, x + 236, y, 230, 150, { bright: ALL }, 'fixed');
      label(g, lifeLine(b), x + 233, y + 153, 9);
    });
  };
}

const rows01 = rowsPage([0, 1], 'S3d1a: rows 1 and 2, each block tired (left) then bright (right). Tired, never bad: someone proud on every block');

const rows2: Page = (g) => {
  title(g, 'S3d1a: row 3 tired / bright; problem blocks tired; the bus park tired, bright, after the boom');
  CITY_BLOCKS.filter((b) => b.id[1] === '2').forEach((b, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 10 + col * 475;
    const y = 26 + row * 160;
    blockPanel(g, b, x, y, 230, 140, { bright: NONE }, b.spot ? 'problem' : 'fixed');
    blockPanel(g, b, x + 236, y, 230, 140, { bright: ALL }, 'fixed');
    label(g, lifeLine(b) + (b.spot ? ' (left: still a problem)' : ''), x + 233, y + 142, 9);
  });
  // The other problem block (r1c3, Slow internet): tired with its problem, then bright and fixed
  const r1c3 = CITY_BLOCKS.find((b) => b.id === 'r1c3')!;
  blockPanel(g, r1c3, 10, 360, 230, 150, { bright: NONE }, 'problem');
  blockPanel(g, r1c3, 246, 360, 230, 150, { bright: ALL }, 'fixed');
  label(g, 'r1c3 (Slow internet): tired with its problem marks / bright and fixed', 243, 513, 9);
  // The bus park: tired, bright, boom
  const views: [string, CityOpts][] = [
    ['tired: 1 faded danfo, faded paint', { bright: NONE }],
    ['bright: 3 danfos, 4 waiting', { bright: ALL }],
    ['first boom: shelter + 4th danfo', { bright: ALL, boom: true }],
  ];
  views.forEach(([words, opts], k) => {
    const x = 490 + k * 156;
    const y = 360;
    const s = 1.05;
    g.save();
    g.beginPath();
    g.rect(x, y, 150, 300);
    g.clip();
    g.translate(x, y);
    g.scale(s, s);
    g.translate(-BUS_PARK.x + 12, -BUS_PARK.y + 40);
    drawCityGround(g, opts);
    g.restore();
    g.strokeStyle = INK;
    g.strokeRect(x, y, 150, 300);
    label(g, words, x + 75, y + 303, 9);
  });
};

/** The meter in its heading box, as gamedev will lay it out (the words here only show the look). */
function meterBox(g: CanvasRenderingContext2D, x: number, y: number, points: number, mark: number, gap: number, small: boolean): void {
  const S = small ? BOOM_BAR.small : BOOM_BAR.wide;
  const w = small ? 132 : 176;
  const h = small ? 44 : 48;
  g.fillStyle = '#fff8e6';
  g.strokeStyle = INK;
  g.lineWidth = 1.5;
  g.beginPath();
  g.roundRect(x, y, w, h, 8);
  g.fill();
  g.stroke();
  g.fillStyle = INK;
  g.textBaseline = 'middle';
  g.textAlign = 'left';
  g.font = small ? 'bold 15px sans-serif' : 'bold 17px sans-serif';
  g.fillText('Lagos', x + 8, y + 13);
  drawBoomIcon(g, x + (small ? 58 : 66), y + 13 - S.icon / 2, S.icon);
  g.font = `bold ${small ? 11 : 13}px sans-serif`;
  g.fillText('Booming', x + (small ? 75 : 86), y + 13);
  const filled = points - (mark - gap);
  const parts = boomBarParts(filled, gap / 5, small);
  drawBoomBar(g, x + 8, y + h - parts.h - 6, filled, gap / 5, small);
  g.fillText(`${points} of ${mark}`, x + 14 + parts.w, y + h - 6 - S.stepH / 2);
}

const piecesPage: Page = (g, time) => {
  title(g, 'S3d1a: the pieces (x3), proud people (x3), the meter at every step, the first boom, coming-soon pins');
  // Pieces at x3 on a strip of pavement
  g.fillStyle = '#f3ead3';
  g.fillRect(10, 26, 940, 92);
  g.strokeStyle = INK;
  g.strokeRect(10, 26, 940, 92);
  g.save();
  g.translate(10, 26);
  g.scale(3, 3);
  g.fillStyle = '#f0a35e';
  g.fillRect(4, 6, 26, 18);
  drawShutter(g, 7, 13, 20, 9, 'down');
  g.fillStyle = '#f0a35e';
  g.fillRect(34, 6, 26, 18);
  g.fillStyle = '#cfe9f5';
  g.fillRect(37, 13, 20, 9);
  drawShutter(g, 37, 13, 20, 9, 'half');
  g.fillStyle = '#f0a35e';
  g.fillRect(64, 6, 26, 18);
  g.fillStyle = '#cfe9f5';
  g.fillRect(67, 13, 20, 9);
  drawShutter(g, 67, 13, 20, 9, 'up');
  GOODS_KINDS.forEach((k, i) => drawGoods(g, 100 + i * 14, 24, k));
  drawKerbSack(g, 150, 24);
  drawCityTree(g, 170, 26, 9, true);
  drawCityTree(g, 192, 26, 9, false);
  drawCityPalm(g, 212, 28, true);
  drawCityPalm(g, 232, 28, false);
  g.save();
  g.translate(246, 28);
  g.scale(0.6, 0.6);
  drawCityLamp(g, 0, 0, false);
  drawCityLamp(g, 34, 0, true);
  g.restore();
  drawPottedPlant(g, 290, 26);
  drawFoldedUmbrella(g, 300, 28, '#d9a35a');
  g.restore();
  const names = ['shutter down', 'half (opening)', 'rolled up', 'goods: tomatoes, cloth, boxes', 'kerb sack + box', 'tree tired / bright', 'palm tired / bright', 'lamp off / on', 'plant', 'folded'];
  const xs = [61, 151, 241, 370, 460, 545, 665, 785, 880, 912];
  names.forEach((n, i) => label(g, n, xs[i]!, 106, 8));

  // Proud people at x3
  g.fillStyle = '#f3ead3';
  g.fillRect(10, 124, 940, 74);
  g.strokeRect(10, 124, 940, 74);
  g.save();
  g.translate(10, 124);
  g.scale(3, 3);
  PROUD_KINDS.forEach((k, i) => drawProudFolk(g, 12 + i * 23, 19, k, i * 3 + 1));
  drawChildrenWithBall(g, 270, 19, 0);
  drawFruitUmbrella(g, 296, 22, 4);
  g.restore();
  PROUD_KINDS.forEach((k, i) => label(g, k, 10 + (12 + i * 23) * 3, 186, 8));
  label(g, 'park', 820, 186, 8);
  label(g, 'fruit', 898, 186, 8);
  // Washing line
  g.save();
  g.translate(10, 204);
  g.scale(3, 3);
  g.fillStyle = '#e8c49b';
  g.fillRect(0, 0, 60, 16);
  drawWashingLine(g, 6, 50, 9);
  g.restore();
  label(g, 'washing on a roof (x3)', 100, 254, 8);

  // The meter: every step to 20 (4 notches a step), then 24 of 50 (6 a step)
  label(g, 'Meter, wide box (18 x 10 steps) and small box (12 x 8): 0, 4, 9, 16, 20 then 24 of 50', 600, 204, 10);
  const pts: [number, number, number][] = [
    [0, 20, 20],
    [4, 20, 20],
    [9, 20, 20],
    [16, 20, 20],
    [20, 50, 30],
    [24, 50, 30],
  ];
  pts.forEach(([p, mark, gap], i) => {
    const shown = p === 20 && mark === 50 ? 20 : p;
    // 20 exactly: the bar shows the full 20 before the boom card; draw it against the old mark
    const m = p === 20 ? 20 : mark;
    const gp = p === 20 ? 20 : gap;
    meterBox(g, 280 + (i % 3) * 226, 220 + Math.floor(i / 3) * 56, shown, m, gp, false);
    meterBox(g, 280 + (i % 3) * 226, 336 + Math.floor(i / 3) * 52, shown, m, gp, true);
  });
  // Greyscale check: the same bars without colour
  g.save();
  g.filter = 'grayscale(1)';
  for (let i = 0; i < 5; i++) drawBoomBar(g, 30 + i * 120, 448, [0, 4, 9, 16, 20][i]!, 4, false);
  g.restore();
  label(g, 'greyscale: 0, 4, 9, 16, 20 of 20 (fill and ticks still differ)', 320, 466, 9);
  // The icon at 16 and 14, and at x4
  drawBoomIcon(g, 30, 270, 16);
  drawBoomIcon(g, 52, 271, 14);
  drawBoomIcon(g, 80, 262, 64);
  label(g, 'icon 16 / 14 / x4', 90, 330, 9);

  // The first boom: the flats growing
  const b = CITY_BLOCKS.find((q) => q.id === FLATS.block)!;
  [0, 0.5, 1].forEach((k, i) => {
    const x = 10 + i * 200;
    const y = 486;
    const s = 0.62;
    g.save();
    g.beginPath();
    g.rect(x, y, 194, 190);
    g.clip();
    g.translate(x, y);
    g.scale(s, s);
    g.translate(-b.x + 8, -(b.y - 130));
    g.fillStyle = '#eadfc4';
    g.fillRect(b.x - 8, b.y - 130, 320, 330);
    drawCityBlock(g, b, 'fixed', { bright: ALL, boom: true, flats: false });
    drawBoomFlats(g, k);
    g.restore();
    g.strokeStyle = INK;
    g.strokeRect(x, y, 194, 190);
    label(g, `flats growing: ${Math.round(k * 100)}%`, x + 97, y + 193, 9);
  });
  // The long bus shelter at x2
  g.save();
  g.translate(624, 520);
  g.scale(2, 2);
  g.fillStyle = '#6a6a71';
  g.fillRect(-4, -6, 110, 34);
  drawBusShelter(g, 0, 0, 102);
  g.restore();
  label(g, 'the bus shelter of the first boom (x2)', 726, 582, 9);
  // Coming-soon pins next to a problem pin
  const bob = Math.abs(Math.sin(time * Math.PI)) * 2;
  drawProblemPin(g, 660, 690, 'lightsOut', 'problem', 0);
  SOON_IDS.forEach((id, i) => drawComingSoonPin(g, 760 + i * 110, 690, id, bob));
  label(g, 'a problem pin, then the two coming-soon pins', 800, 698, 9);
};

// ---------- The whole city ----------

const cache = new Map<string, HTMLCanvasElement>();

/** The still city for these settings, painted once at `px` pixels a map unit. */
function cityPicture(key: string, looks: SpotLooks, opts: CityOpts, px: number, extra?: (g: CanvasRenderingContext2D) => void): HTMLCanvasElement | null {
  const have = cache.get(key);
  if (have) return have;
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = Math.ceil(CITY_MAP.w * px);
  c.height = Math.ceil(CITY_MAP.h * px);
  const cg = c.getContext('2d');
  if (!cg) return null;
  cg.scale(px, px);
  drawCity(cg, looks, opts);
  extra?.(cg);
  cache.set(key, c);
  return c;
}

/** The d3 path's checks: start, after the New road and Mama Put (8), the boom (20), and the Mast (24). */
const AT8 = ['r0c0', 'r1c0', 'r2c0', 'r1c1', 'r2c2', 'busPark', 'r1c2'];
const AT20 = CITY_AREAS.filter((a) => a !== 'r1c3');
interface Stage {
  key: string;
  words: string;
  looks: SpotLooks;
  opts: CityOpts;
  mamaPut: boolean;
  market: boolean;
  pins: ('potholes' | 'lightsOut' | 'slowInternet')[];
  soon: boolean;
}
const STAGES: Stage[] = [
  { key: 's0', words: '0 points: all tired', looks: PROBLEMS, opts: { bright: NONE, jetty: false }, mamaPut: false, market: false, pins: ['potholes', 'lightsOut', 'slowInternet'], soon: false },
  {
    key: 's8',
    words: '8 points: New road + Mama Put (left side, the middle, the bus park)',
    looks: { potholes: 'fixed', lightsOut: 'problem', slowInternet: 'problem' },
    opts: { bright: AT8, jetty: false },
    mamaPut: true,
    market: false,
    pins: ['lightsOut', 'slowInternet'],
    soon: false,
  },
  {
    key: 's20',
    words: '20 points, the boom: all bright but the Slow internet block',
    looks: { potholes: 'fixed', lightsOut: 'fixed', slowInternet: 'problem' },
    opts: { bright: AT20, boom: true, market: true },
    mamaPut: true,
    market: true,
    pins: ['slowInternet'],
    soon: true,
  },
  { key: 's24', words: '24 points: the Mast too, all 12 bright', looks: FIXED, opts: { bright: ALL, boom: true, market: true }, mamaPut: true, market: true, pins: [], soon: true },
];

function places(st: Stage): (g: CanvasRenderingContext2D) => void {
  return (g) => {
    if (st.mamaPut) drawMamaPut(g, 905, 760, { plate: 0.3, served: 3, queue: 2 });
    if (st.market) drawMarketPlace(g, 1320, 800, { stock: 0.7 });
  };
}

function drawStage(g: CanvasRenderingContext2D, st: Stage, x: number, y: number, w: number, big: boolean): void {
  const s = w / CITY_MAP.w;
  const pic = cityPicture(`${st.key}${big ? 'b' : ''}`, st.looks, st.opts, s * 2, places(st));
  if (pic) g.drawImage(pic, x, y, w, CITY_MAP.h * s);
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.strokeRect(x, y, w, CITY_MAP.h * s);
  for (const id of st.pins) {
    const p = CITY_SPOTS[id].pin;
    drawProblemPin(g, x + p.x * s, y + p.y * s, id, 'problem', 0);
  }
  if (st.soon) for (const id of SOON_IDS) drawComingSoonPin(g, x + SOON_PINS[id].x * s, y + SOON_PINS[id].y * s, id, 0);
}

const farPage: Page = (g) => {
  title(g, 'S3d1a: the whole area at far zoom, d3 path: 0, 8, 20 (boom) and 24 points');
  STAGES.forEach((st, i) => {
    const x = 10 + (i % 2) * 475;
    const y = 26 + Math.floor(i / 2) * 346;
    drawStage(g, st, x, y, 465, false);
    label(g, st.words, x + 232, y + 293, 10);
  });
};

const bigPage =
  (st: Stage, head: string): Page =>
  (g) => {
    title(g, head);
    drawStage(g, st, 10, 28, 940, true);
  };

export const BRIGHT_PAGES: Page[] = [
  rows01,
  rows2,
  piecesPage,
  farPage,
  bigPage(STAGES[0]!, 'S3d1a: Lagos at the start, tired (0 points): warm, faded, proud'),
  bigPage(STAGES[3]!, 'S3d1a: Lagos after the first boom and every fix (24 points)'),
];
