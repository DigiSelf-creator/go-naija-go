/**
 * Top-level game state: the hero running on the practice strip.
 * Piece C swaps the strip for levels loaded from src/data/levels/.
 */
import { createBody, press, release, step, type Body } from '../engine/physics';
import type { View } from '../engine/view';
import { drawPauseCard } from '../screens/pause';
import { drawHeroPlaceholder, drawTerrain } from './draw';
import { drawPlaceholderScene } from './scene';
import { STRIP_END_X, STRIP_START_X, TEST_STRIP } from './test-strip';

/** The hero stands at 30 percent of the screen width. */
const HERO_SCREEN_X = 0.3;

export class Game {
  readonly terrain = TEST_STRIP;
  hero: Body = createBody(STRIP_START_X, TEST_STRIP);
  paused = false;
  falls = 0;

  press(): void {
    press(this.hero);
  }

  release(): void {
    release(this.hero);
  }

  update(dt: number): void {
    step(this.hero, this.terrain, dt);
    if (this.hero.fallen) {
      // Lives come in piece C; for now start the strip again.
      this.falls++;
      this.restart();
    } else if (this.hero.x > STRIP_END_X && this.hero.grounded) {
      this.restart();
    }
  }

  private restart(): void {
    const down = this.hero.down;
    this.hero = createBody(STRIP_START_X, this.terrain);
    this.hero.down = down;
  }

  render(g: CanvasRenderingContext2D, view: View): void {
    const camX = this.hero.x - view.width * HERO_SCREEN_X;
    g.setTransform(view.scale, 0, 0, view.scale, 0, 0);
    drawPlaceholderScene(g, view, camX);
    g.translate(-camX, 0);
    drawTerrain(g, view, this.terrain, camX);
    drawHeroPlaceholder(g, this.hero);
    g.setTransform(view.scale, 0, 0, view.scale, 0, 0);
    if (this.paused) drawPauseCard(g, view);
  }
}
