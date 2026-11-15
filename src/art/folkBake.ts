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
  /** Pixels per unit actually used (lowered if the sheet would pass maxSide). */
  pxPerU: number;
  cellW: number;
  cellH: number;
  cols: number;
  rows: number;
  width: number;
  height: number;
}

/** Sheet size for `cells` sprites at `pxPerU`, kept within maxSide x maxSide (part 11: 1024). Pure. */
export function folkSheetLayout(cells: number, pxPerU: number, maxSide = 1024): FolkSheetLayout {
  const W = FOLK_BOX.r - FOLK_BOX.l;
  const H = FOLK_BOX.b - FOLK_BOX.t;
  let p = Math.max(0.25, Number.isFinite(pxPerU) ? pxPerU : 1);
  const n = Math.max(1, cells);
  for (let guard = 0; guard < 60; guard++) {
    const cw = Math.ceil(W * p) + 2;
    const ch = Math.ceil(H * p) + 2;
    const cols = Math.max(1, Math.floor(maxSide / cw));
    const rowsN = Math.ceil(n / cols);
    if (rowsN * ch <= maxSide || p <= 0.25) return { pxPerU: p, cellW: cw, cellH: ch, cols, rows: rowsN, width: Math.min(maxSide, cols * cw), height: rowsN * ch };
    p *= 0.94;
  }
  throw new Error('folk sheet');
}

export interface FolkSheet {
  canvas: HTMLCanvasElement;
  layout: FolkSheetLayout;
  /** `${lookIndex}:${frame}` to the cell's top left in pixels. */
  cells: Map<string, [number, number]>;
}

/**
 * Bakes a place's cast into one sprite sheet (part 11): each look in each of its frames, at
 * pxPerU pixels per unit (view.scale x devicePixelRatio x the size you will draw at), within
 * 1024 x 1024. Call when the place opens and again only when the screen size or pixel scale
 * changes. frames: per look (default folkFramesFor).
 */
export function bakeFolk(looks: readonly FolkLook[], pxPerU: number, frames: (look: FolkLook, i: number) => readonly FolkFrame[] = folkFramesFor, maxSide = 1024): FolkSheet {
  const lists = looks.map((l, i) => frames(l, i));
  const total = lists.reduce((n, f) => n + f.length, 0);
  const layout = folkSheetLayout(total, pxPerU, maxSide);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, layout.width);
  canvas.height = Math.max(1, layout.height);
  const g = canvas.getContext('2d')!;
  const cells = new Map<string, [number, number]>();
  let n = 0;
  lists.forEach((list, i) => {
    for (const f of list) {
      const sx = (n % layout.cols) * layout.cellW;
      const sy = Math.floor(n / layout.cols) * layout.cellH;
      g.setTransform(layout.pxPerU, 0, 0, layout.pxPerU, sx + 1 - FOLK_BOX.l * layout.pxPerU, sy + 1 - FOLK_BOX.t * layout.pxPerU);
      drawFolkFrame(g, looks[i]!, f);
      cells.set(`${i}:${f}`, [sx, sy]);
      n++;
    }
  });
  g.setTransform(1, 0, 0, 1, 0, 0);
  return { canvas, layout, cells };
}

/**
 * Draws a baked person with the feet at (x, y) in the current units, `size` times the kit's
 * size (1 in a street at 0.85 of the hero; CITY_FOLK_SCALE in the city). flip faces left.
 * One drawImage. Returns false if that look and frame were not baked.
 */
export function drawFolkSprite(g: G, sheet: FolkSheet, look: number, frame: FolkFrame, x: number, y: number, size = 1, flip = false): boolean {
  const c = sheet.cells.get(`${look}:${frame}`);
  if (!c) return false;
  const L = sheet.layout;
  const k = size / L.pxPerU;
  const w = L.cellW * k;
  const h = L.cellH * k;
  const ox = (1 - FOLK_BOX.l * L.pxPerU) * k;
  const oy = (1 - FOLK_BOX.t * L.pxPerU) * k;
  if (flip) {
    g.save();
    g.translate(x, y);
    g.scale(-1, 1);
    g.drawImage(sheet.canvas, c[0], c[1], L.cellW, L.cellH, -ox, -oy, w, h);
    g.restore();
  } else g.drawImage(sheet.canvas, c[0], c[1], L.cellW, L.cellH, x - ox, y - oy, w, h);
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
