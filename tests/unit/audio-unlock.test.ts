/**
 * Sound on iPhones (Tp's S2 iPhone test: no sound in Safari). iOS Safari only lets the end of a
 * touch, a click or a key start audio, stops it ('interrupted') on an app switch or screen lock,
 * and older iOS wants a sound played inside the tap. These tests drive the real Sound and Music
 * classes and the real listener set-up with a fake AudioContext that behaves like iOS.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GESTURE_EVENTS, listenForAudioGestures } from '../../src/engine/audio-unlock';
import { Music } from '../../src/engine/music';
import { Sound } from '../../src/engine/sound';

/** True while the fake page is inside a gesture iOS accepts. */
let inGesture = false;
let made: FakeCtx[] = [];

class FakeParam {
  value = 1;
  setValueAtTime(): void {}
  linearRampToValueAtTime(): void {}
  exponentialRampToValueAtTime(): void {}
  cancelScheduledValues(): void {}
}
class FakeNode {
  gain = new FakeParam();
  frequency = new FakeParam();
  type = '';
  buffer: unknown = null;
  connect<T>(n: T): T {
    return n;
  }
  disconnect(): void {}
  start(): void {
    if (this.silent) this.ctx.silentStarts++;
  }
  stop(): void {}
  constructor(
    private readonly ctx: FakeCtx,
    private readonly silent = false,
  ) {}
}

/** Like iOS: starts suspended, resume() works only inside a gesture. */
class FakeCtx {
  state: AudioContextState | 'interrupted' = 'suspended';
  currentTime = 0;
  sampleRate = 44100;
  destination = {};
  resumes = 0;
  silentStarts = 0;
  oscillators = 0;
  constructor() {
    made.push(this);
  }
  resume(): Promise<void> {
    this.resumes++;
    if (inGesture) {
      this.state = 'running';
      return Promise.resolve();
    }
    return Promise.reject(new Error('not allowed'));
  }
  createBufferSource(): FakeNode {
    return new FakeNode(this, true);
  }
  createBuffer(): object {
    return {};
  }
  createOscillator(): FakeNode {
    this.oscillators++;
    return new FakeNode(this);
  }
  createGain(): FakeNode {
    return new FakeNode(this);
  }
  createBiquadFilter(): FakeNode {
    return new FakeNode(this);
  }
}

/** A tiny event target that records listeners and can fire them. */
class Target {
  readonly on = new Map<string, Array<{ fn: () => void; opts: unknown }>>();
  hidden = false;
  addEventListener(type: string, fn: () => void, opts?: unknown): void {
    const list = this.on.get(type) ?? [];
    list.push({ fn, opts });
    this.on.set(type, list);
  }
  fire(type: string, gesture = false): void {
    inGesture = gesture;
    for (const l of this.on.get(type) ?? []) l.fn();
    inGesture = false;
  }
}

beforeEach(() => {
  made = [];
  inGesture = false;
  (globalThis as unknown as { window: unknown }).window = { AudioContext: FakeCtx };
});
afterEach(() => {
  delete (globalThis as unknown as { window?: unknown }).window;
});

function setUp(): { sound: Sound; win: Target; doc: Target } {
  const sound = new Sound();
  const win = new Target();
  const doc = new Target();
  listenForAudioGestures(
    win,
    doc,
    () => sound.unlock(),
    () => sound.wake(),
  );
  return { sound, win, doc };
}

describe('sound starts on the first tap on iOS', () => {
  it('listens to the end of a touch, pointer up and click, not only the finger going down', () => {
    const { win } = setUp();
    for (const t of ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'click', 'keydown']) {
      expect(win.on.get(t)?.length, t).toBe(1);
      expect(win.on.get(t)![0]!.opts).toEqual({ capture: true, passive: true });
    }
    expect(GESTURE_EVENTS).toContain('touchend');
  });

  it('a tap: pointerdown (not a gesture on iOS) makes the audio, touchend starts it', () => {
    const { sound, win } = setUp();
    expect(sound.started).toBe(false);
    win.fire('pointerdown', false);
    expect(sound.started).toBe(true);
    expect(sound.running).toBe(false);
    win.fire('touchend', true);
    expect(sound.running).toBe(true);
    expect(made).toHaveLength(1);
  });

  it('plays a silent sample inside the tap that starts it', () => {
    const { win } = setUp();
    win.fire('touchend', true);
    expect(made[0]!.silentStarts).toBeGreaterThanOrEqual(1);
  });

  it('a sound played after the tap is heard; none before', () => {
    const { sound, win } = setUp();
    sound.play('jump');
    win.fire('pointerdown', false);
    sound.play('jump');
    expect(made[0]!.oscillators).toBe(0);
    win.fire('touchend', true);
    sound.play('jump');
    expect(made[0]!.oscillators).toBeGreaterThan(0);
  });

  it('once running, more taps do nothing extra (cheap)', () => {
    const { win } = setUp();
    win.fire('touchend', true);
    const ctx = made[0]!;
    const r = ctx.resumes;
    const s = ctx.silentStarts;
    for (let i = 0; i < 10; i++) win.fire('touchend', true);
    expect(ctx.resumes).toBe(r);
    expect(ctx.silentStarts).toBe(s);
  });

  it('the Sound switch still rules: off is silent even while the audio runs', () => {
    const { sound, win } = setUp();
    win.fire('touchend', true);
    sound.enabled = false;
    sound.play('jump');
    expect(made[0]!.oscillators).toBe(0);
    sound.enabled = true;
    sound.play('jump');
    expect(made[0]!.oscillators).toBeGreaterThan(0);
  });
});

describe('sound comes back after an app switch or screen lock', () => {
  it('interrupted: showing the page again tries to resume; the next tap surely does', () => {
    const { sound, win, doc } = setUp();
    win.fire('touchend', true);
    const ctx = made[0]!;
    ctx.state = 'interrupted';
    expect(sound.running).toBe(false);
    const r = ctx.resumes;
    doc.hidden = false;
    doc.fire('visibilitychange');
    expect(ctx.resumes).toBe(r + 1);
    win.fire('pageshow');
    win.fire('focus');
    expect(ctx.resumes).toBe(r + 3);
    // iOS refused without a tap: the listeners are still on, so the next tap wakes it.
    expect(sound.running).toBe(false);
    win.fire('touchend', true);
    expect(sound.running).toBe(true);
  });

  it('suspended, and the browser lets it resume without a tap: it runs at once', () => {
    const { sound, win, doc } = setUp();
    win.fire('touchend', true);
    made[0]!.state = 'suspended';
    inGesture = true; // this browser allows it
    sound.wake();
    inGesture = false;
    expect(sound.running).toBe(true);
    // Hiding the page does not try anything.
    const r = made[0]!.resumes;
    doc.hidden = true;
    doc.fire('visibilitychange');
    expect(made[0]!.resumes).toBe(r);
  });

  it('the listeners stay on after the first tap (not removed too early)', () => {
    const { sound, win } = setUp();
    win.fire('touchend', true);
    made[0]!.state = 'suspended';
    win.fire('click', true);
    expect(sound.running).toBe(true);
    made[0]!.state = 'interrupted';
    win.fire('keydown', true);
    expect(sound.running).toBe(true);
  });

  it('no AudioContext at all: nothing throws, the game runs silent', () => {
    (globalThis as unknown as { window: unknown }).window = {};
    const { sound, win, doc } = setUp();
    expect(() => {
      win.fire('touchend', true);
      doc.fire('visibilitychange');
      sound.play('jump');
    }).not.toThrow();
    expect(sound.started).toBe(false);
  });
});

describe('music uses the same wake-up', () => {
  it('unlock in a gesture resumes, and plays a silent sample on the first one', () => {
    const m = new Music({ setInterval: () => 1 as unknown as ReturnType<typeof setInterval>, clearInterval: () => {} });
    inGesture = true;
    m.unlock();
    inGesture = false;
    expect(made).toHaveLength(1);
    expect(made[0]!.state).toBe('running');
    expect(made[0]!.silentStarts).toBe(1);
    made[0]!.state = 'interrupted';
    inGesture = true;
    m.unlock();
    inGesture = false;
    expect(made[0]!.state).toBe('running');
  });
});
