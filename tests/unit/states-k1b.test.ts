/**
 * K1b: the way to Kano (docs/kano.md part 1, 8 and 9): the state list, saves with an old save,
 * a half-done Kano and a broken `kano` part (1.7), the lazy Kano part loading on its own
 * (KN-R10), the wheel's lines (1.6), the "To Kano" words, the ride's timing, and the words of
 * part 1, word for word.
 */
import { describe, expect, it } from 'vitest';
import { KEY_PROGRESS, Progress, isProgressShape, type Obj } from '../../src/game/progress';
import { KANO, OGUN, STATES, arrived, openStates, readStateCity, stateOpen, stateProgress, whereNow } from '../../src/game/states';
import { WorldParts, checkPart } from '../../src/worlds/load';
import { KANO_WORDS, OGUN_WORDS, SHORT_AT, WORDS, barWords } from '../../src/screens/words';
import { wheelLine } from '../../src/screens/travel';
import { musicCue } from '../../src/game/music-cue';
import { backStep } from '../../src/native/back';
import { createStore } from '../../src/storage';
import { part as kanoPart } from '../../src/worlds/kano';
import { KANO_HOLD_JUMP_S, KANO_HOLD_S, rideClock } from '../../src/worlds/kano/ride';
import { KANO_RIDE } from '../../src/worlds/kano/rideArt';
import { KANO_WORDS as KANO_PART_WORDS } from '../../src/worlds/kano/words';

function fakeStorage(seed: Record<string, string> = {}): { storage: Storage; data: Map<string, string> } {
  const data = new Map<string, string>(Object.entries(seed));
  const storage = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  } as unknown as Storage;
  return { storage, data };
}
const savedOf = (data: Map<string, string>): Obj => JSON.parse(data.get(`gidi-${KEY_PROGRESS}`)!) as Obj;
const DONE = { done: true, best: 500 };
const LAGOS = { streets: { 1: DONE, 2: DONE, 3: DONE }, parcel: false, hall: { done: true, best: 1500 } };
const OGUN_DONE = { streets: { 1: DONE, 2: DONE, 3: DONE }, parcel: false, hall: { done: true, best: 900 }, city: { fixed: ['potholes'], boom: 7 }, arrived: true };

/** A save from before Kano: Lagos and Ogun won, Ogun's city, the wallet, no `kano` part. */
const OGUN_SAVE = {
  v: 2,
  states: { lagos: LAGOS, ogun: OGUN_DONE },
  city: { kobo: 4200, power: 3, tech: 1, fixed: ['potholes'], fixes: 1, built: ['buka'], boom: 9 },
  lane: { best: 340, goals: 2, runs: 5, hints: [] },
  where: 'ogun',
};

describe('the state list (kano.md 1.1)', () => {
  it('Kano is third, in its own part, opened by Ogun', () => {
    expect(STATES.map((s) => s.id)).toEqual(['lagos', 'ogun', 'kano']);
    expect(STATES[2]).toMatchObject({ id: KANO, name: 'Kano', part: 'kano', after: OGUN });
  });

  it('Kano opens the moment Pothole Hall is won, and not before', () => {
    expect(stateOpen(null, KANO)).toBe(false);
    const ogunHalf = { v: 2, states: { lagos: LAGOS, ogun: { ...OGUN_DONE, hall: { done: false, best: 0 } } } };
    expect(openStates(ogunHalf)).toEqual(['lagos', 'ogun']);
    expect(whereNow({ ...ogunHalf, where: 'kano' })).toBe('lagos');
    expect(openStates(OGUN_SAVE)).toEqual(['lagos', 'ogun', 'kano']);
  });
});

describe('saves (kano.md 1.7)', () => {
  it('an old save with no kano part loads; Kano is open because Ogun\'s hall is done; reading writes nothing', () => {
    const raw = JSON.stringify(OGUN_SAVE);
    const { storage, data } = fakeStorage({ 'gidi-progress': raw });
    const p = new Progress(createStore(() => storage));
    expect(p.broken).toBe(false);
    expect(openStates(p.raw)).toEqual(['lagos', 'ogun', 'kano']);
    expect(whereNow(p.raw)).toBe('ogun');
    expect(stateProgress(p.raw, KANO)).toEqual({ streets: {}, parcel: false, hall: { done: false, best: 0 } });
    expect(arrived(p.raw, KANO)).toBe(false);
    expect(readStateCity(p.raw, KANO)).toEqual({ kobo: 4200, power: 3, tech: 1 });
    expect(p.state('lagos')).toEqual(LAGOS);
    expect(p.state(OGUN).hall).toEqual({ done: true, best: 900 });
    expect(data.get('gidi-progress')).toBe(raw);
  });

  it('an older save (Lagos only, before Ogun) loads, with Kano shut', () => {
    const lagosOnly = { v: 2, states: { lagos: LAGOS }, city: { kobo: 100 } };
    const { storage } = fakeStorage({ 'gidi-progress': JSON.stringify(lagosOnly) });
    const p = new Progress(createStore(() => storage));
    expect(p.broken).toBe(false);
    expect(openStates(p.raw)).toEqual(['lagos', 'ogun']);
    expect(stateOpen(p.raw, KANO)).toBe(false);
  });

  it('Kano half done: loads where it was left; writing in Kano keeps every Lagos and Ogun part', () => {
    const half = {
      ...structuredClone(OGUN_SAVE),
      states: {
        ...structuredClone(OGUN_SAVE.states),
        kano: { streets: { 1: { done: true, best: 700 } }, parcel: true, hall: { done: false, best: 0 }, lane: { best: 120, goals: 1 }, city: { boom: 3, later: 'kept' }, arrived: true, future: [1] },
      },
      where: 'kano',
    };
    const { storage, data } = fakeStorage({ 'gidi-progress': JSON.stringify(half) });
    const p = new Progress(createStore(() => storage));
    expect(whereNow(p.raw)).toBe('kano');
    expect(arrived(p.raw, KANO)).toBe(true);
    expect(p.state(KANO).streets['1']).toEqual({ done: true, best: 700 });
    expect(p.state(KANO).parcel).toBe(true);
    expect(readStateCity(p.raw, KANO)).toEqual({ boom: 3, later: 'kept', kobo: 4200, power: 3, tech: 1 });
    p.finish({ state: KANO, street: 2, kobo: 300, parcel: false });
    const s = savedOf(data);
    const st = s['states'] as Obj;
    expect(st['lagos']).toEqual(LAGOS);
    expect(st['ogun']).toEqual(OGUN_DONE);
    expect(s['city']).toEqual(OGUN_SAVE.city);
    expect(s['lane']).toEqual(OGUN_SAVE.lane);
    expect((st['kano'] as Obj)['future']).toEqual([1]);
    expect(stateProgress(s, KANO).streets['2']).toEqual({ done: true, best: 300 });
    // Progress made in Kano keeps it open, whatever happens to Ogun's part.
    expect(stateOpen({ ...s, states: { ...st, ogun: 'gone' } }, KANO)).toBe(true);
  });

  for (const bad of [7, 'text', null, [1, 2]]) {
    it(`states.kano = ${JSON.stringify(bad)}: Lagos and Ogun load whole, Kano reads empty, nothing is written by reading`, () => {
      const save = { ...structuredClone(OGUN_SAVE), states: { ...structuredClone(OGUN_SAVE.states), kano: bad }, where: 'kano' };
      const raw = JSON.stringify(save);
      expect(isProgressShape(JSON.parse(raw))).toBe(true);
      const { storage, data } = fakeStorage({ 'gidi-progress': raw });
      const p = new Progress(createStore(() => storage));
      expect(p.broken).toBe(false);
      expect(p.state('lagos')).toEqual(LAGOS);
      expect(p.state(OGUN).hall).toEqual({ done: true, best: 900 });
      expect(stateProgress(p.raw, KANO)).toEqual({ streets: {}, parcel: false, hall: { done: false, best: 0 } });
      expect(arrived(p.raw, KANO)).toBe(false);
      // Kano is still open (Pothole Hall is won), so `where` holds.
      expect(whereNow(p.raw)).toBe('kano');
      expect(data.get('gidi-progress')).toBe(raw);
      // Closing Kano's arrival card replaces the broken part; Lagos and Ogun are untouched.
      p.saveStatePart(KANO, 'arrived', true);
      const s = savedOf(data);
      expect((s['states'] as Obj)['kano']).toEqual({ arrived: true });
      expect((s['states'] as Obj)['ogun']).toEqual(OGUN_DONE);
      expect((s['states'] as Obj)['lagos']).toEqual(LAGOS);
    });
  }

  it('blocked storage: the game still runs, Kano shut on a fresh start', () => {
    const p = new Progress(createStore(() => {
      throw new Error('blocked');
    }));
    expect(openStates(p.raw)).toEqual(['lagos']);
    expect(() => p.saveStatePart(KANO, 'arrived', true)).not.toThrow();
  });
});

describe('the lazy Kano part (kano.md 9.1, 9.2; KN-R10)', () => {
  it('has the shape the loader reads: Kano\'s six level files only, the ride and Kano\'s home', () => {
    expect(checkPart({ part: kanoPart }, 'kano')).not.toBeNull();
    expect(Object.keys(kanoPart.levels).sort()).toEqual(['kano-1', 'kano-2', 'kano-3', 'kano-hall', 'kano-lane', 'kano-well']);
    expect(typeof kanoPart.ui?.busRide).toBe('function');
    expect(kanoPart.ui?.tune.name).toBe('kano-welcome');
    expect(typeof kanoPart.city).toBe('function');
  });

  it('loads with the Ogun part absent', async () => {
    const w = new WorldParts({ kano: () => Promise.resolve({ part: kanoPart }), ogun: () => Promise.reject(new TypeError('Failed to fetch')) });
    const r = await w.load('kano');
    expect(r.ok).toBe(true);
    expect(w.get('ogun')).toBeNull();
  });

  it('missing or broken: Kano\'s own plain words (Lagos and Ogun still work); the next try fetches again', async () => {
    let online = false;
    let calls = 0;
    const w = new WorldParts({ kano: () => (calls++, Promise.reject(new TypeError('Failed to fetch'))) }, () => online);
    expect(await w.load('kano')).toEqual({ ok: false, why: 'missing', message: KANO_WORDS.download.noNet });
    online = true;
    expect(await w.load('kano')).toEqual({ ok: false, why: 'missing', message: KANO_WORDS.broken });
    expect(calls).toBe(2);
    const odd = new WorldParts({ kano: () => Promise.resolve({ part: { id: 'ogun', version: 1, levels: {} } }) });
    expect(await odd.load('kano')).toEqual({ ok: false, why: 'broken', message: KANO_WORDS.broken });
    for (const m of [KANO_WORDS.download.noNet, KANO_WORDS.broken]) expect(m).toMatch(/Lagos and Ogun still work/);
  });
});

describe('the long ride north (kano.md 1.3)', () => {
  it('about 5 s the first time, 2 s after; the end picture stays a moment', () => {
    expect([KANO_RIDE.first, KANO_RIDE.again]).toEqual([5, 2]);
    expect(rideClock(2.5, 5, false, false)).toEqual({ p: 0.5, over: false });
    expect(rideClock(5 + KANO_HOLD_S - 0.01, 5, false, false).over).toBe(false);
    expect(rideClock(5 + KANO_HOLD_S, 5, false, false)).toEqual({ p: 1, over: true });
  });

  it('a tap jumps to the end picture; reduced motion is the end picture only', () => {
    expect(rideClock(0, 5, true, false)).toEqual({ p: 1, over: false });
    expect(rideClock(KANO_HOLD_JUMP_S, 5, true, false).over).toBe(true);
    expect(rideClock(0.2, 5, false, true)).toEqual({ p: 1, over: false });
  });

  it('Kano keeps the menu tune; the ride is quiet but for its tune; Kano asks to leave as the other cities do', () => {
    expect(musicCue({ screen: 'kano', where: 0, hits: 0, below: false } as Parameters<typeof musicCue>[0])).toEqual({ place: 'menu', tempo: 0 });
    const s = { sinceScreen: 10_000, askOpen: false, card: false, screen: 'kano', running: false, lane: false, hall: false, heroSaved: true } as unknown as Parameters<typeof backStep>[0];
    expect(backStep(s, {} as Parameters<typeof backStep>[1])).toEqual({ kind: 'ask', fromRun: null });
  });
});

describe('the wheel rail line (kano.md 1.6)', () => {
  const ogunBeaten = { open: true, turning: true, beaten: true };
  const kano = (turning: boolean, beaten: boolean) => ({ open: true, turning, beaten });
  it('follows the table, word for word', () => {
    expect(wheelLine(2, ogunBeaten, kano(false, false))).toBe('Next: Kano, the Centre of Commerce.');
    expect(wheelLine(3, ogunBeaten, kano(true, false))).toBe('Kano is turning. Get the water flowing in Borehole Hall.');
    expect(wheelLine(3, ogunBeaten, kano(true, true))).toBe('The water is flowing in Kano. More states are coming soon.');
    expect(wheelLine(0, ogunBeaten, kano(false, false))).toBe(WORDS.wheel.none);
  });
  it('Lagos and Ogun keep their lines while Kano is shut', () => {
    const shut = { open: false, turning: false, beaten: false };
    expect(wheelLine(1, { open: true, turning: false, beaten: false }, shut)).toBe('Next: Ogun, the Gateway State.');
    expect(wheelLine(2, { open: true, turning: true, beaten: false }, shut)).toBe('Ogun is turning. Smooth out King Pothole to open the gateway.');
  });
});

describe('part 1 and part 8 words, exact', () => {
  it('the Pothole Hall Win screen, the download card, Travel, "To Kano", arrival, the wheel list and Settings', () => {
    expect(KANO_WORDS.ogunWin).toEqual({ line: 'The road north to Kano is open.', onToKano: 'On to Kano', goToKano: 'Go to Kano' });
    expect(KANO_WORDS.download.line1).toBe('Kano is ready to download (about 85 KB).');
    expect(OGUN_WORDS.download.line2).toBe('After this it plays with no internet.');
    expect([OGUN_WORDS.download.go, OGUN_WORDS.download.notNow, OGUN_WORDS.download.ok]).toEqual(['Download', 'Not now', 'OK']);
    expect(KANO_WORDS.download.noNet).toBe('Kano needs the internet once to download. Lagos and Ogun still work with no internet.');
    expect(KANO_WORDS.name).toBe('Kano');
    expect(KANO_WORDS.toKano).toEqual({
      stop: 'To Kano',
      lockedShort: 'Win Pothole Hall',
      line: 'The road to Kano is open.',
      go: 'Go to Kano',
      locked: 'Win Pothole Hall to open the road to Kano.',
    });
    expect(KANO_WORDS.arrival).toEqual({
      heading: 'Welcome to Kano!',
      line1: 'Kano is the Centre of Commerce. People come here to buy and sell.',
      line2: 'The dust has dried up the borehole. Fix Kano, and the water will flow.',
      go: "Let's go",
    });
    expect(KANO_WORDS.wheel.listNext).toBe('Kano, next');
    expect(KANO_WORDS.saved).toBe('Your hero, Lagos, Ogun and Kano are saved on this phone.');
    expect(OGUN_WORDS.travel.heading).toBe('Where to?');
  });

  it("Kano's long toasts have their short words in the first load's list", () => {
    const long = [KANO_PART_WORDS.toast.kilishi, KANO_PART_WORDS.toast.fura, KANO_PART_WORDS.toast.parcel, KANO_PART_WORDS.hall.parcelShield, KANO_PART_WORDS.hall.cross, KANO_PART_WORDS.hall.open, KANO_PART_WORDS.hall.hint];
    for (const t of long) {
      const short = barWords(t, 100);
      expect(short, t).not.toBe(t.length > SHORT_AT ? t : '');
      expect(short.length).toBeLessThanOrEqual(SHORT_AT);
    }
  });
});
