/**
 * K6a: Kano's tax places on the city map (docs/kano.md 6.3; decision 71 and W18), in map units,
 * drawn on top of the still Kano city each frame they move (as Ogun's places.ts):
 *  - the leather stalls: a seller holds up a bag, a buyer walks off with one (one every 8 s);
 *  - the dye pits: a dyer lifts cloth from a pit on a pole, a beater folds it at the log, a buyer
 *    carries it off (one every 12 s). Pits are scenery only; nobody stands at the edge;
 *  - the grain market: an open shed of sacks, a porter loads the truck, it drives off (15 s);
 *  - the groundnut pyramid (after the first boom): sacks go up the stack, a buyer carries one off.
 * People are never painted here: each place calls `who` with a look, a spot and a frame, and the
 * game draws them with the people kit (style 1.8 crisp, at the city scale). No brand, uniform,
 * walking stick or held broom; shades are flat cloth on poles, never umbrellas. Reduced motion:
 * pass `still` (nobody walks off, the cloth holds) and draw only when an amount changes.
 * Imports no value from outside src/worlds/kano/.
 */
import type { FolkFrame, FolkLook } from '../../art/folk';
import { KANO } from './gate';
import { KURMI_CAST, KURMI_TRADER_LOOKS, box, disc } from './kurmi';
import { KOFAR_BEATERS, KOFAR_BUYER, KOFAR_DYERS, KOFAR_MATA_CAST } from './kofarMata';
import { DAWANAU_CAST, DAWANAU_DRIVER, DAWANAU_MEASURERS, DAWANAU_PORTERS } from './dawanau';
import { drawGroundnutPyramid } from './sacks';
import { drawCityDyePit, drawKanoBus, drawKanoShade } from './city';

type G = CanvasRenderingContext2D;

/** Seconds of play for one sale, each place's size, and its cap in kobo (kano.md 6.3). */
export const KANO_PLACE_LOOK = {
  leather: { time: 8, w: 124, h: 56 },
  dye: { time: 12, w: 124, h: 56 },
  grain: { time: 15, w: 150, h: 62 },
  pyramid: { time: 12, w: 110, h: 64 },
} as const;

/** Draws one person with the people kit: feet at (x, y) in map units, facing +x unless `flip`. */
export type KanoWho = (g: G, look: FolkLook, x: number, y: number, frame: FolkFrame, flip?: boolean) => void;

export interface KanoPlaceState {
  time?: number;
  /** Where the current sale is, 0..1 (lift, fold, walk off; the truck's trip). */
  sale?: number;
  /** Sales so far: picks the buyer, so faces change. */
  served?: number;
  /** How full the tables (or the pyramid) are, 0..1. */
  stock?: number;
  /** Tray full: the sellers rest, nobody walks off. */
  full?: boolean;
  /** Going up, 0..1 (poles, shade, then the people). 1 or unset: built. */
  build?: number;
  still?: boolean;
  who?: KanoWho;
}

const k01 = (k: number | undefined, d = 1): number => (k !== undefined && Number.isFinite(k) ? Math.min(Math.max(k, 0), 1) : d);
const walk = (t: number, still: boolean): FolkFrame => (still ? 'stand' : (`walk${Math.floor(t * 6) % 4}` as FolkFrame));

/** Buyers who walk off happy, in turn, from the street casts (every age and dress; never a child alone). */
const BUYERS: readonly FolkLook[] = [KURMI_CAST[4]!, DAWANAU_CAST[9]!, KOFAR_MATA_CAST[15]!, KURMI_CAST[6]!];

interface Ctx {
  g: G;
  t: number;
  sale: number;
  stock: number;
  still: boolean;
  people: boolean;
  buyer: FolkLook;
  who: KanoWho | undefined;
}

/** The common frame: shadow, then the place, then (from build 0.7) its people. */
function place(g: G, x: number, y: number, w: number, st: KanoPlaceState, draw: (c: Ctx) => void): void {
  const build = k01(st.build);
  g.save();
  g.translate(x, y);
  g.lineJoin = 'round';
  g.fillStyle = 'rgba(0,0,0,0.14)';
  g.beginPath();
  g.ellipse(0, 2, w / 2 + 2, 6, 0, 0, Math.PI * 2);
  g.fill();
  g.globalAlpha = Math.min(1, 0.25 + build);
  const n = Math.max(0, Math.round(st.served ?? 0));
  draw({
    g,
    t: Number.isFinite(st.time) ? st.time! : 0,
    sale: st.full ? 0 : k01(st.sale, 0),
    stock: k01(st.stock),
    still: st.still === true,
    people: build >= 1,
    buyer: BUYERS[n % BUYERS.length]!,
    who: st.who,
  });
  g.restore();
}

/** The buyer walking off to the right over sale 0.6..1, carrying `item` at hand height. */
function buyerOff(c: Ctx, x0: number, item: (x: number, y: number) => void): void {
  if (!c.people || c.sale < 0.6) return;
  const p = (c.sale - 0.6) / 0.4;
  const x = x0 + p * 60;
  c.g.globalAlpha = p > 0.8 ? (1 - p) / 0.2 : 1;
  c.who?.(c.g, c.buyer, x, 0, walk(c.t, c.still));
  item(x + 3, -6);
  c.g.globalAlpha = 1;
}

const bag = (g: G, x: number, y: number): void => box(g, x - 2.5, y - 2, 5, 4, '#8a4b2a', 0.6);
const folded = (g: G, x: number, y: number): void => box(g, x - 3, y - 1.6, 6, 3.2, KANO.indigo, 0.6);

/** The leather stalls, front middle at (x, y): two cloth shades, a table of bags and sandals (stock), the seller, a buyer walking off. */
export function drawLeatherStalls(g: G, x: number, y: number, st: KanoPlaceState = {}): void {
  place(g, x, y, KANO_PLACE_LOOK.leather.w, st, (c) => {
    drawKanoShade(g, -60, -30, 56, 22, '#8a4b2a', KANO.cream);
    drawKanoShade(g, 4, -30, 56, 22, KANO.red, KANO.cream);
    box(g, -54, -14, 108, 7, '#a8693f', 1);
    const n = Math.round(c.stock * 10);
    for (let k = 0; k < n; k++) {
      if (k % 2) box(g, -50 + k * 10, -18, 6, 5, ['#6b3a1f', '#c8583a', '#e0a04a'][k % 3]!, 0.6);
      else for (const d of [0, 3]) disc(g, -48 + k * 10 + d, -15, 1.6, '#5b3a22');
    }
    if (c.people) c.who?.(g, KURMI_TRADER_LOOKS.leather, -30, 0, c.sale > 0.3 && c.sale < 0.6 ? 'call' : 'stand');
    if (c.people) c.who?.(g, KURMI_TRADER_LOOKS.sandals, 26, 0, 'stand', true);
    buyerOff(c, 0, (bx, by) => bag(g, bx, by));
  });
}

/** The dye pits, front middle at (x, y): a low earth wall, three pits, a dyer lifting cloth on a pole, a beater folding at the log, a buyer carrying cloth off. */
export function drawDyePits(g: G, x: number, y: number, st: KanoPlaceState = {}): void {
  place(g, x, y, KANO_PLACE_LOOK.dye.w, st, (c) => {
    box(g, -62, -44, 124, 6, '#c8784a', 1);
    for (const px of [-40, -10, 20]) drawCityDyePit(g, px, -26);
    // The dyer by the first pit lifts the cloth (sale 0..0.3), then it drips on its pole
    const lift = c.still ? 0.5 : Math.min(c.sale / 0.3, 1);
    g.strokeStyle = '#6b4a2b';
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(-52, -6);
    g.lineTo(-38, -26 - lift * 10);
    g.stroke();
    box(g, -42, -30 - lift * 10, 8, 4 + lift * 8, KANO.indigo, 0.6);
    // The beating log, a stack of folded cloth (stock) on it
    box(g, 30, -12, 30, 6, '#8a5d36', 1);
    for (let k = 0; k < Math.round(c.stock * 4); k++) folded(g, 52, -14 - k * 3);
    if (c.people) {
      c.who?.(g, KOFAR_DYERS[0], -56, 0, 'stand');
      c.who?.(g, KOFAR_BEATERS[0], 40, 0, 'sit');
      if (c.sale < 0.6) c.who?.(g, KOFAR_BUYER, 8, 2, 'call');
    }
    buyerOff(c, 8, (bx, by) => folded(g, bx, by));
  });
}

/** The grain market, front middle at (x, y): an open zinc shed of sacks (stock), a grain trader, a porter carrying, a truck that loads and drives off over the sale. */
export function drawGrainMarket(g: G, x: number, y: number, st: KanoPlaceState = {}): void {
  place(g, x, y, KANO_PLACE_LOOK.grain.w, st, (c) => {
    for (const px of [-72, -12]) {
      g.strokeStyle = '#6b4a2b';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(px, 0);
      g.lineTo(px, -40);
      g.stroke();
    }
    box(g, -76, -56, 66, 18, '#bcc2c6', 1);
    const n = Math.round(c.stock * 9);
    for (let k = 0; k < n; k++) disc(g, -64 + (k % 3) * 12 + (k > 5 ? 6 : 0), -6 - Math.floor(k / 3) * 7, 4.6, k % 2 ? '#d2a86a' : '#e6cc98', 0.7);
    // The truck at the loading spot: it fills (0..0.6), then drives off (0.6..1)
    const go = c.sale > 0.6 ? (c.sale - 0.6) / 0.4 : 0;
    g.globalAlpha = go > 0.8 ? (1 - go) / 0.2 : 1;
    drawKanoBus(g, 40 + go * 80, -14, 'e', true);
    g.globalAlpha = 1;
    if (c.people) {
      c.who?.(g, DAWANAU_MEASURERS[0], -40, 2, 'stand');
      const carry = c.sale < 0.6 && !c.still ? c.sale / 0.6 : 0.5;
      c.who?.(g, DAWANAU_PORTERS[0], -4 + carry * 20, 2, walk(c.t, c.still || c.sale >= 0.6));
      if (c.sale < 0.6) c.who?.(g, DAWANAU_DRIVER, 66, 2, 'wave0', true);
    }
  });
}

/** The groundnut pyramid, front middle at (x, y): our own stepped stack (stock: how high it is filled), a porter by it, a buyer carrying a sack off. */
export function drawPyramidPlace(g: G, x: number, y: number, st: KanoPlaceState = {}): void {
  place(g, x, y, KANO_PLACE_LOOK.pyramid.w, st, (c) => {
    g.save();
    g.beginPath();
    g.rect(-60, -2 - 40 * (0.2 + 0.8 * c.stock), 120, 46);
    g.clip();
    drawGroundnutPyramid(g, 0, -2, 0.55, true);
    g.restore();
    if (c.people) c.who?.(g, DAWANAU_PORTERS[1], -42, 2, 'stand');
    buyerOff(c, 30, (bx, by) => box(g, bx - 3, by - 2.5, 6, 5, '#e6cc98', 0.6));
  });
}
