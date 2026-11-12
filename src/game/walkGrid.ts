/**
 * Where the hero can walk in Lagos from above, and the way there (docs/city.md part 5W, W1
 * "The path"), with no DOM.
 *
 * - The map (1600 x 1000 map units) has a walk grid of 25 x 25 cells: 64 x 40 cells. Roads,
 *   pavements, the bus park, the jetty, the bridge deck and the lots in front of each block are
 *   walkable. Building footprints and the lagoon are not.
 * - A tap on something you cannot walk onto walks to the nearest walkable spot; a tap on a
 *   building (its roof or its front wall, as drawn) walks to its front door.
 * - The path is a plain shortest path on the grid (8 ways, never cutting a blocked corner), then
 *   corners cut where nothing is in the way. Well under 2 ms on a cheap phone.
 */
import { CITY_BLOCKS, CITY_MAP, LAGOON_Y, type CityBox } from '../art/city';

export interface Pt {
  x: number;
  y: number;
}

export const CELL = 25;
export const COLS = Math.ceil(CITY_MAP.w / CELL);
export const ROWS = Math.ceil(CITY_MAP.h / CELL);

/** The jetty's walkway (map units; drawJetty at 410, 838 is 36 x 96). */
const JETTY = { x: 410, y: 838, w: 36, h: 96 } as const;
/** The bridge's road deck (between its rails): from (1306..1338, 834) sliding 240 east over 196 south. */
const BRIDGE = { x0: 1306, x1: 1338, y0: 834, dx: 240, dy: 196 } as const;

const BOXES: readonly CityBox[] = CITY_BLOCKS.flatMap((b) => b.boxes);

function inBox(x: number, y: number, b: { x: number; y: number; w: number; d: number }): boolean {
  return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.d;
}

/** True when a map point is on ground the hero may stand on (ignoring the grid). */
export function groundOpen(x: number, y: number): boolean {
  if (!(x >= 0 && y >= 0 && x <= CITY_MAP.w && y <= CITY_MAP.h)) return false;
  for (const b of BOXES) if (inBox(x, y, b)) return false;
  if (y < LAGOON_Y - 4) return true;
  if (x >= JETTY.x && x <= JETTY.x + JETTY.w && y <= JETTY.y + JETTY.h) return true;
  const t = (y - BRIDGE.y0) / BRIDGE.dy;
  if (t >= 0) {
    const off = BRIDGE.dx * t;
    if (x >= BRIDGE.x0 + off && x <= BRIDGE.x1 + off) return true;
  }
  return false;
}

/** 1 for each walkable cell (judged at the cell's middle), row by row. Made once. */
export const GRID: Uint8Array = (() => {
  const g = new Uint8Array(COLS * ROWS);
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) g[r * COLS + c] = groundOpen(c * CELL + CELL / 2, r * CELL + CELL / 2) ? 1 : 0;
  return g;
})();

const clampI = (n: number, hi: number): number => Math.min(hi - 1, Math.max(0, Math.floor(n)));

export function cellOf(p: Pt): number {
  return clampI(p.y / CELL, ROWS) * COLS + clampI(p.x / CELL, COLS);
}

export function cellMid(i: number): Pt {
  return { x: (i % COLS) * CELL + CELL / 2, y: Math.floor(i / COLS) * CELL + CELL / 2 };
}

/** The point is in a walkable cell. */
export function walkable(p: Pt): boolean {
  if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || p.x < 0 || p.y < 0 || p.x >= CITY_MAP.w || p.y >= CITY_MAP.h) return false;
  return GRID[cellOf(p)] === 1;
}

/** The nearest walkable point: the point itself when it is walkable, else the middle of the nearest walkable cell. */
export function nearestOpen(p: Pt): Pt {
  const q = { x: Math.min(CITY_MAP.w - 1, Math.max(0, Number.isFinite(p.x) ? p.x : 0)), y: Math.min(CITY_MAP.h - 1, Math.max(0, Number.isFinite(p.y) ? p.y : 0)) };
  if (walkable(q)) return q;
  const c0 = clampI(q.x / CELL, COLS);
  const r0 = clampI(q.y / CELL, ROWS);
  let best = -1;
  let bestD = Infinity;
  for (let ring = 1; ring < Math.max(COLS, ROWS); ring++) {
    for (let r = r0 - ring; r <= r0 + ring; r++) {
      for (let c = c0 - ring; c <= c0 + ring; c++) {
        if (r < 0 || c < 0 || r >= ROWS || c >= COLS) continue;
        if (Math.max(Math.abs(r - r0), Math.abs(c - c0)) !== ring) continue;
        const i = r * COLS + c;
        if (GRID[i] !== 1) continue;
        const m = cellMid(i);
        const d = (m.x - q.x) ** 2 + (m.y - q.y) ** 2;
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
    }
    // A ring further out can still hold a nearer middle only by less than a cell: one more ring settles it.
    if (best >= 0 && ring > 1 && Math.sqrt(bestD) < (ring - 1) * CELL) break;
  }
  return best >= 0 ? cellMid(best) : q;
}

/**
 * A tap on a building as drawn (its roof stands `h` above its footprint) walks to its front
 * door: the door is at the right of the front wall. Null when the point is on no building.
 */
export function doorAt(m: Pt): Pt | null {
  // Front boxes are drawn over the ones behind: check the nearest (biggest front y) first.
  let hit: CityBox | null = null;
  for (const b of BOXES) {
    if (m.x >= b.x && m.x <= b.x + b.w && m.y >= b.y - b.h && m.y <= b.y + b.d) {
      if (!hit || b.y + b.d > hit.y + hit.d) hit = b;
    }
  }
  if (!hit) return null;
  return nearestOpen({ x: hit.x + hit.w - 9, y: hit.y + hit.d + 10 });
}

/** Where a tap on the map sends the hero: the spot itself, a building's door, or the nearest walkable spot. */
export function tapTarget(m: Pt): Pt {
  return doorAt(m) ?? nearestOpen(m);
}

/** Nothing blocks the straight walk from a to b (checked every 6 map units). */
export function lineClear(a: Pt, b: Pt): boolean {
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  const n = Math.max(1, Math.ceil(d / 6));
  for (let k = 1; k <= n; k++) {
    const t = k / n;
    if (!walkable({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })) return false;
  }
  return true;
}

// The search's own arrays, made once (no garbage per tap).
const N = COLS * ROWS;
const cost = new Float64Array(N);
const from = new Int32Array(N);
const shut = new Uint8Array(N);
const heap = new Int32Array(N * 8);
const heapF = new Float64Array(N * 8);
const DIRS: readonly (readonly [number, number, number])[] = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, Math.SQRT2],
  [1, -1, Math.SQRT2],
  [-1, 1, Math.SQRT2],
  [-1, -1, Math.SQRT2],
];

/** The cells of the shortest grid path from cell a to cell b (both walkable), or null. */
function gridPath(a: number, b: number): number[] | null {
  if (GRID[a] !== 1 || GRID[b] !== 1) return null;
  cost.fill(Infinity);
  shut.fill(0);
  from.fill(-1);
  const bc = b % COLS;
  const br = Math.floor(b / COLS);
  const h = (i: number): number => {
    const dx = Math.abs((i % COLS) - bc);
    const dy = Math.abs(Math.floor(i / COLS) - br);
    return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
  };
  let size = 0;
  const push = (i: number, f: number): void => {
    let k = size++;
    heap[k] = i;
    heapF[k] = f;
    while (k > 0) {
      const p = (k - 1) >> 1;
      if (heapF[p]! <= heapF[k]!) break;
      [heap[p], heap[k]] = [heap[k]!, heap[p]!];
      [heapF[p], heapF[k]] = [heapF[k]!, heapF[p]!];
      k = p;
    }
  };
  const pop = (): number => {
    const top = heap[0]!;
    size--;
    heap[0] = heap[size]!;
    heapF[0] = heapF[size]!;
    let k = 0;
    for (;;) {
      const l = k * 2 + 1;
      const r = l + 1;
      let m = k;
      if (l < size && heapF[l]! < heapF[m]!) m = l;
      if (r < size && heapF[r]! < heapF[m]!) m = r;
      if (m === k) break;
      [heap[m], heap[k]] = [heap[k]!, heap[m]!];
      [heapF[m], heapF[k]] = [heapF[k]!, heapF[m]!];
      k = m;
    }
    return top;
  };
  cost[a] = 0;
  push(a, h(a));
  while (size > 0) {
    const i = pop();
    if (shut[i]) continue;
    shut[i] = 1;
    if (i === b) break;
    const c = i % COLS;
    const r = Math.floor(i / COLS);
    for (const [dc, dr, w] of DIRS) {
      const nc = c + dc;
      const nr = r + dr;
      if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS) continue;
      const j = nr * COLS + nc;
      if (GRID[j] !== 1 || shut[j]) continue;
      // Never squeeze diagonally past a blocked corner.
      if (dc !== 0 && dr !== 0 && (GRID[r * COLS + nc] !== 1 || GRID[nr * COLS + c] !== 1)) continue;
      const nc2 = cost[i]! + w;
      if (nc2 < cost[j]!) {
        cost[j] = nc2;
        from[j] = i;
        if (size < heap.length) push(j, nc2 + h(j));
      }
    }
  }
  if (!shut[b]) return null;
  const out: number[] = [];
  for (let i = b; i !== -1; i = from[i]!) out.push(i);
  return out.reverse();
}

/**
 * The way from `a` to `b` (map units): the points to walk to in turn, ending at `b` (or the
 * nearest walkable spot to it). Empty when already there or when there is no way.
 */
export function findPath(a: Pt, b: Pt): Pt[] {
  const start = walkable(a) ? a : nearestOpen(a);
  const end = walkable(b) ? b : nearestOpen(b);
  if (Math.hypot(end.x - start.x, end.y - start.y) < 0.5) return [];
  if (lineClear(start, end)) return [end];
  const cells = gridPath(cellOf(start), cellOf(end));
  if (!cells) return [];
  const pts: Pt[] = [start, ...cells.slice(1, -1).map(cellMid), end];
  const out: Pt[] = [];
  let at = 0;
  // Cut corners where nothing is in the way: from each corner, go on while the straight line
  // stays clear (one check per point, so a long way stays cheap on a slow phone).
  while (at < pts.length - 1) {
    let next = at + 1;
    while (next + 1 < pts.length && lineClear(pts[at]!, pts[next + 1]!)) next++;
    out.push(pts[next]!);
    at = next;
  }
  return out;
}
