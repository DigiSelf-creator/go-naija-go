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

/**
 * A line width in local units that shows at least `px` screen pixels in `g`'s transform now
 * (style 1.8 part 2: bosses, goats, birds and other animals drawn live), rounded to whole device
 * pixels. For a stroke drawn over its fill, where all of it shows. `w` as is where the context
 * cannot say (stand-in contexts in unit tests).
 */
export function inkAtLeast(g: CanvasRenderingContext2D, w: number, px: number): number {
  const dpu = devPerUnit(g);
  if (dpu === null) return w;
  return Math.max(1, Math.round(Math.max(w * dpu, px * inkRatio()))) / dpu;
}

/**
 * The width of an ink line drawn under a `core` line of colour (a leg, a neck), so each edge shows
 * at least `edge` units and `px` screen pixels, in whole device pixels.
 */
export function edgedWidth(g: CanvasRenderingContext2D, core: number, edge: number, px: number): number {
  return core + 2 * inkAtLeast(g, edge, px);
}

/** Screen pixels per unit for `dpu` device pixels per unit. */
export function screenPerUnit(dpu: number): number {
  return dpu / inkRatio();
}

/*
 * One outline round the whole figure (style 1.8 part 2). A figure is drawn twice: first a
 * silhouette pass on silhouette(g), where fills do nothing and only the outline strokes draw
 * (each one armed with armInk just before it), then the normal paint pass, where the same
 * strokes are only thin inner lines between parts. So the edge of the figure is one thick, even
 * ink line and the parts inside it are split by thin lines.
 */
let armed = 0;

/** Marks the next stroke width as an outline the silhouette pass draws. Returns `w`. */
export function armInk(w: number): number {
  armed = w;
  return w;
}

const NOOP = (): void => undefined;

/** The silhouette pass's context: fills and images do nothing, and only armed strokes draw. */
export function silhouette(g: CanvasRenderingContext2D): CanvasRenderingContext2D {
  armed = 0;
  return new Proxy(g, {
    get(t, k) {
      if (k === 'fill' || k === 'fillRect' || k === 'fillText' || k === 'drawImage' || k === 'strokeText') return NOOP;
      if (k === 'stroke') {
        return (...a: [Path2D?]) => {
          if (armed > 0 && Math.abs(t.lineWidth - armed) <= armed * 1e-3) {
            t.lineJoin = 'round';
            Reflect.apply(t.stroke, t, a);
          }
        };
      }
      const v: unknown = Reflect.get(t, k, t);
      return typeof v === 'function' ? (v as (...x: unknown[]) => unknown).bind(t) : v;
    },
    set(t, k, v) {
      return Reflect.set(t, k, v, t);
    },
  });
}
