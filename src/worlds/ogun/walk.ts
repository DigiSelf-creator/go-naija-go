/**
 * O6b: where the hero can walk in Ogun from above, and the way there (city.md 5W W1, as Lagos's
 * src/game/walkGrid.ts on Ogun's map). Pure, no DOM.
 *
 * - The map (1600 x 1000 map units) has a grid of 25 x 25 cells. Roads, pavements, lots, the
 *   motor park, the water point and the verge are walkable; building footprints and the top edge
 *   (the quarry, the rocks and the river, above y 100) are not.
 * - A tap on something you cannot walk onto walks to the nearest walkable spot.
 * - The path is a shortest path on the grid (8 ways, never cutting a blocked corner), then
 *   corners cut where nothing is in the way.
 */
import { OGUN_BLOCKS } from './city';

export interface Pt {
  x: number;
  y: number;
}

export const CELL = 25;
const W = 1600;
const H = 1000;
export const COLS = W / CELL;
export const ROWS = H / CELL;
/** The top edge (rocks, quarry, river) is scenery. */
const TOP = 100;
/** Where the hero first stands: the motor park, in the middle. */
export const OGUN_HOME: Readonly<Pt> = { x: 933, y: 700 };

const BOXES = OGUN_BLOCKS.flatMap((b) => b.boxes);

/** True when a map point is open ground (ignoring the grid). */
export function ogunGround(x: number, y: number): boolean {
  if (!(x >= 0 && y >= TOP && x <= W && y <= H)) return false;
  for (const b of BOXES) if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.d) return false;
  return true;
}

/** 1 for each walkable cell; any cell the motor park cannot reach is shut, so nothing strands the hero. */
export const OGUN_GRID: Uint8Array = (() => {
  const g = new Uint8Array(COLS * ROWS);
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) g[r * COLS + c] = ogunGround(c * CELL + CELL / 2, r * CELL + CELL / 2) ? 1 : 0;
  const seen = new Uint8Array(COLS * ROWS);
  const home = cellOf(OGUN_HOME);
  const todo = [home];
  seen[home] = 1;
  while (todo.length) {
    const i = todo.pop()!;
    for (const j of around(g, i)) if (!seen[j]) {
      seen[j] = 1;
      todo.push(j);
    }
  }
  for (let i = 0; i < g.length; i++) if (!seen[i]) g[i] = 0;
  return g;
})();

export function cellOf(p: Pt): number {
  const c = Math.max(0, Math.min(COLS - 1, Math.floor(p.x / CELL)));
  const r = Math.max(0, Math.min(ROWS - 1, Math.floor(p.y / CELL)));
  return r * COLS + c;
}

export function cellMid(i: number): Pt {
  return { x: (i % COLS) * CELL + CELL / 2, y: Math.floor(i / COLS) * CELL + CELL / 2 };
}

/** The open cells next to cell i (8 ways, never past a blocked corner). */
function around(g: Uint8Array, i: number): number[] {
  const c = i % COLS;
  const r = Math.floor(i / COLS);
  const out: number[] = [];
  const open = (cc: number, rr: number): boolean => cc >= 0 && rr >= 0 && cc < COLS && rr < ROWS && g[rr * COLS + cc] === 1;
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      if (!open(c + dc, r + dr)) continue;
      if (dr && dc && (!open(c + dc, r) || !open(c, r + dr))) continue;
      out.push((r + dr) * COLS + c + dc);
    }
  return out;
}

/** The hero may stand here: its cell is open. */
export function ogunWalkable(p: Pt): boolean {
  return p.x >= 0 && p.y >= 0 && p.x <= W && p.y <= H && OGUN_GRID[cellOf(p)] === 1 && ogunGround(p.x, p.y);
}

/** The nearest walkable point to p (p itself when it is walkable). */
export function ogunNearest(p: Pt): Pt {
  if (ogunWalkable(p)) return { x: p.x, y: p.y };
  let best = OGUN_HOME as Pt;
  let bd = Infinity;
  for (let i = 0; i < OGUN_GRID.length; i++) {
    if (!OGUN_GRID[i]) continue;
    const m = cellMid(i);
    const d = (m.x - p.x) ** 2 + (m.y - p.y) ** 2;
    if (d < bd) {
      bd = d;
      best = m;
    }
  }
  return best;
}

/** Nothing blocks the straight walk from a to b (checked every 6 map units). */
export function ogunLineClear(a: Pt, b: Pt): boolean {
  const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 6));
  for (let k = 0; k <= n; k++) {
    const x = a.x + ((b.x - a.x) * k) / n;
    const y = a.y + ((b.y - a.y) * k) / n;
    if (OGUN_GRID[cellOf({ x, y })] !== 1 || !ogunGround(x, y)) return false;
  }
  return true;
}

/** The way from a to b (b made walkable first): points to walk through, b last. Empty when already there. */
export function ogunPath(a: Pt, to: Pt): Pt[] {
  const b = ogunNearest(to);
  if (Math.hypot(b.x - a.x, b.y - a.y) < 1) return [];
  if (ogunLineClear(a, b)) return [b];
  const start = cellOf(ogunNearest(a));
  const goal = cellOf(b);
  const from = new Int32Array(OGUN_GRID.length).fill(-1);
  const cost = new Float64Array(OGUN_GRID.length).fill(Infinity);
  cost[start] = 0;
  // Dijkstra on the grid (2560 cells) with a small binary heap (O6b2: the city's walkers ask for
  // ways too, so a slow phone never stalls when several start at once). Stale heap entries skip.
  const heap: number[] = [start];
  const less = (a: number, b: number): boolean => cost[a]! < cost[b]!;
  const push = (v: number): void => {
    heap.push(v);
    for (let k = heap.length - 1; k > 0; ) {
      const p = (k - 1) >> 1;
      if (!less(heap[k]!, heap[p]!)) break;
      [heap[k], heap[p]] = [heap[p]!, heap[k]!];
      k = p;
    }
  };
  const pop = (): number => {
    const top = heap[0]!;
    const last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      for (let k = 0; ; ) {
        const l = 2 * k + 1;
        const r = l + 1;
        let m = k;
        if (l < heap.length && less(heap[l]!, heap[m]!)) m = l;
        if (r < heap.length && less(heap[r]!, heap[m]!)) m = r;
        if (m === k) break;
        [heap[k], heap[m]] = [heap[m]!, heap[k]!];
        k = m;
      }
    }
    return top;
  };
  const done = new Uint8Array(OGUN_GRID.length);
  while (heap.length) {
    const i = pop();
    if (done[i]) continue;
    done[i] = 1;
    if (i === goal) break;
    for (const j of around(OGUN_GRID, i)) {
      const step = j % COLS !== i % COLS && Math.floor(j / COLS) !== Math.floor(i / COLS) ? 1.414 : 1;
      const c = cost[i]! + step;
      if (c < cost[j]!) {
        cost[j] = c;
        from[j] = i;
        push(j);
      }
    }
  }
  if (goal !== start && from[goal]! < 0) return [];
  const cells: Pt[] = [];
  for (let i = goal; i !== start && i >= 0; i = from[i]!) cells.push(cellMid(i));
  cells.reverse();
  cells[cells.length - 1] = b;
  // Cut corners where nothing is in the way.
  const out: Pt[] = [];
  let at = a;
  let k = 0;
  while (k < cells.length) {
    let far = k;
    for (let j = cells.length - 1; j > k; j--)
      if (ogunLineClear(at, cells[j]!)) {
        far = j;
        break;
      }
    out.push(cells[far]!);
    at = cells[far]!;
    k = far + 1;
  }
  return out;
}
