/**
 * Placeholder street scene for the setup piece: sky, sun, far buildings and a road.
 * Real art and levels replace this in pieces B and C.
 */
import type { View } from '../engine/view';

export const GROUND_Y = 300;

export function drawPlaceholderScene(g: CanvasRenderingContext2D, view: View, scrollX: number): void {
  const { width: W, height: H } = view;

  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#7cc6f2');
  sky.addColorStop(1, '#f9e3b0');
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);

  g.fillStyle = '#ffd34d';
  g.beginPath();
  g.arc(W - 80, 60, 26, 0, Math.PI * 2);
  g.fill();

  // Far buildings, slow parallax.
  const far = scrollX * 0.2;
  const step = 70;
  g.fillStyle = '#9fb7c4';
  for (let i = -1; i < W / step + 2; i++) {
    const n = Math.floor(far / step) + i;
    const x = i * step - (far % step);
    const h = 50 + (((n * 37) % 60) + 60) % 60;
    g.fillRect(x, GROUND_Y - 40 - h, 54, h + 40);
  }

  // Road.
  g.fillStyle = '#3c3c3c';
  g.fillRect(0, GROUND_Y, W, H - GROUND_Y);
  g.fillStyle = '#d8c27a';
  g.fillRect(0, GROUND_Y, W, 5);
  g.fillStyle = '#f4f1e6';
  const dash = 60;
  for (let x = -(scrollX % dash); x < W; x += dash) g.fillRect(x, GROUND_Y + 28, 30, 4);
}
