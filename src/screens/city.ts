/**
 * Lagos from above, the home screen (docs/city.md part 5 (b) and part 5W "Walk the city").
 *
 * - The still city is painted once into an offscreen canvas (makeCityCanvas) and copied with one
 *   drawImage. On top go the few things that move: the hero, the pay mats and price boards, the
 *   Mama Put and the Market, tray bubbles, flying money, short lines and edge arrows.
 * - Draw only when something moves: walking, money flying, a build, the Mission complete arrival.
 *   Standing still: at most 2 small redraws a second while a working place serves (none with
 *   reduced motion except when an amount changes). Nothing at all when nothing moves.
 * - The hero walks to your finger (W1): tap the ground to walk there (a ring shows where they
 *   stop); hold and slide to keep walking to your finger. Pinch and + and − zoom. Arrow keys walk;
 *   Tab and Enter reach every pin, board and bubble. The camera follows the hero.
 * - Stand on a mat to pay (W2), part pay, the not-enough card; working places fill in play time
 *   (W3); walk into their front to collect (W4); Mission complete plays here after a win (W5).
 * - Pins are small HTML buttons over the map (each picture drawn once; their bob is CSS).
 *   Boards, bubbles and edge arrows are drawn on the map and covered by plain buttons, so screen
 *   readers and keys reach them.
 */
import {
  BUCKETS,
  CITY_COLOURS,
  CITY_MAP,
  CITY_SPOTS,
  SOON_IDS,
  SOON_PINS,
  SOON_WORDS,
  SPOT_IDS,
  SPOT_WORDS,
  bucketIconSvg,
  drawBoomFlats,
  drawCityBus,
  drawCityFolk,
  drawComingSoonPin,
  drawJetty,
  drawProblemPin,
  makeCityCanvas,
  soonPinHitBox,
  type BucketKind,
  type SoonId,
  type SpotId,
  type SpotLooks,
} from '../art/city';
import { boomBarSvg, boomIconSvg } from '../art/boomMeter';
import type { HeroLook } from '../art/hero';
import {
  ALAUSA_ROAD,
  BUILDS,
  EDGE_ARROW,
  MAT,
  BUBBLE,
  PAY,
  boardWobble,
  drawBuildOutline,
  drawCollectLine,
  drawEdgeArrow,
  drawFlyingMoney,
  drawPayMat,
  drawPriceBoard,
  drawRoadBuild,
  drawTrayBubble,
  edgeArrowPlace,
  flyingCount,
  payTime,
  priceBoardBox,
  trayBubbleBox,
  trayWords,
  type BuildId,
  type EdgeIcon,
} from '../art/payspot';
import { MAMA_PUT, MARKET_PLACE, danfoTrip, drawMamaPut, drawMarketDanfo, drawMarketPlace, drawPorter } from '../art/places';
import { BUS_ARRIVAL, WALKER, busArrivalHero, drawBusArrival, drawCityHero, drawWalkRing, walkDir, walkerSize, type WalkDir } from '../art/walker';
import { boomDue, meterOf, shownBoom, stepBlock } from '../game/boom';
import {
  BOOM,
  BRIDGE_FOOT,
  DANFO_ROUTE,
  MOMENT,
  MOVING_PEOPLE,
  areaRect,
  around,
  driveOn,
  ease,
  fixRects,
  middle,
  planWalkers,
  ringReach,
  routeAt,
  routeLength,
  span,
  walkTargets,
  walkerAt,
  type Rect,
  type Route,
  type Walker,
} from '../game/moment';
import {
  BUILD_KEY,
  FIRST_BOOM,
  HERO_START,
  PLACES,
  PLACE_BUILD,
  PLACE_IDS,
  SPOT_BUILD,
  TRAY_MIN,
  boardsShown,
  bucketOf,
  collectTray,
  inBucket,
  isBuilt,
  leftOf,
  payBoard,
  priceOf,
  spotLooks,
  trayFull,
  withHint,
  type CityState,
  type PlaceId,
} from '../game/city';
import type { CityLife } from '../game/cityLife';
import { camScale, centreOn, clampCam, pinTapBox, pinchStep, startCam, toMap, toScreen, zoomCam, type CityCam, type CityView, type Zoom } from '../game/cityCamera';
import { formatMoney, spokenMoney } from '../game/money';
import { findPath, lineClear, nearestOpen, setJetty, tapTarget, walkable, type Pt } from '../game/walkGrid';
import { button, h } from './dom';
import { WORDS } from './words';

/** The sounds this screen plays (src/engine/sound.ts). */
export type CitySound = 'payChink' | 'payBulb' | 'payChip' | 'built' | 'collect' | 'notEnough' | 'sting' | 'step' | 'boom' | 'horn' | 'cogRatchet' | 'cogBell';

/**
 * Mission complete after a won challenge (W5): `build` is the board the challenge was for (the
 * hero walks to it and pays); null for a win from somewhere else ("You brought ₦12 home").
 */
export interface Mission {
  build: BuildId | null;
  /** The money the win brought home (whole kobo). */
  kobo: number;
}

export interface CityScreenHooks {
  /** The live city (buckets, boards, trays, the hero's place). */
  life: CityLife;
  /** The hero's saved look. */
  look(): HeroLook;
  /** Buttons for the top right (Sound, Settings) and the bottom row (Streets, Hero, Nigeria's wheel). */
  topRight: HTMLElement[];
  bottom: HTMLElement[];
  /** A card's "Run Alausa" (or later "Lane run"). */
  run(spot: SpotId, e: MouseEvent): void;
  /** A tap that must not count (the second half of the double tap that opened the screen). */
  ignoreTap(e: MouseEvent): boolean;
  sound(name: CitySound): void;
  /** Gentle mode: pay on arrival, collect reach doubled, collect in passing (W9). */
  gentle(): boolean;
  /** Reduced motion. */
  still(): boolean;
  /** Touch words ("Tap ...") or key words ("Use the arrow keys ..."). */
  touch(): boolean;
  /** Mission complete to play as the screen opens (once), or null. */
  mission: Mission | null;
  /** Lagos's cog already turns on Nigeria's wheel (the hall is won): the boom then plays no cog sounds. */
  cogOn?(): boolean;
}

/** The camera is kept between visits (this page load only). */
let lastCam: CityCam | null = null;
/**
 * The painted city, one picture per zoom step at exactly the screen's pixel size, so a camera
 * move is a plain copy with no scaling. Kept while the looks and the size stay the same.
 */
const painted = new Map<string, { img: HTMLCanvasElement; scale: number }>();

/**
 * Most device pixels a CSS px for the map canvas: 1.5 standing still, 1 while the hero walks or
 * the bus pulls in (a slow phone keeps 45 fps or more at 4x CPU; it sharpens again on the stop).
 */
const MAP_DPR = 1.5;
const MAP_DPR_MOVING = 1;
/** A finger that moves this far, or stays down this long, is a hold (W1). */
const HOLD_PX = 8;
const HOLD_MS = 150;
/** While holding, the way is found again at most 5 times a second (W1). */
const REPATH_MS = 200;
/** How near the door a collect happens (W4); Gentle doubles it (W9). */
const COLLECT_REACH = 48;
/** An edge arrow's clear tap area, square, in CSS px (W15, "Big targets": at least 48 x 48). */
const ARROW_TAP = 48;
/** The tap squares tried in turn: 48 always when there is room; smaller only on a packed tiny screen. */
const ARROW_TAPS = [ARROW_TAP, 44, 40, 36] as const;
/** A build goes up in this long (W2 step 5: 1 to 2 s). */
const BUILD_TIME = 1.5;
/** Lines under the top row: built lines 2 s, the part paid line 2 s, the collect line 1.5 s. */
const LINE_TIME = 2;
/** Standing still: at most 2 small redraws a second (W10). */
const IDLE_MS = 500;
/** Mission complete: the heading stays this long after the end. */
const MISSION_LINGER = 2.5;

/** Where each board's mat lies, and the front of what it builds (map units, W10 table). */
export const MATS: Readonly<Record<BuildId, Pt>> = {
  road: { x: 101, y: 480 },
  mamaPut: { x: 905, y: 790 },
  market: { x: 1320, y: 818 },
  lamps: { x: 640, y: 818 },
  mast: { x: 1300, y: 540 },
};
const FRONTS: Readonly<Record<BuildId, Pt>> = {
  road: { x: (ALAUSA_ROAD.x0 + ALAUSA_ROAD.x1) / 2, y: ALAUSA_ROAD.y1 },
  mamaPut: { x: 905, y: 760 },
  market: { x: 1320, y: 800 },
  lamps: { x: 640, y: 794 },
  mast: { x: 1300, y: 514 },
};
/** The working places' doors (collect), and where their bubbles point (over the roof). */
export const DOORS: Readonly<Record<PlaceId, Pt>> = { buka: { x: 905, y: 760 }, market: { x: 1320, y: 800 } };
const BUBBLE_AT: Readonly<Record<PlaceId, Pt>> = { buka: { x: 905, y: 702 }, market: { x: 1320, y: 742 } };
/** Where the bus stops for a win (W5): by the board the challenge was for, else by the bus park. */
const BUS_STOP: Readonly<Record<BuildId, Pt>> = {
  road: { x: 90, y: 548 },
  mamaPut: { x: 808, y: 548 },
  market: { x: 1308, y: 818 },
  lamps: { x: 628, y: 818 },
  mast: { x: 1288, y: 548 },
};
const BUS_PARK_STOP: Pt = { x: 808, y: 548 };

const BUCKET_SOUND: Record<BucketKind, CitySound> = { naira: 'payChink', power: 'payBulb', tech: 'payChip' };

/** A board's price in its bucket's words, from its own units: "₦4.60", "Power 10". */
function priceText(b: BucketKind, units: number): string {
  return b === 'naira' ? formatMoney(units) : `${b === 'power' ? 'Power' : 'Tech'} ${units}`;
}
function spokenPrice(b: BucketKind, units: number): string {
  return b === 'naira' ? spokenMoney(units) : `${b === 'power' ? 'Power' : 'Tech'} ${units}`;
}
/** The board's own number: whole naira (or units). */
function boardUnits(b: BucketKind, units: number): number {
  return b === 'naira' ? units / 100 : units;
}

interface Finger {
  x: number;
  y: number;
}

interface Hero {
  x: number;
  y: number;
  dir: WalkDir;
  phase: number;
  moving: boolean;
}

interface PayAnim {
  build: BuildId;
  bucket: BucketKind;
  /** The city before this pay (drawn until the build is up). */
  before: CityState;
  amount: number;
  /** Left on the board before and after (own units). */
  leftBefore: number;
  leftAfter: number;
  done: boolean;
  pieces: number;
  t: number;
  dur: number;
  /** Pieces landed so far (a chink each). */
  landed: number;
}

interface CollectAnim {
  place: PlaceId;
  amount: number;
  t: number;
  pieces: number;
}

interface BuildAnim {
  build: BuildId;
  t: number;
  /** The city before the pay (drawn until the build is up). */
  before: CityState;
}

interface Line {
  text: string;
  t: number;
  dur: number;
  /** Seconds before it shows (a line queued after another). */
  wait: number;
}

/** A coming-soon pin's tap area, wide enough for its "Coming soon" line (bold 11 px) too. */
function soonBox(x: number, y: number, id: SoonId): ScreenBox {
  const b = soonPinHitBox(x, y, id);
  const w = Math.max(b.w, 92);
  return { ...b, x: x - w / 2, w };
}

/** What the still city picture is painted with. */
interface Paint {
  looks: SpotLooks;
  bright: string[];
  boom: boolean;
  market: boolean;
  /** False: the boom's flats and jetty left off (they come in live). */
  flats?: boolean;
}
const paintKey = (p: Paint): string => `${p.looks.potholes}|${p.looks.lightsOut}|${p.looks.slowInternet}|${p.market}|${p.boom}|${p.flats !== false}|${p.bright.join(',')}`;
function paintOf(st: CityState, market = st.built.includes('market')): Paint {
  return { looks: spotLooks(st), market, ...shownBoom(st) };
}
function paintImg(p: Paint, scale: number): HTMLCanvasElement | null {
  return makeCityCanvas(p.looks, scale, 2048, { market: p.market, bright: p.bright, boom: p.boom, flats: p.flats !== false, jetty: p.boom && p.flats !== false });
}

/** d6: the "watch it change" moment (a build, or a full collect that crossed a step). */
interface MomentRun {
  build: BuildId | null;
  t: number;
  still: boolean;
  before: CityState;
  after: CityState;
  /** The tired picture until the end; the bright one (1 map unit a px) inside the rings. */
  paint: Paint;
  img: HTMLCanvasElement | null;
  from: Pt;
  rects: Rect[];
  reach: number;
  step: { rect: Rect; at: Pt; reach: number; id: string } | null;
  /** When the step ring starts, and when the moment ends. */
  stepAt: number;
  end: number;
  cam: { from: CityCam; to: CityCam } | null;
  fired: Set<string>;
}

/** d6: the boom after a mark. */
interface BoomRun {
  mark: number;
  t: number;
  still: boolean;
  paint: Paint;
  img: HTMLCanvasElement | null;
  reach: number;
  cam: { from: CityCam; to: CityCam } | null;
  fired: Set<string>;
}

interface MissionRun {
  m: Mission;
  bus: Pt;
  t: number;
  phase: 'bus' | 'walk' | 'end';
  /** Seconds since the end (the heading lingers). */
  after: number;
}

export interface ScreenBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A sign to place: its own place on screen, where it would like its foot, and its size round the foot. */
interface SignAsk {
  id: string;
  /** Changes when the sign's words change (a new size). */
  tag: string;
  anchor: Pt;
  /** Feet to try first, best first. */
  prefer: Pt[];
  box0: ScreenBox;
  /** Its size anywhere but its own place, when that differs (a bubble away from its place drops its tail). */
  boxAway?: ScreenBox;
  /** A board on a short stick (48 px tall), for a tiny screen with no room at full size (W15). */
  boxShort?: ScreenBox;
  /** Half the size of what it stands by (the mat), so the rings start outside it. */
  hw: number;
  hh: number;
  /** A bubble may stay off screen with its place (an edge arrow shows the way). */
  mayHide: boolean;
}
interface SignSpot {
  x: number;
  y: number;
  box: ScreenBox;
  /** Not at its own place (a bubble is drawn without its tail). */
  away: boolean;
  /** A board on its short stick. */
  short?: boolean;
  /** No clear place was found: it covers something (the least it could). */
  bad?: boolean;
}
/** Something a sign keeps clear of. Soft ones (the heading, a fixed spot's tap area, which has no pin drawn) are given up only when a tiny screen has no other room. */
interface Block extends ScreenBox {
  soft?: boolean;
  /** The "Lagos" heading: hard for signs; an edge arrow's tap area may go a little under it. */
  heading?: boolean;
}

export class CityScreen {
  readonly el: HTMLElement;
  private readonly map: HTMLCanvasElement;
  private readonly pinLayer: HTMLElement;
  private readonly signLayer: HTMLElement;
  private readonly chips: HTMLElement;
  private readonly cardSpot: HTMLElement;
  private readonly hintEl: HTMLElement;
  private readonly banner: HTMLElement;
  private readonly say: HTMLElement;
  private view: CityView = { w: 1, h: 1 };
  /** Covered at the bottom (the button row), CSS px from the bottom. */
  private bottomCover = 0;
  /** The heading, chips and buttons lying over the map (CSS px in the map). */
  private covers: Block[] = [];
  cam: CityCam;
  private looks: SpotLooks;
  private pins: { spot: SpotId; el: HTMLButtonElement; pic: HTMLCanvasElement | null; word: string }[] = [];
  private boardEls = new Map<BuildId, HTMLButtonElement>();
  private bubbleEls = new Map<PlaceId, HTMLButtonElement>();
  private arrowEls: HTMLButtonElement[] = [];
  /** Where each board and bubble sits on screen now (CSS px), for taps and tests. */
  private boardBox = new Map<BuildId, ScreenBox>();
  private bubbleBox = new Map<PlaceId, ScreenBox>();
  private arrowBox: { icon: EdgeIcon; x: number; y: number; tap: number }[] = [];
  private raf = 0;
  private idleTimer = 0;
  private last = 0;
  private needDraw = true;
  /** Map draws so far (tests check that a still city draws nothing). */
  draws = 0;
  private closed = false;
  private readonly fingers = new Map<number, Finger>();
  private hold: { id: number; at: number; moved: number; on: boolean; repath: number } | null = null;
  private pinchFrom = 0;
  private pinched = false;
  /** The problem card or the not-enough card showing, if any. */
  open: SpotId | null = null;
  private notEnough: BuildId | null = null;
  hero: Hero;
  private path: Pt[] = [];
  /** The hero just stopped: paying or collecting may happen (once per stop). */
  private arrived = false;
  private stand = 0;
  private readonly keys = new Set<string>();
  private ring: { x: number; y: number; t: number } | null = null;
  private pay: PayAnim | null = null;
  private building: BuildAnim | null = null;
  private collecting: CollectAnim | null = null;
  private lines: Line[] = [];
  private wobble: { build: BuildId; t: number } | null = null;
  private mission: MissionRun | null = null;
  private time = 0;
  private hintId: string | null = null;
  private hintAt = 0;
  private chipText = '';
  /** The "Lagos" heading box with the Booming meter (d5). */
  private readonly head: HTMLElement;
  private readonly skipEl: HTMLElement;
  private soonPins: { id: SoonId; el: HTMLButtonElement; pic: HTMLCanvasElement }[] = [];
  /** The spot whose board just said "Done ✓": its pin goes at once (d6). */
  private hiddenSpot: SpotId | null = null;
  /** The coming-soon pins wait for the boom card to close, then drop in. */
  private soonWait = false;
  private soonDrop = false;
  private moment: MomentRun | null = null;
  private boomRun: BoomRun | null = null;
  /** People walking in (at most 8 moving, W10), and those who have arrived and stand. */
  private walkers: Walker[] = [];
  private standing: { x: number; y: number; look: number }[] = [];
  private danfo: { r: Route; d: number; speed: number; bus: boolean } | null = null;
  /** The meter's points while its notches fill one by one (null: the saved points). */
  private meterShown: number | null = null;
  private meterKey = '';
  /** Runs when the open card closes (the boom card's "See Lagos"). */
  private onClose: (() => void) | null = null;
  /** Arrow keys that skipped: they walk only once pressed again. */
  private readonly skipHeld = new Set<string>();

  constructor(private readonly hooks: CityScreenHooks) {
    const w = WORDS.city;
    const st = hooks.life.state;
    this.looks = spotLooks(st);
    const at = st.at && walkable(st.at) ? st.at : st.at ? nearestOpen(st.at) : { ...HERO_START };
    this.hero = { x: at.x, y: at.y, dir: 's', phase: 0, moving: false };
    this.map = h('canvas', { class: 'city-map', role: 'img', 'aria-label': w.map });
    this.signLayer = h('div', { class: 'city-signs' });
    this.pinLayer = h('div', { class: 'city-pins' });
    this.chips = h('div', { class: 'city-chips' });
    this.cardSpot = h('div', { class: 'city-card-spot', hidden: true });
    this.hintEl = h('p', { class: 'city-hint', hidden: true, 'aria-live': 'polite' });
    this.banner = h('div', { class: 'city-banner', hidden: true, role: 'status' });
    this.say = h('p', { class: 'sr-only', 'aria-live': 'polite' });
    this.head = h('h2', { class: 'city-head' });
    this.skipEl = h('p', { class: 'city-skipline', hidden: true, 'aria-hidden': 'true' });
    setJetty(shownBoom(st).boom);
    const zoomIn = button(w.zoomIn, 'minor city-zoom-btn', () => this.zoom('near'), { 'aria-label': w.zoomInSpoken });
    const zoomOut = button(w.zoomOut, 'minor city-zoom-btn', () => this.zoom('far'), { 'aria-label': w.zoomOutSpoken });
    this.el = h(
      'div',
      { class: 'card city-card', role: 'dialog', 'aria-label': w.heading },
      h('div', { class: 'city-stage' }, this.map, this.signLayer, this.pinLayer),
      h('div', { class: 'city-top' }, this.head, this.chips, h('div', { class: 'city-top-right' }, ...hooks.topRight)),
      this.hintEl,
      h('div', { class: 'city-bottom' }, h('div', { class: 'city-buttons' }, ...hooks.bottom), h('div', { class: 'city-zoom' }, zoomOut, zoomIn)),
      this.banner,
      this.skipEl,
      this.say,
      this.cardSpot,
    );
    this.cam = lastCam ?? { zoom: 'far', x: 0, y: 0 };
    this.fillMeter();
    this.fillChips();
    this.makePins();
    this.makeSigns();
    const stage = this.el.querySelector<HTMLElement>('.city-stage')!;
    stage.addEventListener('pointerdown', this.onDown);
    window.addEventListener('pointermove', this.onMove);
    window.addEventListener('pointerup', this.onUp);
    window.addEventListener('pointercancel', this.onUp);
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    window.addEventListener('resize', this.onResize);
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  /** Call once the screen is in the page (it needs its size). */
  start(): void {
    this.measure();
    this.fitHead();
    this.cam = lastCam ? clampCam(lastCam, this.view) : startCam(this.view);
    if (this.hooks.mission) this.startMission(this.hooks.mission);
    // d9: a boom whose card never showed (the tab closed mid-boom) plays now.
    else if (boomDue(this.life.state)) this.startBoom();
    this.last = performance.now();
    this.pickHint();
    this.requestDraw();
    this.idle();
    // Paint the walking picture early, so the first step does not wait for it.
    window.setTimeout(() => {
      if (!this.closed) this.picture(Math.min(window.devicePixelRatio || 1, MAP_DPR_MOVING));
    }, 700);
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    if (this.mission && this.mission.phase !== 'end') this.skipMission();
    this.finishAnims();
    this.boomRun = null;
    this.saveAt();
    this.hooks.life.flush();
    lastCam = this.cam;
    cancelAnimationFrame(this.raf);
    clearTimeout(this.idleTimer);
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
    window.removeEventListener('pointercancel', this.onUp);
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    window.removeEventListener('resize', this.onResize);
    document.removeEventListener('visibilitychange', this.onVisibility);
  }

  private get life(): CityLife {
    return this.hooks.life;
  }

  /** What the map shows: the city before a pay that is still flying or building, else the live city. */
  private get shown(): CityState {
    return this.pay?.before ?? this.building?.before ?? this.life.state;
  }

  /** The saved city changed: counters, pins, boards and the painted city follow. */
  refresh(): void {
    this.looks = spotLooks(this.shown);
    this.fillMeter();
    this.fillChips();
    this.makePins();
    this.makeSigns();
    this.requestDraw();
  }

  // ---------- Counters ----------

  /** The three chips; while money flies they count with it. */
  private fillChips(): void {
    const w = WORDS.city;
    const s = this.life.state;
    const val: Record<BucketKind, number> = { naira: s.kobo, power: s.power, tech: s.tech };
    if (this.pay) val[this.pay.bucket] += Math.round(this.pay.amount * (1 - this.pay.landed / this.pay.pieces));
    if (this.collecting) val.naira -= Math.round(this.collecting.amount * (1 - this.collectLanded()));
    const text = `${val.naira}|${val.power}|${val.tech}`;
    if (text === this.chipText) return;
    this.chipText = text;
    const chip = (kind: BucketKind, shown: string, spoken: string): HTMLElement => {
      const el = h('span', { class: `city-chip chip-${kind}` });
      el.innerHTML = bucketIconSvg(kind);
      el.append(h('span', { 'aria-hidden': 'true' }, shown), h('span', { class: 'sr-only' }, spoken));
      return el;
    };
    const made: Record<BucketKind, HTMLElement> = {
      naira: chip('naira', formatMoney(val.naira), w.spokenNaira(spokenMoney(val.naira))),
      power: chip('power', w.power(val.power), w.spokenPower(val.power)),
      tech: chip('tech', w.tech(val.tech), w.spokenTech(val.tech)),
    };
    this.chips.replaceChildren(...BUCKETS.map((b) => made[b]));
  }

  /**
   * d5: the heading box. Line 1 "Lagos", the rising-building icon and "Booming"; line 2 the bar
   * and "9 of 20". Spoken as one heading: "Lagos. Booming meter. 9 of 20 to the next boom."
   */
  private fillMeter(): void {
    const w = WORDS.city;
    const st = this.life.state;
    const m = meterOf(this.meterShown ?? st.boom, st.boomSeen);
    const small = typeof matchMedia === 'function' && matchMedia('(max-width: 640px), (max-height: 300px)').matches;
    const key = `${m.points}|${m.next}|${small}`;
    if (key === this.meterKey) return;
    this.meterKey = key;
    this.head.setAttribute('aria-label', `${w.heading}. ${w.meterSpoken(m.points, m.next)}`);
    this.head.innerHTML =
      `<span class="city-head-row"><span>${w.heading}</span><span class="boom-icon">${boomIconSvg(small ? 14 : 16)}</span><b class="boom-word">${w.booming}</b></span>` +
      `<span class="city-head-row">${boomBarSvg(m.filled, m.per, small)}<b class="boom-num">${w.meter(m.points, m.next)}</b></span>`;
  }

  private collectLanded(): number {
    const c = this.collecting;
    if (!c) return 1;
    const spread = Math.max(0, payTime(c.amount / 100) - PAY.flight);
    let n = 0;
    for (let i = 0; i < c.pieces; i++) if (c.t >= (c.pieces > 1 ? (spread * i) / (c.pieces - 1) : 0) + PAY.flight) n++;
    return n / c.pieces;
  }

  // ---------- Pins ----------

  private makePins(): void {
    const w = WORDS.city;
    this.pins = SPOT_IDS.filter((spot) => spot !== this.hiddenSpot).map((spot) => {
      const look = this.looks[spot];
      const fixed = look === 'fixed';
      const word = look === 'ready' ? 'Ready' : SPOT_WORDS[spot];
      const label = fixed ? w.pinFixed(w.fixedName[spot]) : look === 'ready' ? w.pinReady(SPOT_WORDS[spot]) : w.pinProblem(SPOT_WORDS[spot]);
      const el = button('', `city-pin ${look}`, (e) => {
        if (this.hooks.ignoreTap(e) || this.skipped()) return;
        this.openCard(spot);
      }, { 'aria-label': label, 'data-spot': spot });
      let pic: HTMLCanvasElement | null = null;
      if (!fixed) {
        pic = h('canvas', { 'aria-hidden': 'true' });
        el.append(pic);
      }
      return { spot, el, pic, word };
    });
    // d4: the coming-soon pins, from the first boom (once its card has closed).
    const soon = shownBoom(this.life.state).boom && !this.soonWait ? SOON_IDS : [];
    this.soonPins = soon.map((id) => {
      const pic = h('canvas', { 'aria-hidden': 'true' });
      const el = button('', `city-pin soon${this.soonDrop && !this.hooks.still() ? ' drop' : ''}`, (e) => {
        if (this.hooks.ignoreTap(e) || this.skipped()) return;
        this.openSoon(id);
      }, { 'aria-label': w.soon.spoken(SOON_WORDS[id]), 'data-soon': id });
      el.append(pic);
      return { id, el, pic };
    });
    this.soonDrop = false;
    this.pinLayer.replaceChildren(...this.pins.map((p) => p.el), ...this.soonPins.map((p) => p.el));
    this.paintPins();
  }

  /** Each pin's picture, drawn once at the screen's pixel size. */
  private paintPins(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    for (const p of this.pins) {
      const box = pinTapBox(0, 0, p.word);
      p.el.style.width = `${box.w}px`;
      p.el.style.height = `${box.h}px`;
      if (!p.pic) continue;
      p.pic.width = Math.round(box.w * dpr);
      p.pic.height = Math.round(box.h * dpr);
      p.pic.style.width = `${box.w}px`;
      p.pic.style.height = `${box.h}px`;
      const g = p.pic.getContext('2d');
      if (!g) continue;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, box.w, box.h);
      drawProblemPin(g, -box.x, -box.y, p.spot, this.looks[p.spot] === 'ready' ? 'ready' : 'problem', 0);
    }
    for (const p of this.soonPins) {
      const box = soonBox(0, 0, p.id);
      p.el.style.width = `${box.w}px`;
      p.el.style.height = `${box.h}px`;
      p.pic.width = Math.round(box.w * dpr);
      p.pic.height = Math.round(box.h * dpr);
      p.pic.style.width = `${box.w}px`;
      p.pic.style.height = `${box.h}px`;
      const g = p.pic.getContext('2d');
      if (!g) continue;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawComingSoonPin(g, -box.x, -box.y, p.id, 0);
    }
  }

  private placePins(): void {
    for (const p of this.pins) {
      const at = toScreen(this.cam, this.view, CITY_SPOTS[p.spot].pin);
      const box = pinTapBox(at.x, at.y, p.word);
      // Written only when it changes: no style work per frame while the camera is still.
      const t = `translate(${Math.round(box.x)}px, ${Math.round(box.y)}px)`;
      if (p.el.style.transform !== t) p.el.style.transform = t;
    }
    for (const [id, box] of Object.entries(this.soonBoxes())) {
      const el = this.soonPins.find((p) => p.id === id)!.el;
      const t = `translate(${Math.round(box.x)}px, ${Math.round(box.y)}px)`;
      if (el.style.transform !== t) el.style.transform = t;
    }
  }

  /** The coming-soon pins' tap areas on screen now (CSS px, in the map area): drawn pins, for signs, arrows and tests. */
  soonBoxes(): Partial<Record<SoonId, ScreenBox>> {
    const out: Partial<Record<SoonId, ScreenBox>> = {};
    for (const p of this.soonPins) {
      const at = toScreen(this.cam, this.view, SOON_PINS[p.id]);
      out[p.id] = soonBox(at.x, at.y, p.id);
    }
    return out;
  }

  /** Where each pin's tap area is on screen now (CSS px, inside the map area), for tests. */
  pinBoxes(): Record<SpotId, ScreenBox> {
    const out = {} as Record<SpotId, ScreenBox>;
    for (const p of this.pins) {
      const at = toScreen(this.cam, this.view, CITY_SPOTS[p.spot].pin);
      out[p.spot] = pinTapBox(at.x, at.y, p.word);
    }
    return out;
  }

  /** Boards and tray bubbles on screen now (CSS px, inside the map area), for tests. */
  boardBoxes(): Partial<Record<BuildId, ScreenBox>> {
    return Object.fromEntries(this.boardBox);
  }
  bubbleBoxes(): Partial<Record<PlaceId, ScreenBox>> {
    return Object.fromEntries(this.bubbleBox);
  }
  /** Edge arrows on screen now: middle and clear square tap size (48, smaller only when packed), for tests. */
  arrows(): { icon: string; x: number; y: number; tap: number }[] {
    return this.arrowBox.map((a) => ({ ...a }));
  }
  get missionPhase(): string | null {
    return this.mission ? this.mission.phase : null;
  }
  /** The moment and the boom now (d6), for tests. */
  get watch(): { moment: { build: string | null; t: number } | null; boom: { mark: number; t: number } | null; walkers: number; standing: number; danfo: Pt | null; soon: Partial<Record<SoonId, ScreenBox>>; bright: string[] } {
    return {
      moment: this.moment ? { build: this.moment.build, t: this.moment.t } : null,
      boom: this.boomRun ? { mark: this.boomRun.mark, t: this.boomRun.t } : null,
      walkers: this.walkers.length,
      standing: this.standing.length,
      danfo: this.danfo ? routeAt(this.danfo.r, this.danfo.d) : null,
      soon: this.soonBoxes(),
      bright: (this.moment?.paint ?? this.boomRun?.paint ?? paintOf(this.life.state)).bright,
    };
  }
  get paying(): boolean {
    return this.pay !== null || this.building !== null;
  }

  // ---------- Boards, bubbles and edge arrows (buttons over the map) ----------

  private boards(): BuildId[] {
    // During a moment the next board waits for its end (one new thing at a time).
    const mo = this.moment?.build ? this.moment : null;
    if (mo && !this.building) return boardsShown(mo.before).filter((b) => b !== mo.build && !isBuilt(this.life.state, b));
    const st = this.shown;
    const out = boardsShown(st);
    // A board stays up, "Done ✓", while its build goes up.
    const b = this.pay?.build ?? this.building?.build;
    if (b && !out.includes(b)) out.push(b);
    return out;
  }

  private trays(): PlaceId[] {
    const st = this.life.state;
    return PLACE_IDS.filter((p) => st.built.includes(p) && (st.trays[p] ?? 0) >= TRAY_MIN && !(this.collecting?.place === p) && !(this.building && PLACE_BUILD[p] === this.building.build));
  }

  /** The buttons over boards and bubbles, made again when which ones show changes. */
  private makeSigns(): void {
    const w = WORDS.city;
    const st = this.life.state;
    const want = this.boards();
    for (const [b, el] of this.boardEls) if (!want.includes(b)) {
      el.remove();
      this.boardEls.delete(b);
      this.boardBox.delete(b);
    }
    for (const b of want) {
      let el = this.boardEls.get(b);
      if (!el) {
        el = button('', 'city-sign city-board', (e) => {
          if (this.hooks.ignoreTap(e) || this.skipped()) return;
          this.goPay(b);
        }, { 'data-build': b });
        this.boardEls.set(b, el);
        this.signLayer.append(el);
      }
      const bucket = bucketOf(b);
      const left = leftOf(st, b);
      const part = left < (bucket === 'naira' ? BUILDS[b].price * 100 : BUILDS[b].price);
      el.setAttribute('aria-label', w.boardSpoken(BUILDS[b].name, spokenPrice(bucket, left), spokenPrice(bucket, inBucket(st, bucket)), part));
    }
    const trays = this.trays();
    for (const [p, el] of this.bubbleEls) if (!trays.includes(p)) {
      el.remove();
      this.bubbleEls.delete(p);
      this.bubbleBox.delete(p);
    }
    for (const p of trays) {
      let el = this.bubbleEls.get(p);
      if (!el) {
        el = button('', 'city-sign city-bubble', (e) => {
          if (this.hooks.ignoreTap(e) || this.skipped()) return;
          this.goCollect(p);
        }, { 'data-place': p });
        this.bubbleEls.set(p, el);
        this.signLayer.append(el);
      }
      el.setAttribute('aria-label', w.traySpoken(PLACES[p].name, spokenMoney(st.trays[p] ?? 0), trayFull(st, p)));
    }
    this.fitHead();
  }

  /**
   * A tiny screen (320 x 240) with four signs up (Power and Tech in hand, after the lane run) has
   * room for them only beside a short "Lagos" heading (W15, W16): the meter's picture folds away
   * there, and the spoken heading keeps it. Everywhere else the heading box shows the meter (d5).
   */
  private fitHead(): void {
    const compact = this.view.w <= 360 && this.view.h <= 300 && this.boardEls.size + this.bubbleEls.size >= 4;
    if (compact === this.head.classList.contains('compact')) return;
    this.head.classList.toggle('compact', compact);
    if (this.view.w > 1) {
      this.measure();
      this.cam = clampCam(this.cam, this.view);
      this.requestDraw();
    }
  }

  /** The Mission complete arrival, a build's moment or a boom: walking errands wait, and a tap skips (d6). */
  private busy(): boolean {
    return (this.mission !== null && this.mission.phase !== 'end') || !!this.moment?.build || this.boomRun !== null;
  }

  /** A tap or key while busy skips to the end and does nothing else (d6). */
  private skipped(): boolean {
    if (!this.busy()) return false;
    this.skip();
    return true;
  }

  private skip(): void {
    if (this.mission && this.mission.phase !== 'end') this.skipMission();
    else if (this.moment) this.endMoment(true);
    else if (this.boomRun) this.finishBoom(true);
  }

  /** Where each sign (board or bubble) sat last, and why, so it is worked out again only when something around it changes. */
  private signCache = new Map<string, { dx: number; dy: number; tag: string; zoom: Zoom; short: boolean }>();
  /** The last layout and what it was worked out for (the camera, the screen, the pins, the words). */
  private signLayout: { key: string; spots: Map<string, SignSpot> } | null = null;
  /** When the quick placer last began leaving a sign over something (-1: it is not), and when the full search may next run mid-walk (seconds). */
  private badSince = -1;
  private nextFit = 0;
  /** A sign's size round its foot, by its words (measuring words is slow on a cheap phone: once per words). */
  private signSizes = new Map<string, ScreenBox>();

  private signSize(key: string, make: () => ScreenBox): ScreenBox {
    let b = this.signSizes.get(key);
    if (!b) {
      if (this.signSizes.size > 60) this.signSizes.clear();
      b = make();
      this.signSizes.set(key, b);
    }
    return b;
  }

  /**
   * Places every board and tray bubble showing (W2, W9: a sign never sits over a pin, a chip, a
   * button or another sign; boards stay on screen). Bubbles first, by their places; then boards,
   * by their mats. Each keeps its place while it still fits, so signs do not jump while the
   * camera slides.
   */
  private layoutSigns(bubbles: readonly SignAsk[], boards: readonly SignAsk[]): Map<string, SignSpot> {
    const asks = [...bubbles, ...boards];
    // Worked out again whenever the camera, the screen, the pins or the words change (so a walk
    // that slides the camera places them again), and once more when the hero stops.
    const settled = !this.hero.moving;
    const key = [this.cam.zoom, Math.round(this.cam.x), Math.round(this.cam.y), this.view.w, this.view.h, this.view.top ?? 0, this.looks.potholes, this.looks.lightsOut, this.looks.slowInternet, this.hiddenSpot, this.soonPins.length, settled ? 's' : 'm', this.covers.map((c) => `${Math.round(c.x)},${Math.round(c.y)},${Math.round(c.w)}`).join(';'), ...asks.map((a) => `${a.id}=${a.tag}`)].join('|');
    if (this.signLayout && this.signLayout.key === key) return this.signLayout.spots;
    let out = new Map<string, SignSpot>();
    const taken: ScreenBox[] = [];
    const all = this.pinBoxes();
    // Coming-soon pins are drawn pins too (W15): hard.
    const pins: Block[] = [...(Object.entries(all) as [SpotId, ScreenBox][]).map(([spot, b]) => ({ ...b, soft: this.looks[spot] === 'fixed' })), ...Object.values(this.soonBoxes())];
    for (const ask of asks) {
      const had = this.signCache.get(ask.id);
      const prev = had && had.tag === ask.tag && had.zoom === this.cam.zoom ? { x: ask.anchor.x + had.dx, y: ask.anchor.y + had.dy, short: had.short } : null;
      const spot = this.signSpot(ask, pins, taken, prev);
      out.set(ask.id, spot);
      taken.push(spot.box);
    }
    // No clear place for one of them (a tiny screen, many signs): once the hero stands still, look
    // at every way to fit them all, at full size first, then with boards on short sticks. While the
    // hero walks the quick placing above is kept (it runs every frame the camera slides).
    // Mid-walk, a sign that has covered something for a few frames (a drawn pin, a chip, another
    // sign) gets the full search too, a few times a second (less often after a try that found no
    // way), so it never parks on a pin.
    const bad = [...out.values()].some((sp) => sp.bad);
    if (!bad) this.badSince = -1;
    else if (this.badSince < 0) this.badSince = this.time;
    const longBad = bad && !settled && this.time - this.badSince >= 0.1 && this.time >= this.nextFit;
    if (bad && (settled || longBad)) {
      const found = this.fitAllSigns(asks, pins, settled ? 8 : 16);
      if (found) out = found;
      this.nextFit = this.time + (found ? 0.2 : 0.5);
    }
    for (const ask of asks) {
      const sp = out.get(ask.id)!;
      this.signCache.set(ask.id, { dx: sp.x - ask.anchor.x, dy: sp.y - ask.anchor.y, tag: ask.tag, zoom: this.cam.zoom, short: !!sp.short });
    }
    this.signLayout = { key, spots: out };
    return out;
  }

  /**
   * Every sign clear of every pin, chip, button and other sign, if there is any such way (W2, W9,
   * W15): each sign's free places on screen (one per 16 px square, the nearest its own place),
   * then a search over them, the sign with the fewest places first. Null when there is none.
   */
  private fitAllSigns(asks: readonly SignAsk[], pins: readonly Block[], grid = 8): Map<string, SignSpot> | null {
    const vw = this.view.w;
    const vh = this.view.h;
    const blocks: Block[] = [...pins, ...this.covers];
    const hard = blocks.filter((o) => !o.soft);
    const soft = blocks.filter((o) => o.soft);
    const clearOf = (bx: ScreenBox, o: ScreenBox, gap: number): boolean => bx.x + bx.w + gap <= o.x || o.x + o.w + gap <= bx.x || bx.y + bx.h + gap <= o.y || o.y + o.h + gap <= bx.y;
    for (const short of [false, true]) {
      const lists: SignSpot[][] = [];
      for (const ask of asks) {
        const home = ask.prefer[0]!;
        const boxAt = (c: Pt, away: boolean): SignSpot => {
          const b0 = short && ask.boxShort ? ask.boxShort : away ? (ask.boxAway ?? ask.box0) : ask.box0;
          return { x: c.x, y: c.y, box: { x: c.x + b0.x, y: c.y + b0.y, w: b0.w, h: b0.h }, away: away && !!ask.boxAway, short: short && !!ask.boxShort };
        };
        if (ask.mayHide) {
          const nb = boxAt(home, false).box;
          if (nb.x + nb.w <= 0 || nb.y + nb.h <= 0 || nb.x >= vw || nb.y >= vh) {
            lists.push([boxAt(home, false)]);
            continue;
          }
        }
        const seen = new Set<string>();
        const found: { sp: SignSpot; cost: number }[] = [];
        const tryAt = (sp: SignSpot): void => {
          const b = sp.box;
          if (b.x < 0 || b.y < 0 || b.x + b.w > vw || b.y + b.h > vh) return;
          const id = `${Math.round(b.x)},${Math.round(b.y)}`;
          if (seen.has(id)) return;
          seen.add(id);
          for (const o of hard) if (!clearOf(b, o, 2)) return;
          let cost = (sp.x - home.x) ** 2 + (sp.y - home.y) ** 2;
          for (const o of soft) if (!clearOf(b, o, 2)) cost += 1e6;
          found.push({ sp, cost });
        };
        for (const c of ask.prefer) tryAt(boxAt(c, c !== home));
        // Tops and lefts: snug against the screen's edges and every block's edges (tight packing),
        // and every 8 px between.
        const b0 = short && ask.boxShort ? ask.boxShort : (ask.boxAway ?? ask.box0);
        const xs = new Set<number>([0, Math.floor(vw - b0.w)]);
        const ys = new Set<number>([0, Math.floor(vh - b0.h)]);
        for (const o of blocks) {
          xs.add(Math.ceil(o.x + o.w + 2)).add(Math.floor(o.x - b0.w - 2));
          ys.add(Math.ceil(o.y + o.h + 2)).add(Math.floor(o.y - b0.h - 2));
        }
        for (let v = 0; v + b0.w <= vw; v += grid) xs.add(v);
        for (let v = 0; v + b0.h <= vh; v += grid) ys.add(v);
        for (const by of ys) for (const bx of xs) tryAt(boxAt({ x: bx - b0.x, y: by - b0.y }, true));
        const list = found.sort((a, b) => a.cost - b.cost).map((e) => e.sp);
        if (!list.length) break;
        lists.push(list);
      }
      if (lists.length < asks.length) continue;
      const order = asks.map((_, i) => i).sort((a, b) => lists[a]!.length - lists[b]!.length);
      const pick: (SignSpot | undefined)[] = [];
      let budget = 60_000;
      const onScreen = (b: ScreenBox): boolean => b.x + b.w > 0 && b.y + b.h > 0 && b.x < vw && b.y < vh;
      const go = (k: number): boolean => {
        if (k === order.length) return true;
        const i = order[k]!;
        for (const sp of lists[i]!) {
          if (--budget < 0) return false;
          let ok = true;
          if (onScreen(sp.box)) for (const j of order.slice(0, k)) if (!clearOf(sp.box, pick[j]!.box, 2)) {
            ok = false;
            break;
          }
          if (!ok) continue;
          pick[i] = sp;
          if (go(k + 1)) return true;
        }
        pick[i] = undefined;
        return false;
      };
      if (go(0)) return new Map(asks.map((a, i) => [a.id, pick[i]!]));
    }
    return null;
  }

  /** One sign's foot on screen: its own place if it fits, else the nearest free place round it. */
  private signSpot(ask: SignAsk, pins: readonly Block[], taken: readonly ScreenBox[], prev: (Pt & { short?: boolean }) | null): SignSpot {
    const { anchor } = ask;
    const vw = this.view.w;
    const vh = this.view.h;
    const home = ask.prefer[0]!;
    const at = (c: Pt, away: boolean): SignSpot => {
      const b0 = away ? (ask.boxAway ?? ask.box0) : ask.box0;
      return { x: c.x, y: c.y, box: { x: c.x + b0.x, y: c.y + b0.y, w: b0.w, h: b0.h }, away: away && !!ask.boxAway };
    };
    const isHome = (c: Pt): boolean => Math.abs(c.x - home.x) < 0.5 && Math.abs(c.y - home.y) < 0.5;
    // A bubble whose place is off the screen stays there (its edge arrow shows the way).
    if (ask.mayHide) {
      const nb = at(home, false).box;
      if (nb.x + nb.w <= 0 || nb.y + nb.h <= 0 || nb.x >= vw || nb.y >= vh) return at(home, false);
    }
    const blocks: Block[] = [...pins, ...this.covers, ...taken];
    const hard = blocks.filter((o) => !o.soft);
    const clearOf = (bx: ScreenBox, o: ScreenBox, gap: number): boolean => bx.x + bx.w + gap <= o.x || o.x + o.w + gap <= bx.x || bx.y + bx.h + gap <= o.y || o.y + o.h + gap <= bx.y;
    const fitsIn = (sp: SignSpot, list: readonly Block[], gap: number): boolean => {
      const bx = sp.box;
      if (bx.x < 0 || bx.y < 0 || bx.x + bx.w > vw || bx.y + bx.h > vh) return false;
      for (const o of list) if (!clearOf(bx, o, gap)) return false;
      return true;
    };
    const fits = (sp: SignSpot): boolean => fitsIn(sp, blocks, 4);
    // Its last place while still clear, by the 2 px the tight placing below and the full fit
    // use, so a fitted sign stays put while the camera slides.
    if (prev) {
      const sp = at(prev, !isHome(prev));
      if (fitsIn(sp, blocks, 2)) return sp;
      // It stood on its short stick (W15): keep that while it still fits.
      const b0 = prev.short ? ask.boxShort : undefined;
      if (b0) {
        const ss = { x: prev.x, y: prev.y, box: { x: prev.x + b0.x, y: prev.y + b0.y, w: b0.w, h: b0.h }, away: true, short: true };
        if (fitsIn(ss, blocks, 2)) return ss;
      }
    }
    for (const c of ask.prefer) {
      const sp = at(c, c !== home);
      if (fits(sp)) return sp;
    }
    // Rings round its place, 8 px apart.
    const b0 = ask.boxAway ?? ask.box0;
    const bw = b0.w;
    const bh = b0.h;
    const cx = anchor.x - (b0.x + bw / 2);
    const cy = anchor.y - (b0.y + bh / 2);
    for (let r = 8; r <= 240; r += 8) {
      const n = Math.max(8, Math.round(r / 6));
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2;
        const sp = at({ x: cx + Math.cos(a) * (r + ask.hw), y: cy + Math.sin(a) * (r + ask.hh) }, true);
        if (fits(sp)) return sp;
      }
    }
    // A tight screen (320 x 240, 640 x 200): every free place on screen, 2 px apart (6 while the
    // hero walks: this runs every frame then, and the full fit follows soon); the nearest wins.
    // First clear of everything; then clear of all but the soft things.
    const step = this.hero.moving ? 6 : 2;
    for (const list of [blocks, hard]) {
      let pick: SignSpot | null = null;
      let best = Infinity;
      for (let by = 0; by + bh <= vh; by += step)
        for (let bx = 0; bx + bw <= vw; bx += step) {
          const c = { x: bx - b0.x, y: by - b0.y };
          const d = (c.x - home.x) ** 2 + (c.y - home.y) ** 2;
          if (d >= best) continue;
          const sp = at(c, true);
          if (fitsIn(sp, list, 2)) {
            best = d;
            pick = sp;
          }
        }
      if (pick) return pick;
    }
    // Nowhere is free: on screen where it covers the least (a soft thing before a pin, a pin before a button).
    let pick: SignSpot | null = null;
    let least = Infinity;
    for (let by = 0; by + bh <= vh; by += step * 2)
      for (let bx = 0; bx + bw <= vw; bx += step * 2) {
        const sp = at({ x: bx - b0.x, y: by - b0.y }, true);
        const b = sp.box;
        let over = 0;
        for (const o of blocks) {
          const ov = Math.max(0, Math.min(b.x + bw, o.x + o.w + 2) - Math.max(b.x, o.x - 2)) * Math.max(0, Math.min(b.y + bh, o.y + o.h + 2) - Math.max(b.y, o.y - 2));
          over += ov * (o.soft ? 1 : pins.includes(o) ? 20 : 400);
        }
        const score = over * 1000 + (sp.x - home.x) ** 2 + (sp.y - home.y) ** 2;
        if (score < least) {
          least = score;
          pick = sp;
        }
      }
    return { ...(pick ?? at(home, false)), bad: true };
  }

  // ---------- The problem card and the not-enough card ----------

  openCard(spot: SpotId): void {
    const w = WORDS.city;
    const back = button(w.back, 'minor', () => this.closeCard());
    const st = this.life.state;
    let body: HTMLElement[];
    if (this.looks[spot] === 'fixed') {
      body = [h('h2', {}, w.fixedName[spot]), h('p', { class: 'city-fixed' }, w.fixed)];
    } else {
      const b = SPOT_BUILD[spot];
      const some = inBucket(st, bucketOf(b)) > 0;
      const shown = boardsShown(st).includes(b);
      const walk = (big: boolean): HTMLButtonElement =>
        button(w.walkThere, big ? 'go' : 'minor', (e) => {
          if (this.hooks.ignoreTap(e)) return;
          this.closeCard();
          this.goPay(b);
        });
      if (spot === 'potholes') {
        const c = w.cards.potholes;
        const run = (big: boolean): HTMLButtonElement =>
          button(c.go, big ? 'go' : 'minor', (e) => {
            if (this.hooks.ignoreTap(e)) return;
            this.hooks.run(spot, e);
          });
        const bigWalk = some && shown;
        body = [h('h2', {}, c.line1), h('p', {}, c.line2(formatMoney(priceOf(b)))), bigWalk ? walk(true) : run(true)];
        const small = bigWalk ? run(false) : shown ? walk(false) : null;
        const card = this.showCard(spot, SPOT_WORDS[spot], body, small ? [small, back] : [back]);
        (card.querySelector<HTMLElement>('.go') ?? back).focus({ preventScroll: true });
        return;
      }
      const c = w.cards[spot];
      // Until the lane run (step (f)) exists, its button is a plain line.
      body = [h('h2', {}, c.line1), h('p', {}, c.line2), some && shown ? walk(true) : h('p', { class: 'city-soon' }, c.soon)];
      if (some && shown) body.push(h('p', { class: 'city-soon' }, c.soon));
    }
    const card = this.showCard(spot, SPOT_WORDS[spot], body, [back]);
    (card.querySelector<HTMLElement>('.go') ?? back).focus({ preventScroll: true });
  }

  /** d8: a coming-soon pin's card. */
  private openSoon(id: SoonId): void {
    const w = WORDS.city;
    const back = button(w.back, 'minor', () => this.closeCard());
    this.showCard(null, SOON_WORDS[id], [h('h2', {}, SOON_WORDS[id]), h('p', {}, w.soon[id]), h('p', { class: 'city-soon' }, w.soon.line)], [back]);
    this.onClose = () => this.soonPins.find((p) => p.id === id)?.el.focus({ preventScroll: true });
    back.focus({ preventScroll: true });
  }

  private showCard(spot: SpotId | null, name: string, body: HTMLElement[], small: HTMLElement[]): HTMLElement {
    const card = h('div', { class: 'card narrow city-problem', role: 'dialog', 'aria-label': name, 'data-spot': spot ?? undefined }, ...body, h('div', { class: 'minor-row' }, ...small));
    this.cardSpot.replaceChildren(card);
    this.cardSpot.hidden = false;
    this.open = spot;
    this.stopWalking();
    return card;
  }

  /** W2 "Not enough": nothing in that bucket. */
  private showNotEnough(b: BuildId): void {
    const w = WORDS.city;
    const bucket = bucketOf(b);
    const back = button(w.back, 'minor', () => this.closeCard());
    const body: HTMLElement[] = [h('p', { class: 'city-need' }, w.need(priceText(bucket, leftOf(this.life.state, b))))];
    if (bucket === 'naira') {
      body.push(
        h('p', {}, w.earnRun),
        button(w.cards.potholes.go, 'go', (e) => {
          if (this.hooks.ignoreTap(e)) return;
          this.hooks.run('potholes', e);
        }),
      );
    } else body.push(h('p', {}, w.earnLane(bucket)), h('p', { class: 'city-soon' }, w.cards.lightsOut.soon));
    const card = this.showCard(null, BUILDS[b].name, body, [back]);
    card.classList.add('city-short');
    this.notEnough = b;
    (card.querySelector<HTMLElement>('.go') ?? back).focus({ preventScroll: true });
  }

  closeCard(): void {
    const was = this.open;
    const ne = this.notEnough;
    this.open = null;
    this.notEnough = null;
    this.cardSpot.hidden = true;
    this.cardSpot.replaceChildren();
    if (was) this.pins.find((p) => p.spot === was)?.el.focus({ preventScroll: true });
    else if (ne) this.boardEls.get(ne)?.focus({ preventScroll: true });
    const then = this.onClose;
    this.onClose = null;
    then?.();
  }

  private get cardOpen(): boolean {
    return !this.cardSpot.hidden;
  }

  // ---------- Walking ----------

  /**
   * Walks to `to` (map units) by the grid path. A board's mat or a place's door: on arrival the
   * hero pays or collects by themselves (onStand).
   */
  walkTo(to: Pt, ring = false): void {
    this.path = findPath(this.hero, to);
    this.arrived = false;
    this.stand = 0;
    if (ring && this.path.length) {
      const end = this.path[this.path.length - 1]!;
      this.ring = { x: end.x, y: end.y, t: 0 };
    }
    if (this.path.length) this.startedWalking();
    else {
      // Already there: the errand happens now.
      this.hero.moving = false;
      this.arrived = true;
    }
    this.wake();
  }

  private goPay(b: BuildId): void {
    this.walkTo(MATS[b]);
  }

  private goCollect(p: PlaceId): void {
    this.walkTo(nearestOpen({ x: DOORS[p].x, y: DOORS[p].y + 14 }));
  }

  private stopWalking(): void {
    this.path = [];
    this.hold = null;
    this.keys.clear();
    if (this.hero.moving) this.stopped();
  }

  private startedWalking(): void {
    this.hero.moving = true;
    if (!this.life.state.hints.includes('walk')) {
      this.life.set(withHint(this.life.state, 'walk'));
      if (this.hintId === 'walk') this.setHint(null);
    }
  }

  private stopped(): void {
    this.hero.moving = false;
    // Sharp again now the hero stands still.
    this.needDraw = true;
    this.arrived = true;
    this.stand = 0;
    this.saveAt();
  }

  private saveAt(): void {
    // Only a real move is saved (a first visit that never walked writes nothing).
    const at = this.life.state.at ?? HERO_START;
    if (Math.round(at.x) !== Math.round(this.hero.x) || Math.round(at.y) !== Math.round(this.hero.y)) this.life.set({ ...this.life.state, at: { x: Math.round(this.hero.x), y: Math.round(this.hero.y) } });
  }

  private moveHero(dt: number): void {
    const hero = this.hero;
    const was = { x: hero.x, y: hero.y };
    const keyDir = this.keyDir();
    if (keyDir) {
      this.path = [];
      if (!hero.moving) this.startedWalking();
      const step = WALKER.speed * dt;
      const nx = hero.x + keyDir.x * step;
      const ny = hero.y + keyDir.y * step;
      if (lineClear(hero, { x: nx, y: ny })) {
        hero.x = nx;
        hero.y = ny;
      } else if (walkable({ x: nx, y: hero.y })) hero.x = nx;
      else if (walkable({ x: hero.x, y: ny })) hero.y = ny;
    } else if (this.path.length) {
      let budget = WALKER.speed * dt;
      while (budget > 0 && this.path.length) {
        const to = this.path[0]!;
        const d = Math.hypot(to.x - hero.x, to.y - hero.y);
        if (d <= budget) {
          hero.x = to.x;
          hero.y = to.y;
          budget -= d;
          this.path.shift();
        } else {
          hero.x += ((to.x - hero.x) / d) * budget;
          hero.y += ((to.y - hero.y) / d) * budget;
          budget = 0;
        }
      }
      if (!this.path.length && !(this.hold && this.hold.on)) this.stopped();
    } else if (hero.moving && !(this.hold && this.hold.on)) this.stopped();
    const dx = hero.x - was.x;
    const dy = hero.y - was.y;
    const moved = Math.hypot(dx, dy);
    if (moved > 0) {
      hero.dir = walkDir(dx, dy, hero.dir);
      hero.phase = (hero.phase + moved / WALKER.cycle) % 1;
      this.follow();
      this.needDraw = true;
      // Gentle: collect any tray walked past within reach (W9).
      if (this.hooks.gentle()) this.tryCollect(false);
    }
  }

  private keyDir(): Pt | null {
    let x = 0;
    let y = 0;
    if (this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('ArrowUp')) y -= 1;
    if (this.keys.has('ArrowDown')) y += 1;
    if (x === 0 && y === 0) return null;
    const d = Math.hypot(x, y);
    return { x: x / d, y: y / d };
  }

  /** W1: the hero stays in the middle half of the screen under the top row; the camera slides to keep them in. */
  private follow(): void {
    const s = camScale(this.cam.zoom, this.view);
    const p = toScreen(this.cam, this.view, this.hero);
    const top = this.view.top ?? 0;
    const bottom = this.view.h - this.bottomCover;
    const x0 = this.view.w / 4;
    const x1 = (this.view.w * 3) / 4;
    const y0 = top + (bottom - top) / 4;
    const y1 = top + ((bottom - top) * 3) / 4;
    let dx = 0;
    let dy = 0;
    if (p.x < x0) dx = x0 - p.x;
    else if (p.x > x1) dx = x1 - p.x;
    const yy = p.y - (WALKER.h * s) / 2;
    if (yy < y0) dy = y0 - yy;
    else if (yy > y1) dy = y1 - yy;
    if (dx || dy) this.cam = clampCam({ zoom: this.cam.zoom, x: this.cam.x + dx, y: this.cam.y + dy }, this.view);
  }

  // ---------- Paying, building, collecting ----------

  /** The board whose mat the hero stands on, if any. */
  private matUnderHero(): BuildId | null {
    for (const b of boardsShown(this.life.state)) {
      const m = MATS[b];
      if (Math.abs(this.hero.x - m.x) <= MAT.w / 2 && Math.abs(this.hero.y - m.y) <= MAT.h / 2) return b;
    }
    return null;
  }

  /** Standing still after a stop: pay on a mat (after 0.3 s, none in Gentle), collect at a door. */
  private onStand(dt: number): void {
    if (this.hero.moving || !this.arrived || this.pay || this.cardOpen) return;
    if (this.tryCollect(true)) {
      this.arrived = false;
      return;
    }
    const b = this.matUnderHero();
    if (!b) {
      this.arrived = false;
      return;
    }
    this.stand += dt;
    if (this.stand < (this.hooks.gentle() ? 0 : PAY.standWait)) {
      this.wake();
      return;
    }
    this.arrived = false;
    this.startPay(b);
  }

  private startPay(b: BuildId): void {
    const before = this.life.state;
    const r = payBoard(before, b);
    if (!r) {
      // Nothing in that bucket: one small wobble and the not-enough card.
      if (!this.hooks.still()) this.wobble = { build: b, t: 0 };
      this.hooks.sound('notEnough');
      if (!this.mission) this.showNotEnough(b);
      this.needDraw = true;
      return;
    }
    const bucket = bucketOf(b);
    const units = boardUnits(bucket, r.amount);
    this.pay = {
      build: b,
      bucket,
      before,
      amount: r.amount,
      leftBefore: leftOf(before, b),
      leftAfter: r.left,
      done: r.done,
      pieces: flyingCount(units),
      t: 0,
      dur: this.hooks.still() ? 0 : payTime(units),
      landed: 0,
    };
    // Saved at once: a reload mid-flight keeps the pay.
    this.life.set(r.next, true);
    if (this.hintId === 'buka' && b === 'mamaPut') this.setHint(null);
    this.makeSigns();
    this.wake();
  }

  private stepPay(dt: number): void {
    const p = this.pay;
    if (!p) return;
    p.t += dt;
    const spread = Math.max(0, p.dur - PAY.flight);
    let landed = 0;
    for (let i = 0; i < p.pieces; i++) if (p.t >= (p.pieces > 1 ? (spread * i) / (p.pieces - 1) : 0) + PAY.flight || p.dur === 0) landed++;
    if (landed > p.landed) {
      for (let i = p.landed; i < landed && p.dur > 0; i++) this.hooks.sound(BUCKET_SOUND[p.bucket]);
      p.landed = landed;
      this.fillChips();
    }
    this.needDraw = true;
    if (p.t < p.dur) return;
    this.pay = null;
    const w = WORDS.city;
    if (p.done) {
      this.hooks.sound('built');
      this.building = { build: p.build, t: 0, before: p.before };
      this.startMoment(p.build, p.before);
      if (this.hooks.still()) this.endBuild();
    } else {
      this.addLine(w.partPaid(priceText(p.bucket, p.amount), priceText(p.bucket, p.leftAfter)));
      this.announce();
      this.refresh();
    }
  }

  /** The build is up: its board goes. The moment (d6) says the built line and paints the bright city. */
  private endBuild(): void {
    if (!this.building) return;
    this.building = null;
    this.makeSigns();
    this.needDraw = true;
  }

  // ---------- The "watch it change" moment and the boom (d6) ----------

  /**
   * A board said "Done ✓" (`build`), or a full collect crossed a meter step (`build` null): the
   * pin goes at once, the camera eases to the fix, a ring of colour spreads the bright city from
   * the mat, people walk in, a danfo drives, the sting plays. `before` is the city before the pay.
   */
  private startMoment(build: BuildId | null, before: CityState): void {
    if (this.moment) this.endMoment(true);
    const after = this.life.state;
    const step = stepBlock(before, after);
    if (!build && !step) return;
    const still = this.hooks.still();
    const rects = build ? fixRects(build) : [];
    const from = build ? MATS[build] : this.hero;
    const sr = step ? areaRect(step) : null;
    const mo: MomentRun = {
      build,
      t: 0,
      still,
      before,
      after,
      paint: paintOf(before, before.built.includes('market') || build === 'market'),
      img: still ? null : paintImg(paintOf(after), 1),
      from,
      rects,
      reach: ringReach(from, rects),
      step: step && sr ? { id: step, rect: sr, at: middle(sr), reach: ringReach(middle(sr), [sr]) } : null,
      stepAt: build ? MOMENT.sting : 0,
      end: still ? MOMENT.hold : build ? MOMENT.end : MOMENT.stepRing,
      cam: null,
      fired: new Set(),
    };
    this.moment = mo;
    if (!build) {
      // A collect: the step ring, the step sound and the step line, where it is (no camera move).
      this.momentWords(mo);
      return;
    }
    this.meterShown = before.boom;
    const spot = (SPOT_IDS as readonly string[]).includes(BUILD_KEY[build]) ? (BUILD_KEY[build] as SpotId) : null;
    if (spot) {
      this.hiddenSpot = spot;
      this.makePins();
    }
    // The camera: the whole fix set and the hero on screen, keeping the zoom if they fit, else far
    // (never in). Mission complete keeps the hero in the middle.
    const s0 = camScale(this.cam.zoom, this.view);
    const box = around(rects, [this.hero]);
    const top = this.view.top ?? 0;
    const room = this.view.h - top - this.bottomCover;
    const zoom: Zoom = box.w * s0 <= this.view.w - 16 && box.h * s0 <= room - 16 ? this.cam.zoom : 'far';
    if (zoom !== this.cam.zoom) this.cam = zoomCam(this.cam, this.view, zoom, toScreen(this.cam, this.view, this.hero));
    const s = camScale(zoom, this.view);
    const c = this.mission ? this.hero : middle(box);
    const to = clampCam({ zoom, x: this.view.w / 2 - c.x * s, y: top + room / 2 - c.y * s }, this.view);
    if (still) this.cam = to;
    else mo.cam = { from: { ...this.cam }, to };
    this.wake();
  }

  private stepMoment(dt: number): void {
    const mo = this.moment;
    if (!mo) return;
    mo.t += dt;
    this.needDraw = true;
    const t = mo.t;
    const once = (k: string, at: number): boolean => {
      if (t < at || mo.fired.has(k)) return false;
      mo.fired.add(k);
      return true;
    };
    if (mo.cam) {
      const k = ease(t / MOMENT.camera);
      const { from, to } = mo.cam;
      this.cam = { zoom: to.zoom, x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k };
      if (k >= 1) mo.cam = null;
    }
    if (mo.build && !mo.still) {
      // The meter's notches, one each 0.1 s.
      const n = Math.max(0, Math.min(mo.after.boom - mo.before.boom, Math.floor((t - MOMENT.notches) / MOMENT.notch) + 1));
      if (this.meterShown !== mo.before.boom + n) {
        this.meterShown = mo.before.boom + n;
        this.fillMeter();
      }
      if (once('walk', MOMENT.walk[0])) this.addWalkers(this.newAreas(mo), mo.build === 'road' ? 6 : 4, MOMENT.walk[1] - MOMENT.walk[0]);
      if (once('drive', MOMENT.drive[0])) {
        let r = DANFO_ROUTE[mo.build];
        // Mission complete: the bus that brought the hero is the danfo, when it stands on that road.
        const bus = this.mission?.phase === 'walk' ? this.mission.bus : null;
        const across = r.dir === 'e' || r.dir === 'w';
        const own = !!bus && Math.abs(across ? bus.y - r.from.y : bus.x - r.from.x) < 40;
        if (bus && own) r = { ...r, from: across ? { x: bus.x, y: r.from.y } : { x: r.from.x, y: bus.y } };
        this.hooks.sound('horn');
        this.danfo = { r, d: 0, speed: routeLength(r) / (MOMENT.drive[1] - MOMENT.drive[0]), bus: own };
      }
      if (once('words', MOMENT.sting)) this.momentWords(mo);
    }
    if (t >= mo.end) this.endMoment(false);
  }

  /** The blocks this moment brightens (where its walkers go). */
  private newAreas(mo: MomentRun): string[] {
    const was = shownBoom(mo.before).bright;
    return shownBoom(mo.after).bright.filter((a) => !was.includes(a) && a !== 'shore');
  }

  /** d6, d8: the sting and the built line, then the step sound and line; the spoken words. */
  private momentWords(mo: MomentRun): void {
    mo.fired.add('words');
    const w = WORDS.city;
    const said: string[] = [];
    if (mo.build) {
      this.hooks.sound('sting');
      this.addLine(w.builtLine[mo.build]);
      said.push(w.builtLine[mo.build]);
    } else if (this.lines[0]) said.push(this.lines[0].text);
    if (mo.step) {
      this.hooks.sound('step');
      this.addLine(w.stepLine, 1.5, true);
      said.push(w.stepSpoken);
    }
    const st = this.life.state;
    const m = meterOf(st.boom, st.boomSeen);
    this.say.textContent = [...said, w.meterSpoken(m.points, m.next), `${w.spokenNaira(spokenMoney(st.kobo))}.`].join(' ');
  }

  /** The moment ends (or is skipped): everything bright, the walkers standing, the still city painted once. */
  private endMoment(skip: boolean): void {
    const mo = this.moment;
    if (!mo) return;
    if (!mo.fired.has('words')) this.momentWords(mo);
    if (this.building) this.endBuild();
    this.moment = null;
    if (mo.img) mo.img.width = 0;
    this.danfo = null;
    if (mo.cam) this.cam = mo.cam.to;
    if (mo.build) {
      if (!mo.fired.has('walk')) this.addWalkers(this.newAreas(mo), mo.build === 'road' ? 6 : 4, 0, undefined, true);
      if (skip) this.finishWalkers();
    }
    this.meterShown = null;
    this.hiddenSpot = null;
    this.refresh();
    if (this.mission?.phase === 'walk') this.endMission();
    if (!this.closed && boomDue(this.life.state)) this.startBoom(skip);
    this.wake();
  }

  /** d6: the boom after a mark. Later marks (50, 90, ...) show the card only, until later areas exist. */
  private startBoom(skip = false): void {
    const st = this.life.state;
    const mark = boomDue(st);
    if (!mark || this.boomRun || this.cardOpen) return;
    this.stopWalking();
    this.banner.hidden = true;
    if (mark > FIRST_BOOM || skip || st.boomSeen >= FIRST_BOOM) {
      if (mark === FIRST_BOOM) this.addWalkers(['busPark'], 6, 0, undefined, true);
      this.openBoomCard(mark);
      return;
    }
    const still = this.hooks.still();
    const run: BoomRun = {
      mark,
      t: 0,
      still,
      paint: paintOf(st),
      img: still ? null : paintImg({ ...paintOf({ ...st, boomSeen: mark }), flats: false }, 1),
      reach: ringReach(BOOM.from, [{ x: 0, y: 0, w: 1600, h: 1000 }]),
      cam: null,
      fired: new Set(),
    };
    const to = centreOn({ x: 800, y: 560 }, 'far', this.view);
    if (this.cam.zoom !== 'far') this.cam = zoomCam(this.cam, this.view, 'far', toScreen(this.cam, this.view, this.hero));
    if (still) this.cam = to;
    else run.cam = { from: { ...this.cam }, to };
    this.boomRun = run;
    this.wake();
  }

  private stepBoom(dt: number): void {
    const r = this.boomRun;
    if (!r) return;
    r.t += dt;
    this.needDraw = true;
    if (r.still) {
      // Reduced motion: the picture holds still, then everything appears in one cut.
      if (r.t >= MOMENT.hold) {
        this.hooks.sound('boom');
        this.finishBoom(true);
      }
      return;
    }
    if (r.cam) {
      const k = ease(r.t / BOOM.camera);
      this.cam = { zoom: 'far', x: r.cam.from.x + (r.cam.to.x - r.cam.from.x) * k, y: r.cam.from.y + (r.cam.to.y - r.cam.from.y) * k };
      if (k >= 1) r.cam = null;
    }
    if (r.t >= BOOM.tune && !r.fired.has('tune')) {
      r.fired.add('tune');
      this.hooks.sound('boom');
    }
    if (r.t >= BOOM.walk[0] && !r.fired.has('walk')) {
      r.fired.add('walk');
      this.addWalkers(['busPark'], 6, BOOM.walk[1] - BOOM.walk[0], BRIDGE_FOOT);
    }
    if (r.t >= BOOM.card) this.finishBoom(false);
  }

  /** The boom's end, or a skip: straight to the open boom card. */
  private finishBoom(skip: boolean): void {
    const r = this.boomRun;
    if (!r) return;
    this.boomRun = null;
    if (r.img) r.img.width = 0;
    if (r.cam) this.cam = r.cam.to;
    if (!r.fired.has('walk')) this.addWalkers(['busPark'], 6, 0, undefined, true);
    if (skip) this.finishWalkers();
    this.openBoomCard(r.mark);
  }

  /** d8: "Lagos is booming!"; saved as seen at once (d9), the cog turns at the first boom. */
  private openBoomCard(mark: number): void {
    const w = WORDS.city.boom;
    const st = this.life.state;
    const cog = mark === FIRST_BOOM && st.boomSeen < FIRST_BOOM && !(this.hooks.cogOn?.() ?? false);
    this.life.set({ ...st, boomSeen: Math.max(st.boomSeen, mark) }, true);
    setJetty(shownBoom(this.life.state).boom);
    this.soonWait = true;
    this.refresh();
    const go = button(w.go, 'go', () => this.closeCard());
    this.showCard(null, w.heading, [h('h2', {}, w.heading), h('p', {}, w.body), ...(cog ? [h('p', { class: 'city-fixed' }, w.cog)] : []), go], []);
    this.onClose = () => {
      this.soonWait = false;
      this.soonDrop = true;
      this.makePins();
      this.requestDraw();
    };
    go.focus({ preventScroll: true });
    this.say.textContent = [w.heading, w.body, ...(cog ? [w.cog] : [])].join(' ');
    if (cog) {
      this.hooks.sound('cogRatchet');
      window.setTimeout(() => {
        if (!this.closed) this.hooks.sound('cogBell');
      }, 320);
    }
  }

  /**
   * People walk in to the fronts of `areas` (from `from`, else the bus park or the nearest road
   * end), arriving about `dur` s later. Never more than 8 moving (W10): the rest are left out.
   * `now`: they are already standing there (reduced motion, a skip).
   */
  private addWalkers(areas: readonly string[], want: number, dur: number, from?: Pt, now = false): void {
    if (now || this.hooks.still()) {
      for (const [k, p] of walkTargets(areas, want).entries()) this.standAt({ ...p, look: k * 3 + 1 });
      return;
    }
    const porter = this.life.state.built.includes('market') && this.life.state.fixed.includes('potholes') ? 1 : 0;
    const n = Math.max(0, Math.min(want, MOVING_PEOPLE - porter - this.walkers.length));
    this.walkers.push(...planWalkers(areas, n, dur, from));
  }

  private standAt(p: { x: number; y: number; look: number }): void {
    this.standing.push(p);
    if (this.standing.length > 24) this.standing.shift();
  }

  private finishWalkers(): void {
    for (const w of this.walkers) this.standAt({ ...w.pts[w.pts.length - 1]!, look: w.look });
    this.walkers = [];
  }

  private stepLife(dt: number): void {
    if (this.walkers.length) {
      this.needDraw = true;
      this.walkers = this.walkers.filter((w) => {
        w.t += dt;
        const at = walkerAt(w);
        if (at.done) this.standAt({ x: at.x, y: at.y, look: w.look });
        return !at.done;
      });
    }
    const d = this.danfo;
    if (d && d.d < routeLength(d.r)) {
      d.d = driveOn(d.r, d.d, d.speed * dt, this.hero);
      this.needDraw = true;
    }
  }

  private stepBuild(dt: number): void {
    const b = this.building;
    if (!b) return;
    b.t += dt / BUILD_TIME;
    this.needDraw = true;
    if (b.t >= 1) this.endBuild();
  }

  /** Collects a tray when the hero is within reach of its door. `stop`: on a stop (else in passing, Gentle). */
  private tryCollect(stop: boolean): boolean {
    if (this.collecting || this.mission?.phase === 'bus') return false;
    const reach = COLLECT_REACH * (this.hooks.gentle() ? 2 : 1);
    for (const p of PLACE_IDS) {
      const d = DOORS[p];
      if (Math.hypot(this.hero.x - d.x, this.hero.y - d.y) > reach) continue;
      const r = collectTray(this.life.state, p);
      if (!r) continue;
      if (!stop && !this.hooks.gentle()) continue;
      const before = this.life.state;
      this.life.set(r.next, true);
      this.collecting = { place: p, amount: r.amount, t: 0, pieces: flyingCount(r.amount / 100) };
      this.hooks.sound('collect');
      this.addLine(WORDS.city.collectLine(formatMoney(r.amount), PLACES[p].name), PAY.collectLine);
      if (this.hintId === 'collect') this.setHint(null);
      this.makeSigns();
      this.fillChips();
      this.announce();
      if (this.hooks.still()) this.collecting = null;
      if (r.full) {
        this.fillMeter();
        this.startMoment(null, before);
        if (!this.moment && r.next.boom > before.boom) {
          const m = meterOf(r.next.boom, r.next.boomSeen);
          this.say.textContent = `${this.say.textContent ?? ''} ${WORDS.city.meterSpoken(m.points, m.next)}`.trim();
          this.startBoom();
        }
      }
      this.wake();
      return true;
    }
    return false;
  }

  private stepCollect(dt: number): void {
    const c = this.collecting;
    if (!c) return;
    c.t += dt;
    this.needDraw = true;
    this.fillChips();
    if (c.t >= payTime(c.amount / 100)) {
      this.collecting = null;
      this.fillChips();
    }
  }

  /** A line over the hero; `after`: it waits for the line showing now to end. */
  private addLine(text: string, dur = LINE_TIME, after = false): void {
    const last = this.lines[this.lines.length - 1];
    if (after && last) this.lines.push({ text, t: 0, dur, wait: last.wait + (1 - last.t) * last.dur });
    else {
      this.lines = [{ text, t: 0, dur, wait: 0 }];
      this.say.textContent = text;
    }
  }

  /** After a pay or a collect, the new amounts are read out once (W9). */
  private announce(): void {
    const s = this.life.state;
    const w = WORDS.city;
    const line = this.lines[0]?.text ?? '';
    this.say.textContent = `${line} ${w.spokenNaira(spokenMoney(s.kobo))}.`.trim();
  }

  /** Ends every animation at once: paid, built, collected (a skip, or leaving the screen). */
  private finishAnims(): void {
    if (this.pay) {
      this.pay.t = this.pay.dur;
      this.pay.dur = 0;
      this.stepPay(0);
    }
    if (this.building) this.endBuild();
    if (this.moment) this.endMoment(true);
    this.collecting = null;
  }

  // ---------- Mission complete (W5) ----------

  private startMission(m: Mission): void {
    const w = WORDS.city.mission;
    const st = this.life.state;
    const build = m.build && !isBuilt(st, m.build) ? m.build : null;
    const bus = build ? BUS_STOP[build] : BUS_PARK_STOP;
    let line: string;
    if (build) {
      const bucket = bucketOf(build);
      const short = leftOf(st, build) - inBucket(st, bucket);
      line = short > 0 ? w.more(priceText(bucket, short)) : w.line[build];
    } else line = w.brought(formatMoney(m.kobo));
    this.banner.replaceChildren(h('h2', {}, w.heading), h('p', {}, line), h('p', { class: 'city-skip' }, w.skip));
    this.banner.hidden = false;
    this.mission = { m: { ...m, build }, bus, t: 0, phase: 'bus', after: 0 };
    const off = busArrivalHero(1);
    this.hero.x = bus.x + off.x;
    this.hero.y = bus.y + off.y;
    this.hero.dir = 's';
    this.hero.moving = false;
    this.path = [];
    this.cam = zoomCam({ ...this.cam }, this.view, 'near');
    const s = camScale('near', this.view);
    const mid = build ? { x: (this.hero.x + MATS[build].x) / 2, y: (this.hero.y + MATS[build].y) / 2 } : this.hero;
    this.cam = clampCam({ zoom: 'near', x: this.view.w / 2 - mid.x * s, y: (this.view.h + (this.view.top ?? 0) - this.bottomCover) / 2 - mid.y * s }, this.view);
    if (this.hooks.still()) this.skipMission();
  }

  private stepMission(dt: number): void {
    const ms = this.mission;
    if (!ms) return;
    this.needDraw = true;
    if (ms.phase === 'bus') {
      ms.t += dt;
      if (ms.t >= BUS_ARRIVAL.time) {
        if (ms.m.build) {
          ms.phase = 'walk';
          this.walkTo(MATS[ms.m.build]);
        } else this.endMission();
      }
    } else if (ms.phase === 'walk') {
      ms.t += dt;
      // A part pay ends the mission as the money lands (nothing to build yet).
      if (!this.pay && !this.building && !this.moment && !this.hero.moving && !this.arrived && ms.t > BUS_ARRIVAL.time + 0.5) this.endMission();
    } else {
      ms.after += dt;
      if (ms.after >= MISSION_LINGER) {
        this.mission = null;
        this.banner.hidden = true;
        this.pickHint();
      }
    }
  }

  private endMission(): void {
    const ms = this.mission;
    if (!ms) return;
    ms.phase = 'end';
    ms.after = 0;
    this.banner.querySelector('.city-skip')?.remove();
    this.saveAt();
  }

  /** Tap, Space, Enter or Escape: straight to the end (paid, built, the hero on the finished spot). */
  skipMission(): void {
    const ms = this.mission;
    if (!ms || ms.phase === 'end') return;
    const b = ms.m.build;
    if (b) {
      this.hero.x = MATS[b].x;
      this.hero.y = MATS[b].y;
      this.hero.dir = 's';
      this.path = [];
      this.hero.moving = false;
      this.arrived = false;
      if (!this.pay && !this.building) {
        const r = payBoard(this.life.state, b);
        if (r) {
          this.life.set(r.next, true);
          if (r.done) this.addLine(WORDS.city.builtLine[b]);
          else this.addLine(WORDS.city.partPaid(priceText(bucketOf(b), r.amount), priceText(bucketOf(b), r.left)));
          this.hooks.sound(r.done ? 'built' : BUCKET_SOUND[bucketOf(b)]);
        }
      }
      this.finishAnims();
    } else {
      const off = busArrivalHero(1);
      this.hero.x = ms.bus.x + off.x;
      this.hero.y = ms.bus.y + off.y;
    }
    const s = camScale(this.cam.zoom, this.view);
    this.cam = clampCam({ zoom: this.cam.zoom, x: this.view.w / 2 - this.hero.x * s, y: (this.view.h + (this.view.top ?? 0) - this.bottomCover) / 2 - this.hero.y * s }, this.view);
    this.endMission();
    this.announce();
    this.refresh();
    if (boomDue(this.life.state)) this.startBoom(true);
    this.wake();
  }

  // ---------- Hints (W7) ----------

  private setHint(id: string | null): void {
    this.hintId = id;
    const w = WORDS.city;
    const text = id === 'walk' ? (this.hooks.touch() ? w.hintWalk : w.hintWalkKeys) : id === 'buka' ? w.hintBuka() : id === 'collect' ? w.hintCollect : id === 'bright' ? w.hintBright : '';
    this.hintEl.textContent = text;
    this.hintEl.hidden = !text;
    if (id && id !== 'walk') this.life.set(withHint(this.life.state, id));
  }

  /** The next hint to show, one at a time, once each. */
  private pickHint(): void {
    if (this.mission || this.hintId) return;
    const st = this.life.state;
    if (!st.hints.includes('walk')) {
      this.hintId = 'walk-wait';
      this.hintAt = this.time + 1;
      return;
    }
    // d6: after the first moment, once: "Each fix makes Lagos brighter!" for 3 s, and the
    // Booming box gives one short pulse.
    if (!st.hints.includes('bright') && st.fixed.length + st.built.length > 0) {
      this.setHint('bright');
      this.hintAt = this.time + 3;
      if (!this.hooks.still()) {
        this.head.classList.remove('pulse');
        void this.head.offsetWidth;
        this.head.classList.add('pulse');
      }
    } else if (!st.hints.includes('buka') && boardsShown(st).includes('mamaPut')) this.setHint('buka');
    else if (!st.hints.includes('collect') && (st.trays.buka ?? 0) >= 100) this.setHint('collect');
  }

  // ---------- Looking around ----------

  private measure(): void {
    this.fillMeter();
    // d5: when the first row does not fit (320 px with "Sound: off"), "Booming" goes from line 1.
    const head = this.head;
    head.classList.remove('tight');
    const right = this.el.querySelector<HTMLElement>('.city-top-right');
    if (right && right.getBoundingClientRect().top > head.getBoundingClientRect().top + 4) head.classList.add('tight');
    const r = this.map.getBoundingClientRect();
    const top = this.el.querySelector<HTMLElement>('.city-top');
    const covered = Math.max(top ? top.getBoundingClientRect().bottom : r.top, this.chips.getBoundingClientRect().bottom) - r.top;
    // The hint bar and the Mission complete heading sit just under the top row (W7, W5).
    this.hintEl.style.top = `${Math.round(Math.max(0, covered) + 4)}px`;
    this.banner.style.top = `${Math.round(Math.max(0, covered) + 4)}px`;
    // The heading, chips and buttons over the map: boards keep clear of them.
    // All of them are hard: a sign never sits under the heading (it would hide the sign's words
    // and catch its tap), a chip or a button.
    this.covers = [...this.el.querySelectorAll<HTMLElement>('.city-top h2, .city-chip, .city-top button, .city-bottom button')].map((e) => {
      const b = e.getBoundingClientRect();
      return { x: b.left - r.left, y: b.top - r.top, w: b.width, h: b.height, heading: e.tagName === 'H2' };
    });
    const bottom = this.el.querySelector<HTMLElement>('.city-bottom');
    this.bottomCover = bottom ? Math.max(0, r.bottom - bottom.getBoundingClientRect().top) : 0;
    this.skipEl.style.bottom = `${Math.round(this.bottomCover + 6)}px`;
    this.view = { w: Math.max(1, r.width), h: Math.max(1, r.height), top: Math.max(0, covered) };
  }

  private readonly onResize = (): void => {
    this.measure();
    this.fitHead();
    this.cam = clampCam(this.cam, this.view);
    this.paintPins();
    this.requestDraw();
  };

  private readonly onVisibility = (): void => {
    if (document.hidden) {
      this.saveAt();
      this.life.flush();
      this.keys.clear();
      this.hold = null;
      this.fingers.clear();
    } else {
      this.last = performance.now();
      this.wake();
    }
  };

  private readonly onBlur = (): void => {
    this.keys.clear();
  };

  /** A zoom step; the hero stays where they are on screen. */
  zoom(z: Zoom, at?: { x: number; y: number }): void {
    this.cam = zoomCam(this.cam, this.view, z, at ?? toScreen(this.cam, this.view, this.hero));
    this.requestDraw();
  }

  private local(e: PointerEvent): Finger {
    const r = this.map.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private spread(): { d: number; mid: Finger } {
    const [a, b] = [...this.fingers.values()];
    if (!a || !b) return { d: 0, mid: { x: 0, y: 0 } };
    return { d: Math.hypot(a.x - b.x, a.y - b.y), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
  }

  private readonly onDown = (e: PointerEvent): void => {
    if (this.cardOpen || this.closed) return;
    // Pins, boards, bubbles and arrows are buttons: their click does the work.
    if (e.target instanceof Element && e.target.closest('button')) return;
    if (this.busy()) {
      // Tap anywhere skips Mission complete, the moment or the boom (d6), and does nothing else.
      if (!this.hooks.ignoreTap(e)) this.skip();
      return;
    }
    const p = this.local(e);
    this.fingers.set(e.pointerId, p);
    if (this.fingers.size === 1) {
      this.pinched = false;
      this.hold = { id: e.pointerId, at: performance.now(), moved: 0, on: false, repath: 0 };
      this.wake();
    } else if (this.fingers.size === 2) {
      this.pinchFrom = this.spread().d;
      this.pinched = true;
      // Two fingers: a pinch, not a walk.
      if (this.hold?.on) this.path = [];
      this.hold = null;
    }
  };

  private readonly onMove = (e: PointerEvent): void => {
    const f = this.fingers.get(e.pointerId);
    if (!f) return;
    const p = this.local(e);
    this.fingers.set(e.pointerId, p);
    if (this.fingers.size === 1) {
      if (this.hold && this.hold.id === e.pointerId) this.hold.moved += Math.hypot(p.x - f.x, p.y - f.y);
      return;
    }
    const { d, mid } = this.spread();
    if (this.pinchFrom > 0 && d > 0) {
      const z = pinchStep(this.cam.zoom, d / this.pinchFrom);
      if (z !== this.cam.zoom) {
        this.zoom(z, mid);
        this.pinchFrom = d;
      }
    }
  };

  private readonly onUp = (e: PointerEvent): void => {
    const f = this.fingers.get(e.pointerId);
    if (!f) return;
    this.fingers.delete(e.pointerId);
    if (this.fingers.size === 1) this.pinchFrom = 0;
    const hold = this.hold;
    if (!hold || hold.id !== e.pointerId) return;
    this.hold = null;
    if (this.pinched || this.fingers.size > 0) return;
    const m = toMap(this.cam, this.view, f);
    if (hold.on) {
      // Let go: the hero finishes the last few steps to where the finger was.
      this.walkTo(nearestOpen(m));
      return;
    }
    if (this.hooks.ignoreTap(e)) return;
    this.walkTo(tapTarget(m), true);
  };

  /** While holding, the hero walks to the finger (the way found again at most 5 times a second). */
  private stepHold(): void {
    const hold = this.hold;
    if (!hold) return;
    const now = performance.now();
    if (!hold.on && (now - hold.at >= HOLD_MS || hold.moved > HOLD_PX)) hold.on = true;
    if (!hold.on || now - hold.repath < REPATH_MS) return;
    hold.repath = now;
    const f = this.fingers.get(hold.id);
    if (!f) return;
    const to = nearestOpen(toMap(this.cam, this.view, f));
    this.arrived = false;
    this.path = findPath(this.hero, to);
    if (this.path.length && !this.hero.moving) this.startedWalking();
  }

  private readonly onKey = (e: KeyboardEvent): void => {
    if (this.closed) return;
    const arrow = e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown';
    if (this.busy()) {
      // d6: Space, Enter, Escape or an arrow skips; it does nothing else (an arrow walks only once pressed again).
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape' || arrow) {
        e.preventDefault();
        if (arrow) this.skipHeld.add(e.key);
        if (!e.repeat) this.skip();
      }
      return;
    }
    if (arrow && this.skipHeld.has(e.key)) {
      e.preventDefault();
      return;
    }
    if (this.cardOpen) {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.closeCard();
      }
      return;
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      this.keys.add(e.key);
      this.wake();
    } else if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      this.zoom('near');
    } else if (e.key === '-' || e.key === '_') {
      e.preventDefault();
      this.zoom('far');
    }
  };

  private readonly onKeyUp = (e: KeyboardEvent): void => {
    this.skipHeld.delete(e.key);
    if (this.keys.delete(e.key)) this.wake();
  };

  // ---------- The frame loop ----------

  /** Something moves: keep drawing every frame. */
  private active(): boolean {
    return (
      this.hero.moving ||
      this.path.length > 0 ||
      this.keys.size > 0 ||
      this.hold !== null ||
      this.pay !== null ||
      this.building !== null ||
      this.collecting !== null ||
      this.ring !== null ||
      this.lines.length > 0 ||
      this.wobble !== null ||
      this.mission !== null ||
      this.moment !== null ||
      this.boomRun !== null ||
      this.walkers.length > 0 ||
      (this.danfo !== null && this.danfo.d < routeLength(this.danfo.r)) ||
      this.arrived ||
      this.hintId === 'walk-wait'
    );
  }

  requestDraw(): void {
    this.needDraw = true;
    this.wake();
  }

  private wake(): void {
    if (this.raf || this.closed) return;
    clearTimeout(this.idleTimer);
    this.idleTimer = 0;
    this.raf = requestAnimationFrame(this.frame);
  }

  private readonly frame = (now: number): void => {
    this.raf = 0;
    if (this.closed) return;
    const dt = Math.min(0.1, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    if (document.hidden) {
      this.idle();
      return;
    }
    this.update(dt);
    if (this.needDraw) this.draw();
    // wake() keeps a single chain (an update may already have asked for the next frame).
    if (this.active()) this.wake();
    else this.idle();
  };

  /** Standing still: trays fill on a slow timer; small redraws at most twice a second. */
  private idle(): void {
    if (this.closed || this.raf || this.idleTimer) return;
    this.idleTimer = window.setTimeout(() => {
      this.idleTimer = 0;
      if (this.closed) return;
      const now = performance.now();
      const dt = Math.min(0.6, Math.max(0, (now - this.last) / 1000));
      this.last = now;
      if (!document.hidden) {
        this.update(dt);
        // The queue and stalls move a little (not with reduced motion).
        if (!this.hooks.still() && this.life.state.built.length > 0) this.needDraw = true;
        if (this.needDraw) this.draw();
      }
      if (this.active()) this.wake();
      else this.idle();
    }, IDLE_MS);
  }

  private update(dt: number): void {
    this.time += dt;
    const changed = this.life.tick(dt);
    if (changed.length) {
      this.makeSigns();
      this.needDraw = true;
      if (!this.mission && !this.hintId && !this.life.state.hints.includes('collect') && (this.life.state.trays.buka ?? 0) >= 100) this.setHint('collect');
    }
    if (this.hintId === 'walk-wait' && this.time >= this.hintAt) {
      if (this.life.state.hints.includes('walk')) this.hintId = null;
      else this.setHint('walk');
    }
    this.stepMission(dt);
    if (this.mission?.phase !== 'bus' && !this.moment?.build && !this.boomRun) {
      this.stepHold();
      this.moveHero(dt);
      this.onStand(dt);
    }
    this.stepPay(dt);
    this.stepBuild(dt);
    this.stepCollect(dt);
    this.stepMoment(dt);
    this.stepBoom(dt);
    this.stepLife(dt);
    if (this.hintId === 'bright' && this.time >= this.hintAt) this.setHint(null);
    // "Tap to skip" (small, bottom middle) while a moment or a boom plays; Mission complete has its own.
    const skip = (!!this.moment?.build || !!this.boomRun) && !(this.mission && this.mission.phase !== 'end');
    if (this.skipEl.hidden === skip) {
      this.skipEl.textContent = this.hooks.touch() ? WORDS.city.skip : WORDS.city.skipKeys;
      this.skipEl.hidden = !skip;
    }
    if (this.ring) {
      this.ring.t += dt / WALKER.ringTime;
      if (this.ring.t >= 1) this.ring = null;
      this.needDraw = true;
    }
    if (this.wobble) {
      this.wobble.t += dt;
      if (this.wobble.t >= PAY.wobble) this.wobble = null;
      this.needDraw = true;
    }
    if (this.lines.length) {
      for (const l of this.lines) {
        if (l.wait > 0) l.wait -= dt;
        else l.t += dt / l.dur;
      }
      this.lines = this.lines.filter((l) => l.t < 1);
      this.needDraw = true;
    }
    if (!this.mission && !this.hintId && !this.pay && !this.building && !this.moment && !this.boomRun && !this.cardOpen) this.pickHint();
  }

  /** The painted still city for these looks at this zoom step (made again only when a look or the size changes). */
  private picture(dpr: number): { img: HTMLCanvasElement; scale: number } | null {
    const want = Math.min(camScale(this.cam.zoom, this.view) * dpr, 2048 / CITY_MAP.w);
    const st = this.shown;
    // A moment or a boom shows the city as it was until it ends (the rings show the bright one).
    const paint = this.moment?.paint ?? this.boomRun?.paint ?? paintOf(st, st.built.includes('market') || this.building?.build === 'market');
    const looks = paintKey(paint);
    const key = `${looks}|${this.cam.zoom}|${dpr}`;
    const have = painted.get(key);
    if (have && Math.abs(have.scale - want) < 1e-6) return have;
    for (const k of painted.keys()) if (!k.startsWith(`${looks}|`)) painted.delete(k);
    const img = paintImg(paint, want);
    if (!img) return null;
    const made = { img, scale: want };
    painted.set(key, made);
    return made;
  }

  private draw(): void {
    if (this.closed) return;
    this.needDraw = false;
    const moving = this.hero.moving || this.mission?.phase === 'bus' || this.hold?.on === true || this.moment !== null || this.boomRun !== null || this.walkers.length > 0;
    const dpr = Math.min(window.devicePixelRatio || 1, moving ? MAP_DPR_MOVING : MAP_DPR);
    const pw = Math.round(this.view.w * dpr);
    const ph = Math.round(this.view.h * dpr);
    if (this.map.width !== pw) this.map.width = pw;
    if (this.map.height !== ph) this.map.height = ph;
    const g = this.map.getContext('2d', { alpha: false });
    if (!g) return;
    this.draws++;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = CITY_COLOURS.water;
    g.fillRect(0, 0, pw, ph);
    const pic = this.picture(dpr);
    const s = camScale(this.cam.zoom, this.view);
    if (pic) {
      const x = Math.round(this.cam.x * dpr);
      const y = Math.round(this.cam.y * dpr);
      const k = (s * dpr) / pic.scale;
      const sx = Math.max(0, -x / k);
      const sy = Math.max(0, -y / k);
      const sw = Math.min(pic.img.width - sx, (pw - Math.max(0, x)) / k);
      const sh = Math.min(pic.img.height - sy, (ph - Math.max(0, y)) / k);
      if (sw > 0 && sh > 0) g.drawImage(pic.img, sx, sy, sw, sh, Math.max(0, x), Math.max(0, y), sw * k, sh * k);
    }
    this.drawRings(g, dpr, s);
    this.drawLive(g, dpr, s);
    this.placePins();
  }

  /**
   * d6, d10: the colour rings. The bright picture (1 map unit a px) is drawn only inside each ring
   * (and, for a fix or a step, only over its own blocks), with a soft cream-gold edge while it grows.
   */
  private drawRings(g: CanvasRenderingContext2D, dpr: number, s: number): void {
    const mo = this.moment;
    const bo = this.boomRun;
    const img = mo?.img ?? bo?.img;
    if (!img) return;
    const parts: { x: number; y: number; r: number; k: number; rects: Rect[] | null }[] = [];
    if (mo) {
      const k = span(mo.t, MOMENT.ring);
      if (mo.rects.length && k > 0) parts.push({ ...mo.from, r: mo.reach * ease(k), k, rects: mo.rects });
      const st = mo.step;
      const ks = st ? Math.max(0, Math.min(1, (mo.t - mo.stepAt) / MOMENT.stepRing)) : 0;
      if (st && ks > 0) parts.push({ ...st.at, r: st.reach * ease(ks), k: ks, rects: [st.rect] });
    } else if (bo) {
      const k = span(bo.t, BOOM.ring);
      if (k > 0) parts.push({ ...BOOM.from, r: bo.reach * ease(k), k, rects: null });
    }
    if (!parts.length) return;
    const k = s * dpr;
    const a = toMap(this.cam, this.view, { x: 0, y: 0 });
    const b = toMap(this.cam, this.view, { x: this.view.w, y: this.view.h });
    const sx = Math.max(0, Math.floor(a.x));
    const sy = Math.max(0, Math.floor(a.y));
    const sw = Math.min(img.width, Math.ceil(b.x)) - sx;
    const sh = Math.min(img.height, Math.ceil(b.y)) - sy;
    if (sw <= 0 || sh <= 0) return;
    g.save();
    g.setTransform(k, 0, 0, k, this.cam.x * dpr, this.cam.y * dpr);
    for (const p of parts) {
      g.save();
      if (p.rects) {
        g.beginPath();
        for (const q of p.rects) g.rect(q.x, q.y, q.w, q.h);
        g.clip();
      }
      g.beginPath();
      g.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      g.save();
      g.clip();
      g.drawImage(img, sx, sy, sw, sh, sx, sy, sw, sh);
      g.restore();
      if (p.k < 1) {
        g.strokeStyle = 'rgba(255,236,170,0.85)';
        g.lineWidth = 6 / s;
        g.stroke();
      }
      g.restore();
    }
    g.restore();
  }

  /** Everything that moves, over the still city. */
  private drawLive(g: CanvasRenderingContext2D, dpr: number, s: number): void {
    const st = this.shown;
    const still = this.hooks.still();
    const boards = this.boards();
    const k = s * dpr;
    g.save();
    g.setTransform(k, 0, 0, k, this.cam.x * dpr, this.cam.y * dpr);
    // On the ground: chalk outlines and mats; the road being built.
    const onMat = this.hero.moving ? null : this.matUnderHero();
    for (const b of boards) {
      const building = this.building?.build === b ? this.building.t : 0;
      if (b === 'road' && building > 0) drawRoadBuild(g, building, this.time);
      else if (b !== 'mamaPut' && b !== 'market') drawBuildOutline(g, b, FRONTS[b].x, FRONTS[b].y, building);
      else if (!building) drawBuildOutline(g, b, FRONTS[b].x, FRONTS[b].y, 0);
      if (!this.building || this.building.build !== b || building < 0.5) drawPayMat(g, MATS[b].x, MATS[b].y, onMat === b || this.pay?.build === b);
    }
    if (this.ring) drawWalkRing(g, this.ring.x, this.ring.y, still ? 0 : this.ring.t);
    // The boom (d6): the flats grow up from the ground; the ferry glides in to the jetty.
    const bo = this.boomRun;
    if (bo && !bo.still) {
      if (bo.t >= BOOM.flats[0]) drawBoomFlats(g, ease(span(bo.t, BOOM.flats)));
      if (bo.t >= BOOM.ferry[0]) {
        g.save();
        g.beginPath();
        g.rect(0, 0, 452, CITY_MAP.h);
        g.clip();
        drawJetty(g, 410, 838);
        g.restore();
        g.save();
        g.translate((1 - ease(span(bo.t, BOOM.ferry))) * 260, 0);
        g.beginPath();
        g.rect(452, 780, 300, 220);
        g.clip();
        drawJetty(g, 410, 838);
        g.restore();
      }
    }
    // Standing things, back to front: the places, the hero (or the bus bringing them).
    type Item = { y: number; draw: () => void };
    const items: Item[] = [];
    const bukaBuild = this.building?.build === 'mamaPut' ? this.building.t : st.built.includes('buka') ? 1 : 0;
    if (bukaBuild > 0) {
      const full = trayFull(this.life.state, 'buka');
      const clock = this.life.clock.buka / MAMA_PUT.plateTime;
      const served = Math.floor(((this.life.state.trays.buka ?? 0) / PLACES.buka.each) % 97);
      const d = DOORS.buka;
      items.push({ y: d.y, draw: () => drawMamaPut(g, d.x, d.y, { time: this.time, plate: still ? 0 : clock, served, queue: 4, full, build: bukaBuild, still }) });
    }
    const marketBuild = this.building?.build === 'market' ? this.building.t : st.built.includes('market') ? 1 : 0;
    if (marketBuild > 0) {
      const d = DOORS.market;
      const earn = this.life.state.fixed.includes('potholes');
      const full = trayFull(this.life.state, 'market');
      const trip = danfoTrip(earn ? (still ? 0.4 : this.life.clock.market / MARKET_PLACE.danfoTime) : 0.95, full);
      items.push({
        y: d.y,
        draw: () => {
          drawMarketPlace(g, d.x, d.y, { stock: trip.stock, build: marketBuild });
          if (marketBuild >= 1 && earn) {
            if (trip.carry >= 0 && !still) drawPorter(g, d.x - 20, d.y + 4, d.x + 8, d.y + 16, trip.carry);
            if (trip.visible) drawMarketDanfo(g, d.x + 20 + trip.dx, d.y + 26, trip.load, trip.door);
          }
        },
      });
    }
    // People who walked in (moving, then standing) and the moment's danfo.
    for (const p of this.standing) items.push({ y: p.y, draw: () => drawCityFolk(g, p.x, p.y, p.look) });
    for (const w of this.walkers) {
      const at = walkerAt(w);
      const bob = still ? 0 : Math.abs(Math.sin((w.t - w.wait) * 12)) * 1.2;
      items.push({ y: at.y, draw: () => drawCityFolk(g, at.x, at.y - bob, w.look) });
    }
    const dv = this.danfo;
    if (dv) {
      const at = routeAt(dv.r, dv.d);
      items.push({ y: at.y + 6, draw: () => drawCityBus(g, at.x, at.y, dv.r.dir) });
    }
    const size = walkerSize(s);
    const ms = this.mission;
    if (ms && ms.phase === 'bus') {
      const kk = still ? 1 : Math.min(1, ms.t / BUS_ARRIVAL.time);
      items.push({ y: ms.bus.y + 25, draw: () => drawBusArrival(g, this.hooks.look(), ms.bus.x, ms.bus.y, kk, size) });
    } else {
      if (ms && ms.phase === 'walk' && !this.danfo?.bus) items.push({ y: ms.bus.y, draw: () => drawCityBus(g, ms.bus.x, ms.bus.y, 'e') });
      const hero = this.hero;
      items.push({
        y: hero.y,
        draw: () => {
          // Walking: a copy of the frame's picture; standing (rare redraws): drawn as is, with the breath.
          const look = this.hooks.look();
          if (!hero.moving) {
            drawCityHero(g, look, hero.x, hero.y, { dir: hero.dir, moving: false, time: this.time, still, size });
            return;
          }
          const px = k; // device px a map unit
          const f = Math.floor((hero.phase - Math.floor(hero.phase)) * 4) % 4;
          const sz = size;
          const key = `hero|${JSON.stringify(look)}|${hero.dir}|${f}|${sz.toFixed(2)}|${px.toFixed(3)}`;
          const sp = this.sprite(key, sz * 1.1, sz * 1.5, sz * 0.55, sz * 1.3, px, (c) => drawCityHero(c, look, 0, 0, { dir: hero.dir, phase: f / 4 + 0.01, moving: true, size: sz }));
          if (sp) g.drawImage(sp.img, hero.x - sp.ox, hero.y - sp.oy, sz * 1.1, sz * 1.5);
          else drawCityHero(g, look, hero.x, hero.y, { dir: hero.dir, phase: hero.phase, moving: true, size: sz });
        },
      });
    }
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.draw();
    // Signs in screen px.
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const pay = this.pay;
    const bubbleAsks: (SignAsk & { p: PlaceId; text: string; full: boolean })[] = this.trays().map((p) => {
      const text = trayWords(this.life.state.trays[p] ?? 0);
      const full = trayFull(this.life.state, p);
      const at = toScreen(this.cam, this.view, BUBBLE_AT[p]);
      const box0 = this.signSize(`bubble|${text}|${full}`, () => trayBubbleBox(g, 0, 0, text, full));
      // Away from its place the bubble drops its tail (it would point at nothing): its body only, at least 48 tall.
      const body = Math.max(48, BUBBLE.h + (full ? BUBBLE.fullH : 0) + 2);
      const boxAway = { x: box0.x, y: -BUBBLE.tail - body, w: box0.w, h: body };
      return { id: `bubble ${p}`, tag: `${text}|${full}`, anchor: at, prefer: [at], box0, boxAway, hw: 0, hh: 0, mayHide: true, p, text, full };
    });
    const boardAsks: (SignAsk & { b: BuildId; units: number; done: boolean })[] = boards.map((b) => {
      const bucket = bucketOf(b);
      let left = this.building?.build === b ? 0 : leftOf(st, b);
      if (pay && pay.build === b) left = pay.leftBefore - Math.round((pay.amount * pay.landed) / pay.pieces);
      const units = boardUnits(bucket, left);
      const done = this.building?.build === b || (pay?.build === b && pay.done && pay.landed === pay.pieces);
      const m = toScreen(this.cam, this.view, MATS[b]);
      const hw = (MAT.w * s) / 2;
      const hh = (MAT.h * s) / 2;
      const box0 = this.signSize(`board|${b}|${units}`, () => priceBoardBox(g, 0, 0, b, units));
      const beside = { x: m.x + hw + 4 + box0.w / 2, y: m.y + hh };
      const other = { x: m.x - hw - 4 - box0.w / 2, y: m.y + hh };
      const boxShort = this.signSize(`board|${b}|${units}|short`, () => priceBoardBox(g, 0, 0, b, units, { short: true }));
      return { id: `board ${b}`, tag: `${units}`, anchor: m, prefer: [beside, other], box0, boxShort, hw, hh, mayHide: false, b, units, done };
    });
    const spots = this.layoutSigns(bubbleAsks, boardAsks);
    for (const a of boardAsks) {
      const foot = spots.get(a.id)!;
      const { b, units, done } = a;
      const wob = this.wobble?.build === b ? boardWobble(this.wobble.t) : 0;
      const short = !!foot.short;
      const sp = wob ? null : this.sprite(`board|${b}|${units}|${done}|${short}|${dpr}`, foot.box.w + 16, foot.box.h + 16, foot.x - foot.box.x + 8, foot.y - foot.box.y + 8, dpr, (c) => drawPriceBoard(c, 0, 0, b, units, { done, short }));
      if (sp) g.drawImage(sp.img, foot.x - sp.ox, foot.y - sp.oy, foot.box.w + 16, foot.box.h + 16);
      else drawPriceBoard(g, foot.x, foot.y, b, units, { wobble: wob, done, short });
      this.boardBox.set(b, foot.box);
      this.placeSign(this.boardEls.get(b), foot.box);
    }
    for (const a of bubbleAsks) {
      const at = spots.get(a.id)!;
      const { p, text, full } = a;
      const tail = !at.away;
      const sp = this.sprite(`bubble|${text}|${full}|${tail}|${dpr}`, at.box.w + 16, at.box.h + 16, at.x - at.box.x + 8, at.y - at.box.y + 8, dpr, (c) => {
        if (!tail) {
          // Away from its place: no tail (cut just under the body).
          c.beginPath();
          c.rect(-at.box.w, -BUBBLE.tail - 200, at.box.w * 2, 200 + 1);
          c.clip();
        }
        drawTrayBubble(c, 0, 0, 'naira', text, full, 0);
      });
      if (sp) g.drawImage(sp.img, at.x - sp.ox, at.y - sp.oy, at.box.w + 16, at.box.h + 16);
      else drawTrayBubble(g, at.x, at.y, 'naira', text, full, 0);
      this.bubbleBox.set(p, at.box);
      this.placeSign(this.bubbleEls.get(p), at.box);
    }
    // Flying money: hero to board when paying, place to hero when collecting.
    const heroAt = toScreen(this.cam, this.view, this.hero);
    const body = { x: heroAt.x, y: heroAt.y - (size * s) / 2 };
    if (pay && !still) {
      const bb = this.boardBox.get(pay.build);
      if (bb) this.drawPieces(g, pay.bucket, body, { x: bb.x + bb.w / 2, y: bb.y + 16 }, pay.t, pay.dur, pay.pieces);
    }
    const col = this.collecting;
    if (col && !still) {
      const from = toScreen(this.cam, this.view, BUBBLE_AT[col.place]);
      this.drawPieces(g, 'naira', from, body, col.t, payTime(col.amount / 100), col.pieces);
    }
    for (const l of this.lines) if (l.wait <= 0) drawCollectLine(g, heroAt.x, heroAt.y - size * s - 18, l.text, l.t, still);
    this.drawArrows(g);
    g.restore();
  }

  private drawPieces(g: CanvasRenderingContext2D, kind: BucketKind, from: Pt, to: Pt, t: number, dur: number, n: number): void {
    const spread = Math.max(0, dur - PAY.flight);
    for (let i = 0; i < n; i++) {
      const t0 = n > 1 ? (spread * i) / (n - 1) : 0;
      const kk = (t - t0) / PAY.flight;
      if (kk <= 0 || kk >= 1) continue;
      drawFlyingMoney(g, kind, from.x, from.y, to.x, to.y, kk);
    }
  }

  /** Moves a sign's button over its picture (style written only when it changes: no layout work per frame). */
  private placeSign(el: HTMLElement | undefined, box: ScreenBox): void {
    if (!el) return;
    const w = `${Math.round(box.w)}px`;
    const h = `${Math.round(box.h)}px`;
    const t = `translate(${Math.round(box.x)}px, ${Math.round(box.y)}px)`;
    if (el.style.width !== w) el.style.width = w;
    if (el.style.height !== h) el.style.height = h;
    if (el.style.transform !== t) el.style.transform = t;
  }

  /**
   * A small picture drawn once and copied after: the walking hero (one per view, frame and size)
   * and the price boards (one per price). Copying is far cheaper on a slow phone than drawing
   * the shapes and words every frame.
   */
  private readonly sprites = new Map<string, { img: HTMLCanvasElement; ox: number; oy: number }>();

  private sprite(key: string, w: number, h: number, ox: number, oy: number, scale: number, paint: (c: CanvasRenderingContext2D) => void): { img: HTMLCanvasElement; ox: number; oy: number } | null {
    const have = this.sprites.get(key);
    if (have) return have;
    if (this.sprites.size > 80) this.sprites.clear();
    const img = document.createElement('canvas');
    img.width = Math.max(1, Math.ceil(w * scale));
    img.height = Math.max(1, Math.ceil(h * scale));
    const c = img.getContext('2d');
    if (!c) return null;
    c.scale(scale, scale);
    c.translate(ox, oy);
    paint(c);
    const made = { img, ox, oy };
    this.sprites.set(key, made);
    return made;
  }

  /**
   * Where an edge arrow goes (a pin, board or tray fully off screen always gets one), and the
   * size of its clear square tap area. The arrow's middle and the ARROW_TAP (48) square round it
   * stay on the map and never overlap a drawn pin's tap area, a chip, a button, a board, a bubble
   * or another arrow (W15, "Big targets"): only its outer drawn edge may reach over a drawn pin.
   * The "Lagos" heading takes no taps, so the tap area may go a little under it. Tried in order:
   * its own spot on the edge band; the nearest clear spot along the band's edges; bands nearer the
   * edge; any clear spot on the map, nearest its own. Only when no 48 square is clear anywhere
   * (a tiny screen packed with signs) does the square shrink, to 44 (W1) and then a little more,
   * so a pin fully off the screen still gets its arrow (F2). Null only when even that fails.
   */
  private arrowSpot(base: { x: number; y: number; angle: number } | null, to: Pt, avoid: readonly Block[], inset: number, top: number, bottomH: number): { x: number; y: number; angle: number; tap: number } | null {
    if (!base) return null;
    for (const tap of ARROW_TAPS) {
      const p = this.arrowSpotAt(tap, base, avoid, inset, top, bottomH);
      if (p) return { x: p.x, y: p.y, angle: Math.atan2(to.y - p.y, to.x - p.x), tap };
    }
    return null;
  }

  private arrowSpotAt(tap: number, base: Pt, avoid: readonly Block[], inset: number, top: number, bottomH: number): Pt | null {
    // Half the tap area, plus half a pixel for the rounding of buttons on screen.
    const r = tap / 2 + 0.5;
    const area = (2 * r) ** 2;
    const W = this.view.w;
    const H = this.view.h;
    // The cost of an arrow at (x, y): Infinity off the map or over anything hard; else how much
    // of the heading it goes under (at most a fifth of the tap area).
    const cost = (x: number, y: number): number => {
      if (x - r < 0 || y - r < 0 || x + r > W || y + r > H) return Infinity;
      let c = 0;
      for (const o of avoid) {
        const ov = Math.max(0, Math.min(x + r, o.x + o.w) - Math.max(x - r, o.x)) * Math.max(0, Math.min(y + r, o.y + o.h) - Math.max(y - r, o.y));
        if (!ov) continue;
        if (!o.heading || ov > area / 5) return Infinity;
        c += ov;
      }
      return c;
    };
    const b0 = { x: Math.round(base.x), y: Math.round(base.y) };
    if (cost(b0.x, b0.y) === 0) return b0;
    let pick: Pt | null = null;
    let best = Infinity;
    let bestD = Infinity;
    const tryAt = (x: number, y: number, rank: number): void => {
      const c = cost(x, y);
      if (!Number.isFinite(c)) return;
      // Fully clear beats a little under the heading; the usual band beats one nearer the edge.
      const score = rank + (c > 0 ? 100 + c / area : 0);
      const d = (x - b0.x) ** 2 + (y - b0.y) ** 2;
      if (score < best || (score === best && d < bestD)) {
        best = score;
        bestD = d;
        pick = { x, y };
      }
    };
    const lo = Math.ceil(r);
    const insets: number[] = [Math.max(lo, Math.round(inset))];
    for (let i = insets[0]! - 4; i > lo; i -= 4) insets.push(i);
    if (insets[insets.length - 1] !== lo) insets.push(lo);
    insets.forEach((ins, k) => {
      const x0 = ins;
      const x1 = Math.max(x0, Math.round(W) - ins);
      const y0 = Math.round(top) + ins;
      const y1 = Math.max(y0, Math.round(bottomH) - ins);
      for (let x = x0; x <= x1; x += 4) {
        tryAt(x, y0, k);
        tryAt(x, y1, k);
      }
      for (let y = y0; y <= y1; y += 4) {
        tryAt(x0, y, k);
        tryAt(x1, y, k);
      }
    });
    if (pick) return pick;
    // Anywhere on the map that is clear (also between the top rows and beside the bottom
    // buttons: `avoid` holds every chip and button), nearest its own spot. A clear spot can
    // always slide until it touches a thing or the map's edge on each axis, so trying only those
    // lines (and its own) finds every gap, however narrow, in a few hundred tries.
    const xs = new Set<number>([lo, Math.floor(W - r), b0.x]);
    const ys = new Set<number>([lo, Math.floor(H - r), b0.y]);
    for (const o of avoid) {
      xs.add(Math.floor(o.x - r)).add(Math.ceil(o.x + o.w + r));
      ys.add(Math.floor(o.y - r)).add(Math.ceil(o.y + o.h + r));
    }
    for (const y of ys) for (const x of xs) tryAt(x, y, 1000);
    return pick;
  }

  /** Pins, boards and trays off the screen get a round sign at the edge with their icon (W1). */
  private drawArrows(g: CanvasRenderingContext2D): void {
    const want: { icon: EdgeIcon; at: Pt; go: () => void; label: string }[] = [];
    const top = this.view.top ?? 0;
    const bottomH = this.view.h - this.bottomCover;
    // Off the screen: its middle is outside the whole map area (a thing partly under a button row
    // still shows), and less than a quarter of it shows (a pin half on screen needs no arrow: its
    // icon would show twice).
    const off = (b: ScreenBox): boolean => {
      const cx = b.x + b.w / 2;
      const cy = b.y + b.h / 2;
      if (!(cx < 0 || cx > this.view.w || cy < 0 || cy > this.view.h)) return false;
      const seen = Math.max(0, Math.min(b.x + b.w, this.view.w) - Math.max(b.x, 0)) * Math.max(0, Math.min(b.y + b.h, this.view.h) - Math.max(b.y, 0));
      return seen < (b.w * b.h) / 4;
    };
    const pins = this.pinBoxes();
    // An arrow is a sign too: never over a board, a bubble, a drawn pin, a chip, a button or another arrow.
    const onView = (b: ScreenBox): boolean => b.x + b.w > 0 && b.y + b.h > 0 && b.x < this.view.w && b.y < this.view.h;
    // All hard for the arrow's tap area, but the heading (it takes no taps): see arrowSpot.
    const avoid: Block[] = [
      ...this.boardBox.values(),
      ...this.bubbleBox.values(),
      ...this.covers,
      ...this.pins.filter((p) => this.looks[p.spot] !== 'fixed').map((p) => pins[p.spot]),
      ...Object.values(this.soonBoxes()),
    ].filter(onView);
    for (const p of this.pins) {
      if (this.looks[p.spot] === 'fixed') continue;
      const b = pins[p.spot];
      if (off(b)) want.push({ icon: p.spot, at: { x: b.x + b.w / 2, y: b.y + b.h / 2 }, go: () => this.openCard(p.spot), label: SPOT_WORDS[p.spot] });
    }
    for (const [b, box] of this.boardBox) if (off(box)) want.push({ icon: bucketOf(b), at: { x: box.x + box.w / 2, y: box.y + box.h / 2 }, go: () => this.goPay(b), label: BUILDS[b].name });
    for (const [p, box] of this.bubbleBox) if (off(box)) want.push({ icon: 'naira', at: { x: box.x + box.w / 2, y: box.y + box.h / 2 }, go: () => this.goCollect(p), label: PLACES[p].name });
    this.arrowBox = [];
    while (this.arrowEls.length < want.length) {
      const el = button('', 'city-sign city-arrow', () => undefined, { 'aria-hidden': 'true', tabindex: '-1' });
      this.arrowEls.push(el);
      this.signLayer.append(el);
    }
    this.arrowEls.forEach((el, i) => {
      const a = want[i];
      el.hidden = !a;
      if (!a) return;
      const inset = Math.max(EDGE_ARROW.r + 2, Math.min(EDGE_ARROW.inset, (bottomH - top) / 2));
      const at = this.arrowSpot(edgeArrowPlace(a.at.x, a.at.y, this.view.w, bottomH, top, inset), a.at, avoid, inset, top, bottomH);
      if (!at) {
        el.hidden = true;
        return;
      }
      // The next arrow keeps clear of this one's whole tap area.
      const r = at.tap / 2;
      avoid.push({ x: at.x - r, y: at.y - r, w: r * 2, h: r * 2 });
      drawEdgeArrow(g, at.x, at.y, at.angle, a.icon);
      this.placeSign(el, { x: at.x - r, y: at.y - r, w: r * 2, h: r * 2 });
      el.dataset['for'] = a.label;
      el.onclick = (e) => {
        if (this.hooks.ignoreTap(e) || this.cardOpen || this.skipped()) return;
        a.go();
      };
      this.arrowBox.push({ icon: a.icon, x: at.x, y: at.y, tap: at.tap });
    });
  }
}

