/**
 * The intro story (docs/city.md part 5 (a), slice 3 step S3a1): six still frames drawn in
 * code, in our own warm style. The captions are real HTML text under the picture (gamedev);
 * nothing here writes the story words.
 *
 * 1. Sunrise over West African land: its people, of every age, make the Wheel together.
 *    The people are the makers; nobody arrives from outside.
 * 2. The Wheel turns and Lagos grows: new buildings, yellow buses and people coming in.
 * 3. The Wheel at the centre of a Nigeria shape, small cogs turning round it.
 * 4. The Stoppers: made-up problem shapes (a jam of cars, a pothole, a dark lamp, a stack of
 *    forms in red tape), each with a grumpy pout. Things, never people, never any group.
 * 5. The player's own hero in front of the glowing Wheel (a plain outline hero if none yet).
 * 6. A yellow bus at a Lagos bus stop in the morning.
 *
 * No faith signs, flags, crests, party colours, real places drawn to look real, or real people.
 * The Wheel has six wooden spokes, a brass hub and brass teeth; no symbol on it.
 *
 * drawIntroFrame fills a w x h area (canvas units): the sky and ground stretch to the edges,
 * and the 320 x 180 picture sits in the middle, as big as fits. Still pictures: `time` only
 * turns the Wheel and its cogs gently; pass 0 (or nothing) for reduced motion.
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
interface Ext {
  l: number;
  r: number;
  t: number;
  b: number;
}

function grad(g: CanvasRenderingContext2D, e: Ext, y0: number, y1: number, top: string, bottom: string): void {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  gr.addColorStop(0, top);
  gr.addColorStop(1, bottom);
  g.fillStyle = gr;
  g.fillRect(e.l, Math.min(e.t, y0), e.r - e.l, Math.max(y1, e.b) - Math.min(e.t, y0));
}

function band(g: CanvasRenderingContext2D, e: Ext, y: number, colour: string): void {
  g.fillStyle = colour;
  g.fillRect(e.l, y, e.r - e.l, e.b - y);
}

function disc(g: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string): void {
  g.fillStyle = fill;
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fill();
}

function line(g: CanvasRenderingContext2D, colour: string, w: number, pts: readonly number[]): void {
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

function box(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, edge = INK, ew = 0.8): void {
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

type Pose = 'lift' | 'push' | 'carry' | 'sit' | 'point' | 'walk' | 'stand';
type Head = 'bare' | 'puff' | 'wrap' | 'grey' | 'braids';

interface Folk {
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
  wrap?: string;
}

/** A small person, feet at (x, y), about 18 u tall (a child 13). Drawn simply, with care. */
function person(g: CanvasRenderingContext2D, p: Folk): void {
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
  if (p.pose === 'sit') {
    box(g, -3, hip + 1, 7, 2.5, '#8a5d36', INK, 0.5); // stool
    line(g, '#6b4a2b', 1, [-2, hip + 3.5, -2, 0, 3, hip + 3.5, 3, 0]);
    line(g, p.low, lw, [0, hip, 5, hip + 1, 5, 0]);
  } else {
    const st = p.pose === 'walk' ? 2.6 : p.pose === 'push' ? 3 : 1.6;
    line(g, p.low, lw, [-0.5, hip, -st, 0]);
    line(g, p.low, lw, [0.5, hip, st + (p.pose === 'push' ? -4 : 0), 0]);
  }
  // Body: a robe or shirt, wider at the hem
  g.fillStyle = p.top;
  g.strokeStyle = INK;
  g.lineWidth = 0.6;
  const lean = p.pose === 'push' ? 2 : 0;
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
  if (p.pose === 'lift') {
    arm([ax - 1.5, sh + 1, ax - 2.5, sh - 4, ax - 1, sh - 7]);
    arm([ax + 1.5, sh + 1, ax + 3, sh - 4, ax + 2, sh - 7]);
  } else if (p.pose === 'push') {
    arm([ax, sh + 1, ax + 4, sh + 1.5, ax + 7, sh]);
    arm([ax, sh + 2.5, ax + 4, sh + 3.5, ax + 7, sh + 2]);
  } else if (p.pose === 'carry') {
    arm([ax + 1, sh + 1, ax + 3, sh - 3, ax + 1.5, sh - 6.5]);
    arm([ax - 1, sh + 1, ax - 2, sh + 4, ax - 1.5, sh + 7]);
  } else if (p.pose === 'point') {
    arm([ax, sh + 1, ax + 4, sh - 1.5, ax + 7, sh - 3]);
    arm([ax, sh + 1, ax - 1, sh + 4, ax, sh + 7]);
  } else if (p.pose === 'sit') {
    arm([ax, sh + 1, ax + 3, sh + 3, ax + 5, sh + 1]);
  } else {
    const sw = p.pose === 'walk' ? 2.5 : 0.8;
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

function palm(g: CanvasRenderingContext2D, x: number, y: number, h: number): void {
  line(g, '#7a5a3a', 2.4, [x, y, x + 2, y - h * 0.5, x + 1, y - h]);
  g.fillStyle = '#3f8f4a';
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i - 2.5) * 0.55;
    g.beginPath();
    g.ellipse(x + 1 + Math.cos(a) * 7, y - h + Math.sin(a) * 4 + 3, 8, 2.2, a, 0, TAU);
    g.fill();
  }
}

function baobab(g: CanvasRenderingContext2D, x: number, y: number): void {
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

function building(g: CanvasRenderingContext2D, x: number, base: number, w: number, h: number, wall: string, roof: string, crane = false): void {
  box(g, x, base - h, w, h, wall, INK, 0.7);
  g.fillStyle = roof;
  g.fillRect(x - 1, base - h - 2, w + 2, 3);
  g.fillStyle = '#cfe9f5';
  for (let yy = base - h + 5; yy < base - 6; yy += 7) for (let xx = x + 3; xx < x + w - 4; xx += 6) g.fillRect(xx, yy, 3, 4);
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

function frame2(g: CanvasRenderingContext2D, e: Ext, t: number): void {
  grad(g, e, 0, 130, '#8fd0f2', '#fdf0cf');
  disc(g, 40, 30, 12, '#ffd34d');
  // The lagoon and its far shore
  band(g, e, 124, '#5fb3c9');
  g.strokeStyle = 'rgba(255,255,255,0.6)';
  g.lineWidth = 1;
  for (let i = 0; i < 6; i++) line(g, 'rgba(255,255,255,0.6)', 1, [100 + i * 36, 130 + (i % 2) * 4, 112 + i * 36, 130 + (i % 2) * 4]);
  // Lagos growing on the right: some still going up
  const B: [number, number, number, string, boolean][] = [
    [128, 20, 34, '#f0a35e', false], [150, 18, 50, '#9fb6e8', true], [170, 24, 40, '#7fc4a4', false],
    [196, 16, 64, '#f2d06b', false], [214, 22, 46, '#e58b8b', true], [238, 18, 56, '#d7a6d9', false],
    [258, 26, 38, '#b7d77a', false], [286, 18, 52, '#e7b98a', true],
  ];
  for (const [x, w, h, wall, cr] of B) building(g, x, 124, w, h, wall, '#5b4636', cr);
  // Our own bridge into the city
  g.fillStyle = '#d8c9a8';
  g.fillRect(e.l, 138, e.r - e.l, 6);
  for (let x = Math.ceil(e.l / 30) * 30; x < e.r; x += 30) box(g, x, 144, 4, 10, '#b9a888', INK, 0.4);
  line(g, INK, 0.6, [e.l, 138, e.r, 138]);
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

/** A simple Nigeria outline, longitude and latitude, west coast first (drawn our own way). */
const NIGERIA: readonly (readonly [number, number])[] = [
  [2.7, 6.4], [2.75, 7.9], [2.8, 9.1], [3.6, 10.3], [3.6, 11.7], [4.1, 13.5], [5.3, 13.8], [6.5, 13.5],
  [7.8, 13.3], [9.0, 12.8], [10.6, 13.3], [12.4, 13.1], [13.6, 13.7], [14.2, 12.9], [14.6, 12.0],
  [14.2, 11.0], [13.6, 10.2], [13.2, 9.0], [12.6, 8.6], [12.2, 8.0], [11.8, 7.1], [11.1, 6.6], [10.6, 7.0],
  [10.1, 6.9], [9.6, 6.5], [9.2, 6.2], [8.8, 5.6], [8.5, 4.6], [7.5, 4.45], [6.2, 4.3], [5.6, 4.9],
  [5.0, 5.6], [4.4, 6.3], [3.4, 6.4],
];

/** The outline in frame units: k units a degree, top left of the box at (x0, y0). */
function nigeriaPath(g: CanvasRenderingContext2D, x0: number, y0: number, k: number): void {
  g.beginPath();
  NIGERIA.forEach(([lon, lat], i) => {
    const x = x0 + (lon - 2.6) * k;
    const y = y0 + (13.9 - lat) * k;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  });
  g.closePath();
}

function frame3(g: CanvasRenderingContext2D, e: Ext, t: number): void {
  grad(g, e, 0, 180, '#bfe6f5', '#fff4d9');
  // Soft light behind the map
  disc(g, 160, 92, 80, 'rgba(255,236,170,0.5)');
  const k = 15.5;
  const x0 = 160 - (12.1 * k) / 2;
  const y0 = 92 - (9.6 * k) / 2;
  g.save();
  g.translate(2, 3);
  nigeriaPath(g, x0, y0, k);
  g.fillStyle = 'rgba(29,26,20,0.15)';
  g.fill();
  g.restore();
  nigeriaPath(g, x0, y0, k);
  g.fillStyle = '#f3d9a4';
  g.fill();
  g.strokeStyle = '#b9893f';
  g.lineWidth = 2;
  g.stroke();
  // Small cogs round the map, each joined to the Wheel and turning with it
  const cx = 160;
  const cy = 94;
  const cogs: [number, number][] = [
    [96, 128], [104, 76], [134, 42], [190, 40], [232, 56], [238, 98], [204, 140], [150, 146], [120, 104], [210, 112],
  ];
  for (const [x, y] of cogs) line(g, 'rgba(154,106,18,0.55)', 1.2, [cx, cy, x, y]);
  cogs.forEach(([x, y], i) => cog(g, x, y, 6, (i % 2 ? -1 : 1) * t * 1.2 + i));
  drawStoryWheel(g, cx, cy, 30, t * 0.4);
}

// ---------- Frame 4: the Stoppers ----------

/** A grumpy pout: two eyes with low brows and a pushed-out lip. On things only. */
function pout(g: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  for (const d of [-1, 1]) {
    disc(g, x + d * 4 * s, y, 2.6 * s, '#ffffff');
    g.strokeStyle = INK;
    g.lineWidth = 0.6 * s;
    g.beginPath();
    g.arc(x + d * 4 * s, y, 2.6 * s, 0, TAU);
    g.stroke();
    disc(g, x + d * 4 * s + 0.5 * s, y + 0.8 * s, 1.2 * s, INK);
    line(g, INK, 1.1 * s, [x + d * 6.8 * s, y - 3.6 * s, x + d * 1.4 * s, y - 2 * s]);
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
export function drawStopper(g: CanvasRenderingContext2D, kind: StopperKind, x: number, y: number, s = 1): void {
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
    pout(g, 0, -7, 0.7);
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
    pout(g, 0, -10, 0.8);
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
    pout(g, 0, -22, 0.75);
  } else {
    // A stack of forms tied round and round with red tape
    for (let i = 0; i < 6; i++) box(g, -13 + (i % 2) * 1.5, -6 - i * 6, 26, 6, i % 2 ? '#fdf6e3' : '#efe6cf', INK, 0.5);
    line(g, '#c0392b', 2, [-12, -8, 12, -30]);
    line(g, '#c0392b', 2, [-12, -30, 12, -10]);
    line(g, '#c0392b', 1.4, [12, -10, 18, -4, 15, 0]);
    pout(g, 0, -20, 0.75);
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

/** A plain outline hero (no look chosen yet), feet at (0, 0), about 50 u tall like drawHero. */
export function drawOutlineHero(g: CanvasRenderingContext2D): void {
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
