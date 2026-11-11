/**
 * The Lagos city screen's rules, with no DOM (docs/city.md part 1 "Three buckets", part 5 (b)).
 *
 * Saved on the phone as the `city` part of `gidi-progress` (src/game/progress.ts):
 *   { "kobo": 0, "power": 0, "tech": 0, "fixed": [], "fixes": 0 }
 * Money is kept as whole kobo. A broken or missing part starts at zeros. Nothing here ever
 * goes down by itself: no timers, and a fixed spot stays fixed.
 */
import type { SpotId, SpotLook, SpotLooks } from '../art/city';
import { SPOT_IDS } from '../art/city';
import { cleanKobo } from './money';
import { isObj } from './progress';

export const KEY_CITY = 'city';

export interface CityState {
  /** The Naira bucket, in whole kobo. */
  kobo: number;
  power: number;
  tech: number;
  /** Spots fixed so far, in the order they were fixed. */
  fixed: SpotId[];
  /** Fixes made (the Booming meter's steps, part (d)). */
  fixes: number;
}

export type Bucket = 'naira' | 'power' | 'tech';

/** What each slice 3 fix costs (city.md part 5): Potholes ₦10, Lights out Power 10, Slow internet Tech 6. */
export const FIX_COST: Readonly<Record<SpotId, { bucket: Bucket; amount: number }>> = {
  potholes: { bucket: 'naira', amount: 1000 },
  lightsOut: { bucket: 'power', amount: 10 },
  slowInternet: { bucket: 'tech', amount: 6 },
};

export function emptyCity(): CityState {
  return { kobo: 0, power: 0, tech: 0, fixed: [], fixes: 0 };
}

const count = (n: unknown): number => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);

/** The `city` part read leniently: anything odd counts as zero or "not fixed". */
export function readCity(v: unknown): CityState {
  if (!isObj(v)) return emptyCity();
  const fixed: SpotId[] = [];
  const raw = v['fixed'];
  if (Array.isArray(raw)) for (const id of raw) if ((SPOT_IDS as readonly unknown[]).includes(id) && !fixed.includes(id as SpotId)) fixed.push(id as SpotId);
  return { kobo: cleanKobo(v['kobo']), power: count(v['power']), tech: count(v['tech']), fixed, fixes: Math.max(count(v['fixes']), fixed.length) };
}

/** How much is in one bucket. */
export function inBucket(c: CityState, b: Bucket): number {
  return b === 'naira' ? c.kobo : b === 'power' ? c.power : c.tech;
}

/** True when the right bucket holds enough for the spot's fix. */
export function canFix(c: CityState, spot: SpotId): boolean {
  const cost = FIX_COST[spot];
  return !c.fixed.includes(spot) && inBucket(c, cost.bucket) >= cost.amount;
}

/** The look a spot shows: fixed, ready (enough in the bucket: a tick and "Ready"), or the problem. */
export function spotLook(c: CityState, spot: SpotId): SpotLook {
  if (c.fixed.includes(spot)) return 'fixed';
  return canFix(c, spot) ? 'ready' : 'problem';
}

export function spotLooks(c: CityState): SpotLooks {
  return { potholes: spotLook(c, 'potholes'), lightsOut: spotLook(c, 'lightsOut'), slowInternet: spotLook(c, 'slowInternet') };
}

/** Pays for a fix from its own bucket. Returns the new state, or null when it cannot be paid. Pure. */
export function payFix(c: CityState, spot: SpotId): CityState | null {
  if (!canFix(c, spot)) return null;
  const cost = FIX_COST[spot];
  const next: CityState = { ...c, fixed: [...c.fixed, spot], fixes: c.fixes + 1 };
  if (cost.bucket === 'naira') next.kobo -= cost.amount;
  else if (cost.bucket === 'power') next.power -= cost.amount;
  else next.tech -= cost.amount;
  return next;
}
