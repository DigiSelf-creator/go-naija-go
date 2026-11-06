/**
 * Pick-ups and effects: kobo coin, the three foods, pickup sparkle, shield bubble.
 * World space, centred on (x, y). No gradients or shadowBlur.
 */
import * as P from './palette';

const TAU = Math.PI * 2;

export type FoodKind = 'corn' | 'garri' | 'amala';

/** Spinning kobo coin. The "k" shows when the coin faces you. */
export function drawKobo(g: CanvasRenderingContext2D, x: number, y: number, time: number): void {
  const spin = Math.cos(time * 5 + x * 0.05);
  const w = Math.abs(spin) * 8 + 1.5;
  g.fillStyle = P.KOBO_DARK;
  g.beginPath();
  g.ellipse(x + (spin > 0 ? 1 : -1), y, w, 10, 0, 0, TAU);
  g.fill();
  g.fillStyle = P.KOBO;
  g.beginPath();
  g.ellipse(x, y, w, 10, 0, 0, TAU);
  g.fill();
  if (w > 6) {
    g.strokeStyle = P.KOBO_DARK;
    g.lineWidth = 1.2;
    g.beginPath();
    g.ellipse(x, y, w - 2.5, 7.5, 0, 0, TAU);
    g.stroke();
    g.fillStyle = P.KOBO_DARK;
    g.font = 'bold 10px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('k', x, y + 0.5);
  }
  g.fillStyle = P.KOBO_SHINE;
  g.fillRect(x - w * 0.5, y - 6, Math.max(1, w * 0.25), 3);
}

function outline(g: CanvasRenderingContext2D, w = 1.4): void {
  g.strokeStyle = P.INK;
  g.lineWidth = w;
  g.stroke();
}

function corn(g: CanvasRenderingContext2D): void {
  g.rotate(-0.5);
  // Husk leaves
  g.fillStyle = '#5f9a3a';
  g.beginPath();
  g.moveTo(-5, 9);
  g.quadraticCurveTo(-14, 16, -10, 22);
  g.lineTo(0, 13);
  g.quadraticCurveTo(10, 20, 9, 22);
  g.lineTo(5, 9);
  g.closePath();
  g.fill();
  outline(g, 1.2);
  // Cob
  g.fillStyle = '#f2b300';
  g.beginPath();
  g.roundRect(-6, -15, 12, 27, 6);
  g.fill();
  outline(g);
  // Kernels and roasted char spots
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 2; c++) {
      const roast = (r + c * 2) % 3 === 0;
      g.fillStyle = roast ? '#6b3a12' : '#ffd457';
      g.fillRect(-4 + c * 4.5, -12 + r * 4, 3, 3);
    }
  }
}

function garri(g: CanvasRenderingContext2D): void {
  // Groundnuts (epa) on the side
  for (const [x, y] of [[13, 8], [16, 4], [11, 3]] as const) {
    g.fillStyle = '#c8894a';
    g.beginPath();
    g.ellipse(x, y, 2.6, 1.8, 0.5, 0, TAU);
    g.fill();
    outline(g, 0.8);
  }
  // Clear cup
  g.fillStyle = '#d7eefa';
  g.beginPath();
  g.moveTo(-11, -12);
  g.lineTo(11, -12);
  g.lineTo(8, 11);
  g.lineTo(-8, 11);
  g.closePath();
  g.fill();
  // Garri and water inside
  g.fillStyle = '#efe2c0';
  g.beginPath();
  g.moveTo(-10.3, -6);
  g.lineTo(10.3, -6);
  g.lineTo(8, 11);
  g.lineTo(-8, 11);
  g.closePath();
  g.fill();
  // Grains, sugar sparkles, a few nuts floating
  g.fillStyle = '#cdb27a';
  for (let i = 0; i < 6; i++) g.fillRect(-7 + i * 2.6, -3 + (i % 3) * 4, 1.5, 1.5);
  g.fillStyle = P.WHITE;
  g.fillRect(-4, -8, 2, 2);
  g.fillRect(3, -9, 2, 2);
  g.fillStyle = '#a0703a';
  g.fillRect(-2, -7, 2.5, 2);
  g.beginPath();
  g.moveTo(-11, -12);
  g.lineTo(11, -12);
  g.lineTo(8, 11);
  g.lineTo(-8, 11);
  g.closePath();
  outline(g);
}

function amala(g: CanvasRenderingContext2D): void {
  // Bowl
  g.fillStyle = '#8b6b4a';
  g.beginPath();
  g.moveTo(-16, 0);
  g.lineTo(16, 0);
  g.quadraticCurveTo(14, 12, 0, 12);
  g.quadraticCurveTo(-14, 12, -16, 0);
  g.closePath();
  g.fill();
  outline(g);
  g.fillStyle = '#f2b300';
  g.fillRect(-14, 3, 28, 2);
  // Gbegiri (yellow) and ewedu (green) soups
  g.fillStyle = '#e2b54a';
  g.beginPath();
  g.ellipse(7, 0, 7, 3.5, 0, Math.PI, TAU);
  g.fill();
  g.fillStyle = '#2e8b3a';
  g.beginPath();
  g.ellipse(-8, 0, 6, 3.2, 0, Math.PI, TAU);
  g.fill();
  // Amala mound
  g.fillStyle = '#5a3a24';
  g.beginPath();
  g.arc(0, -1, 7.5, Math.PI, TAU);
  g.closePath();
  g.fill();
  outline(g, 1.2);
  g.fillStyle = 'rgba(255,255,255,0.3)';
  g.fillRect(-3, -6, 3, 2);
  // Steam
  g.strokeStyle = P.WHITE;
  g.lineWidth = 1.5;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(-3, -11);
  g.quadraticCurveTo(-6, -15, -3, -19);
  g.moveTo(4, -11);
  g.quadraticCurveTo(1, -15, 4, -19);
  g.stroke();
}

/** A food on the road, gently bobbing, with a soft halo disc so it reads. */
export function drawFood(g: CanvasRenderingContext2D, kind: FoodKind, x: number, y: number, time: number): void {
  const bob = Math.sin(time * 4) * 2;
  g.fillStyle = 'rgba(255,248,220,0.7)';
  g.beginPath();
  g.arc(x, y + bob, 18, 0, TAU);
  g.fill();
  drawFoodIcon(g, kind, x, y + bob, 1);
}

/** The food picture alone, for the HUD. size 1 is about 32 u across. */
export function drawFoodIcon(g: CanvasRenderingContext2D, kind: FoodKind, x: number, y: number, size: number): void {
  g.save();
  g.translate(x, y);
  g.scale(size, size);
  if (kind === 'corn') corn(g);
  else if (kind === 'garri') garri(g);
  else amala(g);
  g.restore();
}

/** Pickup burst. t goes 0 to 1 over about 0.4 s; draw nothing after 1. */
export function drawSparkle(g: CanvasRenderingContext2D, x: number, y: number, t: number, colour: string = P.SPARKLE): void {
  if (t >= 1) return;
  const r = 6 + t * 18;
  g.globalAlpha = 1 - t;
  g.fillStyle = colour;
  g.strokeStyle = P.KOBO;
  g.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    const a = i * (TAU / 6) + t * 2;
    const sx = x + Math.cos(a) * r;
    const sy = y + Math.sin(a) * r;
    const s = 4 * (1 - t) + 1;
    g.beginPath();
    g.moveTo(sx, sy - s);
    g.lineTo(sx + s * 0.35, sy - s * 0.35);
    g.lineTo(sx + s, sy);
    g.lineTo(sx + s * 0.35, sy + s * 0.35);
    g.lineTo(sx, sy + s);
    g.lineTo(sx - s * 0.35, sy + s * 0.35);
    g.lineTo(sx - s, sy);
    g.lineTo(sx - s * 0.35, sy - s * 0.35);
    g.closePath();
    g.fill();
    g.stroke();
  }
  g.globalAlpha = 1;
}

/** Garri shield: a round bubble around the hero (feet at x, y). */
export function drawShield(g: CanvasRenderingContext2D, x: number, y: number, time: number): void {
  const cy = y - 26;
  const r = 31 + Math.sin(time * 5) * 1;
  g.globalAlpha = 0.18;
  g.fillStyle = P.SHIELD;
  g.beginPath();
  g.arc(x, cy, r, 0, TAU);
  g.fill();
  g.globalAlpha = 1;
  g.strokeStyle = P.SHIELD;
  g.lineWidth = 2.5;
  g.stroke();
  // Shine marks make it read as a bubble, not just a colour
  g.strokeStyle = P.WHITE;
  g.lineWidth = 2.5;
  g.lineCap = 'round';
  g.beginPath();
  g.arc(x, cy, r - 5, Math.PI * 1.15, Math.PI * 1.4);
  g.stroke();
  g.beginPath();
  g.arc(x - r * 0.42, cy - r * 0.62, 1.6, 0, TAU);
  g.fillStyle = P.WHITE;
  g.fill();
}

/** Shield popping. t 0 to 1 over about 0.3 s. */
export function drawShieldPop(g: CanvasRenderingContext2D, x: number, y: number, t: number): void {
  if (t >= 1) return;
  const cy = y - 26;
  const r = 31 + t * 14;
  g.globalAlpha = 1 - t;
  g.strokeStyle = P.SHIELD;
  g.lineWidth = 2.5;
  g.lineCap = 'round';
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = i * (TAU / 8);
    g.moveTo(x + Math.cos(a) * r, cy + Math.sin(a) * r);
    g.lineTo(x + Math.cos(a) * (r + 6), cy + Math.sin(a) * (r + 6));
  }
  g.stroke();
  g.globalAlpha = 1;
}
