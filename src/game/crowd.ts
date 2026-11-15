/**
 * People everywhere (task S3g1b; docs/design.md "People everywhere", parts 3 to 6, 10 and 11).
 *
 * The plain, tested rules for the people in a street, the well room and the hall: where they
 * may stand (crowdSpots, with every clear zone of part 3), who they are (the casts, never the
 * player's own look), how walkers walk and step aside, and when people wave, call out and cheer
 * (part 5), with one bubble at a time. No drawing here (src/game/crowdDraw.ts draws): this file
 * only reads the run, so people never change the game. They have no hitbox and are never hurt.
 */
import { BUS_PARK_CROWD, HALL_CROWD, STORE_KEEPER_SPOT, STREET_CASTS, isHeroLook } from '../art/folkCasts';
import type { FolkFrame, FolkLook } from '../art/folk';
import { WORDS } from '../screens/words';
import type { Level } from './level';
import { SIGN_BEFORE, pitsOf, roadSigns } from './pits';

export type CrowdLook = 'tired' | 'bright' | 'fixed';
export type StreetName = 'alausa' | 'village' | 'ikeja';
export interface Span {
  a: number;
  b: number;
}
interface HeroLike {
  skin: number;
  hair: number;
  outfit: number;
}

/** Part 3, 5 and 11 numbers. */
export const CROWD = {
  /** Feet this far above the hero's feet line (PE-R1). */
  feetUp: 8,
  /** Half a person's width (u): a spot keeps this far inside its free stretch. */
  half: 14,
  minStand: 60,
  minWalk: 200,
  standEvery: { tired: 320, bright: 160, fixed: 160 } as Record<CrowdLook, number>,
  walkEvery: { tired: 900, bright: 450, fixed: 450 } as Record<CrowdLook, number>,
  /** Street people on one screen at most (part 3). */
  onScreen: { tired: 4, bright: 8, fixed: 9 } as Record<CrowdLook, number>,
  /** Everyone drawn in a street frame at most (part 11), the bus stop and park included. */
  maxDrawn: 12,
  waveNear: 140,
  waveTime: 1,
  waveGap: 10,
  stepNear: 60,
  stepBack: 4,
  callTime: 1.6,
  callGap: 12,
  cheerTime: 1,
  cheerGap: 4,
  cheerCount: 3,
  stopCheer: 1.5,
  bubbleTime: 1.6,
  /** Greetings with a wave: at most one every this many seconds. */
  greetGap: 6,
  walkSpeed: [30, 45] as const,
  doorWait: 3,
  /** After a lost life nobody reacts at all for this long (rule 4, PE-R3). */
  hushAfterLoss: 2.5,
} as const;

/* ------------------------------------------------------------------ seeds */

/** A small seeded random (mulberry32): the same street gives the same people every try. */
export function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function seedOf(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/* ------------------------------------------------------------------ clear zones */

/** The x stretches (level units) where nobody stands or walks (part 3), merged and sorted. */
export function clearZones(level: Level): Span[] {
  const z: Span[] = [];
  const gy = level.groundY;
  const add = (a: number, b: number): void => {
    if (b > a) z.push({ a, b });
  };
  for (const p of pitsOf(level.ground)) add(p.a - 40, p.b + 40);
  for (const w of level.wells) {
    add(w.x - 120, w.x + 120);
    add(w.exitX - 120, w.exitX + 120);
  }
  for (const s of roadSigns(level)) add(s.x - 30, s.x + 30);
  for (const p of level.terrain.platforms) add(p.x - 20, p.x + p.w + 20);
  for (const x of cratePoles(level)) add(x - 30, x + 30);
  for (const h of level.hazards) add(h.x - 80, h.x + 80);
  for (const x of level.piles) add(x - 80, x + 80);
  for (const c of level.coins) if (c.y > gy - 40) add(c.x - 20, c.x + 20);
  for (const f of level.foods) if (f.y > gy - 40) add(f.x - 20, f.x + 20);
  for (const q of level.gutters) add(q.x - 20, q.x + q.w + 20);
  // The start fence, the checkpoint bus stop and the bus park have their own people (part 5).
  if (Number.isFinite(level.startWall)) add(level.startWall - 100, level.startWall + 110);
  add(level.checkpoint - 70, level.checkpoint + 170);
  if (level.end) add(level.end.x - 200, Infinity);
  return merge(z);
}

/** The crate poles (game.ts drawCrates): crates at one height under 160 u apart share a line, poles 36 u outside. */
export function cratePoles(level: Pick<Level, 'crates'>): number[] {
  const cs = [...level.crates].sort((p, q) => p.x - q.x);
  const out: number[] = [];
  for (let i = 0; i < cs.length; ) {
    let j = i;
    while (j + 1 < cs.length && cs[j + 1]!.bottomY === cs[i]!.bottomY && cs[j + 1]!.x - cs[j]!.x < 160) j++;
    out.push(cs[i]!.x - 36, cs[j]!.x + 36);
    i = j + 1;
  }
  return out;
}

function merge(z: Span[]): Span[] {
  z.sort((p, q) => p.a - q.a);
  const out: Span[] = [];
  for (const s of z) {
    const last = out[out.length - 1];
    if (last && s.a <= last.b) last.b = Math.max(last.b, s.b);
    else out.push({ ...s });
  }
  return out;
}

/** The free stretches between `from` and `to` once the clear zones are taken out. */
export function freeStretches(zones: readonly Span[], from: number, to: number): Span[] {
  const out: Span[] = [];
  let x = from;
  for (const z of zones) {
    if (z.b <= x) continue;
    if (z.a >= to) break;
    if (z.a > x) out.push({ a: x, b: Math.min(z.a, to) });
    x = Math.max(x, z.b);
    if (x >= to) break;
  }
  if (x < to) out.push({ a: x, b: to });
  return out;
}

/* ------------------------------------------------------------------ casts */

export const STREET_OF: Readonly<Record<string, StreetName>> = { 'lagos-1': 'alausa', 'lagos-2': 'village', 'lagos-3': 'ikeja' };
export const STREET_FROM: Readonly<Record<StreetName, number>> = { alausa: 760, village: 1000, ikeja: 1000 };

/** A traders' held thing: they stand and call out (part 4). */
const TRADER_HOLDS = new Set(['breadTray', 'phoneCase', 'ankaraRoll', 'pack', 'basket']);
export const isTrader = (l: FolkLook): boolean => !!l.hold && TRADER_HOLDS.has(l.hold) && l.age !== 'child';

/** A cast with the player's own look taken out (part 3). Never empty. */
export function withoutHero(looks: readonly FolkLook[], hero: HeroLike | null): FolkLook[] {
  const out = hero ? looks.filter((l) => !isHeroLook(l, hero)) : [...looks];
  return out.length ? out : [...looks.slice(0, 1)].map((l) => ({ ...l, skin: (l.skin + 1) % 7 }));
}

/** The street's cast: its 16 looks then the bus park's (both without the player's look). */
export function streetCast(street: StreetName, hero: HeroLike | null): { looks: FolkLook[]; park: number } {
  const own = withoutHero(STREET_CASTS[street], hero);
  return { looks: [...own, ...withoutHero(BUS_PARK_CROWD, hero)], park: own.length };
}

/* ------------------------------------------------------------------ spots */

export type SpotKind = 'stand' | 'trader' | 'sit' | 'child';
export interface Spot {
  x: number;
  look: number;
  kind: SpotKind;
  flip: boolean;
}
export interface WalkerPlan {
  a: number;
  b: number;
  x: number;
  dir: 1 | -1;
  speed: number;
  look: number;
}
export interface CrowdPlan {
  look: CrowdLook;
  zones: Span[];
  free: Span[];
  stands: Spot[];
  walkers: WalkerPlan[];
  /** The fixed look's pair of children with their ball (x of the left child, 40 u apart). */
  children: { x: number; looks: [number, number] } | null;
  /** People at the checkpoint bus stop and at the bus park (part 5). */
  stop: Spot[];
  park: Spot[];
}

/**
 * Part 3: the standing spots and walker stretches of a street, from its level file, for its look
 * (tired, bright or fixed), the same every try (a fixed seed per street). `from`: where the
 * counts start (after the first screen, which S3e0 keeps). `looks`: the cast (streetCast).
 */
export function crowdSpots(level: Level, look: CrowdLook, looks: readonly FolkLook[], parkFrom = looks.length, from = STREET_FROM[STREET_OF[level.id] ?? 'alausa']): CrowdPlan {
  const rand = seeded(seedOf(`${level.id}|${look}`));
  const zones = clearZones(level);
  const lastGround = level.ground.length ? level.ground[level.ground.length - 1]![1] : from;
  const to = level.end ? level.end.x : lastGround;
  const free = freeStretches(zones, from, to).filter((s) => s.b - s.a >= CROWD.minStand);
  const own = Array.from({ length: Math.max(1, Math.min(parkFrom, looks.length)) }, (_, i) => i);
  const traders = own.filter((i) => looks[i] && isTrader(looks[i]!));
  const movers = own.filter((i) => looks[i] && !isTrader(looks[i]!) && looks[i]!.age !== 'elder' && !looks[i]!.stool);
  const pick = (list: readonly number[], k: number): number => list[k % Math.max(1, list.length)] ?? 0;

  // Standing: spread along the joined free length, one per standEvery.
  const total = free.reduce((n, s) => n + (s.b - s.a), 0);
  const nStand = Math.floor(total / CROWD.standEvery[look]);
  const stands: Spot[] = [];
  const order = shuffled(own, rand);
  for (let k = 0; k < nStand; k++) {
    const at = (total * (k + 0.5 + (rand() - 0.5) * 0.5)) / Math.max(1, nStand);
    const x = alongFree(free, at);
    if (x === null) continue;
    const i = order[k % order.length]!;
    const l = looks[i]!;
    const kind: SpotKind = isTrader(l) ? 'trader' : l.age === 'child' ? 'child' : l.age === 'elder' && k % 2 === 0 ? 'sit' : 'stand';
    stands.push({ x, look: i, kind, flip: rand() < 0.5 });
  }
  // Every street has at least one trader calling when it has standing people and traders.
  if (traders.length && stands.length && !stands.some((s) => s.kind === 'trader')) {
    const s = stands[Math.floor(stands.length / 2)]!;
    s.look = traders[0]!;
    s.kind = 'trader';
  }
  // Walkers: one per walkEvery of free length, each in its own stretch of 200 u or more.
  const long = free.filter((s) => s.b - s.a >= CROWD.minWalk);
  const nWalk = Math.min(long.length, Math.floor(total / CROWD.walkEvery[look]));
  const walkers: WalkerPlan[] = [];
  const longOrder = shuffled(long.map((_, i) => i), rand)
    .slice(0, nWalk)
    .sort((p, q) => p - q);
  longOrder.forEach((li, k) => {
    const s = long[li]!;
    const a = s.a + CROWD.half;
    const b = s.b - CROWD.half;
    walkers.push({ a, b, x: a + (b - a) * rand(), dir: rand() < 0.5 ? 1 : -1, speed: CROWD.walkSpeed[0] + (CROWD.walkSpeed[1] - CROWD.walkSpeed[0]) * rand(), look: pick(movers.length ? movers : own, k * 3 + 1) });
  });
  // The fixed look's children with their ball: in the longest stretch that holds them.
  let children: CrowdPlan['children'] = null;
  if (look === 'fixed') {
    const kids = own.filter((i) => looks[i]?.age === 'child');
    const room = [...free].sort((p, q) => q.b - q.a - (p.b - p.a))[0];
    if (room && room.b - room.a >= 40 + CROWD.half * 2 + 20) {
      const mid = (room.a + room.b) / 2;
      children = { x: mid - 20, looks: [kids[0] ?? own[0]!, kids[1] ?? kids[0] ?? own[1 % own.length]!] };
      // Nobody else stands on top of them.
      for (let k = stands.length - 1; k >= 0; k--) if (Math.abs(stands[k]!.x - mid) < 50) stands.splice(k, 1);
    }
  }
  const street = STREET_OF[level.id] ?? 'alausa';
  const nStop = street === 'alausa' ? 2 : 3;
  const stop: Spot[] = Array.from({ length: nStop }, (_, k) => ({ x: level.checkpoint + 20 + k * 30, look: order[(k * 5 + 3) % order.length]!, kind: 'stand', flip: k % 2 === 1 }));
  const park: Spot[] = [];
  if (level.end) {
    const parkLooks = looks.length - own.length;
    for (let k = 0; k < Math.min(5, Math.max(0, parkLooks)); k++) {
      const i = own.length + k;
      const l = looks[i]!;
      park.push({ x: level.end.x - 150 + k * 22, look: i, kind: l.age === 'elder' ? 'sit' : l.age === 'child' ? 'child' : 'stand', flip: false });
    }
  }
  return { look, zones, free, stands, walkers, children, stop, park };
}
function shuffled<T>(list: readonly T[], rand: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** The x `at` units along the joined free stretches, kept a person's half width inside its stretch. */
function alongFree(free: readonly Span[], at: number): number | null {
  let n = 0;
  for (const s of free) {
    const len = s.b - s.a;
    if (at < n + len) {
      const x = s.a + (at - n);
      return Math.min(s.b - CROWD.half, Math.max(s.a + CROWD.half, x));
    }
    n += len;
  }
  const last = free[free.length - 1];
  return last ? last.b - CROWD.half : null;
}

/** True when x is inside a clear zone (for tests and the walkers' own check). */
export function inZone(zones: readonly Span[], x: number, pad = 0): boolean {
  return zones.some((z) => x + pad > z.a && x - pad < z.b);
}

/* ------------------------------------------------------------------ words */

export type Lang = 'en' | 'pcm' | 'yo' | 'ha' | 'ig';
export const LANGS: readonly Lang[] = ['en', 'pcm', 'yo', 'ha', 'ig'];
type Lines = Readonly<Partial<Record<Lang, readonly string[]>>>;

/** One line in an equal share of languages (decision 30): pick the language first, then the line. */
export function pickLine(lines: Lines, rand: () => number): string {
  const langs = LANGS.filter((l) => (lines[l]?.length ?? 0) > 0);
  const lang = langs[Math.floor(rand() * langs.length) % Math.max(1, langs.length)];
  const list = (lang && lines[lang]) || [];
  return list[Math.floor(rand() * list.length) % Math.max(1, list.length)] ?? '';
}

/* ------------------------------------------------------------------ the life of a street */

/** One person to draw this frame (crowdDraw.ts draws it with one drawImage). */
export interface FolkDraw {
  look: number;
  frame: FolkFrame;
  x: number;
  /** Feet line (world y). */
  y: number;
  flip: boolean;
  size: number;
  /** Never dropped when backing off (none in a street: S3e0's first-screen people are art's). */
  keep?: boolean;
  /** A walker or a jogger (dropped first when backing off). */
  mover?: boolean;
}
export interface Bubble {
  text: string;
  /** The tail tip (world units): just above the speaker's head. */
  x: number;
  y: number;
  /** Seconds left. */
  left: number;
  who: number;
}

interface Person {
  spot: Spot;
  waveAt: number;
  callAt: number;
  cheerAt: number;
  cheerLen: number;
  /** After a cheer the stop and park people wave until this time. */
  waveTill: number;
}
interface Walker extends WalkerPlan {
  mode: 'walk' | 'door' | 'aside';
  t: number;
  back: number;
  rand: () => number;
  waveAt: number;
}

/** What the street's people need from the run each step. */
export interface CrowdView {
  /** Camera left edge and screen width (world units). */
  camX: number;
  viewW: number;
  hero: { x: number; vx: number; grounded: boolean };
  /** The street end: the bus is boarding or gone. */
  atBus: boolean;
  checkpointReached: boolean;
}

/** Events the people react to (a subset of the run's events). */
export type CrowdEvent =
  | { type: 'goatEat' | 'weedsDry' | 'checkpoint' | 'busBoard' | 'busGo' | 'hit' | 'fall' | 'gameOver'; x?: number }
  | { type: 'smash' | 'fufuKnock'; kind: string; x: number }
  | { type: string; x?: number; kind?: string };

/** What the screen should do now: the sounds asked for (main plays them, within the rules). */
export interface CrowdSay {
  cheer: 'crowdCheer' | 'crowdCheerBig' | null;
}

/**
 * A street's people over a run (part 5): walkers walk and step aside, standing people wave,
 * traders call, the nearest three cheer a cleared problem, the bus stop and the bus park cheer.
 * Nothing at all happens on a lost life. Reads only; never changes the run.
 */
export class StreetCrowd {
  readonly people: Person[];
  readonly walkers: Walker[];
  readonly stop: Person[];
  readonly park: Person[];
  bubble: Bubble | null = null;
  time = 0;
  private lastCheer = -Infinity;
  private lastGreet = -Infinity;
  private hushTill = -Infinity;
  private rand: () => number;
  /** Signed potholes: [left lip, right lip] of every gap with a sign (a jump over one is cheered). */
  private signed: Span[];
  private groundFrom = 0;
  private wasAir = false;
  private parkCheerTill = -Infinity;
  /** Backing off (part 11): 0 everyone, 1 no walkers, 2 half the standing people too. */
  backOff = 0;
  /** Reduced motion: walkers stand still; a wave or cheer is one still pose. */
  still = false;
  /** People seen on the screen in the last frame (for the murmur). */
  seen = 0;

  constructor(
    readonly plan: CrowdPlan,
    readonly street: StreetName,
    readonly groundY: number,
    level: Level,
  ) {
    const p = (spot: Spot): Person => ({ spot, waveAt: -Infinity, callAt: -Infinity, cheerAt: -Infinity, cheerLen: 0, waveTill: -Infinity });
    this.people = plan.stands.map(p);
    this.stop = plan.stop.map(p);
    this.park = plan.park.map(p);
    this.walkers = plan.walkers.map((w, i) => ({ ...w, mode: 'walk', t: 0, back: 0, rand: seeded(seedOf(`${level.id}|w${i}`)), waveAt: -Infinity }));
    this.rand = seeded(seedOf(`${level.id}|talk`));
    const signs = roadSigns(level);
    this.signed = pitsOf(level.ground)
      .filter((q) => signs.some((s) => Math.abs(s.x - (q.a - SIGN_BEFORE)) < 1))
      .map((q) => ({ a: q.a, b: q.b }));
  }

  /** Words for a cheer, a greeting or a trader's call. */
  private line(kind: 'cheer' | 'greet' | 'trader' | 'bus'): string {
    const F = WORDS.folk;
    if (kind === 'cheer') return pickLine(F.cheers, this.rand);
    if (kind === 'bus') return pickLine(F.bus, this.rand);
    if (kind === 'trader') {
      const list = F.traders[this.street];
      return list[Math.floor(this.rand() * list.length) % list.length]!;
    }
    // Morning greetings on Alausa as well as the any-time ones.
    const any = F.greet;
    if (this.street !== 'alausa' || this.rand() < 0.5) return pickLine(any, this.rand);
    return pickLine(F.greetMorning, this.rand);
  }

  private say(text: string, who: number, x: number, headY: number): void {
    if (this.bubble || !text) return;
    this.bubble = { text, x, y: headY - 3, left: CROWD.bubbleTime, who };
  }

  private onScreen(x: number, v: CrowdView): boolean {
    return x > v.camX + 10 && x < v.camX + v.viewW - 10;
  }

  /** A step of `dt` seconds with the run's events of that step. Returns the sound to play, if any. */
  update(dt: number, v: CrowdView, events: readonly CrowdEvent[]): CrowdSay {
    this.time += dt;
    const t = this.time;
    const out: CrowdSay = { cheer: null };
    const lost = events.some((e) => e.type === 'hit' || e.type === 'fall' || e.type === 'gameOver');
    if (lost) {
      // Rule 4: nobody reacts to a lost life. Everything stops at once and stays quiet a while.
      this.hushTill = t + CROWD.hushAfterLoss;
      this.bubble = null;
      for (const p of [...this.people, ...this.stop, ...this.park]) {
        p.waveAt = p.cheerAt = -Infinity;
        p.waveTill = -Infinity;
      }
      for (const w of this.walkers) w.waveAt = -Infinity;
    }
    if (this.bubble) {
      this.bubble.left -= dt;
      if (this.bubble.left <= 0) this.bubble = null;
    }
    const hush = t < this.hushTill;
    const h = v.hero;
    // Walkers (part 5): 30 to 45 u/s in their own stretch; turn or step into a door at the ends.
    for (const w of this.walkers) this.walk(w, dt, v);
    if (hush) {
      this.trackJump(h);
      return out;
    }
    // Standing people wave once when the hero comes within 140 u; traders call out.
    for (const [i, p] of this.people.entries()) {
      if (!this.onScreen(p.spot.x, v)) continue;
      const near = Math.abs(h.x - p.spot.x) < CROWD.waveNear;
      if (near && t - p.waveAt >= CROWD.waveGap && t - p.cheerAt > CROWD.cheerTime) {
        p.waveAt = t;
        if (p.spot.kind !== 'trader' && t - this.lastGreet >= CROWD.greetGap && !this.bubble) {
          this.lastGreet = t;
          this.say(this.line('greet'), i, p.spot.x, this.groundY - CROWD.feetUp - 37);
        }
      }
      if (p.spot.kind === 'trader' && t - p.callAt >= CROWD.callGap && !this.bubble && !near) {
        p.callAt = t;
        this.say(this.line('trader'), i, p.spot.x, this.groundY - CROWD.feetUp - 37);
      }
    }
    // Cleared problems: the 3 nearest people on screen cheer; at most one cheer every 4 s.
    const cleared = events.find((e) => e.type === 'goatEat' || e.type === 'weedsDry' || ((e.type === 'smash' || e.type === 'fufuKnock') && e.kind === 'drum'));
    const jumped = this.trackJump(h);
    const at = cleared ? (cleared.x ?? h.x) : jumped;
    if (at !== null && t - this.lastCheer >= CROWD.cheerGap) {
      const near = this.people
        .map((p, i) => ({ p, i, d: Math.abs(p.spot.x - at) }))
        .filter((q) => this.onScreen(q.p.spot.x, v))
        .sort((a, b) => a.d - b.d)
        .slice(0, CROWD.cheerCount);
      if (near.length) {
        this.lastCheer = t;
        for (const q of near) {
          q.p.cheerAt = t;
          q.p.cheerLen = CROWD.cheerTime;
        }
        const first = near[0]!;
        this.bubble = null;
        this.say(this.line('cheer'), first.i, first.p.spot.x, this.groundY - CROWD.feetUp - 37);
        out.cheer = 'crowdCheer';
      }
    }
    // The checkpoint bus stop lights: its people cheer, then wave (1.5 s).
    if (events.some((e) => e.type === 'checkpoint')) {
      for (const p of this.stop) {
        p.cheerAt = t;
        p.cheerLen = CROWD.stopCheer * 0.5;
        p.waveTill = t + CROWD.stopCheer;
      }
      if (t - this.lastCheer >= CROWD.cheerGap && this.stop.some((p) => this.onScreen(p.spot.x, v))) {
        this.lastCheer = t;
        out.cheer = 'crowdCheer';
      }
    }
    // The bus park: cheer from the hop on to the pull away, then wave the bus off.
    if (events.some((e) => e.type === 'busBoard')) {
      this.parkCheerTill = t + 1.4;
      for (const p of this.park) {
        p.cheerAt = t;
        p.cheerLen = 1.4;
        p.waveTill = t + 2.4;
      }
      this.lastCheer = t;
      out.cheer = 'crowdCheerBig';
      const p0 = this.park[1] ?? this.park[0];
      if (p0) {
        this.bubble = null;
        this.say(this.line('bus'), -1, p0.spot.x, this.groundY - CROWD.feetUp - 37);
      }
    }
    return out;
  }

  /** The bus park crowd is cheering now (the bus windows' passengers cheer with them). */
  get busCheer(): boolean {
    return this.time < this.parkCheerTill;
  }

  /** A signed wide pothole jumped: the hero left the ground before its left lip and landed past its right lip. */
  private trackJump(h: CrowdView['hero']): number | null {
    let hit: number | null = null;
    if (h.grounded) {
      if (this.wasAir) {
        const q = this.signed.find((s) => this.groundFrom < s.a && h.x > s.b && h.x - s.b < 200);
        if (q) hit = (q.a + q.b) / 2;
      }
      this.groundFrom = h.x;
    }
    this.wasAir = !h.grounded;
    return hit;
  }

  private walk(w: Walker, dt: number, v: CrowdView): void {
    if (this.still) return;
    const h = v.hero;
    if (w.mode === 'door') {
      w.t -= dt;
      if (w.t <= 0) w.mode = 'walk';
      return;
    }
    const ahead = (h.x - w.x) * w.dir;
    if (w.mode === 'walk') {
      const towards = ahead > 0 && ahead < CROWD.stepNear && (h.vx === 0 || Math.sign(h.vx) === -w.dir);
      if (towards) {
        w.mode = 'aside';
        return;
      }
      w.x += w.dir * w.speed * dt;
      w.t += dt;
      if (w.x >= w.b || w.x <= w.a) {
        w.x = Math.min(w.b, Math.max(w.a, w.x));
        w.dir = (w.x >= w.b ? -1 : 1) as 1 | -1;
        if (w.rand() < 0.5) {
          w.mode = 'door';
          w.t = CROWD.doorWait;
        }
      }
      w.back = Math.max(0, w.back - dt * 8);
      return;
    }
    // Aside: step 4 u back toward the shop wall and wait until the hero is 60 u past.
    w.back = Math.min(CROWD.stepBack, w.back + dt * 16);
    if (ahead < -CROWD.stepNear || Math.abs(h.x - w.x) > CROWD.stepNear * 2) w.mode = 'walk';
  }

  /** Everyone to draw this frame, back to front, within the limits (part 3 and 11). */
  draw(v: CrowdView): FolkDraw[] {
    const t = this.time;
    const y0 = this.groundY - CROWD.feetUp;
    const L = v.camX - 30;
    const R = v.camX + v.viewW + 30;
    // One list and its entries kept from frame to frame (no garbage a frame).
    const out = this.out;
    out.length = 0;
    let used = 0;
    const put = (look: number, frame: FolkFrame, x: number, y: number, flip: boolean, mover: boolean): void => {
      let d = this.pool[used];
      if (!d) d = this.pool[used] = { look: 0, frame: 'stand', x: 0, y: 0, flip: false, size: 1 };
      used++;
      d.look = look;
      d.frame = frame;
      d.x = x;
      d.y = y;
      d.flip = flip;
      d.mover = mover;
      out.push(d);
    };
    const bw = this.bubble && this.bubble.who >= 0 ? this.people[this.bubble.who] : undefined;
    const pose = (p: Person, base: FolkFrame): FolkFrame => {
      if (t - p.cheerAt < p.cheerLen) return this.two(CHEER, t - p.cheerAt);
      if (t - p.waveAt < CROWD.waveTime || t < p.waveTill) return this.two(WAVE, t - Math.max(p.waveAt, p.cheerAt));
      if (bw === p && p.spot.kind === 'trader') return 'call';
      return base;
    };
    let street = 0;
    const cap = CROWD.onScreen[this.plan.look];
    const people = this.people;
    for (let i = 0; i < people.length; i++) {
      if (this.backOff >= 2 && i % 2 === 1) continue;
      const p = people[i]!;
      if (p.spot.x < L || p.spot.x > R || street >= cap) continue;
      street++;
      put(p.spot.look, pose(p, p.spot.kind === 'sit' ? 'sit' : 'stand'), p.spot.x, y0, p.spot.flip, false);
    }
    if (this.backOff < 1) {
      for (const w of this.walkers) {
        if (w.mode === 'door' || w.x < L || w.x > R || street >= cap) continue;
        street++;
        const frame: FolkFrame = w.mode === 'aside' || this.still ? 'stand' : WALK[((Math.floor(w.t / 0.15) % 4) + 4) % 4]!;
        // Side-on to the hero while stepping aside.
        const flip = w.mode === 'aside' ? v.hero.x < w.x : w.dir < 0;
        put(w.look, frame, w.x, y0 - w.back, flip, true);
      }
    }
    const ch = this.plan.children;
    if (ch && ch.x + 60 > L && ch.x - 20 < R) {
      put(ch.looks[0], 'stand', ch.x, y0, false, false);
      put(ch.looks[1], 'stand', ch.x + 40, y0, true, false);
    }
    for (const list of [this.stop, this.park]) {
      for (const p of list) {
        if (p.spot.x < L || p.spot.x > R || out.length >= CROWD.maxDrawn) continue;
        put(p.spot.look, pose(p, p.spot.kind === 'sit' ? 'sit' : 'stand'), p.spot.x, y0, p.spot.flip, false);
      }
    }
    if (out.length > CROWD.maxDrawn) out.length = CROWD.maxDrawn;
    this.seen = out.length;
    return out;
  }
  private readonly out: FolkDraw[] = [];
  private readonly pool: FolkDraw[] = [];

  private two(kind: readonly [FolkFrame, FolkFrame], since: number): FolkFrame {
    // A pose whose start is unknown (a stop's wave after its cheer) shows its first frame.
    return kind[this.still || !Number.isFinite(since) ? 0 : Math.floor(Math.max(0, since) / 0.25) % 2]!;
  }
}

const WALK: readonly FolkFrame[] = ['walk0', 'walk1', 'walk2', 'walk3'];
const WAVE = ['wave0', 'wave1'] as const;
const CHEER = ['cheer0', 'cheer1'] as const;

/* ------------------------------------------------------------------ the well room (PE-R4) */

/**
 * The store keeper (part 5, PE-R4): waves when the hero comes down, claps and says "For the
 * boss. Go well!" when the hero takes the garri parcel, waves when the hero goes up.
 */
export class RoomKeeper {
  time = 0;
  private waveAt = -Infinity;
  private clapAt = -Infinity;
  bubble: Bubble | null = null;
  still = false;
  update(dt: number, events: readonly CrowdEvent[], groundY: number): void {
    this.time += dt;
    const t = this.time;
    if (this.bubble) {
      this.bubble.left -= dt;
      if (this.bubble.left <= 0) this.bubble = null;
    }
    for (const e of events) {
      if (e.type === 'room' || e.type === 'wellUp') this.waveAt = t;
      if (e.type === 'parcel') {
        this.clapAt = t;
        this.bubble = { text: WORDS.folk.storeKeeper, x: STORE_KEEPER_SPOT.x + 4, y: groundY - CROWD.feetUp - 32, left: 2.4, who: 0 };
      }
      if (e.type === 'hit' || e.type === 'fall') this.bubble = null;
    }
  }
  frame(): FolkFrame {
    const t = this.time;
    const two = (k: 'wave' | 'clap', since: number): FolkFrame => `${k}${this.still ? 0 : Math.floor(since / 0.25) % 2}` as FolkFrame;
    if (t - this.clapAt < 1.6) return two('clap', t - this.clapAt);
    if (t - this.waveAt < 1.2) return two('wave', t - this.waveAt);
    return 'sit';
  }
  /** The soft shadow of feet crossing a ceiling light hole every 6 s: 0..1 across, or null. None with reduced motion. */
  shadow(): { hole: number; k: number } | null {
    if (this.still) return null;
    const n = Math.floor(this.time / 6);
    const k = (this.time % 6) / 1.4;
    return k < 1 ? { hole: n % 2, k } : null;
  }
}

/* ------------------------------------------------------------------ the hall (part 5) */

/** Door people stand in the open roller door (outside, behind the hero's start); walk-in spots along the back wall. */
export const HALL_DOOR_SPOTS: readonly number[] = [42, 66, 90];
export const HALL_WALL_SPOTS: readonly number[] = [128, 172, 216, 260, 304, 348, 392];
export const HALL_FINISH_PEOPLE = { walkIn: 2.5, follow: 0.35, speed: 110, clapFrom: 3.0, clapTo: 4.2, cheerAt: 4.5 } as const;

export interface HallView {
  hits: number;
  defeated: boolean;
  /** Seconds into the defeat (the kind finish). */
  finishT: number;
  /** Throws in the air (x, y). */
  throws: readonly { x: number; y: number }[];
  camX: number;
  viewW: number;
}

/**
 * Go-Slow Hall's people (part 5): 3 at the open roller door in the fight, 2 to 4 more outside on
 * wide screens; they cheer each hit (a bubble only when no throw is within 120 u); at the finish
 * they walk in along the back wall, clap as the lamps come on and cheer at "Lagos is switched on!".
 * They never boo or point at the boss, and nobody reacts to a lost life.
 */
export class HallCrowd {
  time = 0;
  private cheerAt = -Infinity;
  private hushTill = -Infinity;
  bubble: Bubble | null = null;
  still = false;
  backOff = 0;
  seen = 0;
  private cheeredFinish = false;
  constructor(readonly groundY: number) {}

  update(dt: number, v: HallView, events: readonly CrowdEvent[]): CrowdSay {
    this.time += dt;
    const t = this.time;
    const out: CrowdSay = { cheer: null };
    if (this.bubble) {
      this.bubble.left -= dt;
      if (this.bubble.left <= 0) this.bubble = null;
    }
    if (events.some((e) => e.type === 'hit' || e.type === 'fall' || e.type === 'gameOver')) {
      this.hushTill = t + CROWD.hushAfterLoss;
      this.cheerAt = -Infinity;
      this.bubble = null;
    }
    const hit = events.find((e) => e.type === 'bossHit') as { left?: number } | undefined;
    if (hit && t >= this.hushTill) {
      this.cheerAt = t;
      out.cheer = 'crowdCheer';
      const clear = !v.throws.some((th) => th.x < HALL_DOOR_SPOTS[2]! + 120);
      const n = v.hits;
      if (clear && n < 3) this.bubble = { text: WORDS.folk.hallHit[Math.min(1, Math.max(0, n - 1))]!, x: HALL_DOOR_SPOTS[1]!, y: this.groundY - 10 - 34, left: CROWD.bubbleTime, who: 1 };
    }
    if (v.defeated && !this.cheeredFinish && v.finishT >= HALL_FINISH_PEOPLE.cheerAt) {
      this.cheeredFinish = true;
      out.cheer = 'crowdCheerBig';
    }
    return out;
  }

  draw(v: HallView): FolkDraw[] {
    const t = this.time;
    const F = HALL_FINISH_PEOPLE;
    const out: FolkDraw[] = [];
    const two = (k: 'wave' | 'cheer' | 'clap', since: number): FolkFrame => `${k}${this.still ? 0 : Math.floor(Math.max(0, since) / 0.25) % 2}` as FolkFrame;
    const doorY = this.groundY - 10;
    if (!v.defeated || v.finishT < F.walkIn) {
      const cheering = t - this.cheerAt < CROWD.cheerTime;
      HALL_DOOR_SPOTS.forEach((x, i) => out.push({ look: i, frame: cheering ? two('cheer', t - this.cheerAt + i * 0.12) : 'stand', x, y: doorY, flip: false, size: 0.9 }));
      // Wide screens: up to 2 more on each side outside the cut walls (never on the hall floor).
      const left = Math.max(0, Math.min(2, Math.floor((-v.camX - 24) / 26)));
      const right = Math.max(0, Math.min(2, Math.floor((v.camX + v.viewW - 600) / 26)));
      for (let k = 0; k < left; k++) out.push({ look: 3 + k, frame: cheering ? two('cheer', t - this.cheerAt) : 'stand', x: -34 - k * 26, y: this.groundY - CROWD.feetUp, flip: false, size: 0.95 });
      for (let k = 0; k < right; k++) out.push({ look: 5 + k, frame: cheering ? two('cheer', t - this.cheerAt) : 'stand', x: 598 + k * 26, y: this.groundY - CROWD.feetUp, flip: true, size: 0.95 });
    } else {
      // The kind finish: the door people walk in, 4 more follow (7 at most), along the back wall.
      const ft = v.finishT;
      for (let i = 0; i < Math.min(7, HALL_WALL_SPOTS.length); i++) {
        const start = F.walkIn + i * F.follow;
        if (ft < start && i >= 3) continue;
        const from = HALL_DOOR_SPOTS[Math.min(i, 2)]!;
        const to = HALL_WALL_SPOTS[HALL_WALL_SPOTS.length - 1 - i]!;
        const walked = this.still ? Infinity : Math.max(0, ft - start) * F.speed;
        const x = Math.min(to, from + walked);
        const there = x >= to;
        const y = there ? this.groundY - CROWD.feetUp : doorY + (this.groundY - CROWD.feetUp - doorY) * Math.min(1, walked / 40);
        let frame: FolkFrame;
        if (!there) frame = this.still ? 'stand' : (`walk${Math.floor(ft / 0.15) % 4}` as FolkFrame);
        else if (ft >= F.cheerAt) frame = two('cheer', ft - F.cheerAt + i * 0.1);
        else if (ft >= F.clapFrom && ft < F.clapTo) frame = two('clap', ft + i * 0.1);
        else frame = 'stand';
        out.push({ look: i, frame, x, y, flip: false, size: 1, mover: !there });
      }
    }
    const list = this.backOff >= 2 ? out.filter((_, i) => i % 2 === 0) : out;
    this.seen = list.length;
    return list.slice(0, 9);
  }
}

/** The hall's cast (HALL_CROWD, never the player's own look). */
export function hallCast(hero: HeroLike | null): FolkLook[] {
  return withoutHero(HALL_CROWD, hero);
}

/* ------------------------------------------------------------------ backing off (part 11) */

/**
 * Backing off: if the frame time over the last 2 s is above 22 ms (under 45 fps), drop walkers
 * and joggers first, then half the standing people. They come back only at the next run.
 */
export class FrameWatch {
  level = 0;
  private sum = 0;
  private n = 0;
  private span = 0;
  /** Forced from the page for qa (window.__game.crowd.forceBackOff). */
  frame(ms: number): number {
    if (!(ms > 0) || ms > 250) return this.level;
    this.sum += ms;
    this.n++;
    this.span += ms;
    if (this.span >= 2000) {
      const avg = this.sum / this.n;
      if (avg > 22 && this.level < 2) this.level++;
      this.sum = this.n = this.span = 0;
    }
    return this.level;
  }
  reset(): void {
    this.level = 0;
    this.sum = this.n = this.span = 0;
  }
}
