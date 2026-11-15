/**
 * S3f0 part 25.4 and 25.5 (decision 70): which phones can tilt, Apple's box asked only on a call
 * (from a tap), and the saves: only the switch and the lane's two tilt marks, never an angle.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TILT_DETECT_MS, TiltAccess } from '../../src/game/tilt';
import { loadSettings, saveSettings } from '../../src/game/save';
import { readLane, writeLane } from '../../src/lane/rewards';
import { createStore } from '../../src/storage';
import { backStep } from '../../src/native/back';
import { WORDS } from '../../src/screens/words';

type Listener = (e: { beta: number | null }) => void;

/** A pretend window: touch or not, an iPhone (requestPermission) or not. */
function fakeWindow(o: { touch: boolean; ios?: () => Promise<string>; noEvent?: boolean; ua?: string }) {
  const listeners = new Set<Listener>();
  const ev: Record<string, unknown> = {};
  if (o.ios) ev['requestPermission'] = o.ios;
  const win = {
    navigator: { userAgent: o.ua ?? (o.ios ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)' : 'Mozilla/5.0 (Linux; Android 14)'), maxTouchPoints: o.touch ? 5 : 0 },
    matchMedia: (q: string) => ({ matches: q === '(pointer: coarse)' && o.touch }),
    DeviceOrientationEvent: o.noEvent ? undefined : ev,
    addEventListener: (_t: string, f: Listener) => listeners.add(f),
    removeEventListener: (_t: string, f: Listener) => listeners.delete(f),
    setTimeout: (f: () => void, ms: number) => setTimeout(f, ms),
    clearTimeout: (id: number) => clearTimeout(id),
  };
  const send = (beta: number | null) => [...listeners].forEach((f) => f({ beta }));
  return { win: win as unknown as Window, send, listeners };
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('can this phone tilt (25.5)', () => {
  it('a computer (no touch) never can, and adds no listener', () => {
    const f = fakeWindow({ touch: false });
    const t = new TiltAccess(f.win);
    expect(t.canTilt).toBe(false);
    expect(f.listeners.size).toBe(0);
  });

  it('a touch phone that sends one reading with a number can; the quiet listener goes', () => {
    const f = fakeWindow({ touch: true });
    const t = new TiltAccess(f.win);
    let found = 0;
    t.onFound(() => found++);
    expect(t.canTilt).toBe(false);
    f.send(12.5);
    expect(t.canTilt).toBe(true);
    expect(t.ready).toBe(true);
    expect(found).toBe(1);
    expect(f.listeners.size).toBe(0);
  });

  it('an event with no numbers does not count, and the listener is removed after 1.5 s', () => {
    vi.useFakeTimers();
    const f = fakeWindow({ touch: true });
    const t = new TiltAccess(f.win);
    f.send(null);
    expect(t.canTilt).toBe(false);
    vi.advanceTimersByTime(TILT_DETECT_MS + 1);
    expect(f.listeners.size).toBe(0);
    f.send(10);
    expect(t.canTilt).toBe(false);
  });

  it('an iPhone (touch and requestPermission) can at once, and is not asked on load', () => {
    const ask = vi.fn(() => Promise.resolve('granted'));
    const f = fakeWindow({ touch: true, ios: ask });
    const t = new TiltAccess(f.win);
    expect(t.canTilt).toBe(true);
    expect(t.ios).toBe(true);
    expect(t.needsAsk).toBe(true);
    expect(t.ready).toBe(false);
    expect(ask).not.toHaveBeenCalled();
    expect(f.listeners.size).toBe(0);
  });
});

describe('Chrome has requestPermission too', () => {
  it('an Android phone with it is not taken for an iPhone: no box, the quiet check finds it', () => {
    const f = fakeWindow({ touch: true, ios: () => Promise.resolve('granted'), ua: 'Mozilla/5.0 (Linux; Android 14) Chrome/140' });
    const t = new TiltAccess(f.win);
    expect(t.ios).toBe(false);
    expect(t.canTilt).toBe(false);
    f.send(3);
    expect(t.canTilt).toBe(true);
    expect(t.needsAsk).toBe(false);
  });

  it('an iPad (it says Macintosh, with touch points) is an Apple one', () => {
    const t = new TiltAccess(fakeWindow({ touch: true, ios: () => Promise.resolve('granted'), ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' }).win);
    expect(t.ios).toBe(true);
  });
});

describe("Apple's box (25.4)", () => {
  it('asks only when called; yes makes it ready; two taps share one box', async () => {
    const ask = vi.fn(() => Promise.resolve('granted'));
    vi.stubGlobal('window', { DeviceOrientationEvent: { requestPermission: ask } });
    const f = fakeWindow({ touch: true, ios: ask });
    const t = new TiltAccess(f.win);
    const heard: string[] = [];
    t.onAnswer((a, from) => heard.push(`${a} ${from}`));
    const [a, b] = await Promise.all([t.ask('switch'), t.ask('switch')]);
    expect([a, b]).toEqual(['granted', 'granted']);
    expect(ask).toHaveBeenCalledTimes(1);
    expect(t.ready).toBe(true);
    expect(t.needsAsk).toBe(false);
    expect(heard).toEqual(['granted switch']);
  });

  it('a no (or a refusal that throws) is "denied"', async () => {
    const no = vi.fn(() => Promise.resolve('denied'));
    vi.stubGlobal('window', { DeviceOrientationEvent: { requestPermission: no } });
    const t = new TiltAccess(fakeWindow({ touch: true, ios: no }).win);
    expect(await t.ask('run')).toBe('denied');
    expect(t.answer).toBe('denied');
    expect(t.ready).toBe(false);
    const boom = vi.fn(() => Promise.reject(new Error('NotAllowedError')));
    vi.stubGlobal('window', { DeviceOrientationEvent: { requestPermission: boom } });
    const t2 = new TiltAccess(fakeWindow({ touch: true, ios: boom }).win);
    expect(await t2.ask('run')).toBe('denied');
  });

  it('Android never shows a box: yes at once', async () => {
    const t = new TiltAccess(fakeWindow({ touch: true }).win);
    expect(t.needsAsk).toBe(false);
    expect(await t.ask('switch')).toBe('granted');
  });
});

describe('saves (25.9): the switch and two marks, never an angle', () => {
  it('"Tilt to steer" is off by default, saved under its own key', () => {
    const mem = new Map<string, string>();
    const storage = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    } as unknown as Storage;
    const store = createStore(() => storage);
    expect(loadSettings(store).tiltToSteer).toBe(false);
    saveSettings(store, { ...loadSettings(store), tiltToSteer: true });
    expect(mem.get('gidi-tiltToSteer')).toBe('true');
    expect(loadSettings(createStore(() => storage)).tiltToSteer).toBe(true);
  });

  it('a broken switch value starts at off', () => {
    const storage = { getItem: (k: string) => (k === 'gidi-tiltToSteer' ? '"yes"' : null), setItem: () => {}, removeItem: () => {} } as unknown as Storage;
    expect(loadSettings(createStore(() => storage)).tiltToSteer).toBe(false);
  });

  it('the lane part keeps only tiltOffered and tiltNoes', () => {
    const out = writeLane({ ...readLane({ centre: 20, angle: 33 }), tiltOffered: true, tiltNoes: 1 });
    expect(Object.keys(out).sort()).toEqual(['best', 'goals', 'hints', 'runs', 'tiltNoes', 'tiltOffered']);
    expect(JSON.stringify(out)).not.toMatch(/centre|angle|beta/);
  });
});

describe('Android back on the offer card counts as "No thanks"', () => {
  it('presses "No thanks" when no "Take it home" shows', () => {
    const labels = { introSkip: '', settingsBack: '', creditsBack: '', streetsHome: '', wheelClose: '', wheelBack: '', takeHome: WORDS.cleared.takeHome, tiltNo: WORDS.lane.tiltOfferNo };
    const step = backStep({ askOpen: false, sinceScreen: 1000, screen: null, running: false, hall: false, lane: true, heroSaved: true }, labels);
    expect(step).toEqual({ kind: 'press', labels: [WORDS.cleared.takeHome, 'No thanks'] });
  });
});
