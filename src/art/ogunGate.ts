/**
 * Ogun's gateway and the bus ride (docs/ogun.md 1.3 and 1.4; art O1a). Load this file with the
 * lazy Ogun part, not the first page; the tiny pieces Lagos needs first are in ./gateway.
 *
 * Our own gateway: two tall round pillars wrapped in our own indigo-and-white cloth (bands, dots
 * and rings in the style of adire, never a named pattern), a wide brown beam with the words, and
 * the game's own cog standing on top. Never the real gantry's shape or colours; no crest, emblem,
 * seal, flag, logo, figure or face; no writing but "WELCOME TO OGUN" / "THE GATEWAY STATE" on the
 * front and "SAFE JOURNEY" on the back. Faded (warm, a little dull, cog still) before King
 * Pothole; bright after (lamps glow at night, the cog turns). With `still` nothing moves.
 */
import { drawHero, type HeroLook } from './hero';
import { INK, SKY_LOW, SKY_TOP, SUN } from './palette';
import { GATE_COLOURS, type GateColours } from './gateway';
import type { Tune } from './tunes';

const TAU = Math.PI * 2;

export interface GateOpts {
  /** 'front' (Lagos side: the welcome) or 'back' (Ogun side: "SAFE JOURNEY"). */
  face?: 'front' | 'back';
  /** King Pothole is beaten: bright colours, turning cog, lamps that glow at night. */
  lit?: boolean;
  /** Evening or night: lit lamps glow. */
  night?: boolean;
  /** Seconds, for the cog's turn. */
  time?: number;
  /** Reduced motion: the cog stays still. */
  still?: boolean;
}

/** The full arch's size in arch units (base centre at 0, 0; s = 1). */
export const GATE = { w: 212, h: 178, pillarX: 82, beamBottom: -112 } as const;
/** Seconds for one turn of the lit cog (as the wheel's cogs). */
export const GATE_COG_TURN_S = 9;

function cogShape(g: CanvasRenderingContext2D, r: number, teeth: number): void {
  g.beginPath();
  for (let k = 0; k < teeth * 4; k++) {
    const a = ((k - 0.5) * TAU) / (teeth * 4);
    g.lineTo(Math.cos(a) * (k % 4 < 2 ? r : r * 0.78), Math.sin(a) * (k % 4 < 2 ? r : r * 0.78));
  }
  g.closePath();
}

/** One round pillar from y 0 up to y -112, centre x, with its cloth and foot. */
function pillar(g: CanvasRenderingContext2D, x: number, c: GateColours): void {
  const r = 13;
  g.fillStyle = c.pillar;
  g.fillRect(x - r, -112, r * 2, 112);
  // Our own cloth: double bands, a row of dots, a row of rings, squeezed at the edges so it reads round
  g.fillStyle = c.cloth;
  g.strokeStyle = c.cloth;
  g.lineWidth = 1.3;
  for (let y = -104, row = 0; y < -12; y += 15, row++) {
    g.fillRect(x - r, y, r * 2, 1.6);
    g.fillRect(x - r, y + 3.2, r * 2, 0.9);
    for (const k of [-0.75, -0.25, 0.25, 0.75]) {
      const off = Math.sin((k * Math.PI) / 2) * r;
      const sq = Math.cos((k * Math.PI) / 2);
      g.beginPath();
      g.ellipse(x + off, y + 9.5, (row % 2 ? 1.4 : 2.6) * sq + 0.3, row % 2 ? 1.4 : 2.6, 0, 0, TAU);
      if (row % 2) g.fill();
      else g.stroke();
    }
  }
  // Shade: light down the left, dark down the right
  const sh = g.createLinearGradient(x - r, 0, x + r, 0);
  sh.addColorStop(0, 'rgba(255,255,255,0.22)');
  sh.addColorStop(0.35, 'rgba(255,255,255,0)');
  sh.addColorStop(1, 'rgba(0,0,0,0.3)');
  g.fillStyle = sh;
  g.fillRect(x - r, -112, r * 2, 112);
  g.strokeStyle = INK;
  g.lineWidth = 1.5;
  g.strokeRect(x - r, -112, r * 2, 112);
  // Foot and cap
  g.fillStyle = c.cap;
  g.fillRect(x - 17, -10, 34, 10);
  g.strokeRect(x - 17, -10, 34, 10);
}

/** A lamp on a short post standing on the beam's end, glowing at night once lit. */
function lamp(g: CanvasRenderingContext2D, x: number, glow: boolean): void {
  g.fillStyle = '#5d6670';
  g.fillRect(x - 1.5, -168, 3, 14);
  if (glow) {
    const gl = g.createRadialGradient(x, -172, 2, x, -172, 26);
    gl.addColorStop(0, 'rgba(255,226,140,0.85)');
    gl.addColorStop(1, 'rgba(255,226,140,0)');
    g.fillStyle = gl;
    g.fillRect(x - 26, -198, 52, 52);
  }
  g.fillStyle = glow ? '#fff3b0' : '#d9d4c7';
  g.strokeStyle = INK;
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(x, -172, 5, 0, TAU);
  g.fill();
  g.stroke();
}

/** The full gateway arch, base centre at (cx, y), s arch units to a canvas unit. */
export function drawGateArch(g: CanvasRenderingContext2D, cx: number, y: number, s: number, o: GateOpts = {}): void {
  const lit = o.lit === true;
  const c = lit ? GATE_COLOURS.bright : GATE_COLOURS.faded;
  g.save();
  g.translate(cx, y);
  g.scale(s, s);
  g.lineJoin = 'round';
  g.fillStyle = 'rgba(0,0,0,0.16)';
  for (const px of [-GATE.pillarX, GATE.pillarX]) {
    g.beginPath();
    g.ellipse(px, 0, 20, 3, 0, 0, TAU);
    g.fill();
  }
  pillar(g, -GATE.pillarX, c);
  pillar(g, GATE.pillarX, c);
  lamp(g, -96, lit && o.night === true);
  lamp(g, 96, lit && o.night === true);
  g.fillStyle = c.cap;
  g.strokeStyle = INK;
  g.lineWidth = 1.5;
  for (const px of [-GATE.pillarX, GATE.pillarX]) {
    g.fillRect(px - 16, -116, 32, 6);
    g.strokeRect(px - 16, -116, 32, 6);
  }
  // The beam
  g.fillStyle = c.beam;
  g.fillRect(-106, -154, 212, 42);
  g.strokeRect(-106, -154, 212, 42);
  g.fillStyle = 'rgba(0,0,0,0.18)';
  g.fillRect(-105, -117, 210, 4);
  g.strokeStyle = c.words;
  g.lineWidth = 1;
  g.strokeRect(-102, -150, 204, 34);
  g.fillStyle = c.words;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  if (o.face === 'back') {
    g.font = 'bold 17px sans-serif';
    g.fillText('SAFE JOURNEY', 0, -132, 190);
  } else {
    g.font = 'bold 15px sans-serif';
    g.fillText('WELCOME TO OGUN', 0, -138, 190);
    g.font = 'bold 8.5px sans-serif';
    g.fillText('THE GATEWAY STATE', 0, -122, 160);
  }
  // The cog standing on the beam: turns once lit (never with `still`)
  g.translate(0, -161);
  g.rotate(lit && !o.still ? (((o.time ?? 0) / GATE_COG_TURN_S) % 1) * TAU : 0);
  g.fillStyle = c.cog;
  g.strokeStyle = c.cogEdge;
  g.lineWidth = 2;
  cogShape(g, 15, 10);
  g.fill();
  g.stroke();
  g.fillStyle = c.cap;
  g.beginPath();
  g.arc(0, 0, 6, 0, TAU);
  g.fill();
  g.stroke();
  g.fillStyle = c.cogEdge;
  g.fillRect(-1.2, -5.5, 2.4, 4);
  g.restore();
}

// ---------- The bus ride (1.3) ----------

/** The ride's timing: 4 s the first time, 2 s after. Pass p = time / seconds (0 to 1). */
export const BUS_RIDE = { first: 4, again: 2, archX: 640, ease: 3.5 } as const;

export interface BusRideOpts {
  look: HeroLook;
  /** Ogun to Lagos: the bus drives left and passes under the arch's back ("SAFE JOURNEY"). */
  toLagos?: boolean;
  /** King Pothole is beaten (the arch bright). */
  lit?: boolean;
  /** Seconds since the ride began (wheels, bob, cog). */
  time?: number;
  /** Reduced motion: draw the end picture (the bus under the arch), nothing moves. */
  still?: boolean;
}

/** How far along the road the bus is (0 to archX): fast at first, slowing to stop under the arch. */
export function busRideAt(p: number): number {
  const q = Math.min(1, Math.max(0, p));
  return BUS_RIDE.archX * (1 - (1 - q) ** BUS_RIDE.ease);
}

const WALLS = ['#f0a35e', '#9fb6e8', '#7fc4a4', '#e7b98a', '#f2d06b', '#d7a6d9', '#b7d77a', '#e58b8b'];

function palm(g: CanvasRenderingContext2D, x: number, y: number, k: number): void {
  g.strokeStyle = '#7a5a3a';
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(x, y);
  g.quadraticCurveTo(x + 4 * k, y - 26, x + 6 * k, y - 50);
  g.stroke();
  g.fillStyle = k > 0 ? '#4f9a3a' : '#5ea844';
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i - 2.5) * 0.55;
    g.beginPath();
    g.ellipse(x + 6 * k + Math.cos(a) * 12, y - 50 + Math.sin(a) * 6 + 4, 14, 3.6, a, 0, TAU);
    g.fill();
  }
}

function block(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, wall: string): void {
  g.fillStyle = wall;
  g.fillRect(x, y - h, w, h);
  g.strokeStyle = INK;
  g.lineWidth = 1.2;
  g.strokeRect(x, y - h, w, h);
  g.fillStyle = '#cfe9f5';
  for (let wy = y - h + 7; wy < y - 16; wy += 12) for (let wx = x + 5; wx + 8 < x + w - 3; wx += 12) g.fillRect(wx, wy, 8, 7);
  g.fillStyle = '#d65a4a';
  for (let k = 0; k * 8 < w; k += 2) g.fillRect(x + k * 8, y - 14, 8, 3);
  g.fillStyle = '#5b4636';
  g.fillRect(x + w / 2 - 5, y - 11, 10, 11);
}

/** The big danfo for the ride (wheels on y 0, 124 long, facing +x), the hero at a window. */
function rideDanfo(g: CanvasRenderingContext2D, look: HeroLook, time: number, spin: number): void {
  g.fillStyle = 'rgba(0,0,0,0.2)';
  g.beginPath();
  g.ellipse(0, 0, 62, 4, 0, 0, TAU);
  g.fill();
  g.fillStyle = '#f6c90e';
  g.strokeStyle = INK;
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(-62, -8);
  g.lineTo(-62, -50);
  g.quadraticCurveTo(-62, -56, -55, -56);
  g.lineTo(36, -56);
  g.quadraticCurveTo(48, -56, 54, -40);
  g.lineTo(62, -24);
  g.lineTo(62, -8);
  g.closePath();
  g.fill();
  g.stroke();
  // The hero at the second window, then the glass over every window
  g.save();
  g.beginPath();
  g.rect(-30, -50, 22, 18);
  g.clip();
  g.fillStyle = '#bfe3f5';
  g.fillRect(-30, -50, 22, 18);
  g.translate(-19, -4);
  g.scale(0.92, 0.92);
  drawHero(g, look, { phase: 0, inAir: false, facing: 1, glow: false, standing: true, time });
  g.restore();
  g.fillStyle = '#bfe3f5';
  for (const wx of [-56, -4, 20]) g.fillRect(wx, -50, 20, 18);
  g.beginPath();
  g.moveTo(42, -50);
  g.lineTo(50, -50);
  g.lineTo(57, -32);
  g.lineTo(42, -32);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.45)';
  for (const wx of [-56, -30, -4, 20]) g.fillRect(wx + 3, -49, 3, 16);
  g.fillStyle = INK;
  g.fillRect(-62, -27, 124, 3.5);
  g.fillRect(-62, -20, 124, 2.2);
  g.fillStyle = '#fff3b0';
  g.fillRect(57, -18, 5, 5);
  for (const wx of [-38, 38]) {
    g.save();
    g.translate(wx, -9);
    g.fillStyle = '#222222';
    g.beginPath();
    g.arc(0, 0, 9.5, 0, TAU);
    g.fill();
    g.fillStyle = '#9a9a9a';
    g.beginPath();
    g.arc(0, 0, 4, 0, TAU);
    g.fill();
    g.rotate(spin);
    g.fillStyle = '#222222';
    g.fillRect(-0.8, -4, 1.6, 8);
    g.restore();
  }
}

/** A plain white car in the far lane (wheels on y 0, facing +x). */
function car(g: CanvasRenderingContext2D, x: number, y: number): void {
  g.fillStyle = '#f2f0ea';
  g.strokeStyle = INK;
  g.lineWidth = 1.4;
  g.beginPath();
  g.moveTo(x - 26, y - 4);
  g.lineTo(x - 26, y - 14);
  g.lineTo(x - 14, y - 15);
  g.lineTo(x - 8, y - 25);
  g.lineTo(x + 10, y - 25);
  g.lineTo(x + 17, y - 15);
  g.lineTo(x + 26, y - 13);
  g.lineTo(x + 26, y - 4);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = '#9fc4d8';
  g.fillRect(x - 6, y - 22, 7, 6);
  g.fillRect(x + 3, y - 22, 8, 6);
  g.fillStyle = '#222222';
  for (const wx of [-15, 15]) {
    g.beginPath();
    g.arc(x + wx, y - 4, 5, 0, TAU);
    g.fill();
  }
}

/**
 * One frame of the bus ride, filling (0, 0) to (w, h). p = time / ride seconds (0 to 1); the
 * end picture (p = 1) has the bus under the arch with its words in view. Lagos blocks, then palm
 * trees, then the arch (to Ogun); Ogun's palms and hills, then the arch's back (to Lagos).
 */
export function drawBusRide(g: CanvasRenderingContext2D, w: number, h: number, p: number, o: BusRideOpts): void {
  const still = o.still === true;
  const time = still ? 0 : (o.time ?? 0);
  const d = busRideAt(still ? 1 : p);
  const u = h / 180;
  const V = w / u;
  const busX = V * 0.42;
  const back = o.toLagos === true;
  g.save();
  if (back) {
    g.translate(w, 0);
    g.scale(-1, 1);
  }
  g.scale(u, u);
  const sky = g.createLinearGradient(0, 0, 0, 104);
  sky.addColorStop(0, SKY_TOP);
  sky.addColorStop(1, SKY_LOW);
  g.fillStyle = sky;
  g.fillRect(0, 0, V, 104);
  g.fillStyle = SUN;
  g.beginPath();
  g.arc(V * 0.84, 26, 12, 0, TAU);
  g.fill();
  // Far layer (a third of the speed): Lagos's pale skyline behind the start, green hills after
  const far = (x: number): number => busX + (x - d) * 0.3;
  g.fillStyle = '#a9c3cf';
  if (!back) for (let x = -200; x < 300; x += 34) g.fillRect(far(x), 104 - 30 - ((x * 7) % 26), 26, 40);
  g.fillStyle = '#8fbf6a';
  g.beginPath();
  g.moveTo(0, 104);
  for (let sx = 0; sx <= V + 8; sx += 8) {
    const wx = (sx - busX) / 0.3 + d;
    const fade = back ? 1 : Math.min(1, Math.max(0, (wx - 200) / 200));
    g.lineTo(sx, 104 - fade * (10 + 8 * Math.sin(wx / 60) + 5 * Math.sin(wx / 23)));
  }
  g.lineTo(V, 104);
  g.fill();
  // Near layer: the back pavement with its blocks, palms and the arch
  const at = (x: number): number => busX + x - d;
  g.fillStyle = '#e8d6ac';
  g.fillRect(0, 104, V, 14);
  if (!back) for (let i = 0; i < 9; i++) block(g, at(-260 + i * 64), 112, 56, 34 + ((i * 23) % 30), WALLS[i % WALLS.length] as string);
  for (let x = back ? -200 : 330; x < BUS_RIDE.archX + 400; x += 70) {
    if (Math.abs(x - BUS_RIDE.archX) < 110) continue;
    if (back && x > BUS_RIDE.archX) continue;
    const sx = at(x);
    if (sx > -40 && sx < V + 40) palm(g, sx, 112, (x / 70) % 2 ? 1 : -1);
  }
  if (back) for (let i = 0; i < 6; i++) block(g, at(BUS_RIDE.archX + 130 + i * 64), 112, 56, 34 + ((i * 23) % 30), WALLS[i % WALLS.length] as string);
  const ax = at(BUS_RIDE.archX);
  if (ax > -90 && ax < V + 90) {
    g.save();
    // Undo the mirror for the arch so its words always read left to right
    g.translate(ax, 0);
    if (back) g.scale(-1, 1);
    drawGateArch(g, 0, 117, 0.62, { face: back ? 'back' : 'front', lit: o.lit === true, time, still });
    g.restore();
  }
  // The road: kerbs, tarmac, dashes moving past, a car in the far lane
  g.fillStyle = '#f4efe0';
  g.fillRect(0, 116, V, 3);
  g.fillStyle = '#66666d';
  g.fillRect(0, 119, V, 51);
  g.fillStyle = '#f4f1e6';
  for (let x = Math.floor((d - busX) / 40) * 40; at(x) < V; x += 40) g.fillRect(at(x), 143, 20, 2.5);
  g.fillStyle = '#f4efe0';
  g.fillRect(0, 170, V, 3);
  g.fillStyle = '#e8d6ac';
  g.fillRect(0, 173, V, 7);
  car(g, at(260 + d * 0.55), 138);
  // The bus, bobbing gently on the road
  g.translate(busX, 164 + (still ? 0 : Math.sin(time * 16) * 0.7));
  rideDanfo(g, o.look, time, d / 9.5);
  g.restore();
}

// ---------- The welcome tune (1.3): our own, about 1.5 s ----------

/** Talking drum "pom pa-pom" and a bright shaker under a short agogo call. G major, one bar at 160. */
export const GATEWAY_TUNE: Tune = {
  name: 'gateway',
  bpm: [160],
  bars: 1,
  loop: false,
  gain: 1,
  key: ['G', 'A', 'B', 'C', 'D', 'E', 'F#'],
  chords: ['G'],
  tracks: [
    { inst: 'drum', vol: 0.75, bars: ['G3 . . D3 G3 . . . A3 . G3 . D3 - - -'] },
    { inst: 'shekere', vol: 0.5, bars: ['X x x x X x x x X x x x X . . .'] },
    { inst: 'agogo', lead: true, vol: 0.4, bars: ['. . . . . . E5 . . . . . B5 - - -'] },
  ],
};
