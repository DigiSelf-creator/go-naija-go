import { describe, expect, it } from 'vitest';
import { AGES, BODIES, FIRST_LOOKS, HAIRS, OUTFITS, SKINS } from '../../src/art/hero';
import {
  DEFAULT_LOOK,
  changeBody,
  firstLook,
  fixLook,
  hasSavedLook,
  isOldSave,
  loadLook,
  loadSettings,
  saveLook,
  saveSettings,
  wearsFirstLook,
} from '../../src/game/save';
import { createStore } from '../../src/storage';

/** A Storage stand-in that keeps data in a Map we can look at. */
function fakeStorage(): { storage: Storage; data: Map<string, string> } {
  const data = new Map<string, string>();
  const storage = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  } as unknown as Storage;
  return { storage, data };
}

describe('hero look save', () => {
  it('saves then loads the same look, as indices under gidi-look', () => {
    const { storage, data } = fakeStorage();
    const store = createStore(() => storage);
    expect(hasSavedLook(store)).toBe(false);
    saveLook(store, { skin: 4, hair: 3, outfit: 1, body: 1, age: 2 });
    // design.md S2.3: body and age are two numbers at the end.
    expect(data.get('gidi-look')).toBe('{"skin":4,"hair":3,"outfit":1,"body":1,"age":2}');

    // A new visit: a fresh store over the same phone storage.
    const again = createStore(() => storage);
    expect(hasSavedLook(again)).toBe(true);
    expect(isOldSave(again)).toBe(false);
    expect(loadLook(again)).toEqual({ skin: 4, hair: 3, outfit: 1, body: 1, age: 2 });
  });

  it('gives the default look on a first visit', () => {
    const { storage } = fakeStorage();
    expect(loadLook(createStore(() => storage))).toEqual(DEFAULT_LOOK);
  });

  it('gives the default look when the save is broken', () => {
    for (const raw of ['{not json', 'null', '"afro"', '[1,2,3]', '{"skin":"x","hair":0,"outfit":0}']) {
      const { storage, data } = fakeStorage();
      data.set('gidi-look', raw);
      const store = createStore(() => storage);
      expect(loadLook(store)).toEqual(DEFAULT_LOOK);
    }
  });

  it('puts each bad part back to its default and keeps the good parts', () => {
    const { storage, data } = fakeStorage();
    data.set('gidi-look', JSON.stringify({ skin: SKINS.length + 3, hair: -1, outfit: 1.5 }));
    expect(loadLook(createStore(() => storage))).toEqual(DEFAULT_LOOK);
    data.set('gidi-look', JSON.stringify({ skin: 99, hair: 3, outfit: 4 }));
    expect(loadLook(createStore(() => storage))).toEqual({ skin: DEFAULT_LOOK.skin, hair: 3, outfit: 4, body: 1, age: 1 });
    data.set('gidi-look', JSON.stringify({ skin: 0, hair: 1, outfit: -2 }));
    expect(loadLook(createStore(() => storage))).toEqual({ skin: 0, hair: 1, outfit: DEFAULT_LOOK.outfit, body: 0, age: 1 });
    data.set('gidi-look', JSON.stringify({ skin: SKINS.length - 1, hair: HAIRS.length - 1, outfit: OUTFITS.length - 1, body: 1, age: 2 }));
    expect(loadLook(createStore(() => storage))).toEqual({ skin: SKINS.length - 1, hair: HAIRS.length - 1, outfit: OUTFITS.length - 1, body: 1, age: 2 });
  });

  it('with storage blocked: default look, and a picked look lasts for this visit', () => {
    const store = createStore(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    expect(store.persistent).toBe(false);
    expect(loadLook(store)).toEqual(DEFAULT_LOOK);
    expect(() => saveLook(store, { skin: 1, hair: 1, outfit: 1, body: 1, age: 0 })).not.toThrow();
    expect(loadLook(store)).toEqual({ skin: 1, hair: 1, outfit: 1, body: 1, age: 0 });
    expect(isOldSave(store)).toBe(false);
    expect(hasSavedLook(store)).toBe(true);
  });

  it('with storage that throws on write (phone full): no crash, look kept for this visit', () => {
    const { storage } = fakeStorage();
    const store = createStore(() => storage);
    storage.setItem = () => {
      throw new DOMException('full', 'QuotaExceededError');
    };
    expect(() => saveLook(store, { skin: 3, hair: 2, outfit: 4, body: 0, age: 2 })).not.toThrow();
    expect(loadLook(store)).toEqual({ skin: 3, hair: 2, outfit: 4, body: 0, age: 2 });
  });

  it('round-trips every body and age with every hair and outfit', () => {
    for (let body = 0; body < BODIES.length; body++) {
      for (let age = 0; age < AGES.length; age++) {
        for (let hair = 0; hair < HAIRS.length; hair++) {
          for (let outfit = 0; outfit < OUTFITS.length; outfit++) {
            const { storage } = fakeStorage();
            const look = { skin: (hair + outfit) % SKINS.length, hair, outfit, body, age };
            saveLook(createStore(() => storage), look);
            expect(loadLook(createStore(() => storage))).toEqual(look);
          }
        }
      }
    }
  });

  it('clamps a broken body or age: body follows the hair, age goes to Adult', () => {
    const { storage, data } = fakeStorage();
    for (const [raw, want] of [
      [{ skin: 1, hair: 0, outfit: 0, body: 2, age: 3 }, { body: 0, age: 1 }],
      [{ skin: 1, hair: 3, outfit: 0, body: -1, age: 0.5 }, { body: 1, age: 1 }],
      [{ skin: 1, hair: 4, outfit: 0, body: '1', age: null }, { body: 1, age: 1 }],
      [{ skin: 1, hair: 2, outfit: 0, body: 1.5, age: 2 }, { body: 0, age: 2 }],
      [{ skin: 1, hair: 1, outfit: 0, body: 1, age: -1 }, { body: 1, age: 1 }],
    ] as const) {
      data.set('gidi-look', JSON.stringify(raw));
      const l = loadLook(createStore(() => storage));
      expect({ body: l.body, age: l.age }, JSON.stringify(raw)).toEqual(want);
    }
    expect(fixLook({ skin: 0, hair: 99, outfit: 0, body: 9 })).toEqual({ skin: 0, hair: 0, outfit: 0, body: 0, age: 1 });
  });
});

describe('slice 1 save (no body, no age)', () => {
  it('loads as Adult; Female for Gele or Headscarf, else Male; skin, hair and outfit kept', () => {
    for (let hair = 0; hair < HAIRS.length; hair++) {
      const { storage, data } = fakeStorage();
      data.set('gidi-look', JSON.stringify({ skin: 4, hair, outfit: 3 }));
      const store = createStore(() => storage);
      const female = HAIRS[hair]!.id === 'gele' || HAIRS[hair]!.id === 'headscarf';
      expect(loadLook(store)).toEqual({ skin: 4, hair, outfit: 3, body: female ? 1 : 0, age: 1 });
      expect(hasSavedLook(store)).toBe(true);
    }
  });

  it('asks for the "New!" builder until the look is saved with body and age, then never again', () => {
    const { storage, data } = fakeStorage();
    data.set('gidi-look', '{"skin":1,"hair":3,"outfit":1}');
    expect(isOldSave(createStore(() => storage))).toBe(true);
    // Only age saved (never written by the game, but still old): still asks.
    data.set('gidi-look', '{"skin":1,"hair":3,"outfit":1,"age":1}');
    expect(isOldSave(createStore(() => storage))).toBe(true);
    data.set('gidi-look', '{"skin":1,"hair":3,"outfit":1}');
    const store = createStore(() => storage);
    // "Start running" saves the look shown: the loaded look, with both numbers.
    saveLook(store, loadLook(store));
    expect(JSON.parse(data.get('gidi-look')!)).toEqual({ skin: 1, hair: 3, outfit: 1, body: 1, age: 1 });
    expect(isOldSave(store)).toBe(false);
    expect(isOldSave(createStore(() => storage))).toBe(false);
  });

  it('a first visit and a broken save are not old saves (no "New!" line)', () => {
    const { storage, data } = fakeStorage();
    expect(isOldSave(createStore(() => storage))).toBe(false);
    data.set('gidi-look', '{not json');
    expect(isOldSave(createStore(() => storage))).toBe(false);
  });
});

describe('first looks (design.md S2.3 Defaults)', () => {
  const name = (b: number, a: number): string => {
    const f = firstLook(b, a);
    return `${HAIRS[f.hair]!.label}, ${OUTFITS[f.outfit]!.label}`;
  };

  it('match the table in S2.3', () => {
    expect([0, 1, 2].map((a) => name(0, a))).toEqual(['Low cut, School uniform', 'Low cut, Green jersey', 'Low cut, Agbada']);
    expect([0, 1, 2].map((a) => name(1, a))).toEqual(['Braids, School uniform', 'Braids, Ankara', 'Gele, Ankara']);
    expect(firstLook(0, 1)).toEqual(FIRST_LOOKS[0]![1]);
  });

  it('the default look is Adult, Male, skin 3, Low cut, Green jersey, and it is the first look', () => {
    expect(DEFAULT_LOOK).toEqual({ skin: 2, hair: 0, outfit: 0, body: 0, age: 1 });
    expect(wearsFirstLook(DEFAULT_LOOK)).toBe(true);
  });

  it('until hair or outfit is tapped, Male or female and Age bring their first look', () => {
    let look = { ...DEFAULT_LOOK };
    for (const [part, i, hair, outfit] of [
      ['body', 1, 2, 1],
      ['age', 0, 2, 2],
      ['age', 2, 3, 1],
      ['body', 0, 0, 3],
      ['age', 1, 0, 0],
    ] as const) {
      look = changeBody(look, part, i, false);
      expect({ hair: look.hair, outfit: look.outfit }, `${part} ${i}`).toEqual({ hair, outfit });
      expect(look.skin).toBe(DEFAULT_LOOK.skin); // skin never follows
    }
  });

  it('after hair or outfit is tapped, they stay as picked; every hair and outfit is open to all', () => {
    for (let hair = 0; hair < HAIRS.length; hair++) {
      for (let outfit = 0; outfit < OUTFITS.length; outfit++) {
        let look = { ...DEFAULT_LOOK, hair, outfit };
        for (let body = 0; body < BODIES.length; body++) {
          for (let age = 0; age < AGES.length; age++) {
            look = changeBody(changeBody(look, 'body', body, true), 'age', age, true);
            expect(look).toEqual({ skin: DEFAULT_LOOK.skin, hair, outfit, body, age });
          }
        }
      }
    }
  });

  it('a broken body or age index is clamped, not saved as is', () => {
    expect(changeBody(DEFAULT_LOOK, 'body', 5, true).body).toBe(0);
    expect(changeBody(DEFAULT_LOOK, 'age', -1, true).age).toBe(1);
  });
});

describe('settings', () => {
  it('sound is on and gentle mode off by default; both are remembered', () => {
    const { storage } = fakeStorage();
    const store = createStore(() => storage);
    expect(loadSettings(store)).toEqual({ sound: true, gentle: false });
    saveSettings(store, { sound: false, gentle: true });
    expect(loadSettings(createStore(() => storage))).toEqual({ sound: false, gentle: true });
  });
});
