/**
 * The fixed look of a street after its state is switched on (docs/design.md S2.8 "Unlocking",
 * S2.12 picture 10): street lamps lit, shop signs lit, bunting across the street, fresh road
 * paint. Same layout, same play: nothing here is solid, and nothing moves.
 *
 * It is a party for the place, not proof it was broken: the plain street stays bright and
 * proud, and this only adds lights and bunting on top.
 *
 * drawFixedLook draws in SCREEN space, straight after the street's shop row and at the same
 * half camera speed, so the lamps and lit signs sit exactly on the row. drawBackdrop calls it
 * when its `fixed` flag is on; drawRoad(..., fresh = true) gives the new road paint.
 * Each look is one picture painted once at the screen's own pixel size and copied 1:1 every
 * frame (blitLayer), like the rows under it.
 *
 * Bunting colours: amber, purple, sky blue, pink and orange, from our umbrella colours. No green,
 * no white and no red, so no set of flags can read as a party's colours or the national flag,
 * and no flag carries writing or a symbol. No government building, crest, flag or office.
 */
import { asTheme, type StreetTheme } from './backdrop';
import { PARK_LAMPS, PARK_SIGN_BOXES, PARK_TILE_W } from './buspark';
import { MARKET_POSTS, MARKET_SIGN_BOXES, MARKET_TILE_W } from './market';
import { GROUND_Y, SHOP_SIGN_BOXES, SHOP_TILE_W, blitLayer, type PixelLayer, type SignBox } from './street';

const TAU = Math.PI * 2;
/** The rows meet the pavement here (same as every row: street, market, bus park). */
const ROW_BASE = 264;
/** The look's tile reaches this far above the row base (lamp tops and bunting). */
const TILE_UP = 176;
const TILE_DOWN = 4;

/** Bunting flag colours (no green, white or red). */
export const BUNTING_COLOURS = ['#f2b632', '#8e5bb5', '#2b9bc8', '#d9487a', '#e8743b'] as const;
/** Lit lamp and sign colours. */
export const LAMP_LIGHT = { bulb: '#fff4c2', glow: '255,216,110', housing: '#4f5862', pole: '#5d6670' } as const;

interface Look {
  tileW: number;
  /** Tall lamps added by the fixed look: pole x in the tile. */
  lamps: readonly number[];
  /** Lamps already in the row (drawn off): pole x; the fixed look lights their heads. */
  rowLamps: readonly number[];
  /** Bunting runs between these pole tops: [x0, x1, top y]. */
  bunting: readonly (readonly [number, number, number])[];
  signs: readonly SignBox[];
  /** Evening: brighter glow. */
  night: boolean;
}

/** How tall the fixed look's lamps stand above the row base. */
export const FIXED_LAMP_H = 152;

const MORNING_LAMPS = [0, 248, 496, 744];

function chain(xs: readonly number[], tileW: number, top: number): [number, number, number][] {
  // Each lamp to the next, and the last one on to the first lamp of the next copy, so the
  // strings join up across the copies (the first lamp stands at the tile's left edge).
  const out: [number, number, number][] = [];
  for (let i = 0; i + 1 < xs.length; i++) out.push([xs[i]!, xs[i + 1]!, top]);
  out.push([xs[xs.length - 1]!, xs[0]! + tileW, top]);
  return out;
}

const LOOKS: Record<StreetTheme, Look> = {
  morning: { tileW: SHOP_TILE_W, lamps: MORNING_LAMPS, rowLamps: [], bunting: chain(MORNING_LAMPS, SHOP_TILE_W, -FIXED_LAMP_H), signs: SHOP_SIGN_BOXES, night: false },
  market: { tileW: MARKET_TILE_W, lamps: MARKET_POSTS, rowLamps: [], bunting: chain(MARKET_POSTS, MARKET_TILE_W, -FIXED_LAMP_H), signs: MARKET_SIGN_BOXES, night: false },
  // The bus park keeps its own two lamps (now lit) with bunting across the motor park between them.
  evening: { tileW: PARK_TILE_W, lamps: [], rowLamps: PARK_LAMPS, bunting: [[PARK_LAMPS[0]!, PARK_LAMPS[1]!, -118]], signs: PARK_SIGN_BOXES, night: true },
};

/** The tile width of a theme's fixed look (the same as its row). */
export function fixedTileW(theme: string): number {
  return LOOKS[asTheme(theme)].tileW;
}

function glow(g: CanvasRenderingContext2D, x: number, y: number, r: number, a: number): void {
  const grad = g.createRadialGradient(x, y, 0, x, y, r);
  grad.addColorStop(0, `rgba(${LAMP_LIGHT.glow},${a})`);
  grad.addColorStop(1, `rgba(${LAMP_LIGHT.glow},0)`);
  g.fillStyle = grad;
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fill();
}

/** A tall street lamp, lit: pole at x from the row base (y = 0) up, a short arm and a lamp head. */
function tallLamp(g: CanvasRenderingContext2D, x: number, night: boolean): void {
  const top = -FIXED_LAMP_H;
  glow(g, x + 14, top + 9, night ? 40 : 30, night ? 0.6 : 0.42);
  g.fillStyle = LAMP_LIGHT.pole;
  g.fillRect(x - 1.75, top, 3.5, -top);
  g.fillRect(x - 3.5, -6, 7, 6); // foot
  g.fillRect(x - 1.75, top, 15, 3); // arm
  g.fillStyle = LAMP_LIGHT.housing;
  g.beginPath();
  g.roundRect(x + 7, top - 1, 16, 6, 2.5);
  g.fill();
  g.fillStyle = LAMP_LIGHT.bulb;
  g.beginPath();
  g.roundRect(x + 9, top + 5, 12, 3, 1.5);
  g.fill();
  // A small round cap on the pole top, where the bunting ties on
  g.fillStyle = LAMP_LIGHT.pole;
  g.beginPath();
  g.arc(x, top, 3, 0, TAU);
  g.fill();
}

/** Lights the head of a bus park row lamp (drawn off in buspark.ts: head at x + 8..20, y -117..-112). */
function rowLampLit(g: CanvasRenderingContext2D, x: number): void {
  glow(g, x + 14, -108, 40, 0.6);
  g.fillStyle = LAMP_LIGHT.bulb;
  g.beginPath();
  g.roundRect(x + 9, -113, 10, 3, 1.5);
  g.fill();
}

/** A lit sign: a warm glow round the board and a row of small bulbs along its top edge. */
function litSign(g: CanvasRenderingContext2D, b: SignBox, night: boolean): void {
  g.strokeStyle = `rgba(${LAMP_LIGHT.glow},${night ? 0.75 : 0.6})`;
  g.lineWidth = 5;
  g.beginPath();
  g.roundRect(b.x - 2.5, b.y - 2.5, b.w + 5, b.h + 5, 5);
  g.stroke();
  const n = Math.max(2, Math.floor(b.w / 9));
  const step = b.w / n;
  g.fillStyle = LAMP_LIGHT.bulb;
  g.strokeStyle = '#b8862a';
  g.lineWidth = 0.6;
  for (let i = 0; i <= n; i++) {
    g.beginPath();
    g.arc(b.x + i * step, b.y - 3, 1.6, 0, TAU);
    g.fill();
    g.stroke();
  }
}

/** One string of bunting from (x0, y) to (x1, y), sagging 14 u, with small flags. */
function bunting(g: CanvasRenderingContext2D, x0: number, x1: number, y: number, seed: number): void {
  const sag = 14;
  const cx = (x0 + x1) / 2;
  const cy = y + sag * 2; // a quadratic's middle sits halfway to its control point
  g.strokeStyle = '#6b5f4a';
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(x0, y);
  g.quadraticCurveTo(cx, cy, x1, y);
  g.stroke();
  const n = Math.max(2, Math.floor((x1 - x0) / 14));
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const px = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1;
    const py = (1 - t) * (1 - t) * y + 2 * (1 - t) * t * cy + t * t * y;
    g.fillStyle = BUNTING_COLOURS[(i + seed) % BUNTING_COLOURS.length]!;
    g.beginPath();
    g.moveTo(px - 4, py);
    g.lineTo(px + 4, py);
    g.lineTo(px, py + 9);
    g.closePath();
    g.fill();
  }
}

function paintLook(g: CanvasRenderingContext2D, look: Look): void {
  // Drawn with the row base at y = TILE_UP inside the tile.
  g.save();
  g.translate(0, TILE_UP);
  look.signs.forEach((b) => litSign(g, b, look.night));
  look.bunting.forEach(([x0, x1, y], i) => bunting(g, x0, x1, y, i * 2));
  for (const x of look.rowLamps) rowLampLit(g, x);
  for (const x of look.lamps) tallLamp(g, x, look.night);
  g.restore();
}

const slots: Record<StreetTheme, { layer: PixelLayer | null }> = { morning: { layer: null }, market: { layer: null }, evening: { layer: null } };

/**
 * Screen space, straight after the theme's row (drawBackdrop does this when `fixed` is on).
 * Same half camera speed as the rows; no animation (nothing to switch off for reduced motion).
 */
export function drawFixedLook(g: CanvasRenderingContext2D, theme: string, camX: number, viewW: number, groundY = GROUND_Y): void {
  const t = asTheme(theme);
  const look = LOOKS[t];
  const base = ROW_BASE - (GROUND_Y - groundY);
  const par = camX * 0.5;
  const paint = (cg: CanvasRenderingContext2D): void => paintLook(cg, look);
  for (let k = Math.floor(par / look.tileW); k * look.tileW - par < viewW; k++) {
    const x = k * look.tileW - par;
    // A lamp glow and the last string reach a little past the tile's edges: draw from 40 u
    // before it, so neighbouring copies overlap cleanly.
    if (blitLayer(g, slots[t], `fixed-${t}`, x - 40, base - TILE_UP, look.tileW + 80, TILE_UP + TILE_DOWN, (cg) => {
      cg.translate(40, 0);
      paint(cg);
    }, true)) continue;
    g.save();
    g.translate(x, base - TILE_UP);
    paint(g);
    g.restore();
  }
}
