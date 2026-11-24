/**
 * The bake (S3g1a; design.md "People everywhere" part 11): a place's cast drawn once into one
 * sprite sheet at the screen's pixel scale, then one drawImage per person per frame.
 */
import { BUBBLE, FOLK_BOX, bubbleSize, drawBubble, drawFolkFrame, type FolkFrame, type FolkLook } from './folk';

type G = CanvasRenderingContext2D;

/* ---------------- which frame when ---------------- */

/** Seconds per walk frame at 30 to 45 u/s (one stride about 13 u): 4 frames a step cycle. */
export const FOLK_WALK_FRAME_TIME = 0.15;
/** Seconds per run frame (jogger and children). */
export const FOLK_RUN_FRAME_TIME = 0.09;
/** Seconds per wave or cheer frame (2 frames each). */
export const FOLK_WAVE_FRAME_TIME = 0.25;

/** The frame to show for a walk at `time` seconds (4 frames). Back views add the 'back' prefix. */
export function folkWalkFrame(time: number, back = false): FolkFrame {
  const i = ((Math.floor((Number.isFinite(time) ? time : 0) / FOLK_WALK_FRAME_TIME) % 4) + 4) % 4;
  return (back ? `backWalk${i}` : `walk${i}`) as FolkFrame;
}
export function folkRunFrame(time: number, back = true): FolkFrame {
  const i = ((Math.floor((Number.isFinite(time) ? time : 0) / FOLK_RUN_FRAME_TIME) % 4) + 4) % 4;
  return (back ? `backRun${i}` : `run${i}`) as FolkFrame;
}
/** wave0/wave1 (or cheer0/cheer1, clap0/clap1) at `time`; reduced motion holds the first (arm up) pose. */
export function folkTwoFrame(kind: 'wave' | 'cheer' | 'clap', time: number, still = false): FolkFrame {
  const i = still ? 0 : ((Math.floor((Number.isFinite(time) ? time : 0) / FOLK_WAVE_FRAME_TIME) % 2) + 2) % 2;
  return `${kind}${i}` as FolkFrame;
}

/** The frames a look needs in a street (at most 10), for bakeFolk. */
export function folkFramesFor(look: FolkLook): FolkFrame[] {
  if (look.stool) return ['sit', 'wave0', 'wave1', 'clap0', 'clap1', 'cheer0', 'cheer1'];
  const out: FolkFrame[] = ['stand', 'walk0', 'walk1', 'walk2', 'walk3', 'wave0', 'wave1', 'cheer0', 'cheer1'];
  if (look.chair) out.push('call');
  else if (look.hold === 'phoneCase' || look.hold === 'ankaraRoll' || look.hold === 'breadTray' || look.hold === 'basin' || look.hold === 'headBasket') out.push('call');
  else if (look.age === 'elder') out.push('sit');
  else out.push('call');
  return out;
}

export interface FolkSheetLayout {
  /** Pixels per unit (style 1.8 part 5: never lowered to fit; a cast that does not fit takes more sheets). */
  pxPerU: number;
  cellW: number;
  cellH: number;
  cols: number;
  /** Rows on the first sheet. */
  rows: number;
  /** Cells a full sheet holds. */
  perSheet: number;
  /** Sheets the cast takes (style 1.8 part 5: 2 a place at most on a phone). */
  sheets: number;
  /** The first sheet's size. */
  width: number;
  height: number;
  /** Each sheet's height in pixels (the last one only as tall as its rows). */
  heights: number[];
}

/**
 * Sheet size for `cells` sprites at `pxPerU`: each sheet at most maxSide x maxSide (1024), a
 * cell the art box times pixels per unit rounded up, plus 2 px of gap. A cast that does not fit
 * one sheet goes on into a second (style 1.8 part 5): the pixels per unit are never lowered to
 * fit, so nobody is stretched back up to their size. Pure.
 */
export function folkSheetLayout(cells: number, pxPerU: number, maxSide = 1024): FolkSheetLayout {
  const W = FOLK_BOX.r - FOLK_BOX.l;
  const H = FOLK_BOX.b - FOLK_BOX.t;
  const p = Math.max(0.25, Number.isFinite(pxPerU) ? pxPerU : 1);
  const n = Math.max(1, Math.floor(Number.isFinite(cells) ? cells : 1));
  const cw = Math.ceil(W * p) + 2;
  const ch = Math.ceil(H * p) + 2;
  const cols = Math.max(1, Math.min(n, Math.floor(maxSide / cw)));
  const perSheet = cols * Math.max(1, Math.floor(maxSide / ch));
  const sheets = Math.ceil(n / perSheet);
  const heights: number[] = [];
  for (let i = 0; i < sheets; i++) heights.push(Math.ceil(Math.min(perSheet, n - i * perSheet) / cols) * ch);
  return { pxPerU: p, cellW: cw, cellH: ch, cols, rows: heights[0]! / ch, perSheet, sheets, width: cols * cw, height: heights[0]!, heights };
}

/** Where cell number `n` goes: its sheet, and its top left in pixels there. Pure. */
export function folkCellAt(L: FolkSheetLayout, n: number): { sheet: number; x: number; y: number } {
  const sheet = Math.floor(n / L.perSheet);
  const k = n - sheet * L.perSheet;
  return { sheet, x: (k % L.cols) * L.cellW, y: Math.floor(k / L.cols) * L.cellH };
}

/** One baked person: its sheet, its top left in pixels, and the size it was baked at (1: the kit's size). */
export interface FolkCell {
  sheet: number;
  x: number;
  y: number;
  size: number;
}

export interface FolkSheet {
  /** The first sheet (a cast that fits on one has only this). */
  canvas: HTMLCanvasElement;
  canvases: HTMLCanvasElement[];
  layout: FolkSheetLayout;
  /** `${lookIndex}:${frame}` to its cell. */
  cells: Map<string, FolkCell>;
}

/** A blank canvas for sheet `i` of a layout. */
export function folkCanvas(L: FolkSheetLayout, i: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, L.width);
  c.height = Math.max(1, L.heights[i] ?? L.height);
  return c;
}

/**
 * Bakes a place's cast into sprite sheets in one go (part 11; the game's own bake, spread over
 * frames, is CastSheet in src/game/crowdDraw.ts): each look in each of its frames, at pxPerU
 * device pixels per unit (view.scale x the size you will draw at), each sheet within 1024 x 1024.
 * frames: per look (default folkFramesFor).
 */
export function bakeFolk(looks: readonly FolkLook[], pxPerU: number, frames: (look: FolkLook, i: number) => readonly FolkFrame[] = folkFramesFor, maxSide = 1024): FolkSheet {
  const lists = looks.map((l, i) => frames(l, i));
  const total = lists.reduce((n, f) => n + f.length, 0);
  const layout = folkSheetLayout(total, pxPerU, maxSide);
  const canvases: HTMLCanvasElement[] = [];
  for (let i = 0; i < layout.sheets; i++) canvases.push(folkCanvas(layout, i));
  const cells = new Map<string, FolkCell>();
  const p = layout.pxPerU;
  let n = 0;
  lists.forEach((list, i) => {
    for (const f of list) {
      const at = folkCellAt(layout, n++);
      const g = canvases[at.sheet]!.getContext('2d')!;
      g.setTransform(p, 0, 0, p, at.x + 1 - FOLK_BOX.l * p, at.y + 1 - FOLK_BOX.t * p);
      drawFolkFrame(g, looks[i]!, f);
      g.setTransform(1, 0, 0, 1, 0, 0);
      cells.set(`${i}:${f}`, { ...at, size: 1 });
    }
  });
  return { canvas: canvases[0]!, canvases, layout, cells };
}

/**
 * Draws one baked cell with the feet at (x, y) in the current units, `size` times the kit's size
 * (1 in a street at 0.85 of the hero; CITY_FOLK_SCALE in the city). flip faces left. One drawImage.
 */
export function drawFolkCell(g: G, sheet: FolkSheet, c: FolkCell, x: number, y: number, size = 1, flip = false): void {
  const L = sheet.layout;
  const p = L.pxPerU * c.size;
  const k = size / p;
  const ox = (1 - FOLK_BOX.l * p) * k;
  const oy = (1 - FOLK_BOX.t * p) * k;
  const img = sheet.canvases[c.sheet] ?? sheet.canvas;
  if (flip) {
    g.save();
    g.translate(x, y);
    g.scale(-1, 1);
    g.drawImage(img, c.x, c.y, L.cellW, L.cellH, -ox, -oy, L.cellW * k, L.cellH * k);
    g.restore();
  } else g.drawImage(img, c.x, c.y, L.cellW, L.cellH, x - ox, y - oy, L.cellW * k, L.cellH * k);
}

/** A baked person by look and frame (drawFolkCell). Returns false if that look and frame were not baked. */
export function drawFolkSprite(g: G, sheet: FolkSheet, look: number, frame: FolkFrame, x: number, y: number, size = 1, flip = false): boolean {
  const c = sheet.cells.get(`${look}:${frame}`);
  if (!c) return false;
  drawFolkCell(g, sheet, c, x, y, size, flip);
  return true;
}

/** Bakes one bubble once (part 11) at `scale` device px per screen px. ax, ay: the tail tip in the canvas (device px). */
export function bakeBubble(text: string, scale = 1, tail: 'left' | 'centre' | 'right' = 'left', px: number = BUBBLE.minPx): { canvas: HTMLCanvasElement; ax: number; ay: number; w: number; h: number } {
  const c = document.createElement('canvas');
  const g = c.getContext('2d')!;
  const { w, h, tail: t } = bubbleSize(g, text, px);
  const pad = 2;
  c.width = Math.ceil((w + pad * 2) * scale);
  c.height = Math.ceil((h + t + pad * 2) * scale);
  g.scale(scale, scale);
  const tx = tail === 'left' ? w * 0.22 : tail === 'right' ? w * 0.78 : w / 2;
  drawBubble(g, text, pad + tx, pad + h + t, { px, tail });
  return { canvas: c, ax: (pad + tx) * scale, ay: (pad + h + t) * scale, w: c.width, h: c.height };
}
