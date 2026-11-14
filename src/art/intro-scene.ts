/**
 * The intro that moves (docs/city.md part 5, step (a2), art task S3a3): one camera, one Wheel,
 * about 44 s (a2.12). drawIntroScene is a pure function of time: the same `t` always draws the same
 * picture, so the screen (gamedev, S3a4) owns the clock, the jumps, the pause and the hold.
 *
 * Beats (a2.2, timed by a2.12 point 4): 1 the people make the Wheel, 2 it turns and Lagos grows, 3 it sits in the
 * middle of Nigeria, 4 the Stoppers jam it, 5 the hero pushes it back into motion, 6 its
 * turning becomes the yellow bus's wheel at a Lagos bus stop. Camera moves are plain slides,
 * zooms and fades (a2.8): no shaped wipes, no title cards, no star field.
 *
 * Built from the six still frames' own drawings (src/art/intro.ts). The still frames stay as
 * the reduced-motion version. No words are drawn here except the bus stop's own sign.
 *
 * Light (a2.9): only the beat on screen is drawn (two during a camera move). Each beat's still
 * parts (sky, land, far city) are painted once into an offscreen canvas per screen size and
 * copied; the border cogs are worked out once and drawn as one path. No shadowBlur, no filters.
 */
import type { SoundName } from '../engine/sound';
import { drawHero, WALK_STRIDE, type HeroLook } from './hero';
import {
  INTRO_COLOURS as C,
  INTRO_VIEW,
  MAP_WHEEL,
  NG_GREEN,
  NG_WHITE,
  NIGERIA_OUTLINE,
  baobab,
  band,
  borderCogs,
  box,
  bridge,
  building,
  disc,
  drawOutlineHero,
  drawStopper,
  drawStoryWheel,
  grad,
  line,
  nigeriaPath,
  palm,
  person,
  toFrame,
  type Ext,
  type Folk,
  type StopperKind,
} from './intro';
import { INK } from './palette';
import { drawBusShape, drawBusStop } from './street';

const TAU = Math.PI * 2;

// ---------- Timing (a2.2) and cues (a2.6) ----------

/** The six beat starts (s), then the hold: "Let's go" shows at INTRO_BEATS[6]. */
export const INTRO_BEATS = [0, 11, 19.6, 25.4, 31.6, 39, 44] as const;
/** When the hold starts ("Let's go" fades in). */
export const INTRO_HOLD = 44;
/** Seconds into the hold after which the picture no longer changes enough to redraw (a2.9). */
export const INTRO_STILL_AFTER = 3;

/** The beat at time t: 0 to 5, or 6 in the hold. */
export function introBeatAt(t: number): number {
  const T = Number.isFinite(t) ? t : 0;
  let b = 0;
  for (let i = 1; i < INTRO_BEATS.length; i++) if (T >= INTRO_BEATS[i]!) b = i;
  return b;
}

/**
 * One cue: a sound by name (src/engine/sound.ts), or the `menu` tune. `start` starts it at
 * `level`; `level` ramps the level over `ramp` s; `restart` starts it again from bar 1.
 */
export type IntroCue =
  | { t: number; sound: SoundName }
  | { t: number; music: 'start' | 'level' | 'restart'; level: number; ramp: number };

/**
 * a2.12 point 4 (which replaces the a2.6 times), in time order. One swap: the three footfalls at
 * 31.8 to 33.0 use `strongStep` (a soft low "dum"), since `step` is the Booming meter's three
 * rising notes, not a footfall.
 */
export const INTRO_CUES: readonly IntroCue[] = [
  { t: 0, music: 'start', level: 0.6, ramp: 0 },
  { t: 6.5, music: 'level', level: 1, ramp: 1 },
  { t: 6.5, sound: 'cogBell' },
  { t: 12.2, sound: 'built' },
  { t: 14.6, sound: 'honk' },
  { t: 21.8, sound: 'cogRatchet' },
  { t: 23.4, sound: 'cogBell' },
  { t: 26, music: 'level', level: 0.5, ramp: 2 },
  { t: 26, sound: 'honk' },
  { t: 26.9, sound: 'roomThump' },
  { t: 27.8, sound: 'lightClunk' },
  { t: 28.7, sound: 'parcel' },
  { t: 30.2, music: 'level', level: 0, ramp: 0.3 },
  { t: 30.2, sound: 'crateHit' },
  { t: 31.8, sound: 'strongStep' },
  { t: 32.4, sound: 'strongStep' },
  { t: 33, sound: 'strongStep' },
  { t: 34.6, music: 'restart', level: 1, ramp: 0 },
  { t: 34.6, sound: 'bounce' },
  { t: 40, sound: 'skid' },
  { t: 40.6, sound: 'busBoard' },
  { t: 44, music: 'level', level: 0.5, ramp: 0.4 },
  { t: 44, sound: 'sting' },
];

export interface IntroSceneOptions {
  /** The player's hero. null or missing: the plain outline hero (first visit). */
  look?: HeroLook | null;
  /**
   * a2.12: canvas units at the bottom kept for the subtitle strip. The picture fits in the
   * space above it; sky and ground still reach every edge, the ground carrying on under it.
   */
  inset?: number;
}

// ---------- Small helpers ----------

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);
/** 0 before a, 1 after b, a straight line between. */
const span = (t: number, a: number, b: number): number => clamp01((t - a) / (b - a));
const ease = (k: number): number => k * k * (3 - 2 * k);
const easeOut = (k: number): number => 1 - (1 - k) * (1 - k);
const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;
/** A spring: 0 to 1 with one small overshoot. */
const spring = (k: number): number => (k >= 1 ? 1 : k <= 0 ? 0 : 1 - Math.cos(k * Math.PI * 1.5) * (1 - k) * (1 - k));

function mixHex(a: string, b: string, k: number): string {
  const p = (c: string, i: number): number => parseInt(c.slice(1 + i * 2, 3 + i * 2), 16);
  let out = '#';
  for (let i = 0; i < 3; i++) out += Math.round(lerp(p(a, i), p(b, i), k)).toString(16).padStart(2, '0');
  return out;
}

/** Paints with see-through alpha (or nothing at 0). */
function faded(g: CanvasRenderingContext2D, a: number, paint: () => void): void {
  if (a <= 0.003) return;
  g.save();
  g.globalAlpha *= Math.min(1, a);
  paint();
  g.restore();
}

function clipExt(g: CanvasRenderingContext2D, e: Ext): void {
  g.beginPath();
  g.rect(e.l, e.t, e.r - e.l, e.b - e.t);
  g.clip();
}

// ---------- The Wheel's turn (one angle through the whole scene) ----------

/** The Wheel's speed (rad/s), straight lines between these [time, speed] knots. */
const SPIN: readonly (readonly [number, number])[] = [
  [0, 0.2], [6.5, 0.2], [7, 0.5], [29.4, 0.5], [30.2, 0], [34.6, 0], [35.3, 0.6], [1e6, 0.6],
];

/** The Wheel's angle at time t: the area under SPIN, plus the shudder and the rock. */
export function wheelAngle(t: number): number {
  const T = Math.max(0, t);
  let a = 0;
  for (let i = 0; i + 1 < SPIN.length; i++) {
    const [t0, w0] = SPIN[i]!;
    const [t1, w1] = SPIN[i + 1]!;
    if (T <= t0) break;
    const e = Math.min(T, t1);
    const we = w0 + ((w1 - w0) * (e - t0)) / (t1 - t0);
    a += ((w0 + we) / 2) * (e - t0);
  }
  // The shudder as it is jammed, and the rock back and forth as the hero pushes
  if (T > 29.4 && T < 30.4) a += Math.sin(T * 70) * 0.025 * (1 - span(T, 29.4, 30.4));
  if (T > 34.3 && T < 34.6) a += Math.sin(span(T, 34.3, 34.6) * TAU) * -0.06;
  return a;
}

// ---------- Still layers, painted once per size ----------

interface Base {
  /** Picture units to device pixels (the scale), and the device pixel the ext's corner lands on. */
  k: number;
  x: number;
  y: number;
}

interface Layer {
  key: string;
  c: HTMLCanvasElement;
}

/** Few layers live at once (a beat and the next); older ones are dropped. */
const MAX_LAYERS = 4;
const layers = new Map<string, Layer>();

/**
 * Draws the still part `id` from its offscreen copy (made on first use for this size), or
 * paints it straight on when there is no document (tests) or the screen is rotated or skewed.
 */
function still(g: CanvasRenderingContext2D, base: Base | null, ext: Ext, id: string, paint: (cg: CanvasRenderingContext2D) => void, top?: number): void {
  if (!base) {
    paint(g);
    return;
  }
  // A layer can cover only the part below `top` (the ground under a changing sky).
  const e: Ext = top === undefined ? ext : { ...ext, t: top };
  const fx = base.x - Math.floor(base.x);
  const fy = base.y - Math.floor(base.y);
  const key = `${base.k.toFixed(4)}|${fx.toFixed(3)}|${fy.toFixed(3)}|${e.l.toFixed(2)}|${e.r.toFixed(2)}|${e.t.toFixed(2)}|${e.b.toFixed(2)}`;
  let L = layers.get(id);
  if (!L || L.key !== key) {
    const c = L?.c ?? document.createElement('canvas');
    c.width = Math.max(1, Math.ceil((e.r - e.l) * base.k + fx) + 1);
    c.height = Math.max(1, Math.ceil((e.b - e.t) * base.k + fy) + 1);
    const cg = c.getContext('2d');
    if (!cg) {
      paint(g);
      return;
    }
    cg.setTransform(base.k, 0, 0, base.k, fx - e.l * base.k, fy - e.t * base.k);
    paint(cg);
    L = { key, c };
  }
  // Most recently used last; drop the oldest past the limit.
  layers.delete(id);
  layers.set(id, L);
  while (layers.size > MAX_LAYERS) layers.delete(layers.keys().next().value!);
  g.drawImage(L.c, e.l - fx / base.k, e.t - fy / base.k, L.c.width / base.k, L.c.height / base.k);
}

/** The base of the scene being drawn now (null in tests): sprites are made at its scale. */
let curBase: Base | null = null;
const sprites = new Map<string, HTMLCanvasElement>();

/** A small picture `id`, painted once per scale round (0, 0), reaching R units out. */
function sprite(id: string, R: number, paint: (cg: CanvasRenderingContext2D) => void): HTMLCanvasElement | null {
  if (!curBase) return null;
  const key = `${id}|${curBase.k.toFixed(4)}`;
  let c = sprites.get(key);
  if (!c) {
    if (sprites.size > 8) sprites.clear();
    c = document.createElement('canvas');
    const px = Math.ceil(R * 2 * curBase.k) + 2;
    c.width = px;
    c.height = px;
    const cg = c.getContext('2d');
    if (!cg) return null;
    cg.setTransform(curBase.k, 0, 0, curBase.k, px / 2, px / 2);
    paint(cg);
    sprites.set(key, c);
  }
  return c;
}

/** True when the camera is not zoomed in much past the base (a sprite stays sharp). */
function spriteSharp(g: CanvasRenderingContext2D): boolean {
  if (!curBase) return false;
  const m = g.getTransform();
  return m.b === 0 && m.c === 0 && m.a <= curBase.k * 1.25;
}

/** The Wheel, turned by `rot` (drawn shape by shape: a turned copy was no faster). */
function wheel(g: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number, missing = 0, dull = false): void {
  drawStoryWheel(g, x, y, r, rot, missing, dull);
}

// ---------- Beat 1: the people make the Wheel (0 to 11 s) ----------

const W1 = { x: 160, y: 96, r: 44 } as const;
/** The spoke clicks in here (s). */
const CLICK = 6.5;

/** a2.12: the slow drift closer while everyone cheers (6.5 to 11 s), at most 5 % zoom. */
function drift1(T: number): number {
  return 1 + 0.05 * ease(span(T, CLICK, 11));
}

function land1(g: CanvasRenderingContext2D, e: Ext): void {
  // Far hills, the savanna, a river, rows of crops, palms, a baobab and yams (frame 1's land)
  g.fillStyle = '#d99a5b';
  g.beginPath();
  g.moveTo(e.l, 122);
  g.quadraticCurveTo(60, 98, 120, 118);
  g.quadraticCurveTo(200, 104, 260, 116);
  g.quadraticCurveTo(300, 104, e.r, 112);
  g.lineTo(e.r, 140);
  g.lineTo(e.l, 140);
  g.fill();
  band(g, e, 128, '#c9b45a');
  g.fillStyle = '#7fb06a';
  g.beginPath();
  g.moveTo(e.l, 150);
  g.quadraticCurveTo(80, 136, 160, 146);
  g.quadraticCurveTo(240, 156, e.r, 140);
  g.lineTo(e.r, e.b);
  g.lineTo(e.l, e.b);
  g.fill();
  g.strokeStyle = '#6fb6d6';
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(e.r, 136);
  g.quadraticCurveTo(250, 142, 270, 152);
  g.quadraticCurveTo(290, 166, e.r, 176);
  g.stroke();
  for (let i = 0; i < 6; i++) line(g, '#5a8f4a', 1.2, [12 + i * 9, 170, 24 + i * 9, 156]);
  palm(g, 22, 140, 30);
  palm(g, 44, 136, 24);
  baobab(g, 290, 140);
  g.fillStyle = '#9b6b43';
  for (const [x, y] of [[66, 160], [72, 162], [69, 157]] as const) {
    g.beginPath();
    g.ellipse(x, y, 5, 2.3, 0.3, 0, TAU);
    g.fill();
  }
}

/** Where the last spoke's slot is when it clicks in (6.5 s): its inner and outer ends. */
function slotAtClick(): [number, number, number, number] {
  const a = wheelAngle(CLICK);
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [W1.x + c * W1.r * 0.18, W1.y + s * W1.r * 0.18, W1.x + c * W1.r * 0.74, W1.y + s * W1.r * 0.74];
}

/** The sun's glow and disc, centre at y. */
function sun1(g: CanvasRenderingContext2D, y: number): void {
  disc(g, 160, y, 60, 'rgba(255,236,170,0.45)');
  disc(g, 160, y, 40, 'rgba(255,224,130,0.6)');
  disc(g, 160, y, 28, '#ffd34d');
}

function world1(g: CanvasRenderingContext2D, e: Ext, base: Base | null, T: number, withWheel: boolean): void {
  const z = drift1(T);
  if (z === 1) {
    world1At(g, e, base, T, withWheel);
    return;
  }
  // The camera drifts in round the Wheel. Drawn to the same edges (they still cover the screen
  // when zoomed in), so the copied layers are kept, not painted again each frame.
  zoomed(g, z, W1.x, W1.y, W1.x, W1.y, () => world1At(g, e, base, T, withWheel));
}

function world1At(g: CanvasRenderingContext2D, e: Ext, base: Base | null, T: number, withWheel: boolean): void {
  const dawn = ease(span(T, 0, 1.5));
  if (dawn >= 1) {
    still(g, base, e, 'day1', (cg) => {
      grad(cg, e, 0, 120, '#ffb36b', '#fff1c9');
      sun1(cg, 92);
      land1(cg, e);
    });
  } else {
    grad(g, e, 0, 120, '#ffb36b', '#fff1c9');
    // Dark blue before the sun is up
    faded(g, (1 - dawn) * 0.9, () => {
      g.fillStyle = '#26315f';
      g.fillRect(e.l, e.t, e.r - e.l, 140 - e.t);
    });
    faded(g, dawn, () => sun1(g, lerp(130, 92, dawn)));
    disc(g, 160, lerp(130, 92, dawn), 28, '#ffd34d');
    still(g, base, e, 'land1', (cg) => land1(cg, e));
  }
  if (withWheel) wheel(g, W1.x, W1.y, W1.r, wheelAngle(T), T < CLICK ? 1 : 0);
  // The brass flash as the spoke clicks in (small, soft, once)
  const f = span(T, CLICK, CLICK + 0.35);
  if (f > 0 && f < 1) {
    faded(g, 1 - f, () => {
      disc(g, W1.x, W1.y, 6 + f * 10, C.brassShine);
      for (let i = 0; i < 6; i++) {
        const a = (i * TAU) / 6 + 0.3;
        line(g, C.brass, 1.2, [W1.x + Math.cos(a) * (12 + f * 6), W1.y + Math.sin(a) * (12 + f * 6), W1.x + Math.cos(a) * (16 + f * 10), W1.y + Math.sin(a) * (16 + f * 10)]);
      }
    });
  }
  const done = T >= CLICK;
  const pushPh = Math.max(0, T - 0.5) * 3.4;
  const cheer = T * 7;
  const pusher = (x: number, skin: number, top: string, low: string, head: Folk['head'], f: 1 | -1, wrap?: string, k = 0): Folk =>
    done ? { x, y: 150 + k, skin, top, low, head, pose: 'lift', f, wrap, ph: cheer + x } : { x, y: 150 + k, skin, top, low, head, pose: 'push', f, wrap, ph: pushPh + (f > 0 ? 0 : 1.4) };
  const lifting = T >= 4.5;
  const lifter = (x: number, skin: number, top: string, low: string, head: Folk['head'], f: 1 | -1, wrap?: string): Folk => ({
    x,
    y: 152,
    skin,
    top,
    low,
    head,
    wrap,
    f,
    pose: done || lifting ? 'lift' : 'stand',
    ph: done ? cheer + x : undefined,
  });
  // The child with the basket of brass pins walks in (0.5 to 2.5 s)
  const kw = easeOut(span(T, 0.5, 2.5));
  const kidX = lerp(e.l - 12, 80, kw);
  const kidWalking = T > 0.5 && T < 2.5;
  const folk: Folk[] = [
    pusher(104, 3, '#e0572b', '#5b3a22', 'bare', 1, undefined, 0),
    pusher(92, 1, '#2b59c3', '#e9e1cf', 'wrap', 1, '#f2b300', 2),
    pusher(212, 4, '#1aa39a', '#2f5d8a', 'puff', -1, undefined, 0),
    pusher(226, 2, '#f2b300', '#7b2d26', 'braids', -1, undefined, 3),
    lifter(148, 0, '#9b59b6', '#46306f', 'bare', 1),
    lifter(176, 4, '#d6336c', '#d6336c', 'wrap', -1, '#a6eadf'),
    { x: 250, y: 160, skin: 2, top: '#e9e1cf', low: '#e9e1cf', head: 'grey', pose: done ? 'clap' : 'sit', f: -1, ph: done ? T * 9 : undefined },
    { x: kidX, y: 164, skin: 3, top: '#f39c12', low: '#2b59c3', head: 'puff', pose: 'carry', kid: true, ph: kidWalking ? T * 9 : undefined },
    { x: 160, y: 168, skin: 1, top: '#16a3b8', low: '#5b4636', head: 'braids', pose: done ? 'up' : 'point', kid: true },
  ];
  for (const p of folk) person(g, p);
  // The basket on the child's head, full of brass pins
  box(g, kidX - 4, 145, 9, 4, '#c8964a', INK, 0.5);
  for (let i = 0; i < 3; i++) disc(g, kidX - 2 + i * 2.5, 144.5, 1, C.brass);
  // The last spoke: held low, lifted (4.5 to 6.5 s) and slid into its slot
  if (!done) {
    // Up over their heads (5.0 to 5.8 s), then slid into the hub (5.8 to 6.5 s)
    const up = ease(span(T, 5, 5.8)) * 16;
    const k = ease(span(T, 5.8, 6.45));
    const [ix, iy, ox, oy] = slotAtClick();
    const pts = [lerp(150, ix, k), lerp(144 - up, iy, k), lerp(174.6, ox, k), lerp(144 - up, oy, k)];
    line(g, C.woodDark, 4.4, pts);
    line(g, '#e0a868', 2.6, pts);
    disc(g, pts[0]!, pts[1]!, 1.6, C.brass);
  }
  // Before sunrise everything is a little dim
  faded(g, (1 - dawn) * 0.35, () => {
    g.fillStyle = '#26315f';
    g.fillRect(e.l, 140, e.r - e.l, e.b - 140);
  });
}

// ---------- Beat 2: the Wheel turns and Lagos grows (11 to 19.6 s) ----------

const W2 = { x: 66, y: 84, r: 42 } as const;

/** [x, width, height, wall, has a crane] */
const TOWN: readonly (readonly [number, number, number, string, boolean])[] = [
  [128, 20, 34, '#f0a35e', false], [150, 18, 50, '#9fb6e8', true], [170, 24, 40, '#7fc4a4', false],
  [196, 16, 64, '#f2d06b', false], [214, 22, 46, '#e58b8b', true], [238, 18, 56, '#d7a6d9', false],
  [258, 26, 38, '#b7d77a', false], [286, 18, 52, '#e7b98a', true],
];

function back2(g: CanvasRenderingContext2D, e: Ext): void {
  grad(g, e, 0, 130, '#8fd0f2', '#fdf0cf');
  disc(g, 40, 30, 12, '#ffd34d');
  band(g, e, 124, '#5fb3c9');
}

function front2(g: CanvasRenderingContext2D, e: Ext): void {
  // Our own bridge into the city, and the pavement in front
  bridge(g, e);
  band(g, e, 154, '#e9d8b4');
}

/** A crane on a rising block: a mast and a boom that swings gently. */
function crane(g: CanvasRenderingContext2D, x: number, top: number, w: number, swing: number): void {
  g.strokeStyle = '#d98a1e';
  g.lineWidth = 0.8;
  for (let yy = top - 12; yy < top; yy += 4) g.strokeRect(x + 2, yy, w - 4, 4);
  const mx = x + w - 4;
  const my = top - 30;
  const bx = mx + Math.cos(Math.PI + swing) * 14;
  const by = my + 2 + Math.sin(swing) * 3;
  line(g, '#d98a1e', 1.4, [mx, top - 12, mx, my, bx, by]);
  line(g, INK, 0.6, [bx + 4, by, bx + 4, by + 8]);
  box(g, bx + 2, by + 8, 4, 3, '#7d8a96', INK, 0.4);
}

function world2(g: CanvasRenderingContext2D, e: Ext, base: Base | null, T: number, withWheel: boolean): void {
  still(g, base, e, 'back2', (cg) => back2(cg, e));
  // Buildings grow up from the shore one after another (each 0.5 s, 0.4 s apart, 11.8 to 15 s)
  const lit = span(T, 17.5, 19.6);
  TOWN.forEach(([x, w, h, wall, cr], i) => {
    const k = ease(span(T, 11.8 + i * 0.4, 12.3 + i * 0.4));
    if (k <= 0) return;
    const drop = (1 - k) * (h + 34);
    g.save();
    g.beginPath();
    g.rect(e.l, e.t, e.r - e.l, 124 - e.t);
    g.clip();
    g.translate(0, drop);
    building(g, x, 124, w, h, wall, '#5b4636', false, lit * ((i % 3) + 1) / 3);
    if (cr) crane(g, x, 124 - h, w, Math.sin(T * 1.3 + i) * 0.35);
    g.restore();
  });
  still(g, base, e, 'front2', (cg) => front2(cg, e));
  // Two yellow buses roll in over the bridge and stop
  for (const [to, t0, t1] of [[150, 14, 15.6], [220, 14.9, 17]] as const) {
    if (T < t0) continue;
    const x = lerp(e.l - 18, to, easeOut(span(T, t0, t1)));
    g.save();
    g.translate(x, 138);
    g.scale(0.3, 0.3);
    drawBusShape(g, 0, 0, 0);
    g.restore();
  }
  // People walk in from the left: a bag on a head, a child holding a hand
  const walkers: Folk[] = [
    { x: 0, y: 172, skin: 1, top: '#e0572b', low: '#2b59c3', head: 'wrap', wrap: '#f2b300', pose: 'carry' },
    { x: 0, y: 172, skin: 4, top: '#2b59c3', low: '#1d1a14', head: 'bare', pose: 'walk' },
    { x: 0, y: 172, skin: 2, top: '#7fc4a4', low: '#46306f', head: 'braids', pose: 'walk', kid: true },
    { x: 0, y: 173, skin: 3, top: '#e9e1cf', low: '#e9e1cf', head: 'grey', pose: 'walk' },
    { x: 0, y: 172, skin: 0, top: '#9b59b6', low: '#5b4636', head: 'puff', pose: 'walk' },
  ];
  const starts = [15, 15.35, 15.35, 15.9, 16.3];
  walkers.forEach((p, i) => {
    const t0 = starts[i]!;
    if (T < t0) return;
    const x = e.l - 10 + (T - t0) * 52 - (i === 2 ? 9 : 0);
    const q: Folk = { ...p, x, ph: (T - t0) * 9 + i };
    person(g, q);
    if (i === 0) box(g, x - 3, 148.5, 7, 4, '#c8964a', INK, 0.5);
    // The child holds the grown-up's hand
    if (i === 2) line(g, '#7a4a2a', 0.9, [x + 1.5, 164, x + 6, 162]);
  });
  if (withWheel) wheel2(g, T, W2.x, W2.y, W2.r);
}

function wheel2(g: CanvasRenderingContext2D, T: number, x: number, y: number, r: number): void {
  wheel(g, x, y, r, wheelAngle(T));
  g.strokeStyle = 'rgba(29,26,20,0.45)';
  g.lineWidth = 1.6;
  g.lineCap = 'round';
  // Turn marks round the top half only, clear of the buses
  for (const a of [-3.0, -1.6, -0.2]) {
    g.beginPath();
    g.arc(x, y, r * 1.19, a, a + 0.7);
    g.stroke();
  }
}

// ---------- Beat 3: Nigeria's Wheel (19.6 to 25.4 s) ----------

/** Lagos on the map (the south-west coast). */
const LAGOS = toFrame([3.39, 6.47]);

/** The outline as a path from Lagos round and back, with the length so far at each point. */
let tour: { pts: [number, number][]; at: number[] } | null = null;
function outlineTour(): { pts: [number, number][]; at: number[] } {
  if (tour) return tour;
  const P = NIGERIA_OUTLINE;
  const pts: [number, number][] = [[LAGOS[0], LAGOS[1]]];
  for (let i = 0; i < P.length; i++) pts.push([P[i]![0], P[i]![1]]);
  pts.push([LAGOS[0], LAGOS[1]]);
  const at = [0];
  for (let i = 1; i < pts.length; i++) at.push(at[i - 1]! + Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]));
  tour = { pts, at };
  return tour;
}

/** The first border cog pops in here (s). */
const COGS_IN = 21.8;

/** Each border cog's pop-in time: from Lagos both ways round, 0.03 s a step (from 21.8 s). */
let popAt: number[] | null = null;
function cogPops(): number[] {
  if (popAt) return popAt;
  const cogs = borderCogs();
  let near = 0;
  cogs.forEach((c, i) => {
    if (Math.hypot(c.x - LAGOS[0], c.y - LAGOS[1]) < Math.hypot(cogs[near]!.x - LAGOS[0], cogs[near]!.y - LAGOS[1])) near = i;
  });
  const n = cogs.length;
  popAt = cogs.map((_, i) => {
    const d = Math.abs(i - near);
    return COGS_IN + Math.min(d, n - d) * 0.03;
  });
  return popAt;
}

function map3Sky(g: CanvasRenderingContext2D, e: Ext): void {
  grad(g, e, 0, 180, '#bfe6f5', '#fff4d9');
  disc(g, 160, 92, 84, 'rgba(255,236,170,0.5)');
}

/** Lake Chad, the shadow, the land in green, white, green to x `upTo`, and (when full) the outline. */
function map3Land(g: CanvasRenderingContext2D, fill: number, outline: boolean): void {
  faded(g, fill, () => {
    g.fillStyle = '#7cc6e4';
    g.beginPath();
    g.ellipse(64 + (14.15 - 2.7) * 16, 14 + (13.9 - 13.35) * 16, 8, 6, -0.4, 0, TAU);
    g.fill();
    g.save();
    g.translate(2, 3);
    nigeriaPath(g);
    g.fillStyle = 'rgba(29,26,20,0.15)';
    g.fill();
    g.restore();
  });
  if (fill > 0) {
    // Filled from west to east: green, white, green (land, never a flag shape)
    const upTo = 60 + 200 * fill;
    g.save();
    nigeriaPath(g);
    g.clip();
    g.fillStyle = NG_GREEN;
    g.fillRect(60, 10, Math.min(200, upTo - 60), 165);
    if (upTo > 128) {
      g.fillStyle = NG_WHITE;
      g.fillRect(128, 10, Math.min(64, upTo - 128), 165);
    }
    g.restore();
  }
  if (outline) {
    nigeriaPath(g);
    g.strokeStyle = '#1d4a2c';
    g.lineWidth = 1.2;
    g.lineJoin = 'round';
    g.stroke();
  }
}

/** All border cogs as one path (cheap): `turn` is how far they have turned, pops scale each in. */
function cogChain(g: CanvasRenderingContext2D, T: number): void {
  const cogs = borderCogs();
  const pops = cogPops();
  const turn = Math.max(0, T - 23.2) * 0.6;
  const n = 8;
  const R = cogs[0] ? cogs[0].r * 1.4 : 7;
  const pic = spriteSharp(g) ? sprite('cog', R, (cg) => cogChainAt(cg, 0, 0, R / 1.4)) : null;
  if (pic) {
    // One small copied picture per cog, turned and popped in
    cogs.forEach((c, i) => {
      const u = (T - pops[i]!) / 0.18;
      if (u <= 0) return;
      const sc = u >= 1 ? 1 : Math.sin(u * Math.PI * 0.5) * (1 + Math.sin(u * Math.PI) * 0.3);
      g.save();
      g.translate(c.x, c.y);
      g.rotate(c.phase + c.dir * turn);
      g.drawImage(pic, -R * sc, -R * sc, R * 2 * sc, R * 2 * sc);
      g.restore();
    });
    return;
  }
  g.fillStyle = C.brass;
  g.strokeStyle = C.brassDark;
  g.lineWidth = 0.55;
  g.beginPath();
  const hubs: [number, number, number][] = [];
  cogs.forEach((c, i) => {
    const u = (T - pops[i]!) / 0.18;
    if (u <= 0) return;
    // A tiny bounce as it pops in
    const sc = u >= 1 ? 1 : Math.sin(u * Math.PI * 0.5) * (1 + Math.sin(u * Math.PI) * 0.3);
    const r = c.r * sc;
    const rot = c.phase + c.dir * turn;
    for (let j = 0; j < n * 2; j++) {
      const a = rot + (j * Math.PI) / n;
      const rr = j % 2 === 0 ? r : r * 0.78;
      const a0 = a - Math.PI / n / 2;
      const a1 = a + Math.PI / n / 2;
      if (j === 0) g.moveTo(c.x + Math.cos(a0) * rr, c.y + Math.sin(a0) * rr);
      else g.lineTo(c.x + Math.cos(a0) * rr, c.y + Math.sin(a0) * rr);
      g.lineTo(c.x + Math.cos(a1) * rr, c.y + Math.sin(a1) * rr);
    }
    g.closePath();
    hubs.push([c.x, c.y, r * 0.3]);
  });
  g.fill();
  g.stroke();
  g.fillStyle = C.brassDark;
  g.beginPath();
  for (const [x, y, r] of hubs) {
    g.moveTo(x + r, y);
    g.arc(x, y, r, 0, TAU);
  }
  g.fill();
}

/** One border cog at (x, y), size r, not turned (the sprite). */
function cogChainAt(g: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  const n = 8;
  g.fillStyle = C.brass;
  g.strokeStyle = C.brassDark;
  g.lineWidth = 0.55;
  g.beginPath();
  for (let j = 0; j < n * 2; j++) {
    const a = (j * Math.PI) / n;
    const rr = j % 2 === 0 ? r : r * 0.78;
    const a0 = a - Math.PI / n / 2;
    const a1 = a + Math.PI / n / 2;
    if (j === 0) g.moveTo(x + Math.cos(a0) * rr, y + Math.sin(a0) * rr);
    else g.lineTo(x + Math.cos(a0) * rr, y + Math.sin(a0) * rr);
    g.lineTo(x + Math.cos(a1) * rr, y + Math.sin(a1) * rr);
  }
  g.closePath();
  g.fill();
  g.stroke();
  disc(g, x, y, r * 0.3, C.brassDark);
}

function lagosDot(g: CanvasRenderingContext2D, a: number, big: number): void {
  faded(g, a, () => {
    disc(g, LAGOS[0], LAGOS[1], 5 + big * 6, 'rgba(255,214,90,0.45)');
    disc(g, LAGOS[0], LAGOS[1], 2.6, '#ffe58a');
    g.strokeStyle = INK;
    g.lineWidth = 0.7;
    g.beginPath();
    g.arc(LAGOS[0], LAGOS[1], 2.6, 0, TAU);
    g.stroke();
  });
}

function world3(g: CanvasRenderingContext2D, e: Ext, base: Base | null, T: number, withWheel = true): void {
  if (T >= COGS_IN) {
    still(g, base, e, 'map3', (cg) => {
      map3Sky(cg, e);
      map3Land(cg, 1, true);
    });
  } else {
    map3Sky(g, e);
    const fill = span(T, 21.1, COGS_IN);
    map3Land(g, fill, fill >= 1);
    // The outline draws itself round from Lagos (20.4 to 21.1 s), then fills (21.1 to 21.8 s)
    const d = ease(span(T, 20.4, 21.1));
    if (d > 0 && fill < 1) {
      const { pts, at } = outlineTour();
      const L = at[at.length - 1]! * d;
      g.strokeStyle = '#1d4a2c';
      g.lineWidth = 1.2;
      g.lineJoin = 'round';
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(pts[0]![0], pts[0]![1]);
      for (let i = 1; i < pts.length; i++) {
        if (at[i]! <= L) g.lineTo(pts[i]![0], pts[i]![1]);
        else {
          const k = (L - at[i - 1]!) / (at[i]! - at[i - 1]!);
          g.lineTo(lerp(pts[i - 1]![0], pts[i]![0], k), lerp(pts[i - 1]![1], pts[i]![1], k));
          break;
        }
      }
      g.stroke();
    }
  }
  if (T >= COGS_IN) cogChain(g, T);
  // Soft light pulses out from the Wheel twice (23.6 and 24.6 s, 1 a second), never a flash
  for (const p0 of [23.6, 24.6]) {
    const k = span(T, p0, p0 + 0.6);
    if (k > 0 && k < 1)
      faded(g, (1 - k) * 0.8, () => {
        g.strokeStyle = '#fff3c4';
        g.lineWidth = 5 - k * 3;
        g.beginPath();
        g.arc(MAP_WHEEL.x, MAP_WHEEL.y, MAP_WHEEL.r + 3 + k * 46, 0, TAU);
        g.stroke();
      });
  }
  lagosDot(g, 1, 0);
  if (withWheel) wheel(g, MAP_WHEEL.x, MAP_WHEEL.y, MAP_WHEEL.r, wheelAngle(T));
}

/**
 * Works out the map's sums ahead (the border cogs take about 70 ms the first time, 4 times that
 * on a slow phone). Call it when the intro screen opens, before the first frame, so beat 3 does
 * not stall. Safe to call again: it is done only once.
 */
export function prepareIntroScene(): void {
  cogPops();
  outlineTour();
}

// ---------- Beats 4 and 5: the Stoppers, then the hero (25.4 to 39 s) ----------

const W4 = { x: 160, y: 84, r: 44 } as const;
const GROUND = 128;

interface StopperPlace {
  kind: StopperKind;
  x: number;
  y: number;
  s: number;
  /** Arrives at this time. */
  at: number;
  /** Which way is "away from the Wheel" (-1 left, 1 right). */
  side: -1 | 1;
}

const STOPPER_PLACES: readonly StopperPlace[] = [
  // a2.12: in the order the caption names them (traffic, potholes, power cuts, red tape)
  { kind: 'jam', x: 36, y: 172, s: 1.15, at: 26, side: -1 },
  { kind: 'pothole', x: 84, y: 177, s: 1, at: 26.9, side: -1 },
  { kind: 'darkLamp', x: 232, y: 172, s: 1.3, at: 27.8, side: 1 },
  { kind: 'redTape', x: 290, y: 171, s: 1.25, at: 28.7, side: 1 },
];

/** Where the hero stands to push (feet), and the hero's size. */
const HERO4 = { x: 121, y: 150, s: 0.95 } as const;

function sky45(T: number): [string, string] {
  const grey = ease(span(T, 25.7, 27));
  const gold = ease(span(T, 35.8, 37.5));
  let top = mixHex('#bfe6f5', '#b9b3cf', grey);
  let bottom = mixHex('#fff4d9', '#efe3cf', grey);
  top = mixHex(top, '#ffcf7a', gold);
  bottom = mixHex(bottom, '#fff6dc', gold);
  return [top, bottom];
}

/** The wedge pops out here (s), as the hero pushes. */
const POP = 34.6;

/** The wedge: under the Wheel from 29.9 s, popped out in a spinning arc from 34.6 s. */
function wedge(g: CanvasRenderingContext2D, e: Ext, T: number): void {
  if (T < 29.4) return;
  let x: number;
  let y: number;
  let rot = 0;
  let s = 1;
  if (T < POP) {
    // Nudged along by the stack from in front of it to under the Wheel (29.4 to 29.9 s)
    const k = easeOut(span(T, 29.4, 29.9));
    x = lerp(262, 166, k);
    y = lerp(170, GROUND - 3, k) - Math.sin(k * Math.PI) * 6;
    s = lerp(1.3, 1, k);
    rot = Math.sin(k * Math.PI * 3) * 0.15 * (1 - k);
  } else {
    // Off the screen in a funny spinning arc, up and over everyone
    const u = T - POP;
    x = 166 + u * 150;
    y = GROUND - 3 - u * 190 + u * u * 120;
    rot = u * 9;
    if (x > e.r + 30 || y < e.t - 30) return;
  }
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.scale(s, s);
  g.fillStyle = '#6b4a2b';
  g.strokeStyle = INK;
  g.lineWidth = 0.7;
  g.beginPath();
  g.moveTo(-14, 3);
  g.lineTo(14, 3);
  g.lineTo(0, -7);
  g.closePath();
  g.fill();
  g.stroke();
  line(g, '#8a6a4a', 0.8, [-8, 1, 6, 1]);
  g.restore();
}

/** One Stopper at time T: its entrance, the lean back and pout, then the flinch and blink. */
function stopperAt(g: CanvasRenderingContext2D, e: Ext, p: StopperPlace, T: number): void {
  if (T < p.at) return;
  const u = T - p.at;
  let x = p.x;
  let y = p.y;
  let sy = 1;
  if (p.kind === 'jam') {
    // Bumps in from the left
    const k = easeOut(span(u, 0, 0.55));
    x = lerp(e.l - 40, p.x, k);
    y -= Math.abs(Math.sin(k * Math.PI * 3)) * 3 * (1 - k * 0.5);
  } else if (p.kind === 'pothole') {
    // Opens like a mouth
    sy = spring(span(u, 0, 0.35));
  } else if (p.kind === 'darkLamp') {
    // Springs up
    sy = spring(span(u, 0, 0.3));
  } else {
    // Hops in from the right on its own: two hops
    const k = span(u, 0, 0.5);
    x = lerp(e.r + 30, p.x, k);
    y -= Math.abs(Math.sin(k * Math.PI * 2)) * 12;
  }
  // The stack nudges the wedge (29.4 to 29.8 s)
  if (p.kind === 'redTape') x -= Math.sin(span(T, 29.4, 29.8) * Math.PI) * 10;
  // Lean back, pleased (30.4 to 30.9 s), then flinch back a step (36.0 to 36.3 s)
  const lean = ease(span(T, 30.4, 30.9)) * (1 - ease(span(T, 36, 36.3)));
  const flinch = ease(span(T, 36, 36.3));
  x += p.side * flinch * 9;
  y -= Math.sin(span(T, 36, 36.3) * Math.PI) * 3;
  const blink = (T > 36.1 && T < 36.32) || (T > 30.75 && T < 30.88);
  g.save();
  g.translate(x, y);
  g.rotate(p.side * lean * 0.12);
  if (sy !== 1) g.scale(1, Math.max(0.02, sy));
  drawStopper(g, p.kind, 0, 0, p.s, blink);
  const s = p.s;
  if (p.kind === 'darkLamp') {
    // The bulb flickers twice, then goes out (at most 2 a second, small and soft)
    const on = (u > 0.05 && u < 0.3) || (u > 0.55 && u < 0.8);
    if (on) {
      disc(g, 13 * s, -36 * s, 9 * s, 'rgba(255,226,120,0.35)');
      g.fillStyle = '#ffe17a';
      g.beginPath();
      g.ellipse(13 * s, -37.5 * s, 6 * s, 2 * s, 0, 0, TAU);
      g.fill();
    }
  }
  if (p.kind === 'redTape') {
    // A loose end of red tape flapping
    const f = Math.sin(T * 11) * 3;
    line(g, '#c0392b', 1.6 * s, [-12 * s, -30 * s, -18 * s, (-33 + f) * s, -23 * s, (-30 - f) * s]);
  }
  if (p.kind === 'jam' && u < 0.9) {
    // Honk puffs as it bumps in
    faded(g, 1 - u / 0.9, () => {
      disc(g, -30 * s - u * 10, -36 * s - u * 8, 3 + u * 4, 'rgba(160,160,170,0.7)');
      disc(g, 26 * s + u * 8, -38 * s - u * 10, 2.5 + u * 3, 'rgba(160,160,170,0.6)');
    });
  }
  g.restore();
  // Grumbling: small zigzags over its head (36.3 to 37.0 s)
  if (T > 36.3) {
    const top = p.kind === 'darkLamp' ? -50 : p.kind === 'pothole' ? -22 : -44;
    faded(g, 1 - span(T, 36.6, 37), () => {
      const gx = x + p.side * 4;
      const gy = y + top * p.s - 4 - Math.sin(T * 6) * 1;
      line(g, INK, 0.9, [gx - 5, gy, gx - 3, gy - 2, gx - 1, gy, gx + 1, gy - 2, gx + 3, gy, gx + 5, gy - 2]);
    });
  }
}

/** The hero in beats 4 and 5: walking in, stopping, pushing, then standing tall. */
function hero45(g: CanvasRenderingContext2D, e: Ext, T: number, look: HeroLook | null): void {
  if (T < 31.6) return;
  // Walks in (31.6 to 33.6 s), looks, hands on the Wheel (to 34.4 s), pushes (to 35.8 s)
  const walkK = span(T, 31.6, 33.6);
  const startX = Math.min(e.l - 14, -14);
  const x = lerp(startX, HERO4.x, walkK) + ease(span(T, POP, 35.3)) * 3;
  const walking = T < 33.6;
  const push = T < 33.9 ? 0 : T < 35.5 ? ease(span(T, 33.9, 34.3)) : 1 - ease(span(T, 35.5, 36));
  // A hard shove while the Wheel creaks and rocks
  const shove = T > 34.3 && T < 35.3 ? Math.sin(span(T, 34.3, 35.3) * Math.PI * 3) * 0.08 : 0;
  // A little shadow on the ground
  faded(g, 0.18, () => {
    g.fillStyle = INK;
    g.beginPath();
    g.ellipse(x, HERO4.y + 1, 11, 2.4, 0, 0, TAU);
    g.fill();
  });
  g.save();
  g.translate(x, HERO4.y);
  g.scale(HERO4.s, HERO4.s);
  const dist = (x - startX) / HERO4.s;
  if (look) {
    drawHero(g, look, {
      phase: dist / (58 * WALK_STRIDE),
      inAir: false,
      facing: 1,
      glow: false,
      gait: 'walk',
      standing: !walking,
      push: Math.min(1, push + shove),
      time: T,
    });
  } else {
    drawOutlineHero(g, walking ? { step: (dist / 36) * TAU } : { push: Math.min(1, push + shove), breathe: T });
  }
  g.restore();
}

function ground45(g: CanvasRenderingContext2D, e: Ext): void {
  // A plain road: the back pavement and the road in front
  band(g, e, GROUND, '#cdbf9f');
  line(g, '#a8987a', 1, [e.l, GROUND, e.r, GROUND]);
  band(g, e, 146, '#bfb093');
  g.fillStyle = '#efe6cf';
  for (let x = Math.floor(e.l / 40) * 40; x < e.r; x += 40) g.fillRect(x + 6, 162, 16, 2);
}

/** The sky (its colours at T), the warm patch on the left and the light round the Wheel. */
function sky45Paint(g: CanvasRenderingContext2D, e: Ext, T: number): void {
  const [top, bottom] = sky45(T);
  const sky = g.createLinearGradient(0, 0, 0, 180);
  sky.addColorStop(0, top);
  sky.addColorStop(1, bottom);
  g.fillStyle = sky;
  g.fillRect(e.l, e.t, e.r - e.l, GROUND + 1 - e.t);
  // A warm patch of light opens on the left (31.6 s), then light floods back (35.8 s)
  const warm = ease(span(T, 31.6, 32.4));
  if (warm > 0) {
    faded(g, warm * (1 - span(T, 36.3, 37.5) * 0.5), () => {
      disc(g, 20, 112, 30 + warm * 50, 'rgba(255,226,150,0.35)');
      disc(g, 20, 112, 20 + warm * 30, 'rgba(255,236,180,0.45)');
    });
  }
  const flood = ease(span(T, 35.8, 36.8));
  if (flood > 0) faded(g, flood, () => disc(g, W4.x, W4.y, 72, 'rgba(255,236,170,0.6)'));
}

function world45(g: CanvasRenderingContext2D, e: Ext, base: Base | null, T: number, look: HeroLook | null, withWheel: boolean): void {
  // While the light holds still (lilac 27 to 31.6 s, lilac with the warm patch 32.4 to 35.8 s,
  // gold from 37.5 s), sky and road are one copied layer; while it changes, only the sky is painted.
  const hold = T >= 27 && T < 31.6 ? 'lilac' : T >= 32.4 && T < 35.8 ? 'warm' : T >= 37.5 ? 'gold' : null;
  if (hold) {
    const at = hold === 'lilac' ? 29 : hold === 'warm' ? 33 : 38;
    still(g, base, e, `sky45${hold}`, (cg) => {
      sky45Paint(cg, e, at);
      ground45(cg, e);
    });
  } else {
    sky45Paint(g, e, T);
    still(g, base, e, 'ground45', (cg) => ground45(cg, e), GROUND - 1);
  }
  if (withWheel) wheel(g, W4.x, W4.y, W4.r, wheelAngle(T), 0, T >= 30.2 && T < 35.8);
  wedge(g, e, T);
  // The hero walks on the pavement behind the Stoppers, which sit nearer, in the road (qa: as the
  // hero walked in, it was drawn over the jam's cars, as if walking on them).
  hero45(g, e, T, look);
  for (const p of STOPPER_PLACES) if (p.kind === 'jam' || p.kind === 'pothole') stopperAt(g, e, p, T);
  for (const p of STOPPER_PLACES) if (p.kind !== 'jam' && p.kind !== 'pothole') stopperAt(g, e, p, T);
}

// ---------- Beat 6: the journey starts at a Lagos bus stop (39 s on) ----------

/**
 * The bus's resting place (wheels on y) and size. It faces left here and rolls in from the
 * right, so it never passes behind the people waiting; its door ends up by the stop.
 */
const BUS6 = { x: 204, y: 150, s: 1.05 } as const;
const DOOR_X = BUS6.x - 23 * BUS6.s;
/** Where the hero stops: at the door (qa: not beside the front wheel). */
const HERO6_X = DOOR_X - 2;
/** How fast the people waiting walk to the door (units a second): the last is on by about 42 s. */
const QUEUE_PACE = 72;

function back6(g: CanvasRenderingContext2D, e: Ext): void {
  grad(g, e, 0, 130, '#6fc2f0', '#fbe6b4');
  disc(g, 270, 40, 22, 'rgba(255,233,160,0.6)');
  disc(g, 270, 40, 14, '#ffd34d');
  const far: [number, number, number][] = [[0, 24, 40], [26, 20, 62], [48, 30, 48], [80, 18, 70], [100, 26, 44], [196, 22, 56], [220, 30, 74], [252, 20, 50], [274, 28, 64], [304, 22, 46]];
  for (const [x, w, h] of far) {
    g.fillStyle = '#a9c3cf';
    g.fillRect(x, 120 - h, w, h);
    g.fillStyle = '#c9dde6';
    for (let yy = 124 - h; yy < 114; yy += 8) g.fillRect(x + 4, yy, w - 8, 3);
  }
  g.fillStyle = '#a9c3cf';
  g.fillRect(e.l, 112, e.r - e.l, 8);
  palm(g, 30, 128, 26);
  palm(g, 300, 128, 30);
  band(g, e, 120, '#d9cbb0');
  band(g, e, 150, '#3e3e42');
  g.fillStyle = '#f4f1e6';
  for (let x = Math.floor(e.l / 30) * 30; x < e.r; x += 30) g.fillRect(x, 164, 14, 2);
  g.fillStyle = '#d8c27a';
  g.fillRect(e.l, 150, e.r - e.l, 2);
  g.save();
  g.translate(78, 152);
  g.scale(0.85, 0.85);
  drawBusStop(g, 0, true, 0, 0, false);
  g.restore();
}

/** The bus starts rolling in (during the zoom out of the hub) and stops (s). */
const BUS_IN = 39.35;
const BUS_STOP = 40.4;

/** The bus's x at time T: rolling in from the right, slowing to a stop at 40.4 s. */
function busX(T: number): number {
  return BUS6.x + 150 * (1 - easeOut(span(T, BUS_IN, BUS_STOP)));
}

/** Where the bus's front wheel is at time T (the zoom follows it). */
function frontWheel(T: number): [number, number] {
  return [busX(T) - 26 * BUS6.s, BUS6.y - 7 * BUS6.s];
}

/** The bus, with turning hub bolts on its wheels, a little rock as it stops and a gentle idle. */
function bus6(g: CanvasRenderingContext2D, T: number): void {
  const x = busX(T);
  const rock = T > BUS_STOP ? Math.sin((T - BUS_STOP) * 16) * 0.03 * Math.max(0, 1 - (T - BUS_STOP) / 0.45) : 0;
  const idle = T > BUS_STOP + 0.5 ? Math.sin(T * 3.2) * 0.5 : 0;
  g.save();
  // Rocks on its back wheel as it stops
  g.translate(x + 26 * BUS6.s, BUS6.y);
  g.rotate(rock);
  g.translate(-26 * BUS6.s, idle);
  g.scale(-BUS6.s, BUS6.s);
  drawBusShape(g, 0, 0, 0, T >= 40.6);
  // The wheels turn as it rolls: the same turning that was the Wheel's
  const spin = (busX(BUS_IN) - x) / 7 + wheelAngle(T) * 0.05;
  g.fillStyle = '#d0d0d0';
  g.beginPath();
  for (const wx of [-26, 26])
    for (let i = 0; i < 5; i++) {
      const a = spin + (i * TAU) / 5;
      g.moveTo(wx + Math.cos(a) * 4.4 + 0.9, -7 + Math.sin(a) * 4.4);
      g.arc(wx + Math.cos(a) * 4.4, -7 + Math.sin(a) * 4.4, 0.9, 0, TAU);
    }
  g.fill();
  g.restore();
}

/** The people waiting at the stop, nearest the door first. */
const QUEUE: readonly Folk[] = [
  { x: 150, y: 150, skin: 4, top: '#2f5d8a', low: '#e9e1cf', head: 'bare', pose: 'stand' },
  { x: 134, y: 150, skin: 2, top: '#e0572b', low: '#2b59c3', head: 'wrap', wrap: '#2b59c3', pose: 'stand' },
  { x: 122, y: 150, skin: 0, top: '#f2b300', low: '#7b2d26', head: 'puff', pose: 'point', kid: true },
  { x: 104, y: 150, skin: 3, top: '#9b59b6', low: '#46306f', head: 'braids', pose: 'stand' },
];

function world6(g: CanvasRenderingContext2D, e: Ext, base: Base | null, T: number, look: HeroLook | null): void {
  still(g, base, e, 'back6', (cg) => back6(cg, e));
  bus6(g, T);
  // The people waiting step on, one after another (from 40.4 s)
  QUEUE.forEach((p, i) => {
    const t0 = 40.4 + i * 0.18;
    const x = T < t0 ? p.x : Math.min(DOOR_X, p.x + (T - t0) * QUEUE_PACE);
    const there = t0 + (DOOR_X - p.x) / QUEUE_PACE;
    const gone = span(T, there - 0.05, there + 0.12);
    if (gone >= 1) return;
    faded(g, 1 - gone, () => person(g, T < t0 ? p : { ...p, x, pose: 'walk', f: 1, ph: (T - t0) * 10 }));
  });
  // The hero jogs in from the left and stops at the bus door, ready (41.0 to 42.6 s)
  if (T >= 41) {
    const s = 0.62;
    const startX = Math.min(e.l - 14, -14);
    const k = easeOut(span(T, 41, 42.6));
    const x = lerp(startX, HERO6_X, k);
    const moving = T < 42.6;
    const dist = (x - startX) / s;
    g.save();
    g.translate(x, BUS6.y);
    g.scale(s, s);
    if (look) {
      drawHero(g, look, { phase: dist / 58, inAir: false, facing: 1, glow: false, standing: !moving, time: T });
    } else {
      drawOutlineHero(g, moving ? { step: (dist / 40) * TAU } : { breathe: T });
    }
    g.restore();
  }
}

// ---------- The scene ----------

function wheelAt(g: CanvasRenderingContext2D, T: number, a: { x: number; y: number; r: number }, b: { x: number; y: number; r: number }, k: number): void {
  wheel(g, lerp(a.x, b.x, k), lerp(a.y, b.y, k), lerp(a.r, b.r, k), wheelAngle(T));
}

/** Draws `paint` zoomed by `sc` round the point (fx, fy), which lands on (px, py). */
function zoomed(g: CanvasRenderingContext2D, sc: number, fx: number, fy: number, px: number, py: number, paint: () => void): void {
  g.save();
  g.translate(px, py);
  g.scale(sc, sc);
  g.translate(-fx, -fy);
  paint();
  g.restore();
}

/**
 * Draws the moving intro at time t (seconds from the start; past INTRO_HOLD it holds, with the
 * bus idling and the hero breathing) to fill w x h canvas units, like drawIntroFrame: the
 * 320 x 180 picture as big as fits, sky and ground stretched to the edges. Leaves the context
 * as it found it. The same t always draws the same picture.
 */
export function drawIntroScene(g: CanvasRenderingContext2D, w: number, h: number, t: number, opts: IntroSceneOptions = {}): void {
  const T = Number.isFinite(t) ? Math.max(0, t) : 0;
  const W = w > 0 && Number.isFinite(w) ? w : INTRO_VIEW.w;
  const H = h > 0 && Number.isFinite(h) ? h : INTRO_VIEW.h;
  const look = opts.look ?? null;
  // a2.12: the picture fits above the subtitle strip; the ground carries on under it
  const inset = Number.isFinite(opts.inset) ? Math.min(Math.max(0, opts.inset!), H * 0.6) : 0;
  const s = Math.min(W / INTRO_VIEW.w, (H - inset) / INTRO_VIEW.h);
  const ox = (W - INTRO_VIEW.w * s) / 2;
  const oy = (H - inset - INTRO_VIEW.h * s) / 2;
  const e: Ext = { l: -ox / s - 1, r: INTRO_VIEW.w + ox / s + 1, t: -oy / s - 1, b: (H - oy) / s + 1 };
  g.save();
  g.beginPath();
  g.rect(0, 0, W, H);
  g.clip();
  g.translate(ox, oy);
  g.scale(s, s);
  let base: Base | null = null;
  if (typeof document !== 'undefined' && typeof g.getTransform === 'function') {
    const m = g.getTransform();
    if (m.b === 0 && m.c === 0 && m.a > 0 && Math.abs(m.a - m.d) < 1e-9) base = { k: m.a, x: m.e + e.l * m.a, y: m.f + e.t * m.a };
  }
  curBase = base;

  if (T < 11) {
    world1(g, e, base, T, true);
  } else if (T < 11.8) {
    // The camera slides right: the savanna out to the left, the lagoon in; the Wheel stays
    const k = ease(span(T, 11, 11.8));
    // Slide by whole screen pixels, so the copied layers stay sharp and cheap
    const px = base ? base.k : 1;
    const D = Math.round((e.r - e.l) * px) / px;
    const dx = Math.round(D * k * px) / px;
    g.save();
    g.translate(-dx, 0);
    clipExt(g, e);
    world1(g, e, base, T, false);
    g.restore();
    g.save();
    g.translate(D - dx, 0);
    clipExt(g, e);
    world2(g, e, base, T, false);
    g.restore();
    wheelAt(g, T, { ...W1, r: W1.r * drift1(T) }, W2, k);
  } else if (T < 19.6) {
    world2(g, e, base, T, true);
  } else if (T < 20.4) {
    // The camera pulls back and up: the city shrinks to a glowing dot on Lagos
    const k = ease(span(T, 19.6, 20.4));
    still(g, base, e, 'sky3', (cg) => map3Sky(cg, e));
    const sc = Math.pow(0.04, k);
    faded(g, 1 - span(k, 0.15, 0.6), () =>
      zoomed(g, sc, 160, 90, lerp(160, LAGOS[0], k), lerp(90, LAGOS[1], k), () => {
        clipExt(g, e);
        world2(g, e, base, T, false);
      }),
    );
    lagosDot(g, k, 1 - k);
    wheelAt(g, T, W2, MAP_WHEEL, k);
  } else if (T < 25.4) {
    world3(g, e, base, T);
  } else if (T < 26) {
    // The camera drops back to the ground: the map grows and fades, the road rises into view
    const k = ease(span(T, 25.4, 26));
    const [top, bottom] = sky45(T);
    grad(g, e, 0, 180, top, bottom);
    g.save();
    g.translate(0, (1 - k) * 30);
    world45(g, e, base, T, look, false);
    g.restore();
    faded(g, 1 - span(k, 0, 0.7), () => zoomed(g, 1 + k * 1.5, MAP_WHEEL.x, MAP_WHEEL.y, MAP_WHEEL.x, MAP_WHEEL.y, () => world3(g, e, base, T, false)));
    wheelAt(g, T, MAP_WHEEL, W4, k);
  } else if (T < 39) {
    world45(g, e, base, T, look, true);
  } else if (T < 39.8) {
    // The camera rushes in to the Wheel's hub; pulling back out, it is the bus's front wheel
    if (T < 39.45) {
      const k = span(T, 39, 39.35);
      zoomed(g, Math.pow(9, k * k), W4.x, W4.y, W4.x, W4.y, () => world45(g, e, base, T, look, true));
    }
    if (T > 39.35) {
      const k = ease(span(T, 39.35, 39.8));
      const [fx, fy] = frontWheel(T);
      faded(g, span(T, 39.35, 39.45), () =>
        zoomed(g, Math.pow(9, 1 - k), fx, fy, lerp(W4.x, fx, k), lerp(W4.y, fy, k), () => world6(g, e, base, T, look)),
      );
    }
  } else {
    world6(g, e, base, T, look);
  }
  g.restore();
}
