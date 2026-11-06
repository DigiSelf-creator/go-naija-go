/**
 * Top-level game state: the hero running on the practice strip.
 * Piece C swaps the strip for levels loaded from src/data/levels/.
 */
import { drawHero, type HeroLook } from '../art/hero';
import { createBody, press, release, step, type Body } from '../engine/physics';
import type { View } from '../engine/view';
import { drawPauseCard } from '../screens/pause';
import { drawTerrain } from './draw';
import { DEFAULT_LOOK } from './save';
import { drawPlaceholderScene } from './scene';
import { STRIP_END_X, STRIP_START_X, TEST_STRIP } from './test-strip';

/** The hero stands at 30 percent of the screen width. */
const HERO_SCREEN_X = 0.3;
/** Ground covered by one run cycle (two steps), u. At run speed that is 3 cycles a second. */
const STRIDE = 52;

export class Game {
  readonly terrain = TEST_STRIP;
  hero: Body = createBody(STRIP_START_X, TEST_STRIP);
  paused = false;
  /** Standing on the menu screens, before the run starts. */
  idle = true;
  look: HeroLook = { ...DEFAULT_LOOK };
  falls = 0;
  /** Seconds of play, for animation. */
  time = 0;

  /** Start (or start again) from the beginning of the strip. */
  begin(): void {
    this.hero = createBody(STRIP_START_X, this.terrain);
    this.idle = false;
    this.paused = false;
    this.time = 0;
  }

  press(): void {
    press(this.hero);
  }

  release(): void {
    release(this.hero);
  }

  update(dt: number): void {
    this.time += dt;
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
    const b = this.hero;
    g.save();
    g.translate(b.x, b.y);
    drawHero(g, this.look, {
      phase: (b.x / STRIDE) % 1,
      inAir: !b.grounded,
      facing: b.dir,
      glow: false,
      standing: this.idle,
      time: this.time,
    });
    g.restore();
    g.setTransform(view.scale, 0, 0, view.scale, 0, 0);
    if (this.paused) drawPauseCard(g, view);
  }
}
