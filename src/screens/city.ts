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
  SPOT_IDS,
  SPOT_WORDS,
  bucketIconSvg,
  drawCityBus,
  drawProblemPin,
  makeCityCanvas,
  type BucketKind,
  type SpotId,
  type SpotLooks,
} from '../art/city';
import type { HeroLook } from '../art/hero';
import {
  ALAUSA_ROAD,
  BUILDS,
  EDGE_ARROW,
  MAT,
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
import {
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
import { camScale, clampCam, pinTapBox, pinchStep, startCam, toMap, toScreen, zoomCam, type CityCam, type CityView, type Zoom } from '../game/cityCamera';
import { formatMoney, spokenMoney } from '../game/money';
import { findPath, lineClear, nearestOpen, tapTarget, walkable, type Pt } from '../game/walkGrid';
import { button, h } from './dom';
import { WORDS } from './words';

/** The sounds this screen plays (src/engine/sound.ts). */
export type CitySound = 'payChink' | 'payBulb' | 'payChip' | 'built' | 'collect' | 'notEnough';

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
  private covers: ScreenBox[] = [];
  cam: CityCam;
  private looks: SpotLooks;
  private pins: { spot: SpotId; el: HTMLButtonElement; pic: HTMLCanvasElement | null; word: string }[] = [];
  private boardEls = new Map<BuildId, HTMLButtonElement>();
  private bubbleEls = new Map<PlaceId, HTMLButtonElement>();
  private arrowEls: HTMLButtonElement[] = [];
  /** Where each board and bubble sits on screen now (CSS px), for taps and tests. */
  private boardBox = new Map<BuildId, ScreenBox>();
  private bubbleBox = new Map<PlaceId, ScreenBox>();
  private arrowBox: { icon: EdgeIcon; x: number; y: number }[] = [];
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
    const zoomIn = button(w.zoomIn, 'minor city-zoom-btn', () => this.zoom('near'), { 'aria-label': w.zoomInSpoken });
    const zoomOut = button(w.zoomOut, 'minor city-zoom-btn', () => this.zoom('far'), { 'aria-label': w.zoomOutSpoken });
    this.el = h(
      'div',
      { class: 'card city-card', role: 'dialog', 'aria-label': w.heading },
      h('div', { class: 'city-stage' }, this.map, this.signLayer, this.pinLayer),
      h('div', { class: 'city-top' }, h('h2', {}, w.heading), this.chips, h('div', { class: 'city-top-right' }, ...hooks.topRight)),
      this.hintEl,
      h('div', { class: 'city-bottom' }, h('div', { class: 'city-buttons' }, ...hooks.bottom), h('div', { class: 'city-zoom' }, zoomOut, zoomIn)),
      this.banner,
      this.say,
      this.cardSpot,
    );
    this.cam = lastCam ?? { zoom: 'far', x: 0, y: 0 };
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
    this.cam = lastCam ? clampCam(lastCam, this.view) : startCam(this.view);
    if (this.hooks.mission) this.startMission(this.hooks.mission);
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
    this.pins = SPOT_IDS.map((spot) => {
      const look = this.looks[spot];
      const fixed = look === 'fixed';
      const word = look === 'ready' ? 'Ready' : SPOT_WORDS[spot];
      const label = fixed ? w.pinFixed(w.fixedName[spot]) : look === 'ready' ? w.pinReady(SPOT_WORDS[spot]) : w.pinProblem(SPOT_WORDS[spot]);
      const el = button('', `city-pin ${look}`, (e) => {
        if (this.hooks.ignoreTap(e) || this.mission?.phase === 'bus' || this.mission?.phase === 'walk') return;
        this.openCard(spot);
      }, { 'aria-label': label, 'data-spot': spot });
      let pic: HTMLCanvasElement | null = null;
      if (!fixed) {
        pic = h('canvas', { 'aria-hidden': 'true' });
        el.append(pic);
      }
      return { spot, el, pic, word };
    });
    this.pinLayer.replaceChildren(...this.pins.map((p) => p.el));
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
  }

  private placePins(): void {
    for (const p of this.pins) {
      const at = toScreen(this.cam, this.view, CITY_SPOTS[p.spot].pin);
      const box = pinTapBox(at.x, at.y, p.word);
      p.el.style.transform = `translate(${Math.round(box.x)}px, ${Math.round(box.y)}px)`;
    }
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
  arrows(): { icon: string; x: number; y: number }[] {
    return this.arrowBox.map((a) => ({ ...a }));
  }
  get missionPhase(): string | null {
    return this.mission ? this.mission.phase : null;
  }
  get paying(): boolean {
    return this.pay !== null || this.building !== null;
  }

  // ---------- Boards, bubbles and edge arrows (buttons over the map) ----------

  private boards(): BuildId[] {
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
          if (this.hooks.ignoreTap(e) || this.busy()) return;
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
          if (this.hooks.ignoreTap(e) || this.busy()) return;
          this.goCollect(p);
        }, { 'data-place': p });
        this.bubbleEls.set(p, el);
        this.signLayer.append(el);
      }
      el.setAttribute('aria-label', w.traySpoken(PLACES[p].name, spokenMoney(st.trays[p] ?? 0), trayFull(st, p)));
    }
  }

  /** The Mission complete arrival or a pay in flight: walking errands wait. */
  private busy(): boolean {
    return this.mission !== null && this.mission.phase !== 'end';
  }

  /** The board's stick foot on screen: beside its mat, kept clear of the pins and the covered edges. */
  private footCache = new Map<BuildId, { key: string; foot: { x: number; y: number; box: ScreenBox }; dx: number; dy: number; left: number; zoom: Zoom }>();

  /** boardFoot, worked out again only when the camera, the screen, the price or the signs around change. */
  private boardFootCached(g: CanvasRenderingContext2D, b: BuildId, left: number, taken: ScreenBox[]): { x: number; y: number; box: ScreenBox } {
    const key = [this.cam.zoom, Math.round(this.cam.x), Math.round(this.cam.y), this.view.w, this.view.h, left, this.looks.potholes, this.looks.lightsOut, this.looks.slowInternet, ...taken.map((t) => `${Math.round(t.x)},${Math.round(t.y)}`)].join('|');
    const had = this.footCache.get(b);
    if (had && had.key === key) return had.foot;
    // While the camera slides, the board keeps its place beside the mat as long as it still fits.
    const m = toScreen(this.cam, this.view, MATS[b]);
    const prev = had && had.left === left && had.zoom === this.cam.zoom ? { x: m.x + had.dx, y: m.y + had.dy } : null;
    const foot = this.boardFoot(g, b, left, taken, prev);
    this.footCache.set(b, { key, foot, dx: foot.x - m.x, dy: foot.y - m.y, left, zoom: this.cam.zoom });
    return foot;
  }

  private boardFoot(g: CanvasRenderingContext2D, b: BuildId, left: number, taken: ScreenBox[], prev: Pt | null = null): { x: number; y: number; box: ScreenBox } {
    const s = camScale(this.cam.zoom, this.view);
    const m = toScreen(this.cam, this.view, MATS[b]);
    const hw = (MAT.w * s) / 2;
    const hh = (MAT.h * s) / 2;
    const units = boardUnits(bucketOf(b), left);
    const box0 = priceBoardBox(g, 0, 0, b, units);
    const bw = box0.w;
    const bh = box0.h;
    const pins = Object.values(this.pinBoxes());
    const clearOf = (bx: ScreenBox, o: ScreenBox): boolean => bx.x + bx.w + 4 <= o.x || o.x + o.w + 4 <= bx.x || bx.y + bx.h + 4 <= o.y || o.y + o.h + 4 <= bx.y;
    const fits = (c: Pt): boolean => {
      const bx = { x: c.x + box0.x, y: c.y + box0.y, w: bw, h: bh };
      // Never over a pin, a chip, a button or another sign (W2 "Size"), and on screen.
      return (
        bx.x >= 0 &&
        bx.x + bx.w <= this.view.w &&
        bx.y >= 0 &&
        bx.y + bx.h <= this.view.h &&
        pins.every((p) => clearOf(bx, p)) &&
        this.covers.every((o) => clearOf(bx, o)) &&
        taken.every((o) => clearOf(bx, o))
      );
    };
    // Beside the mat if it fits; else the nearest free place round it (rings 8 px apart).
    const beside: Pt = { x: m.x + hw + 4 + bw / 2, y: m.y + hh };
    let pick: Pt | null = prev && fits(prev) ? prev : fits(beside) ? beside : null;
    const other: Pt = { x: m.x - hw - 4 - bw / 2, y: m.y + hh };
    if (!pick && fits(other)) pick = other;
    for (let r = 8; !pick && r <= 240; r += 8) {
      const n = Math.max(8, Math.round(r / 6));
      for (let k = 0; k < n && !pick; k++) {
        const a = (k / n) * Math.PI * 2;
        const c = { x: m.x + Math.cos(a) * (r + hw), y: m.y + bh / 2 + Math.sin(a) * (r + hh) };
        if (fits(c)) pick = c;
      }
    }
    if (!pick) {
      // A tight screen (320 x 240, 640 x 200): every free spot on screen, 4 px apart; the nearest wins.
      let best = Infinity;
      for (let y = bh; y <= this.view.h; y += 4)
        for (let x = bw / 2; x <= this.view.w - bw / 2; x += 4) {
          const d = Math.hypot(x - beside.x, y - beside.y);
          if (d < best && fits({ x, y })) {
            best = d;
            pick = { x, y };
          }
        }
    }
    const at = pick ?? beside;
    return { x: at.x, y: at.y, box: { x: at.x + box0.x, y: at.y + box0.y, w: bw, h: bh } };
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
    } else body.push(h('p', {}, w.earnLane), h('p', { class: 'city-soon' }, w.cards.lightsOut.soon));
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
      if (this.hooks.still()) this.endBuild();
    } else {
      this.addLine(w.partPaid(priceText(p.bucket, p.amount), priceText(p.bucket, p.leftAfter)));
      this.announce();
      this.refresh();
    }
  }

  private endBuild(): void {
    const b = this.building;
    if (!b) return;
    this.building = null;
    this.addLine(WORDS.city.builtLine[b.build]);
    this.announce();
    this.refresh();
    if (this.mission && this.mission.phase === 'walk') this.endMission();
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
      this.life.set(r.next, true);
      this.collecting = { place: p, amount: r.amount, t: 0, pieces: flyingCount(r.amount / 100) };
      this.hooks.sound('collect');
      this.addLine(WORDS.city.collectLine(formatMoney(r.amount), PLACES[p].name), PAY.collectLine);
      if (this.hintId === 'collect') this.setHint(null);
      this.makeSigns();
      this.fillChips();
      this.announce();
      if (this.hooks.still()) this.collecting = null;
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

  private addLine(text: string, dur = LINE_TIME): void {
    this.lines = [{ text, t: 0, dur }];
    this.say.textContent = text;
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
      if (!this.pay && !this.building && !this.hero.moving && !this.arrived && ms.t > BUS_ARRIVAL.time + 0.5) this.endMission();
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
    this.wake();
  }

  // ---------- Hints (W7) ----------

  private setHint(id: string | null): void {
    this.hintId = id;
    const w = WORDS.city;
    const text = id === 'walk' ? (this.hooks.touch() ? w.hintWalk : w.hintWalkKeys) : id === 'buka' ? w.hintBuka() : id === 'collect' ? w.hintCollect : '';
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
    if (!st.hints.includes('buka') && boardsShown(st).includes('mamaPut')) this.setHint('buka');
    else if (!st.hints.includes('collect') && (st.trays.buka ?? 0) >= 100) this.setHint('collect');
  }

  // ---------- Looking around ----------

  private measure(): void {
    const r = this.map.getBoundingClientRect();
    const top = this.el.querySelector<HTMLElement>('.city-top');
    const covered = Math.max(top ? top.getBoundingClientRect().bottom : r.top, this.chips.getBoundingClientRect().bottom) - r.top;
    // The hint bar and the Mission complete heading sit just under the top row (W7, W5).
    this.hintEl.style.top = `${Math.round(Math.max(0, covered) + 4)}px`;
    this.banner.style.top = `${Math.round(Math.max(0, covered) + 4)}px`;
    // The heading, chips and buttons over the map: boards keep clear of them.
    this.covers = [...this.el.querySelectorAll<HTMLElement>('.city-top > *, .city-chip, .city-bottom button')].map((e) => {
      const b = e.getBoundingClientRect();
      return { x: b.left - r.left, y: b.top - r.top, w: b.width, h: b.height };
    });
    const bottom = this.el.querySelector<HTMLElement>('.city-bottom');
    this.bottomCover = bottom ? Math.max(0, r.bottom - bottom.getBoundingClientRect().top) : 0;
    this.view = { w: Math.max(1, r.width), h: Math.max(1, r.height), top: Math.max(0, covered) };
  }

  private readonly onResize = (): void => {
    this.measure();
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
      // Tap anywhere skips Mission complete.
      if (!this.hooks.ignoreTap(e)) this.skipMission();
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
    if (this.busy()) {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        this.skipMission();
      }
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
    if (this.mission?.phase !== 'bus') {
      this.stepHold();
      this.moveHero(dt);
      this.onStand(dt);
    }
    this.stepPay(dt);
    this.stepBuild(dt);
    this.stepCollect(dt);
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
      for (const l of this.lines) l.t += dt / l.dur;
      this.lines = this.lines.filter((l) => l.t < 1);
      this.needDraw = true;
    }
    if (!this.mission && !this.hintId && !this.pay && !this.building) this.pickHint();
  }

  /** The painted still city for these looks at this zoom step (made again only when a look or the size changes). */
  private picture(dpr: number): { img: HTMLCanvasElement; scale: number } | null {
    const want = Math.min(camScale(this.cam.zoom, this.view) * dpr, 2048 / CITY_MAP.w);
    const st = this.shown;
    const market = st.built.includes('market') || this.building?.build === 'market';
    const looks = `${this.looks.potholes}|${this.looks.lightsOut}|${this.looks.slowInternet}|${market}`;
    const key = `${looks}|${this.cam.zoom}|${dpr}`;
    const have = painted.get(key);
    if (have && Math.abs(have.scale - want) < 1e-6) return have;
    for (const k of painted.keys()) if (!k.startsWith(`${looks}|`)) painted.delete(k);
    const img = makeCityCanvas(this.looks, want, 2048, { market });
    if (!img) return null;
    const made = { img, scale: want };
    painted.set(key, made);
    return made;
  }

  private draw(): void {
    if (this.closed) return;
    this.needDraw = false;
    const moving = this.hero.moving || this.mission?.phase === 'bus' || this.hold?.on === true;
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
    this.drawLive(g, dpr, s);
    this.placePins();
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
    const size = walkerSize(s);
    const ms = this.mission;
    if (ms && ms.phase === 'bus') {
      const kk = still ? 1 : Math.min(1, ms.t / BUS_ARRIVAL.time);
      items.push({ y: ms.bus.y + 25, draw: () => drawBusArrival(g, this.hooks.look(), ms.bus.x, ms.bus.y, kk, size) });
    } else {
      if (ms && ms.phase === 'walk') items.push({ y: ms.bus.y, draw: () => drawCityBus(g, ms.bus.x, ms.bus.y, 'e') });
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
    const taken: ScreenBox[] = [];
    for (const p of this.trays()) {
      const at = toScreen(this.cam, this.view, BUBBLE_AT[p]);
      const amount = this.life.state.trays[p] ?? 0;
      taken.push(trayBubbleBox(g, at.x, at.y, trayWords(amount), trayFull(this.life.state, p)));
    }
    for (const b of boards) {
      const bucket = bucketOf(b);
      let left = this.building?.build === b ? 0 : leftOf(st, b);
      if (pay && pay.build === b) left = pay.leftBefore - Math.round((pay.amount * pay.landed) / pay.pieces);
      const units = boardUnits(bucket, left);
      const foot = this.boardFootCached(g, b, left, taken);
      taken.push(foot.box);
      const wob = this.wobble?.build === b ? boardWobble(this.wobble.t) : 0;
      const done = this.building?.build === b || (pay?.build === b && pay.done && pay.landed === pay.pieces);
      const sp = wob ? null : this.sprite(`board|${b}|${units}|${done}|${dpr}`, foot.box.w + 16, foot.box.h + 16, foot.x - foot.box.x + 8, foot.y - foot.box.y + 8, dpr, (c) => drawPriceBoard(c, 0, 0, b, units, { done }));
      if (sp) g.drawImage(sp.img, foot.x - sp.ox, foot.y - sp.oy, foot.box.w + 16, foot.box.h + 16);
      else drawPriceBoard(g, foot.x, foot.y, b, units, { wobble: wob, done });
      this.boardBox.set(b, foot.box);
      this.placeSign(this.boardEls.get(b), foot.box);
    }
    for (const p of this.trays()) {
      const at = toScreen(this.cam, this.view, BUBBLE_AT[p]);
      const amount = this.life.state.trays[p] ?? 0;
      const text = trayWords(amount);
      const full = trayFull(this.life.state, p);
      drawTrayBubble(g, at.x, at.y, 'naira', text, full, 0);
      const box = trayBubbleBox(g, at.x, at.y, text, full);
      this.bubbleBox.set(p, box);
      this.placeSign(this.bubbleEls.get(p), box);
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
    for (const l of this.lines) drawCollectLine(g, heroAt.x, heroAt.y - size * s - 18, l.text, l.t, still);
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

  /** Pins, boards and trays off the screen get a round sign at the edge with their icon (W1). */
  private drawArrows(g: CanvasRenderingContext2D): void {
    const want: { icon: EdgeIcon; at: Pt; go: () => void; label: string }[] = [];
    const top = this.view.top ?? 0;
    const bottomH = this.view.h - this.bottomCover;
    // Off the screen: its middle is outside the whole map area (a thing partly under a button row still shows).
    const off = (b: ScreenBox): boolean => {
      const cx = b.x + b.w / 2;
      const cy = b.y + b.h / 2;
      return cx < 0 || cx > this.view.w || cy < 0 || cy > this.view.h;
    };
    const pins = this.pinBoxes();
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
      const at = edgeArrowPlace(a.at.x, a.at.y, this.view.w, bottomH, top, inset);
      if (!at) {
        el.hidden = true;
        return;
      }
      drawEdgeArrow(g, at.x, at.y, at.angle, a.icon);
      const r = EDGE_ARROW.r + 4;
      this.placeSign(el, { x: at.x - r, y: at.y - r, w: r * 2, h: r * 2 });
      el.dataset['for'] = a.label;
      el.onclick = (e) => {
        if (this.hooks.ignoreTap(e) || this.busy() || this.cardOpen) return;
        a.go();
      };
      this.arrowBox.push({ icon: a.icon, x: at.x, y: at.y });
    });
  }
}

