/**
 * One lane run on screen. S3f2: its own fixed-step loop on the game canvas, the camera and the
 * road, swipes, keys and the four buttons, "3, 2, 1" on every start and resume. S3f3: the
 * Blackout, the buckets, the food, the HUD and hint bar, the goal and caught cards, "Keep running",
 * the best distance and the `lane` save. Round 4: pickups fly to their chips, the lamp dots, the
 * first run's look back, the corn count, and the "+5 m" in its own chip. main.ts loads this file
 * only when a lane run opens, so none of it is in the first load.
 */
import laneData from '../data/levels/lagos-lane.json';
import type { HeroLook } from '../art/hero';
import { FixedLoop } from '../engine/loop';
import type { SoundName } from '../engine/sound';
import { formatMoney, spokenMoney } from '../game/money';
import { button, h } from '../screens/dom';
import { SPEAKER } from '../screens/hud';
import { WORDS } from '../screens/words';
import { LANE_LEAVE_KEEPS } from '../native/leave-ask';
import { addLaneSounds, laneStepFor, laneStepGap, laneTinkFor } from '../art/lane-sounds';
import { laneTempoAt } from '../art/tunes';
import { LaneButtons, SwipeReader, TILT_CALIBRATE_S, TILT_LOST_S, TiltReader, buttonBoxes, keyMove, steerAngle } from './input';
import { parseLane, type LaneLevel } from './level';
import { NO_HAUL, addHaul, haulWords, lanePrize, subHaul, type Haul, type LaneSave } from './rewards';
import { LaneSim, type LaneEvent, type LaneMove } from './sim';
import { DARK_FROM, LaneView, WARN_UNDER, type HeroPose, type LaneLook } from './view';
import { FrameWatch } from '../game/crowd';
import { drawBucketIcon } from '../art/city';
import { cornCount } from '../game/music-cue';
import type { HintBarBox } from '../screens/controls';
import { DOTS_FROM_W, INTRO_TIME, LAMP_DOTS, PLUS_TIME, PopFlights, introAt, laneCountBox, litDots, type ChipKind } from './polish';

/** "3, 2, 1": each number shows this long, then "Go!" while the run starts (part 14). */
export const COUNT_STEP = 0.6;
/** Part 7 rule 6: nothing to dodge in the 1.5 s after "3, 2, 1" on any resume. */
export const AFTER_COUNT_SAFE = 1.5;
/** Part 10: the caught moment lasts 1.2 s, then the card. */
export const CAUGHT_TIME = 1.2;
/** "+5 m" and "−15 m" show for 1 s; food lines 2 s; "The shield took it!" 1.5 s. */
const FLASH_TIME = 1;
const FOOD_LINE = 2;
const SHIELD_LINE = 1.5;
/** Part 25.4: "Your phone said no to tilt..." and "Tilt is not working..." show this long. */
const TILT_LINE = 3;
/** The offer card's buttons ignore taps this soon after it opens (the tap that started the run). */
const OFFER_GUARD_MS = 400;

/** Which sound each lane event plays (art's lane sounds, S3f1; the goat's "meeh" is the streets' own, decision 62). */
export const LANE_SOUNDS: Partial<Record<string, SoundName>> = {
  lane: 'laneSwish',
  jump: 'laneHop',
  slide: 'laneSlide',
  land: 'laneLand',
  stumble: 'laneOof',
  sideBump: 'laneLand',
  burst: 'lanePok',
  goat: 'meeh',
  bulb: 'laneBulb',
  chip: 'laneChip',
  garri: 'food',
  corn: 'food',
  toss: 'fufuToss',
  shieldUsed: 'laneTzing',
  goal: 'laneBusStop',
  caught: 'laneCaught',
};
/** A goat's "meeh" at most this often (the streets' AnimalCalls rule). */
const MEEH_GAP = 1.5;

/** The hint keys and the kind of thing each one teaches (part 8): seen once that thing is passed. */
const HINT_THING: Readonly<Record<string, readonly string[]>> = {
  lane: ['danfo'],
  jump: ['cones'],
  slide: ['barrier'],
  crate: ['crate:power', 'crate:tech', 'crate:coins'],
  power: ['bulb'],
  goat: ['goat'],
  food: ['garri'],
  tech: ['chip'],
  pothole: ['pothole'],
};

export interface LaneHooks {
  canvas: HTMLCanvasElement;
  g: CanvasRenderingContext2D;
  look(): HeroLook;
  gentle(): boolean;
  /** Reduced motion. */
  still(): boolean;
  /** "Buttons instead of swipes" is on. */
  buttonsOn(): boolean;
  /** The phone (touch) words for hints, else the keys words. */
  touch(): boolean;
  /** Part 25: "Tilt to steer" is on, on a phone that can tilt, and not refused this visit. */
  tiltOn(): boolean;
  /** Tilt can be read now (Android, or an iPhone that said yes). */
  tiltReady(): boolean;
  /** An iPhone: Apple's box asks first (the offer card says so). */
  tiltAsks(): boolean;
  /** A run's start or resume tap: asks Apple's box if tilt is on and this visit has not asked (25.4). */
  askTilt(): void;
  /** The offer is due (25.1: a phone that can tilt, tilt off, never offered); `tiltOffered` marks it. */
  tiltOffer(): boolean;
  tiltOffered(): void;
  /** "Try tilt": the switch goes on (and an iPhone asks, from this tap). */
  tryTilt(): void;
  /** Safe edges in CSS px. */
  safe(): { top: number; right: number; bottom: number; left: number };
  sound(name: SoundName): void;
  /** Ask main to pause (the Pause button): it shows the Pause card and calls pause() here. */
  askPause(): void;
  /** The Sound switch: now, and flipping it (saved). */
  soundOn(): boolean;
  toggleSound(): void;
  /** The `lane` part of the save, and writing it back. */
  laneSave(): LaneSave;
  saveLane(s: LaneSave): void;
  /** Puts pickups into the city's buckets now (LR-Q1 a: as soon as you get them). */
  bank(delta: Haul): void;
  /** Writes every save now (pause, run end). */
  flush(): void;
  /** The fix this run is for and what is left to pay on it (decision 45), or null. */
  forFix(): { bucket: 'power' | 'tech'; left: number } | null;
  /** The caught card's "Gentle mode" switch (it counts from the next run). */
  setGentle(on: boolean): void;
  /** "Take it home": everything this run brings home, prize included. */
  home(result: { won: boolean; haul: Haul }): void;
  /** A card opened or closed. */
  changed(): void;
  /** Part 17: the lane tune at a tempo step, its guitar off under 15 m; held while paused. null: stop it. */
  music(m: { tempo: number; guitar: boolean; held: boolean } | null): void;
  /** Part 17: the Blackout's close hum. */
  closeHum(on: boolean): void;
  /**
   * Part 11: the corn tune and its 5, 4, 3, 2, 1 count, as on the streets (S2.9): `left` seconds
   * of corn, held while paused, the count in `box` (the hint bar's place). null: no corn now.
   */
  corn(c: { left: number; held: boolean; box: HintBarBox } | null): void;
  /** O6b: another state's lane file (Ogun's Expressway, as JSON) and look; left out: Lagos's. */
  level?: unknown;
  laneLook?: LaneLook | null;
  /**
   * S3g1b (people everywhere part 12): the crowd murmur, while 5 or more people show and no
   * warning (a lamp's "tunk", the close hum) or the corn tune plays (PE-R6).
   */
  murmur?(on: boolean): void;
  /** MS3b: a quick mission's goal chip, shown under the top rows on the left (null: none). */
  missionChip?: HTMLElement | null;
  /** MS3b: the Power and Tech this run has gained so far (pickups and bursts), after each pickup. */
  gained?(power: number, tech: number): void;
  /** MS3b: a run starts (the first, Run again, Start again): a new go at the mission. */
  started?(): void;
  /** MS3b: "You got a star!" on the bus stop and caught cards, or null. */
  starLine?(): string | null;
}

/** The size the flying pickups are drawn at (CSS px). */
const FLY_PX = 18;
/** Pickups float this high (m) on the road, as the view draws them. */
const PICKUP_UP = 0.8;

export type LaneStage = 'intro' | 'count' | 'play' | 'paused' | 'caught' | 'card' | 'off';

export interface LaneTestHook {
  stage: LaneStage;
  /** O6b: the lane file playing (lagos-lane, ogun-lane) and its theme. */
  level: string;
  theme: string;
  phase: string;
  dist: number;
  lane: number;
  x: number;
  y: number;
  speed: number;
  jumping: boolean;
  sliding: boolean;
  tripping: boolean;
  queued: LaneMove | null;
  gentle: boolean;
  buttons: boolean;
  count: string;
  line: string;
  /** The Blackout words, then the "+5 m" / "−15 m" chip when it shows (two spaces between). */
  blackout: string;
  /** The "+5 m" / "−15 m" chip alone, '' when hidden; whether it sits under the words (narrow screens). */
  change: string;
  changeBelow: boolean;
  /** Lamp dots lit now (of 6), and whether they show (from 400 px wide). */
  dots: { lit: number; shown: boolean };
  /** Pickups flying to their chips now. */
  flying: number;
  /** Reduced motion's short "+1" on each chip ('' when none). */
  plus: string[];
  /** The first run's look back: seconds into it (only while stage is 'intro'). */
  introT: number;
  /** The corn count showing now (5 to 1), 0 for none. */
  cornCount: number;
  /** Part 25: tilt steers now, its listener is on, lane moves it made this run, the held angle (memory only). */
  tilt: { on: boolean; listening: boolean; moves: number; last: LaneMove | null; centre: number | null; hold: string; sides: boolean };
  hint: string;
  chips: string[];
  gap: number;
  shield: boolean;
  corn: number;
  haul: Haul;
  prize: Haul | null;
  best: number;
  camX: number;
  tally: Record<string, number>;
  peak: number;
  overflow: number;
  things: { kind: string; d: number; lane: number; state: string; pickup: boolean }[];
  steps: number;
  /** Canvas pixels per CSS pixel now (2, or 1.5 or 1 on a slow phone). */
  pixels: number;
  warp(d: number): void;
  /** Sets the Blackout's distance (test only). */
  setGap(m: number): void;
  boxes(): { kind: string; x: number; y: number; w: number; h: number }[];
}

let level: LaneLevel | null = null;
/** The lane level file, read once. */
export function laneLevel(): LaneLevel {
  return (level ??= parseLane(laneData));
}

export class LaneSession {
  sim: LaneSim;
  readonly view = new LaneView();
  /** The lane file this session plays (Lagos's, or a later state's from its part). */
  private readonly lvl: LaneLevel;
  stage: LaneStage = 'off';
  /** Seconds left in "3, 2, 1". */
  private count = 0;
  /** "Go!" shows this long after the count. */
  private goT = 0;
  private caughtT = 0;
  private readonly loop: FixedLoop;
  private readonly swipes = new SwipeReader();
  private readonly buttons: LaneButtons;
  private readonly hud: HTMLDivElement;
  private readonly chipEls: HTMLSpanElement[];
  private readonly chipNums: HTMLSpanElement[];
  private readonly plusEls: HTMLSpanElement[];
  private readonly darkEl: HTMLParagraphElement;
  private readonly leftEl: HTMLDivElement;
  private readonly rightEl: HTMLDivElement;
  private readonly changeEl: HTMLSpanElement;
  private readonly dotsEl: HTMLSpanElement;
  private readonly dotEls: HTMLSpanElement[];
  private readonly toGo: HTMLParagraphElement;
  private readonly bestEl: HTMLParagraphElement;
  private readonly hintEl: HTMLDivElement;
  private readonly sayEl: HTMLDivElement;
  private readonly countEl: HTMLDivElement;
  private readonly soundButton: HTMLButtonElement;
  private card: HTMLElement | null = null;
  private lastFrame = 0;
  private clock = 0;
  private lastHud = '';
  /** Counts of what happened this run (for tests). */
  readonly tally = { stumbles: 0, coins: 0, bursts: 0, goats: 0, bulbs: 0, chips: 0, foods: 0, moves: 0, sideBumps: 0, tosses: 0, shields: 0 };
  private readonly off: (() => void)[] = [];
  /** What is already in the city's buckets from this run. */
  private banked: Haul = { ...NO_HAUL };
  /** The win prize, once the bus stop is reached. */
  private prize: Haul | null = null;
  private save: LaneSave = { best: 0, goals: 0, runs: 0, hints: [], tiltOffered: false, tiltNoes: 0 };
  private bestAtStart = 0;
  /** The "+5 m" / "−15 m" flash and the line in the hint bar, with seconds left. */
  private flash = { text: '', t: 0 };
  private line = { text: '', t: 0 };
  /** The hint showing now and the thing that ends it. */
  private hint: { key: string; until: number } | null = null;
  private warned = false;
  private toldStop = false;
  /** Pixels per CSS pixel at most: 2, then 1.5 and 1 when frames come slowly (like the moving intro's). */
  private pixelCap = 2;
  private slow = { frames: 0, ms: 0 };
  private stepT = 0;
  private steps = 0;
  private meehAt = -Infinity;
  /** S3g1b: when the last lamp went "tunk" (no murmur over it), and the people's frame watch. */
  private tunkAt = -Infinity;
  private readonly folkWatch = new FrameWatch();
  /** Lamps the Blackout has switched off so far (each one goes "tunk"). */
  private lampsOff = 0;
  /** Part 9: pickups on their way to their chips. */
  readonly flights = new PopFlights();
  /** Reduced motion: each chip's short "+1" (what it adds up to, and seconds left). */
  private plus: { amount: number; t: number }[] = [0, 1, 2].map(() => ({ amount: 0, t: 0 }));
  /** The chips' middles (CSS px), measured at the start of a frame while something flies. */
  private chipAt: { x: number; y: number }[] = [];
  /** The flying icons, made once per pixel ratio. */
  private icons: { ratio: number; img: HTMLCanvasElement[] } | null = null;
  /** Part 14: seconds into the first run's look back. */
  private introT = 0;
  /** Part 15: row 2 is measured again after a resize (does "To the bus stop" fit, does the change chip?). */
  private fitDirty = true;
  private stopShort = false;
  private changeBelow = false;
  /** The corn count showing now (it takes the hint bar's place). */
  private countN = 0;
  private countBox: HintBarBox | null = null;
  /** Part 25: tilt to steer. Angles stay in memory, for this run only. */
  private readonly tilt = new TiltReader();
  private tiltListening = false;
  /** When the last reading came (performance.now ms), for "Tilt is not working". */
  private tiltAt = 0;
  private tiltLostShown = false;
  private tiltSpoken = false;
  private tiltMoves = 0;
  private tiltLast: LaneMove | null = null;
  /** The screen's turn at the last reading (90 or 270), for the flip rule. */
  private tiltTurn = 0;
  private readonly holdEl: HTMLDivElement;
  private readonly onTilt = (e: DeviceOrientationEvent): void => this.tiltReading(e);

  constructor(private readonly hooks: LaneHooks) {
    addLaneSounds();
    this.lvl = hooks.level !== undefined ? parseLane(hooks.level) : laneLevel();
    this.view.look = hooks.laneLook ?? null;
    this.view.folk.frontArt = hooks.laneLook?.front ?? null;
    this.sim = new LaneSim(this.lvl, { gentle: hooks.gentle() });
    this.loop = new FixedLoop({ update: (dt) => this.update(dt), render: (a) => this.render(a) });
    this.buttons = new LaneButtons(document.body, WORDS.lane.buttons, (m) => this.press(m));
    const pauseButton = button(WORDS.hud.pause, 'lane-pause', () => this.hooks.askPause(), { 'aria-label': WORDS.hud.pause });
    // Parts 14 and 15: the Sound button beside Pause, 44 x 44.
    this.soundButton = button('', 'lane-pause lane-sound', () => {
      this.hooks.toggleSound();
      this.syncSound();
    });
    this.soundButton.innerHTML = SPEAKER;
    this.syncSound();
    this.chipNums = [0, 1, 2].map(() => h('span', { class: 'lane-chip-n' }));
    this.plusEls = [0, 1, 2].map(() => h('span', { class: 'lane-plus', 'aria-hidden': 'true', hidden: true }));
    this.chipEls = (['naira', 'power', 'tech'] as const).map((k, i) => h('span', { class: `lane-chip ${k}` }, this.chipNums[i]!, this.plusEls[i]!));
    this.darkEl = h('p', { class: 'lane-dark' });
    // Part 15: 6 lamp dots after the Blackout words (the words carry it for screen readers).
    this.dotEls = Array.from({ length: LAMP_DOTS }, () => h('span', { class: 'lane-dot' }));
    this.dotsEl = h('span', { class: 'lane-dots', 'aria-hidden': 'true' }, ...this.dotEls);
    // po's polish note: the "+5 m" / "−15 m" in its own small chip, so "17 m behind" never reads as 22.
    this.changeEl = h('span', { class: 'lane-change', hidden: true });
    this.leftEl = h('div', { class: 'lane-left' }, this.darkEl, this.dotsEl, this.changeEl);
    this.toGo = h('p', { class: 'lane-line' });
    this.bestEl = h('p', { class: 'lane-best', hidden: true });
    this.hintEl = h('div', { class: 'lane-hint', hidden: true });
    this.sayEl = h('div', { class: 'sr-only', 'aria-live': 'polite' });
    this.hud = h(
      'div',
      { class: 'lane-hud', 'data-ui': true },
      h('div', { class: 'lane-row' }, h('div', { class: 'lane-chips' }, ...this.chipEls), h('div', { class: 'lane-buttons-top' }, this.soundButton, pauseButton)),
      h('div', { class: 'lane-row2' }, this.leftEl, (this.rightEl = h('div', { class: 'lane-right' }, this.toGo, this.bestEl))),
      hooks.missionChip ?? null,
      this.hintEl,
      this.sayEl,
    );
    this.countEl = h('div', { class: 'lane-count', 'aria-live': 'assertive' });
    // Part 25.2: "Hold your phone the way you like." under "3, 2, 1" with tilt on (spoken too).
    this.holdEl = h('div', { class: 'lane-hold', 'aria-live': 'polite', hidden: true });
    document.body.append(this.hud, this.countEl, this.holdEl);
    document.body.classList.add('lane');
    this.listen();
    this.resize();
  }

  private listen(): void {
    const on = <K extends keyof WindowEventMap>(type: K, f: (e: WindowEventMap[K]) => void, opts?: AddEventListenerOptions): void => {
      window.addEventListener(type, f, opts);
      this.off.push(() => window.removeEventListener(type, f, opts));
    };
    // Swipes anywhere except the top HUD row and the buttons (part 3).
    const fromUi = (e: Event): boolean => e.target instanceof Element && e.target.closest('button, [data-ui] .lane-row, .screen') !== null;
    on('pointerdown', (e) => {
      if (fromUi(e)) return;
      // Part 14: a tap skips the look back to "3, 2, 1".
      if (this.stage === 'intro') {
        this.countDown();
        return;
      }
      this.swipes.down(e.pointerId, e.clientX, e.clientY, e.timeStamp);
    });
    on('pointermove', (e) => {
      const m = this.swipes.move(e.pointerId, e.clientX, e.clientY, e.timeStamp);
      if (m) this.press(m);
    });
    on('pointerup', (e) => this.swipes.up(e.pointerId));
    on('pointercancel', (e) => this.swipes.up(e.pointerId));
    on('keydown', (e) => {
      const m = keyMove(e.code, e.repeat);
      const skip = this.stage === 'intro' && !e.repeat && (m !== null || e.code === 'Enter');
      if ((!m && !skip) || this.stage === 'off' || this.card) return;
      if (document.querySelector('.screen:not([hidden]) .card')) return;
      e.preventDefault();
      if (skip) this.countDown();
      else if (m) this.press(m);
    });
  }

  private syncSound(): void {
    const on = this.hooks.soundOn();
    this.soundButton.classList.toggle('is-off', !on);
    this.soundButton.setAttribute('aria-label', on ? WORDS.hud.soundOn : WORDS.hud.soundOff);
  }

  /** Part 25.6: one listener, only between "3, 2, 1" and a pause, a card or the end. */
  private listenTilt(on: boolean): void {
    if (on === this.tiltListening) return;
    this.tiltListening = on;
    if (on) {
      this.tiltAt = performance.now();
      window.addEventListener('deviceorientation', this.onTilt);
    } else {
      window.removeEventListener('deviceorientation', this.onTilt);
      this.tilt.pause();
    }
  }

  /** The screen's turn now: 90 or 270 sideways, 0 or 180 upright (older iPhones: -90 is 270). */
  private static turn(): number {
    const o = screen.orientation as ScreenOrientation | undefined;
    const a = o && typeof o.angle === 'number' ? o.angle : (window as unknown as { orientation?: number }).orientation;
    return typeof a === 'number' ? ((Math.round(a) % 360) + 360) % 360 : 90;
  }

  private tiltReading(e: DeviceOrientationEvent): void {
    if ((this.stage !== 'play' && this.stage !== 'count') || typeof e.beta !== 'number') return;
    const now = performance.now();
    this.tiltAt = now;
    const turn = LaneSession.turn();
    const side = turn === 90 || turn === 270;
    // Part 25.2: a flip from 90 to 270 (or back) makes no move; the centre is taken again.
    if (side && this.tiltTurn !== 0 && turn !== this.tiltTurn) this.tilt.flip(now);
    if (side) this.tiltTurn = turn;
    const angle = steerAngle(e.beta, turn);
    if (angle === null) return;
    const m = this.tilt.read(angle, now);
    if (m && this.stage === 'play') {
      this.tiltMoves++;
      this.tiltLast = m;
      this.press(m);
    }
  }

  /** Part 25.4: the phone said no from a run's start tap: swipes, and the line for 3 s. */
  tiltDenied(): void {
    this.listenTilt(false);
    this.say(WORDS.lane.tiltDenied, TILT_LINE);
  }

  /** A move from a swipe, a key or a button: counts only while the run is moving. */
  press(m: LaneMove): void {
    if (this.stage !== 'play') return;
    this.sim.press(m);
  }

  resize(): void {
    const w = window.innerWidth;
    const hgt = window.innerHeight;
    // Part 21: the canvas's own pixels, at most 2 a CSS pixel, fewer on a phone that draws slowly.
    const ratio = Math.min(Math.max(window.devicePixelRatio || 1, 1), 2, this.pixelCap);
    const c = this.hooks.canvas;
    const pw = Math.max(1, Math.round(w * ratio));
    const ph = Math.max(1, Math.round(hgt * ratio));
    if (c.width !== pw || c.height !== ph) {
      c.width = pw;
      c.height = ph;
    }
    this.view.resize(w, hgt, pw / Math.max(1, w));
    this.buttons.place(buttonBoxes(w, hgt, this.hooks.safe()));
    // Part 15: the lamp dots from 400 px wide; "To the bus stop" becomes "Bus stop" only if the
    // two lines still meet (measured on the next frame the HUD shows).
    this.hud.classList.toggle('lane-narrow', w < DOTS_FROM_W);
    this.fitDirty = true;
    this.countBox = laneCountBox(w, hgt, this.hooks.safe().top);
    this.icons = null;
  }

  /**
   * Part 15 and po's polish note: with the longest words row 2 can show ("Blackout: 10 m behind!",
   * the lamp dots, "−15 m" and "To the bus stop: 600 m"), do the two sides meet? Then the right
   * one says "Bus stop: 600 m"; if they still meet, the change chip shows under the Blackout words.
   */
  private fitRow2(): void {
    const w = WORDS.lane;
    this.fitDirty = false;
    this.lastHud = '';
    this.changeEl.classList.remove('below');
    this.hud.classList.remove('change-below');
    this.changeEl.hidden = false;
    this.changeEl.textContent = w.gained(15);
    this.darkEl.textContent = w.blackoutNear(10);
    this.toGo.textContent = w.toGo(600);
    // The row does not wrap: the two sides meet when their widths and the 8 px gap overflow it.
    const row = this.leftEl.parentElement!;
    const meet = (): boolean => this.leftEl.getBoundingClientRect().width + 8 + this.rightEl.getBoundingClientRect().width > row.getBoundingClientRect().width;
    this.stopShort = meet();
    if (this.stopShort) this.toGo.textContent = w.toGoShort(600);
    this.changeBelow = this.stopShort && meet();
    this.changeEl.classList.toggle('below', this.changeBelow);
    this.changeEl.hidden = true;
  }

  /** From 0 m with the Blackout reset: "3, 2, 1", then go. Gentle mode counts from here (Q15). */
  start(): void {
    this.closeCard();
    this.hooks.started?.();
    if (this.sim.gentle !== this.hooks.gentle()) this.sim = new LaneSim(this.lvl, { gentle: this.hooks.gentle() });
    this.sim.reset();
    for (const k of Object.keys(this.tally) as (keyof typeof this.tally)[]) this.tally[k] = 0;
    this.banked = { ...NO_HAUL };
    this.prize = null;
    this.save = this.hooks.laneSave();
    // Part 14: the look back on the first lane run only.
    const first = this.save.runs === 0;
    this.save.runs++;
    this.bestAtStart = this.save.best;
    this.hooks.saveLane(this.save);
    this.flash = { text: '', t: 0 };
    this.line = { text: '', t: 0 };
    this.hint = null;
    this.warned = false;
    this.toldStop = false;
    this.caughtT = 0;
    this.lampsOff = 0;
    this.tunkAt = -Infinity;
    // S3g1b part 11: backing off is forgotten at each new run.
    this.folkWatch.reset();
    this.flights.clear();
    for (const p of this.plus) p.t = 0;
    this.view.camX = 0;
    this.tiltLostShown = false;
    this.tiltSpoken = false;
    this.tiltMoves = 0;
    this.tiltLast = null;
    this.listenTilt(false);
    if (!first && this.hooks.tiltOffer()) {
      this.offerTilt();
      this.loop.start();
      return;
    }
    if (first) {
      this.stage = 'intro';
      this.introT = 0;
      this.swipes.cancel();
      this.loop.resume();
    } else this.countDown();
    this.loop.start();
  }

  private countDown(): void {
    this.introT = 0;
    this.stage = 'count';
    this.count = COUNT_STEP * 3;
    this.goT = 0;
    this.swipes.cancel();
    // Part 25.2: every "3, 2, 1" takes the centre afresh.
    this.tilt.pause();
    this.tilt.count();
    const tilt = this.hooks.tiltOn();
    this.listenTilt(tilt);
    if (tilt && !this.tiltSpoken) {
      this.tiltSpoken = true;
      this.sayEl.textContent = this.hooks.buttonsOn() ? WORDS.lane.tiltSpokenButtons : WORDS.lane.tiltSpoken;
    }
    this.loop.resume();
    // A tap or key that skips the look back lands between frames: show "3" now, so the
    // count on screen always matches the stage (no frame with the stage at "count" and no number).
    this.drawHud();
  }

  /**
   * Part 25.1 (TS-R2): at the start of the second lane run, once, on a phone that can tilt.
   * Either answer (or Android back, "No thanks") stops it coming back.
   */
  private offerTilt(): void {
    const w = WORDS.lane;
    this.hooks.tiltOffered();
    const at = performance.now();
    const soon = (): boolean => performance.now() - at < OFFER_GUARD_MS;
    const go = (): void => {
      this.closeCard();
      this.countDown();
      this.hooks.changed();
    };
    this.showCard(
      w.tiltOfferHeading,
      [w.tiltOfferLine, this.hooks.tiltAsks() ? h('p', { class: 'small' }, w.tiltAskFirst) : null],
      button(w.tiltOfferYes, 'go', () => {
        if (soon()) return;
        // Inside the tap: an iPhone shows Apple's box only then.
        this.hooks.tryTilt();
        go();
      }),
      button(w.tiltOfferNo, 'minor', () => {
        if (!soon()) go();
      }),
    );
    this.card?.classList.add('tilt-offer');
  }

  /** Stops the run on the Pause card (main shows it). The saves are written now (part 20). */
  pause(): void {
    if (this.stage !== 'play' && this.stage !== 'count' && this.stage !== 'intro') return;
    this.stage = 'paused';
    this.loop.pause();
    this.swipes.cancel();
    this.listenTilt(false);
    this.holdEl.hidden = true;
    this.keepBest();
    this.hooks.flush();
  }

  /** "Keep playing": back with "3, 2, 1", then 1.5 s with nothing to trip on. */
  resume(): void {
    if (this.stage !== 'paused') return;
    this.countDown();
  }

  /** "Keep running for more" (part 12). */
  keepRunning(): void {
    if (this.sim.phase !== 'goal') return;
    this.hooks.askTilt();
    this.closeCard();
    this.sim.keepRunning();
    this.countDown();
    this.hooks.changed();
  }

  /** Leaves the lane run: its loop, listeners and screen parts go; what is kept is written. */
  close(): void {
    if (this.stage !== 'off') {
      this.keepBest();
      this.hooks.flush();
    }
    this.stage = 'off';
    this.listenTilt(false);
    this.holdEl.remove();
    this.hooks.music(null);
    this.hooks.closeHum(false);
    this.hooks.corn(null);
    this.loop.stop();
    for (const f of this.off) f();
    this.off.length = 0;
    this.buttons.remove();
    this.hud.remove();
    this.countEl.remove();
    this.closeCard();
    document.body.classList.remove('lane');
  }

  /** In a run with nothing over it (the Android back button pauses then). */
  get running(): boolean {
    return (this.stage === 'play' || this.stage === 'count' || this.stage === 'intro') && !this.card;
  }

  /** This run's pickups, plus the prize once won. */
  get haul(): Haul {
    const s = this.sim;
    const run = { kobo: s.kobo, power: s.power, tech: s.tech };
    return this.prize ? addHaul(run, this.prize) : run;
  }

  /** The Pause card's "So far: ..." line. */
  get soFar(): string {
    return WORDS.lane.soFar(haulWords(this.haul));
  }

  /** LR-Q1 a: pickups go into the buckets the moment you get them. */
  private bank(): void {
    const now = this.haul;
    const delta = subHaul(now, this.banked);
    if (delta.kobo === 0 && delta.power === 0 && delta.tech === 0) return;
    this.banked = now;
    this.hooks.bank(delta);
  }

  /** Part 12: a new best distance (whole metres) is kept at once. */
  private keepBest(): void {
    if (!this.prize) return;
    const m = Math.floor(this.sim.dist);
    if (m > this.save.best) {
      this.save.best = m;
      this.hooks.saveLane(this.save);
    }
  }

  private update(dt: number): void {
    if (this.flash.t > 0) this.flash.t -= dt;
    // A line that comes due during the corn count waits until the count ends (S2.9).
    if (this.line.t > 0 && this.countN === 0) this.line.t -= dt;
    this.flights.step(dt);
    for (const p of this.plus) if (p.t > 0) p.t -= dt;
    if (this.stage === 'intro') {
      this.introT += dt;
      if (this.introT >= INTRO_TIME) this.countDown();
      return;
    }
    if (this.stage === 'count') {
      this.count -= dt;
      if (this.count <= TILT_CALIBRATE_S) this.tilt.collect();
      if (this.count <= 0) {
        this.stage = 'play';
        this.goT = COUNT_STEP;
        this.sim.fresh(AFTER_COUNT_SAFE);
        this.tilt.calibrate();
        this.tiltAt = performance.now();
      }
      return;
    }
    if (this.stage === 'caught') {
      this.caughtT += dt;
      if (this.caughtT >= CAUGHT_TIME) this.caughtCard();
      return;
    }
    if (this.stage !== 'play') return;
    if (this.goT > 0) this.goT -= dt;
    this.watchTilt();
    this.sim.step(dt);
    for (const e of this.sim.events) this.happened(e);
    if (LANE_LEAVE_KEEPS) this.bank();
    this.sounds(dt);
    this.hints();
    this.spoken();
  }

  /**
   * Part 25: the switch can change at once (a no from Apple's box); and with no reading for 1 s
   * the hint bar says once a run that tilt is not working. Swipes carry on as always.
   */
  private watchTilt(): void {
    const on = this.hooks.tiltOn();
    if (on !== this.tiltListening) {
      this.listenTilt(on);
      // Turned on mid-run (a yes that came late): the next reading is the centre.
      if (on) this.tilt.calibrate();
    }
    if (!on || this.tiltLostShown || !this.hooks.tiltReady()) return;
    if (performance.now() - this.tiltAt < TILT_LOST_S * 1000) return;
    this.tiltLostShown = true;
    this.say(WORDS.lane.tiltLost, TILT_LINE);
  }

  /** Part 17: steps, faster as you speed up; a "tunk" as each lamp behind goes off. */
  private sounds(dt: number): void {
    const s = this.sim;
    if (s.moving && s.jumpT < 0 && s.slideT < 0 && s.dropT < 0) {
      this.stepT += dt;
      if (this.stepT >= laneStepGap(s.speed)) {
        this.stepT = 0;
        this.hooks.sound(laneStepFor(this.steps++));
      }
    }
    const off = Math.floor((Math.max(0, DARK_FROM - s.gap) * 0.6) / 10);
    if (off > this.lampsOff) {
      this.hooks.sound('laneTunk');
      this.tunkAt = performance.now();
    }
    this.lampsOff = off;
  }

  private say(text: string, t: number): void {
    this.line = { text, t };
  }

  private happened(e: LaneEvent): void {
    const t = this.tally;
    const w = WORDS.lane;
    let name: string = e.type;
    switch (e.type) {
      case 'move':
        t.moves++;
        name = e.move === 'jump' ? 'jump' : e.move === 'slide' ? 'slide' : 'lane';
        break;
      case 'stumble':
        t.stumbles++;
        break;
      case 'sideBump':
        t.sideBumps++;
        break;
      case 'burst':
        t.bursts++;
        this.popOut(e.kind, this.sim.laneX(e.lane), e.d, 0.5);
        break;
      case 'goat':
        t.goats++;
        this.popOut('goat', this.sim.laneX(e.lane), e.d, 0.5);
        if (this.sim.time - this.meehAt < MEEH_GAP) name = '';
        else this.meehAt = this.sim.time;
        break;
      case 'coin':
        t.coins++;
        this.hooks.sound(laneTinkFor(Math.random()));
        this.fly('naira', 10, 1, this.sim.laneX(e.lane), e.d, e.h);
        break;
      case 'toss':
        t.tosses++;
        break;
      case 'shieldUsed':
        t.shields++;
        this.say(w.shieldTook, SHIELD_LINE);
        break;
      case 'blackout':
        this.flash = { text: e.by > 0 ? w.pushed(Math.round(e.by)) : w.gained(Math.round(-e.by)), t: FLASH_TIME };
        name = '';
        break;
      case 'pickup':
        name = e.kind;
        if (e.kind === 'bulb') {
          t.bulbs++;
          this.fly('power', 1, 1, this.sim.x, this.sim.dist, PICKUP_UP);
        } else if (e.kind === 'chip') {
          t.chips++;
          this.fly('tech', 1, 1, this.sim.x, this.sim.dist, PICKUP_UP);
        } else {
          t.foods++;
          this.say(e.kind === 'garri' ? w.garri : w.corn, FOOD_LINE);
        }
        break;
      case 'garriExtra':
        this.hooks.sound(laneTinkFor(Math.random()));
        this.fly('naira', 10, 3, this.sim.x, this.sim.dist, PICKUP_UP);
        break;
      case 'goal':
        this.reachGoal();
        // S3g1b part 7: the crowd at the bus stop cheers (never over the corn tune).
        if (!(this.sim.corn > 0)) this.hooks.sound('crowdCheerBig');
        break;
      case 'caught':
        this.listenTilt(false);
        this.stage = 'caught';
        this.caughtT = 0;
        this.hint = null;
        break;
      case 'land':
        break;
    }
    const s = LANE_SOUNDS[name];
    if (s) this.hooks.sound(s);
    if (e.type === 'pickup' || e.type === 'burst' || e.type === 'goat') this.hooks.gained?.(this.sim.power, this.sim.tech);
  }

  /** Part 9: what a burst or a goat pops out flies straight to its chip. */
  private popOut(kind: string, x: number, d: number, up: number): void {
    const p = this.sim.level.pops[kind];
    if (!p) return;
    if (p.coins > 0) this.fly('naira', 10, p.coins, x, d, up);
    if (p.power > 0) this.fly('power', 1, p.power, x, d, up);
    if (p.tech > 0) this.fly('tech', 1, p.tech, x, d, up);
  }

  /**
   * Sends `n` pickups of a kind from a road point to their chip. Reduced motion: nothing flies;
   * the chip counts up at once with a short "+1" (part 18).
   */
  private fly(kind: ChipKind, amount: number, n: number, x: number, d: number, up: number): void {
    const i = kind === 'naira' ? 0 : kind === 'power' ? 1 : 2;
    if (this.hooks.still()) {
      const p = this.plus[i]!;
      if (p.t <= 0) p.amount = 0;
      p.amount += amount * n;
      p.t = PLUS_TIME;
      return;
    }
    const v = this.view;
    // Where it was on screen (never from behind the camera or off the screen's sides).
    const ahead = Math.max(d, this.sim.dist - 1);
    const sx = Math.min(Math.max(v.sx(x, ahead), 0), v.w);
    const sy = Math.min(Math.max(v.sy(up, ahead), 0), v.h);
    this.flights.send(kind, amount, n, sx, sy);
  }

  /** Part 8: a hint shows from its distance until its thing is passed; then it counts as seen. */
  private hints(): void {
    const s = this.sim;
    if (s.phase !== 'run') return;
    if (this.hint && s.dist > this.hint.until) {
      if (!this.save.hints.includes(this.hint.key)) this.save.hints.push(this.hint.key);
      this.hooks.saveLane(this.save);
      this.hint = null;
    }
    if (this.hint) return;
    // Part 25.8: with tilt on, the change-lane hint is the tilt one, with its own key.
    const tilt = this.hooks.tiltOn();
    for (const hn of s.level.hints) {
      const key = tilt && hn.key === 'lane' ? 'tilt' : hn.key;
      if (s.dist < hn.d || this.save.hints.includes(key)) continue;
      const kinds = HINT_THING[hn.key] ?? [];
      const at = [...s.level.things, ...s.level.pickups].filter((x) => x.d > hn.d && kinds.includes(x.kind)).sort((a, b) => a.d - b.d)[0];
      if (!at || s.dist > at.d) continue;
      this.hint = { key, until: at.d + 1 };
      break;
    }
  }

  private hintWords(key: string): string {
    const words = WORDS.lane.hints[key];
    if (typeof words === 'string') return words;
    if (!words) return '';
    return (this.hooks.buttonsOn() ? words[1] : this.hooks.touch() ? words[0] : words[2]) ?? '';
  }

  /** Part 14: the polite live lines, once each time. */
  private spoken(): void {
    const s = this.sim;
    if (s.gap < WARN_UNDER && !this.warned) {
      this.warned = true;
      this.sayEl.textContent = WORDS.lane.nearSpoken(Math.ceil(s.gap));
    } else if (s.gap >= WARN_UNDER + 2) this.warned = false;
    if (s.phase === 'run' && !this.toldStop && s.level.goal - s.dist <= 100) {
      this.toldStop = true;
      this.sayEl.textContent = WORDS.lane.stopSpoken;
    }
  }

  private showCard(heading: string, lines: (string | HTMLElement | null)[], big: HTMLButtonElement, small: HTMLButtonElement): void {
    this.stage = 'card';
    this.listenTilt(false);
    this.card = h(
      'div',
      { class: 'screen lane-card', 'data-ui': true },
      h(
        'div',
        { class: 'card narrow event', role: 'dialog', 'aria-label': heading },
        h('h2', {}, heading),
        ...lines.map((l) => (typeof l === 'string' ? h('p', {}, l) : l)),
        h('div', { class: 'actions' }, big, h('div', { class: 'minor-row' }, small)),
      ),
    );
    document.body.append(this.card);
    big.focus({ preventScroll: true });
    this.hooks.changed();
  }

  /** "Take it home": the run ends and everything goes home (part 2). */
  private takeHome(): void {
    this.bank();
    this.hooks.home({ won: this.prize !== null, haul: this.haul });
  }

  private reachGoal(): void {
    const w = WORDS.lane;
    const s = this.sim;
    // Part 9 and decision 45: the prize, grown to the fix's price when the run was for one.
    this.prize = lanePrize({ kobo: s.kobo, power: s.power, tech: s.tech }, s.level.prize, this.hooks.forFix());
    this.bank();
    this.save.goals++;
    this.keepBest();
    this.hooks.saveLane(this.save);
    this.hooks.flush();
    this.hint = null;
    const got = haulWords(this.haul);
    this.showCard(
      w.goalHeading,
      [this.hooks.starLine?.() ?? null, w.got(got)],
      button(w.takeHome, 'go', () => this.takeHome()),
      button(w.keepRunning, 'minor', () => this.keepRunning()),
    );
    // Screen readers hear the money in words.
    this.card?.querySelector('[role=dialog]')?.setAttribute('aria-description', `${w.goalHeading} ${w.got(got).replace(formatMoney(this.haul.kobo), spokenMoney(this.haul.kobo))}`);
  }

  private caughtCard(): void {
    const w = WORDS.lane;
    const s = this.sim;
    this.bank();
    const m = Math.floor(s.dist);
    const won = this.prize !== null;
    this.keepBest();
    this.hooks.flush();
    const got = haulWords(this.haul);
    if (won) {
      this.showCard(
        w.caughtAt(m),
        [this.hooks.starLine?.() ?? null, w.winSafe(got), this.save.best > this.bestAtStart && this.save.best === m ? w.newBest(m) : null],
        button(w.takeHome, 'go', () => this.takeHome()),
        button(w.runAgain, 'minor', () => this.runAgain()),
      );
      return;
    }
    let gentle: HTMLElement | null = null;
    if (!s.gentle && !this.hooks.gentle()) {
      const sw = button(w.gentleOff, 'minor gentle', () => {
        const on = sw.getAttribute('aria-checked') !== 'true';
        this.hooks.setGentle(on);
        sw.setAttribute('aria-checked', String(on));
        sw.textContent = on ? w.gentleOn : w.gentleOff;
      }, { role: 'switch', 'aria-checked': 'false' });
      gentle = h('div', { class: 'gentle-row' }, h('p', { class: 'small' }, w.gentleOffer), sw);
    }
    this.showCard(
      w.caught,
      [this.hooks.starLine?.() ?? null, w.keepAll(got), w.stopWas(Math.max(1, Math.ceil(s.level.goal - s.dist))), gentle],
      button(w.runAgain, 'go', () => this.runAgain()),
      button(w.takeHome, 'minor', () => this.takeHome()),
    );
  }

  /** "Run again": a start tap, so an iPhone may ask first (25.4). */
  private runAgain(): void {
    this.hooks.askTilt();
    this.start();
  }

  private closeCard(): void {
    if (!this.card) return;
    this.card.remove();
    this.card = null;
  }

  /** Read-only state for end to end tests, plus `warp` to jump along the road and `boxes` to see what is drawn. */
  testHook(): LaneTestHook {
    const s = this.sim;
    return {
      stage: this.stage,
      level: this.lvl.id,
      theme: this.lvl.theme,
      phase: s.phase,
      dist: s.dist,
      lane: s.lane,
      x: s.x,
      y: s.y,
      speed: s.speed,
      jumping: s.jumpT >= 0,
      sliding: s.slideT >= 0,
      tripping: s.tripping,
      queued: s.queued,
      gentle: s.gentle,
      buttons: this.buttons.shown,
      count: this.countEl.hidden ? '' : (this.countEl.textContent ?? ''),
      line: this.toGo.textContent ?? '',
      blackout: `${this.darkEl.textContent ?? ''}${this.changeEl.hidden ? '' : `  ${this.changeEl.textContent ?? ''}`}`,
      change: this.changeEl.hidden ? '' : (this.changeEl.textContent ?? ''),
      changeBelow: this.changeBelow,
      dots: { lit: this.dotEls.filter((d) => d.classList.contains('on')).length, shown: !this.hud.classList.contains('lane-narrow') },
      flying: this.flights.list.length,
      plus: this.plusEls.map((p) => (p.hidden ? '' : (p.textContent ?? ''))),
      introT: this.introT,
      cornCount: this.countN,
      tilt: {
        on: this.hooks.tiltOn(),
        listening: this.tiltListening,
        moves: this.tiltMoves,
        last: this.tiltLast,
        centre: Number.isNaN(this.tilt.centre) ? null : this.tilt.centre,
        hold: this.holdEl.hidden ? '' : (this.holdEl.textContent ?? ''),
        sides: this.buttons.sidesShown,
      },
      hint: this.hintEl.hidden ? '' : (this.hintEl.textContent ?? ''),
      chips: this.chipNums.map((c) => c.textContent ?? ''),
      gap: s.gap,
      shield: s.shield,
      corn: s.corn,
      haul: this.haul,
      prize: this.prize,
      best: this.save.best,
      camX: this.view.camX,
      tally: { ...this.tally },
      peak: s.peak,
      overflow: s.overflow,
      things: s.things.filter((t) => t.used).map((t) => ({ kind: t.kind, d: t.d, lane: t.lane, state: t.state, pickup: t.pickup })),
      steps: this.loop.stepCount,
      pixels: this.pixelRatio,
      warp: (d: number) => s.warp(d),
      setGap: (m: number) => {
        s.gap = m;
      },
      boxes: () => {
        this.view.boxes ??= [];
        return this.view.boxes.map((b) => ({ ...b }));
      },
    };
  }

  private pose(): HeroPose {
    const s = this.sim;
    const mv = s.level.move;
    const lean = s.changing ? Math.sign(s.laneX(s.lane) - s.x) : 0;
    const suit = s.shield;
    if (this.stage === 'caught' || (this.card && s.phase === 'over')) return { kind: 'torch', phase: this.stage === 'caught' ? this.caughtT / CAUGHT_TIME : 1, up: 0, lean: 0, suit };
    if (this.card && s.phase === 'goal') return { kind: 'wave', phase: 0, up: 0, lean: 0, suit };
    if (s.tripping) return { kind: 'stumble', phase: s.tripT / mv.stumbleTime, up: s.y, lean, suit };
    if (s.slideT >= 0) return { kind: 'slide', phase: s.slideT / mv.slideTime, up: 0, lean, suit };
    if (s.jumpT >= 0 || s.dropT >= 0) return { kind: 'jump', phase: Math.max(0, s.jumpT) / mv.jumpTime, up: s.y, lean, suit };
    // Four run frames a stride; a stride is about 2.6 m.
    return { kind: 'run', phase: (s.dist / 2.6) % 1, up: 0, lean, suit };
  }

  private render(alpha: number): void {
    if (this.stage === 'off') return;
    const now = performance.now();
    const dt = this.lastFrame ? Math.min(0.1, (now - this.lastFrame) / 1000) : 0;
    this.lastFrame = now;
    this.watchSpeed(dt);
    const still = this.hooks.still();
    this.view.still = still;
    const s = this.sim;
    const moving = this.stage === 'play' && s.moving;
    if (moving || this.stage === 'caught' || this.stage === 'intro') this.clock += dt;
    // Between two physics steps: draw where the hero is by now (alpha of a step).
    const dist = s.dist + (moving ? (s.speed * alpha) / 60 : 0);
    this.view.follow(s.x, dt);
    const night = this.stage === 'caught' ? Math.min(1, this.caughtT / CAUGHT_TIME) : this.card && s.phase === 'over' ? 1 : 0;
    const g = this.hooks.g;
    if (this.stage === 'intro') this.drawIntro(g, still);
    else this.view.draw(g, s, this.hooks.look(), dist, this.clock, this.pose(), night);
    // Measure the chips before the HUD's words change this frame (no forced layout).
    if (this.flights.list.length > 0) this.measureChips();
    this.drawFlights(g);
    this.buttons.show(this.hooks.buttonsOn() && !this.card && this.stage !== 'caught' && this.stage !== 'intro');
    // Part 25.1: with tilt and buttons both on, tilt changes lane and the ◀ ▶ buttons hide.
    this.buttons.sides(!this.hooks.tiltOn());
    this.hud.hidden = this.card !== null;
    this.syncCorn();
    this.drawHud();
    const near = s.gap < WARN_UNDER && s.phase !== 'over';
    this.hooks.closeHum(near && this.stage === 'play');
    // S3g1b: backing off under 45 fps (part 11) and the murmur (part 12).
    if (this.stage === 'play' && dt > 0) this.view.folk.backOff = this.folkWatch.frame(dt * 1000);
    const quiet = near || performance.now() - this.tunkAt < 700 || this.sim.corn > 0;
    this.hooks.murmur?.(this.stage === 'play' && !quiet && this.view.folk.seen >= 5);
    this.hooks.music(s.phase === 'over' && this.stage !== 'caught' ? null : { tempo: laneTempoAt(s.dist, s.level.goal), guitar: !near, held: this.stage === 'paused' });
  }

  /** Part 14: looking back as the far lamps switch off, then the turn to behind the hero. */
  private drawIntro(g: CanvasRenderingContext2D, still: boolean): void {
    const f = introAt(this.introT, still);
    const s = this.sim;
    const look = this.hooks.look();
    const v = this.view;
    if (f.view === 'back') {
      v.drawBack(g, s, look, f.lamps, this.clock);
      return;
    }
    if (f.view === 'front') {
      v.draw(g, s, look, s.dist, this.clock, this.pose(), 0);
      return;
    }
    // The turn: the look back slides out to one side as the road ahead slides in.
    const w = v.w;
    const cut = Math.round((1 - f.turn) * w);
    const clip = (x0: number, x1: number, draw: () => void): void => {
      g.save();
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.beginPath();
      g.rect(x0 * (g.canvas.width / Math.max(1, w)), 0, (x1 - x0) * (g.canvas.width / Math.max(1, w)), g.canvas.height);
      g.clip();
      draw();
      g.restore();
    };
    clip(0, cut, () => v.drawBack(g, s, look, 1, this.clock, cut - w));
    clip(cut, w, () => v.draw(g, s, look, s.dist, this.clock, this.pose(), 0, cut));
  }

  /** The chips' middles now (CSS px): where the flying pickups land. */
  private measureChips(): void {
    this.chipAt = this.chipEls.map((c) => {
      const r = c.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
  }

  /** Part 9: each pickup on its way to its chip, art's flight path (lanePopAt) and bucket icon. */
  private drawFlights(g: CanvasRenderingContext2D): void {
    const list = this.flights.list;
    if (list.length === 0 || this.chipAt.length < 3 || this.card) return;
    const ratio = this.hooks.canvas.width / Math.max(1, window.innerWidth);
    if (!this.icons || this.icons.ratio !== ratio) {
      const size = Math.ceil(FLY_PX * ratio) + 4;
      const img = (['naira', 'power', 'tech'] as const).map((k) => {
        const c = document.createElement('canvas');
        c.width = c.height = size;
        const cg = c.getContext('2d');
        if (cg) drawBucketIcon(cg, k, size / 2, size / 2, FLY_PX * ratio);
        return c;
      });
      this.icons = { ratio, img };
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    for (const f of list) {
      const i = f.kind === 'naira' ? 0 : f.kind === 'power' ? 1 : 2;
      const to = this.chipAt[i]!;
      const at = PopFlights.at(f, to.x, to.y);
      if (!at) continue;
      const img = this.icons.img[i]!;
      g.drawImage(img, Math.round(at.x * ratio - img.width / 2), Math.round(at.y * ratio - img.height / 2));
    }
  }

  /** Part 11: the corn tune and its count follow the corn timer, as on the streets. */
  private syncCorn(): void {
    const s = this.sim;
    const on = this.stage === 'play' || this.stage === 'count' || this.stage === 'paused';
    if (!on || !this.countBox) {
      this.countN = 0;
      this.hooks.corn(null);
      return;
    }
    this.countN = cornCount(Math.ceil(s.corn * 60));
    this.hooks.corn({ left: s.corn, held: this.stage === 'paused', box: this.countBox });
  }

  /**
   * A cheap phone that cannot keep 50 frames a second draws the road with fewer pixels: 2 per
   * CSS pixel, then 1.5, then 1 (checked over 1.5 s of play at a time). It never goes back up.
   */
  private watchSpeed(dt: number): void {
    if ((this.stage !== 'play' && this.stage !== 'count' && this.stage !== 'intro') || dt <= 0 || dt > 0.25 || this.pixelCap <= 1) return;
    this.slow.frames++;
    this.slow.ms += dt * 1000;
    if (this.slow.ms < 1500) return;
    const mean = this.slow.ms / this.slow.frames;
    this.slow = { frames: 0, ms: 0 };
    if (mean <= 20) return;
    this.pixelCap = this.pixelCap > 1.5 ? 1.5 : 1;
    this.resize();
  }

  /** Pixels per CSS pixel the road is drawn at now (tests). */
  get pixelRatio(): number {
    return this.hooks.canvas.width / Math.max(1, window.innerWidth);
  }

  /** The HUD, the hint bar and the count: the DOM only changes when the words do. */
  private drawHud(): void {
    if (this.fitDirty && !this.hud.hidden) this.fitRow2();
    const w = WORDS.lane;
    const s = this.sim;
    // Each chip counts up as its flying pickup lands (the bucket already has it: LR-Q1 a).
    const all = this.haul;
    const air = this.flights.inFlight();
    const haul = { kobo: all.kobo - air.kobo, power: all.power - air.power, tech: all.tech - air.tech };
    const gap = Math.max(0, Math.ceil(s.gap));
    const dark = gap < WARN_UNDER ? w.blackoutNear(gap) : w.blackout(gap);
    const change = this.flash.t > 0 ? this.flash.text : '';
    const lit = litDots(s.gap);
    const left = Math.max(0, Math.ceil(s.level.goal - s.dist));
    const line = s.phase === 'run' ? (this.stopShort ? w.toGoShort(left) : w.toGo(left)) : w.run(Math.floor(s.dist));
    const best = s.phase === 'run' ? '' : w.best(Math.max(this.save.best, this.prize ? Math.floor(s.dist) : 0));
    const n = this.stage === 'count' ? w.count[Math.min(2, Math.floor((COUNT_STEP * 3 - this.count) / COUNT_STEP))]! : this.goT > 0 ? w.go : '';
    let hint = this.line.t > 0 ? this.line.text : this.hint ? this.hintWords(this.hint.key) : '';
    if (this.stage === 'intro') {
      const f = introAt(this.introT, this.hooks.still());
      hint = f.line === 0 ? w.lookBack : f.line === 1 ? w.runToStop : `${w.lookBack} ${w.runToStop}`;
    }
    // The corn count takes the hint bar's place; the hint waits (S2.9).
    if (this.countN > 0) hint = '';
    const chips = [formatMoney(haul.kobo), w.power(haul.power), w.tech(haul.tech)];
    const plus = this.plus.map((p, i) => (p.t > 0 && p.amount > 0 ? w.plus(i === 0 ? formatMoney(p.amount) : String(p.amount)) : ''));
    const key = `${chips.join()}|${dark}|${change}|${lit}|${line}|${best}|${n}|${hint}|${plus.join()}|${this.stage === 'count' && this.tiltListening}`;
    if (key === this.lastHud) return;
    this.lastHud = key;
    chips.forEach((c, i) => {
      this.chipNums[i]!.textContent = c;
    });
    plus.forEach((p, i) => {
      const el = this.plusEls[i]!;
      if (el.textContent !== p) el.textContent = p;
      el.hidden = p === '';
    });
    this.darkEl.textContent = dark;
    this.darkEl.classList.toggle('near', gap < WARN_UNDER);
    if (this.changeEl.textContent !== change || this.changeEl.hidden !== (change === '')) {
      this.changeEl.textContent = change;
      this.changeEl.hidden = change === '';
      // Under the words (narrow screens): the hint bar steps down for that second, so nothing overlaps.
      this.hud.classList.toggle('change-below', this.changeBelow && change !== '');
      this.changeEl.classList.toggle('up', change.startsWith('+'));
      // A fresh float each time (none with reduced motion: screens.css).
      this.changeEl.classList.remove('float');
      if (change) {
        void this.changeEl.offsetWidth;
        this.changeEl.classList.add('float');
      }
    }
    this.dotEls.forEach((d, i) => d.classList.toggle('on', i < lit));
    this.toGo.textContent = line;
    this.toGo.setAttribute('aria-label', s.phase === 'run' ? w.toGo(left) : line);
    this.bestEl.textContent = best;
    this.bestEl.hidden = best === '';
    this.countEl.textContent = n;
    this.countEl.hidden = n === '';
    const hold = this.stage === 'count' && this.tiltListening ? w.tiltHold : '';
    if (this.holdEl.textContent !== hold) this.holdEl.textContent = hold;
    this.holdEl.hidden = hold === '';
    this.hintEl.textContent = hint;
    this.hintEl.hidden = hint === '';
  }
}
