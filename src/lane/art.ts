/**
 * The lane run's pictures, as plain shapes for now (S3f2). art's real drawings (S3f1) swap in
 * through setLaneArt(): each function draws one thing at a ground point on screen, `k` pixels to
 * the metre there, so the camera, the far boost and the fade stay in view.ts.
 * Every kind has its own shape and outline, never colour alone (part 6).
 */
import type { HeroLook } from '../art/hero';
import { HAIRS, OUTFITS, SKINS } from '../art/hero';
import type { PickupKind, ThingKind } from './level';
import type { ThingState } from './sim';

/** Where and how big to draw: the ground point under the thing's middle, in CSS px. */
export interface LanePen {
  g: CanvasRenderingContext2D;
  x: number;
  y: number;
  /** Pixels per metre here (the far boost included). */
  k: number;
  /** Seconds of the game clock (for blinking and bobbing). */
  t: number;
  /** Reduced motion: no flicker, tilt or bob. */
  still: boolean;
}

export interface HeroPose {
  kind: 'run' | 'jump' | 'slide' | 'stumble';
  /** 0..1 through the run cycle (4 frames), or through the jump, slide or trip. */
  phase: number;
  /** Feet height, metres. */
  up: number;
  /** -1..1: leaning into a lane change. */
  lean: number;
}

export interface LaneArt {
  /** The dusk sky and far skyline above the horizon, drawn once into its own picture. */
  sky(g: CanvasRenderingContext2D, w: number, horizon: number): void;
  /** `lane` 0, 1 or 2 (a goat trots off to its own side). */
  thing(p: LanePen, kind: ThingKind, state: ThingState, age: number, lane: number): void;
  pickup(p: LanePen, kind: PickupKind): void;
  /** A coin `up` metres above the road. */
  coin(p: LanePen, up: number): void;
  /** A lamp on the kerb: `on` 1 lit, 0 off (the Blackout, S3f3). */
  lamp(p: LanePen, on: number, side: -1 | 1): void;
  hero(p: LanePen, pose: HeroPose, look: HeroLook): void;
  busStop(p: LanePen): void;
}

const INK = '#1d1a14';
const DANFO = '#f2b300';

function box(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, line = INK, lw = 2): void {
  g.fillStyle = fill;
  g.fillRect(x, y, w, h);
  if (lw > 0) {
    g.lineWidth = lw;
    g.strokeStyle = line;
    g.strokeRect(x, y, w, h);
  }
}

/** The four-point sparkle over burst things (part 6). */
function sparkle(g: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  g.fillStyle = '#fff6c8';
  g.beginPath();
  g.moveTo(x, y - r);
  g.lineTo(x + r * 0.28, y - r * 0.28);
  g.lineTo(x + r, y);
  g.lineTo(x + r * 0.28, y + r * 0.28);
  g.lineTo(x, y + r);
  g.lineTo(x - r * 0.28, y + r * 0.28);
  g.lineTo(x - r, y);
  g.lineTo(x - r * 0.28, y - r * 0.28);
  g.closePath();
  g.fill();
}

function danfo(p: LanePen): void {
  const { g, x, y, k, t } = p;
  const w = 2.1 * k;
  const h = 2.4 * k;
  const lw = Math.max(1.5, k * 0.08);
  // The back of a stuck danfo: yellow with the black bands, dark back windows, no faces.
  box(g, x - w / 2, y - h, w, h, DANFO, INK, lw);
  g.fillStyle = INK;
  g.fillRect(x - w / 2, y - h * 0.42, w, h * 0.07);
  g.fillRect(x - w / 2, y - h * 0.28, w, h * 0.07);
  g.fillStyle = '#2a3440';
  g.fillRect(x - w * 0.42, y - h * 0.9, w * 0.38, h * 0.32);
  g.fillRect(x + w * 0.04, y - h * 0.9, w * 0.38, h * 0.32);
  // Hazard lights, blinking (steady with reduced motion).
  const on = p.still || Math.floor(t * 2.5) % 2 === 0;
  g.fillStyle = on ? '#ff8a1c' : '#7a4210';
  g.fillRect(x - w * 0.46, y - h * 0.2, w * 0.14, h * 0.08);
  g.fillRect(x + w * 0.32, y - h * 0.2, w * 0.14, h * 0.08);
  // Wheels.
  g.fillStyle = INK;
  g.fillRect(x - w * 0.44, y - h * 0.05, w * 0.2, h * 0.07);
  g.fillRect(x + w * 0.24, y - h * 0.05, w * 0.2, h * 0.07);
}

function cones(p: LanePen, down: boolean, age: number): void {
  const { g, x, y, k } = p;
  const lw = Math.max(1.2, k * 0.06);
  for (let i = -1; i <= 1; i++) {
    const cx = x + i * 0.65 * k;
    g.save();
    g.translate(cx, y);
    // Tipped over after a hit (part 4): they lie flat and slide to the kerb.
    if (down) g.rotate((i >= 0 ? 1 : -1) * Math.min(1, age * 6) * 1.4);
    const h = 0.7 * k;
    const b = 0.26 * k;
    g.fillStyle = '#f06a1a';
    g.beginPath();
    g.moveTo(-b, 0);
    g.lineTo(-b * 0.25, -h);
    g.lineTo(b * 0.25, -h);
    g.lineTo(b, 0);
    g.closePath();
    g.fill();
    g.lineWidth = lw;
    g.strokeStyle = INK;
    g.stroke();
    g.fillStyle = '#ffffff';
    g.fillRect(-b * 0.6, -h * 0.62, b * 1.2, h * 0.16);
    g.restore();
  }
}

function pothole(p: LanePen, plugged: boolean): void {
  const { g, x, y, k } = p;
  // Flat on the road: a dark hole with a cracked lighter lip and a few stones.
  const rx = 0.95 * k;
  const ry = Math.max(2, 0.3 * k);
  g.fillStyle = '#8a8478';
  g.beginPath();
  g.ellipse(x, y, rx * 1.12, ry * 1.25, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = plugged ? '#d9c58f' : '#15120e';
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  g.fill();
  g.lineWidth = Math.max(1.2, k * 0.06);
  g.strokeStyle = INK;
  g.stroke();
  g.fillStyle = '#a49c8c';
  g.fillRect(x + rx * 1.1, y - ry * 0.4, k * 0.12, k * 0.08);
  g.fillRect(x - rx * 1.25, y + ry * 0.2, k * 0.1, k * 0.07);
}

function barrier(p: LanePen, up: boolean, age: number): void {
  const { g, x, y, k } = p;
  const post = x - 1.1 * k;
  const lw = Math.max(1.5, k * 0.07);
  box(g, post - 0.08 * k, y - 1.3 * k, 0.16 * k, 1.3 * k, '#5b5f66', INK, lw);
  g.save();
  g.translate(post, y - 1.1 * k);
  if (up) g.rotate(-Math.min(1, age * 5) * 1.35);
  const len = 2.25 * k;
  const th = 0.22 * k;
  box(g, 0, -th / 2, len, th, '#ffffff', INK, lw);
  g.fillStyle = '#d23a2a';
  for (let i = 0; i < 5; i++) g.fillRect((i * 2 + 0.5) * (len / 10), -th / 2, len / 10, th);
  g.restore();
}

function crate(p: LanePen, kind: ThingKind): void {
  const { g, x, y, k } = p;
  const s = 0.9 * k;
  const lw = Math.max(1.2, k * 0.05);
  box(g, x - s / 2, y - s, s, s, '#b9783d', '#5a3416', lw);
  g.strokeStyle = '#5a3416';
  g.beginPath();
  g.moveTo(x - s / 2, y - s / 3);
  g.lineTo(x + s / 2, y - s / 3);
  g.moveTo(x - s / 2, y - (2 * s) / 3);
  g.lineTo(x + s / 2, y - (2 * s) / 3);
  g.stroke();
  // A small mark of what is inside: a bolt for Power, three bars for Tech, a dot for coins.
  g.fillStyle = kind === 'crate:power' ? '#ffd34d' : kind === 'crate:tech' ? '#5ee0c8' : '#e9b949';
  g.fillRect(x - s * 0.12, y - s * 0.62, s * 0.24, s * 0.24);
  sparkle(g, x, y - s - 0.3 * k, 0.18 * k);
}

function junk(p: LanePen): void {
  const { g, x, y, k } = p;
  const lw = Math.max(1.2, k * 0.05);
  box(g, x - 0.6 * k, y - 0.5 * k, 0.7 * k, 0.5 * k, '#c9a46a', '#5a3416', lw); // cardboard box
  box(g, x + 0.1 * k, y - 0.42 * k, 0.5 * k, 0.42 * k, '#6a7078', INK, lw); // broken radio
  g.fillStyle = '#9aa3ad';
  g.beginPath();
  g.arc(x + 0.35 * k, y - 0.22 * k, 0.12 * k, 0, Math.PI * 2);
  g.fill();
  box(g, x - 0.35 * k, y - 0.85 * k, 0.28 * k, 0.35 * k, '#b0b8bf', INK, lw); // tins
  box(g, x - 0.05 * k, y - 0.78 * k, 0.24 * k, 0.36 * k, '#c8ced3', INK, lw);
  sparkle(g, x, y - 1.15 * k, 0.18 * k);
}

function sign(p: LanePen): void {
  const { g, x, y, k } = p;
  const lw = Math.max(1.2, k * 0.05);
  g.fillStyle = '#5a3416';
  g.fillRect(x - 0.6 * k, y - 0.9 * k, 0.1 * k, 0.9 * k);
  g.fillRect(x + 0.5 * k, y - 0.9 * k, 0.1 * k, 0.9 * k);
  g.save();
  g.translate(x, y - 1.05 * k);
  g.rotate(0.08);
  // A blank board, paint peeling, no words.
  box(g, -0.8 * k, -0.4 * k, 1.6 * k, 0.8 * k, '#dcd3bd', '#5a3416', lw);
  g.fillStyle = '#9fb3a0';
  g.fillRect(-0.6 * k, -0.25 * k, 0.5 * k, 0.2 * k);
  g.restore();
  sparkle(g, x, y - 1.75 * k, 0.18 * k);
}

function goat(p: LanePen, off: boolean, age: number, lane: number): void {
  const { g, k, t } = p;
  // After a bump it trots off to the pavement on its side (never hurt).
  const side = lane === 0 ? -1 : 1;
  const x = p.x + (off ? side * Math.min(1, age * 1.5) * 3 * k : 0);
  const y = p.y;
  const chew = p.still ? 0 : Math.sin(t * 9) * 0.03 * k;
  g.fillStyle = '#f3efe6';
  g.strokeStyle = INK;
  g.lineWidth = Math.max(1.2, k * 0.05);
  // Round body from behind, four legs, a head with horns and ears, a small tail.
  g.fillStyle = INK;
  g.fillRect(x - 0.25 * k, y - 0.4 * k, 0.08 * k, 0.4 * k);
  g.fillRect(x + 0.17 * k, y - 0.4 * k, 0.08 * k, 0.4 * k);
  g.fillStyle = '#f3efe6';
  g.beginPath();
  g.ellipse(x, y - 0.55 * k, 0.36 * k, 0.28 * k, 0, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.fillStyle = '#8a5a2b';
  g.beginPath();
  g.ellipse(x + 0.1 * k, y - 0.6 * k, 0.14 * k, 0.1 * k, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#f3efe6';
  g.beginPath();
  g.arc(x, y - 0.9 * k + chew, 0.17 * k, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.fillStyle = '#6b5a44';
  g.fillRect(x - 0.32 * k, y - 0.96 * k, 0.16 * k, 0.06 * k);
  g.fillRect(x + 0.16 * k, y - 0.96 * k, 0.16 * k, 0.06 * k);
  g.fillStyle = '#f3efe6';
  g.fillRect(x - 0.04 * k, y - 0.82 * k, 0.08 * k, 0.12 * k);
}

/** Burst things fly apart into a few slats for a moment, then are gone. */
function bits(p: LanePen, age: number): void {
  const { g, x, y, k } = p;
  const u = Math.min(1, age / 0.35);
  g.globalAlpha *= 1 - u;
  g.fillStyle = '#b9783d';
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    g.fillRect(x + Math.cos(a) * u * 0.9 * k, y - 0.5 * k - Math.sin(a) * u * 0.8 * k, 0.3 * k, 0.1 * k);
  }
}

export const PLAIN_ART: LaneArt = {
  sky(g, w, horizon) {
    const grad = g.createLinearGradient(0, 0, 0, horizon);
    grad.addColorStop(0, '#4b3a78');
    grad.addColorStop(0.55, '#b4568a');
    grad.addColorStop(1, '#f59a4a');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, horizon + 1);
    // Our own far blocks and two cranes, no real building.
    g.fillStyle = '#3d3256';
    let x = 0;
    let i = 0;
    while (x < w) {
      const bw = 18 + ((i * 37) % 30);
      const bh = 10 + ((i * 53) % 34);
      g.fillRect(x, horizon - bh, bw, bh + 1);
      x += bw + 4;
      i++;
    }
    g.fillRect(w * 0.22, horizon - 58, 3, 58);
    g.fillRect(w * 0.22 - 20, horizon - 58, 40, 3);
    g.fillRect(w * 0.71, horizon - 50, 3, 50);
    g.fillRect(w * 0.71 - 14, horizon - 50, 34, 3);
  },
  thing(p, kind, state, age, lane) {
    if (state === 'burst') return bits(p, age);
    switch (kind) {
      case 'danfo':
        return danfo(p);
      case 'cones':
        return cones(p, state === 'done', age);
      case 'pothole':
        return pothole(p, false);
      case 'barrier':
        return barrier(p, state === 'done', age);
      case 'junk':
        return junk(p);
      case 'sign':
        return sign(p);
      case 'goat':
        return goat(p, state === 'off', age, lane);
      default:
        return crate(p, kind);
    }
  },
  pickup(p, kind) {
    const { g, x, k, t } = p;
    const bob = p.still ? 0 : Math.sin(t * 4) * 0.06 * k;
    const y = p.y - 0.8 * k + bob;
    g.lineWidth = Math.max(1, k * 0.04);
    g.strokeStyle = INK;
    if (kind === 'bulb') {
      // A pear-shaped bulb with a bolt inside and a soft glow ring.
      g.fillStyle = 'rgba(255, 230, 120, 0.35)';
      g.beginPath();
      g.arc(x, y, 0.42 * k, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#ffe066';
      g.beginPath();
      g.ellipse(x, y - 0.05 * k, 0.22 * k, 0.26 * k, 0, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.fillStyle = '#8a8f96';
      g.fillRect(x - 0.1 * k, y + 0.18 * k, 0.2 * k, 0.12 * k);
      g.fillStyle = '#c47a00';
      g.beginPath();
      g.moveTo(x + 0.04 * k, y - 0.2 * k);
      g.lineTo(x - 0.08 * k, y);
      g.lineTo(x + 0.02 * k, y);
      g.lineTo(x - 0.04 * k, y + 0.14 * k);
      g.lineTo(x + 0.09 * k, y - 0.04 * k);
      g.lineTo(x, y - 0.04 * k);
      g.closePath();
      g.fill();
    } else if (kind === 'chip') {
      // A small square chip with pins and three signal bars over it.
      const s = 0.4 * k;
      g.fillStyle = '#9aa3ad';
      for (let i = 0; i < 3; i++) {
        g.fillRect(x - s / 2 - 0.06 * k, y - s / 3 + (i * s) / 3, 0.06 * k, 0.04 * k);
        g.fillRect(x + s / 2, y - s / 3 + (i * s) / 3, 0.06 * k, 0.04 * k);
      }
      box(g, x - s / 2, y - s / 2, s, s, '#1f7a5a', INK, Math.max(1, k * 0.04));
      g.fillStyle = '#5ee0c8';
      for (let i = 0; i < 3; i++) g.fillRect(x - 0.15 * k + i * 0.11 * k, y - s / 2 - 0.1 * k - i * 0.06 * k, 0.07 * k, 0.06 * k + i * 0.06 * k);
    } else if (kind === 'garri') {
      g.fillStyle = '#c4632e';
      g.beginPath();
      g.ellipse(x, y, 0.36 * k, 0.2 * k, 0, 0, Math.PI);
      g.fill();
      g.stroke();
      g.fillStyle = '#f5ecd2';
      g.beginPath();
      g.ellipse(x, y, 0.36 * k, 0.1 * k, 0, 0, Math.PI * 2);
      g.fill();
      g.stroke();
    } else {
      // Roasted corn on its husk.
      g.fillStyle = '#4f9a3a';
      g.beginPath();
      g.ellipse(x, y + 0.08 * k, 0.16 * k, 0.36 * k, 0.4, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#f0b93a';
      g.beginPath();
      g.ellipse(x, y, 0.11 * k, 0.32 * k, 0.4, 0, Math.PI * 2);
      g.fill();
      g.stroke();
    }
  },
  coin(p, up) {
    const { g, x, k, t } = p;
    const y = p.y - up * k;
    // A small brass kobo coin that tilts side to side, never a full spin.
    const tilt = p.still ? 1 : 0.65 + 0.35 * Math.cos(t * 3);
    const r = Math.max(2, 0.2 * k);
    g.fillStyle = '#c99a2e';
    g.beginPath();
    g.ellipse(x, y, r * tilt, r, 0, 0, Math.PI * 2);
    g.fill();
    g.lineWidth = Math.max(1, k * 0.03);
    g.strokeStyle = '#6b4c10';
    g.stroke();
    g.fillStyle = '#f0cf6a';
    g.fillRect(x - r * 0.15 * tilt, y - r * 0.5, r * 0.3 * tilt, r);
  },
  lamp(p, on, side) {
    const { g, x, y, k } = p;
    const top = y - 5 * k;
    g.fillStyle = '#7d7a72';
    g.fillRect(x - 0.08 * k, top, 0.16 * k, 5 * k);
    g.fillRect(side < 0 ? x : x - 0.8 * k, top, 0.8 * k, 0.12 * k);
    const hx = x - side * 0.8 * k;
    if (on > 0) {
      g.fillStyle = `rgba(255, 214, 120, ${0.25 * on})`;
      g.beginPath();
      g.arc(hx, top + 0.2 * k, 0.6 * k, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = on > 0.5 ? '#ffe7a0' : '#4a4740';
    g.fillRect(hx - 0.2 * k, top + 0.1 * k, 0.4 * k, 0.16 * k);
  },
  hero(p, pose, look) {
    const { g, x, k } = p;
    const skin = SKINS[look.skin]?.base ?? '#a8693f';
    const hair = HAIRS[look.hair]?.colour ?? '#1b1410';
    const outfit = OUTFITS[look.outfit] ?? OUTFITS[0]!;
    const y = p.y - pose.up * k;
    const lw = Math.max(1.5, k * 0.05);
    g.lineWidth = lw;
    g.strokeStyle = INK;
    // A soft shadow on the road under a jump.
    if (pose.up > 0.05) {
      g.fillStyle = 'rgba(0, 0, 0, 0.25)';
      g.beginPath();
      g.ellipse(x, p.y, 0.4 * k, 0.1 * k, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.save();
    g.translate(x, y);
    g.rotate(pose.lean * 0.12 + (pose.kind === 'stumble' ? Math.sin(pose.phase * Math.PI) * 0.35 : 0));
    if (pose.kind === 'slide') {
      // Low and leaning back: the body is 0.8 m tall.
      box(g, -0.3 * k, -0.55 * k, 0.6 * k, 0.4 * k, outfit.a, INK, lw);
      g.fillStyle = outfit.legs;
      g.fillRect(-0.28 * k, -0.18 * k, 0.56 * k, 0.18 * k);
      g.fillStyle = skin;
      g.beginPath();
      g.arc(0, -0.72 * k, 0.17 * k, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = hair;
      g.beginPath();
      g.arc(0, -0.74 * k, 0.17 * k, 0, Math.PI * 2);
      g.fill();
      g.restore();
      return;
    }
    // From behind: two legs in a 4 frame run, the back of the outfit, arms, the back of the head.
    const step = pose.kind === 'run' ? Math.floor(pose.phase * 4) % 4 : 1;
    const lift = [0, 0.14, 0, -0.14][step]! * k;
    g.fillStyle = outfit.legs;
    g.fillRect(-0.22 * k, -0.8 * k, 0.17 * k, 0.8 * k - Math.max(0, lift));
    g.fillRect(0.05 * k, -0.8 * k, 0.17 * k, 0.8 * k - Math.max(0, -lift));
    g.fillStyle = outfit.shoes;
    g.fillRect(-0.24 * k, -0.08 * k - Math.max(0, lift), 0.21 * k, 0.08 * k);
    g.fillRect(0.03 * k, -0.08 * k - Math.max(0, -lift), 0.21 * k, 0.08 * k);
    box(g, -0.3 * k, -1.4 * k, 0.6 * k, 0.65 * k, outfit.a, INK, lw);
    g.fillStyle = outfit.b;
    g.fillRect(-0.3 * k, -0.85 * k, 0.6 * k, 0.08 * k);
    g.fillStyle = skin;
    const arm = pose.kind === 'jump' ? -0.25 * k : lift * 0.8;
    g.fillRect(-0.42 * k, -1.32 * k + arm, 0.12 * k, 0.5 * k);
    g.fillRect(0.3 * k, -1.32 * k - arm, 0.12 * k, 0.5 * k);
    g.beginPath();
    g.arc(0, -1.55 * k, 0.19 * k, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.fillStyle = hair;
    g.beginPath();
    g.arc(0, -1.6 * k, 0.19 * k, Math.PI * 0.9, Math.PI * 2.1);
    g.fill();
    g.restore();
  },
  busStop(p) {
    const { g, x, y, k } = p;
    // Our own shelter with a bench and a plain stop sign with a bus picture, no name.
    const lw = Math.max(1.5, k * 0.05);
    box(g, x - 2 * k, y - 2.8 * k, 4 * k, 0.25 * k, '#2b59c3', INK, lw);
    g.fillStyle = '#7d7a72';
    g.fillRect(x - 1.9 * k, y - 2.6 * k, 0.12 * k, 2.6 * k);
    g.fillRect(x + 1.78 * k, y - 2.6 * k, 0.12 * k, 2.6 * k);
    box(g, x - 1.2 * k, y - 0.6 * k, 2.4 * k, 0.15 * k, '#8a5a2b', INK, lw);
    g.fillStyle = '#ffe7a0';
    g.fillRect(x - 1.5 * k, y - 2.55 * k, 3 * k, 0.1 * k);
    g.fillStyle = '#7d7a72';
    g.fillRect(x + 2.4 * k, y - 2.4 * k, 0.1 * k, 2.4 * k);
    box(g, x + 2.05 * k, y - 3 * k, 0.8 * k, 0.6 * k, '#ffffff', INK, lw);
    g.fillStyle = DANFO;
    g.fillRect(x + 2.2 * k, y - 2.85 * k, 0.5 * k, 0.25 * k);
  },
};

let current: LaneArt = PLAIN_ART;
/** art (S3f1): swap in real drawings, one function or all of them. */
export function setLaneArt(art: Partial<LaneArt>): void {
  current = { ...current, ...art };
}
export function laneArt(): LaneArt {
  return current;
}
