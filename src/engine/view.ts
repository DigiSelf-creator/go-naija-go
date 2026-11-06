/**
 * The game world is always 360 units tall; its width follows the screen shape.
 * The canvas backing store uses device pixels (capped at 2x to keep cheap phones fast).
 */
export const WORLD_H = 360;
export const MAX_DPR = 2;

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
  const scale = pixelH / WORLD_H;
  const cssToWorld = ratio / scale;
  return {
    pixelW,
    pixelH,
    scale,
    width: pixelW / scale,
    height: WORLD_H,
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
