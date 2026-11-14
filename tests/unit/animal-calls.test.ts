/**
 * Decision 62 (Tp, 14 Nov): goats say "meeh" when bumped or fed, the street 3 birds call
 * "hawk hawk" when they take off. Both are code-made, both are throttled (one "meeh" per
 * 0.5 s, one bird call per 1.5 s), and neither plays with Sound off.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AnimalCalls, CALL_GAP, callFor } from '../../src/game/animal-calls';
import { Sound, soundLength, type SoundName } from '../../src/engine/sound';
import { parseLevel, type Level } from '../../src/game/level';
import { Run, type RunEvent } from '../../src/game/run';
import type { GameEvent } from '../../src/game/game';

const DT = 1 / 60;

function level(patch: Record<string, unknown> = {}): Level {
  return parseLevel({
    id: 'test',
    name: 'Test road',
    groundY: 300,
    runSpeed: 156,
    spawnX: 0,
    koboSpacing: 24,
    wakeDistance: 520,
    hazardSpeeds: { goat: 36, tyre: 60, egret: 30 },
    ground: [[-400, 20000]],
    platforms: [],
    kobo: [],
    foods: [],
    hazards: [],
    hints: [],
    checkpoint: 5000,
    ...patch,
  });
}

function runUntil(run: Run, done: (r: Run) => boolean, maxSteps = 60 * 60): RunEvent[] {
  const all: RunEvent[] = [];
  for (let i = 0; i < maxSteps && !done(run); i++) all.push(...run.step(DT));
  return all;
}

const at = { x: 0, y: 0 };

describe('which events call', () => {
  it('goats: a bounce, an amala smash, a side bump and a fed goat say "meeh"; tyres and drums do not', () => {
    expect(callFor({ type: 'bounce', kind: 'goat', ...at })).toBe('meeh');
    expect(callFor({ type: 'smash', kind: 'goat', ...at })).toBe('meeh');
    expect(callFor({ type: 'goatBump', ...at })).toBe('meeh');
    expect(callFor({ type: 'goatMeeh', ...at })).toBe('meeh');
    expect(callFor({ type: 'bounce', kind: 'tyre', ...at })).toBeNull();
    expect(callFor({ type: 'smash', kind: 'drum', ...at })).toBeNull();
    expect(callFor({ type: 'goatEat', ...at })).toBeNull(); // the chew comes first; "meeh" after it
  });

  it('birds: every take-off calls "hawk hawk", whatever startled them', () => {
    for (const why of ['stomp', 'fufu', 'suit', 'amala', 'touch'] as const) {
      for (const kind of ['egret', 'crow'] as const) expect(callFor({ type: 'birdOff', kind, why, ...at })).toBe('hawk');
    }
    expect(callFor({ type: 'kobo' } as GameEvent)).toBeNull();
  });
});

describe('throttle', () => {
  function setup() {
    let t = 0;
    const played: SoundName[] = [];
    const calls = new AnimalCalls((n) => played.push(n), () => t);
    return { calls, played, wait: (s: number) => (t += s) };
  }

  it('the gaps are 0.5 s for goats and 1.5 s for birds', () => {
    expect(CALL_GAP).toEqual({ meeh: 0.5, hawk: 1.5 });
  });

  it('at most one "meeh" each 0.5 s', () => {
    const { calls, played, wait } = setup();
    const bump: GameEvent = { type: 'goatBump', ...at };
    expect(calls.hear(bump)).toBe(true);
    wait(0.1);
    expect(calls.hear({ type: 'bounce', kind: 'goat', ...at })).toBe(false);
    wait(0.39);
    expect(calls.hear(bump)).toBe(false);
    wait(0.02);
    expect(calls.hear(bump)).toBe(true);
    expect(played).toEqual(['meeh', 'meeh']);
  });

  it('at most one bird call each 1.5 s; goats and birds do not hold each other back', () => {
    const { calls, played, wait } = setup();
    const off: GameEvent = { type: 'birdOff', kind: 'egret', why: 'touch', ...at };
    expect(calls.hear(off)).toBe(true);
    expect(calls.hear({ type: 'goatMeeh', ...at })).toBe(true);
    wait(1.4);
    expect(calls.hear({ ...off, kind: 'crow' })).toBe(false);
    wait(0.11);
    expect(calls.hear(off)).toBe(true);
    expect(played).toEqual(['hawk', 'meeh', 'hawk']);
  });

  it('other events play nothing', () => {
    const { calls, played } = setup();
    expect(calls.hear({ type: 'kobo' } as GameEvent)).toBe(false);
    expect(played).toEqual([]);
  });
});

describe('a goat bumped from the side', () => {
  it('gives one goatBump with the hit, and none while the hero is safe after it', () => {
    const run = new Run(level({ hazards: [['goat', 600]] }));
    const ev = runUntil(run, (r) => r.lives < 3);
    expect(ev.filter((e) => e.type === 'goatBump')).toHaveLength(1);
    expect(ev.map((e) => e.type)).toContain('hit');
    const later = runUntil(run, () => false, 60);
    expect(later.filter((e) => e.type === 'goatBump')).toHaveLength(0);
  });
});

/* ---- the sounds themselves, into a fake AudioContext ---- */

interface Made {
  kind: 'osc' | 'filter';
  wave?: string;
  type?: string;
  f: number;
  ramps: number[];
}
let made: Made[] = [];

class P {
  value = 0;
  constructor(private readonly ramps?: number[]) {}
  setValueAtTime(v: number): void {
    this.value = v;
  }
  linearRampToValueAtTime(v: number): void {
    this.ramps?.push(v);
  }
  exponentialRampToValueAtTime(): void {}
  cancelScheduledValues(): void {}
}
class N {
  connect<T>(n: T): T {
    return n;
  }
}
class Osc extends N {
  type = 'sine';
  readonly rec: Made = { kind: 'osc', f: 0, ramps: [] };
  frequency = new P(this.rec.ramps);
  start(): void {
    this.rec.wave = this.type;
    this.rec.f = this.frequency.value;
    made.push(this.rec);
  }
  stop(): void {}
}
class Filter extends N {
  type = 'lowpass';
  frequency = new P();
  Q = new P();
  override connect<T>(n: T): T {
    made.push({ kind: 'filter', type: this.type, f: this.frequency.value, ramps: [] });
    return n;
  }
}
class Ctx {
  state = 'running';
  currentTime = 0;
  sampleRate = 8000;
  destination = new N();
  createOscillator(): Osc {
    return new Osc();
  }
  createGain(): N & { gain: P } {
    return Object.assign(new N(), { gain: new P() });
  }
  createBiquadFilter(): Filter {
    return new Filter();
  }
  createBuffer(_c: number, n: number): { getChannelData: () => Float32Array } {
    return { getChannelData: () => new Float32Array(n) };
  }
  createBufferSource(): N & { buffer: unknown; start: () => void; stop: () => void } {
    return Object.assign(new N(), { buffer: null, start: () => undefined, stop: () => undefined });
  }
  resume(): Promise<void> {
    return Promise.resolve();
  }
}

describe('the "meeh" and the "hawk hawk"', () => {
  beforeEach(() => {
    made = [];
    (globalThis as unknown as { window: unknown }).window = { AudioContext: Ctx };
  });
  afterEach(() => {
    delete (globalThis as unknown as { window?: unknown }).window;
  });

  function play(name: SoundName): Made[] {
    const s = new Sound();
    s.unlock();
    made = [];
    s.play(name);
    return made;
  }

  it('"meeh": a nasal sawtooth voice through a band filter, with a wobble and a falling pitch, short', () => {
    const m = play('meeh');
    const voice = m.find((x) => x.kind === 'osc' && x.wave === 'sawtooth')!;
    expect(voice).toBeDefined();
    expect(m.some((x) => x.kind === 'filter' && x.type === 'bandpass')).toBe(true);
    // The wobble: the pitch goes up and down many times.
    let turns = 0;
    for (let i = 2; i < voice.ramps.length; i++) {
      const a = voice.ramps[i - 1]! - voice.ramps[i - 2]!;
      const b = voice.ramps[i]! - voice.ramps[i - 1]!;
      if (a * b < 0) turns++;
    }
    expect(turns).toBeGreaterThanOrEqual(4);
    // Falls: ends well below where it started.
    expect(voice.ramps.at(-1)!).toBeLessThan(voice.f * 0.9);
    expect(soundLength('meeh')).toBeLessThanOrEqual(0.5);
  });

  it('"hawk hawk": two raspy notes, the second lower, under 0.6 s', () => {
    const saws = play('hawk').filter((x) => x.kind === 'osc' && x.wave === 'sawtooth');
    expect(saws).toHaveLength(2);
    expect(saws[1]!.f).toBeLessThan(saws[0]!.f);
    expect(soundLength('hawk')).toBeLessThan(0.6);
  });

  it('neither plays with Sound off', () => {
    const s = new Sound();
    s.unlock();
    s.enabled = false;
    made = [];
    s.play('meeh');
    s.play('hawk');
    expect(made).toEqual([]);
  });

  it('a browser with no band filter still plays the tones plain', () => {
    const c = Ctx.prototype as unknown as { createBiquadFilter: () => Filter };
    const real = c.createBiquadFilter;
    c.createBiquadFilter = () => {
      throw new Error('no filter');
    };
    try {
      expect(play('meeh').filter((x) => x.kind === 'osc').length).toBe(4);
    } finally {
      c.createBiquadFilter = real;
    }
  });
});
