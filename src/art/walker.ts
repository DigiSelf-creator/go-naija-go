/**
 * The hero walking around Lagos from above (docs/city.md part 5W, W1; step c1). Our own small
 * "model town" figure in the city's drawn style, made from the player's saved look: skin,
 * hair (Low cut, Afro, Braids, Gele, Headscarf), outfit (Green jersey, Ankara, School uniform,
 * Agbada, Kaftan), body and age. Elders keep their grey hair, straight back and a neat beard;
 * teens are a little shorter. Never bent over, never a joke.
 *
 * Four views: 's' walking down the screen shows the front (face), 'n' up the screen shows
 * the back, 'e' and 'w' the side walk (flipped). Four walk frames each (walkFrame).
 * Standing still: a small breath, none with reduced motion.
 *
 * Origin is the centre of the feet on the ground; the soft shadow is drawn under them.
 * Drawn WALKER.h (26) units tall; pass `size` to draw it bigger, e.g. walkerSize(zoom)
 * keeps it at least 24 px tall on screen when zoomed far out.
 *
 * Also here: the tap ring (where the hero will stop) and the bus pulling up with the hero
 * getting off (Mission complete, W5).
 */
import { drawCityBus } from './city';
import { AGES, HAIRS, OUTFITS, SKINS, ageOf, bodyOf, clampLook, type HeroLook } from './hero';
import { INK, WHITE } from './palette';

const TAU = Math.PI * 2;

export type WalkDir = 'n' | 's' | 'e' | 'w';

/** Walker sizes and pace (map units). */
export const WALKER = {
  /** Height drawn, feet to the top of the head (a gele adds 3). */
  h: 26,
  /** Smallest height on screen, in px, at any zoom (W1). */
  minPx: 24,
  /** Map units walked per full walk cycle (4 frames, two steps). At 240 u/s: 15 frames a second. */
  cycle: 64,
  /** Walking speed, map units a second (W1). */
  speed: 240,
  /** The tap ring's life (s). */
  ringTime: 0.5,
} as const;

/** The box the walker stays inside at size WALKER.h, feet at 0, 0 (shadow and gele included). */
export const WALKER_BOX = { left: -11, right: 11, top: -33, bottom: 4 } as const;

/** Which of the 4 walk frames shows at phase 0..1 (one cycle = two steps). */
export function walkFrame(phase: number): 0 | 1 | 2 | 3 {
  const p = Number.isFinite(phase) ? phase - Math.floor(phase) : 0;
  return (Math.floor(p * 4) % 4) as 0 | 1 | 2 | 3;
}

/**
 * The height to pass as `size` (map units) so the hero is never under 24 px on screen:
 * `zoom` is screen px per map unit.
 */
export function walkerSize(zoom: number): number {
  const z = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
  return Math.max(WALKER.h, WALKER.minPx / z);
}

/** The view for a walk step (dx, dy in map units): mostly sideways shows the side walk. */
export function walkDir(dx: number, dy: number, was: WalkDir = 's'): WalkDir {
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6)) return was;
  if (Math.abs(dx) >= Math.abs(dy) * 0.8) return dx > 0 ? 'e' : 'w';
  return dy > 0 ? 's' : 'n';
}

export interface WalkPose {
  dir: WalkDir;
  /** Walk cycle 0..1 (advance by distance / WALKER.cycle). */
  phase?: number;
  /** False: standing (the breath). */
  moving?: boolean;
  /** Seconds, for the breath. */
  time?: number;
  /** Reduced motion: no breath (walking frames still show; they are the movement itself). */
  still?: boolean;
  /** Height in the current units (default WALKER.h). */
  size?: number;
}

const GREY = '#b9b4ac';
const BEARD = '#9d978d';

function disc(g: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string): void {
  g.fillStyle = fill;
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fill();
}

function oval(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string): void {
  g.fillStyle = fill;
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, TAU);
  g.fill();
}

/** A filled shape with a thin ink edge. */
function shape(g: CanvasRenderingContext2D, fill: string, pts: readonly number[], lw = 0.7): void {
  g.fillStyle = fill;
  g.strokeStyle = INK;
  g.lineWidth = lw;
  g.beginPath();
  for (let i = 0; i + 1 < pts.length; i += 2) {
    if (i === 0) g.moveTo(pts[i]!, pts[i + 1]!);
    else g.lineTo(pts[i]!, pts[i + 1]!);
  }
  g.closePath();
  g.fill();
  g.stroke();
}

function limb(g: CanvasRenderingContext2D, colour: string, w: number, x0: number, y0: number, x1: number, y1: number): void {
  g.strokeStyle = INK;
  g.lineCap = 'round';
  g.lineWidth = w + 1.2;
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x1, y1);
  g.stroke();
  g.strokeStyle = colour;
  g.lineWidth = w;
  g.stroke();
}

function edged(g: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string): void {
  disc(g, x, y, r, fill);
  g.strokeStyle = INK;
  g.lineWidth = 0.7;
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.stroke();
}

/**
 * The hero from above at (x, y) = the feet on the ground. Every skin, hair, outfit, body
 * and age. `pose.dir` picks the view; `pose.phase` the walk frame.
 */
export function drawCityHero(g: CanvasRenderingContext2D, look: HeroLook, x: number, y: number, pose: WalkPose): void {
  const lk = clampLook(look);
  const skin = SKINS[lk.skin]!;
  const hair = HAIRS[lk.hair]!;
  const out = OUTFITS[lk.outfit]!;
  const female = bodyOf(lk) === 1;
  const age = AGES[ageOf(lk)]!.id;
  const size = pose.size !== undefined && Number.isFinite(pose.size) && pose.size > 0 ? pose.size : WALKER.h;
  const moving = pose.moving !== false;
  const f = moving ? walkFrame(pose.phase ?? 0) : 0;
  const swing = moving ? [1, 0, -1, 0][f]! : 0;
  const t = Number.isFinite(pose.time) ? pose.time! : 0;
  const bob = moving ? (f % 2 === 1 ? -0.7 : 0) : pose.still ? 0 : Math.sin(t * TAU * 0.4) * 0.35;
  const side = pose.dir === 'e' || pose.dir === 'w';
  const front = pose.dir === 's';
  const hairCol = age === 'elder' && (hair.id === 'lowcut' || hair.id === 'afro' || hair.id === 'braids') ? GREY : hair.colour;
  const robe = out.id === 'agbada' || out.id === 'kaftan';
  const skirt = female && (out.id === 'ankara' || out.id === 'school');

  g.save();
  g.translate(x, y);
  const k = (size / WALKER.h) * (age === 'teen' ? 0.93 : 1);
  g.scale(k, k);
  // Soft shadow under the feet
  oval(g, 0, 0.6, 7.5, 2.6, 'rgba(0,0,0,0.22)');
  if (pose.dir === 'w') g.scale(-1, 1);
  g.lineJoin = 'round';

  // Legs and shoes
  const hip = -9.5 + bob;
  if (side) {
    const a = swing * 3.2;
    limb(g, out.legs, 2.6, 0, hip, a, -1.4);
    limb(g, out.legs, 2.6, 0, hip, -a, -1.4);
    oval(g, a + 1, -0.8, 2.1, 1.2, out.shoes);
    oval(g, -a + 1, -0.8, 2.1, 1.2, out.shoes);
  } else {
    const lift = swing * 1.1;
    limb(g, out.legs, 2.6, -2.1, hip, -2.1, -1.3 - Math.max(0, lift));
    limb(g, out.legs, 2.6, 2.1, hip, 2.1, -1.3 - Math.max(0, -lift));
    oval(g, -2.2, -0.8 - Math.max(0, lift), 1.9, 1.2, out.shoes);
    oval(g, 2.2, -0.8 - Math.max(0, -lift), 1.9, 1.2, out.shoes);
  }

  // Body: torso, robe or skirt
  const top = -18.5 + bob;
  const sw = side ? 3.4 : female ? 4.6 : 5.2; // half width at the shoulders
  if (robe) {
    const hem = out.id === 'kaftan' ? -2.5 : -4.5;
    const wide = out.id === 'agbada' ? (side ? 6 : 8.5) : side ? 4 : 5.6;
    shape(g, out.a, [-sw, top, sw, top, wide, hem + bob * 0.3, -wide, hem + bob * 0.3]);
    g.strokeStyle = out.b;
    g.lineWidth = 1;
    g.beginPath();
    if (front || side) {
      // Embroidery at the neck (agbada) or a trim down the front (kaftan)
      if (out.id === 'agbada') {
        g.moveTo(-2.2, top + 0.6);
        g.quadraticCurveTo(0, top + 5, 2.2, top + 0.6);
      } else {
        g.moveTo(side ? 1.5 : 0, top + 1);
        g.lineTo(side ? 1.5 : 0, hem - 1);
      }
    } else {
      g.moveTo(-wide + 1.5, hem - 1.5);
      g.lineTo(wide - 1.5, hem - 1.5);
    }
    g.stroke();
  } else {
    const waist = -9.2 + bob;
    shape(g, out.a, [-sw, top, sw, top, sw - 0.7, waist, -sw + 0.7, waist]);
    if (out.id === 'jersey') {
      g.fillStyle = out.b;
      g.fillRect(-sw + 0.4, top + 4, sw * 2 - 0.8, 1.3);
    } else if (out.id === 'ankara') {
      g.fillStyle = out.b;
      for (let i = 0; i < 4; i++) {
        g.beginPath();
        g.arc(-sw + 1.8 + (i % 2) * (sw - 0.4) + (i > 1 ? 1.2 : 0), top + 2.5 + (i > 1 ? 3.4 : 0), 0.9, 0, TAU);
        g.fill();
      }
    } else if (out.id === 'school' && !side) {
      g.fillStyle = out.b;
      g.fillRect(-0.5, top + 0.6, 1, front ? 5 : 0.01);
    }
    if (skirt) shape(g, out.id === 'school' ? out.b : out.a, [-sw + 0.6, waist - 0.4, sw - 0.6, waist - 0.4, sw + 0.8, waist + 4.6, -sw - 0.8, waist + 4.6]);
  }

  // Arms (swing opposite to the legs)
  const sleeve = robe ? out.a : out.id === 'school' || out.id === 'jersey' ? skin.base : out.a;
  if (side) {
    const a = -swing * 3;
    const sh = top + 1.6;
    limb(g, sleeve, robe && out.id === 'agbada' ? 3.6 : 2.2, 0, sh, a, sh + 7);
    disc(g, a, sh + 7.6, 1.2, skin.base);
  } else {
    const a = swing * 0.9;
    for (const s of [-1, 1]) {
      const sx = s * (sw + 0.6);
      const ex = s * (sw + (out.id === 'agbada' ? 2.6 : 1.1));
      limb(g, sleeve, out.id === 'agbada' ? 3.6 : 2.2, sx, top + 1.4, ex, top + 8 + a * s);
      disc(g, ex, top + 8.8 + a * s, 1.2, skin.base);
    }
  }

  // Neck and head
  const hy = top - 4.2;
  disc(g, side ? 0.6 : 0, top - 0.3, 1.5, skin.shade);
  const r = 4.3;
  // Afro and braids sit behind the head
  if (hair.id === 'afro') edged(g, side ? -0.8 : 0, hy - 0.8, r + 1.9, hairCol);
  if (hair.id === 'braids') {
    g.strokeStyle = hairCol;
    g.lineWidth = 1.3;
    g.lineCap = 'round';
    g.beginPath();
    const xs = side ? [-3.2, -1.6] : front ? [-4, 4] : [-3, -1, 1, 3];
    for (const bx of xs) {
      g.moveTo(bx, hy);
      g.lineTo(bx + (side ? -0.8 : 0), hy + 7);
    }
    g.stroke();
    g.fillStyle = hair.accent;
    for (const bx of xs) g.fillRect(bx + (side ? -0.8 : 0) - 0.7, hy + 6.4, 1.4, 1.4);
  }
  edged(g, 0, hy, r, skin.base);

  // Hair or headwear over the head
  g.fillStyle = hairCol;
  if (hair.id === 'lowcut' || hair.id === 'braids') {
    g.beginPath();
    if (pose.dir === 'n') g.arc(0, hy, r, Math.PI * 0.85, Math.PI * 2.15);
    else if (side) g.arc(-0.6, hy - 0.2, r, Math.PI * 0.95, Math.PI * 1.85);
    else g.arc(0, hy - 0.3, r, Math.PI * 1.08, Math.PI * 1.92);
    g.closePath();
    g.fill();
    if (pose.dir === 'n') g.fillRect(-r * 0.86, hy - 0.5, r * 1.72, 2.4);
  } else if (hair.id === 'afro') {
    g.beginPath();
    g.arc(side ? -0.8 : 0, hy - 0.8, r + 1.9, Math.PI, TAU);
    g.fill();
    if (pose.dir === 'n') disc(g, 0, hy, r + 0.2, hairCol);
  } else if (hair.id === 'gele') {
    // A tall, proud head tie with folds
    shape(g, hairCol, [-5.6, hy - 1.4, -4.4, hy - 6.8, -1.5, hy - 8.8, 2.4, hy - 8.4, 5.4, hy - 5.5, 5.8, hy - 1.2, 0, hy - 2.6]);
    g.strokeStyle = hair.accent;
    g.lineWidth = 0.8;
    g.beginPath();
    g.moveTo(-3.8, hy - 4.2);
    g.quadraticCurveTo(0, hy - 7.6, 4.4, hy - 3.6);
    g.moveTo(-2.4, hy - 6.6);
    g.quadraticCurveTo(0.8, hy - 8, 3.2, hy - 6.4);
    g.stroke();
    if (age === 'elder') disc(g, side ? 2.8 : -3.6, hy + 0.6, 0.9, GREY);
  } else {
    // Headscarf: wraps the hair, a knot at the back
    g.beginPath();
    g.arc(0, hy - 0.2, r + 0.5, Math.PI * (pose.dir === 'n' ? 0.75 : 1.02), Math.PI * (pose.dir === 'n' ? 2.25 : 1.98));
    g.closePath();
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = 0.7;
    g.stroke();
    g.fillStyle = hair.accent;
    g.fillRect(-r, hy - 1.6, r * 2, 0.9);
    if (pose.dir === 'n' || side) {
      const kx = side ? -r - 0.4 : 0;
      shape(g, hairCol, [kx, hy - 0.4, kx - 1.8, hy + 3.2, kx + 0.6, hy + 2.4], 0.6);
    }
    if (age === 'elder' && pose.dir !== 'n') disc(g, side ? 2.6 : -3.4, hy + 0.4, 0.8, GREY);
  }

  // Face (front and side only)
  if (front) {
    disc(g, -1.5, hy + 0.3, 0.55, INK);
    disc(g, 1.5, hy + 0.3, 0.55, INK);
    g.strokeStyle = skin.face.lipLine;
    g.lineWidth = 0.6;
    g.beginPath();
    g.arc(0, hy + 1.6, 1.2, 0.15 * Math.PI, 0.85 * Math.PI);
    g.stroke();
    if (age === 'elder' && !female) {
      g.strokeStyle = BEARD;
      g.lineWidth = 1;
      g.beginPath();
      g.arc(0, hy + 1.4, 2.4, 0.15 * Math.PI, 0.85 * Math.PI);
      g.stroke();
    }
  } else if (side) {
    disc(g, 2.2, hy + 0.1, 0.55, INK);
    disc(g, r - 0.1, hy + 1.1, 0.8, skin.base); // nose
    if (age === 'elder' && !female) {
      g.strokeStyle = BEARD;
      g.lineWidth = 1;
      g.beginPath();
      g.arc(1.2, hy + 1.2, 2.6, 0.05 * Math.PI, 0.6 * Math.PI);
      g.stroke();
    }
  }
  g.restore();
}

/**
 * The tap ring: where the hero will stop (W1). k = 0..1 over WALKER.ringTime: it grows a
 * little and fades. Map units, on the ground. With reduced motion pass k = 0 and drop it
 * after 0.5 s.
 */
export function drawWalkRing(g: CanvasRenderingContext2D, x: number, y: number, k: number): void {
  const p = Number.isFinite(k) ? Math.min(Math.max(k, 0), 1) : 1;
  if (p >= 1) return;
  g.save();
  g.globalAlpha = 1 - p;
  g.lineWidth = 2.5;
  g.strokeStyle = WHITE;
  g.beginPath();
  g.ellipse(x, y, 10 + p * 4, 4.5 + p * 1.8, 0, 0, TAU);
  g.stroke();
  g.lineWidth = 1;
  g.strokeStyle = INK;
  g.beginPath();
  g.ellipse(x, y, 11.5 + p * 4, 5.3 + p * 1.8, 0, 0, TAU);
  g.stroke();
  g.restore();
}

/** Bus arrival timing (W5): the bus slides in, the door opens, the hero steps down, the door shuts. */
export const BUS_ARRIVAL = {
  /** Seconds the whole arrival takes. */
  time: 2.2,
  /** Shares of the time: the bus is still from `stop`, the door is open from `open` to `shut`. */
  stop: 0.35,
  open: 0.42,
  shut: 0.88,
  /** How far left of its stop the bus starts (map units). */
  from: 140,
} as const;

/**
 * Where the hero is during the arrival at k (0..1), relative to the bus centre: hidden while
 * the bus moves, then stepping down from the door to the pavement, facing the screen.
 * At k = 1 gamedev takes over walking from { x, y }.
 */
export function busArrivalHero(k: number): { x: number; y: number; visible: boolean; phase: number } {
  const p = Number.isFinite(k) ? Math.min(Math.max(k, 0), 1) : 1;
  const s = Math.min(Math.max((p - BUS_ARRIVAL.open - 0.04) / (BUS_ARRIVAL.shut - BUS_ARRIVAL.open - 0.08), 0), 1);
  return { x: 12, y: 9 + s * 16, visible: p > BUS_ARRIVAL.open + 0.03, phase: s * 1.5 };
}

/**
 * The yellow bus pulling up at (x, y) (its centre on the lane, going 'e') and the hero getting
 * off at k (0..1 over BUS_ARRIVAL.time). The door is on the near side, front half. Reduced
 * motion: pass k = 1 (the end picture: bus at the stop, door shut, hero on the pavement).
 */
export function drawBusArrival(g: CanvasRenderingContext2D, look: HeroLook, x: number, y: number, k: number, size: number = WALKER.h): void {
  const p = Number.isFinite(k) ? Math.min(Math.max(k, 0), 1) : 1;
  const m = Math.min(p / BUS_ARRIVAL.stop, 1);
  const dx = -BUS_ARRIVAL.from * (1 - m) * (1 - m);
  const open = p >= BUS_ARRIVAL.open && p < BUS_ARRIVAL.shut;
  const hero = busArrivalHero(p);
  g.save();
  drawCityBus(g, x + dx, y, 'e');
  // The sliding door on the near wall: a dark doorway when open, a line when shut
  g.fillStyle = open ? '#3a3a40' : '#c99d0a';
  g.fillRect(x + dx + 8, y - 1.5, 7, 9);
  g.strokeStyle = INK;
  g.lineWidth = 0.8;
  g.strokeRect(x + dx + 8, y - 1.5, 7, 9);
  if (open) {
    g.fillStyle = '#e3b50c';
    g.fillRect(x + dx + 15, y - 1.5, 4, 9);
  }
  if (hero.visible) drawCityHero(g, look, x + hero.x, y + hero.y, { dir: 's', phase: hero.phase, moving: p < BUS_ARRIVAL.shut, size });
  g.restore();
}
