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
import { STRIP_Y, type View } from '../engine/view';
import { Camera, heroScreenX } from './camera';
import type { CrateData, Level } from './level';
import { RULES, Run, type RunEvent } from './run';
import { DEFAULT_LOOK } from './save';

export { heroScreenX };
/** Pits this wide or wider are big pits: cones on both lips (S2.2). */
const BIG_PIT = 160;
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

  /** The street camera for player-moved levels (S2.2); slice 1 levels follow the old way. */
  private cam: Camera | null = null;
  /** World width shown, from the last view (the camera steps with it). */
  viewW = 640;

  constructor(public level: Level) {
    this.run = new Run(level);
    this.newCamera();
  }

  /** Camera left edge (world x) as last drawn. */
  get camera(): number {
    return this.camX;
  }

  /** Which way the street camera looks (1 right, -1 left). */
  get cameraLook(): 1 | -1 {
    return this.cam?.look ?? 1;
  }

  private newCamera(): void {
    const { level } = this;
    this.cam = level.manual ? new Camera(level.startWall, level.end?.wall ?? Infinity) : null;
    this.snapCamera();
  }

  private snapCamera(): void {
    if (!this.cam) return;
    this.cam.snap(this.hero.x, this.viewW);
    this.camX = this.cam.x;
    this.run.viewLeft = this.cam.x;
    this.run.viewRight = this.cam.x + this.viewW;
  }

  /** The screen size changed. */
  setView(view: View): void {
    const changed = view.width !== this.viewW;
    this.viewW = view.width;
    if (changed && this.cam) {
      this.cam.x = Math.min(this.cam.x, this.hero.x - view.width * 0.08);
      this.run.viewRight = this.cam.x + this.viewW;
    }
  }

  /**
   * After a street: the slice 1 boss fight (until Go-Slow Hall, piece M). Lives and kobo
   * carry over; the hero runs by itself in the arena as in slice 1.
   */
  toBoss(bossLevel: Level): void {
    const old = this.run;
    this.level = bossLevel;
    const run = new Run(bossLevel, { gentle: old.maxLives === RULES.gentleLives });
    run.lives = old.lives;
    run.kobo = old.kobo;
    run.power.shield = old.power.shield;
    run.startAtArena();
    this.run = run;
    this.effects = [];
    this.newCamera();
  }

  get hero(): Run['hero'] {
    return this.run.hero;
  }

  /** Start the level from the beginning: full lives, 0 kobo. */
  begin(gentle: boolean, level: Level = this.level): void {
    this.level = level;
    this.run = new Run(this.level, { gentle });
    this.newCamera();
    this.idle = false;
    this.paused = false;
    this.effects = [];
    this.stridePhase = 0;
    this.landLeft = 0;
  }

  /** Back to the menus: a fresh, standing hero at the start. */
  reset(level: Level = this.level): void {
    this.level = level;
    this.run = new Run(this.level);
    this.newCamera();
    this.idle = true;
    this.paused = false;
    this.effects = [];
    this.stridePhase = 0;
    this.landLeft = 0;
  }

  press(by?: Parameters<Run['press']>[0]): ReturnType<Run['press']> {
    return this.run.press(by);
  }

  release(by?: Parameters<Run['release']>[0]): void {
    this.run.release(by);
  }

  steer(dir: -1 | 0 | 1): void {
    this.run.steer(dir);
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
    if (this.cam) {
      if (events.some((e) => e.type === 'fall')) this.snapCamera(); // back at the bus stop
      else this.cam.step(this.hero.x, this.viewW, dt);
      this.run.viewLeft = this.cam.x;
      this.run.viewRight = this.cam.x + this.viewW;
    }
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
    if (this.cam) {
      this.camX = this.cam.x;
      return this.camX;
    }
    const follow = this.hero.x - view.width * heroScreenX(view.width);
    const phase = this.run.phase;
    const arena = this.level.arena;
    const inArena = arena !== null && (phase === 'arena' || phase === 'won' || (phase === 'over' && this.run.boss !== null));
    if (!inArena || Math.abs(this.camX - follow) > view.width * 2) {
      this.camX = inArena ? arena.x : follow;
      return this.camX;
    }
    const target = arena.x;
    this.camX += (target - this.camX) * 0.12;
    if (Math.abs(target - this.camX) < 0.5) this.camX = target;
    return this.camX;
  }

  render(g: CanvasRenderingContext2D, view: View): void {
    const { level, run } = this;
    const W = view.width;
    const H = view.height;
    const t = this.clock;
    if (view.width !== this.viewW) this.setView(view);
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
    if (level.manual) drawStreetBits(g, level, L, R, H);
    for (const p of level.terrain.platforms) if (p.x + p.w > L && p.x < R) drawStall(g, p.x, p.y, p.w, gy);
    for (const c of level.crates) if (c.x + 20 > L && c.x - 20 < R) drawCratePlaceholder(g, c);
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
    const fade = run.hazardFade;
    if (fade < 1) {
      g.globalAlpha = 1 - fade; // the street end: hazards fade out
      for (const z of run.hazards) {
        if (z.mode === 'gone' || z.x < L || z.x > R) continue;
        if (z.kind === 'goat') drawGoat(g, z.x, z.y, t, z.mode === 'runAway' ? 'runAway' : 'walk', z.mode === 'runAway' || z.vx > 0 ? 1 : -1);
        else if (z.kind === 'drum') drawDrumPlaceholder(g, z.x, z.y, z.rot);
        else drawTyre(g, z.x, z.y, z.rot);
      }
      g.globalAlpha = 1;
    }

    if (boss) {
      for (const th of boss.throws) {
        if (th.kind === 'tyre') drawTyre(g, th.x, th.y, th.rot);
        else drawHonkCloud(g, th.x, th.y, t);
      }
    }

    const h = run.hero;
    // Blinking while safe after a hit: hidden every other 0.1 s.
    const blinkOff = (run.safe > 0 && Math.floor(run.safe / 6) % 2 === 1) || run.boarded;
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
        standing: this.idle || ((boss?.defeated ?? false) && h.grounded) || (h.manual && h.grounded && h.vx === 0),
        time: t,
      });
      g.restore();
    }
    if (run.power.shield) drawShield(g, h.x, h.y, t);

    if (level.end && level.end.x - 60 < R + 200) drawBusEndPlaceholder(g, level.end.x + run.busGone, gy, level.end.wall);

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

/**
 * Placeholder drawings for slice 2 street things that art makes for real in H5, J1 and L1:
 * the pavement strip, start fence, big pit cones, bus park wall and bus, crates and wells.
 * Plain shapes, our own, nothing copied.
 */
function drawStreetBits(g: CanvasRenderingContext2D, level: Level, L: number, R: number, H: number): void {
  const gy = level.groundY;
  // Pavement strip under the road front (y 360 to the bottom), only where there is road.
  for (const [a0, b0] of level.ground) {
    const a = Math.max(a0, L);
    const b = Math.min(b0, R);
    if (b <= a) continue;
    g.fillStyle = '#8f8a80';
    g.fillRect(a, STRIP_Y, b - a, H - STRIP_Y);
    g.fillStyle = '#5f5a52'; // kerb and gutter line
    g.fillRect(a, STRIP_Y, b - a, 4);
    g.fillStyle = '#7d786e';
    for (let x = Math.ceil(a / 40) * 40; x < b; x += 40) g.fillRect(x, STRIP_Y + 4, 2, H - STRIP_Y - 4);
  }
  // Start fence.
  const fx = level.startWall;
  if (fx > L - 40 && fx < R) {
    g.fillStyle = '#6b4f2e';
    for (let i = 0; i < 3; i++) g.fillRect(fx - 30 + i * 14, gy - 46, 5, 46);
    g.fillRect(fx - 32, gy - 38, 40, 4);
    g.fillRect(fx - 32, gy - 20, 40, 4);
  }
  // Big pit cones: two on each lip.
  for (let i = 1; i < level.ground.length; i++) {
    const a = level.ground[i - 1]![1];
    const b = level.ground[i]![0];
    if (b - a < BIG_PIT || b < L || a > R) continue;
    for (const x of [a - 22, a - 8, b + 8, b + 22]) drawConePlaceholder(g, x, gy);
  }
  // Wells (scenery only until piece L).
  for (const w of level.wells) {
    for (const x of [w.x, w.exitX]) {
      if (x < L || x > R) continue;
      g.fillStyle = '#7a6a58';
      g.fillRect(x - 18, gy - 26, 36, 26);
      g.fillStyle = '#4a3f33';
      g.fillRect(x - 18, gy - 30, 36, 5);
    }
  }
}

function drawConePlaceholder(g: CanvasRenderingContext2D, x: number, gy: number): void {
  g.fillStyle = '#e8641b';
  g.beginPath();
  g.moveTo(x - 7, gy);
  g.lineTo(x, gy - 22);
  g.lineTo(x + 7, gy);
  g.closePath();
  g.fill();
  g.fillStyle = '#ffffff';
  g.fillRect(x - 4, gy - 13, 8, 4);
}

function drawCratePlaceholder(g: CanvasRenderingContext2D, c: CrateData): void {
  const top = c.bottomY - 28;
  g.fillStyle = '#5c4a32'; // rope up to the line
  g.fillRect(c.x - 1, top - 60, 2, 60);
  g.fillStyle = '#c9a77c';
  g.fillRect(c.x - 16, top, 32, 28);
  g.strokeStyle = '#7a5a35';
  g.lineWidth = 2;
  g.strokeRect(c.x - 15, top + 1, 30, 26);
  g.beginPath();
  g.moveTo(c.x - 15, top + 10);
  g.lineTo(c.x + 15, top + 10);
  g.moveTo(c.x - 15, top + 19);
  g.lineTo(c.x + 15, top + 19);
  g.stroke();
}

function drawDrumPlaceholder(g: CanvasRenderingContext2D, x: number, y: number, rot: number): void {
  g.fillStyle = '#4d6b7a';
  g.fillRect(x - 13, y - 30, 26, 30);
  g.fillStyle = '#34505e';
  const k = ((rot % 1) + 1) % 1;
  for (let i = 0; i < 3; i++) g.fillRect(x - 13, y - 26 + ((i * 10 + k * 10) % 30), 26, 3);
}

/** The bus park wall and the yellow bus (from end.x - 40 to end.x + 160, door at end.x). */
function drawBusEndPlaceholder(g: CanvasRenderingContext2D, busDoorX: number, gy: number, wall: number): void {
  g.fillStyle = '#a89a86';
  g.fillRect(wall, gy - 120, 60, 120);
  g.fillStyle = '#8a7c68';
  for (let y = gy - 120; y < gy; y += 20) g.fillRect(wall, y, 60, 2);
  const x0 = busDoorX - 40;
  g.fillStyle = '#f2c230';
  g.beginPath();
  g.roundRect(x0, gy - 82, 200, 70, 10);
  g.fill();
  g.fillStyle = '#1d1a14';
  g.fillRect(x0, gy - 48, 200, 4);
  g.fillStyle = '#9fd3e6';
  for (let i = 0; i < 5; i++) g.fillRect(x0 + 62 + i * 26, gy - 74, 20, 18);
  g.fillStyle = '#3a3a3a'; // the open door
  g.fillRect(busDoorX - 10, gy - 76, 22, 64);
  g.fillStyle = '#1d1a14';
  g.beginPath();
  g.arc(x0 + 34, gy - 10, 10, 0, Math.PI * 2);
  g.arc(x0 + 166, gy - 10, 10, 0, Math.PI * 2);
  g.fill();
}
