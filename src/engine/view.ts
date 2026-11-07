/**
 * The game world is always 420 units tall (docs/design.md S2.1): the road top is at y = 300,
 * the road front and a pavement strip fill y 300 to 420, and the phone buttons sit in that
 * bottom strip so a thumb never covers play. The width follows the screen shape.
 * The canvas backing store uses device pixels (capped at 2x to keep cheap phones fast).
 */
export const WORLD_H = 420;
/** Top of the pavement strip under the road front (S2.1). */
export const STRIP_Y = 360;
export const MAX_DPR = 2;
/** The view always shows at least this much world across (a safety net for upright screens). */
export const MIN_WORLD_W = 480;

export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface View {
  /** Canvas size in device pixels. */
  pixelW: number;
  pixelH: number;
  /** Device pixels per world unit. */
  scale: number;
  /** Visible world size in world units. */
  width: number;
  height: number;
  /** Notch and home-bar areas, in world units. Keep buttons and text out of these. */
  safe: Insets;
}

export function fitView(cssW: number, cssH: number, dpr: number, safeCss: Insets = { top: 0, right: 0, bottom: 0, left: 0 }): View {
  const ratio = Math.min(Math.max(dpr || 1, 1), MAX_DPR);
  const pixelW = Math.max(1, Math.round(cssW * ratio));
  const pixelH = Math.max(1, Math.round(cssH * ratio));
  // Normally 420 units tall; on a narrow (upright) screen, shrink so 480 units still fit across.
  const narrow = pixelW / MIN_WORLD_W < pixelH / WORLD_H;
  const scale = narrow ? pixelW / MIN_WORLD_W : pixelH / WORLD_H;
  const cssToWorld = ratio / scale;
  return {
    pixelW,
    pixelH,
    scale,
    width: pixelW / scale,
    height: narrow ? pixelH / scale : WORLD_H,
    safe: {
      top: safeCss.top * cssToWorld,
      right: safeCss.right * cssToWorld,
      bottom: safeCss.bottom * cssToWorld,
      left: safeCss.left * cssToWorld,
    },
  };
}

/** Reads env(safe-area-inset-*) through CSS variables set in index.html. */
export function readSafeArea(): Insets {
  const s = getComputedStyle(document.documentElement);
  const px = (name: string): number => parseFloat(s.getPropertyValue(name)) || 0;
  return { top: px('--safe-top'), right: px('--safe-right'), bottom: px('--safe-bottom'), left: px('--safe-left') };
}
