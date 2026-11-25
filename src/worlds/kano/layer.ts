/**
 * K2a: the Kano part's own "paint once, copy after" strip (style 1.5, kano.md 9.1), so the haze,
 * the rows, the dust streaks and the streamers are copied as the camera moves, never painted
 * fresh each frame. The same idea as src/art/street.ts blitLayer, written here so the lazy Kano
 * part imports no value from outside its folder.
 */
export interface KanoLayer {
  key: string;
  canvas: HTMLCanvasElement;
}
export type KanoSlot = { layer: KanoLayer | null };

/**
 * Copies `paint` (drawn in units over w x h from the strip's origin) to (x, y) on g, painted again
 * only when `key` or the screen scale changes. snap: whole pixels (for a strip that moves every
 * frame). False when it cannot copy 1:1 (no document, a turned or stretched transform): the
 * caller then paints directly.
 */
export function kanoBlit(
  g: CanvasRenderingContext2D,
  slot: KanoSlot,
  key: string,
  x: number,
  y: number,
  w: number,
  h: number,
  paint: (cg: CanvasRenderingContext2D) => void,
  snap = false,
): boolean {
  if (typeof document === 'undefined' || typeof g.getTransform !== 'function') return false;
  const m = g.getTransform();
  if (m.b !== 0 || m.c !== 0 || m.a <= 0 || Math.abs(m.a - m.d) > 1e-9) return false;
  const s = m.d;
  const px = m.e + x * s;
  const py = m.f + y * s;
  const ix = Math.floor(px);
  const iy = Math.floor(py);
  const fx = snap ? 0 : px - ix;
  const fy = snap ? 0 : py - iy;
  const full = `${key}|${s}|${fx.toFixed(3)}|${fy.toFixed(3)}`;
  let layer = slot.layer;
  if (!layer || layer.key !== full) {
    const c = layer?.canvas ?? document.createElement('canvas');
    c.width = Math.ceil(w * s + fx) + 1;
    c.height = Math.ceil(h * s + fy) + 1;
    const cg = c.getContext('2d');
    if (!cg) return false;
    cg.setTransform(s, 0, 0, s, fx, fy);
    paint(cg);
    layer = { key: full, canvas: c };
    slot.layer = layer;
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.drawImage(layer.canvas, snap ? Math.round(px) : ix, snap ? Math.round(py) : iy);
  g.setTransform(m);
  return true;
}

/** Copies the strip, or paints it straight onto g at (x, y) when it cannot be copied. */
export function kanoStrip(g: CanvasRenderingContext2D, slot: KanoSlot, key: string, x: number, y: number, w: number, h: number, paint: (cg: CanvasRenderingContext2D) => void): void {
  if (kanoBlit(g, slot, key, x, y, w, h, paint, true)) return;
  g.save();
  g.translate(x, y);
  paint(g);
  g.restore();
}
