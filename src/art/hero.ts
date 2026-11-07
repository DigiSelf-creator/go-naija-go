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
import { GLOW, INK, WHITE } from './palette';

/** Lip rose for light and medium skins (outlined thinly in INK) and for skin 5. */
const LIP = '#d9705f';
/** A lighter rose for skin 4, where LIP alone is too close to the skin. */
const LIP_LIGHT = '#f29a86';
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
 * Face feature colours for one skin tone. Whatever touches the skin (the rim if
 * there is one, else the line; the lip outline if there is one, else the lip)
 * is 3:1 or better against the skin, so brows and mouth show on every tone.
 */
export interface FaceColours {
  /** Brows, the smile line and the closed-eye line. */
  line: string;
  /** A soft light rim under the brows on darker skins (a brow-bone highlight). */
  rim?: string;
  /** The lower lip. */
  lip: string;
  /** Thin outline round the lip, only where the lip alone would be too soft. */
  lipLine?: string;
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
  { id: 'skin4', label: 'Skin tone 4', base: '#7a4a2a', shade: '#653b20', face: { line: INK, rim: '#e9a07f', lip: LIP_LIGHT } },
  { id: 'skin5', label: 'Skin tone 5', base: '#4b2c1a', shade: '#3a2113', face: { line: INK, rim: '#c98a66', lip: LIP } },
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

/** Indices into SKINS, HAIRS, OUTFITS (the shape saved under `gidi-look`). */
export interface HeroLook {
  skin: number;
  hair: number;
  outfit: number;
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
}

export const HERO_HEIGHT = 50;

/** Keeps a saved look inside the lists (old or broken saves still draw). */
export function clampLook(look: HeroLook): HeroLook {
  const fix = (n: number, len: number): number => (Number.isInteger(n) && n >= 0 && n < len ? n : 0);
  return { skin: fix(look.skin, SKINS.length), hair: fix(look.hair, HAIRS.length), outfit: fix(look.outfit, OUTFITS.length) };
}

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

function runRig(phase: number, big: boolean): Rig {
  const s = big ? 1.15 : 1;
  const legs = [phase + 0.5, phase];
  const thigh = legs.map((q) => loop8(RUN_THIGH, q) * s) as [number, number];
  const knee = legs.map((q) => loop8(RUN_KNEE, q)) as [number, number];
  const foot = legs.map((q) => loop8(RUN_FOOT, q)) as [number, number];
  // Each arm swings against the leg on its own side, elbows bent, more when forward.
  const arm = thigh.map((a) => -a * 1.05 + 0.08) as [number, number];
  const elbow = arm.map((a) => 1.3 + Math.max(0, a) * 0.45) as [number, number];
  return { thigh, knee, foot, arm, elbow, lean: 0.16, lift: loop8(RUN_LIFT, phase * 2) * s, tilt: -0.08 };
}

const JUMP: Rig = { thigh: [0.55, 1.3], knee: [1.9, 2.1], foot: [0.8, 0.7], arm: [2.75, 1.7], elbow: [0.4, 0.8], lean: 0.06, lift: 0, tilt: -0.12 };
const FALL: Rig = { thigh: [-0.3, 0.42], knee: [0.95, 0.3], foot: [0.7, 0.2], arm: [-1.95, 1.75], elbow: [-0.45, 0.3], lean: -0.02, lift: 0, tilt: 0.05 };
const CROUCH: Rig = { thigh: [0.5, 0.95], knee: [1.25, 1.6], foot: [0, -0.05], arm: [-0.5, 0.9], elbow: [0.7, 0.9], lean: 0.34, lift: 0, tilt: 0.12 };

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

function rigFor(pose: HeroPose, t: number): Rig {
  let r: Rig;
  if (pose.inAir) {
    const k = typeof pose.vy === 'number' && Number.isFinite(pose.vy) ? clamp01((pose.vy + 80) / 300) : 0;
    r = mix(JUMP, FALL, k * k * (3 - 2 * k));
  } else if (pose.standing) {
    r = standRig(t);
  } else {
    r = runRig(Number.isFinite(pose.phase) ? pose.phase : 0, pose.glow);
  }
  const land = !pose.inAir && typeof pose.land === 'number' && Number.isFinite(pose.land) ? clamp01(pose.land) : 0;
  if (land > 0) r = mix(r, CROUCH, land * 0.85);
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
function legPts(thigh: number, knee: number, foot: number): LegPts {
  const kx = Math.sin(thigh) * THIGH;
  const ky = Math.cos(thigh) * THIGH;
  const s = thigh - knee;
  return { kx, ky, ax: kx + Math.sin(s) * SHIN, ay: ky + Math.cos(s) * SHIN, footA: foot };
}

/* --------------------------------------------------------------------- parts */

function drawShoe(g: CanvasRenderingContext2D, x: number, y: number, a: number, colour: string, sole: string): void {
  g.save();
  g.translate(x, y);
  g.rotate(a);
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

function drawLeg(g: CanvasRenderingContext2D, hx: number, hy: number, p: LegPts, o: OutfitOption, skin: string, isFar: boolean): void {
  const c = (col: string): string => (isFar ? far(col) : col);
  const kx = hx + p.kx;
  const ky = hy + p.ky;
  const ax = hx + p.ax;
  const ay = hy + p.ay;
  const bare = o.id === 'jersey' || o.id === 'school';
  limb(g, hx, hy, 2.75, kx, ky, 2.1, ax, ay, 1.6, c(bare ? skin : o.legs));
  if (bare) {
    // Shorts over the thigh, then a sock up the shin
    const sx = hx + p.kx * 0.62;
    const sy = hy + p.ky * 0.62;
    patch(g, hx, hy, 3.1, sx, sy, 2.75, c(o.legs));
    const ox = kx + (ax - kx) * 0.4;
    const oy = ky + (ay - ky) * 0.4;
    patch(g, ox, oy, 1.85, ax, ay, 1.75, c(WHITE));
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
  drawShoe(g, ax, ay, p.footA, c(o.shoes), o.shoes === '#1d1a14' || o.shoes === '#3b2a20' ? '#5c5048' : '#d8d2c4');
}

/** The torso, in the torso frame (origin at the hips, up is -y). */
function drawTorso(g: CanvasRenderingContext2D, o: OutfitOption, sway: number, run: number): void {
  g.beginPath();
  if (o.id === 'agbada') {
    // Wide flowing robe from the shoulders to below the knees; the hem trails when running.
    const trail = -run * 2.2 + sway;
    g.moveTo(-3.2, -13.8);
    g.quadraticCurveTo(-7.2, -10, -7.6 + trail, 2);
    g.quadraticCurveTo(-8.6 + trail, 8, -8.4 + trail * 1.4, 14.6);
    g.quadraticCurveTo(0 + trail, 15.8, 8.2 + trail * 0.8, 13.8);
    g.quadraticCurveTo(8.4, 6, 6.2, -2);
    g.quadraticCurveTo(5.6, -11, 1.8, -14.2);
    g.closePath();
  } else {
    const long = o.id === 'kaftan';
    const trail = long ? -run * 1.2 + sway * 0.6 : 0;
    g.moveTo(-3.6, -13.4);
    g.quadraticCurveTo(-1.4, -14.6, 1.4, -14.3);
    g.quadraticCurveTo(4.8, -13.6, 4.8, -9.6);
    g.quadraticCurveTo(4.7, -6.4, 3.7, -4.6);
    if (long) {
      g.quadraticCurveTo(5.4, 2, 5.6 + trail, 11.6);
      g.quadraticCurveTo(0 + trail, 12.6, -5.4 + trail, 11.4);
      g.quadraticCurveTo(-5.2, 2, -3.8, -6);
    } else {
      g.quadraticCurveTo(4.4, -1.5, 4.1, 1.2);
      g.quadraticCurveTo(0, 2.2, -4.1, 1);
      g.quadraticCurveTo(-4, -2.5, -3.6, -6);
    }
    g.quadraticCurveTo(-4.9, -10, -3.6, -13.4);
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
      g.moveTo(0.4, -14.2);
      g.lineTo(2.4, -11.6);
      g.lineTo(3.9, -13.7);
      g.moveTo(-1.4, -11.5);
      g.lineTo(-1.6, 0.6);
      g.stroke();
      break;
    case 'ankara':
      // Bold wax-print circles with a gold centre, and a blue hem band
      for (const [x, y] of [[1.6, -11], [-1.6, -7.4], [2.2, -4.6], [-2.2, -1.6], [2.6, -0.4], [-1.4, -12.2]] as const) {
        dot(g, x, y, 1.45, o.b);
        dot(g, x, y, 0.6, '#f2b300');
      }
      g.strokeStyle = o.b;
      g.lineWidth = 1.2;
      g.beginPath();
      g.moveTo(-3.8, 0.4);
      g.quadraticCurveTo(0, 1.5, 3.9, 0.6);
      g.stroke();
      break;
    case 'school':
      // Collar, a maroon tie at the front and a belt
      g.fillStyle = WHITE;
      g.strokeStyle = INK;
      g.lineWidth = 0.7;
      g.beginPath();
      g.moveTo(0.6, -14.3);
      g.lineTo(3.6, -11.8);
      g.lineTo(4.2, -13.9);
      g.closePath();
      g.fill();
      g.stroke();
      g.fillStyle = o.b;
      g.beginPath();
      g.moveTo(3.3, -13.2);
      g.lineTo(4.3, -12.8);
      g.lineTo(4.6, -6.2);
      g.lineTo(3.8, -5.2);
      g.lineTo(3.2, -6.4);
      g.closePath();
      g.fill();
      g.stroke();
      g.fillStyle = o.b;
      g.fillRect(-4, -0.6, 8.1, 1.3);
      break;
    case 'agbada':
      // Gold embroidery: round the neck, down the chest, and along the hem
      g.strokeStyle = o.b;
      g.lineWidth = 1.2;
      g.beginPath();
      g.moveTo(-2.6, -13.4);
      g.quadraticCurveTo(0.8, -10.6, 3.2, -13.6);
      g.moveTo(1.2, -11.4);
      g.lineTo(2.4, -3);
      g.stroke();
      // Hem band
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(-7.8 - run * 2.6 + sway, 12.2);
      g.quadraticCurveTo(0 - run * 2.2 + sway, 13.4, 7.8 - run * 1.8 + sway * 0.8, 11.4);
      g.stroke();
      break;
    case 'kaftan':
      // Cream collar, a stitched placket down the front and a hem line
      g.strokeStyle = o.b;
      g.lineWidth = 1.1;
      g.beginPath();
      g.moveTo(-2.4, -13.6);
      g.quadraticCurveTo(1, -11.6, 3.4, -13.6);
      g.moveTo(2.8, -12.6);
      g.lineTo(3.4, -4.4);
      g.stroke();
      for (let y = -11; y <= -5; y += 2) dot(g, 4, y, 0.45, o.b);
      break;
  }
}

/** One arm in the torso frame. Returns nothing; draws sleeve, hand and any drape. */
function drawArm(g: CanvasRenderingContext2D, o: OutfitOption, skin: string, arm: number, elbow: number, isFar: boolean): void {
  const c = (col: string): string => (isFar ? far(col) : col);
  const sx = isFar ? -0.6 : 0.6;
  const sy = SHOULDER_Y;
  const ex = sx + Math.sin(arm) * UPPER_ARM;
  const ey = sy + Math.cos(arm) * UPPER_ARM;
  const f = arm + elbow;
  const wx = ex + Math.sin(f) * FOREARM;
  const wy = ey + Math.cos(f) * FOREARM;
  const shortSleeve = o.id === 'jersey' || o.id === 'school';
  limb(g, sx, sy, 2.1, ex, ey, 1.65, wx, wy, 1.35, c(shortSleeve ? skin : o.a));
  if (shortSleeve) {
    patch(g, sx, sy, 2.5, sx + (ex - sx) * 0.5, sy + (ey - sy) * 0.5, 2.15, c(o.a));
    if (o.id === 'jersey') {
      g.strokeStyle = c(o.b);
      g.lineWidth = 0.9;
      g.beginPath();
      const bx = sx + (ex - sx) * 0.44;
      const by = sy + (ey - sy) * 0.44;
      const nx = Math.cos(arm) * 1.9;
      const ny = -Math.sin(arm) * 1.9;
      g.moveTo(bx - nx, by - ny);
      g.lineTo(bx + nx, by + ny);
      g.stroke();
    }
  } else if (o.id === 'ankara') {
    patch(g, ex + (wx - ex) * 0.72, ey + (wy - ey) * 0.72, 1.55, wx, wy, 1.5, c(o.b));
  } else if (o.id === 'kaftan') {
    patch(g, ex + (wx - ex) * 0.75, ey + (wy - ey) * 0.75, 1.5, wx, wy, 1.45, c(o.b));
  }
  if (o.id === 'agbada') {
    // The wide agbada sleeve: a big panel hanging from the whole arm.
    const mx = ex + (wx - ex) * 0.55;
    const my = ey + (wy - ey) * 0.55;
    const low = Math.max(my, sy + 4) + 6;
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
  // Hand: a small rounded fist
  g.beginPath();
  g.arc(wx + Math.sin(f) * 0.9, wy + Math.cos(f) * 0.9, 1.6, 0, TAU);
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

function headPath(g: CanvasRenderingContext2D): void {
  g.beginPath();
  g.moveTo(-2.6, 4.2);
  g.ellipse(CX, CY, RX, RY, 0, 2.3, -0.55);
  // Brow, nose, lips, chin, jaw
  g.quadraticCurveTo(5.1, -2.3, 5.1, -0.9);
  g.quadraticCurveTo(5.4, 0.1, 6.3, 1.3);
  g.quadraticCurveTo(6.2, 1.9, 5.2, 2);
  g.quadraticCurveTo(5.5, 2.6, 5.2, 3.2);
  g.quadraticCurveTo(5.4, 4.4, 4.5, 5);
  g.quadraticCurveTo(3.4, 5.8, 1.9, 5.5);
  g.quadraticCurveTo(0, 5.1, -1, 3.6);
  g.closePath();
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
 * Strokes a face line made by `path`. On darker skins a thin light line is drawn
 * first, a little lower, so a soft highlight shows just under the line (like
 * light on the brow bone) and the line reads against the skin.
 */
function faceLine(g: CanvasRenderingContext2D, f: FaceColours, width: number, dy: number, path: () => void): void {
  if (f.rim) {
    g.save();
    g.translate(0, dy);
    g.beginPath();
    path();
    g.strokeStyle = f.rim;
    g.lineWidth = width * 0.75;
    g.stroke();
    g.restore();
  }
  g.beginPath();
  path();
  g.strokeStyle = f.line;
  g.lineWidth = width;
  g.stroke();
}

function browPath(g: CanvasRenderingContext2D): void {
  g.moveTo(1.9, -1.95);
  g.quadraticCurveTo(2.8, -2.5, 3.7, -2.15);
  g.moveTo(4.3, -2.2);
  g.lineTo(5, -2);
}

function blinkPath(g: CanvasRenderingContext2D): void {
  g.moveTo(2.1, -0.2);
  g.quadraticCurveTo(2.85, 0.35, 3.6, -0.2);
  g.moveTo(4.3, -0.2);
  g.quadraticCurveTo(4.65, 0.25, 5, -0.2);
}

function drawFace(g: CanvasRenderingContext2D, skin: SkinOption, blink: boolean): void {
  const f = skin.face;
  g.lineCap = 'round';
  // Eyes: the near eye is a little bigger than the far one (three-quarter view).
  if (blink) {
    faceLine(g, f, 0.7, 0.45, () => blinkPath(g));
  } else {
    g.fillStyle = WHITE;
    g.beginPath();
    g.ellipse(2.85, -0.45, 0.8, 1.05, 0, 0, TAU);
    g.moveTo(5.05, -0.45);
    g.ellipse(4.65, -0.45, 0.4, 0.95, 0, 0, TAU);
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = 0.45;
    g.stroke();
    g.fillStyle = INK;
    g.beginPath();
    g.arc(3.15, -0.35, 0.55, 0, TAU);
    g.moveTo(5.15, -0.35);
    g.arc(4.8, -0.35, 0.35, 0, TAU);
    g.fill();
    // Tiny catch-light
    dot(g, 3.3, -0.55, 0.18, WHITE);
  }
  // Brows: short, slightly angled (calm and focused). On darker skins a soft
  // light rim sits just under them, like light on the brow bone.
  faceLine(g, f, 0.8, 0.55, () => browPath(g));
  // Nostril and a soft shade under the nose
  g.strokeStyle = skin.shade;
  g.lineWidth = 0.6;
  g.beginPath();
  g.moveTo(5.2, 1.2);
  g.quadraticCurveTo(5.6, 1.6, 5.2, 1.85);
  g.stroke();
  // Rose lower lip under a short smile line
  g.beginPath();
  g.moveTo(3.2, 2.8);
  g.quadraticCurveTo(4.05, 4.95, 5.2, 2.7);
  g.quadraticCurveTo(4.2, 3.3, 3.2, 2.8);
  g.fillStyle = f.lip;
  g.fill();
  if (f.lipLine) {
    g.strokeStyle = f.lipLine;
    g.lineWidth = 0.3;
    g.stroke();
  }
  g.strokeStyle = f.line;
  g.lineWidth = 0.5;
  g.beginPath();
  g.moveTo(2.9, 2.55);
  g.quadraticCurveTo(3.05, 2.85, 3.2, 2.8);
  g.quadraticCurveTo(4.2, 3.3, 5.2, 2.7);
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
function hairFront(g: CanvasRenderingContext2D, h: HairOption): void {
  g.strokeStyle = INK;
  g.lineWidth = 0.9;
  switch (h.id) {
    case 'lowcut': {
      // Close crop: a thin layer hugging the skull, with a soft hairline at the
      // forehead and temple, a short sideburn and a neat edge round the ear.
      g.beginPath();
      g.moveTo(-3.3, 3.7);
      g.ellipse(CX, CY, RX - 0.1, RY - 0.1, 0, 2.3, -0.88);
      g.quadraticCurveTo(2.3, -4.3, 1.6, -3.75);
      g.quadraticCurveTo(1.05, -3.2, 1.05, -2.3);
      g.lineTo(0.75, -0.2);
      g.quadraticCurveTo(-0.6, -1.9, -2.1, -0.6);
      g.quadraticCurveTo(-2.8, 0.9, -2.7, 2.9);
      g.closePath();
      // Inside the head outline (no extra ink), and a touch see-through so a
      // little scalp warmth shows through the crop
      g.globalAlpha = 0.85;
      g.fillStyle = h.colour;
      g.fill();
      g.globalAlpha = 1;
      // A sheen following the round of the head, and fine grain
      g.strokeStyle = h.accent;
      g.lineWidth = 0.5;
      g.beginPath();
      g.ellipse(CX, CY, RX - 1, RY - 1, 0, -2.45, -1.35);
      g.stroke();
      g.fillStyle = h.accent;
      g.beginPath();
      for (const [x, y] of [[-3.8, -0.4], [-2.4, -2.4], [-0.4, -3.2], [-3.3, 1.8], [0.3, -1.6]] as const) {
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
        g.strokeStyle = '#6b5242';
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

/**
 * Draws the hero with feet centred on (0, 0). Translate first:
 *   g.save(); g.translate(x, y); drawHero(g, look, pose); g.restore();
 * No gradients or shadowBlur, so it is cheap every frame.
 */
export function drawHero(g: CanvasRenderingContext2D, look: HeroLook, pose: HeroPose): void {
  const l = clampLook(look);
  const skin = SKINS[l.skin] ?? SKINS[0]!;
  const hair = HAIRS[l.hair] ?? HAIRS[0]!;
  const outfit = OUTFITS[l.outfit] ?? OUTFITS[0]!;
  const t = typeof pose.time === 'number' && Number.isFinite(pose.time) ? pose.time : 0;
  const running = !pose.inAir && !pose.standing;
  const phase = Number.isFinite(pose.phase) ? pose.phase : 0;

  g.save();
  g.scale(pose.facing === -1 ? -1 : 1, 1);

  if (pose.fast) {
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

  if (pose.glow) {
    // Amala power: a pulsing golden outline (shape, not just colour)
    const pulse = 0.5 + 0.5 * Math.sin(t * 10);
    g.globalAlpha = 0.25 + pulse * 0.15;
    g.fillStyle = GLOW;
    g.beginPath();
    g.ellipse(0, -26, 17, 31, 0, 0, TAU);
    g.fill();
    g.globalAlpha = 1;
    g.strokeStyle = GLOW;
    g.lineWidth = 2.5;
    g.setLineDash([5, 4]);
    g.lineDashOffset = -t * 30;
    g.stroke();
    g.setLineDash([]);
  }

  const land = !pose.inAir && typeof pose.land === 'number' && Number.isFinite(pose.land) ? clamp01(pose.land) : 0;
  if (land > 0) g.scale(1 + land * 0.08, 1 - land * 0.1);

  const r = rigFor(pose, t);
  const legs = [legPts(r.thigh[0], r.knee[0], r.foot[0]), legPts(r.thigh[1], r.knee[1], r.foot[1])] as const;
  // Plant the lower foot on the ground, then add flight or jump height.
  const reach = Math.max(legs[0].ay, legs[1].ay);
  const hipY = -(reach + ANKLE) - r.lift;
  const breathe = pose.standing ? Math.sin(t * 2.2) * 0.35 : 0;
  // Cloth and braid swing: follows the stride, lifts in the air.
  const swing = running ? Math.sin(phase * TAU * 2) * 0.8 + 1.2 : pose.inAir ? 2 : Math.sin(t * 1.3) * 0.3;
  const sway = running ? Math.sin(phase * TAU * 2 + 1) * 0.8 : pose.inAir ? -1.2 : Math.sin(t * 1.3) * 0.3;

  const headX = 1.2;
  const headY = -TORSO - 6.2 + breathe;

  const torsoFrame = (): void => {
    g.translate(0, hipY);
    g.rotate(r.lean);
  };
  const headFrame = (): void => {
    torsoFrame();
    g.translate(headX, headY);
    g.rotate(r.tilt - r.lean * 0.5);
  };

  // 1. Hair behind (afro mass, braids, scarf tails)
  g.save();
  headFrame();
  hairBack(g, hair, swing);
  g.restore();

  // 2. Far arm
  g.save();
  torsoFrame();
  g.translate(0, breathe);
  drawArm(g, outfit, skin.base, r.arm[0], r.elbow[0], true);
  g.restore();

  // 3. Legs, far then near
  drawLeg(g, -0.7, hipY, legs[0], outfit, skin.base, true);
  drawLeg(g, 0.7, hipY, legs[1], outfit, skin.base, false);

  // 4. Torso, neck, head
  g.save();
  torsoFrame();
  g.save();
  g.translate(0, breathe * 0.5);
  drawTorso(g, outfit, sway, running ? 1 : 0);
  g.restore();
  // Neck
  g.beginPath();
  capsule(g, 0.2, -12.6 + breathe, 1.9, headX - 0.6, headY + 3.6, 1.7);
  g.fillStyle = skin.shade;
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = LINE;
  g.stroke();
  if (outfit.id === 'school' || outfit.id === 'jersey') {
    // Collar sits over the neck base
    g.fillStyle = outfit.id === 'jersey' ? outfit.a : WHITE;
    g.beginPath();
    g.ellipse(0.6, -13.4 + breathe, 3.2, 1.2, -0.1, 0, TAU);
    g.fill();
    g.stroke();
  }
  g.translate(headX, headY);
  g.rotate(r.tilt - r.lean * 0.5);
  headPath(g);
  g.fillStyle = skin.base;
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = OUTLINE * 0.55;
  g.stroke();
  drawFace(g, skin, pose.blink === true);
  hairFront(g, hair);
  if (hair.id !== 'headscarf') drawEar(g, skin.base, skin.shade);
  g.restore();

  // 5. Near arm, in front of everything
  g.save();
  torsoFrame();
  g.translate(0, breathe);
  drawArm(g, outfit, skin.base, r.arm[1], r.elbow[1], false);
  g.restore();

  g.restore();
}
