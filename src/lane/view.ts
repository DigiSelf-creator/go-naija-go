/**
 * The lane run seen from behind (docs/design.md S3f0 part 5): the camera 4 m behind the hero and
 * 2.6 m up, the horizon 36 percent down, the road filling 86 percent of the width at the hero
 * (less on a very wide screen, so the hero stays on it), far things drawn up to 1.6 times bigger
 * so every dodge thing is 10 px or more 1.5 s away, and a fade-in over the first 5 m.
 *
 * The pictures are art's (S3f1: src/art/lane.ts, lane-things.ts, lane-hero.ts). Part 21: the sky
 * once into its own picture; every road thing, pickup and hero pose ready-made at a near and a
 * far size and copied with one draw call; the road about a dozen fills; one dark gradient.
 */
import type { HeroLook } from '../art/hero';
import { BURST_TIME, bakeLaneThings, bulbFrame, burstLookOf, coinFrame, drawLaneBurst, goatChewFrame, hazardFrame, laneKey, type LanePickup, type LaneThing } from '../art/lane-things';
import { bakeLaneHero, drawLaneShadow, laneHeroKey, laneRunFrame, laneStumbleFrame, laneTorchFrame, type LaneHeroPose } from '../art/lane-hero';
import { ROAD, atScreen, bakeLaneScenery, bakeLaneSky, drawBlackout, drawBlackoutWash, drawFootbridge, drawLaneLamp, drawLaneRoad, LANE_SCENERY, type LampLook, type LaneView as ArtView } from '../art/lane';
import { blitBaked, type Baked } from '../art/lane-shade';
import { HERO_HEIGHT, SIZE, isDodge, type ThingKind } from './level';
import type { CoinSlot, LaneSim, Slot } from './sim';
import { LaneFolk, type LaneFolkNow, type LaneProject } from './folk';

export const CAM_BACK = 4;
export const CAM_UP = 2.6;
export const HORIZON = 0.36;
export const ROAD_FILL = 0.86;
/** The hero's feet never lower than this share of the screen height. */
const FEET_MAX = 0.86;
/** The camera follows the hero's lane at 60 percent, easing over about 0.25 s. */
export const CAM_FOLLOW = 0.6;
const CAM_EASE = 0.08;
export const FADE_M = 5;
const ROAD_HALF = 3.75;
const LAMP_EVERY = 10;
const BRIDGE_EVERY = 200;
/** Pavement scenery every 15 m, sides in turn. */
const SCENERY_EVERY = 15;
/** Part 10: the dark shows under 30 m, the close warning under 15 m. */
export const DARK_FROM = 30;
export const WARN_UNDER = 15;
/** Pickups float this high (m); the bulb, chip and foods are anchored at their middle. */
const PICKUP_UP = 0.8;

/** What the hero is doing, for its picture. */
export interface HeroPose {
  kind: 'run' | 'jump' | 'slide' | 'stumble' | 'torch' | 'wave';
  /** 0..1 through the run cycle, or through the trip or the caught moment. */
  phase: number;
  /** Feet height, metres. */
  up: number;
  /** -1..1: leaning into a lane change. */
  lean: number;
  /** The garri tech suit is on. */
  suit: boolean;
}

/** Part 5: far things drawn bigger: times 1 at the hero, rising to 1.6 at 34 m ahead and beyond. */
export function farBoost(ahead: number): number {
  return 1 + (0.6 * Math.min(Math.max(ahead, 0), 34)) / 34;
}

/** Focal length in px: the road (7.5 m) fills 86 percent of the width at the hero, unless the feet would drop too low. */
export function focal(w: number, h: number): number {
  const byWidth = (ROAD_FILL * w * CAM_BACK) / (2 * ROAD_HALF);
  const byHeight = ((FEET_MAX - HORIZON) * h * CAM_BACK) / CAM_UP;
  return Math.min(byWidth, byHeight);
}

/** How many px a thing `size` metres across is on screen, `ahead` metres in front of the hero. */
export function sizeOnScreen(w: number, h: number, size: number, ahead: number): number {
  return (size * focal(w, h) * farBoost(ahead)) / (ahead + CAM_BACK);
}

/** The lane art kind for a road thing in a state (the after-touch looks). */
function artKind(s: Slot): LaneThing {
  const k = s.kind as ThingKind;
  if (s.state === 'done') return k === 'cones' ? 'conesDown' : k === 'barrier' ? 'barrierUp' : k === 'pothole' ? (s.corn ? 'potholePlugged' : 'pothole') : (k as LaneThing);
  if (s.state === 'off' && k === 'goat') return s.lane === 0 ? 'goatOffLeft' : 'goatOffRight';
  return k as LaneThing;
}

export class LaneView {
  w = 1;
  h = 1;
  private ratio = 1;
  private f = 1;
  private hz = 0;
  camX = 0;
  still = false;
  private sky: HTMLCanvasElement | OffscreenCanvas | null = null;
  /** Ready-made pictures at two sizes (part 21), made for this screen size. */
  private near: Map<string, Baked> | null = null;
  private far: Map<string, Baked> | null = null;
  private scenery: Map<string, Baked> | null = null;
  private hero: Map<string, Baked> | null = null;
  private heroFor = '';
  private nearPpm = 1;
  private farPpm = 1;
  private readonly list: (Slot | CoinSlot)[] = [];
  private readonly art: ArtView = { w: 1, h: 1, horizonY: 0, f: 1, camX: 0 };
  /** Drawn boxes this frame, for the e2e checks (only when asked). */
  boxes: { kind: string; x: number; y: number; w: number; h: number }[] | null = null;
  private camD = 0;
  /** Part 14's look back: the picture is drawn turned round (mirrored) and/or slid sideways (the turn), CSS px. */
  private mirror = false;
  private ox = 0;
  /** S3g1b (people everywhere part 7): the people on the pavements, at the windows and on the footbridge. */
  readonly folk = new LaneFolk();
  /** People on (tests turn them off to check the run is the same). */
  people = true;

  /**
   * People never stop the run (design.md "People everywhere" part 2 rule 1, part 11): an error in
   * their drawing switches them off for the rest of the visit, the same guard as GamePeople's.
   */
  private folkFail(g: CanvasRenderingContext2D | null, err: unknown): void {
    this.people = false;
    this.folk.seen = 0;
    this.folk.drawn = [];
    if (g) g.globalAlpha = 1;
    console.warn('People switched off:', err);
  }

  resize(w: number, h: number, ratio: number): void {
    if (w === this.w && h === this.h && ratio === this.ratio && this.sky) return;
    this.w = w;
    this.h = h;
    this.ratio = ratio;
    this.f = focal(w, h);
    this.hz = Math.round(HORIZON * h);
    this.sky = null;
    this.near = this.far = this.scenery = this.hero = null;
  }

  /** Makes the ready-made pictures (once per screen size; the hero once per look). */
  private bake(look: HeroLook): void {
    // Device pixels per metre: near at the hero, far at about 25 m ahead (with the far boost).
    this.nearPpm = (this.f / CAM_BACK) * this.ratio;
    this.farPpm = (this.f / (25 + CAM_BACK)) * farBoost(25) * this.ratio;
    // The sky is soft: made at CSS size and stretched to the device pixels.
    if (!this.sky) this.sky = bakeLaneSky(Math.round(this.w), this.hz);
    this.near ??= bakeLaneThings(this.nearPpm);
    this.far ??= bakeLaneThings(this.farPpm);
    this.scenery ??= bakeLaneScenery((this.f / (12 + CAM_BACK)) * this.ratio);
    if (this.people) {
      try {
        this.folk.ready(this.f / (8 + CAM_BACK), this.ratio);
      } catch (err) {
        this.folkFail(null, err);
      }
    }
    const key = `${look.skin},${look.hair},${look.outfit},${look.body ?? ''},${look.age ?? ''}`;
    if (!this.hero || key !== this.heroFor) {
      this.hero = bakeLaneHero(look, this.nearPpm, true);
      this.heroFor = key;
    }
  }

  /** Screen x for road x at distance d (CSS px). */
  sx(x: number, d: number): number {
    return this.w / 2 + ((x - this.camX) * this.f) / (d - this.camD);
  }
  /** Screen y for height y at distance d. */
  sy(y: number, d: number): number {
    return this.hz + ((CAM_UP - y) * this.f) / (d - this.camD);
  }

  /** Moves the camera after the hero (dt: seconds since the last frame). */
  follow(heroX: number, dt: number): void {
    const target = this.still ? 0 : CAM_FOLLOW * heroX;
    this.camX += (target - this.camX) * (1 - Math.exp(-dt / CAM_EASE));
  }

  /** Drawing in CSS px (the screen's own transform, turned round and slid for the look back). */
  private css(g: CanvasRenderingContext2D): void {
    const r = this.ratio;
    if (this.mirror) g.setTransform(-r, 0, 0, r, (this.w + this.ox) * r, 0);
    else g.setTransform(r, 0, 0, r, this.ox * r, 0);
  }

  /** Drawing in device pixels, with the same turn and slide. */
  private dev(g: CanvasRenderingContext2D): void {
    const r = this.ratio;
    if (this.mirror) g.setTransform(-1, 0, 0, 1, (this.w + this.ox) * r, 0);
    else g.setTransform(1, 0, 0, 1, this.ox * r, 0);
  }

  /**
   * Part 14, the first lane run's start: the camera looks back down the road as the far lamps
   * switch off (`lamps` 0 to 1), the dark rolling up from the far end. `slide` (CSS px) moves the
   * picture sideways for the turn. No road things and no hero: you look back from where you stand.
   */
  drawBack(g: CanvasRenderingContext2D, sim: LaneSim, look: HeroLook, lamps: number, t: number, slide = 0): void {
    this.mirror = true;
    this.ox = slide;
    try {
      this.drawScene(g, sim, look, sim.dist, t, null, 0, lamps);
    } finally {
      this.mirror = false;
      this.ox = 0;
    }
  }

  /** Copies a ready-made picture at a screen point, `ppm` CSS px per metre there; nearer size first. */
  private blit(g: CanvasRenderingContext2D, key: string, x: number, y: number, ppm: number, alpha: number): boolean {
    const dev = ppm * this.ratio;
    const set = dev > (this.nearPpm + this.farPpm) / 2 ? this.near : this.far;
    const b = set?.get(key) ?? this.near?.get(key);
    if (!b) return false;
    // Baked in device pixels: draw in device pixels.
    this.dev(g);
    blitBaked(g, b, x * this.ratio, y * this.ratio, dev, alpha);
    this.css(g);
    return true;
  }

  /**
   * `night` 0..1: the caught moment, the road going deep blue as the last lamps click off. The
   * Blackout's distance (sim.gap) darkens the bottom of the screen under 30 m and switches the
   * nearest lamps off (part 10); under 15 m the last lit ones flicker.
   */
  draw(g: CanvasRenderingContext2D, sim: LaneSim, look: HeroLook, dist: number, t: number, pose: HeroPose, night = 0, slide = 0): void {
    this.ox = slide;
    try {
      this.drawScene(g, sim, look, dist, t, pose, night, -1);
    } finally {
      this.ox = 0;
    }
  }

  /** The scene; `pose` null and `back` 0 to 1 for the look back (part 14), else `back` is -1. */
  private drawScene(g: CanvasRenderingContext2D, sim: LaneSim, look: HeroLook, dist: number, t: number, pose: HeroPose | null, night: number, back: number): void {
    const { w, h, hz } = this;
    this.bake(look);
    this.css(g);
    this.camD = dist - CAM_BACK;
    const v = this.art;
    v.w = w;
    v.h = h;
    v.horizonY = hz;
    v.f = this.f;
    v.camX = this.camX;
    const near = Math.max(dist - CAM_BACK + 0.3, this.camD + (CAM_UP * this.f) / Math.max(1, h - hz));
    const far = dist + sim.level.spawnAhead + 10;
    if (this.sky) g.drawImage(this.sky as CanvasImageSource, 0, 0, w, this.sky.height);
    drawLaneRoad(g, v, dist);
    const fade = (d: number): number => Math.min(1, Math.max(0, (sim.level.spawnAhead - (d - dist)) / FADE_M));
    const ppmAt = (d: number): number => this.f / (d - this.camD);
    const gap = sim.gap;
    const offTo = dist + Math.max(0, DARK_FROM - gap) * 0.6 - CAM_BACK + night * 40;
    // S3g1b: people (not in the look back, which shows the road you stand on).
    let folk = this.people && back < 0 ? this.folk : null;
    const proj: LaneProject = { sx: (x, d) => this.sx(x, d), sy: (y, d) => this.sy(y, d), ppm: ppmAt, ratio: this.ratio };
    const now: LaneFolkNow = { dist, gap, offTo, goal: sim.level.goal, atGoal: sim.phase === 'goal', t, still: this.still };
    if (folk) {
      try {
        folk.jogger.step(now, 0, folk.backOff);
        folk.drawFronts(g, proj, now, near, far);
      } catch (err) {
        this.folkFail(g, err);
        folk = null;
      }
    }

    // Far to near: footbridges, scenery, lamps.
    const b1 = Math.floor(far / BRIDGE_EVERY) * BRIDGE_EVERY;
    if (b1 > near + 2 && b1 > 0) {
      g.globalAlpha = fade(b1);
      if (folk) {
        try {
          folk.drawBridge(g, proj, now, b1);
        } catch (err) {
          this.folkFail(g, err);
          folk = null;
        }
        g.globalAlpha = fade(b1);
      }
      drawFootbridge(g, v, b1 - dist);
      g.globalAlpha = 1;
    }
    const s1 = Math.floor(far / SCENERY_EVERY) * SCENERY_EVERY;
    const pieces: { i: number; d: number; side: 1 | -1 }[] = [];
    for (let d = s1; d >= near + 4; d -= SCENERY_EVERY) {
      const i = Math.round(d / SCENERY_EVERY);
      const side = i % 2 === 0 ? 1 : -1;
      pieces.push({ i, d, side });
      const x = side * (ROAD.half + ROAD.kerb + (side < 0 ? ROAD.divider : 0) + 2.6);
      this.blit(g, LANE_SCENERY[i % LANE_SCENERY.length]!, this.sx(x, d), this.sy(0, d), ppmAt(d), fade(d));
    }
    if (folk) {
      try {
        folk.drawPeople(g, proj, now, near, far, pieces);
      } catch (err) {
        this.folkFail(g, err);
        folk = null;
      }
    }
    // The look back: the switching off comes from the far end towards you.
    const backFrom = back >= 0 ? far - back * (far - dist - 6) : Infinity;
    const l1 = Math.floor(far / LAMP_EVERY) * LAMP_EVERY;
    for (let d = l1; d >= near + 0.5; d -= LAMP_EVERY) {
      const look: LampLook = back >= 0 ? (d > backFrom ? 'off' : 'on') : d < offTo ? 'off' : d < offTo + LAMP_EVERY * 1.5 && gap < WARN_UNDER ? 'flicker' : 'on';
      g.globalAlpha = fade(d);
      drawLaneLamp(g, v, d - dist, -1, look, t, this.still);
      drawLaneLamp(g, v, d - dist, 1, look, t, this.still);
    }
    g.globalAlpha = 1;
    if (back >= 0) {
      // The dark rolling up the road from the far end (deep blue, never black).
      if (back > 0) {
        const dark = g.createLinearGradient(0, hz - 30, 0, hz + (h - hz) * (0.25 + 0.45 * back));
        dark.addColorStop(0, `rgba(16,26,74,${(0.7 * back).toFixed(3)})`);
        dark.addColorStop(1, 'rgba(16,26,74,0)');
        g.fillStyle = dark;
        g.fillRect(0, 0, w, h);
      }
      g.setTransform(1, 0, 0, 1, 0, 0);
      return;
    }
    const goal = sim.level.goal;
    if (goal > near && goal < far) this.blit(g, sim.phase === 'run' ? 'busStop' : 'busStopBright', this.sx(ROAD.half + ROAD.kerb + 2.4, goal), this.sy(0, goal), ppmAt(goal), fade(goal));
    if (folk) {
      try {
        folk.drawGoal(g, proj);
      } catch (err) {
        this.folkFail(g, err);
      }
    }

    // Road things and coins, far to near, with the hero between those ahead and those behind.
    const list = this.list;
    list.length = 0;
    for (const s of sim.things) if (s.used && s.state !== 'taken' && s.d > near) list.push(s);
    for (const c of sim.coins) if (c.used && !c.taken && c.d > near) list.push(c);
    list.sort((a, b) => b.d - a.d);
    const boxes = this.boxes;
    if (boxes) boxes.length = 0;
    let heroDrawn = false;
    const drawHero = (): void => {
      heroDrawn = true;
      if (!pose) return;
      const ppm = ppmAt(dist);
      const x = this.sx(sim.x, dist);
      const y = this.sy(0, dist);
      drawLaneShadow(g, x, y, ppm, pose.up);
      const frame = pose.kind === 'run' ? laneRunFrame(pose.phase) : pose.kind === 'stumble' ? laneStumbleFrame(pose.phase) : pose.kind === 'torch' ? laneTorchFrame(pose.phase) : pose.kind === 'wave' ? Math.floor(t * 3) % 2 : 0;
      const p: LaneHeroPose = { move: pose.kind, frame, suit: pose.suit };
      const b = this.hero?.get(laneHeroKey(p));
      const yUp = y - pose.up * ppm;
      if (b) {
        this.dev(g);
        g.translate(x * this.ratio, yUp * this.ratio);
        if (pose.lean) g.rotate(pose.lean * 0.08);
        blitBaked(g, b, 0, 0, ppm * this.ratio);
        this.css(g);
      }
      if (boxes) {
        const hk = ppm * (pose.kind === 'slide' ? 0.8 : HERO_HEIGHT);
        boxes.push({ kind: 'hero', x: x - 0.35 * ppm, y: yUp - hk, w: 0.7 * ppm, h: hk });
      }
    };
    for (const s of list) {
      if (!heroDrawn && s.d <= dist) drawHero();
      const a = fade(s.d);
      const boost = farBoost(s.d - dist);
      const ppm = ppmAt(s.d) * boost;
      if ('pickup' in s) {
        const x = this.sx(sim.laneX(s.lane), s.d);
        if (s.pickup) {
          const kind = s.kind as LanePickup;
          const frame = kind === 'bulb' ? bulbFrame(t, this.still) : 0;
          this.blit(g, laneKey(kind, frame), x, this.sy(PICKUP_UP, s.d), ppm, a);
          continue;
        }
        const kind = s.kind as ThingKind;
        const y = this.sy(0, s.d);
        if (s.state === 'burst') {
          const look = burstLookOf(kind as LaneThing);
          const p = s.t / BURST_TIME;
          if (look && p < 1) {
            g.globalAlpha = a;
            atScreen(g, x, y, ppm, (gg) => drawLaneBurst(gg, look, p, this.still));
            g.globalAlpha = 1;
          }
          continue;
        }
        const ak = artKind(s);
        // A goat trots off to the pavement on its side; the cones slide to the kerb.
        const off = s.state === 'off' ? (s.lane === 0 ? -1 : 1) * Math.min(1, s.t * 1.2) * 3.5 * ppm : 0;
        const frame = ak === 'danfo' ? hazardFrame(t, this.still) : ak === 'goat' ? goatChewFrame(t) : ak.startsWith('goatOff') ? Math.floor(s.t / 0.12) % 2 : 0;
        this.blit(g, laneKey(ak, frame), x + off, y, ppm, a);
        if (boxes) {
          const z = SIZE[kind];
          const hh = Math.max(z.h, 0.3) * ppm;
          boxes.push({ kind: isDodge(kind) ? `dodge:${kind}` : kind, x: x - (z.w / 2) * ppm, y: y - hh, w: z.w * ppm, h: hh });
        }
      } else this.blit(g, laneKey('coin', coinFrame(t + s.d, this.still)), this.sx(sim.laneX(s.lane), s.d), this.sy(s.h, s.d), ppm, a);
    }
    if (!heroDrawn) drawHero();
    // The Blackout's dark edge (deep blue, never black) and, when caught, the wash.
    drawBlackout(g, w, h, gap);
    if (night > 0) drawBlackoutWash(g, w, h, night);
  }
}
