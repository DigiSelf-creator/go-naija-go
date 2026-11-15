/**
 * O2b: a later state's street look (types only; nothing here is built into the first load).
 *
 * Lagos streets draw with the art in src/art/ by their `theme`. A later state's street brings its
 * own look from its lazy part (src/worlds/<id>/): the backdrop, roofs, mud and its footprints, the
 * arch, its foods and crates, its traders' stalls and its people. Game (game.ts) calls these at
 * the right places in the draw order. A skin only draws and reads the run; it never changes it.
 * A fault in a skin turns it off for the rest of the visit (the Lagos look stands in); the run
 * goes on as before.
 */
import type { CrateLook } from '../art/crate';
import type { StreetCast } from './crowd';
import type { CrateState } from './crates';
import type { FoodKind, Level } from './level';
import type { GamePeople } from './people';
import type { Run, RunEvent } from './run';
import type { RoomData } from './well';

type G = CanvasRenderingContext2D;

/** What a skin may read while it draws (one object, filled again each frame). */
export interface SkinNow {
  level: Level;
  run: Run;
  /** Camera left edge and the world width shown. */
  camX: number;
  viewW: number;
  /** World x limits worth drawing (the screen and a margin). */
  L: number;
  R: number;
  /** World height shown (the view and the lift). */
  H: number;
  /** Seconds of play (still: hold anything that moves). */
  clock: number;
  still: boolean;
  /** The state is switched on (its boss beaten): lamps lit, the arch bright. */
  fixed: boolean;
  /** The people, if their chunk has arrived (for the traders' stalls). */
  people: GamePeople | null;
  /** The run cycle (0 to 1), for footsteps. */
  stride: number;
}

/** A footstep or a jump the skin hears about (from Game's own looks). */
export type SkinEvent = RunEvent | { type: 'mudStep'; x: number; y: number };

export interface StreetSkin {
  /** Screen space: everything behind the road, back to front. */
  backdrop(g: G, camX: number, viewW: number, time: number, viewH: number, groundY: number, still: boolean): void;
  /** World space, before the back pavement people: scenery behind them (stalls). */
  back?(g: G, s: SkinNow): void;
  /** World space, right after the road: mud, its prints, the arch. */
  ground?(g: G, s: SkinNow): void;
  /** World space: a roof (a one-way platform) whose top edge is topY. */
  stall?(g: G, x: number, topY: number, w: number, groundY: number): void;
  /** World space: a food on the road. False: the game draws its own. */
  food?(g: G, kind: FoodKind, x: number, y: number, time: number): boolean;
  /** World space: a hanging crate. False: the game draws its own. */
  crate?(g: G, c: CrateState, look: Omit<CrateLook, 'stamp'>): boolean;
  /** A HUD chip's food icon, centred at (x, y), size 1 about 32 u. False: the game draws its own. */
  icon?(g: G, kind: FoodKind, x: number, y: number, size: number): boolean;
  /** World space, in front of the hero: splashes. */
  front?(g: G, s: SkinNow): void;
  /** What happened this step. */
  hear?(events: readonly SkinEvent[], s: SkinNow): void;
  /** O3b: the well room's back and shelves (room units). False: the Lagos room. */
  room?(g: G, room: RoomData, camX: number, viewW: number, time: number, viewH: number, still: boolean): boolean;
  /** O3b: the room's gift on its shelf. False: the game's garri parcel. */
  gift?(g: G, x: number, y: number, time: number): boolean;
  /** O3b: the HUD parcel chip's icon, centred at (x, y), about `size` across. */
  parcelIcon?(g: G, x: number, y: number, size: number): void;
  /** A fresh play of the street (start, Play again). */
  restart?(): void;
  /** The street's own people (design.md "People everywhere"), or none for the Lagos casts. */
  readonly cast?: StreetCast;
}
