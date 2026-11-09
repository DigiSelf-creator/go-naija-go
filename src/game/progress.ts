/**
 * Progress on the phone (docs/design.md S2.8 "Save shape"): one JSON value under `gidi-progress`.
 *
 *   { "v": 1, "states": { "lagos": { "streets": { "1": { "done": true, "best": 120 } },
 *                                     "parcel": true, "hall": { "done": false, "best": 0 } } } }
 *
 * Rules:
 * - Written only when a street is finished (bus boarded), when the hall is won (at the third hit), and when the
 *   parcel is saved (it is saved with the street it was carried off). Never mid-street.
 * - Merge, never overwrite: unknown states and unknown fields in the saved copy are kept as
 *   they are, so later regions and later versions add to it safely.
 * - Broken copy (bad JSON or the wrong shape): the game starts with nothing done and does not
 *   write over it until the player finishes a street (or wins the hall).
 * - Never goes down: a done street stays done, `best` is the most kobo ever finished with, and
 *   a saved parcel stays saved.
 * - Storage blocked: the Store keeps it in memory for this visit (src/storage.ts).
 */
import type { Store } from '../storage';

export const KEY_PROGRESS = 'progress';
export const PROGRESS_VERSION = 1;

/** Version 1 has one state with three streets and a hall (S2.6, Q16). */
export const LAGOS = 'lagos';
export const STREETS_PER_STATE = 3;

export interface PlaceRecord {
  done: boolean;
  /** Most kobo ever finished with. */
  best: number;
}

export interface StateProgress {
  /** By street number ("1", "2", "3"); a street missing here is not done. */
  streets: { [n: string]: PlaceRecord };
  parcel: boolean;
  hall: PlaceRecord;
}

export type Obj = { [k: string]: unknown };

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

function readRecord(v: unknown): PlaceRecord {
  if (!isObj(v)) return { done: false, best: 0 };
  const best = v['best'];
  return {
    done: v['done'] === true,
    best: typeof best === 'number' && Number.isFinite(best) && best > 0 ? Math.floor(best) : 0,
  };
}

/** A state's progress read leniently: odd fields count as "not done". */
export function readState(v: unknown): StateProgress {
  const s = isObj(v) ? v : {};
  const streets: StateProgress['streets'] = {};
  const raw = s['streets'];
  if (isObj(raw)) for (const [k, r] of Object.entries(raw)) streets[k] = readRecord(r);
  return { streets, parcel: s['parcel'] === true, hall: readRecord(s['hall']) };
}

/** The saved value has the right shape to be read and merged into (S2.8 broken copy rule). */
export function isProgressShape(v: unknown): v is Obj {
  if (!isObj(v)) return false;
  if (v['v'] !== undefined && typeof v['v'] !== 'number') return false;
  const states = v['states'];
  if (!isObj(states)) return false;
  for (const s of Object.values(states)) if (!isObj(s)) return false;
  return true;
}

/** What one street (or the hall) finish adds. */
export type Finish = { state: string; street: number; kobo: number; parcel: boolean } | { state: string; hall: true; kobo: number };

/**
 * Merges a finish into a saved value (never lowers anything, keeps every unknown field).
 * Pure: returns a new object; `saved` is not changed.
 */
export function mergeFinish(saved: Obj | null, f: Finish): Obj {
  const base: Obj = saved ? structuredClone(saved) : {};
  if (typeof base['v'] !== 'number' || (base['v'] as number) < PROGRESS_VERSION) base['v'] = PROGRESS_VERSION;
  const states: Obj = isObj(base['states']) ? (base['states'] as Obj) : {};
  base['states'] = states;
  const st: Obj = isObj(states[f.state]) ? (states[f.state] as Obj) : {};
  states[f.state] = st;
  const bump = (rawRec: unknown): Obj => {
    const rec: Obj = isObj(rawRec) ? rawRec : {};
    const old = readRecord(rec);
    rec['done'] = true;
    rec['best'] = Math.max(old.best, Math.max(0, Math.floor(f.kobo)));
    return rec;
  };
  if ('hall' in f) {
    st['hall'] = bump(st['hall']);
    if (st['parcel'] !== true) st['parcel'] = false;
  } else {
    const streets: Obj = isObj(st['streets']) ? (st['streets'] as Obj) : {};
    st['streets'] = streets;
    const key = String(f.street);
    streets[key] = bump(streets[key]);
    if (f.parcel) st['parcel'] = true;
    else if (st['parcel'] !== true) st['parcel'] = false;
    if (!isObj(st['hall'])) st['hall'] = { done: false, best: 0 };
  }
  return base;
}

/** Street n of a state's progress (1-based). */
export function streetRecord(s: StateProgress, n: number): PlaceRecord {
  return s.streets[String(n)] ?? { done: false, best: 0 };
}

/** S2.8 Unlocking: street 1 is always open, street n after street n - 1. Done streets stay open. */
export function streetOpen(s: StateProgress, n: number): boolean {
  return n <= 1 || streetRecord(s, n).done || streetRecord(s, n - 1).done;
}

/** Go-Slow Hall opens when the state's last street is done. */
export function hallOpen(s: StateProgress, streets = STREETS_PER_STATE): boolean {
  return s.hall.done || streetRecord(s, streets).done;
}

/** True once any street (or the hall) of the state is done. */
export function anyDone(s: StateProgress): boolean {
  return s.hall.done || Object.values(s.streets).some((r) => r.done);
}

/** A state is switched on once its hall is done (S2.8). */
export function switchedOn(s: StateProgress): boolean {
  return s.hall.done;
}

/**
 * The game's view of `gidi-progress`. Reads once; each finish merges into the newest saved
 * copy (so another tab's progress is kept too) and writes it back.
 */
export class Progress {
  private saved: Obj | null = null;
  /** The saved copy could not be read: it is left alone until a finish. */
  readonly broken: boolean;

  constructor(private readonly store: Store) {
    const raw = store.load<unknown>(KEY_PROGRESS);
    if (raw !== undefined && isProgressShape(raw)) this.saved = raw;
    this.broken = store.has(KEY_PROGRESS) && this.saved === null;
  }

  /** One state's progress (nothing done if it is not saved). */
  state(id: string = LAGOS): StateProgress {
    const states = this.saved?.['states'];
    return readState(isObj(states) ? states[id] : undefined);
  }

  /** The ids of every switched-on state (their cogs turn on Nigeria's wheel). */
  working(): string[] {
    const states = this.saved?.['states'];
    if (!isObj(states)) return [];
    return Object.entries(states)
      .filter(([, s]) => readState(s).hall.done)
      .map(([id]) => id);
  }

  /** Saves a finished street (bus boarded) or a won hall. Returns false if it could not be kept on the phone. */
  finish(f: Finish): boolean {
    // Merge into the newest readable copy on the phone; a broken copy is replaced now.
    const now = this.store.load<unknown>(KEY_PROGRESS);
    const base = now !== undefined && isProgressShape(now) ? now : this.saved;
    this.saved = mergeFinish(base, f);
    return this.store.save(KEY_PROGRESS, this.saved);
  }
}
