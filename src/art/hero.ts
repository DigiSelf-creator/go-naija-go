/**
 * The hero, drawn in code as separate layers: skin (body), hair, outfit.
 * Lists follow docs/design.md (Hero builder) in the same order. Only ever add to
 * the END of a list; saved looks are indices.
 *
 * Origin is the centre of the feet. The hero faces right (+x) when facing = 1,
 * stands about 50 u tall (about 4.4 heads; a gele or afro adds a little), y grows
 * downward. The body is a small rig: hips, a leaning torso, a head on a neck,
 * and two-part arms and legs. Poses are angles, blended from key poses, so the
 * run, jump, fall, landing and standing all move like a person.
 */
import { drawDashPuff, drawDustPuff, drawKneePuff, drawSkidScuff } from './dust';
import { FUFU } from './fufu';
import { INK, WHITE } from './palette';

/** Lip rose. Every skin draws the same lip shape with a thin outline darker than the skin. */
const LIP = '#d9705f';
/** A slightly lighter rose for skin 4, so the lip is 3:1 against that skin like the others. */
const LIP_SOFT = '#e8907c';
const FACE_LIGHT: FaceColours = { line: INK, lip: LIP, lipLine: INK };

export interface SkinOption {
  id: string;
  label: string;
  base: string;
  /** Slightly darker tone for the neck, the ear and the far arm and leg. */
  shade: string;
  /** Colours for the brows, smile line and lips, chosen so they read on this skin. */
  face: FaceColours;
}

/**
 * Face feature colours for one skin tone. Every skin gets the same face: ink
 * brows, the same lip shape and size, a thin deep-toned lip outline.
 * The brow (or its rim) and the lip (or its outline) are 3:1 or better against
 * the skin, so brows and mouth show on every tone.
 */
export interface FaceColours {
  /** Brows, the smile line and the closed-eye line. */
  line: string;
  /** Brow thickness (u). Default 0.8; a little more on darker skins so the dark brow stays the main shape. */
  brow?: number;
  /**
   * A thin light line along the top of the near brow on darker skins: light
   * catching the brow ridge. It sits ABOVE the brow, never between brow and eye.
   */
  rim?: string;
  /** The lower lip. */
  lip: string;
  /**
   * Thin outline round the lip, in a deep tone between the lip and the skin: INK
   * on light and medium skins, deep browns on darker skins (never INK there).
   */
  lipLine: string;
}

export interface HairOption {
  id: 'lowcut' | 'afro' | 'braids' | 'gele' | 'headscarf';
  label: string;
  colour: string;
  accent: string;
}

export type OutfitCut = 'jersey' | 'ankara' | 'school' | 'agbada' | 'kaftan';

export interface OutfitOption {
  id: OutfitCut;
  label: string;
  /** Main colour and trim colour, as in design.md. */
  a: string;
  b: string;
  legs: string;
  shoes: string;
}

export const SKINS: readonly SkinOption[] = [
  { id: 'skin1', label: 'Skin tone 1', base: '#f1c9a5', shade: '#dcae86', face: FACE_LIGHT },
  { id: 'skin2', label: 'Skin tone 2', base: '#d9a172', shade: '#c0875a', face: FACE_LIGHT },
  { id: 'skin3', label: 'Skin tone 3', base: '#a8693f', shade: '#8d5530', face: FACE_LIGHT },
  { id: 'skin4', label: 'Skin tone 4', base: '#7a4a2a', shade: '#653b20', face: { line: INK, brow: 0.95, rim: '#d29a72', lip: LIP_SOFT, lipLine: '#3a2113' } },
  { id: 'skin5', label: 'Skin tone 5', base: '#4b2c1a', shade: '#3a2113', face: { line: INK, brow: 0.95, rim: '#a87656', lip: LIP, lipLine: '#2a170d' } },
];

export const HAIRS: readonly HairOption[] = [
  { id: 'lowcut', label: 'Low cut', colour: '#1b1410', accent: '#4a382c' },
  { id: 'afro', label: 'Afro', colour: '#20140e', accent: '#3d2a1d' },
  { id: 'braids', label: 'Braids', colour: '#1b1410', accent: '#f2b300' },
  { id: 'gele', label: 'Gele', colour: '#d6336c', accent: '#f2b300' },
  { id: 'headscarf', label: 'Headscarf', colour: '#1aa39a', accent: '#a6eadf' },
];

export const OUTFITS: readonly OutfitOption[] = [
  { id: 'jersey', label: 'Green jersey', a: '#0e7a3e', b: '#ffffff', legs: '#0e7a3e', shoes: '#f4f4f4' },
  { id: 'ankara', label: 'Ankara', a: '#e0572b', b: '#2b59c3', legs: '#2b59c3', shoes: '#3b2a20' },
  { id: 'school', label: 'School uniform', a: '#f4f4f4', b: '#7b2d26', legs: '#7b2d26', shoes: '#1d1a14' },
  { id: 'agbada', label: 'Agbada', a: '#5a3e8f', b: '#f2b300', legs: '#46306f', shoes: '#8a5a2b' },
  { id: 'kaftan', label: 'Kaftan', a: '#2f5d8a', b: '#e9e1cf', legs: '#e9e1cf', shoes: '#5b3a22' },
];

export interface BodyOption {
  id: 'male' | 'female';
  label: string;
}

export interface AgeOption {
  id: 'teen' | 'adult' | 'elder';
  label: string;
}

/** "Male or female" row (design.md S2.3). Saved as `body`: 0 Male, 1 Female. */
export const BODIES: readonly BodyOption[] = [
  { id: 'male', label: 'Male' },
  { id: 'female', label: 'Female' },
];

/** "Age" row (design.md S2.3). Saved as `age`: 0 Teen, 1 Adult, 2 Elder. */
export const AGES: readonly AgeOption[] = [
  { id: 'teen', label: 'Teen' },
  { id: 'adult', label: 'Adult' },
  { id: 'elder', label: 'Elder' },
];

/**
 * Indices into SKINS, HAIRS, OUTFITS, BODIES, AGES (the shape saved under `gidi-look`).
 * `body` and `age` came in slice 2; a look without them draws as an Adult, Female
 * if the hair is Gele or Headscarf, else Male (see bodyOf, ageOf).
 */
export interface HeroLook {
  skin: number;
  hair: number;
  outfit: number;
  body?: number;
  age?: number;
}

/** The age a look without one draws as (Adult). */
export const DEFAULT_AGE = 1;

/** Body for a look saved before slice 2: Female if the hair is Gele or Headscarf, else Male. */
export function defaultBody(hair: number): number {
  const id = HAIRS[hair]?.id;
  return id === 'gele' || id === 'headscarf' ? 1 : 0;
}

/**
 * First looks (design.md S2.3 Defaults), as FIRST_LOOKS[body][age] = hair and outfit
 * indices. Male: Low cut with School uniform / Green jersey / Agbada. Female: Braids
 * with School uniform, Braids with Ankara, Gele with Ankara. Every hair and outfit
 * stays open to every hero (Q20).
 */
export const FIRST_LOOKS: readonly (readonly { hair: number; outfit: number }[])[] = [
  [
    { hair: 0, outfit: 2 },
    { hair: 0, outfit: 0 },
    { hair: 0, outfit: 3 },
  ],
  [
    { hair: 2, outfit: 2 },
    { hair: 2, outfit: 1 },
    { hair: 3, outfit: 1 },
  ],
];

function isIndex(n: unknown, len: number): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= 0 && n < len;
}

/** The look's body (0 Male, 1 Female). A missing or broken one follows the hair, as for a slice 1 save. */
export function bodyOf(look: HeroLook): number {
  return isIndex(look.body, BODIES.length) ? look.body : defaultBody(isIndex(look.hair, HAIRS.length) ? look.hair : 0);
}

/** The look's age (0 Teen, 1 Adult, 2 Elder). A missing or broken one is Adult. */
export function ageOf(look: HeroLook): number {
  return isIndex(look.age, AGES.length) ? look.age : DEFAULT_AGE;
}

export interface HeroPose {
  /** Run cycle, 0 to 1 (wraps). One cycle = two steps. */
  phase: number;
  inAir: boolean;
  /** 1 faces right, -1 faces left. */
  facing: 1 | -1;
  /** Amala power: glowing outline and bigger steps. */
  glow: boolean;
  /** Roasted corn: speed lines behind. */
  fast?: boolean;
  /** Standing still (hero builder preview). */
  standing?: boolean;
  /** Eyes closed this frame (builder blink). */
  blink?: boolean;
  /** Seconds, for the glow pulse, breathing and cloth sway. */
  time?: number;
  /**
   * Up/down speed in u/s while in the air (negative = rising). Without it an
   * airborne hero shows the rising jump pose; with it the pose blends from
   * jump (rising) to fall (arms out, legs reaching down).
   */
  vy?: number;
  /** Landing squash, 1 just after touching down, easing to 0. */
  land?: number;
  /**
   * Slice 2 ground moves. 'walk' is a shorter, calmer stride with a straight back;
   * 'run' (the default) is the slice 1 run with its lean. Advance phase by ground
   * covered: one cycle per STRIDE at a run, per STRIDE x WALK_STRIDE at a walk.
   */
  gait?: 'walk' | 'run';
  /** Turning round from a run: 0 none, 1 full skid (leans back, front foot braced, scuff). */
  skid?: number;
  /** Start-of-run dust puff behind the feet: 0 just started, 1 gone. Leave unset for none. */
  dust?: number;
  /** Holding the well rope with both hands above the head (going down or up). */
  rope?: boolean;
  /**
   * Gentle mode climb-out "dust off" (S2.13 part 5), facing right: 0 to 1 over
   * DUST_OFF_TIME. Two frames (dustOffFrame): a crouch with the hands up, then the
   * hands patting the knees, twice, with a small dust puff off the knees. Leave unset
   * for none; after 1, stand. Wins over the run, walk and stand poses on the ground.
   */
  dustOff?: number;
  /**
   * Throwing a fufu ball (S2.15), 0 to 1 over THROW_TIME: one arm swing in two frames
   * (throwFrame). Frame 0 winds the near arm back with the ball in the hand; frame 1 swings
   * it through, forward on the ground, forward and down in the air ("aims down"). Only the
   * arms change, so it mixes with running, walking, standing and jumping. Leave unset (or
   * 1 or more) for none. The rope and the dust off win over it.
   */
  throwing?: number;
  /**
   * Amala's strong look (S2.16 B2): wider stance, elbows out, a warm glow round the whole
   * hero. `glow: true` alone gives it with the defaults. Never a change of size.
   */
  strong?: StrongLook;
  /** Amala just ended (S2.16 B2): the "shake out" of the arms, 0 to 1 over STRONG.shakeTime. */
  shakeOut?: number;
  /** The dash (S2.16 B4): head down, a 12 degree lean, arms pumping, speed lines and dust. */
  dash?: boolean;
  /** Catching breath after a dash (S2.16 B4): two small breath puffs by the mouth every 0.5 s. */
  resting?: boolean;
  /** The garri tech suit (S2.16 B3): 7 light plates over the hero's own clothes. */
  suit?: SuitLook;
  /** Reduced motion: the glow, the suit's hum, the speed lines and the breath puffs hold still. */
  still?: boolean;
}

export interface StrongLook {
  /** Seconds of amala left: the glow blinks 2 times a second in the last 2 s. */
  left?: number;
  /** The pick-up arm flex, 0 to 1 over STRONG.flexTime. Leave unset for none. */
  flex?: number;
}

export interface SuitLook {
  /** Put-on, 0 to 1 over SUIT.putOnTime: the plates click on from the feet up. 1 or unset: all on. */
  on?: number;
  /** The 0.1 s of white crack lines just before the plates burst (then drawSuitBits). */
  crack?: boolean;
}

/** Amala's strong look (S2.16 B2). */
export const STRONG = {
  glow: '#c98a3a',
  /** Glow outline width (u); with reduced motion it thins to padThin in the last 2 s. */
  pad: 3,
  padThin: 1,
  /** Glow see-through: breathes between these once a second; steady `still` with reduced motion. */
  alphaLow: 0.35,
  alphaHigh: 0.55,
  alphaStill: 0.45,
  /** Last seconds: the glow blinks this many times a second. */
  blinkFrom: 2,
  blinkPerSecond: 2,
  flexTime: 0.3,
  shakeTime: 0.3,
  /** At most one heavy step ("dum" and dust thump) this often (s). */
  stepGap: 0.18,
} as const;

/** The garri tech suit (S2.16 B3). Cream plates, ink outline, sage seams. */
export const SUIT = {
  plate: '#fff8e6',
  line: '#1d1a14',
  seam: '#7fc4a4',
  seamBright: '#d8f6e7',
  lineW: 1.5,
  plates: 7,
  putOnTime: 0.4,
  crackTime: 0.1,
  /** The burst: 10 bits fly 20 to 40 u and fade over 0.5 s (reduced motion: fade in place over 0.3 s). */
  bits: 10,
  breakTime: 0.5,
  breakTimeStill: 0.3,
  /** Seconds between the seams' soft brightening. */
  humEvery: 2,
} as const;

/** The dash (S2.16 B4). */
export const DASH_LOOK = {
  lean: (12 * Math.PI) / 180,
  /** A dust puff at the feet this often (s); reduced motion: puffStill. */
  puff: 0.1,
  puffStill: 0.3,
  /** Two breath puffs this often (s) while resting. */
  breath: 0.5,
} as const;

/**
 * The strong glow's see-through now (0 = not drawn this frame): breathes 0.35 to 0.55 once
 * a second, blinks 2 times a second in the last 2 s; with reduced motion a steady 0.45.
 */
export function strongGlowAlpha(time: number, left?: number, still = false): number {
  const t = Number.isFinite(time) ? time : 0;
  if (still) return STRONG.alphaStill;
  const l = typeof left === 'number' && Number.isFinite(left) ? left : Infinity;
  if (l < STRONG.blinkFrom && Math.floor(l * STRONG.blinkPerSecond * 2) % 2 === 1) return 0;
  return STRONG.alphaLow + (STRONG.alphaHigh - STRONG.alphaLow) * (0.5 + 0.5 * Math.sin(t * Math.PI * 2));
}

/** The glow's width (u): 3, or 1 in the last 2 s with reduced motion. */
export function strongGlowPad(left?: number, still = false): number {
  const l = typeof left === 'number' && Number.isFinite(left) ? left : Infinity;
  return still && l < STRONG.blinkFrom ? STRONG.padThin : STRONG.pad;
}

/** Seconds one throw's arm swing lasts (S2.15: 0.15 s, two frames). */
export const THROW_TIME = 0.15;

/** Which throw frame shows at p (0 to 1): 0 wind back (ball in hand), 1 swing through. */
export function throwFrame(p: number): 0 | 1 {
  const k = Number.isFinite(p) ? Math.min(Math.max(p, 0), 0.999) : 0;
  return k < 0.5 ? 0 : 1;
}

/** Seconds the "dust off" lasts (S2.13 part 5: 0.4 s, controls locked). */
export const DUST_OFF_TIME = 0.4;

/**
 * Which of the two dust off frames shows at p (0 to 1): 0 hands up, 1 hands on the
 * knees (a pat). Up, pat, up, pat: two pats in DUST_OFF_TIME.
 */
export function dustOffFrame(p: number): 0 | 1 {
  const k = Number.isFinite(p) ? Math.min(Math.max(p, 0), 0.999) : 0;
  return Math.floor(k * 4) % 2 === 1 ? 1 : 0;
}

/** A walking stride is this share of a running one, so feet never slide. */
export const WALK_STRIDE = 0.62;

export const HERO_HEIGHT = 50;

/**
 * The art box every hero drawing stays inside (u; feet centre at 0, 0; facing
 * right), whatever the body, age, hair, outfit or pose. Effects round the hero
 * (amala glow, corn speed lines, dust) are not counted. The gele is the top.
 */
export const HERO_ART_BOX = { left: -21, right: 20, top: -56.5, bottom: 3 } as const;

/**
 * Keeps a saved look inside the lists (old or broken saves still draw). `body` and
 * `age` are kept (fixed if broken) only when the look has them, so a slice 1 look
 * keeps its slice 1 shape.
 */
export function clampLook(look: HeroLook): HeroLook {
  const fix = (n: number, len: number): number => (Number.isInteger(n) && n >= 0 && n < len ? n : 0);
  const out: HeroLook = { skin: fix(look.skin, SKINS.length), hair: fix(look.hair, HAIRS.length), outfit: fix(look.outfit, OUTFITS.length) };
  if (look.body !== undefined) out.body = isIndex(look.body, BODIES.length) ? look.body : defaultBody(out.hair);
  if (look.age !== undefined) out.age = ageOf(look);
  return out;
}

/**
 * How a body is drawn (design.md S2.3). Every body has the same hitbox, moves and
 * timings; only these drawing measures change. Worked out once, never per frame.
 */
interface Build {
  /** Bone lengths: legs, arms, torso and neck (Teen 46 u tall, Elder 49, Adult 50). */
  len: number;
  /** Head size. */
  head: number;
  /** Torso width at the shoulders and at the hips (side view: chest to back). */
  sw: number;
  hw: number;
  /** A gentle narrowing at the waist (Female), as a share of the width. */
  waist: number;
  /** Arm and leg thickness. */
  limb: number;
  /** Eye size. */
  eye: number;
  /** Rounder cheeks (Teen), 0 to 1. */
  round: number;
  /** Grey hair (Elder). */
  grey: boolean;
  /** Short, neat grey beard along the jaw and chin (Elder male). */
  beard: boolean;
  /** Two short smile lines at the outer eye corner (Elder). */
  lines: boolean;
  /** One small lash stroke at the outer corner of each eye (Female). */
  lash: boolean;
  /** Small round gold stud earrings (Female). */
  studs: boolean;
}

const AGE_BUILDS = [
  { len: 0.905, head: 0.96, w: 0.9, limb: 0.85, eye: 1.05, round: 1 },
  { len: 1, head: 1, w: 1, limb: 1, eye: 1, round: 0 },
  { len: 0.98, head: 1, w: 0.95, limb: 0.9, eye: 1, round: 0 },
] as const;

/** BUILDS[body * 3 + age]. */
const BUILDS: readonly Build[] = [0, 1].flatMap((body) =>
  AGE_BUILDS.map((a, age): Build => {
    const female = body === 1;
    const elder = age === 2;
    return {
      len: a.len,
      head: a.head,
      sw: a.w * (female ? 0.94 : 1),
      hw: a.w * (female ? 1.06 : 1),
      waist: female ? 0.06 : 0,
      limb: a.limb,
      eye: a.eye,
      round: a.round,
      grey: elder,
      beard: elder && !female,
      lines: elder,
      lash: female,
      studs: female,
    };
  }),
);

/** Grey hair for elders (design.md S2.3): base and shade. */
const GREY = '#b9b4ac';
const GREY_SHADE = '#8d877e';

const TAU = Math.PI * 2;
const HALF_PI = Math.PI / 2;

// Body measures (u). Legs: hip to ankle, plus the shoe below the ankle.
const THIGH = 10.5;
const SHIN = 10;
const ANKLE = 2.2;
const UPPER_ARM = 7;
const FOREARM = 6.4;
/** Hip to the base of the neck, along the torso. */
const TORSO = 13.6;
const SHOULDER_Y = -12.6;
/** Outline width for one-pass outlined shapes (half of it shows after the fill). */
const OUTLINE = 2.2;
const LINE = 1.05;

/* ------------------------------------------------------------------ colours */

function darken(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number): string => Math.round(v * k).toString(16).padStart(2, '0');
  return `#${ch((n >> 16) & 255)}${ch((n >> 8) & 255)}${ch(n & 255)}`;
}

/** Darker tones, worked out once and kept, so nothing is computed per frame. */
const TONES = new Map<string, string>();
function tone(c: string, k: number): string {
  const key = `${c}${k}`;
  let d = TONES.get(key);
  if (d === undefined) {
    d = darken(c, k);
    TONES.set(key, d);
  }
  return d;
}
/** Far-side (back) colour for arms and legs. */
function far(c: string): string {
  return tone(c, 0.8);
}

/* -------------------------------------------------------------------- shapes */

/** Adds a tapered capsule from (x1,y1) radius r1 to (x2,y2) radius r2 as a subpath. */
function capsule(g: CanvasRenderingContext2D, x1: number, y1: number, r1: number, x2: number, y2: number, r2: number): void {
  const a = Math.atan2(y2 - y1, x2 - x1);
  g.moveTo(x1 + Math.cos(a + HALF_PI) * r1, y1 + Math.sin(a + HALF_PI) * r1);
  g.arc(x1, y1, r1, a + HALF_PI, a + HALF_PI * 3);
  g.arc(x2, y2, r2, a - HALF_PI, a + HALF_PI);
  g.closePath();
}

/** A two-part limb with one clean outline round the whole thing (no seam at the joint). */
function limb(g: CanvasRenderingContext2D, x0: number, y0: number, r0: number, x1: number, y1: number, r1: number, x2: number, y2: number, r2: number, fill: string): void {
  g.beginPath();
  capsule(g, x0, y0, r0, x1, y1, r1);
  capsule(g, x1, y1, r1, x2, y2, r2);
  g.strokeStyle = INK;
  g.lineWidth = OUTLINE;
  g.stroke();
  g.fillStyle = fill;
  g.fill();
}

/** One outlined capsule (sleeves, shorts, socks). */
function patch(g: CanvasRenderingContext2D, x1: number, y1: number, r1: number, x2: number, y2: number, r2: number, fill: string): void {
  g.beginPath();
  capsule(g, x1, y1, r1, x2, y2, r2);
  g.fillStyle = fill;
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = LINE;
  g.stroke();
}

function dot(g: CanvasRenderingContext2D, x: number, y: number, r: number, c: string): void {
  g.fillStyle = c;
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fill();
}

/* ---------------------------------------------------------------------- rig */

/**
 * A pose as angles (radians). Leg: thigh angle from straight down (+ = forward),
 * knee bend (+ = shin folds back), foot angle (0 = flat, pointing forward; + = toe down). Arm: shoulder angle
 * from straight down (+ = forward), elbow bend (+ = forearm folds forward/up).
 * Index 0 is the far side, 1 the near side.
 */
interface Rig {
  thigh: [number, number];
  knee: [number, number];
  foot: [number, number];
  arm: [number, number];
  elbow: [number, number];
  /** Torso lean forward. */
  lean: number;
  /** Extra height (u) above the planted foot: flight in the run, the jump. */
  lift: number;
  /** Head tilt (+ = chin down). */
  tilt: number;
}

// Run cycle for one leg, 8 keys: contact, down, passing, up, then the same for the other leg.
const RUN_THIGH = [0.6, 0.28, -0.12, -0.5, -0.62, -0.3, 0.32, 0.82];
const RUN_KNEE = [0.22, 0.7, 0.45, 0.28, 1.25, 2.05, 1.95, 0.95];
const RUN_FOOT = [-0.25, 0, 0.05, 0.7, 2, 2, 1.3, -0.15];
const RUN_LIFT = [0, 0, 0.5, 1.5, 0, 0, 0.5, 1.5];

/** Smooth looping blend (Catmull-Rom) through 8 keys. */
function loop8(keys: readonly number[], q: number): number {
  const x = (((q % 1) + 1) % 1) * 8;
  const i = Math.floor(x);
  const t = x - i;
  const p0 = keys[(i + 7) % 8]!;
  const p1 = keys[i % 8]!;
  const p2 = keys[(i + 1) % 8]!;
  const p3 = keys[(i + 2) % 8]!;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
}

function runRig(phase: number, reach: number): Rig {
  const legs = [phase + 0.5, phase];
  const thigh = legs.map((q) => loop8(RUN_THIGH, q) * reach) as [number, number];
  const knee = legs.map((q) => loop8(RUN_KNEE, q)) as [number, number];
  const foot = legs.map((q) => loop8(RUN_FOOT, q)) as [number, number];
  // Each arm swings against the leg on its own side, elbows bent, more when forward.
  const arm = thigh.map((a) => -a * 1.05 + 0.08) as [number, number];
  const elbow = arm.map((a) => 1.3 + Math.max(0, a) * 0.45) as [number, number];
  return { thigh, knee, foot, arm, elbow, lean: 0.16, lift: loop8(RUN_LIFT, phase * 2), tilt: -0.08 };
}

/** Walk: the run's keys made smaller and calmer, back nearly straight, small arm swing. */
function walkRig(phase: number, reach: number): Rig {
  const legs = [phase + 0.5, phase];
  const thigh = legs.map((q) => loop8(RUN_THIGH, q) * 0.62 * reach) as [number, number];
  const knee = legs.map((q) => loop8(RUN_KNEE, q) * 0.42) as [number, number];
  const foot = legs.map((q) => loop8(RUN_FOOT, q) * 0.35) as [number, number];
  const arm = thigh.map((a) => -a * 0.8 + 0.04) as [number, number];
  const elbow = arm.map((a) => 0.35 + Math.max(0, a) * 0.4) as [number, number];
  return { thigh, knee, foot, arm, elbow, lean: 0.04, lift: loop8(RUN_LIFT, phase * 2) * 0.3, tilt: -0.02 };
}

/** Skid on a turn: leaning back, near foot braced ahead (toe up), arms out for balance. */
const SKID: Rig = { thigh: [-0.2, 0.78], knee: [0.95, 0.12], foot: [0.1, -0.45], arm: [1.5, 2.0], elbow: [0.35, 0.25], lean: -0.22, lift: 0, tilt: 0.04 };

/** Holding the well rope: both hands up on the rope, legs together and a little bent. */
const ROPE: Rig = { thigh: [0.12, 0.3], knee: [0.3, 0.5], foot: [0.35, 0.45], arm: [3.4, 3.35], elbow: [0.45, 0.5], lean: 0, lift: 0, tilt: -0.12 };

/**
 * Dust off: a low crouch, knees forward. LIFT has the hands up off the knees, PAT has
 * them down on the knees. Elders keep the back straighter and the head up.
 */
const DUST_LEGS = { thigh: [0.75, 1.05] as [number, number], knee: [1.5, 1.75] as [number, number], foot: [0, -0.05] as [number, number], lift: 0 };
const DUST_LIFT: Rig = { ...DUST_LEGS, arm: [0.75, 0.9], elbow: [1.0, 1.15], lean: 0.48, tilt: 0.02 };
const DUST_PAT: Rig = { ...DUST_LEGS, arm: [0.55, 0.7], elbow: [0.1, 0.1], lean: 0.54, tilt: 0.12 };
const DUST_LIFT_TALL: Rig = { ...DUST_LEGS, arm: [0.7, 0.85], elbow: [1.0, 1.15], lean: 0.26, tilt: 0 };
const DUST_PAT_TALL: Rig = { ...DUST_LEGS, arm: [0.5, 0.62], elbow: [0.06, 0.06], lean: 0.3, tilt: 0.02 };

const JUMP: Rig = { thigh: [0.55, 1.3], knee: [1.9, 2.1], foot: [0.8, 0.7], arm: [2.75, 1.7], elbow: [0.4, 0.8], lean: 0.06, lift: 0, tilt: -0.12 };
const FALL: Rig = { thigh: [-0.3, 0.42], knee: [0.95, 0.3], foot: [0.7, 0.2], arm: [-1.95, 1.75], elbow: [-0.45, 0.3], lean: -0.02, lift: 0, tilt: 0.05 };
const CROUCH: Rig = { thigh: [0.5, 0.95], knee: [1.25, 1.6], foot: [0, -0.05], arm: [-0.5, 0.9], elbow: [0.7, 0.9], lean: 0.34, lift: 0, tilt: 0.12 };
/** The same landing squash with the back straighter and the head up, for elders (never bent over). */
const CROUCH_TALL: Rig = { ...CROUCH, lean: 0.14, tilt: 0 };

function standRig(t: number): Rig {
  const sway = Math.sin(t * 1.3) * 0.04;
  return { thigh: [-0.1, 0.1], knee: [0.08, 0.05], foot: [0, 0], arm: [-0.1 + sway, 0.12 - sway], elbow: [0.3, 0.25], lean: 0, lift: 0, tilt: 0 };
}

function mix(a: Rig, b: Rig, k: number): Rig {
  const m = (x: number, y: number): number => x + (y - x) * k;
  const m2 = (x: [number, number], y: [number, number]): [number, number] => [m(x[0], y[0]), m(x[1], y[1])];
  return {
    thigh: m2(a.thigh, b.thigh),
    knee: m2(a.knee, b.knee),
    foot: m2(a.foot, b.foot),
    arm: m2(a.arm, b.arm),
    elbow: m2(a.elbow, b.elbow),
    lean: m(a.lean, b.lean),
    lift: m(a.lift, b.lift),
    tilt: m(a.tilt, b.tilt),
  };
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/** The dust off progress (0 to 1) if the hero is dusting off on the ground, else null. */
function dustOffOf(pose: HeroPose): number | null {
  if (pose.inAir || pose.rope || typeof pose.dustOff !== 'number' || !Number.isFinite(pose.dustOff)) return null;
  return pose.dustOff >= 0 && pose.dustOff < 1 ? pose.dustOff : null;
}

/** The throw progress (0 to 1) if the hero is throwing, else null. */
function throwOf(pose: HeroPose): number | null {
  if (pose.rope || typeof pose.throwing !== 'number' || !Number.isFinite(pose.throwing)) return null;
  return pose.throwing >= 0 && pose.throwing < 1 ? pose.throwing : null;
}

/**
 * The arms of a throw over any body pose. Wind: near arm back and up, the hand by the ear
 * behind; far arm forward for balance. Swing: near arm through to the front (lower in the
 * air, aiming down), far arm back.
 */
function withThrow(r: Rig, frame: 0 | 1, inAir: boolean): Rig {
  if (frame === 0) return { ...r, arm: [0.7, -2.3], elbow: [0.8, 0.85], lean: r.lean - 0.04 };
  return { ...r, arm: [-0.5, inAir ? 1.15 : 1.85], elbow: [0.6, 0.15], lean: r.lean + 0.06 };
}

/** Where the near hand is (torso frame, before the lean), for the ball held in frame 0. */
function handAt(arm: number, elbow: number, b: Build): [number, number] {
  const sx = 0.6;
  const sy = SHOULDER_Y * b.len;
  const ex = sx + Math.sin(arm) * UPPER_ARM * b.len;
  const ey = sy + Math.cos(arm) * UPPER_ARM * b.len;
  const f = arm + elbow;
  return [ex + Math.sin(f) * (FOREARM * b.len + 2.4), ey + Math.cos(f) * (FOREARM * b.len + 2.4)];
}

function rigFor(pose: HeroPose, t: number, reach: number, upright: boolean): Rig {
  let r = bodyRig(pose, t, reach, upright);
  const busy = pose.rope || dustOffOf(pose) !== null;
  if (!busy && isStrong(pose)) r = withStrong(r, unit(pose.strong?.flex));
  const shake = unit(pose.shakeOut);
  if (!busy && shake !== null) r = withShakeOut(r, shake);
  const th = throwOf(pose);
  return th === null || busy ? r : withThrow(r, throwFrame(th), pose.inAir);
}

/** A 0 to 1 progress, or null when unset, broken or done. */
function unit(k: number | undefined): number | null {
  return typeof k === 'number' && Number.isFinite(k) && k >= 0 && k < 1 ? k : null;
}

/** Amala's strong look is on (the old `glow` flag or a `strong` look). */
function isStrong(pose: HeroPose): boolean {
  return pose.glow === true || (typeof pose.strong === 'object' && pose.strong !== null);
}

/** Pushes a swing angle further out from straight down (continuous through 0). */
function spreadOut(a: number, by: number): number {
  return a + Math.max(-1, Math.min(1, a * 10)) * by;
}

/**
 * Strong stance (S2.16 B2): feet about 3 u further apart, elbows about 2 u out, same cycle
 * and lean. The pick-up flex raises both forearms for 0.3 s while the legs keep going.
 */
function withStrong(r: Rig, flex: number | null): Rig {
  const s: Rig = {
    ...r,
    thigh: [spreadOut(r.thigh[0], 0.14), spreadOut(r.thigh[1], 0.14)],
    arm: [spreadOut(r.arm[0], 0.28), spreadOut(r.arm[1], 0.28)],
    elbow: [r.elbow[0] + 0.2, r.elbow[1] + 0.2],
  };
  if (flex === null) return s;
  const k = Math.sin(flex * Math.PI);
  const m = (a: number, b: number): number => a + (b - a) * k;
  return { ...s, arm: [m(s.arm[0], 1.25), m(s.arm[1], 1.45)], elbow: [m(s.elbow[0], 2.2), m(s.elbow[1], 2.3)] };
}

/** Amala ends: the arms shake loose by the sides for 0.3 s. */
function withShakeOut(r: Rig, k: number): Rig {
  const w = Math.sin(k * Math.PI);
  const j = Math.sin(k * Math.PI * 8) * 0.22;
  const m = (a: number, b: number): number => a + (b - a) * w;
  return { ...r, arm: [m(r.arm[0], -0.1 + j), m(r.arm[1], 0.12 - j)], elbow: [m(r.elbow[0], 0.15), m(r.elbow[1], 0.15)] };
}

/** The dash: the run cycle with the head down (12 degrees) and the arms pumping harder. */
function dashRig(phase: number, reach: number): Rig {
  const r = runRig(phase, reach);
  return { ...r, arm: [r.arm[0] * 1.2, r.arm[1] * 1.2], elbow: [r.elbow[0] + 0.15, r.elbow[1] + 0.15], lean: DASH_LOOK.lean, tilt: 0.02 };
}

function bodyRig(pose: HeroPose, t: number, reach: number, upright: boolean): Rig {
  let r: Rig;
  if (pose.rope) return ROPE;
  const dust = dustOffOf(pose);
  if (dust !== null) {
    const pat = dustOffFrame(dust) === 1;
    return upright ? (pat ? DUST_PAT_TALL : DUST_LIFT_TALL) : pat ? DUST_PAT : DUST_LIFT;
  }
  if (pose.inAir) {
    const k = typeof pose.vy === 'number' && Number.isFinite(pose.vy) ? clamp01((pose.vy + 80) / 300) : 0;
    r = mix(JUMP, FALL, k * k * (3 - 2 * k));
  } else if (pose.standing) {
    r = standRig(t);
  } else {
    const ph = Number.isFinite(pose.phase) ? pose.phase : 0;
    r = pose.gait === 'walk' ? walkRig(ph, reach) : pose.dash ? dashRig(ph, reach) : runRig(ph, reach);
    const skid = typeof pose.skid === 'number' && Number.isFinite(pose.skid) ? clamp01(pose.skid) : 0;
    if (skid > 0) r = mix(r, SKID, skid);
  }
  const land = !pose.inAir && typeof pose.land === 'number' && Number.isFinite(pose.land) ? clamp01(pose.land) : 0;
  if (land > 0) r = mix(r, upright ? CROUCH_TALL : CROUCH, land * 0.85);
  return r;
}

interface LegPts {
  kx: number;
  ky: number;
  ax: number;
  ay: number;
  footA: number;
}

/** Knee and ankle positions relative to the hip joint. */
function legPts(thigh: number, knee: number, foot: number, len: number): LegPts {
  const kx = Math.sin(thigh) * THIGH * len;
  const ky = Math.cos(thigh) * THIGH * len;
  const s = thigh - knee;
  return { kx, ky, ax: kx + Math.sin(s) * SHIN * len, ay: ky + Math.cos(s) * SHIN * len, footA: foot };
}

/* --------------------------------------------------------------------- parts */

function drawShoe(g: CanvasRenderingContext2D, x: number, y: number, a: number, colour: string, sole: string, s: number): void {
  g.save();
  g.translate(x, y);
  g.rotate(a);
  if (s !== 1) g.scale(s, s);
  g.beginPath();
  g.moveTo(-1.8, -1.6);
  g.quadraticCurveTo(0.6, -2, 1.6, -0.9);
  g.quadraticCurveTo(4.6, -0.6, 4.6, 1.2);
  g.quadraticCurveTo(4.6, 2.3, 3.4, 2.3);
  g.lineTo(-1.6, 2.3);
  g.quadraticCurveTo(-2.7, 2.3, -2.6, 0.8);
  g.quadraticCurveTo(-2.6, -1, -1.8, -1.6);
  g.closePath();
  g.fillStyle = colour;
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = LINE;
  g.stroke();
  // Sole line
  g.fillStyle = sole;
  g.fillRect(-2.2, 1.5, 6.4, 0.8);
  g.restore();
}

function drawLeg(g: CanvasRenderingContext2D, hx: number, hy: number, p: LegPts, o: OutfitOption, skin: string, isFar: boolean, b: Build): void {
  const c = (col: string): string => (isFar ? far(col) : col);
  const kx = hx + p.kx;
  const ky = hy + p.ky;
  const ax = hx + p.ax;
  const ay = hy + p.ay;
  const bare = o.id === 'jersey' || o.id === 'school';
  const w = b.limb;
  limb(g, hx, hy, 2.75 * w, kx, ky, 2.1 * w, ax, ay, 1.6 * w, c(bare ? skin : o.legs));
  if (bare) {
    // Shorts over the thigh (as wide as the hips at the top), then a sock up the shin
    const sx = hx + p.kx * 0.62;
    const sy = hy + p.ky * 0.62;
    patch(g, hx, hy, 3.1 * b.hw, sx, sy, 2.75 * w, c(o.legs));
    const ox = kx + (ax - kx) * 0.4;
    const oy = ky + (ay - ky) * 0.4;
    patch(g, ox, oy, 1.85 * w, ax, ay, 1.75 * w, c(WHITE));
    if (o.id === 'jersey') {
      // Green band round the top of the sock
      g.strokeStyle = c(o.a);
      g.lineWidth = 0.9;
      g.beginPath();
      g.moveTo(ox + (ax - ox) * 0.25, oy + (ay - oy) * 0.25);
      g.lineTo(ox + (ax - ox) * 0.4, oy + (ay - oy) * 0.4);
      g.stroke();
    }
  }
  drawShoe(g, ax, ay, p.footA, c(o.shoes), o.shoes === '#1d1a14' || o.shoes === '#3b2a20' ? '#5c5048' : '#d8d2c4', b.len);
}

/**
 * The torso, in the torso frame (origin at the hips, up is -y). Points are written
 * for the Adult build and placed through the body's widths and length: the width
 * blends from the shoulders (top) to the hips (bottom), with a gentle waist if any.
 */
function drawTorso(g: CanvasRenderingContext2D, o: OutfitOption, sway: number, run: number, b: Build): void {
  const ts = b.len;
  const waist = o.id === 'agbada' || o.id === 'kaftan' ? 0 : b.waist;
  const wAt = (y: number): number => {
    const k = clamp01((y + 13) / 14);
    const w = b.sw + (b.hw - b.sw) * k;
    return waist === 0 ? w : w * (1 - waist * Math.max(0, 1 - Math.abs(y + 5) / 5));
  };
  const M = (x: number, y: number): void => g.moveTo(x * wAt(y), y * ts);
  const L = (x: number, y: number): void => g.lineTo(x * wAt(y), y * ts);
  const Q = (cx: number, cy: number, x: number, y: number): void => g.quadraticCurveTo(cx * wAt(cy), cy * ts, x * wAt(y), y * ts);
  const D = (x: number, y: number, r: number, c: string): void => dot(g, x * wAt(y), y * ts, r, c);

  g.beginPath();
  if (o.id === 'agbada') {
    // Wide flowing robe from the shoulders to below the knees; the hem trails when running.
    const trail = -run * 2.2 + sway;
    M(-3.2, -13.8);
    Q(-7.2, -10, -7.6 + trail, 2);
    Q(-8.6 + trail, 8, -8.4 + trail * 1.4, 14.6);
    Q(0 + trail, 15.8, 8.2 + trail * 0.8, 13.8);
    Q(8.4, 6, 6.2, -2);
    Q(5.6, -11, 1.8, -14.2);
    g.closePath();
  } else {
    const long = o.id === 'kaftan';
    const trail = long ? -run * 1.2 + sway * 0.6 : 0;
    M(-3.6, -13.4);
    Q(-1.4, -14.6, 1.4, -14.3);
    Q(4.8, -13.6, 4.8, -9.6);
    Q(4.7, -6.4, 3.7, -4.6);
    if (long) {
      Q(5.4, 2, 5.6 + trail, 11.6);
      Q(0 + trail, 12.6, -5.4 + trail, 11.4);
      Q(-5.2, 2, -3.8, -6);
    } else {
      Q(4.4, -1.5, 4.1, 1.2);
      Q(0, 2.2, -4.1, 1);
      Q(-4, -2.5, -3.6, -6);
    }
    Q(-4.9, -10, -3.6, -13.4);
    g.closePath();
  }
  g.fillStyle = o.a;
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = LINE;
  g.stroke();

  switch (o.id) {
    case 'jersey':
      // White V collar and a white side stripe
      g.strokeStyle = o.b;
      g.lineWidth = 1.1;
      g.beginPath();
      M(0.4, -14.2);
      L(2.4, -11.6);
      L(3.9, -13.7);
      M(-1.4, -11.5);
      L(-1.6, 0.6);
      g.stroke();
      break;
    case 'ankara':
      // Bold wax-print circles with a gold centre, and a blue hem band
      for (const [x, y] of [[1.6, -11], [-1.6, -7.4], [2.2, -4.6], [-2.2, -1.6], [2.6, -0.4], [-1.4, -12.2]] as const) {
        D(x, y, 1.45, o.b);
        D(x, y, 0.6, '#f2b300');
      }
      g.strokeStyle = o.b;
      g.lineWidth = 1.2;
      g.beginPath();
      M(-3.8, 0.4);
      Q(0, 1.5, 3.9, 0.6);
      g.stroke();
      break;
    case 'school':
      // Collar, a maroon tie at the front and a belt
      g.fillStyle = WHITE;
      g.strokeStyle = INK;
      g.lineWidth = 0.7;
      g.beginPath();
      M(0.6, -14.3);
      L(3.6, -11.8);
      L(4.2, -13.9);
      g.closePath();
      g.fill();
      g.stroke();
      g.fillStyle = o.b;
      g.beginPath();
      M(3.3, -13.2);
      L(4.3, -12.8);
      L(4.6, -6.2);
      L(3.8, -5.2);
      L(3.2, -6.4);
      g.closePath();
      g.fill();
      g.stroke();
      g.fillStyle = o.b;
      g.fillRect(-4 * wAt(0), -0.6 * ts, 8.1 * wAt(0), 1.3 * ts);
      break;
    case 'agbada':
      // Gold embroidery: round the neck, down the chest, and along the hem
      g.strokeStyle = o.b;
      g.lineWidth = 1.2;
      g.beginPath();
      M(-2.6, -13.4);
      Q(0.8, -10.6, 3.2, -13.6);
      M(1.2, -11.4);
      L(2.4, -3);
      g.stroke();
      // Hem band
      g.lineWidth = 1;
      g.beginPath();
      M(-7.8 - run * 2.6 + sway, 12.2);
      Q(0 - run * 2.2 + sway, 13.4, 7.8 - run * 1.8 + sway * 0.8, 11.4);
      g.stroke();
      break;
    case 'kaftan':
      // Cream collar, a stitched placket down the front and a hem line
      g.strokeStyle = o.b;
      g.lineWidth = 1.1;
      g.beginPath();
      M(-2.4, -13.6);
      Q(1, -11.6, 3.4, -13.6);
      M(2.8, -12.6);
      L(3.4, -4.4);
      g.stroke();
      for (let y = -11; y <= -5; y += 2) D(4, y, 0.45, o.b);
      break;
  }
}

/** One arm in the torso frame. Returns nothing; draws sleeve, hand and any drape. */
function drawArm(g: CanvasRenderingContext2D, o: OutfitOption, skin: string, arm: number, elbow: number, isFar: boolean, b: Build): void {
  const c = (col: string): string => (isFar ? far(col) : col);
  const w = b.limb;
  const sx = isFar ? -0.6 : 0.6;
  const sy = SHOULDER_Y * b.len;
  const ex = sx + Math.sin(arm) * UPPER_ARM * b.len;
  const ey = sy + Math.cos(arm) * UPPER_ARM * b.len;
  const f = arm + elbow;
  const wx = ex + Math.sin(f) * FOREARM * b.len;
  const wy = ey + Math.cos(f) * FOREARM * b.len;
  const shortSleeve = o.id === 'jersey' || o.id === 'school';
  limb(g, sx, sy, 2.1 * w, ex, ey, 1.65 * w, wx, wy, 1.35 * w, c(shortSleeve ? skin : o.a));
  if (shortSleeve) {
    patch(g, sx, sy, 2.5 * w, sx + (ex - sx) * 0.5, sy + (ey - sy) * 0.5, 2.15 * w, c(o.a));
    if (o.id === 'jersey') {
      g.strokeStyle = c(o.b);
      g.lineWidth = 0.9;
      g.beginPath();
      const bx = sx + (ex - sx) * 0.44;
      const by = sy + (ey - sy) * 0.44;
      const nx = Math.cos(arm) * 1.9 * w;
      const ny = -Math.sin(arm) * 1.9 * w;
      g.moveTo(bx - nx, by - ny);
      g.lineTo(bx + nx, by + ny);
      g.stroke();
    }
  } else if (o.id === 'ankara') {
    patch(g, ex + (wx - ex) * 0.72, ey + (wy - ey) * 0.72, 1.55 * w, wx, wy, 1.5 * w, c(o.b));
  } else if (o.id === 'kaftan') {
    patch(g, ex + (wx - ex) * 0.75, ey + (wy - ey) * 0.75, 1.5 * w, wx, wy, 1.45 * w, c(o.b));
  }
  if (o.id === 'agbada') {
    // The wide agbada sleeve: a big panel hanging from the whole arm.
    const mx = ex + (wx - ex) * 0.55;
    const my = ey + (wy - ey) * 0.55;
    const low = Math.max(my, sy + 4 * b.len) + 6 * b.len;
    g.beginPath();
    g.moveTo(sx - 2.2, sy - 1.8);
    g.quadraticCurveTo(ex + Math.cos(arm) * 2.6, ey - Math.sin(arm) * 2.6, mx + Math.cos(f) * 1.8, my - Math.sin(f) * 1.8);
    g.lineTo(mx - Math.cos(f) * 1.8, my + Math.sin(f) * 1.8);
    g.quadraticCurveTo(mx - 0.5, low, (sx + mx) / 2 - 1.5, low + 1);
    g.quadraticCurveTo(sx - 3.6, low, sx - 3.4, sy + 3);
    g.closePath();
    g.fillStyle = c(o.a);
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = LINE;
    g.stroke();
    // Gold edge along the sleeve opening
    g.strokeStyle = c(o.b);
    g.lineWidth = 0.9;
    g.beginPath();
    g.moveTo(mx + Math.cos(f) * 1.2, my - Math.sin(f) * 1.2);
    g.lineTo(mx - Math.cos(f) * 1.2, my + Math.sin(f) * 1.2);
    g.quadraticCurveTo(mx - 0.4, low - 0.8, (sx + mx) / 2 - 1.5, low);
    g.stroke();
  }
  // Hand: a small rounded fist (shrinks half as much as the arm, so it still reads)
  const hand = 0.5 + 0.5 * w;
  g.beginPath();
  g.arc(wx + Math.sin(f) * 0.9 * hand, wy + Math.cos(f) * 0.9 * hand, 1.6 * hand, 0, TAU);
  g.fillStyle = c(skin);
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = LINE;
  g.stroke();
}

/* --------------------------------------------------------------------- head */
// Head frame: origin at the head centre. Cranium ellipse plus a face profile in
// three-quarter view, facing +x. About 10.5 wide and 11.6 tall.
const CX = -0.4;
const CY = -0.6;
const RX = 5.3;
const RY = 5.6;

/** The head outline. `round` (0 to 1) gives the softer, fuller cheek and jaw of a teen. */
function headPath(g: CanvasRenderingContext2D, round: number): void {
  g.beginPath();
  g.moveTo(-2.6, 4.2);
  g.ellipse(CX, CY, RX, RY, 0, 2.3, -0.55);
  // Brow, nose, lips, chin, jaw
  g.quadraticCurveTo(5.1, -2.3, 5.1, -0.9);
  g.quadraticCurveTo(5.4, 0.1, 6.3, 1.3);
  g.quadraticCurveTo(6.2, 1.9, 5.2, 2);
  g.quadraticCurveTo(5.5, 2.6, 5.2, 3.2);
  g.quadraticCurveTo(5.4 + round * 0.1, 4.4 + round * 0.25, 4.5 + round * 0.1, 5 + round * 0.1);
  g.quadraticCurveTo(3.4 + round * 0.3, 5.8 + round * 0.35, 1.9, 5.5 + round * 0.25);
  g.quadraticCurveTo(0 - round * 0.5, 5.1 + round * 0.45, -1, 3.6);
  g.closePath();
}

/**
 * Elder male: a short, neat grey beard along the jaw and chin, joining the
 * sideburn in front of the ear. It stays clear of the lips and the smile line.
 */
function drawBeard(g: CanvasRenderingContext2D): void {
  g.beginPath();
  g.moveTo(0.5, -0.1);
  g.quadraticCurveTo(-0.55, 2.4, -0.55, 3.9);
  g.quadraticCurveTo(0.3, 5.75, 2, 5.95);
  g.quadraticCurveTo(3.7, 6.25, 4.75, 5.3);
  g.quadraticCurveTo(5.6, 4.6, 5.35, 3.7);
  g.quadraticCurveTo(4.7, 4.5, 3.7, 4.45);
  g.quadraticCurveTo(2, 4.6, 1.15, 3.4);
  g.quadraticCurveTo(0.85, 1.6, 1.15, 0);
  g.closePath();
  g.fillStyle = GREY;
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 0.5;
  g.stroke();
  // A few short strokes of texture
  g.strokeStyle = GREY_SHADE;
  g.lineWidth = 0.35;
  g.beginPath();
  g.moveTo(0.2, 3.3);
  g.lineTo(0.55, 4.3);
  g.moveTo(2.2, 5.1);
  g.lineTo(2.5, 5.6);
  g.moveTo(3.8, 5);
  g.lineTo(4, 5.5);
  g.stroke();
}

/**
 * Elder under a gele or headscarf: a little grey shows at the temple, in front of
 * the ear. Under a gele it is drawn before the face and the gele, which covers its
 * top. A headscarf comes further forward, so there a small lock is drawn after the
 * scarf, peeping out below its front edge (and below the lash).
 */
function drawGreyTemple(g: CanvasRenderingContext2D, scarf: boolean): void {
  g.beginPath();
  if (scarf) {
    g.moveTo(1.8, -0.75);
    g.quadraticCurveTo(2.05, 0.6, 1.6, 1.7);
    g.quadraticCurveTo(0.9, 0.6, 0.85, -0.5);
  } else {
    g.moveTo(1.9, -3.2);
    g.quadraticCurveTo(1.75, -0.9, 1.1, 0.55);
    g.quadraticCurveTo(0.5, -0.5, 0.3, -3.2);
  }
  g.closePath();
  g.fillStyle = GREY;
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 0.4;
  g.stroke();
  if (!scarf) {
    g.strokeStyle = GREY_SHADE;
    g.lineWidth = 0.3;
    g.beginPath();
    g.moveTo(1.3, -1.6);
    g.quadraticCurveTo(1.2, -0.6, 1, 0);
    g.stroke();
  }
}

/** Small round gold stud on the ear lobe. */
function drawStud(g: CanvasRenderingContext2D): void {
  g.beginPath();
  g.arc(-0.75, 2.45, 0.6, 0, TAU);
  g.fillStyle = '#f2b300';
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 0.35;
  g.stroke();
}

function drawEar(g: CanvasRenderingContext2D, skin: string, shade: string): void {
  g.beginPath();
  g.ellipse(-0.9, 0.7, 1.45, 1.95, 0.15, 0, TAU);
  g.fillStyle = skin;
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 0.8;
  g.stroke();
  g.strokeStyle = shade;
  g.lineWidth = 0.6;
  g.beginPath();
  g.arc(-0.8, 0.8, 0.8, -1.8, 1.3);
  g.stroke();
}

/**
 * Brows: short, slightly angled (calm and focused). On darker skins a thin light
 * line first runs along the TOP of the outer two thirds of the near brow (light
 * on the brow ridge), touching it, so the ink brow reads against the skin and
 * nothing light sits between brow and eye. The far brow has no rim.
 */
function drawBrows(g: CanvasRenderingContext2D, f: FaceColours): void {
  const w = f.brow ?? 0.8;
  if (f.rim) {
    const rw = w * 0.5;
    const dy = -(w + rw) / 2 + 0.25;
    // The near brow curve from its outer end to about two thirds along.
    g.beginPath();
    g.moveTo(1.9, -1.95 + dy);
    g.quadraticCurveTo(2.49, -2.31 + dy, 3.07, -2.29 + dy);
    g.strokeStyle = f.rim;
    g.lineWidth = rw;
    g.stroke();
  }
  g.beginPath();
  g.moveTo(1.9, -1.95);
  g.quadraticCurveTo(2.8, -2.5, 3.7, -2.15);
  g.moveTo(4.3, -2.2);
  g.lineTo(5, -2);
  g.strokeStyle = f.line;
  g.lineWidth = w;
  g.stroke();
}

function blinkPath(g: CanvasRenderingContext2D): void {
  g.moveTo(2.1, -0.2);
  g.quadraticCurveTo(2.85, 0.35, 3.6, -0.2);
  g.moveTo(4.3, -0.2);
  g.quadraticCurveTo(4.65, 0.25, 5, -0.2);
}

function drawFace(g: CanvasRenderingContext2D, skin: SkinOption, blink: boolean, b: Build): void {
  const f = skin.face;
  const e = b.eye;
  g.lineCap = 'round';
  // Eyes: the near eye is a little bigger than the far one (three-quarter view).
  if (blink) {
    g.beginPath();
    blinkPath(g);
    if (b.lash) {
      // One small lash at the outer end of each closed eye
      g.moveTo(2.1, -0.2);
      g.lineTo(1.6, -0.45);
      g.moveTo(5, -0.2);
      g.lineTo(5.45, -0.45);
    }
    g.strokeStyle = f.line;
    g.lineWidth = 0.7;
    g.stroke();
  } else {
    g.fillStyle = WHITE;
    g.beginPath();
    g.ellipse(2.85, -0.45, 0.8 * e, 1.05 * e, 0, 0, TAU);
    g.moveTo(4.65 + 0.4 * e, -0.45);
    g.ellipse(4.65, -0.45, 0.4 * e, 0.95 * e, 0, 0, TAU);
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = 0.45;
    g.stroke();
    g.fillStyle = INK;
    g.beginPath();
    g.arc(3.15, -0.35, 0.55 * e, 0, TAU);
    g.moveTo(4.8 + 0.35 * e, -0.35);
    g.arc(4.8, -0.35, 0.35 * e, 0, TAU);
    g.fill();
    // Tiny catch-light
    dot(g, 3.3, -0.55, 0.18, WHITE);
    if (b.lash) {
      // One small lash stroke at the outer corner of each eye
      g.beginPath();
      // Near eye: out from the upper back corner, below the brow's end.
      g.moveTo(2.85 - 0.7 * e, -0.45 - 0.45 * e);
      g.quadraticCurveTo(1.85 - 0.3 * e, -0.45 - 0.45 * e, 1.45 - 0.3 * e, -0.45 - 0.75 * e);
      // Far eye: a small flick past the face outline at the brow ridge.
      g.moveTo(5.05, -0.45 - 0.75 * e);
      g.quadraticCurveTo(5.55, -0.45 - 0.8 * e, 5.85, -0.45 - 1.2 * e);
      g.strokeStyle = INK;
      g.lineWidth = 0.5;
      g.stroke();
    }
  }
  if (b.lines) {
    // Elder: two short smile lines fanning from the outer corner of the near eye
    g.beginPath();
    g.moveTo(1.75, -0.75);
    g.lineTo(1.25, -1.05);
    g.moveTo(1.75, -0.15);
    g.lineTo(1.25, 0);
    g.strokeStyle = tone(skin.shade, 0.72);
    g.lineWidth = 0.4;
    g.stroke();
  }
  drawBrows(g, f);
  // Nostril and a soft shade under the nose
  g.strokeStyle = skin.shade;
  g.lineWidth = 0.6;
  g.beginPath();
  g.moveTo(5.2, 1.2);
  g.quadraticCurveTo(5.6, 1.6, 5.2, 1.85);
  g.stroke();
  // Rose lower lip: the same crescent on every skin, corners turned up so it
  // reads as a smile even when it is only a few pixels wide.
  g.beginPath();
  g.moveTo(2.35, 2.45);
  g.quadraticCurveTo(3.85, 5.15, 5.15, 2.4);
  g.quadraticCurveTo(3.75, 3.35, 2.35, 2.45);
  g.fillStyle = f.lip;
  g.fill();
  g.strokeStyle = f.lipLine;
  g.lineWidth = 0.24;
  g.stroke();
  // Smile line along the top of the lip, with a small lift at the back corner
  g.strokeStyle = f.line;
  g.lineWidth = 0.5;
  g.beginPath();
  g.moveTo(2.1, 2.15);
  g.quadraticCurveTo(2.2, 2.45, 2.35, 2.45);
  g.quadraticCurveTo(3.75, 3.35, 5.15, 2.4);
  g.stroke();
}

/** Hair or headwear that sits behind the head and body (afro mass, braids, scarf tails). */
function hairBack(g: CanvasRenderingContext2D, h: HairOption, swing: number): void {
  if (h.id === 'afro') {
    // Rounded, softly bumpy afro, sitting up and back on the skull.
    const cx = -1.5;
    const cy = -2.6;
    const n = 11;
    g.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = -0.35 + (i / n) * TAU;
      const x = cx + Math.cos(a) * 7.3;
      const y = cy + Math.sin(a) * 6.9;
      if (i === 0) g.moveTo(x, y);
      else {
        const m = a - Math.PI / n;
        g.quadraticCurveTo(cx + Math.cos(m) * 8.4, cy + Math.sin(m) * 7.9, x, y);
      }
    }
    g.closePath();
    g.fillStyle = h.colour;
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = LINE;
    g.stroke();
    g.fillStyle = h.accent;
    for (const [x, y] of [[-5, -6], [-1, -8], [2.6, -6.8], [-6.4, -1.4], [-4, 2.4]] as const) {
      g.beginPath();
      g.arc(x, y, 0.7, 0, TAU);
      g.fill();
    }
  } else if (h.id === 'braids') {
    // Three braids falling from the back of the head, beads at the ends.
    g.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const x0 = -4.4 + i * 0.9;
      const y0 = -1 + i * 1.4;
      const x1 = -6.2 + i * 1.1 - swing * (1 + i * 0.3);
      const y1 = 11 - i * 0.6;
      g.beginPath();
      g.moveTo(x0, y0);
      g.quadraticCurveTo(x0 - 1.6, (y0 + y1) / 2, x1, y1);
      g.strokeStyle = INK;
      g.lineWidth = 2.6;
      g.stroke();
      g.strokeStyle = h.colour;
      g.lineWidth = 1.3;
      g.stroke();
      dot(g, x1, y1 + 0.6, 1.05, i === 1 ? '#e0572b' : h.accent);
    }
  } else if (h.id === 'headscarf') {
    // Fabric gathered at the back of the head, then two tails from the knot.
    g.beginPath();
    g.ellipse(-4.8, -2, 3, 3.6, -0.5, 0, TAU);
    g.fillStyle = h.colour;
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = LINE;
    g.stroke();
    g.beginPath();
    g.moveTo(-5.2, 1.6);
    g.quadraticCurveTo(-7.6, 2.6 - swing, -10 - swing * 0.5, 2.4 - swing * 1.4);
    g.lineTo(-9.2 - swing * 0.5, 4.4 - swing);
    g.quadraticCurveTo(-7, 4, -5, 3.4);
    g.moveTo(-5, 2.6);
    g.quadraticCurveTo(-7, 5.4, -8.2 - swing * 0.6, 7.6 - swing);
    g.lineTo(-6.6 - swing * 0.4, 7.8 - swing * 0.6);
    g.quadraticCurveTo(-5.6, 5.4, -4.2, 3.4);
    g.fillStyle = tone(h.colour, 0.85);
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = LINE;
    g.stroke();
  }
}

/** Hair or headwear on top of the skull, following its shape. */
function hairFront(g: CanvasRenderingContext2D, h: HairOption, skin: string): void {
  g.strokeStyle = INK;
  g.lineWidth = 0.9;
  switch (h.id) {
    case 'lowcut': {
      // Close crop following the skull: a soft hairline at the forehead and
      // temple, a tapered sideburn, and the crop stopping above the ear so the
      // back of the head and neck show skin. Where hair is the edge of the head,
      // the thick head outline gives way to a thin, slightly bumpy one, so it
      // reads as hair and not as a hard shell.
      const A0 = 2.42; // back of the head, above the nape
      const A1 = TAU - 0.88; // top front, where the forehead starts
      const crop = (): void => {
        g.moveTo(CX + Math.cos(A0) * RX, CY + Math.sin(A0) * RY);
        const n = 12;
        for (let i = 1; i <= n; i++) {
          const a = A0 + ((A1 - A0) * i) / n;
          const m = a - (A1 - A0) / n / 2;
          g.quadraticCurveTo(CX + Math.cos(m) * (RX + 0.62), CY + Math.sin(m) * (RY + 0.62), CX + Math.cos(a) * (RX + 0.4), CY + Math.sin(a) * (RY + 0.4));
        }
      };
      g.beginPath();
      crop();
      // Forehead hairline, then the sideburn tapering to a point in front of the ear
      g.quadraticCurveTo(2.3, -4.3, 1.6, -3.75);
      g.quadraticCurveTo(1.05, -3.2, 1.05, -2.3);
      g.lineTo(0.55, 0.2);
      g.quadraticCurveTo(0.15, -1.2, -0.6, -1.75);
      // Over the top of the ear, then up and back above the nape
      g.quadraticCurveTo(-1.9, -2.2, -2.7, -1.1);
      g.quadraticCurveTo(-3.3, 0.2, -3.5, 2.3);
      g.quadraticCurveTo(-3.7, 3, CX + Math.cos(A0) * RX, CY + Math.sin(A0) * RY);
      g.closePath();
      // Skin first, so the thick head outline under the crop is covered, then
      // the hair a touch see-through so a little scalp warmth shows
      g.fillStyle = skin;
      g.fill();
      g.globalAlpha = 0.85;
      g.fillStyle = h.colour;
      g.fill();
      g.globalAlpha = 1;
      // The thin outer edge
      g.beginPath();
      crop();
      g.strokeStyle = INK;
      g.lineWidth = 0.6;
      g.stroke();
      // A few short sheen strokes and fine grain
      g.strokeStyle = h.accent;
      g.lineWidth = 0.45;
      g.beginPath();
      for (const [a, b] of [[-2.55, -2.3], [-2.05, -1.8], [-1.55, -1.35]] as const) {
        g.moveTo(CX + Math.cos(a) * (RX - 1.1), CY + Math.sin(a) * (RY - 1.1));
        g.ellipse(CX, CY, RX - 1.1, RY - 1.1, 0, a, b);
      }
      g.stroke();
      g.fillStyle = h.accent;
      g.beginPath();
      for (const [x, y] of [[-3.8, -1.2], [-2.4, -2.9], [-0.4, -3.6], [-4.3, 0.6], [0.2, -2.3]] as const) {
        g.moveTo(x + 0.22, y);
        g.arc(x, y, 0.22, 0, TAU);
      }
      g.fill();
      break;
    }
    case 'afro':
    case 'braids': {
      // Close-cut cap with a neat line-up at the forehead and round the ear.
      const t = 0.6;
      g.beginPath();
      g.moveTo(-3.6, 3.4);
      g.ellipse(CX, CY, RX + t, RY + t, 0, 2.3, -0.82);
      g.quadraticCurveTo(2.6, -3.4, 1.7, -2.8);
      g.lineTo(1.1, -0.7);
      g.quadraticCurveTo(0.6, -1.9, -0.9, -1.8);
      g.quadraticCurveTo(-2.6, -1.2, -2.6, 2.6);
      g.closePath();
      g.fillStyle = h.colour;
      g.fill();
      if (h.id !== 'afro') g.stroke();
      if (h.id === 'braids') {
        // Cornrows running from the hairline to the back of the head
        g.strokeStyle = h.colour === GREY ? GREY_SHADE : '#6b5242';
        g.lineWidth = 0.55;
        g.beginPath();
        for (const k of [0.82, 0.62, 0.42]) {
          g.moveTo(CX + Math.cos(-1.0) * RX * k + 0.6, CY + Math.sin(-1.0) * RY * (0.9 + k * 0.1));
          g.ellipse(CX, CY, RX * (0.55 + k * 0.45), RY * (0.75 + k * 0.25), 0, -1.0 - (1 - k) * 0.4, 3.6 - k * 0.6, true);
        }
        g.stroke();
      }
      break;
    }
    case 'gele': {
      // A tall pleated head tie: a band round the head at the hairline,
      // and a wide fan rising up and back.
      g.beginPath();
      g.moveTo(4.6, -2.4);
      g.quadraticCurveTo(6.6, -6.4, 3.6, -9.6);
      g.quadraticCurveTo(1, -13.4, -3.6, -12.8);
      g.quadraticCurveTo(-9.6, -12.2, -10.6, -7.4);
      g.quadraticCurveTo(-10.8, -3.4, -7.4, -2.2);
      g.quadraticCurveTo(-6.6, 1.2, -4.8, 2.4);
      g.quadraticCurveTo(-2, 0.6, -1.4, -1.4);
      g.quadraticCurveTo(1.8, -1.9, 4.6, -2.4);
      g.closePath();
      g.fillStyle = h.colour;
      g.fill();
      g.strokeStyle = INK;
      g.lineWidth = LINE;
      g.stroke();
      // Pleats fanning out from the knot at the front of the band
      g.strokeStyle = h.accent;
      g.lineWidth = 0.75;
      g.beginPath();
      for (const [cx, cy, x, y] of [
        [2.6, -7, 2.4, -9.6],
        [0.6, -9, -2, -11.8],
        [-2.6, -8, -6.6, -11.2],
        [-4.6, -6, -9.2, -7.4],
      ] as const) {
        g.moveTo(1.4, -3.6);
        g.quadraticCurveTo(cx, cy, x, y);
      }
      g.stroke();
      // Band edge just above the brow
      g.strokeStyle = tone(h.colour, 0.7);
      g.lineWidth = 0.8;
      g.beginPath();
      g.moveTo(4.4, -3.1);
      g.quadraticCurveTo(0, -2.6, -5, 1.4);
      g.stroke();
      break;
    }
    case 'headscarf': {
      // A scarf wrapped smoothly over the skull and ears, tied at the back.
      g.beginPath();
      g.moveTo(-3.8, 4.2);
      g.ellipse(CX, CY, RX + 0.9, RY + 0.9, 0, 2.25, -0.5);
      g.quadraticCurveTo(3, -2.6, 1.6, -1.6);
      g.quadraticCurveTo(0.9, 1.4, 1.2, 4.4);
      g.quadraticCurveTo(-1.2, 5.2, -3.8, 4.2);
      g.closePath();
      g.fillStyle = h.colour;
      g.fill();
      g.strokeStyle = INK;
      g.lineWidth = LINE;
      g.stroke();
      // Folds following the skull, and the knot
      g.strokeStyle = h.accent;
      g.lineWidth = 0.7;
      g.beginPath();
      g.moveTo(-4.6, 1.6);
      g.quadraticCurveTo(-3.6, -4.6, 2.8, -5.2);
      g.moveTo(-4.2, 2.6);
      g.quadraticCurveTo(-1.6, -1.4, 3.4, -3.4);
      g.moveTo(-3.6, 3.4);
      g.quadraticCurveTo(-1, 1.4, 1.4, 0.6);
      g.stroke();
      g.beginPath();
      g.ellipse(-5.1, 2.4, 1.5, 1.2, 0.4, 0, TAU);
      g.fillStyle = h.colour;
      g.fill();
      g.strokeStyle = INK;
      g.lineWidth = 0.8;
      g.stroke();
      break;
    }
  }
}

/** Elder hair: Low cut, Afro and Braids turn grey (braid beads keep their colours). Gele and Headscarf keep theirs. */
const GREY_HAIRS: readonly HairOption[] = HAIRS.map((h) =>
  h.id === 'lowcut' || h.id === 'afro' ? { ...h, colour: GREY, accent: GREY_SHADE } : h.id === 'braids' ? { ...h, colour: GREY } : h,
);

/** Everything one frame of the hero needs, worked out once per draw. */
interface Frame {
  skin: SkinOption;
  b: Build;
  hair: HairOption;
  outfit: OutfitOption;
  t: number;
  dustOff: number | null;
  running: boolean;
  phase: number;
  land: number;
  r: Rig;
  legs: readonly [LegPts, LegPts];
  hipY: number;
  breathe: number;
  swing: number;
  sway: number;
  headX: number;
  headY: number;
}

function frameOf(look: HeroLook, pose: HeroPose): Frame {
  const l = clampLook(look);
  const skin = SKINS[l.skin] ?? SKINS[0]!;
  const b = BUILDS[bodyOf(look) * AGES.length + ageOf(look)] ?? BUILDS[DEFAULT_AGE]!;
  const hair = (b.grey ? GREY_HAIRS : HAIRS)[l.hair] ?? HAIRS[0]!;
  const outfit = OUTFITS[l.outfit] ?? OUTFITS[0]!;
  const t = typeof pose.time === 'number' && Number.isFinite(pose.time) ? pose.time : 0;
  const dustOff = dustOffOf(pose);
  const running = !pose.inAir && !pose.standing && dustOff === null;
  const phase = Number.isFinite(pose.phase) ? pose.phase : 0;
  const land = !pose.inAir && dustOff === null && typeof pose.land === 'number' && Number.isFinite(pose.land) ? clamp01(pose.land) : 0;
  // Shorter legs take slightly bigger swings, so the feet still keep pace with the ground.
  const r = rigFor(pose, t, 1 / b.len, b.grey);
  const legs = [legPts(r.thigh[0], r.knee[0], r.foot[0], b.len), legPts(r.thigh[1], r.knee[1], r.foot[1], b.len)] as const;
  // Plant the lower foot on the ground, then add flight or jump height.
  const reach = Math.max(legs[0].ay, legs[1].ay);
  const hipY = -(reach + ANKLE * b.len) - r.lift * b.len;
  const breathe = pose.standing ? Math.sin(t * 2.2) * 0.35 : 0;
  // Cloth and braid swing: follows the stride, lifts in the air.
  const swing = running ? Math.sin(phase * TAU * 2) * 0.8 + 1.2 : pose.inAir ? 2 : Math.sin(t * 1.3) * 0.3;
  const sway = running ? Math.sin(phase * TAU * 2 + 1) * 0.8 : pose.inAir ? -1.2 : Math.sin(t * 1.3) * 0.3;
  const headX = 1.2 * b.sw;
  const headY = (-TORSO - 6.2) * b.len + breathe;
  return { skin, b, hair, outfit, t, dustOff, running, phase, land, r, legs, hipY, breathe, swing, sway, headX, headY };
}

function torsoFrame(g: CanvasRenderingContext2D, f: Frame): void {
  g.translate(0, f.hipY);
  g.rotate(f.r.lean);
}

function headFrame(g: CanvasRenderingContext2D, f: Frame): void {
  torsoFrame(g, f);
  g.translate(f.headX, f.headY);
  g.rotate(f.r.tilt - f.r.lean * 0.5);
  if (f.b.head !== 1) g.scale(f.b.head, f.b.head);
}

/** Shoulder, elbow and wrist of one arm in the torso frame (as drawArm places them). */
function armPts(arm: number, elbow: number, isFar: boolean, b: Build): [number, number, number, number, number, number] {
  const sx = isFar ? -0.6 : 0.6;
  const sy = SHOULDER_Y * b.len;
  const ex = sx + Math.sin(arm) * UPPER_ARM * b.len;
  const ey = sy + Math.cos(arm) * UPPER_ARM * b.len;
  const fa = arm + elbow;
  return [sx, sy, ex, ey, ex + Math.sin(fa) * FOREARM * b.len, ey + Math.cos(fa) * FOREARM * b.len];
}

/** Adds an ellipse as its own subpath (no joining line). */
function oval(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = 0): void {
  g.moveTo(x + Math.cos(rot) * rx, y + Math.sin(rot) * rx);
  g.ellipse(x, y, rx, ry, rot, 0, TAU);
}

/**
 * Amala's warm glow (S2.16 B2): the hero's own shape widened by `pad` u, as one path
 * filled once behind the hero (no blur, so it stays fast). Follows every body, hair,
 * headwear and outfit, and the pose.
 */
function strongGlow(g: CanvasRenderingContext2D, f: Frame, pad: number, alpha: number): void {
  const { b, r, legs, hipY, outfit, hair, swing } = f;
  const w = b.limb;
  g.beginPath();
  // Legs and shoes
  for (const i of [0, 1] as const) {
    const p = legs[i];
    const hx = i === 0 ? -0.7 : 0.7;
    capsule(g, hx, hipY, 2.75 * w + pad, hx + p.kx, hipY + p.ky, 2.1 * w + pad);
    capsule(g, hx + p.kx, hipY + p.ky, 2.1 * w + pad, hx + p.ax, hipY + p.ay, 1.6 * w + pad);
    const cx = hx + p.ax + Math.cos(p.footA) * b.len;
    const cy = hipY + p.ay + (Math.sin(p.footA) + 0.2) * b.len;
    oval(g, cx, cy, 3.7 * b.len + pad, 2.3 * b.len + pad, p.footA);
  }
  // Torso, neck and arms
  g.save();
  torsoFrame(g, f);
  const sw = Math.max(b.sw, b.hw);
  if (outfit.id === 'agbada') oval(g, 0, 0.5 * b.len, 8.6 * sw + pad, 15.4 * b.len + pad);
  else if (outfit.id === 'kaftan') oval(g, 0.4, -1 * b.len, 5.4 * sw + pad, 13.8 * b.len + pad);
  else oval(g, 0.6 * sw, -6.2 * b.len, 4.6 * sw + pad, 8.8 * b.len + pad);
  capsule(g, 0.2, SHOULDER_Y * b.len, 1.9 * w + pad, f.headX - 0.6, f.headY + 3.6 * b.head, 1.7 * w + pad);
  for (const i of [0, 1] as const) {
    const [sx, sy, ex, ey, wx, wy] = armPts(r.arm[i], r.elbow[i], i === 0, b);
    capsule(g, sx, sy + f.breathe, 2.1 * w + pad, ex, ey + f.breathe, 1.65 * w + pad);
    capsule(g, ex, ey + f.breathe, 1.65 * w + pad, wx, wy + f.breathe, 1.9 + pad);
    if (outfit.id === 'agbada') capsule(g, sx - 1.5, sy + 2, 2.6 + pad, (sx + ex) / 2 - 1.5, Math.max(ey, sy + 4 * b.len) + 5 * b.len, 2.6 + pad);
  }
  g.restore();
  // Head, hair and headwear
  g.save();
  headFrame(g, f);
  oval(g, CX + 0.4, CY + 0.6, RX + 1.4 + pad, RY + 0.8 + pad);
  if (hair.id === 'afro') oval(g, -1.5, -2.6, 8.4 + pad, 7.9 + pad);
  else if (hair.id === 'gele') oval(g, -3, -5.6, 7.9 + pad, 8 + pad);
  else if (hair.id === 'braids') capsule(g, -4.4, -1, 2 + pad, -6.2 - swing * 1.3, 11.6, 2 + pad);
  else if (hair.id === 'headscarf') {
    oval(g, -4.8, -2, 3.6 + pad, 4 + pad);
    capsule(g, -5, 2.4, 1.6 + pad, -9.8 - swing * 0.5, 2.4 - swing * 1.4, 1.4 + pad);
    capsule(g, -5, 3, 1.6 + pad, -8.2 - swing * 0.6, 7.6 - swing, 1.4 + pad);
  }
  g.restore();
  g.globalAlpha = alpha;
  g.fillStyle = STRONG.glow;
  g.fill();
  g.globalAlpha = 1;
}

/* --------------------------------------------------------------- tech suit */

type SuitPart = 'farShin' | 'nearShin' | 'farArm' | 'nearArm' | 'chest' | 'farShoulder' | 'nearShoulder';
/** The put-on order: from the feet up. */
const SUIT_ORDER: readonly SuitPart[] = ['farShin', 'nearShin', 'farArm', 'nearArm', 'chest', 'farShoulder', 'nearShoulder'];

/** How far one plate has clicked on, 0 to 1. */
function plateOn(pose: HeroPose, part: SuitPart): number {
  const on = pose.suit?.on;
  if (pose.still || typeof on !== 'number' || !Number.isFinite(on) || on >= 1) return 1;
  return clamp01(Math.max(0, on) * SUIT_ORDER.length - SUIT_ORDER.indexOf(part));
}

/** A rounded oblong (as plain lines and curves, cheap and easy to measure). */
function rounded(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  g.moveTo(x + r, y);
  g.lineTo(x + w - r, y);
  g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r);
  g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  g.lineTo(x + r, y + h);
  g.quadraticCurveTo(x, y + h, x, y + h - r);
  g.lineTo(x, y + r);
  g.quadraticCurveTo(x, y, x + r, y);
  g.closePath();
}

/** Fill and outline the current plate path, then the seam (and its soft hum light). */
function plateDone(g: CanvasRenderingContext2D, far: boolean, seam: () => void, hum: number, crack: (() => void) | null): void {
  g.fillStyle = far ? tone(SUIT.plate, 0.9) : SUIT.plate;
  g.fill();
  g.strokeStyle = SUIT.line;
  g.lineWidth = SUIT.lineW;
  g.stroke();
  g.lineCap = 'round';
  g.beginPath();
  seam();
  g.strokeStyle = SUIT.seam;
  g.lineWidth = 0.9;
  g.stroke();
  if (hum > 0.01) {
    g.globalAlpha = hum;
    g.strokeStyle = SUIT.seamBright;
    g.stroke();
    g.globalAlpha = 1;
  }
  if (crack) {
    g.beginPath();
    crack();
    g.strokeStyle = SUIT.line;
    g.lineWidth = 1.2;
    g.stroke();
    g.strokeStyle = WHITE;
    g.lineWidth = 0.6;
    g.stroke();
  }
}

/** A band round a limb at `at` along (x1, y1) to (x2, y2): half is the limb's radius there. */
function suitBand(g: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, at: number, half: number, len: number, k: number, far: boolean, hum: number, crack: boolean): void {
  g.save();
  g.translate(x1 + (x2 - x1) * at, y1 + (y2 - y1) * at);
  g.rotate(Math.atan2(y2 - y1, x2 - x1));
  if (k < 1) g.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k);
  const h = half + 1.5;
  g.beginPath();
  rounded(g, -len / 2, -h, len, h * 2, 1.4);
  plateDone(
    g,
    far,
    () => {
      g.moveTo(0, -h + 1);
      g.lineTo(0, h - 1);
    },
    hum,
    crack
      ? () => {
          g.moveTo(-len / 2 + 0.6, -h + 1.2);
          g.lineTo(-0.6, -0.4);
          g.lineTo(0.8, 0.6);
          g.lineTo(len / 2 - 0.6, h - 1.4);
        }
      : null,
  );
  g.restore();
}

/** A shoulder cap: a low dome over the top of the upper arm, turned with the arm. */
function suitShoulder(g: CanvasRenderingContext2D, sx: number, sy: number, arm: number, w: number, k: number, far: boolean, hum: number, crack: boolean): void {
  const rc = 2.1 * w + 1.5;
  g.save();
  g.translate(sx, sy);
  g.rotate(-arm);
  if (k < 1) g.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k);
  g.beginPath();
  g.moveTo(-rc, 1.6);
  g.quadraticCurveTo(-rc, -rc * 0.75, 0, -rc * 0.8);
  g.quadraticCurveTo(rc, -rc * 0.75, rc, 1.6);
  g.quadraticCurveTo(0, 2.8, -rc, 1.6);
  g.closePath();
  plateDone(
    g,
    far,
    () => {
      g.moveTo(-rc + 1.2, 0.4);
      g.quadraticCurveTo(0, -rc * 0.45, rc - 1.2, 0.4);
    },
    hum,
    crack
      ? () => {
          g.moveTo(-rc + 1, -0.6);
          g.lineTo(0, -1.6);
          g.lineTo(0.6, 0.8);
        }
      : null,
  );
  g.restore();
}

/** The chest plate: a rounded oblong with three short grain lines, on the front of the chest. */
function suitChest(g: CanvasRenderingContext2D, b: Build, k: number, hum: number, crack: boolean): void {
  const x0 = 1.6 * b.sw;
  const x1 = 6.4 * b.sw;
  const y0 = -12.2 * b.len;
  const y1 = -5.2 * b.len;
  g.save();
  if (k < 1) {
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    g.translate(cx, cy);
    g.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k);
    g.translate(-cx, -cy);
  }
  g.beginPath();
  rounded(g, x0, y0, x1 - x0, y1 - y0, 2.2);
  plateDone(
    g,
    false,
    () => {
      // Three short grain lines, like garri
      for (const [x, y] of [[0.35, 0.32], [0.62, 0.48], [0.4, 0.66]] as const) {
        const px = x0 + (x1 - x0) * x;
        const py = y0 + (y1 - y0) * y;
        g.moveTo(px - 0.8, py + 0.3);
        g.lineTo(px + 0.8, py - 0.3);
      }
    },
    hum,
    crack
      ? () => {
          g.moveTo(x0 + 1, y0 + 1.4);
          g.lineTo((x0 + x1) / 2, (y0 + y1) / 2 - 0.5);
          g.lineTo((x0 + x1) / 2 + 0.8, (y0 + y1) / 2 + 1);
          g.lineTo(x1 - 1, y1 - 1.2);
        }
      : null,
  );
  g.restore();
}

/** The seams' soft hum light now (0 to 1): once every 2 s; none with reduced motion. */
export function suitHum(time: number, still = false): number {
  if (still || !Number.isFinite(time)) return 0;
  const s = Math.sin((time * TAU) / SUIT.humEvery);
  return s > 0 ? s ** 4 * 0.85 : 0;
}

/** Draws one part of the suit, in the frame its body part is drawn in. */
function suitPart(g: CanvasRenderingContext2D, f: Frame, pose: HeroPose, part: SuitPart): void {
  const k = plateOn(pose, part);
  if (k <= 0) return;
  const { b, r, legs, hipY, outfit } = f;
  const hum = suitHum(f.t, pose.still === true);
  const crack = pose.suit?.crack === true;
  const w = b.limb;
  if (part === 'farShin' || part === 'nearShin') {
    const p = legs[part === 'farShin' ? 0 : 1];
    const hx = part === 'farShin' ? -0.7 : 0.7;
    suitBand(g, hx + p.kx, hipY + p.ky, hx + p.ax, hipY + p.ay, 0.55, 1.85 * w, 4.2 * b.len, k, part === 'farShin', hum, crack);
    return;
  }
  if (part === 'chest') {
    suitChest(g, b, k, hum, crack);
    // Two thin frame lines join the shoulder caps to the chest plate
    if (plateOn(pose, 'farShoulder') > 0 || plateOn(pose, 'nearShoulder') > 0) {
      const sy = SHOULDER_Y * b.len;
      g.beginPath();
      g.moveTo(-0.6 - 1.2, sy + 1.6);
      g.quadraticCurveTo(0.2, -11.6 * b.len, 2.1 * b.sw, -11.4 * b.len);
      g.moveTo(0.6 + 2, sy + 1.4);
      g.quadraticCurveTo(4.8 * b.sw, sy + 0.6, 5.8 * b.sw, -11.6 * b.len);
      g.strokeStyle = SUIT.seam;
      g.lineWidth = 1;
      g.stroke();
    }
    return;
  }
  const isFar = part === 'farArm' || part === 'farShoulder';
  const i = isFar ? 0 : 1;
  const [sx, sy, ex, ey, wx, wy] = armPts(r.arm[i], r.elbow[i], isFar, b);
  if (part === 'farArm' || part === 'nearArm') {
    // On the Agbada and Kaftan the band sits at the wrist, over the sleeve
    const wrist = outfit.id === 'agbada' || outfit.id === 'kaftan';
    suitBand(g, ex, ey, wx, wy, wrist ? 0.8 : 0.55, 1.5 * w, 3.6 * b.len, k, isFar, hum, crack);
  } else {
    suitShoulder(g, sx, sy, r.arm[i], w, k, isFar, hum, crack);
  }
}

/**
 * Draws the hero with feet centred on (0, 0). Translate first:
 *   g.save(); g.translate(x, y); drawHero(g, look, pose); g.restore();
 * No gradients or shadowBlur, so it is cheap every frame. Every body and age has
 * the same hitbox and moves; only the drawing measures change (Build).
 */
export function drawHero(g: CanvasRenderingContext2D, look: HeroLook, pose: HeroPose): void {
  const f = frameOf(look, pose);
  const { skin, b, hair, outfit, t, dustOff, running, r, legs, hipY, breathe, headX, headY } = f;
  const suit = typeof pose.suit === 'object' && pose.suit !== null;

  g.save();
  g.scale(pose.facing === -1 ? -1 : 1, 1);

  if (!pose.inAir && typeof pose.dust === 'number') drawDustPuff(g, pose.dust);
  if (!pose.inAir && !pose.standing && dustOff === null && typeof pose.skid === 'number') drawSkidScuff(g, pose.skid, t);

  if (pose.fast && !pose.dash) {
    // Speed lines behind the hero
    g.strokeStyle = WHITE;
    g.lineCap = 'round';
    g.lineWidth = 2;
    const off = (t * 60) % 6;
    g.beginPath();
    for (const [y, len] of [[-12, 14], [-26, 18], [-40, 12]] as const) {
      g.moveTo(-12 - off, y);
      g.lineTo(-12 - off - len, y);
    }
    g.stroke();
  }
  if (pose.dash) {
    // Dash: three white speed lines (18 to 30 u) with a thin ink edge, and a small dust puff at the feet
    const off = pose.still ? 0 : (t * 60) % 6;
    g.lineCap = 'round';
    g.beginPath();
    for (const [y, len] of [[-10, 24], [-24, 30], [-38, 18]] as const) {
      g.moveTo(-14 - off, y);
      g.lineTo(-14 - off - len, y);
    }
    g.strokeStyle = INK;
    g.lineWidth = 3.2;
    g.stroke();
    g.strokeStyle = WHITE;
    g.lineWidth = 2;
    g.stroke();
    if (!pose.inAir) {
      const every = pose.still ? DASH_LOOK.puffStill : DASH_LOOK.puff;
      const k = (t % (every * 2)) / (every * 2);
      drawDashPuff(g, -6, 0, k);
      drawDashPuff(g, -6, 0, (k + 0.5) % 1);
    }
  }

  if (f.land > 0) g.scale(1 + f.land * 0.08, 1 - f.land * 0.1);

  if (isStrong(pose)) {
    const a = strongGlowAlpha(t, pose.strong?.left, pose.still === true);
    if (a > 0) strongGlow(g, f, strongGlowPad(pose.strong?.left, pose.still === true), a);
  }

  // 1. Hair behind (afro mass, braids, scarf tails)
  g.save();
  headFrame(g, f);
  hairBack(g, hair, f.swing);
  g.restore();

  // 2. Far arm
  g.save();
  torsoFrame(g, f);
  g.translate(0, breathe);
  drawArm(g, outfit, skin.base, r.arm[0], r.elbow[0], true, b);
  if (suit) {
    suitPart(g, f, pose, 'farShoulder');
    suitPart(g, f, pose, 'farArm');
  }
  g.restore();

  // 3. Legs, far then near
  drawLeg(g, -0.7, hipY, legs[0], outfit, skin.base, true, b);
  if (suit) suitPart(g, f, pose, 'farShin');
  drawLeg(g, 0.7, hipY, legs[1], outfit, skin.base, false, b);
  if (suit) suitPart(g, f, pose, 'nearShin');

  // 4. Torso, neck, head
  g.save();
  torsoFrame(g, f);
  g.save();
  g.translate(0, breathe * 0.5);
  drawTorso(g, outfit, f.sway, running ? 1 : 0, b);
  if (suit) suitPart(g, f, pose, 'chest');
  g.restore();
  // Neck
  const neckY = SHOULDER_Y * b.len + breathe;
  g.beginPath();
  capsule(g, 0.2, neckY, 1.9 * b.limb, headX - 0.6, headY + 3.6 * b.head, 1.7 * b.limb);
  g.fillStyle = skin.shade;
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = LINE;
  g.stroke();
  if (outfit.id === 'school' || outfit.id === 'jersey') {
    // Collar sits over the neck base
    g.fillStyle = outfit.id === 'jersey' ? outfit.a : WHITE;
    g.beginPath();
    g.ellipse(0.6 * b.sw, neckY - 0.8 * b.len, 3.2 * b.sw, 1.2, -0.1, 0, TAU);
    g.fill();
    g.stroke();
  }
  g.translate(headX, headY);
  g.rotate(r.tilt - r.lean * 0.5);
  if (b.head !== 1) g.scale(b.head, b.head);
  headPath(g, b.round);
  g.fillStyle = skin.base;
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = OUTLINE * 0.55;
  g.stroke();
  if (b.grey && hair.id === 'gele') drawGreyTemple(g, false);
  drawFace(g, skin, pose.blink === true, b);
  hairFront(g, hair, skin.base);
  if (b.grey && hair.id === 'headscarf') drawGreyTemple(g, true);
  if (b.beard) drawBeard(g);
  if (hair.id !== 'headscarf') {
    drawEar(g, skin.base, skin.shade);
    if (b.studs) drawStud(g);
  }
  if (pose.resting) drawBreath(g, pose.still ? 0.35 : (t % DASH_LOOK.breath) / DASH_LOOK.breath);
  g.restore();

  // 5. Near arm, in front of everything
  g.save();
  torsoFrame(g, f);
  g.translate(0, breathe);
  drawArm(g, outfit, skin.base, r.arm[1], r.elbow[1], false, b);
  if (suit) {
    suitPart(g, f, pose, 'nearShoulder');
    suitPart(g, f, pose, 'nearArm');
  }
  // Throw, frame 0: the fufu ball in the near hand (small, soft white, no steam)
  const throwing = throwOf(pose);
  if (throwing !== null && dustOff === null && throwFrame(throwing) === 0) {
    const [hx, hy] = handAt(r.arm[1], r.elbow[1], b);
    g.beginPath();
    g.arc(hx, hy, 2.8, 0, TAU);
    g.fillStyle = FUFU.white;
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = LINE;
    g.stroke();
  }
  g.restore();

  // Dust off: a small puff off the knees on each pat, bigger on the second
  if (dustOff !== null && dustOffFrame(dustOff) === 1) {
    drawKneePuff(g, 0.7 + legs[1].kx, hipY + legs[1].ky, dustOff >= 0.5 ? 1 : 0.6, (dustOff * 4) % 1);
  }

  g.restore();
}

/** Two small breath puffs drifting out from the mouth (head frame), k 0 to 1 through one puff. */
function drawBreath(g: CanvasRenderingContext2D, k: number): void {
  g.globalAlpha = (1 - k) * 0.9;
  g.fillStyle = WHITE;
  g.strokeStyle = '#7d766a';
  g.lineWidth = 0.6;
  for (const [x, y, rr, dx, dy] of [[7.6, 2.4, 1.6, 4, -2.4], [10, 0.8, 1.2, 5, -3.2]] as const) {
    g.beginPath();
    g.arc(x + dx * k, y + dy * k, rr * (1 + k * 0.7), 0, TAU);
    g.fill();
    g.stroke();
  }
  g.globalAlpha = 1;
}

/**
 * Only the tech suit's plates and frame (S2.16 B3), placed as drawHero places them for
 * this look and pose. For checks and the gallery; the game draws the suit through
 * `pose.suit` so each plate sits in its own layer.
 */
export function drawHeroSuit(g: CanvasRenderingContext2D, look: HeroLook, pose: HeroPose): void {
  const f = frameOf(look, pose);
  g.save();
  g.scale(pose.facing === -1 ? -1 : 1, 1);
  if (f.land > 0) g.scale(1 + f.land * 0.08, 1 - f.land * 0.1);
  for (const part of SUIT_ORDER) {
    g.save();
    if (part === 'chest') {
      torsoFrame(g, f);
      g.translate(0, f.breathe * 0.5);
    } else if (part !== 'farShin' && part !== 'nearShin') {
      torsoFrame(g, f);
      g.translate(0, f.breathe);
    }
    suitPart(g, f, pose, part);
    g.restore();
  }
  g.restore();
}

/**
 * The suit bursting (S2.16 B3): 10 cream bits (3 to 5 u) fly out 20 to 40 u from the
 * hero, drop and fade. (x, y) is the hero's feet; k 0 to 1 over SUIT.breakTime. With
 * reduced motion (still) the bits fade where they are, k over SUIT.breakTimeStill.
 * World space; draws nothing after 1.
 */
export function drawSuitBits(g: CanvasRenderingContext2D, x: number, y: number, k: number, still = false): void {
  if (!(k < 1) || !Number.isFinite(x) || !Number.isFinite(y)) return;
  const t = clamp01(k);
  g.save();
  g.globalAlpha = still ? 1 - t : t < 0.4 ? 1 : 1 - (t - 0.4) / 0.6;
  g.fillStyle = SUIT.plate;
  g.strokeStyle = SUIT.line;
  g.lineWidth = 1;
  for (let i = 0; i < SUIT.bits; i++) {
    const a = -Math.PI * (0.08 + (i / (SUIT.bits - 1)) * 0.84);
    const dist = 20 + ((i * 53) % 21);
    const size = 3 + ((i * 29) % 3);
    const y0 = -8 - ((i * 17) % 30);
    const bx = x + Math.cos(a) * (still ? 4 : dist * t);
    const by = y + y0 + (still ? 0 : Math.sin(a) * dist * 0.6 * t + 60 * t * t);
    g.save();
    g.translate(bx, by);
    g.rotate(still ? i : i + t * 6 * (i % 2 ? 1 : -1));
    g.beginPath();
    g.moveTo(-size / 2, -size / 2.5);
    g.lineTo(size / 2, -size / 2);
    g.lineTo(size / 2.4, size / 2);
    g.lineTo(-size / 2, size / 2.6);
    g.closePath();
    g.fill();
    g.stroke();
    g.restore();
  }
  g.restore();
}
