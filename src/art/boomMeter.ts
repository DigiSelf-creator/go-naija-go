/**
 * The Booming meter (docs/city.md part 5 step (d), d5; S3d1a): the rising-building icon and the
 * 5-step notched bar that sit inside the "Lagos" heading box. Screen px. Our own plain shapes:
 * a tall block with three windows and a small up-arrow, never a castle or a skyscraper logo.
 *
 * Filled and empty differ by fill (danfo yellow against cream) and a full step gets a small dark
 * tick above it (shape); the words "9 of 20" beside it are HTML (gamedev), so the meter never
 * leans on colour alone.
 *
 * API (gamedev):
 *   boomBarParts(filled, perStep, small)  geometry (also used by the tests)
 *   drawBoomBar(g, x, y, filled, perStep, small)  canvas, top left at (x, y)
 *   boomBarSvg(filled, perStep, small)  the same as SVG markup (aria-hidden) for the HTML box
 *   drawBoomIcon(g, x, y, size) / boomIconSvg(size)  16 px wide, 14 px small
 * `filled` = points since the last mark; `perStep` = (gap to the next mark) / 5: 4 to 20, 6 to 50, ...
 */
import { INK } from './palette';

export const BOOM_YELLOW = '#f2b300';
export const BOOM_EMPTY = '#fffaf0';

/** Sizes in px (d5): wide box 18 x 10 steps; small box 12 x 8. */
export const BOOM_BAR = {
  wide: { stepW: 18, stepH: 10, tickH: 5, icon: 16 },
  small: { stepW: 12, stepH: 8, tickH: 4, icon: 14 },
  gap: 2,
  outline: 2,
  steps: 5,
} as const;

export interface BoomStep {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Notches inside the outline: x and width, and whether filled. */
  notches: { x: number; w: number; filled: boolean }[];
  full: boolean;
}

export interface BoomBarParts {
  w: number;
  h: number;
  steps: BoomStep[];
}

/** The bar's shape: 5 step boxes (2 px gaps, 2 px outline), each split into `perStep` notches. */
export function boomBarParts(filled: number, perStep: number, small = false): BoomBarParts {
  const S = small ? BOOM_BAR.small : BOOM_BAR.wide;
  const per = Math.max(1, Math.floor(Number.isFinite(perStep) ? perStep : 4));
  const n = Math.max(0, Math.min(per * BOOM_BAR.steps, Math.floor(Number.isFinite(filled) ? filled : 0)));
  const o = BOOM_BAR.outline;
  const steps: BoomStep[] = [];
  for (let s = 0; s < BOOM_BAR.steps; s++) {
    const x = s * (S.stepW + BOOM_BAR.gap);
    const y = S.tickH + 1;
    const inner = S.stepW - o * 2;
    const notches = [];
    for (let k = 0; k < per; k++) notches.push({ x: x + o + (inner * k) / per, w: inner / per, filled: s * per + k < n });
    steps.push({ x, y, w: S.stepW, h: S.stepH, notches, full: n >= (s + 1) * per });
  }
  return { w: BOOM_BAR.steps * S.stepW + (BOOM_BAR.steps - 1) * BOOM_BAR.gap, h: S.tickH + 1 + S.stepH, steps };
}

/** The tick over a full step: a small dark check mark, as points. */
function tickPts(st: BoomStep, small: boolean): number[] {
  const S = small ? BOOM_BAR.small : BOOM_BAR.wide;
  const cx = st.x + st.w / 2;
  const t = S.tickH;
  return [cx - t * 0.7, t * 0.45, cx - t * 0.15, t - 0.5, cx + t * 0.8, 0.5];
}

/** The meter bar on a canvas, top left at (x, y), screen px. */
export function drawBoomBar(g: CanvasRenderingContext2D, x: number, y: number, filled: number, perStep: number, small = false): void {
  const p = boomBarParts(filled, perStep, small);
  const o = BOOM_BAR.outline;
  g.save();
  g.translate(x, y);
  for (const st of p.steps) {
    for (const nt of st.notches) {
      g.fillStyle = nt.filled ? BOOM_YELLOW : BOOM_EMPTY;
      g.fillRect(nt.x, st.y + o, nt.w, st.h - o * 2);
    }
    // Thin lines between notches
    g.fillStyle = 'rgba(29,26,20,0.45)';
    for (let k = 1; k < st.notches.length; k++) g.fillRect(st.notches[k]!.x - 0.5, st.y + o, 1, st.h - o * 2);
    g.strokeStyle = INK;
    g.lineWidth = o;
    g.strokeRect(st.x + o / 2, st.y + o / 2, st.w - o, st.h - o);
    if (st.full) {
      const t = tickPts(st, small);
      g.lineCap = 'round';
      g.lineJoin = 'round';
      g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(t[0]!, t[1]!);
      g.lineTo(t[2]!, t[3]!);
      g.lineTo(t[4]!, t[5]!);
      g.stroke();
    }
  }
  g.restore();
}

const f2 = (v: number): string => String(Math.round(v * 100) / 100);

/** The meter bar as SVG markup (aria-hidden: the heading box carries the spoken label). */
export function boomBarSvg(filled: number, perStep: number, small = false): string {
  const p = boomBarParts(filled, perStep, small);
  const o = BOOM_BAR.outline;
  let body = '';
  for (const st of p.steps) {
    for (const nt of st.notches) body += `<rect x="${f2(nt.x)}" y="${st.y + o}" width="${f2(nt.w)}" height="${st.h - o * 2}" fill="${nt.filled ? BOOM_YELLOW : BOOM_EMPTY}"/>`;
    for (let k = 1; k < st.notches.length; k++) body += `<rect x="${f2(st.notches[k]!.x - 0.5)}" y="${st.y + o}" width="1" height="${st.h - o * 2}" fill="${INK}" fill-opacity=".45"/>`;
    body += `<rect x="${st.x + o / 2}" y="${st.y + o / 2}" width="${st.w - o}" height="${st.h - o}" fill="none" stroke="${INK}" stroke-width="${o}"/>`;
    if (st.full) {
      const t = tickPts(st, small).map(f2);
      body += `<path d="M${t[0]} ${t[1]}L${t[2]} ${t[3]}L${t[4]} ${t[5]}" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${p.w} ${p.h}" width="${p.w}" height="${p.h}" aria-hidden="true" focusable="false">${body}</svg>`;
}

/** The rising-building icon on a canvas, top left at (x, y), `size` px square (16, or 14 small). */
export function drawBoomIcon(g: CanvasRenderingContext2D, x: number, y: number, size = 16): void {
  const s = (Number.isFinite(size) && size > 0 ? size : 16) / 16;
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  // The block: a plain tall building with three windows
  g.fillStyle = '#f0a35e';
  g.fillRect(1.5, 2, 8, 13);
  g.strokeStyle = INK;
  g.lineWidth = 1.4;
  g.strokeRect(1.5, 2, 8, 13);
  g.fillStyle = '#fff3b0';
  for (let k = 0; k < 3; k++) g.fillRect(4, 4 + k * 3.6, 3, 2.2);
  // The up-arrow beside it
  g.strokeStyle = '#13703a';
  g.lineWidth = 1.8;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(13, 14.5);
  g.lineTo(13, 4);
  g.moveTo(10.8, 6.6);
  g.lineTo(13, 4);
  g.lineTo(15.2, 6.6);
  g.stroke();
  g.restore();
}

/** The rising-building icon as SVG markup (aria-hidden). */
export function boomIconSvg(size = 16): string {
  const px = Number.isFinite(size) && size > 0 ? size : 16;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="${px}" height="${px}" aria-hidden="true" focusable="false">` +
    `<rect x="1.5" y="2" width="8" height="13" fill="#f0a35e" stroke="${INK}" stroke-width="1.4"/>` +
    `<g fill="#fff3b0"><rect x="4" y="4" width="3" height="2.2"/><rect x="4" y="7.6" width="3" height="2.2"/><rect x="4" y="11.2" width="3" height="2.2"/></g>` +
    `<path d="M13 14.5V4M10.8 6.6L13 4L15.2 6.6" fill="none" stroke="#13703a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`
  );
}
