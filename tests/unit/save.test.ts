import { describe, expect, it } from 'vitest';
import { HAIRS, OUTFITS, SKINS } from '../../src/art/hero';
import { DEFAULT_LOOK, hasSavedLook, loadLook, loadSettings, saveLook, saveSettings } from '../../src/game/save';
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
    saveLook(store, { skin: 4, hair: 3, outfit: 1 });
    expect(JSON.parse(data.get('gidi-look')!)).toEqual({ skin: 4, hair: 3, outfit: 1 });

    // A new visit: a fresh store over the same phone storage.
    const again = createStore(() => storage);
    expect(hasSavedLook(again)).toBe(true);
    expect(loadLook(again)).toEqual({ skin: 4, hair: 3, outfit: 1 });
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

  it('keeps each part inside the lists (a save from a future or broken version still draws)', () => {
    const { storage, data } = fakeStorage();
    data.set('gidi-look', JSON.stringify({ skin: SKINS.length + 3, hair: -1, outfit: 1.5 }));
    expect(loadLook(createStore(() => storage))).toEqual({ skin: 0, hair: 0, outfit: 0 });
    data.set('gidi-look', JSON.stringify({ skin: SKINS.length - 1, hair: HAIRS.length - 1, outfit: OUTFITS.length - 1 }));
    expect(loadLook(createStore(() => storage))).toEqual({ skin: SKINS.length - 1, hair: HAIRS.length - 1, outfit: OUTFITS.length - 1 });
  });

  it('with storage blocked: default look, and a picked look lasts for this visit', () => {
    const store = createStore(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    expect(store.persistent).toBe(false);
    expect(loadLook(store)).toEqual(DEFAULT_LOOK);
    expect(() => saveLook(store, { skin: 1, hair: 1, outfit: 1 })).not.toThrow();
    expect(loadLook(store)).toEqual({ skin: 1, hair: 1, outfit: 1 });
    expect(hasSavedLook(store)).toBe(true);
  });

  it('with storage that throws on write (phone full): no crash, look kept for this visit', () => {
    const { storage } = fakeStorage();
    const store = createStore(() => storage);
    storage.setItem = () => {
      throw new DOMException('full', 'QuotaExceededError');
    };
    expect(() => saveLook(store, { skin: 3, hair: 2, outfit: 4 })).not.toThrow();
    expect(loadLook(store)).toEqual({ skin: 3, hair: 2, outfit: 4 });
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
