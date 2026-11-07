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

/**
 * qa E5/F4: every sound, the boss ones too, against the best-known game sound motifs.
 * Each motif is a list of note pitches (Hz). A sound copies one if any run of 4 of its notes
 * (or the whole motif, if shorter) moves by the same intervals within half a semitone, or
 * if a 2-note motif matches at the same pitch (within 1 semitone). Chords count as their
 * top note. Our sounds are short bends and knocks, so they should match none of these.
 */
const ALL_SOUNDS: readonly SoundName[] = [
  'jump', 'airJump', 'kobo', 'food', 'bounce', 'meeh', 'smash', 'hit', 'shieldPop', 'fall',
  'checkpoint', 'tick', 'gameOver', 'arena', 'honk', 'greenHit', 'bossWin',
  // Slice 2
  'runStart', 'skid', 'busBoard',
];
// If a new sound name is added, this line fails to compile until it is in the list above.
const _everyName: Record<SoundName, true> = Object.fromEntries(ALL_SOUNDS.map((n) => [n, true])) as Record<SoundName, true>;
void _everyName;

const MOTIFS: Record<string, number[]> = {
  // Platformer pickup: B5 then E6.
  coin: [988, 1319],
  // Platformer extra life: E5 G5 E6 C6 D6 G6.
  oneUp: [659, 784, 1319, 1047, 1175, 1568],
  // Platformer power-up appears: rising triad runs, a semitone higher each time.
  powerUp: [392, 494, 587, 784, 988, 415, 523, 622, 831, 1047, 466, 587, 698, 932, 1175],
  // Platformer lose-a-life jingle: B4 F5 F5 F5 E5 D5 C5.
  death: [494, 698, 698, 698, 659, 587, 523],
  // Platformer course-clear run: G3 C4 E4 G4 C5 E5 G5 E5.
  courseClear: [196, 262, 330, 392, 523, 659, 784, 659],
  // Adventure-game secret found: G5 F#5 D#5 A4 G#4 E5 G#5 C6.
  secret: [784, 740, 622, 440, 415, 659, 831, 1047],
  // Adventure-game item fanfare: A4 A#4 B4 C5.
  itemGet: [440, 466, 494, 523],
  // Ring pickup in a fast hedgehog game: about E6 then G6 (and up).
  ring: [1319, 1568],
  // Pipe / shrink: three stepped falling pulses, about a fourth apart.
  pipe: [784, 587, 440, 330],
};

function melody(name: SoundName): number[] {
  const n = notes(name).slice().sort((a, b) => a.at - b.at);
  const out: { at: number; f: number }[] = [];
  for (const x of n) {
    const last = out.at(-1);
    if (last && Math.abs(last.at - x.at) < 0.005) last.f = Math.max(last.f, x.freq);
    else out.push({ at: x.at, f: x.freq });
  }
  return out.map((x) => x.f);
}

function copies(mel: number[], motif: number[]): boolean {
  if (motif.length === 2) {
    for (let i = 0; i + 1 < mel.length; i++) {
      if (Math.abs(semis(motif[0]!, mel[i]!)) <= 1 && Math.abs(semis(motif[1]!, mel[i + 1]!)) <= 1) return true;
    }
    return false;
  }
  const len = Math.min(4, motif.length);
  const iv = (xs: number[]) => xs.slice(1).map((x, i) => semis(xs[i]!, x));
  for (let m = 0; m + len <= motif.length; m++) {
    const want = iv(motif.slice(m, m + len));
    for (let i = 0; i + len <= mel.length; i++) {
      const got = iv(mel.slice(i, i + len));
      if (got.every((g, k) => Math.abs(g - want[k]!) <= 0.5)) return true;
    }
  }
  return false;
}

describe('qa E5/F4: no sound copies a well-known game sound', () => {
  beforeEach(() => {
    (globalThis as unknown as { window: unknown }).window = { AudioContext: FakeAudioContext };
  });
  afterEach(() => {
    delete (globalThis as unknown as { window?: unknown }).window;
  });

  it('the motif check itself catches the copies it is meant to', () => {
    expect(copies([988, 1319], MOTIFS['coin']!)).toBe(true);
    expect(copies([330, 392, 659, 523, 587], MOTIFS['oneUp']!)).toBe(true); // 1-up an octave down
    expect(copies([500, 494, 698, 698, 698], MOTIFS['death']!)).toBe(true);
  });

  for (const name of ALL_SOUNDS) {
    it(`${name}: plays, uses no square wave, and matches no famous motif`, () => {
      const n = notes(name);
      expect(n.length).toBeGreaterThan(0);
      expect(n.filter((x) => x.wave === 'square'), `${name} plays ${JSON.stringify(n)}`).toEqual([]);
      const mel = melody(name);
      for (const [motif, pitches] of Object.entries(MOTIFS)) {
        expect(copies(mel, pitches), `${name} ${JSON.stringify(mel.map(Math.round))} is close to the ${motif} sound`).toBe(false);
      }
    });
  }
});
