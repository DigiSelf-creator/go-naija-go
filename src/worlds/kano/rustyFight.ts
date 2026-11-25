/**
 * K5b: Rusty Borehole in Borehole Hall (docs/kano.md 5.2 to 5.5). Pure rules, no drawing, sound
 * or DOM, in the pattern of Ogun's King Pothole (ogun/potholeFight.ts): the fight runs each hall
 * step with the run's own helpers (Run, run.ts), so the first load only knows the ArenaRules
 * shape. Like every file in this folder it imports no value from outside it (KN-R10).
 *
 * One rule, three times: bump the stuck valve from below with the head (as a crate, design.md
 * S2.4), after a held bounce on the springy cloth under it or a double jump. Left, middle, right.
 *
 * - He never moves: a wall to the hero (the hall file's rightLimit).
 * - Each cough is warned: a 0.5 s wheeze before a whirl, 0.6 s of puffing before a gust.
 * - A whirl rolls from his feet toward the hero (60 u/s; Gentle 45) and puffs apart at the left
 *   wall. Landed on from above it is a bounce (the run's own whirl rule), from the side a life,
 *   back to x 50 (the garri parcel's shield takes one).
 * - A gust (from the first valve) cuts the air speed toward him to 0.75 for 2 s (Gentle 0.875).
 * - He holds his breath: no new whirl leaves him from a cloth bounce until the hero's feet touch
 *   the floor (landing on a cloth again does not count). A whirl due then waits at his mouth,
 *   wheezing, and rolls out 0.5 s after the hero lands (boss.heldWhirlDelay).
 * - KN-R15 (as Pothole Hall's OG-R25): a whirl never appears touching the hero. While the hero
 *   stands (or hops) within whirl.clearGap u of the whirl's box at his mouth, a whirl due waits
 *   there, wheezing, and rolls out heldWhirlDelay after the hero has stepped clear; so it is
 *   always seen leaving him before it can reach anyone. If it has waited boss.huff.after s (Gentle
 *   2.4) with the hero still there, he gives a soft "Hmph!" puff (no hurt): the hero slides back
 *   left (their walking held only during the slide) until they have gone huff.back u and been
 *   clear heldWhirlDelay s, and the whirl rolls out as the slide ends. The first a try: a hint.
 * - KN-R14: each phase's valve is shut tight ("WAIT": a head bump only goes "clonk") until the
 *   phase's first whirl has left him; then it shakes loose ("STUCK") and stays ready for the
 *   phase (boss.valveNeedsWhirl). So every phase has a whirl to beat, and he only coughs once
 *   the hero is down. Bouncing 3 s on a "WAIT" valve: one hint a try (boss.waitHintAfter).
 * - KN-R16: once the valve has said "STUCK" for boss.valveHint.after s (Gentle gentleAfter) with
 *   no hit, the hint arrows show (one over the hero's head pointing to that valve's cloth, one
 *   pointing down at the valve), hidden while the hero is over that cloth, gone on the hit, back
 *   each phase. The first arrows of a try bring "Go back! Bounce under the valve!". No rule changes.
 * - A hit: every whirl puffs apart, the gust ends, no coughs for 1.5 s, then the next phase.
 *   Gentle mode: every cough 0.4 s later.
 * - The third valve: the funny, kind finish (5.5), the Win at 6 s. Nothing can hurt the hero.
 */
import type { ArenaRules, HazardState, Run, RunEvent } from '../../game/run';
import type { SoundName } from '../../engine/sound';
import { rustyTapTimes } from './boreholeHall';
import { boreholeArrowsSeen, boreholeHallSeen } from './boreholeHallSkin';
import { KANO_WORDS } from './words';

/**
 * The run's own numbers this fight uses (run.ts RULES, HAZARD_BOX.whirl, STEPS_PER_SECOND and
 * crates.ts CRATE_RULES; a unit test keeps them the same). Copied: the part imports no value
 * from the first load.
 */
export const RUN_NUMBERS = { heroHalfW: 7, heroH: 44, parcelWordsSteps: 90, whirlHalfW: 15, headGrace: 4, bumpVy: 60, steps: 60 } as const;
const STEPS = RUN_NUMBERS.steps;
const secs = (s: number): number => Math.round(s * STEPS);

export type RustyCough = 'whirl' | 'gust';

export interface RustyPhase {
  every: number;
  pattern: readonly RustyCough[];
  bpm: number;
}

/** Rusty Borehole's block of kano-hall.json (kano.md 5.2 to 5.5). */
export interface RustyData {
  leftLimit: number;
  rightLimit: number;
  spawnX: number;
  groundY: number;
  body: readonly [number, number];
  valves: { x: readonly number[]; bottom: number; w: number; h: number };
  springs: { w: number; h: number; vy: number };
  taps: number;
  startDelay: number;
  wheeze: number;
  breakAfterHit: number;
  holdBreath: boolean;
  /** KN-R14: a whirl due while he holds his breath leaves this long after the hero lands, s. */
  heldWhirlDelay: number;
  /** KN-R14: each phase's valve stays shut ("WAIT") until the phase's first whirl has left him. */
  valveNeedsWhirl: boolean;
  /** KN-R14: the "Come down and let him cough!" hint after this long bouncing on a "WAIT" valve, s. */
  waitHintAfter: number;
  /** KN-R16: the hint arrows show once the valve has said "STUCK" this long with no hit, s (Gentle: gentleAfter). */
  valveHint: { after: number; gentleAfter: number };
  phases: readonly RustyPhase[];
  /** KN-R15: clearGap, u of clear floor a whirl needs between its box and the hero's to leave him (0: none). */
  whirl: { speed: number; w: number; h: number; fromX: number; bounceVy: number; clearGap: number };
  gust: { lasts: number; warn: number; airScale: number };
  /** KN-R15: the "Hmph!" puff after a whirl has waited `after` s for a hero at his mouth: slides them back `back` u at `speed` u/s. */
  huff: { after: number; back: number; speed: number };
  fall: { backTo: number };
  finish: { glugTo: number; sneeze: number; shine: number; tapsFrom: number; tapsTo: number; toast: number; win: number };
  gentle: { whirlSpeed: number; later: number; gustAirScale: number; huffAfter: number };
}

/** Thrown when the hall file is not the shape the fight needs (the part then has no hall). */
export class RustyDataError extends Error {}

/** Reads kano-hall.json's numbers and Rusty Borehole's block, with a light check. */
export function parseRustyHall(raw: unknown): RustyData {
  const bad = (p: string, what: string): never => {
    throw new RustyDataError(`kano-hall: ${p} should be ${what}`);
  };
  const obj = (v: unknown, p: string): Record<string, unknown> => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : bad(p, 'an object'));
  const num = (v: unknown, p: string): number => (typeof v === 'number' && Number.isFinite(v) ? v : bad(p, 'a number'));
  const pos = (v: unknown, p: string): number => (num(v, p) > 0 ? (v as number) : bad(p, 'above 0'));
  const nums = (o: Record<string, unknown>, p: string, keys: readonly string[]): Record<string, number> => Object.fromEntries(keys.map((k) => [k, num(o[k], `${p}.${k}`)]));
  const r = obj(raw, 'file');
  const b = obj(r['boss'], 'boss');
  if (b['kind'] !== 'rusty-borehole') bad('boss.kind', '"rusty-borehole"');
  const body = b['body'];
  if (!Array.isArray(body) || body.length !== 2) bad('boss.body', '[from, to]');
  const v = obj(b['valves'], 'boss.valves');
  const vx = v['x'];
  if (!Array.isArray(vx) || vx.length === 0) bad('boss.valves.x', 'a list');
  const phasesRaw = b['phases'];
  if (!Array.isArray(phasesRaw) || phasesRaw.length === 0) bad('boss.phases', 'a list');
  const phases = (phasesRaw as unknown[]).map((q, i) => {
    const p = obj(q, `boss.phases[${i}]`);
    const pattern = p['pattern'];
    if (!Array.isArray(pattern) || pattern.length === 0 || !pattern.every((k) => k === 'whirl' || k === 'gust')) bad(`boss.phases[${i}].pattern`, 'a list of whirl and gust');
    return { every: pos(p['every'], `boss.phases[${i}].every`), pattern: pattern as RustyCough[], bpm: num(p['bpm'], `boss.phases[${i}].bpm`) };
  });
  const xs = (vx as unknown[]).map((x, i) => num(x, `boss.valves.x[${i}]`));
  const whirlRaw = obj(b['whirl'], 'boss.whirl');
  const gentleRaw = obj(b['gentle'], 'boss.gentle');
  if (phases.length !== xs.length) bad('boss.phases', 'one phase per valve');
  const d: RustyData = {
    leftLimit: num(r['leftLimit'], 'leftLimit'),
    rightLimit: num(r['rightLimit'], 'rightLimit'),
    spawnX: num(r['spawnX'], 'spawnX'),
    groundY: num(r['groundY'], 'groundY'),
    body: [num((body as unknown[])[0], 'boss.body[0]'), num((body as unknown[])[1], 'boss.body[1]')],
    valves: { x: xs, bottom: num(v['bottom'], 'boss.valves.bottom'), w: pos(v['w'], 'boss.valves.w'), h: pos(v['h'], 'boss.valves.h') },
    springs: nums(obj(b['springs'], 'boss.springs'), 'boss.springs', ['w', 'h', 'vy']) as RustyData['springs'],
    taps: num(b['taps'], 'boss.taps'),
    startDelay: num(b['startDelay'], 'boss.startDelay'),
    wheeze: pos(b['wheeze'], 'boss.wheeze'),
    breakAfterHit: num(b['breakAfterHit'], 'boss.breakAfterHit'),
    holdBreath: b['holdBreath'] !== false,
    heldWhirlDelay: b['heldWhirlDelay'] === undefined ? 0 : num(b['heldWhirlDelay'], 'boss.heldWhirlDelay'),
    valveNeedsWhirl: b['valveNeedsWhirl'] === undefined ? false : typeof b['valveNeedsWhirl'] === 'boolean' ? b['valveNeedsWhirl'] : bad('boss.valveNeedsWhirl', 'true or false'),
    waitHintAfter: b['waitHintAfter'] === undefined ? 3 : pos(b['waitHintAfter'], 'boss.waitHintAfter'),
    valveHint: b['valveHint'] === undefined ? { after: Infinity, gentleAfter: Infinity } : (nums(obj(b['valveHint'], 'boss.valveHint'), 'boss.valveHint', ['after', 'gentleAfter']) as RustyData['valveHint']),
    phases,
    whirl: { ...nums(whirlRaw, 'boss.whirl', ['speed', 'w', 'h', 'fromX', 'bounceVy']), clearGap: whirlRaw['clearGap'] === undefined ? 0 : num(whirlRaw['clearGap'], 'boss.whirl.clearGap') } as RustyData['whirl'],
    gust: nums(obj(b['gust'], 'boss.gust'), 'boss.gust', ['lasts', 'warn', 'airScale']) as RustyData['gust'],
    fall: { backTo: num(obj(b['fall'], 'boss.fall')['backTo'], 'boss.fall.backTo') },
    finish: nums(obj(b['finish'], 'boss.finish'), 'boss.finish', ['glugTo', 'sneeze', 'shine', 'tapsFrom', 'tapsTo', 'toast', 'win']) as RustyData['finish'],
    huff: b['huff'] === undefined ? { after: Infinity, back: 0, speed: 1 } : (nums(obj(b['huff'], 'boss.huff'), 'boss.huff', ['after', 'back', 'speed']) as RustyData['huff']),
    gentle: { ...nums(gentleRaw, 'boss.gentle', ['whirlSpeed', 'later', 'gustAirScale']), huffAfter: gentleRaw['huffAfter'] === undefined ? Infinity : num(gentleRaw['huffAfter'], 'boss.gentle.huffAfter') } as RustyData['gentle'],
  };
  if (!(d.valveHint.after > 0) || !(d.valveHint.gentleAfter > 0)) bad('boss.valveHint', 'after and gentleAfter above 0');
  if (d.heldWhirlDelay < 0) bad('boss.heldWhirlDelay', '0 or more');
  if (d.whirl.clearGap < 0) bad('boss.whirl.clearGap', '0 or more');
  if (!(d.huff.after > 0) || !(d.gentle.huffAfter > 0) || d.huff.back < 0 || !(d.huff.speed > 0)) bad('boss.huff', 'after and speed above 0, back 0 or more');
  if (d.springs.vy >= 0) bad('boss.springs.vy', 'below 0 (up)');
  if (d.body[0] <= d.rightLimit) bad('boss.body', 'right of the hero limit');
  if (xs.some((x, i) => x - d.springs.w / 2 <= d.leftLimit || x + d.springs.w / 2 >= d.rightLimit || (i > 0 && x <= xs[i - 1]!))) bad('boss.valves.x', 'left to right, each frame inside the limits');
  return d;
}

/** The fight's own numbers that the file does not hold (kano.md 5.3 to 5.5, simplest readings). */
export const RUSTY_RULES = {
  /** His hiccup after a hit, and the "SQUEAK... GLUG!" over the valve, s. */
  hiccup: 0.4,
  glugWord: 1.0,
  /** First try only: the hint shows this long after the start words. */
  hintAfter: secs(3),
  toastMs: 3000,
  hintMs: 3500,
} as const;

/** The hint bar's first-try hint shows once a visit (Play again is the same visit), as Pothole Hall's. */
let triesThisVisit = 0;

/** The hall is entered from a card (Dawanau's "Go to Borehole Hall", Kano's home), not Play again. */
export function newRustyVisit(): void {
  triesThisVisit = 0;
}

export class RustyFight implements ArenaRules {
  hits = 0;
  /** The phase in play (0 before any valve, 1 after the first, 2 after the second). */
  phase = 0;
  readonly hitAt: number[] = [];
  /** Step of the third valve, or -1. */
  defeatAt = -1;
  /** No coughs until this step (the 1.5 s after a valve). */
  breakUntil = 0;
  /** The step the next cough is due. */
  nextAt: number;
  private patternIdx = 0;
  /** The gust blows until this step (0: none yet). */
  gustUntil = 0;
  /** The hero is in the air after a cloth bounce: he holds his breath (no new whirl). */
  holding = false;
  /** A whirl came due while he held his breath, or the hero stood at his mouth (KN-R15), and waits there. */
  waiting = false;
  /** KN-R14: the valve to hit now has shaken loose ("STUCK"); false while it says "WAIT". */
  ready: boolean;
  /** Step it shook loose (the dust puff along the pipe), or -Infinity. */
  readyAt = -Infinity;
  /** Head bumps on the "WAIT" valve ("clonk"), and the hint to come down (once a try). */
  clonks = 0;
  waitHints = 0;
  /** KN-R16: the phases (hits before) the hint arrows have shown in this try, and "Go back! Bounce under the valve!" (once a try). */
  readonly arrowPhases: number[] = [];
  arrowWords = 0;
  /** KN-R16: the step the valve to hit began to say "STUCK" (after the last hit, or from the start without KN-R14). */
  private stuckFrom = 0;
  /** Step the hero's bounces began (the first cloth bounce since the floor), and the valve went "WAIT". */
  private bounceFrom = -Infinity;
  private waitFrom = 0;
  /** Whirls that left him while the hero was in the air after a cloth bounce (tests: always 0). */
  heldBreaks = 0;
  /** Whirls out so far, and how many times a whirl waited for the hero to come down. */
  whirlsOut = 0;
  held = 0;
  /** KN-R15: times a whirl waited because the hero stood at his mouth; whirls that came out touching the hero (tests: always 0). */
  crowded = 0;
  touchedAtBirth = 0;
  /** KN-R15: the "Hmph!" puffs this try, and the step-back hint (once a try). */
  huffs = 0;
  stepBackHints = 0;
  /** The puff's slide now: where it started, and the step the hero came clear (-1: not yet); null when none. */
  huffing: { fromX: number; clearAt: number } | null = null;
  /** Step a due whirl began waiting for a hero at his mouth (-1: not now). */
  private crowdFrom = -1;
  /** Step of the last cloth bounce, and of the last hurt (back at x 50). */
  springAt = -Infinity;
  hurtAt = -Infinity;
  readonly firstTry: boolean;
  private readonly startAt: number;

  constructor(
    readonly data: RustyData,
    private readonly run: Run,
    opts: { firstTry?: boolean } = {},
  ) {
    triesThisVisit++;
    this.firstTry = opts.firstTry ?? triesThisVisit === 1;
    this.startAt = run.parcelShield ? RUN_NUMBERS.parcelWordsSteps : 1;
    this.nextAt = secs(data.startDelay + this.later);
    this.ready = !data.valveNeedsWhirl;
    // The springy cloth frames under the valves (the Kofar Mata frames: one-way, a bounce up).
    const s = data.springs;
    const top = data.groundY - s.h;
    run.terrain = { ...run.terrain, platforms: [...run.terrain.platforms, ...data.valves.x.map((x) => ({ x: x - s.w / 2, y: top, w: s.w, spring: s.vy }))] };
  }

  get defeated(): boolean {
    return this.defeatAt >= 0;
  }

  get tempo(): number {
    return this.phase;
  }

  get steps(): number {
    return this.run.steps;
  }

  /** Seconds since the third valve (0 before it). */
  get finishT(): number {
    return this.defeated ? (this.steps - this.defeatAt) / STEPS : 0;
  }

  /** Gentle mode: every cough this much later (s). */
  get later(): number {
    return this.run.gentle ? this.data.gentle.later : 0;
  }

  /** Seconds between coughs in phase i. */
  everyOf(i: number): number {
    return this.data.phases[Math.min(i, this.data.phases.length - 1)]!.every + this.later;
  }

  /**
   * KN-R15: the hero is at his mouth: their box within whirl.clearGap u of a whirl's box as it
   * would leave him (on the floor or in the air above it), so a whirl now would come out touching
   * them, or too close to see it leave.
   */
  atMouth(heroX: number): boolean {
    const gap = this.data.whirl.fromX - RUN_NUMBERS.whirlHalfW - (heroX + RUN_NUMBERS.heroHalfW);
    return gap < this.data.whirl.clearGap;
  }

  /** KN-R15: "Hmph!": a soft puff, no hurt; the slide back begins. The first a try, the hint. */
  private startHuff(h: { x: number }, ev: RunEvent[]): void {
    this.huffs++;
    this.huffing = { fromX: h.x, clearAt: -1 };
    this.crowdFrom = -1;
    const hint = this.stepBackHints === 0;
    if (hint) this.stepBackHints++;
    this.cue(ev, 'whirlFff', hint ? KANO_WORDS.hall.stepBack : undefined, RUSTY_RULES.hintMs);
  }

  /**
   * KN-R15: the puff's slide, each step: the hero goes back left at huff.speed (their walking held,
   * no hurt) until they have gone huff.back u and been clear heldWhirlDelay s; then the whirl rolls
   * out this step and the slide ends.
   */
  private slide(h: { x: number; vx: number }, prevX: number, s: number): void {
    const H = this.huffing!;
    // From where they were last step: their own walking this step does not count.
    h.x = Math.max(this.data.leftLimit, prevX - this.data.huff.speed / STEPS);
    h.vx = 0;
    if (H.clearAt < 0 && !this.atMouth(h.x)) H.clearAt = s;
    const back = H.fromX - h.x >= this.data.huff.back - 1e-9 || h.x <= this.data.leftLimit;
    if (back && H.clearAt >= 0 && s - H.clearAt >= secs(this.data.heldWhirlDelay)) {
      this.huffing = null;
      this.waiting = false;
      this.nextAt = s;
    }
  }

  /** The cough due next. */
  get nextKind(): RustyCough {
    const p = this.data.phases[Math.min(this.phase, this.data.phases.length - 1)]!.pattern;
    return p[this.patternIdx % p.length]!;
  }

  /** Its warning, s: the wheeze before a whirl, the puffing before a gust. */
  warnOf(kind: RustyCough): number {
    return kind === 'gust' ? this.data.gust.warn : this.data.wheeze;
  }

  /** The valve to hit now (its index), or -1 once all are open. */
  get stuck(): number {
    return this.hits < this.data.valves.x.length ? this.hits : -1;
  }

  /** Valve i now: done ("open"), the one to hit, shaken loose ("stuck") or shut tight ("shut", tagged WAIT), or still ("wait"). */
  valveState(i: number): 'open' | 'stuck' | 'shut' | 'wait' {
    if (this.defeated || i < this.hits) return 'open';
    if (i > this.hits) return 'wait';
    return this.ready ? 'stuck' : 'shut';
  }

  /** KN-R16: seconds the valve must say "STUCK" with no hit before the hint arrows (Gentle: shorter). */
  get arrowAfter(): number {
    return this.run.gentle ? this.data.valveHint.gentleAfter : this.data.valveHint.after;
  }

  /** KN-R16: the arrows are due: the valve to hit has said "STUCK" arrowAfter s with no hit. */
  get arrowDue(): boolean {
    return !this.defeated && this.ready && this.stuck >= 0 && this.steps - this.stuckFrom >= secs(this.arrowAfter);
  }

  /** KN-R16: x over the cloth frame under the valve to hit (where the arrows hide). */
  overCloth(x: number): boolean {
    const i = this.stuck;
    return i >= 0 && Math.abs(x - this.data.valves.x[i]!) <= this.data.springs.w / 2;
  }

  /** The hero's middle x, feet y and head y now (for the look). */
  get heroAt(): { x: number; y: number; head: number } {
    const h = this.run.hero;
    return { x: h.x, y: h.y, head: h.y - RUN_NUMBERS.heroH };
  }

  /** KN-R16: the hint arrows show now (due, and the hero is not over that cloth). */
  get arrows(): boolean {
    return this.arrowDue && !this.overCloth(this.run.hero.x);
  }

  /** 0 to 1 through the warning before the next cough (the wheeze or the puffing), or -1 when none shows. */
  get warn(): number {
    if (this.defeated || this.steps < this.breakUntil) return -1;
    const w = secs(this.warnOf(this.nextKind));
    const k = (this.steps - (this.nextAt - w)) / w;
    return k < 0 ? -1 : Math.min(1, k);
  }

  /** The gust blows now. */
  get gusting(): boolean {
    return !this.defeated && this.steps < this.gustUntil;
  }

  /** How far through the gust, 0 to 1 (-1 when none). */
  get gustK(): number {
    const lasts = secs(this.data.gust.lasts);
    return this.gusting ? 1 - (this.gustUntil - this.steps) / lasts : -1;
  }

  /** The whirls on the floor now (rolling, or puffing apart). */
  get whirls(): HazardState[] {
    return this.run.hazards.filter((z) => z.kind === 'whirl' && z.mode !== 'gone');
  }

  private cue(ev: RunEvent[], sound?: SoundName, say?: string, ms: number = RUSTY_RULES.toastMs): void {
    ev.push({ type: 'cue', ...(sound ? { sound } : {}), ...(say ? { say, ms } : {}) });
  }

  step(run: Run, dt: number, ev: RunEvent[]): void {
    const s = run.steps;
    const W = KANO_WORDS.hall;
    // kano.md 5.4 entry: the parcel's shield words first, then his; on the first try, the hint.
    if (s === 1) this.cue(ev, 'arena', run.parcelShield ? W.parcelShield : W.start);
    if (run.parcelShield && s === this.startAt) this.cue(ev, undefined, W.start);
    if (this.firstTry && s === this.startAt + RUSTY_RULES.hintAfter && this.hits === 0) this.cue(ev, undefined, W.hint, RUSTY_RULES.hintMs);
    run.tickPower(ev);
    const h = run.hero;
    // The gust: air speed toward him (+x) is a quarter less (Gentle: an eighth).
    h.wind = this.gusting ? (run.gentle ? this.data.gentle.gustAirScale : this.data.gust.airScale) : 1;
    const prevY = h.y;
    const prevX = h.x;
    run.heroStep(dt);
    if (h.sprung) {
      this.springAt = s;
      ev.push({ type: 'spring', x: h.sprung.x });
    }
    run.walls();
    // He holds his breath from a cloth bounce until the hero is down on the floor. A whirl that
    // waited at his mouth leaves heldWhirlDelay after the feet touch the floor.
    if (h.sprung && !this.huffing) {
      // (A cloth bounce in the "Hmph!" slide is his push, not the hero's own: he breathes as normal.)
      if (!this.holding) this.bounceFrom = s;
      this.holding = this.data.holdBreath;
    } else if (h.grounded || h.y >= this.data.groundY) {
      // Feet on the floor (also a hop that lands and leaves the floor in one step: a bunny-hopper is down too).
      this.holding = false;
      this.bounceFrom = -Infinity;
    }
    // KN-R15: it waits, too, while the hero is at his mouth; it goes heldWhirlDelay after both are over.
    if (this.huffing) this.slide(h, prevX, s);
    else if (this.waiting && !this.holding && !this.atMouth(h.x)) {
      this.waiting = false;
      this.crowdFrom = -1;
      this.nextAt = Math.max(this.nextAt, s + secs(this.data.heldWhirlDelay));
    } else if (this.waiting && !this.holding && !this.defeated) {
      // Still at his mouth: after huff.after s (Gentle huffAfter), a soft "Hmph!" puff.
      if (this.crowdFrom < 0) this.crowdFrom = s;
      if (s - this.crowdFrom >= secs(run.gentle ? this.data.gentle.huffAfter : this.data.huff.after)) this.startHuff(h, ev);
    }
    if (this.defeated) {
      this.finish(run, ev);
      return;
    }
    this.bump(run, prevY, ev);
    if (this.defeated) return;
    // KN-R14: bouncing on and on while the valve says "WAIT" (he never coughs then): one hint a try.
    if (!this.ready && this.waitHints === 0 && this.holding && s - Math.max(this.bounceFrom, this.waitFrom) >= secs(this.data.waitHintAfter)) {
      this.waitHints++;
      this.cue(ev, undefined, KANO_WORDS.hall.waitHint, RUSTY_RULES.hintMs);
    }
    this.coughs(run, ev);
    // KN-R16: the hint arrows, and with the first of a try the words.
    if (this.arrows && !this.arrowPhases.includes(this.hits)) {
      this.arrowPhases.push(this.hits);
      if (this.arrowWords === 0) {
        this.arrowWords++;
        this.cue(ev, undefined, KANO_WORDS.hall.valveHint, RUSTY_RULES.hintMs);
      }
    }
    run.moveHazards(dt, ev);
    for (const z of run.hazards) if (z.kind === 'whirl' && z.mode === 'move' && z.x - RUN_NUMBERS.whirlHalfW <= this.data.leftLimit) this.puff(z, ev);
    const before = ev.length;
    run.touchHazards(ev);
    // 5.4: a whirl from the side is a life, back to x 50 (the shield's pop keeps the hero where they are).
    if (run.phase === 'arena' && ev.slice(before).some((e) => e.type === 'hit')) this.backToStart(run, ev);
    if (run.safe > 0) run.safe--;
  }

  /**
   * 5.3: the head meets a valve from below (the crate rule: rising, the middle within the valve's
   * half width plus 4, the head at or below its bottom last step and above it now). The head
   * stops, a small push down. The stuck one spins free: a hit. Shut tight ("WAIT", KN-R14) it
   * only goes "clonk"; the others only stop the head.
   */
  private bump(run: Run, prevY: number, ev: RunEvent[]): void {
    const h = run.hero;
    const v = this.data.valves;
    if (!(h.vy < 0)) return;
    const head = h.y - RUN_NUMBERS.heroH;
    const prevHead = prevY - RUN_NUMBERS.heroH;
    if (prevHead < v.bottom || head >= v.bottom) return;
    const reach = v.w / 2 + RUN_NUMBERS.headGrace;
    const i = v.x.findIndex((x) => Math.abs(h.x - x) <= reach);
    if (i < 0) return;
    h.y = v.bottom + RUN_NUMBERS.heroH;
    h.vy = RUN_NUMBERS.bumpVy;
    h.holding = false;
    if (i === this.stuck && this.ready) this.hit(run, ev);
    else if (i === this.stuck) {
      this.clonks++;
      this.cue(ev, 'valveClonk');
    } else this.cue(ev, 'crateEmpty');
  }

  /** "SQUEAK... GLUG!": every whirl puffs apart, the gust ends, a break; the next phase, or the finish. */
  private hit(run: Run, ev: RunEvent[]): void {
    const s = run.steps;
    this.hits++;
    this.hitAt.push(s);
    this.cue(ev, 'valveSqueak');
    this.cue(ev, 'valveGlug');
    this.cue(ev, 'rustyHic');
    for (const z of this.whirls) if (z.mode === 'move' || z.mode === 'wait') this.puff(z, ev);
    this.gustUntil = 0;
    this.waiting = false;
    this.huffing = null;
    this.crowdFrom = -1;
    this.ready = !this.data.valveNeedsWhirl;
    this.readyAt = -Infinity;
    this.stuckFrom = s;
    this.waitFrom = s;
    const left = this.data.valves.x.length - this.hits;
    if (left <= 0) {
      this.defeatAt = s;
      ev.push({ type: 'bossDefeat' });
      this.cue(ev, 'rustyGargle');
      return;
    }
    this.cue(ev, undefined, KANO_WORDS.hall.left(left));
    this.breakUntil = s + secs(this.data.breakAfterHit);
    this.patternIdx = 0;
    this.nextAt = this.breakUntil + secs(this.everyOf(this.hits));
  }

  /** A whirl puffs apart where it is (the run's own puff: no box from now on, gone after 0.45 s). */
  private puff(z: HazardState, ev: RunEvent[]): void {
    z.mode = 'puff';
    z.t = 0;
    ev.push({ type: 'whirlPuff', x: z.x, why: 'pit' });
  }

  /** 5.4: the warning, then the cough, by the phase's pattern; none in the break after a valve. */
  private coughs(run: Run, ev: RunEvent[]): void {
    const s = run.steps;
    if (s < this.breakUntil) return;
    if (this.phase < this.hits) {
      // The break is over: the next phase (quicker, more coughs; the tune steps up).
      this.phase = this.hits;
      if (this.phase === 2) this.cue(ev, undefined, KANO_WORDS.hall.cross, RUSTY_RULES.hintMs);
      else this.cue(ev);
    }
    const kind = this.nextKind;
    if (s === this.nextAt - secs(this.warnOf(kind))) this.cue(ev, kind === 'whirl' ? 'rustyWheeze' : undefined);
    if (s < this.nextAt) return;
    if (kind === 'whirl' && (this.holding || this.huffing !== null || this.atMouth(run.hero.x))) {
      // He holds his breath: the whirl waits at his mouth until the hero is down (KN-R14), and
      // until the hero is clear of his mouth (KN-R15).
      if (!this.waiting) {
        if (this.holding) this.held++;
        else this.crowded++;
      }
      if (!this.holding && this.crowdFrom < 0) this.crowdFrom = s;
      this.waiting = true;
      return;
    }
    this.patternIdx++;
    this.nextAt = s + secs(this.everyOf(this.phase));
    if (kind === 'gust') {
      this.gustUntil = s + secs(this.data.gust.lasts);
      this.cue(ev, 'rustyGust');
      return;
    }
    const x = this.data.whirl.fromX;
    run.hazards.push({ kind: 'whirl', x0: x, x, y: this.data.groundY, vx: -(run.gentle ? this.data.gentle.whirlSpeed : this.data.whirl.speed), mode: 'move', t: 0, rot: 0, face: -1, fufu: false });
    this.whirlsOut++;
    if (Math.abs(run.hero.x - x) <= RUN_NUMBERS.heroHalfW + RUN_NUMBERS.whirlHalfW) this.touchedAtBirth++;
    if (!run.hero.grounded && this.holding) this.heldBreaks++;
    this.cue(ev, 'rustyCough');
    // KN-R14: the phase's first whirl shakes the valve loose (a puff of dust along the pipe).
    if (!this.ready) {
      this.ready = true;
      this.readyAt = s;
      this.stuckFrom = s;
    }
  }

  /**
   * 5.4: hurt by a whirl from the side: back at x 50 (the run's own hurt already took the life).
   * Every whirl puffs apart and the next cough is a full gap away, so the way back is clear.
   */
  private backToStart(run: Run, ev: RunEvent[]): void {
    for (const z of this.whirls) if (z.mode === 'move') this.puff(z, ev);
    this.nextAt = Math.max(this.nextAt, run.steps + secs(this.everyOf(this.phase)));
    const { down, move } = run.hero;
    run.hero = run.newHero(this.data.fall.backTo);
    run.hero.down = down;
    run.hero.move = move;
    this.holding = false;
    this.waiting = false;
    this.huffing = null;
    this.crowdFrom = -1;
    this.bounceFrom = -Infinity;
    this.hurtAt = run.steps;
  }

  /** 5.5: the funny, kind finish, seconds from the third valve. */
  private finish(run: Run, ev: RunEvent[]): void {
    const since = run.steps - this.defeatAt;
    const F = this.data.finish;
    run.moveHazards(1 / STEPS, ev);
    if (since === secs(F.sneeze)) this.cue(ev, 'rustySneeze');
    if (since === secs(F.shine)) this.cue(ev, 'rustyHum');
    for (const at of rustyTapTimes()) if (since === secs(at)) this.cue(ev, 'tapSplash');
    if (since === secs(F.toast)) this.cue(ev, 'bossWin', KANO_WORDS.hall.open);
    if (since === secs(F.win)) {
      run.phase = 'won';
      ev.push({ type: 'win' });
    }
  }

  /** A snapshot for tests and qa (window.__game.arena). */
  peek(): Record<string, unknown> {
    const h = this.run.hero;
    return {
      kind: 'rusty-borehole',
      hits: this.hits,
      phase: this.phase,
      stuck: this.stuck,
      ready: this.ready,
      valve: this.stuck < 0 ? 'open' : this.valveState(this.stuck),
      clonks: this.clonks,
      waitHints: this.waitHints,
      arrows: this.arrows,
      arrowDue: this.arrowDue,
      arrowPhases: this.arrowPhases.length,
      arrowWords: this.arrowWords,
      valves: this.data.valves.x,
      valveBottom: this.data.valves.bottom,
      defeated: this.defeated,
      finishT: this.finishT,
      warn: this.warn,
      next: this.nextKind,
      nextIn: (this.nextAt - this.steps) / STEPS,
      breakIn: Math.max(0, this.breakUntil - this.steps) / STEPS,
      gust: this.gusting,
      holding: this.holding,
      waiting: this.waiting,
      heldBreaks: this.heldBreaks,
      held: this.held,
      crowded: this.crowded,
      touchedAtBirth: this.touchedAtBirth,
      huffs: this.huffs,
      huffing: this.huffing !== null,
      whirlsOut: this.whirlsOut,
      whirls: this.whirls.filter((z) => z.mode === 'move').map((z) => ({ x: z.x, vx: z.vx })),
      hero: { x: h.x, y: h.y, vy: h.vy, grounded: h.grounded },
      lives: this.run.lives,
      time: this.run.time,
      runPhase: this.run.phase,
      // K5c: how the hall was last drawn (its size on screen; CSS px boxes of the valves, tags, pipe and counter).
      screen: boreholeHallSeen(),
      // KN-R16: the hint arrows' CSS px boxes as last drawn (null while hidden).
      arrowBoxes: boreholeArrowsSeen(),
    };
  }
}

/** The Kano part's hall fight, for each try (load.ts WorldPart.hall.arena). */
export function rustyArena(data: RustyData): (run: Run) => ArenaRules {
  return (run) => new RustyFight(data, run);
}
