/**
 * One try at a level: the rules, with no drawing, sound or DOM, so it can be unit tested.
 * docs/design.md: Level 1 (losing a life, bus stop, hazards) and Power-ups.
 * Q14 (provisional): after a fall, food effects end (shield too), foods and hazards past the
 * restart point come back, and kobo already taken stay counted and do not come back.
 * Q15 (provisional): the number of lives is fixed when the run starts.
 */
import { PHYSICS, bounce, createBody, groundAt, press, release, step, type Body } from '../engine/physics';
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
  /** A landing counts as "on top" if the feet were this close above the top last step. */
  stompSlack: 6,
  goatRunAwaySpeed: 140,
  goatRunAwaySteps: secs(2.5),
  /** Tyres that leave the road fall until this far below it, then are gone. */
  tyreFallSpeed: 300,
} as const;

/** Size of each hazard's box (half width, height), feet on the road. */
export const HAZARD_BOX: Record<HazardKind, { halfW: number; h: number }> = {
  goat: { halfW: 16, h: 26 },
  tyre: { halfW: 10, h: 22 },
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
  | { type: 'bounce'; kind: HazardKind; x: number; y: number }
  | { type: 'smash'; kind: HazardKind; x: number; y: number }
  | { type: 'hit' }
  | { type: 'shieldPop' }
  | { type: 'fall' }
  | { type: 'checkpoint' }
  | { type: 'wearingOff'; kind: 'corn' | 'amala' }
  | { type: 'tick' }
  | { type: 'powerEnd'; kind: 'corn' | 'amala' }
  | { type: 'gameOver' }
  | { type: 'arena' };

export type RunPhase = 'run' | 'arena' | 'over';

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
  private readonly hintsShown = new Set<number>();

  constructor(
    readonly level: Level,
    opts: { gentle: boolean } = { gentle: false },
  ) {
    this.maxLives = opts.gentle ? RULES.gentleLives : RULES.lives;
    this.lives = this.maxLives;
    this.spawnX = level.spawnX;
    this.hero = this.newHero(level.spawnX);
    this.coins = level.coins.map((c) => ({ ...c, taken: false }));
    this.foods = level.foods.map((f) => ({ ...f, taken: false }));
    this.hazards = level.hazards.map((h) => freshHazard(h.kind, h.x, level.groundY));
  }

  /** Seconds of play so far. */
  get time(): number {
    return this.steps / STEPS_PER_SECOND;
  }

  press(): ReturnType<typeof press> {
    if (this.phase !== 'run') return null;
    return press(this.hero);
  }

  release(): void {
    release(this.hero);
  }

  /** One fixed step (dt is always 1/60 s). Returns what happened, for sounds and words. */
  step(dt: number): RunEvent[] {
    const ev: RunEvent[] = [];
    if (this.phase !== 'run') return ev;
    this.steps++;
    this.tickPower(ev);
    const h = this.hero;
    h.speed = this.power.corn > 0 ? PHYSICS.fastRunSpeed : this.level.runSpeed;

    step(h, this.level.terrain, dt);
    if (h.fallen) {
      this.fall(ev);
      return ev;
    }

    if (h.x >= this.level.arena.x) {
      h.x = this.level.arena.x;
      this.phase = 'arena';
      ev.push({ type: 'arena' });
      return ev;
    }

    if (!this.checkpointReached && h.x >= this.level.checkpoint) {
      this.checkpointReached = true;
      this.spawnX = this.level.checkpoint;
      ev.push({ type: 'checkpoint' });
    }
    this.level.hints.forEach((hint, i) => {
      if (h.x >= hint.x && !this.hintsShown.has(i)) {
        this.hintsShown.add(i);
        ev.push({ type: 'hint', words: hint.words });
      }
    });

    this.pickUps(ev);
    this.moveHazards(dt);
    this.touchHazards(ev);
    if (this.safe > 0) this.safe--;
    return ev;
  }

  private newHero(x: number): Body {
    const b = createBody(x, this.level.terrain);
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
    for (const f of this.foods) {
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

  private moveHazards(dt: number): void {
    const { terrain, wakeDistance, hazardSpeeds, groundY } = this.level;
    const heroX = this.hero.x;
    for (const z of this.hazards) {
      switch (z.mode) {
        case 'wait':
          if (z.x - heroX <= wakeDistance) {
            z.mode = 'move';
            z.vx = -hazardSpeeds[z.kind]; // towards the hero
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
          z.x -= RULES.goatRunAwaySpeed * dt;
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
    if (this.lives <= 0) {
      this.gameOver(ev);
      return;
    }
    // Start again at the bus stop (or the start). Food effects end; foods and hazards
    // past the restart point come back; kobo already taken stay taken and counted.
    const down = this.hero.down;
    this.hero = this.newHero(this.spawnX);
    this.hero.down = down;
    this.power = { corn: 0, amala: 0, shield: false };
    this.safe = 0;
    for (const f of this.foods) if (f.x >= this.spawnX) f.taken = false;
    this.hazards.forEach((z, i) => {
      if (z.x0 >= this.spawnX) this.hazards[i] = freshHazard(z.kind, z.x0, this.level.groundY);
    });
  }

  private gameOver(ev: RunEvent[]): void {
    this.lives = 0;
    this.phase = 'over';
    ev.push({ type: 'gameOver' });
  }
}

function freshHazard(kind: HazardKind, x: number, groundY: number): HazardState {
  return { kind, x0: x, x, y: groundY, vx: 0, mode: 'wait', t: 0, rot: 0 };
}
