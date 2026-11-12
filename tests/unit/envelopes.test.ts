/**
 * qa recheck of piece H: a note or sound that starts at full volume makes a tick (the shaker
 * clicked on every beat). Every gain envelope, in the music and in the sound effects, must
 * start near silence and fade in over a few milliseconds before it falls away.
 *
 * Plays every tune and every sound into a fake AudioContext that records each gain's schedule.
 * An envelope is a gain that falls away (exponentialRampToValueAtTime); the music's master
 * level is not one (it is set before the first note and only ever fades out).
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TUNES, type MusicPlace } from '../../src/art/tunes';
import { ATTACK as MUSIC_ATTACK, Music } from '../../src/engine/music';
import { ATTACK as SOUND_ATTACK, Sound, type SoundName } from '../../src/engine/sound';

type Ev = { kind: 'set' | 'linear' | 'exp'; v: number; t: number };

let gains: Ev[][] = [];

class FakeParam {
  value = 1;
  constructor(private readonly log?: Ev[]) {}
  setValueAtTime(v: number, t: number): void {
    this.value = v;
    this.log?.push({ kind: 'set', v, t });
  }
  linearRampToValueAtTime(v: number, t: number): void {
    this.value = v;
    this.log?.push({ kind: 'linear', v, t });
  }
  exponentialRampToValueAtTime(v: number, t: number): void {
    this.log?.push({ kind: 'exp', v, t });
  }
  cancelScheduledValues(): void {}
}
class FakeNode {
  connect<T>(n: T): T {
    return n;
  }
  disconnect(): void {}
}
class FakeOsc extends FakeNode {
  type = 'sine';
  frequency = new FakeParam();
  start(): void {}
  stop(): void {}
}
class FakeGain extends FakeNode {
  readonly log: Ev[] = [];
  gain = new FakeParam(this.log);
  constructor() {
    super();
    gains.push(this.log);
  }
}
class FakeFilter extends FakeNode {
  type = 'lowpass';
  frequency = new FakeParam();
}
class FakeCtx {
  state = 'running';
  currentTime = 0;
  sampleRate = 8000;
  destination = new FakeNode();
  createOscillator(): FakeOsc {
    return new FakeOsc();
  }
  createGain(): FakeGain {
    return new FakeGain();
  }
  createBiquadFilter(): FakeFilter {
    return new FakeFilter();
  }
  createBuffer(_c: number, n: number): { getChannelData: () => Float32Array } {
    return { getChannelData: () => new Float32Array(n) };
  }
  createBufferSource(): FakeNode & {
    buffer: unknown;
    start: () => void;
    stop: () => void;
  } {
    return Object.assign(new FakeNode(), {
      buffer: null,
      start: () => undefined,
      stop: () => undefined,
    });
  }
  resume(): Promise<void> {
    return Promise.resolve();
  }
}

/** Every envelope starts near 0, rises over 2 to 10 ms to its peak, then falls away after it. */
function checkEnvelopes(envs: Ev[][], what: string): void {
  for (const ev of envs) {
    const [start, rise, fall] = ev;
    const at = `${what}: ${JSON.stringify(ev)}`;
    expect(start?.kind, at).toBe('set');
    expect(start!.v, at).toBeLessThanOrEqual(0.001);
    expect(rise?.kind, at).toBe('linear');
    expect(rise!.v, at).toBeGreaterThan(start!.v);
    expect(rise!.t - start!.t, at).toBeGreaterThanOrEqual(0.002);
    expect(rise!.t - start!.t, at).toBeLessThanOrEqual(0.4 + 1e-9); // the drone swells in slowly on purpose
    expect(fall?.kind, at).toBe('exp');
    expect(fall!.t, at).toBeGreaterThan(rise!.t);
  }
}

const ALL_SOUNDS: readonly SoundName[] = [
  'jump',
  'airJump',
  'kobo',
  'food',
  'bounce',
  'meeh',
  'smash',
  'hit',
  'shieldPop',
  'fall',
  'checkpoint',
  'tick',
  'gameOver',
  'arena',
  'honk',
  'greenHit',
  'bossWin',
  'runStart',
  'skid',
  'busBoard',
  'crateHit',
  'crateEmpty',
  'crateKobo',
  'cratePop',
  'wellDown',
  'wellUp',
  'roomThump',
  'parcel',
  'drumWake',
  'drumBounce',
  'highHonk',
  'hallLamp',
  'cogRatchet',
  'cogBell',
  'lockedTuk',
  'lightDing', 'lightTick', 'lightClunk', 'fufuToss', 'fufuPlop', 'fufuHop', 'fufuRoll', 'fufuPlug', 'fufuFarPlop', 'fufuBonk', 'fufuPff', 'goatChew', 'goatMeeh',
  'strongStep', 'strongSmash', 'strongPick', 'suitOn', 'suitBreak', 'crowKraa', 'egretKrk', 'birdFlap', 'dashStart', 'dashSteps', 'dashReady', 'weedsFsss',
  'payChink', 'payBulb', 'payChip', 'built', 'collect', 'notEnough',
];

describe('every gain envelope fades in from near silence (no ticks)', () => {
  beforeEach(() => {
    gains = [];
    (globalThis as unknown as { window: unknown }).window = {
      AudioContext: FakeCtx,
    };
  });
  afterEach(() => {
    gains = [];
    delete (globalThis as unknown as { window?: unknown }).window;
  });

  it('the attack is about 3 ms in both players', () => {
    expect(MUSIC_ATTACK).toBeCloseTo(0.003, 6);
    expect(SOUND_ATTACK).toBeCloseTo(0.003, 6);
  });

  for (const place of Object.keys(TUNES) as MusicPlace[]) {
    for (let tempo = 0; tempo < TUNES[place].bpm.length; tempo++) {
      it(`music: every note of the ${place} tune at tempo ${tempo}, the shaker too`, () => {
        gains = [];
        const ctx = new FakeCtx();
        let fn: (() => void) | null = null;
        const m = new Music({
          setInterval: (f) => {
            fn = f;
            return 1 as unknown as ReturnType<typeof setInterval>;
          },
          clearInterval: () => {
            fn = null;
          },
        });
        m.attach(ctx as unknown as AudioContext);
        m.play(place, tempo);
        // Long enough for every bar of every tune at its slowest tempo.
        for (let i = 0; i < 4000 && fn; i++) {
          ctx.currentTime += 0.025;
          (fn as () => void)();
        }
        const envs = gains.filter((g) => g.some((e) => e.kind === 'exp'));
        expect(envs.length).toBeGreaterThan(10);
        checkEnvelopes(envs, place);
        // The shaker (hiss) is the one with the 3 ms attack; notes use 5 ms or the drone's slow swell.
        if (TUNES[place].tracks.some((t) => t.inst === 'shekere' && (t.from ?? 0) <= tempo)) {
          const shakes = envs.filter((ev) => Math.abs(ev[1]!.t - ev[0]!.t - MUSIC_ATTACK) < 1e-9);
          expect(shakes.length, 'shaker hits found').toBeGreaterThan(0);
        }
      });
    }
  }

  for (const name of ALL_SOUNDS) {
    it(`sound effect: ${name}`, () => {
      const s = new Sound();
      s.unlock();
      s.play(name);
      const envs = gains.filter((g) => g.some((e) => e.kind === 'exp'));
      // S2.9 corn tune: every effect goes through one effects volume (made with the first sound).
      // It is set once to full and is not an envelope; every other gain is one.
      const bus = gains.filter((g) => !g.some((e) => e.kind === 'exp'));
      expect(bus).toEqual([[{ kind: 'set', v: 1, t: 0 }]]);
      expect(envs.length).toBe(gains.length - 1);
      expect(envs.length).toBeGreaterThan(0);
      checkEnvelopes(envs, name);
      for (const ev of envs) expect(ev[1]!.t - ev[0]!.t).toBeCloseTo(SOUND_ATTACK, 6);
    });
  }
});
