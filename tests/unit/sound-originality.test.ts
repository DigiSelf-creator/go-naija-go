/**
 * qa C7/D4 originality (CLAUDE.md rule 2): our code-made sounds must not copy another game.
 * The best-known pickup sound in games is a short square-wave B5 (988 Hz) then a longer E6
 * (1319 Hz): a jump of a fourth up. Our kobo must not be that, or anything close to it.
 *
 * Plays each sound into a fake AudioContext and reads the notes back.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Sound, type SoundName } from '../../src/engine/sound';

interface Played {
  wave: string;
  freq: number;
  at: number;
}

let played: Played[] = [];

class FakeParam {
  constructor(private readonly onSet?: (v: number, t: number) => void) {}
  setValueAtTime(v: number, t: number): void {
    this.onSet?.(v, t);
  }
  linearRampToValueAtTime(): void {}
  exponentialRampToValueAtTime(): void {}
}
class FakeNode {
  connect<T>(n: T): T {
    return n;
  }
}
class FakeOsc extends FakeNode {
  type = 'sine';
  frequency = new FakeParam((v, t) => played.push({ wave: this.type, freq: v, at: t }));
  start(): void {}
  stop(): void {}
}
class FakeGain extends FakeNode {
  gain = new FakeParam();
}
class FakeAudioContext {
  state = 'running';
  currentTime = 0;
  destination = new FakeNode();
  createOscillator(): FakeOsc {
    return new FakeOsc();
  }
  createGain(): FakeGain {
    return new FakeGain();
  }
  resume(): Promise<void> {
    return Promise.resolve();
  }
}

function notes(name: SoundName): Played[] {
  played = [];
  const s = new Sound();
  s.unlock();
  s.play(name);
  return played;
}

/** Semitones between two frequencies. */
const semis = (a: number, b: number): number => 12 * Math.log2(b / a);

describe('code-made sounds are our own', () => {
  beforeEach(() => {
    (globalThis as unknown as { window: unknown }).window = { AudioContext: FakeAudioContext };
  });
  afterEach(() => {
    delete (globalThis as unknown as { window?: unknown }).window;
  });

  it('the sounds really play (the fake hears them)', () => {
    expect(notes('kobo').length).toBeGreaterThan(0);
    expect(notes('jump').length).toBeGreaterThan(0);
  });

  it('kobo is not the famous two-note coin sound (square wave, about B5 then up a fourth to E6)', () => {
    const n = notes('kobo');
    const copy =
      n.length === 2 &&
      n.every((x) => x.wave === 'square') &&
      Math.abs(semis(988, n[0]!.freq)) <= 1 && // starts near B5
      Math.abs(semis(n[0]!.freq, n[1]!.freq) - 5) <= 0.5; // then a fourth up
    expect(copy, `kobo plays ${JSON.stringify(n)}`).toBe(false);
  });

  it('no sound is a square-wave B5 then E6 pair (the same pickup sound under another name)', () => {
    const all: SoundName[] = ['jump', 'airJump', 'kobo', 'food', 'bounce', 'meeh', 'smash', 'hit', 'shieldPop', 'fall', 'checkpoint', 'tick', 'gameOver', 'arena'];
    for (const name of all) {
      const n = notes(name);
      for (let i = 0; i + 1 < n.length; i++) {
        const pair = n[i]!.wave === 'square' && n[i + 1]!.wave === 'square' && Math.abs(semis(988, n[i]!.freq)) <= 1 && Math.abs(semis(1319, n[i + 1]!.freq)) <= 1;
        expect(pair, `${name} plays ${JSON.stringify(n)}`).toBe(false);
      }
    }
  });
});
