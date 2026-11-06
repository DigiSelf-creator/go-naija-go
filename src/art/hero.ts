/**
 * The hero, drawn in code as separate layers: skin (body), hair, outfit.
 * Lists follow docs/design.md (Hero builder) in the same order. Only ever add to
 * the END of a list; saved looks are indices.
 *
 * Origin is the centre of the feet. The hero faces right (+x) when facing = 1,
 * stands about 48 u tall (a gele or afro adds a little), y grows downward.
 */
import { GLOW, INK, WHITE } from './palette';

export interface SkinOption {
  id: string;
  label: string;
  base: string;
  /** Slightly darker tone for ears, neck and the far hand. */
  shade: string;
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
  { id: 'skin1', label: 'Skin tone 1', base: '#f1c9a5', shade: '#dcae86' },
  { id: 'skin2', label: 'Skin tone 2', base: '#d9a172', shade: '#c0875a' },
  { id: 'skin3', label: 'Skin tone 3', base: '#a8693f', shade: '#8d5530' },
  { id: 'skin4', label: 'Skin tone 4', base: '#7a4a2a', shade: '#653b20' },
  { id: 'skin5', label: 'Skin tone 5', base: '#4b2c1a', shade: '#3a2113' },
];

export const HAIRS: readonly HairOption[] = [
  { id: 'lowcut', label: 'Low cut', colour: '#1b1410', accent: '#3a2a20' },
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
  /** Seconds, for the glow pulse. */
  time?: number;
}

export const HERO_HEIGHT = 48;

/** Keeps a saved look inside the lists (old or broken saves still draw). */
export function clampLook(look: HeroLook): HeroLook {
  const fix = (n: number, len: number): number => (Number.isInteger(n) && n >= 0 && n < len ? n : 0);
  return { skin: fix(look.skin, SKINS.length), hair: fix(look.hair, HAIRS.length), outfit: fix(look.outfit, OUTFITS.length) };
}

const TAU = Math.PI * 2;
const HIP_Y = -16;
const SHOULDER_Y = -29;
const HEAD_X = 1;
const HEAD_Y = -38;
const HEAD_R = 8;

function seg(g: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, w: number, c1: string, c2: string): void {
  // Outline pass, then colour passes (upper and lower part may differ).
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.strokeStyle = INK;
  g.lineWidth = w + 2;
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  g.lineTo(x3, y3);
  g.stroke();
  g.lineWidth = w;
  g.strokeStyle = c2;
  g.beginPath();
  g.moveTo(x2, y2);
  g.lineTo(x3, y3);
  g.stroke();
  g.strokeStyle = c1;
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  g.stroke();
}

function dot(g: CanvasRenderingContext2D, x: number, y: number, r: number, c: string): void {
  g.fillStyle = c;
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fill();
}

interface Limb {
  a: number;
  bend: number;
}

function legPose(pose: HeroPose, back: boolean): Limb {
  if (pose.standing) return { a: back ? -0.08 : 0.08, bend: 0.04 };
  if (pose.inAir) return back ? { a: -0.55, bend: 0.5 } : { a: 0.95, bend: 1.6 };
  const stride = pose.glow ? 0.85 : 0.65;
  const p = pose.phase * TAU + (back ? Math.PI : 0);
  return { a: Math.sin(p) * stride, bend: 0.15 + Math.max(0, Math.cos(p)) * 1.05 };
}

function armPose(pose: HeroPose, back: boolean): Limb {
  if (pose.standing) return { a: back ? -0.12 : 0.12, bend: 0.25 };
  if (pose.inAir) return back ? { a: -0.9, bend: 0.4 } : { a: 2.3, bend: 0.5 };
  const p = pose.phase * TAU + (back ? 0 : Math.PI);
  return { a: Math.sin(p) * 0.9, bend: 1.1 };
}

function drawLeg(g: CanvasRenderingContext2D, o: OutfitOption, skin: SkinOption, l: Limb): void {
  const kx = Math.sin(l.a) * 8;
  const ky = HIP_Y + Math.cos(l.a) * 8;
  const fx = kx + Math.sin(l.a - l.bend) * 8;
  const fy = ky + Math.cos(l.a - l.bend) * 8;
  const shorts = o.id === 'jersey';
  seg(g, 0, HIP_Y, kx, ky, fx, fy, 5, o.legs, shorts ? skin.base : o.legs);
  if (shorts) {
    // White socks
    g.strokeStyle = WHITE;
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(kx + (fx - kx) * 0.55, ky + (fy - ky) * 0.55);
    g.lineTo(fx, fy);
    g.stroke();
  }
  // Shoe
  g.fillStyle = o.shoes;
  g.strokeStyle = INK;
  g.lineWidth = 1.2;
  g.beginPath();
  g.ellipse(fx + 2, fy - 1, 4.5, 2.6, l.a - l.bend > 0.6 ? -0.4 : 0, 0, TAU);
  g.fill();
  g.stroke();
}

function drawArm(g: CanvasRenderingContext2D, o: OutfitOption, hand: string, l: Limb): void {
  const ex = Math.sin(l.a) * 7;
  const ey = SHOULDER_Y + Math.cos(l.a) * 7;
  const hx = ex + Math.sin(l.a + l.bend) * 6;
  const hy = ey + Math.cos(l.a + l.bend) * 6;
  const wide = o.id === 'agbada';
  const shortSleeve = o.id === 'jersey' || o.id === 'school';
  seg(g, 0, SHOULDER_Y, ex, ey, hx, hy, wide ? 6 : 4, o.a, shortSleeve ? hand : o.a);
  if (wide) {
    // Flowing agbada sleeve: a soft fan from shoulder past the elbow
    g.fillStyle = o.a;
    g.strokeStyle = INK;
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(0, SHOULDER_Y - 2);
    g.lineTo(ex + Math.cos(l.a) * 5, ey - Math.sin(l.a) * 5);
    g.lineTo(ex - Math.cos(l.a) * 5, ey + Math.sin(l.a) * 5);
    g.closePath();
    g.fill();
    g.stroke();
  }
  dot(g, hx, hy, 2.4, hand);
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.stroke();
}

function drawTorso(g: CanvasRenderingContext2D, o: OutfitOption): void {
  g.fillStyle = o.a;
  g.strokeStyle = INK;
  g.lineWidth = 1.4;
  g.beginPath();
  if (o.id === 'agbada') {
    g.moveTo(-8, -32);
    g.lineTo(8, -32);
    g.quadraticCurveTo(11, -18, 13, -6);
    g.quadraticCurveTo(0, -4, -13, -6);
    g.quadraticCurveTo(-11, -18, -8, -32);
  } else if (o.id === 'kaftan') {
    g.roundRect(-7.5, -32, 15.5, 23, 4);
  } else {
    g.roundRect(-7.5, -32, 15, 18, 4);
  }
  g.fill();
  g.stroke();

  switch (o.id) {
    case 'jersey':
      // White V collar, cuff band and a side stripe
      g.strokeStyle = o.b;
      g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(-2.5, -31.5);
      g.lineTo(1, -27.5);
      g.lineTo(4.5, -31.5);
      g.stroke();
      g.fillStyle = o.b;
      g.fillRect(-7, -17, 14, 1.8);
      g.fillRect(-6.5, -30, 1.6, 12);
      break;
    case 'ankara':
      // Bold wax-print circles
      for (const [x, y] of [[-3.5, -27], [3.5, -22], [-3, -17], [4, -29.5]] as const) {
        dot(g, x, y, 2.3, o.b);
        dot(g, x, y, 1, '#f2b300');
      }
      break;
    case 'school':
      // Collar points and a tie
      g.fillStyle = WHITE;
      g.strokeStyle = INK;
      g.lineWidth = 0.8;
      g.beginPath();
      g.moveTo(-3, -32);
      g.lineTo(1, -29);
      g.lineTo(-1, -27.5);
      g.closePath();
      g.moveTo(5, -32);
      g.lineTo(1, -29);
      g.lineTo(3, -27.5);
      g.closePath();
      g.fill();
      g.stroke();
      g.fillStyle = o.b;
      g.beginPath();
      g.moveTo(0, -29);
      g.lineTo(2, -29);
      g.lineTo(2.6, -20);
      g.lineTo(1, -18.5);
      g.lineTo(-0.6, -20);
      g.closePath();
      g.fill();
      // Belt line
      g.fillStyle = o.b;
      g.fillRect(-7, -15.5, 14, 1.6);
      break;
    case 'agbada':
      // Gold embroidery round the neck, a chest panel, and the hem
      g.strokeStyle = o.b;
      g.lineWidth = 1.6;
      g.beginPath();
      g.arc(1, -31, 4, 0.1, Math.PI - 0.1);
      g.stroke();
      // Embroidered chest panel: a row of small loops
      g.lineWidth = 1.1;
      for (let y = -26; y <= -19; y += 3.5) {
        g.beginPath();
        g.arc(1, y, 1.6, 0, TAU);
        g.stroke();
      }
      g.beginPath();
      g.moveTo(-11.5, -8);
      g.quadraticCurveTo(0, -6, 11.5, -8);
      g.stroke();
      break;
    case 'kaftan':
      // Cream collar and stitched line down the front
      g.strokeStyle = o.b;
      g.lineWidth = 1.4;
      g.beginPath();
      g.arc(1, -31.5, 3, 0.2, Math.PI - 0.2);
      g.stroke();
      g.beginPath();
      g.moveTo(1, -28.5);
      g.lineTo(1, -19);
      g.stroke();
      for (let y = -27; y <= -20; y += 3) dot(g, 3, y, 0.7, o.b);
      break;
  }
}

function hairBack(g: CanvasRenderingContext2D, h: HairOption, pose: HeroPose): void {
  if (h.id === 'afro') {
    dot(g, HEAD_X - 1, HEAD_Y - 4, 12.5, h.colour);
    g.strokeStyle = INK;
    g.lineWidth = 1.4;
    g.stroke();
    for (const [x, y] of [[-8, -46], [-3, -51], [4, -50], [-9, -38], [7, -46]] as const) dot(g, x, y, 1.1, h.accent);
  } else if (h.id === 'braids') {
    const sway = pose.standing ? 0 : Math.sin(pose.phase * TAU) * 1.5 - (pose.inAir ? 2 : 0);
    g.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const x0 = -6 + i * 1.8;
      const x1 = -9 + i * 1.6 - sway;
      g.strokeStyle = INK;
      g.lineWidth = 3.2;
      g.beginPath();
      g.moveTo(x0, HEAD_Y - 2);
      g.lineTo(x1, -25 + i * 0.5);
      g.stroke();
      g.strokeStyle = h.colour;
      g.lineWidth = 1.8;
      g.stroke();
      dot(g, x1, -24.5 + i * 0.5, 1.4, i % 2 ? '#e0572b' : h.accent);
    }
  } else if (h.id === 'headscarf') {
    // Soft drape behind the head and down onto the shoulders
    g.fillStyle = h.colour;
    g.strokeStyle = INK;
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(-9, -41);
    g.quadraticCurveTo(-12, -30, -8, -27);
    g.lineTo(7, -28);
    g.lineTo(6, -33);
    g.closePath();
    g.fill();
    g.stroke();
  }
}

function hairFront(g: CanvasRenderingContext2D, h: HairOption): void {
  g.strokeStyle = INK;
  g.lineWidth = 1.2;
  switch (h.id) {
    case 'lowcut':
    case 'afro':
    case 'braids': {
      // Hair cap with a neat line-up at the forehead
      const thick = h.id === 'afro' ? 1.5 : 0;
      g.fillStyle = h.colour;
      g.beginPath();
      g.arc(HEAD_X, HEAD_Y, HEAD_R + 0.8 + thick * 0.3, Math.PI * 0.85, Math.PI * 1.92);
      g.arc(HEAD_X + 1.5, HEAD_Y + 2.2 - thick, HEAD_R - 0.6, Math.PI * 1.92, Math.PI * 0.88, true);
      g.closePath();
      g.fill();
      if (h.id !== 'afro') g.stroke();
      if (h.id === 'braids') {
        // Cornrow lines running front to back along the skull
        g.strokeStyle = '#5a4436';
        g.lineWidth = 0.7;
        g.beginPath();
        g.arc(HEAD_X, HEAD_Y, HEAD_R - 0.2, Math.PI * 0.95, Math.PI * 1.85);
        g.stroke();
      }
      break;
    }
    case 'gele': {
      // Wide pleated head tie that sweeps up and back (wider than tall, soft curves)
      g.fillStyle = h.colour;
      g.beginPath();
      g.moveTo(-8, -41);
      g.quadraticCurveTo(-19, -42, -18, -50);
      g.quadraticCurveTo(-17, -58, -8, -57);
      g.quadraticCurveTo(-2, -61, 4, -56);
      g.quadraticCurveTo(12, -55, 11, -47);
      g.quadraticCurveTo(11, -43, 9.5, -42);
      g.quadraticCurveTo(1, -46, -8, -41);
      g.closePath();
      g.fill();
      g.stroke();
      // Curved pleats fanning to the back
      g.strokeStyle = h.accent;
      g.lineWidth = 1.1;
      g.beginPath();
      for (const [cx, cy, x, y] of [[-8, -46, -16, -50], [-6, -51, -11, -56], [-1, -52, -3, -58], [4, -50, 7, -54]] as const) {
        g.moveTo(2, -45);
        g.quadraticCurveTo(cx, cy, x, y);
      }
      g.stroke();
      // Knot at the back and the band across the forehead
      dot(g, -15, -44, 3, h.colour);
      g.strokeStyle = INK;
      g.lineWidth = 1.2;
      g.stroke();
      g.fillStyle = h.colour;
      g.beginPath();
      g.ellipse(HEAD_X, -43.5, 9.6, 3, -0.08, 0, TAU);
      g.fill();
      g.stroke();
      break;
    }
    case 'headscarf': {
      // Soft wrap over the hair, round the face and under the chin
      g.fillStyle = h.colour;
      g.beginPath();
      g.arc(HEAD_X - 0.5, HEAD_Y - 0.5, HEAD_R + 2.2, 0, TAU);
      g.moveTo(HEAD_X + 2.6 + 6.2, HEAD_Y + 0.6);
      g.ellipse(HEAD_X + 2.6, HEAD_Y + 0.6, 6.2, 6.8, 0, 0, TAU);
      g.fill('evenodd');
      g.beginPath();
      g.arc(HEAD_X - 0.5, HEAD_Y - 0.5, HEAD_R + 2.2, 0, TAU);
      g.stroke();
      g.beginPath();
      g.ellipse(HEAD_X + 2.6, HEAD_Y + 0.6, 6.2, 6.8, 0, 0, TAU);
      g.stroke();
      g.strokeStyle = h.accent;
      g.lineWidth = 1;
      g.beginPath();
      g.arc(HEAD_X - 1, HEAD_Y, HEAD_R + 0.6, Math.PI * 0.75, Math.PI * 1.25);
      g.stroke();
      break;
    }
  }
}

function drawHead(g: CanvasRenderingContext2D, skin: SkinOption, blink: boolean): void {
  // Neck
  g.fillStyle = skin.shade;
  g.fillRect(-1.5, -34, 4.5, 3);
  // Ear
  dot(g, HEAD_X - 3.5, HEAD_Y + 0.5, 2.2, skin.shade);
  // Face
  dot(g, HEAD_X, HEAD_Y, HEAD_R, skin.base);
  g.strokeStyle = INK;
  g.lineWidth = 1.3;
  g.stroke();
  // Eye: white with a dark pupil, so it reads on every skin tone
  if (blink) {
    g.strokeStyle = INK;
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(3.2, HEAD_Y - 1);
    g.lineTo(6.6, HEAD_Y - 1);
    g.stroke();
  } else {
    g.fillStyle = WHITE;
    g.beginPath();
    g.ellipse(4.9, HEAD_Y - 1.2, 2.1, 2.5, 0, 0, TAU);
    g.fill();
    dot(g, 5.6, HEAD_Y - 1, 1.3, INK);
  }
  // Brow
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(3, HEAD_Y - 4.4);
  g.lineTo(6.8, HEAD_Y - 4.8);
  g.stroke();
  // Happy open smile with teeth
  g.fillStyle = '#5a1a14';
  g.beginPath();
  g.arc(4.6, HEAD_Y + 3.3, 2.3, 0.05, Math.PI - 0.05);
  g.closePath();
  g.fill();
  g.fillStyle = WHITE;
  g.fillRect(2.8, HEAD_Y + 3.3, 3.6, 0.9);
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
  const t = pose.time ?? 0;

  g.save();
  g.scale(pose.facing, 1);

  if (pose.fast) {
    // Speed lines behind the hero
    g.strokeStyle = WHITE;
    g.lineCap = 'round';
    g.lineWidth = 2;
    const off = (t * 60) % 6;
    g.beginPath();
    for (const [y, len] of [[-12, 14], [-24, 18], [-36, 12]] as const) {
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
    g.ellipse(0, -26, 17, 30, 0, 0, TAU);
    g.fill();
    g.globalAlpha = 1;
    g.strokeStyle = GLOW;
    g.lineWidth = 2.5;
    g.setLineDash([5, 4]);
    g.lineDashOffset = -t * 30;
    g.stroke();
    g.setLineDash([]);
  }

  const bob = pose.inAir || pose.standing ? 0 : -Math.abs(Math.sin(pose.phase * TAU)) * 1.2;
  g.translate(0, bob);

  hairBack(g, hair, pose);
  drawArm(g, outfit, skin.shade, armPose(pose, true));
  drawLeg(g, outfit, skin, legPose(pose, true));
  drawLeg(g, outfit, skin, legPose(pose, false));
  drawTorso(g, outfit);
  drawHead(g, skin, pose.blink === true);
  hairFront(g, hair);
  drawArm(g, outfit, skin.base, armPose(pose, false));

  g.restore();
}
