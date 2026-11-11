/**
 * The game on screen: one Run of a level (the rules, in run.ts), the camera, and drawing
 * with the art in src/art/. Background layers draw in screen space with parallax; the
 * road, stalls, pickups, hazards and hero draw in world space (art "space rule").
 */
import { drawBackdrop, drawThemeStall } from '../art/backdrop';
import { drawBoss, drawDustPop, drawGoLight, drawHighHonk, drawHitCounter, drawHonkCloud, type GoLightState } from '../art/boss';
import { drawHall, drawHallCones, drawHallFront, hallDoors, hallFinishAt } from '../art/hall';
import { crateAngle, crateLineY, drawCrate, drawCrateLine, koboFanAt, koboFlyAt } from '../art/crate';
import { drawDrum, drawDrumSmash, drawDrumSparkle } from '../art/drum';
import { drawHero, drawSuitBits, STRONG, SUIT, WALK_STRIDE, type HeroLook, type HeroPose } from '../art/hero';
import { drawCrow, drawEgret, drawPileKoboPop, drawRubbishPile, type BirdMode } from '../art/birds';
import { drawCementBlocks, drawGutter, drawWeeds, drawWeedSteam } from '../art/gutter';
import { drawDustRing, drawStepThump } from '../art/dust';
import { drawDashSign, drawPotholeSign } from '../art/sign';
import { drawGoat, drawGoatEating, drawTyre } from '../art/hazards';
import { drawFufuBall, drawFufuPlug, drawFufuSettle, drawFufuSteamPuff, drawTyreKnocked, drawDrumKnocked, FUFU } from '../art/fufu';
import { THROW_TIME } from '../art/hero';
import { FUFU_RULES, type FufuBall } from './fufu';
import { drawFood, drawKobo, drawSparkle } from '../art/items';
import { busEndAt, drawBigPitCones, drawBusPark, drawEndBus, drawEndBusInside, drawPavement, drawStartFence, END_BUS_BACK, END_BUS_FRONT } from '../art/roadside';
import { drawBusStop, drawRoad } from '../art/street';
import { clipWellMouth, drawFade, drawWell, drawWellBack, drawWellFront, wellDownAt } from '../art/well';
import { drawGarriParcel, drawRoomRope, drawShelf, drawWellRoom, ROOM_ROPE_BUCKET_Y } from '../art/wellRoom';
import { STRIP_Y, type View } from '../engine/view';
import { Camera, heroScreenX } from './camera';
import { CRATE_RULES, type CrateState } from './crates';
import { featureOn } from './features';
import type { Level, WellData } from './level';
import { BIG_PIT, gentleBlocks, roadSigns } from './pits';
import { HAZARD_BOX, RULES, Run, STEPS_PER_SECOND, type HazardState, type RunEvent, type RunOptions } from './run';
import { WELL_RULES, type RoomData } from './well';
import { DEFAULT_LOOK } from './save';

export { heroScreenX };
/** Honk clouds fade over this last stretch before the hall's left wall, u. */
const HONK_FADE = 60;
/**
 * Ground covered by one run cycle (two steps), u. Tuned to the hero's leg swing so a planted
 * foot stays still on the road: during each step the planted ankle moves back about 20 u
 * over 0.34 of a cycle, so 58 u. At run speed 156 u/s that is 2.7 cycles a second; on corn
 * the hero covers ground faster, so the cycle speeds up with it. Amala's bigger steps reach
 * 13 percent further.
 */
export const STRIDE = 58;
const STRIDE_AMALA = STRIDE * 1.13;
/** Landing squash after a fall: lasts this long (s), only after landing faster than LAND_VY. */
export const LAND_TIME = 0.12;
export const LAND_VY = 200;
/** Start-of-run dust puff (S2.2): lasts this long, s. */
export const DUST_TIME = 0.4;
/** Skid on a turn (S2.2): the pose shows this long, s, though the physics turn is quicker. */
export const SKID_TIME = 0.22;
/** A turn from slower than this (u/s) is just a turn: no skid. */
const SKID_MIN = 20;
/** A walk turn skids this much (a turn from a run skids fully). */
const SKID_WALK = 0.6;

/**
 * What a step can tell the screen: the rules' events, plus the hero's own moves that only the
 * drawing and sound care about (the start of a run, a skid on a turn from a run).
 */
export type GameEvent =
  | RunEvent
  | { type: 'runStart' }
  | { type: 'skid' }
  /** S2.16 B2: with amala, a foot met the ground (at most one every 0.18 s): the "dum" and the thump. */
  | { type: 'strongStep'; x: number; y: number }
  /** S2.16 B4: each 0.3 s of a dash on the ground, the fast soft footsteps. */
  | { type: 'dashSteps' };

/** S2.16 B4: the dash's fast footsteps sound this often, s. */
export const DASH_STEPS_EVERY = 0.3;

/** A jump in x bigger than this in one step is a respawn or a reset, not running. */
const TELEPORT = 50;
/** Anything this far outside the screen is not drawn. */
const MARGIN = 60;

interface Effect {
  kind: 'sparkle' | 'dust' | 'drumSparkle' | 'drumSmash' | 'steam' | 'weedSteam' | 'thump' | 'ring' | 'suitBits' | 'pileKobo';
  /** Where it starts (for the drum: the bottom centre of its box, on the road). */
  x: number;
  /** It drifts this way, u/s (a bounced drum rolls on into its sparkle). */
  vx?: number;
  y: number;
  /** Animation clock when it started. */
  t0: number;
  /** Seconds it lasts. */
  len: number;
}

export class Game {
  run: Run;
  look: HeroLook = { ...DEFAULT_LOOK };
  paused = false;
  /** Standing on the menu screens, before the run starts. */
  idle = true;
  /** Called for everything that happens in a step (sounds, words, HUD). */
  onEvent: (e: GameEvent) => void = () => {};
  /** Seconds, for animation. Moves only while the run is being played. */
  clock = 0;
  private effects: Effect[] = [];
  /** Camera left edge (world x). */
  private camX = 0;
  /** Run cycle, 0 to 1, moved on by ground covered (either way) so feet don't slide. */
  stridePhase = 0;
  /** Seconds of landing squash left. */
  landLeft = 0;
  /** Seconds since the start-of-run dust puff began; at DUST_TIME or more there is none. */
  dustAge = DUST_TIME;
  /** Seconds of skid pose left, how hard (0 to 1), and the way the hero slides (faces) meanwhile. */
  skidLeft = 0;
  skidAmount = 0;
  skidFacing: 1 | -1 = 1;
  /** Ground move this frame: a walk or a run (player-moved streets; auto-run is always a run). */
  gait: 'walk' | 'run' = 'run';
  /**
   * S2.16 B2 and B3 clock times (this.clock): the garri suit went on and broke; amala was picked
   * up and ran out by itself; the last heavy step; the last dash footsteps.
   */
  suitOnAt = -Infinity;
  suitBreakAt = -Infinity;
  amalaAt = -Infinity;
  amalaEndAt = -Infinity;
  private stepAt = -Infinity;
  private dashStepAt = -Infinity;

  /** The street camera for player-moved levels (S2.2); slice 1 levels follow the old way. */
  private cam: Camera | null = null;
  /** World width shown, from the last view (the camera steps with it). */
  viewW = 640;
  /**
   * World units the picture is raised so the road line clears the phone buttons on a very
   * short screen (screens/controls.ts, ButtonLayout.lift). 0 on almost every screen.
   */
  lift = 0;
  /** prefers-reduced-motion: crates hang still and kobo out of a crate do not fly (set by main). */
  still = false;
  /**
   * The street's fixed look (S2.8): once its state is switched on, lamps and signs lit, bunting
   * and fresh road paint. Same layout, same play. Set by main.
   */
  fixed = false;
  /** Clock time the jam last went "pfft" (S2.15: it shakes for 0.3 s). */
  private jamAt = -Infinity;
  /** Where the HUD kobo counter is on screen, world units from the top left (set by main). */
  koboTarget = { x: 70, y: 22 };
  /** Well rooms by file id (S2.5), set by main before a run starts. */
  rooms: ReadonlyMap<string, RoomData> = new Map();
  /** The room camera on a screen narrower than the room (S2.5: it follows, kept inside the room). */
  private roomCam: Camera | null = null;

  constructor(public level: Level) {
    this.run = new Run(level);
    this.newCamera();
  }

  /** Camera left edge (world x) as last drawn. */
  get camera(): number {
    return this.camX;
  }

  /** Which way the street camera looks (1 right, -1 left). */
  get cameraLook(): 1 | -1 {
    return this.cam?.look ?? 1;
  }

  private newCamera(): void {
    const { level } = this;
    // A hall has its own camera (cameraX); streets have the street camera (S2.2).
    this.cam = level.manual && !level.hall ? new Camera(level.startWall, level.end?.wall ?? Infinity) : null;
    this.snapCamera();
  }

  private snapCamera(): void {
    if (!this.cam) return;
    this.cam.snap(this.hero.x, this.viewW);
    this.camX = this.cam.x;
    this.run.viewLeft = this.cam.x;
    this.run.viewRight = this.cam.x + this.viewW;
  }

  /** The screen size changed. */
  setView(view: View): void {
    const changed = view.width !== this.viewW;
    this.viewW = view.width;
    if (changed && this.run.below) {
      this.roomCamera(true);
    } else if (changed && this.cam) {
      this.cam.x = Math.min(this.cam.x, this.hero.x - view.width * 0.08);
      this.run.viewRight = this.cam.x + this.viewW;
    }
  }

  get hero(): Run['hero'] {
    return this.run.hero;
  }

  /**
   * Start the level (a street or a hall) from the beginning: full lives, 0 kobo. parcel: a hall
   * try that starts with the garri shield on (S2.7). parcelSaved: the state already has a saved
   * parcel, so well rooms show 5 kobo instead (S2.5 gift rule 6).
   */
  begin(gentle: boolean, level: Level = this.level, opts: Pick<RunOptions, 'parcel' | 'parcelSaved' | 'dash'> = {}): void {
    this.level = level;
    this.run = new Run(this.level, { gentle, rooms: this.rooms, ...opts });
    this.newCamera();
    this.idle = false;
    this.paused = false;
    this.effects = [];
    this.stridePhase = 0;
    this.clearMoves();
    this.clearLooks();
    // A hall try with the parcel starts with the suit on: it clicks on at the start.
    if (this.run.power.shield) this.suitOnAt = this.clock;
  }

  /** No suit, strong look or dash sounds carried over from another run. */
  private clearLooks(): void {
    this.suitOnAt = this.suitBreakAt = this.amalaAt = this.amalaEndAt = -Infinity;
    this.stepAt = this.dashStepAt = -Infinity;
  }

  /** Back to the menus: a fresh, standing hero at the start. */
  reset(level: Level = this.level): void {
    this.level = level;
    this.run = new Run(this.level, { rooms: this.rooms });
    this.newCamera();
    this.idle = true;
    this.paused = false;
    this.effects = [];
    this.stridePhase = 0;
    this.clearMoves();
    this.clearLooks();
  }

  /** No landing squash, dust or skid (a fresh run, or back after a fall). */
  private clearMoves(): void {
    this.landLeft = 0;
    this.dustAge = DUST_TIME;
    this.skidLeft = 0;
    this.skidAmount = 0;
  }

  press(by?: Parameters<Run['press']>[0]): ReturnType<Run['press']> {
    return this.run.press(by);
  }

  release(by?: Parameters<Run['release']>[0]): void {
    this.run.release(by);
  }

  steer(dir: -1 | 0 | 1): void {
    this.run.steer(dir);
  }

  /** Throw a fufu ball (S2.15). False when nothing was thrown. */
  throwFufu(): boolean {
    return this.run.throwFufu();
  }

  /** Go down at an entrance well (S2.5). False when the hero is not at one. */
  goDown(): boolean {
    return this.run.goDown();
  }

  /** Go up the room's rope (S2.5). False when the hero is not under it. */
  goUp(): boolean {
    return this.run.goUp();
  }

  /**
   * The room camera (S2.5): a screen as wide as the room or wider shows it centred (dark earth
   * at the sides); a narrower one follows the hero, kept inside the room.
   */
  private roomCamera(snap: boolean, dt = 0): void {
    const room = this.run.room?.room;
    if (!room) return;
    if (this.viewW >= room.width) {
      this.roomCam = null;
      this.camX = (room.width - this.viewW) / 2;
      return;
    }
    const pad = 40; // Camera keeps its edges 40 u outside its walls: here, the room's sides.
    if (snap || !this.roomCam) {
      this.roomCam = new Camera(pad, room.width - pad);
      this.roomCam.snap(this.hero.x, this.viewW);
    } else if (this.still) {
      this.roomCam.snap(this.hero.x, this.viewW);
    } else {
      this.roomCam.step(this.hero.x, this.viewW, dt);
    }
    this.camX = this.roomCam.x;
  }

  update(dt: number): void {
    if (this.idle) return;
    this.clock += dt;
    const h0 = this.hero;
    const x0 = h0.x;
    const vy0 = h0.vy;
    const vx0 = h0.vx;
    const speed0 = h0.speed;
    const air0 = !h0.grounded;
    const shield0 = this.run.power.shield;
    const phase0 = this.stridePhase;
    this.run.still = this.still; // a Gentle mode climb-out has no dust off under reduced motion
    const events: GameEvent[] = this.run.step(dt);
    if (h0.manual) events.push(...this.animateMoves(vx0, speed0, air0, dt));
    else this.gait = 'run';
    this.animateStride(x0, vy0, air0, dt);
    events.push(...this.looks(shield0, phase0, events));
    if (events.some((e) => e.type === 'fall' || e.type === 'room' || e.type === 'wellBack')) this.clearMoves();
    if (this.run.below) {
      this.roomCamera(events.some((e) => e.type === 'room'), dt);
    } else if (this.cam) {
      // Back at the bus stop after a fall, or up at the exit well: the camera jumps there.
      if (events.some((e) => e.type === 'fall' || e.type === 'wellBack')) this.snapCamera();
      else this.cam.step(this.hero.x, this.viewW, dt);
      this.run.viewLeft = this.cam.x;
      this.run.viewRight = this.cam.x + this.viewW;
    }
    for (const e of events) {
      if ((e.type === 'smash' || e.type === 'bounce') && e.kind === 'drum') {
        // K1: a bounced drum rolls on into a clang sparkle (0.3 s); amala dents it flat and its lid flies.
        const y = e.y + HAZARD_BOX.drum.h;
        if (e.type === 'bounce') this.effects.push({ kind: 'drumSparkle', x: e.x, y, vx: -this.level.hazardSpeeds.drum, t0: this.clock, len: 0.3 });
        else this.effects.push({ kind: 'drumSmash', x: e.x, y, t0: this.clock, len: 0.5 });
      } else if (e.type === 'kobo' || e.type === 'food' || e.type === 'smash' || e.type === 'bounce') {
        // A tyre that is bounced on or smashed vanishes in a short sparkle (0.3 s).
        const len = (e.type === 'smash' || e.type === 'bounce') && e.kind === 'tyre' ? 0.3 : 0.4;
        this.effects.push({ kind: 'sparkle', x: e.x, y: e.y, t0: this.clock, len });
      } else if (e.type === 'dust') {
        this.effects.push({ kind: 'dust', x: e.x, y: e.y, t0: this.clock, len: 0.3 });
      } else if (e.type === 'fufuPlug') {
        // S2.15: a "plup" and a puff of steam where the ball went in.
        this.effects.push({ kind: 'steam', x: e.x, y: this.level.groundY - 4, t0: this.clock, len: 0.4 });
      } else if (e.type === 'fufuBowl') {
        this.effects.push({ kind: 'sparkle', x: e.x, y: e.y, t0: this.clock, len: 0.4 });
      } else if (e.type === 'fufuJam') {
        this.jamAt = this.clock;
      } else if (e.type === 'shieldPop') {
        // S2.16 B3: 0.1 s of crack lines on the plates, then they burst into 10 bits.
        this.suitBreakAt = this.clock;
        const len = this.still ? SUIT.breakTimeStill : SUIT.breakTime;
        this.effects.push({ kind: 'suitBits', x: this.hero.x, y: this.hero.y, t0: this.clock + SUIT.crackTime, len });
      } else if (e.type === 'pileKobo') {
        this.effects.push({ kind: 'pileKobo', x: e.x, y: e.y - 10, t0: this.clock, len: 0.5 });
      } else if (e.type === 'weedsDry') {
        this.effects.push({ kind: 'weedSteam', x: e.x, y: this.level.groundY, t0: this.clock, len: 0.4 });
      }
      if (e.type === 'smash' && this.run.power.amala > 0) {
        // S2.16 B2: amala's smash raises a 24 u dust ring at the smashed thing's foot.
        this.effects.push({ kind: 'ring', x: e.x, y: this.level.groundY, t0: this.clock, len: 0.4 });
      } else if (e.type === 'weedsTrample') {
        this.effects.push({ kind: 'ring', x: e.x, y: this.level.groundY, t0: this.clock, len: 0.4 });
      } else if (e.type === 'strongStep') {
        this.effects.push({ kind: 'thump', x: e.x, y: e.y, t0: this.clock, len: 0.25 });
      }
      this.onEvent(e);
    }
    this.effects = this.effects.filter((f) => this.clock - f.t0 < f.len);
  }

  /**
   * S2.16 B2 and B3: what the looks need to know this step: the suit going on (from the feet up),
   * amala picked up (the arm flex) or running out by itself (the shake out), amala's heavy steps
   * (a foot meets the ground: twice a run cycle, at most one every 0.18 s) and the dash's fast
   * footsteps. Returns the sounds these start.
   */
  private looks(shield0: boolean, phase0: number, events: readonly GameEvent[]): GameEvent[] {
    const out: GameEvent[] = [];
    const run = this.run;
    const h = this.hero;
    if (!shield0 && run.power.shield) this.suitOnAt = this.clock;
    for (const e of events) {
      if (e.type === 'food' && e.kind === 'amala') this.amalaAt = this.clock;
      if (e.type === 'powerEnd' && e.kind === 'amala') this.amalaEndAt = this.clock;
      if (e.type === 'fall' || e.type === 'hit' || e.type === 'gameOver') this.amalaEndAt = -Infinity; // ends at once
      if (e.type === 'dashStart') this.dashStepAt = this.clock;
    }
    // A foot meets the ground as the run cycle passes 0 and 0.5 (one cycle is two steps).
    const p1 = this.stridePhase;
    const footDown = h.grounded && h.speed > 0 && (p1 < phase0 || (phase0 < 0.5 && p1 >= 0.5));
    if (run.power.amala > 0 && footDown && this.clock - this.stepAt >= STRONG.stepGap - 1e-9) {
      this.stepAt = this.clock;
      out.push({ type: 'strongStep', x: h.x, y: h.y });
    }
    if (h.dash > 0 && h.grounded && this.clock - this.dashStepAt >= DASH_STEPS_EVERY - 1e-9) {
      this.dashStepAt = this.clock;
      out.push({ type: 'dashSteps' });
    }
    return out;
  }

  /**
   * The suit, strong look and dash parts of the hero's pose now (S2.16 B2, B3, B4), for drawHero.
   */
  powerPose(): Pick<HeroPose, 'strong' | 'shakeOut' | 'suit' | 'dash' | 'resting' | 'still'> {
    const run = this.run;
    const t = this.clock;
    const out: Pick<HeroPose, 'strong' | 'shakeOut' | 'suit' | 'dash' | 'resting' | 'still'> = { still: this.still };
    if (run.power.amala > 0) {
      const flex = (t - this.amalaAt) / STRONG.flexTime;
      out.strong = { left: run.power.amala / STEPS_PER_SECOND, ...(flex >= 0 && flex < 1 ? { flex } : {}) };
    } else {
      const k = (t - this.amalaEndAt) / STRONG.shakeTime;
      if (k >= 0 && k < 1) out.shakeOut = k;
    }
    if (run.power.shield) {
      const on = (t - this.suitOnAt) / SUIT.putOnTime;
      out.suit = on >= 0 && on < 1 ? { on } : {};
    } else if (t - this.suitBreakAt < SUIT.crackTime) out.suit = { crack: true };
    const h = run.hero;
    if (h.dash > 0) out.dash = true;
    else if (run.resting) out.resting = true;
    return out;
  }

  /**
   * Player-moved streets (S2.2): walk or run, the dust puff when a walk breaks into a run, and
   * the skid when the hero turns round on the ground. Returns the sounds these start.
   */
  private animateMoves(vx0: number, speed0: number, air0: boolean, dt: number): GameEvent[] {
    const h = this.hero;
    const out: GameEvent[] = [];
    const walkTop = h.gait.walk + 1;
    this.gait = h.speed > walkTop ? 'run' : 'walk';
    this.dustAge = Math.min(DUST_TIME, this.dustAge + dt);
    if (!air0 && h.grounded && h.move !== 0 && speed0 <= walkTop && h.speed > walkTop) {
      this.dustAge = 0;
      out.push({ type: 'runStart' });
    }
    // A turn on the ground: the step began moving against the direction now held.
    const turning = !air0 && h.move !== 0 && vx0 * h.move < 0 && Math.abs(vx0) >= SKID_MIN;
    if (turning && this.skidLeft === 0) {
      const fromRun = Math.abs(vx0) > walkTop;
      this.skidLeft = SKID_TIME;
      this.skidAmount = fromRun ? 1 : SKID_WALK;
      this.skidFacing = vx0 > 0 ? 1 : -1;
      this.dustAge = DUST_TIME;
      if (fromRun) out.push({ type: 'skid' });
    } else if (this.skidLeft > 0) {
      this.skidLeft = Math.max(0, this.skidLeft - dt);
      // Jumped, or pressed the old way again: the skid ends at once.
      if (!h.grounded || h.move === this.skidFacing) this.skidLeft = 0;
    }
    return out;
  }

  /** How much skid to draw now, 0 to 1: full, then easing off over the last 40 percent. */
  get skid(): number {
    if (this.skidLeft <= 0) return 0;
    return this.skidAmount * Math.min(1, this.skidLeft / (SKID_TIME * 0.4));
  }

  /** Moves the run cycle on by ground covered, and starts or eases the landing squash. */
  private animateStride(x0: number, vy0: number, air0: boolean, dt: number): void {
    const h = this.hero;
    const dx = Math.abs(h.x - x0);
    // Feet don't slide: one cycle per stride of ground; a walk's stride is shorter. A skid
    // holds the braced foot still.
    if (dx < TELEPORT && this.skidLeft === 0) {
      const run = this.run.power.amala > 0 ? STRIDE_AMALA : STRIDE;
      const stride = this.gait === 'walk' && h.manual ? run * WALK_STRIDE : run;
      this.stridePhase = (this.stridePhase + dx / stride) % 1;
    }
    this.landLeft = Math.max(0, this.landLeft - dt);
    if (air0 && h.grounded && vy0 > LAND_VY) this.landLeft = LAND_TIME;
    if (!h.grounded) this.landLeft = 0;
  }

  /**
   * The camera. Streets: the street camera (S2.2), or for slice 1 levels the hero at
   * heroScreenX. A hall (S2.7): a screen as wide as the hall or wider shows it all, centred (the
   * outside walls at the sides); a narrower one follows the hero, kept inside the hall.
   */
  cameraX(view: View): number {
    if (this.run.below) return this.camX;
    const hall = this.level.hall;
    if (hall) {
      const W = view.width;
      this.camX = W >= hall.width ? (hall.width - W) / 2 : Math.min(Math.max(0, this.hero.x - W * 0.4), hall.width - W);
      return this.camX;
    }
    if (this.cam) {
      this.camX = this.cam.x;
      return this.camX;
    }
    this.camX = this.hero.x - view.width * heroScreenX(view.width);
    return this.camX;
  }

  render(g: CanvasRenderingContext2D, view: View): void {
    if (view.width !== this.viewW) this.setView(view);
    if (this.run.below) this.renderRoom(g, view);
    else if (this.level.hall) this.renderHall(g, view);
    else this.renderStreet(g, view);
    // Going down or up a well: the screen fades to dark and back (S2.5).
    g.setTransform(view.scale, 0, 0, view.scale, 0, 0);
    drawFade(g, view.width, view.height, this.run.fade);
  }

  private renderStreet(g: CanvasRenderingContext2D, view: View): void {
    const { level, run } = this;
    const W = view.width;
    // Raised by `lift`: the screen shows world y from lift down to view.height + lift.
    const lift = this.lift;
    const H = view.height + lift;
    const t = this.clock;
    if (view.width !== this.viewW) this.setView(view);
    const camX = this.cameraX(view);
    run.viewAhead = W * (1 - heroScreenX(W));
    const L = camX - MARGIN;
    const R = camX + W + MARGIN;
    const gy = level.groundY;

    g.setTransform(view.scale, 0, 0, view.scale, 0, -lift * view.scale);
    // Screen space, parallax: the street's own look (its `theme`, art K1 backdrop.ts).
    drawBackdrop(g, level.theme, camX, W, t, H, gy, this.fixed);

    // World space.
    g.translate(-camX, 0);
    drawRoad(g, camX, W, level.ground, gy, H, this.fixed);
    // S2.15: potholes plugged with fufu, a pale patch level with the road.
    for (const p of run.plugged) if (p.b > L && p.a < R) drawFufuPlug(g, p.a, p.b, gy, H);
    // S2.16 B4 Gentle mode: a stack of cement blocks in every dash gap.
    if (run.gentle) for (const [a, b] of blocksOf(level)) if (b > L && a < R) drawCementBlocks(g, a, gy, H);
    // S2.16 B5: the open gutters across the road (the weeds draw with the hazards).
    for (const q of run.gutters) if (q.x + q.w > L && q.x < R) drawGutter(g, q.x, q.w, gy);
    // S2.16 B1: the rubbish piles at the back of the road (gone in the fixed look).
    if (!this.fixed) for (const x of level.piles) if (x + 40 > L && x - 40 < R) drawRubbishPile(g, x, gy);
    // The well in use is drawn with the hero (going down); no arrow while Go down shows.
    if (level.manual) drawStreetBits(g, level, camX, W, L, R, H, t, { busy: run.well, noArrow: run.wellHere, still: this.still }, this.fixed);
    for (const p of level.terrain.platforms) if (p.x + p.w > L && p.x < R) drawThemeStall(g, level.theme, p.x, p.y, p.w, gy);
    if (run.crates.length > 0) this.drawCrates(g, run.crates, camX, L, R, lift, true);
    const stop = level.checkpoint;
    if (stop + 160 > L && stop - 60 < R) drawBusStop(g, stop, run.checkpointReached, t, gy);

    // S2.6 street end: the bus park behind; the bus where the hero is drawn (below).
    const end = level.end;
    const atBus = run.phase === 'bus' || run.phase === 'cleared';
    const bus = end ? busEndAt(atBus ? run.endSteps / STEPS_PER_SECOND : 0) : null;
    if (bus && !atBus) bus.time = t;
    const busSeen = end !== null && bus !== null && end.x + END_BUS_BACK - 160 < R && end.x + END_BUS_FRONT + (bus.dx ?? 0) + 200 > L;
    if (end && busSeen) drawBusPark(g, end.x, end.wall, gy);

    for (const c of run.coins) if (!c.taken && c.x > L && c.x < R) drawKobo(g, c.x, c.y, t);
    for (const f of run.foods) if (!f.taken && f.x > L && f.x < R) drawFood(g, f.kind, f.x, f.y, t);
    // S2.16 B5: the weeds never move (no time); tyres and drums roll across in front of them.
    for (const q of run.gutters) {
      if (q.x + q.w < L || q.x > R) continue;
      drawWeeds(g, q.x, q.w, gy, q.state, q.state === 'drying' ? q.t / RULES.weedDrySteps : 0);
    }
    const fade = run.hazardFade;
    if (fade < 1) {
      g.globalAlpha = 1 - fade; // the street end: hazards fade out
      for (const z of run.hazards) {
        if (z.mode === 'gone' || z.x < L || z.x > R) continue;
        if (z.mode === 'eat') drawGoatEating(g, z.x, z.y, z.t / FUFU_RULES.eatSteps, z.face);
        else if (z.mode === 'knocked') {
          const k = z.t / FUFU_RULES.knockSteps;
          if (z.kind === 'drum') drawDrumKnocked(g, z.x, z.y, k, z.rot);
          else drawTyreKnocked(g, z.x, z.y, k, z.rot);
        } else if (z.kind === 'egret' || z.kind === 'crow') this.drawBird(g, z);
        else if (z.kind === 'goat') drawGoat(g, z.x, z.y, t, z.mode === 'runAway' ? 'runAway' : 'walk', z.mode === 'runAway' || z.vx > 0 ? 1 : -1);
        else if (z.kind === 'drum') drawDrum(g, z.x, z.y, z.rot, { lines: z.mode === 'move' });
        else drawTyre(g, z.x, z.y, z.rot);
      }
      g.globalAlpha = 1;
    }

    // Getting on: the inside of the open door, then the hero hopping through it, then the bus
    // body around the door. Before that the bus is drawn first, so a hero jumping over it shows.
    if (end && bus && busSeen) {
      if (atBus) drawEndBusInside(g, end.x, bus, gy);
      else drawEndBus(g, end.x, bus, gy);
    }
    // Blinking while safe after a hit: hidden every other 0.1 s.
    const blinkOff = (run.safe > 0 && Math.floor(run.safe / 6) % 2 === 1) || run.boarded;
    const w = run.well;
    if (run.phase === 'wellDown' && w) {
      // S2.5 going down: the well's back, the hero clipped at the rim, then the wall in front.
      const m = wellDownAt(run.wellSteps / STEPS_PER_SECOND);
      drawWellBack(g, w.x, gy, { kind: 'entrance', drop: m.drop, crank: m.crank });
      g.save();
      clipWellMouth(g, w.x, gy);
      this.drawHeroNow(g, m.toRope >= 1);
      g.restore();
      drawWellFront(g, w.x, gy);
    } else if (!blinkOff) {
      this.drawHeroNow(g, false);
    }
    this.drawBalls(g, run.balls, L, R);
    if (end && bus && busSeen && atBus) drawEndBus(g, end.x, bus, gy);

    this.drawEffects(g);
  }

  /**
   * Go-Slow Hall (S2.7, art M1 src/art/hall.ts): the hall's back, the go lights and General
   * Go-Slow, the throws, the cone line, the hero, then the hall's front walls. In the fight the
   * right doors open and shut after each hit; from the third hit the kind finish plays (doors
   * stay open, lamps come on, cones slide aside, floor arrows light). Still (reduced motion):
   * the doors and cones jump instead of swinging and sliding, and nothing pulses.
   */
  private renderHall(g: CanvasRenderingContext2D, view: View): void {
    const { level, run } = this;
    const boss = run.boss!;
    const data = level.boss!;
    const W = view.width;
    const lift = this.lift;
    const H = view.height + lift;
    const t = this.clock;
    const camX = this.cameraX(view);
    const gy = level.groundY;
    const still = this.still;
    g.setTransform(view.scale, 0, 0, view.scale, 0, -lift * view.scale);
    g.translate(-camX, 0);
    const finish = boss.defeated ? hallFinishAt(boss.modeTime, still) : null;
    drawHall(g, camX, W, H, finish ? { ...finish, time: t, still } : { doors: hallDoors(boss.mode, boss.modeTime, still), time: t });
    data.lights.forEach((p, i) => {
      const state: GoLightState = i < boss.hits ? 'done' : boss.lit === i ? 'lit' : 'off';
      // S2.14: the last second of green blinks (with reduced motion the arrow hides instead).
      drawGoLight(g, p.x, p.y, p.w, state, still ? 0 : t, gy, state === 'lit' ? { left: boss.greenLeft, still } : undefined);
    });
    // S2.15: the heap shakes for 0.3 s after a fufu ball's "pfft" (not with reduced motion).
    const shake = !still && t - this.jamAt < 0.3 ? Math.sin((t - this.jamAt) * 80) * 2 : 0;
    g.translate(shake, 0);
    drawBoss(g, data.x, gy, { mode: boss.mode, t: boss.modeTime, hits: boss.hits, time: still ? 0 : t, aim: boss.aim });
    g.translate(-shake, 0);
    for (const f of run.foods) if (!f.taken) drawFood(g, f.kind, f.x, f.y, t);
    for (const th of boss.throws) {
      if (th.kind === 'tyre') {
        drawTyre(g, th.x, th.y, th.rot);
        continue;
      }
      // Honks fade as they reach the left wall (never fully: they can still touch the hero).
      g.globalAlpha = Math.min(1, Math.max(0.3, (th.x - data.drainX) / HONK_FADE));
      if (th.kind === 'highHonk') drawHighHonk(g, th.x, th.y, still ? 0 : t);
      else drawHonkCloud(g, th.x, th.y, still ? 0 : t);
      g.globalAlpha = 1;
    }
    drawHallCones(g, finish?.cones ?? 0);
    const blinkOff = run.safe > 0 && Math.floor(run.safe / 6) % 2 === 1;
    if (!blinkOff) this.drawHeroNow(g, false);
    this.drawBalls(g, run.balls, -Infinity, Infinity);
    this.drawEffects(g);
    drawHallFront(g, camX, W, H);
    g.setTransform(view.scale, 0, 0, view.scale, 0, 0);
    // The hit counter, under the HUD row.
    drawHitCounter(g, W / 2, 66 + view.safe.top, boss.hits);
  }

  /** The hero where it is now, in its pose (rope: holding the well rope). World space. */
  private drawHeroNow(g: CanvasRenderingContext2D, rope: boolean): void {
    const h = this.run.hero;
    const t = this.clock;
    const boss = this.run.boss;
    const skid = rope ? 0 : this.skid;
    const walking = h.manual && h.grounded && this.gait === 'walk';
    g.save();
    g.translate(h.x, h.y);
    drawHero(g, this.look, {
      phase: this.stridePhase,
      inAir: !rope && !h.grounded,
      vy: h.vy,
      land: this.landLeft / LAND_TIME,
      facing: skid > 0 ? this.skidFacing : h.dir,
      glow: this.run.power.amala > 0,
      fast: this.run.power.corn > 0,
      ...this.powerPose(),
      standing: this.idle || ((boss?.defeated ?? false) && h.grounded) || (h.manual && h.grounded && h.vx === 0 && skid === 0),
      gait: walking ? 'walk' : 'run',
      skid,
      ...(rope ? { rope: true } : {}),
      ...(!rope && this.dustAge < DUST_TIME ? { dust: this.dustAge / DUST_TIME } : {}),
      // Gentle mode climb-out (S2.13 part 5): 0 to 1 while the controls are locked.
      ...(!rope && this.run.dustOff > 0 ? { dustOff: 1 - this.run.dustOff / RULES.dustOffSteps } : {}),
      // S2.15: one 0.15 s arm swing after a throw.
      ...(!rope && this.run.throwAge < THROW_TIME ? { throwing: this.run.throwAge / THROW_TIME } : {}),
      time: t,
    });
    g.restore();
  }

  /** S2.15: the fufu balls flying, hopping, rolling, settling, and those a goat is eating. World space. */
  private drawBalls(g: CanvasRenderingContext2D, balls: readonly FufuBall[], L: number, R: number): void {
    const t = this.clock;
    const r = FUFU.ballR;
    for (const b of balls) {
      if (b.x < L || b.x > R || b.mode === 'gone') continue;
      if (b.mode === 'settle') drawFufuSettle(g, b.x, b.y, b.t / FUFU_RULES.settleSteps);
      else if (b.mode === 'fed') {
        // Shrinks as the goat eats it.
        const k = 1 - b.t / FUFU_RULES.eatSteps;
        if (k <= 0) continue;
        g.save();
        g.translate(b.x, b.y);
        g.scale(k, k);
        drawFufuBall(g, 0, -r, { steam: false, still: this.still });
        g.restore();
      } else drawFufuBall(g, b.x, b.y - r, { squash: b.squash / FUFU_RULES.squashSteps, spin: b.spin, time: t, still: this.still });
    }
  }

  /** S2.16 B1: an egret (pecking, hopping) or a crow (hovering), or either flying off. World space. */
  private drawBird(g: CanvasRenderingContext2D, z: HazardState): void {
    const look = { facing: (z.mode === 'flyOff' ? 1 : z.vx > 0 ? 1 : -1) as 1 | -1, fufu: z.fufu, still: this.still };
    const time = this.still ? 0 : this.clock;
    if (z.kind === 'crow') {
      drawCrow(g, z.x, z.y, z.mode === 'flyOff' ? 'fly' : 'hover', time, look);
      return;
    }
    const mode: BirdMode = z.mode === 'flyOff' ? 'fly' : z.mode === 'move' && z.t === 0 ? 'hop' : 'peck';
    drawEgret(g, z.x, z.y, mode, time, look);
  }

  /** Sparkles, pops, dust and drum bits now showing. World space. */
  private drawEffects(g: CanvasRenderingContext2D): void {
    const t = this.clock;
    for (const f of this.effects) {
      const k = (t - f.t0) / f.len;
      if (f.kind === 'drumSparkle') drawDrumSparkle(g, f.x + (f.vx ?? 0) * (t - f.t0), f.y, k);
      else if (f.kind === 'drumSmash') drawDrumSmash(g, f.x, f.y, k);
      else if (f.kind === 'sparkle') drawSparkle(g, f.x, f.y, k);
      else if (f.kind === 'dust') drawDustPop(g, f.x, f.y, k);
      else if (f.kind === 'steam') drawFufuSteamPuff(g, f.x, f.y, k);
      else if (f.kind === 'weedSteam') drawWeedSteam(g, f.x, f.y, k);
      else if (f.kind === 'thump') drawStepThump(g, f.x, f.y, k);
      else if (f.kind === 'ring') drawDustRing(g, f.x, f.y, k);
      else if (f.kind === 'pileKobo') drawPileKoboPop(g, f.x, f.y, k, t);
      else if (f.kind === 'suitBits' && k >= 0) drawSuitBits(g, f.x, f.y, k, this.still);
    }
  }

  /**
   * The well's store room (S2.5, art L1): earth walls and lamps, plank shelves, kobo, the kobo
   * crate hanging from the beam, the garri parcel, the bucket that brought the hero down, and
   * the rope back up. Still (reduced motion): no lamp flicker, no rope sway, no parcel bob.
   */
  private renderRoom(g: CanvasRenderingContext2D, view: View): void {
    const run = this.run;
    const play = run.room!;
    const room = play.room;
    const W = view.width;
    const lift = this.lift;
    const H = view.height + lift;
    const t = this.clock;
    const calm = this.still ? 0 : t;
    const camX = this.camX;
    const L = camX - MARGIN;
    const R = camX + W + MARGIN;
    const gy = room.groundY;
    const h = run.hero;
    g.setTransform(view.scale, 0, 0, view.scale, 0, -lift * view.scale);
    g.translate(-camX, 0);
    drawWellRoom(g, camX, W, calm, H);
    for (const p of room.terrain.platforms) drawShelf(g, p.x, p.y, p.w);
    for (const c of play.coins) if (!c.taken && c.x > L && c.x < R) drawKobo(g, c.x, c.y, t);
    if (play.crates.length > 0) this.drawCrates(g, play.crates, camX, L, R, lift, false);
    const gift = play.gift;
    if (gift && !gift.taken) drawGarriParcel(g, gift.x, gift.y, calm);
    // The bucket that brought the hero down: it lands, then is pulled back up (gone at once if still).
    if (run.phase === 'roomIn') drawRoomRope(g, room.entryX, h.y - 9, 0);
    else if (run.phase === 'room' && !this.still && run.wellSteps < WELL_RULES.bucketBackSteps) {
      drawRoomRope(g, room.entryX, gy - 9 - (run.wellSteps / WELL_RULES.bucketBackSteps) * (gy + 20), 0);
    }
    // The rope back up: the bucket rises with the hero's hands while going up.
    const up = run.phase === 'wellUp';
    drawRoomRope(g, room.exitX, ROOM_ROPE_BUCKET_Y + (up ? h.y - gy : 0), up ? 0 : calm);
    const blinkOff = run.safe > 0 && Math.floor(run.safe / 6) % 2 === 1;
    if (!blinkOff || run.phase !== 'room') this.drawHeroNow(g, run.phase !== 'room');
    this.drawEffects(g);
  }
  /** Seconds since a step count of this run (crate swings, lids, kobo fans). */
  private since(step: number | null): number | undefined {
    return step === null ? undefined : (this.run.steps - step) / STEPS_PER_SECOND;
  }

  /** The swing of a crate now, radians (art crateAngle; still under reduced motion). */
  crateAngle(c: CrateState): number {
    return crateAngle({ sinceKnock: this.since(c.knockStep), knock: c.knock, dir: c.dir, time: this.clock + c.x * 0.0037, still: this.still });
  }

  /**
   * S2.4: the lines and poles, each crate on its rope (swinging, the lid opening), a food popped
   * out of a crate, and the three kobo fanning out of a kobo crate and flying to the HUD counter.
   */
  private drawCrates(g: CanvasRenderingContext2D, crates: readonly CrateState[], camX: number, L: number, R: number, lift: number, lines: boolean): void {
    const t = this.clock;
    // Crates at one height less than 160 u apart share a line; poles 36 u outside the end ones.
    // In the well room a crate hangs from the beam instead (no line, no poles).
    for (let i = 0; i < crates.length && lines; ) {
      let j = i;
      while (j + 1 < crates.length && crates[j + 1]!.bottomY === crates[i]!.bottomY && crates[j + 1]!.x - crates[j]!.x < 160) j++;
      const x0 = crates[i]!.x - 36;
      const x1 = crates[j]!.x + 36;
      if (x1 > L && x0 < R) drawCrateLine(g, x0, x1, crateLineY(crates[i]!.bottomY), crates[i]!.bottomY + CRATE_RULES.surfaceBelow);
      i = j + 1;
    }
    for (const c of crates) {
      if (c.x + 40 < L || c.x - 40 > R) continue;
      const opened = this.since(c.openStep);
      const lid = !c.open ? 0 : this.still || opened === undefined ? 1 : Math.min(1, opened / 0.15);
      drawCrate(g, c.x, c.bottomY, { stamp: STAMP[c.contents], open: c.open, angle: this.crateAngle(c), lid });
    }
    for (const c of crates) {
      const f = c.food;
      if (f && !f.taken && f.x > L && f.x < R) drawFood(g, f.kind, f.x, f.y, f.landed ? t : 0);
    }
    // The kobo: fan out of the top (0.35 s), then fly to the HUD counter (0.4 s).
    for (const c of crates) {
      const s = c.contents === 'kobo' ? this.since(c.openStep) : undefined;
      if (s === undefined || s > 0.75) continue;
      const top = { x: c.x, y: c.bottomY - CRATE_RULES.h };
      const ends = koboFanAt(0.35);
      if (this.still) {
        // Reduced motion: the three kobo show above the crate for a moment, then are counted.
        if (s <= 0.35) for (const e of ends) drawKobo(g, top.x + e.x, top.y + e.y, 0);
        continue;
      }
      if (s <= 0.35) {
        for (const e of koboFanAt(s)) drawKobo(g, top.x + e.x, top.y + e.y, t);
      } else {
        const to = { x: camX + this.koboTarget.x, y: lift + this.koboTarget.y };
        for (const e of ends) {
          const p = koboFlyAt(s - 0.35, { x: top.x + e.x, y: top.y + e.y }, to);
          if (!p.done) drawKobo(g, p.x, p.y, t);
        }
      }
    }
  }
}

/** The stamp on a crate's front shows what is inside (S2.4): corn cob, cup (garri), bowl (amala). */
const STAMP = { kobo: 'kobo', corn: 'corn', garri: 'cup', amala: 'bowl' } as const;

/**
 * Slice 2 street pieces behind the hero (art H5, src/art/roadside.ts): the pavement strip under
 * the road, the start fence with its parked bus, cones on both lips of every big pit, and the
 * wells (art L1: entrance with its bucket and arrow, exit with neither). Crates draw in
 * Game.drawCrates (S2.4).
 */
function drawStreetBits(
  g: CanvasRenderingContext2D,
  level: Level,
  camX: number,
  viewW: number,
  L: number,
  R: number,
  H: number,
  time: number,
  wells: { busy: WellData | null; noArrow: WellData | null; still: boolean },
  fixed = false,
): void {
  const gy = level.groundY;
  drawPavement(g, camX, viewW, level.ground, STRIP_Y, H);
  const fx = level.startWall;
  if (fx + 100 > L && fx - 90 < R) drawStartFence(g, fx, gy);
  // S2.13 part 4: a warning sign before every pothole you must jump twice for (scenery).
  for (const { x, dash } of signsOf(level)) {
    if (x + 30 < L || x - 30 > R) continue;
    if (dash) drawDashSign(g, x, gy, fixed);
    else drawPotholeSign(g, x, gy, fixed);
  }
  for (let i = 1; i < level.ground.length; i++) {
    const a = level.ground[i - 1]![1];
    const b = level.ground[i]![0];
    if (b - a < BIG_PIT || b + 30 < L || a - 30 > R) continue;
    drawBigPitCones(g, a, b, gy);
  }
  // Wells (S2.5): the entrance with its bucket and bobbing arrow (still under reduced motion;
  // none while its Go down button shows), the exit with neither. The one in use draws with the hero.
  const canGoDown = featureOn('wells');
  for (const w of level.wells) {
    const arrow = canGoDown && w !== wells.noArrow;
    if (w !== wells.busy && w.x + WELL_REACH > L && w.x - WELL_REACH < R) drawWell(g, w.x, gy, { kind: 'entrance', time: wells.still ? 0 : time, arrow });
    if (w.exitX + WELL_REACH > L && w.exitX - WELL_REACH < R) drawWell(g, w.exitX, gy, { kind: 'exit', time });
  }
}

/** Pothole and dash sign places by level, worked out once from its road spans. */
const SIGNS = new WeakMap<Level, readonly { x: number; dash: boolean }[]>();
function signsOf(level: Level): readonly { x: number; dash: boolean }[] {
  let xs = SIGNS.get(level);
  if (!xs) SIGNS.set(level, (xs = roadSigns(level)));
  return xs;
}

/** Gentle mode cement block stacks by level (S2.16 B4), worked out once from its road spans. */
const BLOCKS = new WeakMap<Level, readonly (readonly [number, number])[]>();
function blocksOf(level: Level): readonly (readonly [number, number])[] {
  let xs = BLOCKS.get(level);
  if (!xs) BLOCKS.set(level, (xs = gentleBlocks(level.ground)));
  return xs;
}

/** A well's drawing reaches this far either side of its centre (wall, frame and crank). */
const WELL_REACH = 50;
