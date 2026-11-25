/**
 * The people kit (task S3g1a; design.md "People everywhere", part 14, art items 1 to 10).
 *
 * Ordinary Lagos people, our own look, drawn in code to match the redrawn hero (decision 60):
 * a bold ink outline, one shadow tone on the side away from the light, a thin warm light edge
 * inside that shadow (it shows most on dark skin), all at a smaller size (an adult is 37 u
 * tall, 0.85 of the hero, outline 1.5 u).
 *
 * Every figure is made of separate layers (skin, hair, headwear, dress, held thing, extras) so
 * a cast can mix them. Feet centre at (0, 0), y up is negative, facing right in three-quarter
 * view (flip the sprite to face left). Nobody wears a uniform, a badge, writing, a party colour
 * or a red cap (CLAUDE.md rules 2 to 4, decision 37).
 *
 * Bake-friendly: drawing a figure uses clips and many small paths, so draw each look and frame
 * once into a sprite sheet (bakeFolk) and copy it with drawFolkSprite every frame.
 */
import { SKINS } from './hero';
import { EYE_INK, FOLK_INK as INK, HERO_INK, armInk, devPerUnit, folkInkPx, inkRatio, innerPx, screenPerUnit, silhouette } from './ink';

const TAU = Math.PI * 2;

/* ================================================================ colours */

/** The light, as for the hero (decision 60): from the upper right, so shadows sit lower left. */
const LX = 0.55;
const LY = -0.835;
const RIM_LIGHT = '#fff0cc';
const PLUM = '#2a1c38';
/**
 * Outline width (u) before style 1.8. Outlines are now set in screen pixels when a person is drawn
 * (baked): max(1.2 u, 1.5 px) in warm ink, at least 1 device px thinner than the hero's
 * (src/art/ink.ts folkInkPx). Kept for things that still give a width in units.
 */
export const FOLK_OUTLINE = 1.5;

/*
 * Style 1.8 outlines. 'one': a thing drawn once (lane fronts, props): every outline is the full
 * outline. 'sil' and 'paint': a person drawn twice (silhouette, then paint): one thick outline
 * round the whole figure, thin lines between its parts.
 */
let pass: 'one' | 'sil' | 'paint' = 'one';

function dpuOf(g: G): number {
  return devPerUnit(g) ?? 1;
}
/** The visible edge (local units) of an outline in this pass. */
function edgeOf(g: G): number {
  const dpu = dpuOf(g);
  const out = folkInkPx(dpu);
  return (pass === 'paint' ? innerPx(out) : out) / dpu;
}
/** Stroke width for an outline stroked AFTER its fill (half of it lies inside the shape). */
function after(g: G): number {
  return pass === 'paint' ? edgeOf(g) : armInk(2 * edgeOf(g));
}
/** A line of `w` units, never thinner than 1 screen px. */
function fine(g: G, w: number): number {
  return Math.max(w, inkRatio() / dpuOf(g));
}
/** True when `w` local units are at least 2 screen px (shades and highlights). */
function shows(g: G, w: number): boolean {
  return devPerUnit(g) === null || w * dpuOf(g) >= 2 * inkRatio();
}

/** Draws a person twice: the silhouette (thick outline only), then the paint with thin inner lines. */
function twoPass(g: G, draw: (g: G) => void): void {
  pass = 'sil';
  try {
    draw(silhouette(g));
    pass = 'paint';
    draw(g);
  } finally {
    pass = 'one';
  }
}

function mix(a: string, b: string, k: number): string {
  const x = parseInt(a.slice(1), 16);
  const y = parseInt(b.slice(1), 16);
  const ch = (s: number): string => {
    const u = (x >> s) & 255;
    return Math.round(u + (((y >> s) & 255) - u) * k)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${ch(16)}${ch(8)}${ch(0)}`;
}
const MEMO = new Map<string, string>();
function memo(key: string, make: () => string): string {
  let v = MEMO.get(key);
  if (v === undefined) MEMO.set(key, (v = make()));
  return v;
}
/** A cloth's shadow tone (for limbs, where a solid tone is cheaper than a layer). */
const deepOf = (c: string): string => memo(`d${c}`, () => mix(c, PLUM, 0.25));
/** A cloth's light edge: its shadow tone leaning to warm cream, as the hero's rim. */
const rimOf = (c: string): string => memo(`r${c}`, () => mix(deepOf(c), RIM_LIGHT, 0.42));
const glowOf = (c: string): string => memo(`g${c}`, () => mix(c, RIM_LIGHT, 0.3));

export interface FolkSkin {
  base: string;
  deep: string;
  /** The light edge inside the shadow: warm and clear on darker skin. */
  rim: string;
  /** Smile colour, chosen to read on this skin. */
  mouth: string;
}

/**
 * Seven skin tones (part 8): the hero builder's five (same index, same colours, from hero.ts)
 * plus a lighter brown (5) and a deeper brown (6). Light to deep: 0, 1, 5, 2, 3, 4, 6.
 */
export const FOLK_SKINS: readonly FolkSkin[] = [...SKINS.map((s) => [s.base, s.deep, s.glow]), ['#c4885a', '#a56a3e', '#e0ac7e'], ['#3a2012', '#200f06', '#6e4630']].map(([base, deep, glow], i) => ({
  base: base!,
  deep: deep!,
  rim: mix(glow!, RIM_LIGHT, 0.3),
  mouth: i === 3 || i === 4 || i === 6 ? '#efb3a0' : '#8a3a2e',
}));

/* ================================================================ the look */

export type FolkAge = 'child' | 'teen' | 'adult' | 'elder';
export type FolkSex = 'm' | 'f';
export type FolkBody = 'slim' | 'medium' | 'round';
export type FolkHair = 'lowcut' | 'afro' | 'braids' | 'cornrows' | 'grey' | 'puffs' | 'bun';
export type FolkHeadwear = 'none' | 'gele' | 'headscarf' | 'hijab' | 'fila' | 'kaftanCap' | 'rigaCap' | 'helmet';
/**
 * The 13 dress kinds of part 8, plus 'sport' (the jogger's plain T-shirt and shorts).
 * Every pattern is our own drawing.
 */
export type FolkDress =
  | 'iroBuba'
  | 'bubaSokoto'
  | 'agbada'
  | 'kaftan'
  | 'babbanRiga'
  | 'hijabDress'
  | 'wrapperBlouse'
  | 'isiagu'
  | 'etibo'
  | 'anger'
  | 'jeansTee'
  | 'shirtTrousers'
  | 'school'
  | 'sport';
export const FOLK_DRESSES = 'iroBuba bubaSokoto agbada kaftan babbanRiga hijabDress wrapperBlouse isiagu etibo anger jeansTee shirtTrousers school'.split(' ') as readonly FolkDress[];
/** What a person holds or carries (part 14 item 2, plus the traders' things of item 3). */
export type FolkHold =
  | 'none'
  | 'handbag'
  | 'schoolBag'
  | 'backpack'
  | 'breadTray'
  | 'basin'
  | 'box'
  | 'headBasket'
  | 'basket'
  | 'phone'
  | 'paper'
  | 'marketBag'
  | 'plate'
  | 'pack'
  | 'ball'
  | 'phoneCase'
  | 'ankaraRoll';
export const FOLK_HOLDS = 'handbag schoolBag backpack breadTray basin box headBasket basket phone paper marketBag plate pack ball phoneCase ankaraRoll'.split(' ') as readonly FolkHold[];

export interface FolkLook {
  /** Index into FOLK_SKINS (0 to 6). */
  skin: number;
  age: FolkAge;
  sex: FolkSex;
  body: FolkBody;
  hair: FolkHair;
  head?: FolkHeadwear;
  dress: FolkDress;
  /** Main cloth colour. */
  a: string;
  /** Second cloth colour (pattern, wrapper, trousers, trim). */
  b: string;
  /** Headwear colour (default: a). Caps are never red (rule 2). */
  h?: string;
  hold?: FolkHold;
  glasses?: boolean;
  /** A baby tied on the back in a wrapper. */
  baby?: boolean;
  /** A short, neat grey beard (elder men, decision 21). */
  beard?: boolean;
  /** Uses a wheelchair: every frame is drawn seated in it (walk frames turn the wheels). */
  chair?: boolean;
  /** Sits on a low stool in every frame (the well room's store keeper). */
  stool?: boolean;
}

/* ================================================================ frames */

/**
 * Every frame the kit can draw. A look bakes only the ones it needs (folkFramesFor; at most 10).
 * stand, walk 0 to 3, wave 0 and 1, cheer 0 and 1 (arms up, a small hop on 1), call (hand to the
 * mouth, or a trader's goods held up), sit (on a low stool), clap 0 and 1 (the hall and the store
 * keeper), run 0 to 3 (the jogger and the children), and back views for the lane run.
 */
export type FolkFrame = 'stand' | 'call' | 'sit' | 'backStand' | `${'walk' | 'run' | 'backWalk' | 'backRun'}${0 | 1 | 2 | 3}` | `${'wave' | 'cheer' | 'clap'}${0 | 1}`;

const four = (n: string): string[] => [0, 1, 2, 3].map((i) => n + i);
export const FOLK_FRAMES = ['stand', ...four('walk'), 'wave0', 'wave1', 'cheer0', 'cheer1', 'call', 'sit', 'clap0', 'clap1', ...four('run'), 'backStand', ...four('backWalk'), ...four('backRun')] as readonly FolkFrame[];

/* ================================================================ sizes */

/** Heights (u, feet to top of head) and head radius by age (part 3: adults 37, teens 33, children 26, elders 36). */
const AGE: Record<FolkAge, { H: number; r: number }> = {
  // Style 1.8: big friendly heads: 12 u on an adult (about 3.1 heads), 11 on a teen, 10 on a child
  child: { H: 26, r: 5 },
  teen: { H: 33, r: 5.5 },
  adult: { H: 37, r: 6 },
  elder: { H: 36, r: 6 },
};
/** Every frame of every look fits this box (u) round the feet; the sprite cell. */
export const FOLK_BOX = { l: -15, r: 15, t: -48, b: 3 } as const;

interface Rig {
  k: number;
  H: number;
  r: number;
  headY: number;
  sh: number;
  sw: number;
  hw: number;
  hip: number;
  armW: number;
  legW: number;
  waist: number;
}

function rig(look: FolkLook): Rig {
  const A = AGE[look.age];
  const k = A.H / 37;
  const bw = look.body === 'slim' ? 0.86 : look.body === 'round' ? 1.22 : 1;
  const f = look.sex === 'f';
  const r = A.r;
  const headY = -A.H + r;
  const sh = headY + r + 1.5 * k;
  return {
    k,
    H: A.H,
    r,
    headY,
    sh,
    sw: 4.3 * k * bw * (f ? 0.92 : 1),
    hw: 3.6 * k * bw * (f ? 1.14 : 1),
    // The body below the bigger head: the legs keep a little over half of it
    hip: -(A.H - 2 * r - 1.5 * k) * 0.62,
    armW: 3.2 * k * (bw > 1 ? 1.12 : 1),
    legW: 3.9 * k * (bw > 1 ? 1.15 : 1),
    waist: f ? -0.5 : look.body === 'round' ? 1.4 : 0.3,
  };
}

/* ================================================================ dress table */

type Top = 'tee' | 'shirt' | 'buba' | 'blouse' | 'tunic' | 'kaftan' | 'gown' | 'drape' | 'longShirt';
type Low = 'trousers' | 'wrapper' | 'shorts' | 'skirt' | 'none';
type Pat = 'none' | 'rings' | 'leaf' | 'stripes' | 'suns' | 'check' | 'weave';

interface DressSpec {
  top: Top;
  low: Low;
  sleeve: 'short' | 'long' | 'wide' | 'none';
  /** Pattern on the top and on the lower cloth. */
  topPat: Pat;
  lowPat: Pat;
  /** Neck embroidery (agbada, kaftan, babban riga). */
  embroid?: 'neck' | 'panel';
}

function dressSpec(look: FolkLook): DressSpec {
  const f = look.sex === 'f';
  switch (look.dress) {
    case 'iroBuba':
      return { top: 'buba', low: 'wrapper', sleeve: 'wide', topPat: 'rings', lowPat: 'rings' };
    case 'bubaSokoto':
      return { top: 'tunic', low: 'trousers', sleeve: 'long', topPat: 'none', lowPat: 'none', embroid: 'neck' };
    case 'agbada':
      return { top: 'drape', low: 'trousers', sleeve: 'wide', topPat: 'none', lowPat: 'none', embroid: 'neck' };
    case 'kaftan':
      return { top: 'kaftan', low: 'trousers', sleeve: 'long', topPat: 'none', lowPat: 'none', embroid: 'neck' };
    case 'babbanRiga':
      return { top: 'drape', low: 'trousers', sleeve: 'wide', topPat: 'none', lowPat: 'none', embroid: 'panel' };
    case 'hijabDress':
      return { top: 'gown', low: 'none', sleeve: 'long', topPat: 'none', lowPat: 'none' };
    case 'wrapperBlouse':
      return { top: 'blouse', low: 'wrapper', sleeve: 'short', topPat: 'none', lowPat: 'leaf' };
    case 'isiagu':
      return { top: 'tunic', low: 'trousers', sleeve: 'long', topPat: 'suns', lowPat: 'none' };
    case 'etibo':
      return { top: 'longShirt', low: 'wrapper', sleeve: 'long', topPat: 'none', lowPat: 'check' };
    case 'anger':
      return { top: f ? 'blouse' : 'shirt', low: f ? 'wrapper' : 'trousers', sleeve: 'short', topPat: f ? 'none' : 'stripes', lowPat: f ? 'stripes' : 'none' };
    case 'jeansTee':
      return { top: 'tee', low: 'trousers', sleeve: 'short', topPat: 'none', lowPat: 'none' };
    case 'shirtTrousers':
      return { top: 'shirt', low: 'trousers', sleeve: 'long', topPat: 'none', lowPat: 'none' };
    case 'school':
      return { top: 'shirt', low: f ? 'skirt' : look.age === 'child' ? 'shorts' : 'trousers', sleeve: 'short', topPat: 'none', lowPat: 'none' };
    case 'sport':
      return { top: 'tee', low: 'shorts', sleeve: 'short', topPat: 'none', lowPat: 'none' };
  }
}

/** Colours a look actually wears: top cloth, lower cloth, pattern ink. */
function clothOf(look: FolkLook): { top: string; low: string; pat: string; lowPat: string } {
  switch (look.dress) {
    case 'iroBuba':
      return { top: look.a, low: look.a, pat: look.b, lowPat: look.b };
    case 'wrapperBlouse':
    case 'etibo':
      return { top: look.a, low: look.b, pat: look.b, lowPat: look.a };
    case 'isiagu':
      return { top: look.a, low: look.b, pat: '#f4ead2', lowPat: look.b };
    case 'anger':
      // Our own bold stripes: deep ink with white bands and a thin coloured line (look.b)
      return look.sex === 'f' ? { top: look.a, low: '#24232a', pat: look.b, lowPat: look.b } : { top: '#24232a', low: look.a, pat: look.b, lowPat: look.b };
    case 'jeansTee':
      return { top: look.a, low: '#3b5a8a', pat: look.b, lowPat: look.b };
    case 'school':
      return { top: '#f6f4ee', low: look.b, pat: look.b, lowPat: look.b };
    case 'bubaSokoto':
    case 'kaftan':
    case 'agbada':
    case 'babbanRiga':
      return { top: look.a, low: look.a, pat: look.b, lowPat: look.b };
    default:
      return { top: look.a, low: look.b, pat: look.b, lowPat: look.b };
  }
}

/* ================================================================ poses */

type P2 = readonly [number, number];
interface Arm {
  e: P2;
  h: P2;
}
interface Pose {
  legs: 'stand' | 'sit' | 'ride';
  /** Near (right) and far (left) foot: [dx, lift]. */
  nl: P2;
  fl: P2;
  /** Body lift (negative = up) and whole-figure hop. */
  bob: number;
  hop: number;
  /** Near (screen right) and far (screen left) arm: elbow and hand, screen x, relative to that shoulder. Adult units. */
  na: Arm;
  fa: Arm;
  back: boolean;
  /** Wheelchair wheel turn (radians). */
  spin: number;
  run: boolean;
}

const mir = (a: Arm): Arm => ({ e: [-a.e[0], a.e[1]], h: [-a.h[0], a.h[1]] });
const DOWN: Arm = { e: [0.7, 5.6], h: [1.0, 10.8] };
const LAP: Arm = { e: [0.9, 5.2], h: [3.6, 8.0] };
const HEAD_LOADS: readonly FolkHold[] = ['breadTray', 'basin', 'box', 'headBasket'];
const RAISE_HOLDS: readonly FolkHold[] = ['phoneCase', 'ankaraRoll', 'plate', 'pack'];

function poseOf(look: FolkLook, frame: FolkFrame, R: Rig): Pose {
  const back = frame.startsWith('back');
  const name = back ? frame.slice(4).toLowerCase() : frame;
  const seated = look.chair === true || look.stool === true || name === 'sit';
  const p: Pose = { legs: seated ? 'sit' : 'stand', nl: [0, 0], fl: [0, 0], bob: 0, hop: 0, na: DOWN, fa: mir(DOWN), back, spin: 0, run: false };
  const hold = look.hold ?? 'none';
  const loaded = HEAD_LOADS.includes(hold);
  const steady: Arm = { e: [-2.4, -2.6], h: [-1.6, -10.2] };
  const walk = /^walk(\d)$/.exec(name);
  const run = /^run(\d)$/.exec(name);
  if (seated) {
    p.na = LAP;
    p.fa = { e: [-0.9, 5.2], h: [1.6, 8.2] };
  }
  if (walk || run) {
    const i = Number((walk ?? run)![1]);
    const c = Math.cos((i * Math.PI) / 2);
    const s = Math.sin((i * Math.PI) / 2);
    if (seated) {
      // Wheelchair: the wheels turn and the hands push on the rims
      p.spin = (i * Math.PI) / 8;
      p.na = { e: [-0.4, 5.0], h: [1.4 + 1.6 * c, 9.4 - 1.2 * s] };
      p.fa = { e: [0.4, 5.0], h: [-0.4 + 1.6 * c, 9.4 - 1.2 * s] };
    } else if (run) {
      p.run = true;
      p.nl = [4.4 * c, 3.0 * Math.max(0, -s)];
      p.fl = [-4.4 * c, 3.0 * Math.max(0, s)];
      p.bob = -1.2 * Math.abs(s) + 0.3;
      p.na = { e: [1.2 - 2.2 * c, 4.4], h: [2.6 - 3.4 * c, 2.8] };
      p.fa = { e: [-1.2 + 2.2 * c, 4.4], h: [-0.2 + 3.4 * c, 2.8] };
    } else {
      p.nl = [3.2 * c, 1.4 * Math.max(0, -s)];
      p.fl = [-3.2 * c, 1.4 * Math.max(0, s)];
      p.bob = -0.6 * Math.abs(s);
      p.na = { e: [0.7 - 1.0 * c, 5.5], h: [1.0 - 2.8 * c, 10.4] };
      p.fa = { e: [-0.7 + 1.0 * c, 5.5], h: [-1.0 + 2.8 * c, 10.4] };
    }
  } else if (name === 'wave0' || name === 'wave1') {
    p.na = name === 'wave0' ? { e: [3.0, -1.6], h: [3.6, -8.4] } : { e: [3.4, -1.2], h: [6.6, -6.8] };
  } else if (name === 'cheer0' || name === 'cheer1') {
    const up: Arm = name === 'cheer0' ? { e: [2.6, -3.6], h: [3.4, -9.8] } : { e: [3.4, -3.2], h: [5.2, -9.2] };
    p.na = up;
    p.fa = mir(up);
    if (name === 'cheer1' && !seated) {
      p.hop = 1.8;
      p.nl = [0.5, 0.8];
      p.fl = [-0.5, 0.8];
    }
  } else if (name === 'clap0' || name === 'clap1') {
    const c: Arm = name === 'clap0' ? { e: [0.9, 4.2], h: [-2.0, 5.4] } : { e: [0.6, 4.4], h: [-3.3, 5.0] };
    p.na = c;
    p.fa = mir(c);
  } else if (name === 'call') {
    if (RAISE_HOLDS.includes(hold)) p.na = { e: [3.0, 1.2], h: [4.2, -4.8] };
    else {
      // Hand cupped by the mouth
      const mx = R.r * 0.6 - (R.sw - 0.6);
      const my = R.headY + R.r * 0.45 - (R.sh + 1.2);
      p.na = { e: [2.8 / R.k, 2.6], h: [(mx + 1.2) / R.k, my / R.k] };
    }
  } else if (!seated) {
    // Standing still with something in the hands
    if (hold === 'phone') p.na = { e: [0.6, 5.4], h: [-1.8, 4.6] };
    else if (hold === 'paper' || hold === 'ball') {
      p.na = { e: [0.6, 4.8], h: [-2.4, 4.8] };
      p.fa = mir(p.na);
    } else if (hold === 'plate') {
      p.na = { e: [0.8, 5.2], h: [-2.2, 7.2] };
      p.fa = mir(p.na);
    } else if (hold === 'pack' || hold === 'phoneCase') p.na = { e: [0.8, 5.4], h: [-1.0, 7.6] };
  }
  if (hold === 'ankaraRoll' && !seated) p.fa = { e: [-0.5, 5.6], h: [2.6, 6.4] };
  // A load on the head: the far hand steadies it whatever the near arm does
  if (loaded && !seated) p.fa = steady;
  return p;
}

/* ================================================================ drawing helpers */

type G = CanvasRenderingContext2D;

/**
 * One solid part with the hero's light: base, an optional pattern, the shadow crescent on the
 * side away from the light, the thin light edge inside it, then the ink outline.
 */
function part(g: G, path: () => void, base: string, opts: { shade?: string; rim?: string; deco?: () => void; sh?: number; line?: number; ink?: string } = {}): void {
  const sh = opts.sh ?? 2.2;
  g.beginPath();
  path();
  g.fillStyle = base;
  g.fill();
  // Style 1.8: one solid shade (the base 25 % toward plum) on the side away from the light, with a
  // hard edge, only where it is 2 px wide or more; then the pattern; no rim line, no see-through.
  const shade = shows(g, sh * 0.8);
  if (shade || opts.deco) {
    g.save();
    g.clip();
    if (shade) {
      g.beginPath();
      path();
      g.save();
      g.translate(LX * sh, LY * sh);
      path();
      g.restore();
      g.fillStyle = opts.shade ?? deepOf(base);
      g.fill('evenodd');
    }
    opts.deco?.();
    g.restore();
  }
  void opts.rim;
  g.beginPath();
  path();
  g.strokeStyle = opts.ink ?? INK;
  g.lineWidth = opts.line !== undefined && pass === 'one' ? Math.max(opts.line, edgeOf(g) * 2) : after(g);
  g.stroke();
}

/** A limb (arm, leg, sleeve) as a stroked line: ink, shadow tone, base pushed to the lit side. */
function limb(g: G, pts: readonly number[], w: number, base: string, deep: string): void {
  const path = (dx: number, dy: number): void => {
    g.beginPath();
    g.moveTo(pts[0]! + dx, pts[1]! + dy);
    for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i]! + dx, pts[i + 1]! + dy);
  };
  path(0, 0);
  g.strokeStyle = INK;
  g.lineWidth = pass === 'paint' ? w + 2 * edgeOf(g) : armInk(w + 2 * edgeOf(g));
  g.stroke();
  // Style 1.8: flat, with one solid shade band only when it is 2 px wide or more
  const shade = shows(g, w * 0.42);
  g.strokeStyle = shade ? deep : base;
  g.lineWidth = w;
  g.stroke();
  if (!shade) return;
  path(LX * w * 0.22, LY * w * 0.22);
  g.strokeStyle = base;
  g.lineWidth = w * 0.56;
  g.stroke();
}

function disc(g: G, x: number, y: number, r: number, fill: string, edge = 0): void {
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fillStyle = fill;
  g.fill();
  if (edge > 0) {
    g.strokeStyle = INK;
    g.lineWidth = pass === 'one' ? Math.max(edge, 2 * edgeOf(g)) : after(g);
    g.stroke();
  }
}
function oval(g: G, x: number, y: number, rx: number, ry: number, fill: string, edge = 0): void {
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, TAU);
  g.fillStyle = fill;
  g.fill();
  if (edge > 0) {
    g.strokeStyle = INK;
    g.lineWidth = pass === 'one' ? Math.max(edge, 2 * edgeOf(g)) : after(g);
    g.stroke();
  }
}
/** A soft flat shadow on the ground (a bezier ellipse: its points stay close to its edge). */
function groundShadow(g: G, x: number, y: number, rx: number, ry: number): void {
  const c = 0.5523;
  g.beginPath();
  g.moveTo(x - rx, y);
  g.bezierCurveTo(x - rx, y - ry * c, x - rx * c, y - ry, x, y - ry);
  g.bezierCurveTo(x + rx * c, y - ry, x + rx, y - ry * c, x + rx, y);
  g.bezierCurveTo(x + rx, y + ry * c, x + rx * c, y + ry, x, y + ry);
  g.bezierCurveTo(x - rx * c, y + ry, x - rx, y + ry * c, x - rx, y);
  g.fillStyle = 'rgba(0,0,0,0.16)';
  g.fill();
}
function lines(g: G, colour: string, w: number, pts: readonly number[]): void {
  g.beginPath();
  for (let i = 0; i + 3 < pts.length; i += 4) {
    g.moveTo(pts[i]!, pts[i + 1]!);
    g.lineTo(pts[i + 2]!, pts[i + 3]!);
  }
  g.strokeStyle = colour;
  g.lineWidth = fine(g, w);
  g.stroke();
}
function box(g: G, x: number, y: number, w: number, h: number, fill: string, r = 0.8): void {
  part(
    g,
    () => {
      g.roundRect(x, y, w, h, r);
    },
    fill,
    { sh: Math.min(1.2, h * 0.3), line: 1 },
  );
}

/* ---------------- patterns (our own drawings) ---------------- */

function pattern(g: G, kind: Pat, colour: string, x0: number, y0: number, x1: number, y1: number, k: number): void {
  if (kind === 'none') return;
  g.save();
  const step = 3.4 * k;
  if (kind === 'rings') {
    // Our own wax print: rings with a dot, in a staggered grid
    g.strokeStyle = colour;
    g.fillStyle = colour;
    g.lineWidth = fine(g, 0.55);
    for (let y = y0, row = 0; y < y1; y += step, row++)
      for (let x = x0 + (row % 2) * step * 0.5; x < x1; x += step) {
        g.beginPath();
        g.arc(x, y, 1.05 * k, 0, TAU);
        g.stroke();
        g.beginPath();
        g.arc(x, y, 0.35 * k, 0, TAU);
        g.fill();
      }
  } else if (kind === 'leaf') {
    // Small leaves pointing alternate ways
    g.fillStyle = colour;
    for (let y = y0, row = 0; y < y1; y += step, row++)
      for (let x = x0 + (row % 2) * step * 0.5; x < x1; x += step) {
        g.beginPath();
        g.ellipse(x, y, 1.2 * k, 0.5 * k, row % 2 ? 0.7 : -0.7, 0, TAU);
        g.fill();
      }
  } else if (kind === 'stripes') {
    // Bold white bands with a thin coloured line between (our own; worn with pride from the Middle Belt)
    for (let y = y0; y < y1; y += 3 * k) {
      g.fillStyle = '#f6f4ee';
      g.fillRect(x0, y, x1 - x0, 1.1 * k);
      g.fillStyle = colour;
      g.fillRect(x0, y + 1.9 * k, x1 - x0, 0.4 * k);
    }
  } else if (kind === 'suns') {
    // Our own repeat for a proud top from the South East: small open diamonds with a dot
    g.strokeStyle = colour;
    g.fillStyle = colour;
    g.lineWidth = fine(g, 0.5);
    const st = step * 1.15;
    for (let y = y0, row = 0; y < y1; y += st, row++)
      for (let x = x0 + (row % 2) * st * 0.5; x < x1; x += st) {
        g.beginPath();
        g.moveTo(x, y - 1.3 * k);
        g.lineTo(x + 1.1 * k, y);
        g.lineTo(x, y + 1.3 * k);
        g.lineTo(x - 1.1 * k, y);
        g.closePath();
        g.stroke();
        g.beginPath();
        g.arc(x, y, 0.38 * k, 0, TAU);
        g.fill();
      }
  } else if (kind === 'check') {
    // A soft check, our own (a wrapper from the South South)
    g.strokeStyle = colour;
    g.globalAlpha = 0.6;
    g.lineWidth = 0.7 * k;
    g.beginPath();
    for (let x = x0; x < x1; x += 2.6 * k) {
      g.moveTo(x, y0);
      g.lineTo(x, y1);
    }
    for (let y = y0; y < y1; y += 2.6 * k) {
      g.moveTo(x0, y);
      g.lineTo(x1, y);
    }
    g.stroke();
  } else if (kind === 'weave') {
    g.strokeStyle = colour;
    g.lineWidth = fine(g, 0.4);
    g.beginPath();
    for (let y = y0; y < y1; y += 1.4) {
      g.moveTo(x0, y);
      g.lineTo(x1, y);
    }
    g.stroke();
  }
  g.restore();
}

/* ================================================================ the figure */

/**
 * Draws one person, feet centre at (0, 0), facing right. Bake it (bakeFolk); it is too costly
 * to draw many every frame.
 */
export function drawFolkFrame(g: G, look: FolkLook, frame: FolkFrame): void {
  const R = rig(look);
  const p = poseOf(look, frame, R);
  twoPass(g, (c) => drawPose(c, look, p, R));
}

function drawPose(g: G, look: FolkLook, p: Pose, R: Rig): void {
  const { k } = R;
  const skin = FOLK_SKINS[((look.skin % FOLK_SKINS.length) + FOLK_SKINS.length) % FOLK_SKINS.length]!;
  const spec = dressSpec(look);
  const cloth = clothOf(look);
  const hold = look.hold ?? 'none';
  const seated = p.legs !== 'stand';
  g.save();
  g.lineCap = 'round';
  g.lineJoin = 'round';
  // Ground shadow (stays on the ground through a hop)
  if (p.legs !== 'ride') groundShadow(g, seated ? 2.5 * k : 0, 0.3, (seated ? 8 : 6) * k, 1.4 * k);
  g.translate(0, -p.hop);
  const sitHip = (look.stool ? -8.2 : look.chair ? -10.5 : -9.8) * k;
  const dy = (seated ? sitHip - R.hip : 0) + p.bob;
  const hipY = R.hip + dy;
  const shY = R.sh + dy;
  const headY = R.headY + dy;

  if (look.chair) chairBack(g, k, p.spin);
  else if (seated && p.legs === 'sit') stool(g, k, sitHip, look.stool === true);

  // Things behind the body
  if (!p.back) behind(g, look, R, shY, hipY);

  // Far arm behind the body when it hangs down at the side
  const farHand: P2 = [-(R.sw - 0.6) + p.fa.h[0] * k, shY + 1.2 + p.fa.h[1] * k];
  const farBehind = farHand[1] > shY + 2 && farHand[0] < -R.sw * 0.55;
  if (farBehind) arm(g, look, R, skin, spec, cloth.top, p.fa, -1, shY, true);

  // Neck
  limb(g, [0.2, headY + R.r * 0.6, 0.2, shY + 0.8], R.r * 0.72, skin.base, skin.deep);

  legs(g, look, R, skin, spec, cloth, p, hipY);
  torso(g, look, R, skin, spec, cloth, shY, hipY, p);
  if (p.back) behind(g, look, R, shY, hipY, true);
  if (!farBehind) arm(g, look, R, skin, spec, cloth.top, p.fa, -1, shY, false);
  heldBelow(g, look, R, p, shY);
  arm(g, look, R, skin, spec, cloth.top, p.na, 1, shY, false);
  head(g, look, R, skin, headY, p.back);
  heldFront(g, look, R, p, shY, headY, hold);
  if (look.chair) chairFront(g, k);
  g.restore();
}

/* ---------------- seats ---------------- */

function stool(g: G, k: number, hipY: number, low: boolean): void {
  const top = hipY + 1.2 * k;
  const w = (low ? 9 : 8) * k;
  lines(g, INK, 2.2, [-w / 2 + 1, top, -w / 2 + 1, 0, w / 2 - 1, top, w / 2 - 1, 0]);
  lines(g, '#8a5d36', 1, [-w / 2 + 1, top, -w / 2 + 1, -0.3, w / 2 - 1, top, w / 2 - 1, -0.3]);
  box(g, -w / 2, top - 1.6 * k, w, 2 * k, '#a8784a', 0.6);
}

function wheel(g: G, x: number, y: number, r: number, spin: number): void {
  const c = Math.cos(spin) * r;
  const s = Math.sin(spin) * r;
  lines(g, '#9aa3ad', 0.5, [x - c, y - s, x + c, y + s, x + s, y - c, x - s, y + c]);
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.strokeStyle = INK;
  g.lineWidth = fine(g, 2.6);
  g.stroke();
  g.strokeStyle = '#4a4e57';
  g.lineWidth = fine(g, 1.4);
  g.stroke();
  disc(g, x, y, 0.9, '#c9cfd6', 0.5);
}

/** The wheelchair (a plain everyday chair, bright blue frame): back, seat, big wheel, footrest, small front wheel. */
function chairBack(g: G, k: number, spin: number): void {
  const frame = '#2f6fd6';
  const pts = [-4.2 * k, -10 * k, -5.4 * k, -21 * k, -5.4 * k, -21 * k, -7.4 * k, -21.4 * k, -3 * k, -10 * k, 7.4 * k, -10 * k, 6.6 * k, -10 * k, 7.6 * k, -2.6 * k];
  lines(g, INK, 2.4, pts);
  lines(g, frame, 1.1, pts);
  part(g, () => g.roundRect(-6.2 * k, -20 * k, 2.8 * k, 9 * k, 1), '#2a2a33', { sh: 1, line: 1 });
  wheel(g, -1.4 * k, -6.8 * k, 6.6 * k, spin);
  disc(g, 8 * k, -1.8 * k, 1.8 * k, '#3a3d44', 1);
  lines(g, INK, 2.2, [6.2 * k, -2.6 * k, 10 * k, -2.6 * k]);
  lines(g, '#9aa3ad', 1, [6.2 * k, -2.6 * k, 10 * k, -2.6 * k]);
}

/** The push rim, in front of the hands' side. */
function chairFront(g: G, k: number): void {
  g.beginPath();
  g.arc(-1.4 * k, -6.8 * k, 5.4 * k, Math.PI * 1.15, Math.PI * 1.85);
  g.strokeStyle = INK;
  g.lineWidth = fine(g, 1.6);
  g.stroke();
  g.strokeStyle = '#c9cfd6';
  g.lineWidth = fine(g, 0.7);
  g.stroke();
}

/* ---------------- legs and lower cloth ---------------- */

function legs(g: G, look: FolkLook, R: Rig, skin: FolkSkin, spec: DressSpec, cloth: { low: string; lowPat: string }, p: Pose, hipY: number): void {
  const { k } = R;
  const long = spec.low === 'wrapper' || spec.top === 'gown';
  const robeOver = spec.top === 'kaftan' || spec.top === 'drape';
  const legCol = spec.low === 'trousers' ? cloth.low : skin.base;
  const legDeep = spec.low === 'trousers' ? deepOf(cloth.low) : skin.deep;
  const shoe = look.dress === 'sport' || (look.dress === 'school' && look.age !== 'adult') ? '#f4f4f4' : look.dress === 'jeansTee' ? '#e9e1cf' : '#3b2a20';
  const sock = look.dress === 'school';
  const pts = (side: -1 | 1): number[] => {
    const hx = side * R.hw * 0.42;
    if (p.legs === 'sit') {
      const off = side < 0 ? -1.4 * k : 0;
      return [hx * 0.4 + off, hipY, 6.2 * k + off, hipY - 0.3 * k, 6.8 * k + off, -1.6 * k];
    }
    if (p.legs === 'ride') {
      const off = side < 0 ? -1.2 * k : 0;
      return [off, hipY, 5.2 * k + off, hipY + 1.2 * k, 3.4 * k + off, hipY + 7.8 * k];
    }
    const [dx, lift] = side > 0 ? p.nl : p.fl;
    const ax = hx * 1.05 + dx * k;
    const ay = -1.5 * k - lift * k + dx * 0.22 * k;
    const kx = (hx + ax) / 2 + (lift > 0 ? lift * 0.8 * k : 0) + (p.run ? 1.2 * k : 0);
    const ky = (hipY + ay) / 2;
    return [hx, hipY, kx, ky, ax, ay];
  };
  for (const side of [-1, 1] as const) {
    const q = pts(side);
    const far = side < 0;
    const base = far ? mix(legCol, '#000000', 0.15) : legCol;
    const deep = far ? mix(legDeep, '#000000', 0.15) : legDeep;
    // Bare lower legs below shorts or a short skirt
    if (spec.low === 'shorts' || spec.low === 'skirt') {
      limb(g, q, R.legW * 0.82, far ? mix(skin.base, '#000000', 0.12) : skin.base, skin.deep);
      if (sock) limb(g, [q[2]! * 0.4 + q[4]! * 0.6, q[3]! * 0.4 + q[5]! * 0.6, q[4]!, q[5]!], R.legW * 0.86, '#f6f4ee', '#d9d6cf');
      if (spec.low === 'shorts') limb(g, [q[0]!, q[1]!, q[0]! * 0.35 + q[2]! * 0.65, q[1]! * 0.35 + q[3]! * 0.65], R.legW * 1.15, far ? mix(cloth.low, '#000000', 0.15) : cloth.low, deepOf(cloth.low));
    } else if (long && p.legs === 'stand') {
      limb(g, [q[2]! * 0.3 + q[4]! * 0.7, q[3]! * 0.3 + q[5]! * 0.7, q[4]!, q[5]!], R.legW * 0.75, far ? mix(skin.base, '#000000', 0.12) : skin.base, skin.deep);
    } else {
      limb(g, q, R.legW, base, deep);
    }
    // Shoe
    const fx = q[4]!;
    const fy = q[5]!;
    const toe = p.legs === 'ride' ? 1.2 : 1;
    oval(g, fx + 0.9 * k * toe, fy + 0.4 * k, 1.9 * k, 1.05 * k, far ? mix(shoe, '#000000', 0.2) : shoe, 1);
  }
  // A wrapper, a long dress or a robe over the legs
  if (long || robeOver || look.dress === 'etibo') lowerCloth(g, look, R, spec, cloth, p, hipY);
  if (spec.low === 'skirt') {
    const w = R.hw + 0.8 * k;
    const y1 = hipY + (p.legs === 'stand' ? 7.5 * k : 3 * k);
    part(
      g,
      () => {
        g.moveTo(-R.hw, hipY - 2 * k);
        g.lineTo(R.hw, hipY - 2 * k);
        g.lineTo(w + (p.legs !== 'stand' ? 4 * k : 0), y1);
        g.lineTo(-w, y1);
        g.closePath();
      },
      cloth.low,
    );
  }
}

function lowerCloth(g: G, look: FolkLook, R: Rig, spec: DressSpec, cloth: { low: string; lowPat: string }, p: Pose, hipY: number): void {
  const { k } = R;
  const gown = spec.top === 'gown';
  const robe = spec.top === 'kaftan';
  const drape = spec.top === 'drape';
  if (drape) return; // the drape is drawn with the top
  const col = gown || robe ? clothOf(look).top : cloth.low;
  const pat = gown || robe ? 'none' : spec.lowPat;
  const topY = gown || robe ? hipY - 4 * k : hipY - 2.6 * k;
  const hem = robe ? -5 * k : -2.2 * k;
  const w0 = R.hw + 0.4 * k;
  if (p.legs !== 'stand') {
    // Seated: over the thighs to the knees, then down to the ankles
    const kneeX = (p.legs === 'ride' ? 5.6 : 6.6) * k;
    part(
      g,
      () => {
        g.moveTo(-w0, topY);
        g.lineTo(w0, topY);
        g.lineTo(kneeX + 1.4 * k, hipY - 1.6 * k);
        g.quadraticCurveTo(kneeX + 2.4 * k, hipY + 0.6 * k, kneeX + 1.8 * k, Math.min(hem + 1 * k, hipY + 6 * k));
        g.lineTo(kneeX - 2.6 * k, Math.min(hem + 1 * k, hipY + 6 * k));
        g.lineTo(kneeX - 2.2 * k, hipY + 2.2 * k);
        g.lineTo(-w0, hipY + 2.2 * k);
        g.closePath();
      },
      col,
      { deco: () => pattern(g, pat, cloth.lowPat, -w0 - 2, topY, kneeX + 4 * k, hem + 2, k) },
    );
    return;
  }
  const spread = Math.abs(p.nl[0] - p.fl[0]) * 0.32 * k;
  const shift = (p.nl[0] + p.fl[0]) * 0.25 * k;
  const w1 = R.hw + (robe ? 1.8 : gown ? 2.0 : 0.9) * k + spread;
  part(
    g,
    () => {
      g.moveTo(-w0, topY);
      g.lineTo(w0, topY);
      g.quadraticCurveTo(w0 + 0.8 * k, (topY + hem) / 2, w1 + shift, hem);
      g.lineTo(-w1 + shift, hem);
      g.quadraticCurveTo(-w0 - 0.8 * k, (topY + hem) / 2, -w0, topY);
      g.closePath();
    },
    col,
    { deco: () => pattern(g, pat, cloth.lowPat, -w1 - 2, topY, w1 + 2, hem + 2, k) },
  );
  // The wrapper's tucked fold at the waist
  if (spec.low === 'wrapper' && !gown) lines(g, rimOf(col), 0.6, [-w0 + 1, topY + 1.4 * k, w0 - 0.5, topY + 0.6 * k]);
}

/* ---------------- torso ---------------- */

function torso(g: G, look: FolkLook, R: Rig, skin: FolkSkin, spec: DressSpec, cloth: { top: string; pat: string }, shY: number, hipY: number, p: Pose): void {
  const { k, sw, hw } = R;
  const top = spec.top;
  let botY = hipY + 0.8 * k;
  let botW = hw + 0.2 * k;
  let bulge = R.waist * k;
  if (top === 'buba') {
    botY = hipY + 2.6 * k;
    botW = hw + 1.4 * k;
    bulge = 0.4 * k;
  } else if (top === 'tunic') {
    botY = hipY + 4.4 * k;
    botW = hw + 1.0 * k;
  } else if (top === 'longShirt') {
    botY = hipY + 6.6 * k;
    botW = hw + 1.2 * k;
  } else if (top === 'kaftan' || top === 'gown') {
    botY = p.legs === 'stand' ? (top === 'kaftan' ? -5 * k : -2.2 * k) : hipY + 1.5 * k;
    botW = hw + (top === 'kaftan' ? 1.8 : 2.0) * k + (p.legs === 'stand' ? Math.abs(p.nl[0] - p.fl[0]) * 0.32 * k : 0);
    bulge = 1 * k;
  }
  if (p.legs !== 'stand' && botY > hipY + 2 * k) botY = hipY + 2 * k;
  const drape = top === 'drape';
  const path = (): void => {
    g.moveTo(-sw + 1, shY);
    g.lineTo(sw - 1, shY);
    g.quadraticCurveTo(sw + 0.3, shY, sw + 0.2, shY + 2);
    g.quadraticCurveTo(sw + bulge, (shY + botY) / 2, botW, botY);
    g.lineTo(-botW, botY);
    g.quadraticCurveTo(-sw - bulge, (shY + botY) / 2, -sw - 0.2, shY + 2);
    g.quadraticCurveTo(-sw - 0.3, shY, -sw + 1, shY);
    g.closePath();
  };
  if (drape) {
    drapeRobe(g, look, R, cloth, shY, hipY, p);
    return;
  }
  part(g, path, cloth.top, { deco: () => pattern(g, spec.topPat, cloth.pat, -botW - 2, shY - 1, botW + 2, botY + 1, k) });
  if (p.back) return;
  // Neckline
  if (top === 'shirt') {
    // Collar points
    g.beginPath();
    g.moveTo(-1.6 * k, shY - 0.2);
    g.lineTo(0.2, shY + 1.8 * k);
    g.lineTo(1.9 * k, shY - 0.2);
    g.lineTo(1.2 * k, shY + 1.4 * k);
    g.lineTo(0.2, shY + 1.8 * k);
    g.lineTo(-0.9 * k, shY + 1.4 * k);
    g.closePath();
    g.fillStyle = mix(cloth.top, '#ffffff', 0.25);
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = fine(g, 0.6);
    g.stroke();
    if (look.dress !== 'school') lines(g, deepOf(cloth.top), 0.5, [0.2, shY + 2 * k, 0.2, hipY]);
  } else if (top !== 'gown' || !look.head || look.head !== 'hijab') {
    g.beginPath();
    g.ellipse(0.2, shY + 0.1, 1.5 * k, 1.1 * k, 0, 0, Math.PI);
    g.fillStyle = skin.base;
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = fine(g, 0.6);
    g.stroke();
  }
  if (spec.embroid === 'neck') embroidery(g, cloth.pat, shY, k, 4.6);
  // A wrapper blouse and buba tie or edge
  if (top === 'tee' && look.dress === 'sport') lines(g, cloth.pat, 0.8 * k, [-sw + 0.5, shY + 4 * k, sw - 0.5, shY + 4 * k]);
}

function embroidery(g: G, colour: string, shY: number, k: number, len: number): void {
  g.strokeStyle = colour;
  g.lineWidth = fine(g, 0.6);
  g.beginPath();
  g.moveTo(-1.8 * k, shY + 0.2);
  g.quadraticCurveTo(0.2, shY + len * k * 1.1, 2 * k, shY + 0.2);
  g.stroke();
  g.beginPath();
  g.moveTo(0.2, shY + 1.4 * k);
  g.lineTo(0.2, shY + len * k);
  g.stroke();
  for (let i = 0; i < 3; i++) disc(g, 0.2, shY + (1.8 + i * 1.1) * k, 0.35 * k, colour);
}

/** Agbada and babban riga: a wide robe falling from the shoulders to the shins, with its own embroidery. */
function drapeRobe(g: G, look: FolkLook, R: Rig, cloth: { top: string; pat: string }, shY: number, hipY: number, p: Pose): void {
  const { k, sw } = R;
  const riga = look.dress === 'babbanRiga';
  const seated = p.legs !== 'stand';
  const hem = seated ? hipY + 2.4 * k : (riga ? -3.6 * k : -5.2 * k);
  const out = (riga ? 5.6 : 5.0) * k;
  const fall = seated ? hipY : shY + 9 * k;
  const path = (): void => {
    g.moveTo(-sw + 0.6, shY);
    g.lineTo(sw - 0.6, shY);
    g.quadraticCurveTo(sw + out * 0.8, shY + 1, sw + out, fall);
    g.quadraticCurveTo(sw + out * 0.9, (fall + hem) / 2, sw + out * 0.55 + (seated ? 4 * k : 0), hem);
    g.lineTo(-sw - out * 0.55, hem);
    g.quadraticCurveTo(-sw - out * 0.9, (fall + hem) / 2, -sw - out, fall);
    g.quadraticCurveTo(-sw - out * 0.8, shY + 1, -sw + 0.6, shY);
    g.closePath();
  };
  part(g, path, cloth.top, { sh: 2.2 });
  // The folds where the sleeves gather
  lines(g, deepOf(cloth.top), 0.7, [-sw - out * 0.55, fall + 1, -sw * 0.6, hem - 1, sw + out * 0.55, fall + 1, sw * 0.6, hem - 1]);
  if (p.back) return;
  // The inner top showing at the chest
  part(g, () => g.roundRect(-2.4 * k, shY, 5 * k, 7 * k, 1.2 * k), glowOf(cloth.top), { sh: 0.8, line: 0.7 });
  g.beginPath();
  g.ellipse(0.2, shY + 0.1, 1.4 * k, 1 * k, 0, 0, Math.PI);
  g.fillStyle = FOLK_SKINS[look.skin]?.base ?? '#a8693f';
  g.fill();
  if (riga) {
    // Our own big embroidered panel: a rounded square with a spiral and lines
    const y = shY + 4 * k;
    g.strokeStyle = cloth.pat;
    g.lineWidth = fine(g, 0.7);
    g.beginPath();
    g.roundRect(-4.2 * k, y, 6 * k, 6.4 * k, 1.4 * k);
    g.stroke();
    g.beginPath();
    for (let a = 0; a < 3.2 * Math.PI; a += 0.3) {
      const rr = 0.25 * k + a * 0.22 * k;
      const x = -1.2 * k + Math.cos(a) * rr;
      const yy = y + 3.2 * k + Math.sin(a) * rr;
      if (a === 0) g.moveTo(x, yy);
      else g.lineTo(x, yy);
    }
    g.stroke();
    lines(g, cloth.pat, 0.5, [2.6 * k, y + 1, 2.6 * k, y + 6 * k, -4.2 * k, y + 7.6 * k, 1.8 * k, y + 7.6 * k]);
  } else embroidery(g, cloth.pat, shY, k, 6);
}

/* ---------------- arms ---------------- */

function arm(g: G, look: FolkLook, R: Rig, skin: FolkSkin, spec: DressSpec, top: string, a: Arm, side: -1 | 1, shY: number, farBehind: boolean): void {
  const { k } = R;
  const sx = side * (R.sw - 0.6);
  const sy = shY + 1.2;
  const ex = sx + a.e[0] * k;
  const ey = sy + a.e[1] * k;
  const hx = sx + a.h[0] * k;
  const hy = sy + a.h[1] * k;
  const dark = (c: string): string => (side < 0 && farBehind ? mix(c, '#000000', 0.15) : c);
  const pts = [sx, sy, ex, ey, hx, hy];
  const w = R.armW;
  if (spec.top === 'drape' && a.h[1] > 5 && a.e[1] > 3) {
    disc(g, side * (R.sw + 3.6 * k) + a.h[0] * k * 0.3, sy + 9.6 * k, w * 0.58, dark(skin.base), 0.9);
    return;
  }
  const sleeveCol = spec.top === 'drape' || spec.top === 'gown' || spec.top === 'kaftan' ? clothOf(look).top : top;
  if (spec.sleeve === 'long' || spec.sleeve === 'wide') {
    const wide = spec.sleeve === 'wide' ? (spec.top === 'drape' ? 2.3 : 1.6) : 1.12;
    // Skin hand end first, then the sleeve to the wrist
    limb(g, [ex * 0.15 + hx * 0.85, ey * 0.15 + hy * 0.85, hx, hy], w * 0.9, dark(skin.base), skin.deep);
    limb(g, [sx, sy, ex, ey, ex * 0.2 + hx * 0.8, ey * 0.2 + hy * 0.8], w * wide, dark(sleeveCol), deepOf(sleeveCol));
  } else {
    limb(g, pts, w, dark(skin.base), skin.deep);
    if (spec.sleeve === 'short') limb(g, [sx, sy, sx * 0.4 + ex * 0.6, sy * 0.4 + ey * 0.6], w * 1.3, dark(top), deepOf(top));
  }
  disc(g, hx, hy, w * 0.58, dark(skin.base), 0.9);
}

/* ---------------- head ---------------- */

const HAIR_COL = '#1b1410';
const HAIR_ACC = '#4a382c';
/** The hairline highlight on the darkest skins (style 1.8 part 3.6). */
const HAIR_ACC_LIGHT = '#7a6656';
/** The three darkest skins (style 1.8 part 7): hero-ink head outline, catch-lights, cheek glow. */
const DARK_SKINS: readonly string[] = ['#3a2012', '#4b2c1a', '#7a4a2a'];
/** Cheek blush on every skin (style 1.8 part 4). */
const BLUSH = 'rgba(230,110,90,0.28)';
const GREY = '#d3cec6';

function head(g: G, look: FolkLook, R: Rig, skin: FolkSkin, cy: number, back: boolean): void {
  drawHeadAt(g, look, 0.4, cy, R.r, skin, back, R.k);
}

/**
 * A head with hair, headwear and face, centred (cx, cy), radius r. Also used for heads in bus
 * windows, the footbridge crowd and the shop windows.
 */
function drawHeadAt(g: G, look: FolkLook, cx: number, cy: number, r: number, skin: FolkSkin, back: boolean, k: number): void {
  const hw = look.head ?? 'none';
  const hairCol = look.hair === 'grey' ? GREY : HAIR_COL;
  const hcol = look.h ?? look.a;
  // Behind the head
  if (hw === 'hijab') {
    part(
      g,
      () => {
        g.arc(cx, cy - 0.1 * r, r * 1.3, Math.PI * 0.9, Math.PI * 2.1);
        g.lineTo(cx + r * 1.6, cy + r * 1.9);
        g.quadraticCurveTo(cx, cy + r * 2.5, cx - r * 1.7, cy + r * 1.9);
        g.closePath();
      },
      hcol,
      { sh: 1.4 },
    );
  } else if (hw === 'none' || hw === 'headscarf' || hw === 'gele') {
    if (look.hair === 'afro' && hw === 'none') part(g, () => g.arc(cx - 0.15 * r, cy - 0.3 * r, r * 1.42, 0, TAU), hairCol, { sh: 1.6, rim: HAIR_ACC });
    if (look.hair === 'braids' && hw === 'none') {
      part(
        g,
        () => {
          g.moveTo(cx - r * 1.05, cy - 0.2 * r);
          g.lineTo(cx - r * 1.35, cy + r * 1.9);
          g.lineTo(cx + r * 0.4, cy + r * 1.9);
          g.lineTo(cx + r * 0.9, cy);
          g.closePath();
        },
        hairCol,
        { rim: HAIR_ACC, sh: 1 },
      );
      lines(g, HAIR_ACC, 0.5, [cx - r * 0.9, cy + r * 0.4, cx - r * 1.05, cy + r * 1.8, cx - r * 0.4, cy + r * 0.6, cx - r * 0.5, cy + r * 1.8]);
      for (const x of [-1.15, -0.55, 0.1]) disc(g, cx + r * x, cy + r * 1.95, 0.45 * k, look.b);
    }
    if (look.hair === 'puffs' && hw === 'none') for (const x of [-0.95, 0.85]) part(g, () => g.arc(cx + r * x, cy - r * 0.85, r * 0.55, 0, TAU), hairCol, { rim: HAIR_ACC, sh: 0.8 });
    if (look.hair === 'bun' && hw === 'none') part(g, () => g.arc(cx - r * 0.35, cy - r * 1.1, r * 0.5, 0, TAU), hairCol, { rim: HAIR_ACC, sh: 0.8 });
  }
  // The head
  // Style 1.8 part 7: on the three darkest skins the head outline is hero ink, so the edge shows
  part(g, () => g.ellipse(cx, cy, r * 0.95, r, 0, 0, TAU), skin.base, { shade: skin.deep, sh: r * 0.32, ink: DARK_SKINS.includes(skin.base) ? HERO_INK : INK });
  // Ear (far side shows in three-quarter; both from behind)
  for (const ex of back ? [-1, 1] : [-1]) disc(g, cx + ex * r * 0.92, cy + 0.15 * r, r * 0.22, skin.base, 0.7);

  if (back) {
    // The back of the head: hair over almost all of it
    if (hw === 'none' || hw === 'gele' || hw === 'headscarf') {
      g.save();
      g.beginPath();
      g.ellipse(cx, cy, r * 0.95 + 0.3, r + 0.3, 0, 0, TAU);
      g.clip();
      g.fillStyle = hairCol;
      g.fillRect(cx - r * 2, cy - r * 2, r * 4, r * (look.hair === 'afro' ? 2.9 : 2.55));
      if (look.hair === 'cornrows') lines(g, HAIR_ACC, 0.45, [cx - r * 0.5, cy - r, cx - r * 0.4, cy + r * 0.5, cx, cy - r, cx, cy + r * 0.55, cx + r * 0.5, cy - r, cx + r * 0.4, cy + r * 0.5]);
      g.restore();
      g.beginPath();
      g.ellipse(cx, cy, r * 0.95, r, 0, 0, TAU);
      g.strokeStyle = DARK_SKINS.includes(skin.base) ? HERO_INK : INK;
      g.lineWidth = after(g);
      g.stroke();
    }
  } else {
    face(g, look, cx, cy, r, skin, k);
    if (hw === 'none' || hw === 'gele' || hw === 'headscarf' || hw === 'helmet') hairCap(g, look, cx, cy, r, hairCol, hw !== 'none', skin.base);
  }
  headwear(g, look, cx, cy, r, hcol, back, k);
  if (!back && look.glasses) {
    g.strokeStyle = INK;
    g.lineWidth = fine(g, 0.55);
    for (const ex of [-0.2, 0.5]) {
      g.beginPath();
      g.arc(cx + ex * r, cy + 0.02 * r, r * 0.27, 0, TAU);
      g.stroke();
    }
    lines(g, INK, 0.5, [cx + 0.07 * r, cy, cx + 0.23 * r, cy, cx - 0.47 * r, cy, cx - 0.9 * r, cy - 0.12 * r]);
  }
}

function face(g: G, look: FolkLook, cx: number, cy: number, r: number, skin: FolkSkin, k: number): void {
  // Style 1.8 part 4: two solid eye ovals 22 % of the head tall with a white catch-light, one
  // smile line, a cheek blush. Brows and elder lines only on big heads (20 px or more).
  const big = look.age === 'child' ? 1.12 : 1;
  const dpu = dpuOf(g);
  const faceDetail = devPerUnit(g) === null || 2 * r * screenPerUnit(dpu) >= 20;
  const line = Math.max(0.6, inkRatio() / dpu);
  if (DARK_SKINS.includes(skin.base)) oval(g, cx + 0.5 * r, cy + 0.36 * r, Math.max(0.24 * r, (1.1 * inkRatio()) / dpu), 0.15 * r, skin.rim);
  oval(g, cx + 0.42 * r, cy + 0.4 * r, 0.2 * r, 0.12 * r, BLUSH);
  const ry = 0.22 * r * big;
  const cl = Math.max(0.055 * r, 0.5 / dpu, (0.3 * inkRatio()) / dpu);
  for (const ex of [-0.18, 0.46]) {
    oval(g, cx + ex * r, cy + 0.02 * r, ry * 0.7, ry, EYE_INK);
    disc(g, cx + ex * r + ry * 0.25, cy + 0.02 * r - ry * 0.4, cl, '#ffffff');
  }
  if (faceDetail) {
    if (look.skin === 3 || look.skin === 4 || look.skin === 6) lines(g, skin.rim, 0.4, [cx - 0.36 * r, cy - 0.4 * r, cx - 0.06 * r, cy - 0.44 * r, cx + 0.36 * r, cy - 0.44 * r, cx + 0.66 * r, cy - 0.4 * r]);
    lines(g, look.age === 'elder' ? '#9a948b' : INK, 0.55, [cx - 0.34 * r, cy - 0.32 * r, cx - 0.08 * r, cy - 0.36 * r, cx + 0.36 * r, cy - 0.36 * r, cx + 0.64 * r, cy - 0.32 * r]);
  }
  if (look.beard) {
    g.beginPath();
    g.arc(cx + 0.1 * r, cy + 0.1 * r, r * 0.86, 0.12 * Math.PI, 0.88 * Math.PI);
    g.strokeStyle = GREY;
    g.lineWidth = r * 0.3;
    g.stroke();
  }
  // A warm smile, about 30 % of the head wide
  g.beginPath();
  g.arc(cx + 0.16 * r, cy + 0.32 * r, r * 0.3, 0.18 * Math.PI, 0.82 * Math.PI);
  g.strokeStyle = skin.mouth;
  g.lineWidth = line;
  g.stroke();
  if (look.age === 'elder' && faceDetail) lines(g, skin.deep, 0.4, [cx + 0.78 * r, cy + 0.2 * r, cx + 0.7 * r, cy + 0.42 * r]);
  void k;
}

/** Short hair on top of the head, front view: low cut, grey, cornrows, the front of an afro, braids or puffs. */
function hairCap(g: G, look: FolkLook, cx: number, cy: number, r: number, col: string, under: boolean, skinBase: string): void {
  if (under) {
    // Under a gele, scarf or helmet only a little shows at the temple
    if (look.hair === 'grey') disc(g, cx - 0.78 * r, cy - 0.05 * r, 0.25 * r, GREY);
    return;
  }
  g.save();
  g.beginPath();
  g.ellipse(cx, cy, r * 0.95 + 0.4, r + 0.4, 0, 0, TAU);
  g.clip();
  g.beginPath();
  const thick = look.hair === 'afro' ? 0.35 : 0;
  g.moveTo(cx - r * 1.3, cy + 0.3 * r);
  g.lineTo(cx - 0.62 * r, cy + 0.05 * r);
  g.quadraticCurveTo(cx - 0.4 * r, cy - (0.62 - thick) * r, cx + 0.25 * r, cy - (0.68 - thick) * r);
  g.quadraticCurveTo(cx + 0.8 * r, cy - (0.66 - thick) * r, cx + r * 1.3, cy - 0.2 * r);
  g.lineTo(cx + r * 1.3, cy - r * 1.4);
  g.lineTo(cx - r * 1.3, cy - r * 1.4);
  g.closePath();
  g.fillStyle = col;
  g.fill();
  if (look.hair === 'cornrows') lines(g, HAIR_ACC, 0.5, [cx - 0.6 * r, cy - 0.3 * r, cx - 0.2 * r, cy - r, cx - 0.05 * r, cy - 0.5 * r, cx + 0.25 * r, cy - r, cx + 0.5 * r, cy - 0.55 * r, cx + 0.7 * r, cy - 0.9 * r]);
  else if (look.hair === 'grey' || look.hair === 'lowcut') lines(g, look.hair === 'grey' ? '#ece8e1' : HAIR_ACC, 0.4, [cx - 0.2 * r, cy - 0.85 * r, cx + 0.3 * r, cy - 0.9 * r]);
  g.restore();
  g.beginPath();
  g.ellipse(cx, cy, r * 0.95 + 0.2, r + 0.2, 0, Math.PI * 1.02, Math.PI * 1.98);
  g.strokeStyle = INK;
  g.lineWidth = after(g);
  g.stroke();
  // Style 1.8 part 3.6: dark hair on a dark skin gets a 1 px highlight along its top
  if (col === HAIR_COL && DARK_SKINS.includes(skinBase)) {
    g.beginPath();
    g.ellipse(cx, cy, r * 0.95 - 0.5, r - 0.5, 0, Math.PI * 1.15, Math.PI * 1.75);
    g.strokeStyle = HAIR_ACC_LIGHT;
    g.lineWidth = fine(g, 0.5);
    g.stroke();
  }
}

function headwear(g: G, look: FolkLook, cx: number, cy: number, r: number, col: string, back: boolean, k: number): void {
  const hw = look.head ?? 'none';
  if (hw === 'none') return;
  if (hw === 'gele') {
    // Style 1.8: the head grew, so the gele is a little smaller on it (about its brow band) and
    // stays tied cloth, grand but inside the sprite box.
    g.save();
    g.translate(cx, cy - 0.3 * r);
    g.scale(0.8, 0.8);
    g.translate(-cx, -(cy - 0.3 * r));
    headwearShape(g, look, cx, cy, r, col, back, k, hw);
    g.restore();
    return;
  }
  headwearShape(g, look, cx, cy, r, col, back, k, hw);
}

function headwearShape(g: G, look: FolkLook, cx: number, cy: number, r: number, col: string, back: boolean, k: number, hw: FolkHeadwear): void {
  const sheen = glowOf(col);
  switch (hw) {
    case 'gele': {
      // A tall, proud head tie: a band low on the brow that rises into soft pleats climbing to
      // one side (the fan opens up and over), so even when small it reads as tied cloth, never
      // a round hat with a brim.
      part(
        g,
        () => {
          g.moveTo(cx - r * 1.05, cy - 0.05 * r);
          g.quadraticCurveTo(cx - r * 1.55, cy - r * 0.8, cx - r * 1.25, cy - r * 1.45);
          g.quadraticCurveTo(cx - r * 1.0, cy - r * 2.0, cx - r * 0.4, cy - r * 1.8);
          g.quadraticCurveTo(cx, cy - r * 2.5, cx + r * 0.6, cy - r * 2.25);
          g.quadraticCurveTo(cx + r * 1.3, cy - r * 2.75, cx + r * 1.8, cy - r * 2.3);
          g.quadraticCurveTo(cx + r * 1.75, cy - r * 1.1, cx + r * 1.0, cy - 0.3 * r);
          g.quadraticCurveTo(cx, cy - 0.75 * r, cx - r * 1.05, cy - 0.05 * r);
          g.closePath();
        },
        col,
        { sh: 1.6 },
      );
      lines(g, sheen, 0.6, [cx - r * 0.95, cy - r * 0.5, cx - r * 1.0, cy - r * 1.4, cx - r * 0.1, cy - r * 0.85, cx + r * 0.1, cy - r * 2.0, cx + r * 0.8, cy - r * 0.65, cx + r * 1.35, cy - r * 2.3]);
      lines(g, deepOf(col), 0.6, [cx - r * 0.6, cy - r * 0.7, cx - r * 0.4, cy - r * 1.75, cx + r * 0.35, cy - r * 0.75, cx + r * 0.6, cy - r * 2.15]);
      // A woven stripe across the band, in the outfit's second colour
      g.beginPath();
      g.moveTo(cx - r * 1.1, cy - r * 0.4);
      g.quadraticCurveTo(cx, cy - r * 1.0, cx + r * 1.15, cy - r * 0.6);
      g.strokeStyle = look.b === col ? sheen : look.b;
      g.lineWidth = fine(g, 0.8);
      g.stroke();
      break;
    }
    case 'headscarf': {
      part(
        g,
        () => {
          g.moveTo(cx - r * 1.02, cy + 0.1 * r);
          g.quadraticCurveTo(cx - r * 1.1, cy - r * 1.25, cx + r * 0.1, cy - r * 1.18);
          g.quadraticCurveTo(cx + r * 1.15, cy - r * 1.1, cx + r * 1.0, cy - 0.2 * r);
          g.quadraticCurveTo(cx + r * 0.3, cy - 0.62 * r, cx - r * 0.55, cy - 0.35 * r);
          g.closePath();
        },
        col,
        { sh: 1.2 },
      );
      // The knot and its ends at the back
      const kx = back ? cx : cx - r * 1.0;
      part(g, () => g.ellipse(kx, cy - 0.45 * r, r * 0.32, r * 0.28, 0, 0, TAU), col, { sh: 0.6, line: 1 });
      part(
        g,
        () => {
          g.moveTo(kx, cy - 0.3 * r);
          g.lineTo(kx - r * 0.55, cy + 0.6 * r);
          g.lineTo(kx - r * 0.1, cy + 0.45 * r);
          g.lineTo(kx + r * 0.1, cy + 0.75 * r);
          g.lineTo(kx + r * 0.3, cy - 0.3 * r);
          g.closePath();
        },
        col,
        { sh: 0.6, line: 1 },
      );
      lines(g, look.b, 0.5, [cx - r * 0.8, cy - r * 0.55, cx + r * 0.8, cy - r * 0.62]);
      break;
    }
    case 'hijab': {
      // The front: the cloth framing the face
      part(
        g,
        () => {
          g.ellipse(cx, cy - 0.1 * r, r * 1.3, r * 1.3, 0, 0, TAU);
          if (!back) {
            g.moveTo(cx + 0.1 * r + r * 0.78, cy + 0.15 * r);
            g.ellipse(cx + 0.1 * r, cy + 0.15 * r, r * 0.78, r * 0.86, 0, 0, TAU, true);
          }
        },
        col,
        { sh: 1.4 },
      );
      if (!back) {
        lines(g, sheen, 0.6, [cx - r * 0.5, cy - r * 1.1, cx + r * 0.6, cy - r * 1.12]);
      }
      break;
    }
    case 'fila': {
      // A soft cap folded over to the side, with fine woven stripes (aso-oke style, our own)
      part(
        g,
        () => {
          g.moveTo(cx - r * 0.98, cy - 0.3 * r);
          g.lineTo(cx - r * 0.92, cy - r * 1.05);
          g.quadraticCurveTo(cx - r * 0.2, cy - r * 1.6, cx + r * 0.7, cy - r * 1.45);
          g.quadraticCurveTo(cx + r * 1.4, cy - r * 1.3, cx + r * 1.55, cy - r * 0.75);
          g.quadraticCurveTo(cx + r * 1.2, cy - r * 0.62, cx + r * 0.98, cy - 0.38 * r);
          g.quadraticCurveTo(cx, cy - 0.55 * r, cx - r * 0.98, cy - 0.3 * r);
          g.closePath();
        },
        col,
        { sh: 1.2, deco: () => pattern(g, 'weave', deepOf(col), cx - r * 1.2, cy - r * 1.7, cx + r * 1.7, cy - r * 0.3, k) },
      );
      lines(g, deepOf(col), 0.6, [cx - r * 0.95, cy - r * 0.52, cx + r * 0.95, cy - r * 0.58]);
      break;
    }
    case 'kaftanCap': {
      // A low round cap with small stitched dots
      part(
        g,
        () => {
          g.moveTo(cx - r * 0.98, cy - 0.35 * r);
          g.bezierCurveTo(cx - r * 1.0, cy - r * 1.55, cx + r * 1.0, cy - r * 1.55, cx + r * 0.98, cy - 0.35 * r);
          g.quadraticCurveTo(cx, cy - 0.55 * r, cx - r * 0.98, cy - 0.35 * r);
          g.closePath();
        },
        col,
        {
          sh: 1.1,
          deco: () => {
            g.fillStyle = look.b;
            for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) disc(g, cx - r * 0.7 + i * r * 0.28, cy - r * (0.65 + j * 0.3), 0.28 * k, look.b);
          },
        },
      );
      break;
    }
    case 'rigaCap': {
      // A taller cap with bands of our own stitched zigzags
      part(
        g,
        () => {
          g.moveTo(cx - r * 0.98, cy - 0.3 * r);
          g.lineTo(cx - r * 0.9, cy - r * 1.55);
          g.quadraticCurveTo(cx, cy - r * 1.8, cx + r * 0.9, cy - r * 1.55);
          g.lineTo(cx + r * 0.98, cy - 0.3 * r);
          g.quadraticCurveTo(cx, cy - 0.55 * r, cx - r * 0.98, cy - 0.3 * r);
          g.closePath();
        },
        col,
        {
          sh: 1.1,
          deco: () => {
            g.strokeStyle = look.b;
            g.lineWidth = fine(g, 0.5);
            for (const y of [0.75, 1.15]) {
              g.beginPath();
              for (let i = 0; i <= 8; i++) {
                const x = cx - r + (i * r) / 4;
                const yy = cy - r * y - (i % 2 ? 0.25 * r : 0);
                if (i === 0) g.moveTo(x, yy);
                else g.lineTo(x, yy);
              }
              g.stroke();
            }
          },
        },
      );
      break;
    }
    case 'helmet': {
      // A plain one-colour helmet: no writing, no badge
      part(
        g,
        () => {
          g.moveTo(cx - r * 1.12, cy + 0.25 * r);
          g.bezierCurveTo(cx - r * 1.2, cy - r * 1.55, cx + r * 1.25, cy - r * 1.55, cx + r * 1.15, cy - 0.05 * r);
          g.lineTo(cx + r * 0.2, cy - 0.15 * r);
          g.lineTo(cx - r * 0.3, cy + 0.25 * r);
          g.closePath();
        },
        col,
        { sh: 1.2 },
      );
      if (!back) lines(g, 'rgba(255,255,255,0.7)', 0.7, [cx - r * 0.6, cy - r * 0.95, cx + r * 0.1, cy - r * 1.15]);
      break;
    }
  }
}

/* ---------------- held things and extras ---------------- */

function behind(g: G, look: FolkLook, R: Rig, shY: number, hipY: number, backView = false): void {
  const { k, sw } = R;
  const hold = look.hold ?? 'none';
  if (hold === 'schoolBag' || hold === 'backpack') {
    const big = hold === 'backpack' ? 1.2 : 1;
    const col = look.dress === 'school' ? '#2b59c3' : look.b;
    const w = 2 * sw * 0.9 * big;
    const h = (hipY - shY) * 0.85 * big;
    if (backView) {
      box(g, -w / 2, shY + 1, w, h, col, 1.5 * k);
      box(g, -w / 2 + 1.2 * k, shY + h * 0.5, w - 2.4 * k, h * 0.4, deepOf(col), 1 * k);
    } else {
      // From the front: the bag's sides peek out, the straps go over the shoulders
      box(g, -sw - 1.6 * k * big, shY + 1, sw * 2 + 3.2 * k * big, h, col, 1.5 * k);
    }
  }
  if (look.baby) {
    // The wrapper bundle on the back, poking out at the side, and the baby's head over the shoulder
    const bx = backView ? 0 : -sw - 0.4 * k;
    part(g, () => g.ellipse(bx, shY + 6 * k, backView ? sw * 0.95 : 2.8 * k, 5 * k, 0, 0, TAU), look.b, { deco: () => pattern(g, 'rings', look.a, bx - 6, shY, bx + 6, shY + 12 * k, k) });
    const babySkin = FOLK_SKINS[((look.skin % 7) + 7) % 7]!;
    const hx = backView ? 0 : bx + 0.6 * k;
    const hy = shY - (backView ? 0.4 : 1.4) * k;
    const hr = 2.5 * k;
    part(g, () => g.arc(hx, hy, hr, 0, TAU), babySkin.base, { shade: babySkin.deep, rim: babySkin.rim, sh: 0.9, line: 1.1 });
    g.save();
    g.beginPath();
    g.arc(hx, hy, hr, 0, TAU);
    g.clip();
    g.fillStyle = HAIR_COL;
    g.fillRect(hx - hr, hy - hr, hr * 2, backView ? hr * 1.6 : hr * 0.75);
    g.restore();
    if (!backView) {
      // Asleep and content: closed eyes, a small smile
      g.strokeStyle = INK;
      g.lineWidth = fine(g, 0.45);
      for (const ex of [-0.45, 0.4]) {
        g.beginPath();
        g.arc(hx + ex * hr, hy + 0.05 * hr, hr * 0.2, 0.1 * Math.PI, 0.9 * Math.PI);
        g.stroke();
      }
      g.beginPath();
      g.arc(hx, hy + 0.42 * hr, hr * 0.18, 0.2 * Math.PI, 0.8 * Math.PI);
      g.strokeStyle = babySkin.mouth;
      g.stroke();
    }
  }
}

function heldBelow(g: G, look: FolkLook, R: Rig, p: Pose, shY: number): void {
  const { k, sw } = R;
  const hold = look.hold ?? 'none';
  // Straps over the shoulders (front view)
  if ((hold === 'schoolBag' || hold === 'backpack') && !p.back) {
    const col = look.dress === 'school' ? '#2b59c3' : look.b;
    lines(g, INK, 2, [-sw + 1.2, shY + 0.3, -sw + 1.6, shY + 7 * k, sw - 1.2, shY + 0.3, sw - 1.6, shY + 7 * k]);
    lines(g, col, 1, [-sw + 1.2, shY + 0.3, -sw + 1.6, shY + 7 * k, sw - 1.2, shY + 0.3, sw - 1.6, shY + 7 * k]);
  }
  if (look.baby && !p.back) {
    // The wrapper tie across the chest
    part(g, () => g.roundRect(-sw - 0.3, shY + 5.4 * k, sw * 2 + 0.6, 2.4 * k, 1), look.b, { sh: 0.6, line: 1 });
  }
  if (hold === 'handbag') {
    // On the far shoulder, resting at the hip
    const x = -sw - 1.4 * k;
    const y = shY + 9.5 * k;
    lines(g, INK, 0.9, [-sw + 1.5, shY + 0.4, x + 1.6 * k, y]);
    part(g, () => g.roundRect(x - 1.8 * k, y, 4.6 * k, 3.6 * k, 1.1 * k), look.b === look.a ? '#8e2a3a' : look.b, { sh: 0.9, line: 1 });
    disc(g, x + 0.5 * k, y + 1.1 * k, 0.35 * k, '#e9d48a');
  }
}

function heldFront(g: G, look: FolkLook, R: Rig, p: Pose, shY: number, headY: number, hold: FolkHold): void {
  const { k, r } = R;
  const hand = (a: Arm, side: -1 | 1): P2 => [side * (R.sw - 0.6) + a.h[0] * k, shY + 1.2 + a.h[1] * k];
  const [nx, ny] = hand(p.na, 1);
  const [fx, fy] = hand(p.fa, -1);
  const skin = FOLK_SKINS[look.skin]?.base ?? '#a8693f';
  // Each thing is drawn in adult units round its anchor (a hand, or the top of the head)
  const at = (x: number, y: number, draw: () => void): void => {
    g.save();
    g.translate(x, y);
    g.scale(k, k);
    draw();
    g.restore();
  };
  const poly = (pts: readonly number[]) => (): void => {
    g.moveTo(pts[0]!, pts[1]!);
    for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i]!, pts[i + 1]!);
    g.closePath();
  };
  const handOver = (x: number, y: number): void => disc(g, x, y, R.armW * 0.58, skin, 0.9);
  const bothX = (nx + fx) / 2;
  const bothY = (ny + fy) / 2;
  const goods = (y: number, list: readonly (readonly [number, string])[]): void => {
    for (const [x, c] of list) disc(g, x, y, 1.6, c, 0.8);
  };
  switch (hold) {
    case 'breadTray':
      // A flat tray of fresh bread loaves on the head
      at(0.4, headY - r - 0.4, () => {
        part(g, () => g.ellipse(0, -0.8, 7.2, 1.5, 0, 0, TAU), '#c9a26b', { sh: 0.7, line: 1 });
        for (const x of [-4.2, -1.2, 1.8, 4.6]) part(g, () => g.ellipse(x, -2.4, 1.7, 1.4, 0, 0, TAU), '#d99a4e', { sh: 0.6, line: 0.9 });
      });
      break;
    case 'basin':
      // An enamel basin of goods on the head
      at(0.4, headY - r - 0.4, () => {
        goods(-4.4, [[-2.4, '#e74c3c'], [0.4, '#3f8f4a'], [3, '#f08a24'], [-0.8, '#f2b300']]);
        part(g, poly([-6, -4, 6.8, -4, 4.4, 0, -3.6, 0]), '#f4f1e6', { sh: 0.9 });
        lines(g, '#2b59c3', 0.9, [-5.8, -3.6, 6.6, -3.6]);
      });
      break;
    case 'box':
      at(0.4, headY - r - 0.4, () => {
        part(g, () => g.rect(-4.6, -5.6, 9.4, 5.6), '#c99b62', { sh: 1, line: 1.1 });
        lines(g, '#e9d9b8', 1, [-4.6, -3, 4.8, -3]);
      });
      break;
    case 'headBasket':
      at(0.4, headY - r - 0.4, () => {
        goods(-4.2, [[-2.2, '#f39c12'], [0.6, '#3f8f4a'], [2.8, '#e74c3c']]);
        part(g, () => g.ellipse(0, -2.2, 5.4, 2.4, 0, 0, Math.PI), '#c99b55', { sh: 0.8, deco: () => pattern(g, 'weave', '#8a6634', -6, -3, 6, 2, 1) });
        lines(g, INK, 1, [-5.4, -2.2, 5.4, -2.2]);
      });
      break;
    case 'basket':
      at(fx, fy, () => {
        part(g, () => g.ellipse(0, 3, 3.4, 2.6, 0, 0, Math.PI), '#c99b55', { sh: 0.6, line: 1, deco: () => pattern(g, 'weave', '#8a6634', -4, 0, 4, 6, 1) });
        g.beginPath();
        g.arc(0, 3, 3, Math.PI, TAU);
        g.strokeStyle = '#8a6634';
        g.lineWidth = fine(g, 0.8);
        g.stroke();
        goods(2.6, [[-1.2, '#e74c3c'], [1.2, '#3f8f4a']]);
        lines(g, INK, 0.8, [-3.4, 3, 3.4, 3]);
      });
      break;
    case 'marketBag':
      at(fx, fy, () => {
        part(g, () => g.rect(-3, 1.4, 6, 5.4), '#e9e1cf', { sh: 0.8, line: 1, deco: () => lines(g, look.b, 0.8, [-3, 3, 3, 3, -3, 5, 3, 5]) });
        lines(g, INK, 0.7, [-1.6, 1.4, 0, 0, 0, 0, 1.6, 1.4]);
      });
      break;
    case 'phone':
    case 'phoneCase':
      at(nx, ny, () => {
        part(g, () => g.rect(-1.1, -3.2, 2.4, 4), hold === 'phone' ? '#2a2a33' : look.b, { sh: 0.4, line: 0.9 });
        if (hold === 'phone') oval(g, 0.1, -1.6, 0.7, 1.2, '#7fd0f5');
      });
      handOver(nx, ny);
      break;
    case 'paper':
      // A paper held open: grey lines, no words
      at(bothX, bothY, () => {
        part(g, () => g.rect(-4.6, -4.4, 9.2, 6.2), '#f4f1e6', { sh: 0.5, line: 0.9 });
        lines(g, '#9a9a9a', 0.45, [-3.6, -3, 3.6, -3, -3.6, -1.6, 1, -1.6, -3.6, -0.2, 3.6, -0.2]);
      });
      handOver(nx, ny);
      handOver(fx, fy);
      break;
    case 'plate':
      // A plate covered against the dust, in both hands (or one, held up)
      at(p.na.h[1] > 0 ? bothX : nx, p.na.h[1] > 0 ? bothY : ny, () => {
        oval(g, 0, -0.6, 4, 1.5, '#ffffff', 0.9);
        part(g, () => g.ellipse(0, -1.4, 3.2, 1.6, 0, Math.PI, TAU), '#c9cfd6', { sh: 0.4, line: 0.8 });
      });
      break;
    case 'pack':
      // A takeaway pack in a small bag
      at(nx, ny, () => {
        part(g, () => g.rect(-2.6, -0.6, 5.2, 3.4), '#f4f1e6', { sh: 0.5, line: 0.9 });
        lines(g, '#3f8f4a', 0.7, [-2.6, 0.6, 2.6, 0.6]);
      });
      break;
    case 'ball':
      drawFolkBall(g, bothX, bothY - 1.6 * k, 2.4 * k);
      break;
    case 'ankaraRoll': {
      // A length of printed cloth folded over the forearm; calling, a second piece held up to show
      const cloth = (pts: readonly number[]): void => part(g, poly(pts), look.b, { deco: () => pattern(g, 'rings', look.a, -6, -7, 3, 7, 1) });
      at(fx + 0.2, fy, () => cloth([-4.2, -1.4, 1.2, -1.6, 1.6, 6.6, -0.4, 6.8, -1.4, 1, -3.6, 5.4, -5, 5]));
      if (p.na.h[1] < 0) {
        at(nx, ny, () => cloth([-2.2, -6, 2.4, -6, 2.4, 0, -2.2, 0]));
        handOver(nx, ny);
      }
      break;
    }
    default:
      break;
  }
}

/**
 * The children's small ball: blue and white panels, never gold or yellow (it must never look
 * like a kobo coin).
 */
export const FOLK_BALL_COLOURS = ['#ffffff', '#2b59c3'] as const;
export function drawFolkBall(g: G, x: number, y: number, r = 2.4): void {
  disc(g, x, y, r, FOLK_BALL_COLOURS[0], 0.9);
  g.save();
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.clip();
  disc(g, x - r * 0.3, y - r * 0.2, r * 0.45, FOLK_BALL_COLOURS[1]);
  disc(g, x + r * 0.75, y + r * 0.5, r * 0.4, FOLK_BALL_COLOURS[1]);
  disc(g, x - r * 0.6, y + r * 0.9, r * 0.35, FOLK_BALL_COLOURS[1]);
  g.restore();
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.strokeStyle = INK;
  g.lineWidth = fine(g, 0.9);
  g.stroke();
}

/** Where the ball is between two children (dx apart) at `time`: it bounces between them in place, never toward the road. */
export function folkBallAt(time: number, dx: number, still = false): { x: number; y: number } {
  if (still) return { x: dx / 2, y: -12 };
  const u = (((Number.isFinite(time) ? time : 0) / 1.2) % 2 + 2) % 2;
  const k = u < 1 ? u : 2 - u;
  return { x: 4 + (dx - 8) * k, y: -10 - Math.sin(k * Math.PI) * 8 };
}

/* ================================================================ busts (windows, bridge) */

/**
 * Head and shoulders only, for bus windows, keke seats, the footbridge and shop windows.
 * (x, y) is the middle of the shoulders' base; `size` scales a 37 u adult. wave: 0 still,
 * 1 and 2 the two waving frames (one arm up beside the head).
 */
export function drawFolkBust(g: G, look: FolkLook, x: number, y: number, size = 1, wave: 0 | 1 | 2 = 0, back = false): void {
  const skin = FOLK_SKINS[((look.skin % 7) + 7) % 7]!;
  const R = rig({ ...look, age: look.age === 'child' ? 'teen' : look.age });
  g.save();
  g.translate(x, y);
  g.scale(size, size);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const sw = R.sw + 0.6;
  const top = clothOf(look).top;
  if (wave > 0 && !back) {
    const hx = sw + (wave === 1 ? 0.4 : 2.8);
    const hy = -9.5 - R.r * 2 + (wave === 1 ? -1 : 0.4);
    limb(g, [sw - 1, -5, sw + 1.8, -9, hx, hy], R.armW, skin.base, skin.deep);
    disc(g, hx, hy, R.armW * 0.58, skin.base, 0.9);
  }
  part(
    g,
    () => {
      g.moveTo(-sw, 0);
      g.lineTo(-sw, -4);
      g.quadraticCurveTo(-sw, -6.8, -sw + 3, -6.8);
      g.lineTo(sw - 3, -6.8);
      g.quadraticCurveTo(sw, -6.8, sw, -4);
      g.lineTo(sw, 0);
      g.closePath();
    },
    top,
    { deco: () => pattern(g, dressSpec(look).topPat, clothOf(look).pat, -sw, -8, sw, 0, 1) },
  );
  if (!back && look.head !== 'hijab') {
    g.beginPath();
    g.ellipse(0.2, -6.7, 1.5, 1.1, 0, 0, Math.PI);
    g.fillStyle = skin.base;
    g.fill();
  }
  drawHeadAt(g, look, 0.4, -7 - R.r - 0.8, R.r, skin, back, 1);
  g.restore();
}

/**
 * Passengers in a bus's windows (part 4: 3 to 5 heads, every skin tone, one arm waving near
 * the hero). Draw it just after the bus, in the same transform. Each head is clipped to its
 * window and sits a little low so the glass shows above. `looks` (one per window, undefined =
 * empty); wave 0 still, 1 or 2 the two waving frames (the waver is the first filled window).
 * `bob` is the bus's own bounce, if it has one (drawBusShape: Math.sin(time * 14) * 0.6).
 */
export function drawWindowHeads(g: G, windows: readonly { x: number; y: number; w: number; h: number }[], looks: readonly (FolkLook | undefined)[], wave: 0 | 1 | 2 = 0, bob = 0): void {
  const waver = looks.findIndex((l) => l);
  windows.forEach((w, i) => {
    const look = looks[i];
    if (!look) return;
    g.save();
    g.beginPath();
    g.rect(w.x, w.y + bob, w.w, w.h);
    g.clip();
    const size = (w.h * 1.15) / 20;
    drawFolkBust(g, look, w.x + w.w * 0.5, w.y + bob + w.h + 0.5, size, i === waver ? wave : 0);
    // The glass over them, faintly
    g.fillStyle = 'rgba(191,227,245,0.18)';
    g.fillRect(w.x, w.y + bob, w.w, w.h);
    g.restore();
  });
}

/* ================================================================ okada and keke */


/**
 * An okada passing on the far road (part 4): a plain motorcycle with no writing, a rider in a
 * plain one-colour helmet, a passenger holding a market bag. frame 0 or 1 turns the wheels.
 * Facing right; flip for right to left. Bake both frames once.
 */
export function drawOkada(g: G, rider: FolkLook, passenger: FolkLook, frame: 0 | 1): void {
  g.save();
  g.lineCap = 'round';
  g.lineJoin = 'round';
  groundShadow(g, 0, 0.6, 24, 1.8);
  for (const x of [-15, 16]) {
    disc(g, x, -6.4, 6.4, '#222222', FOLK_OUTLINE);
    disc(g, x, -6.4, 3.4, '#9aa3ad', 0.8);
    lines(g, '#5d6670', 0.7, frame ? [x - 3.2, -6.4, x + 3.2, -6.4, x, -9.6, x, -3.2] : [x - 2.3, -8.7, x + 2.3, -4.1, x - 2.3, -4.1, x + 2.3, -8.7]);
  }
  // Frame, engine, tank, seat, mudguard, handlebar, lamp
  lines(g, INK, 2.8, [-15, -6.4, -4, -12, 16, -6.4, 11, -20, -4, -12, 11, -14]);
  lines(g, '#5d6670', 1.4, [-15, -6.4, -4, -12, 16, -6.4, 11, -20, -4, -12, 11, -14]);
  part(g, () => g.roundRect(-5, -13, 9, 6, 1.5), '#4a4e57', { sh: 0.8, line: 1.1 });
  part(g, () => g.ellipse(5, -16.5, 6, 3, -0.15, 0, TAU), '#2b59c3', { sh: 1 });
  part(g, () => g.roundRect(-14, -17.5, 16, 3.2, 1.6), '#2a2a33', { sh: 0.6, line: 1.1 });
  part(g, () => g.ellipse(16, -12.5, 6, 2, 0.2, Math.PI, TAU), '#2b59c3', { sh: 0.6, line: 1 });
  lines(g, INK, 2, [11, -20, 9, -24, 9, -24, 12.5, -24.5]);
  lines(g, '#9aa3ad', 0.9, [11, -20, 9, -24, 9, -24, 12.5, -24.5]);
  part(g, () => g.ellipse(14.5, -19.5, 1.8, 2.2, 0, 0, TAU), '#fff3b0', { sh: 0.4, line: 0.9 });
  lines(g, '#8a8f96', 1.6, [-16, -9, -22, -10]);
  // Passenger behind, then the rider (both seated, side on)
  g.save();
  g.translate(-8.5, -16.6);
  g.scale(0.92, 0.92);
  const pR = rig(passenger);
  const pp = poseOf(passenger, 'sit', pR);
  pp.legs = 'ride';
  pp.na = { e: [1.6, 4.6], h: [3.4, 6.2] };
  pp.fa = { e: [-0.4, 4.8], h: [2.4, 6.4] };
  g.translate(0, -(-9.8 * pR.k));
  drawPose(g, { ...passenger, hold: 'none' }, pp, pR);
  // The market bag on the lap
  part(g, () => g.roundRect(2.4, -13.4, 5.2, 4.6, 1), '#e9e1cf', { sh: 0.6, line: 1, deco: () => lines(g, passenger.b, 0.9, [2, -11.6, 8, -11.6]) });
  g.restore();
  g.save();
  g.translate(1.5, -16.6);
  const rR = rig(rider);
  const rp = poseOf(rider, 'sit', rR);
  rp.legs = 'ride';
  rp.na = { e: [3.2, 4.2], h: [7.4, 2.6] };
  rp.fa = { e: [1.2, 4.2], h: [9.8, 2.8] };
  g.translate(0, -(-9.8 * rR.k));
  drawPose(g, { ...rider, head: 'helmet' }, rp, rR);
  g.restore();
  g.restore();
}

/**
 * The keke's driver and two passengers (part 4), drawn just after drawKekeShape (market.ts)
 * in the same transform, with the same time for its bounce. The driver shows through the
 * windscreen, the passengers in the open side.
 */
export function drawKekeRiders(g: G, x: number, y: number, time: number, looks: readonly [FolkLook, FolkLook, FolkLook], wave: 0 | 1 | 2 = 0): void {
  const bob = Math.sin((Number.isFinite(time) ? time : 0) * 16) * 0.6;
  g.save();
  g.translate(x, y + bob);
  // Passengers in the open side (x -18 to 4, y -28 to -14)
  g.save();
  g.beginPath();
  g.rect(-18, -28, 22, 14);
  g.clip();
  drawFolkBust(g, looks[1], -12, -14, 0.62, wave);
  drawFolkBust(g, looks[2], -3, -14, 0.6, 0);
  g.restore();
  // The seat back in front of their laps
  part(g, () => g.roundRect(-16, -18, 18, 4, 1.5), '#7b2d26', { sh: 0.6, line: 1 });
  // Driver behind the windscreen
  g.save();
  g.beginPath();
  g.rect(12, -34, 12, 12);
  g.clip();
  drawFolkBust(g, looks[0], 17.5, -21.5, 0.55, 0);
  g.fillStyle = 'rgba(191,227,245,0.3)';
  g.fillRect(8, -38, 18, 18);
  g.restore();
  g.restore();
}

/* ================================================================ the speech bubble */

/** The bubble look (part 6): cream, a 1.5 u dark outline, bold dark words of at least 12 screen px, a short tail. */
export const BUBBLE = { fill: '#fffaf0', line: '#1d1a14', lineW: 1.5, minPx: 12, padX: 0.55, padY: 0.38, tail: 0.6, radius: 0.5 } as const;

export function bubbleFont(px: number): string {
  return `bold ${Math.max(BUBBLE.minPx, px)}px sans-serif`;
}

/** The bubble's box for `text` at font size px (padding and tail in units of px). Needs a context to measure. */
export function bubbleSize(g: G, text: string, px: number = BUBBLE.minPx): { w: number; h: number; tail: number } {
  const f = Math.max(BUBBLE.minPx, px);
  g.save();
  g.font = bubbleFont(f);
  const tw = g.measureText(text).width;
  g.restore();
  return { w: Math.ceil(tw + f * BUBBLE.padX * 2), h: Math.ceil(f * (1 + BUBBLE.padY * 2)), tail: Math.ceil(f * BUBBLE.tail) };
}

/**
 * Draws a bubble whose tail tip is at (x, y), just above the speaker's head; the bubble sits
 * above. tail 'left' puts the tail near the bubble's left end (the bubble leans right), 'right'
 * the other way. Works in screen px (font px >= 12); draw it in screen space or bake it.
 */
export function drawBubble(g: G, text: string, x: number, y: number, opts: { px?: number; tail?: 'left' | 'centre' | 'right' } = {}): { x: number; y: number; w: number; h: number } {
  const px = Math.max(BUBBLE.minPx, opts.px ?? BUBBLE.minPx);
  const { w, h, tail } = bubbleSize(g, text, px);
  const side = opts.tail ?? 'left';
  const tx = side === 'left' ? w * 0.22 : side === 'right' ? w * 0.78 : w / 2;
  const bx = x - tx;
  const by = y - tail - h;
  const r = Math.min(h / 2, px * BUBBLE.radius * 2);
  g.save();
  g.beginPath();
  g.moveTo(bx + r, by);
  g.arcTo(bx + w, by, bx + w, by + h, r);
  g.arcTo(bx + w, by + h, bx, by + h, r);
  g.lineTo(bx + tx + tail * 0.55, by + h);
  g.lineTo(x, y);
  g.lineTo(bx + tx - tail * 0.35, by + h);
  g.arcTo(bx, by + h, bx, by, r);
  g.arcTo(bx, by, bx + w, by, r);
  g.closePath();
  g.fillStyle = BUBBLE.fill;
  g.fill();
  g.strokeStyle = BUBBLE.line;
  g.lineWidth = BUBBLE.lineW;
  g.lineJoin = 'round';
  g.stroke();
  g.fillStyle = INK;
  g.font = bubbleFont(px);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, bx + w / 2, by + h / 2 + px * 0.04);
  g.restore();
  return { x: bx, y: by, w, h: h + tail };
}

/* ================================================================ shared with folkLane.ts */

export { part as folkPart, lines as folkLines, mix as folkMix, disc as folkDisc };
