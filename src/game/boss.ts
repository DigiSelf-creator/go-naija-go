/**
 * General Go-Slow in Go-Slow Hall (docs/design.md S2.7): the fight's timeline, lights and throws,
 * and the kind finish. Pure rules, no drawing. Run owns one of these for a hall, and handles the
 * hero touching throws (it already knows lives, the shield and amala).
 */
import type { Platform } from '../engine/physics';
import { hallLampTimes } from '../art/hall';
import type { BossData, BossPhase, ThrowKind } from './level';

export const BOSS_RULES = {
  /** Boss art modes: the attack pose shows for this long BEFORE each throw comes out (S2.7). */
  attackLen: 0.4,
  hitLen: 0.8,
  /** The kind finish, seconds from the third hit (S2.7): "The hall is clear!", lamps, "Lagos is switched on!", the Win screen. */
  clearAt: 2.5,
  switchedOnAt: 4.5,
  winAt: 6.0,
  /** Throw boxes (half width, height). Tyres: bottom on the floor. Honks: centred on their y. */
  tyre: { halfW: 10, h: 22 },
  honk: { halfW: 18, h: 20 },
  highHonk: { halfW: 18, h: 20 },
} as const;

const STEPS = 60;
const steps = (s: number): number => Math.round(s * STEPS);

export interface Throw {
  readonly kind: ThrowKind;
  x: number;
  /** Tyre: bottom on the floor. Honks: centre. */
  y: number;
  readonly vx: number;
  rot: number;
}

export type BossMode = 'idle' | 'attack' | 'hit' | 'defeat';

export type BossEvent =
  | { type: 'bossThrow'; kind: ThrowKind }
  | { type: 'bossHit'; hits: number; left: number }
  /** The next light comes on after a hit's break. highHonks: this phase brings the first high honks. */
  | { type: 'bossLight'; lit: number; highHonks: boolean }
  | { type: 'dust'; x: number; y: number }
  | { type: 'bossDefeat' }
  /** The kind finish: the last car is out ("The hall is clear!"), a roof lamp clicks on, Lagos is switched on, the Win screen. */
  | { type: 'hallClear' }
  | { type: 'lamp'; i: number }
  | { type: 'switchedOn' }
  | { type: 'win' };

/** Where a throw's hurt box is: left, right, top, bottom. */
export function throwBox(t: Throw): { l: number; r: number; t: number; b: number } {
  const size = BOSS_RULES[t.kind];
  const top = t.kind === 'tyre' ? t.y - size.h : t.y - size.h / 2;
  return { l: t.x - size.halfW, r: t.x + size.halfW, t: top, b: top + size.h };
}

export class BossFight {
  hits = 0;
  /** Index of the lit light, or -1 while none is lit. */
  lit = 0;
  mode: BossMode = 'idle';
  /** What the attack pose is about to throw: high (the high honk) or low (anything else). */
  aim: 'low' | 'high' = 'low';
  /** Steps since the fight started. */
  steps = 0;
  /** Step when the current mode started. */
  modeAt = 0;
  throws: Throw[] = [];
  /** Step of the third hit, or -1. */
  defeatAt = -1;
  private nextThrowAt: number;
  private nextLightAt = -1;
  private patternIdx = 0;
  /** Finish steps (from the third hit) of each roof lamp. */
  private readonly lampSteps = hallLampTimes().map(steps);

  constructor(
    readonly data: BossData,
    private readonly groundY: number,
  ) {
    this.nextThrowAt = steps(data.startDelay);
  }

  get defeated(): boolean {
    return this.defeatAt >= 0;
  }

  /** Seconds in the current mode (for the art). In 'defeat' this is the time since the third hit. */
  get modeTime(): number {
    return (this.steps - this.modeAt) / STEPS;
  }

  /** The phase now: one per hit taken so far. */
  get phase(): BossPhase {
    return this.data.phases[Math.min(this.hits, this.data.phases.length - 1)]!;
  }

  get litLight(): Platform | null {
    return this.lit >= 0 ? (this.data.lights[this.lit] ?? null) : null;
  }

  private setMode(m: BossMode): void {
    this.mode = m;
    this.modeAt = this.steps;
  }

  step(dt: number): BossEvent[] {
    const ev: BossEvent[] = [];
    this.steps++;
    if (this.defeated) {
      // The third hit's own step is t = 0.
      const since = this.steps - this.defeatAt - 1;
      if (since === steps(BOSS_RULES.clearAt)) ev.push({ type: 'hallClear' });
      this.lampSteps.forEach((at, i) => {
        if (since === at) ev.push({ type: 'lamp', i });
      });
      if (since === steps(BOSS_RULES.switchedOnAt)) ev.push({ type: 'switchedOn' });
      if (since === steps(BOSS_RULES.winAt)) ev.push({ type: 'win' });
      return ev;
    }
    if (this.mode === 'hit' && this.modeTime >= BOSS_RULES.hitLen) this.setMode('idle');
    if (this.nextLightAt >= 0 && this.steps >= this.nextLightAt) {
      this.lit = this.hits;
      this.nextLightAt = -1;
      const before = this.data.phases[this.hits - 1];
      const highHonks = this.phase.pattern.includes('highHonk') && !(before?.pattern.includes('highHonk') ?? false);
      ev.push({ type: 'bossLight', lit: this.lit, highHonks });
    }

    const phase = this.phase;
    const kind = phase.pattern[this.patternIdx % phase.pattern.length]!;
    // The attack pose warns of the next throw 0.4 s before it comes out (S2.7).
    if (this.mode === 'idle' && this.steps >= this.nextThrowAt - steps(BOSS_RULES.attackLen)) {
      this.setMode('attack');
      this.aim = kind === 'highHonk' ? 'high' : 'low';
    }
    if (this.steps >= this.nextThrowAt) {
      this.patternIdx++;
      this.nextThrowAt += steps(phase.every);
      const x = this.data.throwX;
      const d = this.data;
      this.throws.push(
        kind === 'tyre'
          ? { kind, x, y: this.groundY, vx: -phase.speed, rot: 0 }
          : { kind, x, y: kind === 'highHonk' ? d.highHonkY : d.honkY, vx: -d.honkSpeed, rot: 0 },
      );
      if (this.mode === 'attack') this.setMode('idle');
      ev.push({ type: 'bossThrow', kind });
    }
    for (const t of this.throws) {
      t.x += t.vx * dt;
      if (t.kind === 'tyre') t.rot += (t.vx * dt) / 11;
    }
    // Tyres drop into the drain grate by the left wall; honks fade out there.
    this.throws = this.throws.filter((t) => t.x > this.data.drainX);
    return ev;
  }

  /**
   * The hero just landed on a platform from above. Returns events if it was the lit light
   * (a hit); landing on a dark light does nothing.
   */
  landedOn(p: Platform | null): BossEvent[] {
    if (this.defeated || !p || p !== this.litLight) return [];
    const ev: BossEvent[] = [];
    this.hits++;
    this.lit = -1;
    // Everything thrown pops into harmless dust.
    for (const t of this.throws) ev.push({ type: 'dust', x: t.x, y: t.kind === 'tyre' ? t.y - 11 : t.y });
    this.throws = [];
    const left = this.data.lights.length - this.hits;
    ev.push({ type: 'bossHit', hits: this.hits, left });
    if (left <= 0) {
      this.defeatAt = this.steps;
      this.setMode('defeat');
      ev.push({ type: 'bossDefeat' });
      return ev;
    }
    this.setMode('hit');
    this.aim = 'low';
    const breakEnd = this.steps + steps(this.data.breakAfterHit);
    this.nextLightAt = breakEnd;
    this.patternIdx = 0;
    this.nextThrowAt = breakEnd + steps(this.phase.every);
    return ev;
  }

  /** A throw smashed by amala or bounced on: gone. */
  remove(t: Throw): void {
    this.throws = this.throws.filter((q) => q !== t);
  }
}
