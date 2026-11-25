/**
 * K5a: Borehole Hall and Rusty Borehole (docs/kano.md 5.1 to 5.5 and 7; decision 91).
 *
 * Rusty Borehole is a problem, never a person: an old borehole pump and water tank on four short
 * legs, clogged with Harmattan dust. A round tank for a body, two pressure dials for eyes, a tap
 * for a nose, a crack in his rust for a grumpy mouth, and a long grey water line from his top
 * along under the shade roof. No arms, no clothes, no hat, no title, nothing that points at a
 * ruler, nothing holy, nothing from another game (the water line is a thin grey hung line with
 * hand wheels; no tall green tubes, no blocks with marks).
 *
 * The hall is our own water yard: an earth wall with small raised triangles, a wide woven shade
 * roof on two posts, 8 dry taps on the back wall, a drain channel, stacked water cans, an indigo
 * wash line (it shows the gust), the left door with "BOREHOLE HALL" over it, and the open right
 * doorway with the hazy city beyond (gold haze on far things only, KN-R6).
 *
 * Every still part is painted once and copied (kanoBlit). Rusty, the valves, the cloth and the
 * running water are a few paths a frame. Bosses' outline is the hero's: the larger of 1.6 u and
 * 2 px, hero ink (style 1.8 part 2). With `still` (reduced motion) nothing shakes, spins or
 * floats. Lives in the lazy Kano part and imports no value from outside src/worlds/kano/.
 */
import type { FolkLook } from '../../art/folk';
import type { Tune } from '../../art/tunes';
import type { Recipe } from '../../engine/sound';
import { KANO, KANO_INK as INK } from './gate';
import { kanoStrip, type KanoSlot } from './layer';
import { KANO_WORDS } from './words';

const TAU = Math.PI * 2;
type G = CanvasRenderingContext2D;
const num = (t: number | undefined): number => (t !== undefined && Number.isFinite(t) ? t : 0);
const k01 = (k: number | undefined): number => Math.min(1, Math.max(0, num(k)));

// ---------------------------------------------------------------- numbers

/** The yard (as kano-hall.json): world u, floor y 300. */
export const BH_HALL = {
  w: 560,
  floorY: 300,
  apronY: 360,
  heroMinX: 30,
  heroMaxX: 440,
  wallR: 566,
  /** Rusty Borehole stands from body[0] to body[1]; his middle. */
  body: [450, 540] as readonly [number, number],
  cx: 495,
  /** The valve wheels' middles, their bottom (y) and radius: the hit box is 36 x 36. */
  valves: [140, 250, 360] as readonly number[],
  valveBottom: 70,
  valveR: 18,
  /** The water line's middle (y), the x it runs to on the left, and where it rises from him. */
  lineY: 52,
  lineEnd: 104,
  riseX: 487,
  taps: [156, 192, 228, 264, 300, 336, 372, 408] as readonly number[],
  tapY: 218,
  wallTop: 112,
  posts: [144, 442] as readonly number[],
  washY: 128,
  leftDoor: { x0: 8, x1: 136, top: 190 },
  sign: { x: 12, y: 156, w: 120, h: 24 },
  rightDoor: { x0: 456, x1: 556, top: 132 },
  /** The springy cloth frames under the valves (drawn by K3a's frame art): 80 wide, 30 high. */
  springW: 80,
  springH: 30,
} as const;

/** The yard's colours: earth red, indigo, Harmattan gold, groundnut tan (kano.md 2.5). */
export const BH = {
  skyTop: '#a9cfe0',
  skyLow: '#f4d79c',
  haze: 'rgba(240,204,130,0.5)',
  far: '#c4906c',
  wall: '#c0704a',
  wallLight: '#d98c62',
  wallDark: '#975233',
  roof: '#d8b07a',
  roofDark: '#a8804a',
  post: '#7b5a3a',
  floor: '#d6ab74',
  floorTop: '#e6c592',
  floorDark: '#b98a56',
  apron: '#8f6a45',
  metal: '#98a2ab',
  metalLight: '#c6cdd3',
  metalDark: '#6d7680',
  dust: '#dcc08a',
  water: '#4aa8e6',
  waterLight: '#bfe6ff',
  rust: '#b4602f',
  rustLight: '#d07a45',
  rustDark: '#8a4322',
  blue: '#3f86d6',
  blueLight: '#93c6f2',
  blueDark: '#2c62a6',
  brass: '#dba544',
  wheel: KANO.yellow,
  wheelDark: '#c99a12',
  can: KANO.yellow,
  canDark: '#c99a12',
  cloth: KANO.indigo,
  clothLight: '#5b6fc4',
  eye: '#1f150f',
  dial: '#f7f2e4',
} as const;

/** The only words painted in the hall: its name over the left door and the next valve's tag (STUCK, or WAIT while shut tight). */
export const BH_SIGN = KANO_WORDS.hall.sign;
export const BH_STUCK = KANO_WORDS.hall.stuckTag;
export const BH_WAIT = KANO_WORDS.hall.waitTag;

/**
 * The boss outline (style 1.8 part 2): the larger of `w` u and `px` screen px, in whole device
 * px, for a stroke drawn over its fill. Kano keeps its own copy (KN-R10).
 */
function inkW(g: G, w = 1.6, px = 2): number {
  const m = typeof g.getTransform === 'function' ? g.getTransform() : null;
  const s = m && typeof m.a === 'number' ? Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) : 0;
  if (!(s > 0)) return w;
  const d = typeof devicePixelRatio === 'number' && devicePixelRatio > 0 ? devicePixelRatio : 1;
  return Math.max(1, Math.round(Math.max(w * s, px * Math.min(Math.max(d, 1), 2)))) / s;
}

function disc(g: G, x: number, y: number, r: number, fill: string): void {
  g.fillStyle = fill;
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fill();
}

function shape(g: G, fill: string, lw: number, path: () => void): void {
  g.beginPath();
  path();
  g.fillStyle = fill;
  g.fill();
  if (lw > 0) {
    g.lineWidth = lw;
    g.strokeStyle = INK;
    g.stroke();
  }
}

function box(g: G, x: number, y: number, w: number, h: number, fill: string, lw = 1.2, r = 0): void {
  shape(g, fill, lw, () => (r > 0 ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h)));
}

function line(g: G, col: string, lw: number, pts: readonly number[]): void {
  g.strokeStyle = col;
  g.lineWidth = lw;
  g.beginPath();
  for (let i = 0; i < pts.length; i += 2) {
    if (i) g.lineTo(pts[i]!, pts[i + 1]!);
    else g.moveTo(pts[i]!, pts[i + 1]!);
  }
  g.stroke();
}

/** A white tick on an ink disc (done, never colour alone). */
export function drawTick(g: G, x: number, y: number, r = 5.5): void {
  disc(g, x, y, r, INK);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  line(g, '#ffffff', r * 0.33, [x - r * 0.45, y, x - r * 0.1, y + r * 0.36, x + r * 0.5, y - r * 0.36]);
}

/** Our own yellow jerry can for water, feet at (x, floorY), about 14 u wide and 18 tall. */
export function drawWaterCan(g: G, x: number, floorY: number, col: string = BH.can, s = 1): void {
  g.save();
  g.translate(x, floorY);
  g.scale(s, s);
  g.lineJoin = 'round';
  box(g, -7, -15, 14, 15, col, 1.2, 2.5);
  box(g, -3.5, -19, 7, 4, col, 1, 1.5);
  box(g, 3, -18, 3, 3, BH.canDark, 0.8);
  g.fillStyle = BH.canDark;
  g.fillRect(-5, -11, 10, 1.6);
  g.fillRect(-5, -6, 10, 1.6);
  g.restore();
}

/**
 * A water cart pusher's cart, our own: a wooden bed on two wheels with six cans, handles to the
 * left (he pushes from there). x is the bed's middle. `turn`: the wheels' turn (rad).
 */
export function drawWaterCart(g: G, x: number, floorY: number, turn = 0): void {
  g.save();
  g.translate(x, floorY);
  g.lineCap = 'round';
  line(g, INK, 3.6, [-20, -17, -38, -27]);
  line(g, '#8a6a4a', 2, [-20, -17, -38, -27]);
  for (let i = 0; i < 3; i++) drawWaterCan(g, -12 + i * 12, -19, i % 2 ? '#1aa39a' : BH.can, 0.78);
  for (let i = 0; i < 3; i++) drawWaterCan(g, -6 + i * 12, -19, i === 1 ? BH.can : '#e9b949', 0.78);
  box(g, -22, -20, 44, 5, '#8a6a4a');
  for (const wx of [-12, 12]) {
    disc(g, wx, -9, 9, INK);
    disc(g, wx, -9, 7.4, '#6b4a2b');
    disc(g, wx, -9, 2.2, BH.metalLight);
    const a = num(turn);
    line(g, BH.metalLight, 1.2, [wx + Math.cos(a) * 7, -9 + Math.sin(a) * 7, wx - Math.cos(a) * 7, -9 - Math.sin(a) * 7]);
  }
  g.restore();
}

// ---------------------------------------------------------------- the yard's back (baked)

const TOP = 0;
const backSlot: KanoSlot = { layer: null };

/** A low earth house on the far horizon, gold-hazed later. */
function farRoof(g: G, x: number, base: number, w: number, h: number): void {
  g.beginPath();
  g.rect(x, base - h, w, h);
  g.moveTo(x, base - h);
  g.lineTo(x + 2, base - h - 6);
  g.lineTo(x + 5, base - h);
  g.moveTo(x + w - 5, base - h);
  g.lineTo(x + w - 2, base - h - 6);
  g.lineTo(x + w, base - h);
  g.fill();
}

function paintBack(g: G, x0: number, bottom: number): void {
  const H = BH_HALL;
  const fy = H.floorY;
  const x1 = H.wallR + 40;
  g.save();
  g.translate(-x0, -TOP);
  g.lineJoin = 'round';
  // Sky, far rooftops above the wall and in the right doorway, the gold haze on them only
  const sky = g.createLinearGradient(0, 0, 0, fy);
  sky.addColorStop(0, BH.skyTop);
  sky.addColorStop(1, BH.skyLow);
  g.fillStyle = sky;
  g.fillRect(x0, 0, x1 - x0, fy);
  g.fillStyle = BH.far;
  for (let x = x0 + 6, i = 0; x < x1; x += 46, i++) farRoof(g, x, H.wallTop + 6, 30 + (i % 3) * 8, 12 + ((i * 7) % 4) * 5);
  g.fillStyle = BH.dust;
  g.fillRect(H.rightDoor.x0, 262, H.rightDoor.x1 - H.rightDoor.x0, fy - 262);
  g.fillStyle = BH.far;
  for (const [x, w, h] of [[458, 30, 40], [492, 24, 58], [520, 34, 34]] as const) farRoof(g, x, 264, w, h);
  disc(g, 30, 236, 12, '#8fa85a');
  g.fillStyle = BH.haze;
  g.fillRect(x0, 0, x1 - x0, fy);
  // The earth wall, with the two doorways cut out and small raised triangles along its top
  const d = H.leftDoor;
  const r = H.rightDoor;
  const door = (a: number, b: number, top: number): void => {
    g.moveTo(a, fy);
    g.lineTo(b, fy);
    g.lineTo(b, top + 12);
    g.quadraticCurveTo((a + b) / 2, top - 10, a, top + 12);
    g.closePath();
  };
  g.beginPath();
  g.rect(x0, H.wallTop, x1 - x0, fy - H.wallTop);
  door(d.x0, d.x1, d.top);
  door(r.x0, r.x1, r.top);
  g.fillStyle = BH.wall;
  g.fill('evenodd');
  g.lineWidth = 1.2;
  g.strokeStyle = INK;
  g.stroke();
  g.fillStyle = BH.wall;
  g.beginPath();
  for (let x = x0 + 8; x < x1; x += 18) {
    g.moveTo(x - 4, H.wallTop + 1);
    g.lineTo(x, H.wallTop - 7);
    g.lineTo(x + 4, H.wallTop + 1);
  }
  g.fill();
  g.fillStyle = BH.wallLight;
  g.fillRect(x0, H.wallTop + 2, x1 - x0, 4);
  g.fillStyle = BH.wallDark;
  for (const [a, b] of [[x0, d.x0], [d.x1, r.x0], [r.x1, x1]] as const) g.fillRect(a, fy - 10, b - a, 10);
  // The right doorway's two wooden doors, swung open against the wall
  for (const [x, w] of [[r.x0 - 9, 9], [r.x1, 9]] as const) box(g, x, r.top + 14, w, fy - r.top - 14, '#2f8a6e');
  // BOREHOLE HALL over the left door
  const s = H.sign;
  box(g, s.x, s.y, s.w, s.h, KANO.cream, 1.4, 3);
  g.fillStyle = '#3a2618';
  g.font = 'bold 13px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(BH_SIGN, s.x + s.w / 2, s.y + s.h / 2 + 1, s.w - 8);
  // The tap line along the back wall, its 8 dry taps, the drain channel under them
  box(g, 146, 198, 274, 6, BH.metal, 1);
  for (const tx of H.taps) {
    box(g, tx - 4, 203, 8, 8, BH.brass, 1, 2);
    box(g, tx - 2, 210, 4, H.tapY - 210, BH.brass, 1);
    line(g, INK, 1.6, [tx - 4, 200, tx + 4, 200]);
  }
  box(g, 140, 286, 306, 14, '#bfae94');
  g.fillStyle = '#8f7f68';
  g.fillRect(144, 290, 298, 4);
  // Stacked water cans by the wall
  drawWaterCan(g, 422, 286);
  drawWaterCan(g, 437, 286, '#1aa39a');
  drawWaterCan(g, 430, 268, '#e9b949');
  // The wide woven shade roof on two posts (the wash line runs between them)
  for (const px of H.posts) box(g, px - 3, 24, 6, fy - 24, BH.post);
  box(g, x0, 0, x1 - x0, 22, BH.roof, 1.4);
  g.strokeStyle = BH.roofDark;
  g.beginPath();
  for (let x = x0 + 4; x < x1; x += 9) {
    g.moveTo(x, 3);
    g.lineTo(x - 4, 19);
  }
  g.stroke();
  box(g, x0, 22, x1 - x0, 5, BH.post);
  line(g, INK, 1, [H.posts[0]!, H.washY, (H.posts[0]! + H.posts[1]!) / 2, H.washY + 5, H.posts[1]!, H.washY]);
  // The yard's packed earth floor and its front edge
  g.fillStyle = BH.floor;
  g.fillRect(x0, fy, x1 - x0, H.apronY - fy);
  g.fillStyle = BH.floorTop;
  g.fillRect(x0, fy, x1 - x0, 4);
  g.fillStyle = BH.floorDark;
  for (let x = x0 + 13, i = 0; x < x1; x += 37, i++) g.fillRect(x, 312 + (i % 3) * 13, 6, 2);
  g.fillStyle = BH.apron;
  g.fillRect(x0, H.apronY, x1 - x0, bottom - H.apronY);
  g.restore();
}

/**
 * The back of Borehole Hall, world space (after g.translate(-camX, 0)): sky and haze, the wall,
 * both doors and the sign, the dry taps, the cans, the shade roof and the floor. Painted once.
 */
export function drawBoreholeHall(g: G, viewH = 420): void {
  const bottom = Number.isFinite(viewH) ? Math.max(viewH, BH_HALL.apronY + 1) : 420;
  const x0 = -40;
  kanoStrip(g, backSlot, `bhall|${bottom}`, x0, TOP, BH_HALL.wallR + 80, bottom - TOP, (cg) => paintBack(cg, x0, bottom));
}

const sideSlots: [KanoSlot, KanoSlot] = [{ layer: null }, { layer: null }];

function paintSide(g: G, w: number, bottom: number): void {
  box(g, 0, 0, w, 27, BH.roof, 0);
  g.fillStyle = BH.wallDark;
  g.fillRect(0, 27, w, BH_HALL.floorY - 27);
  g.fillStyle = BH.wall;
  for (let y = 40; y < BH_HALL.floorY; y += 22) g.fillRect(0, y, w, 12);
  g.fillStyle = BH.apron;
  g.fillRect(0, BH_HALL.floorY, w, bottom - BH_HALL.floorY);
}

/** On screens wider than the yard: its thick outer earth walls either side, in front of all. */
export function drawBoreholeHallFront(g: G, camX: number, viewW: number, viewH = 420): void {
  const bottom = Number.isFinite(viewH) ? Math.max(viewH, BH_HALL.apronY + 1) : 420;
  const cx = num(camX);
  const vw = Number.isFinite(viewW) ? viewW : BH_HALL.w;
  const from = Math.min(-40, Math.floor((cx - 8) / 64) * 64);
  const to = Math.max(BH_HALL.wallR + 40, Math.ceil((cx + vw + 8) / 64) * 64);
  const parts: [KanoSlot, number, number][] = [
    [sideSlots[0], from, -40 - from],
    [sideSlots[1], BH_HALL.wallR + 40, to - BH_HALL.wallR - 40],
  ];
  for (const [slot, x, w] of parts) if (w > 0) kanoStrip(g, slot, `bside|${w}|${bottom}`, x, TOP, w, bottom - TOP, (cg) => paintSide(cg, w, bottom));
}

// ---------------------------------------------------------------- the water line and valves

/**
 * The grey water line: up from his top at riseX, then left under the roof to lineEnd. Dry, it
 * shows dust inside; each open valve lets water a little way along (blue round that valve), and
 * the finish wave (0 to 1) fills it from him to the far end, bubbles at its front.
 */
export function drawBoreholeLine(g: G, open = 0, wave = 0, time = 0, still = false): void {
  const H = BH_HALL;
  const y = H.lineY;
  const top = BH_HALL.floorY - 150;
  const lw = inkW(g, 1.2, 1.5);
  g.lineJoin = 'round';
  box(g, H.lineEnd, y - 6, H.riseX + 6 - H.lineEnd, 12, BH.metal, lw);
  box(g, H.riseX - 6, y - 6, 12, top - y + 6, BH.metal, lw);
  for (const sx of [150, 300, 430]) line(g, BH.post, 2, [sx, 27, sx, y - 6]);
  // The inside: dusty, or water
  g.fillStyle = BH.dust;
  g.fillRect(H.lineEnd, y - 2.5, H.riseX - H.lineEnd + 3, 5);
  g.fillRect(H.riseX - 2.5, y, 5, top - y);
  g.fillStyle = BH.water;
  const n = Math.max(0, Math.min(3, Math.floor(num(open))));
  for (let i = 0; i < n; i++) g.fillRect(H.valves[i]! - 46, y - 2.5, 92, 5);
  const w = still && num(wave) > 0 ? 1 : k01(wave);
  if (w > 0) {
    const front = H.riseX - (H.riseX - H.lineEnd) * w;
    g.fillRect(H.riseX - 2.5, y, 5, top - y);
    g.fillRect(front, y - 2.5, H.riseX - front + 3, 5);
    if (w < 1) for (let i = 0; i < 3; i++) disc(g, front + 4 + i * 7, y - 8 - ((num(time) * 30 + i * 5) % 9), 2.2 - i * 0.4, BH.waterLight);
  }
  g.fillStyle = BH.metalLight;
  g.fillRect(H.lineEnd + 2, y - 5, H.riseX - H.lineEnd, 1.6);
  // Joints, and the end where it goes into the wall over the left door
  for (const jx of [196, 306, 420]) box(g, jx - 3, y - 8, 6, 16, BH.metalDark, 1);
  box(g, H.lineEnd - 6, y - 9, 6, 18, BH.metalDark, 1);
}

export type ValveState = 'wait' | 'stuck' | 'open';

/**
 * One round valve wheel on the water line, its middle at x, bottom at BH_HALL.valveBottom. The
 * stuck one shakes, puffs dust and wears the STUCK tag (words and shaking, never colour alone);
 * an open one shows a tick and drips. `freed`: seconds since it spun free (spins, then rests).
 * KN-R14: `tag` on a waiting valve: it is the next one, shut tight, still, with the WAIT tag.
 * `side`: where the tag hangs, right (as drawn by art) or left (K5c: clear of the HUD's Sound and
 * Pause on a short screen; BH_TAG holds its box).
 */
export function drawValve(g: G, x: number, state: ValveState, o: { time?: number; still?: boolean; freed?: number; tag?: boolean; side?: 'left' | 'right' } = {}): void {
  const H = BH_HALL;
  const t = o.still ? 0 : num(o.time);
  const r = H.valveR;
  const cy = H.valveBottom - r;
  const dx = state === 'stuck' && !o.still ? Math.sin(t * 38) * 1.5 : 0;
  const f = o.freed !== undefined && Number.isFinite(o.freed) && o.freed >= 0 ? o.freed : -1;
  const spin = f < 0 || o.still ? 0 : f < 1 ? f * 14 - f * f * 7 : 7;
  const lw = inkW(g);
  g.save();
  g.translate(x + dx, cy);
  g.lineJoin = 'round';
  box(g, -7, -8, 14, 16, BH.metalDark, 1);
  g.rotate(spin);
  g.lineWidth = r * 0.22;
  g.strokeStyle = INK;
  g.lineCap = 'round';
  g.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = (i * TAU) / 4 + 0.4;
    g.moveTo(0, 0);
    g.lineTo(Math.cos(a) * (r - 3), Math.sin(a) * (r - 3));
  }
  g.stroke();
  g.lineWidth = r * 0.12;
  g.strokeStyle = BH.wheelDark;
  g.stroke();
  g.lineWidth = 4.5 + lw;
  g.strokeStyle = INK;
  g.beginPath();
  g.arc(0, 0, r - lw / 2 - 2.25, 0, TAU);
  g.stroke();
  g.lineWidth = 4.5;
  g.strokeStyle = state === 'open' ? BH.wheel : '#e2b93a';
  g.stroke();
  disc(g, 0, 0, 4.5, INK);
  disc(g, 0, 0, 3, BH.metalLight);
  if (state !== 'open')
    for (let i = 0; i < 5; i++) {
      const a = i * 1.3 + 0.2;
      disc(g, Math.cos(a) * (r - 4), Math.sin(a) * (r - 4), 1.3, BH.rustDark);
    }
  g.restore();
  if (state === 'stuck') {
    // Dust puffing off it, and its tag hung on the right
    if (!o.still)
      for (let i = 0; i < 3; i++) {
        const k = (t * 1.6 + i / 3) % 1;
        g.globalAlpha = 0.8 * (1 - k);
        disc(g, x + dx + (i - 1) * 12, cy - r - k * 14, 3 + k * 4, BH.dust);
      }
    g.globalAlpha = 1;
    hangTag(g, x, cy, true, o.side === 'left' ? -1 : 1);
  } else if (state === 'wait' && o.tag) {
    // Shut tight (KN-R14): still, no dust, the WAIT tag
    hangTag(g, x, cy, false, o.side === 'left' ? -1 : 1);
  } else if (state === 'open') {
    drawTick(g, x + r - 2, cy - r + 2);
    const k = o.still ? 0.4 : (t * 1.4 + x * 0.01) % 1;
    disc(g, x - 2, H.valveBottom + 3 + k * 40, 2.4, BH.water);
  }
}

/** A valve's tag box (world u, from the valve's middle x and its bottom y), hung right; a left one is its mirror. */
export const BH_TAG = { dx0: 21, dx1: 67, dy0: -BH_HALL.valveR - 10, dy1: -BH_HALL.valveR + 7 } as const;

/** The STUCK or WAIT tag on a string from the wheel's hub, hung right (s 1) or left (s -1). */
function hangTag(g: G, x: number, cy: number, stuck: boolean, s: 1 | -1): void {
  const T = BH_TAG;
  line(g, INK, 1, [x + 7 * s, cy - 4, x + 22 * s, cy - 2]);
  const bx = s > 0 ? x + T.dx0 : x - T.dx1;
  box(g, bx, cy - 10, T.dx1 - T.dx0, 17, KANO.cream, 1.4, 3);
  g.fillStyle = '#3a2618';
  g.font = 'bold 11px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const mid = bx + (T.dx1 - T.dx0) / 2;
  if (stuck) g.fillText(BH_STUCK, mid, cy - 1, 42);
  else g.fillText(BH_WAIT, mid, cy - 1, 42);
}

/**
 * K5c: on a short screen the hall is drawn a little smaller (boreholeHallSkin's fit), so some sky
 * shows above y 0: the woven shade roof carries on up to `top` (world u, below 0), x0 to x1.
 */
export function drawBoreholeRoofAbove(g: G, x0: number, x1: number, top: number): void {
  if (!(top < 0) || !(x1 > x0)) return;
  g.fillStyle = BH.roof;
  g.fillRect(x0, top, x1 - x0, -top + 1);
  g.strokeStyle = BH.roofDark;
  g.lineWidth = 1;
  g.beginPath();
  const a = Math.floor(x0 / 9) * 9 + 4;
  for (let y = 0; y > top; y -= 20)
    for (let x = a; x < x1 + 9; x += 9) {
      g.moveTo(x, y - 17);
      g.lineTo(x - 4, y - 1);
    }
  g.stroke();
}

/**
 * KN-R14: the puff of dust that runs along the water line from his top to the valve as his first
 * whirl of the phase shakes it loose; k 0 to 1 over its run (nothing outside that).
 */
export function drawPipeDust(g: G, toX: number, k: number): void {
  if (!(k >= 0 && k <= 1)) return;
  const H = BH_HALL;
  const x = H.riseX - (H.riseX - num(toX)) * k;
  const fade = k < 0.8 ? 1 : (1 - k) / 0.2;
  g.globalAlpha = 0.85 * fade;
  for (let i = 0; i < 3; i++) disc(g, x + i * 6, H.lineY - 9 - i * 2 - k * 3, 4.5 - i, BH.dust);
  g.globalAlpha = 1;
}

/** The hit counter: three small wheels at the top; each open one is full with a tick. */
export function drawValveCounter(g: G, x: number, y: number, open: number): void {
  for (let i = 0; i < 3; i++) {
    const cx = x + (i - 1) * 24;
    const done = i < open;
    g.globalAlpha = done ? 1 : 0.45;
    disc(g, cx, y + 9, 9, INK);
    disc(g, cx, y + 9, 7, BH.wheel);
    disc(g, cx, y + 9, 3.5, INK);
    g.globalAlpha = 1;
    if (done) drawTick(g, cx + 7, y + 3);
  }
}

// ---------------------------------------------------------------- the wash line and the taps

/**
 * The indigo wash line between the posts: five cloths of our own simple stripes. Calm, they hang
 * and sway a little; in the gust (k 0 to 1) they stream left toward the hero and flutter.
 */
export function drawWashLine(g: G, gust = 0, time = 0, still = false): void {
  const H = BH_HALL;
  const k = k01(gust);
  const t = still ? 0 : num(time);
  const a = H.posts[0]!;
  const b = H.posts[1]!;
  g.lineJoin = 'round';
  for (let i = 0; i < 5; i++) {
    const x = a + 30 + i * 62;
    const y = H.washY + 4 * Math.sin((Math.PI * (x - a)) / (b - a));
    const sway = still ? 0 : Math.sin(t * 2 + i) * 1.5;
    const fl = still ? 0 : Math.sin(t * 16 + i * 2) * 4 * k;
    const lx = -30 * k + sway;
    const ly = 26 - 9 * k;
    const w = 26;
    shape(g, i % 2 ? BH.clothLight : BH.cloth, 1.1, () => {
      g.moveTo(x - w / 2, y);
      g.lineTo(x + w / 2, y);
      g.lineTo(x + w / 2 + lx, y + ly + fl);
      g.lineTo(x - w / 2 + lx, y + ly - fl);
      g.closePath();
    });
    g.fillStyle = i % 2 ? KANO.cream : BH.clothLight;
    for (const s of [0.35, 0.7]) {
      g.beginPath();
      g.moveTo(x - w / 2 + lx * s, y + ly * s - 1.5);
      g.lineTo(x + w / 2 + lx * s, y + ly * s - 1.5);
      g.lineTo(x + w / 2 + lx * s, y + ly * s + 1.5);
      g.lineTo(x - w / 2 + lx * s, y + ly * s + 1.5);
      g.fill();
    }
    box(g, x - w / 2 + 2, y - 3, 3, 5, '#8a6a4a', 0.8);
    box(g, x + w / 2 - 5, y - 3, 3, 5, '#8a6a4a', 0.8);
  }
}

/** The taps running at the finish: `ages` s since each started (below 0: dry). A splash at the start. */
export function drawTapWater(g: G, ages: readonly number[], time = 0, still = false): void {
  const H = BH_HALL;
  const t = still ? 0 : num(time);
  H.taps.forEach((x, i) => {
    const age = ages[i] ?? -1;
    if (!(age >= 0)) return;
    const fall = still ? 1 : Math.min(1, age / 0.2);
    const yb = H.tapY + (288 - H.tapY) * fall;
    g.fillStyle = BH.water;
    g.fillRect(x - 2, H.tapY, 4, yb - H.tapY);
    g.fillStyle = BH.waterLight;
    g.fillRect(x - 0.6, H.tapY + ((t * 90) % 30), 1.2, 10);
    if (fall >= 1) {
      g.fillStyle = BH.water;
      g.beginPath();
      g.ellipse(x, 289, 8, 2.5, 0, 0, TAU);
      g.fill();
      const s = still ? 0 : k01(age / 0.6);
      if (s < 1)
        for (const d of [-1, 1]) {
          g.globalAlpha = 1 - s;
          disc(g, x + d * (4 + s * 10), 286 - Math.sin(s * Math.PI) * 12, 2.2, BH.water);
          g.globalAlpha = 1;
        }
    }
  });
}

// ---------------------------------------------------------------- Rusty Borehole

export type RustyMood = 'grumpy' | 'wheeze' | 'puff' | 'blow' | 'hiccup' | 'gargle' | 'sneeze' | 'clean';

export interface RustyLook {
  mood?: RustyMood | undefined;
  /** How far into the mood, 0 to 1: the wheeze (0.5 s), the gust warning puff (0.6 s), the hiccup, the sneeze swell. */
  k?: number | undefined;
  /** Rust flakes fallen so far (one per hit), showing clean blue under them. */
  flakes?: number | undefined;
  /** At the finish: the rest of his rust falling like confetti, 0 to 1 (then he is clean). */
  fall?: number | undefined;
  /** Seconds the little fountain on his top has run (below 0: none). */
  fountain?: number | undefined;
  time?: number | undefined;
  still?: boolean | undefined;
}

/** Where his three rust flakes come off (tank units, from his bottom middle). */
const FLAKES: readonly (readonly [number, number])[] = [[-24, -22], [26, -60], [-28, -66]];

function blob(g: G, x: number, y: number, s: number): void {
  g.moveTo(x - 7 * s, y);
  g.quadraticCurveTo(x - 6 * s, y - 6 * s, x, y - 5 * s);
  g.quadraticCurveTo(x + 8 * s, y - 6 * s, x + 7 * s, y + 1 * s);
  g.quadraticCurveTo(x + 5 * s, y + 6 * s, x - 1 * s, y + 5 * s);
  g.quadraticCurveTo(x - 7 * s, y + 5 * s, x - 7 * s, y);
}

function dial(g: G, x: number, y: number, lw: number, shut: 0 | 1 | 2, spin: number, up: number): void {
  const r = 13;
  disc(g, x, y, r + 1.5 + lw / 2, INK);
  disc(g, x, y, r + 1.5, BH.metalLight);
  disc(g, x, y, r - 1.5, BH.dial);
  g.lineCap = 'round';
  if (shut) {
    // 1: squeezed tight for the sneeze; 2: happy closed curves (the hum)
    g.strokeStyle = BH.eye;
    g.lineWidth = 2.4;
    g.beginPath();
    if (shut === 1) {
      const s = x < 0 ? 1 : -1;
      g.moveTo(x - 6 * s, y - 5);
      g.lineTo(x + 5 * s, y);
      g.lineTo(x - 6 * s, y + 5);
    } else g.arc(x, y + 3, 6, Math.PI * 1.15, Math.PI * 1.85);
    g.stroke();
    return;
  }
  for (let i = 0; i < 5; i++) disc(g, x + Math.cos(2.6 + i * 0.75) * (r - 4), y + Math.sin(2.6 + i * 0.75) * (r - 4), 1, BH.metalDark);
  line(g, '#c8583a', 1.4, [x, y, x + Math.cos(spin) * (r - 4), y + Math.sin(spin) * (r - 4)]);
  g.fillStyle = BH.eye;
  g.beginPath();
  g.ellipse(x - 2, y - up, 4.4, 5.4, 0, 0, TAU);
  g.fill();
  disc(g, x - 3.6, y - up - 2.2, 1.4, '#ffffff');
}

/**
 * Rusty Borehole, his bottom middle at (cx, floorY): legs, the tank and its face, the pump head
 * on top. Grumpy and dusty; he wheezes (dials spin, tank puffs, dust from his tap), puffs before a
 * gust, blows, hiccups, gargles, sneezes and ends clean and shiny blue with a fountain on top.
 */
export function drawRustyBorehole(g: G, cx: number = BH_HALL.cx, floorY: number = BH_HALL.floorY, o: RustyLook = {}): void {
  const mood = o.mood ?? 'grumpy';
  const still = o.still === true;
  const t = still ? 0 : num(o.time);
  const k = still ? (mood === 'sneeze' ? 1 : 0.5) : k01(o.k);
  const fall = k01(o.fall);
  const clean = mood === 'clean' || fall >= 1;
  const flakes = clean ? 3 : Math.max(0, Math.min(3, Math.floor(num(o.flakes))));
  const lw = inkW(g);
  let sx = 1;
  let dy = 0;
  if (mood === 'wheeze' || mood === 'puff') sx = 1 + 0.07 * k;
  else if (mood === 'sneeze') sx = 1 + 0.1 * Math.min(1, k * 1.6);
  else if (mood === 'hiccup') dy = -6 * Math.sin(Math.PI * k);
  g.save();
  g.translate(cx, floorY);
  g.lineJoin = 'round';
  g.lineCap = 'round';
  // Four short legs with flat feet
  for (const lx of [-33, -12, 12, 33]) {
    box(g, lx - 4, -16, 8, 14, BH.metalDark, lw);
    box(g, lx - 7, -4, 14, 4, BH.metalDark, lw, 2);
  }
  g.translate(0, -14 + dy);
  g.scale(sx, 1 + (sx - 1) * 0.4);
  const base = clean ? BH.blue : BH.rust;
  const light = clean ? BH.blueLight : BH.rustLight;
  const dark = clean ? BH.blueDark : BH.rustDark;
  // The pump head on top and its little fountain nozzle
  box(g, -11, -130, 22, 16, BH.metal, lw);
  box(g, -16, -136, 32, 8, BH.metalDark, lw, 3);
  box(g, 5, -142, 6, 7, BH.metal, lw * 0.6);
  // The tank
  shape(g, base, 0, () => g.roundRect(-42, -118, 84, 118, 24));
  g.fillStyle = dark;
  g.beginPath();
  g.roundRect(16, -112, 22, 106, 12);
  g.fill();
  g.fillStyle = light;
  g.beginPath();
  g.roundRect(-36, -106, 7, 84, 4);
  g.fill();
  if (!clean) {
    g.fillStyle = BH.blue;
    g.beginPath();
    for (let i = 0; i < flakes; i++) blob(g, FLAKES[i]![0], FLAKES[i]![1], 1);
    g.fill();
    g.fillStyle = BH.rustDark;
    for (const [fx, fy] of [[-14, -14], [6, -26], [-30, -40], [22, -92], [-6, -112], [30, -18]] as const) disc(g, fx, fy, 1.8, BH.rustDark);
  } else {
    g.strokeStyle = '#ffffff';
    g.lineWidth = 1.6;
    const tw = still ? 1 : 0.6 + 0.4 * Math.sin(t * 5);
    for (const [px, py, s] of [[-24, -96, 5 * tw], [28, -30, 4]] as const) line(g, '#ffffff', 1.6, [px - s, py, px + s, py, px, py, px, py - s, px, py + s]);
  }
  for (const by of [-104, -12]) {
    g.fillStyle = dark;
    g.fillRect(-41, by, 82, 4);
  }
  g.lineWidth = lw;
  g.strokeStyle = INK;
  g.beginPath();
  g.roundRect(-42, -118, 84, 118, 24);
  g.stroke();
  // The face: brows, dials, the tap nose, the mouth
  const happy = clean || mood === 'gargle';
  g.strokeStyle = clean ? BH.blueDark : '#5a2a14';
  g.lineWidth = 3.2;
  g.beginPath();
  if (happy) {
    g.moveTo(-28, -101);
    g.quadraticCurveTo(-19, -108, -10, -102);
    g.moveTo(10, -102);
    g.quadraticCurveTo(19, -108, 28, -101);
  } else {
    g.moveTo(-29, -104);
    g.lineTo(-9, -98);
    g.moveTo(9, -98);
    g.lineTo(29, -104);
  }
  g.stroke();
  const spin = mood === 'wheeze' || mood === 'gargle' ? t * 18 : -0.6;
  const shut: 0 | 1 | 2 = mood === 'sneeze' ? 1 : mood === 'clean' ? 2 : 0;
  dial(g, -19, -82, lw, shut, spin, happy ? 1.5 : 0);
  dial(g, 19, -82, lw, shut, spin + 1.2, happy ? 1.5 : 0);
  // The tap nose, its spout toward the hero
  box(g, -6, -68, 12, 9, BH.brass, lw * 0.6, 3);
  box(g, -2, -74, 4, 6, BH.brass, lw * 0.6);
  line(g, INK, 3, [-6, -71, 6, -76]);
  shape(g, BH.brass, lw * 0.6, () => {
    g.moveTo(-6, -64);
    g.lineTo(-15, -60);
    g.lineTo(-15, -55);
    g.lineTo(-10, -55);
    g.lineTo(-6, -59);
    g.closePath();
  });
  // Mouths
  const mouth = '#3a1d12';
  if (mood === 'grumpy' || mood === 'wheeze') {
    line(g, INK, 2.6, [-22, -32, -14, -38, -7, -34, 0, -40, 7, -34, 14, -38, 22, -32]);
  } else if (mood === 'puff') {
    for (const s of [-1, 1]) shape(g, light, lw * 0.6, () => g.arc(s * 15, -36, 5 + 5 * k, 0, TAU));
    disc(g, 0, -36, 3, mouth);
  } else if (mood === 'blow' || mood === 'hiccup') {
    shape(g, mouth, lw * 0.6, () => g.ellipse(0, -36, mood === 'blow' ? 8 : 5, mood === 'blow' ? 9 : 5, 0, 0, TAU));
  } else if (mood === 'gargle') {
    line(g, INK, 2.4, [-18, -36, -12, -40, -6, -35, 0, -40, 6, -35, 12, -40, 18, -36]);
    for (let i = 0; i < 3; i++) disc(g, -10 + i * 10, -46 - ((t * 40 + i * 6) % 14), 2.6, BH.waterLight);
  } else if (mood === 'sneeze') {
    const w = k < 0.6 ? 6 + k * 10 : 14;
    shape(g, mouth, lw * 0.6, () => g.ellipse(0, -36, w, k < 0.6 ? 5 + k * 6 : 9, 0, 0, TAU));
  } else {
    shape(g, mouth, lw * 0.6, () => {
      g.moveTo(-17, -40);
      g.quadraticCurveTo(0, -20, 17, -40);
      g.closePath();
    });
    shape(g, '#e0786a', 0, () => g.ellipse(0, -31, 6, 3, 0, 0, TAU));
  }
  g.restore();
  // Dust from his tap while he wheezes; gust lines while he blows (screen side, toward the hero)
  const nx = cx - 15 * sx;
  const ny = floorY - 14 + dy - 56;
  if (mood === 'wheeze' && !still)
    for (let i = 0; i < 3; i++) {
      const q = (k + i / 3) % 1;
      g.globalAlpha = 0.85 * (1 - q);
      disc(g, nx - 4 - q * 6, ny - q * 22, 2.5 + q * 4, BH.dust);
    }
  g.globalAlpha = 1;
  if (mood === 'blow')
    for (let i = 0; i < 3; i++) {
      const o2 = still ? 0 : (t * 60 + i * 14) % 42;
      line(g, '#fff3d6', 2.4, [cx - 50 - o2, floorY - 52 + (i - 1) * 9, cx - 64 - o2, floorY - 54 + (i - 1) * 11]);
    }
  // The finish: the rest of the rust falls like confetti, and the fountain
  if (fall > 0 && fall < 1 && !still)
    for (let i = 0; i < 14; i++) {
      const px = cx + (((i * 37) % 80) - 40) + Math.sin(fall * 6 + i) * 6;
      const py = floorY - 120 + ((i * 53) % 100) + fall * 90;
      g.fillStyle = i % 3 ? BH.rust : BH.rustLight;
      g.fillRect(px, Math.min(py, floorY - 3), 4, 3);
    }
  const fo = o.fountain;
  if (fo !== undefined && Number.isFinite(fo) && fo >= 0) {
    const h = still ? 26 : Math.min(26, fo * 60) + Math.sin(t * 9) * 2;
    const fx = cx + 8;
    const fy = floorY - 14 - 142;
    g.fillStyle = BH.water;
    g.fillRect(fx - 2, fy - h, 4, h);
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
      const q = still ? i / 3 : (t * 1.5 + i / 3) % 1;
      disc(g, fx + s * q * 14, fy - h + q * q * 22 - q * 6, 2.2, i % 2 ? BH.waterLight : BH.water);
    }
  }
}

/** The big sneeze's puff of dust, out of his top and away through the roof into the sky (k 0 to 1). */
export function drawSneezePuff(g: G, k: number, cx: number = BH_HALL.cx, floorY: number = BH_HALL.floorY): void {
  const q = k01(k);
  if (q <= 0 || q >= 1) return;
  const y = floorY - 160 - q * 260;
  g.globalAlpha = 1 - q * q;
  for (const [dx, dy, r] of [[0, 0, 16], [-16, 6, 11], [16, 5, 12], [-6, -12, 12], [9, -10, 10]] as const) {
    const s = 0.6 + q * 0.9;
    disc(g, cx + dx * s, y + dy * s, r * s, BH.dust);
  }
  g.globalAlpha = 1;
}

/** One of Rusty's sound words ("hic!", "glug glug glug", "A... a... ACHOO!", "mm-hmm!") in a cream bubble, tail down-right. */
export function drawRustyWord(g: G, text: string, x: number, y: number): void {
  const w = text.length * 6.6 + 14;
  box(g, x - w / 2, y - 11, w, 20, KANO.cream, 1.4, 9);
  shape(g, KANO.cream, 0, () => {
    g.moveTo(x + w / 2 - 22, y + 8);
    g.lineTo(x + w / 2 - 8, y + 18);
    g.lineTo(x + w / 2 - 12, y + 8);
  });
  line(g, INK, 1.4, [x + w / 2 - 22, y + 9, x + w / 2 - 8, y + 18, x + w / 2 - 12, y + 9]);
  g.fillStyle = '#3a2618';
  g.font = 'bold 12px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, x, y, w - 8);
}

// ---------------------------------------------------------------- the funny, kind finish (5.5)

/** The finish times, s from the third valve (kano-hall.json boss.finish). */
export const RUSTY_FINISH = { glugTo: 1.2, sneeze: 1.2, achoo: 1.5, shine: 1.8, fallFor: 0.8, tapsFrom: 2.4, tapsTo: 3.6, toast: 4.0, win: 6.0 } as const;

export type RustyWord = keyof typeof KANO_WORDS.hall.rusty;

export interface RustyFinish {
  rusty: RustyLook;
  /** The water line's wave, 0 to 1. */
  wave: number;
  /** The sneeze puff, 0 to 1 (0 none). */
  puff: number;
  /** Seconds each of the 8 taps has run (below 0: dry). */
  taps: number[];
  /** His word now, if any. */
  say: RustyWord | null;
  /** The door people come in and cheer. */
  cheer: boolean;
}

/** When each of the 8 taps starts, one by one from tapsFrom to tapsTo. */
export function rustyTapTimes(): number[] {
  const F = RUSTY_FINISH;
  return BH_HALL.taps.map((_, i) => F.tapsFrom + ((F.tapsTo - F.tapsFrom) * i) / (BH_HALL.taps.length - 1));
}

/** The finish at t s after the third valve. still: no motion, each step simply shows. */
export function rustyFinishAt(t: number, still = false): RustyFinish {
  const F = RUSTY_FINISH;
  const s = num(t);
  const taps = rustyTapTimes().map((a) => (s >= a ? (still ? 9 : s - a) : -1));
  let rusty: RustyLook;
  let say: RustyWord | null = null;
  if (s < F.glugTo) {
    rusty = { mood: 'gargle', flakes: 3 };
    say = 'gargle';
  } else if (s < F.shine) {
    rusty = { mood: 'sneeze', k: (s - F.sneeze) / (F.shine - F.sneeze), flakes: 3 };
    say = 'sneeze';
  } else {
    const fall = still ? 1 : (s - F.shine) / F.fallFor;
    rusty = { mood: 'clean', fall, fountain: s - F.shine };
    if (s < F.tapsTo) say = 'hum';
  }
  const puff = still || s < F.achoo ? 0 : (s - F.achoo) / 2;
  return { rusty: { ...rusty, still }, wave: still ? 1 : k01(s / F.glugTo), puff, taps, say, cheer: s >= F.toast };
}

// ---------------------------------------------------------------- the door people (part 7)

/**
 * The three who wait at the left door (style 1.8, drawn by the people kit): a woman with a water
 * can, a water cart pusher with his cart of cans, and an elder (standing tall, no stick). On each
 * glug they cheer ("Yauwa!", then "Well done!"); at the finish they come in to the running taps,
 * the cart pusher first (his work gets easier; nobody is put out of work).
 */
export const BH_DOOR_PEOPLE: readonly FolkLook[] = [
  { skin: 1, age: 'adult', sex: 'f', body: 'medium', hair: 'braids', head: 'headscarf', dress: 'wrapperBlouse', a: '#1aa39a', b: '#f2b300', h: '#f2b300' },
  { skin: 5, age: 'adult', sex: 'm', body: 'slim', hair: 'lowcut', head: 'kaftanCap', dress: 'kaftan', a: '#d8b384', b: '#6b4a2b', h: '#2b59c3' },
  { skin: 6, age: 'elder', sex: 'f', body: 'medium', hair: 'grey', head: 'headscarf', dress: 'wrapperBlouse', a: '#7d3c98', b: '#f4ead2', h: '#f4ead2', glasses: true },
];
/** Where they stand in the left door (feet at floorY - 4): the woman, the cart pusher, the elder. */
export const BH_DOOR_SPOTS: readonly number[] = [82, 14, 98];
/** The woman's can stands at her feet here; the cart's middle stands here, in front of its pusher. */
export const BH_CAN_X = 72;
export const BH_CART_X = 46;
export const BH_DOOR_SCALE = 0.9;
/** At the finish they walk to these taps (x) and fill up: the cart pusher first, at the tap nearest the door. */
export const BH_CHEER_SPOTS: readonly number[] = [222, 150, 294];
/** At the finish the cart stands this far right of its pusher, under the first tap's water. */
export const BH_CART_AHEAD = 34;
export const BH_DOOR_CHEERS = KANO_WORDS.folk.doorCheers;

// ---------------------------------------------------------------- sounds

/** Borehole Hall's sounds (code-made, our own; no voice). Gamedev adds them with the part's `sounds`. */
export type RustySoundName = 'valveClonk' | 'valveSqueak' | 'valveGlug' | 'rustyWheeze' | 'rustyCough' | 'rustyGust' | 'rustyHic' | 'rustyGargle' | 'rustySneeze' | 'rustyHum' | 'tapSplash';
export const RUSTY_SOUNDS: Readonly<Record<RustySoundName, Recipe>> = {
  /** KN-R14: a head bump on a valve shut tight: one small, soft, dull metal "clonk"; 0.12 s. */
  valveClonk: { tones: [{ f: 330, len: 0.07, wave: 'triangle', to: 240, vol: 0.04 }, { f: 165, len: 0.1, wave: 'sine', to: 130, vol: 0.03 }], hiss: [{ len: 0.02, lp: 900, vol: 0.02 }] },
  /** The valve spinning free: a rising rusty squeak; 0.25 s. */
  valveSqueak: { tones: [{ f: 900, len: 0.22, wave: 'triangle', peak: 1400, to: 1250, vol: 0.035, vib: { hz: 30, depth: 0.03 } }] },
  /** Water getting through: three round glugs falling a little; 0.4 s. */
  valveGlug: { tones: [0, 1, 2].map((i) => ({ f: 240 - i * 25, len: 0.09, wave: 'sine' as const, peak: 320 - i * 25, to: 180 - i * 20, at: i * 0.13, vol: 0.06 })) },
  /** The wheeze before a cough: a thin airy rising hiss; 0.5 s. */
  rustyWheeze: { tones: [{ f: 420, len: 0.45, wave: 'sine', to: 560, vol: 0.01 }], hiss: [{ len: 0.5, bp: 1900, vol: 0.03 }] },
  /** A dry dusty cough as a whirl rolls out: two short puffs; 0.3 s. */
  rustyCough: { tones: [{ f: 150, len: 0.06, wave: 'triangle', to: 110, vol: 0.05 }], hiss: [{ len: 0.08, lp: 1400, vol: 0.05 }, { len: 0.08, at: 0.16, lp: 1200, vol: 0.04 }] },
  /** The Harmattan gust: a long soft whoosh; 1.2 s. */
  rustyGust: { tones: [{ f: 120, len: 1.2, wave: 'sine', peak: 170, to: 110, vol: 0.012 }], hiss: [{ len: 1.2, lp: 1000, vol: 0.04 }] },
  /** "hic!": one quick hollow blip up; 0.12 s. */
  rustyHic: { tones: [{ f: 300, len: 0.1, wave: 'triangle', to: 620, vol: 0.05 }] },
  /** Water gargling through him: a wobbly low bubble; 1.2 s. */
  rustyGargle: { tones: [{ f: 160, len: 1.15, wave: 'sine', peak: 210, to: 180, vol: 0.05, vib: { hz: 11, depth: 0.12 } }] },
  /** "A... a... ACHOO!": two rising breaths, then a big soft burst; 0.9 s. */
  rustySneeze: {
    tones: [
      { f: 260, len: 0.15, wave: 'sine', to: 330, vol: 0.03 },
      { f: 300, len: 0.15, wave: 'sine', to: 390, at: 0.22, vol: 0.035 },
      { f: 220, len: 0.25, wave: 'triangle', to: 120, at: 0.5, vol: 0.06 },
    ],
    hiss: [{ len: 0.3, at: 0.5, bp: 2400, vol: 0.06 }],
  },
  /** "mm-hmm!": a happy low hum, down then up; 0.6 s. */
  rustyHum: {
    tones: [
      { f: 196, len: 0.22, wave: 'sine', to: 175, vol: 0.05 },
      { f: 196, len: 0.3, wave: 'sine', to: 262, at: 0.28, vol: 0.05 },
    ],
  },
  /** A tap starting to run: a small bright splash; 0.2 s. */
  tapSplash: { tones: [{ f: 700, len: 0.05, wave: 'sine', to: 950, vol: 0.03 }], hiss: [{ len: 0.18, hp: 2500, vol: 0.03 }] },
};

// ---------------------------------------------------------------- the hall tune (2.6, 5.4)

const EM = ['Em', 'D', 'C', 'D', 'Em', 'C', 'D', 'Em'] as const;
const PLUCK: Record<string, string> = {
  Em: '. . E3 . . . . B3 . . G3 . . . . .',
  D: '. . D3 . . . . A3 . . F#3 . . . . .',
  C: '. . C3 . . . . G3 . . E3 . . . . .',
};
const ROOTS: Record<string, string> = { Em: 'E2', D: 'D2', C: 'C2' };
const rep8 = (bar: string): string[] => Array.from({ length: 8 }, () => bar);

/**
 * Borehole Hall's tune: our own, grumpy and wheezy but funny, in E minor. A light high lead (the
 * kalimba voice stands in for the flute, as Kano's other tunes), a plucked lute line (guitar), a
 * round bass, a kalangu-style talking drum; from the first valve a shaker, from the second a
 * second drum answering high. 120, 126, 132 BPM (the hall file's phases). Plays only with the
 * Music switch on. Never a known song, praise song, chant, court music or any game's music.
 */
export const BOREHOLE_HALL_TUNE: Tune = {
  name: 'kano-hall',
  bpm: [120, 126, 132],
  bars: 8,
  loop: true,
  gain: 1,
  key: ['E', 'F#', 'G', 'A', 'B', 'C', 'D'],
  chords: EM,
  tracks: [
    {
      inst: 'kalimba',
      lead: true,
      vol: 0.55,
      bars: [
        'G4 . . E5 . . D5 . B4 . . . G4 . A4 .',
        'F#4 . . A4 . . D5 - . . C5 . A4 . . .',
        'E5 . . . C5 . G4 . . . A4 . C5 . E5 .',
        'D5 - . . A4 . F#4 . . . A4 . D5 - . .',
        'G5 . . E5 . B4 . . E5 . G5 . A5 - . .',
        'E5 . G5 . . C5 . . E5 - . . . . . .',
        'F#5 . . D5 . A4 . . D5 . F#5 . . A5 . .',
        'G5 . F#5 . E5 . . . B4 . . . E5 - . .',
      ],
    },
    { inst: 'guitar', vol: 0.35, bars: EM.map((c) => PLUCK[c]!) },
    { inst: 'bass', vol: 0.65, bars: EM.map((c) => `${ROOTS[c]} - . . . . ${ROOTS[c]} . . . . . . . . .`) },
    { inst: 'drum', vol: 0.65, bars: rep8('E3 . . B2 E3 . . . . . E3 . B2 . . .') },
    { inst: 'shekere', vol: 0.3, from: 1, bars: rep8('X . x x X . x . X . x x X . x .') },
    { inst: 'drum', vol: 0.42, from: 2, bars: rep8('. . . . . . B3 . . . . . . . A3 .') },
  ],
};
