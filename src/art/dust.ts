/**
 * Small ground puffs for the hero (slice 2): the start-of-run dust puff and the
 * skid scuff on a turn. Drawn in the hero's own frame (feet at 0, 0, facing +x),
 * so they flip with the hero. Plain circles and lines: cheap on a slow phone.
 */
const DUST = '#d9c7a3';
const DUST_EDGE = '#a8916b';
const TAU = Math.PI * 2;

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/** Start of a run: three soft puffs kicked up behind the back foot. p = 0 to 1 (gone at 1). */
export function drawDustPuff(g: CanvasRenderingContext2D, p: number): void {
  const k = clamp01(Number.isFinite(p) ? p : 1);
  if (k >= 1) return;
  g.save();
  g.globalAlpha = (1 - k) * 0.85;
  g.fillStyle = DUST;
  g.strokeStyle = DUST_EDGE;
  g.lineWidth = 0.8;
  const puffs = [
    [-7, -2, 2.6],
    [-12, -4, 3.2],
    [-17, -2.5, 2.4],
  ] as const;
  for (const [x, y, r] of puffs) {
    g.beginPath();
    g.arc(x - k * 8, y - k * 4, r * (0.7 + k * 0.9), 0, TAU);
    g.fill();
    g.stroke();
  }
  g.restore();
}

/** Skid on a turn: a scuff of dust ahead of the braced foot and two short drag lines. s = 0 to 1. */
export function drawSkidScuff(g: CanvasRenderingContext2D, s: number, time: number): void {
  const k = clamp01(Number.isFinite(s) ? s : 0);
  if (k <= 0) return;
  g.save();
  g.globalAlpha = k * 0.9;
  g.strokeStyle = DUST_EDGE;
  g.lineWidth = 1.2;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(-4, -0.4);
  g.lineTo(-14, -0.4);
  g.moveTo(-2, 0.6);
  g.lineTo(-9, 0.6);
  g.stroke();
  g.fillStyle = DUST;
  g.lineWidth = 0.8;
  const wob = Number.isFinite(time) ? Math.sin(time * 30) * 0.6 : 0;
  for (const [x, y, r] of [
    [12, -2, 2.2],
    [15, -4.5, 1.8],
    [9.5, -4, 1.5],
  ] as const) {
    g.beginPath();
    g.arc(x, y + wob * (r - 1.5), r * (0.6 + k * 0.5), 0, TAU);
    g.fill();
    g.stroke();
  }
  g.restore();
}

/**
 * Dust off (S2.13 part 5): a small puff knocked off a knee by a pat, centred on the
 * knee (kx, ky) in the hero's frame. size 0 to 1 (the second pat is bigger),
 * p = 0 to 1 through this pat (the puff spreads up and out and fades).
 */
export function drawKneePuff(g: CanvasRenderingContext2D, kx: number, ky: number, size: number, p: number): void {
  if (![kx, ky, size, p].every(Number.isFinite)) return;
  const k = clamp01(p);
  const s = clamp01(size);
  g.save();
  g.globalAlpha = (1 - k * 0.6) * 0.85;
  g.fillStyle = DUST;
  g.strokeStyle = DUST_EDGE;
  g.lineWidth = 0.7;
  for (const [x, y, r] of [
    [3, -2, 1.8],
    [5.5, -4.5, 1.4],
    [1, -5, 1.2],
  ] as const) {
    g.beginPath();
    g.arc(kx + x * (0.8 + k * 0.6), ky + y * (0.8 + k * 0.6), r * (0.7 + s * 0.6) * (0.8 + k * 0.5), 0, TAU);
    g.fill();
    g.stroke();
  }
  g.restore();
}
