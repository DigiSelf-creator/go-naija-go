/**
 * Lagos from above, the home screen (docs/city.md part 5 (b)).
 *
 * - The still city is painted once into an offscreen canvas (makeCityCanvas) and copied with one
 *   drawImage. The map canvas is drawn again only on a drag, a zoom, a resize or a change: when
 *   nothing moves, nothing is drawn. The pins are small HTML buttons over the map (each with its
 *   picture drawn once); their gentle bob is a CSS animation, so it never redraws the map.
 * - Drag with one finger; pinch snaps between far and near; + and − do the same; double tap a
 *   block to go near, centred on it. Keys: arrows move 120 px a press, + and − zoom.
 * - A pin opens its problem card (exact words: city.md "Screens and words for slice 3").
 */
import { BUCKETS, CITY_COLOURS, CITY_MAP, CITY_SPOTS, SPOT_IDS, SPOT_WORDS, bucketIconSvg, drawProblemPin, makeCityCanvas, type BucketKind, type SpotId, type SpotLooks } from '../art/city';
import { FIX_COST, canFix, spotLooks, type CityState } from '../game/city';
import {
  blockAt,
  camScale,
  centreOn,
  clampCam,
  panCam,
  pinTapBox,
  pinchStep,
  startCam,
  toMap,
  toScreen,
  zoomCam,
  KEY_STEP,
  type CityCam,
  type CityView,
  type Zoom,
} from '../game/cityCamera';
import { formatMoney, spokenMoney } from '../game/money';
import { button, h } from './dom';
import { WORDS } from './words';

export interface CityScreenHooks {
  /** The saved city now (buckets, fixed spots). */
  city(): CityState;
  /** Buttons for the top right (Sound, Settings) and the bottom row (Streets, Hero, Nigeria's wheel). */
  topRight: HTMLElement[];
  bottom: HTMLElement[];
  /** A card's big "Run Alausa" (or later "Lane run"). */
  run(spot: SpotId, e: MouseEvent): void;
  /** "Fix it (₦10)": pay from the bucket. Returns true when it was paid. */
  fix(spot: SpotId): boolean;
  /** A tap that must not count (the second half of the double tap that opened the screen). */
  ignoreTap(e: MouseEvent): boolean;
}

/** The camera is kept between visits (this page load only). */
let lastCam: CityCam | null = null;
/** The painted city, kept while its looks and size stay the same. */
let painted: { key: string; img: HTMLCanvasElement; scale: number } | null = null;

const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_PX = 30;
/** A finger that moves this far is a drag, not a tap. */
const DRAG_PX = 8;

interface Finger {
  x: number;
  y: number;
}

export class CityScreen {
  readonly el: HTMLElement;
  private readonly map: HTMLCanvasElement;
  private readonly pinLayer: HTMLElement;
  private readonly chips: HTMLElement;
  private readonly cardSpot: HTMLElement;
  private view: CityView = { w: 1, h: 1 };
  cam: CityCam;
  private state: CityState;
  private looks: SpotLooks;
  private pins: { spot: SpotId; el: HTMLButtonElement; pic: HTMLCanvasElement | null; word: string }[] = [];
  private drawPending = 0;
  /** Map draws so far (tests check that a still city draws nothing). */
  draws = 0;
  private closed = false;
  private readonly fingers = new Map<number, Finger>();
  private moved = 0;
  private pinchFrom = 0;
  private lastTap: { x: number; y: number; t: number } | null = null;
  /** The problem card showing, if any. */
  open: SpotId | null = null;

  constructor(private readonly hooks: CityScreenHooks) {
    const w = WORDS.city;
    this.state = hooks.city();
    this.looks = spotLooks(this.state);
    this.map = h('canvas', { class: 'city-map', role: 'img', 'aria-label': w.map });
    this.pinLayer = h('div', { class: 'city-pins' });
    this.chips = h('div', { class: 'city-chips' });
    this.cardSpot = h('div', { class: 'city-card-spot', hidden: true });
    const zoomIn = button(w.zoomIn, 'minor city-zoom-btn', () => this.zoom('near'), { 'aria-label': w.zoomInSpoken });
    const zoomOut = button(w.zoomOut, 'minor city-zoom-btn', () => this.zoom('far'), { 'aria-label': w.zoomOutSpoken });
    this.el = h(
      'div',
      { class: 'card city-card', role: 'dialog', 'aria-label': w.heading },
      h('div', { class: 'city-stage' }, this.map, this.pinLayer),
      h('div', { class: 'city-top' }, h('h2', {}, w.heading), this.chips, h('div', { class: 'city-top-right' }, ...hooks.topRight)),
      h('div', { class: 'city-bottom' }, h('div', { class: 'city-buttons' }, ...hooks.bottom), h('div', { class: 'city-zoom' }, zoomOut, zoomIn)),
      this.cardSpot,
    );
    this.cam = lastCam ?? { zoom: 'far', x: 0, y: 0 };
    this.fillChips();
    this.makePins();
    const stage = this.el.querySelector<HTMLElement>('.city-stage')!;
    stage.addEventListener('pointerdown', this.onDown);
    window.addEventListener('pointermove', this.onMove);
    window.addEventListener('pointerup', this.onUp);
    window.addEventListener('pointercancel', this.onUp);
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('resize', this.onResize);
  }

  /** Call once the screen is in the page (it needs its size). */
  start(): void {
    this.measure();
    this.cam = lastCam ? clampCam(lastCam, this.view) : startCam(this.view);
    this.requestDraw();
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    lastCam = this.cam;
    cancelAnimationFrame(this.drawPending);
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
    window.removeEventListener('pointercancel', this.onUp);
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('resize', this.onResize);
  }

  /** The saved city changed (a fix): counters, pins and the painted city follow. */
  refresh(): void {
    this.state = this.hooks.city();
    this.looks = spotLooks(this.state);
    this.fillChips();
    this.makePins();
    this.requestDraw();
  }

  // ---------- Counters ----------

  private fillChips(): void {
    const w = WORDS.city;
    const s = this.state;
    const chip = (kind: BucketKind, shown: string, spoken: string): HTMLElement => {
      const el = h('span', { class: `city-chip chip-${kind}` });
      el.innerHTML = bucketIconSvg(kind);
      el.append(h('span', { 'aria-hidden': 'true' }, shown), h('span', { class: 'sr-only' }, spoken));
      return el;
    };
    const made: Record<BucketKind, HTMLElement> = {
      naira: chip('naira', formatMoney(s.kobo), w.spokenNaira(spokenMoney(s.kobo))),
      power: chip('power', w.power(s.power), w.spokenPower(s.power)),
      tech: chip('tech', w.tech(s.tech), w.spokenTech(s.tech)),
    };
    this.chips.replaceChildren(...BUCKETS.map((b) => made[b]));
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
        // A drag that ended on a pin is not a tap (keys, detail 0, always open it).
        if ((e.detail > 0 && this.moved > DRAG_PX) || this.hooks.ignoreTap(e)) return;
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
      // The pin's foot sits at (0, 0) of its box: box.x is -w/2, the box ends 4 px below the foot.
      drawProblemPin(g, -box.x, -box.y, p.spot, this.looks[p.spot] === 'ready' ? 'ready' : 'problem', 0);
    }
  }

  /** Moves the pin buttons to where their spots are on screen now. */
  private placePins(): void {
    for (const p of this.pins) {
      const at = toScreen(this.cam, this.view, CITY_SPOTS[p.spot].pin);
      const box = pinTapBox(at.x, at.y, p.word);
      p.el.style.transform = `translate(${Math.round(box.x)}px, ${Math.round(box.y)}px)`;
    }
  }

  /** Where each pin's tap area is on screen now (CSS px, inside the map area), for tests. */
  pinBoxes(): Record<SpotId, { x: number; y: number; w: number; h: number }> {
    const out = {} as Record<SpotId, { x: number; y: number; w: number; h: number }>;
    for (const p of this.pins) {
      const at = toScreen(this.cam, this.view, CITY_SPOTS[p.spot].pin);
      out[p.spot] = pinTapBox(at.x, at.y, p.word);
    }
    return out;
  }

  // ---------- The problem card ----------

  openCard(spot: SpotId): void {
    const w = WORDS.city;
    const back = button(w.back, 'minor', () => this.closeCard());
    let body: HTMLElement[];
    if (this.looks[spot] === 'fixed') {
      body = [h('h2', {}, w.fixedName[spot]), h('p', { class: 'city-fixed' }, w.fixed)];
    } else {
      const ready = canFix(this.state, spot);
      const fix = (label: string): HTMLButtonElement =>
        button(label, 'go', (e) => {
          if (this.hooks.ignoreTap(e)) return;
          if (this.hooks.fix(spot)) {
            this.closeCard();
            this.refresh();
          }
        });
      if (spot === 'potholes') {
        const c = w.cards.potholes;
        const money = formatMoney(FIX_COST.potholes.amount);
        body = [
          h('h2', {}, c.line1),
          h('p', {}, c.line2(money)),
          ready ? fix(c.fix(money)) : button(c.go, 'go', (e) => {
            if (this.hooks.ignoreTap(e)) return;
            this.hooks.run(spot, e);
          }),
        ];
      } else {
        const c = w.cards[spot];
        // Until the lane run (step (f)) exists, its button is a plain line.
        body = [h('h2', {}, c.line1), h('p', {}, c.line2), ready ? fix(c.fix) : h('p', { class: 'city-soon' }, c.soon)];
      }
    }
    const card = h('div', { class: 'card narrow city-problem', role: 'dialog', 'aria-label': SPOT_WORDS[spot], 'data-spot': spot }, ...body, h('div', { class: 'minor-row' }, back));
    this.cardSpot.replaceChildren(card);
    this.cardSpot.hidden = false;
    this.open = spot;
    (card.querySelector<HTMLElement>('.go') ?? back).focus({ preventScroll: true });
  }

  closeCard(): void {
    const was = this.open;
    this.open = null;
    this.cardSpot.hidden = true;
    this.cardSpot.replaceChildren();
    if (was) this.pins.find((p) => p.spot === was)?.el.focus({ preventScroll: true });
  }

  // ---------- Looking around ----------

  private measure(): void {
    const r = this.map.getBoundingClientRect();
    this.view = { w: Math.max(1, r.width), h: Math.max(1, r.height) };
  }

  private readonly onResize = (): void => {
    this.measure();
    this.cam = clampCam(this.cam, this.view);
    this.paintPins();
    this.requestDraw();
  };

  zoom(z: Zoom, at?: { x: number; y: number }): void {
    this.cam = zoomCam(this.cam, this.view, z, at);
    this.requestDraw();
  }

  pan(dx: number, dy: number): void {
    this.cam = panCam(this.cam, this.view, dx, dy);
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
    if (this.open || this.closed) return;
    if (this.fingers.size === 0) this.moved = 0;
    this.fingers.set(e.pointerId, this.local(e));
    if (this.fingers.size === 2) this.pinchFrom = this.spread().d;
  };

  private readonly onMove = (e: PointerEvent): void => {
    const f = this.fingers.get(e.pointerId);
    if (!f) return;
    const p = this.local(e);
    if (this.fingers.size === 1) {
      const dx = p.x - f.x;
      const dy = p.y - f.y;
      this.moved += Math.hypot(dx, dy);
      this.fingers.set(e.pointerId, p);
      if (this.moved > DRAG_PX) this.pan(dx, dy);
      return;
    }
    this.fingers.set(e.pointerId, p);
    this.moved = DRAG_PX + 1; // two fingers never tap a pin
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
    if (this.fingers.size > 0 || this.moved > DRAG_PX) return;
    // A tap on the map (not a pin): a second tap soon after, near the first, zooms on a block.
    if (e.target instanceof Element && e.target.closest('.city-pin')) return;
    const now = performance.now();
    const last = this.lastTap;
    this.lastTap = { x: f.x, y: f.y, t: now };
    if (last && now - last.t < DOUBLE_TAP_MS && Math.hypot(f.x - last.x, f.y - last.y) < DOUBLE_TAP_PX) {
      this.lastTap = null;
      const b = blockAt(toMap(this.cam, this.view, f));
      if (b) {
        this.cam = centreOn({ x: b.x + b.w / 2, y: b.y + b.d / 2 }, 'near', this.view);
        this.requestDraw();
      }
    }
  };

  private readonly onKey = (e: KeyboardEvent): void => {
    if (this.closed) return;
    if (this.open) {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.closeCard();
      }
      return;
    }
    const moves: Record<string, [number, number]> = { ArrowLeft: [KEY_STEP, 0], ArrowRight: [-KEY_STEP, 0], ArrowUp: [0, KEY_STEP], ArrowDown: [0, -KEY_STEP] };
    const m = moves[e.key];
    if (m) {
      e.preventDefault();
      this.pan(m[0], m[1]);
    } else if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      this.zoom('near');
    } else if (e.key === '-' || e.key === '_') {
      e.preventDefault();
      this.zoom('far');
    }
  };

  // ---------- Drawing ----------

  requestDraw(): void {
    if (this.drawPending || this.closed) return;
    this.drawPending = requestAnimationFrame(() => {
      this.drawPending = 0;
      this.draw();
    });
  }

  /** The painted still city for these looks (made again only when a look or the size changes). */
  private picture(dpr: number): { img: HTMLCanvasElement; scale: number } | null {
    const want = Math.min(camScale('near', this.view) * dpr, 2048 / CITY_MAP.w);
    const key = `${this.looks.potholes}|${this.looks.lightsOut}|${this.looks.slowInternet}`;
    if (painted && painted.key === key && painted.scale >= want * 0.8) return painted;
    const img = makeCityCanvas(this.looks, want);
    if (!img) return null;
    painted = { key, img, scale: want };
    return painted;
  }

  private draw(): void {
    if (this.closed) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
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
    if (pic) g.drawImage(pic.img, this.cam.x * dpr, this.cam.y * dpr, CITY_MAP.w * s * dpr, CITY_MAP.h * s * dpr);
    this.placePins();
  }
}
