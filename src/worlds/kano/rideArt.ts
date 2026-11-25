/**
 * The long bus ride north to Kano and Kano's welcome tune (docs/kano.md 1.3; art K1a). Lives in
 * the lazy Kano part and imports no value from outside src/worlds/kano/ (types only), so it adds
 * nothing to the first load and draws without the Ogun part (KN-R10). Its Ogun arch is a small
 * copy drawn here, not Ogun's own.
 *
 * A side view: our own long-distance coach (cream and danfo yellow, no brand, no name) leaves
 * under the Ogun arch's "SAFE JOURNEY" side; palm trees and red earth; a long bridge over a wide
 * river (our own, unnamed); open grassland with baobabs and cattle grazing far off; the soft gold
 * Harmattan haze (on far things only); then Kano's old wall and our gate (./gate). The sun
 * crosses the sky once. No people but the hero at a window, drawn by the game (`rider`).
 */
import type { Tune } from '../../art/tunes';
import { drawKanoGate, drawKanoWall, KANO_INK as INK } from './gate';

const TAU = Math.PI * 2;

/** 5 s the first time, 2 s after; `end` is the road length, `gateAt` the gate's place past it. */
export const KANO_RIDE = { first: 5, again: 2, end: 3000, gateAt: 112, bridge: [860, 1880], grass: 1880, haze: [2300, 2850], wall: 2520 } as const;

export interface KanoRideOpts {
  /** Kano to Ogun or Lagos: the same road the other way, the coach facing left. */
  back?: boolean;
  /** Rusty Borehole is beaten (the wall bright). */
  lit?: boolean;
  time?: number;
  /** Reduced motion: the end picture only (the coach at the gate, or under the arch going back). */
  still?: boolean;
  /**
   * Draws the hero standing at the coach's second window, feet at (0, 0), facing +x; clipped to
   * the window. The game passes its hero drawing (so this part imports none of it).
   */
  rider?: (g: CanvasRenderingContext2D) => void;
}

/** How far along the road the coach is (0 to end): quick at first, slowing to a stop. */
export function kanoRideAt(p: number): number {
  const q = Math.min(1, Math.max(0, p));
  return KANO_RIDE.end * (1 - (1 - q) ** 2);
}

/** 0 (clear) to 1 (full Harmattan haze) at a place on the road. */
export function hazeAt(x: number): number {
  const [a, b] = KANO_RIDE.haze;
  return Math.min(1, Math.max(0, (x - a) / (b - a)));
}

function mix(a: string, b: string, k: number): string {
  const n = (h: string, i: number): number => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  return `rgb(${[0, 1, 2].map((i) => Math.round(n(a, i) + (n(b, i) - n(a, i)) * k)).join(',')})`;
}

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
    g.ellipse(x + 6 * k + Math.cos(a) * 12, y - 46 + Math.sin(a) * 6, 14, 3.6, a, 0, TAU);
    g.fill();
  }
}

/** Our own baobab: a fat trunk, a few short thick branches, small dry-season leaf clumps. */
function baobab(g: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  g.fillStyle = '#9a7a62';
  g.beginPath();
  g.moveTo(-9, 0);
  g.quadraticCurveTo(-11, -18, -6, -30);
  g.lineTo(-14, -40);
  g.lineTo(-10, -42);
  g.lineTo(-2, -33);
  g.lineTo(0, -44);
  g.lineTo(4, -44);
  g.lineTo(4, -33);
  g.lineTo(13, -41);
  g.lineTo(15, -38);
  g.lineTo(7, -29);
  g.quadraticCurveTo(11, -16, 9, 0);
  g.closePath();
  g.fill();
  g.fillStyle = 'rgba(0,0,0,0.15)';
  g.fillRect(3, -28, 5, 28);
  g.fillStyle = '#7f9a4a';
  for (const [lx, ly] of [[-12, -43], [2, -47], [14, -42]] as const) {
    g.beginPath();
    g.ellipse(lx, ly, 7, 3.5, 0, 0, TAU);
    g.fill();
  }
  g.restore();
}

/** A cow grazing far off (head down), facing +x, feet on y. */
function cow(g: CanvasRenderingContext2D, x: number, y: number, light: boolean): void {
  g.fillStyle = light ? '#efe4d2' : '#a5683e';
  g.fillRect(x - 6, y - 7, 12, 5);
  g.fillRect(x - 6, y - 2, 1.6, 2);
  g.fillRect(x + 4, y - 2, 1.6, 2);
  g.beginPath();
  g.ellipse(x - 3, y - 7.5, 2.4, 1.8, 0, 0, TAU);
  g.moveTo(x + 6, y - 6);
  g.lineTo(x + 10, y - 1.5);
  g.lineTo(x + 8, y - 0.5);
  g.lineTo(x + 5, y - 4);
  g.fill();
}

/** The small Ogun arch (our own, as ogun.md 1.4) seen from the Ogun side: "SAFE JOURNEY". */
function ogunArch(g: CanvasRenderingContext2D, x: number, y: number): void {
  g.save();
  g.translate(x, y);
  g.strokeStyle = INK;
  g.lineWidth = 1.2;
  for (const px of [-58, 50]) {
    g.fillStyle = '#27378a';
    g.fillRect(px, -74, 8, 74);
    g.strokeRect(px, -74, 8, 74);
    g.fillStyle = '#ffffff';
    for (let k = -66; k < -6; k += 10) g.fillRect(px, k, 8, 1.4);
  }
  g.fillStyle = '#7a4526';
  g.fillRect(-66, -100, 132, 26);
  g.strokeRect(-66, -100, 132, 26);
  g.fillStyle = '#fff1c9';
  g.font = 'bold 12px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('SAFE JOURNEY', 0, -87, 120);
  g.restore();
}

/** Our own long-distance coach, wheels on y 0, 132 long, facing +x. Luggage on the roof rack. */
function coach(g: CanvasRenderingContext2D, spin: number, rider?: (g: CanvasRenderingContext2D) => void): void {
  g.fillStyle = 'rgba(80,40,15,0.16)';
  g.beginPath();
  g.ellipse(4, 0, 70, 4, 0, 0, TAU);
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 2;
  // Luggage on the rack: a bag, a rolled mat, a box
  const bags: [number, number, number, string][] = [[-50, 22, 8, '#3f7fb5'], [-24, 30, 6, '#d6a24a'], [12, 18, 9, '#9a4a3a'], [34, 16, 7, '#4f8a4a']];
  for (const [bx, bw, bh, col] of bags) {
    g.fillStyle = col;
    g.fillRect(bx, -60 - bh, bw, bh);
    g.lineWidth = 1.2;
    g.strokeRect(bx, -60 - bh, bw, bh);
  }
  g.lineWidth = 1.4;
  g.beginPath();
  g.moveTo(-58, -61);
  g.lineTo(50, -61);
  g.stroke();
  g.lineWidth = 2;
  g.fillStyle = '#fff3d6';
  g.beginPath();
  g.moveTo(-66, -6);
  g.lineTo(-66, -54);
  g.quadraticCurveTo(-66, -60, -59, -60);
  g.lineTo(52, -60);
  g.quadraticCurveTo(62, -60, 64, -48);
  g.lineTo(66, -26);
  g.lineTo(66, -6);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = '#f6c90e';
  g.fillRect(-65, -26, 130, 19);
  g.fillStyle = '#e0572b';
  g.fillRect(-65, -28, 130, 3);
  // The hero at the second window, then glass on the rest
  g.fillStyle = '#bfe3f5';
  g.fillRect(-38, -52, 20, 18);
  if (rider) {
    g.save();
    g.beginPath();
    g.rect(-38, -52, 20, 18);
    g.clip();
    g.translate(-28, -6);
    g.scale(0.92, 0.92);
    rider(g);
    g.restore();
  }
  g.fillStyle = '#bfe3f5';
  for (const wx of [-62, -14, 10, 34]) g.fillRect(wx, -52, 20, 18);
  g.beginPath();
  g.moveTo(57, -52);
  g.lineTo(61, -52);
  g.lineTo(64, -34);
  g.lineTo(57, -34);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.45)';
  for (const wx of [-62, -38, -14, 10, 34]) g.fillRect(wx + 3, -51, 3, 16);
  g.fillStyle = '#fff3b0';
  g.fillRect(61, -16, 5, 5);
  g.fillStyle = '#e0572b';
  g.fillRect(-66, -16, 3, 6);
  for (const wx of [-42, 42]) {
    g.save();
    g.translate(wx, -9);
    g.fillStyle = '#222222';
    g.beginPath();
    g.arc(0, 0, 10, 0, TAU);
    g.fill();
    g.fillStyle = '#9a9a9a';
    g.beginPath();
    g.arc(0, 0, 4.2, 0, TAU);
    g.fill();
    g.rotate(spin);
    g.fillStyle = '#222222';
    g.fillRect(-0.8, -4.2, 1.6, 8.4);
    g.restore();
  }
}

/**
 * One frame of the ride, filling (0, 0) to (w, h). p = time / ride seconds (0 to 1). The end
 * picture (p = 1) has the coach stopped before the gate with the board in view; going back, the
 * coach under the "SAFE JOURNEY" arch. Drawn fresh each frame for 2 to 5 s (no blur, no filter).
 */
export function drawKanoRide(g: CanvasRenderingContext2D, w: number, h: number, p: number, o: KanoRideOpts = {}): void {
  const R = KANO_RIDE;
  const still = o.still === true;
  const time = still ? 0 : (o.time ?? 0);
  const q = still ? 1 : Math.min(1, Math.max(0, p));
  const d = kanoRideAt(q);
  const back = o.back === true;
  const pos = back ? R.end - d : d;
  const u = h / 180;
  const V = w / u;
  const busX = back ? V * 0.62 : Math.min(V * 0.34, V - R.gateAt - 64);
  const at = (x: number, k = 1): number => busX + (x - pos) * k;
  const hz = hazeAt(pos);
  g.save();
  g.scale(u, u);
  // Sky: blue morning to Harmattan gold; the sun crosses once
  const sky = g.createLinearGradient(0, 0, 0, 104);
  sky.addColorStop(0, mix('#6fc2f0', '#e6c78e', hz));
  sky.addColorStop(1, mix('#fbe6b4', '#f6dca4', hz));
  g.fillStyle = sky;
  g.fillRect(0, 0, V, 118);
  const sp = back ? 1 - q : q;
  g.fillStyle = hz > 0.5 ? '#ffe7a0' : '#ffd34d';
  g.beginPath();
  g.arc(V * (0.08 + 0.84 * sp), 66 - Math.sin(Math.PI * sp) * 46, 11, 0, TAU);
  g.fill();
  // Far land (a third of the speed): green hills that flatten into tan savanna
  g.fillStyle = mix('#8fbf6a', '#c9b178', Math.min(1, Math.max(0, (pos - 1400) / 900)));
  g.beginPath();
  g.moveTo(0, 106);
  for (let sx = 0; sx <= V + 8; sx += 8) {
    const wx = (sx - busX) / 0.3 + pos;
    const hill = Math.max(0.15, Math.min(1, (1700 - wx) / 600));
    g.lineTo(sx, 104 - hill * (10 + 8 * Math.sin(wx / 60) + 5 * Math.sin(wx / 23)));
  }
  g.lineTo(V, 106);
  g.fill();
  // Middle (0.6 speed): baobabs and cattle far off on the grassland
  for (let x = R.grass - 200; x < R.end + 300; x += 150) {
    const sx = at(x, 0.6);
    if (sx > -30 && sx < V + 30) baobab(g, sx, 108, 0.7 + ((x / 150) % 3) * 0.12);
  }
  for (let x = R.grass + 60; x < R.haze[1]; x += 95) {
    const sx = at(x, 0.6);
    if (sx > -20 && sx < V + 20) {
      cow(g, sx, 108, (x / 95) % 2 < 1);
      cow(g, sx + 22, 109, (x / 95) % 2 >= 1);
    }
  }
  // The back verge: red earth, the river under the bridge, dry grass
  const [b0, b1] = R.bridge;
  g.fillStyle = '#c9774a';
  g.fillRect(0, 106, V, 12);
  g.fillStyle = '#d8bb7e';
  const gx = Math.max(0, at(R.grass));
  if (gx < V) g.fillRect(gx, 106, V - gx, 12);
  const r0 = Math.max(0, at(b0));
  const r1 = Math.min(V, at(b1));
  if (r1 > r0) {
    g.fillStyle = '#4f9fc9';
    g.fillRect(r0, 98, r1 - r0, 20);
    g.fillStyle = 'rgba(255,255,255,0.55)';
    for (let x = b0; x < b1; x += 34) {
      const sx = at(x);
      if (sx > -12 && sx < V) g.fillRect(sx, 103 + ((x / 34) % 3) * 4, 12, 1.4);
    }
  }
  // Gold haze on far things only (never on the road, the coach or the wall)
  if (hz > 0) {
    g.fillStyle = `rgba(240,204,130,${(0.42 * hz).toFixed(3)})`;
    g.fillRect(0, 0, V, 118);
  }
  // Near: palms on red earth, the bridge's back rail, the wall and gate, the Ogun arch
  for (let x = 120; x < b0 - 40; x += 66) {
    const sx = at(x);
    if (sx > -40 && sx < V + 40) palm(g, sx, 116, (x / 66) % 2 < 1 ? 1 : -1);
  }
  if (r1 > r0) {
    g.fillStyle = '#e9e4d8';
    g.fillRect(r0, 108, r1 - r0, 2.5);
    for (let x = b0; x <= b1; x += 16) {
      const sx = at(x);
      if (sx > -4 && sx < V + 4) g.fillRect(sx, 108, 2, 10);
    }
  }
  const wall0 = at(R.wall);
  if (wall0 < V) drawKanoWall(g, wall0, V + 4, 118, 0.95, o.lit === true);
  const gx2 = at(R.end + R.gateAt);
  if (gx2 > -80 && gx2 < V + 80) drawKanoGate(g, gx2, 118, 0.95, { lit: o.lit === true, time, still });
  const ax = at(0);
  if (ax > -80 && ax < V + 80) ogunArch(g, ax, 118);
  // The road: kerbs, tarmac, dashes, sand drifting on the edges near Kano
  g.fillStyle = '#f4efe0';
  g.fillRect(0, 116, V, 3);
  g.fillStyle = '#66666d';
  g.fillRect(0, 119, V, 51);
  g.fillStyle = '#f4f1e6';
  for (let x = Math.floor((pos - busX) / 40) * 40; at(x) < V; x += 40) g.fillRect(at(x), 143, 20, 2.5);
  if (hz > 0) {
    g.fillStyle = `rgba(222,190,130,${(0.8 * hz).toFixed(3)})`;
    for (let x = Math.floor((pos - busX) / 70) * 70; at(x) < V; x += 70) {
      g.beginPath();
      g.ellipse(at(x), 120, 18, 2.4, 0, 0, TAU);
      g.ellipse(at(x + 35), 169, 14, 2, 0, 0, TAU);
      g.fill();
    }
  }
  g.fillStyle = '#f4efe0';
  g.fillRect(0, 170, V, 3);
  g.fillStyle = r1 > r0 ? '#4f9fc9' : hz > 0.3 ? '#d8bb7e' : '#c9774a';
  g.fillRect(0, 173, V, 7);
  if (r1 > r0) {
    g.fillStyle = r0 > 0 ? '#c9774a' : '#d8bb7e';
    if (r0 > 0) g.fillRect(0, 173, r0, 7);
    g.fillStyle = '#d8bb7e';
    if (r1 < V) g.fillRect(r1, 173, V - r1, 7);
    g.fillStyle = '#b9b4a8';
    for (let x = b0 + 60; x < b1; x += 120) {
      const sx = at(x);
      if (sx > -10 && sx < V + 10) g.fillRect(sx - 5, 173, 10, 7);
    }
  }
  // The coach, bobbing gently
  g.translate(busX, 164 + (still ? 0 : Math.sin(time * 15) * 0.7));
  if (back) g.scale(-1, 1);
  coach(g, d / 10, o.rider);
  g.restore();
}

// ---------- The welcome tune (1.3): our own, about 1.5 s ----------

/**
 * Kalangu-style talking drum ("pom, pa-pom, pom", bending up), a shaker, and a light high lead
 * (the kalimba voice stands in for the flute until the music player has one). D major, one bar at 160.
 */
export const KANO_WELCOME_TUNE: Tune = {
  name: 'kano-welcome',
  bpm: [160],
  bars: 1,
  loop: false,
  gain: 1,
  key: ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'],
  chords: ['D'],
  tracks: [
    { inst: 'drum', vol: 0.8, bars: ['D3 . A3 D3 . . F#3 . A3 . . D3 . . . .'] },
    { inst: 'shekere', vol: 0.45, bars: ['X . x x X . x x X . x x X . . .'] },
    { inst: 'kalimba', lead: true, vol: 0.45, bars: ['. . . . F#5 . A5 . E5 - . B5 A5 - - -'] },
  ],
};
