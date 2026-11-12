/**
 * The live city (docs/city.md part 5W, W3, W4, W10), with no DOM: the saved city part kept in
 * memory while the game runs, the working places filling in play time, and when it is written.
 *
 * - Places fill only while you are playing: the city screen is open or a challenge is running,
 *   not paused, the tab in front. The caller calls tick() only then; nothing fills while the
 *   game is closed (no clocks are read, ever).
 * - Writes: at once on a pay or a collect (and a win's money); otherwise at most one every 10 s
 *   of play while something changed (a tray, the hero's place), and on flush() (tab hidden,
 *   leaving the city).
 */
import { fillTrays, newClock, readCity, writeCity, type CityState, type PlaceId, type TrayClock } from './city';

/** Seconds of play between two quiet writes (W10). */
export const SAVE_EVERY = 10;

export interface CityLifeStore {
  /** The saved `city` part (anything; read leniently). */
  load(): unknown;
  /** Writes the city part (plain JSON). False when it is not kept (storage blocked, a broken copy). */
  save(part: Record<string, unknown>): boolean;
}

export class CityLife {
  state: CityState;
  /** Play seconds toward each place's next plate or danfo. */
  readonly clock: TrayClock = newClock();
  private dirty = false;
  private quiet = 0;
  /** Writes so far (tests check the 10 s rule). */
  writes = 0;

  constructor(private readonly store: CityLifeStore) {
    this.state = readCity(store.load());
  }

  /** Reads the saved part again (another screen changed it). Unsaved changes are kept if nothing newer is saved. */
  reload(): void {
    if (this.dirty) return;
    this.state = readCity(this.store.load());
  }

  /** A new state. `now`: write it at once (a pay, a collect, money from a run). */
  set(next: CityState, now = false): void {
    this.state = next;
    this.dirty = true;
    if (now) this.flush();
  }

  /** `dt` seconds of play: trays fill (in steps, up to their caps). Returns the places whose tray changed. */
  tick(dt: number): PlaceId[] {
    const { next, changed } = fillTrays(this.state, this.clock, dt);
    if (changed.length) {
      this.state = next;
      this.dirty = true;
    }
    if (Number.isFinite(dt) && dt > 0) this.quiet += dt;
    if (this.dirty && this.quiet >= SAVE_EVERY) this.flush();
    return changed;
  }

  /** Writes now if anything changed since the last write. */
  flush(): void {
    if (!this.dirty) return;
    this.dirty = false;
    this.quiet = 0;
    this.writes++;
    const old = this.store.load();
    // Merged into the saved part, keeping fields a later version may add.
    const base = typeof old === 'object' && old !== null && !Array.isArray(old) ? (old as Record<string, unknown>) : {};
    this.store.save({ ...base, ...writeCity(this.state) });
  }
}
