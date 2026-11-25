/**
 * O1b1: the state list, saves across states (docs/ogun.md 1.8, decision 80) and the lazy Ogun part
 * (ogun.md 9.2): an old save, a half-done Ogun, a broken `ogun` save part, and a missing or broken
 * Ogun code part.
 */
import { describe, expect, it } from 'vitest';
import { KEY_PROGRESS, Progress, isProgressShape, type Obj } from '../../src/game/progress';
import { CityLife } from '../../src/game/cityLife';
import { KEY_CITY } from '../../src/game/city';
import {
  OGUN,
  STATES,
  arrived,
  openStates,
  readStateCity,
  stateOpen,
  stateProgress,
  wallet,
  walletOf,
  whereNow,
  writeStateCity,
} from '../../src/game/states';
import { WORLD_PART_VERSION, WorldParts, checkPart } from '../../src/worlds/load';
import { WORLD_PART_WORDS } from '../../src/screens/words';
import { createStore } from '../../src/storage';
import { part as ogunPart } from '../../src/worlds/ogun';

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

/** A real save from before this update: Lagos done to the hall, a Lagos city and a lane part. */
const OLD_SAVE = {
  v: 2,
  states: { lagos: { streets: { 1: { done: true, best: 1200 }, 2: { done: true, best: 900 }, 3: { done: true, best: 700 } }, parcel: false, hall: { done: true, best: 1500 } } },
  city: { kobo: 4200, power: 3, tech: 1, fixed: ['potholes'], fixes: 1, at: { x: 500, y: 600 }, paid: {}, built: ['buka'], trays: { buka: 120 }, boom: 9, boomCollect: 0, hints: ['walk'] },
  lane: { best: 340, goals: 2, runs: 5, hints: [] },
  dash: true,
};

describe('the state list', () => {
  it('Lagos first and in the first load; Ogun next, in its own part, opened by Lagos', () => {
    // K1b: Kano third, its own part, opened by Ogun (states-k1b.test.ts).
    expect(STATES.map((s) => s.id)).toEqual(['lagos', 'ogun', 'kano']);
    expect(STATES[0]).toMatchObject({ part: null, after: null });
    expect(STATES[1]).toMatchObject({ id: 'ogun', part: 'ogun', after: 'lagos' });
  });

  it('a fresh game: only Lagos open, where is Lagos', () => {
    expect(openStates(null)).toEqual(['lagos']);
    expect(whereNow(null)).toBe('lagos');
    expect(stateOpen(null, 'nowhere')).toBe(false);
  });
});

describe('an old save (ogun.md 1.8)', () => {
  it('loads as Lagos, opens Ogun because the hall is done, and is not written by reading', () => {
    const raw = JSON.stringify(OLD_SAVE);
    const { storage, data } = fakeStorage({ 'gidi-progress': raw });
    const p = new Progress(createStore(() => storage));
    expect(p.broken).toBe(false);
    expect(data.get('gidi-progress')).toBe(raw);
    expect(whereNow(p.raw)).toBe('lagos');
    expect(openStates(p.raw)).toEqual(['lagos', 'ogun']);
    expect(stateProgress(p.raw, OGUN)).toEqual({ streets: {}, parcel: false, hall: { done: false, best: 0 } });
    expect(arrived(p.raw)).toBe(false);
    expect(wallet(p.raw)).toEqual({ kobo: 4200, power: 3, tech: 1 });
    // Lagos reads exactly as before.
    expect(p.state('lagos').hall).toEqual({ done: true, best: 1500 });
  });

  it('an old save without the hall keeps Ogun shut', () => {
    const save = structuredClone(OLD_SAVE) as Obj;
    ((save['states'] as Obj)['lagos'] as Obj)['hall'] = { done: false, best: 0 };
    expect(openStates(save)).toEqual(['lagos']);
    expect(whereNow({ ...save, where: 'ogun' })).toBe('lagos');
  });

  it('a version 1 save (before Naira) still moves once and gains nothing it did not have', () => {
    const v1 = { v: 1, states: { lagos: { streets: { 1: { done: true, best: 12 } }, parcel: true, hall: { done: false, best: 0 } } } };
    const { storage, data } = fakeStorage({ 'gidi-progress': JSON.stringify(v1) });
    const p = new Progress(createStore(() => storage));
    expect(savedOf(data)).toEqual({ v: 2, states: { lagos: { streets: { 1: { done: true, best: 120 } }, parcel: true, hall: { done: false, best: 0 } } } });
    expect(whereNow(p.raw)).toBe('lagos');
  });

  it('nothing is lost when Ogun writes: every Lagos part stays exactly as it was', () => {
    const { storage, data } = fakeStorage({ 'gidi-progress': JSON.stringify(OLD_SAVE) });
    const p = new Progress(createStore(() => storage));
    p.saveStatePart(OGUN, 'arrived', true);
    p.savePart('where', 'ogun');
    p.finish({ state: OGUN, street: 1, kobo: 800, parcel: false });
    const s = savedOf(data);
    expect((s['states'] as Obj)['lagos']).toEqual(OLD_SAVE.states.lagos);
    expect(s['city']).toEqual(OLD_SAVE.city);
    expect(s['lane']).toEqual(OLD_SAVE.lane);
    expect(s['dash']).toBe(true);
    expect(whereNow(s)).toBe('ogun');
    expect(arrived(s)).toBe(true);
    expect(stateProgress(s, OGUN).streets['1']).toEqual({ done: true, best: 800 });
  });
});

describe('a half-done Ogun (ogun.md 1.8, decision 80)', () => {
  const HALF = {
    ...structuredClone(OLD_SAVE),
    states: {
      ...structuredClone(OLD_SAVE.states),
      ogun: {
        streets: { 1: { done: true, best: 600 } },
        parcel: true,
        hall: { done: false, best: 0 },
        city: { fixed: ['dryTaps'], fixes: 1, boom: 4, trays: { mill: 50 }, at: { x: 10, y: 20 }, later: 'kept' },
        arrived: true,
        future: { x: 1 },
      },
    },
    where: 'ogun',
  };

  it('loads where it was left, with its own streets, parcel and city', () => {
    const { storage } = fakeStorage({ 'gidi-progress': JSON.stringify(HALF) });
    const p = new Progress(createStore(() => storage));
    expect(p.broken).toBe(false);
    expect(whereNow(p.raw)).toBe('ogun');
    expect(arrived(p.raw)).toBe(true);
    const og = stateProgress(p.raw, OGUN);
    expect(og.streets['1']).toEqual({ done: true, best: 600 });
    expect(og.parcel).toBe(true);
    expect(og.hall.done).toBe(false);
    // Lagos's parcel and Ogun's are separate (decision 18: one per state).
    expect(p.state('lagos').parcel).toBe(false);
    // Ogun's city joined with the one wallet.
    const c = readStateCity(p.raw, OGUN);
    expect(c).toMatchObject({ fixed: ['dryTaps'], boom: 4, trays: { mill: 50 }, later: 'kept', kobo: 4200, power: 3, tech: 1 });
  });

  it('a stray wallet inside the Ogun city is never read: the money is one', () => {
    const save = structuredClone(HALF) as Obj;
    (((save['states'] as Obj)['ogun'] as Obj)['city'] as Obj)['kobo'] = 999999;
    expect(readStateCity(save, OGUN)['kobo']).toBe(4200);
  });

  it('spending in Ogun takes from the shared wallet; Ogun keeps its own fixes and Booming meter', () => {
    const { storage, data } = fakeStorage({ 'gidi-progress': JSON.stringify(HALF) });
    const p = new Progress(createStore(() => storage));
    const joined = readStateCity(p.raw, OGUN);
    const next = { ...joined, kobo: (joined['kobo'] as number) - 2000, tech: 0, fixed: ['dryTaps', 'gridDown'], fixes: 2, boom: 8 };
    expect(p.saveStateCity(OGUN, writeStateCity(next), walletOf(next))).toBe(true);
    const s = savedOf(data);
    const ogCity = ((s['states'] as Obj)['ogun'] as Obj)['city'] as Obj;
    expect(ogCity).toEqual({ fixed: ['dryTaps', 'gridDown'], fixes: 2, boom: 8, trays: { mill: 50 }, at: { x: 10, y: 20 }, later: 'kept' });
    expect('kobo' in ogCity || 'power' in ogCity || 'tech' in ogCity).toBe(false);
    // The top-level city keeps Lagos's map and holds the new wallet.
    expect(s['city']).toEqual({ ...OLD_SAVE.city, kobo: 2200, power: 3, tech: 0 });
    expect(wallet(s)).toEqual({ kobo: 2200, power: 3, tech: 0 });
    // Unknown Ogun fields stay.
    expect(((s['states'] as Obj)['ogun'] as Obj)['future']).toEqual({ x: 1 });
  });

  it('the Lagos city reads the shared wallet Ogun spent from, and its own map is unchanged', () => {
    const { storage } = fakeStorage({ 'gidi-progress': JSON.stringify(HALF) });
    const p = new Progress(createStore(() => storage));
    const joined = readStateCity(p.raw, OGUN);
    const next = { ...joined, kobo: 100 };
    p.saveStateCity(OGUN, writeStateCity(next), walletOf(next));
    const lagos = new CityLife({ load: () => p.raw?.[KEY_CITY], save: (part) => p.savePart(KEY_CITY, part) });
    expect(lagos.state.kobo).toBe(100);
    expect(lagos.state.fixed).toEqual(['potholes']);
    expect(lagos.state.built).toEqual(['buka']);
  });

  it('a Lagos finish keeps every Ogun part', () => {
    const { storage, data } = fakeStorage({ 'gidi-progress': JSON.stringify(HALF) });
    const p = new Progress(createStore(() => storage));
    p.finish({ state: 'lagos', street: 2, kobo: 5000, parcel: true });
    const s = savedOf(data);
    expect((s['states'] as Obj)['ogun']).toEqual(HALF.states.ogun);
    expect(s['where']).toBe('ogun');
  });
});

describe('a broken ogun save part (ogun.md 1.8: a broken part starts empty)', () => {
  for (const bad of [7, 'text', null, [1, 2]]) {
    it(`states.ogun = ${JSON.stringify(bad)}: Lagos loads whole, Ogun reads empty, nothing is written by reading`, () => {
      const save = { ...structuredClone(OLD_SAVE), states: { ...structuredClone(OLD_SAVE.states), ogun: bad }, where: 'ogun' };
      const raw = JSON.stringify(save);
      expect(isProgressShape(JSON.parse(raw))).toBe(true);
      const { storage, data } = fakeStorage({ 'gidi-progress': raw });
      const p = new Progress(createStore(() => storage));
      expect(p.broken).toBe(false);
      expect(p.state('lagos')).toEqual({ streets: { 1: { done: true, best: 1200 }, 2: { done: true, best: 900 }, 3: { done: true, best: 700 } }, parcel: false, hall: { done: true, best: 1500 } });
      expect(stateProgress(p.raw, OGUN)).toEqual({ streets: {}, parcel: false, hall: { done: false, best: 0 } });
      expect(arrived(p.raw)).toBe(false);
      expect(readStateCity(p.raw, OGUN)).toEqual({ kobo: 4200, power: 3, tech: 1 });
      // Ogun is still open (the Lagos hall is done), so `where` holds.
      expect(whereNow(p.raw)).toBe('ogun');
      expect(data.get('gidi-progress')).toBe(raw);
      // Doing something in Ogun replaces the broken part; Lagos is untouched.
      p.saveStatePart(OGUN, 'arrived', true);
      const s = savedOf(data);
      expect((s['states'] as Obj)['ogun']).toEqual({ arrived: true });
      expect((s['states'] as Obj)['lagos']).toEqual(OLD_SAVE.states.lagos);
    });
  }

  it('a broken Ogun city or an odd `where` reads as empty and as Lagos', () => {
    const save = { ...structuredClone(OLD_SAVE), states: { ...structuredClone(OLD_SAVE.states), ogun: { city: 'oops', arrived: 'yes' } }, where: 42 };
    expect(readStateCity(save, OGUN)).toEqual({ kobo: 4200, power: 3, tech: 1 });
    expect(arrived(save)).toBe(false);
    expect(whereNow(save)).toBe('lagos');
  });

  it('a broken lagos part still makes the whole copy broken, as before', () => {
    expect(isProgressShape({ v: 2, states: { lagos: 7 } })).toBe(false);
  });
});

describe('the lazy Ogun part (ogun.md 9.2)', () => {
  it('the real part has the shape the loader reads, and only Ogun level files', () => {
    expect(checkPart({ part: ogunPart }, 'ogun')).not.toBeNull();
    expect(ogunPart.version).toBe(WORLD_PART_VERSION);
    for (const name of Object.keys(ogunPart.levels)) expect(name).toMatch(/^ogun-/);
  });

  it('loads once and shares the answer', async () => {
    let calls = 0;
    const w = new WorldParts({ ogun: () => (calls++, Promise.resolve({ part: ogunPart })) });
    expect(w.get('ogun')).toBeNull();
    const [a, b] = await Promise.all([w.load('ogun'), w.load('ogun')]);
    expect(a.ok && b.ok).toBe(true);
    await w.load('ogun');
    expect(calls).toBe(1);
    expect(w.get('ogun')).toBe(ogunPart);
  });

  it('a missing part (no internet): plain words, no throw, and the next try fetches again', async () => {
    let calls = 0;
    let online = false;
    const w = new WorldParts({ ogun: () => (calls++, Promise.reject(new TypeError('Failed to fetch dynamically imported module'))) }, () => online);
    const r = await w.load('ogun');
    expect(r).toEqual({ ok: false, why: 'missing', message: WORLD_PART_WORDS.noInternet });
    online = true;
    const r2 = await w.load('ogun');
    expect(r2).toEqual({ ok: false, why: 'missing', message: WORLD_PART_WORDS.broken });
    expect(calls).toBe(2);
    expect(w.get('ogun')).toBeNull();
  });

  it('a broken part (wrong shape, wrong id, old version, throws while loading): plain words, never a crash', async () => {
    const bad: unknown[] = [null, 5, {}, { part: null }, { part: { id: 'lagos', version: 1, levels: {} } }, { part: { id: 'ogun', version: 99, levels: {} } }, { part: { id: 'ogun', version: 1, levels: [] } }];
    for (const mod of bad) {
      const w = new WorldParts({ ogun: () => Promise.resolve(mod) });
      expect(await w.load('ogun'), JSON.stringify(mod)).toEqual({ ok: false, why: 'broken', message: WORLD_PART_WORDS.broken });
    }
    const throws = new WorldParts({ ogun: () => Promise.reject(new SyntaxError('Unexpected token')) });
    expect((await throws.load('ogun')).ok).toBe(false);
    const sync = new WorldParts({
      ogun: () => {
        throw new Error('boom');
      },
    });
    expect((await sync.load('ogun')).ok).toBe(false);
    const none = new WorldParts({});
    expect((await none.load('ogun')).ok).toBe(false);
  });

  it('the words are plain and say Lagos still works', () => {
    for (const words of Object.values(WORLD_PART_WORDS)) {
      expect(words).toMatch(/Lagos still works/);
      expect(words.length).toBeLessThan(90);
    }
  });
});
