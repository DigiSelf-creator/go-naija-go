/**
 * O6b: Ogun from above, Ogun's home screen from the first visit (OG-R35; docs/ogun.md part 6;
 * decisions 47, 71, 80; city.md 5W, W2 to W8, W18, d5 to d9). The Lagos city's way of playing on
 * Ogun's map (src/screens/city.ts is Lagos's, in the first load; this lighter twin lives in the
 * lazy Ogun part so the first load stays small):
 *
 * - The still city (art O6a's makeOgunCityCanvas) is painted once per look and zoom step and
 *   copied with one drawImage. On top: the pay mats, the tax places at work, the hero, the price
 *   boards, tray bubbles and flying money. Draw only when something moves; standing still, at
 *   most 2 small redraws a second while a tax place serves (none with reduced motion), and
 *   nothing at all when nothing moves.
 * - Tap the ground to walk there (a ring shows where the hero stops); hold and slide to keep
 *   walking; arrow keys walk; + and − zoom. The camera follows the hero.
 * - Stand on a mat to pay from the one wallet (decision 80): part pay, Not enough, the build,
 *   its line (6.2). Walk to a tax place's front to collect its tray (6.3, W18 words with Ogun's
 *   names). The Booming meter (6.4) is in the heading; at 20, "Ogun is booming!".
 * - Pins, boards and bubbles are plain buttons over the map, so keys and screen readers reach them.
 */
import { BUCKETS, CITY_MAP, bucketIconSvg, type BucketKind } from '../../art/city';
import { boomBarSvg, boomIconSvg } from '../../art/boomMeter';
import { EDGE_ARROW, MAT, PAY, boardWobble, drawEdgeArrow, drawFlyingMoney, drawPayMat, drawPriceBoard, drawTrayBubble, edgeArrowPlace, flyingCount, payTime, priceBoardBox, trayBubbleBox, trayWords, type BoardOf, type EdgeIcon } from '../../art/payspot';
import { WALKER, drawCityHero, drawWalkRing, walkDir, walkerSize, type WalkDir } from '../../art/walker';
import { meterOf } from '../../game/boom';
import { FIRST_BOOM, TRAY_MIN } from '../../game/city';
import { pinTapBox } from '../../game/cityCamera';
import { formatMoney, spokenMoney } from '../../game/money';
import { button, h } from '../../screens/dom';
import { WORDS } from '../../screens/words';
import type { WorldCity, WorldCityHooks } from '../ui';
import { OGUN_PLACES, OGUN_SPOTS, OGUN_SPOT_IDS, OGUN_SPOT_WORDS, drawOgunPin, makeOgunCityCanvas, type OgunPlaceId, type OgunSpotId } from './city';
import { drawAdireMarket, drawGarriMill, drawKolaMarket } from './places';
import { OGUN_CITY_WORDS } from './cityWords';
import {
  OGUN_PLACE_LIST,
  OGUN_PRICES,
  OGUN_TAX,
  boomed,
  collectOgunTray,
  leftOn,
  ogunBoards,
  ogunBoomDue,
  ogunBright,
  ogunLooks,
  payOgunBoard,
  readOgunCity,
  readWallet,
  withOgunHint,
  writeOgunCity,
  type OgunBoard,
  type OgunCityState,
  type OgunFixId,
  type Wallet,
} from './cityRules';
import { OGUN_HOME, ogunNearest, ogunPath, ogunWalkable, type Pt } from './walk';
import { OgunCityFolk } from './cityFolk';
import { loadPeople, peopleKit } from '../../game/peopleLoad';

/** Two boxes overlap (touching edges do not count). */
const hits = (a: Box, b: Box): boolean => a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5;

/** Where each board's mat lies (map units, on walkable ground by its pin or place). */
export const OGUN_MATS: Readonly<Record<OgunBoard, Pt>> = {
  potholes: { x: 101, y: 500 },
  adire: { x: 649, y: 304 },
  dryTaps: { x: 1069, y: 770 },
  lightsOut: { x: 821, y: 700 },
  slowInternet: { x: 300, y: 548 },
  mill: { x: 1323, y: 548 },
  kola: { x: 1323, y: 820 },
};
/** Where the hero stands to collect a tray: just in front of the place (map units). */
export const OGUN_DOORS: Readonly<Record<OgunPlaceId, Pt>> = {
  adire: { x: OGUN_PLACES.adire.x, y: OGUN_PLACES.adire.y + 22 },
  mill: { x: OGUN_PLACES.mill.x, y: OGUN_PLACES.mill.y + 22 },
  kola: { x: OGUN_PLACES.kola.x, y: OGUN_PLACES.kola.y + 22 },
};

/** How far the camera may drag past the map's edge (CSS px), and near is 2 times far. */
const EDGE = 40;
const NEAR = 2;
/** A finger that moves this far, or stays down this long, is a hold (W1). */
const HOLD_PX = 8;
const HOLD_MS = 150;
/** Collect reach (W4); Gentle doubles it. On a mat: within its half size. */
const COLLECT_REACH = 48;
/** A build goes up in this long; lines show this long. */
const BUILD_TIME = 1.5;
const LINE_TIME = 2.2;
/** Standing still: at most 2 small redraws a second. */
const IDLE_MS = 500;
/** Most device pixels a CSS px for the map: 1.5 standing still, 1 while moving (slow phones). */
const MAP_DPR = 1.5;
const MAP_DPR_MOVING = 1;
/** W18: the tax explanation shows 4 to 8 s. */
const TAX_HINT = 6;

const BUCKET_SOUND: Record<BucketKind, string> = { naira: 'payChink', power: 'payBulb', tech: 'payChip' };
const DRAW_PLACE = { adire: drawAdireMarket, mill: drawGarriMill, kola: drawKolaMarket } as const;

type Cam = { zoom: 'far' | 'near'; x: number; y: number };
interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The painted still city, kept between visits (this page load only). */
const painted = new Map<string, { img: HTMLCanvasElement; scale: number }>();
let lastCam: Cam | null = null;

/** A board's own number (whole naira, or units) and its chalk-board spec. */
const boardUnits = (b: OgunBoard, own: number): number => (OGUN_PRICES[b].bucket === 'naira' ? own / 100 : own);
const boardOf = (b: OgunBoard): BoardOf => ({ bucket: OGUN_PRICES[b].bucket, price: boardUnits(b, OGUN_PRICES[b].price), name: OGUN_CITY_WORDS.board[b] });
const priceText = (bucket: BucketKind, own: number): string => (bucket === 'naira' ? formatMoney(own) : `${bucket === 'power' ? 'Power' : 'Tech'} ${own}`);
const spokenPrice = (bucket: BucketKind, own: number): string => (bucket === 'naira' ? spokenMoney(own) : `${bucket === 'power' ? 'Power' : 'Tech'} ${own}`);
/** Two boxes come closer than `gap` px. */
const near = (a: Box, b: Box, gap: number): boolean => a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;
/** OG-R43 b: an edge arrow's icon for each pin (Lagos's spot icons; the pump's and the gateway's by what fixes them). */
const SPOT_ICON: Readonly<Record<OgunSpotId, EdgeIcon>> = { potholes: 'potholes', dryTaps: 'power', lightsOut: 'lightsOut', slowInternet: 'slowInternet', badRoad: 'potholes' };

export class OgunCityScreen implements WorldCity {
  readonly el: HTMLElement;
  private readonly map: HTMLCanvasElement;
  private readonly pinLayer: HTMLElement;
  private readonly signLayer: HTMLElement;
  private readonly chips: HTMLElement;
  private readonly cardSpot: HTMLElement;
  private readonly hintEl: HTMLElement;
  private readonly banner: HTMLElement;
  private readonly say: HTMLElement;
  private readonly head: HTMLElement;
  private readonly top: HTMLElement;
  private view = { w: 1, h: 1, top: 0 };
  cam: Cam;
  private st: OgunCityState;
  private trayKey = '';
  hero: { x: number; y: number; dir: WalkDir; phase: number; moving: boolean };
  private path: Pt[] = [];
  private ring: { x: number; y: number; t: number } | null = null;
  private stand = 0;
  private arrived = false;
  private pay: { board: OgunBoard; bucket: BucketKind; amount: number; leftAfter: number; done: boolean; t: number; dur: number; pieces: number; landed: number; before: OgunCityState } | null = null;
  private building: { board: OgunBoard; t: number; before: OgunCityState } | null = null;
  private collecting: { place: OgunPlaceId; amount: number; t: number; pieces: number } | null = null;
  private wobble: { board: OgunBoard; t: number } | null = null;
  private lines: { text: string; t: number; head?: string }[] = [];
  private hintUntil = 0;
  private pins: { spot: OgunSpotId; el: HTMLButtonElement; word: string }[] = [];
  /** OG-R37: Pothole Hall is won (the Bad road pin is fixed, the gate and verge bright). */
  private readonly hallWon: boolean;
  /**
   * OG-R43 a: people walking about (Lagos's walkers from the people's kit, Ogun's ground and cast),
   * once the kit has arrived. They hold still while the map is not drawing every frame.
   */
  private folk: OgunCityFolk | null = null;
  /** People switched off for this visit after an error in their code (they never stop the city). */
  private folkOff = false;
  private brightKey = '';
  private brightSet: ReadonlySet<string> = new Set();
  private readonly boardEls = new Map<OgunBoard, HTMLButtonElement>();
  private readonly bubbleEls = new Map<OgunPlaceId, HTMLButtonElement>();
  private boardBox = new Map<OgunBoard, Box>();
  private bubbleBox = new Map<OgunPlaceId, Box>();
  /** The problem card, the Not enough card or the boom card showing. */
  open: string | null = null;
  private onClose: (() => void) | null = null;
  private time = 0;
  private last = 0;
  private raf = 0;
  private idleTimer = 0;
  private needDraw = true;
  private closed = false;
  /** Map draws so far (tests check that a still city draws nothing). */
  draws = 0;
  private readonly fingers = new Map<number, Pt>();
  private hold: { id: number; at: number; from: Pt; on: boolean } | null = null;
  private pinch: number | null = null;
  private readonly keys = new Set<string>();
  private chipText = '';
  private meterKey = '';

  constructor(private readonly hooks: WorldCityHooks) {
    const w = WORDS.city;
    const o = OGUN_CITY_WORDS;
    this.st = readOgunCity(hooks.own.own);
    this.hallWon = hooks.hallWon === true;
    const at = this.st.at && ogunWalkable(this.st.at) ? this.st.at : this.st.at ? ogunNearest(this.st.at) : { ...OGUN_HOME };
    this.hero = { x: at.x, y: at.y, dir: 's', phase: 0, moving: false };
    this.map = h('canvas', { class: 'city-map', role: 'img', 'aria-label': o.map });
    this.signLayer = h('div', { class: 'city-signs' });
    this.pinLayer = h('div', { class: 'city-pins' });
    this.chips = h('div', { class: 'city-chips' });
    this.cardSpot = h('div', { class: 'city-card-spot', hidden: true });
    // QA-O round: a card stays inside the phone's safe edges (inline here, so the first load's styles do not grow).
    this.cardSpot.style.padding = 'max(8px, var(--safe-top)) max(8px, var(--safe-right)) max(8px, var(--safe-bottom)) max(8px, var(--safe-left))';
    this.hintEl = h('p', { class: 'city-hint', hidden: true, 'aria-live': 'polite' });
    this.banner = h('div', { class: 'city-banner', hidden: true, role: 'status' });
    this.say = h('p', { class: 'sr-only', 'aria-live': 'polite' });
    this.head = h('h2', { class: 'city-head' });
    const zoomIn = button(w.zoomIn, 'minor city-zoom-btn', () => this.zoom('near'), { 'aria-label': w.zoomInSpoken });
    const zoomOut = button(w.zoomOut, 'minor city-zoom-btn', () => this.zoom('far'), { 'aria-label': w.zoomOutSpoken });
    this.top = h('div', { class: 'city-top' }, this.head, this.chips, h('div', { class: 'city-top-right' }, ...hooks.topRight));
    this.el = h(
      'div',
      { class: 'card city-card ogun-city', role: 'dialog', 'aria-label': o.heading },
      h('div', { class: 'city-stage' }, this.map, this.signLayer, this.pinLayer),
      this.top,
      this.hintEl,
      h('div', { class: 'city-bottom' }, h('div', { class: 'city-buttons' }, ...hooks.bottom), h('div', { class: 'city-zoom' }, zoomOut, zoomIn)),
      this.banner,
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
  }

  /** Call once the screen is in the page (it needs its size). */
  start(): void {
    this.measure();
    this.cam = this.clamp(lastCam ? { ...lastCam } : this.centreOn(this.hero, 'far'));
    // OG-R39: after a win, "Mission complete!" over "You brought ₦X home."; else the line alone.
    const line = this.hooks.line;
    if (line) this.addLine(line, this.hooks.won ? WORDS.city.mission.heading : undefined);
    // OG-R37: back in the city after the first hall win, the gateway's built line plays once.
    if (this.hallWon && !this.st.hints.includes('gate')) {
      this.save(withOgunHint(this.st, 'gate'), true);
      this.addLine(OGUN_CITY_WORDS.built.badRoad);
      this.hooks.sound('built');
    }
    if (ogunBoomDue(this.st)) this.openBoom();
    else if (!this.st.hints.includes('walk')) {
      this.setHint(this.hooks.touch() ? OGUN_CITY_WORDS.hintWalk : OGUN_CITY_WORDS.hintWalkKeys, 5);
      this.save(withOgunHint(this.st, 'walk'), true);
    }
    this.last = performance.now();
    this.requestDraw();
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.finishAnims();
    this.save({ ...this.st, at: { x: this.hero.x, y: this.hero.y } }, true);
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
  }

  // ---------- State ----------

  private get wallet(): Wallet {
    return readWallet(this.hooks.life.state);
  }
  /** The city as drawn: before a pay that is still flying or building, else the live one. */
  private get shown(): OgunCityState {
    return this.pay?.before ?? this.building?.before ?? this.st;
  }
  /** Ogun's own part and (with `wallet`) the one wallet, written at once on a pay or a collect. */
  private save(next: OgunCityState, now = false, wallet?: Wallet): void {
    this.st = next;
    if (wallet) this.hooks.life.set({ ...this.hooks.life.state, kobo: wallet.kobo, power: wallet.power, tech: wallet.tech }, true);
    this.hooks.own.set(writeOgunCity(next), now);
    this.trayKey = JSON.stringify(next.trays);
  }
  /** The trays may have filled (StateCity, in play time): read them back. */
  private syncTrays(): boolean {
    const own = readOgunCity(this.hooks.own.own);
    const key = JSON.stringify(own.trays);
    if (key === this.trayKey) return false;
    this.trayKey = key;
    this.st = { ...this.st, trays: own.trays };
    return true;
  }

  /** Tests: where things are on screen, the save and the wallet. */
  get test(): {
    boards: Record<string, Box>;
    bubbles: Record<string, Box>;
    pins: Record<string, Box>;
    hero: Pt;
    paying: boolean;
    open: string | null;
    city: Record<string, unknown>;
    mats: Record<string, Pt>;
    folk: number;
    arrows: { icon: string; x: number; y: number; tap: number; for: string }[];
    roomless: string[];
    short: string[];
  } {
    const pins: Record<string, Box> = {};
    for (const p of this.pins) pins[p.spot] = this.pinBox(p.spot, p.word);
    return {
      boards: Object.fromEntries(this.boardBox),
      bubbles: Object.fromEntries(this.bubbleBox),
      pins,
      hero: { x: this.hero.x, y: this.hero.y },
      paying: this.pay !== null || this.building !== null,
      open: this.open,
      city: writeOgunCity(this.st),
      mats: { ...OGUN_MATS },
      folk: this.folk?.count ?? 0,
      arrows: this.arrowBox.map((a) => ({ ...a })),
      roomless: [...this.roomless],
      short: [...this.boardShort],
    };
  }

  // ---------- Camera ----------

  private scale(zoom: Cam['zoom']): number {
    const v = this.view;
    const far = Math.max(0.12, Math.min((v.h - v.top * 0.5) / CITY_MAP.h, (v.w * 1.4) / CITY_MAP.w));
    return zoom === 'near' ? far * NEAR : far;
  }
  private clamp(c: Cam): Cam {
    const s = this.scale(c.zoom);
    const axis = (o: number, len: number, view: number, from: number): number => (len <= view ? from + (view - len) / 2 : Math.min(from + EDGE, Math.max(from + view - len - EDGE, o)));
    return { zoom: c.zoom, x: axis(c.x, CITY_MAP.w * s, this.view.w, 0), y: axis(c.y, CITY_MAP.h * s, this.view.h - this.view.top, this.view.top) };
  }
  private centreOn(m: Pt, zoom: Cam['zoom']): Cam {
    const s = this.scale(zoom);
    return this.clamp({ zoom, x: this.view.w / 2 - m.x * s, y: this.view.top + (this.view.h - this.view.top) / 2 - m.y * s });
  }
  private toScreen(m: Pt): Pt {
    const s = this.scale(this.cam.zoom);
    return { x: this.cam.x + m.x * s, y: this.cam.y + m.y * s };
  }
  private toMap(p: Pt): Pt {
    const s = this.scale(this.cam.zoom);
    return { x: (p.x - this.cam.x) / s, y: (p.y - this.cam.y) / s };
  }
  private zoom(z: Cam['zoom']): void {
    if (z === this.cam.zoom) return;
    this.cam = this.centreOn(this.hero, z);
    this.requestDraw();
  }

  private measure(): void {
    const r = this.el.getBoundingClientRect();
    const t = this.top.getBoundingClientRect();
    this.view = { w: Math.max(1, r.width), h: Math.max(1, r.height), top: Math.max(0, Math.min(r.height / 2, t.bottom - r.top)) };
    const dpr = Math.min(window.devicePixelRatio || 1, MAP_DPR);
    this.map.width = Math.round(this.view.w * dpr);
    this.map.height = Math.round(this.view.h * dpr);
    this.coversDirty = true;
  }

  /** The top row's and bottom row's boxes, measured again once they may have moved (a resize, new chips or meter). */
  private measureCovers(): void {
    if (!this.coversDirty) return;
    this.coversDirty = false;
    const r = this.el.getBoundingClientRect();
    this.covers = [...this.top.querySelectorAll<HTMLElement>('.city-head, .city-chips, button'), ...this.el.querySelectorAll<HTMLElement>('.city-bottom button')]
      .map((e) => e.getBoundingClientRect())
      .filter((b) => b.width > 0 && b.height > 0)
      .map((b) => ({ x: b.left - r.left, y: b.top - r.top, w: b.width, h: b.height }));
  }
  private coversDirty = true;

  // ---------- Heading, chips, pins ----------

  private fillMeter(): void {
    const w = WORDS.city;
    const m = meterOf(this.shown.boom, this.st.boomSeen);
    const small = typeof matchMedia === 'function' && matchMedia('(max-width: 640px), (max-height: 300px)').matches;
    const key = `${m.points}|${m.next}|${small}`;
    if (key === this.meterKey) return;
    this.meterKey = key;
    this.head.setAttribute('aria-label', `${OGUN_CITY_WORDS.heading}. ${w.meterSpoken(m.points, m.next)}`);
    this.coversDirty = true;
    this.head.innerHTML =
      `<span class="city-head-row"><span>${OGUN_CITY_WORDS.heading}</span><span class="boom-icon">${boomIconSvg(small ? 14 : 16)}</span><b class="boom-word">${w.booming}</b></span>` +
      `<span class="city-head-row">${boomBarSvg(m.filled, m.per, small)}<b class="boom-num">${w.meter(m.points, m.next)}</b></span>`;
  }

  /** The three chips (the one wallet); while money flies they count with it. */
  private fillChips(): void {
    const w = WORDS.city;
    const s = this.wallet;
    const val: Record<BucketKind, number> = { naira: s.kobo, power: s.power, tech: s.tech };
    if (this.pay) val[this.pay.bucket] += Math.round(this.pay.amount * (1 - this.pay.landed / this.pay.pieces));
    if (this.collecting) val.naira -= Math.round(this.collecting.amount * (1 - Math.min(1, this.collecting.t / payTime(this.collecting.amount / 100))));
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
    this.coversDirty = true;
  }

  private makePins(): void {
    const w = WORDS.city;
    const looks = ogunLooks(this.shown, this.wallet, this.hallWon);
    // OG-R37: the Bad road pin stays until Pothole Hall is won.
    const spots = (['potholes', 'dryTaps', 'lightsOut', 'slowInternet', 'badRoad'] as const).filter((s) => looks[s] !== 'fixed');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.pins = spots.map((spot) => {
      const ready = looks[spot] === 'ready';
      const word = ready ? 'Ready' : OGUN_SPOT_WORDS[spot];
      const el = button('', `city-pin ${looks[spot]}`, (e) => {
        if (this.hooks.ignoreTap(e) || this.busy()) return;
        if (spot === 'badRoad') this.openBadRoad();
        else this.openCard(spot);
      }, { 'aria-label': ready ? w.pinReady(OGUN_SPOT_WORDS[spot]) : w.pinProblem(OGUN_SPOT_WORDS[spot]), 'data-spot': spot });
      const box = pinTapBox(0, 0, word);
      const pic = h('canvas', { 'aria-hidden': 'true' });
      pic.width = Math.round(box.w * dpr);
      pic.height = Math.round(box.h * dpr);
      pic.style.width = `${box.w}px`;
      pic.style.height = `${box.h}px`;
      el.style.width = `${box.w}px`;
      el.style.height = `${box.h}px`;
      const g = pic.getContext('2d');
      if (g) {
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawOgunPin(g, -box.x, -box.y, spot, ready ? 'ready' : 'problem', 0);
      }
      el.append(pic);
      // OG-R35 (W7 step 2): on the first visit the Potholes pin hops until it is tapped (never with reduced motion).
      if (spot === 'potholes' && !this.st.hints.includes('pin') && !this.hooks.still() && typeof pic.animate === 'function') {
        el.classList.add('first');
        pic.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-7px)' }], { duration: 450, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
      }
      return { spot, el, word };
    });
    this.pinLayer.replaceChildren(...this.pins.map((p) => p.el));
  }

  private pinBox(spot: OgunSpotId, word: string): Box {
    const at = this.toScreen(OGUN_SPOTS[spot].pin);
    return pinTapBox(at.x, at.y, word);
  }

  private placePins(): void {
    for (const p of this.pins) {
      const b = this.pinBox(p.spot, p.word);
      const t = `translate(${Math.round(b.x)}px, ${Math.round(b.y)}px)`;
      if (p.el.style.transform !== t) p.el.style.transform = t;
    }
  }

  // ---------- Boards and bubbles ----------

  private boards(): OgunBoard[] {
    const out = ogunBoards(this.shown);
    const b = this.pay?.board ?? this.building?.board;
    if (b && !out.includes(b)) out.push(b);
    return out;
  }
  private trays(): OgunPlaceId[] {
    return OGUN_PLACE_LIST.filter((p) => this.st.built.includes(p) && (this.st.trays[p] ?? 0) >= TRAY_MIN && this.collecting?.place !== p && this.building?.board !== p);
  }

  /** The buttons over boards and bubbles, made again when which ones show changes. */
  private makeSigns(): void {
    const w = WORDS.city;
    const want = this.boards();
    for (const [b, el] of this.boardEls)
      if (!want.includes(b)) {
        el.remove();
        this.boardEls.delete(b);
        this.boardBox.delete(b);
      }
    const wallet = this.wallet;
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
      const bucket = OGUN_PRICES[b].bucket;
      const left = leftOn(this.shown, b);
      const have = bucket === 'naira' ? wallet.kobo : bucket === 'power' ? wallet.power : wallet.tech;
      el.setAttribute('aria-label', w.boardSpoken(OGUN_CITY_WORDS.board[b], spokenPrice(bucket, left), spokenPrice(bucket, have), left < OGUN_PRICES[b].price));
    }
    const trays = this.trays();
    for (const [p, el] of this.bubbleEls)
      if (!trays.includes(p)) {
        el.remove();
        this.bubbleEls.delete(p);
        this.bubbleBox.delete(p);
      }
    for (const p of trays) {
      let el = this.bubbleEls.get(p);
      if (!el) {
        el = button('', 'city-sign city-bubble', (e) => {
          if (this.hooks.ignoreTap(e) || this.busy()) return;
          this.walkTo(OGUN_DOORS[p]);
        }, { 'data-place': p });
        this.bubbleEls.set(p, el);
        this.signLayer.append(el);
      }
      const amount = this.st.trays[p] ?? 0;
      el.setAttribute('aria-label', w.traySpoken(OGUN_CITY_WORDS.placeName[p], spokenMoney(amount), amount >= OGUN_TAX[p].cap));
    }
  }

  /**
   * Where each board and bubble stands on screen now (OG-R43 b, as Lagos's 5W and W15): by its mat
   * or place when that is clear; else the nearest clear place round it, clear of every drawn pin,
   * the top row, the bottom buttons and each other sign; on a small screen with no room at full
   * size, a board stands on its short stick (48 px tall). One whose place is off the screen hides
   * there, and an edge arrow with its icon shows the way (drawArrows).
   */
  private placeSigns(g: CanvasRenderingContext2D | null): void {
    this.measureCovers();
    const hard: Box[] = [...this.pins.map((p) => this.pinBox(p.spot, p.word)), ...this.covers, ...(this.hintWant ? [this.hintWant] : [])];
    const taken: Box[] = [];
    const vw = this.view.w;
    const vh = this.view.h;
    const inView = (b: Box): boolean => b.x >= 0 && b.y >= 0 && b.x + b.w <= vw && b.y + b.h <= vh;
    const strict = (b: Box): boolean => inView(b) && !hard.some((t) => near(t, b, 2)) && !taken.some((t) => near(t, b, 2));
    // A tiny screen with no clear room: never over a button or off the map; a pin or sign may be under it.
    const loose = (b: Box): boolean => inView(b) && !this.covers.some((t) => near(t, b, 2));
    /** Its own place, its last place, then rings round its own place, 8 px apart (the nearest clear one). */
    const fit = (id: string, want: Box, clear = strict): Box | null => {
      const prev = this.signAt.get(id);
      const cands: Box[] = [want];
      if (prev && Math.hypot(prev.dx, prev.dy) < 260) cands.push({ ...want, x: want.x + prev.dx, y: want.y + prev.dy });
      for (const c of cands) if (clear(c)) return c;
      for (let r = 8; r <= 240; r += 8) {
        const n = Math.max(8, Math.round(r / 5));
        for (let k = 0; k < n; k++) {
          const t = (k / n) * Math.PI * 2;
          const c = { ...want, x: Math.round(want.x + Math.cos(t) * r), y: Math.round(want.y + Math.sin(t) * r * 0.75) };
          if (clear(c)) return c;
        }
      }
      return null;
    };
    const offScreen = (b: Box): boolean => {
      const cx = b.x + b.w / 2;
      const cy = b.y + b.h / 2;
      return cx < 0 || cy < 0 || cx > vw || cy > vh;
    };
    const ctx = g ?? this.map.getContext('2d');
    const at = (foot: Pt, r: Box): Box => ({ x: foot.x + r.x, y: foot.y + r.y, w: r.w, h: r.h });
    const keep = (id: string, home: Box, box: Box): void => {
      this.signAt.set(id, { dx: box.x - home.x, dy: box.y - home.y });
    };
    this.boardShort.clear();
    this.roomless.clear();
    /** No room at all on this screen: it hides until the camera moves (never over a button). */
    const hide = (id: string, b: Box): Box => {
      this.roomless.add(id);
      return { ...b, x: -10_000 - b.w };
    };
    for (const b of this.boardEls.keys()) {
      const foot = this.toScreen({ x: OGUN_MATS[b].x, y: OGUN_MATS[b].y - MAT.h / 2 });
      const left = boardUnits(b, leftOn(this.shown, b));
      const done = this.boardDone(b);
      const full = ctx ? at(foot, this.relBox(`b|${b}|${left}|${done}|`, () => priceBoardBox(ctx, 0, 0, boardOf(b), left, { done }))) : { x: foot.x - 40, y: foot.y - 54, w: 80, h: 54 };
      let box: Box = full;
      if (!offScreen(full)) {
        const got = fit(`b|${b}`, full);
        if (got) box = got;
        else if (ctx) {
          // No room at full size: the short stick (W15).
          const short = at(foot, this.relBox(`b|${b}|${left}|${done}|s`, () => priceBoardBox(ctx, 0, 0, boardOf(b), left, { done, short: true })));
          const s2 = fit(`b|${b}`, short) ?? fit(`b|${b}`, short, loose);
          if (s2) {
            box = s2;
            this.boardShort.add(b);
          } else box = hide(b, full);
        } else box = hide(b, full);
        keep(`b|${b}`, full, box);
      }
      taken.push(box);
      this.boardBox.set(b, box);
    }
    for (const p of this.bubbleEls.keys()) {
      const foot = this.toScreen({ x: OGUN_PLACES[p].x, y: OGUN_PLACES[p].y - 50 });
      const amount = this.st.trays[p] ?? 0;
      const text = WORDS.city.trayLabel(trayWords(amount));
      const full = amount >= OGUN_TAX[p].cap;
      const box0 = ctx ? at(foot, this.relBox(`t|${text}|${full}`, () => trayBubbleBox(ctx, 0, 0, text, full))) : { x: foot.x - 50, y: foot.y - 34, w: 100, h: 34 };
      let box = box0;
      if (!offScreen(box0)) {
        box = fit(`t|${p}`, box0) ?? fit(`t|${p}`, box0, loose) ?? hide(p, box0);
        keep(`t|${p}`, box0, box);
      }
      taken.push(box);
      this.bubbleBox.set(p, box);
    }
    for (const [b, el] of this.boardEls) this.placeEl(el, this.boardBox.get(b));
    for (const [p, el] of this.bubbleEls) this.placeEl(el, this.bubbleBox.get(p));
  }

  /**
   * OG-R43 b (5W, W15 as Lagos): a pin, board or tray bubble off the screen gets a round sign at the
   * edge with its icon, pointing the way; tapping it does what tapping the thing does. Its 48 px tap
   * square (44, then 40, only when no 48 fits) stays on the map, clear of the top row, the bottom
   * buttons, every sign and drawn pin, and every other arrow.
   */
  private drawArrows(g: CanvasRenderingContext2D): void {
    const vw = this.view.w;
    const vh = this.view.h;
    const top = this.view.top;
    const off = (b: Box): boolean => {
      const cx = b.x + b.w / 2;
      const cy = b.y + b.h / 2;
      if (!(cx < 0 || cx > vw || cy < 0 || cy > vh)) return false;
      const seen = Math.max(0, Math.min(b.x + b.w, vw) - Math.max(b.x, 0)) * Math.max(0, Math.min(b.y + b.h, vh) - Math.max(b.y, 0));
      return seen < (b.w * b.h) / 4;
    };
    const onView = (b: Box): boolean => b.x + b.w > 0 && b.y + b.h > 0 && b.x < vw && b.y < vh;
    const want: { icon: EdgeIcon; at: Pt; go: () => void; label: string }[] = [];
    for (const p of this.pins) {
      const b = this.pinBox(p.spot, p.word);
      if (off(b)) want.push({ icon: SPOT_ICON[p.spot], at: { x: b.x + b.w / 2, y: b.y + b.h / 2 }, go: () => (p.spot === 'badRoad' ? this.openBadRoad() : this.openCard(p.spot)), label: OGUN_SPOT_WORDS[p.spot] });
    }
    for (const [b, box] of this.boardBox) if (off(box) && !this.roomless.has(b)) want.push({ icon: OGUN_PRICES[b].bucket, at: { x: box.x + box.w / 2, y: box.y + box.h / 2 }, go: () => this.goPay(b), label: OGUN_CITY_WORDS.board[b] });
    for (const [p, box] of this.bubbleBox) if (off(box) && !this.roomless.has(p)) want.push({ icon: 'naira', at: { x: box.x + box.w / 2, y: box.y + box.h / 2 }, go: () => this.walkTo(OGUN_DOORS[p]), label: OGUN_CITY_WORDS.placeName[p] });
    const avoid: Box[] = [...this.covers, ...(this.hintWant ? [this.hintWant] : []), ...[...this.boardBox.values(), ...this.bubbleBox.values()].filter(onView), ...this.pins.map((p) => this.pinBox(p.spot, p.word)).filter(onView)];
    this.arrowBox = [];
    while (this.arrowEls.length < want.length) {
      const el = button('', 'city-sign city-arrow', () => undefined, { 'aria-hidden': 'true', tabindex: '-1' });
      this.arrowEls.push(el);
      this.signLayer.append(el);
    }
    const inset = Math.max(EDGE_ARROW.r + 2, Math.min(EDGE_ARROW.inset, (vh - top) / 2));
    this.arrowEls.forEach((el, i) => {
      const a = want[i];
      el.hidden = !a;
      if (!a) return;
      const base = edgeArrowPlace(a.at.x, a.at.y, vw, vh, top, inset);
      const spot = base ? this.arrowSpot(base, avoid, inset) : null;
      if (!spot) {
        el.hidden = true;
        return;
      }
      const r = spot.tap / 2;
      avoid.push({ x: spot.x - r, y: spot.y - r, w: r * 2, h: r * 2 });
      drawEdgeArrow(g, spot.x, spot.y, Math.atan2(a.at.y - spot.y, a.at.x - spot.x), a.icon);
      this.placeEl(el, { x: spot.x - r, y: spot.y - r, w: r * 2, h: r * 2 });
      el.dataset['for'] = a.label;
      el.onclick = (e) => {
        if (this.hooks.ignoreTap(e) || this.busy()) return;
        a.go();
      };
      this.arrowBox.push({ icon: String(a.icon), x: spot.x, y: spot.y, tap: spot.tap, for: a.label });
    });
  }

  /** The nearest clear place for an arrow on the edge band (then bands nearer the edge), 48 px tap first. */
  private arrowSpot(base: Pt, avoid: readonly Box[], inset: number): { x: number; y: number; tap: number } | null {
    const vw = this.view.w;
    const vh = this.view.h;
    const top = this.view.top;
    for (const tap of [48, 44, 40, 36]) {
      const r = tap / 2 + 0.5;
      const ok = (x: number, y: number): boolean => x - r >= 0 && y - r >= 0 && x + r <= vw && y + r <= vh && !avoid.some((o) => x + r > o.x && o.x + o.w > x - r && y + r > o.y && o.y + o.h > y - r);
      const b0 = { x: Math.round(base.x), y: Math.round(base.y) };
      if (ok(b0.x, b0.y)) return { ...b0, tap };
      let pick: Pt | null = null;
      let best = Infinity;
      for (let ins = Math.max(Math.ceil(r), Math.round(inset)); ins >= Math.ceil(r); ins -= 6) {
        const x0 = ins;
        const x1 = Math.max(x0, Math.round(vw) - ins);
        const y0 = Math.round(top) + ins;
        const y1 = Math.max(y0, Math.round(vh) - ins);
        const tryAt = (x: number, y: number): void => {
          const d = (x - b0.x) ** 2 + (y - b0.y) ** 2;
          if (d < best && ok(x, y)) {
            best = d;
            pick = { x, y };
          }
        };
        for (let x = x0; x <= x1; x += 4) {
          tryAt(x, y0);
          tryAt(x, y1);
        }
        for (let y = y0; y <= y1; y += 4) {
          tryAt(x0, y);
          tryAt(x1, y);
        }
        if (pick) return { ...(pick as Pt), tap };
      }
      // Anywhere clear on the map, nearest its own spot (also between the top rows and beside the bottom buttons).
      for (let y = Math.ceil(r); y <= vh - r; y += 6)
        for (let x = Math.ceil(r); x <= vw - r; x += 6) {
          const d = (x - b0.x) ** 2 + (y - b0.y) ** 2;
          if (d < best && ok(x, y)) {
            best = d;
            pick = { x, y };
          }
        }
      if (pick) return { ...(pick as Pt), tap };
    }
    return null;
  }

  /** A board's or bubble's box round its foot (0, 0), measured once per words. */
  private relBox(key: string, make: () => Box): Box {
    let b = this.signRel.get(key);
    if (!b) {
      b = make();
      this.signRel.set(key, b);
    }
    return b;
  }
  /**
   * A board or bubble painted once at the screen's pixel size and copied each frame (a slow phone
   * keeps its frame rate while the hero walks). `paint` draws it with its foot at (0, 0).
   */
  private sprite(g: CanvasRenderingContext2D, key: string, rel: Box, foot: Pt, dpr: number, paint: (c: CanvasRenderingContext2D) => void): void {
    const k = `${key}|${dpr}`;
    let img = this.sprites.get(k);
    if (!img) {
      if (this.sprites.size > 48) this.sprites.clear();
      img = document.createElement('canvas');
      img.width = Math.ceil((rel.w + 16) * dpr);
      img.height = Math.ceil((rel.h + 16) * dpr);
      const c = img.getContext('2d');
      if (c) {
        c.setTransform(dpr, 0, 0, dpr, (8 - rel.x) * dpr, (8 - rel.y) * dpr);
        paint(c);
      }
      this.sprites.set(k, img);
    }
    g.drawImage(img, foot.x + rel.x - 8, foot.y + rel.y - 8, img.width / dpr, img.height / dpr);
  }
  private readonly signRel = new Map<string, Box>();
  /** Where each sign last stood, from its own place (so a fitted sign stays put while the camera slides). */
  private readonly signAt = new Map<string, { dx: number; dy: number }>();
  /** Boards on their short stick now (W15). */
  private readonly boardShort = new Set<OgunBoard>();
  private arrowEls: HTMLButtonElement[] = [];
  /** Signs with no room on this tiny screen (hidden, no arrow: their place is on the screen). */
  private readonly roomless = new Set<string>();
  private arrowBox: { icon: string; x: number; y: number; tap: number; for: string }[] = [];
  /** Screen boxes signs and arrows keep clear of: the heading, chips and top buttons, the bottom buttons. */
  private covers: Box[] = [];
  private readonly sprites = new Map<string, HTMLCanvasElement>();

  private placeEl(el: HTMLElement, b: Box | undefined): void {
    if (!b) return;
    const hide = b.x + b.w < 0 || b.y + b.h < 0 || b.x > this.view.w || b.y > this.view.h;
    el.hidden = hide;
    const t = `translate(${Math.round(b.x)}px, ${Math.round(b.y)}px)`;
    if (el.style.transform !== t) el.style.transform = t;
    el.style.width = `${Math.round(b.w)}px`;
    el.style.height = `${Math.round(b.h)}px`;
  }
  private boardDone(b: OgunBoard): boolean {
    return (this.pay?.board === b && this.pay.done && this.pay.landed >= this.pay.pieces) || this.building?.board === b;
  }

  // ---------- Walking ----------

  private busy(): boolean {
    return this.closed || this.open !== null || this.pay !== null || this.building !== null;
  }

  private walkTo(m: Pt, ring = false): void {
    const to = ogunNearest(m);
    this.path = ogunPath(this.hero, to);
    this.arrived = false;
    this.stand = 0;
    if (ring) this.ring = { x: to.x, y: to.y, t: 0 };
    this.requestDraw();
  }

  private goPay(b: OgunBoard): void {
    this.walkTo(OGUN_MATS[b]);
    if (this.path.length === 0) {
      this.arrived = false;
      this.hero.moving = false;
    }
  }

  private stopWalking(): void {
    this.path = [];
    this.hero.moving = false;
    this.keys.clear();
    this.hold = null;
  }

  private moveHero(dt: number): void {
    // Arrow keys: a step target in the held direction, again each frame.
    if (this.keys.size && !this.busy()) {
      let dx = 0;
      let dy = 0;
      if (this.keys.has('ArrowLeft')) dx -= 1;
      if (this.keys.has('ArrowRight')) dx += 1;
      if (this.keys.has('ArrowUp')) dy -= 1;
      if (this.keys.has('ArrowDown')) dy += 1;
      if (dx || dy) {
        const step = WALKER.speed * dt;
        const n = Math.hypot(dx, dy);
        const to = { x: this.hero.x + (dx / n) * step, y: this.hero.y + (dy / n) * step };
        const ok = ogunWalkable(to) ? to : ogunWalkable({ x: to.x, y: this.hero.y }) ? { x: to.x, y: this.hero.y } : ogunWalkable({ x: this.hero.x, y: to.y }) ? { x: this.hero.x, y: to.y } : null;
        if (ok) this.stepTo(ok, Math.hypot(ok.x - this.hero.x, ok.y - this.hero.y));
        this.path = [];
        this.arrived = false;
        this.stand = 0;
        this.hero.moving = ok !== null;
        return;
      }
    }
    if (this.path.length === 0) {
      if (this.hero.moving) {
        this.hero.moving = false;
        this.needDraw = true;
      }
      return;
    }
    let left = WALKER.speed * dt;
    while (left > 0 && this.path.length) {
      const p = this.path[0]!;
      const d = Math.hypot(p.x - this.hero.x, p.y - this.hero.y);
      if (d <= left) {
        this.stepTo(p, d);
        left -= d;
        this.path.shift();
      } else {
        this.stepTo({ x: this.hero.x + ((p.x - this.hero.x) / d) * left, y: this.hero.y + ((p.y - this.hero.y) / d) * left }, left);
        left = 0;
      }
    }
    this.hero.moving = this.path.length > 0;
    if (!this.hero.moving) {
      this.arrived = true;
      this.stand = 0;
    }
  }
  private stepTo(p: Pt, d: number): void {
    this.hero.dir = walkDir(p.x - this.hero.x, p.y - this.hero.y, this.hero.dir);
    this.hero.x = p.x;
    this.hero.y = p.y;
    this.hero.phase = (this.hero.phase + d / WALKER.cycle) % 1;
    this.needDraw = true;
  }

  /** Standing still on a mat pays; at a tax place's front, collects (W2, W4). */
  private onStand(dt: number): void {
    if (this.hero.moving || this.busy()) return;
    this.stand += dt;
    const gentle = this.hooks.gentle();
    const onMat = this.boards().find((b) => Math.abs(this.hero.x - OGUN_MATS[b].x) <= MAT.w / 2 && Math.abs(this.hero.y - OGUN_MATS[b].y) <= MAT.h / 2);
    if (onMat && this.arrived && (gentle || this.stand >= PAY.standWait)) {
      this.arrived = false;
      this.startPay(onMat);
      return;
    }
    if (!this.arrived || this.collecting) return;
    const reach = COLLECT_REACH * (gentle ? 2 : 1);
    const p = this.trays().find((q) => Math.hypot(this.hero.x - OGUN_DOORS[q].x, this.hero.y - OGUN_DOORS[q].y) <= reach);
    if (p) {
      this.arrived = false;
      this.startCollect(p);
    }
  }

  // ---------- Paying, building, collecting ----------

  private startPay(b: OgunBoard): void {
    const before = this.st;
    const r = payOgunBoard(this.st, this.wallet, b);
    if (!r) {
      this.wobble = { board: b, t: 0 };
      this.hooks.sound('notEnough');
      this.showNotEnough(b);
      return;
    }
    const bucket = OGUN_PRICES[b].bucket;
    const units = boardUnits(b, r.amount);
    this.save(r.city, true, r.wallet);
    this.pay = { board: b, bucket, amount: r.amount, leftAfter: r.left, done: r.done, t: 0, dur: payTime(units), pieces: flyingCount(units), landed: 0, before };
    this.say.textContent = r.done ? '' : WORDS.city.partPaid(priceText(bucket, r.amount), priceText(bucket, r.left));
  }

  private stepPay(dt: number): void {
    const p = this.pay;
    if (!p) return;
    p.t += dt;
    const spread = Math.max(0.01, p.dur - PAY.flight);
    const landed = Math.min(p.pieces, Math.floor(Math.max(0, p.t - PAY.flight) / (spread / Math.max(1, p.pieces - 1)) + (p.t >= PAY.flight ? 1 : 0)));
    if (landed > p.landed) {
      p.landed = landed;
      this.hooks.sound(BUCKET_SOUND[p.bucket]);
      this.fillChips();
    }
    this.needDraw = true;
    if (p.t < p.dur) return;
    this.pay = null;
    if (p.done) {
      this.building = { board: p.board, t: 0, before: p.before };
      this.hooks.sound('built');
    } else {
      this.addLine(WORDS.city.partPaid(priceText(p.bucket, p.amount), priceText(p.bucket, p.leftAfter)));
      this.refresh();
    }
  }

  private stepBuild(dt: number): void {
    const b = this.building;
    if (!b) return;
    b.t += this.hooks.still() ? BUILD_TIME : dt;
    this.needDraw = true;
    if (b.t < BUILD_TIME) return;
    this.building = null;
    this.addLine(OGUN_CITY_WORDS.built[b.board]);
    this.refresh();
    if (ogunBoomDue(this.st)) this.openBoom();
  }

  private startCollect(p: OgunPlaceId): void {
    const r = collectOgunTray(this.st, this.wallet, p);
    if (!r) return;
    this.save(r.city, true, r.wallet);
    this.collecting = { place: p, amount: r.amount, t: 0, pieces: flyingCount(r.amount / 100) };
    const name = OGUN_CITY_WORDS.placeName[p];
    this.addLine(WORDS.city.collectLine(formatMoney(r.amount), name));
    this.say.textContent = WORDS.city.collectSpoken(spokenMoney(r.amount), name);
    this.hooks.sound('collect');
    if (!this.st.hints.includes('taxOgun')) {
      this.save(withOgunHint(this.st, 'taxOgun'), true);
      this.setHint(OGUN_CITY_WORDS.hintTax, TAX_HINT);
    }
    this.makeSigns();
  }

  private stepCollect(dt: number): void {
    const c = this.collecting;
    if (!c) return;
    c.t += dt;
    this.needDraw = true;
    this.fillChips();
    if (c.t < payTime(c.amount / 100)) return;
    this.collecting = null;
    this.refresh();
    if (ogunBoomDue(this.st) && !this.busy()) this.openBoom();
  }

  /** Ends every moving thing at once (closing the screen): what was paid is already saved. */
  private finishAnims(): void {
    this.pay = null;
    this.building = null;
    this.collecting = null;
  }

  /** The saved city changed: counters, pins, boards and the painted city follow. */
  refresh(): void {
    this.fillMeter();
    this.fillChips();
    this.makePins();
    this.makeSigns();
    this.requestDraw();
  }

  // ---------- Lines, hints, cards ----------

  private addLine(text: string, head?: string): void {
    this.lines.push(head ? { text, t: 0, head } : { text, t: 0 });
    this.showLine();
    this.say.textContent = head ? `${head} ${text}` : text;
  }
  private showLine(): void {
    const l = this.lines[0];
    this.banner.hidden = !l;
    if (l && this.banner.textContent !== `${l.head ?? ''}${l.text}`) this.banner.replaceChildren(...(l.head ? [h('p', { class: 'city-mission-head' }, h('b', {}, l.head))] : []), h('p', {}, l.text));
  }
  private setHint(text: string | null, secs = 4): void {
    this.hintEl.hidden = !text;
    this.hintEl.textContent = text ?? '';
    this.hintUntil = this.time + secs;
    this.placeHint();
  }
  /**
   * Where the hint may go, best first (QA-O2, QA-O2-4, polish round): under the whole top row
   * (heading, chips, buttons), even where the map's own top is held at half the screen; else just
   * above the bottom buttons; else over the heading (words only). Never over a button or the chips.
   * Boards keep away from the first such spot when they can (placeSigns); fitHint then shows the
   * hint on the first spot that covers no board or bubble either, or hides it until one is clear.
   */
  private placeHint(): void {
    const r = this.el.getBoundingClientRect();
    const rel = (b: DOMRect): Box => ({ x: b.left - r.left, y: b.top - r.top, w: b.width, h: b.height });
    const under = Math.max(this.view.top, ...[...this.top.querySelectorAll<HTMLElement>('.city-head, .city-chips, button')].map((e) => e.getBoundingClientRect().bottom - r.top));
    this.banner.style.top = `${Math.round(under + (this.hintEl.hidden ? 4 : 40))}px`;
    const before = this.hintWant;
    this.hintSpots = [];
    this.hintWant = null;
    if (!this.hintEl.hidden) {
      const w = this.hintEl.offsetWidth;
      const hh = this.hintEl.offsetHeight;
      const hard = [...this.el.querySelectorAll<HTMLElement>('.city-top button, .city-bottom button, .city-chip')].map((e) => rel(e.getBoundingClientRect())).filter((b) => b.w > 0);
      const lows = [...this.el.querySelectorAll<HTMLElement>('.city-bottom button')].map((e) => e.getBoundingClientRect()).filter((b) => b.width > 0).map((b) => b.top - r.top);
      const x = Math.round((r.width - w) / 2);
      const ys = [under + 4, Math.min(r.height, ...lows) - hh - 4, rel(this.head.getBoundingClientRect()).y].map(Math.round);
      this.hintSpots = ys.map((y) => ({ x, y, w, h: hh })).filter((b) => b.y >= 0 && b.y + b.h <= r.height && !hard.some((q) => hits(q, b)));
      this.hintWant = this.hintSpots[0] ?? null;
    }
    this.fitHint();
    const b = this.hintWant;
    if (before?.x !== b?.x || before?.y !== b?.y || before?.w !== b?.w || before?.h !== b?.h) this.requestDraw();
  }
  /** Shows the hint on the first spot that covers no board or bubble; with none clear, hidden for now. */
  private fitHint(): void {
    if (this.hintEl.hidden) return;
    const signs: Box[] = [...this.boardBox.values(), ...this.bubbleBox.values(), ...this.arrowBox.map((a) => ({ x: a.x - a.tap / 2, y: a.y - a.tap / 2, w: a.tap, h: a.tap }))];
    const spot = this.hintSpots.find((b) => !signs.some((q) => hits(q, b))) ?? null;
    const vis = spot ? '' : 'hidden';
    if (this.hintEl.style.visibility !== vis) this.hintEl.style.visibility = vis;
    if (spot && this.hintEl.style.top !== `${spot.y}px`) this.hintEl.style.top = `${spot.y}px`;
  }
  private hintSpots: Box[] = [];
  /** The hint's best spot while it shows: boards keep clear of it when they can (placeSigns). */
  private hintWant: Box | null = null;

  private showCard(id: string, name: string, body: HTMLElement[], small: HTMLElement[]): HTMLElement {
    const card = h('div', { class: 'card narrow city-problem', role: 'dialog', 'aria-label': name, 'data-spot': id }, ...body, h('div', { class: 'minor-row' }, ...small));
    this.cardSpot.replaceChildren(card);
    this.cardSpot.hidden = false;
    this.open = id;
    this.stopWalking();
    (card.querySelector<HTMLElement>('.go') ?? card.querySelector<HTMLElement>('button'))?.focus({ preventScroll: true });
    return card;
  }

  closeCard(): void {
    const was = this.open;
    this.open = null;
    this.cardSpot.hidden = true;
    this.cardSpot.replaceChildren();
    if (was) (this.pins.find((p) => p.spot === was)?.el ?? this.boardEls.get(was as OgunBoard))?.focus({ preventScroll: true });
    const then = this.onClose;
    this.onClose = null;
    then?.();
    this.requestDraw();
  }

  /** 6.2: a problem pin's card: what is wrong, what fixes it, and the challenge that helps. */
  openCard(spot: OgunFixId): void {
    const w = WORDS.city;
    if (spot === 'potholes' && !this.st.hints.includes('pin')) {
      this.save(withOgunHint(this.st, 'pin'), true);
      this.makePins();
      this.placePins();
    }
    const c = OGUN_CITY_WORDS.cards[spot];
    const back = button(w.back, 'minor', () => this.closeCard(), {}, 'back');
    const run = (big: boolean): HTMLButtonElement =>
      button(c.go, big ? 'go' : 'minor', (e) => {
        if (!this.hooks.ignoreTap(e)) this.hooks.run(spot, e);
      });
    const walk = (big: boolean): HTMLButtonElement =>
      button(w.walkThere, big ? 'go' : 'minor', (e) => {
        if (this.hooks.ignoreTap(e)) return;
        this.closeCard();
        this.goPay(spot);
      });
    const see = button(w.seeStop, 'minor', (e) => {
      if (!this.hooks.ignoreTap(e)) this.hooks.seeStop?.(spot);
    }, {}, 'pin');
    const bucket = OGUN_PRICES[spot].bucket;
    const some = (bucket === 'naira' ? this.wallet.kobo : bucket === 'power' ? this.wallet.power : this.wallet.tech) > 0;
    const shown = ogunBoards(this.st).includes(spot);
    const big = some && shown;
    this.showCard(spot, OGUN_SPOT_WORDS[spot], [h('h2', {}, c.line1), h('p', {}, c.line2), h('p', {}, w.need(priceText(bucket, leftOn(this.st, spot)))), big ? walk(true) : run(true)], big ? [run(false), see, back] : [see, back]);
  }

  /**
   * OG-R37: the Bad road card. Before Sagamu is cleared: "Clear Ota, Abeokuta and Sagamu to reach
   * Pothole Hall." with a big "Run {next street}"; after: "Go to Pothole Hall." with its big button.
   */
  openBadRoad(): void {
    const w = WORDS.city;
    const o = OGUN_CITY_WORDS.badRoad;
    const n = Math.max(1, Math.min(4, this.hooks.nextStreet ?? 1));
    const go = button(n < 4 ? o.run(n) : o.hall, 'go', (e) => {
      if (!this.hooks.ignoreTap(e)) this.hooks.play?.(n, e);
    });
    const see = button(w.seeStop, 'minor', (e) => {
      if (!this.hooks.ignoreTap(e)) this.hooks.seeStop?.('badRoad');
    }, {}, 'pin');
    const back = button(w.back, 'minor', () => this.closeCard(), {}, 'back');
    // The big button and the small ones share a row (wrapping when narrow), so the card fits 640 x 200 and 320 x 240.
    const row = h('div', {}, go, see, back);
    row.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;align-items:stretch;margin-top:6px';
    go.style.cssText = 'flex:1 1 9em;width:auto;margin:0';
    const card = this.showCard('badRoad', OGUN_SPOT_WORDS.badRoad, [h('h2', {}, o.line1), h('p', {}, n < 4 ? o.clear : o.toHall), row], []);
    card.querySelector('.minor-row')?.remove();
    // A short screen (320 x 240, 640 x 200, with a notch's safe edges too): smaller words and gaps,
    // buttons still 44 px, so every line and button shows with no scroll.
    if (window.innerHeight <= 320) {
      card.style.padding = '6px 10px';
      const [h2, p] = [card.querySelector<HTMLElement>('h2'), card.querySelector<HTMLElement>('p')];
      if (h2) h2.style.cssText = 'font-size:1rem;margin:0 0 2px;line-height:1.2';
      if (p) p.style.cssText = 'font-size:0.85rem;margin:2px 0;line-height:1.2';
      row.style.marginTop = '4px';
      for (const b of [go, see, back]) {
        b.style.minHeight = '44px';
        b.style.padding = '4px 10px';
      }
      go.style.fontSize = '1rem';
      go.style.flexBasis = '7em';
      // Narrow too (320 x 240): "See the stop" goes (the city's Challenge road button is the same way there).
      if (window.innerWidth < 400) see.remove();
    }
  }

  /** W8: nothing in that bucket. */
  private showNotEnough(b: OgunBoard): void {
    const w = WORDS.city;
    const bucket = OGUN_PRICES[b].bucket;
    const back = button(w.back, 'minor', () => this.closeCard(), {}, 'back');
    const spot: OgunFixId = bucket === 'naira' ? 'potholes' : bucket === 'power' ? 'dryTaps' : 'slowInternet';
    const go = button(OGUN_CITY_WORDS.cards[spot].go, 'go', (e) => {
      if (!this.hooks.ignoreTap(e)) this.hooks.run(spot, e);
    });
    const card = this.showCard(b, OGUN_CITY_WORDS.board[b], [h('p', { class: 'city-need' }, w.need(priceText(bucket, leftOn(this.st, b)))), h('p', {}, bucket === 'naira' ? OGUN_CITY_WORDS.earnRun : OGUN_CITY_WORDS.earnLane(bucket)), go], [back]);
    card.classList.add('city-short');
  }

  /** 6.4, d8: "Ogun is booming!"; saved as seen at once; the kola market's board comes. */
  private openBoom(): void {
    const w = OGUN_CITY_WORDS.boom;
    const mark = ogunBoomDue(this.st);
    if (!mark) return;
    const cog = mark === FIRST_BOOM && !this.hooks.cogOn();
    this.save({ ...this.st, boomSeen: Math.max(this.st.boomSeen, mark) }, true);
    this.hooks.sound('boom');
    const go = button(w.go, 'go', () => this.closeCard());
    this.showCard('boom', w.heading, [h('h2', {}, w.heading), h('p', {}, w.body), ...(cog ? [h('p', { class: 'city-fixed' }, w.cog)] : []), go], []);
    this.say.textContent = [w.heading, w.body, ...(cog ? [w.cog] : [])].join(' ');
    this.onClose = () => this.refresh();
  }

  // ---------- Input ----------

  private readonly onDown = (e: PointerEvent): void => {
    if (this.closed || this.open) return;
    if ((e.target as HTMLElement).closest('button')) return;
    this.fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.fingers.size === 2) {
      const [a, b] = [...this.fingers.values()];
      this.pinch = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      this.hold = null;
      return;
    }
    this.hold = { id: e.pointerId, at: performance.now(), from: { x: e.clientX, y: e.clientY }, on: false };
  };
  private readonly onMove = (e: PointerEvent): void => {
    if (!this.fingers.has(e.pointerId)) return;
    this.fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pinch !== null && this.fingers.size === 2) {
      const [a, b] = [...this.fingers.values()];
      const r = Math.hypot(a!.x - b!.x, a!.y - b!.y) / Math.max(1, this.pinch);
      if (r >= 1.2) this.zoom('near');
      else if (r <= 1 / 1.2) this.zoom('far');
      return;
    }
    const hd = this.hold;
    if (!hd || hd.id !== e.pointerId || this.busy()) return;
    if (!hd.on && (Math.hypot(e.clientX - hd.from.x, e.clientY - hd.from.y) > HOLD_PX || performance.now() - hd.at > HOLD_MS)) hd.on = true;
    if (hd.on) this.walkTo(this.toMap(this.local(e)));
  };
  private readonly onUp = (e: PointerEvent): void => {
    if (!this.fingers.delete(e.pointerId)) return;
    if (this.fingers.size < 2) this.pinch = null;
    const hd = this.hold;
    this.hold = null;
    if (!hd || hd.id !== e.pointerId || this.busy() || e.type === 'pointercancel') return;
    if (this.hooks.ignoreTap(e)) return;
    if (!hd.on) this.walkTo(this.toMap(this.local(e)), true);
  };
  private local(e: { clientX: number; clientY: number }): Pt {
    const r = this.el.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  private readonly onKey = (e: KeyboardEvent): void => {
    if (this.closed) return;
    if (e.key === 'Escape' && this.open) {
      e.preventDefault();
      e.stopPropagation();
      if (this.open !== 'boom') this.closeCard();
      return;
    }
    if (!e.key.startsWith('Arrow') || this.open) return;
    const t = e.target as HTMLElement | null;
    if (t && t.closest('button') && !t.closest('.city-stage')) return;
    e.preventDefault();
    this.keys.add(e.key);
    this.requestDraw();
  };
  private readonly onKeyUp = (e: KeyboardEvent): void => {
    if (this.keys.delete(e.key) && this.keys.size === 0) {
      this.hero.moving = false;
      this.arrived = true;
      this.stand = 0;
    }
  };
  private readonly onBlur = (): void => {
    this.keys.clear();
    this.fingers.clear();
    this.hold = null;
  };
  private readonly onResize = (): void => {
    // The meter first: its size on a small screen moves the top row, which the view and the covers follow.
    this.meterKey = '';
    this.fillMeter();
    this.measure();
    this.placeHint();
    this.cam = this.clamp(this.cam);
    // The Bad road card takes its short-screen size when it opens: made again for the new size.
    if (this.open === 'badRoad') this.openBadRoad();
    this.requestDraw();
  };

  // ---------- The loop ----------

  private requestDraw(): void {
    this.needDraw = true;
    this.wake();
  }
  private wake(): void {
    if (this.closed || this.raf) return;
    clearTimeout(this.idleTimer);
    this.idleTimer = 0;
    this.raf = requestAnimationFrame(this.frame);
  }
  /** Something moves: walking, keys, money, a build, a line, the camera easing. */
  private active(): boolean {
    return this.hero.moving || this.path.length > 0 || this.keys.size > 0 || this.hold?.on === true || this.pay !== null || this.building !== null || this.collecting !== null || this.ring !== null || this.wobble !== null || this.lines.length > 0 || this.camMoving || this.folk?.baking === true;
  }
  private camMoving = false;

  private readonly frame = (now: number): void => {
    this.raf = 0;
    if (this.closed) return;
    const dt = Math.min(0.1, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    if (document.hidden) return this.idle();
    this.update(dt);
    if (this.needDraw) this.draw();
    if (this.active()) this.wake();
    else this.idle();
  };

  /** Standing still: trays fill on a slow timer; small redraws at most twice a second while a place serves. */
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
        if (!this.hooks.still() && this.st.built.some((p) => !this.full(p))) this.needDraw = true;
        if (this.needDraw) this.draw();
      }
      if (this.active()) this.wake();
      else this.idle();
    }, IDLE_MS);
  }

  private full(p: OgunPlaceId): boolean {
    return (this.st.trays[p] ?? 0) >= OGUN_TAX[p].cap;
  }

  private update(dt: number): void {
    this.time += dt;
    // Play time: Lagos's trays and Ogun's (StateCity, through CityLife's `also`) fill (OG-R8).
    this.hooks.life.tick(dt);
    if (this.syncTrays()) {
      this.makeSigns();
      this.needDraw = true;
    }
    if (!this.busy()) this.moveHero(dt);
    this.stepFolk(dt);
    this.onStand(dt);
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
      this.lines[0]!.t += dt;
      if (this.lines[0]!.t >= LINE_TIME) {
        this.lines.shift();
        this.showLine();
      }
    }
    // A hint waiting hidden for a clear spot (fitHint) keeps its time until it shows.
    if (!this.hintEl.hidden && this.hintEl.style.visibility === 'hidden') this.hintUntil += dt;
    if (!this.hintEl.hidden && this.time >= this.hintUntil) this.setHint(null);
    // The camera follows the hero (eased; at once with reduced motion).
    const want = this.centreOn(this.hero, this.cam.zoom);
    const k = this.hooks.still() ? 1 : 1 - Math.exp(-dt / 0.15);
    const nx = this.cam.x + (want.x - this.cam.x) * k;
    const ny = this.cam.y + (want.y - this.cam.y) * k;
    this.camMoving = Math.abs(nx - this.cam.x) > 0.3 || Math.abs(ny - this.cam.y) > 0.3;
    if (this.camMoving) {
      this.cam = { ...this.cam, x: nx, y: ny };
      this.needDraw = true;
    } else if (this.cam.x !== want.x || this.cam.y !== want.y) {
      this.cam = want;
      this.needDraw = true;
    }
  }

  /** The bright areas as a set (for the walkers' choice of block), made again only when the city changes. */
  private bright(): ReadonlySet<string> {
    const st = this.shown;
    const key = `${st.fixed.join(',')}|${st.built.join(',')}|${st.boom}|${st.boomSeen}`;
    if (key !== this.brightKey) {
      this.brightKey = key;
      this.brightSet = new Set(ogunBright(st, this.hallWon));
    }
    return this.brightSet;
  }

  /** OG-R43 a: the walkers, once the people's kit has arrived (the city shows without them until then). */
  private stepFolk(dt: number): void {
    if (this.folkOff) return;
    const kit = peopleKit();
    if (!kit) {
      void loadPeople().catch(() => undefined);
      return;
    }
    try {
      this.folk ??= new OgunCityFolk(kit, [...Object.values(OGUN_MATS), ...Object.values(OGUN_DOORS), ...OGUN_SPOT_IDS.map((s) => OGUN_SPOTS[s].pin)]);
      // They walk only while the map draws every frame (a still city draws nothing).
      this.folk.step(dt, this.shown, this.bright(), this.hero, dt <= 0.1 && !this.hooks.still() && this.active());
      if (this.folk.baking) this.needDraw = true;
    } catch (err) {
      this.folkFail(err);
    }
  }

  private folkDraw(draw: () => void): void {
    if (this.folkOff) return;
    try {
      draw();
    } catch (err) {
      this.folkFail(err);
    }
  }

  /** People never stop the city: an error in their code switches them off for the visit (as Lagos's folkFail). */
  private folkFail(err: unknown): void {
    this.folkOff = true;
    this.folk = null;
    this.needDraw = true;
    console.warn('People switched off:', err);
  }

  /** The painted still city for these looks at this zoom (made again only when a look or the size changes). */
  private picture(dpr: number): { img: HTMLCanvasElement; scale: number } | null {
    const want = Math.min(this.scale(this.cam.zoom) * dpr, 2048 / CITY_MAP.w);
    const st = this.shown;
    const looks = ogunLooks(st, this.wallet, this.hallWon);
    const bright = ogunBright(st, this.hallWon);
    const built = st.built;
    const paint = `${Object.values(looks).join(',')}|${bright.join(',')}|${built.join(',')}|${boomed(st)}`;
    const key = `${paint}|${want.toFixed(4)}`;
    const have = painted.get(key);
    if (have) return have;
    for (const k of painted.keys()) if (!k.startsWith(`${paint}|`)) painted.delete(k);
    const img = makeOgunCityCanvas(looks, want, 2048, { bright, built, boom: boomed(st) });
    if (!img) return null;
    const made = { img, scale: want };
    painted.set(key, made);
    return made;
  }

  private draw(): void {
    this.needDraw = false;
    const g = this.map.getContext('2d');
    if (!g) return;
    this.draws++;
    const moving = this.hero.moving || this.camMoving;
    const dpr = Math.min(window.devicePixelRatio || 1, moving ? MAP_DPR_MOVING : MAP_DPR);
    const cw = Math.round(this.view.w * dpr);
    const ch = Math.round(this.view.h * dpr);
    if (this.map.width !== cw || this.map.height !== ch) {
      this.map.width = cw;
      this.map.height = ch;
    }
    const s = this.scale(this.cam.zoom);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#c98a5c';
    g.fillRect(0, 0, cw, ch);
    const pic = this.picture(dpr);
    if (pic) g.drawImage(pic.img, Math.round(this.cam.x * dpr), Math.round(this.cam.y * dpr), (pic.img.width * s * dpr) / pic.scale, (pic.img.height * s * dpr) / pic.scale);
    // Map units: mats, places, the hero, the ring.
    g.setTransform(s * dpr, 0, 0, s * dpr, this.cam.x * dpr, this.cam.y * dpr);
    const still = this.hooks.still();
    for (const b of this.boards()) drawPayMat(g, OGUN_MATS[b].x, OGUN_MATS[b].y, this.pay?.board === b);
    if (this.ring) drawWalkRing(g, this.ring.x, this.ring.y, still ? 0 : this.ring.t);
    // Standing things, back to front: the tax places, the walkers (OG-R43 a), the hero.
    const items: { y: number; draw: () => void }[] = [];
    for (const p of OGUN_PLACE_LIST) {
      const building = this.building?.board === p ? this.building.t / BUILD_TIME : null;
      if (!this.shown.built.includes(p) && building === null) continue;
      const tax = OGUN_TAX[p];
      const tray = this.st.trays[p] ?? 0;
      items.push({
        y: OGUN_PLACES[p].y,
        draw: () =>
          DRAW_PLACE[p](g, OGUN_PLACES[p].x, OGUN_PLACES[p].y, {
            time: still ? 0 : this.time,
            sale: still ? 0.3 : (this.time / tax.every) % 1,
            served: Math.floor(tray / tax.each),
            stock: Math.min(1, 0.3 + tray / tax.cap),
            full: tray >= tax.cap,
            build: building ?? 1,
            still,
          }),
      });
    }
    const folk = this.folk;
    if (folk && !this.folkOff) {
      try {
        folk.ready(this.hooks.look(), s * Math.min(window.devicePixelRatio || 1, MAP_DPR));
        // Each walker's drawing is guarded too: an error switches people off, never the city.
        folk.items((y, draw) => items.push({ y, draw: () => this.folkDraw(draw) }), g, s, still);
      } catch (err) {
        this.folkFail(err);
      }
    }
    items.push({ y: this.hero.y + 0.5, draw: () => drawCityHero(g, this.hooks.look(), this.hero.x, this.hero.y, { dir: this.hero.dir, phase: this.hero.phase, moving: this.hero.moving, time: this.time, still, size: walkerSize(s) }) });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.draw();
    // Screen px: boards, bubbles, flying money.
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.placeSigns(g);
    this.placePins();
    for (const [b, box] of this.boardBox) {
      const done = this.boardDone(b);
      const left = boardUnits(b, leftOn(this.shown, b));
      const short = this.boardShort.has(b);
      const rel = this.relBox(`b|${b}|${left}|${done}|${short ? 's' : ''}`, () => priceBoardBox(g, 0, 0, boardOf(b), left, { done, short }));
      const foot = { x: box.x - rel.x, y: box.y - rel.y };
      const wob = this.wobble?.board === b && !still ? boardWobble(this.wobble.t) : 0;
      // While money flies the board counts down with it (drawn live); else its copy.
      const units = this.pay?.board === b ? boardUnits(b, Math.round(leftOn(this.pay.before, b) - (this.pay.amount * this.pay.landed) / this.pay.pieces)) : left;
      if (wob || units !== left) drawPriceBoard(g, foot.x, foot.y, boardOf(b), units, { done, wobble: wob, short });
      else this.sprite(g, `b|${b}|${left}|${done}|${short ? 's' : ''}`, rel, foot, dpr, (c) => drawPriceBoard(c, 0, 0, boardOf(b), left, { done, short }));
    }
    for (const [p, box] of this.bubbleBox) {
      const amount = this.st.trays[p] ?? 0;
      const text = WORDS.city.trayLabel(trayWords(amount));
      const full = amount >= OGUN_TAX[p].cap;
      const rel = this.relBox(`t|${text}|${full}`, () => trayBubbleBox(g, 0, 0, text, full));
      this.sprite(g, `t|${text}|${full}`, rel, { x: box.x - rel.x, y: box.y - rel.y }, dpr, (c) => drawTrayBubble(c, 0, 0, 'naira', text, full, 0));
    }
    this.drawArrows(g);
    this.fitHint();
    const hero = this.toScreen({ x: this.hero.x, y: this.hero.y - WALKER.h });
    const pay = this.pay;
    if (pay) {
      const box = this.boardBox.get(pay.board);
      const to = box ? { x: box.x + box.w / 2, y: box.y + box.h / 2 } : hero;
      const spread = Math.max(0.01, pay.dur - PAY.flight);
      for (let i = 0; i < pay.pieces; i++) {
        const k = (pay.t - (pay.pieces > 1 ? (spread * i) / (pay.pieces - 1) : 0)) / PAY.flight;
        if (k > 0 && k < 1) drawFlyingMoney(g, pay.bucket, hero.x, hero.y, to.x, to.y, k);
      }
    }
    const col = this.collecting;
    if (col) {
      const chip = this.chips.querySelector('.chip-naira')?.getBoundingClientRect();
      const r = this.el.getBoundingClientRect();
      const to = chip ? { x: chip.left - r.left + 14, y: chip.top - r.top + chip.height / 2 } : { x: 20, y: 20 };
      const from = this.toScreen({ x: OGUN_PLACES[col.place].x, y: OGUN_PLACES[col.place].y - 40 });
      const spread = Math.max(0.01, payTime(col.amount / 100) - PAY.flight);
      for (let i = 0; i < col.pieces; i++) {
        const k = (col.t - (col.pieces > 1 ? (spread * i) / (col.pieces - 1) : 0)) / PAY.flight;
        if (k > 0 && k < 1) drawFlyingMoney(g, 'naira', from.x, from.y, to.x, to.y, k);
      }
    }
    this.fillChips();
    this.fillMeter();
  }
}

/** The Ogun part's city maker (WorldPart.city). */
export function ogunCity(hooks: WorldCityHooks): WorldCity {
  return new OgunCityScreen(hooks);
}
