/**
 * The lane run's world (design.md S3f0 parts 5, 10 and 16, task S3f1): a Lagos main road at
 * dusk seen from behind and a little above. Dusk sky and our own skyline (no real building),
 * dark tarmac with white lane dashes, black-and-yellow kerbs, a concrete middle divider with
 * small plants on the left, pavements with scenery (people only on the pavements), tall
 * concrete lamps (on, flickering, off), a footbridge every 200 m, the bus stop goal, and the
 * Blackout's dark edge: no body, no face, only lamps going off and a deep blue dusk.
 *
 * Screen pixels. laneView sets up the camera numbers of part 5 for one screen size; project
 * turns road metres into screen points. gamedev may use these or its own camera (S3f2).
 */
import { BUS_GLASS, INK, WHITE } from './palette';
import { SKINS } from './hero';
import { LANE_U, TAU, bake, capsule, clamp01, dot, line, makeCanvas, mix, oval, poly, rand, shape, type Baked, type UBox } from './lane-shade';
import { drawLaneThing } from './lane-things';

/** Part 5 numbers. */
export const LANE_CAMERA = {
  /** Camera behind the hero and up (m). */
  back: 4,
  up: 2.6,
  /** Horizon, as a share of the screen height from the top. */
  horizon: 0.36,
  /** Share of the screen width the road fills at the hero. */
  roadShare: 0.86,
  laneWidth: 2.5,
  lanes: 3,
  /** Things come into view this far ahead and fade in over the first `fadeIn` metres. */
  ahead: 60,
  fadeIn: 5,
  /** Far things are drawn bigger: times 1 at the hero up to `boost` at `boostAt` metres ahead and beyond. */
  boost: 1.6,
  boostAt: 34,
  /** Lamps every 10 m on both kerbs; a footbridge every 200 m. */
  lampEvery: 10,
  bridgeEvery: 200,
} as const;

export interface LaneView {
  w: number;
  h: number;
  horizonY: number;
  /** Focal length in pixels. */
  f: number;
  /** Camera's sideways place (m, + is right of the road centre). */
  camX: number;
}

/** The camera for a w x h screen, with the camera `camX` metres right of the road centre. */
export function laneView(w: number, h: number, camX = 0): LaneView {
  const C = LANE_CAMERA;
  const f = (C.roadShare * w * C.back) / (C.laneWidth * C.lanes);
  return { w, h, horizonY: h * C.horizon, f, camX };
}

/** Road centre x (m) of a lane 0, 1, 2. */
export const laneCentre = (lane: number): number => (lane - 1) * LANE_CAMERA.laneWidth;

export interface ScreenPoint {
  x: number;
  y: number;
  /** Pixels per metre at this distance (before the far-thing boost). */
  ppm: number;
}

/**
 * A road point on screen: x metres right of the road centre, z metres ahead of the hero
 * (negative is behind), up metres above the road. Null when behind the camera.
 */
export function project(v: LaneView, x: number, z: number, up = 0): ScreenPoint | null {
  const d = z + LANE_CAMERA.back;
  if (!(d > 0.25)) return null;
  const ppm = v.f / d;
  return { x: v.w / 2 + (x - v.camX) * ppm, y: v.horizonY + (LANE_CAMERA.up - up) * ppm, ppm };
}

/** The far-thing size boost at z metres ahead (part 5): 1 at the hero, up to 1.6. */
export function laneBoost(z: number): number {
  const C = LANE_CAMERA;
  return 1 + (C.boost - 1) * clamp01(z / C.boostAt);
}

/** How see-through a thing at z metres ahead is as it comes into view (0 to 1). */
export function laneFade(z: number): number {
  const C = LANE_CAMERA;
  return clamp01((C.ahead - z) / C.fadeIn);
}

/* -------------------------------------------------------------- colours */

export const DUSK = {
  skyTop: '#4a3a86',
  skyMid: '#c4577f',
  skyLow: '#f58f4a',
  skyHorizon: '#ffcf73',
  sun: '#ffe38a',
  far: '#6a4f86',
  farDark: '#4f3c6e',
  window: '#ffd27a',
  tarmac: '#3b3a42',
  tarmacBand: '#43424b',
  dash: '#f4f1e6',
  kerbYellow: '#f2c230',
  kerbBlack: '#1f1d22',
  divider: '#b9b2a6',
  dividerTop: '#d3cdc2',
  plant: '#4f9a4a',
  pave: '#b59a80',
  paveFar: '#9c8572',
  lampPole: '#a9a39a',
  lampOn: '#ffe08a',
  lampOff: '#5a5865',
  /** The Blackout's deep blue (never black). */
  night: '#101a4a',
} as const;

/* ------------------------------------------------------------------ sky */

/**
 * The dusk sky and our own far skyline (block shapes and cranes, no real building), w wide,
 * down to the horizon at horizonY. Draw once into a picture (bakeLaneSky) and copy it each frame.
 */
export function drawLaneSky(g: CanvasRenderingContext2D, w: number, horizonY: number): void {
  const grad = g.createLinearGradient(0, 0, 0, horizonY);
  grad.addColorStop(0, DUSK.skyTop);
  grad.addColorStop(0.5, DUSK.skyMid);
  grad.addColorStop(0.85, DUSK.skyLow);
  grad.addColorStop(1, DUSK.skyHorizon);
  g.fillStyle = grad;
  g.fillRect(0, 0, w, horizonY + 1);
  // A low, soft sun ahead, half set
  const sx = w * 0.6;
  dot(g, sx, horizonY, horizonY * 0.3, 'rgba(255,214,120,0.35)');
  dot(g, sx, horizonY, horizonY * 0.2, DUSK.sun);
  // Long thin clouds lit pink from below
  g.fillStyle = 'rgba(255,190,190,0.55)';
  for (let i = 0; i < 4; i++) {
    const cy = horizonY * (0.22 + i * 0.13);
    const cx = w * rand(i + 40);
    g.beginPath();
    g.ellipse(cx, cy, w * (0.12 + rand(i + 50) * 0.1), horizonY * 0.025, 0, 0, TAU);
    g.fill();
  }
  // The far skyline: our own blocks, a few lit windows, two cranes
  const u = horizonY / 90;
  let x = -10 * u;
  let i = 0;
  while (x < w) {
    const bw = (14 + rand(i) * 26) * u;
    const bh = (10 + rand(i + 7) * 34) * u;
    g.fillStyle = i % 3 === 0 ? DUSK.farDark : DUSK.far;
    g.fillRect(x, horizonY - bh, bw, bh + 1);
    if (rand(i + 3) > 0.5) g.fillRect(x + bw * 0.3, horizonY - bh - 4 * u, bw * 0.4, 4 * u);
    g.fillStyle = DUSK.window;
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 3; c++) {
        if (rand(i * 31 + r * 5 + c) > 0.82) g.fillRect(x + bw * (0.18 + c * 0.26), horizonY - bh + (4 + r * 6) * u, 2.2 * u, 2.6 * u);
      }
    }
    x += bw + rand(i + 13) * 4 * u;
    i++;
  }
  for (const cx of [w * 0.22, w * 0.8]) {
    const top = horizonY - 62 * u;
    g.strokeStyle = DUSK.farDark;
    g.lineWidth = Math.max(1, 1.6 * u);
    g.beginPath();
    g.moveTo(cx, horizonY);
    g.lineTo(cx, top);
    g.moveTo(cx - 14 * u, top + 4 * u);
    g.lineTo(cx + 40 * u, top + 4 * u);
    g.moveTo(cx, top - 6 * u);
    g.lineTo(cx + 40 * u, top + 4 * u);
    g.moveTo(cx, top - 6 * u);
    g.lineTo(cx - 14 * u, top + 4 * u);
    g.moveTo(cx + 30 * u, top + 4 * u);
    g.lineTo(cx + 30 * u, top + 20 * u);
    g.stroke();
    for (let y = horizonY; y > top; y -= 7 * u) {
      g.beginPath();
      g.moveTo(cx - 2 * u, y);
      g.lineTo(cx + 2 * u, y - 3.5 * u);
      g.stroke();
    }
    dot(g, cx, top - 6 * u, 1.6 * u, '#ff7a5a');
  }
}

/** The sky drawn once into a picture w wide and down to the horizon (null where no canvas can be made). */
export function bakeLaneSky(w: number, horizonY: number): HTMLCanvasElement | OffscreenCanvas | null {
  const c = makeCanvas(w, horizonY + 2);
  const g = c?.getContext('2d') as CanvasRenderingContext2D | null | undefined;
  if (!c || !g) return null;
  drawLaneSky(g, w, horizonY);
  return c;
}

/* ----------------------------------------------------------------- road */

/** Road sideways layout (m from the road centre). */
export const ROAD = {
  half: 3.75,
  kerb: 0.32,
  divider: 1.1,
  pave: 6,
} as const;

/**
 * The ground: pavements, the left divider with small plants, the kerbs, the tarmac with its
 * moving bands and the white lane dashes. `dist` is how far the hero has run (m), so the
 * marks move. About 12 filled shapes in all (part 21: at most 30 bands).
 */
export function drawLaneRoad(g: CanvasRenderingContext2D, v: LaneView, dist: number): void {
  const C = LANE_CAMERA;
  const zNear = 0.4 - C.back;
  const zFar = C.ahead + 40;
  const H = v.horizonY;
  // Pavement everywhere below the horizon first
  const pg = g.createLinearGradient(0, H, 0, v.h);
  pg.addColorStop(0, DUSK.paveFar);
  pg.addColorStop(1, DUSK.pave);
  g.fillStyle = pg;
  g.fillRect(0, H, v.w, v.h - H);
  const strip = (x0: number, x1: number, z0: number, z1: number): void => {
    const a = project(v, x0, z0);
    const b = project(v, x1, z0);
    const c = project(v, x1, z1);
    const d = project(v, x0, z1);
    if (!a || !b || !c || !d) return;
    g.moveTo(a.x, a.y);
    g.lineTo(b.x, b.y);
    g.lineTo(c.x, c.y);
    g.lineTo(d.x, d.y);
    g.closePath();
  };
  const fillStrips = (colour: string, add: () => void): void => {
    g.fillStyle = colour;
    g.beginPath();
    add();
    g.fill();
  };
  const R = ROAD.half;
  const K = ROAD.kerb;
  // The divider on the left: a raised concrete strip with a lighter top
  fillStrips(DUSK.divider, () => strip(-R - K - ROAD.divider, -R - K, zNear, zFar));
  fillStrips(DUSK.dividerTop, () => strip(-R - K - ROAD.divider + 0.15, -R - K - 0.15, zNear, zFar));
  // Kerbs: black, with yellow blocks every other 2 m (near part only; far they blend)
  fillStrips(DUSK.kerbBlack, () => {
    strip(-R - K, -R, zNear, zFar);
    strip(R, R + K, zNear, zFar);
  });
  const off = ((dist % 4) + 4) % 4;
  fillStrips(DUSK.kerbYellow, () => {
    for (let z = -off - 4; z < 34; z += 4) {
      strip(-R - K, -R, z, z + 2);
      strip(R, R + K, z, z + 2);
    }
  });
  fillStrips(mix(DUSK.kerbYellow, DUSK.kerbBlack, 0.5), () => {
    strip(-R - K, -R, 34, zFar);
    strip(R, R + K, 34, zFar);
  });
  // Tarmac and its moving bands every 5 m
  fillStrips(DUSK.tarmac, () => strip(-R, R, zNear, zFar));
  const boff = ((dist % 10) + 10) % 10;
  fillStrips(DUSK.tarmacBand, () => {
    for (let z = -boff - 10; z < zFar; z += 10) strip(-R, R, Math.max(zNear, z), z + 5);
  });
  // White lane dashes: 3 m on, 6 m off
  const doff = ((dist % 9) + 9) % 9;
  fillStrips(DUSK.dash, () => {
    for (const x of [-C.laneWidth / 2, C.laneWidth / 2]) {
      for (let z = -doff - 9; z < zFar; z += 9) {
        const z0 = Math.max(zNear, z);
        if (z + 3 > z0) strip(x - 0.07, x + 0.07, z0, z + 3);
      }
    }
  });
  // Small plants on the divider, near part only
  const poff = ((dist % 6) + 6) % 6;
  g.fillStyle = DUSK.plant;
  g.beginPath();
  for (let z = -poff; z < 40; z += 6) {
    const p = project(v, -R - K - ROAD.divider / 2, z, 0.25);
    if (!p) continue;
    const r = 0.35 * p.ppm;
    g.moveTo(p.x + r, p.y);
    g.ellipse(p.x, p.y, r, r * 0.7, 0, 0, TAU);
  }
  g.fill();
}

/* ---------------------------------------------------------------- lamps */

export type LampLook = 'on' | 'dim' | 'off' | 'flicker';

/** A flickering lamp's look now: on and dim, twice a second; dim and steady with reduced motion (part 18). */
export function lampLookAt(look: LampLook, t: number, still = false): 'on' | 'dim' | 'off' {
  if (look !== 'flicker') return look;
  if (still || !Number.isFinite(t)) return 'dim';
  return Math.floor(t * 4) % 2 === 0 ? 'on' : 'dim';
}

/**
 * One street lamp: a tall concrete pole on a kerb with one warm head on an arm over the road.
 * side -1 is the left (on the divider), 1 the right kerb; z metres ahead of the hero.
 * 'on' also lights a soft pool on the road.
 */
export function drawLaneLamp(g: CanvasRenderingContext2D, v: LaneView, z: number, side: -1 | 1, look: LampLook, t = 0, still = false): void {
  const now = lampLookAt(look, t, still);
  const baseX = side * (ROAD.half + ROAD.kerb + (side < 0 ? ROAD.divider / 2 : 0.3));
  const foot = project(v, baseX, z);
  const top = project(v, baseX, z, 7);
  const head = project(v, baseX - side * 1.4, z, 6.8);
  if (!foot || !top || !head) return;
  const k = foot.ppm;
  if (now === 'on') {
    // The light pool on the road under the head
    const pool = project(v, baseX - side * 1.6, z);
    if (pool) {
      g.fillStyle = 'rgba(255,214,120,0.16)';
      g.beginPath();
      g.ellipse(pool.x, pool.y, 2.4 * k, 0.7 * k, 0, 0, TAU);
      g.fill();
    }
  }
  const w = Math.max(1, 0.18 * k);
  g.strokeStyle = INK;
  g.lineCap = 'round';
  g.lineWidth = w + Math.max(1, 0.06 * k);
  g.beginPath();
  g.moveTo(foot.x, foot.y);
  g.lineTo(top.x, top.y);
  g.quadraticCurveTo(top.x - side * 0.4 * k, top.y - 0.4 * k, head.x, head.y);
  g.stroke();
  g.strokeStyle = DUSK.lampPole;
  g.lineWidth = w;
  g.stroke();
  // The head and its glow
  const hw = Math.max(2, 0.55 * k);
  if (now !== 'off') dot(g, head.x, head.y + hw * 0.4, hw * (now === 'on' ? 2.4 : 1.4), now === 'on' ? 'rgba(255,226,140,0.4)' : 'rgba(255,226,140,0.16)');
  g.fillStyle = now === 'on' ? DUSK.lampOn : now === 'dim' ? '#b8a46a' : DUSK.lampOff;
  g.strokeStyle = INK;
  g.lineWidth = Math.max(0.8, 0.05 * k);
  g.beginPath();
  g.ellipse(head.x, head.y + hw * 0.25, hw, hw * 0.42, 0, 0, TAU);
  g.fill();
  g.stroke();
}

/* ------------------------------------------------------------- blackout */

let shadeCache: { c: HTMLCanvasElement | OffscreenCanvas } | null = null;

/** The one ready-made dark gradient (part 21), 4 x 128 px, made the first time it is needed. */
function blackoutShade(): HTMLCanvasElement | OffscreenCanvas | null {
  if (shadeCache) return shadeCache.c;
  const c = makeCanvas(4, 128);
  const g = c?.getContext('2d') as CanvasRenderingContext2D | null | undefined;
  if (!c || !g) return null;
  const grad = g.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, 'rgba(16,26,74,0)');
  grad.addColorStop(0.45, 'rgba(16,26,74,0.55)');
  grad.addColorStop(1, 'rgba(16,26,74,0.88)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 128);
  shadeCache = { c };
  return c;
}

/** How tall the Blackout's dark edge is (share of the screen height) at `metres` behind: none from 30 m, 35 percent at 0 m (part 10). */
export function blackoutShare(metres: number): number {
  if (!Number.isFinite(metres)) return 0;
  return 0.35 * clamp01(1 - metres / 30);
}

/**
 * The Blackout's dark edge rolling up the bottom of the screen: a deep blue (never black),
 * no body, no face. One draw of the ready-made gradient (falls back to a plain see-through
 * band where no canvas can be made).
 */
export function drawBlackout(g: CanvasRenderingContext2D, w: number, h: number, metres: number): void {
  const share = blackoutShare(metres);
  if (share <= 0) return;
  const bh = h * share;
  const img = blackoutShade();
  if (img) g.drawImage(img as CanvasImageSource, 0, h - bh, w, bh);
  else {
    g.fillStyle = 'rgba(16,26,74,0.6)';
    g.fillRect(0, h - bh, w, bh);
  }
}

/** The road turning deep blue as the last lamps click off (caught), k 0 to 1. */
export function drawBlackoutWash(g: CanvasRenderingContext2D, w: number, h: number, k: number): void {
  const a = 0.72 * clamp01(k);
  if (a <= 0) return;
  g.fillStyle = `rgba(16,26,74,${a.toFixed(3)})`;
  g.fillRect(0, 0, w, h);
}

/* ------------------------------------------------------- pavement scenery */

export type LaneScenery = 'cornSeller' | 'fabricStall' | 'fruitTable' | 'kiosk' | 'chargingStand' | 'umbrella' | 'keke' | 'okada' | 'waving' | 'trader';

/** The pavement scenery, in the order it cycles along the road (part 16). */
export const LANE_SCENERY: readonly LaneScenery[] = ['cornSeller', 'fabricStall', 'fruitTable', 'kiosk', 'chargingStand', 'umbrella', 'keke', 'okada', 'waving', 'trader'];

export const SCENERY_BOX: UBox = { l: -60, r: 60, t: -110, b: 4 };

const S_OUT = { line: 1.8 };

/** A person standing on the pavement (scenery only): a varied skin tone, a top, a wrapper or trousers; arm `pose`. */
function person(g: CanvasRenderingContext2D, x: number, skin: number, top: string, bottom: string, pose: 'stand' | 'wave' | 'call' | 'sit', head?: string, t = 0): void {
  const s = SKINS[skin % SKINS.length]!;
  const sit = pose === 'sit';
  const hipY = sit ? -14 : -22;
  g.save();
  g.translate(x, 0);
  // Legs
  if (!sit) for (const e of [-1, 1]) shape(g, () => capsule(g, e * 2.6, hipY, 2.6, e * 2.8, -3, 2), bottom, S_OUT);
  else shape(g, () => g.roundRect(-5, hipY - 1, 10, 10, 3), bottom, S_OUT);
  // Body
  shape(g, () => g.roundRect(-6.4, hipY - 14, 12.8, 16, 4), top, { ...S_OUT, shade: 1.8 });
  // Arms
  const wave = pose === 'wave' ? Math.sin(t * 6) * 2 : 0;
  shape(g, () => capsule(g, -6, hipY - 11, 2, -8, hipY - 2, 1.6), top, S_OUT);
  if (pose === 'wave') shape(g, () => capsule(g, 6, hipY - 11, 2, 9 + wave, hipY - 24, 1.6), s.base, { ...S_OUT, shadeC: s.shade });
  else if (pose === 'call') shape(g, () => capsule(g, 6, hipY - 11, 2, 2.4, hipY - 19, 1.6), s.base, { ...S_OUT, shadeC: s.shade });
  else shape(g, () => capsule(g, 6, hipY - 11, 2, 8, hipY - 2, 1.6), top, S_OUT);
  // Head (a simple friendly face toward the road: two eyes, a smile)
  const hy = hipY - 20;
  shape(g, () => oval(g, 0, hy, 5, 5.6), s.base, { ...S_OUT, shadeC: s.shade, rimC: s.face.rim });
  dot(g, -1.8, hy - 0.6, 0.8, INK);
  dot(g, 1.8, hy - 0.6, 0.8, INK);
  line(g, [-1.8, hy + 2.2, 0, hy + 3, 1.8, hy + 2.2], s.face.lipLine, 0.8);
  if (head) shape(g, () => g.roundRect(-5.6, hy - 7, 11.2, 4.6, 2), head, S_OUT);
  else shape(g, () => g.roundRect(-5, hy - 6.4, 10, 3.6, [3, 3, 0, 0]), '#1b1410', { line: 1.2, shade: 0, rim: 0.6, rimC: '#5a4636' });
  g.restore();
}

function table(g: CanvasRenderingContext2D, w: number, h: number, top: string): void {
  for (const x of [-w / 2 + 2, w / 2 - 4]) shape(g, () => g.rect(x, -h, 2.4, h), '#6b4a2b', S_OUT);
  shape(g, () => g.rect(-w / 2, -h - 3, w, 4), top, S_OUT);
}

/** One piece of pavement scenery, in lane units with its ground centre at the origin. */
export function drawScenery(g: CanvasRenderingContext2D, kind: LaneScenery, t = 0): void {
  g.save();
  g.lineCap = 'round';
  switch (kind) {
    case 'cornSeller': {
      // A roasted corn seller with a grill and soft grey smoke
      shape(g, () => g.rect(-16, -20, 24, 6), '#3a3d42', S_OUT);
      for (const x of [-14, 4]) shape(g, () => g.rect(x, -14, 2.4, 14), '#3a3d42', S_OUT);
      dot(g, -4, -21, 7, 'rgba(255,120,40,0.35)');
      for (let i = 0; i < 4; i++) {
        g.save();
        g.translate(-12 + i * 5, -22);
        g.rotate(0.3);
        shape(g, () => oval(g, 0, 0, 1.8, 4.4), '#f2c94c', { line: 1 });
        g.restore();
      }
      for (let i = 0; i < 3; i++) dot(g, -6 + i * 3 + Math.sin(t + i) * 1.5, -32 - i * 8, 4 + i * 1.2, `rgba(225,225,230,${(0.5 - i * 0.12).toFixed(2)})`);
      person(g, 18, 4, '#d6336c', '#2b59c3', 'sit', '#f2b300');
      break;
    }
    case 'fabricStall': {
      // A fabric stall with rolled ankara on a table and an awning
      table(g, 40, 18, '#8a5d36');
      const rolls = ['#e0572b', '#2b59c3', '#1aa39a', '#f2b300', '#7b2d26'];
      rolls.forEach((c, i) => {
        shape(g, () => oval(g, -15 + i * 7.5, -24, 3.4, 3.4), c, { line: 1.3 });
        dot(g, -15 + i * 7.5, -24, 1.2, mix(c, '#ffffff', 0.5));
      });
      for (const x of [-21, 19]) shape(g, () => g.rect(x, -58, 2.4, 58), '#6b4a2b', S_OUT);
      shape(g, () => poly(g, [-26, -58, 26, -58, 22, -50, -22, -50]), '#e0572b', S_OUT);
      for (let x = -20; x < 22; x += 8) shape(g, () => poly(g, [x, -50, x + 4, -50, x + 2, -46]), '#f3dca2', { line: 1 });
      person(g, 30, 1, '#2b59c3', '#e9e1cf', 'stand', '#e0572b');
      break;
    }
    case 'fruitTable': {
      table(g, 34, 16, '#8a5d36');
      for (let i = 0; i < 7; i++) shape(g, () => oval(g, -13 + (i % 4) * 7 + (i > 3 ? 3.5 : 0), -22 - (i > 3 ? 5 : 0), 3.2, 3.2), '#f39c12', { line: 1.1 });
      shape(g, () => oval(g, 11, -26, 4, 6, 0.4), '#e9a14a', { line: 1.2 });
      shape(g, () => oval(g, 11, -26, 2, 3.4, 0.4), '#e2583e', { line: 0, shade: 0, rim: 0 });
      person(g, -26, 2, '#7fc4a4', '#5a3e8f', 'stand', '#1aa39a');
      break;
    }
    case 'kiosk': {
      // A provisions kiosk: a small painted box shop with shelves of plain tins and packets, no words
      shape(g, () => g.rect(-22, -52, 44, 52), '#2f8a63', { ...S_OUT, shade: 2.4 });
      shape(g, () => g.rect(-17, -46, 34, 26), '#fff1c9', S_OUT);
      for (let r = 0; r < 3; r++) {
        line(g, [-17, -38 + r * 8, 17, -38 + r * 8], '#8a5d36', 1.2);
        for (let c = 0; c < 6; c++) shape(g, () => g.rect(-15 + c * 5.4, -44 + r * 8, 3.6, 5.6), ['#d6372b', '#f2b300', '#2b59c3', '#e9e1cf'][(r + c) % 4]!, { line: 0.7, shade: 0, rim: 0 });
      }
      shape(g, () => poly(g, [-26, -52, 26, -52, 22, -60, -22, -60]), '#f2c230', S_OUT);
      shape(g, () => g.rect(-22, -20, 44, 4), '#8a5d36', S_OUT);
      break;
    }
    case 'chargingStand': {
      // A phone-charging stand: a table with a power strip, plugged phones and a small sun shade
      table(g, 30, 18, '#5d6670');
      shape(g, () => g.rect(-12, -24, 24, 3), '#e9e1cf', { line: 1 });
      for (let i = 0; i < 5; i++) {
        shape(g, () => g.roundRect(-11 + i * 5, -31, 3.6, 6.4, 0.8), '#2c3238', { line: 0.8 });
        dot(g, -9.2 + i * 5, -29, 0.8, '#7fd6ff');
      }
      shape(g, () => g.rect(-2, -60, 2.4, 40), '#6b4a2b', S_OUT);
      shape(g, () => poly(g, [-18, -58, 20, -58, 12, -66, -10, -66]), '#2b59c3', S_OUT);
      person(g, 24, 3, '#e9e1cf', '#3b2a20', 'stand');
      break;
    }
    case 'umbrella': {
      // A big market umbrella over a stool and a basket of tomatoes
      shape(g, () => g.rect(-1.2, -66, 2.4, 66), '#6b4a2b', S_OUT);
      shape(
        g,
        () => {
          g.moveTo(-34, -56);
          g.quadraticCurveTo(0, -84, 34, -56);
          g.closePath();
        },
        '#1aa39a',
        S_OUT,
      );
      for (const x of [-22, -6, 10, 26]) line(g, [0, -70, x, -56], '#f3dca2', 1.4);
      shape(g, () => g.roundRect(-18, -12, 16, 12, 3), '#c99a62', S_OUT);
      for (let i = 0; i < 4; i++) dot(g, -15 + i * 3.6, -13, 2.2, '#d6372b');
      person(g, 12, 0, '#f2b300', '#2b59c3', 'sit', '#1aa39a');
      break;
    }
    case 'keke': {
      // A parked keke (three-wheeled tricycle taxi), no rider, plain paint, no writing
      shape(g, () => oval(g, -16, -6, 6, 6), '#2a2a2a', S_OUT);
      shape(g, () => oval(g, 18, -6, 6, 6), '#2a2a2a', S_OUT);
      shape(
        g,
        () => {
          g.moveTo(-24, -10);
          g.lineTo(-24, -40);
          g.quadraticCurveTo(-22, -50, -8, -50);
          g.lineTo(18, -50);
          g.quadraticCurveTo(28, -46, 28, -28);
          g.lineTo(26, -10);
          g.closePath();
        },
        '#2fa36b',
        { ...S_OUT, shade: 2.4 },
      );
      shape(g, () => poly(g, [-20, -44, 2, -44, 2, -28, -20, -28]), '#2a3440', { line: 1.4, shade: 0, rim: 0.8 });
      shape(g, () => poly(g, [8, -44, 24, -44, 24, -28, 8, -28]), BUS_GLASS, { line: 1.4, shade: 0, rim: 0 });
      shape(g, () => g.rect(-26, -54, 56, 5), '#1d1a14', S_OUT);
      break;
    }
    case 'okada': {
      // A parked motorbike on its stand, no rider
      for (const x of [-15, 15]) {
        shape(g, () => oval(g, x, -8, 7.4, 7.4), '#2a2a2a', S_OUT);
        dot(g, x, -8, 3, '#9aa3ad');
      }
      line(g, [-15, -8, -4, -18, 10, -18, 15, -8], INK, 3);
      line(g, [-15, -8, -4, -18, 10, -18, 15, -8], '#9aa3ad', 1.4);
      shape(g, () => g.roundRect(-10, -24, 18, 7, 3), '#d6372b', S_OUT);
      shape(g, () => g.roundRect(-14, -27, 10, 4, 2), '#1d1a14', { line: 1.2 });
      line(g, [12, -18, 16, -30, 20, -30], INK, 2);
      dot(g, 17, -27, 2, '#ffe9a0');
      line(g, [0, -10, -4, -1], INK, 1.6);
      break;
    }
    case 'waving':
      // People on the pavement waving at the runner: friendly, scenery only
      person(g, -16, 1, '#e0572b', '#2b59c3', 'wave', undefined, t);
      person(g, 2, 4, '#f4f4f4', '#7b2d26', 'stand');
      person(g, 18, 2, '#5a3e8f', '#f2b300', 'wave', '#d6336c', t + 0.6);
      break;
    case 'trader':
      // A trader calling out, with a tray of plain clear water bags on the head (no words)
      person(g, 0, 3, '#1aa39a', '#e9e1cf', 'call', '#f2b300');
      shape(g, () => oval(g, 0, -50, 12, 3), '#c99a62', S_OUT);
      for (let i = 0; i < 4; i++) shape(g, () => g.roundRect(-9 + i * 4.6, -57, 4, 6, 1.5), '#d8eef8', { line: 0.8, shade: 0, rim: 0 });
      break;
  }
  g.restore();
}

/** The footbridge over the road (every 200 m): concrete deck high above, railings and stairs; scenery only. */
export function drawFootbridge(g: CanvasRenderingContext2D, v: LaneView, z: number): void {
  const x0 = -ROAD.half - ROAD.kerb - ROAD.divider - 2;
  const x1 = ROAD.half + ROAD.kerb + 3;
  const deck0 = 5.4;
  const deck1 = 6;
  const a = project(v, x0, z, deck1);
  const b = project(v, x1, z, deck1);
  const c = project(v, x1, z, deck0);
  const d = project(v, x0, z, deck0);
  const rail = project(v, x0, z, deck1 + 1.1);
  if (!a || !b || !c || !d || !rail) return;
  const k = a.ppm;
  // Stair legs at both ends
  for (const x of [x0 + 0.6, x1 - 0.6]) {
    const top = project(v, x, z, deck0);
    const foot = project(v, x, z);
    if (!top || !foot) continue;
    g.fillStyle = '#9c968c';
    g.strokeStyle = INK;
    g.lineWidth = Math.max(1, 0.05 * k);
    g.fillRect(top.x - 0.35 * k, top.y, 0.7 * k, foot.y - top.y);
    g.strokeRect(top.x - 0.35 * k, top.y, 0.7 * k, foot.y - top.y);
  }
  // The deck
  g.fillStyle = '#c9c2b6';
  g.beginPath();
  g.moveTo(a.x, a.y);
  g.lineTo(b.x, b.y);
  g.lineTo(c.x, c.y);
  g.lineTo(d.x, d.y);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = '#9c968c';
  g.fillRect(d.x, d.y - 0.12 * k, c.x - d.x, 0.12 * k);
  // Railings with a green top bar
  const ry = rail.y;
  g.strokeStyle = '#2f8a63';
  g.lineWidth = Math.max(1, 0.1 * k);
  g.beginPath();
  g.moveTo(a.x, ry);
  g.lineTo(b.x, ry);
  for (let x = a.x; x <= b.x; x += 0.8 * k) {
    g.moveTo(x, ry);
    g.lineTo(x, a.y);
  }
  g.stroke();
}

/* ------------------------------------------------------------ bus stop */

export const BUS_STOP_BOX: UBox = { l: -96, r: 114, t: -164, b: 6 };

/**
 * The bus stop (the goal): our own shelter with a bench, people under the roof waving, a plain
 * stop sign with a bus picture (no name), a yellow danfo waiting beside it, and two bright lamps
 * over it. Lane units, its ground centre at the origin; place it on the right pavement.
 * `bright`: the lamps over the stop shine brighter (the goal is reached).
 */
export function drawLaneBusStop(g: CanvasRenderingContext2D, t = 0, bright = false): void {
  g.save();
  g.lineCap = 'round';
  // The danfo waiting beside it, seen from behind, a little to the left (at the kerb)
  g.save();
  g.translate(-58, 0);
  g.scale(0.92, 0.92);
  drawLaneThing(g, 'danfo', { frame: 0 });
  g.restore();
  // Lamps over the stop
  for (const x of [-10, 96]) {
    shape(g, () => g.rect(x - 1.6, -146, 3.2, 146), '#a9a39a', { line: 1.6 });
    dot(g, x, -146, bright ? 16 : 10, bright ? 'rgba(255,226,140,0.55)' : 'rgba(255,226,140,0.3)');
    shape(g, () => oval(g, x, -146, 5, 2.6), bright ? '#fff3c0' : DUSK.lampOn, { line: 1.2, shade: 0, rim: 0 });
  }
  // Shelter: posts, a back panel, the roof
  shape(g, () => g.rect(0, -78, 90, 62), '#bfe3f5', { line: 1.8, shade: 0, rim: 0 });
  for (const x of [0, 44, 88]) shape(g, () => g.rect(x - 1.8, -84, 3.6, 84), '#5d6670', { line: 1.6 });
  shape(g, () => poly(g, [-8, -84, 98, -84, 94, -96, -4, -96]), '#2f5d8a', { line: 2, shade: 2 });
  shape(g, () => g.rect(-8, -86, 106, 3), '#f2c230', { line: 1.2 });
  // Bench
  shape(g, () => g.rect(8, -24, 74, 4), '#8a5d36', { line: 1.4 });
  for (const x of [12, 74]) shape(g, () => g.rect(x, -20, 3, 20), '#5d6670', { line: 1.2 });
  // People under the roof: waving, sitting, standing (scenery only)
  person(g, 20, 0, '#f2b300', '#2b59c3', 'wave', undefined, t);
  person(g, 40, 4, '#e0572b', '#1d1a14', 'sit', '#d6336c');
  person(g, 60, 2, '#2f5d8a', '#e9e1cf', 'stand');
  person(g, 78, 3, '#0e7a3e', '#ffffff', 'wave', undefined, t + 0.5);
  // A plain stop sign with a bus picture, no name
  shape(g, () => g.rect(104, -108, 3, 108), '#5d6670', { line: 1.4 });
  shape(g, () => g.roundRect(96, -126, 19, 19, 3), '#2f5d8a', { line: 1.6 });
  shape(g, () => g.roundRect(99.5, -122, 12, 8.6, 2), WHITE, { line: 0, shade: 0, rim: 0 });
  g.fillStyle = '#2f5d8a';
  g.fillRect(100.8, -120.6, 4, 3);
  g.fillRect(106, -120.6, 4, 3);
  dot(g, 102, -112.6, 1.4, WHITE);
  dot(g, 109, -112.6, 1.4, WHITE);
  g.restore();
}

/* ---------------------------------------------------------------- helpers */

/** Draws something in lane units at a screen point (ground centre) at ppm pixels per metre. */
export function atScreen(g: CanvasRenderingContext2D, x: number, y: number, ppm: number, draw: (g: CanvasRenderingContext2D) => void): void {
  g.save();
  g.translate(x, y);
  const k = ppm / LANE_U;
  g.scale(k, k);
  draw(g);
  g.restore();
}

/** Ready-made scenery pictures (one each) and the bus stop (unlit and bright), at ppm pixels per metre. */
export function bakeLaneScenery(ppm: number): Map<string, Baked> {
  const out = new Map<string, Baked>();
  for (const k of LANE_SCENERY) {
    const b = bake(SCENERY_BOX, ppm, (g) => drawScenery(g, k, 0));
    if (b) out.set(k, b);
  }
  for (const bright of [false, true]) {
    const b = bake(BUS_STOP_BOX, ppm, (g) => drawLaneBusStop(g, 0, bright));
    if (b) out.set(bright ? 'busStopBright' : 'busStop', b);
  }
  return out;
}
