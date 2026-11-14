/**
 * The intro story (docs/city.md part 5 (a), slice 3 step S3a1): six still frames drawn in
 * code, in our own warm style. The captions are real HTML text under the picture (gamedev);
 * nothing here writes the story words.
 *
 * 1. Sunrise over West African land: its people, of every age, make the Wheel together.
 *    The people are the makers; nobody arrives from outside.
 * 2. The Wheel turns and Lagos grows: new buildings, yellow buses and people coming in.
 * 3. The Wheel in the middle of Nigeria, in green and white, its border a chain of small cogs.
 * 4. The Stoppers: made-up problem shapes (a jam of cars, a pothole, a dark lamp, a stack of
 *    forms in red tape), each with a grumpy pout. Things, never people, never any group.
 * 5. The player's own hero in front of the glowing Wheel (a plain outline hero if none yet).
 * 6. A yellow bus at a Lagos bus stop in the morning.
 *
 * No faith signs, flags on poles, crests, party colours, real places drawn to look real, or real people.
 * The Wheel has six wooden spokes, a brass hub and brass teeth; no symbol on it.
 *
 * drawIntroFrame fills a w x h area (canvas units): the sky and ground stretch to the edges,
 * and the 320 x 180 picture sits in the middle, as big as fits. Still pictures: `time` only
 * turns the Wheel and its cogs gently (frame 3: border cogs turn opposite ways to their neighbours); pass 0 (or nothing) for reduced motion.
 */
import { drawHero, type HeroLook } from './hero';
import { INK } from './palette';
import { drawBusShape, drawBusStop } from './street';

export const INTRO_FRAMES = 6;
/** The picture's own size; it is scaled to fit the area it is drawn in. */
export const INTRO_VIEW = { w: 320, h: 180 } as const;

export interface IntroOptions {
  /** The player's hero (frame 5). null or missing: a plain outline hero. */
  look?: HeroLook | null;
  /** Seconds, for the Wheel's slow turn. 0 or missing for a still picture. */
  time?: number;
}

const TAU = Math.PI * 2;

/** The Wheel's own colours: warm wood and brass. */
export const INTRO_COLOURS = {
  wood: '#9a6233',
  woodDark: '#6b4020',
  woodLight: '#c98a4b',
  brass: '#e4ad3c',
  brassDark: '#9a6a12',
  brassShine: '#fff0b8',
} as const;
const C = INTRO_COLOURS;

/** Skin tones for the small people (the hero builder's range). */
const SKIN = ['#f1c9a5', '#d9a172', '#a8693f', '#7a4a2a', '#4b2c1a'] as const;

/** Area the scene can reach past the 320 x 180 box (design units), set per frame. */
export interface Ext {
  l: number;
  r: number;
  t: number;
  b: number;
}

/** Helpers from here on are shared with the moving scene (intro-scene.ts). */
export function grad(g: CanvasRenderingContext2D, e: Ext, y0: number, y1: number, top: string, bottom: string): void {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  gr.addColorStop(0, top);
  gr.addColorStop(1, bottom);
  g.fillStyle = gr;
  g.fillRect(e.l, Math.min(e.t, y0), e.r - e.l, Math.max(y1, e.b) - Math.min(e.t, y0));
}

export function band(g: CanvasRenderingContext2D, e: Ext, y: number, colour: string): void {
  g.fillStyle = colour;
  g.fillRect(e.l, y, e.r - e.l, e.b - y);
}

export function disc(g: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string): void {
  g.fillStyle = fill;
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fill();
}

export function line(g: CanvasRenderingContext2D, colour: string, w: number, pts: readonly number[]): void {
  g.strokeStyle = colour;
  g.lineWidth = w;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  for (let i = 0; i + 1 < pts.length; i += 2) {
    if (i === 0) g.moveTo(pts[i]!, pts[i + 1]!);
    else g.lineTo(pts[i]!, pts[i + 1]!);
  }
  g.stroke();
}

export function box(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, edge = INK, ew = 0.8): void {
  g.fillStyle = fill;
  g.fillRect(x, y, w, h);
  g.strokeStyle = edge;
  g.lineWidth = ew;
  g.strokeRect(x, y, w, h);
}

// ---------- The Wheel ----------

/** A cog: brass teeth round a disc. */
function cog(g: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number, fill: string = C.brass, edge: string = C.brassDark): void {
  const n = 8;
  g.fillStyle = fill;
  g.strokeStyle = edge;
  g.lineWidth = Math.max(0.6, r * 0.12);
  g.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i * Math.PI) / n;
    const rr = i % 2 === 0 ? r : r * 0.78;
    const a0 = a - Math.PI / n / 2;
    const a1 = a + Math.PI / n / 2;
    if (i === 0) g.moveTo(x + Math.cos(a0) * rr, y + Math.sin(a0) * rr);
    else g.lineTo(x + Math.cos(a0) * rr, y + Math.sin(a0) * rr);
    g.lineTo(x + Math.cos(a1) * rr, y + Math.sin(a1) * rr);
  }
  g.closePath();
  g.fill();
  g.stroke();
  disc(g, x, y, r * 0.3, edge);
}

/**
 * The Wheel: brass teeth round the outside, a wooden rim with brass studs, six wooden
 * spokes and a brass hub. `missing` leaves spokes out (being made). `dull` greys it a little
 * (stuck, frame 4).
 */
export function drawStoryWheel(g: CanvasRenderingContext2D, x: number, y: number, r: number, rot = 0, missing = 0, dull = false): void {
  g.save();
  g.translate(x, y);
  if (dull) g.globalAlpha = 0.85;
  // Teeth
  const teeth = 18;
  g.fillStyle = dull ? '#b9a27a' : C.brass;
  g.strokeStyle = C.brassDark;
  g.lineWidth = Math.max(0.8, r * 0.025);
  g.beginPath();
  for (let i = 0; i < teeth; i++) {
    const a = rot + (i * TAU) / teeth;
    const w = Math.PI / teeth / 1.6;
    g.moveTo(Math.cos(a - w) * r * 0.9, Math.sin(a - w) * r * 0.9);
    g.lineTo(Math.cos(a - w * 0.7) * r, Math.sin(a - w * 0.7) * r);
    g.lineTo(Math.cos(a + w * 0.7) * r, Math.sin(a + w * 0.7) * r);
    g.lineTo(Math.cos(a + w) * r * 0.9, Math.sin(a + w) * r * 0.9);
    g.closePath();
  }
  g.fill();
  g.stroke();
  // Rim: a thick wooden ring
  g.lineWidth = r * 0.16;
  g.strokeStyle = dull ? '#8f7a62' : C.wood;
  g.beginPath();
  g.arc(0, 0, r * 0.82, 0, TAU);
  g.stroke();
  g.lineWidth = Math.max(0.8, r * 0.025);
  g.strokeStyle = C.woodDark;
  g.beginPath();
  g.arc(0, 0, r * 0.9, 0, TAU);
  g.stroke();
  g.beginPath();
  g.arc(0, 0, r * 0.74, 0, TAU);
  g.stroke();
  // Wood grain line
  g.strokeStyle = C.woodLight;
  g.lineWidth = Math.max(0.5, r * 0.015);
  g.beginPath();
  g.arc(0, 0, r * 0.8, rot + 0.3, rot + 2.2);
  g.stroke();
  // Spokes
  for (let i = missing; i < 6; i++) {
    const a = rot + (i * TAU) / 6;
    const c = Math.cos(a);
    const s = Math.sin(a);
    line(g, C.woodDark, r * 0.1, [c * r * 0.18, s * r * 0.18, c * r * 0.74, s * r * 0.74]);
    line(g, dull ? '#a08a70' : C.woodLight, r * 0.06, [c * r * 0.18, s * r * 0.18, c * r * 0.74, s * r * 0.74]);
  }
  // Brass studs on the rim
  for (let i = 0; i < 12; i++) {
    const a = rot + ((i + 0.5) * TAU) / 12;
    disc(g, Math.cos(a) * r * 0.82, Math.sin(a) * r * 0.82, r * 0.035, dull ? '#d8c7a0' : C.brassShine);
  }
  // Hub
  cog(g, 0, 0, r * 0.24, rot, dull ? '#c9b48a' : C.brass);
  disc(g, -r * 0.05, -r * 0.05, r * 0.04, C.brassShine);
  g.restore();
}

// ---------- Small people (frames 1, 2, 6) ----------

/** 'clap' (sitting, hands meeting) and 'up' (one arm pointing up) are for the moving scene. */
export type Pose = 'lift' | 'push' | 'carry' | 'sit' | 'point' | 'walk' | 'stand' | 'clap' | 'up';
export type Head = 'bare' | 'puff' | 'wrap' | 'grey' | 'braids';

export interface Folk {
  x: number;
  y: number;
  skin: number;
  top: string;
  low: string;
  head: Head;
  pose: Pose;
  kid?: boolean;
  /** 1 faces right, -1 left. */
  f?: 1 | -1;
  wrap?: string | undefined;
  /** Moving scene only: the step, push or clap cycle in radians. Missing: the still pose. */
  ph?: number | undefined;
}

/** A small person, feet at (x, y), about 18 u tall (a child 13). Drawn simply, with care. */
export function person(g: CanvasRenderingContext2D, p: Folk): void {
  const H = p.kid ? 13 : 18;
  const f = p.f ?? 1;
  const skin = SKIN[p.skin % SKIN.length]!;
  g.save();
  g.translate(p.x, p.y);
  g.scale(f, 1);
  const hip = -H * 0.42;
  const sh = -H * 0.74;
  const lw = H * 0.1;
  // Legs
  const ph = p.ph;
  if (p.pose === 'sit' || p.pose === 'clap') {
    box(g, -3, hip + 1, 7, 2.5, '#8a5d36', INK, 0.5); // stool
    line(g, '#6b4a2b', 1, [-2, hip + 3.5, -2, 0, 3, hip + 3.5, 3, 0]);
    line(g, p.low, lw, [0, hip, 5, hip + 1, 5, 0]);
  } else {
    const st = p.pose === 'walk' ? 2.6 : p.pose === 'push' ? 3 : 1.6;
    // A walk in motion: the legs swing through each other.
    const sw = (p.pose === 'walk' || p.pose === 'carry') && ph !== undefined ? Math.sin(ph) : 1;
    line(g, p.low, lw, [-0.5, hip, -st * sw, 0]);
    line(g, p.low, lw, [0.5, hip, st * sw + (p.pose === 'push' ? -4 : 0), 0]);
  }
  // Body: a robe or shirt, wider at the hem
  g.fillStyle = p.top;
  g.strokeStyle = INK;
  g.lineWidth = 0.6;
  // A push in motion: lean in and out with each shove.
  const lean = p.pose === 'push' ? 2 + (ph !== undefined ? Math.sin(ph) * 0.8 : 0) : 0;
  g.beginPath();
  g.moveTo(-H * 0.12 + lean, sh);
  g.lineTo(H * 0.12 + lean, sh);
  g.lineTo(H * 0.17, hip + 2);
  g.lineTo(-H * 0.17, hip + 2);
  g.closePath();
  g.fill();
  g.stroke();
  if (p.wrap) {
    g.fillStyle = p.wrap;
    g.fillRect(-H * 0.16, hip - 1, H * 0.32, 2);
  }
  // Arms
  const ax = lean;
  const arm = (pts: number[]): void => line(g, skin, H * 0.075, pts);
  const wv = ph !== undefined ? Math.sin(ph) : 0;
  if (p.pose === 'lift') {
    arm([ax - 1.5, sh + 1, ax - 2.5 - wv, sh - 4, ax - 1 - wv * 1.5, sh - 7]);
    arm([ax + 1.5, sh + 1, ax + 3 + wv, sh - 4, ax + 2 + wv * 1.5, sh - 7]);
  } else if (p.pose === 'push') {
    const r = wv * 1.2;
    arm([ax, sh + 1, ax + 4 + r, sh + 1.5, ax + 7 + r, sh]);
    arm([ax, sh + 2.5, ax + 4 + r, sh + 3.5, ax + 7 + r, sh + 2]);
  } else if (p.pose === 'up') {
    arm([ax, sh + 1, ax + 2, sh - 3, ax + 3, sh - 8]);
    arm([ax, sh + 1, ax - 1, sh + 4, ax, sh + 7]);
  } else if (p.pose === 'clap') {
    const c = Math.abs(wv) * 1.6;
    arm([ax, sh + 1, ax + 3, sh + 2, ax + 5 + c, sh - 1]);
    arm([ax, sh + 2, ax + 3.5, sh + 3, ax + 5 - c, sh]);
  } else if (p.pose === 'carry') {
    arm([ax + 1, sh + 1, ax + 3, sh - 3, ax + 1.5, sh - 6.5]);
    arm([ax - 1, sh + 1, ax - 2, sh + 4, ax - 1.5, sh + 7]);
  } else if (p.pose === 'point') {
    arm([ax, sh + 1, ax + 4, sh - 1.5, ax + 7, sh - 3]);
    arm([ax, sh + 1, ax - 1, sh + 4, ax, sh + 7]);
  } else if (p.pose === 'sit') {
    arm([ax, sh + 1, ax + 3, sh + 3, ax + 5, sh + 1]);
  } else {
    const sw = p.pose === 'walk' ? 2.5 * (ph !== undefined ? -Math.sin(ph) : 1) : 0.8;
    arm([ax, sh + 1, ax + sw, sh + 4, ax + sw * 1.2, sh + 7]);
    arm([ax, sh + 1, ax - sw, sh + 4, ax - sw * 1.2, sh + 7]);
  }
  // Head
  const hr = H * 0.13;
  const hy = sh - hr - 0.8;
  line(g, skin, H * 0.08, [ax, sh, ax, sh - 1.2]);
  if (p.head === 'puff') disc(g, ax - 0.4, hy - 0.8, hr * 1.35, '#20140e');
  if (p.head === 'braids') line(g, '#1b1410', 1.1, [ax - hr, hy, ax - hr * 1.4, hy + hr * 2.2]);
  disc(g, ax, hy, hr, skin);
  g.strokeStyle = INK;
  g.lineWidth = 0.5;
  g.beginPath();
  g.arc(ax, hy, hr, 0, TAU);
  g.stroke();
  if (p.head === 'bare' || p.head === 'braids') {
    g.fillStyle = '#1b1410';
    g.beginPath();
    g.arc(ax, hy, hr, Math.PI * 1.05, Math.PI * 1.95);
    g.fill();
  } else if (p.head === 'grey') {
    g.fillStyle = '#d9d6cf';
    g.beginPath();
    g.arc(ax, hy, hr, Math.PI * 1.05, Math.PI * 1.95);
    g.fill();
  } else if (p.head === 'wrap') {
    g.fillStyle = p.wrap ?? '#d6336c';
    g.beginPath();
    g.ellipse(ax - 0.3, hy - hr * 0.7, hr * 1.3, hr * 0.8, -0.2, 0, TAU);
    g.fill();
    g.stroke();
  }
  // Eye: one dot, facing the way they look
  disc(g, ax + hr * 0.45, hy, 0.45, INK);
  g.restore();
}

// ---------- Frame 1: the people make the Wheel ----------

export function palm(g: CanvasRenderingContext2D, x: number, y: number, h: number): void {
  line(g, '#7a5a3a', 2.4, [x, y, x + 2, y - h * 0.5, x + 1, y - h]);
  g.fillStyle = '#3f8f4a';
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i - 2.5) * 0.55;
    g.beginPath();
    g.ellipse(x + 1 + Math.cos(a) * 7, y - h + Math.sin(a) * 4 + 3, 8, 2.2, a, 0, TAU);
    g.fill();
  }
}

export function baobab(g: CanvasRenderingContext2D, x: number, y: number): void {
  g.fillStyle = '#8a6a4a';
  g.beginPath();
  g.moveTo(x - 6, y);
  g.quadraticCurveTo(x - 4, y - 14, x - 3, y - 22);
  g.lineTo(x + 3, y - 22);
  g.quadraticCurveTo(x + 4, y - 14, x + 6, y);
  g.closePath();
  g.fill();
  line(g, '#8a6a4a', 1.6, [x - 2, y - 21, x - 8, y - 28, x + 2, y - 21, x + 7, y - 29, x, y - 22, x, y - 30]);
  g.fillStyle = '#6fa451';
  for (const [dx, dy, r] of [[-9, -30, 5], [0, -33, 6], [8, -30, 5]] as const) disc(g, x + dx, y + dy, r, '#6fa451');
}

function frame1(g: CanvasRenderingContext2D, e: Ext, t: number): void {
  grad(g, e, 0, 120, '#ffb36b', '#fff1c9');
  // The sun rising behind the Wheel
  disc(g, 160, 92, 60, 'rgba(255,236,170,0.45)');
  disc(g, 160, 92, 40, 'rgba(255,224,130,0.6)');
  disc(g, 160, 92, 28, '#ffd34d');
  // Far hills
  g.fillStyle = '#d99a5b';
  g.beginPath();
  g.moveTo(e.l, 122);
  g.quadraticCurveTo(60, 98, 120, 118);
  g.quadraticCurveTo(200, 104, 260, 116);
  g.quadraticCurveTo(300, 104, e.r, 112);
  g.lineTo(e.r, 140);
  g.lineTo(e.l, 140);
  g.fill();
  // Rich land: savanna, a river, rows of crops
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
  // Yams and a basket of brass pins: the land's riches, shared
  for (const [x, y] of [[66, 160], [72, 162], [69, 157]] as const) {
    g.fillStyle = '#9b6b43';
    g.beginPath();
    g.ellipse(x, y, 5, 2.3, 0.3, 0, TAU);
    g.fill();
  }
  // The Wheel, almost done: one spoke still to go in
  drawStoryWheel(g, 160, 96, 44, t * 0.2, 1);
  // People of every age make it together
  const folk: Folk[] = [
    { x: 104, y: 150, skin: 3, top: '#e0572b', low: '#5b3a22', head: 'bare', pose: 'push' },
    { x: 92, y: 152, skin: 1, top: '#2b59c3', low: '#e9e1cf', head: 'wrap', wrap: '#f2b300', pose: 'push' },
    { x: 212, y: 150, skin: 4, top: '#1aa39a', low: '#2f5d8a', head: 'puff', pose: 'push', f: -1 },
    { x: 226, y: 153, skin: 2, top: '#f2b300', low: '#7b2d26', head: 'braids', pose: 'lift', f: -1 },
    { x: 138, y: 152, skin: 0, top: '#9b59b6', low: '#46306f', head: 'bare', pose: 'lift' },
    { x: 182, y: 152, skin: 4, top: '#d6336c', low: '#d6336c', head: 'wrap', wrap: '#a6eadf', pose: 'lift', f: -1 },
    { x: 250, y: 160, skin: 2, top: '#e9e1cf', low: '#e9e1cf', head: 'grey', pose: 'sit', f: -1 },
    { x: 80, y: 164, skin: 3, top: '#f39c12', low: '#2b59c3', head: 'puff', pose: 'carry', kid: true },
    { x: 160, y: 168, skin: 1, top: '#16a3b8', low: '#5b4636', head: 'braids', pose: 'point', kid: true },
  ];
  for (const p of folk) person(g, p);
  // The spoke being lifted into place
  line(g, C.woodDark, 4, [134, 128, 144, 108]);
  line(g, C.woodLight, 2.4, [134, 128, 144, 108]);
  // Basket on the child's head, full of brass pins
  box(g, 76, 145, 9, 4, '#c8964a', INK, 0.5);
  for (let i = 0; i < 3; i++) disc(g, 78 + i * 2.5, 144.5, 1, C.brass);
}

// ---------- Frame 2: Lagos grows ----------

/** A city block. `lit` (0 to 1, moving scene): that share of its windows glow warm, always the same ones. */
export function building(g: CanvasRenderingContext2D, x: number, base: number, w: number, h: number, wall: string, roof: string, crane = false, lit = 0): void {
  box(g, x, base - h, w, h, wall, INK, 0.7);
  g.fillStyle = roof;
  g.fillRect(x - 1, base - h - 2, w + 2, 3);
  g.fillStyle = '#cfe9f5';
  let n = 0;
  for (let yy = base - h + 5; yy < base - 6; yy += 7)
    for (let xx = x + 3; xx < x + w - 4; xx += 6) {
      // A fixed scatter (not random), so the same lit share always lights the same windows.
      g.fillStyle = lit > 0 && ((n++ * 7 + x) % 10) / 10 < lit ? '#ffd86b' : '#cfe9f5';
      g.fillRect(xx, yy, 3, 4);
    }
  if (crane) {
    // Still growing: scaffold and a small crane
    g.strokeStyle = '#d98a1e';
    g.lineWidth = 0.8;
    for (let yy = base - h - 12; yy < base - h; yy += 4) g.strokeRect(x + 2, yy, w - 4, 4);
    line(g, '#d98a1e', 1.4, [x + w - 4, base - h - 12, x + w - 4, base - h - 30, x - 10, base - h - 28]);
    line(g, INK, 0.6, [x - 6, base - h - 28, x - 6, base - h - 20]);
    box(g, x - 8, base - h - 20, 4, 3, '#7d8a96', INK, 0.4);
  }
}

/**
 * Our own bridge into the city over the lagoon (frame 2 and the moving beat 2): a grey asphalt
 * road (130 to 141) with lane marks, a light rail along its far side, a sandy edge under it and
 * piers down into the water, so the road never reads as water. Buses stand on y = 138.
 */
export function bridge(g: CanvasRenderingContext2D, e: Ext): void {
  const l = e.l;
  const w = e.r - e.l;
  // Ripples on the water between the piers
  for (let x = Math.floor(l / 36) * 36 + 10; x < e.r; x += 36) line(g, 'rgba(255,255,255,0.6)', 1, [x, 148 + (x % 72 ? 2 : 0), x + 10, 148 + (x % 72 ? 2 : 0)]);
  // The rail along the far side
  for (let x = Math.ceil(l / 15) * 15; x < e.r; x += 15) box(g, x, 126, 1.6, 4, '#eee7d6', INK, 0.4);
  line(g, '#eee7d6', 1.4, [l, 126.5, e.r, 126.5]);
  line(g, INK, 0.5, [l, 125.6, e.r, 125.6]);
  // The road: grey asphalt and its lane marks
  g.fillStyle = '#77736d';
  g.fillRect(l, 130, w, 11);
  g.fillStyle = '#5f5b56';
  g.fillRect(l, 130, w, 1.5);
  g.fillStyle = '#f4efe2';
  for (let x = Math.floor(l / 24) * 24; x < e.r; x += 24) g.fillRect(x, 135.5, 9, 1.2);
  // The sandy edge of the bridge, then the piers
  g.fillStyle = '#d8c9a8';
  g.fillRect(l, 141, w, 4);
  line(g, INK, 0.6, [l, 141, e.r, 141]);
  line(g, INK, 0.5, [l, 145, e.r, 145]);
  for (let x = Math.ceil(l / 30) * 30; x < e.r; x += 30) box(g, x, 145, 4, 9, '#b9a888', INK, 0.4);
}

function frame2(g: CanvasRenderingContext2D, e: Ext, t: number): void {
  grad(g, e, 0, 130, '#8fd0f2', '#fdf0cf');
  disc(g, 40, 30, 12, '#ffd34d');
  // The lagoon and its far shore
  band(g, e, 124, '#5fb3c9');
  // Lagos growing on the right: some still going up
  const B: [number, number, number, string, boolean][] = [
    [128, 20, 34, '#f0a35e', false], [150, 18, 50, '#9fb6e8', true], [170, 24, 40, '#7fc4a4', false],
    [196, 16, 64, '#f2d06b', false], [214, 22, 46, '#e58b8b', true], [238, 18, 56, '#d7a6d9', false],
    [258, 26, 38, '#b7d77a', false], [286, 18, 52, '#e7b98a', true],
  ];
  for (const [x, w, h, wall, cr] of B) building(g, x, 124, w, h, wall, '#5b4636', cr);
  bridge(g, e);
  // Buses and people coming in, welcome
  for (const [x, s] of [[150, 0.3], [220, 0.3]] as const) {
    g.save();
    g.translate(x, 138);
    g.scale(s, s);
    drawBusShape(g, 0, 0, 0);
    g.restore();
  }
  // Pavement in front
  band(g, e, 154, '#e9d8b4');
  const folk: Folk[] = [
    { x: 150, y: 172, skin: 4, top: '#2b59c3', low: '#1d1a14', head: 'bare', pose: 'walk' },
    { x: 166, y: 173, skin: 1, top: '#e0572b', low: '#2b59c3', head: 'wrap', wrap: '#f2b300', pose: 'carry' },
    { x: 182, y: 172, skin: 2, top: '#7fc4a4', low: '#46306f', head: 'braids', pose: 'walk', kid: true },
    { x: 198, y: 173, skin: 3, top: '#e9e1cf', low: '#e9e1cf', head: 'grey', pose: 'walk' },
    { x: 230, y: 172, skin: 0, top: '#9b59b6', low: '#5b4636', head: 'puff', pose: 'walk' },
  ];
  for (const p of folk) person(g, p);
  box(g, 163, 148.5, 7, 4, '#c8964a', INK, 0.5); // bag on a head
  // The Wheel turning on the left, with turn marks
  drawStoryWheel(g, 66, 84, 42, t * 0.5);
  g.strokeStyle = 'rgba(29,26,20,0.45)';
  g.lineWidth = 1.6;
  g.lineCap = 'round';
  for (const a of [-2.4, -0.4, 1.4]) {
    g.beginPath();
    g.arc(66, 84, 50, a, a + 0.7);
    g.stroke();
  }
}

// ---------- Frame 3: Nigeria's Wheel ----------

/**
 * Nigeria's outline, longitude and latitude, clockwise from the west end of the coast (our own
 * simple drawing): up the Benin side, along the Niger side to the Lake Chad corner, down the
 * Cameroon side with its eastern bulge, then the coast with the Niger Delta.
 */
const NIGERIA: readonly (readonly [number, number])[] = [
  [2.7, 6.37], [2.72, 7.0], [2.75, 7.85], [2.78, 9.05], [3.1, 9.45], [3.6, 10.3], [3.83, 10.7], [3.6, 11.7],
  [3.65, 12.5], [4.1, 13.15], [4.25, 13.48], [5.0, 13.75], [5.6, 13.87], [6.3, 13.65], [6.8, 13.25],
  [7.4, 13.1], [7.85, 13.33], [8.6, 13.0], [9.6, 12.8], [10.15, 13.25], [10.7, 13.35], [11.5, 13.35],
  [12.3, 13.1], [12.9, 13.5], [13.63, 13.71], [14.07, 13.08], [14.17, 12.38], [14.65, 12.18], [14.62, 11.55],
  [14.2, 11.25], [13.65, 10.6], [13.25, 10.05], [13.2, 9.6], [12.85, 8.75], [12.45, 8.6], [12.25, 8.4],
  [12.05, 7.75], [11.85, 7.1], [11.55, 6.85], [11.1, 6.45], [10.6, 7.0], [10.15, 6.95], [9.8, 6.8],
  [9.35, 6.35], [8.8, 5.7], [8.6, 4.9], [8.5, 4.6], [7.6, 4.45], [7.0, 4.4], [6.5, 4.3], [6.05, 4.28],
  [5.6, 4.62], [5.36, 5.35], [5.0, 5.75], [4.6, 6.15], [4.1, 6.4], [3.4, 6.42],
];

/** Frame 3's map: k frame units a degree, west edge at x 64, north edge at y 14. */
const MAP_K = 16;
export const toFrame = ([lon, lat]: readonly [number, number]): [number, number] => [64 + (lon - 2.7) * MAP_K, 14 + (13.9 - lat) * MAP_K];
/** The outline in frame-3 units (320 x 180). */
export const NIGERIA_OUTLINE: readonly (readonly [number, number])[] = NIGERIA.map(toFrame);
/** Where the big Wheel sits on the map (the middle of the land) and its size. */
export const MAP_WHEEL = { x: 64 + (8.7 - 2.7) * MAP_K, y: 14 + (13.9 - 9.2) * MAP_K, r: 27 } as const;

/** The national colours: green and white. */
export const NG_GREEN = '#008751';
export const NG_WHITE = '#ffffff';

/** One border cog: centre, size, turn way (+1 or -1) and start angle so neighbours' teeth mesh. */
export interface BorderCog {
  x: number;
  y: number;
  r: number;
  dir: 1 | -1;
  phase: number;
}
export const BORDER_COG_R = 4.4;
const COG_TEETH = 8;

/** Distance from (px, py) to the outline, and the nearest point on it. */
export function nearestOnOutline(px: number, py: number): { d: number; x: number; y: number } {
  const P = NIGERIA_OUTLINE;
  let best = { d: Infinity, x: px, y: py };
  for (let i = 0; i < P.length; i++) {
    const [ax, ay] = P[i]!;
    const [bx, by] = P[(i + 1) % P.length]!;
    const vx = bx - ax;
    const vy = by - ay;
    const u = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy)));
    const x = ax + u * vx;
    const y = ay + u * vy;
    const d = Math.hypot(px - x, py - y);
    if (d < best.d) best = { d, x, y };
  }
  return best;
}

/** True when (x, y) is inside the outline. */
export function insideNigeria(x: number, y: number): boolean {
  const P = NIGERIA_OUTLINE;
  let inside = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [xi, yi] = P[i]!;
    const [xj, yj] = P[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Moves (x, y) until it is inside the outline and at least r from it. */
function pullIn(x: number, y: number, r: number): [number, number] {
  for (let k = 0; k < 16; k++) {
    const n = nearestOnOutline(x, y);
    const inside = insideNigeria(x, y);
    if (inside && n.d >= r) break;
    const dx = (x - n.x) / (n.d || 1);
    const dy = (y - n.y) / (n.d || 1);
    const push = inside ? r - n.d + 0.02 : -(r + n.d + 0.02);
    x += dx * push;
    y += dy * push;
  }
  return [x, y];
}

/** The track the cog centres run on: the outline pulled in by one cog size, in small steps. */
function cogTrack(r: number): [number, number][] {
  const P = NIGERIA_OUTLINE;
  let out: [number, number][] = [];
  for (let i = 0; i < P.length; i++) {
    const [ax, ay] = P[i]!;
    const [bx, by] = P[(i + 1) % P.length]!;
    const len = Math.hypot(bx - ax, by - ay);
    const steps = Math.max(1, Math.ceil(len / 0.5));
    // Clockwise on screen (y down): the land is to the right of the way we walk.
    const nx = -(by - ay) / len;
    const ny = (bx - ax) / len;
    for (let s = 0; s < steps; s++) out.push(pullIn(ax + ((bx - ax) * s) / steps + nx * r, ay + ((by - ay) * s) / steps + ny * r, r));
  }
  // Fill any jumps (round inside corners) with more pulled-in points
  for (let pass = 0; pass < 4; pass++) {
    const next: [number, number][] = [];
    out.forEach((p, i) => {
      const q = out[(i + 1) % out.length]!;
      next.push(p);
      if (Math.hypot(q[0] - p[0], q[1] - p[1]) > 0.6) next.push(pullIn((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, r));
    });
    out = next;
  }
  return out;
}

/** Cogs along the track, each exactly `gap` from the one before. */
function placeCogs(track: readonly [number, number][], gap: number): [number, number][] {
  const out: [number, number][] = [track[0]!];
  for (let i = 1; i < track.length; i++) {
    const [lx, ly] = out[out.length - 1]!;
    const [ax, ay] = track[i - 1]!;
    const [bx, by] = track[i]!;
    if (Math.hypot(bx - lx, by - ly) < gap) continue;
    // Where the step from a to b crosses the circle of size gap round the last cog
    let lo = 0;
    let hi = 1;
    for (let k = 0; k < 20; k++) {
      const m = (lo + hi) / 2;
      if (Math.hypot(ax + (bx - ax) * m - lx, ay + (by - ay) * m - ly) < gap) lo = m;
      else hi = m;
    }
    out.push([ax + (bx - ax) * hi, ay + (by - ay) * hi]);
    i--; // the same step may hold another cog
  }
  return out;
}

let cogCache: BorderCog[] | null = null;

/**
 * The chain of small cogs that makes Nigeria's border: every cog inside the outline (its teeth
 * touch the line), each touching the next, an even number so neighbours always turn opposite
 * ways. Worked out once.
 */
export function borderCogs(): readonly BorderCog[] {
  if (cogCache) return cogCache;
  const r = BORDER_COG_R;
  const track = cogTrack(r);
  let best: [number, number][] = [];
  let bestErr = Infinity;
  for (let gap = 1.72 * r; gap <= 1.92 * r; gap += 0.002 * r) {
    const pts = placeCogs(track, gap).map(([x, y]) => pullIn(x, y, r));
    if (pts.length % 2 === 1) continue;
    const a = pts[0]!;
    const b = pts[pts.length - 1]!;
    const err = Math.abs(Math.hypot(a[0] - b[0], a[1] - b[1]) - gap);
    if (err < bestErr) {
      bestErr = err;
      best = pts;
    }
  }
  const half = Math.PI / COG_TEETH;
  const cogs: BorderCog[] = [];
  best.forEach(([x, y], i) => {
    let phase = 0;
    if (i > 0) {
      // Mesh with the cog before: its tooth sits in a gap of ours, and stays there as both turn.
      const p = cogs[i - 1]!;
      const along = Math.atan2(y - p.y, x - p.x);
      phase = 2 * along + Math.PI - p.phase + half;
    }
    cogs.push({ x, y, r, dir: i % 2 === 0 ? 1 : -1, phase });
  });
  cogCache = cogs;
  return cogs;
}

export function nigeriaPath(g: CanvasRenderingContext2D): void {
  g.beginPath();
  NIGERIA_OUTLINE.forEach(([x, y], i) => (i === 0 ? g.moveTo(x, y) : g.lineTo(x, y)));
  g.closePath();
}

function frame3(g: CanvasRenderingContext2D, e: Ext, t: number): void {
  grad(g, e, 0, 180, '#bfe6f5', '#fff4d9');
  // Soft light behind the map
  disc(g, 160, 92, 84, 'rgba(255,236,170,0.5)');
  // Lake Chad, just past the north-east corner (water, so no cogs)
  g.fillStyle = '#7cc6e4';
  g.beginPath();
  g.ellipse(64 + (14.15 - 2.7) * MAP_K, 14 + (13.9 - 13.35) * MAP_K, 8, 6, -0.4, 0, TAU);
  g.fill();
  g.save();
  g.translate(2, 3);
  nigeriaPath(g);
  g.fillStyle = 'rgba(29,26,20,0.15)';
  g.fill();
  g.restore();
  // The land in the national colours: green, white, green, side by side
  g.save();
  nigeriaPath(g);
  g.clip();
  g.fillStyle = NG_GREEN;
  g.fillRect(60, 10, 200, 165);
  g.fillStyle = NG_WHITE;
  g.fillRect(64 + 64, 10, 64, 165);
  g.restore();
  nigeriaPath(g);
  g.strokeStyle = '#1d4a2c';
  g.lineWidth = 1.2;
  g.lineJoin = 'round';
  g.stroke();
  // The border: a chain of small cogs, each turning its neighbours the opposite way
  for (const c of borderCogs()) cog(g, c.x, c.y, c.r, c.phase + c.dir * t * 0.6);
  drawStoryWheel(g, MAP_WHEEL.x, MAP_WHEEL.y, MAP_WHEEL.r, t * 0.4);
}

// ---------- Frame 4: the Stoppers ----------

/** A grumpy pout: two eyes with low brows and a pushed-out lip. On things only. */
/** A Stopper's brow: a soft, low arch that dips only a little at the middle, grumpy-silly, not cross. */
function brow(g: CanvasRenderingContext2D, x: number, y: number, s: number, d: number): void {
  g.strokeStyle = INK;
  g.lineWidth = 1.1 * s;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x + d * 6.8 * s, y - 3.4 * s);
  g.quadraticCurveTo(x + d * 4.4 * s, y - 4.8 * s, x + d * 1.5 * s, y - 2.9 * s);
  g.stroke();
}

function pout(g: CanvasRenderingContext2D, x: number, y: number, s: number, blink = false): void {
  for (const d of [-1, 1]) {
    if (blink) {
      // Eyes shut tight for a blink: a short line under the brow.
      line(g, INK, 0.9 * s, [x + d * 6 * s, y, x + d * 2 * s, y + 0.6 * s]);
      brow(g, x, y, s, d);
      continue;
    }
    disc(g, x + d * 4 * s, y, 2.6 * s, '#ffffff');
    g.strokeStyle = INK;
    g.lineWidth = 0.6 * s;
    g.beginPath();
    g.arc(x + d * 4 * s, y, 2.6 * s, 0, TAU);
    g.stroke();
    disc(g, x + d * 4 * s + 0.5 * s, y + 0.8 * s, 1.2 * s, INK);
    brow(g, x, y, s, d);
  }
  g.fillStyle = '#7a4a4a';
  g.beginPath();
  g.ellipse(x, y + 5.5 * s, 2.6 * s, 1.5 * s, 0, 0, TAU);
  g.fill();
  line(g, INK, 0.8 * s, [x - 3 * s, y + 6 * s, x, y + 4.6 * s, x + 3 * s, y + 6 * s]);
}

function car(g: CanvasRenderingContext2D, x: number, y: number, body: string, f: 1 | -1 = 1): void {
  g.save();
  g.translate(x, y);
  g.scale(f, 1);
  g.fillStyle = body;
  g.strokeStyle = INK;
  g.lineWidth = 0.8;
  g.beginPath();
  g.roundRect(-16, -10, 32, 8, 3);
  g.fill();
  g.stroke();
  g.beginPath();
  g.roundRect(-9, -16, 18, 7, 3);
  g.fill();
  g.stroke();
  g.fillStyle = '#bfe3f5';
  g.fillRect(-7, -14.5, 6, 4.5);
  g.fillRect(1, -14.5, 6, 4.5);
  disc(g, -9, -2, 3, '#222222');
  disc(g, 9, -2, 3, '#222222');
  g.restore();
}

/** The four Stoppers, each a thing with a grumpy pout. Exported so other screens can reuse them. */
export type StopperKind = 'jam' | 'pothole' | 'darkLamp' | 'redTape';
export const STOPPERS: readonly StopperKind[] = ['jam', 'pothole', 'darkLamp', 'redTape'];

/** One Stopper, standing on (x, y), about 40 u tall at s = 1. */
export function drawStopper(g: CanvasRenderingContext2D, kind: StopperKind, x: number, y: number, s = 1, blink = false): void {
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  if (kind === 'jam') {
    car(g, -12, -14, '#2b59c3', -1);
    car(g, 12, -14, '#2fa36b');
    car(g, 0, 0, '#e0572b');
    // Smoke puffs of honking
    disc(g, -22, -30, 4, 'rgba(160,160,170,0.7)');
    disc(g, -27, -34, 3, 'rgba(160,160,170,0.6)');
    pout(g, 0, -7, 0.7, blink);
  } else if (kind === 'pothole') {
    g.fillStyle = '#5c4a38';
    g.beginPath();
    g.ellipse(0, -4, 22, 7, 0, 0, TAU);
    g.fill();
    g.fillStyle = '#2a1f17';
    g.beginPath();
    g.ellipse(0, -4, 18, 5.2, 0, 0, TAU);
    g.fill();
    line(g, '#2a1f17', 1, [-22, -4, -28, -1, 22, -4, 29, -7]);
    // Eyes peeking up from the hole
    pout(g, 0, -10, 0.8, blink);
  } else if (kind === 'darkLamp') {
    line(g, '#5d6670', 3, [0, 0, 0, -36, 4, -42, 12, -42]);
    g.fillStyle = '#4a4a4a';
    g.beginPath();
    g.roundRect(6, -44, 14, 6, 2);
    g.fill();
    g.fillStyle = '#2b2f36';
    g.beginPath();
    g.ellipse(13, -37.5, 6, 2, 0, 0, TAU);
    g.fill();
    pout(g, 0, -22, 0.75, blink);
  } else {
    // A stack of forms tied round and round with red tape
    for (let i = 0; i < 6; i++) box(g, -13 + (i % 2) * 1.5, -6 - i * 6, 26, 6, i % 2 ? '#fdf6e3' : '#efe6cf', INK, 0.5);
    line(g, '#c0392b', 2, [-12, -8, 12, -30]);
    line(g, '#c0392b', 2, [-12, -30, 12, -10]);
    line(g, '#c0392b', 1.4, [12, -10, 18, -4, 15, 0]);
    pout(g, 0, -20, 0.75, blink);
  }
  g.restore();
}

function frame4(g: CanvasRenderingContext2D, e: Ext, t: number): void {
  grad(g, e, 0, 180, '#b9b3cf', '#efe3cf');
  // The Wheel at the back, stuck
  drawStoryWheel(g, 160, 76, 44, 0.25 + Math.sin(t * 3) * 0.01, 0, true);
  // A wooden wedge jammed into its teeth
  g.fillStyle = '#6b4a2b';
  g.beginPath();
  g.moveTo(150, 124);
  g.lineTo(178, 124);
  g.lineTo(166, 114);
  g.closePath();
  g.fill();
  band(g, e, 132, '#cdbf9f');
  line(g, '#a8987a', 1, [e.l, 132, e.r, 132]);
  drawStopper(g, 'jam', 50, 166, 1.55);
  drawStopper(g, 'pothole', 126, 170, 1.4);
  drawStopper(g, 'darkLamp', 192, 168, 1.5);
  drawStopper(g, 'redTape', 268, 166, 1.5);
}

// ---------- Frame 5: the Wheel Hero ----------

/** The outline hero in motion (moving scene): a step cycle in radians, or a push (0 to 1). */
export interface OutlinePose {
  step?: number;
  push?: number;
  /** Seconds, for a gentle breath while standing. */
  breathe?: number;
}

/** A plain outline hero (no look chosen yet), feet at (0, 0), about 50 u tall like drawHero. */
export function drawOutlineHero(g: CanvasRenderingContext2D, pose?: OutlinePose): void {
  if (pose) {
    movingOutlineHero(g, pose);
    return;
  }
  g.fillStyle = '#fff8e6';
  g.strokeStyle = INK;
  g.lineWidth = 1.6;
  g.lineJoin = 'round';
  g.beginPath();
  g.arc(0, -43, 7, 0, TAU);
  g.moveTo(-8, -33);
  g.quadraticCurveTo(0, -36, 8, -33);
  g.lineTo(10, -14);
  g.lineTo(5, -14);
  g.lineTo(5, 0);
  g.lineTo(1, 0);
  g.lineTo(0, -12);
  g.lineTo(-1, 0);
  g.lineTo(-5, 0);
  g.lineTo(-5, -14);
  g.lineTo(-10, -14);
  g.closePath();
  g.fill();
  g.stroke();
}

/** The same plain cream-and-ink hero, built from parts so the legs walk and the arms push. */
function movingOutlineHero(g: CanvasRenderingContext2D, pose: OutlinePose): void {
  const step = pose.step !== undefined && Number.isFinite(pose.step) ? pose.step : null;
  const push = pose.push !== undefined && Number.isFinite(pose.push) ? Math.max(0, Math.min(1, pose.push)) : 0;
  const br = pose.breathe !== undefined && Number.isFinite(pose.breathe) ? Math.sin(pose.breathe * 2.2) * 0.5 : 0;
  const cream = '#fff8e6';
  // A limb: an ink line with a cream line inside it.
  const limbs = (w: number, pts: number[][]): void => {
    for (const [c, lw] of [[INK, w + 3.2], [cream, w]] as const) for (const q of pts) line(g, c, lw, q);
  };
  const sw = step !== null ? Math.sin(step) * 5 : 0;
  const lift = step !== null ? Math.max(0, Math.cos(step)) * 1.2 : 0;
  // Legs, the back one braced behind in a push
  limbs(3.6, [
    [-2, -14, -2 - sw - push * 5, -1 - (sw > 0 ? 0 : lift)],
    [2, -14, 2 + sw - push * 1, -1 - (sw < 0 ? 0 : lift)],
  ]);
  g.save();
  g.translate(0, br - lift * 0.4);
  g.rotate(push * 0.28);
  g.fillStyle = cream;
  g.strokeStyle = INK;
  g.lineWidth = 1.6;
  g.lineJoin = 'round';
  // Body
  g.beginPath();
  g.moveTo(-8, -33);
  g.quadraticCurveTo(0, -36, 8, -33);
  g.lineTo(9, -14);
  g.lineTo(-9, -14);
  g.closePath();
  g.fill();
  g.stroke();
  g.beginPath();
  g.arc(0, -43, 7, 0, TAU);
  g.fill();
  g.stroke();
  // Arms: swinging at the sides, or out in front and pressing
  const reach = push > 0 ? push : 0;
  const swing = step !== null ? Math.sin(step) * 4 : 0;
  const hand = (side: number): number[] => [
    side * 2,
    -31,
    side * 2 + (-side * swing * (1 - reach)) + reach * 13,
    -16 - reach * 12 + reach * side * 2,
  ];
  limbs(2.6, [hand(-1), hand(1)]);
  g.restore();
}

function frame5(g: CanvasRenderingContext2D, e: Ext, t: number, look: HeroLook | null): void {
  grad(g, e, 0, 180, '#ffcf7a', '#fff6dc');
  // Warm light round the Wheel
  disc(g, 160, 74, 80, 'rgba(255,240,190,0.55)');
  disc(g, 160, 74, 64, 'rgba(255,226,140,0.55)');
  drawStoryWheel(g, 160, 74, 58, t * 0.3);
  band(g, e, 150, '#e9c98a');
  g.fillStyle = 'rgba(29,26,20,0.18)';
  g.beginPath();
  g.ellipse(160, 166, 26, 4, 0, 0, TAU);
  g.fill();
  g.save();
  g.translate(160, 166);
  g.scale(2.1, 2.1);
  if (look) drawHero(g, look, { phase: 0, inAir: false, facing: 1, glow: false, standing: true, time: t });
  else drawOutlineHero(g);
  g.restore();
}

// ---------- Frame 6: the journey starts at a Lagos bus stop ----------

function frame6(g: CanvasRenderingContext2D, e: Ext): void {
  grad(g, e, 0, 130, '#6fc2f0', '#fbe6b4');
  disc(g, 270, 40, 22, 'rgba(255,233,160,0.6)');
  disc(g, 270, 40, 14, '#ffd34d');
  // Far city, pale so the bus reads first
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
  // Pavement and road
  band(g, e, 120, '#d9cbb0');
  band(g, e, 150, '#3e3e42');
  g.fillStyle = '#f4f1e6';
  for (let x = Math.floor(e.l / 30) * 30; x < e.r; x += 30) g.fillRect(x, 164, 14, 2);
  g.fillStyle = '#d8c27a';
  g.fillRect(e.l, 150, e.r - e.l, 2);
  // The bus stop and a yellow bus, our own drawings from the street
  g.save();
  g.translate(78, 152);
  g.scale(0.85, 0.85);
  drawBusStop(g, 0, true, 0, 0, false);
  g.restore();
  g.save();
  g.translate(212, 150);
  g.scale(1.05, 1.05);
  drawBusShape(g, 0, 0, 0, true);
  g.restore();
  // People waiting, ready to go
  const folk: Folk[] = [
    { x: 66, y: 150, skin: 4, top: '#2f5d8a', low: '#e9e1cf', head: 'bare', pose: 'stand' },
    { x: 86, y: 150, skin: 2, top: '#e0572b', low: '#2b59c3', head: 'wrap', wrap: '#2b59c3', pose: 'stand', f: -1 },
    { x: 104, y: 150, skin: 0, top: '#f2b300', low: '#7b2d26', head: 'puff', pose: 'point', kid: true },
    { x: 146, y: 150, skin: 3, top: '#9b59b6', low: '#46306f', head: 'braids', pose: 'walk' },
  ];
  for (const p of folk) person(g, p);
}

// ---------- The frame call ----------

/**
 * Draws intro frame `frame` (1 to 6) to fill w x h. Leaves the context as it found it.
 * A frame number out of range draws frame 1 or 6.
 */
export function drawIntroFrame(g: CanvasRenderingContext2D, frame: number, w: number, h: number, opts: IntroOptions = {}): void {
  const n = Number.isFinite(frame) ? Math.min(INTRO_FRAMES, Math.max(1, Math.round(frame))) : 1;
  const t = opts.time !== undefined && Number.isFinite(opts.time) ? opts.time : 0;
  const W = w > 0 && Number.isFinite(w) ? w : INTRO_VIEW.w;
  const H = h > 0 && Number.isFinite(h) ? h : INTRO_VIEW.h;
  const s = Math.min(W / INTRO_VIEW.w, H / INTRO_VIEW.h);
  const ox = (W - INTRO_VIEW.w * s) / 2;
  const oy = (H - INTRO_VIEW.h * s) / 2;
  const e: Ext = { l: -ox / s - 1, r: INTRO_VIEW.w + ox / s + 1, t: -oy / s - 1, b: INTRO_VIEW.h + oy / s + 1 };
  g.save();
  g.beginPath();
  g.rect(0, 0, W, H);
  g.clip();
  g.translate(ox, oy);
  g.scale(s, s);
  if (n === 1) frame1(g, e, t);
  else if (n === 2) frame2(g, e, t);
  else if (n === 3) frame3(g, e, t);
  else if (n === 4) frame4(g, e, t);
  else if (n === 5) frame5(g, e, t, opts.look ?? null);
  else frame6(g, e);
  g.restore();
}
