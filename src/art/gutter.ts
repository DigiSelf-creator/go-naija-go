/**
 * Open gutters with thorny weeds (docs/design.md S2.16 B5) and the Gentle mode cement block
 * stack for a dash gap (S2.16 B4).
 *
 * The gutter is a shallow concrete channel across the road with a thin line of dark water.
 * The hero's feet stay at road height across it: it is never drawn as a hole to fall in.
 * The weeds are still, spiky clumps of a plant in a drain and nothing more: they take no
 * time argument, so they look the same in every frame. No mouth, teeth, head, face, bulb,
 * stem, pot or pipe (CLAUDE.md rule 2: nothing like a piranha plant).
 *
 * World space, y down. No gradients or shadowBlur.
 */
import { drawFufuSteamPuff } from './fufu';
import { INK } from './palette';

/** Sizes and colours from S2.16 B5. */
export const GUTTER = {
  /** The two widths, learnable by eye. */
  short: 30,
  long: 44,
  /** The weed box is the gutter's width x 18 u, standing on the road. */
  weedH: 18,
  /** Dried (or trampled) weeds lie flat, this high. */
  flatH: 4,
  /** Seconds the weeds take to dry up after a fufu ball. */
  dryTime: 0.5,
  /** Channel depth drawn below the road surface. */
  depth: 12,
  weed: '#2f6b2a',
  weedLight: '#3f8a37',
  thorn: '#fff3cf',
  dry: '#9a7b5a',
  dryLight: '#b89a74',
  concrete: '#b9b4a8',
  concreteDark: '#8e897d',
  inside: '#4a4640',
  water: '#22313a',
} as const;

/** 'weeds' standing; 'drying' (with k); 'dry' after a fufu ball; 'trampled' flat by amala. */
export type WeedState = 'weeds' | 'drying' | 'dry' | 'trampled';

/**
 * The gutter channel across the road: concrete lips and walls, a dark inside and a thin line
 * of dark water at the bottom. Draw it after the road and before the weeds. x0 is its left
 * edge, w its width (30 or 44).
 */
export function drawGutter(g: CanvasRenderingContext2D, x0: number, w: number, groundY = 300): void {
  if (![x0, w, groundY].every(Number.isFinite) || !(w > 0)) return;
  const d = GUTTER.depth;
  g.fillStyle = GUTTER.inside;
  g.fillRect(x0, groundY, w, d);
  // Concrete walls, a little thick, with a lighter lip on top
  g.fillStyle = GUTTER.concreteDark;
  g.fillRect(x0, groundY, 2.4, d);
  g.fillRect(x0 + w - 2.4, groundY, 2.4, d);
  g.fillStyle = GUTTER.concrete;
  g.fillRect(x0 - 2, groundY - 1, 4.4, 3);
  g.fillRect(x0 + w - 2.4, groundY - 1, 4.4, 3);
  g.fillRect(x0, groundY + d - 2, w, 2);
  // Thin dark water along the bottom
  g.fillStyle = GUTTER.water;
  g.fillRect(x0 + 2.4, groundY + d - 4, w - 4.8, 2);
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.strokeRect(x0, groundY - 0.5, w, d + 0.5);
}

/**
 * Small number from the gutter's x, so each gutter's clumps differ a little but never
 * change from frame to frame.
 */
function seeded(x0: number, i: number): number {
  const s = Math.sin(x0 * 0.0137 + i * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * The thorny weeds filling the gutter from edge to edge (box: w x 18 u, standing on the
 * road at groundY). `state` 'weeds' is the hazard; 'drying' turns them straw brown and lays
 * them down over GUTTER.dryTime (k 0 to 1); 'dry' and 'trampled' lie flat, 4 u high, safe.
 * No time argument: the weeds never move.
 */
export function drawWeeds(g: CanvasRenderingContext2D, x0: number, w: number, groundY = 300, state: WeedState = 'weeds', k = 0): void {
  if (![x0, w, groundY].every(Number.isFinite) || !(w > 0)) return;
  const dk = state === 'drying' ? (Number.isFinite(k) ? Math.min(1, Math.max(0, k)) : 0) : state === 'weeds' ? 0 : 1;
  if (dk >= 1) {
    flatWeeds(g, x0, w, groundY, state === 'trampled');
    return;
  }
  const h = GUTTER.weedH + (GUTTER.flatH - GUTTER.weedH) * dk;
  const fill = dk < 0.5 ? GUTTER.weed : GUTTER.dry;
  const light = dk < 0.5 ? GUTTER.weedLight : GUTTER.dryLight;
  // Clumps of pointed blades, about one every 7 u, each from the gutter floor at the road line
  const n = Math.max(3, Math.round(w / 7));
  const tips: [number, number][] = [];
  g.beginPath();
  g.moveTo(x0, groundY);
  for (let i = 0; i < n; i++) {
    const cx = x0 + ((i + 0.5) / n) * w;
    const half = w / n / 2;
    const tall = h * (0.7 + 0.3 * seeded(x0, i));
    // Three blades per clump: left, middle (tallest), right
    for (const [dx, lean, kk] of [[-0.7, -0.35, 0.75], [0, 0.05, 1], [0.7, 0.4, 0.8]] as const) {
      const bx = cx + dx * half;
      const tx = Math.min(x0 + w - 1.2, Math.max(x0 + 1.2, bx + lean * tall * 0.4));
      const ty = groundY - tall * kk;
      g.lineTo(bx - 1.2, groundY);
      g.lineTo(tx, ty);
      g.lineTo(bx + 1.2, groundY);
      tips.push([tx, ty]);
    }
  }
  g.lineTo(x0 + w, groundY);
  g.closePath();
  g.fillStyle = fill;
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.lineJoin = 'round';
  g.stroke();
  // A lighter vein in some blades
  g.strokeStyle = light;
  g.lineWidth = 0.6;
  g.beginPath();
  tips.forEach(([tx, ty], i) => {
    if (i % 3 !== 1) return;
    g.moveTo(tx, ty + 2);
    g.lineTo(tx - (tx - (x0 + w / 2)) * 0.02, groundY - 1);
  });
  g.stroke();
  // Cream thorn tips: a small sharp point at each tip and two side thorns on the tall blades
  if (dk < 0.5) {
    g.fillStyle = GUTTER.thorn;
    g.strokeStyle = INK;
    g.lineWidth = 0.5;
    tips.forEach(([tx, ty], i) => {
      g.beginPath();
      g.moveTo(tx, ty - 2);
      g.lineTo(tx + 1.1, ty + 1);
      g.lineTo(tx - 1.1, ty + 1);
      g.closePath();
      g.fill();
      g.stroke();
      if (i % 3 === 1) {
        for (const s of [-1, 1]) {
          const sy = ty + (groundY - ty) * (s < 0 ? 0.35 : 0.55);
          const sx = tx + s * 1.4;
          g.beginPath();
          g.moveTo(sx, sy);
          g.lineTo(sx + s * 2.2, sy - 1.2);
          g.lineTo(sx, sy + 1);
          g.closePath();
          g.fill();
          g.stroke();
        }
      }
    });
  }
}

/** Weeds lying flat, 4 u high: straw brown when dried, green when trampled by amala. */
function flatWeeds(g: CanvasRenderingContext2D, x0: number, w: number, groundY: number, trampled: boolean): void {
  const h = GUTTER.flatH;
  g.beginPath();
  g.moveTo(x0, groundY);
  const n = Math.max(3, Math.round(w / 6));
  for (let i = 0; i <= n; i++) {
    const px = x0 + (i / n) * w;
    g.lineTo(px - 1.5, groundY - h * (0.6 + 0.4 * seeded(x0, i)));
    g.lineTo(px + 1.5, groundY - h * 0.45);
  }
  g.lineTo(x0 + w, groundY);
  g.closePath();
  g.fillStyle = trampled ? GUTTER.weed : GUTTER.dry;
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 0.9;
  g.stroke();
  // Laid-down blade lines, all pointing the same way
  g.strokeStyle = trampled ? GUTTER.weedLight : GUTTER.dryLight;
  g.lineWidth = 0.6;
  g.beginPath();
  for (let px = x0 + 3; px < x0 + w - 4; px += 5) {
    g.moveTo(px, groundY - 1);
    g.lineTo(px + 4.5, groundY - h + 1);
  }
  g.stroke();
}

/**
 * The small steam puff as the weeds dry up (with the "fsss"). (x, y) the middle of the
 * gutter at the road; k 0 to 1 over GUTTER.dryTime.
 */
export function drawWeedSteam(g: CanvasRenderingContext2D, x: number, y: number, k: number): void {
  drawFufuSteamPuff(g, x, y - 4, k, 0.9);
}

/* ------------------------------------------------------------ cement blocks */

/** The Gentle mode block stack (S2.16 B4): 60 u wide, solid, its top level with the road. */
export const CEMENT_BLOCKS = {
  w: 60,
  blockW: 20,
  blockH: 9,
  face: '#bdb9b0',
  faceDark: '#a29e95',
  hole: '#5f5b54',
  mortar: '#8f8a80',
} as const;

/**
 * A stack of hollow cement blocks (the ones seen at every Lagos building site) standing in a
 * dash gap from the pit floor up to the road: its left edge at x0, its top at groundY,
 * down to viewH. The top row shows the two holes of each block from above.
 */
export function drawCementBlocks(g: CanvasRenderingContext2D, x0: number, groundY = 300, viewH = 360): void {
  if (![x0, groundY, viewH].every(Number.isFinite)) return;
  const { w, blockW: bw, blockH: bh } = CEMENT_BLOCKS;
  const h = Math.max(bh, viewH - groundY);
  g.save();
  g.beginPath();
  g.rect(x0, groundY, w, h);
  g.fillStyle = CEMENT_BLOCKS.face;
  g.fill();
  g.clip();
  // Rows of blocks, every other row offset by half a block, with mortar lines
  g.strokeStyle = CEMENT_BLOCKS.mortar;
  g.lineWidth = 1;
  g.beginPath();
  let row = 0;
  for (let y = groundY + bh; y < groundY + h; y += bh, row++) {
    g.moveTo(x0, y);
    g.lineTo(x0 + w, y);
  }
  row = 0;
  for (let y = groundY; y < groundY + h; y += bh, row++) {
    const off = row % 2 === 0 ? 0 : bw / 2;
    for (let x = x0 + off; x < x0 + w; x += bw) {
      if (x <= x0) continue;
      g.moveTo(x, y);
      g.lineTo(x, y + bh);
    }
  }
  g.stroke();
  // A soft shade on the lower rows (in the shadow of the gap)
  g.fillStyle = 'rgba(29,26,20,0.12)';
  g.fillRect(x0, groundY + bh * 2, w, h);
  // Top row: two holes per block, seen from above
  g.fillStyle = CEMENT_BLOCKS.hole;
  for (let x = x0; x < x0 + w; x += bw) {
    for (const hx of [0.3, 0.7]) {
      g.fillRect(x + bw * hx - 2.6, groundY + 1.6, 5.2, 2.4);
    }
  }
  g.restore();
  g.strokeStyle = INK;
  g.lineWidth = 1.4;
  g.strokeRect(x0, groundY, w, h);
}
