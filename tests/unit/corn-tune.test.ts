/**
 * The corn tune (docs/design.md S2.9 "Corn tune"): the count's table, the director's calls
 * (turn-down, tempo and loudness steps, the end, a second corn, a lost life, the bus, pause,
 * the switches), the corn player (its own 0.8 output, restart from bar 1, a tempo step on the
 * next 16th, loudness), and the one effects volume every sound goes through.
 */
import { describe, expect, it } from 'vitest';
import street1 from '../../src/data/levels/lagos-1.json';
import { TUNES } from '../../src/art/tunes';
import { Music, MUSIC_GAIN, TICK_MS, stepSeconds } from '../../src/engine/music';
import { Sound } from '../../src/engine/sound';
import { parseLevel } from '../../src/game/level';
import { CORN_DUCK, CORN_GAIN, CORN_LOUD, CORN_TIMES, CornDirector, cornCount, cornStage, type CornPlayer, type CornScene } from '../../src/game/music-cue';
import { RULES, Run } from '../../src/game/run';
import { WORDS } from '../../src/screens/words';

// ---------------------------------------------------------------- a fake player

type Call = [string, ...number[]];
function fakePlayer(): { p: CornPlayer; calls: Call[] } {
  const calls: Call[] = [];
  return {
    calls,
    p: {
      start: () => void calls.push(['start']),
      step: (s) => void calls.push(['step', s]),
      stop: (f) => void calls.push(['stop', f]),
      pause: () => void calls.push(['pause']),
      resume: () => void calls.push(['resume']),
      duck: (l, r) => void calls.push(['duck', l, r]),
    },
  };
}
const scene = (corn: number, o: Partial<CornScene> = {}): CornScene => ({ corn, active: true, audible: true, held: false, ...o });

describe('the count table (S2.9)', () => {
  it('no number from 12 to 5.01 s; then 5, 4, 3, 2, 1 as the HUD seconds change; gone at 0', () => {
    expect(cornCount(RULES.cornSteps)).toBe(0);
    expect(cornCount(301)).toBe(0);
    expect(cornCount(300)).toBe(5);
    expect(cornCount(241)).toBe(5);
    expect(cornCount(240)).toBe(4);
    expect(cornCount(60)).toBe(1);
    expect(cornCount(1)).toBe(1);
    expect(cornCount(0)).toBe(0);
    expect([720, 300, 240, 180, 120, 60].map(cornStage)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('tempo 144, 128, 112, 96, 80, 72; loudness 100 to 10 percent; street tune and effects 30 to 93 percent', () => {
    expect(TUNES.corn.bpm).toEqual([144, 128, 112, 96, 80, 72]);
    expect(CORN_LOUD).toEqual([1, 0.8, 0.6, 0.4, 0.2, 0.1]);
    expect(CORN_DUCK).toEqual([0.3, 0.44, 0.58, 0.72, 0.86, 0.93]);
    expect(CORN_GAIN).toBe(0.8);
    // About 2.7 times the street tune.
    expect(CORN_GAIN / MUSIC_GAIN).toBeCloseTo(2.67, 1);
  });

  it('screen readers hear two lines only', () => {
    expect(WORDS.corn.endsIn(5)).toBe('Corn ends in 5 seconds');
    expect(WORDS.corn.done).toBe('Corn is done');
  });
});

describe('the corn director', () => {
  it('corn picked up: the tune starts at once and everything else goes to 30 percent in 0.15 s', () => {
    const { p, calls } = fakePlayer();
    const d = new CornDirector(p);
    d.update(scene(0));
    expect(calls).toEqual([]);
    d.update(scene(RULES.cornSteps));
    expect(calls).toEqual([['start'], ['duck', 0.3, 0.15]]);
    expect(d.on).toBe(true);
  });

  it('a whole corn on a real run: one step per number, on the step the seconds change; at 0 it fades in 0.4 s and all comes back over 0.6 s', () => {
    const raw = structuredClone(street1) as Record<string, unknown>;
    Object.assign(raw, { ground: [[-400, 9000]], hazards: [], foods: [[120, 272, 'corn']], crates: [], kobo: [], hints: [], wells: [] });
    const run = new Run(parseLevel(raw));
    const { p, calls } = fakePlayer();
    const d = new CornDirector(p);
    run.steer(1);
    const at: { call: Call; left: number }[] = [];
    for (let i = 0; i < 60 * 16; i++) {
      run.step(1 / 60);
      const n = calls.length;
      d.update(scene(run.power.corn));
      for (const c of calls.slice(n)) at.push({ call: c, left: run.power.corn });
    }
    const steps = at.filter((x) => x.call[0] === 'step');
    expect(steps.map((x) => x.call[1])).toEqual([1, 2, 3, 4, 5]);
    expect(steps.map((x) => x.left)).toEqual([300, 240, 180, 120, 60]);
    const ducks = at.filter((x) => x.call[0] === 'duck').map((x) => x.call.slice(1));
    expect(ducks).toEqual([
      [0.3, 0.15],
      [0.44, 0.15],
      [0.58, 0.15],
      [0.72, 0.15],
      [0.86, 0.15],
      [0.93, 0.15],
      [1, CORN_TIMES.endBack],
    ]);
    expect(at.find((x) => x.call[0] === 'stop')!.call).toEqual(['stop', CORN_TIMES.endFade]);
    expect(CORN_TIMES.endFade).toBe(0.4);
    expect(CORN_TIMES.endBack).toBe(0.6);
    expect(d.on).toBe(false);
  });

  it('a second corn restarts it from bar 1 at full speed and loudness; the count hides; the turn-down stays', () => {
    const { p, calls } = fakePlayer();
    const d = new CornDirector(p);
    d.update(scene(720));
    d.update(scene(200)); // in the count ("4")
    calls.length = 0;
    d.update(scene(720));
    expect(calls).toEqual([['start'], ['duck', 0.3, 0.15]]);
    expect(d.step).toBe(0);
    expect(cornCount(720)).toBe(0);
  });

  it('a lost life ends it at once: 0.3 s fade, no count, everything back over 0.3 s', () => {
    const { p, calls } = fakePlayer();
    const d = new CornDirector(p);
    d.update(scene(500));
    calls.length = 0;
    d.update(scene(0));
    expect(calls).toEqual([
      ['stop', 0.3],
      ['duck', 1, 0.3],
    ]);
  });

  it('the street end (the bus): 0.3 s fade as the jingle starts', () => {
    const { p, calls } = fakePlayer();
    const d = new CornDirector(p);
    d.update(scene(500));
    calls.length = 0;
    d.update(scene(500, { active: false }));
    expect(calls).toEqual([
      ['stop', 0.3],
      ['duck', 1, 0.3],
    ]);
  });

  it('Music off or Sound off: no corn tune and no turn-down; switching off mid-corn stops it and brings all back', () => {
    const { p, calls } = fakePlayer();
    const d = new CornDirector(p);
    d.update(scene(720, { audible: false }));
    d.update(scene(300, { audible: false }));
    expect(calls).toEqual([]);
    d.update(scene(290, { audible: true }));
    expect(calls[0]).toEqual(['start']);
    calls.length = 0;
    d.update(scene(280, { audible: false }));
    expect(calls).toEqual([
      ['stop', CORN_TIMES.switchFade],
      ['duck', 1, CORN_TIMES.switchFade],
    ]);
  });

  it('pause holds the tune with the corn timer, and it carries on at the same step', () => {
    const { p, calls } = fakePlayer();
    const d = new CornDirector(p);
    d.update(scene(250));
    calls.length = 0;
    d.update(scene(250, { held: true }));
    d.update(scene(250, { held: true }));
    d.update(scene(250));
    expect(calls).toEqual([['pause'], ['resume']]);
    expect(d.step).toBe(1);
  });

  it('never in the hall (not active there)', () => {
    const { p, calls } = fakePlayer();
    const d = new CornDirector(p);
    d.update(scene(720, { active: false }));
    expect(calls).toEqual([]);
  });
});

// ---------------------------------------------------------------- the players on a fake context

class Param {
  value = 1;
  log: [string, number, number][] = [];
  setValueAtTime(v: number, t: number): void {
    this.value = v;
    this.log.push(['set', v, t]);
  }
  linearRampToValueAtTime(v: number, t: number): void {
    this.value = v;
    this.log.push(['lin', v, t]);
  }
  exponentialRampToValueAtTime(): void {}
  cancelScheduledValues(): void {}
}
class Node {
  to: unknown[] = [];
  connect<T>(n: T): T {
    this.to.push(n);
    return n;
  }
  disconnect(): void {}
}
class Ctx {
  state = 'running';
  currentTime = 0;
  sampleRate = 8000;
  destination = new Node();
  gains: (Node & { gain: Param })[] = [];
  oscs: (Node & { frequency: Param; startAt: number })[] = [];
  createOscillator() {
    const o = Object.assign(new Node(), { type: 'sine', frequency: new Param(), startAt: 0, stop: () => undefined });
    const osc = Object.assign(o, { start: (t: number) => void (o.startAt = t) });
    this.oscs.push(osc);
    return osc;
  }
  createGain() {
    const g = Object.assign(new Node(), { gain: new Param() });
    this.gains.push(g);
    return g;
  }
  createBiquadFilter() {
    return Object.assign(new Node(), { type: 'lowpass', frequency: new Param() });
  }
  createBuffer(_c: number, n: number) {
    return { getChannelData: () => new Float32Array(n) };
  }
  createBufferSource() {
    return Object.assign(new Node(), { buffer: null, start: () => undefined, stop: () => undefined });
  }
  resume(): Promise<void> {
    return Promise.resolve();
  }
}

function rig(gain?: number) {
  const ctx = new Ctx();
  let fn: (() => void) | null = null;
  const m = new Music({
    ...(gain !== undefined ? { gain } : {}),
    setInterval: (f) => {
      fn = f;
      return 1 as unknown as ReturnType<typeof setInterval>;
    },
    clearInterval: () => {
      fn = null;
    },
  });
  m.attach(ctx as unknown as AudioContext);
  const advance = (s: number): void => {
    for (let t = 0; t < s - 1e-9; t += TICK_MS / 1000) {
      ctx.currentTime += TICK_MS / 1000;
      fn?.();
    }
  };
  return { m, ctx, advance };
}

describe('the corn player', () => {
  it('plays on its own output at 0.8; restart starts again from bar 1 even while playing', () => {
    const { m, ctx, advance } = rig(CORN_GAIN);
    m.restart('corn', 0);
    const out = ctx.gains[0]!;
    expect(out.gain.value).toBeCloseTo(0.8, 9);
    expect(out.to).toContain(ctx.destination);
    advance(3);
    expect((m as unknown as { step: number }).step).toBeGreaterThan(16);
    m.restart('corn', 0);
    expect((m as unknown as { step: number }).step).toBeLessThanOrEqual(8);
    expect(m.place).toBe('corn');
  });

  it('a count step changes the tempo on the next 16th (not the bar line); only the speed, the notes stay', () => {
    const { m, ctx, advance } = rig(CORN_GAIN);
    m.restart('corn', 0);
    advance(0.5);
    const at = (m as unknown as { step: number }).step;
    m.setTempoSoon(1);
    advance(0.2);
    expect(m.tempoStep).toBe(1);
    expect((m as unknown as { step: number }).step % 16).not.toBe(0);
    expect((m as unknown as { step: number }).step - at).toBeLessThan(8);
    // Same pitches as at tempo 0: the oscillators' frequencies are the note data's.
    const hz = new Set(ctx.oscs.map((o) => Math.round(o.frequency.log[0]![1])));
    expect(hz.size).toBeGreaterThan(3);
    expect(stepSeconds(TUNES.corn, 1)).toBeCloseTo(60 / 128 / 4, 9);
  });

  it('loudness steps ramp its output; the street tune turns down to 30 percent and back', () => {
    const { m, ctx } = rig();
    m.play('street', 0);
    const out = ctx.gains[0]!;
    m.setLevel(0.3, 0.15);
    expect(out.gain.log.at(-1)).toEqual(['lin', MUSIC_GAIN * TUNES.street.gain * 0.3, 0.15]);
    expect(m.outLevel).toBe(0.3);
    m.setLevel(1, 0.6);
    expect(out.gain.value).toBeCloseTo(MUSIC_GAIN * TUNES.street.gain, 9);
    // A new tune (the well room) starts at the level asked for.
    m.setLevel(0.3, 0);
    m.play('well', 0);
    const well = ctx.gains.find((g, i) => i > 0 && g.gain.log[0]?.[1] === MUSIC_GAIN * TUNES.well.gain * 0.3);
    expect(well).toBeTruthy();
  });
});

describe('one effects volume (S2.9 corn rule 2)', () => {
  it('every sound effect goes through one effects volume node, which turns down and back', () => {
    (globalThis as unknown as { window: unknown }).window = { AudioContext: Ctx };
    try {
      const s = new Sound();
      s.unlock();
      s.play('jump');
      s.play('kobo');
      const ctx = s.context as unknown as Ctx;
      const bus = ctx.gains.find((g) => g.to.includes(ctx.destination))!;
      expect(bus).toBeTruthy();
      // No other node goes straight to the speakers.
      expect(ctx.gains.filter((g) => g.to.includes(ctx.destination))).toHaveLength(1);
      expect(ctx.gains.filter((g) => g !== bus).every((g) => g.to.includes(bus))).toBe(true);
      s.setEffectsLevel(0.3, 0.15);
      expect(bus.gain.log.at(-1)).toEqual(['lin', 0.3, 0.15]);
      expect(s.effectsLevel).toBe(0.3);
      s.setEffectsLevel(1, 0.6);
      expect(bus.gain.value).toBe(1);
    } finally {
      delete (globalThis as unknown as { window?: unknown }).window;
    }
  });
});
