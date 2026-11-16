/**
 * The Expressway run's look (art O6a; docs/ogun.md 6.6 and part 7; src/data/levels/ogun-lane.json,
 * theme "expressway"): the lane run's rules and camera (src/art/lane.ts) with Ogun's own picture.
 * A wide expressway at dusk seen from behind: an indigo-to-amber sky with our own far granite
 * rocks, a working quarry and palms against it; dark tarmac with white lane dashes and solid
 * yellow edge lines; a concrete crash barrier down the middle; white-and-grey kerbs; red-brown
 * laterite verges with grass. Tipper trucks and tankers (and danfos) are the level file's `danfo`
 * kind: the same size and box, dark back windows, no driver, no writing, no brand. People are on
 * the verges at roadside stalls (corn, oranges, garri) under flat cloth shades (never umbrellas),
 * at the windows of roadside houses, and on the footbridge. The bus stop goal stands under a
 * small copy of the gateway arch.
 *
 * Units as lane.ts and lane-things.ts (LANE_U = 32 u a metre; road things anchored at their
 * ground centre). Lamps, the footbridge, coins, bulbs, chips, cones, potholes, barriers, crates,
 * junk, signs and the goat are Lagos's (lane.ts, lane-things.ts): the same shapes keep the rules
 * readable. Reduced motion: pass t = 0 (or `still`) and nothing waves; hazard lights stay on.
 * Lives in the lazy Ogun part.
 */
import { LANE_CAMERA, ROAD, atScreen, drawFootbridge, drawLaneLamp, laneCentre, laneView, project, type LaneView } from '../../art/lane';
import { LANE_U, bake, dot, line, mix, oval, poly, rand, shape, type Baked, type UBox } from '../../art/lane-shade';
import { LANE_BOXES, bakeLaneThings, drawLaneAt, drawLaneThing, hazardFrame, laneKey } from '../../art/lane-things';
import { drawFoodIcon } from '../../art/items';
import { drawFolkBust, drawFolkFrame, type FolkFrame, type FolkLook } from '../../art/folk';
import { FRONT_TILE, type FrontWindow } from '../../art/folkLane';
import { drawMiniArch } from '../../art/gatewayRoad';
import { WHITE } from '../../art/palette';
import { OTA_CAST } from './ota';
import { SAGAMU_CAST, SAGAMU_TRADER_LOOKS } from './sagamu';
import { OG, drawAdireCloth } from './city';

const TAU = Math.PI * 2;
type G = CanvasRenderingContext2D;

/** The Expressway's dusk: Ogun's own colours (Lagos's lane is purple to orange over a skyline). */
export const EXPRESSWAY = {
  skyTop: '#2f3a7a',
  skyMid: '#8e5f9a',
  skyLow: '#f0956a',
  skyHorizon: '#ffd28a',
  sun: '#ffe9a6',
  far: '#6c5a8a',
  farDark: '#54476f',
  farRock: '#8a7f9c',
  tarmac: '#3a3a40',
  tarmacBand: '#424249',
  dash: '#f4f1e6',
  edge: '#f2c230',
  kerbA: '#e9e5dc',
  kerbB: '#9a958c',
  barrier: '#c4beb2',
  barrierTop: '#dcd7cc',
  verge: '#a85f3a',
  vergeFar: '#8f5a44',
  grass: '#6f9a46',
} as const;
const E = EXPRESSWAY;

/* ------------------------------------------------------------------ sky */

/** The dusk sky and Ogun's far horizon (our own rocks, the quarry, palms), w wide down to horizonY. Bake it once (bakeExpresswaySky). */
export function drawExpresswaySky(g: G, w: number, horizonY: number): void {
  const grad = g.createLinearGradient(0, 0, 0, horizonY);
  grad.addColorStop(0, E.skyTop);
  grad.addColorStop(0.5, E.skyMid);
  grad.addColorStop(0.86, E.skyLow);
  grad.addColorStop(1, E.skyHorizon);
  g.fillStyle = grad;
  g.fillRect(0, 0, w, horizonY + 1);
  const sx = w * 0.38;
  dot(g, sx, horizonY, horizonY * 0.32, 'rgba(255,214,140,0.32)');
  dot(g, sx, horizonY, horizonY * 0.2, E.sun);
  g.fillStyle = 'rgba(255,200,170,0.5)';
  for (let i = 0; i < 4; i++) {
    g.beginPath();
    g.ellipse(w * rand(i + 70), horizonY * (0.2 + i * 0.14), w * (0.1 + rand(i + 80) * 0.1), horizonY * 0.022, 0, 0, TAU);
    g.fill();
  }
  const u = horizonY / 90;
  // Our own granite rocks: big smooth humps along the horizon
  g.fillStyle = E.farRock;
  for (const [cx, rw, rh] of [[0.08, 46, 30], [0.26, 30, 20], [0.7, 58, 36], [0.86, 34, 22]] as const) {
    const x = w * cx;
    g.beginPath();
    g.moveTo(x - rw * u, horizonY + 1);
    g.bezierCurveTo(x - rw * u, horizonY - rh * u, x + rw * 0.3 * u, horizonY - rh * 1.1 * u, x + rw * u, horizonY + 1);
    g.fill();
  }
  // The quarry: grey terraces cut into a hill, a crusher shed and a tipper on the path (no blasting)
  const qx = w * 0.5;
  g.fillStyle = E.far;
  g.beginPath();
  g.moveTo(qx - 40 * u, horizonY + 1);
  g.quadraticCurveTo(qx, horizonY - 34 * u, qx + 44 * u, horizonY + 1);
  g.fill();
  g.fillStyle = '#9d93ad';
  for (let k = 0; k < 3; k++) g.fillRect(qx - (24 - k * 6) * u, horizonY - (22 - k * 7) * u, (40 - k * 12) * u, 3 * u);
  g.fillStyle = E.farDark;
  g.fillRect(qx + 20 * u, horizonY - 14 * u, 12 * u, 9 * u);
  g.strokeStyle = E.farDark;
  g.lineWidth = Math.max(1, 1.4 * u);
  g.beginPath();
  g.moveTo(qx + 26 * u, horizonY - 12 * u);
  g.lineTo(qx + 40 * u, horizonY - 22 * u);
  g.stroke();
  // Palms against the sky
  for (const [cx, hh] of [[0.16, 26], [0.6, 22], [0.94, 28]] as const) {
    const x = w * cx;
    g.strokeStyle = E.farDark;
    g.lineWidth = Math.max(1, 1.6 * u);
    g.beginPath();
    g.moveTo(x, horizonY + 1);
    g.quadraticCurveTo(x + 2 * u, horizonY - hh * 0.6 * u, x + u, horizonY - hh * u);
    g.stroke();
    g.fillStyle = E.farDark;
    for (let k = 0; k < 5; k++) {
      const a = -Math.PI / 2 + (k - 2) * 0.7;
      g.beginPath();
      g.ellipse(x + u + Math.cos(a) * 6 * u, horizonY - hh * u + Math.sin(a) * 3 * u + 2 * u, 7 * u, 1.8 * u, a, 0, TAU);
      g.fill();
    }
  }
  // A thin far band of warm lights where the expressway meets the sky
  g.fillStyle = 'rgba(255,214,140,0.7)';
  for (let i = 0; i < 9; i++) g.fillRect(w * (0.3 + i * 0.045), horizonY - 1.5 * u, 1.6 * u, 1.6 * u);
}

/** The sky drawn once into a picture (null where no canvas can be made). */
export function bakeExpresswaySky(w: number, horizonY: number): HTMLCanvasElement | OffscreenCanvas | null {
  const c = typeof document !== 'undefined' ? document.createElement('canvas') : typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(1, 1) : null;
  if (!c) return null;
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(horizonY + 2));
  const g = c.getContext('2d') as CanvasRenderingContext2D | null;
  if (!g) return null;
  drawExpresswaySky(g, w, horizonY);
  return c;
}

/* ----------------------------------------------------------------- road */

/**
 * The ground, in Lagos's road layout (ROAD), so lamps, the footbridge, people and the rules sit
 * where they do in Lagos: laterite verges with grass tufts, the crash barrier on the left, kerbs
 * in white and grey blocks, the tarmac with moving bands, white lane dashes and solid yellow edge
 * lines. `dist` (m) moves the marks.
 */
export function drawExpresswayRoad(g: G, v: LaneView, dist: number): void {
  const C = LANE_CAMERA;
  const zNear = 0.4 - C.back;
  const zFar = C.ahead + 40;
  const H = v.horizonY;
  const pg = g.createLinearGradient(0, H, 0, v.h);
  pg.addColorStop(0, E.vergeFar);
  pg.addColorStop(1, E.verge);
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
  const fill = (colour: string, add: () => void): void => {
    g.fillStyle = colour;
    g.beginPath();
    add();
    g.fill();
  };
  const R = ROAD.half;
  const K = ROAD.kerb;
  const mod = (n: number, m: number): number => ((n % m) + m) % m;
  // Grass tufts on both verges (near part), moving with the run
  const goff = mod(dist, 5);
  g.fillStyle = E.grass;
  g.beginPath();
  for (let z = -goff; z < 36; z += 5)
    for (const x of [-R - K - ROAD.divider - 1.6, R + K + 1.2, R + K + 3.4]) {
      const p = project(v, x + (rand(Math.round(z + dist)) - 0.5), z);
      if (!p) continue;
      const r = 0.3 * p.ppm;
      g.moveTo(p.x + r, p.y);
      g.ellipse(p.x, p.y, r, r * 0.45, 0, 0, TAU);
    }
  g.fill();
  // The crash barrier on the left: a concrete wall with a light top
  fill(E.barrier, () => strip(-R - K - ROAD.divider, -R - K, zNear, zFar));
  fill(E.barrierTop, () => strip(-R - K - ROAD.divider + 0.3, -R - K - 0.3, zNear, zFar));
  // Kerbs in white and grey blocks every 2 m
  fill(E.kerbB, () => {
    strip(-R - K, -R, zNear, zFar);
    strip(R, R + K, zNear, zFar);
  });
  const off = mod(dist, 4);
  fill(E.kerbA, () => {
    for (let z = -off - 4; z < 34; z += 4) {
      strip(-R - K, -R, z, z + 2);
      strip(R, R + K, z, z + 2);
    }
  });
  // Tarmac and its bands
  fill(E.tarmac, () => strip(-R, R, zNear, zFar));
  const boff = mod(dist, 10);
  fill(E.tarmacBand, () => {
    for (let z = -boff - 10; z < zFar; z += 10) strip(-R, R, Math.max(zNear, z), z + 5);
  });
  // Solid yellow edge lines, then the white lane dashes (3 m on, 6 m off)
  fill(E.edge, () => {
    strip(-R + 0.12, -R + 0.26, zNear, zFar);
    strip(R - 0.26, R - 0.12, zNear, zFar);
  });
  const doff = mod(dist, 9);
  fill(E.dash, () => {
    for (const x of [-C.laneWidth / 2, C.laneWidth / 2])
      for (let z = -doff - 9; z < zFar; z += 9) {
        const z0 = Math.max(zNear, z);
        if (z + 3 > z0) strip(x - 0.07, x + 0.07, z0, z + 3);
      }
  });
}

/* ------------------------------------------------------------- vehicles */

export type ExpresswayVehicle = 'tipper' | 'tanker' | 'danfo';
export const EXPRESSWAY_VEHICLES: readonly ExpresswayVehicle[] = ['tipper', 'tanker', 'danfo'];
/** Every vehicle uses the danfo's box (the same size and rule). */
export const VEHICLE_BOX: UBox = LANE_BOXES.danfo;

/** Which look a `danfo` thing at `metre` in `lane` takes: fixed for a spot, so it never changes as it nears. About 2 tippers and 2 tankers to each danfo. */
export function expresswayVehicleAt(metre: number, lane: number): ExpresswayVehicle {
  const r = rand(Math.round(metre) * 3 + Math.round(lane) * 17 + 5);
  return r < 0.4 ? 'tipper' : r < 0.8 ? 'tanker' : 'danfo';
}

const SHARP = { sharp: true, line: 2.6 };
const AMBER = '#ffb21c';

function tail(g: G, lit: boolean, y: number): void {
  for (const x of [-31, 27]) {
    shape(g, () => g.rect(x, y - 12, 4, 10), '#c0392b', { ...SHARP, line: 1.4, shade: 0 });
    if (lit) dot(g, x + 2, y + 2, 5.5, 'rgba(255,190,60,0.45)');
    shape(g, () => g.rect(x, y, 4, 5), lit ? AMBER : '#8a5a14', { ...SHARP, line: 1.4, shade: 0, rim: lit ? 1 : 0 });
  }
  shape(g, () => g.rect(-9, y + 1, 18, 6), '#efe9d8', { ...SHARP, line: 1.4, shade: 0, rim: 0 });
}

function wheels(g: G): void {
  g.fillStyle = 'rgba(20,14,30,0.35)';
  g.beginPath();
  oval(g, 0, 0, 36, 3);
  g.fill();
  for (const x of [-24, -15, 15, 24]) shape(g, () => g.rect(x - 4.5, -14, 9, 14), '#2a2a2a', { ...SHARP, line: 2, rim: 0.6 });
  // Mud flaps, plain dark rubber
  for (const x of [-28, 22]) shape(g, () => g.rect(x, -16, 6, 12), '#1d1a14', { ...SHARP, line: 1.4, shade: 0, rim: 0 });
}

/** A tipper truck from behind: a tall steel tipping body with a ribbed tailgate and a heap of gravel showing over the top. No writing. */
function tipper(g: G, lit: boolean): void {
  wheels(g);
  shape(g, () => poly(g, [-33, -22, 33, -22, 33, -14, -33, -14]), '#3a3d42', SHARP);
  // Gravel heaped over the top edge
  shape(g, () => {
    g.moveTo(-30, -78);
    g.quadraticCurveTo(-10, -92, 4, -84);
    g.quadraticCurveTo(18, -94, 30, -78);
    g.closePath();
  }, '#9a9790', { line: 2, shade: 1.6 });
  for (let k = 0; k < 6; k++) dot(g, -22 + k * 9, -82 - (k % 2) * 3, 2, '#cdc9bf');
  shape(g, () => poly(g, [-32, -78, 32, -78, 32, -22, -32, -22]), '#e0572b', { ...SHARP, line: 3, shade: 3, rim: 1.4 });
  // Tailgate ribs and its hinge bar
  for (const x of [-20, -7, 7, 20]) line(g, [x, -72, x, -28], mix('#e0572b', '#2a1a3a', 0.35), 2.4);
  shape(g, () => g.rect(-33, -80, 66, 5), '#b9441f', SHARP);
  tail(g, lit, -40);
}

/** A tanker from behind: a big round tank end with a ladder, a valve box and a plain red-and-white band. No writing. */
function tanker(g: G, lit: boolean): void {
  wheels(g);
  shape(g, () => poly(g, [-33, -22, 33, -22, 33, -14, -33, -14]), '#3a3d42', SHARP);
  shape(g, () => oval(g, 0, -52, 33, 30), '#d7dadf', { line: 3, shade: 3, rim: 1.6 });
  shape(g, () => oval(g, 0, -52, 22, 20), '#e6e8ec', { line: 1.2, shade: 0, rim: 1 });
  // A plain band of red and white blocks for night safety (no words)
  for (let k = 0; k < 6; k++) shape(g, () => g.rect(-30 + k * 10, -30, 10, 5), k % 2 ? WHITE : '#d6372b', { ...SHARP, line: 1, shade: 0, rim: 0 });
  // The ladder up the back and the valve box
  line(g, [12, -80, 12, -30], '#5d6670', 2);
  line(g, [20, -78, 20, -30], '#5d6670', 2);
  for (let y = -74; y < -32; y += 8) line(g, [12, y, 20, y], '#5d6670', 1.6);
  shape(g, () => g.rect(-12, -40, 16, 9), '#7d8a96', SHARP);
  tail(g, lit, -34);
}

/** One Expressway vehicle from behind, in lane units at its ground centre. `lit`: the hazard lights' on frame. */
export function drawExpresswayVehicle(g: G, kind: ExpresswayVehicle, lit = true): void {
  g.save();
  g.lineCap = 'round';
  if (kind === 'danfo') drawLaneThing(g, 'danfo', { frame: lit ? 1 : 0 });
  else if (kind === 'tipper') tipper(g, lit);
  else tanker(g, lit);
  g.restore();
}

/* --------------------------------------------------------------- pickups */

/** Ogun's garri and corn pickups (the same powers and shapes as Lagos, with Ogun's touch), centred in lane units. */
export function drawExpresswayPickup(g: G, kind: 'garri' | 'corn'): void {
  g.save();
  dot(g, 0, 0, 13.5, 'rgba(255,248,220,0.72)');
  // A ring of our own adire dots round the halo
  for (let k = 0; k < 10; k++) dot(g, Math.cos((k * TAU) / 10) * 12.5, Math.sin((k * TAU) / 10) * 12.5, 1, OG.indigo);
  if (kind === 'garri') {
    // Ijebu garri: a leaf-lined basin heaped with fine, crisp garri
    shape(g, () => oval(g, 0, 4, 10, 4.4), '#3f8f4a', { line: 1.2 });
    shape(g, () => {
      g.moveTo(-9, 2);
      g.quadraticCurveTo(0, -12, 9, 2);
      g.closePath();
    }, '#f6ecd0', { line: 1.4, shade: 1.2, shadeC: '#e2d2a6' });
    for (let k = 0; k < 7; k++) dot(g, -5 + (k % 4) * 3.3, -2 - Math.floor(k / 4) * 3, 0.6, '#c9b07a');
    shape(g, () => poly(g, [-9, 3, 9, 3, 7, 9, -7, 9]), '#c99b55', { line: 1.4, shade: 1 });
  } else {
    shape(g, () => oval(g, 0, 6, 11, 3.6, -0.15), '#3f8f4a', { line: 1.2 });
    drawFoodIcon(g, 'corn', 0, -1, 0.7);
  }
  g.restore();
}

/* --------------------------------------------------------------- scenery */

export type ExpresswayScenery = 'cornStall' | 'orangeStall' | 'garriStall' | 'palms' | 'rocks' | 'adireLine' | 'restingDriver' | 'waving';
/** The verge scenery, in the order it cycles along the road (Lagos's every 25 m slot). */
export const EXPRESSWAY_SCENERY: readonly ExpresswayScenery[] = ['cornStall', 'palms', 'orangeStall', 'rocks', 'garriStall', 'adireLine', 'restingDriver', 'waving'];
export const EXPRESSWAY_SCENERY_BOX: UBox = { l: -64, r: 64, t: -116, b: 4 };

const FOLK_S = 1.3;
function folk(g: G, look: FolkLook, x: number, f: FolkFrame = 'stand'): void {
  g.save();
  g.translate(x, 0);
  g.scale(FOLK_S, FOLK_S);
  drawFolkFrame(g, look, f);
  g.restore();
}

/** A flat cloth shade on two poles over a table (never an umbrella): `c` with a stripe of `c2`. */
function shade(g: G, w: number, c: string, c2: string): void {
  for (const x of [-w / 2 + 2, w / 2 - 4]) shape(g, () => g.rect(x, -60, 2.6, 60), '#6b4a2b', { line: 1.6 });
  shape(g, () => poly(g, [-w / 2 - 4, -64, w / 2 + 4, -64, w / 2, -56, -w / 2, -56]), c, { line: 1.8 });
  for (let x = -w / 2; x < w / 2; x += 8) shape(g, () => g.rect(x, -63, 3, 6), c2, { line: 0, shade: 0, rim: 0 });
}

function table(g: G, w: number): void {
  for (const x of [-w / 2 + 2, w / 2 - 4]) shape(g, () => g.rect(x, -16, 2.4, 16), '#6b4a2b', { line: 1.4 });
  shape(g, () => g.rect(-w / 2, -19, w, 4), '#8a5d36', { line: 1.4 });
}

/** One piece of verge scenery, in lane units with its ground centre at the origin. `t` waves arms; 0 holds still. */
export function drawExpresswayScenery(g: G, kind: ExpresswayScenery, t = 0): void {
  g.save();
  g.lineCap = 'round';
  const wave = (k: number): FolkFrame => (t === 0 ? 'stand' : Math.floor(t * 3 + k) % 2 ? 'wave1' : 'wave0');
  switch (kind) {
    case 'cornStall': {
      shade(g, 44, '#e0572b', '#f6e9cc');
      shape(g, () => g.rect(-16, -20, 24, 6), '#3a3d42', { line: 1.6 });
      for (const x of [-14, 4]) shape(g, () => g.rect(x, -14, 2.4, 14), '#3a3d42', { line: 1.4 });
      dot(g, -4, -21, 7, 'rgba(255,120,40,0.35)');
      for (let i = 0; i < 4; i++) {
        g.save();
        g.translate(-12 + i * 5, -22);
        g.rotate(0.3);
        shape(g, () => oval(g, 0, 0, 1.8, 4.4), '#f2c94c', { line: 1 });
        g.restore();
      }
      folk(g, OTA_CAST[3]!, 26, 'sit');
      break;
    }
    case 'orangeStall': {
      shade(g, 40, '#13703a', '#f2c230');
      table(g, 34);
      for (let i = 0; i < 9; i++) shape(g, () => oval(g, -12 + (i % 5) * 6 + (i > 4 ? 3 : 0), -23 - (i > 4 ? 5 : 0), 3, 3), '#f39c12', { line: 1 });
      folk(g, SAGAMU_CAST[14]!, -30, 'call');
      break;
    }
    case 'garriStall': {
      shade(g, 44, OG.indigo, '#ffffff');
      table(g, 38);
      for (const x of [-10, 10]) {
        shape(g, () => oval(g, x, -21, 9, 3.4), '#c99b55', { line: 1.2 });
        shape(g, () => {
          g.moveTo(x - 8, -21);
          g.quadraticCurveTo(x, -30, x + 8, -21);
          g.closePath();
        }, '#f6ecd0', { line: 1.2 });
      }
      shape(g, () => g.roundRect(18, -14, 12, 14, 4), '#efe6cf', { line: 1.4 });
      folk(g, SAGAMU_TRADER_LOOKS.garri, -32);
      break;
    }
    case 'palms':
      for (const [x, h] of [[-26, 96], [18, 80]] as const) {
        shape(g, () => {
          g.moveTo(x - 2, 0);
          g.quadraticCurveTo(x + 6, -h * 0.55, x + 2, -h);
          g.lineTo(x + 5, -h);
          g.quadraticCurveTo(x + 9, -h * 0.55, x + 3, 0);
          g.closePath();
        }, '#7b5a3a', { line: 1.4 });
        for (let k = 0; k < 6; k++) {
          const a = -Math.PI / 2 + (k - 2.5) * 0.6;
          shape(g, () => oval(g, x + 3 + Math.cos(a) * 14, -h + Math.sin(a) * 8 + 5, 16, 4, a), '#3f8f4a', { line: 1.2 });
        }
      }
      break;
    case 'rocks':
      for (const [x, w, h] of [[-20, 70, 54], [30, 40, 30]] as const) {
        shape(g, () => {
          g.moveTo(x - w / 2, 0);
          g.bezierCurveTo(x - w / 2, -h * 0.8, x - w * 0.1, -h, x + w * 0.1, -h);
          g.bezierCurveTo(x + w * 0.4, -h, x + w / 2, -h * 0.5, x + w / 2, 0);
          g.closePath();
        }, OG.granite, { line: 1.8, shade: 3, rim: 1.6 });
      }
      break;
    case 'adireLine':
      for (const x of [-40, 40]) shape(g, () => g.rect(x - 1.4, -52, 2.8, 52), '#6b4a2b', { line: 1.4 });
      line(g, [-40, -50, 40, -50], '#5d6670', 1);
      for (let k = 0; k < 5; k++) drawAdireCloth(g, -36 + k * 15, -50, 12, 24, k, false, t === 0 ? 0 : Math.sin(t * 2 + k) * 1.2);
      folk(g, SAGAMU_CAST[6]!, 50);
      break;
    case 'restingDriver':
      // A truck driver resting in the shade with a cup of tea, waving (drivers are never the problem)
      shade(g, 40, '#f2c230', OG.indigo);
      shape(g, () => g.roundRect(-14, -12, 20, 12, 3), '#8a5d36', { line: 1.4 });
      folk(g, OTA_CAST[5]!, -4, 'sit');
      shape(g, () => g.rect(10, -20, 5, 6), WHITE, { line: 1 });
      break;
    case 'waving':
      folk(g, SAGAMU_CAST[9]!, -22, wave(0));
      folk(g, OTA_CAST[8]!, 2);
      folk(g, SAGAMU_CAST[12]!, 24, wave(1));
      break;
  }
  g.restore();
}

/* ----------------------------------------------------------- house fronts */

const FRONT_WALLS = ['#f1d9a6', '#e7b27a', '#e49a7e', '#a9b4e0', '#b9cf9a', '#f0c08e', '#d9c3e6', '#9fc8c0'] as const;
/** The window people: Ota's and Sagamu's casts. */
export const EXPRESSWAY_WINDOW_CAST: readonly FolkLook[] = [...OTA_CAST.slice(0, 8), ...SAGAMU_CAST.slice(5, 13)];

/**
 * One roadside house front (folkLane.ts FRONT_TILE units, bottom centre at the origin), Ogun's
 * own: a zinc roof edge with ridges, louvre windows with indigo frames, a laterite skirting, a
 * door open with a warm room or shut. Windows as Lagos's FrontWindow: a curtain, a person
 * leaning out or waving (two frames), or a rechargeable lantern's glow when the lamps are off.
 * `looks` default to Ogun's casts. No signs, no writing.
 */
export function drawExpresswayFront(g: G, opts: { wall?: number; windows: readonly [FrontWindow, FrontWindow]; door: 'open' | 'shut'; looks?: readonly FolkLook[] | undefined }): void {
  const n = Math.abs(Math.round(opts.wall ?? 0));
  const wall = FRONT_WALLS[n % 8]!;
  const look = (i: number): FolkLook => opts.looks?.[i] ?? EXPRESSWAY_WINDOW_CAST[(n * 3 + i * 5) % EXPRESSWAY_WINDOW_CAST.length]!;
  const box = (x: number, y: number, w: number, h: number, c: string, lw = 1.2): void => shape(g, () => g.rect(x, y, w, h), c, { line: lw, shade: 1.6, rim: 0.8 });
  g.save();
  box(-60, -96, 120, 96, wall);
  // Laterite skirting and a zinc roof edge
  box(-60, -10, 120, 10, OG.laterite);
  shape(g, () => poly(g, [-66, -96, 66, -96, 60, -106, -60, -106]), OG.zinc, { line: 1.4, shade: 1, rim: 0.6 });
  for (let x = -60; x < 60; x += 6) line(g, [x, -105, x - 1, -97], OG.zincDark, 0.8);
  if (opts.door === 'open') {
    box(-31, -46, 26, 36, '#ffd98a');
    box(-8, -44, 4, 34, '#7a5434', 0.6);
  } else {
    box(-31, -46, 26, 36, '#7a5434');
    line(g, [-27, -34, -9, -34, -27, -20, -9, -20], '#5b3a22', 1);
  }
  opts.windows.forEach((wnd, i) => {
    const x = i === 0 ? -50 : 8;
    const y = -86;
    const lit = wnd === 'glow';
    box(x, y, 34, 28, lit ? '#ffcf6a' : '#5d7684');
    g.save();
    g.beginPath();
    g.rect(x, y, 34, 28);
    g.clip();
    if (lit) {
      dot(g, x + 17, y + 18, 12, 'rgba(255,250,220,0.55)');
      dot(g, x + 17, y + 18, 6, 'rgba(255,252,235,0.9)');
      shape(g, () => g.rect(x + 14.4, y + 17, 5.2, 8), '#f6f4ee', { line: 0.6, shade: 0, rim: 0 });
    } else if (wnd === 'empty') {
      for (let k = 0; k < 6; k++) line(g, [x, y + 3 + k * 4.6, x + 34, y + 3 + k * 4.6], '#9fb6c6', 1.4);
    } else drawFolkBust(g, look(i), x + 17, y + 30, 0.95, wnd === 'wave0' ? 1 : wnd === 'wave1' ? 2 : 0);
    g.restore();
    g.strokeStyle = OG.indigo;
    g.lineWidth = 2.4;
    g.strokeRect(x - 1, y - 1, 36, 30);
    box(x - 3, y + 28, 40, 3.4, '#e9e1cf', 0.8);
  });
  // Side window on the ground floor (bright when the door is open)
  box(10, -42, 30, 20, opts.door === 'open' ? '#ffe7a8' : '#cfe9f5');
  g.restore();
}
export { FRONT_TILE };

/* ------------------------------------------------------------- bus stop */

/** The bus stop goal's box (lane units), a little wider than Lagos's for the arch. */
export const EXPRESSWAY_STOP_BOX: UBox = { l: -104, r: 130, t: -150, b: 6 };

/**
 * The bus stop goal under a small copy of the gateway arch (gatewayRoad.ts's drawMiniArch: faded,
 * then bright once reached): a shelter with a bench and people (one waving), a plain stop sign
 * with a bus picture, and a danfo waiting at the kerb. Lane units, ground centre at the origin;
 * place it on the right verge. `bright`: the goal is reached.
 */
export function drawExpresswayBusStop(g: G, t = 0, bright = false): void {
  g.save();
  g.lineCap = 'round';
  g.save();
  g.translate(-18, 0);
  g.scale(0.9, 0.9);
  drawLaneThing(g, 'danfo', { frame: 0 });
  g.restore();
  // Shelter and bench
  shape(g, () => g.rect(20, -60, 54, 44), '#bfe3f5', { line: 1.6, shade: 0, rim: 0 });
  for (const x of [20, 74]) shape(g, () => g.rect(x - 1.8, -66, 3.6, 66), '#5d6670', { line: 1.4 });
  shape(g, () => poly(g, [14, -66, 80, -66, 76, -76, 18, -76]), OG.indigo, { line: 1.8 });
  shape(g, () => g.rect(26, -20, 44, 4), '#8a5d36', { line: 1.2 });
  for (const [i, x] of [[0, 32], [1, 50], [2, 66]] as const) {
    g.save();
    g.translate(x, 0);
    g.scale(1.1, 1.1);
    drawFolkFrame(g, SAGAMU_CAST[13 + i]!, i === 1 ? (t === 0 ? 'wave0' : Math.floor(t * 3) % 2 ? 'wave1' : 'wave0') : i === 0 ? 'sit' : 'stand');
    g.restore();
  }
  // The arch over the stop: the gateway in small, its cog on the beam
  drawMiniArch(g, 10, 0, 5, bright);
  if (bright) dot(g, 10, -118, 30, 'rgba(255,226,140,0.35)');
  // A plain stop sign with a bus picture, no name
  shape(g, () => g.rect(116, -96, 3, 96), '#5d6670', { line: 1.4 });
  shape(g, () => g.roundRect(108, -114, 19, 19, 3), OG.indigo, { line: 1.6 });
  shape(g, () => g.roundRect(111.5, -110, 12, 8.6, 2), WHITE, { line: 0, shade: 0, rim: 0 });
  dot(g, 114, -100.6, 1.4, WHITE);
  dot(g, 121, -100.6, 1.4, WHITE);
  g.restore();
}

/* ---------------------------------------------------------------- baking */

/** The bake key of a vehicle look and its hazard frame. */
export function vehicleKey(kind: ExpresswayVehicle, frame = 0): string {
  return `${kind}#${((Math.round(frame) % 2) + 2) % 2}`;
}

/**
 * Lagos's ready-made things (bakeLaneThings: cones, potholes, crates, coins, bulbs, the goat...)
 * with Ogun's on top: every vehicle look in both hazard frames (vehicleKey), and Ogun's garri and
 * corn under their usual keys (laneKey). Bake near and far sizes when the run loads.
 */
export function bakeExpresswayThings(ppm: number): Map<string, Baked> {
  const out = bakeLaneThings(ppm);
  for (const kind of EXPRESSWAY_VEHICLES)
    for (const f of [0, 1]) {
      const b = bake(VEHICLE_BOX, ppm, (g) => drawExpresswayVehicle(g, kind, f === 1));
      if (b) out.set(vehicleKey(kind, f), b);
    }
  for (const k of ['garri', 'corn'] as const) {
    const b = bake(LANE_BOXES[k], ppm, (g) => drawExpresswayPickup(g, k));
    if (b) out.set(laneKey(k), b);
  }
  return out;
}

/** Ready-made scenery (one each) and the bus stop (dim and bright), keys as Lagos's ('busStop', 'busStopBright'). */
export function bakeExpresswayScenery(ppm: number): Map<string, Baked> {
  const out = new Map<string, Baked>();
  for (const k of EXPRESSWAY_SCENERY) {
    const b = bake(EXPRESSWAY_SCENERY_BOX, ppm, (g) => drawExpresswayScenery(g, k, 0));
    if (b) out.set(k, b);
  }
  for (const bright of [false, true]) {
    const b = bake(EXPRESSWAY_STOP_BOX, ppm, (g) => drawExpresswayBusStop(g, 0, bright));
    if (b) out.set(bright ? 'busStopBright' : 'busStop', b);
  }
  return out;
}

/* ------------------------------------------------------------ the demo frame */

/**
 * One whole Expressway frame live (for the gallery and qa, and as a guide for the lane view):
 * the sky, the road at `dist`, house fronts and scenery on both verges, lamps, a footbridge,
 * a tipper, a tanker and a danfo in the lanes, a few coins and a bulb. `still`: nothing waves.
 */
export function drawExpresswayDemo(g: G, w: number, h: number, dist: number, t: number, still = false): void {
  const v = laneView(w, h);
  drawExpresswaySky(g, w, v.horizonY);
  drawExpresswayRoad(g, v, dist);
  const tt = still ? 0 : t;
  const far = dist + LANE_CAMERA.ahead;
  const at = (x: number, d: number, draw: (gg: G) => void): void => {
    const p = project(v, x, d - dist);
    if (p) atScreen(g, p.x, p.y, p.ppm, draw);
  };
  // House fronts behind both verges, every 30 m
  for (let d = Math.floor(far / 30) * 30; d > dist; d -= 30)
    for (const side of [-1, 1] as const) {
      const x = side * (ROAD.half + ROAD.kerb + (side < 0 ? ROAD.divider : 0) + ROAD.pave + 3);
      at(x, d, (gg) => {
        gg.scale(1.7 / 37 * LANE_U, 1.7 / 37 * LANE_U);
        const r = Math.round(d / 30) + side;
        drawExpresswayFront(gg, { wall: r, windows: [r % 3 ? 'lean' : 'empty', r % 2 ? 'wave0' : 'empty'], door: 'open' });
      });
    }
  const b1 = Math.floor(far / 200) * 200;
  if (b1 > dist) drawFootbridge(g, v, b1 - dist);
  for (let d = Math.floor(far / 25) * 25; d > dist; d -= 25) {
    const i = Math.round(d / 25);
    const side = i % 2 === 0 ? 1 : -1;
    const x = side * (ROAD.half + ROAD.kerb + (side < 0 ? ROAD.divider : 0) + 2.6);
    at(x, d, (gg) => drawExpresswayScenery(gg, EXPRESSWAY_SCENERY[i % EXPRESSWAY_SCENERY.length]!, tt));
  }
  for (let d = Math.floor(far / 10) * 10; d > dist; d -= 10) {
    drawLaneLamp(g, v, d - dist, -1, 'on', t, still);
    drawLaneLamp(g, v, d - dist, 1, 'on', t, still);
  }
  const things: [number, number, ExpresswayVehicle][] = [[48, 0, 'tanker'], [36, 2, 'tipper'], [22, 1, 'danfo']];
  for (const [z, lane, kind] of things) at(laneCentre(lane), dist + z, (gg) => drawExpresswayVehicle(gg, kind, hazardFrame(t, still) === 1));
  for (let k = 0; k < 4; k++) {
    const p = project(v, laneCentre(2), 10 + k * 3, 0.6);
    if (p) drawLaneAt(g, 'coin', p.x, p.y, p.ppm, { frame: 2 });
  }
  const pb = project(v, laneCentre(0), 14, 0.8);
  if (pb) drawLaneAt(g, 'bulb', pb.x, pb.y, pb.ppm);
  const pg = project(v, laneCentre(1), 9, 0.8);
  if (pg) atScreen(g, pg.x, pg.y, pg.ppm, (gg) => drawExpresswayPickup(gg, 'garri'));
}
