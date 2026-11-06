/** Placeholder drawing for terrain. Real art arrives in pieces B and C. */
import type { Terrain } from '../engine/physics';
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
