/**
 * What the game keeps on the phone: the hero look and three settings (progress: progress.ts).
 * The look is stored as indices under `gidi-look` (design.md S2.3 "Saved look"), and always
 * passed through fixLook, so a look saved today still loads after the option lists grow,
 * and a slice 1 look (no body, no age) still loads.
 */
import { AGES, BODIES, DEFAULT_AGE, FIRST_LOOKS, HAIRS, OUTFITS, SKINS, defaultBody, type HeroLook } from '../art/hero';
import type { Store } from '../storage';

/** design.md S2.3 Defaults: Adult, Male, skin 3, Low cut, Green jersey. */
export const DEFAULT_LOOK: Readonly<Required<HeroLook>> = { skin: 2, hair: 0, outfit: 0, body: 0, age: DEFAULT_AGE };

/** A look with every part, body and age included (what the game uses once loaded). */
export type FullLook = Required<HeroLook>;

const KEY_LOOK = 'look';
const KEY_SOUND = 'sound';
/** S2.8, S2.9 rule 5: the Music switch, its own key (the player itself comes with O2). */
const KEY_MUSIC = 'music';
const KEY_GENTLE = 'gentle';
/** S3f0 part 20: the lane run's "Buttons instead of swipes" switch. */
const KEY_LANE_BUTTONS = 'laneButtons';

function isLookShape(v: unknown): v is HeroLook {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o['skin'] === 'number' && typeof o['hair'] === 'number' && typeof o['outfit'] === 'number';
}

/** True once the player has picked a look (on this phone, or in this tab if storage is blocked). */
export function hasSavedLook(store: Store): boolean {
  return store.load(KEY_LOOK, isLookShape) !== undefined;
}

function isIndex(n: unknown, len: number): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= 0 && n < len;
}

/**
 * Each part that is out of its list goes back to the default for that part only.
 * A missing or broken body follows the hair (Female for Gele or Headscarf, else Male) and a
 * missing or broken age is Adult, as for a slice 1 save (design.md S2.3).
 */
export function fixLook(look: HeroLook): FullLook {
  const fix = (n: unknown, len: number, def: number): number => (isIndex(n, len) ? n : def);
  const hair = fix(look.hair, HAIRS.length, DEFAULT_LOOK.hair);
  return {
    skin: fix(look.skin, SKINS.length, DEFAULT_LOOK.skin),
    hair,
    outfit: fix(look.outfit, OUTFITS.length, DEFAULT_LOOK.outfit),
    body: fix(look.body, BODIES.length, defaultBody(hair)),
    age: fix(look.age, AGES.length, DEFAULT_AGE),
  };
}

export function loadLook(store: Store): FullLook {
  const saved = store.load(KEY_LOOK, isLookShape);
  return saved ? fixLook(saved) : { ...DEFAULT_LOOK };
}

/**
 * A look saved before slice 2 (no body or no age): the builder opens once with the
 * "New!" line so the player picks for themselves (design.md S2.3 "Saved look").
 * Saving the look with both numbers ends it.
 */
export function isOldSave(store: Store): boolean {
  const saved = store.load(KEY_LOOK, isLookShape);
  return saved !== undefined && (typeof saved.body !== 'number' || typeof saved.age !== 'number');
}

/** The first look's hair and outfit for this body and age (design.md S2.3 Defaults). */
export function firstLook(body: number, age: number): { hair: number; outfit: number } {
  return FIRST_LOOKS[body]?.[age] ?? { hair: DEFAULT_LOOK.hair, outfit: DEFAULT_LOOK.outfit };
}

/** True when the hair and outfit are the first look for the look's body and age. */
export function wearsFirstLook(look: FullLook): boolean {
  const f = firstLook(look.body, look.age);
  return look.hair === f.hair && look.outfit === f.outfit;
}

/**
 * Builder rule (design.md S2.3 Defaults): a change of "Male or female" or "Age". Until the
 * player has tapped a Hair or Outfit chip (`styled`), hair and outfit follow to the first
 * look; after that they stay as picked. Every hair and outfit stays open to all (Q20).
 */
export function changeBody(look: FullLook, part: 'body' | 'age', index: number, styled: boolean): FullLook {
  const next = fixLook({ ...look, [part]: index });
  return styled ? next : { ...next, ...firstLook(next.body, next.age) };
}

export function saveLook(store: Store, look: HeroLook): FullLook {
  const clean = fixLook(look);
  store.save(KEY_LOOK, clean);
  return clean;
}

export interface Settings {
  sound: boolean;
  /** Music on or off (default on). */
  music: boolean;
  gentle: boolean;
  /** S3f0: "Buttons instead of swipes" in the lane run (default off). */
  buttonsInsteadOfSwipes: boolean;
}

export function loadSettings(store: Store): Settings {
  const sound = store.load(KEY_SOUND, (v): v is boolean => typeof v === 'boolean');
  const music = store.load(KEY_MUSIC, (v): v is boolean => typeof v === 'boolean');
  const gentle = store.load(KEY_GENTLE, (v): v is boolean => typeof v === 'boolean');
  const buttons = store.load(KEY_LANE_BUTTONS, (v): v is boolean => typeof v === 'boolean');
  return { sound: sound ?? true, music: music ?? true, gentle: gentle ?? false, buttonsInsteadOfSwipes: buttons ?? false };
}

export function saveSettings(store: Store, s: Settings): void {
  store.save(KEY_SOUND, s.sound);
  store.save(KEY_MUSIC, s.music);
  store.save(KEY_GENTLE, s.gentle);
  store.save(KEY_LANE_BUTTONS, s.buttonsInsteadOfSwipes);
}
