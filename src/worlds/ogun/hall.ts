/**
 * Pothole Hall and King Pothole (art O5a; docs/ogun.md 2.3, 5.1 to 5.6 and 7; decision 78).
 * Drawn in code, our own. Lives in the lazy Ogun part: import it only from src/worlds/ogun/
 * (gamedev wires it in O5b).
 *
 * King Pothole is a problem, never a person (decision 78): a wide round pothole in the floor
 * with a face made of cracks (two muddy puddle eyes, a wobbly crack mouth) and a "crown" of
 * three little orange road cones standing on his back rim. Nothing else: no body, arms, beads,
 * beaded crown, staff, robes, throne, palace or title dress. He is grumpy and a bit vain, never
 * scary: no teeth, no red eyes, no fire. He loses in a funny way: filled up, he giggles, yawns
 * and falls asleep as a smooth new road.
 *
 * Pothole Hall is a roofed road works yard by the gateway: steel roof beams, 8 roof lamps (dark
 * until the finish), a laterite block wall with a granite-grey cladding band and an indigo
 * stripe, the road mix pile by the open left door, tools at rest (a spade, a wheelbarrow, a
 * gravel heap, striped barriers), big indigo sliding doors on the right with the expressway and
 * the gateway arch beyond, and our own little road roller (danfo yellow, a big friendly front
 * drum, no brand). The only writing: "POTHOLE HALL" and the bag's "READY" tag (OGUN_WORDS.hall).
 * No dome, tower, arch window, cross, crescent, carved figure, palace look or faith sign. Not a
 * real building. Nothing from any other game: no pipes, blocks, mushrooms or castle bricks.
 *
 * World space, the same room as Go-Slow Hall: x 0 to 560, floor y 300, the dark apron from 360.
 * Calls, in order (after g.translate(-camX, 0)):
 * 1. drawPotholeHall: the back (cached at screen pixels), the right doors and the outside, the
 *    dark before the lamps, the lit lamps and floor arrows.
 * 2. drawRoller (parked, or rolling at the finish), the door people (folk), drawRoadMixPile.
 * 3. drawKingPothole at his middle x, then mud patches (drawMudPatch), throws (gravel from
 *    sagamu.ts, drawMudBlob with drawMudShadow), drawPlop, fallen cones (drawCrownCone).
 * 4. the hero, then drawCarriedBag when carrying.
 * 5. drawPotholeHallFront: the cut walls.
 * Every moving thing takes `time`; pass `still` (reduced motion) and nothing moves.
 */
import { drawGateArch } from '../../art/ogunGate';
import { folkLook } from '../../art/folkCasts';
import type { FolkLook } from '../../art/folk';
import { heroHeadTop, type HeroLook, type HeroPose } from '../../art/hero';
import { INK, WHITE } from '../../art/palette';
import { drawCone } from '../../art/roadside';
import { blitLayer, type PixelLayer } from '../../art/street';
import type { Recipe } from '../../engine/sound';
import type { Tune } from '../../art/tunes';
import { OGUN_WORDS } from '../../screens/words';
import { drawMud, OTA_CAST } from './ota';
import { SAGAMU_TRADER_LOOKS } from './sagamu';
import { drawOgunTruck } from './city';
import { drawDanfoSide } from '../../art/road';

const TAU = Math.PI * 2;
type G = CanvasRenderingContext2D;

// ---------------------------------------------------------------- numbers

/** The room (as ogun-hall.json and Go-Slow Hall): every x is world u, floor y 300. */
export const POT_HALL = {
  w: 560,
  floorY: 300,
  apronY: 360,
  heroMinX: 30,
  heroMaxX: 530,
  wallL: 0,
  wallR: 566,
  wallThick: 14,
  /** The two roof beams (I-beams, cross braced between). */
  beamTop: 30,
  beamBottom: 62,
  /** The 8 roof lamps (x) and the bottom of their shades (y). */
  lamps: [35, 105, 175, 245, 315, 385, 455, 525] as readonly number[],
  lampY: 96,
  /** The open door on the left, where the hero walks in and the travellers wait. */
  leftDoor: { x0: 22, x1: 108, top: 192 },
  /** The "POTHOLE HALL" board over the left door. */
  sign: { x: 6, y: 156, w: 118, h: 26 },
  /** The big sliding doors on the right, onto the expressway. */
  rightDoors: { x0: 452, x1: 558, top: 142 },
  /** The road mix pile (x from, to) and where the ready bag sits on top. */
  pile: [60, 90] as readonly [number, number],
  bagX: 80,
  /** King Pothole: always this wide; his middle slides along the track. */
  pitW: 100,
  track: [230, 400] as readonly [number, number],
  startX: 400,
  /** The roller's parking place (behind the floor line). */
  rollerX: 500,
  /** The faded floor arrows (lit at the finish). */
  arrows: [130, 470] as readonly number[],
  arrowY: 330,
} as const;

/** Pothole Hall's colours (2.4: laterite, granite, indigo, with cream and danfo yellow). */
export const PH = {
  roof: '#5a5f6b',
  roofRib: '#4a4f5a',
  skylight: '#c9dde6',
  beam: '#6b7280',
  beamLight: '#959cab',
  wall: '#c9774f',
  wallDark: '#a95e3c',
  wallLine: 'rgba(60,20,10,0.16)',
  clad: '#a7a9ae',
  cladDark: '#8a8c92',
  indigo: '#2e3f8f',
  indigoLight: '#4b5fb8',
  floor: '#9c968c',
  floorTop: '#b5afa4',
  floorDark: '#857f75',
  arrowOff: '#c4bfb2',
  arrowOn: '#ffe066',
  laneFaded: '#d9c98a',
  apron: '#46423c',
  apronJoint: '#3a3732',
  outsideSky: '#bfe4f5',
  outsideRoad: '#5a5a5e',
  outsideVerge: '#d9b98a',
  door: '#34479a',
  doorDark: '#27377a',
  doorRib: '#5a6cc4',
  sign: '#2e3f8f',
  outerWall: '#c08b66',
  outerWallDark: '#9f6f4f',
  shadeOff: '#3a4048',
  bulbOff: '#8f8c84',
  bulbOn: '#fff4c0',
  glow: 'rgba(255,226,140,0.22)',
  dim: '#141a33',
  // King Pothole
  rim: '#5f5a52',
  rimLight: '#8b857a',
  earth: '#8a5a3a',
  earthDark: '#5e3a24',
  deep: '#24201e',
  puddle: '#6b5440',
  puddleShine: '#b9a58b',
  pebble: '#2a1d14',
  crack: '#2a2420',
  tarmac: '#3b3b40',
  tarmacLight: '#55555c',
  cheek: '#a3714f',
  // Bags, the pad, the roller
  sack: '#efe7d2',
  sackWeave: '#c9bfa6',
  sackTie: '#7a5b3a',
  tag: '#fff6c8',
  padA: '#e0572b',
  padB: '#2f6fd6',
  roller: '#f2c230',
  rollerDark: '#c99a12',
  drum: '#7d8590',
  drumLight: '#aab1bb',
  mudBlob: '#6e4a2c',
  mudShine: '#b98f62',
  dust: '#d9cbb0',
} as const;

/** The only writing in the hall: its own made-up name, and the ready bag's tag. */
export const POT_HALL_SIGN = OGUN_WORDS.hall.sign;
export const POT_BAG_TAG = OGUN_WORDS.hall.bagTag;

const num = (t: number): number => (Number.isFinite(t) ? t : 0);
function clamp01(k: number): number {
  return Number.isFinite(k) ? Math.min(1, Math.max(0, k)) : 0;
}
function ease(k: number): number {
  const u = clamp01(k);
  return u * u * (3 - 2 * u);
}
function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function rect(g: G, x: number, y: number, w: number, h: number, fill: string): void {
  g.fillStyle = fill;
  g.fillRect(x, y, w, h);
}
function inkRect(g: G, x: number, y: number, w: number, h: number, fill: string, lw = 1.2, r = 0): void {
  g.fillStyle = fill;
  g.strokeStyle = INK;
  g.lineWidth = lw;
  g.beginPath();
  if (r) g.roundRect(x, y, w, h, r);
  else g.rect(x, y, w, h);
  g.fill();
  g.stroke();
}
function blob(g: G, x: number, y: number, r: number, fill: string): void {
  g.fillStyle = fill;
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fill();
}
function line(g: G, pts: readonly number[], w: number, stroke = INK): void {
  g.strokeStyle = stroke;
  g.lineWidth = w;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  for (let i = 0; i < pts.length; i += 2) {
    if (i === 0) g.moveTo(pts[0]!, pts[1]!);
    else g.lineTo(pts[i]!, pts[i + 1]!);
  }
  g.stroke();
}

/** A right-pointing floor arrow centred on (x, y). */
function arrowPath(g: G, x: number, y: number, s = 1): void {
  g.beginPath();
  g.moveTo(x - 18 * s, y - 3 * s);
  g.lineTo(x + 4 * s, y - 3 * s);
  g.lineTo(x + 4 * s, y - 8 * s);
  g.lineTo(x + 18 * s, y);
  g.lineTo(x + 4 * s, y + 8 * s);
  g.lineTo(x + 4 * s, y + 3 * s);
  g.lineTo(x - 18 * s, y + 3 * s);
  g.closePath();
}

// ---------------------------------------------------------------- the finish (5.5)

/** Seconds from the third bag. */
export const POTHOLE_FINISH = {
  fillTo: 1.2,
  yawn: 1.2,
  coneTip: 1.2,
  rollerOut: 1.8,
  rollerOver: 2.15,
  rollerBack: 2.4,
  rollerParked: 3.3,
  toot: 2.4,
  smooth: 2.4,
  arrowsPaint: 0.4,
  smileFor: 1.0,
  lampsFrom: 3.0,
  lampGap: 0.15,
  doorsFrom: 3.6,
  doorsSwing: 0.6,
  gateLit: 4.2,
  cheer: 4.5,
  winScreen: 6.0,
} as const;

/** When each roof lamp clicks on, seconds from the third bag (3.0 to 4.05): play 'hallLamp' at each. */
export function potholeLampTimes(): number[] {
  return POT_HALL.lamps.map((_, i) => POTHOLE_FINISH.lampsFrom + i * POTHOLE_FINISH.lampGap);
}

export type PotholeMood = 'calm' | 'cross' | 'watch' | 'gulp' | 'hit' | 'giggle' | 'yawn' | 'sleep' | 'smooth';

export interface PotholeFinish {
  /** How full he is, from `from` to 1 (pass it to drawKingPothole's fill). */
  fill: number;
  mood: PotholeMood;
  /** The last cone tipping off, 0 to 1 (draw it with crownConeTip). */
  coneTip: number;
  /** The new road: 0 a patch of fresh tarmac, 1 smooth with its lane arrow painted. */
  smooth: number;
  /** The sleepy smile in the paint, 0 to 1 (it shows for 1 s, then fades). */
  smile: number;
  roller: RollerAt;
  lamps: number[];
  doors: number;
  gateLit: boolean;
  cheer: boolean;
}

export interface RollerAt {
  x: number;
  facing: 1 | -1;
  /** The front drum's turn (radians). */
  drum: number;
  /** The toot, 0 to 1 while it sounds; play 'rollerToot' when it starts. */
  toot: number;
}

/**
 * The finish at t seconds from the third bag, for a pit whose middle is at `pitX` and was
 * `from` full. Still (reduced motion): the roller stays parked and the doors jump open; the
 * lamps still come on one by one (light, not motion), and the patch turns smooth at once.
 */
export function potholeFinishAt(t: number, pitX: number, from = 0.45, still = false): PotholeFinish {
  const F = POTHOLE_FINISH;
  const tt = num(t);
  const px = Number.isFinite(pitX) ? pitX : POT_HALL.startX;
  const mood: PotholeMood = tt < F.yawn ? 'giggle' : tt < F.rollerOut ? 'yawn' : tt < F.smooth ? 'sleep' : 'smooth';
  const fill = still ? 1 : clamp01(from) + (1 - clamp01(from)) * ease(tt / F.fillTo);
  const roller = still ? { x: POT_HALL.rollerX, facing: -1 as const, drum: 0, toot: 0 } : rollerAt(tt, px);
  const doorK = (tt - F.doorsFrom) / F.doorsSwing;
  return {
    fill,
    mood,
    coneTip: still ? (tt >= F.coneTip ? 1 : 0) : clamp01((tt - F.coneTip) / 0.4),
    smooth: still ? (tt >= F.smooth ? 1 : 0) : clamp01((tt - F.smooth) / F.arrowsPaint),
    smile: tt >= F.smooth && tt < F.smooth + F.smileFor + 0.5 ? (tt < F.smooth + F.smileFor ? 1 : 1 - (tt - F.smooth - F.smileFor) / 0.5) : 0,
    roller,
    lamps: potholeLampTimes().map((at) => tt - at),
    doors: still ? (doorK >= 0 ? 1 : 0) : ease(doorK),
    gateLit: tt >= F.gateLit,
    cheer: tt >= F.cheer,
  };
}

/** The roller's happy lap: out from its place to the patch, over it and back, then home. */
function rollerAt(t: number, pitX: number): RollerAt {
  const F = POTHOLE_FINISH;
  const home = POT_HALL.rollerX;
  const far = pitX - POT_HALL.pitW / 2 - 6;
  let x = home;
  let facing: 1 | -1 = -1;
  if (t >= F.rollerOut && t < F.rollerBack) {
    // Out and over the patch, leftwards
    x = home + (far - home) * ease((t - F.rollerOut) / (F.rollerBack - F.rollerOut));
  } else if (t >= F.rollerBack && t < F.rollerParked) {
    x = far + (home - far) * ease((t - F.rollerBack) / (F.rollerParked - F.rollerBack));
    facing = 1;
  }
  // The drum turns as far as the roller has rolled (r 15)
  const drum = (x - home) / 15;
  const toot = t >= F.toot && t < F.toot + 0.5 ? (t - F.toot) / 0.5 : 0;
  return { x, facing, drum, toot };
}

// ---------------------------------------------------------------- the back of the hall (cached)

const TOP = -80;

/** A spade leaning on the wall (a plain tool, OG-R1). */
function spade(g: G, x: number, base: number): void {
  g.save();
  g.translate(x, base);
  g.rotate(0.18);
  inkRect(g, -1.5, -56, 3, 44, '#8a5a2b', 0.8);
  inkRect(g, -4, -60, 8, 4, '#8a5a2b', 0.8, 1.5);
  g.fillStyle = '#9aa3ad';
  g.beginPath();
  g.moveTo(-6, -13);
  g.lineTo(6, -13);
  g.lineTo(5, -2);
  g.quadraticCurveTo(0, 2, -5, -2);
  g.closePath();
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.stroke();
  g.restore();
}

/** A wheelbarrow of granite gravel resting by the wall. */
function barrow(g: G, x: number, base: number): void {
  line(g, [x - 22, base - 20, x - 34, base - 12], 2.4, '#6b4a2b');
  g.fillStyle = '#3d8f8a';
  g.beginPath();
  g.moveTo(x - 24, base - 26);
  g.lineTo(x + 14, base - 26);
  g.lineTo(x + 6, base - 10);
  g.lineTo(x - 18, base - 10);
  g.closePath();
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 1.2;
  g.stroke();
  for (let i = 0; i < 9; i++) blob(g, x - 18 + i * 4, base - 27 - (i % 3) * 1.6, 2.4, i % 2 ? '#8e8a86' : '#b3aea8');
  blob(g, x + 8, base - 6, 6, INK);
  blob(g, x + 8, base - 6, 3.5, '#8f8c84');
  line(g, [x - 14, base - 10, x - 16, base], 2, INK);
}

/** A striped barrier board on two feet (road works, orange and white). */
function barrier(g: G, x: number, base: number, w: number): void {
  for (const lx of [x + 4, x + w - 6]) inkRect(g, lx, base - 26, 2.5, 26, '#7a7f88', 0.8);
  g.save();
  g.beginPath();
  g.rect(x, base - 26, w, 9);
  g.fillStyle = WHITE;
  g.fill();
  g.clip();
  g.fillStyle = '#f26b1d';
  for (let sx = x - 9; sx < x + w; sx += 12) {
    g.beginPath();
    g.moveTo(sx, base - 17);
    g.lineTo(sx + 6, base - 26);
    g.lineTo(sx + 12, base - 26);
    g.lineTo(sx + 6, base - 17);
    g.closePath();
    g.fill();
  }
  g.restore();
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.strokeRect(x, base - 26, w, 9);
}

/** A heap of granite chippings. */
function gravelHeap(g: G, x: number, base: number, w: number): void {
  g.fillStyle = '#8e8a86';
  g.beginPath();
  g.moveTo(x - w / 2, base);
  g.quadraticCurveTo(x, base - w * 0.7, x + w / 2, base);
  g.closePath();
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.stroke();
  for (let i = 0; i < 14; i++) {
    const k = hash(i + x);
    const dx = (k - 0.5) * w * 0.8;
    const top = base - (w * 0.34) * (1 - Math.abs(dx) / (w / 2)) * 0.95;
    blob(g, x + dx, top + hash(i * 3 + x) * (base - top), 1.6, i % 2 ? '#b3aea8' : '#6f6b67');
  }
}

function paintBack(g: G, x0: number, viewH: number): void {
  const H = POT_HALL;
  const L = H.wallL;
  const R = H.wallR;
  const fy = H.floorY;
  g.save();
  g.translate(-x0, -TOP);
  // Roof underside: corrugated sheets with a row of clear panels letting in daylight
  rect(g, L, TOP, R - L, H.beamBottom - TOP + 30, PH.roof);
  g.fillStyle = PH.roofRib;
  for (let x = L; x < R; x += 9) g.fillRect(x, TOP, 3.5, H.beamTop - TOP);
  g.fillStyle = PH.skylight;
  for (let x = L + 20; x < R - 30; x += 92) g.fillRect(x, TOP + 30, 44, 50);
  // Back wall: granite-grey cladding above an indigo stripe, laterite block wall below
  rect(g, L, H.beamTop + 8, R - L, fy - H.beamTop - 8, PH.wall);
  rect(g, L, H.beamTop + 8, R - L, 82, PH.clad);
  g.fillStyle = PH.cladDark;
  for (let x = L + 4; x < R; x += 12) g.fillRect(x, H.beamTop + 8, 2, 82);
  rect(g, L, H.beamTop + 90, R - L, 8, PH.indigo);
  rect(g, L, H.beamTop + 92, R - L, 2, PH.indigoLight);
  g.fillStyle = PH.wallLine;
  for (let y = 142, row = 0; y < fy; y += 13, row++) {
    g.fillRect(L, y, R - L, 1.2);
    for (let x = L + (row % 2) * 18; x < R; x += 36) g.fillRect(x, y, 1.2, 13);
  }
  rect(g, L, fy - 14, R - L, 14, PH.wallDark);
  // Steel posts up to the beams, with the yellow and black striped foot of a works yard
  for (const x of [148, 300]) {
    inkRect(g, x - 5, H.beamBottom, 10, fy - H.beamBottom, PH.beam, 1);
    rect(g, x - 5, H.beamBottom, 3, fy - H.beamBottom, PH.beamLight);
    g.save();
    g.beginPath();
    g.rect(x - 5, fy - 20, 10, 20);
    g.fillStyle = '#f2c230';
    g.fill();
    g.clip();
    g.strokeStyle = INK;
    g.lineWidth = 2.4;
    g.beginPath();
    for (let k = -2; k < 4; k++) {
      g.moveTo(x - 5, fy - 20 + k * 7);
      g.lineTo(x + 5, fy - 20 + k * 7 + 10);
    }
    g.stroke();
    g.restore();
  }
  // Tools at rest along the wall (behind the walking line)
  gravelHeap(g, 196, fy, 46);
  spade(g, 226, fy);
  barrier(g, 236, fy, 46);
  barrow(g, 340, fy);
  barrier(g, 372, fy, 40);
  spade(g, 420, fy);
  // Left door: open, the street outside in daylight
  const d = H.leftDoor;
  rect(g, d.x0, d.top, d.x1 - d.x0, fy - d.top, PH.outsideSky);
  rect(g, d.x0, fy - 52, d.x1 - d.x0, 26, PH.outsideVerge);
  rect(g, d.x0, fy - 26, d.x1 - d.x0, 26, PH.outsideRoad);
  g.fillStyle = '#f4f1e6';
  for (let x = d.x0 + 4; x < d.x1; x += 22) g.fillRect(x, fy - 14, 10, 2);
  // A palm far off across the road
  g.fillStyle = '#6b4a2b';
  g.fillRect(d.x0 + 60, fy - 86, 3, 36);
  g.strokeStyle = '#4f7a35';
  g.lineWidth = 3;
  g.beginPath();
  for (const a of [-2.7, -2.1, -1.1, -0.45]) {
    g.moveTo(d.x0 + 61.5, fy - 86);
    g.quadraticCurveTo(d.x0 + 61.5 + Math.cos(a) * 10, fy - 98, d.x0 + 61.5 + Math.cos(a) * 16, fy - 86 + Math.sin(a + 0.6) * -4);
  }
  g.stroke();
  inkRect(g, d.x0 - 4, d.top - 10, d.x1 - d.x0 + 8, 10, PH.beam, 1);
  inkRect(g, d.x0 - 4, d.top, 4, fy - d.top, PH.beam, 1);
  inkRect(g, d.x1, d.top, 4, fy - d.top, PH.beam, 1);
  // The hall's name board over the left door
  const s = H.sign;
  inkRect(g, s.x, s.y, s.w, s.h, PH.sign, 1.4, 2);
  g.strokeStyle = WHITE;
  g.lineWidth = 1.2;
  g.strokeRect(s.x + 3, s.y + 3, s.w - 6, s.h - 6);
  g.fillStyle = WHITE;
  g.font = 'bold 11px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(POT_HALL_SIGN, s.x + s.w / 2, s.y + s.h / 2 + 0.5, s.w - 12);
  // Right doorway frame (the doors and the outside are drawn live)
  const r = H.rightDoors;
  inkRect(g, r.x0 - 6, r.top - 9, r.x1 - r.x0 + 12, 9, PH.beam, 1.2);
  // Roof beams: two I-beams the whole width, cross braced between
  g.strokeStyle = PH.beam;
  g.lineWidth = 1.8;
  g.beginPath();
  for (let x = L; x < R; x += 46) {
    g.moveTo(x, H.beamTop + 3);
    g.lineTo(x + 46, H.beamBottom - 3);
    g.moveTo(x + 46, H.beamTop + 3);
    g.lineTo(x, H.beamBottom - 3);
  }
  g.stroke();
  for (const y of [H.beamTop, H.beamBottom]) {
    inkRect(g, L, y - 4, R - L, 8, PH.beam, 1);
    rect(g, L, y - 4, R - L, 2, PH.beamLight);
  }
  // Roof lamps, dark: a rod and a wide steel shade each
  for (const x of H.lamps) {
    rect(g, x - 1, H.beamBottom + 4, 2, H.lampY - H.beamBottom - 16, PH.beam);
    g.beginPath();
    g.moveTo(x - 4, H.lampY - 12);
    g.lineTo(x + 4, H.lampY - 12);
    g.lineTo(x + 13, H.lampY);
    g.lineTo(x - 13, H.lampY);
    g.closePath();
    g.fillStyle = PH.shadeOff;
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = 1.1;
    g.stroke();
    g.fillStyle = PH.bulbOff;
    g.beginPath();
    g.arc(x, H.lampY + 1, 3.5, 0, Math.PI);
    g.fill();
  }
  // Concrete floor with a faded lane line, joints and faded arrows
  rect(g, L, fy, R - L, H.apronY - fy, PH.floor);
  rect(g, L, fy, R - L, 4, PH.floorTop);
  g.fillStyle = PH.laneFaded;
  for (let x = L + 6; x < R; x += 30) g.fillRect(x, fy + 8, 18, 2.5);
  g.fillStyle = PH.floorDark;
  for (let x = L + 70; x < R; x += 70) g.fillRect(x, fy + 4, 1.5, H.apronY - fy - 4);
  for (let i = 0; i < 14; i++) g.fillRect(L + hash(i) * (R - L - 8), fy + 16 + hash(i + 30) * 36, 6, 1.5);
  for (const x of H.arrows) {
    arrowPath(g, x, H.arrowY);
    g.fillStyle = PH.arrowOff;
    g.fill();
  }
  // Apron strip: plain and darker, so the buttons and the hint bar read on it
  rect(g, L - 40, H.apronY, R - L + 80, viewH - H.apronY, PH.apron);
  g.fillStyle = PH.apronJoint;
  g.fillRect(L - 40, H.apronY, R - L + 80, 3);
  for (let x = L; x < R + 40; x += 70) g.fillRect(x, H.apronY, 2, viewH - H.apronY);
  g.restore();
}

const backLayer = { layer: null as PixelLayer | null };

// ---------------------------------------------------------------- live layers

/**
 * O6b (ogun.md part 7): once the doors are open, a danfo and then a tipper roll out through them
 * onto the expressway (seconds since they could go; none with reduced motion). Our own plain
 * vehicles, no writing; the danfo's windows show its passengers' heads.
 */
export const ROLL_OUT = { speed: 70, gap: 1.1, from: -60 } as const;
function drawRollOut(g: G, t: number): void {
  const r = POT_HALL.rightDoors;
  const fy = POT_HALL.floorY;
  const x = r.x0 + ROLL_OUT.from + t * ROLL_OUT.speed;
  if (x < r.x1 + 40) {
    drawDanfoSide(g, x, fy - 8, false, 0.9);
    g.fillStyle = '#5b3a22';
    for (let k = 0; k < 3; k++) {
      g.beginPath();
      g.arc(x - 14.5 + k * 8, fy - 8 - 17 * 0.9 + 1, 1.8, 0, TAU);
      g.fill();
    }
  }
  const x2 = x - ROLL_OUT.gap * ROLL_OUT.speed;
  if (x2 > r.x0 - 40 && x2 < r.x1 + 40) drawOgunTruck(g, x2, fy - 16, 'e', 'tipper');
}

/** The outside through the right doors: the expressway, and the gateway arch beyond (lit at the finish). */
function drawOutside(g: G, lit: boolean, time: number, still: boolean, rollOut = -1): void {
  const r = POT_HALL.rightDoors;
  const fy = POT_HALL.floorY;
  g.save();
  g.beginPath();
  g.rect(r.x0, r.top, r.x1 - r.x0, fy - r.top);
  g.clip();
  rect(g, r.x0, r.top, r.x1 - r.x0, fy - r.top, PH.outsideSky);
  rect(g, r.x0, fy - 58, r.x1 - r.x0, 30, PH.outsideVerge);
  drawGateArch(g, (r.x0 + r.x1) / 2, fy - 30, 0.42, { face: 'back', lit, time, still });
  rect(g, r.x0, fy - 30, r.x1 - r.x0, 30, PH.outsideRoad);
  g.fillStyle = '#f4f1e6';
  for (let x = r.x0 + 4; x < r.x1; x += 24) g.fillRect(x, fy - 16, 12, 2);
  if (!still && rollOut >= 0) drawRollOut(g, rollOut);
  g.restore();
}

/** The two sliding doors: 0 shut, 1 slid fully open behind the wall. */
function drawRightDoors(g: G, open: number): void {
  const r = POT_HALL.rightDoors;
  const fy = POT_HALL.floorY;
  const half = (r.x1 - r.x0) / 2;
  const k = clamp01(open);
  const w = half * (1 - k * 0.9);
  for (const side of [-1, 1] as const) {
    const x = side < 0 ? r.x0 : r.x1 - w;
    inkRect(g, x, r.top, w, fy - r.top, PH.door, 1.3);
    if (w > 10) {
      g.fillStyle = PH.doorRib;
      for (let rx = x + 6; rx < x + w - 3; rx += 9) g.fillRect(rx, r.top + 6, 1.5, fy - r.top - 12);
      g.fillStyle = PH.doorDark;
      g.fillRect(x + 2, fy - 40, w - 4, 6);
    }
  }
}

function drawLitLamp(g: G, x: number, age: number): void {
  const H = POT_HALL;
  const y = H.lampY;
  g.fillStyle = PH.glow;
  g.beginPath();
  g.moveTo(x - 12, y);
  g.lineTo(x + 12, y);
  g.lineTo(x + 34, H.floorY);
  g.lineTo(x - 34, H.floorY);
  g.closePath();
  g.fill();
  g.beginPath();
  g.ellipse(x, H.floorY + 3, 34, 4, 0, 0, TAU);
  g.fill();
  const flash = age < 0.12 ? 1 - age / 0.12 : 0;
  g.fillStyle = 'rgba(255,240,180,0.35)';
  g.beginPath();
  g.arc(x, y + 2, 14 + flash * 8, 0, TAU);
  g.fill();
  g.fillStyle = PH.bulbOn;
  g.beginPath();
  g.arc(x, y + 1, 4, 0, Math.PI);
  g.fill();
}

export interface PotholeHallLook {
  /** Seconds each roof lamp has been on (8 entries); below 0 or missing is off. */
  lamps?: readonly number[] | undefined;
  /** Right doors: 0 shut, 1 open. */
  doors?: number | undefined;
  /** The gateway arch beyond is lit and its cog turns. */
  gateLit?: boolean | undefined;
  /** O6b: seconds since the doors were open (the danfo and the tipper roll out); unset: none. */
  rollOut?: number | undefined;
  /** Floor arrows lit, 0 to 1. */
  arrows?: number | undefined;
  time?: number | undefined;
  still?: boolean | undefined;
}

/**
 * The back of Pothole Hall, world space (after g.translate(-camX, 0)). viewH is the bottom of the
 * screen in world units. The still parts are painted once at screen pixels and copied each
 * frame. Dark before the win (a deep blue dim); every lamp on, a warm wash.
 */
export function drawPotholeHall(g: G, camX: number, viewW: number, viewH = 420, look: PotholeHallLook = {}): void {
  const H = POT_HALL;
  const bottom = Number.isFinite(viewH) ? Math.max(viewH, H.apronY + 1) : 420;
  const x0 = H.wallL - 40;
  const w = H.wallR - x0 + 40;
  void camX;
  void viewW;
  const time = num(look.time ?? 0);
  const still = look.still === true;
  const doors = clamp01(look.doors ?? 0);
  if (!blitLayer(g, backLayer, `phall|${bottom}`, x0, TOP, w, bottom - TOP, (cg) => paintBack(cg, x0, bottom))) {
    g.save();
    g.translate(x0, TOP);
    paintBack(g, x0, bottom);
    g.restore();
  }
  if (doors > 0) drawOutside(g, look.gateLit === true, time, still, look.rollOut ?? -1);
  drawRightDoors(g, doors);
  const lamps = look.lamps ?? [];
  const on = H.lamps.filter((_, i) => (lamps[i] ?? -1) >= 0).length;
  const dim = 0.3 * (1 - on / H.lamps.length);
  if (dim > 0.001) {
    g.globalAlpha = dim;
    g.fillStyle = PH.dim;
    g.fillRect(H.wallL, TOP, H.wallR - H.wallL, H.apronY - TOP);
    g.globalAlpha = 1;
  } else if (on > 0) {
    g.globalAlpha = 0.08;
    g.fillStyle = '#ffd36b';
    g.fillRect(H.wallL, TOP, H.wallR - H.wallL, H.apronY - TOP);
    g.globalAlpha = 1;
  }
  H.lamps.forEach((x, i) => {
    const age = lamps[i] ?? -1;
    if (Number.isFinite(age) && age >= 0) drawLitLamp(g, x, age);
  });
  const lit = clamp01(look.arrows ?? 0) * H.arrows.length;
  H.arrows.forEach((x, i) => {
    const k = clamp01(lit - i);
    if (k <= 0) return;
    const pulse = still ? 1 : 0.85 + 0.15 * Math.sin(time * 4 - i * 0.7);
    g.globalAlpha = k * 0.35 * pulse;
    g.fillStyle = PH.arrowOn;
    g.beginPath();
    g.ellipse(x, H.arrowY, 26, 11, 0, 0, TAU);
    g.fill();
    g.globalAlpha = k;
    arrowPath(g, x, H.arrowY);
    g.fillStyle = PH.arrowOn;
    g.fill();
    g.strokeStyle = '#b88a10';
    g.lineWidth = 1;
    g.stroke();
    g.globalAlpha = 1;
  });
}

function paintSide(g: G, x0: number, w: number, side: -1 | 1, viewH: number): void {
  const H = POT_HALL;
  const fy = H.floorY;
  g.save();
  g.translate(-x0, -TOP);
  rect(g, x0, TOP, w, fy - TOP, PH.outerWall);
  g.fillStyle = PH.outerWallDark;
  for (let y = 40, row = 0; y < fy; y += 16, row++) {
    g.fillRect(x0, y, w, 1.5);
    for (let x = Math.floor(x0 / 48) * 48 + (row % 2) * 24; x < x0 + w; x += 48) g.fillRect(x, y, 1.5, 16);
  }
  rect(g, x0, 226, w, 8, PH.indigo);
  rect(g, x0, TOP, w, H.beamTop + 8 - TOP, PH.roof);
  rect(g, x0, fy, w, H.apronY - fy, '#b9ad98');
  rect(g, x0, fy, w, 4, '#cfc4b0');
  rect(g, x0, H.apronY, w, viewH - H.apronY, PH.apron);
  const wx = side < 0 ? H.wallL - H.wallThick : H.wallR;
  inkRect(g, wx, H.beamTop - 6, H.wallThick, fy - H.beamTop + 6, PH.outerWallDark, 1.4);
  rect(g, wx + 1, H.beamTop + 90, H.wallThick - 2, 8, PH.indigo);
  g.restore();
}

const leftLayer = { layer: null as PixelLayer | null };
const rightLayer = { layer: null as PixelLayer | null };

/** In front of everything but the HUD: the cut walls and, on wide screens, the outside walls. */
export function drawPotholeHallFront(g: G, camX: number, viewW: number, viewH = 420): void {
  const H = POT_HALL;
  const bottom = Number.isFinite(viewH) ? Math.max(viewH, H.apronY + 1) : 420;
  const cx = num(camX);
  const vw = Number.isFinite(viewW) ? viewW : H.w;
  const leftFrom = Math.min(H.wallL - H.wallThick, Math.floor((cx - 8) / 64) * 64);
  const rightTo = Math.max(H.wallR + H.wallThick, Math.ceil((cx + vw + 8) / 64) * 64);
  const pieces: [typeof leftLayer, number, number, -1 | 1][] = [
    [leftLayer, leftFrom, H.wallL - leftFrom, -1],
    [rightLayer, H.wallR, rightTo - H.wallR, 1],
  ];
  for (const [slot, x0, w, side] of pieces) {
    if (!(w > 0)) continue;
    const paint = (cg: G): void => paintSide(cg, x0, w, side, bottom);
    if (!blitLayer(g, slot, `phs|${side}|${x0}|${w}|${bottom}`, x0, TOP, w, bottom - TOP, paint)) {
      g.save();
      g.translate(x0, TOP);
      paint(g);
      g.restore();
    }
  }
}

// ---------------------------------------------------------------- King Pothole

export interface PotholeLook {
  mood?: PotholeMood | undefined;
  /** How full of tarmac, 0 (deep) to 1 (level with the floor). Hits: 0, 0.22, 0.44; the finish to 1. */
  fill?: number | undefined;
  /** Cones still on his crown, 3 to 0 (the left one goes first). */
  cones?: number | undefined;
  /** The gulp's build, 0 to 1 over the 0.5 s warning (rim puffs, eyes squint, dust rises). */
  gulp?: number | undefined;
  /** The "hmph" bump, 0 to 1 just after he stops short of a standing hero (a little shudder). */
  bump?: number | undefined;
  /** The new road (finish): 0 a fresh patch, 1 smooth with its lane arrow. */
  smooth?: number | undefined;
  /** The sleepy smile in the paint, 0 to 1. */
  smile?: number | undefined;
  /** The last cone tipping off at the yawn, 0 to 1. */
  coneTip?: number | undefined;
  time?: number | undefined;
  still?: boolean | undefined;
}

/** How full he looks after each bag (his opening stays 100 wide). */
export const POTHOLE_FILL = [0, 0.22, 0.44] as const;

/** Where his three crown cones stand on his back rim (dx from his middle), how big and how tipped. */
export const CROWN_CONES: readonly { dx: number; s: number; tilt: number }[] = [
  { dx: -24, s: 0.8, tilt: -0.22 },
  { dx: 0, s: 0.95, tilt: 0 },
  { dx: 24, s: 0.8, tilt: 0.22 },
];

/** One road cone at (x, y), size s, tipped by `tilt` radians round its base. */
export function drawCrownCone(g: G, x: number, y: number, s = 1, tilt = 0): void {
  g.save();
  g.translate(x, y);
  g.rotate(tilt);
  g.scale(s, s);
  drawCone(g, 0, 0);
  g.restore();
}

/**
 * A cone knocked off his crown on a hit, k 0 to 1 over about 0.8 s: it hops up, lands on its
 * side and rolls 40 u away (dir -1 left, 1 right). Returns where to draw it (drawCrownCone).
 * Still: it is already lying at the side.
 */
export function crownConeFall(k: number, dir: 1 | -1, still = false): { dx: number; dy: number; tilt: number } {
  const u = still ? 1 : clamp01(k);
  const hop = u < 0.4 ? Math.sin((u / 0.4) * Math.PI) * 18 : 0;
  const roll = u > 0.4 ? (u - 0.4) * 2.5 : 0;
  return { dx: dir * 40 * ease(u), dy: -hop, tilt: dir * ((Math.PI / 2) * ease(u / 0.4) + roll) };
}

/** The crack face: brows, puddle eyes and the wobbly mouth, centred on (0, 0), fit to `h` u of room. */
function face(g: G, mood: PotholeMood, h: number, t: number, still: boolean, gulp: number): void {
  const s = Math.max(0.6, Math.min(1.15, h / 46));
  g.save();
  g.scale(s, s);
  const wob = still ? 0 : Math.sin(t * 3) * 0.8;
  const eyeY = -8;
  const shut = mood === 'giggle' || mood === 'sleep' || mood === 'smooth';
  const squint = mood === 'gulp' ? 0.35 + 0.4 * (1 - gulp) : mood === 'cross' ? 0.7 : mood === 'yawn' ? 0.45 : 1;
  const wide = mood === 'watch' || mood === 'hit';
  // Brows: short cracks over each eye (cross: angled down to the middle; watch and hit: raised)
  const browTilt = mood === 'cross' || mood === 'gulp' ? 4 : wide ? -3 : mood === 'calm' ? 1.5 : -1;
  const browY = eyeY - (wide ? 13 : 10);
  for (const sx of [-1, 1] as const) {
    line(g, [sx * 22, browY - browTilt, sx * 14, browY - browTilt * 0.2, sx * 7, browY + browTilt], 2.2, PH.crack);
  }
  // Eyes: muddy puddles with a shine and a pebble pupil (shut: happy or sleepy arcs)
  for (const sx of [-1, 1] as const) {
    const ex = sx * 14;
    if (shut) {
      g.strokeStyle = PH.crack;
      g.lineWidth = 2.2;
      g.beginPath();
      if (mood === 'giggle') g.arc(ex, eyeY + 2, 5, Math.PI * 1.1, Math.PI * 1.9);
      else g.arc(ex, eyeY - 2, 5, Math.PI * 0.15, Math.PI * 0.85);
      g.stroke();
      continue;
    }
    const rx = wide ? 7.5 : 7;
    const ry = (wide ? 7 : 5.2) * squint;
    g.fillStyle = PH.puddle;
    g.beginPath();
    g.ellipse(ex, eyeY, rx, Math.max(1.2, ry), 0, 0, TAU);
    g.fill();
    g.strokeStyle = PH.crack;
    g.lineWidth = 1.4;
    g.stroke();
    if (ry > 2) {
      const look = mood === 'watch' ? -1.5 : sx * -1;
      blob(g, ex + look + 1, eyeY + 0.5, wide ? 2.6 : 2.2, PH.pebble);
      g.strokeStyle = PH.puddleShine;
      g.lineWidth = 1;
      g.beginPath();
      g.ellipse(ex - 2, eyeY - ry * 0.4, rx * 0.45, ry * 0.25, 0, Math.PI, TAU);
      g.stroke();
    }
  }
  // Puffed cheeks when full and giggling, or puffing for a gulp
  if (mood === 'giggle' || (mood === 'gulp' && gulp > 0.3)) {
    for (const sx of [-1, 1] as const) {
      g.fillStyle = PH.cheek;
      g.globalAlpha = 0.55;
      g.beginPath();
      g.ellipse(sx * 26, 4, 6, 4.5, 0, 0, TAU);
      g.fill();
      g.globalAlpha = 1;
    }
  }
  // Mouth: a wobbly crack (calm), a zigzag frown (cross), a small O (hit, watch, gulp), a giggle, a yawn
  const my = 10;
  if (mood === 'calm') {
    line(g, [-14, my + 1, -7, my - 1 + wob * 0.5, 0, my + 1.5, 7, my - 0.5 - wob * 0.5, 14, my + 1.5], 2.4, PH.crack);
  } else if (mood === 'cross') {
    line(g, [-15, my + 4, -9, my, -4, my + 2.5, 1, my - 1, 6, my + 2, 11, my - 0.5, 15, my + 4], 2.4, PH.crack);
  } else if (mood === 'hit' || mood === 'watch' || mood === 'gulp') {
    const r = mood === 'gulp' ? 3 + gulp * 2 : mood === 'hit' ? 5.5 : 3.5;
    g.fillStyle = PH.deep;
    g.beginPath();
    g.ellipse(0, my + 1, r * 0.9, r, 0, 0, TAU);
    g.fill();
    g.strokeStyle = PH.crack;
    g.lineWidth = 1.6;
    g.stroke();
  } else if (mood === 'giggle') {
    g.fillStyle = PH.deep;
    g.beginPath();
    g.moveTo(-12, my - 2);
    g.quadraticCurveTo(0, my + 2, 12, my - 2);
    g.quadraticCurveTo(0, my + 13 + wob, -12, my - 2);
    g.fill();
    g.strokeStyle = PH.crack;
    g.lineWidth = 1.8;
    g.stroke();
  } else if (mood === 'yawn') {
    g.fillStyle = PH.deep;
    g.beginPath();
    g.ellipse(0, my + 3, 7, 10, 0, 0, TAU);
    g.fill();
    g.strokeStyle = PH.crack;
    g.lineWidth = 1.8;
    g.stroke();
  } else if (mood === 'sleep') {
    line(g, [-8, my, 0, my + 3, 8, my], 2.2, PH.crack);
  }
  g.restore();
}

/** Dust puffs rising off the near lip while he gulps (warning that a throw is coming). */
function gulpDust(g: G, x: number, y: number, k: number, t: number, still: boolean): void {
  g.fillStyle = PH.dust;
  for (let i = 0; i < 4; i++) {
    const p = still ? 0.5 : (t * 2.2 + i * 0.25) % 1;
    g.globalAlpha = k * (1 - p) * 0.9;
    g.beginPath();
    g.arc(x + (i - 1.5) * 20 + Math.sin(i * 2 + p * 4) * 3, y - 4 - p * 22, 3 + p * 4, 0, TAU);
    g.fill();
  }
  g.globalAlpha = 1;
}

/** The rough rim: chipped edges round his opening, x0 to x1, at the floor line y. */
function rimPath(g: G, x0: number, x1: number, y: number, bottom: number, lift: number): void {
  const n = 12;
  g.beginPath();
  g.moveTo(x0 - 4, y + 2);
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    g.lineTo(x, y - lift * Math.sin((i / n) * Math.PI) + (i % 2 ? 1.6 : 0));
  }
  g.lineTo(x1 + 4, y + 2);
  // A round bowl, not a box: the sides curve in towards the bottom
  g.quadraticCurveTo(x1 + 2, bottom - 8, x1 - 16, bottom);
  g.lineTo(x0 + 16, bottom);
  g.quadraticCurveTo(x0 - 2, bottom - 8, x0 - 4, y + 2);
  g.closePath();
}

/**
 * King Pothole, his middle at x, his opening x - 50 to x + 50 at the floor line. He is a hole in
 * the floor: a chipped rim, earthy inner walls, a dark bottom, his crack face on the far inside
 * wall, his crown of cones on the back rim. Fill raises a bed of fresh tarmac (shallower, the
 * same opening); full, the face sits in the tarmac. Smooth: a new road with its lane arrow and,
 * for a moment, the sleepy smile painted in. World space; draw him after the hall, before throws.
 */
export function drawKingPothole(g: G, x: number, floorY = POT_HALL.floorY, look: PotholeLook = {}): void {
  const mood = look.mood ?? 'calm';
  const t = num(look.time ?? 0);
  const still = look.still === true;
  const fill = clamp01(look.fill ?? 0);
  const gulp = mood === 'gulp' ? clamp01(look.gulp ?? 1) : 0;
  const bump = clamp01(look.bump ?? 0);
  const smooth = clamp01(look.smooth ?? 0);
  const hw = POT_HALL.pitW / 2;
  const bottom = POT_HALL.apronY;
  const shake = still || bump <= 0 ? 0 : Math.sin(bump * 30) * 1.5 * (1 - bump);
  g.save();
  g.translate(num(x) + shake, 0);
  const x0 = -hw;
  const x1 = hw;
  const y = floorY;
  // The opening: rim stone, then the earth walls inside, then the dark bottom
  const lift = gulp * 5;
  rimPath(g, x0, x1, y, bottom, lift);
  g.fillStyle = PH.rim;
  g.fill();
  const tarTop = bottom - (bottom - y - 2) * fill;
  g.save();
  g.beginPath();
  g.moveTo(x0 + 3, y + 3);
  for (let i = 0; i <= 10; i++) g.lineTo(x0 + 3 + ((x1 - x0 - 6) * i) / 10, y + 3 - lift * 0.6 * Math.sin((i / 10) * Math.PI) + (i % 3 === 1 ? 2 : 0));
  g.quadraticCurveTo(x1 - 4, bottom - 10, x1 - 20, bottom);
  g.lineTo(x0 + 20, bottom);
  g.quadraticCurveTo(x0 + 4, bottom - 10, x0 + 3, y + 3);
  g.closePath();
  g.clip();
  // Earth layers on the far inside wall, darker going down
  const grad = g.createLinearGradient(0, y, 0, bottom);
  grad.addColorStop(0, PH.earth);
  grad.addColorStop(0.55, PH.earthDark);
  grad.addColorStop(1, PH.deep);
  g.fillStyle = grad;
  g.fillRect(x0, y - 10, x1 - x0, bottom - y + 10);
  g.fillStyle = 'rgba(0,0,0,0.18)';
  for (let i = 0; i < 3; i++) g.fillRect(x0, y + 12 + i * 13, x1 - x0, 2);
  for (let i = 0; i < 10; i++) blob(g, x0 + 8 + hash(i + 3) * (x1 - x0 - 16), y + 8 + hash(i + 9) * 40, 1.6, i % 2 ? '#9b6c48' : '#4d2f1d');
  // The tarmac bed rising as he fills
  if (fill > 0) {
    rect(g, x0, tarTop, x1 - x0, bottom - tarTop + 2, PH.tarmac);
    rect(g, x0, tarTop, x1 - x0, 2.5, PH.tarmacLight);
    for (let i = 0; i < 12; i++) blob(g, x0 + 4 + hash(i + 40) * (x1 - x0 - 8), tarTop + 4 + hash(i + 50) * Math.max(1, bottom - tarTop - 6), 0.9, '#6a6a72');
  }
  // The smooth new road over the patch: level tarmac, the faded joint gone, a lane arrow painted in
  if (smooth > 0) {
    g.globalAlpha = smooth;
    rect(g, x0, y, x1 - x0, bottom - y, PH.tarmac);
    rect(g, x0, y, x1 - x0, 3, PH.tarmacLight);
    g.globalAlpha = 1;
    g.save();
    g.beginPath();
    g.rect(x0, y, (x1 - x0) * smooth, bottom - y);
    g.clip();
    g.fillStyle = '#f4f1e6';
    for (let lx = x0 + 6; lx < x1; lx += 30) g.fillRect(lx, y + 8, 18, 2.5);
    arrowPath(g, 0, POT_HALL.arrowY, 1.1);
    g.fill();
    g.restore();
  }
  // The face: on the far wall while he is deep, in the tarmac when he is full
  const room = tarTop - y;
  const smile = clamp01(look.smile ?? 0);
  if (mood !== 'smooth') {
    g.save();
    g.translate(0, room > 26 ? y + room * 0.46 : y + 26);
    face(g, mood, room > 26 ? room : 50, t, still, gulp);
    g.restore();
  } else if (smile > 0) {
    // For a moment, the crack mouth shows as a tiny sleepy smile in the new paint
    g.globalAlpha = smile;
    g.strokeStyle = '#f4f1e6';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(0, y + 16, 7, Math.PI * 0.15, Math.PI * 0.85);
    g.stroke();
    for (const sx of [-1, 1]) {
      g.beginPath();
      g.arc(sx * 12, y + 9, 3.5, Math.PI * 0.15, Math.PI * 0.85);
      g.stroke();
    }
    g.globalAlpha = 1;
  }
  g.restore();
  // The rim's chipped edge, drawn over the walls: a light top and an ink line
  if (smooth < 1) {
    g.globalAlpha = 1 - smooth;
    g.strokeStyle = INK;
    g.lineWidth = 1.6;
    rimPath(g, x0, x1, y, bottom, lift);
    g.stroke();
    g.fillStyle = PH.rimLight;
    for (let i = 0; i < 6; i++) g.fillRect(x0 - 3 + i * 19 + hash(i) * 6, y - 1 - lift * Math.sin(((i + 0.5) / 6) * Math.PI), 6, 1.6);
    // Little cracks running out into the floor from his rim (his face's "cracks" run on)
    line(g, [x0 - 3, y + 14, x0 - 12, y + 18, x0 - 16, y + 26], 1.2, PH.crack);
    line(g, [x1 + 3, y + 10, x1 + 11, y + 15, x1 + 14, y + 22], 1.2, PH.crack);
    g.globalAlpha = 1;
  }
  if (gulp > 0) gulpDust(g, 0, y, gulp, t, still);
  // The crown: up to three cones on his back rim, the last tipping off at the yawn
  const n = Math.max(0, Math.min(3, Math.round(num(look.cones ?? 3))));
  const first = 3 - n;
  for (let i = first; i < 3; i++) {
    const c = CROWN_CONES[i]!;
    const tip = i === 2 && n === 1 ? clamp01(look.coneTip ?? 0) : 0;
    const vain = still || mood !== 'calm' ? 0 : Math.sin(t * 2 + i) * 0.03;
    drawCrownCone(g, c.dx + tip * 22, y - lift * 0.8 + tip * 4, c.s, c.tilt + vain + tip * 1.3);
  }
  g.restore();
}

/**
 * The three cones standing in a neat line at the side once he is a road, as road cones should
 * (5.5, 2.4 s). x is where the line starts (it runs right in 18 u steps).
 */
export function drawConeLine(g: G, x: number, floorY = POT_HALL.floorY): void {
  for (let i = 0; i < 3; i++) drawCrownCone(g, x + i * 18, floorY, 0.8, 0);
}

// ---------------------------------------------------------------- the road mix bags

/**
 * One road mix bag lying flat, its middle at (x, y) (y the bottom of the bag), about 22 x 11 u:
 * a plain woven sack tied at one end, printed with a little picture of a smooth road. With
 * `tag`, the "READY" tag hangs off its tie (not colour alone).
 */
export function drawRoadMixBag(g: G, x: number, y: number, tag = false, tilt = 0): void {
  g.save();
  g.translate(x, y);
  g.rotate(tilt);
  // The sack: a soft pillow shape
  g.fillStyle = PH.sack;
  g.beginPath();
  g.moveTo(-11, -1);
  g.quadraticCurveTo(-12, -11, -4, -11.5);
  g.lineTo(7, -11);
  g.quadraticCurveTo(11, -6, 9, -1);
  g.quadraticCurveTo(0, 1, -11, -1);
  g.closePath();
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 1.2;
  g.stroke();
  g.strokeStyle = PH.sackWeave;
  g.lineWidth = 0.6;
  g.beginPath();
  for (let i = -8; i < 8; i += 3) {
    g.moveTo(i, -10);
    g.lineTo(i, -2);
  }
  g.stroke();
  // The road picture: a dark band with white dashes
  rect(g, -6, -8, 11, 4.5, PH.tarmac);
  g.fillStyle = WHITE;
  g.fillRect(-5, -6.2, 2.5, 0.9);
  g.fillRect(-1, -6.2, 2.5, 0.9);
  g.fillRect(3, -6.2, 1.5, 0.9);
  // The tied end
  g.fillStyle = PH.sackTie;
  g.beginPath();
  g.moveTo(9, -8);
  g.lineTo(13, -9.5);
  g.lineTo(13, -3);
  g.lineTo(9, -4);
  g.closePath();
  g.fill();
  g.stroke();
  if (tag) {
    line(g, [13, -6, 16, -1], 0.8, INK);
    g.save();
    g.translate(17, 3);
    g.rotate(0.12);
    inkRect(g, -9, -4, 20, 8, PH.tag, 0.9, 1.5);
    g.fillStyle = INK;
    g.font = 'bold 5.5px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(POT_BAG_TAG, 1, 0.3, 18);
    g.restore();
  }
  g.restore();
}

/**
 * The road mix pile by the left door (pile 60 to 90): three bags in a low heap, and on top, when
 * `ready`, the bag to carry (its middle at bagX, with the READY tag). World space; behind the hero.
 */
export function drawRoadMixPile(g: G, ready: boolean, floorY = POT_HALL.floorY): void {
  const [a, b] = POT_HALL.pile;
  const mid = (a + b) / 2;
  drawRoadMixBag(g, a + 4, floorY, false, 0.04);
  drawRoadMixBag(g, b - 6, floorY, false, -0.05);
  drawRoadMixBag(g, mid - 2, floorY - 9, false, 0.02);
  if (ready) drawRoadMixBag(g, POT_HALL.bagX - 2, floorY - 18, true, -0.04);
}

/**
 * The carrying pose for every body (5.3): the bag lies on a coiled cloth head pad on the hero's
 * head, the way porters carry goods, hands free. heroX, heroY: the hero's feet (world); look and
 * pose: exactly as given to drawHero, so the bag follows the stride, the jump and the landing.
 * Draw it just after the hero.
 */
export function drawCarriedBag(g: G, look: HeroLook, pose: HeroPose, heroX: number, heroY: number): void {
  const top = heroHeadTop(look, pose);
  const dir = pose.facing === -1 ? -1 : 1;
  g.save();
  g.translate(num(heroX) + top.x * dir, num(heroY) + top.y);
  g.rotate(top.a * dir);
  // The pad: a ring of rolled cloth in two colours
  g.fillStyle = PH.padA;
  g.beginPath();
  g.ellipse(0, -1, 7, 2.4, 0, 0, TAU);
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.stroke();
  g.strokeStyle = PH.padB;
  g.lineWidth = 1.2;
  g.beginPath();
  for (const px of [-4.5, -1, 2.5]) {
    g.moveTo(px, -3);
    g.lineTo(px + 1.8, 1);
  }
  g.stroke();
  g.scale(dir, 1);
  drawRoadMixBag(g, -1, -2.5);
  g.restore();
}

/** The bag dropping in and the soft tarmac "plop" where it lands (k 0 to 1 over about 0.4 s). */
export function drawPlop(g: G, x: number, surfaceY: number, k: number): void {
  if (!(k >= 0 && k < 1)) return;
  const u = clamp01(k);
  g.globalAlpha = 1 - u;
  g.strokeStyle = PH.tarmacLight;
  g.lineWidth = 2;
  g.beginPath();
  g.ellipse(x, surfaceY, 8 + u * 30, 2 + u * 5, 0, 0, TAU);
  g.stroke();
  for (let i = 0; i < 6; i++) {
    const dx = (i - 2.5) * (5 + u * 9);
    const dy = -u * 26 * (1 - Math.abs(i - 2.5) * 0.18) + u * u * 22;
    blob(g, x + dx, surfaceY + dy, 2.6 * (1 - u * 0.4), i % 2 ? PH.tarmac : PH.earthDark);
  }
  g.globalAlpha = 1;
}

// ---------------------------------------------------------------- mud splats (5.4)

/**
 * A mud blob in the air (world space), its middle at (x, y). Wobbles as it flies (still: holds
 * its shape). About 14 u wide; never hurts.
 */
export function drawMudBlob(g: G, x: number, y: number, time = 0, still = false): void {
  const t = still ? 0 : num(time);
  g.save();
  g.translate(num(x), num(y));
  const sq = Math.sin(t * 14) * 0.12;
  g.scale(1 + sq, 1 - sq);
  g.fillStyle = PH.mudBlob;
  g.beginPath();
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * TAU;
    const r = 7 + Math.sin(a * 3 + t * 5) * 1.2;
    if (i === 0) g.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  g.closePath();
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 1.2;
  g.stroke();
  g.strokeStyle = PH.mudShine;
  g.lineWidth = 1.2;
  g.beginPath();
  g.arc(-1.5, -1.5, 3.5, Math.PI * 1.1, Math.PI * 1.6);
  g.stroke();
  blob(g, 6, 5, 1.6, PH.mudBlob);
  g.restore();
}

/**
 * The round shadow that marks where a mud blob will land (5.4: shown 0.6 s before), k 0 to 1 as
 * it comes down: it grows darker and its ring closes in. A ring and a dot, not colour alone.
 */
export function drawMudShadow(g: G, x: number, floorY: number, k: number, width = 60): void {
  const u = clamp01(k);
  const r = (width / 2) * (1.15 - u * 0.25);
  g.fillStyle = `rgba(30,18,10,${(0.15 + u * 0.3).toFixed(3)})`;
  g.beginPath();
  g.ellipse(num(x), floorY + 6, r, 4.5, 0, 0, TAU);
  g.fill();
  g.setLineDash([4, 3]);
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.stroke();
  g.setLineDash([]);
  blob(g, num(x), floorY + 6, 1.8, INK);
}

/**
 * A mud patch from the splat, its middle at x, `width` wide (60), drying away: dry 0 wet (Ota's
 * mud look), towards 1 it pales, cracks and fades; at 1 it is gone. It slows, never hurts.
 */
export function drawMudPatch(g: G, x: number, width: number, floorY: number, dry: number, time = 0, still = false): void {
  const d = clamp01(dry);
  if (d >= 1) return;
  const x0 = num(x) - width / 2;
  g.save();
  g.globalAlpha = d < 0.7 ? 1 : 1 - (d - 0.7) / 0.3;
  drawMud(g, x0, width, floorY, num(time), still);
  if (d > 0.4) {
    // Drying: a pale crust and little cracks
    g.globalAlpha *= (d - 0.4) / 0.6;
    rect(g, x0 + 2, floorY + 1, width - 4, 10, '#b08a62');
    line(g, [x0 + 10, floorY + 3, x0 + 16, floorY + 8, x0 + 22, floorY + 5], 1, PH.crack);
    line(g, [x0 + 34, floorY + 4, x0 + 40, floorY + 9, x0 + 48, floorY + 6], 1, PH.crack);
  }
  g.restore();
}

// ---------------------------------------------------------------- the road roller

/**
 * Our own little road roller, its middle at x on the floor: danfo yellow with an ink stripe, a
 * big friendly front drum, a small back wheel, a seat under a sun canopy. No brand, no writing.
 * facing -1 drives left (the drum in front, to the left). drum: the front drum's turn (radians).
 * toot 0 to 1: two little curved toot lines from the horn.
 */
export function drawRoller(g: G, x: number, floorY: number, o: { facing?: 1 | -1; drum?: number; toot?: number } = {}): void {
  const f = o.facing === 1 ? 1 : -1;
  g.save();
  g.translate(num(x), floorY);
  g.scale(f, 1);
  // Body: a low box with a rounded nose over the drum
  inkRect(g, -26, -30, 40, 18, PH.roller, 1.4, 4);
  rect(g, -25, -21, 38, 3, INK);
  inkRect(g, 10, -36, 18, 22, PH.roller, 1.4, 5);
  // Canopy on two posts over the seat
  line(g, [-20, -30, -20, -54], 2, INK);
  line(g, [-4, -30, -4, -54], 2, INK);
  inkRect(g, -26, -58, 28, 5, PH.indigo, 1.2, 2);
  inkRect(g, -17, -38, 10, 8, '#5b3a22', 1, 2);
  // Steering wheel
  line(g, [-2, -30, 2, -40], 1.5, INK);
  g.strokeStyle = INK;
  g.lineWidth = 1.5;
  g.beginPath();
  g.ellipse(3, -41, 4, 1.5, 0.3, 0, TAU);
  g.stroke();
  // The horn, and its toot
  blob(g, 26, -38, 2.5, PH.rollerDark);
  const toot = clamp01(o.toot ?? 0);
  if (toot > 0) {
    g.globalAlpha = 1 - toot;
    g.strokeStyle = INK;
    g.lineWidth = 1.3;
    for (let i = 0; i < 2; i++) {
      g.beginPath();
      g.arc(28, -40, 5 + i * 5 + toot * 6, -0.7, 0.2);
      g.stroke();
    }
    g.globalAlpha = 1;
  }
  // Back wheel and the big front drum, with ribs that turn as it rolls
  blob(g, -18, -8, 8, INK);
  blob(g, -18, -8, 4.5, PH.drum);
  const a = num(o.drum ?? 0);
  g.save();
  g.translate(18, -15);
  inkRect(g, -15, -15, 30, 30, PH.drum, 1.5, 15);
  g.save();
  g.beginPath();
  g.arc(0, 0, 14, 0, TAU);
  g.clip();
  g.strokeStyle = PH.drumLight;
  g.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    const ang = a * f + (i * Math.PI) / 2;
    g.beginPath();
    g.moveTo(Math.cos(ang) * 4, Math.sin(ang) * 4);
    g.lineTo(Math.cos(ang) * 14, Math.sin(ang) * 14);
    g.stroke();
  }
  g.restore();
  blob(g, 0, 0, 4, PH.roller);
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.stroke();
  g.restore();
  g.restore();
}

// ---------------------------------------------------------------- the door people (part 7)

/**
 * The three travellers who wait at the open left door, from Ogun's casts: a woman with a basket
 * of garri (Sagamu's garri trader), a factory worker with a lunch bag (Ota), and an elder in
 * agbada and fila with glasses. They cheer the road opening, never laugh at King Pothole.
 */
export const HALL_DOOR_PEOPLE: readonly FolkLook[] = [SAGAMU_TRADER_LOOKS.garri, OTA_CAST[0]!, folkLook('4emmgFcFBB.g')];
/** Where they stand in the doorway (x, feet just behind the floor line at floorY - 4), and their scale. */
export const HALL_DOOR_SPOTS: readonly number[] = [36, 62, 90];
export const HALL_DOOR_SCALE = 0.9;
/** At the finish they walk in along the back wall to these x and cheer (cheer0 and cheer1). */
export const HALL_CHEER_SPOTS: readonly number[] = [150, 186, 222];

// ---------------------------------------------------------------- sounds

/** Pothole Hall's sounds (code-made, our own; no voice). Gamedev adds the names to SoundName and calls addSounds. */
export type PotholeSoundName = 'potPlop' | 'potGulp' | 'potHmph' | 'potGiggle' | 'potYawn' | 'bagLift' | 'coneTok' | 'mudSplat' | 'rollerToot';
export const POTHOLE_SOUNDS: Readonly<Record<PotholeSoundName, Recipe>> = {
  /** The bag dropping in: a deep round "plop" and a short wet slap; 0.25 s. */
  potPlop: {
    tones: [
      { f: 190, len: 0.14, wave: 'sine', to: 80, vol: 0.1 },
      { f: 95, len: 0.1, wave: 'sine', peak: 120, to: 85, at: 0.1, vol: 0.05 },
    ],
    hiss: [{ len: 0.08, at: 0.02, bp: 900, vol: 0.03 }],
  },
  /** The gulp before a throw: a low swallow that bends up and down; 0.3 s. */
  potGulp: {
    tones: [{ f: 110, len: 0.28, wave: 'triangle', peak: 165, to: 90, vol: 0.07 }],
    hiss: [{ len: 0.1, at: 0.18, lp: 600, vol: 0.02 }],
  },
  /** The "hmph" bump: a short low tuba-like thud and a puff of low hiss (not a voice); 0.2 s. */
  potHmph: {
    tones: [
      { f: 98, len: 0.07, wave: 'triangle', to: 92, vol: 0.07 },
      { f: 82, len: 0.1, wave: 'triangle', to: 70, at: 0.07, vol: 0.06 },
    ],
    hiss: [{ len: 0.06, at: 0.11, lp: 700, vol: 0.035 }],
  },
  /** Filling up and tickled: four bubbly blips of tarmac, rising a little; 0.45 s. */
  potGiggle: {
    tones: [0, 1, 2, 3].map((i) => ({ f: 300 + i * 30, len: 0.06, wave: 'sine' as const, peak: 420 + i * 30, to: 320 + i * 30, at: i * 0.11, vol: 0.04 })),
  },
  /** The big yawn: a slow, soft low sine that sinks away; 0.6 s. */
  potYawn: {
    tones: [{ f: 140, len: 0.6, wave: 'sine', peak: 170, to: 80, vol: 0.05 }],
    hiss: [{ len: 0.5, lp: 400, vol: 0.015 }],
  },
  /** Lifting a bag onto the head pad: a soft cloth "fff" and a small thump; 0.15 s. */
  bagLift: {
    tones: [{ f: 140, len: 0.06, wave: 'triangle', to: 110, at: 0.06, vol: 0.05 }],
    hiss: [{ len: 0.08, bp: 1200, vol: 0.025 }],
  },
  /** A cone falling off his crown: a hollow plastic "tok, tok"; 0.25 s. */
  coneTok: {
    tones: [
      { f: 620, len: 0.04, wave: 'triangle', to: 540, vol: 0.05 },
      { f: 560, len: 0.035, wave: 'triangle', to: 500, at: 0.15, vol: 0.035 },
    ],
  },
  /** A mud blob landing: a wet "splut" (never hurts); 0.2 s. */
  mudSplat: {
    tones: [{ f: 130, len: 0.08, wave: 'sine', peak: 160, to: 70, vol: 0.06 }],
    hiss: [{ len: 0.16, bp: 650, vol: 0.035 }],
  },
  /** The roller's happy toot: two short soft toots, our own (no known horn); 0.4 s. */
  rollerToot: {
    tones: [
      { f: 392, len: 0.12, wave: 'triangle', vol: 0.05 },
      { f: 494, len: 0.12, wave: 'triangle', vol: 0.03 },
      { f: 392, len: 0.16, wave: 'triangle', at: 0.18, vol: 0.05 },
      { f: 494, len: 0.16, wave: 'triangle', at: 0.18, vol: 0.03 },
    ],
  },
};

// ---------------------------------------------------------------- the hall tune (2.5, 5.4)

/**
 * Pothole Hall's tune: our own, grumpy but funny, in D minor. A thumb-piano (kalimba) lead over
 * a round plucked bass line, a talking drum's "pom pa-pom", from the first bag a shaker, from
 * the second a second talking drum answering high. 126, 132, 138 BPM (the hall file's phases). It
 * plays only with the Music switch on, like every tune. Never a known song or any game's music.
 */
const DM = ['Dm', 'Dm', 'C', 'C', 'A#', 'A#', 'C', 'Dm'] as const;
const rep8 = (bar: string): string[] => Array.from({ length: 8 }, () => bar);
export const POTHOLE_HALL_TUNE: Tune = {
  name: 'potholeHall',
  bpm: [126, 132, 138],
  bars: 8,
  loop: true,
  gain: 1,
  key: ['D', 'E', 'F', 'G', 'A', 'A#', 'C'],
  chords: DM,
  tracks: [
    {
      inst: 'kalimba',
      lead: true,
      vol: 0.6,
      bars: [
        'D5 . . F5 . . A4 . . . C5 . . A4 . .',
        'G4 . . . F4 . . . D4 . . . . . . .',
        'E5 . . C5 . . G4 . . . A#4 . . G4 . .',
        'E4 . . . F4 . . . G4 . . . . . . .',
        'D5 . . A#4 . . F4 . . . G4 . . A4 . .',
        'F4 . . . D4 . . . A#4 . . . . . . .',
        'C5 . . E5 . . G5 . . . E5 . . C5 . .',
        'A4 . . . E4 . . . D4 . . . . . . .',
      ],
    },
    {
      inst: 'bass',
      vol: 0.7,
      bars: DM.map((c) =>
        c === 'Dm' ? 'D2 - . . . . A2 . D3 - . . A2 . . .' : c === 'C' ? 'C2 - . . . . G2 . C3 - . . G2 . . .' : 'A#1 - . . . . F2 . A#2 - . . F2 . . .',
      ),
    },
    { inst: 'drum', vol: 0.7, bars: rep8('D3 . . A2 D3 . . . . . D3 . A2 . . .') },
    { inst: 'shekere', vol: 0.32, from: 1, bars: rep8('X . x . x . x . X . x . x . x .') },
    { inst: 'drum', vol: 0.45, from: 2, bars: rep8('. . . . . . A3 . . . . . . . G3 .') },
  ],
};
