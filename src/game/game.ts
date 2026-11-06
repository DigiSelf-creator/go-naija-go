/**
 * The game on screen: one Run of a level (the rules, in run.ts), the camera, and drawing
 * with the art in src/art/. Background layers draw in screen space with parallax; the
 * road, stalls, pickups, hazards and hero draw in world space (art "space rule").
 */
import { drawHero, type HeroLook } from '../art/hero';
import { drawGoat, drawTyre } from '../art/hazards';
import { drawFood, drawKobo, drawShield, drawShieldPop, drawSparkle } from '../art/items';
import { drawBusStop, drawPassingBus, drawRoad, drawShopRow, drawSky, drawSkyline, drawStall } from '../art/street';
import type { View } from '../engine/view';
import type { Level } from './level';
import { Run, type RunEvent } from './run';
import { DEFAULT_LOOK } from './save';

/**
 * The hero stands at 30 percent of the screen width. On narrow screens (under 640 u) the hero
 * moves left, down to 12 percent, to keep about 448 u of road visible ahead.
 */
export function heroScreenX(viewW: number): number {
  return Math.min(0.3, Math.max(0.12, (viewW - 448) / viewW));
}
/** Ground covered by one run cycle (two steps), u. At run speed that is 3 cycles a second. */
const STRIDE = 52;
/** Anything this far outside the screen is not drawn. */
const MARGIN = 60;

interface Effect {
  kind: 'sparkle' | 'pop';
  x: number;
  y: number;
  /** Animation clock when it started. */
  t0: number;
  /** Seconds it lasts. */
  len: number;
}

export class Game {
  run: Run;
  look: HeroLook = { ...DEFAULT_LOOK };
  paused = false;
  /** Standing on the menu screens, before the run starts. */
  idle = true;
  /** Called for everything that happens in a step (sounds, words, HUD). */
  onEvent: (e: RunEvent) => void = () => {};
  /** Seconds, for animation. Moves only while the run is being played. */
  clock = 0;
  private effects: Effect[] = [];

  constructor(readonly level: Level) {
    this.run = new Run(level);
  }

  get hero(): Run['hero'] {
    return this.run.hero;
  }

  /** Start the level from the beginning: full lives, 0 kobo. */
  begin(gentle: boolean): void {
    this.run = new Run(this.level, { gentle });
    this.idle = false;
    this.paused = false;
    this.effects = [];
  }

  /** Back to the menus: a fresh, standing hero at the start. */
  reset(): void {
    this.run = new Run(this.level);
    this.idle = true;
    this.paused = false;
    this.effects = [];
  }

  press(): ReturnType<Run['press']> {
    return this.run.press();
  }

  release(): void {
    this.run.release();
  }

  update(dt: number): void {
    if (this.idle) return;
    this.clock += dt;
    for (const e of this.run.step(dt)) {
      if (e.type === 'kobo' || e.type === 'food' || e.type === 'smash' || e.type === 'bounce') {
        // A tyre that is bounced on or smashed vanishes in a short sparkle (0.3 s).
        const len = (e.type === 'smash' || e.type === 'bounce') && e.kind === 'tyre' ? 0.3 : 0.4;
        this.effects.push({ kind: 'sparkle', x: e.x, y: e.y, t0: this.clock, len });
      } else if (e.type === 'shieldPop') {
        this.effects.push({ kind: 'pop', x: this.hero.x, y: this.hero.y, t0: this.clock, len: 0.3 });
      }
      this.onEvent(e);
    }
    this.effects = this.effects.filter((f) => this.clock - f.t0 < f.len);
  }

  cameraX(view: View): number {
    return this.hero.x - view.width * heroScreenX(view.width);
  }

  render(g: CanvasRenderingContext2D, view: View): void {
    const { level, run } = this;
    const W = view.width;
    const H = view.height;
    const t = this.clock;
    const camX = this.cameraX(view);
    run.viewAhead = W * (1 - heroScreenX(W));
    const L = camX - MARGIN;
    const R = camX + W + MARGIN;
    const gy = level.groundY;

    g.setTransform(view.scale, 0, 0, view.scale, 0, 0);
    // Screen space, parallax.
    drawSky(g, camX, W, t, H);
    drawSkyline(g, camX, W, gy);
    drawShopRow(g, camX, W, gy);
    drawPassingBus(g, camX, W, t, gy);

    // World space.
    g.translate(-camX, 0);
    drawRoad(g, camX, W, level.ground, gy, H);
    for (const p of level.terrain.platforms) if (p.x + p.w > L && p.x < R) drawStall(g, p.x, p.y, p.w, gy);
    const stop = level.checkpoint;
    if (stop + 160 > L && stop - 60 < R) drawBusStop(g, stop, run.checkpointReached, t, gy);

    for (const c of run.coins) if (!c.taken && c.x > L && c.x < R) drawKobo(g, c.x, c.y, t);
    for (const f of run.foods) if (!f.taken && f.x > L && f.x < R) drawFood(g, f.kind, f.x, f.y, t);
    for (const z of run.hazards) {
      if (z.mode === 'gone' || z.x < L || z.x > R) continue;
      if (z.kind === 'goat') drawGoat(g, z.x, z.y, t, z.mode === 'runAway' ? 'runAway' : 'walk', z.mode === 'runAway' || z.vx > 0 ? 1 : -1);
      else drawTyre(g, z.x, z.y, z.rot);
    }

    const h = run.hero;
    // Blinking while safe after a hit: hidden every other 0.1 s.
    const blinkOff = run.safe > 0 && Math.floor(run.safe / 6) % 2 === 1;
    if (!blinkOff) {
      g.save();
      g.translate(h.x, h.y);
      drawHero(g, this.look, {
        phase: (h.x / STRIDE) % 1,
        inAir: !h.grounded,
        facing: h.dir,
        glow: run.power.amala > 0,
        fast: run.power.corn > 0,
        standing: this.idle || run.phase === 'arena',
        time: t,
      });
      g.restore();
    }
    if (run.power.shield) drawShield(g, h.x, h.y, t);

    for (const f of this.effects) {
      const k = (t - f.t0) / f.len;
      if (f.kind === 'sparkle') drawSparkle(g, f.x, f.y, k);
      else drawShieldPop(g, f.x, f.y, k);
    }
    g.setTransform(view.scale, 0, 0, view.scale, 0, 0);
  }
}
