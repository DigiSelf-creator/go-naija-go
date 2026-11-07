/**
 * The game on screen: one Run of a level (the rules, in run.ts), the camera, and drawing
 * with the art in src/art/. Background layers draw in screen space with parallax; the
 * road, stalls, pickups, hazards and hero draw in world space (art "space rule").
 */
import { drawBoss, drawDustPop, drawGoLight, drawHitCounter, drawHonkCloud, type GoLightState } from '../art/boss';
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
/**
 * Ground covered by one run cycle (two steps), u. Tuned to the hero's leg swing so a planted
 * foot stays still on the road: during each step the planted ankle moves back about 20 u
 * over 0.34 of a cycle, so 58 u. At run speed 156 u/s that is 2.7 cycles a second; on corn
 * the hero covers ground faster, so the cycle speeds up with it. Amala's bigger steps reach
 * 13 percent further.
 */
export const STRIDE = 58;
const STRIDE_AMALA = STRIDE * 1.13;
/** Landing squash after a fall: lasts this long (s), only after landing faster than LAND_VY. */
export const LAND_TIME = 0.12;
export const LAND_VY = 200;
/** A jump in x bigger than this in one step is a respawn or a reset, not running. */
const TELEPORT = 50;
/** Anything this far outside the screen is not drawn. */
const MARGIN = 60;

interface Effect {
  kind: 'sparkle' | 'pop' | 'dust';
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
  /** Camera left edge (world x). */
  private camX = 0;
  /** Run cycle, 0 to 1, moved on by ground covered (either way) so feet don't slide. */
  stridePhase = 0;
  /** Seconds of landing squash left. */
  landLeft = 0;

  constructor(readonly level: Level) {
    this.run = new Run(level);
  }

  /** Camera left edge (world x) as last drawn. */
  get camera(): number {
    return this.camX;
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
    this.stridePhase = 0;
    this.landLeft = 0;
  }

  /** Back to the menus: a fresh, standing hero at the start. */
  reset(): void {
    this.run = new Run(this.level);
    this.idle = true;
    this.paused = false;
    this.effects = [];
    this.stridePhase = 0;
    this.landLeft = 0;
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
    const h0 = this.hero;
    const x0 = h0.x;
    const vy0 = h0.vy;
    const air0 = !h0.grounded;
    const events = this.run.step(dt);
    this.animateStride(x0, vy0, air0, dt);
    for (const e of events) {
      if (e.type === 'kobo' || e.type === 'food' || e.type === 'smash' || e.type === 'bounce') {
        // A tyre that is bounced on or smashed vanishes in a short sparkle (0.3 s).
        const len = (e.type === 'smash' || e.type === 'bounce') && e.kind === 'tyre' ? 0.3 : 0.4;
        this.effects.push({ kind: 'sparkle', x: e.x, y: e.y, t0: this.clock, len });
      } else if (e.type === 'dust') {
        this.effects.push({ kind: 'dust', x: e.x, y: e.y, t0: this.clock, len: 0.3 });
      } else if (e.type === 'shieldPop') {
        this.effects.push({ kind: 'pop', x: this.hero.x, y: this.hero.y, t0: this.clock, len: 0.3 });
      }
      this.onEvent(e);
    }
    this.effects = this.effects.filter((f) => this.clock - f.t0 < f.len);
  }

  /** Moves the run cycle on by ground covered, and starts or eases the landing squash. */
  private animateStride(x0: number, vy0: number, air0: boolean, dt: number): void {
    const h = this.hero;
    const dx = Math.abs(h.x - x0);
    if (dx < TELEPORT) {
      const stride = this.run.power.amala > 0 ? STRIDE_AMALA : STRIDE;
      this.stridePhase = (this.stridePhase + dx / stride) % 1;
    }
    this.landLeft = Math.max(0, this.landLeft - dt);
    if (air0 && h.grounded && vy0 > LAND_VY) this.landLeft = LAND_TIME;
    if (!h.grounded) this.landLeft = 0;
  }

  /**
   * The camera follows the hero at heroScreenX. In the boss arena it glides to the arena's
   * left edge and stays there (design.md: Boss), also behind the game over screen when the
   * last life was lost in the fight (run.boss is set from the moment the arena starts).
   */
  cameraX(view: View): number {
    const follow = this.hero.x - view.width * heroScreenX(view.width);
    const phase = this.run.phase;
    const inArena = phase === 'arena' || phase === 'won' || (phase === 'over' && this.run.boss !== null);
    if (!inArena || Math.abs(this.camX - follow) > view.width * 2) {
      this.camX = inArena ? this.level.arena.x : follow;
      return this.camX;
    }
    const target = this.level.arena.x;
    this.camX += (target - this.camX) * 0.12;
    if (Math.abs(target - this.camX) < 0.5) this.camX = target;
    return this.camX;
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

    const boss = run.boss;
    const bossData = level.boss;
    if (bossData && bossData.x - 100 < R) {
      bossData.lights.forEach((p, i) => {
        const state: GoLightState = boss && i < boss.hits ? 'done' : boss && boss.lit === i ? 'lit' : 'off';
        drawGoLight(g, p.x, p.y, p.w, state, t, gy);
      });
      drawBoss(g, bossData.x, gy, {
        mode: boss?.mode ?? 'idle',
        t: boss?.modeTime ?? 0,
        hits: boss?.hits ?? 0,
        time: t,
      });
    }

    for (const c of run.coins) if (!c.taken && c.x > L && c.x < R) drawKobo(g, c.x, c.y, t);
    for (const f of run.foods) if (!f.taken && f.x > L && f.x < R) drawFood(g, f.kind, f.x, f.y, t);
    for (const z of run.hazards) {
      if (z.mode === 'gone' || z.x < L || z.x > R) continue;
      if (z.kind === 'goat') drawGoat(g, z.x, z.y, t, z.mode === 'runAway' ? 'runAway' : 'walk', z.mode === 'runAway' || z.vx > 0 ? 1 : -1);
      else drawTyre(g, z.x, z.y, z.rot);
    }

    if (boss) {
      for (const th of boss.throws) {
        if (th.kind === 'tyre') drawTyre(g, th.x, th.y, th.rot);
        else drawHonkCloud(g, th.x, th.y, t);
      }
    }

    const h = run.hero;
    // Blinking while safe after a hit: hidden every other 0.1 s.
    const blinkOff = run.safe > 0 && Math.floor(run.safe / 6) % 2 === 1;
    if (!blinkOff) {
      g.save();
      g.translate(h.x, h.y);
      drawHero(g, this.look, {
        phase: this.stridePhase,
        inAir: !h.grounded,
        vy: h.vy,
        land: this.landLeft / LAND_TIME,
        facing: h.dir,
        glow: run.power.amala > 0,
        fast: run.power.corn > 0,
        standing: this.idle || ((boss?.defeated ?? false) && h.grounded),
        time: t,
      });
      g.restore();
    }
    if (run.power.shield) drawShield(g, h.x, h.y, t);

    for (const f of this.effects) {
      const k = (t - f.t0) / f.len;
      if (f.kind === 'sparkle') drawSparkle(g, f.x, f.y, k);
      else if (f.kind === 'dust') drawDustPop(g, f.x, f.y, k);
      else drawShieldPop(g, f.x, f.y, k);
    }
    g.setTransform(view.scale, 0, 0, view.scale, 0, 0);
    // Boss hit counter, below the HUD.
    if (boss) drawHitCounter(g, W / 2, 66 + view.safe.top, boss.hits);
  }
}
