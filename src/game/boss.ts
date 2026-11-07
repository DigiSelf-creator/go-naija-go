/**
 * General Go-Slow (docs/design.md: Boss): the fight's timeline, lights and throws.
 * Pure rules, no drawing. Run owns one of these once the hero reaches the arena, and
 * handles the hero touching throws (it already knows lives, the shield and amala).
 */
import type { Platform } from '../engine/physics';
import type { BossData, ThrowKind } from './level';

export const BOSS_RULES = {
  /** The first throw comes this long after the fight starts. */
  firstThrow: 2.0,
  /** Boss art modes. */
  attackLen: 0.4,
  hitLen: 0.8,
  /** After the third hit. */
  roadFreeAt: 2.5,
  winAt: 4.5,
  /** Throws appear this far left of the heap's centre (11580 - 60 = 11520). */
  throwOffset: 60,
  /** Throw boxes (half width, height); honk clouds are centred on honkY. */
  tyre: { halfW: 10, h: 22 },
  honk: { halfW: 18, h: 20 },
} as const;

const STEPS = 60;
const steps = (s: number): number => Math.round(s * STEPS);

export interface Throw {
  readonly kind: ThrowKind;
  x: number;
  /** Tyre: bottom on the road. Honk: centre. */
  y: number;
  readonly vx: number;
  rot: number;
}

export type BossMode = 'idle' | 'attack' | 'hit' | 'defeat';

export type BossEvent =
  | { type: 'bossThrow'; kind: ThrowKind }
  | { type: 'bossHit'; hits: number; left: number }
  | { type: 'dust'; x: number; y: number }
  | { type: 'bossDefeat' }
  | { type: 'roadFree' }
  | { type: 'win' };

export class BossFight {
  hits = 0;
  /** Index of the lit light, or -1 while none is lit. */
  lit = 0;
  mode: BossMode = 'idle';
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

  constructor(
    readonly data: BossData,
    /** Throws are gone once they reach this x (the arena's left edge). */
    private readonly arenaLeft: number,
    private readonly groundY: number,
  ) {
    this.nextThrowAt = steps(BOSS_RULES.firstThrow);
  }

  get defeated(): boolean {
    return this.defeatAt >= 0;
  }

  /** Seconds in the current mode (for the art). */
  get modeTime(): number {
    return (this.steps - this.modeAt) / STEPS;
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
      const since = this.steps - this.defeatAt;
      if (since === steps(BOSS_RULES.roadFreeAt)) ev.push({ type: 'roadFree' });
      if (since === steps(BOSS_RULES.winAt)) ev.push({ type: 'win' });
      return ev;
    }
    if (this.mode === 'attack' && this.modeTime >= BOSS_RULES.attackLen) this.setMode('idle');
    if (this.mode === 'hit' && this.modeTime >= BOSS_RULES.hitLen) this.setMode('idle');
    if (this.nextLightAt >= 0 && this.steps >= this.nextLightAt) {
      this.lit = this.hits;
      this.nextLightAt = -1;
    }

    const phase = this.data.phases[Math.min(this.hits, this.data.phases.length - 1)]!;
    if (this.steps >= this.nextThrowAt) {
      const kind = phase.pattern[this.patternIdx % phase.pattern.length]!;
      this.patternIdx++;
      this.nextThrowAt += steps(phase.every);
      const x = this.data.x - BOSS_RULES.throwOffset;
      this.throws.push(
        kind === 'tyre'
          ? { kind, x, y: this.groundY, vx: -phase.speed, rot: 0 }
          : { kind, x, y: this.data.honkY, vx: -this.data.honkSpeed, rot: 0 },
      );
      this.setMode('attack');
      ev.push({ type: 'bossThrow', kind });
    }
    for (const t of this.throws) {
      t.x += t.vx * dt;
      if (t.kind === 'tyre') t.rot += (t.vx * dt) / 11;
    }
    this.throws = this.throws.filter((t) => t.x > this.arenaLeft);
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
    const breakEnd = this.steps + steps(this.data.breakAfterHit);
    this.nextLightAt = breakEnd;
    this.patternIdx = 0;
    const phase = this.data.phases[this.hits]!;
    this.nextThrowAt = breakEnd + steps(phase.every);
    return ev;
  }

  /** A throw smashed by amala or bounced on: gone. */
  remove(t: Throw): void {
    this.throws = this.throws.filter((q) => q !== t);
  }
}
