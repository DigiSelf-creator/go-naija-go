/**
 * O1b2 (docs/ogun.md parts 1 and 8): the rules of the way to Ogun that need no page. The wheel's
 * rail line, the "To Ogun" road stop, the ride's timing, the Android back button on the new
 * screens and cards, the music on them, and "Show the bus ride" in Settings.
 */
import { describe, expect, it } from 'vitest';
import { emptyCity } from '../../src/game/city';
import { readState, type StateProgress } from '../../src/game/progress';
import { loadSettings, saveSettings } from '../../src/game/save';
import { musicCue } from '../../src/game/music-cue';
import { backStep, type BackLabels, type BackState } from '../../src/native/back';
import { stopCards, type RoadView } from '../../src/screens/road';
import { boomShown, wheelLine } from '../../src/screens/travel';
import { OGUN_WORDS, WORDS } from '../../src/screens/words';
import { createStore } from '../../src/storage';
import { RIDE_HOLD_JUMP_S, RIDE_HOLD_S, rideAt } from '../../src/worlds/ogun/ride';
import { BUS_RIDE } from '../../src/art/ogunGate';

const view = (hall: boolean): RoadView => ({
  lagos: readState({ streets: { 1: { done: true }, 2: { done: true }, 3: { done: true } }, hall: { done: hall } }) as StateProgress,
  names: ['Alausa', 'Computer Village', 'Ikeja'],
  city: emptyCity(),
  lane: { best: 0, goals: 0 },
});

describe('the wheel rail line (ogun.md 1.7)', () => {
  const closed = { open: false, turning: false, beaten: false };
  it('follows the table, word for word', () => {
    expect(wheelLine(0, closed)).toBe(WORDS.wheel.none);
    expect(wheelLine(1, closed)).toBe('Win Go-Slow Hall to open the road to Ogun.');
    expect(wheelLine(1, { ...closed, open: true })).toBe('Next: Ogun, the Gateway State.');
    expect(wheelLine(2, { open: true, turning: true, beaten: false })).toBe('Ogun is turning. Smooth out King Pothole to open the gateway.');
    expect(wheelLine(2, { open: true, turning: true, beaten: true })).toBe('The gateway is open. More states are coming soon.');
  });
  it('the Travel card shows Booming up to 20', () => {
    expect([boomShown(0), boomShown(9.7), boomShown(35), boomShown(Number.NaN)]).toEqual([0, 9, 20, 0]);
    expect(OGUN_WORDS.travel.booming(boomShown(35), true)).toBe('Booming: 20 of 20 ✓');
  });
});

describe('the "To Ogun" stop (ogun.md 1.2)', () => {
  it('locked until Go-Slow Hall is won: sand plate, padlock words, no big button', () => {
    const s = stopCards(view(false)).find((x) => x.id === 'ogun')!;
    expect([s.state, s.name, s.status, s.line3, s.go, s.lines]).toEqual(['locked', 'To Ogun', 'Locked', 'Win Go-Slow Hall', null, ['Win Go-Slow Hall to open the road to Ogun.']]);
  });
  it('open after the hall: "Open", its card line and "Go to Ogun"; never a run or a fix', () => {
    const s = stopCards(view(true)).find((x) => x.id === 'ogun')!;
    expect([s.state, s.status, s.line3, s.go, s.lines, s.forFix]).toEqual(['open', 'Open', null, 'Go to Ogun', ['The road to Ogun is open.'], null]);
    expect(s.spoken).toBe('To Ogun. Open. The road to Ogun is open.');
  });
  it('the Ferry stays a Lagos stop, after it', () => {
    const ids = stopCards(view(true)).map((x) => x.id);
    expect(ids.slice(-3)).toEqual(['hall', 'ogun', 'ferry']);
  });
});

describe('the bus ride (ogun.md 1.3)', () => {
  it('about 4 s the first time, 2 s after; the end picture stays a moment', () => {
    expect([BUS_RIDE.first, BUS_RIDE.again]).toEqual([4, 2]);
    expect(rideAt(2, 4, false, false)).toEqual({ p: 0.5, over: false });
    expect(rideAt(4, 4, false, false)).toEqual({ p: 1, over: false });
    expect(rideAt(4 + RIDE_HOLD_S, 4, false, false).over).toBe(true);
  });
  it('a tap jumps to the end picture, shown for 1.5 s; reduced motion is the end picture only', () => {
    expect(RIDE_HOLD_JUMP_S).toBe(1.5);
    expect(rideAt(0, 4, true, false)).toEqual({ p: 1, over: false });
    expect(rideAt(1.5, 4, true, false).over).toBe(true);
    expect(rideAt(0.2, 4, false, true)).toEqual({ p: 1, over: false });
  });
});

describe('Android back on the new screens and cards', () => {
  const L: BackLabels = {
    introSkip: 'Skip',
    settingsBack: 'Back',
    creditsBack: 'Back',
    roadHome: 'Home',
    roadBack: 'Back',
    wheelClose: 'Close',
    wheelBack: 'Back',
    takeHome: 'Take it home',
    cardOut: [OGUN_WORDS.travel.back, OGUN_WORDS.download.notNow, OGUN_WORDS.download.ok, OGUN_WORDS.arrival.go],
    rideSkip: OGUN_WORDS.busRide.skip,
  };
  const at = (s: Partial<BackState>): BackState => ({ askOpen: false, sinceScreen: 1000, screen: null, running: false, hall: false, heroSaved: true, ...s });
  it("a card's own way out; Skip on the ride; Ogun's place asks to leave, as Lagos does", () => {
    expect(backStep(at({ screen: 'city', card: true }), L)).toEqual({ kind: 'press', labels: ['Back', 'Not now', 'OK', "Let's go"] });
    expect(backStep(at({ screen: 'ride' }), L)).toEqual({ kind: 'press', labels: ['Skip'] });
    expect(backStep(at({ screen: 'ogun' }), L)).toEqual({ kind: 'ask', fromRun: null });
  });
});

describe('music and settings', () => {
  it('the ride is quiet but for its welcome tune; Ogun keeps the menu tune', () => {
    const scene = { where: 0 as const, below: false, hits: 0, hidden: false };
    expect(musicCue({ ...scene, screen: 'ride' })).toBeNull();
    expect(musicCue({ ...scene, screen: 'ogun' })).toEqual({ place: 'menu', tempo: 0 });
  });
  it('"Show the bus ride" is on by default and is saved; blocked storage still works', () => {
    const mem = new Map<string, string>();
    const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) } as unknown as Storage;
    const store = createStore(() => storage);
    expect(loadSettings(store).busRide).toBe(true);
    saveSettings(store, { ...loadSettings(store), busRide: false });
    expect(loadSettings(createStore(() => storage)).busRide).toBe(false);
    const blocked = createStore(() => {
      throw new Error('blocked');
    });
    expect(loadSettings(blocked).busRide).toBe(true);
    expect(() => saveSettings(blocked, { ...loadSettings(blocked), busRide: false })).not.toThrow();
  });
});
