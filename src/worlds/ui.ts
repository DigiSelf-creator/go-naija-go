/**
 * O1b2: what a later state's lazy part gives the first load to show (types only, nothing here
 * is built into the first load). The Ogun part (src/worlds/ogun/) fills it: the bus ride through
 * the gateway (docs/ogun.md 1.3), the picture behind Ogun's place screen, and the welcome tune.
 */
import type { HeroLook } from '../art/hero';
import type { Tune } from '../art/tunes';

export interface RideOptions {
  look: HeroLook;
  /** Ogun to Lagos: under the arch's back ("SAFE JOURNEY"). */
  toLagos: boolean;
  /** King Pothole is beaten: the arch is bright. */
  lit: boolean;
  /** Reduced motion: the end picture only. */
  still: boolean;
  /** The first ride (about 4 s); after that the short one (2 s). */
  first: boolean;
  /** The picture's spoken name, and the Skip button's word. */
  spoken: string;
  skip: string;
  /** The bus is under the arch: the welcome tune (the game checks the Music switch). */
  tune(): void;
  /** The ride is over (its end, Skip, a tap on the end picture, Escape). Called once. */
  done(): void;
}

export interface WorldUi {
  /** The bus ride, a full-screen element; close() stops it without calling done(). */
  busRide(o: RideOptions): { el: HTMLElement; close(): void };
  /** The still picture behind the state's place screen, painted to the canvas's own size. */
  paintHome(c: HTMLCanvasElement, o: { lit: boolean }): void;
  /** The welcome tune (about 1.5 s, our own). */
  readonly tune: Tune;
}
