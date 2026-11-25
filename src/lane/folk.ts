/**
 * The lane run's people (task S3g1b; design.md "People everywhere" part 7). Loads with the lane
 * run (the lazy lane chunk), never with the first page.
 *
 * Rule 1 is strongest here: nobody is ever in a lane, on a kerb or on the divider. Everyone is on
 * the two pavements, at the windows of the two-storey fronts behind them, or up on the
 * footbridge. Where a lamp is off, people have gone inside and the windows glow; nobody shows in
 * the Blackout's dark edge. A friendly jogger or two children run alongside now and then. The
 * goal's bus stop has a crowd of 5 who cheer. People only read the run (laneFolkPlan and
 * LaneFolk.step are pure), so they never change it.
 */
import { CastSheet } from '../game/crowdDraw';
import { seeded, seedOf } from '../game/crowd';
import { LANE_CAST, LANE_CHILDREN, LANE_JOGGER, LANE_JOGGER_2 } from '../art/folkCasts';
import { FRONT_TILE, LANE_FOLK_M, drawBridgeCrowd, drawTwoStorey, type FrontWindow } from '../art/folkLane';
import type { FolkFrame, FolkLook } from '../art/folk';
import { ROAD } from '../art/lane';

type G = CanvasRenderingContext2D;

/** Part 7 numbers (metres). */
export const LANE_FOLK = {
  /** Pavement people stand or walk from this far past the kerb (or the divider) to this far. */
  paveIn: 0.7,
  paveOut: 5.4,
  /** One pavement slot every this many metres a side; about 2 people per 10 m a side in all. */
  slot: 5,
  /** Fronts every this many metres, this far past the pavement's outer edge. */
  frontEvery: 6,
  frontOut: 0.6,
  /** Joggers: about every 150 m, never in the first 100 m, never with the Blackout under 30 m. */
  jogEvery: 150,
  jogFrom: 100,
  jogDark: 30,
  jogAhead: [6, 10] as const,
  jogPace: [3, 4] as const,
  /** People drawn at most a frame (window faces are part of their tile). */
  max: 24,
  /** A person shorter than this on screen (px) is not drawn. */
  minPx: 6,
  /** People wave when the hero is this close. */
  waveNear: 14,
} as const;

/** The pavements' inner edges (m from the road centre): right after the kerb, left after the divider. */
export const PAVE_EDGE = { right: ROAD.half + ROAD.kerb, left: -(ROAD.half + ROAD.kerb + ROAD.divider) } as const;

/** True when x (m) is on a pavement: never a lane, a kerb or the divider (rule 1). */
export function onPavement(x: number): boolean {
  return x >= PAVE_EDGE.right + 0.2 || x <= PAVE_EDGE.left - 0.2;
}

/** The cast baked for the lane: the pavement people, then the two joggers and the two children. */
export const LANE_LOOKS: readonly FolkLook[] = [...LANE_CAST, LANE_JOGGER, LANE_JOGGER_2, LANE_CHILDREN[0], LANE_CHILDREN[1]];
const JOG = LANE_CAST.length;

export interface LanePerson {
  look: number;
  /** Metres from the road centre (on a pavement) and the distance along the road. */
  x: number;
  d: number;
  frame: FolkFrame;
  flip: boolean;
  mover?: boolean;
}

/** A pavement slot's person (or none), the same every run: where, who, and how it moves. */
export function slotPerson(side: 1 | -1, j: number): { x: number; d0: number; v: number; look: number; stand: boolean } | null {
  const r = seeded(seedOf(`lane|${side}|${j}`));
  if (r() > 0.55) return null;
  const edge = side > 0 ? PAVE_EDGE.right : PAVE_EDGE.left;
  const x = edge + side * (LANE_FOLK.paveIn + r() * (LANE_FOLK.paveOut - LANE_FOLK.paveIn));
  const stand = r() < 0.45;
  // Walkers walk with or against the run, slowly (the run carries them past).
  const v = stand ? 0 : (r() < 0.5 ? 1 : -1) * (0.9 + r() * 0.5);
  return { x, d0: j * LANE_FOLK.slot + r() * LANE_FOLK.slot, v, look: Math.floor(r() * LANE_CAST.length) % LANE_CAST.length, stand };
}

/** The people by a scenery piece (1 to 3), at the piece's distance (part 7). */
export function sceneryPeople(i: number, d: number, side: 1 | -1): { x: number; d: number; look: number }[] {
  const r = seeded(seedOf(`scen|${i}`));
  const n = 1 + Math.floor(r() * 3);
  const edge = side > 0 ? PAVE_EDGE.right : PAVE_EDGE.left;
  return Array.from({ length: n }, (_, k) => ({
    x: edge + side * (LANE_FOLK.paveIn + 0.4 + r() * 1.4),
    d: d - 1.6 - k * 0.9 + r() * 0.4,
    look: Math.floor(r() * LANE_CAST.length) % LANE_CAST.length,
  }));
}

export interface LaneFolkNow {
  dist: number;
  /** The Blackout's distance behind (m). */
  gap: number;
  /** Lamps are off nearer than this distance (view.ts offTo): people there have gone inside. */
  offTo: number;
  goal: number;
  /** The goal is reached (the stop's people cheer). */
  atGoal: boolean;
  t: number;
  still: boolean;
}

interface Jogger {
  at: number;
  kids: boolean;
  pace: number;
  side: 1 | -1;
}

/**
 * The lane's moving people: the jogger (or the two children) running alongside, with its rules
 * (part 7). Pure: step() reads the run and keeps its own state.
 */
export class LaneJogger {
  private next = LANE_FOLK.jogFrom + 40;
  jog: Jogger | null = null;
  private n = 0;
  step(n: LaneFolkNow, dt: number, backOff: number): void {
    void dt;
    if (n.still || backOff >= 1) {
      this.jog = null;
      return;
    }
    const j = this.jog;
    if (j) {
      const age = n.t - j.at;
      if (age > j.pace + 4 || n.gap < LANE_FOLK.jogDark) this.jog = null;
      return;
    }
    if (n.dist >= this.next && n.dist >= LANE_FOLK.jogFrom) {
      this.next = n.dist + LANE_FOLK.jogEvery;
      if (n.gap < LANE_FOLK.jogDark || n.atGoal) return;
      const r = seeded(seedOf(`jog|${this.n++}`));
      this.jog = { at: n.t, kids: r() < 0.35, pace: LANE_FOLK.jogPace[0] + r() * (LANE_FOLK.jogPace[1] - LANE_FOLK.jogPace[0]), side: r() < 0.6 ? 1 : -1 };
    }
  }
  /** Where the runner (or the two children) are now: ahead of the hero, then slowing and dropping back. */
  people(n: LaneFolkNow): LanePerson[] {
    const j = this.jog;
    if (!j) return [];
    const age = n.t - j.at;
    const ahead0 = LANE_FOLK.jogAhead[0] + 2;
    const ahead = age < j.pace ? ahead0 : ahead0 - (age - j.pace) * (age - j.pace) * 2.5;
    const edge = j.side > 0 ? PAVE_EDGE.right : PAVE_EDGE.left;
    const x = edge + j.side * 1.4;
    const dropping = age >= j.pace;
    const k = Math.floor(n.t / 0.09) % 4;
    const frame: FolkFrame = dropping ? (Math.floor(n.t / 0.25) % 2 ? 'wave1' : 'wave0') : (`backRun${k}` as FolkFrame);
    const out: LanePerson[] = [];
    if (j.kids) {
      out.push({ look: JOG + 2, x, d: n.dist + ahead, frame, flip: j.side > 0, mover: true });
      out.push({ look: JOG + 3, x: x + j.side * 0.7, d: n.dist + ahead + 0.4, frame, flip: j.side > 0, mover: true });
    } else out.push({ look: JOG + (j.side > 0 ? 0 : 1), x, d: n.dist + ahead, frame, flip: j.side > 0, mover: true });
    return out;
  }
}

/** Frames per look for the lane's sheet. */
function laneFrames(_l: FolkLook, i: number): FolkFrame[] {
  if (i >= JOG) return ['backRun0', 'backRun1', 'backRun2', 'backRun3', 'wave0', 'wave1'];
  return ['stand', 'backStand', 'walk0', 'walk1', 'walk2', 'walk3', 'backWalk0', 'backWalk1', 'backWalk2', 'backWalk3', 'wave0', 'wave1', 'cheer0', 'cheer1'];
}

/** What view.ts gives for drawing: its projection. */
export interface LaneProject {
  /** Screen x and y (CSS px) of road point (x m, distance d, up m). */
  sx(x: number, d: number): number;
  sy(y: number, d: number): number;
  /** CSS px per metre at distance d. */
  ppm(d: number): number;
  /** CSS px to device px. */
  ratio: number;
}

type FrontKind = 'plain' | 'lean' | 'wave0' | 'wave1' | 'glow';
const FRONT_WINDOWS: Record<FrontKind, readonly [FrontWindow, FrontWindow]> = {
  plain: ['empty', 'empty'],
  lean: ['empty', 'lean'],
  wave0: ['empty', 'wave0'],
  wave1: ['empty', 'wave1'],
  glow: ['glow', 'glow'],
};

/**
 * Draws the lane's people: the fronts with their windows, the footbridge crowd, the pavement
 * people (with the scenery and walking), the runner alongside and the goal crowd.
 */
export class LaneFolk {
  private readonly sheet = new CastSheet(laneFrames);
  readonly jogger = new LaneJogger();
  /** Backing off (part 11): 1 no walkers or joggers, 2 half the standing people too. */
  backOff = 0;
  /** People drawn last frame (window faces not counted), for qa and the murmur. */
  seen = 0;
  /** Their places last frame, for qa: never in a lane. */
  drawn: { x: number; d: number }[] = [];
  private fronts = new Map<string, HTMLCanvasElement>();
  /** O6b: another state's house fronts (Ogun's), in place of the two-storey Lagos ones. */
  frontArt: ((g: G, o: { wall: number; windows: readonly [FrontWindow, FrontWindow]; door: 'open' | 'shut' }) => void) | null = null;
  private frontPpm = 0;
  private made = 0;
  private bridge = new Map<number, HTMLCanvasElement>();

  /** The sheet and the front tiles at this screen's size (CSS px per metre at about 10 m, device px). */
  ready(ppmRef: number, ratio: number): void {
    const dev = ppmRef * ratio;
    this.sheet.ready(LANE_LOOKS, (dev * LANE_FOLK_M) / 37, 'lane', ratio);
    if (Math.abs(dev - this.frontPpm) > 1e-6) {
      this.frontPpm = dev;
      this.fronts.clear();
      this.bridge.clear();
    }
  }

  /** A front tile, baked once per wall colour and window kind (faces are part of the tile). */
  private front(wall: number, kind: FrontKind): HTMLCanvasElement | null {
    const key = `${wall}|${kind}`;
    let c = this.fronts.get(key);
    // At most two new tiles a frame, so the run's first frames are never held up.
    if (!c && this.made >= 2) return null;
    if (!c) {
      this.made++;
      c = document.createElement('canvas');
      const k = (this.frontPpm * LANE_FOLK_M) / 37;
      c.width = Math.ceil((FRONT_TILE.w + 4) * k);
      c.height = Math.ceil((FRONT_TILE.h + 4) * k);
      const g = c.getContext('2d')!;
      g.scale(k, k);
      g.translate(FRONT_TILE.w / 2 + 2, FRONT_TILE.h + 2);
      if (this.frontArt) this.frontArt(g, { wall, windows: FRONT_WINDOWS[kind], door: kind === 'glow' ? 'shut' : 'open' });
      else drawTwoStorey(g, { wall, windows: FRONT_WINDOWS[kind], door: kind === 'glow' ? 'shut' : 'open', looks: [LANE_CAST[wall % LANE_CAST.length]!, LANE_CAST[(wall * 5 + 3) % LANE_CAST.length]!] });
      this.fronts.set(key, c);
    }
    return c;
  }

  /** The two-storey fronts behind both pavements, far to near (draw after the road). */
  drawFronts(g: G, p: LaneProject, n: LaneFolkNow, near: number, far: number): void {
    if (typeof document === 'undefined') return;
    this.made = 0;
    const E = LANE_FOLK.frontEvery;
    const k0 = (this.frontPpm * LANE_FOLK_M) / 37;
    for (let j = Math.floor(far / E); j * E >= near + 2; j--) {
      const d = j * E;
      for (const side of [-1, 1] as const) {
        const edge = side > 0 ? PAVE_EDGE.right : PAVE_EDGE.left;
        const x = edge + side * (ROAD.pave + LANE_FOLK.frontOut + 2.9);
        const ppm = p.ppm(d);
        const h = ((FRONT_TILE.h + 4) * ppm * LANE_FOLK_M) / 37;
        if (h < 4) continue;
        const r = seeded(seedOf(`front|${side}|${j}`));
        const wall = Math.floor(r() * 8);
        const person = r() < 0.5;
        let kind: FrontKind = 'plain';
        if (d < n.offTo + 2) kind = 'glow';
        else if (person) kind = d - n.dist < LANE_FOLK.waveNear * 1.5 && !n.still ? (Math.floor(n.t / 0.3) % 2 ? 'wave1' : 'wave0') : 'lean';
        const img = this.front(wall, kind);
        if (!img) continue;
        const w = ((img.width / k0) * ppm * LANE_FOLK_M) / 37;
        const sx = p.sx(x, d);
        const sy = p.sy(0, d);
        g.drawImage(img, sx - w / 2, sy - h, w, h);
      }
    }
  }

  /** The footbridge crowd above the rail (draw before drawFootbridge so its rail crosses in front). */
  drawBridge(g: G, p: LaneProject, n: LaneFolkNow, d: number): void {
    if (typeof document === 'undefined') return;
    if (d <= n.offTo + 2) return;
    const x0m = PAVE_EDGE.left - 1.4;
    const x1m = PAVE_EDGE.right + 2.4;
    const ppm = p.ppm(d);
    if (ppm * LANE_FOLK_M < LANE_FOLK.minPx) return;
    const wave = d - n.dist < 30 && !n.still ? ((Math.floor(n.t / 0.25) % 2) + 1) as 1 | 2 : d - n.dist < 30 ? 1 : 0;
    // Baked once per waving frame at the reference size, then scaled (heads and shoulders above the rail).
    let c = this.bridge.get(wave);
    const refPpm = this.frontPpm;
    const spanM = x1m - x0m;
    if (!c) {
      c = document.createElement('canvas');
      c.width = Math.ceil(spanM * refPpm + 8);
      c.height = Math.ceil(2.4 * refPpm);
      const cg = c.getContext('2d')!;
      const looks = [LANE_CAST[2]!, LANE_CAST[5]!, LANE_CAST[0]!, LANE_CAST[9]!, LANE_CAST[3]!];
      drawBridgeCrowd(cg, 4, 4 + spanM * refPpm, 1.6 * refPpm, refPpm, looks, wave);
      this.bridge.set(wave, c);
    }
    const k = ppm / (refPpm / p.ratio);
    const rail = p.sy(6 + 1.1, d);
    g.drawImage(c, p.sx(x0m, d) - (4 / p.ratio) * k, rail - (1.6 * refPpm * k) / p.ratio, (c.width * k) / p.ratio, (c.height * k) / p.ratio);
  }

  /**
   * The pavement people, the runner and the goal crowd, far to near. `scenery`: the scenery
   * pieces in view (index, distance, side).
   */
  drawPeople(g: G, p: LaneProject, n: LaneFolkNow, near: number, far: number, scenery: readonly { i: number; d: number; side: 1 | -1 }[]): void {
    const list: LanePerson[] = [];
    this.goalList = [];
    const t = n.t;
    const dark = (d: number): boolean => d < n.offTo + 2;
    const waveF = (): FolkFrame => (n.still ? 'wave0' : Math.floor(t / 0.25) % 2 ? 'wave1' : 'wave0');
    for (const s of scenery) {
      if (dark(s.d)) continue;
      for (const q of sceneryPeople(s.i, s.d, s.side)) {
        const ahead = q.d - n.dist;
        list.push({ look: q.look, x: q.x, d: q.d, frame: ahead > 0 && ahead < LANE_FOLK.waveNear ? waveF() : 'stand', flip: s.side > 0 });
      }
    }
    for (const side of [-1, 1] as const) {
      // Slots far enough either way to cover walkers that have moved from their start.
      const j0 = Math.floor((near - 40) / LANE_FOLK.slot);
      const j1 = Math.ceil((far + 40) / LANE_FOLK.slot);
      for (let j = j0; j <= j1; j++) {
        const q = slotPerson(side, j);
        if (!q) continue;
        if (q.stand && this.backOff >= 2 && j % 2 === 0) continue;
        if (!q.stand && this.backOff >= 1) continue;
        const d = q.d0 + (n.still ? 0 : q.v * t);
        if (d < near || d > far || dark(d)) continue;
        const ahead = d - n.dist;
        let frame: FolkFrame;
        if (q.stand) frame = ahead > 0 && ahead < LANE_FOLK.waveNear ? waveF() : 'stand';
        else if (n.still) frame = q.v > 0 ? 'backStand' : 'stand';
        else {
          const k = Math.floor(t / 0.15 + j) % 4;
          frame = (q.v > 0 ? `backWalk${k}` : `walk${k}`) as FolkFrame;
        }
        list.push({ look: q.look, x: q.x, d, frame, flip: side > 0, mover: !q.stand });
      }
    }
    for (const q of this.jogger.people(n)) if (!dark(q.d)) list.push(q);
    // The goal's crowd of 5 under and by the shelter: cheer as the hero arrives.
    if (n.goal > near && n.goal < far && !dark(n.goal)) {
      const cheer = n.atGoal || n.goal - n.dist < 25;
      for (let k = 0; k < 5; k++) {
        const frame: FolkFrame = cheer ? (n.still ? 'cheer0' : (Math.floor(t / 0.25 + k) % 2 ? 'cheer1' : 'cheer0')) : 'stand';
        this.goalList.push({ look: (k * 5 + 1) % LANE_CAST.length, x: PAVE_EDGE.right + 3.2 + (k % 3) * 0.9, d: n.goal - 1.4 - k * 0.5, frame, flip: true });
      }
    }
    // Far to near; at most 24, the nearest kept; nobody under 6 px tall.
    list.sort((a, b) => a.d - b.d);
    const kept = list.filter((q) => p.ppm(q.d) * LANE_FOLK_M >= LANE_FOLK.minPx).slice(0, LANE_FOLK.max - this.goalList.length);
    kept.reverse();
    this.drawn = [...kept, ...this.goalList].map((q) => ({ x: q.x, d: q.d }));
    this.seen = this.drawn.length;
    this.drawList(g, p, kept);
  }
  private goalList: LanePerson[] = [];

  /** The goal's crowd, after the bus stop's picture so they stand in front of its shelter. */
  drawGoal(g: G, p: LaneProject): void {
    this.drawList(g, p, this.goalList);
  }

  private drawList(g: G, p: LaneProject, list: readonly LanePerson[]): void {
    for (const q of list) {
      const ppm = p.ppm(q.d);
      this.sheet.draw(g, { look: q.look, frame: q.frame, x: p.sx(q.x, q.d), y: p.sy(0, q.d), flip: q.flip, size: (ppm * LANE_FOLK_M) / 37 });
    }
  }
}
