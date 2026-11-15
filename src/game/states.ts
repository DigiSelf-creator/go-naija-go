/**
 * O1b1: the list of states and their saves (docs/ogun.md 1.1, 1.6, 1.8; decisions 72 to 74, 80).
 *
 * Everything stays in the one key `gidi-progress` (src/game/progress.ts), merged, never overwritten:
 *
 *   { "v": 2,
 *     "states": { "lagos": { ...as before... },
 *                 "ogun":  { "streets": {}, "parcel": false, "hall": {...},
 *                            "city": { "fixed": [], "fixes": 0, "boom": 0, "trays": {}, ... },
 *                            "arrived": false } },
 *     "city": { "kobo": 0, "power": 0, "tech": 0, ...Lagos's map as before... },
 *     "lane": { ...Lagos's lane run as before... },
 *     "where": "lagos" }
 *
 * - Lagos keeps exactly the keys it had (top-level `city` and `lane`), so an old save is already a
 *   Lagos save: nothing is moved, nothing is lost.
 * - One wallet (decision 80): Naira (kobo), Power and Tech live only in the top-level `city` part.
 *   Every other state's `city` part holds its own fixes, trays and Booming meter, never money:
 *   `writeStateCity` strips the wallet fields so the money can never split in two.
 * - `where` is the last city open; missing or odd reads as "lagos". `arrived` is set when Ogun's
 *   arrival card is closed.
 * - A broken `ogun` part (not an object) reads as nothing done in Ogun and leaves Lagos alone. It
 *   is written over only when the player does something in Ogun.
 * Pure helpers here; Progress.saveStatePart writes them.
 */
import { LAGOS, anyDone, isObj, readState, type Obj, type StateProgress } from './progress';

export type StateId = 'lagos' | 'ogun';
export const OGUN = 'ogun' satisfies StateId;

export interface StateInfo {
  readonly id: StateId;
  /** The state's name as players see it. */
  readonly name: string;
  /** The lazy part that holds the state's levels, art and code (dist/worlds/<part>/), or null when it is in the first load. */
  readonly part: string | null;
  /** The state whose hall opens this one (ogun.md 1.1), or null for the first state. */
  readonly after: StateId | null;
}

/** In road order. Lagos is in the first load; each later state is its own lazy part. */
export const STATES: readonly StateInfo[] = [
  { id: 'lagos', name: 'Lagos', part: null, after: null },
  { id: 'ogun', name: 'Ogun', part: 'ogun', after: 'lagos' },
];

export const stateInfo = (id: string): StateInfo | undefined => STATES.find((s) => s.id === id);

/** The money every state shares (decision 80): kept only in the top-level `city` part. */
export const WALLET_KEYS = ['kobo', 'power', 'tech'] as const;

const statesOf = (saved: Readonly<Obj> | null): Obj => {
  const s = saved?.['states'];
  return isObj(s) ? s : {};
};

/** One state's saved part as an object (a missing or broken part is empty). */
export function statePart(saved: Readonly<Obj> | null, id: string): Obj {
  const st = statesOf(saved)[id];
  return isObj(st) ? st : {};
}

/** A state's streets, parcel and hall. Lagos reads as it always has. */
export function stateProgress(saved: Readonly<Obj> | null, id: string): StateProgress {
  return readState(statesOf(saved)[id]);
}

/** ogun.md 1.1: the first state is always open; a later one opens once the state before it has won its hall. */
export function stateOpen(saved: Readonly<Obj> | null, id: string): boolean {
  const info = stateInfo(id);
  if (!info) return false;
  if (info.after === null) return true;
  // Progress already made in a state keeps it open, whatever happens to the save before it.
  return stateProgress(saved, info.after).hall.done || anyDone(stateProgress(saved, id));
}

/** Every open state, in road order. */
export function openStates(saved: Readonly<Obj> | null): StateId[] {
  return STATES.filter((s) => stateOpen(saved, s.id)).map((s) => s.id);
}

/** The last city open (ogun.md 1.6): "lagos" for an old save, an odd value, or a state that is not open. */
export function whereNow(saved: Readonly<Obj> | null): StateId {
  const w = saved?.['where'];
  return typeof w === 'string' && stateOpen(saved, w) ? (w as StateId) : LAGOS;
}

/** Ogun's arrival card has been closed (ogun.md 1.4). */
export function arrived(saved: Readonly<Obj> | null, id: string = OGUN): boolean {
  return statePart(saved, id)['arrived'] === true;
}

/** The shared wallet, read from the top-level `city` part: whole kobo, Power and Tech units. */
export function wallet(saved: Readonly<Obj> | null): { kobo: number; power: number; tech: number } {
  const c = saved?.['city'];
  const n = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
  return isObj(c) ? { kobo: n(c['kobo']), power: n(c['power']), tech: n(c['tech']) } : { kobo: 0, power: 0, tech: 0 };
}

/**
 * A later state's own city part (its fixes, trays, Booming meter, where the hero stood) joined
 * with the one wallet, ready for the city rules. Unknown fields are kept. Lagos uses the
 * top-level `city` part as before, so it never comes through here.
 */
export function readStateCity(saved: Readonly<Obj> | null, id: string): Obj {
  const own = statePart(saved, id)['city'];
  const out: Obj = isObj(own) ? structuredClone(own) : {};
  return { ...out, ...wallet(saved) };
}

/** The part to save for a later state's city: everything but the wallet (decision 80). */
export function writeStateCity(part: Readonly<Obj>): Obj {
  const out: Obj = structuredClone(part) as Obj;
  for (const k of WALLET_KEYS) delete out[k];
  return out;
}

/** The wallet fields of a joined city, to write back into the top-level `city` part. */
export function walletOf(part: Readonly<Obj>): Partial<Record<(typeof WALLET_KEYS)[number], unknown>> {
  const out: Partial<Record<(typeof WALLET_KEYS)[number], unknown>> = {};
  for (const k of WALLET_KEYS) if (k in part) out[k] = part[k];
  return out;
}
