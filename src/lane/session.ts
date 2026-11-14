/**
 * One lane run on screen (S3f2): its own fixed-step loop on the game canvas, the camera and the
 * road, swipes, keys and the four buttons, "3, 2, 1" on every start and resume, and the goal.
 * main.ts loads this file only when a lane run opens, so it is not in the first load.
 */
import laneData from '../data/levels/lagos-lane.json';
import type { HeroLook } from '../art/hero';
import { FixedLoop } from '../engine/loop';
import type { SoundName } from '../engine/sound';
import { button, h } from '../screens/dom';
import { WORDS } from '../screens/words';
import type { HeroPose } from './art';
import { LaneButtons, SwipeReader, buttonBoxes, keyMove } from './input';
import { parseLane, type LaneLevel } from './level';
import { LaneSim, type LaneEvent, type LaneMove } from './sim';
import { LaneView } from './view';

export { setLaneArt, PLAIN_ART } from './art';

/** "3, 2, 1": each number shows this long, then "Go!" while the run starts (part 14). */
export const COUNT_STEP = 0.6;
/** Part 7 rule 6: nothing to dodge in the 1.5 s after "3, 2, 1" on any resume. */
export const AFTER_COUNT_SAFE = 1.5;

/** Which sound each lane event plays, from the game's own sounds until art's lane sounds land (S3f1). */
export const LANE_SOUNDS: Partial<Record<string, SoundName>> = {
  jump: 'jump',
  slide: 'skid',
  stumble: 'hit',
  sideBump: 'bounce',
  burst: 'cratePop',
  goat: 'meeh',
  coin: 'kobo',
  bulb: 'payBulb',
  chip: 'dashReady',
  garri: 'food',
  corn: 'food',
  goal: 'checkpoint',
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
  /** Safe edges in CSS px. */
  safe(): { top: number; right: number; bottom: number; left: number };
  sound(name: SoundName): void;
  /** Ask main to pause (the Pause button): it shows the Pause card and calls pause() here. */
  askPause(): void;
  /** The run reached the bus stop: the goal card shows. */
  goal(): void;
  /** "Take it home" on the goal card. */
  takeHome(): void;
}

export type LaneStage = 'count' | 'play' | 'paused' | 'card' | 'off';

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
  camX: number;
  tally: Record<string, number>;
  peak: number;
  overflow: number;
  things: { kind: string; d: number; lane: number; state: string; pickup: boolean }[];
  steps: number;
  warp(d: number): void;
  boxes(): { kind: string; x: number; y: number; w: number; h: number }[];
}

let level: LaneLevel | null = null;
/** The lane level file, read once. */
export function laneLevel(): LaneLevel {
  return (level ??= parseLane(laneData));
}

export class LaneSession {
  readonly sim: LaneSim;
  readonly view = new LaneView();
  stage: LaneStage = 'off';
  /** Seconds left in "3, 2, 1". */
  private count = 0;
  /** "Go!" shows this long after the count. */
  private goT = 0;
  private readonly loop: FixedLoop;
  private readonly swipes = new SwipeReader();
  private readonly buttons: LaneButtons;
  private readonly hud: HTMLDivElement;
  private readonly toGo: HTMLParagraphElement;
  private readonly countEl: HTMLDivElement;
  private card: HTMLElement | null = null;
  private lastFrame = 0;
  private clock = 0;
  private lastHud = '';
  /** Counts of what happened this run (for tests and, in S3f3, the cards). */
  readonly tally = { stumbles: 0, coins: 0, bursts: 0, goats: 0, bulbs: 0, chips: 0, foods: 0, moves: 0, sideBumps: 0 };
  private readonly off: (() => void)[] = [];

  constructor(private readonly hooks: LaneHooks) {
    this.sim = new LaneSim(laneLevel(), { gentle: hooks.gentle() });
    this.loop = new FixedLoop({ update: (dt) => this.update(dt), render: (a) => this.render(a) });
    this.buttons = new LaneButtons(document.body, WORDS.lane.buttons, (m) => this.press(m));
    const pauseButton = button(WORDS.hud.pause, 'lane-pause', () => this.hooks.askPause(), { 'aria-label': WORDS.hud.pause });
    this.toGo = h('p', { class: 'lane-line' });
    this.hud = h('div', { class: 'lane-hud', 'data-ui': true }, h('div', { class: 'lane-row' }, h('span', {}), pauseButton), h('div', { class: 'lane-row2' }, h('span', {}), this.toGo));
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

  /** A move from a swipe, a key or a button: counts only while the run is moving. */
  press(m: LaneMove): void {
    if (this.stage !== 'play') return;
    this.sim.press(m);
  }

  resize(): void {
    const w = window.innerWidth;
    const hgt = window.innerHeight;
    this.view.resize(w, hgt, this.hooks.canvas.width / Math.max(1, w));
    this.buttons.place(buttonBoxes(w, hgt, this.hooks.safe()));
  }

  /** From 0 m: "3, 2, 1", then go. */
  start(): void {
    this.closeCard();
    this.sim.reset();
    for (const k of Object.keys(this.tally) as (keyof typeof this.tally)[]) this.tally[k] = 0;
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

  /** Stops the run on the Pause card (main shows it). */
  pause(): void {
    if (this.stage !== 'play' && this.stage !== 'count') return;
    this.stage = 'paused';
    this.loop.pause();
    this.swipes.cancel();
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
  }

  /** Leaves the lane run: its loop, listeners and screen parts go. */
  close(): void {
    this.stage = 'off';
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

  private update(dt: number): void {
    if (this.stage === 'count') {
      this.count -= dt;
      if (this.count <= 0) {
        this.stage = 'play';
        this.goT = COUNT_STEP;
        this.sim.fresh(AFTER_COUNT_SAFE);
      }
      return;
    }
    if (this.stage !== 'play') return;
    if (this.goT > 0) this.goT -= dt;
    this.sim.step(dt);
    for (const e of this.sim.events) this.happened(e);
  }

  private happened(e: LaneEvent): void {
    const t = this.tally;
    let name: string = e.type;
    switch (e.type) {
      case 'move':
        t.moves++;
        name = e.move === 'jump' ? 'jump' : e.move === 'slide' ? 'slide' : '';
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
        break;
      case 'coin':
        t.coins++;
        break;
      case 'pickup':
        name = e.kind;
        if (e.kind === 'bulb') t.bulbs++;
        else if (e.kind === 'chip') t.chips++;
        else t.foods++;
        break;
      case 'goal':
        this.reachGoal();
        break;
      case 'land':
        break;
    }
    const s = LANE_SOUNDS[name];
    if (s) this.hooks.sound(s);
  }

  private reachGoal(): void {
    this.stage = 'card';
    const w = WORDS.lane;
    const take = button(w.takeHome, 'go', () => this.hooks.takeHome());
    const more = button(w.keepRunning, 'minor', () => this.keepRunning());
    this.card = h(
      'div',
      { class: 'screen lane-card', 'data-ui': true },
      h('div', { class: 'card narrow event', role: 'dialog', 'aria-label': w.goalHeading }, h('h2', {}, w.goalHeading), h('div', { class: 'actions' }, take, h('div', { class: 'minor-row' }, more))),
    );
    document.body.append(this.card);
    take.focus({ preventScroll: true });
    this.hooks.goal();
  }

  private closeCard(): void {
    this.card?.remove();
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
      camX: this.view.camX,
      tally: { ...this.tally },
      peak: s.peak,
      overflow: s.overflow,
      things: s.things.filter((t) => t.used).map((t) => ({ kind: t.kind, d: t.d, lane: t.lane, state: t.state, pickup: t.pickup })),
      steps: this.loop.stepCount,
      warp: (d: number) => s.warp(d),
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
    if (s.tripping) return { kind: 'stumble', phase: s.tripT / mv.stumbleTime, up: s.y, lean };
    if (s.slideT >= 0) return { kind: 'slide', phase: s.slideT / mv.slideTime, up: 0, lean };
    if (s.jumpT >= 0 || s.dropT >= 0) return { kind: 'jump', phase: Math.max(0, s.jumpT) / mv.jumpTime, up: s.y, lean };
    // Four run frames a stride; a stride is about 2.6 m.
    return { kind: 'run', phase: (s.dist / 2.6) % 1, up: 0, lean };
  }

  private render(alpha: number): void {
    if (this.stage === 'off') return;
    const now = performance.now();
    const dt = this.lastFrame ? Math.min(0.1, (now - this.lastFrame) / 1000) : 0;
    this.lastFrame = now;
    this.view.still = this.hooks.still();
    const moving = this.stage === 'play' && this.sim.moving;
    if (moving) this.clock += dt;
    // Between two physics steps: draw where the hero is by now (alpha of a step).
    const dist = this.sim.dist + (moving ? (this.sim.speed * alpha) / 60 : 0);
    this.view.follow(this.sim.x, dt);
    this.view.draw(this.hooks.g, this.sim, this.hooks.look(), dist, this.clock, this.pose());
    this.buttons.show(this.hooks.buttonsOn() && !this.card);
    // The HUD and the count: the DOM only changes when the words do.
    const left = Math.max(0, Math.ceil(this.sim.level.goal - this.sim.dist));
    const line = this.sim.phase === 'run' ? WORDS.lane.toGo(left) : WORDS.lane.run(Math.floor(this.sim.dist));
    const n = this.stage === 'count' ? WORDS.lane.count[Math.min(2, Math.floor((COUNT_STEP * 3 - this.count) / COUNT_STEP))]! : this.goT > 0 ? WORDS.lane.go : '';
    const key = `${line}|${n}`;
    if (key !== this.lastHud) {
      this.lastHud = key;
      this.toGo.textContent = line;
      this.countEl.textContent = n;
      this.countEl.hidden = n === '';
    }
  }
}
