/**
 * One try at a level: the rules, with no drawing, sound or DOM, so it can be unit tested.
 * docs/design.md: Level 1 (losing a life, bus stop, hazards) and Power-ups.
 * Q14 (provisional): after a fall, food effects end (shield too), foods and hazards past the
 * restart point come back, and kobo already taken stay counted and do not come back.
 * Q15 (provisional): the number of lives is fixed when the run starts.
 */
import { bounce, createBody, createWalker, endDash, groundAt, halt, press, release, resting, startDash, steer, step, type Body, type Gait, type Terrain } from '../engine/physics';
import { BossFight, throwBox, type BossEvent } from './boss';
import { CRATE_RULES, freshCrates, refillCrates, stepCrates, type CrateEvent, type CrateState } from './crates';
import { featureOn } from './features';
import { ballsOut, FUFU_RULES, stepBall, tossBall, type BallWorld, type FufuBall } from './fufu';
import { EGRET_SPEED, isBird, type BirdKind, type FoodKind, type HazardKind, type Level, type ThrowKind, type WellData } from './level';
import { pitKind, pitsOf, withBlocks, BIG_PIT, type Pit, type PitKind } from './pits';
import { GENTLE_HINTS } from '../screens/words';
import { freshRoom, roomWalls, WELL_RULES, type RoomData, type RoomPlay } from './well';
import { wellDownAt, wellUpAt } from '../art/well';

export const STEPS_PER_SECOND = 60;
const secs = (s: number): number => Math.round(s * STEPS_PER_SECOND);

export const RULES = {
  lives: 3,
  gentleLives: 5,
  /** Blinking safety after losing a life to a hit. */
  hurtSafeSteps: secs(1.7),
  /** Blinking safety after the shield takes a hit. */
  shieldSafeSteps: secs(1.2),
  /** Twice the first 6 s and 7 s after Tp's iPhone test: they wore off too fast. */
  cornSteps: secs(12),
  amalaSteps: secs(12),
  /** Timed foods warn this long before they end. */
  warnSteps: secs(2),
  smashKobo: 2,
  /** Hero box: feet centre x, this wide each side, this tall. */
  heroHalfW: 7,
  heroH: 44,
  /** On top: falling, and on the step before the feet were no lower than this below the top. */
  stompSlack: 6,
  /** Goats trot off to the right, faster than the hero even on corn. */
  goatRunAwaySpeed: 240,
  goatRunAwaySteps: secs(2.5),
  /** Tyres that leave the road fall until this far below it, then are gone. */
  tyreFallSpeed: 300,
  /** S2.2 walls: the hero's centre stays this far inside the start fence and the end wall. */
  wallGap: 7,
  /** S2.2: a woken hazard this far outside the camera's edges is gone for good this play. */
  leaveDistance: 200,
  /** S2.2: a hint at or before the spawn shows this long after the street starts. */
  firstHintSteps: secs(0.5),
  /**
   * S2.6 street end: hazards fade, the door slides open, the hero hops in, the door shuts and
   * the bus pulls away, then the street is cleared. Same times as art's busEndAt (BUS_END).
   */
  fadeSteps: secs(0.3),
  doorSteps: secs(0.2),
  hopSteps: secs(0.6),
  busLeaveSteps: secs(1.4),
  clearedSteps: secs(2.2),
  /** The bus speeds up evenly as it pulls away, u/s² (about 600 u gone in 1.4 s). */
  busAccel: 612,
  /**
   * S2.7 hall start with the garri parcel: "Your garri parcel: the shield is on!" shows first,
   * then the boss words this long after (before the first throw's warning at 1.6 s).
   */
  parcelWordsSteps: secs(1.5),
  /**
   * S2.13 part 5, Gentle mode on a street: after a pothole fall the hero climbs out this far
   * before the pit's left lip (a big pit: its run-up), with blinking safety and a short
   * "dust off" with the controls locked (none with reduced motion).
   */
  climbBefore: 100,
  climbBeforeBig: 160,
  /** The climb-out point needs this much solid road on each side. */
  climbRoad: 20,
  climbSafeSteps: secs(1.7),
  dustOffSteps: secs(0.4),
  /** S2.16 B1 birds: a bounce off one is smaller than off a goat (the second jump stays). */
  birdBounceVy: -360,
  /** Bouncing on a bird pops this many kobo out of the pile. */
  birdKobo: 2,
  /** Flying off: up and to the right at 45 degrees, this fast, gone after this long. */
  birdFlySpeed: 200,
  birdFlySteps: secs(1.2),
  /** The egret paces this far either side of where it stands, and turns back this far from a pit lip. */
  egretPatch: 20,
  egretPitGap: 30,
  /** It pecks this long at each end of its patch. */
  egretPeckSteps: secs(0.8),
  /** S2.16 B5: the weeds are 18 u tall; a fufu ball dries them in 0.5 s (safe from the first touch). */
  weedH: 18,
  weedDrySteps: secs(0.5),
} as const;

/** Size of each hazard's box (half width, height), feet on the road. */
export const HAZARD_BOX: Record<HazardKind, { halfW: number; h: number }> = {
  goat: { halfW: 16, h: 26 },
  tyre: { halfW: 10, h: 22 },
  drum: { halfW: 13, h: 30 },
  /** S2.16 B1: the egret stands on the road; the crow's box bottom is 20 u above it (HazardState y). */
  egret: { halfW: 8, h: 28 },
  crow: { halfW: 11, h: 14 },
};

/** S2.16 B1: the crow's box bottom is this far above the road. */
export const CROW_ABOVE = 20;

/** eat: a goat chewing a fufu ball (S2.15); knocked: a tyre or drum tipping off the road. */
export type HazardMode = 'wait' | 'move' | 'runAway' | 'falling' | 'eat' | 'knocked' | 'flyOff' | 'gone';

export interface HazardState {
  readonly kind: HazardKind;
  /** Where the data puts it. */
  readonly x0: number;
  x: number;
  /** Feet (or tyre bottom) y. */
  y: number;
  vx: number;
  mode: HazardMode;
  /** Steps since it started running away. */
  t: number;
  /** Tyre roll angle. */
  rot: number;
  /** The way a goat faces while it eats (towards the ball). */
  face: 1 | -1;
  /** S2.16 B1: a bird flying off with a fufu ball. */
  fufu: boolean;
}

/** S2.16 B5: an open gutter and the state of its weeds in this play. */
export interface GutterState {
  readonly x: number;
  readonly w: number;
  /** 'weeds' hurt; 'drying' (a fufu ball, t steps ago) and 'dry' or 'trampled' (amala) are safe. */
  state: 'weeds' | 'drying' | 'dry' | 'trampled';
  t: number;
}

/** How a bird came to fly off (S2.16 B1). */
export type BirdWhy = 'stomp' | 'fufu' | 'suit' | 'amala' | 'touch';

export interface CoinState {
  readonly x: number;
  readonly y: number;
  taken: boolean;
}

export interface FoodState {
  readonly x: number;
  readonly y: number;
  readonly kind: FoodKind;
  taken: boolean;
}

export type RunEvent =
  | { type: 'kobo'; x: number; y: number }
  | { type: 'food'; kind: FoodKind; x: number; y: number }
  | { type: 'hint'; words: string }
  | { type: 'wake'; kind: HazardKind; x: number }
  | { type: 'bounce'; kind: HazardKind; x: number; y: number }
  | { type: 'smash'; kind: HazardKind | 'honk'; x: number; y: number }
  | { type: 'hit' }
  | { type: 'shieldPop' }
  | { type: 'fall' }
  /** Gentle mode (S2.13 part 5): back just before the pit fallen in, after the 'fall'. */
  | { type: 'climbOut'; kind: PitKind; x: number }
  | { type: 'checkpoint' }
  | { type: 'wearingOff'; kind: 'corn' | 'amala' }
  | { type: 'tick' }
  | { type: 'powerEnd'; kind: 'corn' | 'amala' }
  | { type: 'gameOver' }
  /** S2.7: the hall fight starts (the boss words). With the parcel, 'parcelShield' comes first. */
  | { type: 'hallStart' }
  | { type: 'parcelShield' }
  | { type: 'busBoard' }
  | { type: 'busGo' }
  | { type: 'streetCleared' }
  /** S2.5: going down a well (crank clicks), arriving in its room, the parcel, going up, back on the street. */
  | { type: 'wellDown'; x: number }
  | { type: 'room' }
  | { type: 'parcel'; x: number; y: number }
  | { type: 'wellUp' }
  | { type: 'wellBack'; x: number }
  /** S2.15 pepper fufu: a ball tossed, its plop or hop, its roll, its settle. */
  | { type: 'fufuToss'; x: number; y: number }
  | { type: 'fufuPlop'; hop: boolean; x: number; y: number }
  | { type: 'fufuRoll'; x: number }
  | { type: 'fufuSettle'; x: number; y: number }
  /** A pothole plugged (first: the first in this play of the street). */
  | { type: 'fufuPlug'; x: number; a: number; b: number; first: boolean }
  /** A ball dropped into a big pit: too deep. */
  | { type: 'fufuFarPlop'; x: number }
  /** A tyre or drum knocked off the road (+1 kobo). */
  | { type: 'fufuKnock'; kind: HazardKind; x: number; y: number }
  /** A goat stops to eat a ball; then says "meeh" and trots off. */
  | { type: 'goatEat'; x: number; y: number }
  | { type: 'goatMeeh'; x: number; y: number }
  /** Hall: a throw popped into dust; the jam went "pfft" (pushed: its next throw was put back). */
  | { type: 'fufuPop'; kind: ThrowKind; x: number; y: number }
  | { type: 'fufuJam'; pushed: boolean }
  /** Hall: the fufu bowl drops onto the floor (once per try). */
  | { type: 'fufuBowl'; x: number; y: number }
  /** S2.16 B1: a bird flies off (never hurt); a stomp pops kobo out of the pile. */
  | { type: 'birdOff'; kind: BirdKind; why: BirdWhy; x: number; y: number }
  | { type: 'pileKobo'; x: number; y: number }
  /** S2.16 B5: weeds dried by a fufu ball (first: the first in this play), or trampled by amala. */
  | { type: 'weedsDry'; x: number; first: boolean }
  | { type: 'weedsTrample'; x: number }
  /** S2.16 B4: the dash is turned on (save it), starts, ends, is ready again; a double tap while resting. */
  | { type: 'dashOn' }
  | { type: 'dashStart'; dir: -1 | 1 }
  | { type: 'dashEnd' }
  | { type: 'dashReady' }
  | { type: 'dashTired'; first: boolean }
  | CrateEvent
  | BossEvent;

/**
 * run: the street. bus: the street end (controls locked, getting on the bus). cleared: the
 * bus has gone. arena: the boss fight in a hall (S2.7), from the hall's start and through the
 * kind finish. won: General Go-Slow beaten (the Win screen). over: out of lives.
 * S2.5 well: wellDown (going down, controls locked, the street frozen), roomIn (the bucket
 * lands in the room), room (playing in the room), wellUp (going up the rope).
 */
export type RunPhase = 'run' | 'bus' | 'cleared' | 'arena' | 'won' | 'over' | 'wellDown' | 'roomIn' | 'room' | 'wellUp';

/** Phases spent below the street (the room shows). */
const BELOW: ReadonlySet<RunPhase> = new Set(['roomIn', 'room', 'wellUp']);

/** Who pressed jump: a finger id, or a key. The hold for higher belongs to the last presser. */
export type PressSource = string | number;

export interface Power {
  /** Steps of roasted corn left. */
  corn: number;
  /** Steps of amala left. */
  amala: number;
  shield: boolean;
}

/** How a run starts (all optional). */
export interface RunOptions {
  /** Gentle mode: 5 lives instead of 3, and on a street a pothole fall climbs out just before it (S2.13). */
  gentle?: boolean;
  /** Well rooms by file id. */
  rooms?: ReadonlyMap<string, RoomData>;
  /** The state already has a saved parcel: well rooms show kobo instead of the parcel (N2). */
  parcelSaved?: boolean;
  /**
   * A hall only: the state has a garri parcel, so this try starts with the shield on (S2.5 gift
   * rule 5, S2.7). Until N2 saves the parcel, the game passes the parcel carried off the bus.
   */
  parcel?: boolean;
  /** S2.16 B4: the dash is already turned on (saved after street 2's dash hint). */
  dash?: boolean;
}

export class Run {
  hero: Body;
  readonly maxLives: number;
  lives: number;
  /** Gentle mode (S2.10, S2.13 part 5). */
  readonly gentle: boolean;
  /** Reduced motion (set by the game): a Gentle mode climb-out has no dust off. */
  still = false;
  /** Steps of the Gentle mode "dust off" left: the controls are locked meanwhile (S2.13). */
  dustOff = 0;
  kobo = 0;
  phase: RunPhase = 'run';
  spawnX: number;
  checkpointReached = false;
  power: Power = { corn: 0, amala: 0, shield: false };
  /** Steps of blinking safety left. */
  safe = 0;
  /** Steps since the run started. */
  steps = 0;
  readonly coins: CoinState[];
  readonly foods: FoodState[];
  readonly hazards: HazardState[];
  /** Hanging crates (S2.4); none while the crates switch is off (features.ts). */
  readonly crates: CrateState[];
  /** The fight (halls only). */
  boss: BossFight | null = null;
  /**
   * The level's road and roofs, plus the boss's light platforms (solid all fight long). Its own
   * copy: a pothole plugged with fufu becomes road here for the rest of this play (S2.15).
   */
  terrain: Terrain;
  /** S2.15: pepper fufu balls held (0 to 16), and the balls thrown that are still about. */
  fufu = 0;
  balls: FufuBall[] = [];
  /** Potholes plugged in this play (they stay plugged after a lost life). */
  readonly plugged: Pit[] = [];
  /** Step of the last throw (the throw pose and the 0.25 s limit). */
  throwStep = -Infinity;
  /** The hall's fufu bowl has dropped in this try. */
  private bowlDropped = false;
  /** S2.16 B5: the gutters and their weeds in this play (dried or trampled weeds stay so after a lost life). */
  readonly gutters: GutterState[];
  /** S2.16 B4: a double tap and hold dashes (on from street 2's dash hint, saved). */
  dashOn: boolean;
  /** The "catch your breath" words showed in this play. */
  private tiredShown = false;
  /** Hints already shown in this play of the level (not again after a fall). */
  private readonly hintsShown = new Set<number>();
  /**
   * How much road the screen shows ahead of the hero (set by the game from the screen size).
   * Hazards wake at the larger of the level's wakeDistance and this + 40, so they always
   * start moving just off the right edge and are never seen standing still.
   * With no screen (unit tests), only the level's wakeDistance counts.
   */
  viewAhead = -Infinity;
  /**
   * The camera's edges, world x (set by the game each step on player-moved streets). Woken
   * hazards more than 200 u outside them are gone for good (S2.2). Unit tests: no limits.
   */
  viewLeft = -Infinity;
  viewRight = Infinity;
  /** Steps since the street end started (phase 'bus'). Seconds = endSteps / STEPS_PER_SECOND. */
  endSteps = 0;
  /** Where the hero's hop onto the bus starts. */
  private hopFrom = 0;
  /** Who started the jump that is held now. */
  private holdBy: PressSource | null = null;
  /** The direction the player holds, even while the controls are locked (walks on after a dust off). */
  private heldMove: -1 | 0 | 1 = 0;
  /**
   * S2.5: carrying the garri parcel. A lost life keeps it; game over, "Start again" or leaving
   * the street loses it (they make a new Run). Saving it for the state is piece N2's.
   */
  parcel = false;
  /** The well in use (going down, below, going up), or null on the street. */
  well: WellData | null = null;
  /** The room being visited (roomIn, room, wellUp), or null. */
  room: RoomPlay | null = null;
  /** Steps into the current well move (wellDown, roomIn, wellUp), or since arriving (room). */
  wellSteps = 0;
  /** Steps since the hero came back up (the fade from dark); large when not just up. */
  surfaceSteps = Infinity;
  /** Where the hero stood when going down started. */
  private wellFromX = 0;
  /** Rooms by file id (from the game); a well whose room is missing cannot be used. */
  private readonly rooms: ReadonlyMap<string, RoomData>;
  /** What each well's room holds in this play (by well index). */
  private readonly roomPlays = new Map<number, RoomPlay>();
  /** The state already has a saved parcel: rooms show kobo instead (N2 fills this from the save). */
  private readonly parcelSaved: boolean;
  /**
   * S2.5 gift rule 5 and S2.7 t = 0: this hall try starts with the garri shield on (the state
   * has a parcel). Set once at the start; never stacks, and a lost life does not bring it back.
   */
  readonly parcelShield: boolean;
  /** Events from Go down and Go up presses, sent with the next step. */
  private pending: RunEvent[] = [];

  constructor(
    readonly level: Level,
    opts: RunOptions = {},
  ) {
    this.rooms = opts.rooms ?? new Map();
    this.parcelSaved = opts.parcelSaved ?? false;
    this.gentle = opts.gentle ?? false;
    this.maxLives = this.gentle ? RULES.gentleLives : RULES.lives;
    this.lives = this.maxLives;
    this.spawnX = level.spawnX;
    this.terrain = { ...level.terrain, ground: [...level.terrain.ground], platforms: [...level.terrain.platforms, ...(level.boss?.lights ?? [])] };
    // S2.16 B4 Gentle mode: cement blocks in every dash gap make it two 100 u potholes.
    if (this.gentle && !level.hall) this.terrain.ground = withBlocks(level.ground).map(([x0, x1]) => ({ x0, x1 }));
    this.gutters = level.gutters.map((q) => ({ x: q.x, w: q.w, state: 'weeds', t: 0 }));
    this.dashOn = opts.dash ?? false;
    this.hero = this.newHero(level.spawnX);
    this.coins = level.coins.map((c) => ({ ...c, taken: false }));
    this.foods = level.foods.map((f) => ({ ...f, taken: false }));
    this.hazards = level.hazards.map((h) => freshHazard(h.kind, h.x, level.groundY));
    this.crates = featureOn('crates') ? freshCrates(level.crates) : [];
    this.parcelShield = level.hall !== null && (opts.parcel ?? false);
    if (level.hall && level.boss) {
      // S2.7: the fight starts at once, the hero inside by the left door, standing, facing right.
      this.phase = 'arena';
      this.checkpointReached = true;
      this.boss = new BossFight(level.boss, level.groundY);
      if (this.parcelShield) {
        this.power.shield = true; // one shield, never more (it is a yes or no, never a count)
        this.pending.push({ type: 'parcelShield' });
      } else {
        this.pending.push({ type: 'hallStart' });
      }
    }
  }

  /** A hall: the fight is the whole level (S2.7). */
  get inHall(): boolean {
    return this.level.hall !== null;
  }

  /** What well `i`'s room holds in this play (null before the first visit). For tests and drawing. */
  roomPlay(i: number): RoomPlay | null {
    return this.roomPlays.get(i) ?? null;
  }

  /** Seconds of play so far. */
  get time(): number {
    return this.steps / STEPS_PER_SECOND;
  }

  /**
   * The street, the well and its room, or the hall fight is being played: Pause (button, P,
   * Escape, app switch, phone upright) can open. Not in the bus finish, nor in the hall's kind
   * finish after the third hit (po M4: they do nothing in the finish), nor on any end card.
   */
  get inPlay(): boolean {
    if (this.phase === 'arena') return !this.boss?.defeated;
    return this.phase === 'run' || this.phase === 'wellDown' || this.phase === 'roomIn' || this.phase === 'room' || this.phase === 'wellUp';
  }

  press(by: PressSource = 'tap'): ReturnType<typeof press> {
    if (this.phase === 'arena' && this.boss?.defeated) return null; // the hero stands and watches the finish
    if (this.phase !== 'run' && this.phase !== 'arena' && this.phase !== 'room') return null;
    if (this.dustOff > 0) return null; // dusting off after a Gentle mode climb-out (S2.13)
    const out = press(this.hero);
    if (out) this.holdBy = by;
    return out;
  }

  /** A press ends. Only the one that started the jump ends the hold for higher. */
  release(by?: PressSource): void {
    if (by !== undefined && this.holdBy !== null && by !== this.holdBy) return;
    this.holdBy = null;
    release(this.hero);
  }

  /** The direction held on a player-moved street: -1 back, 0 none, 1 forward. */
  steer(move: -1 | 0 | 1): void {
    if (!this.hero.manual) return;
    this.heldMove = move;
    const free = (this.phase === 'run' && this.dustOff === 0) || this.phase === 'room' || (this.phase === 'arena' && !this.boss?.defeated);
    steer(this.hero, free ? move : 0);
  }

  /**
   * S2.16 B4: a double tap of a direction, still held. Dashes on a street (not the hall or a well
   * room) once the dash is on, on the ground or within coyote time, not on corn, not resting, not
   * while the controls are locked. Returns true when a dash started.
   */
  dash(dir: -1 | 1): boolean {
    const h = this.hero;
    if (!this.dashOn || this.phase !== 'run' || this.inHall || !h.manual || this.dustOff > 0) return false;
    if (this.power.corn > 0 || h.move !== dir) return false;
    if (resting(h)) {
      this.pending.push({ type: 'dashTired', first: !this.tiredShown });
      this.tiredShown = true;
      return false;
    }
    if (!startDash(h, dir)) return false;
    this.pending.push({ type: 'dashStart', dir });
    return true;
  }

  /** Dashing now (S2.16 B4). */
  get dashing(): boolean {
    return this.hero.dash > 0;
  }

  /** Catching breath after a dash. */
  get resting(): boolean {
    return resting(this.hero);
  }

  /** The direction held (player-moved streets). */
  get move(): -1 | 0 | 1 {
    return this.hero.move;
  }

  /** Walk and run speeds right now (corn changes both). */
  private gait(): Gait {
    const corn = this.power.corn > 0;
    return { walk: corn ? this.level.cornWalkSpeed : this.level.walkSpeed, run: corn ? this.level.cornSpeed : this.level.runSpeed };
  }

  /** One fixed step (dt is always 1/60 s). Returns what happened, for sounds and words. */
  step(dt: number): RunEvent[] {
    const ev: RunEvent[] = this.pending;
    this.pending = [];
    if (this.phase === 'arena') return this.arenaStep(dt, ev);
    if (this.phase === 'bus') return this.busStep(ev);
    if (this.phase === 'wellDown' || this.phase === 'roomIn' || this.phase === 'wellUp') return this.wellStep(ev);
    if (this.phase === 'room') return this.roomStep(dt, ev);
    if (this.phase !== 'run') return ev;
    this.steps++;
    if (this.dustOff > 0 && --this.dustOff === 0) steer(this.hero, this.heldMove); // controls back
    if (this.surfaceSteps < WELL_RULES.surfaceFadeSteps) this.surfaceSteps++;
    this.tickPower(ev);
    const h = this.hero;
    if (h.manual) h.gait = this.gait();
    else h.speed = this.power.corn > 0 ? this.level.cornSpeed : this.level.runSpeed;

    if (h.dash > 0 && this.power.corn > 0) endDash(h); // corn is faster already
    const dash0 = h.dash > 0;
    const rest0 = resting(h);
    step(h, this.terrain, dt);
    if (h.fallen) {
      this.fall(ev);
      return ev;
    }
    if (h.manual) this.walls();
    if (dash0 && h.dash === 0) ev.push({ type: 'dashEnd' });
    if (rest0 && !resting(h)) ev.push({ type: 'dashReady' });
    // S2.16 B4: reaching street 2's dash hint turns the dash on (the game saves it).
    const from = this.level.dashFrom;
    if (!this.dashOn && from !== null && h.x >= from) {
      this.dashOn = true;
      ev.push({ type: 'dashOn' });
    }
    if (this.crates.length > 0) {
      const out = stepCrates(this.crates, { hero: h, heroBox: this.heroBox(), heroH: RULES.heroH, amala: this.power.amala > 0, steps: this.steps, dt });
      this.kobo += out.kobo;
      ev.push(...out.events);
    }

    const end = this.level.end;
    if (end && h.grounded && h.x >= end.x) {
      // S2.6 street end: controls lock, nothing can hurt now.
      this.phase = 'bus';
      this.endSteps = 0;
      this.hopFrom = h.x;
      steer(h, 0);
      release(h);
      this.balls = []; // gone at the bus
      ev.push({ type: 'busBoard' });
      return ev;
    }

    if (!this.checkpointReached && h.x >= this.level.checkpoint) {
      this.checkpointReached = true;
      this.spawnX = this.level.checkpoint;
      ev.push({ type: 'checkpoint' });
    }
    this.level.hints.forEach((hint, i) => {
      if (!featureOn(hint.needs)) return; // about a piece not built yet (features.ts)
      // A hint at or before the spawn (player-moved streets) shows 0.5 s after the start.
      const atStart = h.manual && hint.x <= this.level.spawnX;
      const due = atStart ? this.steps >= RULES.firstHintSteps : h.x >= hint.x;
      if (due && !this.hintsShown.has(i)) {
        this.hintsShown.add(i);
        // Gentle mode: "Now you start here" is not true at the bus stop any more (S2.13).
        ev.push({ type: 'hint', words: (this.gentle && GENTLE_HINTS[hint.words]) || hint.words });
      }
    });

    this.pickUps(ev);
    this.moveHazards(dt, ev);
    this.stepBalls(dt, ev);
    this.touchHazards(ev);
    this.touchWeeds(ev);
    if (this.safe > 0) this.safe--;
    return ev;
  }

  // ---------- The well and its room (S2.5) ----------

  /** The entrance well the hero stands at now (Go down shows), or null. */
  get wellHere(): WellData | null {
    if (this.phase !== 'run' || !featureOn('wells') || !this.hero.manual || !this.hero.grounded) return null;
    for (const w of this.level.wells) {
      if (Math.abs(this.hero.x - w.x) <= WELL_RULES.reach && this.rooms.has(w.room)) return w;
    }
    return null;
  }

  /** On the room's floor under the rope (Go up shows). */
  get underRope(): boolean {
    const r = this.room;
    const h = this.hero;
    return this.phase === 'room' && r !== null && h.grounded && h.on === null && Math.abs(h.x - r.room.exitX) <= WELL_RULES.reach;
  }

  /** Below the street: the room shows (arriving, playing, going up). */
  get below(): boolean {
    return BELOW.has(this.phase);
  }

  /**
   * Go down (button, or Down, S, Enter, E). The controls lock, the street freezes as it is.
   * Returns false (and does nothing) when the hero is not standing at an entrance well.
   */
  goDown(): boolean {
    const w = this.wellHere;
    if (!w) return false;
    const h = this.hero;
    this.well = w;
    this.wellFromX = h.x;
    this.wellSteps = 0;
    this.phase = 'wellDown';
    this.balls = [];
    this.lockHero(h);
    this.pending.push({ type: 'wellDown', x: w.x });
    return true;
  }

  /** Go up (button, or Enter, E). Returns false when the hero is not on the floor under the rope. */
  goUp(): boolean {
    if (!this.underRope) return false;
    this.wellSteps = 0;
    this.phase = 'wellUp';
    this.wellFromX = this.hero.x;
    this.lockHero(this.hero);
    this.pending.push({ type: 'wellUp' });
    return true;
  }

  /** Controls lock: no direction, the jump hold ends, standing still. */
  private lockHero(h: Body): void {
    steer(h, 0);
    release(h);
    this.holdBy = null;
    halt(h);
  }

  /** 0 to 1: how dark the screen is (going down or up, arriving, back on the street). */
  get fade(): number {
    const t = this.wellSteps / STEPS_PER_SECOND;
    switch (this.phase) {
      case 'wellDown':
        return wellDownAt(t).fade;
      case 'roomIn':
        return Math.max(0, 1 - this.wellSteps / WELL_RULES.arriveFadeSteps);
      case 'wellUp':
        return wellUpAt(t).fade;
      case 'run':
        return this.surfaceSteps < WELL_RULES.surfaceFadeSteps ? 1 - this.surfaceSteps / WELL_RULES.surfaceFadeSteps : 0;
      default:
        return 0;
    }
  }

  /** Going down, arriving, or going up: the hero is moved along the timeline, nothing else moves. */
  private wellStep(ev: RunEvent[]): RunEvent[] {
    this.wellSteps++;
    const h = this.hero;
    const t = this.wellSteps / STEPS_PER_SECOND;
    if (this.phase === 'wellDown') {
      const w = this.well!;
      const m = wellDownAt(t);
      h.x = this.wellFromX + (w.x - this.wellFromX) * m.toRope;
      h.y = this.level.groundY + m.heroDy;
      h.grounded = true;
      if (this.wellSteps >= WELL_RULES.downSteps) this.enterRoom(ev);
    } else if (this.phase === 'roomIn') {
      const room = this.room!.room;
      const k = Math.min(1, this.wellSteps / WELL_RULES.arriveSteps);
      h.x = room.entryX;
      h.y = room.groundY - WELL_RULES.arriveDrop * (1 - k);
      if (this.wellSteps >= WELL_RULES.arriveSteps) {
        // The hero steps off the bucket, facing right, standing still.
        h.y = room.groundY;
        h.prevY = h.y;
        h.dir = 1;
        this.phase = 'room';
        this.wellSteps = 0;
      }
    } else {
      const room = this.room!.room;
      const m = wellUpAt(t);
      h.x = this.wellFromX + (room.exitX - this.wellFromX) * Math.min(1, t / 0.2);
      h.y = room.groundY + m.heroDy;
      if (this.wellSteps >= WELL_RULES.upSteps) this.surface(ev);
    }
    return ev;
  }

  /** At the bottom: into the well's room (fresh, or as this play left it). */
  private enterRoom(ev: RunEvent[]): void {
    const w = this.well!;
    const i = this.level.wells.indexOf(w);
    let play = this.roomPlays.get(i);
    if (!play) {
      play = freshRoom(this.rooms.get(w.room)!, this.parcelSaved);
      this.roomPlays.set(i, play);
    }
    this.room = play;
    const room = play.room;
    const h = createWalker(room.entryX, room.terrain, this.gait());
    h.down = false;
    h.y = room.groundY - WELL_RULES.arriveDrop;
    h.prevY = h.y;
    this.hero = h;
    this.phase = 'roomIn';
    this.wellSteps = 0;
    ev.push({ type: 'room' });
  }

  /** One step in the room: walk, jump, shelves, kobo, the crate, the gift. No hazards, no timers. */
  private roomStep(dt: number, ev: RunEvent[]): RunEvent[] {
    this.steps++;
    this.wellSteps++;
    const play = this.room!;
    const room = play.room;
    const h = this.hero;
    h.gait = this.gait(); // corn still makes the hero quicker; its timer is paused below
    step(h, room.terrain, dt);
    if (h.fallen) {
      // The floor runs wall to wall, so this cannot happen; if it ever did, stand at the bucket.
      this.hero = createWalker(room.entryX, room.terrain, this.gait());
      return ev;
    }
    const { lo, hi } = roomWalls(room);
    if (h.x < lo || h.x > hi) {
      h.x = Math.min(Math.max(h.x, lo), hi);
      halt(h);
    }
    if (play.crates.length > 0) {
      const out = stepCrates(play.crates, { hero: h, heroBox: this.heroBox(), heroH: RULES.heroH, amala: this.power.amala > 0, steps: this.steps, dt });
      this.kobo += out.kobo;
      ev.push(...out.events);
    }
    const box = this.heroBox();
    for (const c of play.coins) {
      if (c.taken || c.x + 8 < box.l || c.x - 8 > box.r || c.y + 10 < box.t || c.y - 10 > box.b) continue;
      c.taken = true;
      this.kobo++;
      ev.push({ type: 'kobo', x: c.x, y: c.y });
    }
    const g = play.gift;
    if (g && !g.taken && g.x + 14 >= box.l && g.x - 14 <= box.r && g.y + 14 >= box.t && g.y - 14 <= box.b) {
      g.taken = true;
      this.parcel = true; // never more than one: a second parcel adds nothing
      ev.push({ type: 'parcel', x: g.x, y: g.y });
    }
    if (this.safe > 0) this.safe--;
    return ev;
  }

  /** At the top of the rope: out at the exit well, safe for a moment, the hazards near it gone. */
  private surface(ev: RunEvent[]): void {
    const w = this.well!;
    const x = w.exitX + WELL_RULES.exitStep;
    this.hero = this.newHero(x); // standing, facing right
    this.room = null;
    this.well = null;
    this.phase = 'run';
    this.wellSteps = 0;
    this.surfaceSteps = 0;
    this.safe = WELL_RULES.surfaceSafeSteps;
    for (const z of this.hazards) {
      const woken = z.mode === 'move' || z.mode === 'runAway' || z.mode === 'falling';
      if (woken && Math.abs(z.x - w.exitX) <= WELL_RULES.clearRadius) z.mode = 'gone';
    }
    // Hints about the street the hero went under stay quiet (they would hide "Back on the street!").
    this.level.hints.forEach((hint, i) => {
      if (hint.x > w.x && hint.x <= x) this.hintsShown.add(i);
    });
    ev.push({ type: 'wellBack', x: w.exitX });
  }

  /** The hero stays inside the start fence and the end wall (a hall: its left wall and the cone line); bumping one stops dead. */
  private walls(): void {
    const h = this.hero;
    const hall = this.level.hall;
    const lo = hall ? hall.leftLimit : this.level.startWall + RULES.wallGap;
    const hi = hall ? hall.rightLimit : (this.level.end?.wall ?? Infinity) - RULES.wallGap;
    if (h.x < lo || h.x > hi) {
      h.x = Math.min(Math.max(h.x, lo), hi);
      halt(h);
    }
  }

  /** The street end: the hero hops onto the bus, the bus pulls away, the street is cleared. */
  private busStep(ev: RunEvent[]): RunEvent[] {
    this.steps++;
    this.endSteps++;
    const h = this.hero;
    const end = this.level.end!;
    const inAt = RULES.doorSteps + RULES.hopSteps;
    if (this.endSteps > RULES.doorSteps && this.endSteps <= inAt) {
      // Into the open door: a small hop from where the feet touched to the door.
      const k = (this.endSteps - RULES.doorSteps) / RULES.hopSteps;
      h.x = this.hopFrom + (end.x + 10 - this.hopFrom) * k;
      h.y = this.level.groundY - Math.sin(k * Math.PI) * 18;
      h.grounded = k >= 1;
      halt(h);
    }
    if (this.endSteps === inAt) ev.push({ type: 'busGo' });
    if (this.endSteps === RULES.clearedSteps) {
      this.phase = 'cleared';
      ev.push({ type: 'streetCleared' });
    }
    return ev;
  }

  /** 0 to 1: how far the hazards have faded at the street end. */
  get hazardFade(): number {
    return this.phase === 'bus' || this.phase === 'cleared' ? Math.min(1, this.endSteps / RULES.fadeSteps) : 0;
  }

  /** The hero is on the bus (hidden). */
  get boarded(): boolean {
    return (this.phase === 'bus' || this.phase === 'cleared') && this.endSteps >= RULES.doorSteps + RULES.hopSteps;
  }

  /** How far the bus has pulled away to the right, u. */
  get busGone(): number {
    if (this.phase !== 'bus' && this.phase !== 'cleared') return 0;
    const t = Math.max(0, this.endSteps - RULES.doorSteps - RULES.hopSteps) / STEPS_PER_SECOND;
    return 0.5 * RULES.busAccel * t * t;
  }

  /**
   * One step of the hall fight (S2.7): the player moves the hero between the hall's limits,
   * lands on the lit light, and keeps clear of the throws. From the third hit the hero stands
   * still and cannot be hurt while the kind finish plays.
   */
  private arenaStep(dt: number, ev: RunEvent[]): RunEvent[] {
    const boss = this.boss!;
    this.steps++;
    if (this.parcelShield && this.steps === RULES.parcelWordsSteps) ev.push({ type: 'hallStart' });
    this.tickPower(ev);
    const h = this.hero;
    if (boss.defeated) {
      // Stands and watches: no direction, no jump hold, standing still once down.
      steer(h, 0);
      if (h.grounded) halt(h);
    }
    h.gait = this.gait();
    const wasGrounded = h.grounded;
    step(h, this.terrain, dt);
    this.walls();
    if (h.grounded && !wasGrounded) {
      const hit = boss.landedOn(h.on);
      if (hit.length > 0) {
        bounce(h); // off the light, second jump still there
        ev.push(...hit);
      }
    }
    const bossEv = boss.step(dt);
    ev.push(...bossEv);
    if (boss.defeated) {
      this.balls = [];
      if (ev.some((e) => e.type === 'win')) this.phase = 'won';
      return ev;
    }
    // S2.15: the fufu bowl drops onto the floor when the break after its hit ends (once per try).
    const f = this.level.boss?.fufu;
    if (f && !this.bowlDropped && bossEv.some((e) => e.type === 'bossPhase' && e.phase === f.afterHit)) {
      this.bowlDropped = true;
      const food: FoodState = { x: f.x, y: this.level.groundY - 28, kind: 'fufu', taken: false };
      this.foods.push(food);
      ev.push({ type: 'fufuBowl', x: food.x, y: food.y });
    }
    this.pickFoods(ev);
    this.stepBalls(dt, ev);
    this.touchThrows(boss, ev);
    if (this.safe > 0) this.safe--;
    return ev;
  }

  private touchThrows(boss: BossFight, ev: RunEvent[]): void {
    const h = this.hero;
    const box = this.heroBox();
    for (const t of [...boss.throws]) {
      const tb = throwBox(t);
      if (box.r < tb.l || box.l > tb.r || box.b < tb.t || box.t > tb.b) continue;
      if (t.kind === 'tyre' && h.vy > 0 && h.prevY <= tb.t + RULES.stompSlack) {
        bounce(h);
        h.y = Math.min(h.y, tb.t);
        boss.remove(t);
        ev.push({ type: 'bounce', kind: 'tyre', x: t.x, y: tb.t });
      } else if (this.power.amala > 0) {
        // Smashed (never counts as a hit on the boss, Q6). No amala in the hall (S2.7); kept for safety.
        boss.remove(t);
        this.kobo += RULES.smashKobo;
        ev.push({ type: 'smash', kind: t.kind === 'tyre' ? 'tyre' : 'honk', x: t.x, y: tb.t });
      } else {
        this.hurt(ev);
      }
    }
  }

  private newHero(x: number): Body {
    if (this.level.manual) return createWalker(x, this.terrain, { walk: this.level.walkSpeed, run: this.level.runSpeed });
    const b = createBody(x, this.terrain);
    b.speed = this.level.runSpeed;
    return b;
  }

  private tickPower(ev: RunEvent[]): void {
    for (const kind of ['corn', 'amala'] as const) {
      const left = this.power[kind];
      if (left <= 0) continue;
      const now = left - 1;
      this.power[kind] = now;
      if (now === RULES.warnSteps) ev.push({ type: 'wearingOff', kind });
      if (now > 0 && now <= RULES.warnSteps && now % STEPS_PER_SECOND === 0) ev.push({ type: 'tick' });
      if (now === 0) ev.push({ type: 'powerEnd', kind });
    }
  }

  private heroBox(): { l: number; r: number; t: number; b: number } {
    const h = this.hero;
    return { l: h.x - RULES.heroHalfW, r: h.x + RULES.heroHalfW, t: h.y - RULES.heroH, b: h.y };
  }

  private pickUps(ev: RunEvent[]): void {
    const box = this.heroBox();
    for (const c of this.coins) {
      if (c.taken || c.x + 8 < box.l || c.x - 8 > box.r) continue;
      if (c.y + 10 >= box.t && c.y - 10 <= box.b) {
        c.taken = true;
        this.kobo++;
        ev.push({ type: 'kobo', x: c.x, y: c.y });
      }
    }
    this.pickFoods(ev);
  }

  /** Foods on the road (and out of crates) the hero touches. */
  private pickFoods(ev: RunEvent[]): void {
    const box = this.heroBox();
    const crateFoods = this.crates.flatMap((c) => (c.food ? [c.food] : []));
    for (const f of [...this.foods, ...crateFoods]) {
      if (f.taken || f.x + 14 < box.l || f.x - 14 > box.r) continue;
      if (f.y + 14 >= box.t && f.y - 14 <= box.b) {
        f.taken = true;
        if (f.kind === 'corn') this.power.corn = RULES.cornSteps;
        else if (f.kind === 'amala') this.power.amala = RULES.amalaSteps;
        else if (f.kind === 'fufu') this.fufu = Math.min(FUFU_RULES.max, this.fufu + FUFU_RULES.give);
        else this.power.shield = true; // a second garri while shielded gives nothing extra
        ev.push({ type: 'food', kind: f.kind, x: f.x, y: f.y });
      }
    }
  }

  // ---------- Pepper fufu (S2.15) ----------

  /** Throw can be pressed now: balls held, in play, not dusting off. */
  get canThrow(): boolean {
    if (this.fufu <= 0 || this.dustOff > 0) return false;
    return this.phase === 'run' || (this.phase === 'arena' && !this.boss?.defeated);
  }

  /**
   * Throw (button or X): one ball the way the hero faces. Nothing with no balls, within 0.25 s of
   * the last throw, or with 3 balls already out. Returns true when a ball was thrown.
   */
  throwFufu(): boolean {
    if (!this.canThrow) return false;
    if (this.steps - this.throwStep < FUFU_RULES.coolSteps) return false;
    if (ballsOut(this.balls) >= FUFU_RULES.maxOut) return false;
    const b = tossBall(this.hero);
    this.balls.push(b);
    this.fufu--;
    this.throwStep = this.steps;
    this.pending.push({ type: 'fufuToss', x: b.x, y: b.y });
    return true;
  }

  /** Seconds since the last throw (the throw pose). */
  get throwAge(): number {
    return (this.steps - this.throwStep) / STEPS_PER_SECOND;
  }

  /** Moves every ball one step and does what they meet (S2.15 "What a ball does"). */
  private stepBalls(dt: number, ev: RunEvent[]): void {
    if (this.balls.length === 0) return;
    const boss = this.boss;
    const hall = this.level.hall;
    const end = this.level.end;
    const throws = boss ? boss.throws.map((t) => ({ box: throwBox(t), t })) : [];
    const world: BallWorld = {
      terrain: this.terrain,
      groundY: this.level.groundY,
      pits: pitsOf(this.level.ground).filter((p) => !this.plugged.some((q) => q.a === p.a)),
      hazards: this.hazards,
      hazardBox: HAZARD_BOX,
      crates: this.crates.map((c) => ({ l: c.x - CRATE_RULES.halfW, r: c.x + CRATE_RULES.halfW, t: c.bottomY - CRATE_RULES.h, b: c.bottomY })),
      throws,
      jamX: boss ? boss.data.throwX : null,
      left: hall ? (boss?.data.drainX ?? 0) : Math.max(this.viewLeft - FUFU_RULES.offScreen, this.level.startWall),
      right: hall ? Infinity : Math.min(this.viewRight + FUFU_RULES.offScreen, end ? end.x : Infinity),
      heroX: this.hero.x,
      weeds: this.gutters.flatMap((q, i) => (q.state === 'weeds' ? [{ i, x: q.x, w: q.w }] : [])),
    };
    for (const b of this.balls) {
      for (const e of stepBall(b, world, dt)) {
        switch (e.type) {
          case 'fufuPlug': {
            const { a, b: pb } = e.pit;
            this.plugged.push(e.pit);
            this.terrain = { ...this.terrain, ground: [...this.terrain.ground, { x0: a, x1: pb }] };
            world.terrain = this.terrain;
            world.pits = world.pits.filter((p) => p.a !== a);
            ev.push({ type: 'fufuPlug', x: e.x, a, b: pb, first: this.plugged.length === 1 });
            break;
          }
          case 'fufuKnock': {
            const z = e.target as HazardState;
            z.mode = 'knocked';
            z.t = 0;
            this.kobo += FUFU_RULES.knockKobo;
            ev.push({ type: 'fufuKnock', kind: z.kind, x: z.x, y: z.y });
            break;
          }
          case 'fufuGoat': {
            const z = e.target as HazardState;
            z.mode = 'eat';
            z.t = 0;
            z.face = e.x > z.x ? 1 : -1;
            ev.push({ type: 'goatEat', x: z.x, y: z.y });
            break;
          }
          case 'fufuBird': {
            const z = e.target as HazardState;
            z.fufu = true;
            this.flyOff(z, 'fufu', ev);
            break;
          }
          case 'fufuWeeds': {
            const q = this.gutters[e.i]!;
            q.state = 'drying';
            q.t = 0;
            world.weeds = world.weeds!.filter((w) => w.i !== e.i);
            const first = !this.gutters.some((o) => o !== q && (o.state === 'drying' || o.state === 'dry'));
            ev.push({ type: 'weedsDry', x: e.x, first });
            break;
          }
          case 'fufuPop': {
            const t = throws[e.index]!.t;
            boss!.remove(t);
            const y = t.kind === 'tyre' ? t.y - 11 : t.y;
            ev.push({ type: 'dust', x: t.x, y }, { type: 'fufuPop', kind: t.kind, x: t.x, y });
            break;
          }
          case 'fufuJam':
            ev.push({ type: 'fufuJam', pushed: boss!.pushJam() });
            break;
          default:
            ev.push(e);
        }
      }
    }
    this.balls = this.balls.filter((b) => b.mode !== 'gone');
  }

  private moveHazards(dt: number, ev: RunEvent[]): void {
    const { hazardSpeeds, groundY } = this.level;
    const terrain = this.terrain; // plugged potholes are road (S2.15)
    const heroX = this.hero.x;
    // Player-moved: the road the camera shows ahead of the hero right now (S2.2).
    const ahead = this.hero.manual ? this.viewRight - heroX : this.viewAhead;
    const wakeDistance = Math.max(this.level.wakeDistance, ahead + 40);
    for (const z of this.hazards) {
      if (this.hero.manual && z.mode !== 'wait' && z.mode !== 'gone') {
        // Woken hazards well off either edge of the screen are gone for good this play.
        if (z.x < this.viewLeft - RULES.leaveDistance || z.x > this.viewRight + RULES.leaveDistance) {
          z.mode = 'gone';
          continue;
        }
      }
      switch (z.mode) {
        case 'wait':
          if (z.x - heroX <= wakeDistance) {
            z.mode = 'move';
            z.vx = -speedOf(hazardSpeeds, z.kind); // towards the hero (an egret pecks first)
            if (z.kind === 'egret') z.t = RULES.egretPeckSteps;
            ev.push({ type: 'wake', kind: z.kind, x: z.x }); // the drum's "dum" (K1)
          }
          break;
        case 'move': {
          const nx = z.x + z.vx * dt;
          if (z.kind === 'goat') {
            // Goats turn back at pothole edges (they never fall in).
            const front = nx + Math.sign(z.vx) * HAZARD_BOX.goat.halfW;
            // S2.16 B5: they turn back at a gutter's edge too.
            if (!groundAt(terrain, front) || this.gutters.some((q) => front >= q.x && front <= q.x + q.w)) z.vx = -z.vx;
            else z.x = nx;
          } else if (z.kind === 'egret') {
            this.paceEgret(z, dt);
          } else if (z.kind === 'crow') {
            // Hovers in place over the pile: the box never moves.
          } else {
            z.x = nx;
            z.rot += (z.vx * dt) / 11;
            if (!groundAt(terrain, z.x)) z.mode = 'falling';
          }
          break;
        }
        case 'falling':
          z.x += z.vx * dt * 0.5;
          z.y += RULES.tyreFallSpeed * dt;
          if (z.y > groundY + 120) z.mode = 'gone';
          break;
        case 'runAway':
          z.x += RULES.goatRunAwaySpeed * dt;
          if (++z.t > RULES.goatRunAwaySteps) z.mode = 'gone';
          break;
        case 'eat':
          // S2.15: chews the fufu ball, says "meeh", then trots off as built (never hurt).
          if (++z.t >= FUFU_RULES.eatSteps) {
            z.mode = 'runAway';
            z.t = 0;
            ev.push({ type: 'goatMeeh', x: z.x, y: z.y });
          }
          break;
        case 'knocked':
          if (++z.t >= FUFU_RULES.knockSteps) z.mode = 'gone';
          break;
        case 'flyOff': {
          // Up and to the right at 45 degrees; it has no box now and can hurt no one.
          const v = (RULES.birdFlySpeed * dt) / Math.SQRT2;
          z.x += v;
          z.y -= v;
          if (++z.t >= RULES.birdFlySteps) z.mode = 'gone';
          break;
        }
        case 'gone':
          break;
      }
    }
  }

  private touchHazards(ev: RunEvent[]): void {
    const h = this.hero;
    const box = this.heroBox();
    for (const z of this.hazards) {
      if (z.mode !== 'wait' && z.mode !== 'move') continue;
      const size = HAZARD_BOX[z.kind];
      const top = z.y - size.h;
      if (box.r < z.x - size.halfW || box.l > z.x + size.halfW || box.b < top || box.t > z.y) continue;

      if (isBird(z.kind)) {
        this.touchBird(z, top, ev);
        continue;
      }
      if (h.vy > 0 && h.prevY <= top + RULES.stompSlack) {
        // Landed on it: bounce. The goat runs off unhurt; the tyre is knocked away.
        bounce(h);
        h.y = Math.min(h.y, top);
        this.knockAway(z);
        ev.push({ type: 'bounce', kind: z.kind, x: z.x, y: top });
      } else if (this.power.amala > 0) {
        this.knockAway(z);
        this.kobo += RULES.smashKobo;
        ev.push({ type: 'smash', kind: z.kind, x: z.x, y: top });
      } else {
        this.hurt(ev);
      }
    }
  }

  /**
   * S2.16 B1: a bird met. Landed on: a small bounce and 2 kobo from the pile. The tech suit or
   * amala: it gets a fright (no hit; birds never break the suit). Else a life is lost, like a
   * goat. Every way, it flies off, fine.
   */
  private touchBird(z: HazardState, top: number, ev: RunEvent[]): void {
    const h = this.hero;
    if (h.vy > 0 && h.prevY <= top + RULES.stompSlack) {
      bounce(h);
      h.vy = RULES.birdBounceVy;
      h.y = Math.min(h.y, top);
      this.kobo += RULES.birdKobo;
      const pile = this.level.piles.find((x) => Math.abs(x - z.x0) <= 60) ?? z.x0;
      this.flyOff(z, 'stomp', ev);
      ev.push({ type: 'pileKobo', x: pile, y: this.level.groundY });
    } else if (this.power.shield) {
      this.flyOff(z, 'suit', ev);
    } else if (this.power.amala > 0) {
      this.flyOff(z, 'amala', ev);
    } else {
      this.flyOff(z, 'touch', ev);
      this.hurt(ev);
    }
  }

  private flyOff(z: HazardState, why: BirdWhy, ev: RunEvent[]): void {
    z.mode = 'flyOff';
    z.t = 0;
    ev.push({ type: 'birdOff', kind: z.kind as BirdKind, why, x: z.x, y: z.y });
  }

  /**
   * S2.16 B1: the egret pecks, then hops to the other end of its patch (x0 - 20 to x0 + 20) at
   * 30 u/s, and back. One that would come within 30 u of a pit lip turns back.
   */
  private paceEgret(z: HazardState, dt: number): void {
    if (z.t > 0) {
      z.t--;
      return;
    }
    const nx = z.x + z.vx * dt;
    const P = RULES.egretPatch;
    const reach = nx + Math.sign(z.vx) * (HAZARD_BOX.egret.halfW + RULES.egretPitGap);
    if (nx < z.x0 - P || nx > z.x0 + P || !groundAt(this.level.terrain, reach)) {
      z.vx = -z.vx;
      z.t = RULES.egretPeckSteps;
    } else z.x = nx;
  }

  /**
   * S2.16 B5: thorny weeds touched (the hero's box in the weed box, 18 u tall). Amala tramples them
   * flat for the rest of the play; else they cost a life, or the tech suit. Never a bounce.
   */
  private touchWeeds(ev: RunEvent[]): void {
    const box = this.heroBox();
    const top = this.level.groundY - RULES.weedH;
    for (const q of this.gutters) {
      if (q.state === 'drying' && ++q.t >= RULES.weedDrySteps) q.state = 'dry';
      if (q.state !== 'weeds' || box.r <= q.x || box.l >= q.x + q.w || box.b <= top) continue;
      if (this.power.amala > 0) {
        q.state = 'trampled';
        ev.push({ type: 'weedsTrample', x: q.x + q.w / 2 });
      } else this.hurt(ev);
    }
  }

  private knockAway(z: HazardState): void {
    if (z.kind === 'goat') {
      z.mode = 'runAway';
      z.t = 0;
    } else {
      z.mode = 'gone';
    }
  }

  private hurt(ev: RunEvent[]): void {
    if (this.safe > 0) return;
    if (this.power.shield) {
      this.power.shield = false;
      this.safe = RULES.shieldSafeSteps;
      ev.push({ type: 'shieldPop' });
      return;
    }
    this.lives--;
    this.safe = RULES.hurtSafeSteps;
    this.fufu = 0; // S2.15: a lost life takes every ball held
    if (this.hero.dash > 0) endDash(this.hero); // S2.16 B4: a lost life ends the dash
    ev.push({ type: 'hit' });
    if (this.lives <= 0) this.gameOver(ev);
  }

  private fall(ev: RunEvent[]): void {
    this.lives--;
    ev.push({ type: 'fall' });
    // Food effects end on every fall, the last one too (so the HUD never shows a food at 0 lives).
    this.power = { corn: 0, amala: 0, shield: false };
    this.safe = 0;
    this.fufu = 0;
    this.balls = [];
    if (this.lives <= 0) {
      this.gameOver(ev);
      return;
    }
    // Start again at the bus stop (or the start); in Gentle mode on a street, just before the
    // pit (S2.13 part 5). Food effects end; foods and hazards at or past the restart point come
    // back; kobo already taken stay taken and counted.
    const pit = this.gentle && !this.inHall && this.hero.manual ? this.pitAt(this.hero.x) : null;
    // S2.16 B4: with the blocks, each half of a dash gap is a pothole of its own.
    const x = pit ? climbOutX(withBlocks(this.level.ground), pit, this.spawnX) : this.spawnX;
    const { down, move } = this.hero;
    this.hero = this.newHero(x);
    this.hero.down = down;
    if (pit) {
      // Facing right, still, blinking: nothing that comes back can hit the hero as they arrive.
      this.safe = RULES.climbSafeSteps;
      this.dustOff = this.still ? 0 : RULES.dustOffSteps;
      ev.push({ type: 'climbOut', kind: pitKind(pit), x });
    }
    // Facing right, standing still; a direction still held walks on from here (run timer at 0).
    if (this.dustOff === 0) this.hero.move = move;
    for (const f of this.foods) if (f.x >= x) f.taken = false;
    refillCrates(this.crates, x);
    this.hazards.forEach((z, i) => {
      if (z.x0 >= x) this.hazards[i] = freshHazard(z.kind, z.x0, this.level.groundY);
    });
  }

  /** The pit the hero fell in: the one under x, else the nearest one. Null if the road has none. */
  private pitAt(x: number): Pit | null {
    let best: Pit | null = null;
    let bestD = Infinity;
    for (const p of pitsOf(this.gentle ? withBlocks(this.level.ground) : this.level.ground)) {
      if (this.plugged.some((q) => q.a === p.a)) continue; // a plugged pothole is road
      const d = x < p.a ? p.a - x : x > p.b ? x - p.b : 0;
      if (d < bestD) [best, bestD] = [p, d];
    }
    return best;
  }

  private gameOver(ev: RunEvent[]): void {
    this.lives = 0;
    // Food effects end on every game over, a hit or a fall (the HUD never shows a food at 0 lives).
    this.power = { corn: 0, amala: 0, shield: false };
    this.fufu = 0;
    this.phase = 'over';
    ev.push({ type: 'gameOver' });
  }
}

function freshHazard(kind: HazardKind, x: number, groundY: number): HazardState {
  return { kind, x0: x, x, y: kind === 'crow' ? groundY - CROW_ABOVE : groundY, vx: 0, mode: 'wait', t: 0, rot: 0, face: -1, fufu: false };
}

/** How fast a hazard moves when woken (the egret's pacing; the crow hovers). */
function speedOf(speeds: Level['hazardSpeeds'], kind: HazardKind): number {
  if (kind === 'egret') return speeds.egret ?? EGRET_SPEED;
  if (kind === 'crow') return 0;
  return speeds[kind];
}

/**
 * S2.13 part 5: where Gentle mode puts the hero after falling in `pit`: 100 u before its left
 * lip (160 u for a big pit, its run-up). Never behind `normal` (the bus stop once reached,
 * else the start). A point without 20 u of solid road on each side moves to the middle of the
 * road span that ends at the pit's lip.
 */
export function climbOutX(ground: Level['ground'], pit: Pit, normal: number): number {
  const x = pit.a - (pit.w >= BIG_PIT ? RULES.climbBeforeBig : RULES.climbBefore);
  if (x < normal) return normal;
  const r = RULES.climbRoad;
  if (ground.some(([a, b]) => x - r >= a && x + r <= b)) return x;
  const span = ground.find(([, b]) => b === pit.a);
  return span ? Math.max(normal, (span[0] + span[1]) / 2) : normal;
}
