/**
 * What the game keeps on the phone: the hero look and two settings.
 * The look is stored as indices under `gidi-look`, and always passed through clampLook,
 * so a look saved today still loads after the option lists grow.
 */
import { HAIRS, OUTFITS, SKINS, clampLook, type HeroLook } from '../art/hero';
import type { Store } from '../storage';

export const DEFAULT_LOOK: HeroLook = { skin: 2, hair: 0, outfit: 0 };

const KEY_LOOK = 'look';
const KEY_SOUND = 'sound';
const KEY_GENTLE = 'gentle';

function isLookShape(v: unknown): v is HeroLook {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o['skin'] === 'number' && typeof o['hair'] === 'number' && typeof o['outfit'] === 'number';
}

/** True once the player has picked a look (on this phone, or in this tab if storage is blocked). */
export function hasSavedLook(store: Store): boolean {
  return store.load(KEY_LOOK, isLookShape) !== undefined;
}

/** Each part that is out of its list goes back to the default for that part only. */
export function fixLook(look: HeroLook): HeroLook {
  const fix = (n: number, len: number, def: number): number => (Number.isInteger(n) && n >= 0 && n < len ? n : def);
  return clampLook({
    skin: fix(look.skin, SKINS.length, DEFAULT_LOOK.skin),
    hair: fix(look.hair, HAIRS.length, DEFAULT_LOOK.hair),
    outfit: fix(look.outfit, OUTFITS.length, DEFAULT_LOOK.outfit),
  });
}

export function loadLook(store: Store): HeroLook {
  const saved = store.load(KEY_LOOK, isLookShape);
  return saved ? fixLook(saved) : { ...DEFAULT_LOOK };
}

export function saveLook(store: Store, look: HeroLook): HeroLook {
  const clean = fixLook(look);
  store.save(KEY_LOOK, clean);
  return clean;
}

export interface Settings {
  sound: boolean;
  gentle: boolean;
}

export function loadSettings(store: Store): Settings {
  const sound = store.load(KEY_SOUND, (v): v is boolean => typeof v === 'boolean');
  const gentle = store.load(KEY_GENTLE, (v): v is boolean => typeof v === 'boolean');
  return { sound: sound ?? true, gentle: gentle ?? false };
}

export function saveSettings(store: Store, s: Settings): void {
  store.save(KEY_SOUND, s.sound);
  store.save(KEY_GENTLE, s.gentle);
}
