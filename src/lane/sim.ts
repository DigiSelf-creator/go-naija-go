/**
 * The lane run itself (docs/design.md S3f0 parts 4, 6, 7, 9 and 12): the hero's moves, the speed
 * curve, what stumbles, what bursts and how goats bounce, the pool of 20 road things (and 30
 * coins), and the endless chunks after the goal. One fixed step at a time, so it plays the same
 * on every phone. Pure: no DOM, no drawing; it reports what happened as events.
 */
import {
  HERO_DEPTH,
  HERO_HEIGHT,
  HERO_WIDTH,
  SIZE,
  isBurst,
  isDodge,
  speedAt,
  type BlackoutRules,
  type LaneChunk,
  type LaneLevel,
  type PickupKind,
  type SpeedCurve,
  type ThingKind,
} from './level';

export type LaneMove = 'left' | 'right' | 'jump' | 'slide';
export type LanePhase = 'run' | 'goal' | 'endless' | 'over';

/** Part 9: at most 20 road things on the road at once, and 30 coins. */
export const POOL_THINGS = 20;
export const POOL_COINS = 30;
/** The camera is 4 m behind the hero: anything further behind than this is gone. */
export const BEHIND = 5;
/** Part 4: a danfo hit from the front side-steps you into a free lane in this time. */
export const SIDE_STEP = 0.25;
/** Part 4: a goat bump slows you to 80 percent for 0.3 s. */
export const GOAT_SLOW = 0.8;
export const GOAT_TIME = 0.3;
/** Back to full speed over this long after a stumble (part 4). */
export const STUMBLE_RECOVER = 0.4;
/** The body while sliding is this tall (part 4). */
export const SLIDE_BODY = 0.8;
/** Part 11: corn lasts 12 s and tosses about twice a second at the nearest problem ahead in your lane. */
export const CORN_TIME = 12;
export const TOSS_EVERY = 0.5;
export const TOSS_REACH = 30;
/** One coin is 10 kobo. */
export const COIN_KOBO = 10;
/** Coin heights: a line at waist height, a low line under barrier arms, an arc over a jump. */
const COIN_H = 0.6;
const LOW_COIN_H = 0.35;

export type ThingState = 'idle' | 'done' | 'burst' | 'off' | 'taken';

/** One pooled road thing or pickup. */
export interface Slot {
  used: boolean;
  pickup: boolean;
  kind: ThingKind | PickupKind;
  d: number;
  lane: number;
  state: ThingState;
  /** Seconds since its state changed (for the burst, tip-over and trot drawings). */
  t: number;
}
export interface CoinSlot {
  used: boolean;
  d: number;
  lane: number;
  h: number;
  taken: boolean;
  t: number;
}

export type LaneEvent =
  | { type: 'move'; move: LaneMove }
  | { type: 'land' }
  | { type: 'stumble'; kind: ThingKind }
  | { type: 'sideBump' }
  | { type: 'burst'; kind: ThingKind; lane: number }
  | { type: 'goat'; lane: number }
  | { type: 'coin' }
  | { type: 'pickup'; kind: PickupKind }
  | { type: 'goal' }
  // S3f3: the Blackout, the buckets and the food.
  | { type: 'blackout'; by: number }
  | { type: 'shieldUsed' }
  | { type: 'garriExtra' }
  | { type: 'toss'; kind: ThingKind }
  | { type: 'caught' };

interface Spawn {
  d: number;
  lane: number;
  pickup: boolean;
  coin: boolean;
  kind: ThingKind | PickupKind;
  h: number;
}

/** A small seeded random number maker, so tests can play the endless part the same each time. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ease = (u: number): number => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));

/** The coins of one coin entry: a line or low line from d, 2 m apart, or an arc centred on d. */
export function expandCoins(d: number, lane: number, count: number, shape: 'line' | 'low' | 'arc', out: Spawn[] = []): Spawn[] {
  for (let i = 0; i < count; i++) {
    if (shape === 'arc') {
      const k = count > 1 ? (i / (count - 1)) * 2 - 1 : 0;
      out.push({ d: d + (i - (count - 1) / 2) * 2, lane, pickup: false, coin: true, kind: 'bulb', h: 0.7 + 0.8 * (1 - k * k) });
    } else out.push({ d: d + i * 2, lane, pickup: false, coin: true, kind: 'bulb', h: shape === 'low' ? LOW_COIN_H : COIN_H });
  }
  return out;
}

export interface LaneOptions {
  gentle?: boolean;
  rng?: () => number;
}

export class LaneSim {
  readonly level: LaneLevel;
  readonly curve: SpeedCurve;
  readonly gentle: boolean;
  readonly dark: BlackoutRules;
  private readonly rng: () => number;

  // S3f3 (part 9 to 11): what this run picked up, the Blackout, the shield and the corn.
  kobo = 0;
  power = 0;
  tech = 0;
  /** Metres between the Blackout and the hero. */
  gap = 0;
  shield = false;
  /** Corn seconds left. */
  corn = 0;
  private tossT = 0;

  phase: LanePhase = 'run';
  /** Metres from the start (the hero's feet). */
  dist = 0;
  /** Metres a second now, after stumbles and goat bumps. */
  speed = 0;
  /** Seconds of play (only while moving). */
  time = 0;

  // The hero across the road: the lane aimed at and the eased slide between lanes.
  lane = 1;
  x = 0;
  private moveFrom = 0;
  private moveTo = 0;
  private moveT = -1;
  private moveDur = 0;
  /** The lane the hero was in before the lane change now under way. */
  private fromLane = 1;
  /** The move under way is a side-step or a bump back, not the player's own. */
  private forced = false;
  // Up and down.
  /** Feet height, metres. */
  y = 0;
  jumpT = -1;
  slideT = -1;
  dropT = -1;
  private dropFrom = 0;
  /** Seconds since the last stumble began (-1: none yet). */
  tripT = -1;
  private goatT = -1;
  /** Nothing trips you before this time (after a stumble, a resume or "Keep running"). */
  safeUntil = 0;
  /** One move waiting (part 3, "Moves queue"). */
  queued: LaneMove | null = null;

  readonly things: Slot[] = [];
  readonly coins: CoinSlot[] = [];
  /** Things or coins that found no free slot (the level test keeps this 0). */
  overflow = 0;
  /** The most slots in use at once (for the pool test). */
  peak = 0;
  readonly events: LaneEvent[] = [];
  private readonly pressed: LaneEvent[] = [];

  private queue: Spawn[] = [];
  private head = 0;
  // The endless part.
  private next = 0;
  private chunk: LaneChunk | null = null;
  private beat = 0;
  private mirror = false;
  private recent: string[] = [];
  private foodNext = 0;
  private foodI = 0;
  private bulbI = 0;
  /** Chunk ids used, in order (for tests). */
  readonly chunksUsed: string[] = [];

  constructor(level: LaneLevel, opts: LaneOptions = {}) {
    this.level = level;
    this.gentle = opts.gentle ?? false;
    this.curve = this.gentle ? level.gentleSpeed : level.speed;
    this.dark = this.gentle ? level.gentleBlackout : level.blackout;
    this.rng = opts.rng ?? Math.random;
    for (let i = 0; i < POOL_THINGS; i++) this.things.push({ used: false, pickup: false, kind: 'cones', d: 0, lane: 0, state: 'idle', t: 0 });
    for (let i = 0; i < POOL_COINS; i++) this.coins.push({ used: false, d: 0, lane: 0, h: 0, taken: false, t: 0 });
    this.reset();
  }

  /** Back to 0 m in the middle lane with the fixed 600 m ahead ("Start again", "Run again"). */
  reset(): void {
    const L = this.level;
    this.phase = 'run';
    this.dist = 0;
    this.time = 0;
    this.lane = 1;
    this.fromLane = 1;
    this.x = 0;
    this.moveT = -1;
    this.y = 0;
    this.jumpT = this.slideT = this.dropT = -1;
    this.tripT = this.goatT = -1;
    this.safeUntil = 0;
    this.queued = null;
    this.events.length = 0;
    this.pressed.length = 0;
    this.overflow = 0;
    this.peak = 0;
    for (const s of this.things) s.used = false;
    for (const c of this.coins) c.used = false;
    const q: Spawn[] = [];
    for (const t of L.things) q.push({ d: t.d, lane: t.lane, pickup: false, coin: false, kind: t.kind, h: 0 });
    for (const p of L.pickups) q.push({ d: p.d, lane: p.lane, pickup: true, coin: false, kind: p.kind, h: 0 });
    for (const c of L.coins) expandCoins(c.d, c.lane, c.count, c.shape, q);
    q.sort((a, b) => a.d - b.d);
    this.queue = q;
    this.head = 0;
    this.chunk = null;
    this.recent = [];
    this.chunksUsed.length = 0;
    this.speed = speedAt(this.curve, L.goal, 0);
    this.kobo = this.power = this.tech = 0;
    this.gap = this.dark.start;
    this.shield = false;
    this.corn = 0;
    this.tossT = 0;
  }

  /** Part 10: how fast the Blackout creeps now (faster after the goal, up to its top). */
  creepNow(): number {
    const b = this.dark;
    const goal = this.level.goal;
    if (this.dist <= goal) return b.creep;
    return Math.min(b.afterGoalCreepMax, b.creep + (b.afterGoalCreepPer100 * (this.dist - goal)) / 100);
  }

  /** Power in: each one pushes the Blackout back (never past its furthest). */
  private addPower(n: number): void {
    if (n <= 0) return;
    this.power += n;
    const before = this.gap;
    this.gap = Math.min(this.dark.max, this.gap + this.dark.powerPush * n);
    if (this.gap > before) this.events.push({ type: 'blackout', by: this.gap - before });
  }

  private pop(kind: ThingKind): void {
    const p = this.level.pops[kind];
    if (!p) return;
    this.kobo += p.coins * COIN_KOBO;
    this.tech += p.tech;
    this.addPower(p.power);
  }

  laneX(lane: number): number {
    return (lane - 1) * this.level.laneWidth;
  }

  /** The body's height now: 0.8 m while sliding, else standing. */
  get bodyH(): number {
    return this.slideT >= 0 ? SLIDE_BODY : HERO_HEIGHT;
  }
  get changing(): boolean {
    return this.moveT >= 0;
  }
  get tripping(): boolean {
    return this.tripT >= 0 && this.tripT < this.level.move.stumbleTime;
  }
  get moving(): boolean {
    return this.phase === 'run' || this.phase === 'endless';
  }

  /** A swipe, key or button. Runs now, or waits (one move at most, the newest wins). */
  press(m: LaneMove): void {
    if (!this.moving) return;
    if (this.tryMove(m, this.pressed)) return;
    this.queued = m;
  }

  /** Nothing trips you for this long (part 7 rule 6: after "3, 2, 1" on any resume). */
  fresh(seconds: number): void {
    this.safeUntil = Math.max(this.safeUntil, this.time + seconds);
  }

  /** Part 12: "Keep running for more": the endless part, 2.5 s of open road first. */
  keepRunning(): void {
    if (this.phase !== 'goal') return;
    const L = this.level;
    this.phase = 'endless';
    this.next = this.dist + L.endless.clearAfterCard * speedAt(this.curve, L.goal, this.dist);
    this.foodNext = L.goal + L.endless.foodEvery;
    this.foodI = 0;
    this.chunk = null;
  }

  /** Ends the run where it is (caught, or left). */
  stop(): void {
    this.phase = 'over';
  }

  /** Test hook: jump the hero to distance d with the road ahead as the level has it. */
  warp(d: number): void {
    for (const s of this.things) s.used = false;
    for (const c of this.coins) c.used = false;
    this.dist = d;
    while (this.head < this.queue.length && this.queue[this.head]!.d < d + 2) this.head++;
    // In the endless part the next rows start from here (the ones skipped never come).
    if (this.phase === 'endless') this.next = Math.max(this.next, d + 20);
    this.fresh(1.5);
  }

  private tryMove(m: LaneMove, out: LaneEvent[] = this.events): boolean {
    const mv = this.level.move;
    if (this.tripping) return false;
    if (m === 'left' || m === 'right') {
      if (this.changing) return false;
      const to = this.lane + (m === 'left' ? -1 : 1);
      if (to < 0 || to > 2) return true; // the kerb: nothing happens, and nothing waits
      this.startLane(to, mv.laneChange);
    } else if (m === 'jump') {
      if (this.jumpT >= 0 || this.dropT >= 0) return false;
      this.slideT = -1;
      this.jumpT = 0;
    } else {
      if (this.dropT >= 0) return false;
      if (this.jumpT >= 0) {
        // Part 4: swipe down in the air drops you to the road in 0.12 s, then you slide.
        this.jumpT = -1;
        this.dropT = 0;
        this.dropFrom = this.y;
      } else this.slideT = 0;
    }
    out.push({ type: 'move', move: m });
    return true;
  }

  private startLane(to: number, dur: number, forced = false): void {
    this.forced = forced;
    this.fromLane = this.lane;
    this.lane = to;
    this.moveFrom = this.x;
    this.moveTo = this.laneX(to);
    this.moveT = 0;
    // A part-way move (a side bump back) takes its share of the time.
    this.moveDur = dur * Math.min(1, Math.max(0.3, Math.abs(this.moveTo - this.moveFrom) / this.level.laneWidth));
  }

  /** One fixed step of dt seconds. */
  step(dt: number): void {
    this.events.length = 0;
    // Moves pressed since the last step are reported with this one.
    for (const e of this.pressed) this.events.push(e);
    this.pressed.length = 0;
    if (!this.moving) return;
    const L = this.level;
    const mv = L.move;
    this.time += dt;

    // Across: the eased lane change.
    if (this.moveT >= 0) {
      this.moveT += dt;
      const u = this.moveT / this.moveDur;
      this.x = this.moveFrom + (this.moveTo - this.moveFrom) * ease(u);
      if (u >= 1) {
        this.x = this.moveTo;
        this.moveT = -1;
      }
    }
    // Up and down: the jump, the drop and the slide.
    if (this.jumpT >= 0) {
      this.jumpT += dt;
      const u = this.jumpT / mv.jumpTime;
      if (u >= 1) {
        this.jumpT = -1;
        this.y = 0;
        this.events.push({ type: 'land' });
      } else this.y = 4 * mv.jumpHeight * u * (1 - u);
    } else if (this.dropT >= 0) {
      this.dropT += dt;
      const u = this.dropT / mv.dropTime;
      if (u >= 1) {
        this.dropT = -1;
        this.y = 0;
        this.slideT = 0;
      } else this.y = this.dropFrom * (1 - u);
    } else if (this.slideT >= 0) {
      this.slideT += dt;
      if (this.slideT >= mv.slideTime) this.slideT = -1;
    }
    if (this.tripT >= 0) this.tripT += dt;
    if (this.goatT >= 0) this.goatT += dt;
    if (this.queued && this.tryMove(this.queued)) this.queued = null;

    // Along: the speed comes from the distance (part 4), slowed by a stumble or a goat.
    let k = 1;
    if (this.tripT >= 0) {
      const over = this.tripT - mv.stumbleTime;
      k = over < 0 ? mv.stumbleSlow : over < STUMBLE_RECOVER ? mv.stumbleSlow + ((1 - mv.stumbleSlow) * over) / STUMBLE_RECOVER : 1;
    }
    if (this.goatT >= 0 && this.goatT < GOAT_TIME) k = Math.min(k, GOAT_SLOW);
    this.speed = speedAt(this.curve, L.goal, this.dist) * k;
    const before = this.dist;
    this.dist += this.speed * dt;
    if (this.phase === 'run' && this.dist >= L.goal) {
      this.dist = L.goal;
      this.phase = 'goal';
      this.events.push({ type: 'goal' });
    }

    if (this.phase === 'endless') this.fill();
    this.spawn();
    this.hits(before);
    if (this.corn > 0) this.tossCorn(dt);
    // Part 10: the Blackout creeps closer; at 0 m it has caught you (you keep everything).
    if (this.phase !== 'goal') {
      this.gap -= this.creepNow() * dt;
      if (this.gap <= 0) {
        this.gap = 0;
        this.phase = 'over';
        this.corn = 0;
        this.events.push({ type: 'caught' });
      }
    }
    for (const s of this.things) if (s.used) s.t += dt;
    for (const c of this.coins) if (c.used) c.t += dt;
  }

  /** Takes road things and coins from the queue into the pool as they come 60 m ahead; frees what is behind. */
  private spawn(): void {
    const ahead = this.dist + this.level.spawnAhead;
    for (const s of this.things) if (s.used && s.d + 3 < this.dist - BEHIND) s.used = false;
    for (const c of this.coins) if (c.used && c.d < this.dist - BEHIND) c.used = false;
    while (this.head < this.queue.length && this.queue[this.head]!.d <= ahead) {
      const e = this.queue[this.head++]!;
      if (e.coin) {
        const c = this.coins.find((x) => !x.used);
        if (!c) {
          this.overflow++;
          continue;
        }
        c.used = true;
        c.d = e.d;
        c.lane = e.lane;
        c.h = e.h;
        c.taken = false;
        c.t = 0;
      } else {
        const s = this.things.find((x) => !x.used);
        if (!s) {
          this.overflow++;
          continue;
        }
        s.used = true;
        s.pickup = e.pickup;
        s.kind = e.kind;
        s.d = e.d;
        s.lane = e.lane;
        s.state = 'idle';
        s.t = 0;
      }
    }
    let n = 0;
    for (const s of this.things) if (s.used) n++;
    if (n > this.peak) this.peak = n;
    // The endless queue only grows at its end: drop what is spawned now and then.
    if (this.head > 256) {
      this.queue.splice(0, this.head);
      this.head = 0;
    }
  }

  private stumble(kind: ThingKind): void {
    const mv = this.level.move;
    if (this.shield) {
      // Part 10 and 11: the garri shield takes one stumble: no trip, the Blackout gains nothing.
      this.shield = false;
      this.safeUntil = Math.max(this.safeUntil, this.time + mv.safeAfterStumble);
      this.events.push({ type: 'shieldUsed' });
      return;
    }
    this.gap -= this.dark.stumble;
    this.events.push({ type: 'blackout', by: -this.dark.stumble });
    this.tripT = 0;
    this.slideT = -1;
    this.queued = null;
    this.safeUntil = Math.max(this.safeUntil, this.time + mv.stumbleTime + mv.safeAfterStumble);
    this.events.push({ type: 'stumble', kind });
  }

  /** The lane a front danfo hit side-steps you into: the lane you came from first, else the nearest free one. */
  private freeLaneNear(): number {
    const order = [this.fromLane, this.lane - 1, this.lane + 1, this.lane - 2, this.lane + 2].filter((l, i, a) => l >= 0 && l <= 2 && l !== this.lane && a.indexOf(l) === i);
    for (const l of order) {
      const blocked = this.things.some((s) => s.used && !s.pickup && s.lane === l && s.state === 'idle' && s.kind === 'danfo' && s.d + 3 > this.dist - 1 && s.d - 3 < this.dist + 8);
      if (!blocked) return l;
    }
    return order[0] ?? this.lane;
  }

  private hits(before: number): void {
    const L = this.level;
    const mv = L.move;
    const halfDepth = HERO_DEPTH / 2;
    const safe = this.time < this.safeUntil;
    for (const s of this.things) {
      if (!s.used || s.state !== 'idle') continue;
      const sx = this.laneX(s.lane);
      if (s.pickup) {
        if (Math.abs(s.d - this.dist) < 0.6 && Math.abs(sx - this.x) < 1.0) {
          s.state = 'taken';
          s.t = 0;
          this.events.push({ type: 'pickup', kind: s.kind as PickupKind });
          this.take(s.kind as PickupKind);
        }
        continue;
      }
      const kind = s.kind as ThingKind;
      const size = SIZE[kind];
      const reach = size.len / 2 + halfDepth;
      const wide = size.w / 2 + HERO_WIDTH / 2;
      if (Math.abs(s.d - this.dist) >= reach || Math.abs(sx - this.x) >= wide) continue;
      if (kind === 'danfo') {
        // Already beside it last step: the hero changed lane into its side. A soft bump back.
        if (Math.abs(s.d - before) < reach) {
          if (this.changing && !this.forced) {
            this.startLane(this.fromLane, L.move.laneChange, true);
            this.events.push({ type: 'sideBump' });
          }
          continue;
        }
        // From the front: a stumble (none while safe), and a side-step into a free lane.
        if (!safe) this.stumble(kind);
        this.startLane(this.freeLaneNear(), SIDE_STEP, true);
        continue;
      }
      if (isBurst(kind)) {
        if (this.y >= size.h) continue; // jumped clean over it
        s.state = 'burst';
        s.t = 0;
        this.events.push({ type: 'burst', kind, lane: s.lane });
        this.pop(kind);
        continue;
      }
      if (kind === 'goat') {
        if (this.y >= size.h) continue;
        s.state = 'off';
        s.t = 0;
        this.goatT = 0;
        this.events.push({ type: 'goat', lane: s.lane });
        this.pop('goat');
        continue;
      }
      if (!isDodge(kind)) continue;
      // Cones and potholes: cleared while the feet are 0.35 m up. The barrier arm: slide under it.
      const hit = kind === 'barrier' ? this.y < size.h && this.y + this.bodyH > (size.low ?? 0) : this.y < mv.clearFeet;
      if (!hit || safe) continue;
      // Cones tip over, the arm swings up, a pothole is stumbled across: the road ahead is open.
      s.state = 'done';
      s.t = 0;
      this.stumble(kind);
    }
    for (const c of this.coins) {
      if (!c.used || c.taken) continue;
      if (Math.abs(c.d - this.dist) >= 0.6 || Math.abs(this.laneX(c.lane) - this.x) >= 0.9) continue;
      if (c.h < this.y - 0.3 || c.h > this.y + this.bodyH + 0.3) continue;
      c.taken = true;
      c.t = 0;
      this.kobo += COIN_KOBO;
      this.events.push({ type: 'coin' });
    }
  }

  private take(kind: PickupKind): void {
    if (kind === 'bulb') this.addPower(1);
    else if (kind === 'chip') this.tech++;
    else if (kind === 'garri') {
      // A second garri while shielded gives 3 coins instead.
      if (this.shield) {
        this.kobo += 3 * COIN_KOBO;
        this.events.push({ type: 'garriExtra' });
      } else this.shield = true;
    } else {
      this.corn = CORN_TIME;
      this.tossT = 0;
    }
  }

  /** Part 11: corn at the nearest problem ahead in your lane, about twice a second. Never a danfo. */
  private tossCorn(dt: number): void {
    this.corn = Math.max(0, this.corn - dt);
    this.tossT -= dt;
    if (this.tossT > 0) return;
    let best: Slot | null = null;
    for (const s of this.things) {
      if (!s.used || s.pickup || s.state !== 'idle' || s.kind === 'danfo' || s.lane !== this.lane) continue;
      if (s.d <= this.dist + 1 || s.d - this.dist > TOSS_REACH) continue;
      if (!best || s.d < best.d) best = s;
    }
    if (!best) return;
    this.tossT = TOSS_EVERY;
    const kind = best.kind as ThingKind;
    best.t = 0;
    this.events.push({ type: 'toss', kind });
    if (isBurst(kind)) {
      best.state = 'burst';
      this.events.push({ type: 'burst', kind, lane: best.lane });
      this.pop(kind);
    } else if (kind === 'goat') {
      best.state = 'off';
      this.events.push({ type: 'goat', lane: best.lane });
      this.pop('goat');
    } else best.state = 'done';
  }

  /** Part 12: rows from the chunks, one beat apart at any speed, as they come near. */
  private fill(): void {
    const L = this.level;
    const E = L.endless;
    while (this.next <= this.dist + L.spawnAhead + 10) {
      const d = this.next;
      const v = speedAt(this.curve, L.goal, d);
      this.next += E.beat * v;
      if (!this.chunk) {
        if (d >= this.foodNext) {
          // A food every 400 m, garri then corn in turn, in the middle lane on its own row.
          this.queue.push({ d, lane: 1, pickup: true, coin: false, kind: E.foods[this.foodI++ % E.foods.length]!, h: 0 });
          this.foodNext += E.foodEvery;
          continue;
        }
        const choices = L.chunks.filter((c) => !this.recent.includes(c.id));
        const c = choices[Math.min(choices.length - 1, Math.floor(this.rng() * choices.length))]!;
        this.chunk = c;
        this.beat = 0;
        this.bulbI = 0;
        this.mirror = E.mirror && this.rng() < 0.5;
        this.recent.push(c.id);
        if (this.recent.length > E.noRepeat) this.recent.shift();
        this.chunksUsed.push(c.id);
      }
      const c = this.chunk;
      const lane = (l: number): number => (this.mirror ? 2 - l : l);
      const row = c.beats[this.beat]!;
      for (let l = 0; l < 3; l++) {
        const k = row[l];
        if (k) this.queue.push({ d, lane: lane(l), pickup: false, coin: false, kind: k, h: 0 });
      }
      for (const p of c.pickups) {
        if (p.beat !== this.beat) continue;
        let kind = p.kind;
        // After 1,600 m every second bulb in a chunk becomes a chip.
        if (kind === 'bulb' && this.bulbI++ % 2 === 1 && d >= E.fewerBulbsAfter) kind = 'chip';
        this.queue.push({ d, lane: lane(p.lane), pickup: true, coin: false, kind, h: 0 });
      }
      for (const p of c.coins) if (p.beat === this.beat) expandCoins(d, lane(p.lane), p.count, p.shape, this.queue);
      if (++this.beat >= c.beats.length) this.chunk = null;
    }
  }
}
