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
 * - He holds his breath: no new whirl leaves him while the hero is in the air after a cloth
 *   bounce. A whirl due then waits, and rolls out the step after the hero is down.
 * - A hit: every whirl puffs apart, the gust ends, no coughs for 1.5 s, then the next phase.
 *   Gentle mode: every cough 0.4 s later.
 * - The third valve: the funny, kind finish (5.5), the Win at 6 s. Nothing can hurt the hero.
 */
import type { ArenaRules, HazardState, Run, RunEvent } from '../../game/run';
import type { SoundName } from '../../engine/sound';
import { rustyTapTimes } from './boreholeHall';
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
  phases: readonly RustyPhase[];
  whirl: { speed: number; w: number; h: number; fromX: number; bounceVy: number };
  gust: { lasts: number; warn: number; airScale: number };
  fall: { backTo: number };
  finish: { glugTo: number; sneeze: number; shine: number; tapsFrom: number; tapsTo: number; toast: number; win: number };
  gentle: { whirlSpeed: number; later: number; gustAirScale: number };
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
    phases,
    whirl: nums(obj(b['whirl'], 'boss.whirl'), 'boss.whirl', ['speed', 'w', 'h', 'fromX', 'bounceVy']) as RustyData['whirl'],
    gust: nums(obj(b['gust'], 'boss.gust'), 'boss.gust', ['lasts', 'warn', 'airScale']) as RustyData['gust'],
    fall: { backTo: num(obj(b['fall'], 'boss.fall')['backTo'], 'boss.fall.backTo') },
    finish: nums(obj(b['finish'], 'boss.finish'), 'boss.finish', ['glugTo', 'sneeze', 'shine', 'tapsFrom', 'tapsTo', 'toast', 'win']) as RustyData['finish'],
    gentle: nums(obj(b['gentle'], 'boss.gentle'), 'boss.gentle', ['whirlSpeed', 'later', 'gustAirScale']) as RustyData['gentle'],
  };
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
  /** Whirls that left him while the hero was in the air after a cloth bounce (tests: always 0). */
  heldBreaks = 0;
  /** Whirls out so far, and how many times a whirl waited for the hero to come down. */
  whirlsOut = 0;
  held = 0;
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
    run.heroStep(dt);
    if (h.sprung) {
      this.springAt = s;
      ev.push({ type: 'spring', x: h.sprung.x });
    }
    run.walls();
    // He holds his breath from a cloth bounce until the hero is down on the floor.
    if (h.sprung) this.holding = this.data.holdBreath;
    else if (h.grounded) this.holding = false;
    if (this.defeated) {
      this.finish(run, ev);
      return;
    }
    this.bump(run, prevY, ev);
    if (this.defeated) return;
    this.coughs(run, ev);
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
   * stops, a small push down. The stuck one spins free: a hit. The others only stop the head.
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
    if (i === this.stuck) this.hit(run, ev);
    else this.cue(ev, 'crateEmpty');
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
    if (kind === 'whirl' && this.holding) {
      // He holds his breath: the whirl waits until the hero is down.
      if (s === this.nextAt) this.held++;
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
    if (!run.hero.grounded && this.holding) this.heldBreaks++;
    this.cue(ev, 'rustyCough');
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
      heldBreaks: this.heldBreaks,
      held: this.held,
      whirlsOut: this.whirlsOut,
      whirls: this.whirls.filter((z) => z.mode === 'move').map((z) => ({ x: z.x, vx: z.vx })),
      hero: { x: h.x, y: h.y, vy: h.vy, grounded: h.grounded },
      lives: this.run.lives,
      time: this.run.time,
      runPhase: this.run.phase,
    };
  }
}

/** The Kano part's hall fight, for each try (load.ts WorldPart.hall.arena). */
export function rustyArena(data: RustyData): (run: Run) => ArenaRules {
  return (run) => new RustyFight(data, run);
}
