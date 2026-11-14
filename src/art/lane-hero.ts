/**
 * The hero seen FROM BEHIND, for the lane run (design.md S3f0 part 16, task S3f1).
 *
 * New drawing code, separate from the side-view hero in hero.ts (which is being redrawn for
 * decision 60/65 and is not touched here). It uses the same choice lists (SKINS, HAIRS,
 * OUTFITS, BODIES, AGES) so every built look shows, and the same spirit as that redraw:
 * two-tone shading, a warm light edge (on dark skin too), and a bold ink outline.
 *
 * Units are lane units (LANE_U = 32 u to a metre); the origin is the ground between the feet,
 * y grows down, and the hero stands about 50 u (1.56 m) tall. Seen from behind, the hero's
 * left is on the screen's left.
 *
 * Moves: run (4 frames), jump, slide, stumble (2), torch shrug (2), wave (2).
 * Layers: legs, body and clothes, arms, head, hair; each comes from the look's own choice.
 */
import { HAIRS, OUTFITS, SKINS, SUIT, ageOf, bodyOf, type HairOption, type HeroLook, type OutfitOption, type SkinOption } from './hero';
import { INK, WHITE } from './palette';
import { LANE_U, bake, capsule, dot, line, mix, oval, poly, rimOf, shadeOf, shape, type Baked, type UBox } from './lane-shade';

export type LaneHeroMove = 'run' | 'jump' | 'slide' | 'stumble' | 'torch' | 'wave';

/** How many frames each move has. */
export const LANE_HERO_FRAMES: Readonly<Record<LaneHeroMove, number>> = { run: 4, jump: 1, slide: 1, stumble: 2, torch: 2, wave: 2 };

export interface LaneHeroPose {
  move: LaneHeroMove;
  /** Frame of the move (0 based); wraps. */
  frame?: number;
  /** The garri tech suit (decision 43) is on. */
  suit?: boolean;
}

/** Every pose of the back view, in a fixed order (for baking and the gallery). */
export const LANE_HERO_POSES: readonly LaneHeroPose[] = (Object.keys(LANE_HERO_FRAMES) as LaneHeroMove[]).flatMap((move) =>
  Array.from({ length: LANE_HERO_FRAMES[move] }, (_, frame) => ({ move, frame })),
);

/** The box (u) every pose and look stays inside, round the anchor. */
export const LANE_HERO_BOX: UBox = { l: -28, r: 34, t: -74, b: 4 };

/**
 * The back view is drawn 10 percent bigger than the side view's 50 u, so even a Teen is 56 px
 * or more at 320 x 240 (part 5) once the camera's metres are applied.
 */
export const LANE_HERO_SCALE = 1.1;

/** The run frame for a run phase 0 to 1 (one phase is two steps). */
export function laneRunFrame(phase: number): 0 | 1 | 2 | 3 {
  const p = Number.isFinite(phase) ? phase - Math.floor(phase) : 0;
  return (Math.floor(p * 4) % 4) as 0 | 1 | 2 | 3;
}

/** The stumble frame for k 0 to 1 over the 0.5 s trip: the trip, then the catch. */
export function laneStumbleFrame(k: number): 0 | 1 {
  return Number.isFinite(k) && k >= 0.45 ? 1 : 0;
}

/** The torch shrug frame for k 0 to 1 over the 1.2 s caught moment: looking round, then the torch and the grin. */
export function laneTorchFrame(k: number): 0 | 1 {
  return Number.isFinite(k) && k >= 0.5 ? 1 : 0;
}

const GREY = '#b9b4ac';
const GREY_SHADE = '#8d877e';
const BEAD_RED = '#e0572b';
const STUD = '#f2c14e';

interface Build {
  len: number;
  head: number;
  sw: number;
  hw: number;
  limb: number;
  grey: boolean;
  female: boolean;
}

const AGE = [
  { len: 0.905, head: 0.96, w: 0.9, limb: 0.85 },
  { len: 1, head: 1, w: 1, limb: 1 },
  { len: 0.98, head: 1, w: 0.95, limb: 0.9 },
] as const;

function buildOf(look: HeroLook): Build {
  const female = bodyOf(look) === 1;
  const age = ageOf(look);
  const a = AGE[age] ?? AGE[1];
  return { len: a.len, head: a.head, sw: a.w * (female ? 0.93 : 1), hw: a.w * (female ? 1.07 : 1), limb: a.limb, grey: age === 2, female };
}

/** A leg: knee and ankle (absolute u, adult sizes), and whether the shoe sole faces the camera (foot kicked back). */
type Leg = readonly [kx: number, ky: number, ax: number, ay: number, sole: 0 | 1];
/** An arm: elbow and wrist (absolute u), and whether it is in front of the body (swung back toward the camera). */
type Arm = readonly [ex: number, ey: number, wx: number, wy: number, front: 0 | 1];

interface Rig {
  /** Hip and shoulder heights (u, adult). */
  hip: number;
  sh: number;
  /** Shoulders and head move sideways this much (u). */
  lean: number;
  /** Left leg, right leg (screen left, screen right). */
  legs: readonly [Leg, Leg];
  arms: readonly [Arm, Arm];
  /** 0 the back of the head; -1 or 1 looking left or right; 2 a grin back over the right shoulder. */
  turn: -1 | 0 | 1 | 2;
  /** Hair and cloth swing (-1 to 1). */
  swing: number;
  /** Shoulders lifted (the shrug). */
  shrug: number;
  /** A torch in the right hand, beam on. */
  torch?: boolean;
  /** Sliding: legs reach forward out of sight. */
  slide?: boolean;
}

const mirrorLeg = (l: Leg): Leg => [-l[0], l[1], -l[2], l[3], l[4]];
const mirrorArm = (a: Arm): Arm => [-a[0], a[1], -a[2], a[3], a[4]];

const PLANT: Leg = [-3.1, -12, -3, -2.4, 0];
const KICK: Leg = [3.4, -14.6, 3.6, -9.6, 1];
const PASS_PLANT: Leg = [-3.1, -11.6, -3.1, -2.4, 0];
const PASS_SWING: Leg = [3.1, -12.8, 3.3, -6.2, 1];
const ARM_FWD: Arm = [-8.2, -29.2, -6.4, -31.6, 0];
const ARM_BACK: Arm = [8.6, -28.6, 8.2, -23.4, 1];
const ARM_SIDE: Arm = [-8.1, -28.4, -7.6, -24, 1];

const RUN: readonly Rig[] = [
  { hip: -22.8, sh: -35.8, lean: -0.5, legs: [PLANT, KICK], arms: [ARM_FWD, ARM_BACK], turn: 0, swing: 0.8, shrug: 0 },
  { hip: -21.6, sh: -34.6, lean: 0, legs: [PASS_PLANT, PASS_SWING], arms: [ARM_SIDE, mirrorArm(ARM_SIDE)], turn: 0, swing: 0, shrug: 0 },
  { hip: -22.8, sh: -35.8, lean: 0.5, legs: [mirrorLeg(KICK), mirrorLeg(PLANT)], arms: [mirrorArm(ARM_BACK), mirrorArm(ARM_FWD)], turn: 0, swing: -0.8, shrug: 0 },
  { hip: -21.6, sh: -34.6, lean: 0, legs: [mirrorLeg(PASS_SWING), mirrorLeg(PASS_PLANT)], arms: [ARM_SIDE, mirrorArm(ARM_SIDE)], turn: 0, swing: 0, shrug: 0 },
];

const STAND_L: Leg = [-3, -11.8, -3, -2.4, 0];
const HANG_L: Arm = [-7.9, -28.2, -7.8, -21.6, 1];

function rigOf(pose: LaneHeroPose): Rig {
  const n = LANE_HERO_FRAMES[pose.move] ?? 1;
  const f = (((Math.floor(pose.frame ?? 0) % n) + n) % n) | 0;
  switch (pose.move) {
    case 'run':
      return RUN[f]!;
    case 'jump':
      return {
        hip: -22.4,
        sh: -35.6,
        lean: 0,
        legs: [[-3.7, -15.2, -3.5, -9.2, 1], [3.5, -16, 3.7, -10.6, 1]],
        arms: [[-9.6, -38, -10.6, -43.4, 1], [9.6, -38, 10.6, -43.4, 1]],
        turn: 0,
        swing: -1,
        shrug: 0.6,
      };
    case 'slide':
      return {
        hip: -5.5,
        sh: -18.4,
        lean: 0,
        legs: [[-3.3, -2.2, -3.3, -1.6, 0], [3.3, -2.2, 3.3, -1.6, 0]],
        arms: [[-10.6, -12.6, -14, -5.4, 1], [10.6, -12.6, 14, -5.4, 1]],
        turn: 0,
        swing: -1,
        shrug: 0.4,
        slide: true,
      };
    case 'stumble':
      return f === 0
        ? {
            hip: -21.6,
            sh: -32.8,
            lean: -2.2,
            legs: [[-4.6, -11.2, -6.2, -2.4, 0], [3.9, -15.4, 4.2, -11.6, 1]],
            arms: [[-10.4, -36.6, -12.8, -42, 1], [10.2, -36, 13.2, -39.4, 1]],
            turn: 0,
            swing: 1,
            shrug: 0.8,
          }
        : {
            hip: -20.8,
            sh: -33.8,
            lean: 1.2,
            legs: [[-4.2, -11, -4.8, -2.4, 0], [4.2, -11, 5, -2.4, 0]],
            arms: [[-10, -30.4, -12.8, -27.4, 1], [10, -30.8, 12.6, -34, 1]],
            turn: 1,
            swing: -0.6,
            shrug: 0.3,
          };
    case 'torch':
      return f === 0
        ? { hip: -22.4, sh: -35.4, lean: 0, legs: [STAND_L, mirrorLeg(STAND_L)], arms: [HANG_L, [8.6, -28.2, 6.6, -22.4, 1]], turn: -1, swing: 0, shrug: 0 }
        : {
            hip: -22.4,
            sh: -35.4,
            lean: 0,
            legs: [STAND_L, mirrorLeg(STAND_L)],
            arms: [[-9.6, -29.2, -12.6, -30.6, 1], [9.4, -29.6, 9.6, -26.4, 1]],
            turn: 2,
            swing: 0,
            shrug: 1.6,
            torch: true,
          };
    case 'wave':
      return {
        hip: -22.4,
        sh: -35.4,
        lean: 0,
        legs: [STAND_L, mirrorLeg(STAND_L)],
        arms: [HANG_L, [10.2, -40.2, f === 0 ? 10.4 : 13.4, -48.4, 1]],
        turn: f === 0 ? 0 : 1,
        swing: f === 0 ? -0.3 : 0.3,
        shrug: 0,
      };
  }
}

/* ------------------------------------------------------------------ colours */

/** The light edge for a skin: the skin's own brow-ridge light on dark skins (decision 65), a warm tint on lighter ones. */
function skinRim(s: SkinOption): string {
  return s.face.rim ?? rimOf(s.base);
}

function hairColours(h: HairOption, b: Build): { c: string; acc: string } {
  if (b.grey && (h.id === 'lowcut' || h.id === 'afro')) return { c: GREY, acc: GREY_SHADE };
  if (b.grey && h.id === 'braids') return { c: GREY, acc: h.accent };
  return { c: h.colour, acc: h.accent };
}

/* ------------------------------------------------------------------- pieces */

interface Ctx {
  g: CanvasRenderingContext2D;
  b: Build;
  s: SkinOption;
  h: HairOption;
  o: OutfitOption;
  rig: Rig;
  suit: boolean;
}

const bareLegs = (o: OutfitOption): boolean => o.id === 'jersey' || o.id === 'school';
const shortSleeves = (o: OutfitOption): boolean => o.id === 'jersey' || o.id === 'school';

function drawLeg(c: Ctx, i: 0 | 1, part: 'thigh' | 'shin'): void {
  const { g, b, o, s, rig } = c;
  const leg = rig.legs[i];
  const side = i === 0 ? -1 : 1;
  const hx = side * 2.9 * b.hw;
  const hy = rig.hip * b.len;
  const kx = leg[0] * b.hw;
  const ky = leg[1] * b.len;
  const ax = leg[2] * b.hw;
  const ay = leg[3] * b.len;
  const w = b.limb;
  const bare = bareLegs(o);
  if (part === 'thigh') {
    const fill = bare ? s.base : o.legs;
    shape(g, () => capsule(g, hx, hy, 3.3 * w, kx, ky, 2.7 * w), fill, { shadeC: bare ? s.shade : undefined, rimC: bare ? skinRim(s) : undefined, line: 1.5 });
    if (bare) shape(g, () => capsule(g, hx, hy - 0.4, 3.7 * b.hw, hx + (kx - hx) * 0.62, hy + (ky - hy) * 0.62, 3.3 * w), o.legs, { line: 1.3 });
    return;
  }
  // The shin, the sock and the shoe
  if (rig.slide) return;
  const fill = bare ? s.base : o.legs;
  shape(g, () => capsule(g, kx, ky, 2.7 * w, ax, ay, 2.05 * w), fill, { shadeC: bare ? s.shade : undefined, rimC: bare ? skinRim(s) : undefined, line: 1.5 });
  if (bare) {
    const sx = kx + (ax - kx) * 0.42;
    const sy = ky + (ay - ky) * 0.42;
    shape(g, () => capsule(g, sx, sy, 2.35 * w, ax, ay, 2.2 * w), WHITE, { shadeC: '#d9d3c6', line: 1.2 });
    if (o.id === 'jersey') line(g, [sx - 1.8 * w, sy + 0.9, sx + 1.8 * w, sy + 0.9], o.a, 0.9);
  }
  if (c.suit) shape(g, () => g.roundRect(kx + (ax - kx) * 0.15 - 1.9 * w, ky + (ay - ky) * 0.15, 3.8 * w, (ay - ky) * 0.55, 1.2), SUIT.plate, { line: SUIT.lineW, rim: 0 });
  const dark = o.shoes === '#1d1a14' || o.shoes === '#3b2a20';
  if (leg[4]) {
    // The sole, kicked back toward the camera: a rounded sole with tread lines.
    const r = 2.5 * w;
    const sy = ay + 1.4;
    shape(g, () => oval(g, ax, sy, r, r * 1.28), dark ? '#4a3f37' : '#cfc6b6', { line: 1.4, rim: 0.7 });
    line(g, [ax - r * 0.55, sy - r * 0.35, ax + r * 0.55, sy - r * 0.35], dark ? '#2b241f' : '#9c9282', 0.7);
    line(g, [ax - r * 0.6, sy + r * 0.25, ax + r * 0.6, sy + r * 0.25], dark ? '#2b241f' : '#9c9282', 0.7);
    shape(g, () => g.roundRect(ax - r * 0.85, sy - r * 1.55, r * 1.7, r * 0.7, r * 0.3), o.shoes, { line: 1.1, rim: 0.5, shade: 0.6 });
  } else {
    // The heel of a planted shoe
    const top = ay - 0.6;
    const bottom = Math.min(ay + 2.6, 0.2);
    shape(g, () => g.roundRect(ax - 2.4 * w, top, 4.8 * w, Math.max(1.6, bottom - top), [1.6, 1.6, 0.8, 0.8]), o.shoes, { line: 1.5, shade: 0.9 });
    line(g, [ax - 2.2 * w, bottom - 0.5, ax + 2.2 * w, bottom - 0.5], dark ? '#5c5048' : '#d8d2c4', 0.9);
  }
}

/** The body and its clothes (from behind), and a long robe's hem. */
function drawBody(c: Ctx): void {
  const { g, b, o, rig } = c;
  const hy = rig.hip * b.len;
  const sy = (rig.sh - rig.shrug * 0.6) * b.len;
  const L = rig.lean;
  const swing = rig.swing;
  const sw = b.sw;
  const hw = b.hw;
  const waistY = hy - 5 * b.len;
  const pinch = b.female && o.id !== 'agbada' && o.id !== 'kaftan' ? 0.9 : 1;
  const long = o.id === 'agbada' ? 14.6 : o.id === 'kaftan' ? 8.6 : 0;
  const hem = Math.min(hy + long * b.len, 0.5);
  const torso = (): void => {
    g.moveTo(-2.6 * sw + L, sy - 1.3);
    g.quadraticCurveTo(-7 * sw + L, sy - 1.1, -7.6 * sw + L, sy + 2.4);
    if (long) {
      const out = o.id === 'agbada' ? 10.2 : 6.4;
      g.quadraticCurveTo(-out * hw - swing * 0.6, (sy + hem) / 2, -(out + 0.6) * hw - swing * 1.2, hem);
      g.quadraticCurveTo(-swing, hem + 1.6, (out + 0.6) * hw - swing * 1.2, hem);
      g.quadraticCurveTo(out * hw - swing * 0.6, (sy + hem) / 2, 7.6 * sw + L, sy + 2.4);
    } else {
      g.lineTo(-5.4 * pinch * hw + L * 0.4, waistY);
      g.lineTo(-4.6 * hw, hy + 1.4);
      g.quadraticCurveTo(0, hy + 2.6, 4.6 * hw, hy + 1.4);
      g.lineTo(5.4 * pinch * hw + L * 0.4, waistY);
      g.lineTo(7.6 * sw + L, sy + 2.4);
    }
    g.quadraticCurveTo(7 * sw + L, sy - 1.1, 2.6 * sw + L, sy - 1.3);
    g.quadraticCurveTo(L, sy - 0.2, -2.6 * sw + L, sy - 1.3);
    g.closePath();
  };
  // Shorts or trousers seat under a short top
  if (!long) shape(g, () => g.roundRect(-4.9 * hw, hy - 2.2, 9.8 * hw, 4.6 * b.len, 2.2), o.legs, { line: 1.8 });
  shape(g, torso, o.a, { line: 2, shade: 3, rim: 1.3 });
  // Clothes details, seen from behind
  g.save();
  g.beginPath();
  torso();
  g.clip();
  switch (o.id) {
    case 'jersey':
      // White collar band and white side stripes
      line(g, [-2.6 * sw + L, sy - 0.6, L, sy + 0.5, 2.6 * sw + L, sy - 0.6], o.b, 1.3);
      line(g, [-6.8 * sw + L, sy + 3, -5 * hw, hy], o.b, 1.1);
      line(g, [6.8 * sw + L, sy + 3, 5 * hw, hy], o.b, 1.1);
      break;
    case 'ankara':
      for (const [x, y] of [[-3.6, 0.18], [1.4, 0.1], [4.4, 0.42], [-1.2, 0.5], [-4.4, 0.78], [2.4, 0.78], [0, 0.98]] as const) {
        const py = sy + (hy - sy) * y;
        dot(g, x * sw + L * (1 - y), py, 1.55, o.b);
        dot(g, x * sw + L * (1 - y), py, 0.62, '#f2b300');
      }
      line(g, [-5 * hw, hy - 0.4, 5 * hw, hy - 0.4], o.b, 1.4);
      break;
    case 'school':
      // A collar folded at the back of the neck and a plain belt
      shape(g, () => g.roundRect(-3.4 * sw + L, sy - 1.4, 6.8 * sw, 2.4, 1), WHITE, { line: 0.8, shade: 0.6, rim: 0 });
      g.fillStyle = o.b;
      g.fillRect(-5.2 * hw, hy - 1.4, 10.4 * hw, 1.5);
      break;
    case 'agbada':
      // Gold embroidery round the back of the neck and a hem band
      line(g, [-3.2 * sw + L, sy - 0.4, -1.4 * sw + L, sy + 3.2, L, sy + 4.4, 1.4 * sw + L, sy + 3.2, 3.2 * sw + L, sy - 0.4], o.b, 1.2);
      line(g, [-12 * hw, hem - 1.4, 12 * hw, hem - 1.4], o.b, 1.2);
      break;
    case 'kaftan':
      line(g, [-2.6 * sw + L, sy - 0.4, L, sy + 1.4, 2.6 * sw + L, sy - 0.4], o.b, 1.1);
      line(g, [-8 * hw, hem - 1.2, 8 * hw, hem - 1.2], o.b, 1);
      break;
  }
  g.restore();
  if (c.suit) {
    // The tech suit's back plate: cream, ink outline, sage seams (decision 43, as on the streets)
    shape(g, () => g.roundRect(-5 * sw + L * 0.8, sy + 1.6, 10 * sw, (hy - sy) * 0.72, 2.4), SUIT.plate, { line: SUIT.lineW, shadeC: '#e9dcc0' });
    line(g, [L * 0.8, sy + 2.6, L * 0.6, sy + (hy - sy) * 0.66], SUIT.seam, 0.9);
    line(g, [-4 * sw + L * 0.8, sy + (hy - sy) * 0.4, 4 * sw + L * 0.8, sy + (hy - sy) * 0.4], SUIT.seam, 0.9);
  }
}

function drawArm(c: Ctx, i: 0 | 1): void {
  const { g, b, o, s, rig } = c;
  const a = rig.arms[i];
  const side = i === 0 ? -1 : 1;
  const sx = side * 6.4 * b.sw + rig.lean;
  const sy = (rig.sh + 1.6 - rig.shrug) * b.len;
  const ex = a[0] * b.sw + rig.lean * 0.6;
  const ey = (a[1] - rig.shrug * 0.6) * b.len;
  const wx = a[2] * b.sw + rig.lean * 0.4;
  const wy = (a[3] - rig.shrug * 0.4) * b.len;
  const w = b.limb;
  const short = shortSleeves(o);
  const sleeve = o.a;
  // Upper arm and forearm as one outlined limb
  const limb = (): void => {
    capsule(g, sx, sy, 2.7 * w, ex, ey, 2.2 * w);
    capsule(g, ex, ey, 2.2 * w, wx, wy, 1.8 * w);
  };
  shape(g, limb, short ? s.base : sleeve, { line: 1.5, shadeC: short ? s.shade : undefined, rimC: short ? skinRim(s) : undefined });
  if (short) shape(g, () => capsule(g, sx, sy, 3.1 * w, sx + (ex - sx) * 0.5, sy + (ey - sy) * 0.5, 2.7 * w), sleeve, { line: 1.3 });
  else if (o.id === 'ankara' || o.id === 'kaftan') shape(g, () => capsule(g, ex + (wx - ex) * 0.7, ey + (wy - ey) * 0.7, 2 * w, wx, wy, 1.9 * w), o.b, { line: 1.1, rim: 0 });
  if (o.id === 'agbada') {
    // The wide agbada sleeve hangs from the whole arm
    const low = Math.max(ey, wy, sy + 6) + 5.5 * b.len;
    shape(
      g,
      () => {
        g.moveTo(sx, sy - 1.6);
        g.quadraticCurveTo(ex + side * 2.6, ey, wx + side * 1.2, wy);
        g.quadraticCurveTo(wx + side * 1.6, low, (sx + wx) / 2 + side * 1.4, low + 0.8);
        g.quadraticCurveTo(sx + side * 0.4, low - 1, sx - side * 2.4, sy + 4);
        g.closePath();
      },
      sleeve,
      { line: 1.6, shade: 1.8 },
    );
    line(g, [wx + side * 1.2, wy + 0.4, wx + side * 1.6, low - 1], o.b, 1);
  }
  if (c.suit) shape(g, () => oval(g, sx, sy + 0.2, 2.6 * w, 2.2 * w), SUIT.plate, { line: SUIT.lineW, rim: 0 });
  // The hand
  shape(g, () => oval(g, wx, wy + 0.6, 2.05 * w, 2.25 * w), s.base, { line: 1.4, shadeC: s.shade, rimC: skinRim(s), shade: 0.9 });
  if (rig.torch && i === 1) {
    // A small torch, clicked on: a short barrel and a soft pale beam forward and down
    g.fillStyle = 'rgba(255,240,170,0.38)';
    g.beginPath();
    g.moveTo(wx + 1, wy - 1.2);
    g.lineTo(wx + 14, wy - 7);
    g.lineTo(wx + 16, wy + 6);
    g.closePath();
    g.fill();
    shape(g, () => g.roundRect(wx - 1.6, wy - 1.6, 4.8, 2.6, 0.8), '#c0392b', { line: 1, rim: 0.4, shade: 0.5 });
    dot(g, wx + 3.4, wy - 0.3, 1.1, '#fff3b0');
  }
}

/** The back of the head, the ears, the hair or headwear, and a face side when the head turns. */
function drawHead(c: Ctx): void {
  const { g, b, s, h, rig } = c;
  const k = b.head;
  const hx = rig.lean * 1.1 + (rig.turn === 2 ? 0.6 : rig.turn * 0.4);
  const sy = (rig.sh - rig.shrug * 0.4) * b.len;
  const hy = sy - 7.6 * k;
  const { c: hc, acc } = hairColours(h, b);
  const sk = { shadeC: s.shade, rimC: skinRim(s) };
  // Neck
  shape(g, () => capsule(g, hx * 0.6, sy + 0.4, 2.2, hx, hy + 3.4 * k, 2.3), s.base, { ...sk, line: 1.6 });
  // Afro sits all round the head
  if (h.id === 'afro') {
    afroMass(g, hx, hy - 1.4 * k, 8.4 * k, hc, acc);
  }
  // Ears
  const ears = h.id === 'lowcut' || h.id === 'braids';
  if (ears) {
    for (const e of [-1, 1]) {
      shape(g, () => oval(g, hx + e * 5.5 * k, hy + 0.6, 1.3 * k, 2 * k), s.base, { ...sk, line: 1.1, shade: 0.5, rim: 0.4 });
      if (b.female) dot(g, hx + e * 5.6 * k, hy + 2.6, 0.75, STUD);
    }
  }
  // The head itself
  if (h.id !== 'afro') shape(g, () => oval(g, hx, hy, 5.6 * k, 6.3 * k), s.base, { ...sk, line: 1.8, shade: 1.6, rim: 1 });
  // A face side when looking round
  if (rig.turn !== 0) faceSide(c, hx, hy, k);
  switch (h.id) {
    case 'lowcut':
      cap(g, hx, hy, k, hc, acc, 3.4, rig.turn);
      break;
    case 'afro':
      if (rig.turn !== 0) afroMass(g, hx - rig.turn * 0.6, hy - 1.4 * k, 7.6 * k, hc, acc);
      break;
    case 'braids': {
      cap(g, hx, hy, k, hc, acc, 4.6, rig.turn);
      // Cornrows: neat lines from the crown to the nape
      g.save();
      g.beginPath();
      oval(g, hx, hy, 5.9 * k, 6.6 * k);
      g.clip();
      for (const x of [-3.4, -1.15, 1.15, 3.4]) line(g, [hx + x * 0.5 * k, hy - 6 * k, hx + x * k, hy - 1 * k, hx + x * 0.8 * k, hy + 4.4 * k], mix(hc, '#000000', 0.45), 0.6);
      g.restore();
      // Braids falling down the back, beads at the ends, swinging with the run
      for (let i = 0; i < 5; i++) {
        const x0 = hx + (-2.6 + i * 1.3) * k;
        const y0 = hy + 4.4 * k;
        const x1 = x0 + rig.swing * (1.2 + i * 0.3) + (i - 2) * 0.5;
        const y1 = sy + 6.4 - Math.abs(i - 2) * 0.9;
        g.lineCap = 'round';
        line(g, [x0, y0, (x0 + x1) / 2 + rig.swing * 0.4, (y0 + y1) / 2, x1, y1], INK, 2.6);
        line(g, [x0, y0, (x0 + x1) / 2 + rig.swing * 0.4, (y0 + y1) / 2, x1, y1], hc, 1.3);
        shape(g, () => oval(g, x1, y1 + 0.8, 0.95, 1.05), i % 2 ? BEAD_RED : acc, { line: 0.7, shade: 0, rim: 0.3 });
      }
      break;
    }
    case 'gele':
      gele(g, hx, hy, k, hc, acc, b.grey);
      break;
    case 'headscarf':
      scarf(g, hx, hy, k, hc, acc, rig.swing, b.grey);
      break;
  }
}

function afroMass(g: CanvasRenderingContext2D, x: number, y: number, r: number, c: string, acc: string): void {
  const n = 12;
  shape(
    g,
    () => {
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * Math.PI * 2;
        const px = x + Math.cos(a) * r;
        const py = y + Math.sin(a) * r * 0.94;
        if (i === 0) g.moveTo(px, py);
        else {
          const m = a - Math.PI / n;
          g.quadraticCurveTo(x + Math.cos(m) * r * 1.13, y + Math.sin(m) * r * 1.06, px, py);
        }
      }
      g.closePath();
    },
    c,
    { line: 1.9, shade: 2.2, rim: 1.1, rimC: mix(c, '#c98a5a', 0.45) },
  );
  for (const [dx, dy] of [[-4.6, -3.6], [-0.6, -5.8], [3.6, -3.2], [-2.6, 1.2], [2.2, 2.6], [5, 0.6]] as const) dot(g, x + dx * (r / 8.4), y + dy * (r / 8.4), 0.75, acc);
}

/** A close hair cap over the top and back of the head down to the nape (low cut; braids' base). */
function cap(g: CanvasRenderingContext2D, x: number, y: number, k: number, c: string, acc: string, nape: number, turn: number): void {
  const off = turn === 2 ? -1 : -turn * 0.8;
  shape(
    g,
    () => {
      g.moveTo(x + off - 5.9 * k, y + 1.4 * k);
      g.bezierCurveTo(x + off - 6.6 * k, y - 8.6 * k, x + off + 6.6 * k, y - 8.6 * k, x + off + 5.9 * k, y + 1.4 * k);
      g.quadraticCurveTo(x + off + 4.6 * k, y + nape * k, x + off, y + (nape + 0.6) * k);
      g.quadraticCurveTo(x + off - 4.6 * k, y + nape * k, x + off - 5.9 * k, y + 1.4 * k);
      g.closePath();
    },
    c,
    { line: 1.6, shade: 1.4, rim: 0.9, rimC: mix(c, '#c98a5a', 0.4) },
  );
  for (const [dx, dy] of [[-2.8, -4.4], [0.4, -5.6], [3, -3.4], [-3.8, -0.6], [1.6, -1.2], [-0.8, 1.8], [3.8, 0.8]] as const) dot(g, x + off + dx * k, y + dy * k, 0.45, acc);
}

function gele(g: CanvasRenderingContext2D, x: number, y: number, k: number, c: string, acc: string, grey: boolean): void {
  // A little hair (or grey) at the nape, under the wrap
  shape(g, () => oval(g, x, y + 3.6 * k, 4 * k, 1.8 * k), grey ? GREY : '#1b1410', { line: 1, shade: 0, rim: 0 });
  // The big folded head tie: a wide wrap round the head and a fan of stiff folds on top
  const wrap = (): void => {
    g.moveTo(x - 7 * k, y + 2.4 * k);
    g.quadraticCurveTo(x - 9.6 * k, y - 4 * k, x - 8.4 * k, y - 8.4 * k);
    g.lineTo(x - 4.6 * k, y - 12.6 * k);
    g.quadraticCurveTo(x - 1 * k, y - 15.4 * k, x + 2.2 * k, y - 13.6 * k);
    g.lineTo(x + 7 * k, y - 11 * k);
    g.quadraticCurveTo(x + 10.2 * k, y - 5.4 * k, x + 7.2 * k, y + 2.4 * k);
    g.quadraticCurveTo(x, y + 4.4 * k, x - 7 * k, y + 2.4 * k);
    g.closePath();
  };
  shape(g, wrap, c, { line: 1.9, shade: 2, rim: 1.1 });
  // Fold lines in gold
  const fold = (pts: number[]): void => line(g, pts.map((v, i) => (i % 2 ? y + v * k : x + v * k)), acc, 1.1);
  fold([-7.6, -7, -3.6, -9.4, 0.6, -9.6, 6.4, -8]);
  fold([-7.4, -2.4, -2.6, -4.4, 2.8, -4.6, 7.8, -2.8]);
  fold([-4.4, -12, -2.4, -8.6]);
  fold([2, -13, 2.6, -8.4]);
  // The tuck at the back
  shape(g, () => poly(g, [x - 2.4 * k, y + 1.8 * k, x, y - 1.6 * k, x + 2.4 * k, y + 1.8 * k, x, y + 3.4 * k]), mix(c, '#000000', 0.15), { line: 1.1, shade: 0, rim: 0.5 });
}

function scarf(g: CanvasRenderingContext2D, x: number, y: number, k: number, c: string, acc: string, swing: number, grey: boolean): void {
  if (grey) shape(g, () => oval(g, x - 4.6 * k, y + 2.8 * k, 1.4 * k, 1.2 * k), GREY, { line: 0.8, shade: 0, rim: 0 });
  // Two tails from the knot at the nape
  const tails = (): void => {
    g.moveTo(x - 0.6 * k, y + 4.6 * k);
    g.quadraticCurveTo(x - 2.6 * k + swing, y + 8.6 * k, x - 3.4 * k + swing * 2, y + 12.4 * k);
    g.lineTo(x - 0.8 * k + swing * 2, y + 12.8 * k);
    g.quadraticCurveTo(x - 0.4 * k + swing, y + 8.4 * k, x + 0.6 * k, y + 4.8 * k);
    g.moveTo(x + 0.8 * k, y + 4.6 * k);
    g.quadraticCurveTo(x + 2.8 * k + swing, y + 7.6 * k, x + 4 * k + swing * 1.6, y + 10.6 * k);
    g.lineTo(x + 1.8 * k + swing * 1.6, y + 11.4 * k);
    g.quadraticCurveTo(x + 1 * k + swing, y + 8 * k, x - 0.2 * k, y + 5 * k);
  };
  shape(g, tails, mix(c, '#000000', 0.12), { line: 1.3, shade: 0.8, rim: 0.5 });
  // The scarf over the head
  shape(
    g,
    () => {
      g.moveTo(x - 6.4 * k, y + 3.4 * k);
      g.bezierCurveTo(x - 7.6 * k, y - 9.4 * k, x + 7.6 * k, y - 9.4 * k, x + 6.4 * k, y + 3.4 * k);
      g.quadraticCurveTo(x, y + 5.6 * k, x - 6.4 * k, y + 3.4 * k);
      g.closePath();
    },
    c,
    { line: 1.8, shade: 1.8, rim: 1 },
  );
  line(g, [x - 6.6 * k, y - 0.8 * k, x - 2 * k, y - 2.6 * k, x + 2 * k, y - 2.6 * k, x + 6.6 * k, y - 0.8 * k], acc, 1.1);
  // The knot
  shape(g, () => oval(g, x, y + 4.4 * k, 1.9 * k, 1.5 * k), mix(c, '#000000', 0.08), { line: 1.2, shade: 0.5, rim: 0.4 });
}

/** The side of the face when the head turns: a cheek, an eye, a brow, a nose tip; a grin on turn 2. */
function faceSide(c: Ctx, hx: number, hy: number, k: number): void {
  const { g, s, rig } = c;
  const d = rig.turn === 2 ? 1 : rig.turn;
  const big = rig.turn === 2;
  const fx = hx + d * (big ? 3.6 : 3.4) * k;
  const fy = hy + 0.6 * k;
  shape(g, () => oval(g, fx, fy, (big ? 3.8 : 3.1) * k, (big ? 4.8 : 4.4) * k), s.base, { shadeC: s.shade, rimC: skinRim(s), line: 1.4, shade: 0.8, rim: 0.7 });
  // Nose tip past the cheek
  shape(g, () => oval(g, fx + d * (big ? 3.4 : 2.9) * k, fy - 0.4 * k, 1 * k, 1.2 * k), s.base, { shadeC: s.shade, line: 1, shade: 0.4, rim: 0 });
  // Eye and brow
  dot(g, fx + d * 1.5 * k, fy - 1.8 * k, 0.8 * k, INK);
  dot(g, fx + d * 1.7 * k, fy - 2.1 * k, 0.28 * k, WHITE);
  if (s.face.rim) line(g, [fx + d * 0.2 * k, fy - 3.9 * k, fx + d * 2.6 * k, fy - 4.1 * k], s.face.rim, 1.1);
  line(g, [fx + d * 0.4 * k, fy - 3.4 * k, fx + d * 2.6 * k, fy - 3.6 * k], s.face.line, (s.face.brow ?? 0.8) + 0.2);
  if (big) {
    // A cheerful grin (never cruel): a small open smile with the lip colour and its outline
    shape(
      g,
      () => {
        g.moveTo(fx + d * 0.2 * k, fy + 1.2 * k);
        g.quadraticCurveTo(fx + d * 1.8 * k, fy + 3.6 * k, fx + d * 3.4 * k, fy + 1 * k);
        g.closePath();
      },
      s.face.lip,
      { line: 0.8, shade: 0, rim: 0 },
    );
    line(g, [fx + d * 0.2 * k, fy + 1.2 * k, fx + d * 3.4 * k, fy + 1 * k], s.face.lipLine, 0.6);
  }
}

/* ---------------------------------------------------------------- drawing */

/**
 * Draws the hero from behind at the origin (the ground between the feet), in lane units.
 * Scale the context by ppm / LANE_U first, or use drawLaneHeroAt / bakeLaneHero.
 */
export function drawLaneHero(g: CanvasRenderingContext2D, look: HeroLook, pose: LaneHeroPose): void {
  const s = SKINS[look.skin] ?? SKINS[0]!;
  const h = HAIRS[look.hair] ?? HAIRS[0]!;
  const o = OUTFITS[look.outfit] ?? OUTFITS[0]!;
  const c: Ctx = { g, b: buildOf(look), s, h, o, rig: rigOf(pose), suit: !!pose.suit };
  g.save();
  g.scale(LANE_HERO_SCALE, LANE_HERO_SCALE);
  g.lineCap = 'round';
  const front = (i: 0 | 1): boolean => c.rig.arms[i][4] === 1;
  // Arms swung forward go behind the body
  for (const i of [0, 1] as const) if (!front(i)) drawArm(c, i);
  // Legs: thighs, then the planted shins; the shin kicked back toward the camera comes after the body
  const kicked = (i: 0 | 1): boolean => c.rig.legs[i][4] === 1;
  for (const i of [0, 1] as const) drawLeg(c, i, 'thigh');
  for (const i of [0, 1] as const) if (!kicked(i)) drawLeg(c, i, 'shin');
  drawBody(c);
  for (const i of [0, 1] as const) if (kicked(i)) drawLeg(c, i, 'shin');
  if (c.rig.slide) slideDust(g);
  for (const i of [0, 1] as const) if (front(i)) drawArm(c, i);
  drawHead(c);
  g.restore();
}

function slideDust(g: CanvasRenderingContext2D): void {
  for (const [x, y, r] of [[-8, -1.6, 2.4], [-11, -2.6, 1.6], [8, -1.6, 2.4], [11, -2.6, 1.6]] as const) {
    g.fillStyle = 'rgba(214,200,176,0.85)';
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
}

/** Draws the hero from behind with its feet at (x, y) on screen, at ppm pixels per metre. */
export function drawLaneHeroAt(g: CanvasRenderingContext2D, look: HeroLook, pose: LaneHeroPose, x: number, y: number, ppm: number): void {
  g.save();
  g.translate(x, y);
  const k = ppm / LANE_U;
  g.scale(k, k);
  drawLaneHero(g, look, pose);
  g.restore();
}

/** The soft round shadow under the hero; `up` is the feet's height above the road (m). */
export function drawLaneShadow(g: CanvasRenderingContext2D, x: number, y: number, ppm: number, up = 0): void {
  const k = 1 / (1 + Math.max(0, up) * 0.9);
  g.fillStyle = `rgba(20,14,30,${(0.32 * k).toFixed(3)})`;
  g.beginPath();
  g.ellipse(x, y, 0.42 * ppm * k, 0.11 * ppm * k, 0, 0, Math.PI * 2);
  g.fill();
}

/**
 * Ready-made pictures of every pose for one look at `ppm` pixels per metre (bake once when the
 * run starts, then blitBaked each frame). Keys are `${move}${frame}` (run0 to run3, jump0,
 * slide0, stumble0 and 1, torch0 and 1, wave0 and 1), plus the same with "Suit" after it when
 * `suit` is true. Empty where no canvas can be made.
 */
export function bakeLaneHero(look: HeroLook, ppm: number, suit = true): Map<string, Baked> {
  const out = new Map<string, Baked>();
  for (const p of LANE_HERO_POSES) {
    for (const on of suit ? [false, true] : [false]) {
      const b = bake(LANE_HERO_BOX, ppm, (g) => drawLaneHero(g, look, { ...p, suit: on }));
      if (b) out.set(`${p.move}${p.frame ?? 0}${on ? 'Suit' : ''}`, b);
    }
  }
  return out;
}

/** The key bakeLaneHero uses for a pose. */
export function laneHeroKey(pose: LaneHeroPose): string {
  const n = LANE_HERO_FRAMES[pose.move] ?? 1;
  const f = ((Math.floor(pose.frame ?? 0) % n) + n) % n;
  return `${pose.move}${f}${pose.suit ? 'Suit' : ''}`;
}

/** Shade colour helper re-exported for tests (the two tones of a cloth). */
export const laneTones = (c: string): [string, string, string] => [c, shadeOf(c), rimOf(c)];
