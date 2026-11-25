/**
 * Kano's old red earth wall and our own gate in it (docs/kano.md 1.4; art K1a). Lives in the lazy
 * Kano part (src/worlds/kano/): it imports no value from outside this folder, so nothing here is
 * in the first load and Kano draws without the Ogun part (KN-R10).
 *
 * Our own drawing: a thick, smooth red-brown earth wall with a rounded top and small raised
 * triangles along it, one wide round-topped gateway with two plain wooden doors standing open,
 * and in front of it, on its own post, a plain board: "WELCOME TO KANO" / "CENTRE OF COMMERCE",
 * with the game's cog on top. Never a real gate's shape or name, no crest, seal, flag or emblem,
 * no palace, no script but our two lines (KN-R3). Faded but warm before Rusty Borehole; bright
 * after (warm red wall, fresh paint, lamps lit, the cog turns). With `still` nothing moves.
 */

const TAU = Math.PI * 2;
export const KANO_INK = '#1d1a14';

/** Kano's colour notes (2.5): earth red, indigo, Harmattan gold, groundnut tan, cream, danfo yellow. */
export const KANO = { red: '#c8583a', indigo: '#2c3f8a', gold: '#e9b949', tan: '#d2a86a', cream: '#fff3d6', yellow: '#f6c90e' } as const;

export interface WallColours {
  wall: string;
  light: string;
  dark: string;
  door: string;
  doorDark: string;
  board: string;
  words: string;
  trim: string;
  cog: string;
  cogEdge: string;
}

/** Faded (warm, a little dusty, cog still) and bright (after Rusty Borehole). Words on the board are 9 to 1 or more. */
export const WALL_COLOURS: Readonly<Record<'faded' | 'bright', WallColours>> = {
  faded: { wall: '#b98670', light: '#cfa088', dark: '#91644f', door: '#9c8268', doorDark: '#6f5a46', board: '#f1e6cc', words: '#3f3124', trim: '#c9ad7c', cog: '#cdb994', cogEdge: '#8a7a5c' },
  bright: { wall: KANO.red, light: '#e07d55', dark: '#933b25', door: '#2f8a6e', doorDark: '#1d5c49', board: '#fff3d6', words: '#3a2618', trim: KANO.yellow, cog: '#f4a62a', cogEdge: '#7a4e0e' },
};

/** The board's only words (KN-R2, KN-R3). */
export const GATE_WORDS = ['WELCOME TO KANO', 'CENTRE OF COMMERCE'] as const;

/** Sizes in gate units (base centre 0, 0; s = 1). */
export const KANO_GATE = { wallH: 50, blockW: 96, blockH: 82, openW: 50, openH: 60, boardW: 86, boardH: 30, boardY: -64 } as const;
/** Seconds for one turn of the lit cog (as the wheel's cogs). */
export const KANO_COG_TURN_S = 9;

export interface KanoGateOpts {
  /** Rusty Borehole is beaten: the bright look. */
  lit?: boolean;
  /** Evening or night: the lit lamps glow. */
  night?: boolean;
  time?: number;
  still?: boolean;
  /** Where the board's post stands, in gate units from the gate's centre (default -58, in front at the left). */
  boardX?: number;
  /** Wall to draw out to each side, in gate units (0: the gate block alone). */
  wings?: number;
}

function colours(lit: boolean | undefined): WallColours {
  return WALL_COLOURS[lit ? 'bright' : 'faded'];
}

/** A row of small raised triangles along a wall top at y, from x0 to x1 (our own simple pattern). */
function triangles(g: CanvasRenderingContext2D, x0: number, x1: number, y: number, step: number, size: number, c: WallColours): void {
  g.fillStyle = c.wall;
  g.beginPath();
  for (let x = x0 + step / 2; x < x1 - size / 2; x += step) {
    g.moveTo(x - size / 2, y + 1);
    g.lineTo(x, y - size);
    g.lineTo(x + size / 2, y + 1);
  }
  g.fill();
  g.stroke();
}

/**
 * A stretch of the old wall from x0 to x1 (canvas units), its foot on y, s gate units to a canvas
 * unit. Smooth earth with a rounded top, a lit band along the top, a darker foot, a few soft
 * patches of fresh plaster, and the triangles. The patches sit at fixed spots, so it scrolls.
 */
export function drawKanoWall(g: CanvasRenderingContext2D, x0: number, x1: number, y: number, s: number, lit = false): void {
  const c = colours(lit);
  const h = KANO_GATE.wallH * s;
  g.save();
  g.lineJoin = 'round';
  g.strokeStyle = KANO_INK;
  g.lineWidth = 1.3 * s;
  triangles(g, x0, x1, y - h, 18 * s, 7 * s, c);
  g.fillStyle = c.wall;
  g.beginPath();
  g.moveTo(x0, y);
  g.lineTo(x0, y - h + 4 * s);
  g.quadraticCurveTo(x0, y - h, x0 + 4 * s, y - h);
  g.lineTo(x1 - 4 * s, y - h);
  g.quadraticCurveTo(x1, y - h, x1, y - h + 4 * s);
  g.lineTo(x1, y);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = c.light;
  g.fillRect(x0 + 2 * s, y - h + 2 * s, x1 - x0 - 4 * s, 3.5 * s);
  g.fillStyle = c.dark;
  g.fillRect(x0, y - 6 * s, x1 - x0, 6 * s);
  // Soft plaster patches (rounded, lighter), every 46 units from the stretch's start
  g.fillStyle = 'rgba(255,255,255,0.09)';
  for (let x = x0 + 14 * s, k = 0; x < x1 - 20 * s; x += 46 * s, k++) {
    g.beginPath();
    g.ellipse(x, y - h * (0.42 + (k % 3) * 0.12), 9 * s, 5 * s, 0, 0, TAU);
    g.fill();
  }
  g.restore();
}

function cogShape(g: CanvasRenderingContext2D, r: number, teeth: number): void {
  g.beginPath();
  for (let k = 0; k < teeth * 4; k++) {
    const a = ((k - 0.5) * TAU) / (teeth * 4);
    const rr = k % 4 < 2 ? r : r * 0.78;
    g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  g.closePath();
}

/** The game's cog, centre (0, 0); turns once lit, never with `still`. */
function cog(g: CanvasRenderingContext2D, c: WallColours, turn: number): void {
  g.save();
  g.rotate(turn);
  g.fillStyle = c.cog;
  g.strokeStyle = c.cogEdge;
  g.lineWidth = 2;
  cogShape(g, 12, 10);
  g.fill();
  g.stroke();
  g.fillStyle = c.board;
  g.beginPath();
  g.arc(0, 0, 4.8, 0, TAU);
  g.fill();
  g.stroke();
  g.fillStyle = c.cogEdge;
  g.fillRect(-1, -4.5, 2, 3.2);
  g.restore();
}

/** The plain board on its own post (foot at 0, 4), the cog on its top. */
function board(g: CanvasRenderingContext2D, c: WallColours, turn: number): void {
  const { boardW: w, boardH: h, boardY: by } = KANO_GATE;
  g.fillStyle = '#6b4a2e';
  g.fillRect(-2.5, by, 5, -by + 4);
  g.strokeRect(-2.5, by, 5, -by + 4);
  g.fillStyle = c.trim;
  g.fillRect(-w / 2, by - h, w, h);
  g.strokeRect(-w / 2, by - h, w, h);
  g.fillStyle = c.board;
  g.fillRect(-w / 2 + 3, by - h + 3, w - 6, h - 6);
  g.fillStyle = c.words;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = 'bold 10.5px sans-serif';
  g.fillText(GATE_WORDS[0], 0, by - h + 11.5, w - 10);
  g.font = 'bold 7px sans-serif';
  g.fillText(GATE_WORDS[1], 0, by - 8, w - 14);
  g.translate(0, by - h - 9);
  cog(g, c, turn);
}

/** A lamp hanging from a short bracket at (x, y); glows at night once lit. */
function lamp(g: CanvasRenderingContext2D, x: number, y: number, dir: number, lit: boolean, glow: boolean): void {
  g.strokeStyle = '#4a4038';
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x + dir * 8, y);
  g.lineTo(x + dir * 8, y + 4);
  g.stroke();
  const lx = x + dir * 8;
  if (glow) {
    const gl = g.createRadialGradient(lx, y + 9, 2, lx, y + 9, 22);
    gl.addColorStop(0, 'rgba(255,222,140,0.85)');
    gl.addColorStop(1, 'rgba(255,222,140,0)');
    g.fillStyle = gl;
    g.fillRect(lx - 22, y - 13, 44, 44);
  }
  g.fillStyle = lit ? (glow ? '#fff3b0' : '#ffe08a') : '#d9d0c0';
  g.strokeStyle = KANO_INK;
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(lx - 3.5, y + 4);
  g.lineTo(lx + 3.5, y + 4);
  g.lineTo(lx + 2.5, y + 13);
  g.lineTo(lx - 2.5, y + 13);
  g.closePath();
  g.fill();
  g.stroke();
}

/** The round-topped opening's path (sides at +-r, top of the round at y -openH). */
function opening(g: CanvasRenderingContext2D): void {
  const r = KANO_GATE.openW / 2;
  const top = -KANO_GATE.openH;
  g.beginPath();
  g.moveTo(-r, 0);
  g.lineTo(-r, top + r);
  g.arc(0, top + r, r, Math.PI, 0);
  g.lineTo(r, 0);
  g.closePath();
}

/** One open door against the opening's side (side -1 left, 1 right): plain planks and a few studs. */
function door(g: CanvasRenderingContext2D, side: number, c: WallColours): void {
  const r = KANO_GATE.openW / 2;
  const x = side * r;
  const ix = side * (r - 9);
  g.fillStyle = c.door;
  g.beginPath();
  g.moveTo(x, 0);
  g.lineTo(ix, -3);
  g.lineTo(ix, -KANO_GATE.openH + r - 2);
  g.lineTo(x, -KANO_GATE.openH + r + 4);
  g.closePath();
  g.fill();
  g.stroke();
  g.strokeStyle = c.doorDark;
  g.lineWidth = 0.9;
  g.beginPath();
  for (const k of [0.33, 0.66]) {
    const px = x + (ix - x) * k;
    g.moveTo(px, -1 - 3 * k);
    g.lineTo(px, -KANO_GATE.openH + r + 3 - 6 * k);
  }
  g.stroke();
  g.fillStyle = c.doorDark;
  for (const yy of [-10, -24, -38]) g.fillRect(x + (ix - x) * 0.5 - 1, yy, 2, 2);
  g.strokeStyle = KANO_INK;
  g.lineWidth = 1.3;
}

/** What shows through the gateway: sand, a flat-roofed earth house with raised corners, hung bags. */
function glimpse(g: CanvasRenderingContext2D, lit: boolean): void {
  g.save();
  opening(g);
  g.clip();
  g.fillStyle = lit ? '#f7dc9c' : '#eed9ae';
  g.fillRect(-30, -64, 60, 64);
  g.fillStyle = lit ? '#d9a06a' : '#c9a283';
  g.fillRect(-14, -34, 30, 26);
  g.fillRect(-16, -37, 4, 5);
  g.fillRect(14, -37, 4, 5);
  g.fillStyle = '#7a5038';
  g.fillRect(-2, -22, 7, 14);
  g.fillStyle = lit ? '#b0603a' : '#9b7a62';
  for (const bx of [-9, 10]) {
    g.beginPath();
    g.ellipse(bx, -26, 2.6, 3.2, 0, 0, TAU);
    g.fill();
  }
  g.fillStyle = lit ? '#e8c27a' : '#dcc39a';
  g.fillRect(-30, -8, 60, 8);
  g.restore();
}

/**
 * The gate in the old wall, base centre at (cx, y), s gate units to a canvas unit. About 96 x 125
 * units with the board and cog (more with `wings`). Draw the hero, bus and road after it.
 */
export function drawKanoGate(g: CanvasRenderingContext2D, cx: number, y: number, s: number, o: KanoGateOpts = {}): void {
  const lit = o.lit === true;
  const c = colours(lit);
  const { blockW: bw, blockH: bh } = KANO_GATE;
  const turn = kanoCogTurn(lit, o.time ?? 0, o.still === true);
  g.save();
  g.translate(cx, y);
  g.scale(s, s);
  if (o.wings) {
    drawKanoWall(g, -bw / 2 - o.wings, -bw / 2 + 4, 0, 1, lit);
    drawKanoWall(g, bw / 2 - 4, bw / 2 + o.wings, 0, 1, lit);
  }
  g.lineJoin = 'round';
  g.strokeStyle = KANO_INK;
  g.lineWidth = 1.4;
  // The gate block: taller than the wall, rounded top corners, bigger triangles
  triangles(g, -bw / 2 + 4, bw / 2 - 4, -bh, 16, 9, c);
  g.fillStyle = c.wall;
  g.beginPath();
  g.moveTo(-bw / 2, 0);
  g.lineTo(-bw / 2, -bh + 10);
  g.quadraticCurveTo(-bw / 2, -bh, -bw / 2 + 10, -bh);
  g.lineTo(bw / 2 - 10, -bh);
  g.quadraticCurveTo(bw / 2, -bh, bw / 2, -bh + 10);
  g.lineTo(bw / 2, 0);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = c.light;
  g.fillRect(-bw / 2 + 3, -bh + 3, bw - 6, 4);
  g.fillRect(-bw / 2 + 2, -bh + 8, 4, bh - 14);
  g.fillStyle = 'rgba(0,0,0,0.14)';
  g.fillRect(bw / 2 - 7, -bh + 8, 5, bh - 14);
  g.fillStyle = c.dark;
  g.fillRect(-bw / 2, -6, bw, 6);
  // A raised band around the opening
  g.save();
  g.scale(1.22, 1.08);
  g.fillStyle = c.dark;
  opening(g);
  g.fill();
  g.restore();
  glimpse(g, lit);
  opening(g);
  g.stroke();
  door(g, -1, c);
  door(g, 1, c);
  for (const side of [-1, 1]) lamp(g, side * 36, -62, side, lit, lit && o.night === true);
  // The board on its own post, in front of the wall
  g.save();
  g.translate(o.boardX ?? -58, 0);
  g.strokeStyle = KANO_INK;
  g.lineWidth = 1.4;
  g.fillStyle = 'rgba(80,40,15,0.16)';
  g.beginPath();
  g.ellipse(4, 4, 9, 2.4, 0, 0, TAU);
  g.fill();
  board(g, c, turn);
  g.restore();
  g.restore();
}

/** The cog's turn on the gate at a time (0 when faded or still), for tests and the city. */
export function kanoCogTurn(lit: boolean, time: number, still: boolean): number {
  return lit && !still ? ((time / KANO_COG_TURN_S) % 1) * TAU : 0;
}
