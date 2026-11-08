/**
 * One try at a level: the rules, with no drawing, sound or DOM, so it can be unit tested.
 * docs/design.md: Level 1 (losing a life, bus stop, hazards) and Power-ups.
 * Q14 (provisional): after a fall, food effects end (shield too), foods and hazards past the
 * restart point come back, and kobo already taken stay counted and do not come back.
 * Q15 (provisional): the number of lives is fixed when the run starts.
 */
import { bounce, createBody, createWalker, groundAt, halt, press, release, steer, step, type Body, type Gait, type Terrain } from '../engine/physics';
import { BOSS_RULES, BossFight, type BossEvent } from './boss';
import { freshCrates, refillCrates, stepCrates, type CrateEvent, type CrateState } from './crates';
import { featureOn } from './features';
import type { FoodKind, HazardKind, Level } from './level';

export const STEPS_PER_SECOND = 60;
const secs = (s: number): number => Math.round(s * STEPS_PER_SECOND);

export const RULES = {
  lives: 3,
  gentleLives: 5,
  /** Blinking safety after losing a life to a hit. */
  hurtSafeSteps: secs(1.7),
  /** Blinking safety after the shield takes a hit. */
  shieldSafeSteps: secs(1.2),
  cornSteps: secs(6),
  amalaSteps: secs(7),
  /** Timed foods warn this long before they end. */
  warnSteps: secs(2),
  smashKobo: 2,
  /** Hero box: feet centre x, this wide each side, this tall. */
  heroHalfW: 7,
  heroH: 44,
  /** On top: falling, and on the step before the feet were no lower than this below the top. */
  stompSlack: 6,
  /** Goats trot off to the right, faster than the hero even on corn. */
  goatRunAwaySpeed: 240,
  goatRunAwaySteps: secs(2.5),
  /** Tyres that leave the road fall until this far below it, then are gone. */
  tyreFallSpeed: 300,
  /** S2.2 walls: the hero's centre stays this far inside the start fence and the end wall. */
  wallGap: 7,
  /** S2.2: a woken hazard this far outside the camera's edges is gone for good this play. */
  leaveDistance: 200,
  /** S2.2: a hint at or before the spawn shows this long after the street starts. */
  firstHintSteps: secs(0.5),
  /**
   * S2.6 street end: hazards fade, the door slides open, the hero hops in, the door shuts and
   * the bus pulls away, then the street is cleared. Same times as art's busEndAt (BUS_END).
   */
  fadeSteps: secs(0.3),
  doorSteps: secs(0.2),
  hopSteps: secs(0.6),
  busLeaveSteps: secs(1.4),
  clearedSteps: secs(2.2),
  /** The bus speeds up evenly as it pulls away, u/s² (about 600 u gone in 1.4 s). */
  busAccel: 612,
} as const;

/** Size of each hazard's box (half width, height), feet on the road. */
export const HAZARD_BOX: Record<HazardKind, { halfW: number; h: number }> = {
  goat: { halfW: 16, h: 26 },
  tyre: { halfW: 10, h: 22 },
  drum: { halfW: 13, h: 30 },
};

export type HazardMode = 'wait' | 'move' | 'runAway' | 'falling' | 'gone';

export interface HazardState {
  readonly kind: HazardKind;
  /** Where the data puts it. */
  readonly x0: number;
  x: number;
  /** Feet (or tyre bottom) y. */
  y: number;
  vx: number;
  mode: HazardMode;
  /** Steps since it started running away. */
  t: number;
  /** Tyre roll angle. */
  rot: number;
}

export interface CoinState {
  readonly x: number;
  readonly y: number;
  taken: boolean;
}

export interface FoodState {
  readonly x: number;
  readonly y: number;
  readonly kind: FoodKind;
  taken: boolean;
}

export type RunEvent =
  | { type: 'kobo'; x: number; y: number }
  | { type: 'food'; kind: FoodKind; x: number; y: number }
  | { type: 'hint'; words: string }
  | { type: 'wake'; kind: HazardKind; x: number }
  | { type: 'bounce'; kind: HazardKind; x: number; y: number }
  | { type: 'smash'; kind: HazardKind | 'honk'; x: number; y: number }
  | { type: 'hit' }
  | { type: 'shieldPop' }
  | { type: 'fall' }
  | { type: 'checkpoint' }
  | { type: 'wearingOff'; kind: 'corn' | 'amala' }
  | { type: 'tick' }
  | { type: 'powerEnd'; kind: 'corn' | 'amala' }
  | { type: 'gameOver' }
  | { type: 'arena' }
  | { type: 'busBoard' }
  | { type: 'busGo' }
  | { type: 'streetCleared' }
  | CrateEvent
  | BossEvent;

/**
 * run: the street. bus: the street end (controls locked, getting on the bus). cleared: the
 * bus has gone. arena: the boss fight. won: General Go-Slow beaten. over: out of lives.
 */
export type RunPhase = 'run' | 'bus' | 'cleared' | 'arena' | 'won' | 'over';

/** Who pressed jump: a finger id, or a key. The hold for higher belongs to the last presser. */
export type PressSource = string | number;

export interface Power {
  /** Steps of roasted corn left. */
  corn: number;
  /** Steps of amala left. */
  amala: number;
  shield: boolean;
}

export class Run {
  hero: Body;
  readonly maxLives: number;
  lives: number;
  kobo = 0;
  phase: RunPhase = 'run';
  spawnX: number;
  checkpointReached = false;
  power: Power = { corn: 0, amala: 0, shield: false };
  /** Steps of blinking safety left. */
  safe = 0;
  /** Steps since the run started. */
  steps = 0;
  readonly coins: CoinState[];
  readonly foods: FoodState[];
  readonly hazards: HazardState[];
  /** Hanging crates (S2.4); none while the crates switch is off (features.ts). */
  readonly crates: CrateState[];
  /** The fight, once the hero reaches the arena. */
  boss: BossFight | null = null;
  /** The level's road and roofs, plus the boss's light platforms (solid all fight long). */
  readonly terrain: Terrain;
  /** Hints already shown in this play of the level (not again after a fall). */
  private readonly hintsShown = new Set<number>();
  /**
   * How much road the screen shows ahead of the hero (set by the game from the screen size).
   * Hazards wake at the larger of the level's wakeDistance and this + 40, so they always
   * start moving just off the right edge and are never seen standing still.
   * With no screen (unit tests), only the level's wakeDistance counts.
   */
  viewAhead = -Infinity;
  /**
   * The camera's edges, world x (set by the game each step on player-moved streets). Woken
   * hazards more than 200 u outside them are gone for good (S2.2). Unit tests: no limits.
   */
  viewLeft = -Infinity;
  viewRight = Infinity;
  /** Steps since the street end started (phase 'bus'). Seconds = endSteps / STEPS_PER_SECOND. */
  endSteps = 0;
  /** Where the hero's hop onto the bus starts. */
  private hopFrom = 0;
  /** Who started the jump that is held now. */
  private holdBy: PressSource | null = null;

  constructor(
    readonly level: Level,
    opts: { gentle: boolean } = { gentle: false },
  ) {
    this.maxLives = opts.gentle ? RULES.gentleLives : RULES.lives;
    this.lives = this.maxLives;
    this.spawnX = level.spawnX;
    this.terrain = level.boss ? { ...level.terrain, platforms: [...level.terrain.platforms, ...level.boss.lights] } : level.terrain;
    this.hero = this.newHero(level.spawnX);
    this.coins = level.coins.map((c) => ({ ...c, taken: false }));
    this.foods = level.foods.map((f) => ({ ...f, taken: false }));
    this.hazards = level.hazards.map((h) => freshHazard(h.kind, h.x, level.groundY));
    this.crates = featureOn('crates') ? freshCrates(level.crates) : [];
  }

  /** Seconds of play so far. */
  get time(): number {
    return this.steps / STEPS_PER_SECOND;
  }

  press(by: PressSource = 'tap'): ReturnType<typeof press> {
    if (this.phase === 'arena' && this.boss?.defeated) return null; // the hero stands and watches
    if (this.phase !== 'run' && this.phase !== 'arena') return null;
    const out = press(this.hero);
    if (out) this.holdBy = by;
    return out;
  }

  /** A press ends. Only the one that started the jump ends the hold for higher. */
  release(by?: PressSource): void {
    if (by !== undefined && this.holdBy !== null && by !== this.holdBy) return;
    this.holdBy = null;
    release(this.hero);
  }

  /** The direction held on a player-moved street: -1 back, 0 none, 1 forward. */
  steer(move: -1 | 0 | 1): void {
    if (!this.hero.manual) return;
    steer(this.hero, this.phase === 'run' ? move : 0);
  }

  /** The direction held (player-moved streets). */
  get move(): -1 | 0 | 1 {
    return this.hero.move;
  }

  /** Walk and run speeds right now (corn changes both). */
  private gait(): Gait {
    const corn = this.power.corn > 0;
    return { walk: corn ? this.level.cornWalkSpeed : this.level.walkSpeed, run: corn ? this.level.cornSpeed : this.level.runSpeed };
  }

  /**
   * Slice 1 boss level only: start straight in the boss fight (the street before it was
   * played by hand on a schema 2 street). Lives and kobo are the caller's to carry over.
   */
  startAtArena(): void {
    const arena = this.level.arena;
    if (!arena) return;
    this.hero = this.newHero(arena.x);
    this.spawnX = arena.x;
    this.checkpointReached = true;
    this.phase = 'arena';
    if (this.level.boss) this.boss = new BossFight(this.level.boss, arena.x, this.level.groundY);
  }

  /** One fixed step (dt is always 1/60 s). Returns what happened, for sounds and words. */
  step(dt: number): RunEvent[] {
    const ev: RunEvent[] = [];
    if (this.phase === 'arena') return this.arenaStep(dt);
    if (this.phase === 'bus') return this.busStep(ev);
    if (this.phase !== 'run') return ev;
    this.steps++;
    this.tickPower(ev);
    const h = this.hero;
    if (h.manual) h.gait = this.gait();
    else h.speed = this.power.corn > 0 ? this.level.cornSpeed : this.level.runSpeed;

    step(h, this.terrain, dt);
    if (h.fallen) {
      this.fall(ev);
      return ev;
    }
    if (h.manual) this.walls();
    if (this.crates.length > 0) {
      const out = stepCrates(this.crates, { hero: h, heroBox: this.heroBox(), heroH: RULES.heroH, amala: this.power.amala > 0, steps: this.steps, dt });
      this.kobo += out.kobo;
      ev.push(...out.events);
    }

    const arena = this.level.arena;
    if (arena && h.x >= arena.x) {
      this.phase = 'arena';
      ev.push({ type: 'arena' });
      if (this.level.boss) this.boss = new BossFight(this.level.boss, arena.x, this.level.groundY);
      return ev;
    }
    const end = this.level.end;
    if (end && h.grounded && h.x >= end.x) {
      // S2.6 street end: controls lock, nothing can hurt now.
      this.phase = 'bus';
      this.endSteps = 0;
      this.hopFrom = h.x;
      steer(h, 0);
      release(h);
      ev.push({ type: 'busBoard' });
      return ev;
    }

    if (!this.checkpointReached && h.x >= this.level.checkpoint) {
      this.checkpointReached = true;
      this.spawnX = this.level.checkpoint;
      ev.push({ type: 'checkpoint' });
    }
    this.level.hints.forEach((hint, i) => {
      if (!featureOn(hint.needs)) return; // about a piece not built yet (features.ts)
      // A hint at or before the spawn (player-moved streets) shows 0.5 s after the start.
      const atStart = h.manual && hint.x <= this.level.spawnX;
      const due = atStart ? this.steps >= RULES.firstHintSteps : h.x >= hint.x;
      if (due && !this.hintsShown.has(i)) {
        this.hintsShown.add(i);
        ev.push({ type: 'hint', words: hint.words });
      }
    });

    this.pickUps(ev);
    this.moveHazards(dt, ev);
    this.touchHazards(ev);
    if (this.safe > 0) this.safe--;
    return ev;
  }

  /** The hero stays inside the start fence and the end wall; bumping one stops dead. */
  private walls(): void {
    const h = this.hero;
    const lo = this.level.startWall + RULES.wallGap;
    const hi = (this.level.end?.wall ?? Infinity) - RULES.wallGap;
    if (h.x < lo || h.x > hi) {
      h.x = Math.min(Math.max(h.x, lo), hi);
      halt(h);
    }
  }

  /** The street end: the hero hops onto the bus, the bus pulls away, the street is cleared. */
  private busStep(ev: RunEvent[]): RunEvent[] {
    this.steps++;
    this.endSteps++;
    const h = this.hero;
    const end = this.level.end!;
    const inAt = RULES.doorSteps + RULES.hopSteps;
    if (this.endSteps > RULES.doorSteps && this.endSteps <= inAt) {
      // Into the open door: a small hop from where the feet touched to the door.
      const k = (this.endSteps - RULES.doorSteps) / RULES.hopSteps;
      h.x = this.hopFrom + (end.x + 10 - this.hopFrom) * k;
      h.y = this.level.groundY - Math.sin(k * Math.PI) * 18;
      h.grounded = k >= 1;
      halt(h);
    }
    if (this.endSteps === inAt) ev.push({ type: 'busGo' });
    if (this.endSteps === RULES.clearedSteps) {
      this.phase = 'cleared';
      ev.push({ type: 'streetCleared' });
    }
    return ev;
  }

  /** 0 to 1: how far the hazards have faded at the street end. */
  get hazardFade(): number {
    return this.phase === 'bus' || this.phase === 'cleared' ? Math.min(1, this.endSteps / RULES.fadeSteps) : 0;
  }

  /** The hero is on the bus (hidden). */
  get boarded(): boolean {
    return (this.phase === 'bus' || this.phase === 'cleared') && this.endSteps >= RULES.doorSteps + RULES.hopSteps;
  }

  /** How far the bus has pulled away to the right, u. */
  get busGone(): number {
    if (this.phase !== 'bus' && this.phase !== 'cleared') return 0;
    const t = Math.max(0, this.endSteps - RULES.doorSteps - RULES.hopSteps) / STEPS_PER_SECOND;
    return 0.5 * RULES.busAccel * t * t;
  }

  /** One step of the boss fight (design.md: Boss). */
  private arenaStep(dt: number): RunEvent[] {
    const ev: RunEvent[] = [];
    const boss = this.boss;
    this.steps++;
    this.tickPower(ev);
    const h = this.hero;
    const { turnLeftX, turnRightX } = this.level.arena!;
    if (boss?.defeated) {
      h.speed = 0; // stops and stands
    } else {
      h.speed = this.power.corn > 0 ? this.level.cornSpeed : this.level.runSpeed;
      // Runs by itself and turns around at once at each end.
      if (h.dir === 1 && h.x >= turnRightX) h.dir = -1;
      else if (h.dir === -1 && h.x <= turnLeftX) h.dir = 1;
    }
    const wasGrounded = h.grounded;
    step(h, this.terrain, dt);
    if (h.fallen) {
      this.fall(ev);
      return ev;
    }
    if (!boss) {
      if (this.safe > 0) this.safe--;
      return ev;
    }
    if (h.grounded && !wasGrounded) {
      const hit = boss.landedOn(h.on);
      if (hit.length > 0) {
        bounce(h); // off the light, second jump still there
        ev.push(...hit);
      }
    }
    ev.push(...boss.step(dt));
    if (boss.defeated) {
      if (ev.some((e) => e.type === 'win')) this.phase = 'won';
      return ev;
    }
    this.touchThrows(boss, ev);
    if (this.safe > 0) this.safe--;
    return ev;
  }

  private touchThrows(boss: BossFight, ev: RunEvent[]): void {
    const h = this.hero;
    const box = this.heroBox();
    for (const t of [...boss.throws]) {
      const size = BOSS_RULES[t.kind];
      const top = t.kind === 'tyre' ? t.y - size.h : t.y - size.h / 2;
      const bottom = t.kind === 'tyre' ? t.y : t.y + size.h / 2;
      if (box.r < t.x - size.halfW || box.l > t.x + size.halfW || box.b < top || box.t > bottom) continue;
      if (t.kind === 'tyre' && h.vy > 0 && h.prevY <= top + RULES.stompSlack) {
        bounce(h);
        h.y = Math.min(h.y, top);
        boss.remove(t);
        ev.push({ type: 'bounce', kind: 'tyre', x: t.x, y: top });
      } else if (this.power.amala > 0) {
        // Smashed (never counts as a hit on the boss, Q6).
        boss.remove(t);
        this.kobo += RULES.smashKobo;
        ev.push({ type: 'smash', kind: t.kind === 'tyre' ? 'tyre' : 'honk', x: t.x, y: top });
      } else {
        this.hurt(ev);
      }
    }
  }

  private newHero(x: number): Body {
    if (this.level.manual) return createWalker(x, this.terrain, { walk: this.level.walkSpeed, run: this.level.runSpeed });
    const b = createBody(x, this.terrain);
    b.speed = this.level.runSpeed;
    return b;
  }

  private tickPower(ev: RunEvent[]): void {
    for (const kind of ['corn', 'amala'] as const) {
      const left = this.power[kind];
      if (left <= 0) continue;
      const now = left - 1;
      this.power[kind] = now;
      if (now === RULES.warnSteps) ev.push({ type: 'wearingOff', kind });
      if (now > 0 && now <= RULES.warnSteps && now % STEPS_PER_SECOND === 0) ev.push({ type: 'tick' });
      if (now === 0) ev.push({ type: 'powerEnd', kind });
    }
  }

  private heroBox(): { l: number; r: number; t: number; b: number } {
    const h = this.hero;
    return { l: h.x - RULES.heroHalfW, r: h.x + RULES.heroHalfW, t: h.y - RULES.heroH, b: h.y };
  }

  private pickUps(ev: RunEvent[]): void {
    const box = this.heroBox();
    for (const c of this.coins) {
      if (c.taken || c.x + 8 < box.l || c.x - 8 > box.r) continue;
      if (c.y + 10 >= box.t && c.y - 10 <= box.b) {
        c.taken = true;
        this.kobo++;
        ev.push({ type: 'kobo', x: c.x, y: c.y });
      }
    }
    const crateFoods = this.crates.flatMap((c) => (c.food ? [c.food] : []));
    for (const f of [...this.foods, ...crateFoods]) {
      if (f.taken || f.x + 14 < box.l || f.x - 14 > box.r) continue;
      if (f.y + 14 >= box.t && f.y - 14 <= box.b) {
        f.taken = true;
        if (f.kind === 'corn') this.power.corn = RULES.cornSteps;
        else if (f.kind === 'amala') this.power.amala = RULES.amalaSteps;
        else this.power.shield = true; // a second garri while shielded gives nothing extra
        ev.push({ type: 'food', kind: f.kind, x: f.x, y: f.y });
      }
    }
  }

  private moveHazards(dt: number, ev: RunEvent[]): void {
    const { terrain, hazardSpeeds, groundY } = this.level;
    const heroX = this.hero.x;
    // Player-moved: the road the camera shows ahead of the hero right now (S2.2).
    const ahead = this.hero.manual ? this.viewRight - heroX : this.viewAhead;
    const wakeDistance = Math.max(this.level.wakeDistance, ahead + 40);
    for (const z of this.hazards) {
      if (this.hero.manual && z.mode !== 'wait' && z.mode !== 'gone') {
        // Woken hazards well off either edge of the screen are gone for good this play.
        if (z.x < this.viewLeft - RULES.leaveDistance || z.x > this.viewRight + RULES.leaveDistance) {
          z.mode = 'gone';
          continue;
        }
      }
      switch (z.mode) {
        case 'wait':
          if (z.x - heroX <= wakeDistance) {
            z.mode = 'move';
            z.vx = -hazardSpeeds[z.kind]; // towards the hero
            ev.push({ type: 'wake', kind: z.kind, x: z.x }); // the drum's "dum" (K1)
          }
          break;
        case 'move': {
          const nx = z.x + z.vx * dt;
          if (z.kind === 'goat') {
            // Goats turn back at pothole edges (they never fall in).
            const front = nx + Math.sign(z.vx) * HAZARD_BOX.goat.halfW;
            if (!groundAt(terrain, front)) z.vx = -z.vx;
            else z.x = nx;
          } else {
            z.x = nx;
            z.rot += (z.vx * dt) / 11;
            if (!groundAt(terrain, z.x)) z.mode = 'falling';
          }
          break;
        }
        case 'falling':
          z.x += z.vx * dt * 0.5;
          z.y += RULES.tyreFallSpeed * dt;
          if (z.y > groundY + 120) z.mode = 'gone';
          break;
        case 'runAway':
          z.x += RULES.goatRunAwaySpeed * dt;
          if (++z.t > RULES.goatRunAwaySteps) z.mode = 'gone';
          break;
        case 'gone':
          break;
      }
    }
  }

  private touchHazards(ev: RunEvent[]): void {
    const h = this.hero;
    const box = this.heroBox();
    for (const z of this.hazards) {
      if (z.mode !== 'wait' && z.mode !== 'move') continue;
      const size = HAZARD_BOX[z.kind];
      const top = z.y - size.h;
      if (box.r < z.x - size.halfW || box.l > z.x + size.halfW || box.b < top || box.t > z.y) continue;

      if (h.vy > 0 && h.prevY <= top + RULES.stompSlack) {
        // Landed on it: bounce. The goat runs off unhurt; the tyre is knocked away.
        bounce(h);
        h.y = Math.min(h.y, top);
        this.knockAway(z);
        ev.push({ type: 'bounce', kind: z.kind, x: z.x, y: top });
      } else if (this.power.amala > 0) {
        this.knockAway(z);
        this.kobo += RULES.smashKobo;
        ev.push({ type: 'smash', kind: z.kind, x: z.x, y: top });
      } else {
        this.hurt(ev);
      }
    }
  }

  private knockAway(z: HazardState): void {
    if (z.kind === 'goat') {
      z.mode = 'runAway';
      z.t = 0;
    } else {
      z.mode = 'gone';
    }
  }

  private hurt(ev: RunEvent[]): void {
    if (this.safe > 0) return;
    if (this.power.shield) {
      this.power.shield = false;
      this.safe = RULES.shieldSafeSteps;
      ev.push({ type: 'shieldPop' });
      return;
    }
    this.lives--;
    this.safe = RULES.hurtSafeSteps;
    ev.push({ type: 'hit' });
    if (this.lives <= 0) this.gameOver(ev);
  }

  private fall(ev: RunEvent[]): void {
    this.lives--;
    ev.push({ type: 'fall' });
    // Food effects end on every fall, the last one too (so the HUD never shows a food at 0 lives).
    this.power = { corn: 0, amala: 0, shield: false };
    this.safe = 0;
    if (this.lives <= 0) {
      this.gameOver(ev);
      return;
    }
    // Start again at the bus stop (or the start). Food effects end; foods and hazards
    // past the restart point come back; kobo already taken stay taken and counted.
    const { down, move } = this.hero;
    this.hero = this.newHero(this.spawnX);
    this.hero.down = down;
    // Facing right, standing still; a direction still held walks on from here (run timer at 0).
    this.hero.move = move;
    for (const f of this.foods) if (f.x >= this.spawnX) f.taken = false;
    refillCrates(this.crates, this.spawnX);
    this.hazards.forEach((z, i) => {
      if (z.x0 >= this.spawnX) this.hazards[i] = freshHazard(z.kind, z.x0, this.level.groundY);
    });
  }

  private gameOver(ev: RunEvent[]): void {
    this.lives = 0;
    // Food effects end on every game over, a hit or a fall (the HUD never shows a food at 0 lives).
    this.power = { corn: 0, amala: 0, shield: false };
    this.phase = 'over';
    ev.push({ type: 'gameOver' });
  }
}

function freshHazard(kind: HazardKind, x: number, groundY: number): HazardState {
  return { kind, x0: x, x, y: groundY, vx: 0, mode: 'wait', t: 0, rot: 0 };
}
