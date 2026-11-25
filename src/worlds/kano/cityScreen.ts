/**
 * K6b: Kano from above, Kano's home screen (docs/kano.md part 6 and 7; decisions 47, 71, 80;
 * city.md 5W, W2 to W8, W18, d5 to d9). Ogun's city (src/worlds/ogun/cityScreen.ts) on Kano's map:
 *
 * - The still city (art K6a's makeKanoCityCanvas) is painted once per look and zoom step and
 *   copied with one drawImage. On top: the pay mats, the tax places at work, the water queue once
 *   the taps flow, the walkers, the hero, the price boards, tray bubbles and flying money. Draw
 *   only when something moves; standing still, at most 2 small redraws a second while a tax
 *   place serves (none with reduced motion), and nothing at all when nothing moves.
 * - Tap the ground to walk there; hold and slide to keep walking; arrow keys walk; + and − zoom.
 * - Stand on a mat to pay from the one wallet (decision 80): part pay, Not enough, the build and
 *   its line (6.2). Walk to a tax place's front to collect its tray (6.3, W18 with Kano's names).
 *   The Booming meter (6.4) is in the heading; at 20, "Kano is booming!".
 * - Pins, boards and bubbles are plain buttons over the map, so keys and screen readers reach them.
 * The game passes in what it draws with (hooks.kit: KN-R10, this part imports only types).
 */
import type { FolkFrame, FolkLook } from '../../art/folk';
import type { BucketKind } from '../../art/city';
import type { EdgeIcon } from '../../art/payspot';
import type { WalkDir } from '../../art/walker';
import type { CityKit, WorldCity, WorldCityHooks } from '../ui';
import { KANO_CITY_CAST, KANO_MAP, KANO_PLACES, KANO_SPOTS, KANO_SPOT_WORDS, KANO_BLOCKS, drawKanoPin, drawKanoSpotIcon, kanoPinHitBox, makeKanoCityCanvas, type KanoPlaceId, type KanoSpotId } from './city';
import { KANO_PLACE_LOOK, drawDyePits, drawGrainMarket, drawLeatherStalls, drawPyramidPlace } from './cityPlaces';
import { KURMI_CAST, KURMI_TRADER_LOOKS } from './kurmi';
import { KOFAR_BEATERS, KOFAR_BUYER, KOFAR_DYERS, KOFAR_MATA_CAST } from './kofarMata';
import { DAWANAU_CAST, DAWANAU_DRIVER, DAWANAU_MEASURERS, DAWANAU_PORTERS } from './dawanau';
import { KANO_CITY_WORDS as KW } from './cityWords';
import { KANO_WORDS } from './words';
import {
  FIRST_BOOM,
  KANO_PLACE_LIST,
  KANO_PRICES,
  KANO_TAX,
  TRAY_MIN,
  boomed,
  collectKanoTray,
  inBucket,
  kanoBoards,
  kanoBoomDue,
  kanoBright,
  kanoLooks,
  leftOn,
  meterOf,
  payKanoBoard,
  readKanoCity,
  readWallet,
  withHint,
  writeKanoCity,
  type KanoBoard,
  type KanoCityState,
  type KanoFixId,
  type Wallet,
} from './cityRules';
import { KANO_HOME, kanoNearest, kanoPath, kanoWalkable, type Pt } from './walk';

type G = CanvasRenderingContext2D;
interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
type Cam = { zoom: 'far' | 'near'; x: number; y: number };
type PeopleKit = NonNullable<ReturnType<CityKit['people']>>;

/** Where each board's mat lies (map units, on walkable ground by its pin or place; a place's is its front). */
export const KANO_MATS: Readonly<Record<KanoBoard, Pt>> = {
  sandyRoad: { x: 740, y: 900 },
  lightsOut: { x: 1060, y: 580 },
  slowInternet: { x: 1250, y: 815 },
  leather: { x: KANO_PLACES.leather.x, y: KANO_PLACES.leather.y + 22 },
  dye: { x: KANO_PLACES.dye.x, y: KANO_PLACES.dye.y + 22 },
  grain: { x: KANO_PLACES.grain.x, y: KANO_PLACES.grain.y + 22 },
  pyramid: { x: KANO_PLACES.pyramid.x, y: KANO_PLACES.pyramid.y + 22 },
};

const EDGE = 40;
/** K7: the most a pin is nudged sideways from its spot to keep clear of the pin beside it (screen px). */
const PIN_SPREAD = 44;
const NEAR = 2;
const HOLD_PX = 8;
const HOLD_MS = 150;
const COLLECT_REACH = 48;
const BUILD_TIME = 1.5;
const LINE_TIME = 2.2;
const IDLE_MS = 500;
const MAP_DPR = 1.5;
const TAX_HINT = 6;
const BUCKET_SOUND: Record<BucketKind, string> = { naira: 'payChink', power: 'payBulb', tech: 'payChip' };
const DRAW_PLACE = { leather: drawLeatherStalls, dye: drawDyePits, grain: drawGrainMarket, pyramid: drawPyramidPlace } as const;
const SPOT_ICON: Readonly<Record<KanoSpotId, EdgeIcon>> = { sandyRoad: 'potholes', lightsOut: 'lightsOut', slowInternet: 'slowInternet', dryTaps: 'potholes' };

/** The queue at the water yard once it flows (part 7): adults and a teen by the cans, a child close by a parent (never carrying water). */
const QUEUE: readonly FolkLook[] = [KURMI_CAST[4]!, DAWANAU_CAST[5]!, KOFAR_MATA_CAST[3]!, KURMI_CAST[11]!, KURMI_CAST[10]!, KURMI_CAST[6]!];
const YARD = KANO_BLOCKS.find((b) => b.id === 'r0c3')!;
/** Everyone the city draws with the people kit: the walkers first (their looks are indexes), then the places' people and the queue. */
const PEOPLE: readonly FolkLook[] = [
  ...new Set([...KANO_CITY_CAST, ...Object.values(KURMI_TRADER_LOOKS), KOFAR_DYERS[0], KOFAR_BEATERS[0], KOFAR_BUYER, DAWANAU_MEASURERS[0], ...DAWANAU_PORTERS.slice(0, 2), DAWANAU_DRIVER, KURMI_CAST[4]!, DAWANAU_CAST[9]!, KOFAR_MATA_CAST[15]!, KURMI_CAST[6]!, ...QUEUE]),
].filter((l): l is FolkLook => l !== undefined);
const PEOPLE_AT: ReadonlyMap<FolkLook, number> = new Map(PEOPLE.map((l, i) => [l, i]));

/** Two boxes come closer than `gap` px. */
const near = (a: Box, b: Box, gap: number): boolean => a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;
const boardUnits = (b: KanoBoard, own: number): number => (KANO_PRICES[b].bucket === 'naira' ? own / 100 : own);
/** The tap area of a pin at screen (x, y), its word tag included (as src/game/cityCamera.ts pinTapBox). */
function pinTapBox(x: number, y: number, word: string): Box {
  const b = kanoPinHitBox(x, y);
  const w = Math.max(b.w, Math.max(40, word.length * 7.2 + 12) + 8);
  return { x: x - w / 2, y: b.y, w, h: b.h };
}

/**
 * K6c: a screen this short (or shorter) shows one Play button, for the next street or the hall,
 * beside the other bottom buttons, so the bottom block is two rows and the map keeps a clear strip.
 * Every street stays on the Challenge road. 568 x 320 keeps its row of Play buttons.
 */
export const KANO_SHORT_PX = 319;

/**
 * Kano's own page rules, put in the page once as the city first opens (they ride in this part,
 * never the first load's style sheet, kano.md 9.1): the streets' Play buttons share one row in
 * the bottom row (K3b to K5b), a little smaller on a narrow screen. KM1 to KM5: with Missions in
 * the row, "Challenge road" stays on one line (where five do not fit, the wheel moves into Settings, MS-R4).
 */
export const KANO_CITY_STYLE = `.city-buttons .go-pair{display:flex;gap:8px;width:100%}
.city-buttons .go-pair .go{flex:1 1 0;width:auto;min-width:0}
.city-buttons .go-three .go{padding:4px 6px}
@media (max-width:400px){.city-buttons .go-three .go{font-size:15px;line-height:1.1;min-height:48px}}
.city-buttons .go-four .go{padding:4px 3px}
@media (max-width:400px){.city-buttons .go-four .go{font-size:12px;padding:4px 1px}}
@media (max-width:400px){.city-buttons .go-three .go .ic,.city-buttons .go-four .go .ic{display:none}}
@media (min-width:401px){.kano-city .city-buttons:has(.ms-button) .two-line{max-width:none;white-space:nowrap}}
@media (max-height:${KANO_SHORT_PX}px){.kano-city .city-buttons .go-pair{display:contents}
.kano-city .city-buttons .go-pair .go:not(:last-child){display:none}
.kano-city .city-buttons .go,.kano-city .city-buttons .go-pair .go{flex:0 1 auto;width:auto;max-width:168px;min-width:0;min-height:44px;margin:0;padding:4px 10px;font-size:15px;line-height:1.1;white-space:normal}
.kano-city .city-buttons .go .ic{display:none}
.kano-city .city-buttons .two-line,.kano-city .city-buttons:has(.ms-button) .two-line{max-width:96px;padding-top:2px;padding-bottom:2px;line-height:1.1;white-space:normal}
.kano-city .city-top{row-gap:4px}
.kano-city .city-bottom{bottom:3px}}
@media (max-height:260px) and (min-width:600px){.kano-city .city-zoom{flex-direction:row}}`;

/** The painted still city, kept between visits (this page load only), and the last camera. */
const painted = new Map<string, { img: HTMLCanvasElement; scale: number }>();
let lastCam: Cam | null = null;

export class KanoCityScreen implements WorldCity {
  readonly el: HTMLElement;
  private readonly k: CityKit;
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
  /** The map's size, and the top and bottom rows' depth over it (Kano's bottom row is two deep: the Play buttons, then the rest). */
  private view = { w: 1, h: 1, top: 0, bot: 0 };
  cam: Cam;
  private st: KanoCityState;
  private trayKey = '';
  hero: { x: number; y: number; dir: WalkDir; phase: number; moving: boolean };
  private path: Pt[] = [];
  private ring: { x: number; y: number; t: number } | null = null;
  private stand = 0;
  private arrived = false;
  private pay: { board: KanoBoard; bucket: BucketKind; amount: number; leftAfter: number; done: boolean; t: number; dur: number; pieces: number; landed: number; before: KanoCityState } | null = null;
  private building: { board: KanoBoard; t: number; before: KanoCityState } | null = null;
  private collecting: { place: KanoPlaceId; amount: number; t: number; pieces: number } | null = null;
  private wobble: { board: KanoBoard; t: number } | null = null;
  private lines: { text: string; t: number; head?: string }[] = [];
  private hintUntil = 0;
  private pins: { spot: KanoSpotId; el: HTMLButtonElement; word: string; pic: HTMLCanvasElement }[] = [];
  /** K7: how far each shown pin is nudged sideways (screen px) so pins on a small screen do not overlap. */
  private readonly pinShift = new Map<KanoSpotId, number>();
  /** K7: each shown pin's tap area: its box, split down the middle where two still overlap. */
  private readonly pinTap = new Map<KanoSpotId, Box>();
  private readonly hallWon: boolean;
  private folk: { walkers: InstanceType<PeopleKit['CityWalkers']>; sheet: InstanceType<PeopleKit['CastSheet']>; kit: PeopleKit } | null = null;
  private folkOff = false;
  private looks: readonly FolkLook[] = PEOPLE;
  private lookKey = '';
  private brightKey = '';
  private brightSet: ReadonlySet<string> = new Set();
  private readonly boardEls = new Map<KanoBoard, HTMLButtonElement>();
  private readonly bubbleEls = new Map<KanoPlaceId, HTMLButtonElement>();
  private readonly boardBox = new Map<KanoBoard, Box>();
  private readonly bubbleBox = new Map<KanoPlaceId, Box>();
  private readonly boardShort = new Set<KanoBoard>();
  private readonly roomless = new Set<string>();
  private readonly signRel = new Map<string, Box>();
  private readonly signAt = new Map<string, { dx: number; dy: number }>();
  private readonly sprites = new Map<string, HTMLCanvasElement>();
  private arrowEls: HTMLButtonElement[] = [];
  private arrowBox: { icon: string; x: number; y: number; tap: number; for: string }[] = [];
  private covers: Box[] = [];
  /** K7: each heading, chip and button box, top and bottom: a pin whose word or round is under one hides. */
  private pinCovers: Box[] = [];
  /** K7: this frame's edge arrows for hidden pins, placed before the boards so a pin always gets one. */
  private pinArrows: { spot: KanoSpotId; at: Pt; x: number; y: number; tap: number }[] = [];
  private coversDirty = true;
  private hintWant: Box | null = null;
  /** The problem card, the Not enough card or the boom card showing. */
  open: string | null = null;
  private onClose: (() => void) | null = null;
  private time = 0;
  private last = 0;
  private raf = 0;
  private idleTimer = 0;
  private needDraw = true;
  private closed = false;
  private camMoving = false;
  /** Map draws so far (tests check that a still city draws nothing). */
  draws = 0;
  private readonly fingers = new Map<number, Pt>();
  private hold: { id: number; at: number; from: Pt; on: boolean } | null = null;
  private pinch: number | null = null;
  private readonly keys = new Set<string>();
  private chipText = '';
  private meterKey = '';

  /**
   * K2b: the Play buttons first in the bottom row: Kurmi; K3b: Kofar Mata beside it (one row) once
   * Kurmi is cleared; K4b: Dawanau too once Kofar Mata is. K5b: Borehole Hall last once Dawanau is.
   * K-size: made here, not in the first load (they were menus.ts kanoPlays).
   */
  private plays(hall: boolean): HTMLElement[] {
    const { h, button } = this.hooks.kit.dom;
    const w = KANO_WORDS;
    const row = [...w.place.plays, ...(hall ? [w.cleared.toHall] : [])].slice(0, Math.max(1, this.hooks.nextStreet ?? 1)).map((name, i) => button(name, 'go', (e) => this.hooks.play?.(i + 1, e), {}, 'play'));
    return row.length === 1 ? row : [h('div', { class: ['go-pair', 'go-pair', 'go-pair go-three', 'go-pair go-three go-four'][row.length - 1]! }, ...row)];
  }

  constructor(
    private readonly hooks: WorldCityHooks & { kit: CityKit },
    hall = false,
  ) {
    const k = (this.k = hooks.kit);
    const w = k.words.city;
    if (!document.getElementById('kano-city-style')) document.head.append(k.dom.h('style', { id: 'kano-city-style' }, KANO_CITY_STYLE));
    const { h, button } = k.dom;
    this.st = readKanoCity(hooks.own.own);
    this.hallWon = hooks.hallWon === true;
    const at = this.st.at ? kanoNearest(this.st.at) : { ...KANO_HOME };
    this.hero = { x: at.x, y: at.y, dir: 's', phase: 0, moving: false };
    this.map = h('canvas', { class: 'city-map', role: 'img', 'aria-label': KW.map });
    this.signLayer = h('div', { class: 'city-signs' });
    this.pinLayer = h('div', { class: 'city-pins' });
    this.chips = h('div', { class: 'city-chips' });
    this.cardSpot = h('div', { class: 'city-card-spot', hidden: true });
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
      { class: 'card city-card kano-city', role: 'dialog', 'aria-label': KW.heading },
      h('div', { class: 'city-stage' }, this.map, this.signLayer, this.pinLayer),
      this.top,
      this.hintEl,
      h('div', { class: 'city-bottom' }, h('div', { class: 'city-buttons' }, ...this.plays(hall), ...hooks.bottom), h('div', { class: 'city-zoom' }, zoomOut, zoomIn)),
      this.banner,
      this.say,
      this.cardSpot,
    );
    this.cam = lastCam ?? { zoom: 'far', x: 0, y: 0 };
    this.fillMeter();
    this.fillChips();
    this.makePins();
    this.makeSigns();
    this.el.querySelector<HTMLElement>('.city-stage')!.addEventListener('pointerdown', this.onDown);
    this.listen(true);
  }

  private listen(on: boolean): void {
    const f = on ? window.addEventListener.bind(window) : window.removeEventListener.bind(window);
    f('pointermove', this.onMove as EventListener);
    f('pointerup', this.onUp as EventListener);
    f('pointercancel', this.onUp as EventListener);
    f('keydown', this.onKey as EventListener);
    f('keyup', this.onKeyUp as EventListener);
    f('blur', this.onBlur);
    f('resize', this.onResize);
  }

  /** Call once the screen is in the page (it needs its size). */
  start(): void {
    this.measure();
    this.cam = this.clamp(lastCam ? { ...lastCam } : this.centreOn(this.hero, 'far'));
    const line = this.hooks.line;
    if (line) this.addLine(line, this.hooks.won ? this.k.words.city.mission.heading : undefined);
    // Back in the city after the first Borehole Hall win, the water's line plays once.
    if (this.hallWon && !this.st.hints.includes('taps')) {
      this.save(withHint(this.st, 'taps'), true);
      this.addLine(KW.built.dryTaps);
      this.hooks.sound('built');
    }
    if (kanoBoomDue(this.st)) this.openBoom();
    else if (!this.st.hints.includes('walk')) {
      this.setHint(this.hooks.touch() ? KW.hintWalk : KW.hintWalkKeys, 5);
      this.save(withHint(this.st, 'walk'), true);
    }
    this.last = performance.now();
    this.requestDraw();
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.pay = this.building = this.collecting = null;
    this.save({ ...this.st, at: { x: this.hero.x, y: this.hero.y } }, true);
    this.hooks.life.flush();
    lastCam = this.cam;
    cancelAnimationFrame(this.raf);
    clearTimeout(this.idleTimer);
    this.listen(false);
  }

  // ---------- State ----------

  private get wallet(): Wallet {
    return readWallet(this.hooks.life.state);
  }
  /** The city as drawn: before a pay that is still flying or building, else the live one. */
  private get shown(): KanoCityState {
    return this.pay?.before ?? this.building?.before ?? this.st;
  }
  private save(next: KanoCityState, now = false, wallet?: Wallet): void {
    this.st = next;
    if (wallet) this.hooks.life.set({ ...this.hooks.life.state, kobo: wallet.kobo, power: wallet.power, tech: wallet.tech }, true);
    this.hooks.own.set(writeKanoCity(next), now);
    this.trayKey = JSON.stringify(next.trays);
  }
  /** The trays may have filled (StateCity, in play time): read them back. */
  private syncTrays(): boolean {
    const trays = readKanoCity(this.hooks.own.own).trays;
    const key = JSON.stringify(trays);
    if (key === this.trayKey) return false;
    this.trayKey = key;
    this.st = { ...this.st, trays };
    return true;
  }
  private priceText(b: BucketKind, own: number, spoken = false): string {
    return b === 'naira' ? (spoken ? this.k.spoken : this.k.money)(own) : `${b === 'power' ? 'Power' : 'Tech'} ${own}`;
  }
  private boardOf(b: KanoBoard): { bucket: BucketKind; price: number; name: string } {
    return { bucket: KANO_PRICES[b].bucket, price: boardUnits(b, KANO_PRICES[b].price), name: KW.board[b] };
  }

  /** Tests: where things are on screen, the save and the wallet. */
  get test(): Record<string, unknown> {
    const pins: Record<string, Box> = {};
    for (const p of this.pins) pins[p.spot] = this.pinBox(p.spot, p.word);
    return {
      boards: Object.fromEntries(this.boardBox),
      bubbles: Object.fromEntries(this.bubbleBox),
      pins,
      pinTaps: Object.fromEntries(this.pinTap),
      heroBox: this.heroBox(),
      hero: { x: this.hero.x, y: this.hero.y },
      paying: this.pay !== null || this.building !== null,
      open: this.open,
      city: writeKanoCity(this.st),
      mats: { ...KANO_MATS },
      folk: this.folk?.walkers.list.length ?? 0,
      arrows: this.arrowBox.map((a) => ({ ...a })),
      roomless: [...this.roomless],
      short: [...this.boardShort],
    };
  }

  // ---------- Camera ----------

  private scale(zoom: Cam['zoom']): number {
    const v = this.view;
    const far = Math.max(0.12, Math.min((v.h - (v.top + v.bot) * 0.5) / KANO_MAP.h, (v.w * 1.4) / KANO_MAP.w));
    return zoom === 'near' ? far * NEAR : far;
  }
  private clamp(c: Cam): Cam {
    const s = this.scale(c.zoom);
    const axis = (o: number, len: number, view: number, from: number): number => (len <= view ? from + (view - len) / 2 : Math.min(from + EDGE, Math.max(from + view - len - EDGE, o)));
    return { zoom: c.zoom, x: axis(c.x, KANO_MAP.w * s, this.view.w, 0), y: axis(c.y, KANO_MAP.h * s, this.view.h - this.view.top - this.view.bot, this.view.top) };
  }
  private centreOn(m: Pt, zoom: Cam['zoom']): Cam {
    const s = this.scale(zoom);
    return this.clamp({ zoom, x: this.view.w / 2 - m.x * s, y: this.view.top + (this.view.h - this.view.top - this.view.bot) / 2 - m.y * s });
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
    // K6c: the bottom rows' real depth (one Play row and the rest, or two rows on a short screen).
    const low = Math.min(r.bottom, ...[...this.el.querySelectorAll<HTMLElement>('.city-bottom button')].map((e) => e.getBoundingClientRect()).filter((b) => b.height > 0).map((b) => b.top));
    const top = Math.max(0, Math.min(r.height / 2, t.bottom - r.top));
    this.view = { w: Math.max(1, r.width), h: Math.max(1, r.height), top, bot: Math.max(0, Math.min(r.height - top - 1, r.bottom - low)) };
    this.coversDirty = true;
  }
  /** The top row's and bottom row's boxes, measured again once they may have moved. */
  private measureCovers(): void {
    if (!this.coversDirty) return;
    this.coversDirty = false;
    const r = this.el.getBoundingClientRect();
    const boxes = (els: Iterable<HTMLElement>): Box[] =>
      [...els]
        .map((e) => e.getBoundingClientRect())
        .filter((b) => b.width > 0 && b.height > 0)
        .map((b) => ({ x: b.left - r.left, y: b.top - r.top, w: b.width, h: b.height }));
    const bottom = boxes(this.el.querySelectorAll<HTMLElement>('.city-bottom button'));
    this.pinCovers = [...boxes(this.top.querySelectorAll<HTMLElement>('.city-head, .city-chip, button')), ...bottom];
    this.covers = [...boxes(this.top.querySelectorAll<HTMLElement>('.city-head, .city-chips, button')), ...bottom];
  }

  // ---------- Heading, chips, pins ----------

  private fillMeter(): void {
    const w = this.k.words.city;
    const m = meterOf(this.shown.boom, this.st.boomSeen);
    const small = typeof matchMedia === 'function' && matchMedia('(max-width: 640px), (max-height: 300px)').matches;
    const key = `${m.points}|${m.next}|${small}`;
    if (key === this.meterKey) return;
    this.meterKey = key;
    this.head.setAttribute('aria-label', `${KW.heading}. ${w.meterSpoken(m.points, m.next)}`);
    this.coversDirty = true;
    this.head.innerHTML =
      `<span class="city-head-row"><span>${KW.heading}</span><span class="boom-icon">${this.k.boom.boomIconSvg(small ? 14 : 16)}</span><b class="boom-word">${w.booming}</b></span>` +
      `<span class="city-head-row">${this.k.boom.boomBarSvg(m.filled, m.per, small)}<b class="boom-num">${w.meter(m.points, m.next)}</b></span>`;
  }

  /** The three chips (the one wallet); while money flies they count with it. */
  private fillChips(): void {
    const w = this.k.words.city;
    const s = this.wallet;
    const val: Record<BucketKind, number> = { naira: s.kobo, power: s.power, tech: s.tech };
    if (this.pay) val[this.pay.bucket] += Math.round(this.pay.amount * (1 - this.pay.landed / this.pay.pieces));
    if (this.collecting) val.naira -= Math.round(this.collecting.amount * (1 - Math.min(1, this.collecting.t / this.k.pay.payTime(this.collecting.amount / 100))));
    const text = `${val.naira}|${val.power}|${val.tech}`;
    if (text === this.chipText) return;
    this.chipText = text;
    const { h } = this.k.dom;
    const chip = (kind: BucketKind, shown: string, spoken: string): HTMLElement => {
      const el = h('span', { class: `city-chip chip-${kind}` });
      el.innerHTML = this.k.icon(kind);
      el.append(h('span', { 'aria-hidden': 'true' }, shown), h('span', { class: 'sr-only' }, spoken));
      return el;
    };
    this.chips.replaceChildren(chip('naira', this.k.money(val.naira), w.spokenNaira(this.k.spoken(val.naira))), chip('power', w.power(val.power), w.spokenPower(val.power)), chip('tech', w.tech(val.tech), w.spokenTech(val.tech)));
    this.coversDirty = true;
  }

  private makePins(): void {
    const w = this.k.words.city;
    const looks = kanoLooks(this.shown, this.wallet, this.hallWon);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.pins = (['sandyRoad', 'lightsOut', 'slowInternet', 'dryTaps'] as const)
      .filter((s) => looks[s] !== 'fixed')
      .map((spot) => {
        const ready = looks[spot] === 'ready';
        const word = ready ? 'Ready' : KANO_SPOT_WORDS[spot];
        const el = this.k.dom.button('', `city-pin ${looks[spot]}`, (e) => {
          if (!this.hooks.ignoreTap(e) && !this.busy()) this.openPin(spot);
        }, { 'aria-label': (ready ? w.pinReady : w.pinProblem)(KANO_SPOT_WORDS[spot]), 'data-spot': spot });
        const box = pinTapBox(0, 0, word);
        const pic = this.k.dom.h('canvas', { 'aria-hidden': 'true' });
        pic.width = Math.round(box.w * dpr);
        pic.height = Math.round(box.h * dpr);
        pic.style.width = el.style.width = `${box.w}px`;
        pic.style.height = el.style.height = `${box.h}px`;
        const g = pic.getContext('2d');
        if (g) {
          g.setTransform(dpr, 0, 0, dpr, 0, 0);
          drawKanoPin(g, -box.x, -box.y, spot, ready ? 'ready' : 'problem', 0);
        }
        el.append(pic);
        // W7 step 2: on the first visit the Sandy road pin hops until it is tapped (never with reduced motion).
        if (spot === 'sandyRoad' && !this.st.hints.includes('pin') && !this.hooks.still() && typeof pic.animate === 'function') {
          el.classList.add('first');
          pic.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-7px)' }], { duration: 450, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
        }
        // K7: the button is the tap area only; the picture may reach past it and never takes a tap.
        el.style.overflow = 'visible';
        pic.style.position = 'absolute';
        pic.style.pointerEvents = 'none';
        return { spot, el, word, pic };
      });
    this.pinLayer.replaceChildren(...this.pins.map((p) => p.el));
  }
  private pinBase(spot: KanoSpotId, word: string): Box {
    const at = this.toScreen(KANO_SPOTS[spot].pin);
    return pinTapBox(at.x, at.y, word);
  }
  private pinBox(spot: KanoSpotId, word: string): Box {
    const b = this.pinBase(spot, word);
    return { ...b, x: b.x + (this.pinShift.get(spot) ?? 0) };
  }
  /**
   * K7: shown pins that overlap are pushed apart sideways, half each (at most PIN_SPREAD px from
   * their spot, never off the map's sides), so each pin's word and round take their own taps.
   */
  private spreadPins(): void {
    const vw = this.view.w;
    const list = this.pins.map((p) => ({ spot: p.spot, b: this.pinBase(p.spot, p.word), dx: 0 })).filter((q) => !this.pinOff(q.b));
    const at = (q: (typeof list)[number]): Box => ({ ...q.b, x: q.b.x + q.dx });
    for (let round = 0; round < 8; round++) {
      let moved = false;
      for (let i = 0; i < list.length; i++)
        for (let j = i + 1; j < list.length; j++) {
          const [A, B] = [at(list[i]!), at(list[j]!)];
          const ox = Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x) + 2;
          const oy = Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y);
          if (ox <= 0.5 || oy <= 0) continue;
          const [l, r] = A.x + A.w / 2 <= B.x + B.w / 2 ? [list[i]!, list[j]!] : [list[j]!, list[i]!];
          l.dx -= ox / 2;
          r.dx += ox / 2;
          moved = true;
        }
      for (const q of list) q.dx = Math.min(Math.max(q.dx, -PIN_SPREAD, -q.b.x), PIN_SPREAD, vw - q.b.x - q.b.w);
      if (!moved) break;
    }
    this.pinShift.clear();
    for (const q of list) if (q.dx) this.pinShift.set(q.spot, Math.round(q.dx));
  }
  private placePins(): void {
    // K7: tap areas never overlap: two that still do (no room to spread) split the overlap down the middle.
    const shown = this.pins.map((p) => ({ p, b: this.pinBox(p.spot, p.word) })).filter((q) => !this.pinOff(q.b));
    const taps = shown.map((q) => ({ ...q.b }));
    for (let i = 0; i < taps.length; i++)
      for (let j = i + 1; j < taps.length; j++) {
        const [A, B] = [taps[i]!, taps[j]!];
        const ox = Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x);
        const oy = Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y);
        if (ox <= 0 || oy <= 0) continue;
        if (ox <= oy) {
          const [l, r] = A.x <= B.x ? [A, B] : [B, A];
          const mid = (Math.max(A.x, B.x) + Math.min(A.x + A.w, B.x + B.w)) / 2;
          l.w = mid - l.x;
          r.w = r.x + r.w - mid;
          r.x = mid;
        } else {
          const [u, d] = A.y <= B.y ? [A, B] : [B, A];
          const mid = (Math.max(A.y, B.y) + Math.min(A.y + A.h, B.y + B.h)) / 2;
          u.h = mid - u.y;
          d.h = d.y + d.h - mid;
          d.y = mid;
        }
      }
    this.pinTap.clear();
    shown.forEach((q, i) => this.pinTap.set(q.p.spot, taps[i]!));
    for (const p of this.pins) {
      const b = this.pinBox(p.spot, p.word);
      const tap = this.pinTap.get(p.spot) ?? b;
      const t = `translate(${Math.round(tap.x)}px, ${Math.round(tap.y)}px)`;
      if (p.el.style.transform !== t) p.el.style.transform = t;
      const [w, h, l, top] = [`${Math.round(tap.w)}px`, `${Math.round(tap.h)}px`, `${Math.round(b.x) - Math.round(tap.x)}px`, `${Math.round(b.y) - Math.round(tap.y)}px`];
      if (p.el.style.width !== w) p.el.style.width = w;
      if (p.el.style.height !== h) p.el.style.height = h;
      if (p.pic.style.left !== l) p.pic.style.left = l;
      if (p.pic.style.top !== top) p.pic.style.top = top;
      // K6c: a pin under the bottom rows cannot be tapped there: its edge arrow stands in for it.
      const off = !this.pinTap.has(p.spot);
      if (p.el.hidden !== off) p.el.hidden = off;
    }
  }
  /** K7: the hero's box on screen (edge arrows keep off it). */
  private heroBox(): Box {
    const s = this.scale(this.cam.zoom);
    const h = this.k.walk.walkerSize(s) * s;
    const f = this.toScreen(this.hero);
    return { x: f.x - h * 0.3, y: f.y - h, w: h * 0.6, h };
  }
  /**
   * K6c: a pin is off once its middle is under the bottom rows (a tap there hits a button).
   * K7: also once its word, or the middle of its round, is under the heading, a chip or a
   * button (top or bottom): it could not be read or tapped there. (Box bottom to top: 4 below the foot, the stem
   * 10, the word 16, a gap of 2, the round 36.)
   */
  private pinOff(b: Box): boolean {
    if (this.offMap(b) || b.y + b.h / 2 >= this.view.h - this.view.bot - 2) return true;
    const word = { x: b.x + 4, y: b.y + b.h - 30, w: b.w - 8, h: 16 };
    const round = { x: b.x + b.w / 2, y: b.y + b.h - 50, w: 0, h: 0 };
    return this.pinCovers.some((t) => near(t, word, 0) || near(t, round, 0));
  }
  /** Off the map, or under the bottom rows (as good as off: it cannot be tapped there). */
  private offMap(b: Box): boolean {
    const vw = this.view.w;
    const vh = this.view.h - this.view.bot;
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    if (!(cx < 0 || cx > vw || cy < 0 || cy > vh)) return false;
    return Math.max(0, Math.min(b.x + b.w, vw) - Math.max(b.x, 0)) * Math.max(0, Math.min(b.y + b.h, vh) - Math.max(b.y, 0)) < (b.w * b.h) / 4;
  }

  // ---------- Boards and bubbles ----------

  private boards(): KanoBoard[] {
    const out = kanoBoards(this.shown);
    const b = this.pay?.board ?? this.building?.board;
    if (b && !out.includes(b)) out.push(b);
    return out;
  }
  private trays(): KanoPlaceId[] {
    return KANO_PLACE_LIST.filter((p) => this.st.built.includes(p) && (this.st.trays[p] ?? 0) >= TRAY_MIN && this.collecting?.place !== p && this.building?.board !== p);
  }

  /** The buttons over boards and bubbles, made again when which ones show changes. */
  private makeSigns(): void {
    const w = this.k.words.city;
    const sync = <K extends string>(els: Map<K, HTMLButtonElement>, boxes: Map<K, Box>, want: readonly K[], attr: string, tap: (id: K) => void): void => {
      for (const [id, el] of els)
        if (!want.includes(id)) {
          el.remove();
          els.delete(id);
          boxes.delete(id);
        }
      for (const id of want)
        if (!els.has(id)) {
          const el = this.k.dom.button('', `city-sign ${attr === 'data-build' ? 'city-board' : 'city-bubble'}`, (e) => {
            if (!this.hooks.ignoreTap(e) && !this.busy()) tap(id);
          }, { [attr]: id });
          els.set(id, el);
          this.signLayer.append(el);
        }
    };
    sync(this.boardEls, this.boardBox, this.boards(), 'data-build', (b) => this.goPay(b));
    sync(this.bubbleEls, this.bubbleBox, this.trays(), 'data-place', (p) => this.walkTo(KANO_MATS[p]));
    const wallet = this.wallet;
    for (const [b, el] of this.boardEls) {
      const bucket = KANO_PRICES[b].bucket;
      const left = leftOn(this.shown, b);
      el.setAttribute('aria-label', w.boardSpoken(KW.board[b], this.priceText(bucket, left, true), this.priceText(bucket, inBucket(wallet, bucket), true), left < KANO_PRICES[b].price));
    }
    for (const [p, el] of this.bubbleEls) {
      const amount = this.st.trays[p] ?? 0;
      el.setAttribute('aria-label', w.traySpoken(KW.placeName[p], this.k.spoken(amount), amount >= KANO_TAX[p].cap));
    }
  }

  /**
   * Where each board and bubble stands on screen now (as Ogun's, 5W and W15): by its mat or place
   * when that is clear; else the nearest clear place round it, clear of every pin, the top row,
   * the bottom buttons, the hint and each other sign; on a small screen with no room at full size,
   * a board stands on its short stick. One off the screen gets an edge arrow (drawArrows).
   */
  private placeSigns(g: G): void {
    this.measureCovers();
    this.spreadPins();
    const P = this.k.pay;
    const shownPins = this.pins.map((p) => this.pinBox(p.spot, p.word)).filter((b) => !this.pinOff(b));
    // K7: every hidden pin's edge arrow is placed first, so the boards make room for it.
    const pinArrowBoxes = this.placePinArrows(shownPins);
    const hard: Box[] = [...shownPins, ...pinArrowBoxes, ...this.covers, ...(this.hintWant ? [this.hintWant] : [])];
    const taken: Box[] = [];
    const { w: vw, h: vh, top } = this.view;
    // K7: a board or bubble stands below the whole top row (never between its buttons and chips).
    const inView = (b: Box): boolean => b.x >= 0 && b.y >= top + 2 && b.x + b.w <= vw && b.y + b.h <= vh;
    const strict = (b: Box): boolean => inView(b) && !hard.some((t) => near(t, b, 2)) && !taken.some((t) => near(t, b, 2));
    // Loose (no room otherwise): it may touch a pin, but its middle stays clear of every shown pin
    // (K6c: each one still takes a tap); K7: never on another sign or a pin's edge arrow.
    const mid = (b: Box): Pt => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
    const inside = (p: Pt, b: Box): boolean => p.x >= b.x - 2 && p.x <= b.x + b.w + 2 && p.y >= b.y - 2 && p.y <= b.y + b.h + 2;
    const loose = (b: Box): boolean =>
      inView(b) && !this.covers.some((t) => near(t, b, 2)) && !pinArrowBoxes.some((t) => near(t, b, 0)) && !shownPins.some((t) => inside(mid(b), t)) && !taken.some((t) => near(t, b, 0));
    const fit = (id: string, want: Box, clear = strict): Box | null => {
      const prev = this.signAt.get(id);
      if (clear(want)) return want;
      if (prev && Math.hypot(prev.dx, prev.dy) < 260 && clear({ ...want, x: want.x + prev.dx, y: want.y + prev.dy })) return { ...want, x: want.x + prev.dx, y: want.y + prev.dy };
      for (let r = 8; r <= 240; r += 8)
        for (let n = Math.max(8, Math.round(r / 5)), k = 0; k < n; k++) {
          const c = { ...want, x: Math.round(want.x + Math.cos((k / n) * 6.283) * r), y: Math.round(want.y + Math.sin((k / n) * 6.283) * r * 0.75) };
          if (clear(c)) return c;
        }
      return null;
    };
    const off = (b: Box): boolean => b.x + b.w / 2 < 0 || b.y + b.h / 2 < 0 || b.x + b.w / 2 > vw || b.y + b.h / 2 > vh;
    const at = (foot: Pt, r: Box): Box => ({ x: foot.x + r.x, y: foot.y + r.y, w: r.w, h: r.h });
    const settle = (id: string, key: string, full: Box, short: (() => Box | null) | null): Box => {
      if (off(full)) return full;
      let box = fit(key, full);
      if (!box && short) {
        const s = short();
        box = s && (fit(key, s) ?? fit(key, s, loose));
        if (box) this.boardShort.add(id as KanoBoard);
      }
      if (!box && !short) box = fit(key, full, loose);
      if (!box) {
        this.roomless.add(id);
        box = { ...full, x: -10_000 - full.w };
      }
      this.signAt.set(key, { dx: box.x - full.x, dy: box.y - full.y });
      return box;
    };
    this.boardShort.clear();
    this.roomless.clear();
    for (const b of this.boardEls.keys()) {
      const foot = this.toScreen({ x: KANO_MATS[b].x, y: KANO_MATS[b].y - P.MAT.h / 2 });
      const left = boardUnits(b, leftOn(this.shown, b));
      const done = this.boardDone(b);
      const rel = (short: boolean): Box => this.relBox(`b|${b}|${left}|${done}|${short ? 's' : ''}`, () => P.priceBoardBox(g, 0, 0, this.boardOf(b), left, { done, short }));
      const box = settle(b, `b|${b}`, at(foot, rel(false)), () => at(foot, rel(true)));
      taken.push(box);
      this.boardBox.set(b, box);
    }
    for (const p of this.bubbleEls.keys()) {
      const foot = this.toScreen({ x: KANO_PLACES[p].x, y: KANO_PLACES[p].y - 50 });
      const text = this.trayText(p);
      const full = (this.st.trays[p] ?? 0) >= KANO_TAX[p].cap;
      const box = settle(p, `t|${p}`, at(foot, this.relBox(`t|${text}|${full}`, () => P.trayBubbleBox(g, 0, 0, text, full))), null);
      taken.push(box);
      this.bubbleBox.set(p, box);
    }
    for (const [b, el] of this.boardEls) this.placeEl(el, this.boardBox.get(b));
    for (const [p, el] of this.bubbleEls) this.placeEl(el, this.bubbleBox.get(p));
  }
  private trayText(p: KanoPlaceId): string {
    return this.k.words.city.trayLabel(this.k.pay.trayWords(this.st.trays[p] ?? 0));
  }

  /**
   * A pin, board or tray bubble off the screen gets a round sign at the edge with its icon,
   * pointing the way; tapping it does what tapping the thing does. Its tap square (48 px, then
   * smaller only when none fits) stays on the map, clear of the rows, every sign, pin and arrow.
   */
  private drawArrows(g: G): void {
    const vw = this.view.w;
    // A thing under the bottom rows cannot be tapped: it counts as off the map.
    const vh = this.view.h - this.view.bot;
    const P = this.k.pay;
    const off = (b: Box): boolean => this.offMap(b);
    const onView = (b: Box): boolean => b.x + b.w > 0 && b.y + b.h > 0 && b.x < vw && b.y < vh;
    const mid = (b: Box): Pt => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
    type Want = { icon: EdgeIcon; at: Pt; go: () => void; label: string; spot?: { x: number; y: number; tap: number }; pin?: KanoSpotId };
    const want: Want[] = [];
    // K7: the hidden pins' arrows, already placed (placeSigns), come first.
    for (const a of this.pinArrows) want.push({ icon: SPOT_ICON[a.spot], at: a.at, go: () => this.openPin(a.spot), label: KANO_SPOT_WORDS[a.spot], spot: a, pin: a.spot });
    for (const [b, box] of this.boardBox) if (off(box) && !this.roomless.has(b)) want.push({ icon: KANO_PRICES[b].bucket, at: mid(box), go: () => this.goPay(b), label: KW.board[b] });
    for (const [p, box] of this.bubbleBox) if (off(box) && !this.roomless.has(p)) want.push({ icon: 'naira', at: mid(box), go: () => this.walkTo(KANO_MATS[p]), label: KW.board[p] });
    // K7: a board with no room on the map points the way to its mat (walking onto it pays).
    for (const b of this.boardBox.keys()) if (this.roomless.has(b)) want.push({ icon: KANO_PRICES[b].bucket, at: this.toScreen(KANO_MATS[b]), go: () => this.goPay(b), label: KW.board[b] });
    const shownPins = this.pins.map((p) => this.pinBox(p.spot, p.word)).filter((b) => !this.pinOff(b));
    const avoid: Box[] = [
      ...this.covers,
      ...(this.hintWant ? [this.hintWant] : []),
      ...[...this.boardBox.values(), ...this.bubbleBox.values(), ...shownPins].filter(onView),
      ...this.pinArrows.map((a) => ({ x: a.x - a.tap / 2, y: a.y - a.tap / 2, w: a.tap, h: a.tap })),
    ];
    this.arrowBox = [];
    while (this.arrowEls.length < want.length) {
      const el = this.k.dom.button('', 'city-sign city-arrow', () => undefined, { 'aria-hidden': 'true', tabindex: '-1' });
      this.arrowEls.push(el);
      this.signLayer.append(el);
    }
    const inset = this.arrowInset();
    this.arrowEls.forEach((el, i) => {
      const a = want[i];
      const spot = a ? (a.spot ?? this.clearSpot(this.arrowBase(a.at, inset), avoid, inset)) : null;
      el.hidden = !a || !spot;
      if (!a || !spot) return;
      const r = spot.tap / 2;
      const box = { x: spot.x - r, y: spot.y - r, w: r * 2, h: r * 2 };
      if (!a.spot) avoid.push(box);
      P.drawEdgeArrow(g, spot.x, spot.y, Math.atan2(a.at.y - spot.y, a.at.x - spot.x), a.icon);
      // K7: a pin's arrow shows Kano's own spot icon (as on the pin), so two arrows never look the same.
      if (a.pin) {
        g.fillStyle = '#ffffff';
        g.beginPath();
        g.arc(spot.x, spot.y, P.EDGE_ARROW.r - 3, 0, Math.PI * 2);
        g.fill();
        drawKanoSpotIcon(g, a.pin, spot.x, spot.y);
      }
      this.placeEl(el, box);
      el.dataset['for'] = a.label;
      el.onclick = (e) => {
        if (!this.hooks.ignoreTap(e) && !this.busy()) a.go();
      };
      this.arrowBox.push({ icon: String(a.icon), x: spot.x, y: spot.y, tap: spot.tap, for: a.label });
    });
  }

  private arrowInset(): number {
    const vh = this.view.h - this.view.bot;
    return Math.max(this.k.pay.EDGE_ARROW.r + 2, Math.min(this.k.pay.EDGE_ARROW.inset, (vh - this.view.top) / 2));
  }
  /**
   * Where an arrow for a thing at `at` would stand on the edge band; K7: a thing on the map but
   * not tappable there (under a row, or a board with no room) gets the nearest band spot.
   */
  private arrowBase(at: Pt, inset: number): Pt {
    const { w: vw, top } = this.view;
    const vh = this.view.h - this.view.bot;
    const e = this.k.pay.edgeArrowPlace(at.x, at.y, vw, vh, top, inset);
    if (e) return e;
    const cx = (a: number, lo: number, hi: number): number => Math.min(Math.max(a, lo), Math.max(lo, hi));
    return { x: cx(at.x, inset, vw - inset), y: cx(at.y, top + inset, vh - inset) };
  }
  /** K7: places an edge arrow for each hidden pin (before any board), clear of the rows, the hint and the shown pins; returns their tap squares. */
  private placePinArrows(shownPins: readonly Box[]): Box[] {
    const inset = this.arrowInset();
    const avoid: Box[] = [...this.covers, ...(this.hintWant ? [this.hintWant] : []), ...shownPins];
    const out: Box[] = [];
    this.pinArrows = [];
    for (const p of this.pins) {
      const b = this.pinBox(p.spot, p.word);
      if (!this.pinOff(b)) continue;
      const at = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
      const spot = this.clearSpot(this.arrowBase(at, inset), avoid, inset);
      if (!spot) continue;
      const box = { x: spot.x - spot.tap / 2, y: spot.y - spot.tap / 2, w: spot.tap, h: spot.tap };
      avoid.push(box);
      out.push(box);
      this.pinArrows.push({ spot: p.spot, at, ...spot });
    }
    return out;
  }

  /** K7: an arrow's place off the hero too (nudged along the edge); only with no such place may it touch the hero. */
  private clearSpot(base: Pt, avoid: readonly Box[], inset: number): { x: number; y: number; tap: number } | null {
    return this.arrowSpot(base, [...avoid, this.heroBox()], inset) ?? this.arrowSpot(base, avoid, inset);
  }

  /** The nearest clear place for an arrow on the edge band (then bands nearer the edge, then anywhere on the map), 48 px tap first. */
  private arrowSpot(base: Pt, avoid: readonly Box[], inset: number): { x: number; y: number; tap: number } | null {
    const { w: vw, h: vh, top } = this.view;
    const b0 = { x: Math.round(base.x), y: Math.round(base.y) };
    for (const tap of [48, 44, 40, 36]) {
      const r = tap / 2 + 0.5;
      const ok = (x: number, y: number): boolean => x - r >= 0 && y - r >= 0 && x + r <= vw && y + r <= vh && !avoid.some((o) => x + r > o.x && o.x + o.w > x - r && y + r > o.y && o.y + o.h > y - r);
      if (ok(b0.x, b0.y)) return { ...b0, tap };
      let pick: Pt | null = null;
      let best = Infinity;
      const tryAt = (x: number, y: number): void => {
        const d = (x - b0.x) ** 2 + (y - b0.y) ** 2;
        if (d < best && ok(x, y)) {
          best = d;
          pick = { x, y };
        }
      };
      for (let ins = Math.max(Math.ceil(r), Math.round(inset)); ins >= Math.ceil(r) && !pick; ins -= 6) {
        const [x0, y0] = [ins, Math.round(top) + ins];
        const [x1, y1] = [Math.max(x0, Math.round(vw) - ins), Math.max(y0, Math.round(vh) - ins)];
        for (let x = x0; x <= x1; x += 4) tryAt(x, y0), tryAt(x, y1);
        for (let y = y0; y <= y1; y += 4) tryAt(x0, y), tryAt(x1, y);
      }
      for (let y = Math.ceil(r); y <= vh - r && !pick; y += 6) for (let x = Math.ceil(r); x <= vw - r; x += 6) tryAt(x, y);
      if (pick) return { ...(pick as Pt), tap };
    }
    return null;
  }

  /** A board's or bubble's box round its foot (0, 0), measured once per words. */
  private relBox(key: string, make: () => Box): Box {
    let b = this.signRel.get(key);
    if (!b) this.signRel.set(key, (b = make()));
    return b;
  }
  /** A board or bubble painted once at the screen's pixel size and copied each frame. */
  private sprite(g: G, key: string, rel: Box, foot: Pt, dpr: number, paint: (c: G) => void): void {
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
  private placeEl(el: HTMLElement, b: Box | undefined): void {
    if (!b) return;
    el.hidden = b.x + b.w < 0 || b.y + b.h < 0 || b.x > this.view.w || b.y > this.view.h;
    const t = `translate(${Math.round(b.x)}px, ${Math.round(b.y)}px)`;
    if (el.style.transform !== t) el.style.transform = t;
    el.style.width = `${Math.round(b.w)}px`;
    el.style.height = `${Math.round(b.h)}px`;
  }
  private boardDone(b: KanoBoard): boolean {
    return (this.pay?.board === b && this.pay.done && this.pay.landed >= this.pay.pieces) || this.building?.board === b;
  }

  // ---------- Walking ----------

  private busy(): boolean {
    return this.closed || this.open !== null || this.pay !== null || this.building !== null;
  }
  private walkTo(m: Pt, ring = false): void {
    const to = kanoNearest(m);
    this.path = kanoPath(this.hero, to);
    this.arrived = false;
    this.stand = 0;
    if (ring) this.ring = { x: to.x, y: to.y, t: 0 };
    this.requestDraw();
  }
  private goPay(b: KanoBoard): void {
    this.walkTo(KANO_MATS[b]);
    if (this.path.length === 0) this.hero.moving = this.arrived = false;
  }
  private stopWalking(): void {
    this.path = [];
    this.hero.moving = false;
    this.keys.clear();
    this.hold = null;
  }
  private moveHero(dt: number): void {
    const W = this.k.walk.WALKER;
    if (this.keys.size && !this.busy()) {
      const dx = (this.keys.has('ArrowRight') ? 1 : 0) - (this.keys.has('ArrowLeft') ? 1 : 0);
      const dy = (this.keys.has('ArrowDown') ? 1 : 0) - (this.keys.has('ArrowUp') ? 1 : 0);
      if (dx || dy) {
        const step = (W.speed * dt) / Math.hypot(dx, dy);
        const to = { x: this.hero.x + dx * step, y: this.hero.y + dy * step };
        const ok = [to, { x: to.x, y: this.hero.y }, { x: this.hero.x, y: to.y }].find(kanoWalkable) ?? null;
        if (ok) this.stepTo(ok, Math.hypot(ok.x - this.hero.x, ok.y - this.hero.y));
        this.path = [];
        this.arrived = false;
        this.stand = 0;
        this.hero.moving = ok !== null;
        return;
      }
    }
    if (this.path.length === 0) {
      if (this.hero.moving) this.needDraw = true;
      this.hero.moving = false;
      return;
    }
    let left = W.speed * dt;
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
    this.hero.dir = this.k.walk.walkDir(p.x - this.hero.x, p.y - this.hero.y, this.hero.dir);
    this.hero.x = p.x;
    this.hero.y = p.y;
    this.hero.phase = (this.hero.phase + d / this.k.walk.WALKER.cycle) % 1;
    this.needDraw = true;
  }

  /** Standing still on a mat pays; at a tax place's front, collects (W2, W4). */
  private onStand(dt: number): void {
    if (this.hero.moving || this.busy()) return;
    this.stand += dt;
    const gentle = this.hooks.gentle();
    const MAT = this.k.pay.MAT;
    const onMat = this.boards().find((b) => Math.abs(this.hero.x - KANO_MATS[b].x) <= MAT.w / 2 && Math.abs(this.hero.y - KANO_MATS[b].y) <= MAT.h / 2);
    if (onMat && this.arrived && (gentle || this.stand >= this.k.pay.PAY.standWait)) {
      this.arrived = false;
      this.startPay(onMat);
      return;
    }
    if (!this.arrived || this.collecting) return;
    const reach = COLLECT_REACH * (gentle ? 2 : 1);
    const p = this.trays().find((q) => Math.hypot(this.hero.x - KANO_MATS[q].x, this.hero.y - KANO_MATS[q].y) <= reach);
    if (p) {
      this.arrived = false;
      this.startCollect(p);
    }
  }

  // ---------- Paying, building, collecting ----------

  private startPay(b: KanoBoard): void {
    const before = this.st;
    const r = payKanoBoard(this.st, this.wallet, b);
    if (!r) {
      this.wobble = { board: b, t: 0 };
      this.hooks.sound('notEnough');
      this.showNotEnough(b);
      return;
    }
    const bucket = KANO_PRICES[b].bucket;
    const units = boardUnits(b, r.amount);
    this.save(r.city, true, r.wallet);
    this.pay = { board: b, bucket, amount: r.amount, leftAfter: r.left, done: r.done, t: 0, dur: this.k.pay.payTime(units), pieces: this.k.pay.flyingCount(units), landed: 0, before };
    this.say.textContent = r.done ? '' : this.partLine(bucket, r.amount, r.left);
  }
  private partLine(bucket: BucketKind, amount: number, left: number): string {
    return this.k.words.city.partPaid(this.priceText(bucket, amount), this.priceText(bucket, left));
  }
  private stepPay(dt: number): void {
    const p = this.pay;
    if (!p) return;
    const F = this.k.pay.PAY.flight;
    p.t += dt;
    const spread = Math.max(0.01, p.dur - F);
    const landed = Math.min(p.pieces, Math.floor(Math.max(0, p.t - F) / (spread / Math.max(1, p.pieces - 1)) + (p.t >= F ? 1 : 0)));
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
      this.addLine(this.partLine(p.bucket, p.amount, p.leftAfter));
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
    this.addLine(KW.built[b.board]);
    this.refresh();
    if (kanoBoomDue(this.st)) this.openBoom();
  }
  private startCollect(p: KanoPlaceId): void {
    const r = collectKanoTray(this.st, this.wallet, p);
    if (!r) return;
    const w = this.k.words.city;
    this.save(r.city, true, r.wallet);
    this.collecting = { place: p, amount: r.amount, t: 0, pieces: this.k.pay.flyingCount(r.amount / 100) };
    const name = KW.placeName[p];
    this.addLine(w.collectLine(this.k.money(r.amount), name));
    this.say.textContent = w.collectSpoken(this.k.spoken(r.amount), name);
    this.hooks.sound('collect');
    if (!this.st.hints.includes('taxKano')) {
      this.save(withHint(this.st, 'taxKano'), true);
      this.setHint(KW.hintTax, TAX_HINT);
    }
    this.makeSigns();
  }
  private stepCollect(dt: number): void {
    const c = this.collecting;
    if (!c) return;
    c.t += dt;
    this.needDraw = true;
    this.fillChips();
    if (c.t < this.k.pay.payTime(c.amount / 100)) return;
    this.collecting = null;
    this.refresh();
    if (kanoBoomDue(this.st) && !this.busy()) this.openBoom();
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
    const { h } = this.k.dom;
    this.banner.hidden = !l;
    if (l && this.banner.textContent !== `${l.head ?? ''}${l.text}`) {
      this.banner.replaceChildren(...(l.head ? [h('p', { class: 'city-mission-head' }, h('b', {}, l.head))] : []), h('p', {}, l.text));
      this.placeHint();
    }
  }
  private setHint(text: string | null, secs = 4): void {
    this.hintEl.hidden = !text;
    this.hintEl.textContent = text ?? '';
    this.hintUntil = this.time + secs;
    this.placeHint();
  }
  /**
   * Where the hint goes (as Ogun's): under the whole top row; else just above the bottom buttons;
   * else over the heading (words only). Never over a button or the chips; boards keep away from it.
   */
  private placeHint(): void {
    const r = this.el.getBoundingClientRect();
    const rel = (b: DOMRect): Box => ({ x: b.left - r.left, y: b.top - r.top, w: b.width, h: b.height });
    const under = Math.max(this.view.top, ...[...this.top.querySelectorAll<HTMLElement>('.city-head, .city-chips, button')].map((e) => e.getBoundingClientRect().bottom - r.top));
    // K6c: on a short screen the banner moves up toward the top row rather than over a bottom button.
    const rows = Math.min(r.height, ...[...this.el.querySelectorAll<HTMLElement>('.city-bottom button')].map((e) => e.getBoundingClientRect()).filter((b) => b.width > 0).map((b) => b.top - r.top));
    this.banner.style.top = `${Math.round(Math.max(under + 4, Math.min(under + (this.hintEl.hidden ? 4 : 40), rows - this.banner.offsetHeight - 4)))}px`;
    this.hintWant = null;
    if (!this.hintEl.hidden) {
      const w = this.hintEl.offsetWidth;
      const hh = this.hintEl.offsetHeight;
      const hard = [...this.el.querySelectorAll<HTMLElement>('.city-top button, .city-bottom button, .city-chip')].map((e) => rel(e.getBoundingClientRect())).filter((b) => b.w > 0);
      const low = Math.min(r.height, ...[...this.el.querySelectorAll<HTMLElement>('.city-bottom button')].map((e) => e.getBoundingClientRect()).filter((b) => b.width > 0).map((b) => b.top - r.top));
      const x = Math.round((r.width - w) / 2);
      this.hintWant = [under + 4, low - hh - 4, rel(this.head.getBoundingClientRect()).y].map((y) => ({ x, y: Math.round(y), w, h: hh })).find((b) => b.y >= 0 && b.y + b.h <= r.height && !hard.some((q) => near(q, b, -0.5))) ?? null;
      if (this.hintWant) this.hintEl.style.top = `${this.hintWant.y}px`;
    }
    // No clear place on a tiny screen: it is still said (aria-live), never shown over a button.
    this.hintEl.style.visibility = this.hintWant || this.hintEl.hidden ? '' : 'hidden';
    this.requestDraw();
  }

  private showCard(id: string, name: string, body: HTMLElement[], small: HTMLElement[]): HTMLElement {
    const { h } = this.k.dom;
    const card = h('div', { class: 'card narrow city-problem', role: 'dialog', 'aria-label': name, 'data-spot': id }, ...body, ...(small.length ? [h('div', { class: 'minor-row' }, ...small)] : []));
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
    if (was) (this.pins.find((p) => p.spot === was)?.el ?? this.boardEls.get(was as KanoBoard))?.focus({ preventScroll: true });
    const then = this.onClose;
    this.onClose = null;
    then?.();
    this.requestDraw();
  }
  private btn(label: string, big: boolean, tap: (e: MouseEvent) => void, icon?: 'back' | 'pin'): HTMLButtonElement {
    return this.k.dom.button(label, big ? 'go' : 'minor', (e) => {
      if (!this.hooks.ignoreTap(e)) tap(e);
    }, {}, icon);
  }
  private openPin(spot: KanoSpotId): void {
    if (spot === 'dryTaps') this.openDryTaps();
    else this.openCard(spot);
  }

  /** 6.2: a problem pin's card: what is wrong, what fixes it, and the challenge that helps. */
  openCard(spot: KanoFixId): void {
    const w = this.k.words.city;
    if (spot === 'sandyRoad' && !this.st.hints.includes('pin')) {
      this.save(withHint(this.st, 'pin'), true);
      this.makePins();
      this.placePins();
    }
    const c = KW.cards[spot];
    const { h } = this.k.dom;
    const run = (big: boolean): HTMLButtonElement => this.btn(c.go, big, (e) => this.hooks.run(spot, e));
    const see = this.btn(w.seeStop, false, () => this.hooks.seeStop?.(spot), 'pin');
    const back = this.btn(w.back, false, () => this.closeCard(), 'back');
    const bucket = KANO_PRICES[spot].bucket;
    const big = inBucket(this.wallet, bucket) > 0 && kanoBoards(this.st).includes(spot);
    const walk = this.btn(w.walkThere, true, () => {
      this.closeCard();
      this.goPay(spot);
    });
    this.showCard(spot, KANO_SPOT_WORDS[spot], [h('h2', {}, c.line1), h('p', {}, c.line2), h('p', {}, w.need(this.priceText(bucket, leftOn(this.st, spot)))), big ? walk : run(true)], big ? [run(false), see, back] : [see, back]);
  }

  /**
   * 6.2: the Dry taps card. Before Dawanau is cleared: "Clear Kurmi, Kofar Mata and Dawanau to
   * reach Borehole Hall." with a big "Run {next street}"; after: "Go to Borehole Hall." with its big button.
   */
  private openDryTaps(): void {
    const w = this.k.words.city;
    const o = KW.dryTaps;
    const { h } = this.k.dom;
    const n = Math.max(1, Math.min(4, this.hooks.nextStreet ?? 1));
    const go = this.btn(n < 4 ? o.run(n) : o.hall, true, (e) => this.hooks.play?.(n, e));
    const see = this.btn(w.seeStop, false, () => this.hooks.seeStop?.('dryTaps'), 'pin');
    const back = this.btn(w.back, false, () => this.closeCard(), 'back');
    // One row for the big button and the small ones (wrapping when narrow), so the card fits 640 x 200 and 320 x 240.
    const row = h('div', {}, go, see, back);
    row.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;align-items:stretch;margin-top:6px';
    go.style.cssText = 'flex:1 1 9em;width:auto;margin:0';
    const card = this.showCard('dryTaps', KANO_SPOT_WORDS.dryTaps, [h('h2', {}, o.line1), h('p', {}, n < 4 ? o.clear : o.toHall), row], []);
    if (window.innerHeight <= 320) {
      card.style.padding = '6px 10px';
      card.querySelector<HTMLElement>('h2')!.style.cssText = 'font-size:1rem;margin:0 0 2px;line-height:1.2';
      card.querySelector<HTMLElement>('p')!.style.cssText = 'font-size:0.85rem;margin:2px 0;line-height:1.2';
      row.style.marginTop = '4px';
      for (const b of [go, see, back]) b.style.cssText += ';min-height:44px;padding:4px 10px';
      go.style.fontSize = '1rem';
      go.style.flexBasis = '7em';
      if (window.innerWidth < 400) see.remove();
    }
  }

  /** W8: not enough in that bucket. */
  private showNotEnough(b: KanoBoard): void {
    const w = this.k.words.city;
    const bucket = KANO_PRICES[b].bucket;
    const { h } = this.k.dom;
    const spot: KanoFixId = bucket === 'naira' ? 'sandyRoad' : bucket === 'power' ? 'lightsOut' : 'slowInternet';
    const go = this.btn(KW.cards[spot].go, true, (e) => this.hooks.run(spot, e));
    const back = this.btn(w.back, false, () => this.closeCard(), 'back');
    this.showCard(b, KW.board[b], [h('p', { class: 'city-need' }, w.need(this.priceText(bucket, leftOn(this.st, b)))), h('p', {}, bucket === 'naira' ? KW.earnRun : KW.earnLane(bucket)), go], [back]).classList.add('city-short');
  }

  /** 6.4, d8: "Kano is booming!"; saved as seen at once; the groundnut pyramid's board comes. */
  private openBoom(): void {
    const w = KW.boom;
    const mark = kanoBoomDue(this.st);
    if (!mark) return;
    const cog = mark === FIRST_BOOM && !this.hooks.cogOn();
    const { h } = this.k.dom;
    this.save({ ...this.st, boomSeen: Math.max(this.st.boomSeen, mark) }, true);
    this.hooks.sound('boom');
    this.showCard('boom', w.heading, [h('h2', {}, w.heading), h('p', {}, w.body), ...(cog ? [h('p', { class: 'city-fixed' }, w.cog)] : []), this.btn(w.go, true, () => this.closeCard())], []);
    this.say.textContent = [w.heading, w.body, ...(cog ? [w.cog] : [])].join(' ');
    this.onClose = () => this.refresh();
  }

  // ---------- Input ----------

  private readonly onDown = (e: PointerEvent): void => {
    if (this.closed || this.open || (e.target as HTMLElement).closest('button')) return;
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
    if (!hd || hd.id !== e.pointerId || this.busy() || e.type === 'pointercancel' || this.hooks.ignoreTap(e)) return;
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
    const t = e.target as HTMLElement | null;
    if (!e.key.startsWith('Arrow') || this.open || (t && t.closest('button') && !t.closest('.city-stage'))) return;
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
    this.meterKey = '';
    this.fillMeter();
    this.measure();
    this.placeHint();
    this.cam = this.clamp(this.cam);
    if (this.open === 'dryTaps') this.openDryTaps();
    this.requestDraw();
  };

  // ---------- The loop ----------

  private requestDraw(): void {
    this.needDraw = true;
    if (this.closed || this.raf) return;
    clearTimeout(this.idleTimer);
    this.idleTimer = 0;
    this.raf = requestAnimationFrame(this.frame);
  }
  /** Something moves: walking, keys, money, a build, a line, the camera easing, people being baked. */
  private active(): boolean {
    return this.hero.moving || this.path.length > 0 || this.keys.size > 0 || this.hold?.on === true || this.pay !== null || this.building !== null || this.collecting !== null || this.ring !== null || this.wobble !== null || this.lines.length > 0 || this.camMoving || (this.folk !== null && !this.folk.sheet.done);
  }
  private readonly frame = (now: number): void => {
    this.raf = 0;
    if (this.closed) return;
    const dt = Math.min(0.1, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    if (document.hidden) return this.idle();
    this.update(dt);
    if (this.needDraw) this.draw();
    if (this.active()) this.requestDraw();
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
        if (!this.hooks.still() && this.st.built.some((p) => (this.st.trays[p] ?? 0) < KANO_TAX[p].cap)) this.needDraw = true;
        if (this.needDraw) this.draw();
      }
      if (this.active()) this.requestDraw();
      else this.idle();
    }, IDLE_MS);
  }

  private update(dt: number): void {
    this.time += dt;
    // Play time: every state's trays fill (CityLife's tick, with Kano's StateCity through `also`).
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
    if (this.ring && (this.ring.t += dt / this.k.walk.WALKER.ringTime) >= 1) this.ring = null;
    if (this.wobble && (this.wobble.t += dt) >= this.k.pay.PAY.wobble) this.wobble = null;
    if (this.ring || this.wobble) this.needDraw = true;
    const l = this.lines[0];
    if (l && (l.t += dt) >= LINE_TIME) {
      this.lines.shift();
      this.showLine();
    }
    if (!this.hintEl.hidden && this.time >= this.hintUntil) this.setHint(null);
    // The camera follows the hero (eased; at once with reduced motion).
    const want = this.centreOn(this.hero, this.cam.zoom);
    const k = this.hooks.still() ? 1 : 1 - Math.exp(-dt / 0.15);
    const nx = this.cam.x + (want.x - this.cam.x) * k;
    const ny = this.cam.y + (want.y - this.cam.y) * k;
    this.camMoving = Math.abs(nx - this.cam.x) > 0.3 || Math.abs(ny - this.cam.y) > 0.3;
    const next = this.camMoving ? { ...this.cam, x: nx, y: ny } : want;
    if (next.x !== this.cam.x || next.y !== this.cam.y) {
      this.cam = next;
      this.needDraw = true;
    }
  }

  /** The bright areas as a set (for the walkers' choice of block), made again only when the city changes. */
  private bright(): ReadonlySet<string> {
    const st = this.shown;
    const key = `${st.fixed}|${st.built}|${st.boom}|${st.boomSeen}`;
    if (key !== this.brightKey) {
      this.brightKey = key;
      this.brightSet = new Set(kanoBright(st, this.hallWon));
    }
    return this.brightSet;
  }

  /** Part 7: the walkers (Lagos's from the people kit, Kano's ground and cast), once the kit has arrived. */
  private stepFolk(dt: number): void {
    if (this.folkOff) return;
    const kit = this.k.people();
    if (!kit) return;
    this.guard(() => {
      if (!this.folk) {
        const fronts = KANO_BLOCKS.map((b) => [0, 1, 2].map((k) => kanoNearest({ x: b.x + (b.w * (k + 1)) / 4, y: b.y + b.d - 6 })));
        const ids = KANO_BLOCKS.map((b) => b.id);
        const ground = {
          pick: (bright: ReadonlySet<string>, r: () => number): Pt => {
            const wt = ids.map((id) => (bright.has(id) ? 3 : 1));
            let u = r() * wt.reduce((a, b) => a + b, 0);
            let i = 0;
            while (i < ids.length - 1 && (u -= wt[i]!) >= 0) i++;
            return fronts[i]![Math.floor(r() * 3)]!;
          },
          path: kanoPath,
        };
        const keep = [...Object.values(KANO_MATS), ...Object.values(KANO_SPOTS).map((s) => s.pin), { x: YARD.x + 230, y: YARD.y + YARD.d }];
        this.folk = { walkers: new kit.CityWalkers(keep, ground), sheet: new kit.CastSheet(), kit };
      }
      const f = this.folk;
      f.walkers.fill(kit.ambientCount(this.shown), this.bright(), KANO_CITY_CAST.length);
      f.walkers.step(dt, this.hero, this.bright(), dt <= 0.1 && !this.hooks.still() && this.active(), false);
      if (!f.sheet.done) this.needDraw = true;
    });
  }
  /** People never stop the city: an error in their code switches them off for the visit. */
  private guard(f: () => void): void {
    if (this.folkOff) return;
    try {
      f();
    } catch (err) {
      this.folkOff = true;
      this.folk = null;
      this.needDraw = true;
      console.warn('People switched off:', err);
    }
  }

  /** The painted still city for these looks at this zoom (made again only when a look or the size changes). */
  private picture(dpr: number): { img: HTMLCanvasElement; scale: number } | null {
    const want = Math.min(this.scale(this.cam.zoom) * dpr, 2048 / KANO_MAP.w);
    const st = this.shown;
    const looks = kanoLooks(st, this.wallet, this.hallWon);
    const bright = kanoBright(st, this.hallWon);
    const paint = `${Object.values(looks)}|${bright}|${st.built}|${boomed(st)}|${this.hallWon}`;
    const key = `${paint}|${want.toFixed(4)}`;
    const have = painted.get(key);
    if (have) return have;
    for (const k of painted.keys()) if (!k.startsWith(`${paint}|`)) painted.delete(k);
    const img = makeKanoCityCanvas(looks, want, 2048, { bright, built: st.built, boom: boomed(st), lit: this.hallWon });
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
    const k = this.k;
    const P = k.pay;
    const moving = this.hero.moving || this.camMoving;
    const dpr = Math.min(window.devicePixelRatio || 1, moving ? 1 : MAP_DPR);
    const cw = Math.round(this.view.w * dpr);
    const ch = Math.round(this.view.h * dpr);
    if (this.map.width !== cw || this.map.height !== ch) {
      this.map.width = cw;
      this.map.height = ch;
    }
    const s = this.scale(this.cam.zoom);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#d9c27e';
    g.fillRect(0, 0, cw, ch);
    const pic = this.picture(dpr);
    if (pic) g.drawImage(pic.img, Math.round(this.cam.x * dpr), Math.round(this.cam.y * dpr), (pic.img.width * s * dpr) / pic.scale, (pic.img.height * s * dpr) / pic.scale);
    // Map units: mats, places, the queue, the walkers, the hero, the ring.
    g.setTransform(s * dpr, 0, 0, s * dpr, this.cam.x * dpr, this.cam.y * dpr);
    const still = this.hooks.still();
    for (const b of this.boards()) P.drawPayMat(g, KANO_MATS[b].x, KANO_MATS[b].y, this.pay?.board === b);
    if (this.ring) k.walk.drawWalkRing(g, this.ring.x, this.ring.y, still ? 0 : this.ring.t);
    const items: { y: number; draw: () => void }[] = [];
    const f = this.folk;
    const scale = f?.kit.CITY_FOLK_SCALE ?? 1;
    let who: ((g: G, look: FolkLook, x: number, y: number, frame: FolkFrame, flip?: boolean) => void) | undefined;
    if (f && !this.folkOff) {
      this.guard(() => {
        const hero = this.hooks.look();
        const lk = `${hero.skin},${hero.hair},${hero.outfit}`;
        // Never the player's own look: a walker who matches it takes the next skin tone.
        if (lk !== this.lookKey) {
          this.lookKey = lk;
          this.looks = PEOPLE.map((l) => (f.kit.isHeroLook(l, hero) ? { ...l, skin: (l.skin + 1) % 7 } : l));
        }
        f.sheet.ready(this.looks, s * Math.min(window.devicePixelRatio || 1, MAP_DPR) * scale, `kano|${lk}`);
        // Too small to see on this screen and zoom: nobody is drawn (as Lagos's city).
        if (37 * scale * s < f.kit.CITY_FOLK.minPx) return;
        who = (c, look, x, y, frame, flip = false) => {
          const i = PEOPLE_AT.get(look);
          if (i !== undefined) this.guard(() => f.sheet.draw(c, { look: i, frame, x, y, flip, size: scale }));
        };
        const side = f.kit.CITY_FOLK.stepAside;
        for (const wk of f.walkers.list) {
          const at = f.kit.cityWalkerAt(wk);
          const frame: FolkFrame = wk.stop > 0 ? (still || Math.floor(wk.stop / 0.25) % 2 === 0 ? 'wave0' : 'wave1') : wk.idle < 0.15 && !still ? (`walk${Math.floor(wk.d / 9) % 4}` as FolkFrame) : 'stand';
          const kk = wk.stop > 0 ? side : 0;
          const x = at.x - at.dy * kk;
          const y = at.y + at.dx * kk;
          items.push({ y, draw: () => who?.(g, PEOPLE[wk.look]!, x, y, frame, at.dx < 0) });
        }
        // Part 7: the queue at the water yard once the taps flow.
        if (this.hallWon) QUEUE.forEach((l, i) => items.push({ y: YARD.y + YARD.d, draw: () => who?.(g, l, YARD.x + 196 + i * 18 - (i === 4 ? 8 : 0), YARD.y + YARD.d - 2 + (i % 2) * 3, 'stand') }));
      });
    }
    for (const p of KANO_PLACE_LIST) {
      const building = this.building?.board === p ? this.building.t / BUILD_TIME : null;
      if (!this.shown.built.includes(p) && building === null) continue;
      const tax = KANO_TAX[p];
      const tray = this.st.trays[p] ?? 0;
      const at = KANO_PLACES[p];
      items.push({
        y: at.y,
        draw: () =>
          DRAW_PLACE[p](g, at.x, at.y, { time: still ? 0 : this.time, sale: still ? 0.3 : (this.time / KANO_PLACE_LOOK[p].time) % 1, served: Math.floor(tray / tax.each), stock: Math.min(1, 0.3 + tray / tax.cap), full: tray >= tax.cap, build: building ?? 1, still, ...(who ? { who } : {}) }),
      });
    }
    items.push({ y: this.hero.y + 0.5, draw: () => k.walk.drawCityHero(g, this.hooks.look(), this.hero.x, this.hero.y, { dir: this.hero.dir, phase: this.hero.phase, moving: this.hero.moving, time: this.time, still, size: k.walk.walkerSize(s) }) });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.draw();
    // Screen px: boards, bubbles, arrows, flying money.
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.placeSigns(g);
    this.placePins();
    for (const [b, box] of this.boardBox) {
      const done = this.boardDone(b);
      const left = boardUnits(b, leftOn(this.shown, b));
      const short = this.boardShort.has(b);
      const key = `b|${b}|${left}|${done}|${short ? 's' : ''}`;
      const rel = this.relBox(key, () => P.priceBoardBox(g, 0, 0, this.boardOf(b), left, { done, short }));
      const foot = { x: box.x - rel.x, y: box.y - rel.y };
      const wob = this.wobble?.board === b && !still ? P.boardWobble(this.wobble.t) : 0;
      // While money flies the board counts down with it (drawn live); else its copy.
      const units = this.pay?.board === b ? boardUnits(b, Math.round(leftOn(this.pay.before, b) - (this.pay.amount * this.pay.landed) / this.pay.pieces)) : left;
      if (wob || units !== left) P.drawPriceBoard(g, foot.x, foot.y, this.boardOf(b), units, { done, wobble: wob, short });
      else this.sprite(g, key, rel, foot, dpr, (c) => P.drawPriceBoard(c, 0, 0, this.boardOf(b), left, { done, short }));
    }
    for (const [p, box] of this.bubbleBox) {
      const text = this.trayText(p);
      const full = (this.st.trays[p] ?? 0) >= KANO_TAX[p].cap;
      const rel = this.relBox(`t|${text}|${full}`, () => P.trayBubbleBox(g, 0, 0, text, full));
      this.sprite(g, `t|${text}|${full}`, rel, { x: box.x - rel.x, y: box.y - rel.y }, dpr, (c) => P.drawTrayBubble(c, 0, 0, 'naira', text, full, 0));
    }
    this.drawArrows(g);
    const fly = (kind: BucketKind, t: number, dur: number, pieces: number, from: Pt, to: Pt): void => {
      const spread = Math.max(0.01, dur - P.PAY.flight);
      for (let i = 0; i < pieces; i++) {
        const q = (t - (pieces > 1 ? (spread * i) / (pieces - 1) : 0)) / P.PAY.flight;
        if (q > 0 && q < 1) P.drawFlyingMoney(g, kind, from.x, from.y, to.x, to.y, q);
      }
    };
    const pay = this.pay;
    if (pay) {
      const hero = this.toScreen({ x: this.hero.x, y: this.hero.y - k.walk.WALKER.h });
      const box = this.boardBox.get(pay.board);
      fly(pay.bucket, pay.t, pay.dur, pay.pieces, hero, box ? { x: box.x + box.w / 2, y: box.y + box.h / 2 } : hero);
    }
    const col = this.collecting;
    if (col) {
      const chip = this.chips.querySelector('.chip-naira')?.getBoundingClientRect();
      const r = this.el.getBoundingClientRect();
      const to = chip ? { x: chip.left - r.left + 14, y: chip.top - r.top + chip.height / 2 } : { x: 20, y: 20 };
      fly('naira', col.t, P.payTime(col.amount / 100), col.pieces, this.toScreen({ x: KANO_PLACES[col.place].x, y: KANO_PLACES[col.place].y - 40 }), to);
    }
    this.fillChips();
    this.fillMeter();
  }
}

/** The Kano part's city maker (WorldPart.city); `hall`: Borehole Hall is in the part. Without the game's kit (never expected) nothing can draw. */
export function kanoCity(hooks: WorldCityHooks, hall = false): WorldCity {
  return new KanoCityScreen(hooks as WorldCityHooks & { kit: CityKit }, hall);
}
