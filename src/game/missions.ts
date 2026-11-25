/**
 * MS3a: quick missions (docs/missions.md, decision 89), with no DOM. A mission is a street or a
 * lane run already built, with one goal on top; it wins 2 or 3 stars. A star is kept the moment
 * it fills (MS-R3), pays ₦2 once (MS-R2) and never goes away. No clock, no days (MS-R1).
 *
 * Saved on the phone under `gidi-missions`, its own key (part 3):
 *   { "v": 1, "stars": { "lagos-coins": 2 }, "best": { "lagos-coins": 112 },
 *     "tries": { "lagos-wells-3": 2 }, "found": { "lagos-wells-2": 1 }, "helper": { "lagos": 1 } }
 * `found` marks each place a one-star-each mission (the wells, the garri) was done at, by street
 * number. Merged, never overwritten: every number only goes up. A broken copy reads as no stars
 * and is left alone until a star fills (the progress.ts rule).
 */
import type { FoodKind, Level } from './level';
import type { GameEvent } from './game';
import type { Store } from '../storage';

export const KEY_MISSIONS = 'missions';
/** MS-R2: a new star pays ₦2 (whole kobo), the first time only. */
export const STAR_KOBO = 200;
/** A mission's `at` for the state's lane run. */
export const LANE = 0;

/** KM2 to KM4 (kano.md 6.2): Kano's kobo arcs in a tailwind, cloth bounces and whirls puffed. */
export type Goal = 'coins' | 'foods' | 'goats' | 'wells' | 'bulbs' | 'potholes' | 'garri' | 'gravel' | 'chips' | 'arcs' | 'bounces' | 'whirls';
/** The goal's picture (each already drawn for the HUD, the street or the buttons; Kano's wind, cloth and whirl by its part). */
export type MissionIcon = 'coin' | 'foods' | 'goat' | 'well' | 'power' | 'fufu' | 'parcel' | 'gravel' | 'tech' | 'wind' | 'cloth' | 'whirl';

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
  /**
   * A later state's own count (Kano's KM2 to KM4), so the first load needs no rule for it: a run
   * event that counts one more (true), one more once per key (a kobo arc's pit), or nothing.
   */
  readonly tally?: (e: GameEvent, level: Level) => boolean | string;
}

/** One star at each place, not a count in one go. */
export const perPlace = (d: MissionDef): boolean => d.goal === 'wells' || d.goal === 'garri';

/** The coin stars: 40, 65 and 85 percent of the street's laid coins, each rounded down to a 5. */
export const coinStars = (coins: number): number[] => [0.4, 0.65, 0.85].map((f) => Math.floor((coins * f) / 5) * 5);

const PARTS = ['stars', 'best', 'tries', 'found', 'helper'] as const;
export type MissionSave = Record<(typeof PARTS)[number], Record<string, number>>;

/** The save read leniently (anything odd counts as nothing), or merged with more: every number the higher one. */
export function readMissions(...vs: unknown[]): MissionSave {
  const out = {} as MissionSave;
  for (const k of PARTS) {
    const o: Record<string, number> = (out[k] = {});
    for (const v of vs) {
      const part = (v as Record<string, unknown> | null)?.[k];
      if (typeof part !== 'object' || part === null) continue;
      for (const [id, n] of Object.entries(part)) if (typeof n === 'number' && n >= 1) o[id] = Math.max(o[id] ?? 0, Math.floor(n));
    }
  }
  return out;
}

/** Stars won for a count (or the places found, or the foods picked up). */
export const starsFor = (d: MissionDef, have: number): number => d.stars.filter((t) => have >= t).length;

/** The `gidi-missions` save, kept in memory while the game runs. */
export class MissionBook {
  save: MissionSave;
  /** Something is saved there that cannot be read: left alone until a star fills. */
  private broken: boolean;

  constructor(private readonly store: Store) {
    const raw = store.load<unknown>(KEY_MISSIONS);
    this.broken = store.has(KEY_MISSIONS) && (typeof raw !== 'object' || raw === null);
    this.save = readMissions(raw);
  }

  stars(id: string): number {
    return this.save.stars[id] ?? 0;
  }

  /** Stars won in a state's missions, and how many it has. */
  total(defs: readonly MissionDef[]): [number, number] {
    return [defs.reduce((n, d) => n + Math.min(d.stars.length, this.stars(d.id)), 0), defs.reduce((n, d) => n + d.stars.length, 0)];
  }

  /** Merges `more` in and writes it over the phone's copy, never lower. `star`: a broken copy is replaced now. */
  put(more: Partial<MissionSave>, star = false): void {
    this.save = readMissions(this.save, more);
    if (this.broken && !star) return;
    if (!this.broken) this.save = readMissions(this.store.load<unknown>(KEY_MISSIONS), this.save);
    this.broken = false;
    this.store.save(KEY_MISSIONS, { v: 1, ...this.save });
  }
}

/**
 * One go at a mission (a street or lane run started from its card, Play again included). Fed by
 * the run's events; each star that fills is saved and paid at once by `onStars`, so a lost
 * life, game over or leaving keeps it.
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
  /** The keys a `tally` counted once this go (KM2: each arc's pit). */
  private readonly keys = new Set<string>();

  constructor(
    readonly def: MissionDef,
    /** The street number (or LANE) played. */
    readonly place: number,
    private readonly book: MissionBook,
    /** `n` new stars filled, `total` now: save and pay. */
    private readonly onStars: (n: number, total: number) => void,
  ) {
    const k = `${def.id}-${place}`;
    book.put({ tries: { [k]: (book.save.tries[k] ?? 0) + 1 } });
  }

  /** The stars this go has reached, with what was saved before. */
  get stars(): number {
    const d = this.def;
    if (perPlace(d)) return d.at.filter((n) => (n === this.place && this.done) || this.book.save.found[`${d.id}-${n}`]).length;
    return starsFor(d, this.shown);
  }

  /** The count as the chip shows it. */
  get shown(): number {
    return perPlace(this.def) ? +this.done : this.def.foods ? this.foods.size : this.have;
  }

  /** The next star's number for the chip ("12 / 60"), or null once every star is won. */
  get next(): number | null {
    const d = this.def;
    if (perPlace(d)) return this.done ? null : 1;
    return d.stars[Math.max(this.book.stars(d.id), this.stars)] ?? null;
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

  /** The def's own `tally` for a run event: one more, or one more the first time for its key. */
  tally(e: GameEvent, level: Level): number {
    const k = this.def.tally?.(e, level);
    if (!k || (typeof k === 'string' && this.keys.has(k))) return 0;
    if (typeof k === 'string') this.keys.add(k);
    return this.add();
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

  /** Saves new stars (with the place found) and pays for them; returns how many. */
  private check(): number {
    const d = this.def;
    const now = Math.min(this.stars, d.stars.length);
    const n = now - this.book.stars(d.id);
    if (n <= 0) return 0;
    this.book.put({ stars: { [d.id]: now }, found: this.done ? { [`${d.id}-${this.place}`]: 1 } : {} }, true);
    this.won += n;
    this.onStars(n, now);
    return n;
  }

  /** The go is over (or left): its best is kept. */
  end(): void {
    if (!perPlace(this.def) && this.shown > (this.book.save.best[this.def.id] ?? 0)) this.book.put({ best: { [this.def.id]: this.shown } });
  }
}

/** The help line for a per-place mission's place, after two goes there without it (part 1). */
export function helpFor(d: MissionDef, save: MissionSave, place: number): string | null {
  const k = `${d.id}-${place}`;
  return d.help && !save.found[k] && (save.tries[k] ?? 0) >= 2 ? (d.help[d.at.indexOf(place)] ?? null) : null;
}

/** Where a mission's Play goes: its first open place (per place: the first not done yet), or null. */
export function placeToPlay(d: MissionDef, save: MissionSave, open: (n: number) => boolean): number | null {
  const ok = d.at.filter(open);
  return ok.find((n) => !perPlace(d) || !save.found[`${d.id}-${n}`]) ?? ok[0] ?? null;
}
