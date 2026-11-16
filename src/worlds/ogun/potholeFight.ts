/**
 * O5b: King Pothole in Pothole Hall (docs/ogun.md 5.3 to 5.6; decisions 78, 79). Pure rules, no
 * drawing, sound or DOM: the fight runs each hall step with the run's own helpers (Run, run.ts),
 * so the first load only knows the ArenaRules shape. Lives in the lazy Ogun part.
 *
 * One rule, three times: walk into the road mix bag on the pile (carry it on the head), then jump
 * over King Pothole; while the hero is in the air with their middle over the middle 40 u of his
 * opening, the bag drops in ("PLOP!"). Three bags fill him, and he falls asleep as a smooth road.
 *
 * - He is a pit 100 u wide in the floor whose middle slides along his track. He freezes while the
 *   hero is in the air and slides again 0.3 s after the hero lands.
 * - He never swallows a standing hero: if his near lip would come within `bumpGap` u of the feet
 *   of a hero on the floor (the feet are the hero's box, RULES.heroHalfW each side of x), he stops,
 *   grumbles ("hmph!") and slides back the other way.
 * - Throws come from his near lip (the one on the hero's side), each after a 0.5 s gulp: a hopping
 *   gravel lump (the run's own Sagamu gravel, so it bounces, hurts and crumbles as on Sagamu) or,
 *   from the first bag, a mud blob that lands 120 to 200 u from his near lip and leaves a 60 u mud
 *   patch for 4 s (the run's own mud rule: walk speed; it never hurts).
 * - A fall into him: a life, back to x 50 and he goes back to the right end of his track (Gentle
 *   mode: climb out on his left lip, decision 31). Hurt while carrying: the bag goes back on the
 *   pile. Fallen in while carrying: that bag is lost; a new one is on the pile 1.0 s later.
 */
import { halt, steer, step } from '../../engine/physics';
import type { ArenaRules, HazardState, Run, RunEvent } from '../../game/run';
import type { MudData } from '../../game/level';
import { OGUN_WORDS } from '../../screens/words';
import { potholeLampTimes, POTHOLE_FINISH } from './hall';

/**
 * The run's own numbers this fight uses (run.ts RULES and STEPS_PER_SECOND; a unit test keeps
 * them the same). Copied, not imported: a value import from run.ts here makes the bundler split
 * the first load's art into a new shared chunk.
 */
export const RUN_NUMBERS = { heroHalfW: 7, heroH: 44, parcelWordsSteps: 90, climbSafeSteps: 102, dustOffSteps: 24 } as const;
const RULES = RUN_NUMBERS;
const STEPS_PER_SECOND = 60;

const secs = (s: number): number => Math.round(s * STEPS_PER_SECOND);

export type PotholeThrow = 'gravel' | 'mud';

export interface PotholePhase {
  every: number;
  slide: number;
  pattern: readonly PotholeThrow[];
  bpm: number;
}

/** King Pothole's block of ogun-hall.json (ogun.md 5.6). */
export interface PotholeData {
  width: number;
  leftLimit: number;
  rightLimit: number;
  spawnX: number;
  groundY: number;
  pit: { width: number; track: readonly [number, number]; startX: number; dropZone: number; bumpGap: number; resumeAfterLand: number };
  bag: { pile: readonly [number, number]; x: number; newAfter: number };
  rollerX: number;
  startDelay: number;
  gulp: number;
  breakAfterHit: number;
  phases: readonly PotholePhase[];
  gravel: { speed: number; w: number; h: number };
  mud: { near: number; far: number; notByHero: number; shadow: number; width: number; lasts: number };
  fall: { backTo: number; pitTo: number };
  /** Gentle mode: slide speeds times slideScale; a longer gulp (OG-R26). */
  gentle: { slideScale: number; gulp: number };
}

/** Thrown when the hall file is not the shape the fight needs (the part then has no hall). */
export class PotholeDataError extends Error {}

/** Reads ogun-hall.json's numbers and King Pothole's block, with a light check. */
export function parsePotholeHall(raw: unknown): PotholeData {
  const obj = (v: unknown, p: string): Record<string, unknown> => {
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) return v as Record<string, unknown>;
    throw new PotholeDataError(`ogun-hall: ${p} should be an object`);
  };
  const num = (v: unknown, p: string): number => {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    throw new PotholeDataError(`ogun-hall: ${p} should be a number`);
  };
  const pair = (v: unknown, p: string): readonly [number, number] => {
    if (!Array.isArray(v) || v.length !== 2) throw new PotholeDataError(`ogun-hall: ${p} should be [from, to]`);
    const a = num(v[0], p);
    const b = num(v[1], p);
    if (b < a) throw new PotholeDataError(`ogun-hall: ${p} should run left to right`);
    return [a, b];
  };
  const r = obj(raw, 'file');
  const b = obj(r['boss'], 'boss');
  const pit = obj(b['pit'], 'boss.pit');
  const bag = obj(b['bag'], 'boss.bag');
  const gravel = obj(b['gravel'], 'boss.gravel');
  const mud = obj(b['mud'], 'boss.mud');
  const fall = obj(b['fall'], 'boss.fall');
  const gentle = obj(b['gentle'], 'boss.gentle');
  const phasesRaw = b['phases'];
  if (!Array.isArray(phasesRaw) || phasesRaw.length === 0) throw new PotholeDataError('ogun-hall: boss.phases should be a list');
  const phases = phasesRaw.map((q, i) => {
    const p = obj(q, `boss.phases[${i}]`);
    const pattern = p['pattern'];
    if (!Array.isArray(pattern) || pattern.length === 0 || !pattern.every((k) => k === 'gravel' || k === 'mud')) {
      throw new PotholeDataError(`ogun-hall: boss.phases[${i}].pattern should list gravel and mud`);
    }
    const every = num(p['every'], `boss.phases[${i}].every`);
    if (every <= 0) throw new PotholeDataError(`ogun-hall: boss.phases[${i}].every should be above 0`);
    return { every, slide: num(p['slide'], `boss.phases[${i}].slide`), pattern: pattern as PotholeThrow[], bpm: num(p['bpm'], `boss.phases[${i}].bpm`) };
  });
  const d: PotholeData = {
    width: num(r['width'], 'width'),
    leftLimit: num(r['leftLimit'], 'leftLimit'),
    rightLimit: num(r['rightLimit'], 'rightLimit'),
    spawnX: num(r['spawnX'], 'spawnX'),
    groundY: num(r['groundY'], 'groundY'),
    pit: {
      width: num(pit['width'], 'boss.pit.width'),
      track: pair(pit['track'], 'boss.pit.track'),
      startX: num(pit['startX'], 'boss.pit.startX'),
      dropZone: num(pit['dropZone'], 'boss.pit.dropZone'),
      bumpGap: num(pit['bumpGap'], 'boss.pit.bumpGap'),
      resumeAfterLand: num(pit['resumeAfterLand'], 'boss.pit.resumeAfterLand'),
    },
    bag: { pile: pair(bag['pile'], 'boss.bag.pile'), x: num(bag['x'], 'boss.bag.x'), newAfter: num(bag['newAfter'], 'boss.bag.newAfter') },
    rollerX: num(b['rollerX'], 'boss.rollerX'),
    startDelay: num(b['startDelay'], 'boss.startDelay'),
    gulp: num(b['gulp'], 'boss.gulp'),
    breakAfterHit: num(b['breakAfterHit'], 'boss.breakAfterHit'),
    phases,
    gravel: { speed: num(gravel['speed'], 'boss.gravel.speed'), w: num(gravel['w'], 'boss.gravel.w'), h: num(gravel['h'], 'boss.gravel.h') },
    mud: {
      near: num(mud['near'], 'boss.mud.near'),
      far: num(mud['far'], 'boss.mud.far'),
      notByHero: num(mud['notByHero'], 'boss.mud.notByHero'),
      shadow: num(mud['shadow'], 'boss.mud.shadow'),
      width: num(mud['width'], 'boss.mud.width'),
      lasts: num(mud['lasts'], 'boss.mud.lasts'),
    },
    fall: { backTo: num(fall['backTo'], 'boss.fall.backTo'), pitTo: num(fall['pitTo'], 'boss.fall.pitTo') },
    gentle: {
      slideScale: num(gentle['slideScale'], 'boss.gentle.slideScale'),
      // OG-R26: Gentle's own gulp; left out, the normal one.
      gulp: gentle['gulp'] === undefined ? num(b['gulp'], 'boss.gulp') : num(gentle['gulp'], 'boss.gentle.gulp'),
    },
  };
  const [t0, t1] = d.pit.track;
  if (d.pit.startX < t0 || d.pit.startX > t1) throw new PotholeDataError('ogun-hall: boss.pit.startX should be on the track');
  if (t0 - d.pit.width / 2 <= d.bag.pile[1] || t1 + d.pit.width / 2 >= d.rightLimit) throw new PotholeDataError('ogun-hall: the pit should stay between the pile and the right wall');
  return d;
}

/** The fight's own numbers that the file does not hold (ogun.md 5.3 to 5.5, simplest readings). */
export const POTHOLE_RULES = {
  /** The ready bag's touch box on the pile: its middle at bag.x, this wide each side, this tall. */
  bagHalfW: 13,
  bagH: 32,
  /** The mud blob flies this high over its path (the shadow shows for the whole flight). */
  blobArc: 70,
  /** A landing spot is looked for in steps of this many u (ogun.md 5.6). */
  mudStep: 10,
  /** His "hmph" (sound and bubble) at most this often. */
  hmphGap: secs(1),
  /** How long his hit, "cross" and bubble looks last, s. */
  hitLook: 0.8,
  bumpLook: 0.6,
  /** First try only: the bag hint shows this long after the start words. */
  pickUpAfter: secs(3),
  /**
   * Gentle mode: the hero climbs out on his left side this far from his left lip, clear of where
   * his next gravel lump comes out (its box reaches 19 u from his lip), with room to run at him.
   */
  climbBack: 40,
  /** Words on the hint bar, ms. */
  toastMs: 3000,
  hintMs: 3500,
} as const;

/** A mud blob in the air: from (x0) at the lip to its landing middle x1, thrown at step `at`, landing at `land`. */
export interface MudBlob {
  readonly x0: number;
  readonly x1: number;
  readonly at: number;
  readonly land: number;
}
/** A mud patch on the floor (it is in run.mud while it lasts), drying from `at` to `until`. */
export interface MudSplat {
  readonly m: MudData;
  readonly at: number;
  readonly until: number;
}

/**
 * CO1 for qa: what the hall's door people cost to draw, ms a frame (running average and the
 * longest), filled by the hall's look (potholeHallSkin.ts), shown in peek().
 */
export const DOOR_COST = { avg: 0, max: 0, frames: 0 };

/** The hint bar's first-try hints show once a visit (ogun.md 5.4: "once only on the first try"). */
let triesThisVisit = 0;

export class PotholeFight implements ArenaRules {
  /** His middle x and the way he slides (-1 left, 1 right). */
  pitX: number;
  dir: -1 | 1 = -1;
  hits = 0;
  /** The phase in play (0 before any bag, 1 after the first, 2 after the second). */
  phase = 0;
  carrying = false;
  /** Step from which the bag is on the pile (ready). */
  bagAt = 0;
  /** Step his slide may start again (0.3 s after the hero lands). */
  private resumeAt = 0;
  /** Steps when he last bumped to a stop, said "hmph", and took each bag. */
  bumpAt = -Infinity;
  private hmphAt = -Infinity;
  readonly hitAt: number[] = [];
  /** No throws until this step (the 1.5 s after a bag). */
  breakUntil = 0;
  nextThrowAt: number;
  /** Step the gulp before the next throw started, or -1. */
  gulpAt = -1;
  private patternIdx = 0;
  readonly blobs: MudBlob[] = [];
  readonly splats: MudSplat[] = [];
  /** Step of the third bag, or -1. */
  defeatAt = -1;
  /** The hero is in the air: he holds still with wide eyes. */
  frozen = false;
  /** The first try this visit: the bag hints show. */
  readonly firstTry: boolean;
  private jumpHintShown = false;
  /** Step the start words ("King Pothole is blocking the gateway!") show. */
  private readonly startAt: number;
  /** The floor either side of his opening (moved as he slides). */
  private readonly left: { x0: number; x1: number };
  private readonly right: { x0: number; x1: number };

  constructor(
    readonly data: PotholeData,
    private readonly run: Run,
    opts: { firstTry?: boolean } = {},
  ) {
    triesThisVisit++;
    this.firstTry = opts.firstTry ?? triesThisVisit === 1;
    this.pitX = data.pit.startX;
    this.nextThrowAt = secs(data.startDelay);
    this.startAt = run.parcelShield ? RULES.parcelWordsSteps : 1;
    const w = data.pit.width / 2;
    this.left = { x0: -200, x1: this.pitX - w };
    this.right = { x0: this.pitX + w, x1: data.width + 200 };
    run.terrain = { ...run.terrain, ground: [this.left, this.right] };
  }

  get defeated(): boolean {
    return this.defeatAt >= 0;
  }

  get tempo(): number {
    return this.phase;
  }

  /** Steps of the run so far (the run counts them). */
  get steps(): number {
    return this.run.steps;
  }

  /** Seconds since the third bag (0 before it). */
  get finishT(): number {
    return this.defeated ? (this.steps - this.defeatAt) / STEPS_PER_SECOND : 0;
  }

  /** A bag waits on the pile. */
  get bagReady(): boolean {
    return !this.carrying && !this.defeated && this.steps >= this.bagAt;
  }

  /** His opening, left lip and right lip. */
  get lips(): [number, number] {
    const w = this.data.pit.width / 2;
    return [this.pitX - w, this.pitX + w];
  }

  /** 0 to 1 through the gulp before a throw, or -1 when none is coming. */
  get gulp(): number {
    return this.gulpAt < 0 ? -1 : Math.min(1, (this.steps - this.gulpAt) / secs(this.gulpTime));
  }

  /** The gulp before each throw, s (OG-R26: longer in Gentle mode). */
  get gulpTime(): number {
    return this.run.gentle ? this.data.gentle.gulp : this.data.gulp;
  }

  /** What the next throw will be. */
  private get nextKind(): PotholeThrow {
    const p = this.data.phases[Math.min(this.phase, this.data.phases.length - 1)]!.pattern;
    return p[this.patternIdx % p.length]!;
  }

  private get phaseData(): PotholePhase {
    return this.data.phases[Math.min(this.phase, this.data.phases.length - 1)]!;
  }

  private cue(ev: RunEvent[], e: Omit<Extract<RunEvent, { type: 'cue' }>, 'type'>): void {
    ev.push({ type: 'cue', ...e });
  }

  step(run: Run, dt: number, ev: RunEvent[]): void {
    const s = run.steps;
    const d = this.data;
    const W = OGUN_WORDS.hall;
    const R = POTHOLE_RULES;
    // ogun.md 5.4, t = 0: the parcel's shield words first, then his; on the first try, the bag hint.
    if (s === 1) this.cue(ev, { sound: 'arena', say: run.parcelShield ? W.parcelShield : W.start, ms: R.toastMs });
    if (run.parcelShield && s === this.startAt) this.cue(ev, { say: W.start, ms: R.toastMs });
    // The bag hints wait for his words to finish: "Pick up..." if no bag is carried yet, then
    // "Jump over..." once one is (both once, first try only).
    if (this.firstTry && s === this.startAt + R.pickUpAfter && !this.carrying && this.hits === 0) this.cue(ev, { say: W.pickUp, ms: R.hintMs });
    if (this.firstTry && !this.jumpHintShown && this.carrying && this.hits === 0 && s >= this.startAt + R.pickUpAfter) {
      this.jumpHintShown = true;
      this.cue(ev, { say: W.jumpOver, ms: R.hintMs });
    }
    run.tickPower(ev);

    const h = run.hero;
    if (this.defeated) {
      // The hero stands and watches the finish (cannot be hurt: nothing touches them now).
      steer(h, 0);
      if (h.grounded) halt(h);
    }
    h.gait = { walk: run.level.walkSpeed, run: run.level.runSpeed };
    run.mudStep(h);
    const air0 = !h.grounded;
    step(h, run.terrain, dt);
    if (h.fallen) {
      this.fall(run, ev);
      return;
    }
    run.walls();
    run.leftMud(h);
    if (air0 && h.grounded) this.resumeAt = s + secs(d.pit.resumeAfterLand);
    this.frozen = !h.grounded;

    if (this.defeated) {
      this.finish(run, ev);
      return;
    }
    this.carry(run, ev);
    if (this.defeated) return;
    this.slide(run, dt, ev);
    this.throws(run, ev);
    run.moveHazards(dt, ev);
    // ogun.md 5.4: a gravel lump crumbles at the walls.
    for (const z of run.hazards) {
      if (z.mode === 'move' && (z.x <= d.leftLimit || z.x >= d.rightLimit)) {
        z.mode = 'gone';
        ev.push({ type: 'crumble', x: z.x, y: z.y });
      }
    }
    const before = ev.length;
    run.touchHazards(ev);
    // 5.3: hurt while carrying, the bag slides back onto the pile (nothing is lost).
    if (this.carrying && ev.slice(before).some((e) => e.type === 'hit')) {
      this.carrying = false;
      this.bagAt = s;
    }
    this.mud(run, ev);
    if (run.safe > 0) run.safe--;
  }

  /** Pick up a ready bag by walking into it; drop it in from the air over his middle. */
  private carry(run: Run, ev: RunEvent[]): void {
    const h = run.hero;
    const d = this.data;
    const R = POTHOLE_RULES;
    if (this.bagReady) {
      const l = h.x - RULES.heroHalfW;
      const r = h.x + RULES.heroHalfW;
      if (r >= d.bag.x - R.bagHalfW && l <= d.bag.x + R.bagHalfW && h.y >= d.groundY - R.bagH && h.y - RULES.heroH <= d.groundY) {
        this.carrying = true;
        this.cue(ev, { sound: 'bagLift' });
      }
      return;
    }
    // 5.3: in the air, the hero's middle over the middle 40 u of his opening, above the floor line.
    if (this.carrying && !h.grounded && h.y <= d.groundY && Math.abs(h.x - this.pitX) <= d.pit.dropZone / 2) this.hit(run, ev);
  }

  /** A bag drops in: "PLOP!". Throws pop into dust; a break; the next phase; or the finish. */
  private hit(run: Run, ev: RunEvent[]): void {
    const s = run.steps;
    const d = this.data;
    this.carrying = false;
    this.hits++;
    this.hitAt.push(s);
    this.cue(ev, { sound: 'potPlop' });
    this.cue(ev, { sound: 'coneTok' });
    this.popThrows(run, ev);
    const left = d.phases.length - this.hits;
    if (left <= 0) {
      this.defeatAt = s;
      this.gulpAt = -1;
      // He fills to the top: the floor is whole again.
      this.left.x1 = this.right.x0 = this.pitX;
      for (const q of this.splats) {
        const i = run.mud.indexOf(q.m);
        if (i >= 0) run.mud.splice(i, 1);
      }
      this.splats.length = 0;
      ev.push({ type: 'bossDefeat' });
      this.cue(ev, { sound: 'potGiggle' });
      return;
    }
    this.cue(ev, { say: OGUN_WORDS.hall.plop(left), ms: POTHOLE_RULES.toastMs });
    this.bagAt = s + secs(d.bag.newAfter);
    this.breakUntil = s + secs(d.breakAfterHit);
    this.gulpAt = -1;
    this.patternIdx = 0;
    this.nextThrowAt = this.breakUntil + secs(d.phases[this.hits]!.every);
  }

  /** Every gravel lump and mud blob in the air pops into dust. */
  private popThrows(run: Run, ev: RunEvent[]): void {
    for (const z of run.hazards) {
      if (z.mode === 'gone') continue;
      z.mode = 'gone';
      ev.push({ type: 'dust', x: z.x, y: z.y - 8 });
    }
    run.hazards.length = 0;
    for (const b of this.blobs) ev.push({ type: 'dust', x: this.blobAt(b).x, y: this.blobAt(b).y });
    this.blobs.length = 0;
  }

  /** Where a mud blob is now (its middle). */
  blobAt(b: MudBlob): { x: number; y: number; k: number } {
    const k = Math.min(1, Math.max(0, (this.steps - b.at) / Math.max(1, b.land - b.at)));
    return { x: b.x0 + (b.x1 - b.x0) * k, y: this.data.groundY - 8 - Math.sin(k * Math.PI) * POTHOLE_RULES.blobArc, k };
  }

  /**
   * 5.3: his slide. Frozen while the hero is in the air and until 0.3 s after landing; turns back
   * at the ends of his track; bumps to a stop (and turns back) before his near lip comes within
   * bumpGap u of the feet of a hero on the floor.
   */
  private slide(run: Run, dt: number, ev: RunEvent[]): void {
    const h = run.hero;
    const s = run.steps;
    const d = this.data;
    if (!h.grounded || s < this.resumeAt) return;
    // The phase's speed starts when its break is over.
    const speed = this.phaseData.slide * (run.gentle ? d.gentle.slideScale : 1);
    const [t0, t1] = d.pit.track;
    let nx = this.pitX + this.dir * speed * dt;
    if (nx >= t1 || nx <= t0) {
      nx = Math.min(t1, Math.max(t0, nx));
      this.dir = nx >= t1 ? -1 : 1;
    }
    const gap = this.gapTo(h.x, nx);
    if (h.on === null && gap < d.pit.bumpGap && gap < this.gapTo(h.x, this.pitX) + 1e-9 && nx !== this.pitX) {
      // He would come too close to the standing hero: stop, grumble, back the other way.
      this.dir = this.dir === 1 ? -1 : 1;
      this.bumpAt = s;
      if (s - this.hmphAt >= POTHOLE_RULES.hmphGap) {
        this.hmphAt = s;
        this.cue(ev, { sound: 'potHmph' });
      }
      return;
    }
    this.moveTo(nx);
  }

  /** Floor between the hero's feet (their box) and his near lip, if his middle were at px. */
  gapTo(heroX: number, px: number): number {
    const w = this.data.pit.width / 2;
    return heroX < px ? px - w - (heroX + RULES.heroHalfW) : heroX - RULES.heroHalfW - (px + w);
  }

  private moveTo(x: number): void {
    const w = this.data.pit.width / 2;
    this.pitX = x;
    this.left.x1 = x - w;
    this.right.x0 = x + w;
  }

  /** 5.4: the gulp, then the throw, by the phase's pattern; no throws in the break after a bag. */
  private throws(run: Run, ev: RunEvent[]): void {
    const s = run.steps;
    const d = this.data;
    if (s < this.breakUntil) return;
    if (this.phase < this.hits) {
      // The break is over: the next phase (faster, more throws; the tune steps up).
      this.phase = this.hits;
      this.cue(ev, this.phase === 2 ? { say: OGUN_WORDS.hall.cross, ms: POTHOLE_RULES.hintMs } : {});
    }
    if (this.gulpAt < 0 && s >= this.nextThrowAt - secs(this.gulpTime)) {
      this.gulpAt = s;
      this.cue(ev, { sound: 'potGulp' });
    }
    if (s < this.nextThrowAt) return;
    let kind = this.nextKind;
    this.patternIdx++;
    this.nextThrowAt += secs(this.phaseData.every);
    this.gulpAt = -1;
    const h = run.hero;
    const side: -1 | 1 = h.x < this.pitX ? -1 : 1;
    const lip = this.pitX + (side * d.pit.width) / 2;
    if (kind === 'mud') {
      const x = this.mudSpot(lip, side, h.x);
      if (x === null) kind = 'gravel';
      else this.blobs.push({ x0: lip, x1: x, at: s, land: s + secs(d.mud.shadow) });
    }
    if (kind === 'gravel') {
      const x = lip + side * (d.gravel.w / 2 + 1);
      const z: HazardState = { kind: 'gravel', x0: x, x, y: d.groundY, vx: side * d.gravel.speed, mode: 'move', t: 0, rot: 0, face: side, fufu: false };
      run.hazards.push(z);
    }
  }

  /**
   * ogun.md 5.4 and 5.6: where a mud blob lands (the patch's middle): 120 to 200 u from his near
   * lip on the hero's side, the whole patch inside the walls (middle 60 to 500 in this hall), and
   * 40 u or more from the hero's x when it is thrown. Of those, the one nearest the middle of the
   * range (160 u), looked for in 10 u steps. Null: no spot (that throw is a gravel lump).
   */
  mudSpot(lip: number, side: -1 | 1, heroX: number): number | null {
    const m = this.data.mud;
    const lo = this.data.leftLimit + m.width / 2;
    const hi = this.data.rightLimit - m.width / 2;
    const mid = (m.near + m.far) / 2;
    let best: number | null = null;
    for (let dd = m.near; dd <= m.far + 1e-9; dd += POTHOLE_RULES.mudStep) {
      const x = lip + side * dd;
      if (x < lo || x > hi || Math.abs(x - heroX) < m.notByHero) continue;
      if (best === null || Math.abs(dd - mid) < Math.abs(Math.abs(best - lip) - mid)) best = x;
    }
    return best;
  }

  /** Blobs land as patches ("splut"); patches dry away. */
  private mud(run: Run, ev: RunEvent[]): void {
    const s = run.steps;
    const m = this.data.mud;
    for (let i = this.blobs.length - 1; i >= 0; i--) {
      const b = this.blobs[i]!;
      if (s < b.land) continue;
      this.blobs.splice(i, 1);
      const patch: MudData = { x: b.x1 - m.width / 2, w: m.width };
      run.mud.push(patch);
      this.splats.push({ m: patch, at: s, until: s + secs(m.lasts) });
      this.cue(ev, { sound: 'mudSplat' });
    }
    for (let i = this.splats.length - 1; i >= 0; i--) {
      const q = this.splats[i]!;
      if (s < q.until) continue;
      this.splats.splice(i, 1);
      const j = run.mud.indexOf(q.m);
      if (j >= 0) run.mud.splice(j, 1);
    }
  }

  /**
   * 5.4: the hero fell into him. A life (the run's own fall: power ends, game over at 0). Throws
   * pop. A carried bag is lost (a new one 1.0 s later). Back at x 50 while he goes back to the
   * right end; Gentle mode: climb out on his left lip, where he stays.
   */
  private fall(run: Run, ev: RunEvent[]): void {
    const s = run.steps;
    const d = this.data;
    if (this.carrying) {
      this.carrying = false;
      this.bagAt = s + secs(d.bag.newAfter);
    }
    this.popThrows(run, ev);
    run.fall(ev);
    if (run.phase !== 'arena') return;
    if (run.gentle) {
      const x = Math.max(d.leftLimit, this.lips[0] - POTHOLE_RULES.climbBack);
      const { down, move } = run.hero;
      run.hero = run.newHero(x);
      run.hero.down = down;
      run.safe = RULES.climbSafeSteps;
      run.dustOff = run.still ? 0 : RULES.dustOffSteps;
      if (run.dustOff === 0) run.hero.move = move;
      ev.push({ type: 'climbOut', kind: 'wide', x });
    } else run.hero.x = d.fall.backTo;
    // He goes back to the right end of his track, in Gentle mode too (OG-R24, OG-R26).
    this.moveTo(d.fall.pitTo);
    this.dir = -1;
    this.frozen = false;
    this.gulpAt = -1;
    this.nextThrowAt = Math.max(this.nextThrowAt, s + secs(this.phaseData.every));
  }

  /** 5.5: the funny, kind finish, seconds from the third bag. */
  private finish(run: Run, ev: RunEvent[]): void {
    const since = run.steps - this.defeatAt;
    const F = POTHOLE_FINISH;
    const W = OGUN_WORDS.hall;
    if (since === secs(F.yawn)) this.cue(ev, { sound: 'potYawn' });
    if (since === secs(F.toot)) this.cue(ev, { sound: 'rollerToot' });
    if (since === secs(2.5)) this.cue(ev, { say: W.smooth, ms: 2000 });
    potholeLampTimes().forEach((at, i) => {
      if (since === secs(at)) ev.push({ type: 'lamp', i });
    });
    if (since === secs(F.cheer)) this.cue(ev, { sound: 'bossWin', say: W.open, ms: POTHOLE_RULES.toastMs });
    if (since === secs(F.winScreen)) {
      run.phase = 'won';
      ev.push({ type: 'win' });
    }
  }

  /** A snapshot for tests and qa (window.__game.arena). */
  peek(): Record<string, unknown> {
    return {
      kind: 'king-pothole',
      doorMs: { ...DOOR_COST },
      pitX: this.pitX,
      lips: this.lips,
      dir: this.dir,
      frozen: this.frozen,
      hits: this.hits,
      phase: this.phase,
      carrying: this.carrying,
      bagReady: this.bagReady,
      defeated: this.defeated,
      finishT: this.finishT,
      gulp: this.gulp,
      blobs: this.blobs.map((b) => ({ ...this.blobAt(b), to: b.x1 })),
      mud: this.splats.map((q) => ({ ...q.m })),
      gravel: this.run.hazards.filter((z) => z.mode === 'move').map((z) => ({ x: z.x, y: z.y, vx: z.vx })),
      lives: this.run.lives,
      time: this.run.time,
      runPhase: this.run.phase,
    };
  }
}

/** The Ogun part's hall fight, for each try (load.ts WorldPart.hall.arena). */
export function potholeArena(data: PotholeData): (run: Run) => ArenaRules {
  return (run) => new PotholeFight(data, run);
}
