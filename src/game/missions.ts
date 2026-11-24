/**
 * MS3a: quick missions (docs/missions.md, decision 89), with no DOM. A mission is a street or a
 * lane run already built, with one goal on top; it wins 2 or 3 stars. A star is kept the moment
 * it fills (MS-R3), pays ₦2 once (MS-R2) and never goes away. No clock, no days (MS-R1).
 *
 * Saved on the phone under `gidi-missions`, its own key (part 3):
 *   { "v": 1, "stars": { "lagos-coins": 2 }, "best": { "lagos-coins": 112 },
 *     "tries": { "lagos-wells-3": 2 }, "found": { "lagos-wells": [2] }, "helper": { "lagos": true } }
 * `found` holds which places a one-star-each mission (the wells, the garri) has been done at,
 * by street number. Merged, never overwritten; nothing goes down. A broken copy reads as no
 * stars and is left alone until a star fills (the progress.ts rule).
 */
import type { FoodKind } from './level';
import type { Store } from '../storage';

export const KEY_MISSIONS = 'missions';
/** MS-R2: a new star pays ₦2 (whole kobo), the first time only. */
export const STAR_KOBO = 200;
/** A mission's `at` for the state's lane run. */
export const LANE = 0;

export type Goal = 'coins' | 'foods' | 'goats' | 'wells' | 'bulbs' | 'potholes' | 'garri' | 'gravel' | 'chips';
/** The goal's picture (each already drawn for the HUD, the street or the buttons). */
export type MissionIcon = 'coin' | 'foods' | 'goat' | 'well' | 'power' | 'fufu' | 'parcel' | 'gravel' | 'tech';

export interface MissionDef {
  /** e.g. "lagos-coins": its save key. */
  readonly id: string;
  readonly state: string;
  readonly goal: Goal;
  /** Street numbers (1-based), or LANE. The wells and the garri: one star at each place. */
  readonly at: readonly number[];
  /** Each star's number, easiest first. Coins: worked out from the level (coinStars). */
  readonly stars: readonly number[];
  readonly name: string;
  readonly line: string;
  readonly icon: MissionIcon;
  /** The places' names, as `at`. */
  readonly places: readonly string[];
  /** Lunch for Mama Put: the foods, in the chip's order. */
  readonly foods?: readonly FoodKind[];
  /** Secret wells: the help line for each place after two goes without its well. */
  readonly help?: readonly string[];
  /** The city's helper who says thank you after a star (Mama Put, the garri mill). */
  readonly thanks?: string;
}

/** One star at each place, not a count in one go. */
export const perPlace = (d: MissionDef): boolean => d.goal === 'wells' || d.goal === 'garri';

/** The coin stars: 40, 65 and 85 percent of the street's laid coins, each rounded down to a 5. */
export function coinStars(coins: number): number[] {
  return [0.4, 0.65, 0.85].map((f) => Math.floor((coins * f) / 5) * 5);
}

export interface MissionSave {
  stars: Record<string, number>;
  best: Record<string, number>;
  tries: Record<string, number>;
  found: Record<string, number[]>;
  helper: Record<string, boolean>;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const whole = (n: unknown): number => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);
function counts(v: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (isObj(v)) for (const [k, n] of Object.entries(v)) if (whole(n) > 0) out[k] = whole(n);
  return out;
}

export const emptyMissions = (): MissionSave => ({ stars: {}, best: {}, tries: {}, found: {}, helper: {} });

/** The save read leniently: anything odd counts as nothing. */
export function readMissions(v: unknown): MissionSave {
  if (!isObj(v)) return emptyMissions();
  const found: Record<string, number[]> = {};
  if (isObj(v['found'])) {
    for (const [k, l] of Object.entries(v['found'])) {
      const ns = Array.isArray(l) ? [...new Set(l.map(whole).filter((n) => n > 0))].sort() : [];
      if (ns.length) found[k] = ns;
    }
  }
  const helper: Record<string, boolean> = {};
  if (isObj(v['helper'])) for (const [k, b] of Object.entries(v['helper'])) if (b === true) helper[k] = true;
  return { stars: counts(v['stars']), best: counts(v['best']), tries: counts(v['tries']), found, helper };
}

/** Both saves at once: the higher of every number, every place found, every helper card. */
export function mergeMissions(a: MissionSave, b: MissionSave): MissionSave {
  const top = (x: Record<string, number>, y: Record<string, number>): Record<string, number> => {
    const o = { ...x };
    for (const [k, n] of Object.entries(y)) o[k] = Math.max(o[k] ?? 0, n);
    return o;
  };
  const found = { ...a.found };
  for (const [k, l] of Object.entries(b.found)) found[k] = [...new Set([...(found[k] ?? []), ...l])].sort();
  return { stars: top(a.stars, b.stars), best: top(a.best, b.best), tries: top(a.tries, b.tries), found, helper: { ...a.helper, ...b.helper } };
}

/** Stars won for a count (or for the places found, or the foods picked up). */
export const starsFor = (d: MissionDef, have: number): number => d.stars.filter((t) => have >= t).length;

/** The `gidi-missions` save, kept in memory while the game runs. */
export class MissionBook {
  private data: MissionSave;
  /** Something is saved there that cannot be read: left alone until a star fills. */
  private broken: boolean;

  constructor(private readonly store: Store) {
    const raw = store.load<unknown>(KEY_MISSIONS);
    this.broken = store.has(KEY_MISSIONS) && !isObj(raw);
    this.data = readMissions(raw);
  }

  get save(): Readonly<MissionSave> {
    return this.data;
  }

  stars(id: string): number {
    return this.data.stars[id] ?? 0;
  }

  /** Stars won in a state's missions. */
  total(defs: readonly MissionDef[]): number {
    return defs.reduce((n, d) => n + Math.min(d.stars.length, this.stars(d.id)), 0);
  }

  /**
   * Merges `more` in and writes it (merge with the phone's copy, never lower). `star`: a star
   * just filled, so a broken copy is replaced now.
   */
  put(more: Partial<MissionSave>, star = false): void {
    this.data = mergeMissions(this.data, { ...emptyMissions(), ...more });
    if (this.broken && !star) return;
    const now = this.store.load<unknown>(KEY_MISSIONS);
    const merged = this.broken ? this.data : mergeMissions(readMissions(now), this.data);
    this.broken = false;
    this.data = merged;
    this.store.save(KEY_MISSIONS, { v: 1, ...merged });
  }
}

/**
 * One go at a mission (a street or lane run started from its card, Play again included).
 * Fed by the run's events; says how many stars filled just now (each is saved and paid at once
 * by `onStars`, so a lost life, game over or leaving keeps it).
 */
export class MissionGo {
  /** The count this go (coins, goats, potholes, gravel, bulbs or chips). */
  have = 0;
  /** Lunch for Mama Put: the foods picked up this go. */
  readonly foods = new Set<FoodKind>();
  /** This place's well or garri was done this go. */
  done = false;
  /** Stars won in this go (for the end card's line). */
  won = 0;

  constructor(
    readonly def: MissionDef,
    /** The street number (or LANE) played. */
    readonly place: number,
    private readonly book: MissionBook,
    /** New stars filled: `n` of them, `total` now. Saves and pays (₦2 each) at once. */
    private readonly onStars: (n: number, total: number) => void,
  ) {
    const k = this.triesKey;
    book.put({ tries: { [k]: (book.save.tries[k] ?? 0) + 1 } });
  }

  private get triesKey(): string {
    return `${this.def.id}-${this.place}`;
  }

  /** The stars this go has reached, with what was saved before. */
  get stars(): number {
    const d = this.def;
    if (perPlace(d)) return new Set([...(this.book.save.found[d.id] ?? []), ...(this.done ? [this.place] : [])]).size;
    return starsFor(d, d.goal === 'foods' ? this.foods.size : this.have);
  }

  /** The next star's number for the chip ("12 / 60"), or null once every star is won. */
  get next(): number | null {
    const d = this.def;
    if (perPlace(d)) return this.done ? null : 1;
    const saved = Math.min(this.book.stars(d.id), d.stars.length);
    const now = this.stars;
    return d.stars[Math.max(saved, now)] ?? null;
  }

  /** The count as the chip shows it. */
  get shown(): number {
    return perPlace(this.def) ? (this.done ? 1 : 0) : this.def.goal === 'foods' ? this.foods.size : this.have;
  }

  /** A count that only grows (coins: the run's coins; the lane: Power or Tech so far). */
  count(n: number): number {
    if (n <= this.have) return 0;
    this.have = n;
    return this.check();
  }

  add(): number {
    return this.count(this.have + 1);
  }

  food(kind: FoodKind): number {
    if (!this.def.foods?.includes(kind) || this.foods.has(kind)) return 0;
    this.foods.add(kind);
    return this.check();
  }

  /** The well gone down, or the bus boarded with the garri. */
  found(): number {
    if (this.done || !perPlace(this.def)) return 0;
    this.done = true;
    return this.check();
  }

  /** Saves new stars (with the places found) and pays for them; returns how many. */
  private check(): number {
    const d = this.def;
    const now = Math.min(this.stars, d.stars.length);
    const before = this.book.stars(d.id);
    if (now <= before) return 0;
    this.book.put({ stars: { [d.id]: now }, ...(perPlace(d) && this.done ? { found: { [d.id]: [this.place] } } : {}) }, true);
    this.won += now - before;
    this.onStars(now - before, now);
    return now - before;
  }

  /** The go is over (or left): its best is kept. */
  end(): void {
    const d = this.def;
    if (perPlace(d) || this.shown <= 0) return;
    const best = this.book.save.best[d.id] ?? 0;
    if (this.shown > best) this.book.put({ best: { [d.id]: this.shown } });
  }
}

/** The help line for a per-place mission's place, after two goes there without it (part 1). */
export function helpFor(d: MissionDef, save: Readonly<MissionSave>, place: number): string | null {
  const i = d.at.indexOf(place);
  if (!d.help || i < 0 || (save.found[d.id] ?? []).includes(place)) return null;
  return (save.tries[`${d.id}-${place}`] ?? 0) >= 2 ? (d.help[i] ?? null) : null;
}

/** Where a mission's Play goes: the first place not done yet (per place), else its first. */
export function placeToPlay(d: MissionDef, save: Readonly<MissionSave>, open: (n: number) => boolean): number | null {
  const ok = d.at.filter(open);
  if (perPlace(d)) return ok.find((n) => !(save.found[d.id] ?? []).includes(n)) ?? ok[0] ?? null;
  return ok[0] ?? null;
}
