/**
 * O2: the music player wired into the game (docs/design.md S2.9).
 * - Scheduling: a 25 ms timer, notes 0.1 s ahead, and the game never waits.
 * - Which tune plays where, the hall tempo step after each hit, Pause and a hidden page.
 * - The switches: Music off is silence; Sound off is silence too.
 * - The save: `gidi-music`, and a blocked store still works.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LOOKAHEAD, Music, TICK_MS, stepSeconds } from '../../src/engine/music';
import { TUNES, type MusicPlace } from '../../src/art/tunes';
import { MusicDirector, musicAudible, musicCue, musicHeld, type MusicPlayer, type MusicScene } from '../../src/game/music-cue';
import { loadSettings, saveSettings } from '../../src/game/save';
import { createStore } from '../../src/storage';

// ---------------------------------------------------------------- a fake audio context

class Param {
  value = 1;
  setValueAtTime(v: number): void {
    this.value = v;
  }
  linearRampToValueAtTime(v: number): void {
    this.value = v;
  }
  exponentialRampToValueAtTime(): void {}
  cancelScheduledValues(): void {}
}
class Node {
  connect<T>(n: T): T {
    return n;
  }
  disconnect(): void {}
}
class Ctx {
  state = 'running';
  currentTime = 0;
  sampleRate = 8000;
  destination = new Node();
  /** Start times of every note and shake scheduled. */
  starts: number[] = [];
  createOscillator(): Node & { type: string; frequency: Param; start: (t: number) => void; stop: () => void } {
    return Object.assign(new Node(), { type: 'sine', frequency: new Param(), start: (t: number) => void this.starts.push(t), stop: () => undefined });
  }
  createGain(): Node & { gain: Param } {
    return Object.assign(new Node(), { gain: new Param() });
  }
  createBiquadFilter(): Node & { type: string; frequency: Param } {
    return Object.assign(new Node(), { type: 'lowpass', frequency: new Param() });
  }
  createBuffer(_c: number, n: number): { getChannelData: () => Float32Array } {
    return { getChannelData: () => new Float32Array(n) };
  }
  createBufferSource(): Node & { buffer: unknown; start: (t: number) => void; stop: () => void } {
    return Object.assign(new Node(), { buffer: null, start: (t: number) => void this.starts.push(t), stop: () => undefined });
  }
  resume(): Promise<void> {
    return Promise.resolve();
  }
}

function rig(): { m: Music; ctx: Ctx; intervals: number[]; live: () => boolean; advance: (s: number) => void } {
  const ctx = new Ctx();
  let fn: (() => void) | null = null;
  const intervals: number[] = [];
  const m = new Music({
    setInterval: (f, ms) => {
      fn = f;
      intervals.push(ms);
      return intervals.length as unknown as ReturnType<typeof setInterval>;
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
  return { m, ctx, intervals, live: () => fn !== null, advance };
}

// ---------------------------------------------------------------- scheduling

describe('O2 scheduling: 0.1 s ahead, every 25 ms', () => {
  it('the timer runs every 25 ms and looks 0.1 s ahead', () => {
    expect(TICK_MS).toBe(25);
    expect(LOOKAHEAD).toBeCloseTo(0.1, 9);
    const { m, intervals } = rig();
    m.play('street', 0);
    expect(intervals).toEqual([25]);
  });

  it('no note is ever scheduled more than 0.1 s (plus one 16th) past the clock, in every looping tune', () => {
    for (const place of ['menu', 'street', 'well', 'hall'] as MusicPlace[]) {
      const { m, ctx, advance } = rig();
      m.play(place, 0);
      const step = stepSeconds(TUNES[place], 0);
      for (let i = 0; i < 200; i++) {
        advance(0.025);
        const ahead = Math.max(...ctx.starts) - ctx.currentTime;
        expect(ahead).toBeLessThan(LOOKAHEAD + step + 1e-6);
      }
    }
  });

  it('the game never waits: play, pause, resume and the switch return at once, with or without audio', () => {
    const none = new Music();
    for (const call of [() => none.play('street'), () => none.pause(), () => none.resume(), () => none.setEnabled(false), () => none.stop()]) {
      expect(call()).toBeUndefined(); // no promise to wait on
    }
    const { m, ctx } = rig();
    expect(m.play('hall', 0)).toBeUndefined();
    // Only the first 0.1 s is scheduled now; the rest waits for the timer, not the game.
    expect(Math.max(...ctx.starts)).toBeLessThan(LOOKAHEAD + stepSeconds(TUNES.hall, 0) + 1e-6);
  });

  it('a stuck clock (a slow phone, a suspended context) does no extra work on each tick', () => {
    const { m, ctx } = rig();
    m.play('street', 0);
    const n = ctx.starts.length;
    // The timer fires but the audio clock has not moved: nothing new is scheduled.
    (m as unknown as { tick(): void }).tick();
    (m as unknown as { tick(): void }).tick();
    expect(ctx.starts.length).toBe(n);
  });

  it('pause and resume carry on from the same bar; the hall tempo step lands on a bar line', () => {
    const { m, advance } = rig();
    m.play('hall', 0);
    const bar = 16 * stepSeconds(TUNES.hall, 0);
    advance(bar * 2.5); // into bar 3
    m.pause();
    expect(m.held).toBe(true);
    expect((m as unknown as { resumeBar: number }).resumeBar).toBe(2);
    m.resume();
    expect(m.held).toBe(false);
    expect((m as unknown as { step: number }).step).toBeGreaterThanOrEqual(32);
    m.setTempo(1);
    expect(m.tempoStep).toBe(1);
    advance(bar * 1.5);
    expect((m as unknown as { tempo: number }).tempo).toBe(1);
  });
});

// ---------------------------------------------------------------- which tune where

const scene = (s: Partial<MusicScene>): MusicScene => ({ screen: 'play', where: 0, below: false, hits: 0, hidden: false, ...s });

describe('O2 which tune plays where (S2.9 table)', () => {
  it('menus play the menu loop', () => {
    for (const screen of ['title', 'builder', 'credits', 'streets', 'wheel'] as const) expect(musicCue(scene({ screen }))).toEqual({ place: 'menu', tempo: 0 });
  });

  it('streets 1 to 3 play the street loop at tempo steps 0, 1, 2; the well room plays the well loop', () => {
    expect([0, 1, 2].map((where) => musicCue(scene({ where })))).toEqual([0, 1, 2].map((tempo) => ({ place: 'street', tempo })));
    expect(musicCue(scene({ where: 1, below: true }))).toEqual({ place: 'well', tempo: 0 });
  });

  it('the hall steps up one tempo per hit, and stays at the top step', () => {
    expect([0, 1, 2, 3].map((hits) => musicCue(scene({ where: 'hall', hits })))).toEqual([0, 1, 2, 2].map((tempo) => ({ place: 'hall', tempo })));
    expect(TUNES.hall.bpm).toEqual([128, 134, 140]);
  });

  it('Street cleared and Win play their tune; game over has none; Pause keeps the tune held', () => {
    expect(musicCue(scene({ screen: 'cleared' }))).toEqual({ place: 'cleared', tempo: 0 });
    expect(musicCue(scene({ screen: 'win' }))).toEqual({ place: 'win', tempo: 0 });
    expect(musicCue(scene({ screen: 'gameover' }))).toBeNull();
    expect(musicCue(scene({ screen: 'pause' }))).toBe('keep');
    expect(musicHeld(scene({ screen: 'pause' }))).toBe(true);
    expect(musicHeld(scene({ hidden: true }))).toBe(true);
    expect(musicHeld(scene({ hidden: true, screen: 'title' }))).toBe(true);
    expect(musicHeld(scene({}))).toBe(false);
  });
});

/** A player that writes down what it was asked. */
function spy(): { p: MusicPlayer; calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    p: {
      play: (place, tempo) => void calls.push(`play ${place} ${tempo ?? 0}`),
      setTempo: (t) => void calls.push(`tempo ${t}`),
      pause: () => void calls.push('pause'),
      resume: () => void calls.push('resume'),
      stop: () => void calls.push('stop'),
      setEnabled: (on) => void calls.push(`enabled ${on}`),
    },
  };
}

describe('O2 the director', () => {
  it('asks once per place; the same scene again changes nothing', () => {
    const { p, calls } = spy();
    const d = new MusicDirector(p);
    d.update(scene({ screen: 'title' }));
    d.update(scene({ screen: 'title' }));
    d.update(scene({ screen: 'streets' }));
    expect(calls).toEqual(['play menu 0']);
  });

  it('a one-off jingle that ended is not played again while its card stays', () => {
    const { p, calls } = spy();
    const d = new MusicDirector(p);
    d.update(scene({ screen: 'cleared' }));
    d.update(scene({ screen: 'cleared' }));
    expect(calls).toEqual(['play cleared 0']);
  });

  it('the hall: a tempo step after each hit, never a restart', () => {
    const { p, calls } = spy();
    const d = new MusicDirector(p);
    for (const hits of [0, 0, 1, 1, 2, 3]) d.update(scene({ where: 'hall', hits }));
    expect(calls).toEqual(['play hall 0', 'tempo 1', 'tempo 2']);
  });

  it('Pause holds the tune and Keep playing carries it on; a new run starts it fresh', () => {
    const { p, calls } = spy();
    const d = new MusicDirector(p);
    d.update(scene({ where: 1 }));
    d.update(scene({ where: 1, screen: 'pause' }));
    d.update(scene({ where: 1 }));
    expect(calls).toEqual(['play street 1', 'pause', 'resume']);
    calls.length = 0;
    d.update(scene({ where: 1, screen: 'pause' }));
    d.restart(); // "Start again"
    d.update(scene({ where: 1, screen: null })); // between screens: keep
    d.update(scene({ where: 1 }));
    expect(calls).toEqual(['pause', 'play street 1']);
  });

  it('a hidden page holds the tune, also on the title; showing again carries it on', () => {
    const { p, calls } = spy();
    const d = new MusicDirector(p);
    d.update(scene({ screen: 'title' }));
    d.update(scene({ screen: 'title', hidden: true }));
    d.update(scene({ screen: 'title' }));
    expect(calls).toEqual(['play menu 0', 'pause', 'resume']);
  });

  it('a new place while hidden is asked for, then held at once', () => {
    const { p, calls } = spy();
    const d = new MusicDirector(p);
    d.update(scene({ screen: 'title', hidden: true }));
    expect(calls).toEqual(['play menu 0', 'pause']);
  });

  it('game over stops the music; the well room and back up change tune', () => {
    const { p, calls } = spy();
    const d = new MusicDirector(p);
    d.update(scene({ where: 0 }));
    d.update(scene({ where: 0, below: true }));
    d.update(scene({ where: 0 }));
    d.update(scene({ screen: 'gameover' }));
    expect(calls).toEqual(['play street 0', 'play well 0', 'play street 0', 'stop']);
  });
});

// ---------------------------------------------------------------- the switches

describe('O2 the Sound and Music switches', () => {
  it('music sounds only when Music and Sound are both on', () => {
    expect(musicAudible(true, true)).toBe(true);
    expect(musicAudible(true, false)).toBe(false);
    expect(musicAudible(false, true)).toBe(false);
    expect(musicAudible(false, false)).toBe(false);
    const { p, calls } = spy();
    const d = new MusicDirector(p);
    d.switches(true, true);
    d.switches(false, true);
    d.switches(true, false);
    expect(calls).toEqual(['enabled true', 'enabled false', 'enabled false']);
  });

  it('with the real player: Music off schedules nothing, on again plays the place from its start', () => {
    const { m, ctx, advance, live } = rig();
    const d = new MusicDirector(m);
    d.update(scene({ screen: 'title' }));
    advance(0.5);
    d.switches(true, false);
    expect(live()).toBe(false);
    const n = ctx.starts.length;
    advance(3);
    expect(ctx.starts.length).toBe(n);
    d.switches(true, true);
    advance(0.5);
    expect(ctx.starts.length).toBeGreaterThan(n);
    expect(m.place).toBe('menu');
  });

  it('with the real player: Sound off silences music too; it comes back on with Sound', () => {
    const { m, ctx, advance, live } = rig();
    const d = new MusicDirector(m);
    d.switches(false, true);
    d.update(scene({ where: 2 }));
    advance(2);
    expect(ctx.starts).toEqual([]);
    expect(live()).toBe(false);
    d.switches(true, true);
    advance(0.5);
    expect(ctx.starts.length).toBeGreaterThan(0);
  });

  it('with the real player: switching Music on while paused stays silent until Keep playing', () => {
    const { m, ctx, advance } = rig();
    const d = new MusicDirector(m);
    d.update(scene({ where: 0 }));
    d.update(scene({ where: 0, screen: 'pause' }));
    d.switches(true, false);
    d.switches(true, true);
    const n = ctx.starts.length;
    advance(1);
    expect(ctx.starts.length).toBe(n);
    d.update(scene({ where: 0 }));
    advance(0.5);
    expect(ctx.starts.length).toBeGreaterThan(n);
  });

  it('the iPhone silent switch is respected: no code asks iOS to play through it', () => {
    const files: string[] = [];
    const walk = (dir: string): void => {
      for (const f of readdirSync(dir)) {
        const p = join(dir, f);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(ts|js)$/.test(f)) files.push(p);
      }
    };
    walk(join(import.meta.dirname, '..', '..', 'src'));
    for (const f of files) expect(readFileSync(f, 'utf8'), f).not.toMatch(/audioSession|<audio|new Audio\(/);
  });
});

// ---------------------------------------------------------------- the save

describe('O2 the gidi-music save', () => {
  function fakeStorage(): { storage: Storage; data: Map<string, string> } {
    const data = new Map<string, string>();
    const storage = {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
      removeItem: (k: string) => void data.delete(k),
    } as unknown as Storage;
    return { storage, data };
  }

  it('Music is on by default and saved as gidi-music, on its own key', () => {
    const { storage, data } = fakeStorage();
    const store = createStore(() => storage);
    expect(loadSettings(store).music).toBe(true);
    saveSettings(store, { sound: true, music: false, gentle: false });
    expect(data.get('gidi-music')).toBe('false');
    expect(data.get('gidi-sound')).toBe('true');
    // After a reload (a new store on the same phone storage) Music is still off.
    expect(loadSettings(createStore(() => storage)).music).toBe(false);
  });

  it('a broken gidi-music copy reads as on, and the rest of the settings still load', () => {
    const { storage, data } = fakeStorage();
    data.set('gidi-music', '"loud"');
    data.set('gidi-sound', 'false');
    const s = loadSettings(createStore(() => storage));
    expect(s.music).toBe(true);
    expect(s.sound).toBe(false);
  });

  it('blocked storage: the switch still works for this visit and nothing throws', () => {
    const blocked = (): Storage => {
      throw new Error('SecurityError');
    };
    const store = createStore(blocked);
    expect(store.persistent).toBe(false);
    expect(() => saveSettings(store, { sound: true, music: false, gentle: false })).not.toThrow();
    expect(loadSettings(store).music).toBe(false);
  });
});
