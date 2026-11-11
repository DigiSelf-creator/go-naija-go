/**
 * Progress on the phone (docs/design.md S2.8 "Save shape"): one JSON value under `gidi-progress`.
 *
 *   { "v": 2, "states": { "lagos": { "streets": { "1": { "done": true, "best": 1200 } },
 *                                     "parcel": true, "hall": { "done": false, "best": 0 } } },
 *     "city": { "kobo": 0, "power": 0, "tech": 0, "fixed": [], "fixes": 0 } }
 *
 * Version 2 (Naira, N1 to N4; docs/city.md part 5 (b)):
 * - `best` is whole kobo, 10 kobo a coin (it was 1 a coin in version 1). A version 1 copy is moved
 *   once on load: every best times 10, then `v: 2` is written, so it never happens twice. The purse
 *   starts at ₦0: bests are records, never money.
 * - `city` is the Lagos city screen's part (src/game/city.ts): the three buckets (money as whole
 *   kobo, Power, Tech), the fixed spots and the fix count. Merged in like everything else; a broken
 *   or missing part reads as zeros.
 *
 * Rules:
 * - Written only when a street is finished (bus boarded), when the hall is won (at the third hit), and when the
 *   parcel is saved (it is saved with the street it was carried off). Never mid-street.
 * - Merge, never overwrite: unknown states and unknown fields in the saved copy are kept as
 *   they are, so later regions and later versions add to it safely.
 * - Broken copy (bad JSON or the wrong shape): the game starts with nothing done and does not
 *   write over it until the player finishes a street (or wins the hall).
 * - Never goes down: a done street stays done, `best` is the most kobo ever finished with, and
 *   a saved parcel stays saved until the hall is won.
 * - po ruling (d), decision line 18: winning the hall uses the parcel up. The same save that
 *   writes hall.done writes parcel: false. A lost hall try keeps it. A parcel found later on a
 *   street is saved again and gives the next hall try its shield (one at a time, never two).
 * - Storage blocked: the Store keeps it in memory for this visit (src/storage.ts).
 */
import type { Store } from '../storage';

export const KEY_PROGRESS = 'progress';
export const PROGRESS_VERSION = 2;

/** Version 1 has one state with three streets and a hall (S2.6, Q16). */
export const LAGOS = 'lagos';
export const STREETS_PER_STATE = 3;

export interface PlaceRecord {
  done: boolean;
  /** Most kobo ever finished with (whole kobo, 10 a coin). */
  best: number;
}

export interface StateProgress {
  /** By street number ("1", "2", "3"); a street missing here is not done. */
  streets: { [n: string]: PlaceRecord };
  parcel: boolean;
  hall: PlaceRecord;
}

export type Obj = { [k: string]: unknown };

export const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * N3 a: a copy saved before Naira (v missing or 1) has bests at 1 kobo a coin. Times 10 once,
 * marked `v: 2`. Pure: returns the same object when nothing needs moving, else a new one.
 */
export function migrate(saved: Obj): Obj {
  const v = saved['v'];
  if (typeof v === 'number' && v >= 2) return saved;
  const out = structuredClone(saved);
  out['v'] = PROGRESS_VERSION;
  const states = out['states'];
  if (!isObj(states)) return out;
  const times10 = (rec: unknown): void => {
    if (!isObj(rec)) return;
    const b = rec['best'];
    if (typeof b === 'number' && Number.isFinite(b) && b > 0) rec['best'] = Math.floor(b) * 10;
  };
  for (const st of Object.values(states)) {
    if (!isObj(st)) continue;
    const streets = st['streets'];
    if (isObj(streets)) for (const r of Object.values(streets)) times10(r);
    times10(st['hall']);
  }
  return out;
}

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
  const base: Obj = saved ? structuredClone(migrate(saved)) : {};
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
    st['parcel'] = false; // used up by the win (po ruling d)
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
    // N3 a: an old copy is moved to Naira once, and the move is written at once (v: 2).
    if (this.saved) {
      const moved = migrate(this.saved);
      if (moved !== this.saved) {
        this.saved = moved;
        this.store.save(KEY_PROGRESS, moved);
      }
    }
  }

  /** The whole saved value (read only), or null when nothing readable is saved. */
  get raw(): Readonly<Obj> | null {
    return this.saved;
  }

  /**
   * Writes one top-level part (e.g. `city`), merged into the newest readable copy on the phone,
   * keeping everything else. Returns false if it could not be kept on the phone.
   */
  savePart(key: string, value: unknown): boolean {
    const now = this.store.load<unknown>(KEY_PROGRESS);
    const base: Obj = now !== undefined && isProgressShape(now) ? migrate(now) : this.saved ? structuredClone(this.saved) : { v: PROGRESS_VERSION, states: {} };
    const next: Obj = structuredClone(base);
    if (typeof next['v'] !== 'number' || (next['v'] as number) < PROGRESS_VERSION) next['v'] = PROGRESS_VERSION;
    if (!isObj(next['states'])) next['states'] = {};
    next[key] = structuredClone(value);
    this.saved = next;
    return this.store.save(KEY_PROGRESS, next);
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
