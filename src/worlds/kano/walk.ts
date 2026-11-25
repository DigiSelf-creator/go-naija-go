/**
 * K6b: where the hero (and the walkers) can walk in Kano from above, and the way there (city.md
 * 5W W1, as Ogun's walk.ts on Kano's map). Pure, no DOM.
 *
 * - The map (1600 x 1000 map units) has a grid of 25 x 25 cells. Roads, lots, the motor park and
 *   the sand inside the wall are walkable; house footprints, the dye yards behind their low wall
 *   (KN-R4: nobody near a pit), the savanna above y 100, the edges past the wall and the wall
 *   itself are not.
 * - A tap on something you cannot walk onto walks to the nearest walkable spot.
 * - The path is a shortest path on the grid (8 ways, never cutting a blocked corner), then
 *   corners cut where nothing is in the way.
 */
import { KANO_BLOCKS } from './city';

export interface Pt {
  x: number;
  y: number;
}

const CELL = 25;
const COLS = 64;
const ROWS = 40;
/** Where the hero first stands: the motor park, in the middle. */
export const KANO_HOME: Readonly<Pt> = { x: 640, y: 470 };

const SHUT = [
  ...KANO_BLOCKS.flatMap((b) => b.boxes.map((k) => [k.x, k.y, k.w, k.d] as const)),
  ...KANO_BLOCKS.filter((b) => b.kind === 'dye').map((b) => [b.x + 4, b.y + b.d * 0.42 - 4, b.w - 8, b.d * 0.52 + 8] as const),
];

/** True when a map point is open ground (ignoring the grid). */
export function kanoGround(x: number, y: number): boolean {
  if (!(x >= 72 && y >= 100 && x <= 1514 && y <= 984)) return false;
  for (const [bx, by, bw, bd] of SHUT) if (x >= bx && x <= bx + bw && y >= by && y <= by + bd) return false;
  return true;
}

const cellOf = (p: Pt): number => Math.max(0, Math.min(ROWS - 1, Math.floor(p.y / CELL))) * COLS + Math.max(0, Math.min(COLS - 1, Math.floor(p.x / CELL)));
const cellMid = (i: number): Pt => ({ x: (i % COLS) * CELL + CELL / 2, y: Math.floor(i / COLS) * CELL + CELL / 2 });

/** The open cells next to cell i (8 ways, never past a blocked corner). */
function around(g: Uint8Array, i: number): number[] {
  const c = i % COLS;
  const r = Math.floor(i / COLS);
  const open = (cc: number, rr: number): boolean => cc >= 0 && rr >= 0 && cc < COLS && rr < ROWS && g[rr * COLS + cc] === 1;
  const out: number[] = [];
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) if ((dr || dc) && open(c + dc, r + dr) && (!dr || !dc || (open(c + dc, r) && open(c, r + dr)))) out.push((r + dr) * COLS + c + dc);
  return out;
}

/** 1 for each walkable cell; any cell the motor park cannot reach is shut, so nothing strands the hero. */
export const KANO_GRID: Uint8Array = (() => {
  const g = new Uint8Array(COLS * ROWS);
  for (let i = 0; i < g.length; i++) {
    const m = cellMid(i);
    g[i] = kanoGround(m.x, m.y) ? 1 : 0;
  }
  const seen = new Uint8Array(g.length);
  const todo = [cellOf(KANO_HOME)];
  seen[todo[0]!] = 1;
  while (todo.length) for (const j of around(g, todo.pop()!)) if (!seen[j]) todo.push(j), (seen[j] = 1);
  for (let i = 0; i < g.length; i++) g[i]! &= seen[i]!;
  return g;
})();

/** The hero may stand here: its cell is open. */
export const kanoWalkable = (p: Pt): boolean => KANO_GRID[cellOf(p)] === 1 && kanoGround(p.x, p.y);

/** The nearest walkable point to p (p itself when it is walkable). */
export function kanoNearest(p: Pt): Pt {
  if (kanoWalkable(p)) return { x: p.x, y: p.y };
  let best: Pt = KANO_HOME;
  let bd = Infinity;
  for (let i = 0; i < KANO_GRID.length; i++) {
    const m = cellMid(i);
    const d = (m.x - p.x) ** 2 + (m.y - p.y) ** 2;
    if (KANO_GRID[i] && d < bd) {
      bd = d;
      best = m;
    }
  }
  return best;
}

/** Nothing blocks the straight walk from a to b (checked every 6 map units). */
function lineClear(a: Pt, b: Pt): boolean {
  const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 6));
  for (let k = 0; k <= n; k++) if (!kanoWalkable({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n })) return false;
  return true;
}

/** The way from a to b (b made walkable first): points to walk through, b last. Empty when already there. */
export function kanoPath(a: Pt, to: Pt): Pt[] {
  const b = kanoNearest(to);
  if (Math.hypot(b.x - a.x, b.y - a.y) < 1) return [];
  if (lineClear(a, b)) return [b];
  const start = cellOf(kanoNearest(a));
  const goal = cellOf(b);
  const from = new Int32Array(KANO_GRID.length).fill(-1);
  const cost = new Float64Array(KANO_GRID.length).fill(Infinity);
  cost[start] = 0;
  // Dijkstra on the grid (2560 cells); the open list is small, so a plain scan for its cheapest.
  const open: number[] = [start];
  while (open.length) {
    let k = 0;
    for (let j = 1; j < open.length; j++) if (cost[open[j]!]! < cost[open[k]!]!) k = j;
    const i = open[k]!;
    open[k] = open[open.length - 1]!;
    open.pop();
    if (i === goal) break;
    for (const j of around(KANO_GRID, i)) {
      const c = cost[i]! + (j % COLS !== i % COLS && Math.floor(j / COLS) !== Math.floor(i / COLS) ? 1.414 : 1);
      if (c < cost[j]!) {
        if (cost[j] === Infinity) open.push(j);
        cost[j] = c;
        from[j] = i;
      }
    }
  }
  if (goal === start) return [b];
  if (from[goal]! < 0) return [];
  const cells: Pt[] = [];
  for (let i = goal; i !== start && i >= 0; i = from[i]!) cells.push(cellMid(i));
  cells.reverse();
  cells[cells.length - 1] = b;
  // Cut corners where nothing is in the way.
  const out: Pt[] = [];
  let at = a;
  for (let k = 0; k < cells.length; ) {
    let far = k;
    for (let j = cells.length - 1; j > k; j--)
      if (lineClear(at, cells[j]!)) {
        far = j;
        break;
      }
    out.push((at = cells[far]!));
    k = far + 1;
  }
  return out;
}
