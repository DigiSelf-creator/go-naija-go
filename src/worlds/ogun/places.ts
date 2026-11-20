/**
 * Ogun's tax places on the city map (art O6a; docs/ogun.md 6.3, part 7; decision 71 and W18),
 * in map units, drawn on top of the still Ogun city each frame they move, like Lagos's Mama Put
 * and Market (src/art/places.ts):
 *  - the adire market: dyers lift deep blue cloth from the pots, a seller folds, a buyer walks off
 *    with a folded cloth (one every ADIRE_PLACE.clothTime s of play). Our own patterns only.
 *  - the garri mill: grating, sieving, and roasting pans on a low clay hearth with a warm glow and
 *    steam (never flames, OG-R4); sacks pile up; a truck loads and drives off (drawOgunTruck
 *    'lorry' with its load; Lagos's danfoTrip gives the 15 s trip).
 *  - the kola market: traders weigh leaf-lined baskets of kola on a balance; a buyer carries a
 *    basket away on the head. Kola is only traded: never broken, prayed over or read (OG-R1).
 * People of every age and dress, never a real person; no brand, no uniform, no broom. Shades are
 * flat cloth on poles, never umbrellas. Reduced motion: pass `still` (people stand, steam holds,
 * nobody walks off) and draw only when an amount changes.
 */
import { drawFolk, type Folk } from '../../art/places';
import { INK, WHITE } from '../../art/palette';
import { OG, drawAdireCloth, drawClothShade, drawDyePot } from './city';

const TAU = Math.PI * 2;
type G = CanvasRenderingContext2D;

/** Seconds of play for one sale, and each place's size (ogun.md 6.3). */
export const ADIRE_PLACE = { clothTime: 8, w: 124, h: 56 } as const;
export const GARRI_MILL = { truckTime: 15, w: 150, h: 62 } as const;
export const KOLA_PLACE = { basketTime: 12, w: 124, h: 56 } as const;

export interface OgunPlaceState {
  /** Seconds, for steam, the sieve and the scale. */
  time?: number;
  /** Where the current sale is, 0..1 over its time (lift, fold, walk off). */
  sale?: number;
  /** Sales so far: picks the buyer, so faces change. */
  served?: number;
  /** How full the tables are, 0..1. */
  stock?: number;
  /** Tray full: the sellers rest and chat, nobody walks off. */
  full?: boolean;
  /** Going up, 0..1 (poles, shade, tables, then the people). 1 or unset: built. */
  build?: number;
  /** Reduced motion. */
  still?: boolean;
}

const clamp01 = (k: number | undefined): number => (k !== undefined && Number.isFinite(k) ? Math.min(Math.max(k, 0), 1) : 1);
const ease = (k: number): number => k * k * (3 - 2 * k);

function rect(g: G, x: number, y: number, w: number, h: number, fill: string, lw = 0.8): void {
  g.fillStyle = fill;
  g.fillRect(x, y, w, h);
  if (lw > 0) {
    g.strokeStyle = INK;
    g.lineWidth = lw;
    g.strokeRect(x, y, w, h);
  }
}

function oval(g: G, x: number, y: number, rx: number, ry: number, fill: string, lw = 0): void {
  g.fillStyle = fill;
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, TAU);
  g.fill();
  if (lw > 0) {
    g.strokeStyle = INK;
    g.lineWidth = lw;
    g.stroke();
  }
}

function line(g: G, colour: string, w: number, pts: readonly number[]): void {
  g.strokeStyle = colour;
  g.lineWidth = w;
  g.lineCap = 'round';
  g.beginPath();
  for (let i = 0; i + 1 < pts.length; i += 2) {
    if (i === 0) g.moveTo(pts[i]!, pts[i + 1]!);
    else g.lineTo(pts[i]!, pts[i + 1]!);
  }
  g.stroke();
}

/** Steam puffs rising from (x, y): soft white, three puffs; still: one soft puff that holds. */
function steam(g: G, x: number, y: number, t: number, still: boolean): void {
  for (let k = 0; k < (still ? 1 : 3); k++) {
    const p = still ? 0.4 : (t * 0.5 + k / 3) % 1;
    oval(g, x + Math.sin((t + k) * 2) * (still ? 0 : 2), y - p * 22, 3 + p * 4, 2 + p * 3, `rgba(255,255,255,${(0.7 * (1 - p)).toFixed(2)})`);
  }
}

/** The common frame: shadow, poles rising, then the shade dropping in (build 0..0.7). Returns how far the tables and people show (0..1). */
function frame(g: G, w: number, build: number, shade: () => void): number {
  oval(g, 0, 2, w / 2 + 2, 6, 'rgba(0,0,0,0.14)');
  const pole = Math.min(build / 0.4, 1);
  for (const px of [-w / 2 + 4, -w / 6, w / 6, w / 2 - 4]) line(g, '#6b4a2b', 2, [px, 0, px, -38 * pole]);
  if (build >= 0.4) {
    const r = ease(Math.min((build - 0.4) / 0.3, 1));
    g.save();
    g.translate(0, -16 * (1 - r));
    g.globalAlpha = r;
    shade();
    g.restore();
  }
  return build >= 0.7 ? Math.min((build - 0.7) / 0.3, 1) : 0;
}

const DYER: Folk = { skin: '#4b2c1a', top: OG.indigo, bottom: OG.indigo, head: 'gele', headCol: '#1aa39a', robe: true };
const SELLER: Folk = { skin: '#a8693f', top: '#e9e1cf', bottom: OG.indigo, head: 'scarf', headCol: '#e0572b', robe: true };
const BUYERS: readonly Folk[] = [
  { skin: '#d9a172', top: '#13703a', bottom: '#3b3f4a', head: 'short', headCol: '#1b1410' },
  { skin: '#7a4a2a', top: '#d6336c', bottom: '#d6336c', head: 'braids', headCol: '#1b1410', robe: true },
  { skin: '#f1c9a5', top: '#2b59c3', bottom: '#5b3a22', head: 'afro', headCol: '#20140e' },
  { skin: '#4b2c1a', top: '#e9e1cf', bottom: '#e9e1cf', head: 'grey', headCol: '#b9b4ac', robe: true },
];

/** A folded adire cloth, seen from above: a small indigo stack with a pale pattern edge. */
function folded(g: G, x: number, y: number, k: number): void {
  rect(g, x - 4, y - 2.4, 8, 3.2, k % 2 ? OG.indigo : '#3d4f9f', 0.5);
  g.fillStyle = '#e8ecff';
  g.fillRect(x - 3.4, y - 1.4, 6.8, 0.7);
  if (k % 3 === 0) g.fillRect(x - 1, y - 2, 2, 2);
}

/**
 * The adire market, its front middle at (x, y) (where the hero collects): a long flat indigo
 * cloth shade on poles, a cloth line with our own hanging patterns, two dye pots and a dyer lifting
 * cloth out, a table of folded cloth (stock), a seller, and a buyer walking off happy (sale 0.6..1).
 */
export function drawAdireMarket(g: G, x: number, y: number, st: OgunPlaceState = {}): void {
  const build = clamp01(st.build);
  const stock = st.stock === undefined ? 1 : clamp01(st.stock);
  const t = Number.isFinite(st.time) ? st.time! : 0;
  const still = st.still === true;
  const sale = still || st.full ? 0.3 : clamp01(st.sale);
  g.save();
  g.translate(x, y);
  const show = frame(g, ADIRE_PLACE.w, build, () => drawClothShade(g, -62, -36, 124, 14, OG.indigo, '#ffffff'));
  if (show > 0) {
    g.globalAlpha = show;
    // The cloth line behind, then pots, the table and the people
    line(g, '#5d6670', 0.7, [-58, -22, 58, -22]);
    for (let k = 0; k < 8; k++) drawAdireCloth(g, -56 + k * 14, -22, 10, 12, k, false, still ? 0 : Math.sin(t * 1.6 + k) * 0.8);
    drawDyePot(g, -46, -4);
    drawDyePot(g, -28, -2);
    rect(g, -6, -10, 40, 9, '#8a5d36');
    const n = Math.round(stock * 8);
    for (let k = 0; k < n; k++) folded(g, -1 + (k % 4) * 9, -6 - Math.floor(k / 4) * 3.2, k);
    if (build >= 1) {
      // The dyer lifts a dripping cloth from the pot (sale 0..0.4), holds it up, then lowers it
      const lift = sale < 0.4 ? ease(sale / 0.4) : 1 - ease(Math.min((sale - 0.4) / 0.6, 1));
      drawFolk(g, DYER, -37, -2, { happy: true });
      line(g, DYER.skin, 1.4, [-35, -12, -33, -14 - lift * 4]);
      drawAdireCloth(g, -36, -14 - lift * 4, 6, 4 + lift * 8, 0);
      if (!still && lift > 0.2) line(g, 'rgba(31,42,102,0.6)', 0.8, [-33, -2 - lift * 2, -33, 0]);
      drawFolk(g, SELLER, 44, -4, { happy: true });
      if (!still && !st.full) line(g, SELLER.skin, 1.2, [41, -10, 38 + Math.sin(t * 3) * 1.4, -8]);
      // The buyer walks off down and right with the cloth
      const buyer = BUYERS[Math.abs(Math.round(st.served ?? 0)) % BUYERS.length]!;
      const walk = sale > 0.6 ? (sale - 0.6) / 0.4 : 0;
      const bx = 20 + walk * 40;
      const by = 6 + walk * 22;
      g.globalAlpha = show * (walk > 0.85 ? (1 - walk) / 0.15 : 1);
      drawFolk(g, buyer, bx, by, walk > 0 ? { step: walk * 6, happy: true } : { happy: true });
      folded(g, bx, by - 8, 1);
    }
  }
  g.restore();
}

const GRATER: Folk = { skin: '#7a4a2a', top: '#f2b300', bottom: '#3b3f4a', head: 'short', headCol: '#1b1410' };
const SIEVER: Folk = { skin: '#4b2c1a', top: '#13703a', bottom: '#13703a', head: 'scarf', headCol: '#f6e9cc', robe: true };
const ROASTER: Folk = { skin: '#a8693f', top: '#e0572b', bottom: '#e0572b', head: 'gele', headCol: OG.indigo, robe: true };

/** A garri sack: plain woven white with a tied top, no writing. */
function sack(g: G, x: number, y: number): void {
  oval(g, x, y, 5, 3.6, '#efe6cf', 0.7);
  line(g, '#c9b994', 0.7, [x - 3, y - 1, x + 3, y - 1]);
  oval(g, x, y - 3.8, 1.6, 1, '#d8c79f');
}

/**
 * The garri mill, its front middle at (x, y): an open zinc shed on posts; a grater turning a
 * grating wheel, a woman shaking a round sieve, two wide roasting pans on a low clay hearth with
 * a warm glow and steam (never flames), and sacks of fine garri piling up (stock).
 */
export function drawGarriMill(g: G, x: number, y: number, st: OgunPlaceState = {}): void {
  const build = clamp01(st.build);
  const stock = st.stock === undefined ? 1 : clamp01(st.stock);
  const t = Number.isFinite(st.time) ? st.time! : 0;
  const still = st.still === true;
  g.save();
  g.translate(x, y);
  const show = frame(g, GARRI_MILL.w, build, () => {
    rect(g, -75, -58, 150, 18, OG.zinc, 1);
    g.fillStyle = OG.zincDark;
    for (let k = -72; k < 74; k += 6) g.fillRect(k, -57, 1, 16);
    line(g, 'rgba(29,26,20,0.35)', 1, [-75, -49, 75, -49]);
  });
  if (show > 0) {
    g.globalAlpha = show;
    // Grating machine: a box with a wheel
    rect(g, -66, -20, 18, 12, '#7d8a96');
    g.save();
    g.translate(-50, -14);
    g.rotate(still ? 0 : t * 4);
    oval(g, 0, 0, 5, 5, '#c9c2b6', 0.7);
    line(g, INK, 0.8, [-5, 0, 5, 0]);
    g.restore();
    // The clay hearth with two roasting pans, a warm glow under them, steam above
    rect(g, -12, -16, 54, 12, '#9a5a34');
    for (const px of [2, 28]) {
      oval(g, px, -12, 11, 3, 'rgba(255,170,70,0.55)');
      oval(g, px, -16, 11, 4, '#6f6a62', 0.8);
      oval(g, px, -16.5, 8.4, 2.6, '#f3e6c4');
      steam(g, px, -22, t + px, still);
    }
    // Sacks of garri piling up at the right end
    const n = Math.round(stock * 8);
    for (let k = 0; k < n; k++) sack(g, 52 + (k % 4) * 6, -2 - Math.floor(k / 4) * 5);
    if (build >= 1) {
      drawFolk(g, GRATER, -58, -2, { happy: true });
      const shake = still ? 0 : Math.sin(t * 9) * 1.4;
      drawFolk(g, SIEVER, -28, 0, { happy: true });
      oval(g, -28 + shake, -9, 5.4, 2, '#c99b55', 0.6);
      oval(g, -28 + shake, -9, 3.6, 1.2, '#f3e6c4');
      drawFolk(g, ROASTER, 16, 2, { happy: true });
      line(g, '#6b4a2b', 1, [18, -8, 26 + (still ? 0 : Math.sin(t * 2.4) * 2), -15]);
    }
  }
  g.restore();
}

const KOLA_A: Folk = { skin: '#7a4a2a', top: '#e9e1cf', bottom: '#e9e1cf', head: 'short', headCol: '#7fb7e0', robe: true }; // babban riga and cap
const KOLA_B: Folk = { skin: '#4b2c1a', top: '#e0572b', bottom: '#e0572b', head: 'gele', headCol: '#13703a', robe: true }; // iro and buba with a gele

/** A leaf-lined basket of kola, seen from above: green leaves round the rim, red and cream nuts sorted apart. */
export function drawKolaBasketTop(g: G, x: number, y: number, r: number, cream: boolean, fill = 1): void {
  oval(g, x, y, r, r * 0.62, '#c99b55', 0.7);
  oval(g, x, y - 0.5, r * 0.85, r * 0.5, '#3f8f4a');
  const n = Math.round(clamp01(fill) * 5);
  for (let k = 0; k < n; k++) oval(g, x - r * 0.45 + (k % 3) * r * 0.42, y - 0.6 - Math.floor(k / 3) * 1.4, r * 0.2, r * 0.15, cream ? '#efd9b0' : '#b8423a');
}

/**
 * The kola market, its front middle at (x, y): two flat cloth shades, tables of leaf-lined kola
 * baskets (stock), a balance where a basket is weighed (the beam settles), two traders bargaining
 * and laughing, and a buyer carrying a basket away on the head (sale 0.6..1).
 */
export function drawKolaMarket(g: G, x: number, y: number, st: OgunPlaceState = {}): void {
  const build = clamp01(st.build);
  const stock = st.stock === undefined ? 1 : clamp01(st.stock);
  const t = Number.isFinite(st.time) ? st.time! : 0;
  const still = st.still === true;
  const sale = still || st.full ? 0.3 : clamp01(st.sale);
  g.save();
  g.translate(x, y);
  const show = frame(g, KOLA_PLACE.w, build, () => {
    drawClothShade(g, -62, -36, 60, 14, '#e0572b', '#f2c230');
    drawClothShade(g, 2, -36, 60, 14, '#13703a', '#f6e9cc');
  });
  if (show > 0) {
    g.globalAlpha = show;
    rect(g, -56, -16, 46, 9, '#8a5d36');
    rect(g, 10, -16, 46, 9, '#8a5d36');
    for (let k = 0; k < 6; k++) drawKolaBasketTop(g, -48 + (k % 3) * 15 + (k >= 3 ? 66 : 0), -12, 6, k % 2 === 1, stock);
    // The balance: a post, a beam that settles, a basket on one pan and weights on the other
    const tilt = still ? 0 : Math.sin(t * 2) * 0.12 * (1 - Math.min(1, sale * 2));
    line(g, '#5d6670', 1.4, [0, -2, 0, -22]);
    g.save();
    g.translate(0, -22);
    g.rotate(tilt);
    line(g, '#5d6670', 1.2, [-9, 0, 9, 0]);
    line(g, '#5d6670', 0.6, [-9, 0, -9, 6]);
    line(g, '#5d6670', 0.6, [9, 0, 9, 6]);
    drawKolaBasketTop(g, -9, 7, 4, false);
    oval(g, 9, 7, 3, 1.2, '#9aa3ad', 0.6);
    g.restore();
    if (build >= 1) {
      drawFolk(g, KOLA_A, -20, -1, { happy: true, turn: 1 });
      drawFolk(g, KOLA_B, 20, -1, { happy: true, turn: -1 });
      const walk = sale > 0.6 ? (sale - 0.6) / 0.4 : 0;
      const bx = 34 + walk * 40;
      const by = 8 + walk * 20;
      g.globalAlpha = show * (walk > 0.85 ? (1 - walk) / 0.15 : 1);
      const buyer = BUYERS[(Math.abs(Math.round(st.served ?? 0)) + 2) % BUYERS.length]!;
      drawFolk(g, buyer, bx, by, walk > 0 ? { step: walk * 6, happy: true } : { happy: true });
      drawKolaBasketTop(g, bx, by - 18, 4.6, true);
    }
  }
  g.restore();
}

/** The unbuilt look of a place's front (a plain marked plot): pegs and a string, so the build board has room. */
export function drawPlacePlot(g: G, x: number, y: number, w: number): void {
  g.save();
  g.setLineDash([3, 3]);
  g.strokeStyle = WHITE;
  g.lineWidth = 1;
  g.strokeRect(x - w / 2, y - 40, w, 40);
  g.restore();
  for (const [px, py] of [[x - w / 2, y - 40], [x + w / 2, y - 40], [x - w / 2, y], [x + w / 2, y]] as const) line(g, '#8a5d36', 1.6, [px, py, px, py - 4]);
}
