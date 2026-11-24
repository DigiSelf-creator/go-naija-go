/**
 * Crisp outlines (docs/style.md 1.8, decision 88). Outline widths are set in screen pixels when a
 * figure is drawn (baked), then rounded to whole device pixels, so an edge is solid ink, never a
 * grey fringe. Widths here are what you SEE: the outer half of a stroke drawn under the fill.
 *
 * The device pixels per unit come from the context's own transform (a bake sets it to view scale
 * x devicePixelRatio). The screen ratio is the page's devicePixelRatio capped at 2 (as the game
 * canvas, src/engine/view.ts), or what a bake sets with setInkRatio. With no transform (stand-in
 * contexts in unit tests) a unit counts as one device pixel at ratio 1.
 */
import { MAX_DPR } from '../engine/view';

/** Hero and boss ink. */
export const HERO_INK = '#1d1a14';
/** Street, lane and hall people, animals. */
export const FOLK_INK = '#3a2618';
/** Eyes on every figure. */
export const EYE_INK = '#1f150f';

let ratioSet: number | null = null;

/** ST-H3: a bake may set the screen's ratio (devicePixelRatio, capped at 2); null reads the page. */
export function setInkRatio(r: number | null): void {
  ratioSet = r === null || !Number.isFinite(r) ? null : Math.min(Math.max(r, 1), MAX_DPR);
}

/** Device pixels per screen pixel. */
export function inkRatio(): number {
  if (ratioSet !== null) return ratioSet;
  const d = typeof globalThis.devicePixelRatio === 'number' ? globalThis.devicePixelRatio : 1;
  return Math.min(Math.max(d || 1, 1), MAX_DPR);
}

/** Device pixels per local unit in `g`'s transform now, or null when the context cannot say. */
export function devPerUnit(g: CanvasRenderingContext2D): number | null {
  if (typeof g.getTransform !== 'function') return null;
  const m = g.getTransform() as DOMMatrix | undefined;
  if (!m || typeof m.a !== 'number') return null;
  const s = Math.sqrt(Math.abs(m.a * m.d - m.b * m.c));
  return Number.isFinite(s) && s > 0 ? s : null;
}

/** Visible hero outline in device px for a figure whose unit is `dpu` device px: max(1.6 u, 2 px). */
export function heroInkPx(dpu: number): number {
  return Math.max(1, Math.round(Math.max(1.6 * dpu, 2 * inkRatio())));
}

/** Visible people outline in device px: max(1.2 u, 1.5 px), at least 1 device px thinner than the hero's. */
export function folkInkPx(dpu: number, heroDpu = dpu): number {
  const w = Math.round(Math.max(1.2 * dpu, 1.5 * inkRatio()));
  return Math.max(1, Math.min(w, heroInkPx(heroDpu) - 1));
}

/** Inner lines: at least 1 screen px (whole device px), about half the outline. */
export function innerPx(outlinePx: number): number {
  return Math.max(Math.round(inkRatio()), Math.round(outlinePx / 2));
}

/** Screen pixels per unit for `dpu` device pixels per unit. */
export function screenPerUnit(dpu: number): number {
  return dpu / inkRatio();
}
