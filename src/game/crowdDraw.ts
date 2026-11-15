/**
 * Drawing the people (task S3g1b; design.md "People everywhere" part 11): each place's cast is
 * baked once into one sprite sheet at the screen's pixel scale (art's bakeFolk), then every
 * person is one drawImage. Bubbles, the heads in bus windows, the keke's riders and the okada
 * are baked once too. Rebuilt only when the screen's pixel scale or the cast changes.
 */
import { bakeBubble, bakeFolk, drawFolkSprite, type FolkSheet } from '../art/folkBake';
import { drawKekeRiders, drawOkada, drawWindowHeads, type FolkFrame, type FolkLook } from '../art/folk';
import { OKADA_BOX, BUS_SHAPE_WINDOWS } from '../art/folkCasts';
import { WORDS } from '../screens/words';
import type { Bubble, FolkDraw } from './crowd';

type G = CanvasRenderingContext2D;

/** The screen's device pixel ratio as the game canvas uses it (view.ts caps it at 2). */
export function screenRatio(): number {
  const r = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
  return Math.min(Math.max(r, 1), 2);
}

/** One cast baked at one size. */
export class CastSheet {
  private sheet: FolkSheet | null = null;
  private key = '';
  /** Milliseconds the last bake took (qa: at most 40 ms on the slow phone profile). */
  bakeMs = 0;

  constructor(private frames?: (look: FolkLook, i: number) => readonly FolkFrame[]) {}

  /** Makes the sheet if the cast or the pixel scale changed. */
  ready(looks: readonly FolkLook[], pxPerU: number, castKey: string): FolkSheet | null {
    const key = `${castKey}|${pxPerU.toFixed(3)}`;
    // No page (unit tests drawing with a stand-in context): nobody is drawn.
    if (typeof document === 'undefined') return null;
    if (!this.sheet || key !== this.key) {
      const t0 = performance.now();
      this.sheet = bakeFolk(looks, pxPerU, this.frames);
      this.bakeMs = performance.now() - t0;
      this.key = key;
    }
    return this.sheet;
  }

  get baked(): FolkSheet | null {
    return this.sheet;
  }

  /** One person: one drawImage. A frame the look did not bake falls back to standing. */
  draw(g: G, d: Pick<FolkDraw, 'look' | 'frame' | 'x' | 'y' | 'flip' | 'size'>): void {
    const s = this.sheet;
    if (!s) return;
    if (!drawFolkSprite(g, s, d.look, d.frame, d.x, d.y, d.size, d.flip)) drawFolkSprite(g, s, d.look, d.frame.startsWith('back') ? 'backStand' : 'stand', d.x, d.y, d.size, d.flip);
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
const LAYERS = new Map<string, Layer>();
function layer(key: string, box: { x: number; y: number; w: number; h: number }, pxPerU: number, draw: (g: G) => void): Layer | null {
  const k = `${key}|${pxPerU.toFixed(3)}`;
  let l = LAYERS.get(k);
  if (!l && typeof document === 'undefined') return null;
  if (!l) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(box.w * pxPerU));
    c.height = Math.max(1, Math.ceil(box.h * pxPerU));
    const g = c.getContext('2d')!;
    g.scale(pxPerU, pxPerU);
    g.translate(-box.x, -box.y);
    draw(g);
    l = { c, ...box };
    // Keep the cache small: a new screen size replaces the old pictures.
    if (LAYERS.size > 64) LAYERS.clear();
    LAYERS.set(k, l);
  }
  return l;
}
function blit(g: G, l: Layer | null, dx = 0, dy = 0): void {
  if (!l) return;
  g.drawImage(l.c, l.x + dx, l.y + dy, l.w, l.h);
}

const BUS_BOX = { x: -41, y: -39, w: 74, h: 12 };
/**
 * Heads in drawBusShape's four windows (bus units, the same transform as the bus), still or
 * waving (wave 1 or 2), baked once per look set. `bob` is the bus's own bounce.
 */
export function drawBusHeads(g: G, key: string, looks: readonly (FolkLook | undefined)[], wave: 0 | 1 | 2, pxPerU: number, bob = 0): void {
  const l = layer(`bus|${key}|${wave}`, BUS_BOX, pxPerU, (c) => drawWindowHeads(c, BUS_SHAPE_WINDOWS, looks, wave, 0));
  blit(g, l, 0, bob);
}

/** The heads in any bus's windows (world units), e.g. endBusWindows, baked once per look set. */
export function drawWindowRow(g: G, key: string, windows: readonly Rect[], looks: readonly (FolkLook | undefined)[], wave: 0 | 1 | 2, pxPerU: number): void {
  if (!windows.length) return;
  const x0 = Math.min(...windows.map((w) => w.x));
  const y0 = Math.min(...windows.map((w) => w.y));
  const x1 = Math.max(...windows.map((w) => w.x + w.w));
  const y1 = Math.max(...windows.map((w) => w.y + w.h));
  const rel = windows.map((w) => ({ x: w.x - x0, y: w.y - y0, w: w.w, h: w.h }));
  const l = layer(`row|${key}|${wave}|${rel.length}`, { x: 0, y: 0, w: x1 - x0, h: y1 - y0 }, pxPerU, (c) => drawWindowHeads(c, rel, looks, wave, 0));
  blit(g, l, x0, y0);
}

const KEKE_BOX = { x: -19, y: -36, w: 44, h: 23 };
/** The keke's driver and two passengers (keke units, the keke's transform), baked once. */
export function drawKekeHeads(g: G, looks: readonly [FolkLook, FolkLook, FolkLook], wave: 0 | 1 | 2, pxPerU: number, time: number): void {
  const l = layer(`keke|${wave}`, KEKE_BOX, pxPerU, (c) => drawKekeRiders(c, 0, 0, 0, looks, wave));
  blit(g, l, 0, Math.sin((Number.isFinite(time) ? time : 0) * 16) * 0.6);
}

const OKADA_LAYER = { x: OKADA_BOX.l, y: OKADA_BOX.t, w: OKADA_BOX.r - OKADA_BOX.l, h: OKADA_BOX.b - OKADA_BOX.t };
/** The okada and its two riders (okada units, wheels on y = 0, facing right), two baked wheel frames. */
export function drawOkadaBaked(g: G, rider: FolkLook, passenger: FolkLook, frame: 0 | 1, pxPerU: number): void {
  const l = layer(`okada|${frame}`, OKADA_LAYER, pxPerU, (c) => drawOkada(c, rider, passenger, frame));
  blit(g, l);
}
