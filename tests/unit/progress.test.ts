/**
 * N2: progress on the phone (docs/design.md S2.8 "Save shape", "Unlocking"), the Streets cards
 * (S2.10) and the wheel fit rule (S2.8 "The wheel screen on every size").
 */
import { describe, expect, it } from 'vitest';
import {
  KEY_PROGRESS,
  Progress,
  anyDone,
  hallOpen,
  isProgressShape,
  mergeFinish,
  readState,
  streetOpen,
  switchedOn,
} from '../../src/game/progress';
import { hasSavedLook, isOldSave, loadLook } from '../../src/game/save';
import { streetCards, wheelFit } from '../../src/screens/streets';
import { createStore } from '../../src/storage';

function fakeStorage(seed: Record<string, string> = {}): { storage: Storage; data: Map<string, string> } {
  const data = new Map<string, string>(Object.entries(seed));
  const storage = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  } as unknown as Storage;
  return { storage, data };
}

const saved = (data: Map<string, string>): unknown => JSON.parse(data.get(`gidi-${KEY_PROGRESS}`)!);

describe('the save shape (S2.8)', () => {
  it('a finished street writes the documented shape under gidi-progress', () => {
    const { storage, data } = fakeStorage();
    const p = new Progress(createStore(() => storage));
    expect(data.has('gidi-progress')).toBe(false); // nothing written until a finish
    p.finish({ state: 'lagos', street: 1, kobo: 120, parcel: false });
    // Version 2 (slice 3, N3): bests are whole kobo.
    expect(saved(data)).toEqual({ v: 2, states: { lagos: { streets: { 1: { done: true, best: 120 } }, parcel: false, hall: { done: false, best: 0 } } } });
    p.finish({ state: 'lagos', street: 2, kobo: 113, parcel: true });
    expect(saved(data)).toEqual({
      v: 2,
      states: { lagos: { streets: { 1: { done: true, best: 120 }, 2: { done: true, best: 113 } }, parcel: true, hall: { done: false, best: 0 } } },
    });
    p.finish({ state: 'lagos', hall: true, kobo: 0 });
    const lagos = new Progress(createStore(() => storage)).state('lagos');
    expect(lagos.hall).toEqual({ done: true, best: 0 });
    expect(switchedOn(lagos)).toBe(true);
  });

  it('best is the most kobo ever finished with; done and the parcel never go back', () => {
    let s = mergeFinish(null, { state: 'lagos', street: 1, kobo: 90, parcel: true });
    s = mergeFinish(s, { state: 'lagos', street: 1, kobo: 40, parcel: false });
    expect(readState((s['states'] as Record<string, unknown>)['lagos'])).toEqual({ streets: { 1: { done: true, best: 90 } }, parcel: true, hall: { done: false, best: 0 } });
    s = mergeFinish(s, { state: 'lagos', street: 1, kobo: 150, parcel: false });
    expect(readState((s['states'] as Record<string, unknown>)['lagos']).streets['1']).toEqual({ done: true, best: 150 });
  });

  it('po ruling (d): a hall win uses the parcel up in the same save, keeping unknown fields', () => {
    const before = {
      v: 1,
      future: 'keep me',
      states: {
        kano: { parcel: true, extra: [1] },
        lagos: { streets: { 3: { done: true, best: 98, time: 61 } }, parcel: true, hall: { done: false, best: 0, tries: 4 }, note: 'x' },
      },
    };
    const s = mergeFinish(before, { state: 'lagos', hall: true, kobo: 0 });
    // Slice 3 (N3 a): a version 1 copy moves to Naira (bests times 10, v: 2) as it is merged.
    expect(s).toEqual({
      v: 2,
      future: 'keep me',
      states: {
        kano: { parcel: true, extra: [1] }, // another state's parcel is its own
        lagos: { streets: { 3: { done: true, best: 980, time: 61 } }, parcel: false, hall: { done: true, best: 0, tries: 4 }, note: 'x' },
      },
    });
    // The 'win' save after the third-hit save changes nothing.
    expect(mergeFinish(s, { state: 'lagos', hall: true, kobo: 0 })).toEqual(s);
  });

  it('po ruling (d): a lost hall try saves nothing, so the parcel stays; a new parcel after the win is saved again', () => {
    const { storage, data } = fakeStorage();
    const p = new Progress(createStore(() => storage));
    p.finish({ state: 'lagos', street: 3, kobo: 98, parcel: true });
    // A lost try writes nothing (no finish), so the next try still has the parcel.
    expect(new Progress(createStore(() => storage)).state('lagos').parcel).toBe(true);
    p.finish({ state: 'lagos', hall: true, kobo: 0 });
    expect(saved(data)).toMatchObject({ states: { lagos: { parcel: false, hall: { done: true } } } });
    expect(new Progress(createStore(() => storage)).state('lagos').parcel).toBe(false);
    // Street 2 replayed with a parcel from the well room: saved again for the next hall try.
    p.finish({ state: 'lagos', street: 2, kobo: 50, parcel: true });
    expect(new Progress(createStore(() => storage)).state('lagos')).toMatchObject({ parcel: true, hall: { done: true } });
  });

  it('merge, never overwrite: unknown states and fields are kept', () => {
    const later = {
      v: 1,
      future: 'keep me',
      states: {
        kano: { streets: { 1: { done: true, best: 5, stars: 3 } }, parcel: true, hall: { done: false, best: 0 }, extra: [1, 2] },
        lagos: { streets: { 1: { done: true, best: 10, time: 61 } }, parcel: false, hall: { done: false, best: 0 }, note: 'x' },
      },
    };
    const { storage, data } = fakeStorage({ 'gidi-progress': JSON.stringify(later) });
    const p = new Progress(createStore(() => storage));
    p.finish({ state: 'lagos', street: 2, kobo: 7, parcel: false });
    // Slice 3 (N3 a): the version 1 copy was moved to Naira on load (bests times 10, v: 2).
    expect(saved(data)).toEqual({
      v: 2,
      future: 'keep me',
      states: {
        kano: { ...later.states.kano, streets: { 1: { done: true, best: 50, stars: 3 } } },
        lagos: { streets: { 1: { done: true, best: 100, time: 61 }, 2: { done: true, best: 7 } }, parcel: false, hall: { done: false, best: 0 }, note: 'x' },
      },
    });
    // A later version number is kept, never lowered.
    expect((mergeFinish({ v: 3, states: {} }, { state: 'lagos', street: 1, kobo: 1, parcel: false }) as { v: number }).v).toBe(3);
  });

  it('merges into the newest copy on the phone (another tab finished a street meanwhile)', () => {
    const { storage, data } = fakeStorage();
    const a = new Progress(createStore(() => storage));
    const b = new Progress(createStore(() => storage));
    a.finish({ state: 'lagos', street: 1, kobo: 3, parcel: false });
    b.finish({ state: 'lagos', street: 2, kobo: 4, parcel: false });
    const lagos = readState((saved(data) as { states: Record<string, unknown> }).states['lagos']);
    expect(Object.keys(lagos.streets).sort()).toEqual(['1', '2']);
  });

  it('a broken copy: nothing done, and it is left alone until a street is finished', () => {
    for (const broken of ['{not json', '"text"', '[1,2]', '{"v":1}', '{"v":1,"states":[]}', '{"v":"1","states":{}}', '{"v":1,"states":{"lagos":7}}']) {
      const { storage, data } = fakeStorage({ 'gidi-progress': broken });
      const p = new Progress(createStore(() => storage));
      expect(p.broken, broken).toBe(true);
      expect(anyDone(p.state('lagos'))).toBe(false);
      expect(p.working()).toEqual([]);
      expect(data.get('gidi-progress')).toBe(broken); // untouched by reading
      p.finish({ state: 'lagos', street: 1, kobo: 12, parcel: false });
      expect(isProgressShape(saved(data))).toBe(true);
      expect(new Progress(createStore(() => storage)).state('lagos').streets['1']).toEqual({ done: true, best: 12 });
    }
  });

  it('odd fields inside a good copy count as not done (and do not break the game)', () => {
    const odd = { v: 1, states: { lagos: { streets: { 1: { done: 'yes', best: -4 }, 2: null, 3: { done: true, best: 'lots' } }, parcel: 'true', hall: 5 } } };
    const { storage } = fakeStorage({ 'gidi-progress': JSON.stringify(odd) });
    const s = new Progress(createStore(() => storage)).state('lagos');
    expect(s.streets['1']).toEqual({ done: false, best: 0 });
    expect(s.streets['3']).toEqual({ done: true, best: 0 });
    expect(s.parcel).toBe(false);
    expect(s.hall).toEqual({ done: false, best: 0 });
  });

  it('storage blocked: progress lasts this visit, the game never throws', () => {
    const store = createStore(() => {
      throw new Error('blocked');
    });
    const p = new Progress(store);
    expect(p.finish({ state: 'lagos', street: 1, kobo: 5, parcel: true })).toBe(false);
    expect(new Progress(store).state('lagos').streets['1']).toEqual({ done: true, best: 5 });
    expect(new Progress(store).state('lagos').parcel).toBe(true);
  });

  it('storage that fails on write (phone full): the finish still counts this visit', () => {
    const { storage } = fakeStorage();
    (storage as unknown as { setItem: () => void }).setItem = () => {
      throw new Error('full');
    };
    const store = createStore(() => ({ ...storage, setItem: storage.setItem, getItem: () => null, removeItem: () => {} }) as unknown as Storage);
    const p = new Progress(store);
    expect(p.finish({ state: 'lagos', street: 1, kobo: 5, parcel: false })).toBe(false);
    expect(p.state('lagos').streets['1']?.done).toBe(true);
  });

  it('a slice 1 save (look, sound, gentle, no progress) loads with its hero and starts at street 1', () => {
    const { storage } = fakeStorage({ 'gidi-look': '{"skin":4,"hair":2,"outfit":1}', 'gidi-sound': 'false', 'gidi-gentle': 'true' });
    const store = createStore(() => storage);
    expect(hasSavedLook(store)).toBe(true);
    expect(isOldSave(store)).toBe(true); // the builder still opens once with "New!"
    expect(loadLook(store)).toMatchObject({ skin: 4, hair: 2, outfit: 1 });
    const p = new Progress(store);
    expect(p.broken).toBe(false);
    const s = p.state('lagos');
    expect(anyDone(s)).toBe(false);
    expect(streetOpen(s, 1)).toBe(true);
    expect(streetOpen(s, 2)).toBe(false);
  });
});

describe('unlocking (S2.8)', () => {
  const st = (done: number[], hall = false) => readState({ streets: Object.fromEntries(done.map((n) => [n, { done: true, best: 1 }])), hall: { done: hall, best: 0 } });

  it('street 1 always open; each street after the one before; the hall after street 3', () => {
    expect([1, 2, 3].map((n) => streetOpen(st([]), n))).toEqual([true, false, false]);
    expect([1, 2, 3].map((n) => streetOpen(st([1]), n))).toEqual([true, true, false]);
    expect([1, 2, 3].map((n) => streetOpen(st([1, 2]), n))).toEqual([true, true, true]);
    expect(hallOpen(st([1, 2]))).toBe(false);
    expect(hallOpen(st([1, 2, 3]))).toBe(true);
    expect(switchedOn(st([1, 2, 3]))).toBe(false);
    expect(switchedOn(st([1, 2, 3], true))).toBe(true);
  });
});

describe('Streets cards (S2.10)', () => {
  const names = ['Alausa', 'Computer Village', 'Ikeja'];
  const st = (o: object) => readState(o);

  it('first visit: street 1 ready, the rest locked with the street to finish first', () => {
    const c = streetCards(st({}), names);
    expect(c.map((x) => [x.num, x.name, x.state, x.status])).toEqual([
      ['Street 1', 'Alausa', 'open', 'Ready to play'],
      ['Street 2', 'Computer Village', 'locked', 'Finish street 1 first'],
      ['Street 3', 'Ikeja', 'locked', 'Finish street 2 first'],
      ['', 'Go-Slow Hall', 'locked', 'Finish street 3 first'],
    ]);
    expect(c[3]!.extra).toBeNull();
  });

  it('done streets show their best money with a tick (N2); the hall card says when a parcel is saved', () => {
    const c = streetCards(st({ streets: { 1: { done: true, best: 870 }, 2: { done: true, best: 90 } }, parcel: true }), names);
    expect(c.map((x) => x.status)).toEqual(['Done ✓ Best: \u20a68.70', 'Done ✓ Best: 90 kobo', 'Ready to play', 'Finish street 3 first']);
    expect(c.map((x) => x.state)).toEqual(['done', 'done', 'open', 'locked']);
    expect(c[3]!.extra).toBe('You have a garri parcel.');
  });

  it('a won hall reads "Done ✓" (no kobo in the hall)', () => {
    const c = streetCards(st({ streets: { 1: { done: true }, 2: { done: true }, 3: { done: true } }, hall: { done: true, best: 0 } }), names);
    expect(c[3]!.status).toBe('Done ✓');
    expect(c[3]!.state).toBe('done');
  });
});

describe('the wheel fit rule (S2.8 table)', () => {
  it.each([
    [320, 240, 220, 80, true],
    [640, 200, 192, 360, false],
    [568, 320, 312, 236, false],
    [932, 430, 422, 360, false],
    [1280, 720, 560, 360, false],
  ])('%i x %i: wheel %i, rail %i, narrow %s', (sw, sh, w, r, narrow) => {
    const f = wheelFit(sw, sh);
    expect(f.w).toBe(w);
    expect(f.r).toBe(r);
    expect(f.narrow).toBe(narrow);
    // Everything inside the screen, the wheel square and centred top to bottom.
    expect(f.wheelX).toBeGreaterThanOrEqual(4);
    expect(f.railX + f.r).toBeLessThanOrEqual(sw - 8);
    expect(f.railX - (f.wheelX + f.w)).toBe(8);
    expect(f.wheelY).toBe(Math.floor((sh - w) / 2));
    // Names on the wheel: side / 25.75.
    expect(w / 25.75).toBeGreaterThan(7.4);
  });

  it('a rail at its widest sits with the wheel in the middle', () => {
    const f = wheelFit(932, 430);
    const left = f.wheelX;
    const right = 932 - (f.railX + f.r);
    expect(Math.abs(left - right)).toBeLessThanOrEqual(1);
  });

  it('upright: the wheel on top, the rail under it at full width', () => {
    const f = wheelFit(390, 844);
    expect(f.portrait).toBe(true);
    expect(f.w).toBe(374);
    expect(f.railY).toBeGreaterThan(f.wheelY + f.w);
  });
});
