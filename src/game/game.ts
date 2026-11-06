/**
 * Top-level game state. For now it only scrolls the placeholder street so the loop is visible.
 * Piece A5 adds the hero and physics; piece C adds levels from src/data/levels/.
 */
import type { View } from '../engine/view';
import { drawPauseCard } from '../screens/pause';
import { drawPlaceholderScene } from './scene';

/** Placeholder scroll speed in world units per second (A4 sets the real run speed). */
const SCROLL_SPEED = 150;

export class Game {
  scrollX = 0;
  paused = false;

  update(dt: number): void {
    this.scrollX += SCROLL_SPEED * dt;
  }

  render(g: CanvasRenderingContext2D, view: View): void {
    g.setTransform(view.scale, 0, 0, view.scale, 0, 0);
    drawPlaceholderScene(g, view, this.scrollX);
    if (this.paused) drawPauseCard(g, view);
  }
}
