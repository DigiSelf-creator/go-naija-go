/**
 * General Go-Slow in Go-Slow Hall (docs/design.md S2.7): the fight's timeline, lights and throws,
 * and the kind finish. Pure rules, no drawing. Run owns one of these for a hall, and handles the
 * hero touching throws (it already knows lives, the shield and amala).
 */
import type { Platform } from '../engine/physics';
import { hallLampTimes } from '../art/hall';
import { goLightTickTimes, GO_LIGHT_END } from '../art/boss';
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
  /** S2.15: a fufu ball at the jam puts its next throw back this long (once per throw). */
  jamDelay: 0.5,
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
  /**
   * A phase starts (S2.14): the fight start for phase 0, the end of the break after a hit for the
   * others. highHonks: this phase brings the first high honks (the "PEEP!" hint shows now).
   */
  | { type: 'bossPhase'; phase: number; highHonks: boolean }
  /** The light turns green (the "ding"). first: the first time a light comes on in this try. */
  | { type: 'bossLight'; lit: number; first: boolean }
  /** One blink in the light's last second (the "tick"). */
  | { type: 'bossLightTick' }
  /** The green time ran out unhit: the light goes dark (the "clunk"). first: the first miss in this try. */
  | { type: 'bossLightOff'; lit: number; first: boolean }
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
  /** Index of the lit light, or -1 while none is lit (S2.14: none at the start). */
  lit = -1;
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
  /** Step when the current phase started (S2.14 light clock), or -1 during a break. */
  private phaseAt = 0;
  /** Step of the light's next change (on, or off), or -1 during a break. */
  private lightNext = -1;
  /** Step when the light went green (while lit). */
  private greenAt = -1;
  private patternIdx = 0;
  private lightsSeen = 0;
  private missed = 0;
  /** S2.15: the jam has already been delayed by a ball since its last throw. */
  private jamPushed = false;
  private readonly tickSteps = goLightTickTimes().map(steps);
  /** Finish steps (from the third hit) of each roof lamp. */
  private readonly lampSteps = hallLampTimes().map(steps);

  constructor(
    readonly data: BossData,
    private readonly groundY: number,
  ) {
    this.nextThrowAt = steps(data.startDelay);
    this.lightNext = steps(data.phases[0]!.lightAt);
  }

  /** Seconds of green left on the lit light (Infinity while none is lit). */
  get greenLeft(): number {
    if (this.lit < 0) return Infinity;
    return Math.max(0, steps(this.phase.greenFor) - (this.steps - this.greenAt)) / STEPS;
  }

  /** The lit light is in its last second: it blinks (S2.14). */
  get blinking(): boolean {
    return this.lit >= 0 && this.greenLeft <= GO_LIGHT_END.warn;
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
    if (this.phaseAt < 0 && this.lightNext >= 0 && this.steps >= this.lightNext - steps(this.phase.lightAt)) {
      // The break after a hit is over: the next phase starts.
      this.phaseAt = this.steps;
      const before = this.data.phases[this.hits - 1];
      const highHonks = this.phase.pattern.includes('highHonk') && !(before?.pattern.includes('highHonk') ?? false);
      ev.push({ type: 'bossPhase', phase: this.hits, highHonks });
    }
    this.stepLight(ev);

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
      this.jamPushed = false;
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
    // The next phase starts at the end of the break; its light comes on `lightAt` later.
    this.phaseAt = -1;
    this.greenAt = -1;
    this.lightNext = breakEnd + steps(this.phase.lightAt);
    this.patternIdx = 0;
    this.jamPushed = false;
    this.nextThrowAt = breakEnd + steps(this.phase.every);
    return ev;
  }

  /** The light's clock (S2.14 part 1): on at lightAt, green greenFor, dark darkFor, again until hit. */
  private stepLight(ev: BossEvent[]): void {
    if (this.phaseAt < 0 || this.lightNext < 0) return;
    const ph = this.phase;
    if (this.lit >= 0) {
      const left = steps(ph.greenFor) - (this.steps - this.greenAt);
      if (this.tickSteps.includes(left)) ev.push({ type: 'bossLightTick' });
    }
    if (this.steps < this.lightNext) return;
    if (this.lit < 0) {
      this.lit = this.hits;
      this.greenAt = this.steps;
      this.lightNext = this.steps + steps(ph.greenFor);
      ev.push({ type: 'bossLight', lit: this.lit, first: this.lightsSeen++ === 0 });
    } else {
      const was = this.lit;
      this.lit = -1;
      this.greenAt = -1;
      this.lightNext = this.steps + steps(ph.darkFor);
      ev.push({ type: 'bossLightOff', lit: was, first: this.missed++ === 0 });
    }
  }

  /**
   * S2.15: a fufu ball reached the jam. It shakes and its next throw comes 0.5 s later (once per
   * throw at most). Never a hit. Returns true when the throw was put back.
   */
  pushJam(): boolean {
    if (this.defeated || this.jamPushed) return false;
    this.jamPushed = true;
    this.nextThrowAt += steps(BOSS_RULES.jamDelay);
    if (this.mode === 'attack') this.setMode('idle');
    return true;
  }

  /** A throw smashed by amala or bounced on: gone. */
  remove(t: Throw): void {
    this.throws = this.throws.filter((q) => q !== t);
  }
}
