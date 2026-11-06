/** Placeholder drawing for terrain and hero. Real art arrives in pieces B and C. */
import type { Body, Terrain } from '../engine/physics';
import type { View } from '../engine/view';

export function drawTerrain(g: CanvasRenderingContext2D, view: View, t: Terrain, camX: number): void {
  const left = camX - 20;
  const right = camX + view.width + 20;
  // Potholes: dark pits where there is no road.
  g.fillStyle = '#4b3a2a';
  g.fillRect(left, t.groundY, right - left, view.height - t.groundY);
  for (const s of t.ground) {
    if (s.x1 < left || s.x0 > right) continue;
    g.fillStyle = '#3c3c3c';
    g.fillRect(s.x0, t.groundY, s.x1 - s.x0, view.height - t.groundY);
    g.fillStyle = '#d8c27a';
    g.fillRect(s.x0, t.groundY, s.x1 - s.x0, 5);
    g.fillStyle = '#f4f1e6';
    for (let x = Math.ceil(s.x0 / 60) * 60; x < s.x1 - 30; x += 60) g.fillRect(x, t.groundY + 28, 30, 4);
  }
  for (const p of t.platforms) {
    if (p.x + p.w < left || p.x > right) continue;
    g.fillStyle = '#6b4a2b';
    g.fillRect(p.x + 6, p.y + 10, 4, t.groundY - p.y - 10);
    g.fillRect(p.x + p.w - 10, p.y + 10, 4, t.groundY - p.y - 10);
    g.fillStyle = '#b5651d';
    g.beginPath();
    g.roundRect(p.x, p.y, p.w, 12, 4);
    g.fill();
  }
}

/** A capsule: 16 u wide, 44 u tall, feet at (x, y). */
export function drawHeroPlaceholder(g: CanvasRenderingContext2D, b: Body): void {
  const w = 16;
  const h = 44;
  g.fillStyle = b.holding ? '#f2b300' : '#0e7a3e';
  g.beginPath();
  g.roundRect(b.x - w / 2, b.y - h, w, h, w / 2);
  g.fill();
  g.fillStyle = '#fffaf0';
  g.beginPath();
  g.arc(b.x + 3 * b.dir, b.y - h + 10, 3, 0, Math.PI * 2);
  g.fill();
  // Dot over the head while the air jump is still there.
  if (!b.grounded && b.airJump) {
    g.fillStyle = 'rgba(255,255,255,0.8)';
    g.beginPath();
    g.arc(b.x, b.y - h - 8, 3, 0, Math.PI * 2);
    g.fill();
  }
}
