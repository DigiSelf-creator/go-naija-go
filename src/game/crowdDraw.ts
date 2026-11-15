/**
 * Drawing the people (task S3g1b; design.md "People everywhere" part 11): each place's cast is
 * baked once into one sprite sheet at the screen's pixel scale (art's bakeFolk), then every
 * person is one drawImage. Bubbles, the heads in bus windows, the keke's riders and the okada
 * are baked once too. Rebuilt only when the screen's pixel scale or the cast changes.
 */
import { bakeBubble, drawFolkSprite, folkFramesFor, folkSheetLayout, type FolkSheet } from '../art/folkBake';
import { FOLK_BOX, drawFolkFrame, drawKekeRiders, drawOkada, drawWindowHeads, type FolkFrame, type FolkLook } from '../art/folk';
import { OKADA_BOX, BUS_SHAPE_WINDOWS } from '../art/folkCasts';
import { WORDS } from '../screens/words';
import type { Bubble, FolkDraw } from './crowd';

type G = CanvasRenderingContext2D;

/** The screen's device pixel ratio as the game canvas uses it (view.ts caps it at 2). */
export function screenRatio(): number {
  const r = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
  return Math.min(Math.max(r, 1), 2);
}

/**
 * One cast baked at one size. The bake is spread over frames (at most `budget` ms each), so a
 * place's first frame is never held up (part 11: no more than 30 ms later): a person whose
 * picture is not baked yet is simply not drawn for those first few frames.
 */
export class CastSheet {
  private sheet: FolkSheet | null = null;
  private key = '';
  private todo: { look: number; frame: FolkFrame }[] = [];
  private looks: readonly FolkLook[] = [];
  private next = 0;
  /** The cells by look, then frame (found without building a key each draw). */
  private byLook: Map<FolkFrame, [number, number]>[] = [];
  /** Milliseconds the bake took in all, over its frames (qa: at most 40 ms on the slow phone profile). */
  bakeMs = 0;
  /** The longest piece of it in one frame. */
  bakeStepMs = 0;

  constructor(
    private frames: (look: FolkLook, i: number) => readonly FolkFrame[] = folkFramesFor,
    private budget = 4,
  ) {}

  /** Makes the sheet if the cast or the pixel scale changed, and bakes a little more of it. */
  ready(looks: readonly FolkLook[], pxPerU: number, castKey: string): FolkSheet | null {
    const key = `${castKey}|${pxPerU.toFixed(3)}`;
    // No page (unit tests drawing with a stand-in context): nobody is drawn.
    if (typeof document === 'undefined') return null;
    if (!this.sheet || key !== this.key) {
      this.key = key;
      this.looks = looks;
      // Stand first for everyone, then the other frames, so people show as early as possible.
      const first = (f: FolkFrame): boolean => f === 'stand' || f === 'backStand' || f === 'sit';
      const all = looks.flatMap((l, i) => this.frames(l, i).map((frame) => ({ look: i, frame })));
      this.todo = [...all.filter((c) => first(c.frame)), ...all.filter((c) => !first(c.frame))];
      const layout = folkSheetLayout(this.todo.length, pxPerU);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, layout.width);
      canvas.height = Math.max(1, layout.height);
      this.sheet = { canvas, layout, cells: new Map() };
      this.byLook = [];
      this.next = 0;
      this.bakeMs = 0;
      this.bakeStepMs = 0;
    }
    if (this.next < this.todo.length) {
      const t0 = performance.now();
      const sh = this.sheet;
      const L = sh.layout;
      const c2 = sh.canvas.getContext('2d')!;
      while (this.next < this.todo.length) {
        const c = this.todo[this.next]!;
        const n = this.next++;
        const sx = (n % L.cols) * L.cellW;
        const sy = Math.floor(n / L.cols) * L.cellH;
        c2.setTransform(L.pxPerU, 0, 0, L.pxPerU, sx + 1 - FOLK_BOX.l * L.pxPerU, sy + 1 - FOLK_BOX.t * L.pxPerU);
        drawFolkFrame(c2, this.looks[c.look]!, c.frame);
        sh.cells.set(`${c.look}:${c.frame}`, [sx, sy]);
        (this.byLook[c.look] ??= new Map()).set(c.frame, [sx, sy]);
        if (performance.now() - t0 > this.budget) break;
      }
      c2.setTransform(1, 0, 0, 1, 0, 0);
      const ms = performance.now() - t0;
      this.bakeMs += ms;
      this.bakeStepMs = Math.max(this.bakeStepMs, ms);
    }
    return this.sheet;
  }

  get baked(): FolkSheet | null {
    return this.sheet;
  }

  /**
   * The whole sheet is baked. Nobody is drawn from it before then: a canvas still being drawn
   * into would have to be copied again for every frame that uses it (a big cost on a slow phone).
   */
  get done(): boolean {
    return this.sheet !== null && this.next >= this.todo.length;
  }

  /**
   * One person in device pixels (the context's transform is the identity): feet at (sx, sy),
   * unitPx device px a unit. When the sheet was baked at this scale the copy is 1:1 at whole
   * pixels. Nothing is drawn until the whole sheet is baked.
   */
  drawDevice(g: G, d: Pick<FolkDraw, 'look' | 'frame' | 'flip' | 'size'>, sx: number, sy: number, unitPx: number): void {
    const s = this.sheet;
    if (!s || !this.done) return;
    const m = this.byLook[d.look];
    // Never stops the frame: an unknown frame shows the person standing.
    const c = m?.get(d.frame) ?? m?.get(String(d.frame).startsWith('back') ? 'backStand' : 'stand');
    if (!c) return;
    const L = s.layout;
    let k = (d.size * unitPx) / L.pxPerU;
    if (Math.abs(k - 1) < 0.02) k = 1;
    const w = L.cellW * k;
    const h = L.cellH * k;
    const ox = (1 - FOLK_BOX.l * L.pxPerU) * k;
    const oy = (1 - FOLK_BOX.t * L.pxPerU) * k;
    const y = Math.round(sy - oy);
    if (!d.flip) {
      g.drawImage(s.canvas, c[0], c[1], L.cellW, L.cellH, Math.round(sx - ox), y, w, h);
      return;
    }
    const x = Math.round(sx);
    g.setTransform(-1, 0, 0, 1, x, 0);
    g.drawImage(s.canvas, c[0], c[1], L.cellW, L.cellH, -Math.round(ox), y, w, h);
    g.setTransform(1, 0, 0, 1, 0, 0);
  }

  /** One person: one drawImage. A frame the look did not bake falls back to standing. */
  draw(g: G, d: Pick<FolkDraw, 'look' | 'frame' | 'x' | 'y' | 'flip' | 'size'>): void {
    const s = this.sheet;
    if (!s || !this.done) return;
    if (!drawFolkSprite(g, s, d.look, d.frame, d.x, d.y, d.size, d.flip)) drawFolkSprite(g, s, d.look, String(d.frame).startsWith('back') ? 'backStand' : 'stand', d.x, d.y, d.size, d.flip);
  }
}

/* ---------------------------------------------------------------- bubbles */

const BUBBLES = new Map<string, ReturnType<typeof bakeBubble>>();
const GLYPHS = new Map<string, boolean>();

/**
 * True when every letter of `text` shows on this phone (no tone mark drawn as a box): each
 * letter outside plain ASCII is drawn and compared with a letter the font surely lacks.
 */
function lettersShow(text: string): boolean {
  if (/^[\x20-\x7e]*$/.test(text)) return true;
  const have = GLYPHS.get(text);
  if (have !== undefined) return have;
  let ok = true;
  try {
    const c = document.createElement('canvas');
    c.width = 24;
    c.height = 24;
    const g = c.getContext('2d', { willReadFrequently: true });
    if (g) {
      const ink = (ch: string): string => {
        g.clearRect(0, 0, 24, 24);
        g.font = 'bold 18px sans-serif';
        g.fillStyle = '#000';
        g.textBaseline = 'middle';
        g.fillText(ch, 2, 12);
        const d = g.getImageData(0, 0, 24, 24).data;
        let s = '';
        for (let i = 3; i < d.length; i += 16) s += d[i]! > 127 ? '1' : '0';
        return s;
      };
      const box = ink('');
      for (const ch of new Set([...text.normalize('NFC')])) {
        if (ch.charCodeAt(0) < 0x7f) continue;
        if (ink(ch) === box) ok = false;
      }
    }
  } catch {
    ok = true;
  }
  GLYPHS.set(text, ok);
  return ok;
}

/** The words a bubble shows on this phone: the plain spelling if a tone mark would show as a box. */
export function bubbleText(text: string): string {
  const plain = WORDS.folk.plain[text];
  return plain && !lettersShow(text) ? plain : text;
}

/** A bubble baked once per line and pixel ratio (part 11). */
function bubbleImage(text: string, ratio: number): ReturnType<typeof bakeBubble> {
  const key = `${text}|${ratio}`;
  let b = BUBBLES.get(key);
  if (!b) {
    b = bakeBubble(bubbleText(text), ratio, 'centre');
    BUBBLES.set(key, b);
  }
  return b;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
const overlaps = (a: Rect, b: Rect): boolean => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/**
 * Draws the one bubble in world units (unitPx: device px a world unit), unless it would cover
 * one of `avoid` (the hero, a hazard, a coin, a food, the HUD, a button or a toast): then it is
 * not shown (part 6). Returns the box drawn, or null.
 */
export function drawBubbleAt(g: G, b: Bubble, unitPx: number, avoid: readonly Rect[], ratio = screenRatio()): Rect | null {
  if (typeof document === 'undefined') return null;
  const img = bubbleImage(b.text, ratio);
  const k = 1 / unitPx;
  const box: Rect = { x: b.x - img.ax * k, y: b.y - img.ay * k, w: img.w * k, h: img.h * k };
  for (const a of avoid) if (overlaps(box, a)) return null;
  g.drawImage(img.canvas, box.x, box.y, box.w, box.h);
  return box;
}

/* ---------------------------------------------------------------- baked layers */

interface Layer {
  c: HTMLCanvasElement;
  /** Box in its own units. */
  x: number;
  y: number;
  w: number;
  h: number;
}
/** A small picture baked once, in its own units' box. */
function bakeLayer(box: { x: number; y: number; w: number; h: number }, pxPerU: number, draw: (g: G) => void): Layer | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(box.w * pxPerU));
  c.height = Math.max(1, Math.ceil(box.h * pxPerU));
  const g = c.getContext('2d')!;
  g.scale(pxPerU, pxPerU);
  g.translate(-box.x, -box.y);
  draw(g);
  return { c, ...box };
}
function blit(g: G, l: Layer | null | undefined, dx = 0, dy = 0): void {
  if (!l) return;
  g.drawImage(l.c, l.x + dx, l.y + dy, l.w, l.h);
}

/**
 * One place's baked pictures (a bus's heads, the keke, the okada), one per frame kind, kept
 * until the pixel scale or the people change. Looked up without building keys each frame.
 */
export class LayerSlot {
  private px = -1;
  private who: unknown = null;
  private pics: (Layer | null)[] = [];
  get(i: number, pxPerU: number, who: unknown, make: () => Layer | null): Layer | null {
    if (pxPerU !== this.px || who !== this.who) {
      this.px = pxPerU;
      this.who = who;
      this.pics = [];
    }
    let l = this.pics[i];
    if (l === undefined) l = this.pics[i] = make();
    return l;
  }
}

const BUS_BOX = { x: -41, y: -39, w: 74, h: 12 };
/**
 * Heads in drawBusShape's four windows (bus units, the same transform as the bus), still or
 * waving (wave 1 or 2), baked once per look set. `bob` is the bus's own bounce.
 */
export function drawBusHeads(g: G, slot: LayerSlot, looks: readonly (FolkLook | undefined)[], wave: 0 | 1 | 2, pxPerU: number, bob = 0): void {
  blit(g, slot.get(wave, pxPerU, looks, () => bakeLayer(BUS_BOX, pxPerU, (c) => drawWindowHeads(c, BUS_SHAPE_WINDOWS, looks, wave, 0))), 0, bob);
}

/** The heads in any bus's windows (world units), e.g. endBusWindows, baked once per look set and window row. */
export function drawWindowRow(g: G, slot: LayerSlot, windows: readonly Rect[], looks: readonly (FolkLook | undefined)[], wave: 0 | 1 | 2, pxPerU: number): void {
  if (!windows.length) return;
  const l = slot.get(wave, pxPerU, looks, () => {
    const x0 = Math.min(...windows.map((w) => w.x));
    const y0 = Math.min(...windows.map((w) => w.y));
    const rel = windows.map((w) => ({ x: w.x - x0, y: w.y - y0, w: w.w, h: w.h }));
    const w = Math.max(...windows.map((q) => q.x + q.w)) - x0;
    const h = Math.max(...windows.map((q) => q.y + q.h)) - y0;
    const pic = bakeLayer({ x: 0, y: 0, w, h }, pxPerU, (c) => drawWindowHeads(c, rel, looks, wave, 0));
    return pic && { ...pic, x: x0, y: y0 };
  });
  blit(g, l);
}

const KEKE_BOX = { x: -19, y: -36, w: 44, h: 23 };
/** The keke's driver and two passengers (keke units, the keke's transform), baked once. */
export function drawKekeHeads(g: G, slot: LayerSlot, looks: readonly [FolkLook, FolkLook, FolkLook], wave: 0 | 1 | 2, pxPerU: number, time: number): void {
  blit(g, slot.get(wave, pxPerU, looks, () => bakeLayer(KEKE_BOX, pxPerU, (c) => drawKekeRiders(c, 0, 0, 0, looks, wave))), 0, Math.sin((Number.isFinite(time) ? time : 0) * 16) * 0.6);
}

const OKADA_LAYER = { x: OKADA_BOX.l, y: OKADA_BOX.t, w: OKADA_BOX.r - OKADA_BOX.l, h: OKADA_BOX.b - OKADA_BOX.t };
/** The okada and its two riders (okada units, wheels on y = 0, facing right), two baked wheel frames. */
export function drawOkadaBaked(g: G, slot: LayerSlot, rider: FolkLook, passenger: FolkLook, frame: 0 | 1, pxPerU: number): void {
  blit(g, slot.get(frame, pxPerU, rider, () => bakeLayer(OKADA_LAYER, pxPerU, (c) => drawOkada(c, rider, passenger, frame))));
}
