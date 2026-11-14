/**
 * One lane run on screen. S3f2: its own fixed-step loop on the game canvas, the camera and the
 * road, swipes, keys and the four buttons, "3, 2, 1" on every start and resume. S3f3: the
 * Blackout, the buckets, the food, the HUD and hint bar, the goal and caught cards, "Keep running",
 * the best distance and the `lane` save. main.ts loads this file only when a lane run opens, so
 * none of it is in the first load.
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
import { LaneButtons, SwipeReader, buttonBoxes, keyMove } from './input';
import { parseLane, type LaneLevel } from './level';
import { NO_HAUL, addHaul, haulWords, lanePrize, subHaul, type Haul, type LaneSave } from './rewards';
import { LaneSim, type LaneEvent, type LaneMove } from './sim';
import { DARK_FROM, LaneView, WARN_UNDER, type HeroPose } from './view';

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
}

export type LaneStage = 'count' | 'play' | 'paused' | 'caught' | 'card' | 'off';

export interface LaneTestHook {
  stage: LaneStage;
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
  blackout: string;
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
  private readonly darkEl: HTMLParagraphElement;
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
  private save: LaneSave = { best: 0, goals: 0, runs: 0, hints: [] };
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
  /** Lamps the Blackout has switched off so far (each one goes "tunk"). */
  private lampsOff = 0;

  constructor(private readonly hooks: LaneHooks) {
    addLaneSounds();
    this.sim = new LaneSim(laneLevel(), { gentle: hooks.gentle() });
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
    this.chipEls = [h('span', { class: 'lane-chip naira' }), h('span', { class: 'lane-chip power' }), h('span', { class: 'lane-chip tech' })];
    this.darkEl = h('p', { class: 'lane-dark' });
    this.toGo = h('p', { class: 'lane-line' });
    this.bestEl = h('p', { class: 'lane-best', hidden: true });
    this.hintEl = h('div', { class: 'lane-hint', hidden: true });
    this.sayEl = h('div', { class: 'sr-only', 'aria-live': 'polite' });
    this.hud = h(
      'div',
      { class: 'lane-hud', 'data-ui': true },
      h('div', { class: 'lane-row' }, h('div', { class: 'lane-chips' }, ...this.chipEls), h('div', { class: 'lane-buttons-top' }, this.soundButton, pauseButton)),
      h('div', { class: 'lane-row2' }, this.darkEl, h('div', { class: 'lane-right' }, this.toGo, this.bestEl)),
      this.hintEl,
      this.sayEl,
    );
    this.countEl = h('div', { class: 'lane-count', 'aria-live': 'assertive' });
    document.body.append(this.hud, this.countEl);
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
      if (!m || this.stage === 'off' || this.card) return;
      if (document.querySelector('.screen:not([hidden]) .card')) return;
      e.preventDefault();
      this.press(m);
    });
  }

  private syncSound(): void {
    const on = this.hooks.soundOn();
    this.soundButton.classList.toggle('is-off', !on);
    this.soundButton.setAttribute('aria-label', on ? WORDS.hud.soundOn : WORDS.hud.soundOff);
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
    // Part 15: under 400 px wide, "To the bus stop" may become "Bus stop" if the two lines meet.
    this.hud.classList.toggle('lane-narrow', w < 400);
  }

  /** From 0 m with the Blackout reset: "3, 2, 1", then go. Gentle mode counts from here (Q15). */
  start(): void {
    this.closeCard();
    if (this.sim.gentle !== this.hooks.gentle()) this.sim = new LaneSim(laneLevel(), { gentle: this.hooks.gentle() });
    this.sim.reset();
    for (const k of Object.keys(this.tally) as (keyof typeof this.tally)[]) this.tally[k] = 0;
    this.banked = { ...NO_HAUL };
    this.prize = null;
    this.save = this.hooks.laneSave();
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
    this.view.camX = 0;
    this.countDown();
    this.loop.start();
  }

  private countDown(): void {
    this.stage = 'count';
    this.count = COUNT_STEP * 3;
    this.goT = 0;
    this.swipes.cancel();
    this.loop.resume();
  }

  /** Stops the run on the Pause card (main shows it). The saves are written now (part 20). */
  pause(): void {
    if (this.stage !== 'play' && this.stage !== 'count') return;
    this.stage = 'paused';
    this.loop.pause();
    this.swipes.cancel();
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
    this.hooks.music(null);
    this.hooks.closeHum(false);
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
    return (this.stage === 'play' || this.stage === 'count') && !this.card;
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
    if (this.line.t > 0) this.line.t -= dt;
    if (this.stage === 'count') {
      this.count -= dt;
      if (this.count <= 0) {
        this.stage = 'play';
        this.goT = COUNT_STEP;
        this.sim.fresh(AFTER_COUNT_SAFE);
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
    this.sim.step(dt);
    for (const e of this.sim.events) this.happened(e);
    if (LANE_LEAVE_KEEPS) this.bank();
    this.sounds(dt);
    this.hints();
    this.spoken();
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
    if (off > this.lampsOff) this.hooks.sound('laneTunk');
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
        break;
      case 'goat':
        t.goats++;
        if (this.sim.time - this.meehAt < MEEH_GAP) name = '';
        else this.meehAt = this.sim.time;
        break;
      case 'coin':
        t.coins++;
        this.hooks.sound(laneTinkFor(Math.random()));
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
        if (e.kind === 'bulb') t.bulbs++;
        else if (e.kind === 'chip') t.chips++;
        else {
          t.foods++;
          this.say(e.kind === 'garri' ? w.garri : w.corn, FOOD_LINE);
        }
        break;
      case 'garriExtra':
        this.hooks.sound(laneTinkFor(Math.random()));
        break;
      case 'goal':
        this.reachGoal();
        break;
      case 'caught':
        this.stage = 'caught';
        this.caughtT = 0;
        this.hint = null;
        break;
      case 'land':
        break;
    }
    const s = LANE_SOUNDS[name];
    if (s) this.hooks.sound(s);
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
    for (const hn of s.level.hints) {
      if (s.dist < hn.d || this.save.hints.includes(hn.key)) continue;
      const kinds = HINT_THING[hn.key] ?? [];
      const at = [...s.level.things, ...s.level.pickups].filter((x) => x.d > hn.d && kinds.includes(x.kind)).sort((a, b) => a.d - b.d)[0];
      if (!at || s.dist > at.d) continue;
      this.hint = { key: hn.key, until: at.d + 1 };
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
      [w.got(got)],
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
        [w.winSafe(got), this.save.best > this.bestAtStart && this.save.best === m ? w.newBest(m) : null],
        button(w.takeHome, 'go', () => this.takeHome()),
        button(w.runAgain, 'minor', () => this.start()),
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
      [w.keepAll(got), w.stopWas(Math.max(1, Math.ceil(s.level.goal - s.dist))), gentle],
      button(w.runAgain, 'go', () => this.start()),
      button(w.takeHome, 'minor', () => this.takeHome()),
    );
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
      blackout: this.darkEl.textContent ?? '',
      hint: this.hintEl.hidden ? '' : (this.hintEl.textContent ?? ''),
      chips: this.chipEls.map((c) => c.textContent ?? ''),
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
    this.view.still = this.hooks.still();
    const s = this.sim;
    const moving = this.stage === 'play' && s.moving;
    if (moving || this.stage === 'caught') this.clock += dt;
    // Between two physics steps: draw where the hero is by now (alpha of a step).
    const dist = s.dist + (moving ? (s.speed * alpha) / 60 : 0);
    this.view.follow(s.x, dt);
    const night = this.stage === 'caught' ? Math.min(1, this.caughtT / CAUGHT_TIME) : this.card && s.phase === 'over' ? 1 : 0;
    this.view.draw(this.hooks.g, s, this.hooks.look(), dist, this.clock, this.pose(), night);
    this.buttons.show(this.hooks.buttonsOn() && !this.card && this.stage !== 'caught');
    this.hud.hidden = this.card !== null;
    this.drawHud();
    const near = s.gap < WARN_UNDER && s.phase !== 'over';
    this.hooks.closeHum(near && this.stage === 'play');
    this.hooks.music(s.phase === 'over' && this.stage !== 'caught' ? null : { tempo: laneTempoAt(s.dist, s.level.goal), guitar: !near, held: this.stage === 'paused' });
  }

  /**
   * A cheap phone that cannot keep 50 frames a second draws the road with fewer pixels: 2 per
   * CSS pixel, then 1.5, then 1 (checked over 1.5 s of play at a time). It never goes back up.
   */
  private watchSpeed(dt: number): void {
    if ((this.stage !== 'play' && this.stage !== 'count') || dt <= 0 || dt > 0.25 || this.pixelCap <= 1) return;
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
    const w = WORDS.lane;
    const s = this.sim;
    const haul = this.haul;
    const gap = Math.max(0, Math.ceil(s.gap));
    const dark = `${gap < WARN_UNDER ? w.blackoutNear(gap) : w.blackout(gap)}${this.flash.t > 0 ? `  ${this.flash.text}` : ''}`;
    const left = Math.max(0, Math.ceil(s.level.goal - s.dist));
    const narrow = this.hud.classList.contains('lane-narrow');
    const line = s.phase === 'run' ? (narrow ? w.toGoShort(left) : w.toGo(left)) : w.run(Math.floor(s.dist));
    const best = s.phase === 'run' ? '' : w.best(Math.max(this.save.best, this.prize ? Math.floor(s.dist) : 0));
    const n = this.stage === 'count' ? w.count[Math.min(2, Math.floor((COUNT_STEP * 3 - this.count) / COUNT_STEP))]! : this.goT > 0 ? w.go : '';
    const hint = this.line.t > 0 ? this.line.text : this.hint ? this.hintWords(this.hint.key) : '';
    const chips = [formatMoney(haul.kobo), w.power(haul.power), w.tech(haul.tech)];
    const key = `${chips.join()}|${dark}|${line}|${best}|${n}|${hint}`;
    if (key === this.lastHud) return;
    this.lastHud = key;
    chips.forEach((c, i) => {
      this.chipEls[i]!.textContent = c;
    });
    this.darkEl.textContent = dark;
    this.darkEl.classList.toggle('near', gap < WARN_UNDER);
    this.toGo.textContent = line;
    this.toGo.setAttribute('aria-label', s.phase === 'run' ? w.toGo(left) : line);
    this.bestEl.textContent = best;
    this.bestEl.hidden = best === '';
    this.countEl.textContent = n;
    this.countEl.hidden = n === '';
    this.hintEl.textContent = hint;
    this.hintEl.hidden = hint === '';
  }
}
