/**
 * The lane run seen from behind (docs/design.md S3f0 part 5): the camera 4 m behind the hero and
 * 2.6 m up, the horizon 36 percent down, the road filling 86 percent of the width at the hero
 * (less on a very wide screen, so the hero stays on it), far things drawn up to 1.6 times bigger
 * so every dodge thing is 10 px or more 1.5 s away, and a fade-in over the first 5 m.
 * Part 21: the sky once into its own picture, a handful of road bands, nothing made each frame.
 */
import type { HeroLook } from '../art/hero';
import { HERO_HEIGHT, SIZE, isDodge, type ThingKind } from './level';
import { laneArt, type HeroPose, type LanePen } from './art';
import type { CoinSlot, LaneSim, Slot } from './sim';

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
const KERB = 0.4;
const LAMP_EVERY = 10;
const LAMP_X = ROAD_HALF + KERB + 0.5;
/** Part 10: the dark shows under 30 m, the close warning under 15 m. */
export const DARK_FROM = 30;
export const WARN_UNDER = 15;
const DARK_HEIGHT = 0.35;

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

export class LaneView {
  w = 1;
  h = 1;
  private ratio = 1;
  private f = 1;
  private hz = 0;
  camX = 0;
  still = false;
  private sky: HTMLCanvasElement | null = null;
  private readonly list: (Slot | CoinSlot)[] = [];
  /** Drawn boxes this frame, for the e2e checks (only when asked). */
  boxes: { kind: string; x: number; y: number; w: number; h: number }[] | null = null;
  private camD = 0;

  resize(w: number, h: number, ratio: number): void {
    this.w = w;
    this.h = h;
    this.ratio = ratio;
    this.f = focal(w, h);
    this.hz = Math.round(HORIZON * h);
    this.sky = null;
  }

  private skyPicture(): HTMLCanvasElement {
    if (this.sky) return this.sky;
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(this.w * this.ratio));
    c.height = Math.max(1, Math.round((this.hz + 1) * this.ratio));
    const g = c.getContext('2d');
    if (g) {
      g.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
      laneArt().sky(g, this.w, this.hz);
    }
    this.sky = c;
    return c;
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

  private quad(g: CanvasRenderingContext2D, x0: number, x1: number, d0: number, d1: number, fill: string): void {
    g.fillStyle = fill;
    g.beginPath();
    g.moveTo(this.sx(x0, d0), this.sy(0, d0));
    g.lineTo(this.sx(x1, d0), this.sy(0, d0));
    g.lineTo(this.sx(x1, d1), this.sy(0, d1));
    g.lineTo(this.sx(x0, d1), this.sy(0, d1));
    g.closePath();
    g.fill();
  }

  /**
   * `night` 0..1: the caught moment, the whole road going deep blue. The Blackout's distance
   * (sim.gap) darkens the bottom of the screen under 30 m and switches the near lamps off (part 10).
   */
  draw(g: CanvasRenderingContext2D, sim: LaneSim, look: HeroLook, dist: number, t: number, pose: HeroPose, night = 0): void {
    const art = laneArt();
    const { w, h, hz } = this;
    g.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
    this.camD = dist - CAM_BACK;
    // Nearest road on screen (the bottom edge), and the far end.
    const near = Math.max(dist - CAM_BACK + 0.3, this.camD + (CAM_UP * this.f) / Math.max(1, h - hz));
    const far = dist + sim.level.spawnAhead + 10;
    g.drawImage(this.skyPicture(), 0, 0, w, hz + 1);
    // Pavements (one plain fill under everything), road, darker bands every 10 m (so the speed
    // shows), kerbs and lane dashes.
    g.fillStyle = '#8c8172';
    g.fillRect(0, hz, w, h - hz);
    this.quad(g, -ROAD_HALF, ROAD_HALF, near, far, '#3b3a3d');
    const b0 = Math.floor(near / 10) * 10;
    for (let d = b0; d < far; d += 10) this.quad(g, -ROAD_HALF, ROAD_HALF, Math.max(d, near), Math.min(d + 5, far), '#353437');
    this.quad(g, -ROAD_HALF - KERB, -ROAD_HALF, near, far, '#f2b300');
    this.quad(g, ROAD_HALF, ROAD_HALF + KERB, near, far, '#f2b300');
    const k0 = Math.floor(near / 4) * 4;
    for (let d = k0; d < far; d += 4) {
      const a = Math.max(d, near);
      const z = Math.min(d + 2, far);
      if (z <= a) continue;
      this.quad(g, -ROAD_HALF - KERB, -ROAD_HALF, a, z, '#1d1a14');
      this.quad(g, ROAD_HALF, ROAD_HALF + KERB, a, z, '#1d1a14');
    }
    const lw = sim.level.laneWidth;
    const d0 = Math.floor(near / 8) * 8;
    for (let d = d0; d < far; d += 8) {
      const a = Math.max(d, near);
      const z = Math.min(d + 3, far);
      if (z <= a) continue;
      this.quad(g, -lw / 2 - 0.07, -lw / 2 + 0.07, a, z, '#e9e4d8');
      this.quad(g, lw / 2 - 0.07, lw / 2 + 0.07, a, z, '#e9e4d8');
    }

    const pen: LanePen = { g, x: 0, y: 0, k: 1, t, still: this.still };
    const at = (x: number, d: number, up = 0): LanePen => {
      pen.x = this.sx(x, d);
      pen.y = this.sy(up, d);
      pen.k = (this.f / (d - this.camD)) * farBoost(d - dist);
      return pen;
    };
    const fade = (d: number): number => Math.min(1, Math.max(0, (sim.level.spawnAhead - (d - dist)) / FADE_M));

    // Lamps along both kerbs every 10 m, far ones first. Under 30 m the Blackout has switched the
    // nearest ones off; under 15 m the last lit ones flicker twice a second (dim with reduced motion).
    const gap = sim.gap;
    const offTo = this.camD + Math.max(0, DARK_FROM - gap) * 0.6 + night * 30;
    const flicker = gap < WARN_UNDER ? (this.still ? 0.4 : Math.floor(t * 4) % 2 === 0 ? 1 : 0.25) : 1;
    const l1 = Math.floor(far / LAMP_EVERY) * LAMP_EVERY;
    for (let d = l1; d >= near + 0.5; d -= LAMP_EVERY) {
      g.globalAlpha = fade(d);
      const on = d < offTo ? 0 : d < offTo + LAMP_EVERY * 1.5 ? flicker : 1;
      art.lamp(at(-LAMP_X, d), on, -1);
      art.lamp(at(LAMP_X, d), on, 1);
    }
    g.globalAlpha = 1;
    const goal = sim.level.goal;
    if (goal > near && goal < far) {
      g.globalAlpha = fade(goal);
      art.busStop(at(ROAD_HALF + 2.5, goal));
      g.globalAlpha = 1;
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
      const p = at(sim.x, dist);
      // The hero is drawn at true size (the far boost is 1 at the hero).
      art.hero(p, pose, look);
      if (boxes) {
        const hk = p.k * (pose.kind === 'slide' ? 0.8 : HERO_HEIGHT);
        boxes.push({ kind: 'hero', x: p.x - 0.35 * p.k, y: p.y - pose.up * p.k - hk, w: 0.7 * p.k, h: hk });
      }
    };
    for (const s of list) {
      if (!heroDrawn && s.d <= dist) drawHero();
      g.globalAlpha = fade(s.d);
      if ('pickup' in s) {
        const p = at(sim.laneX(s.lane), s.d);
        if (s.pickup) art.pickup(p, s.kind as never);
        else art.thing(p, s.kind as ThingKind, s.state, s.t, s.lane);
        if (boxes && !s.pickup) {
          const kind = s.kind as ThingKind;
          const z = SIZE[kind];
          const hh = Math.max(z.h, 0.3) * p.k;
          boxes.push({ kind: isDodge(kind) ? `dodge:${kind}` : kind, x: p.x - (z.w / 2) * p.k, y: p.y - hh, w: z.w * p.k, h: hh });
        }
      } else art.coin(at(sim.laneX(s.lane), s.d), s.h);
    }
    g.globalAlpha = 1;
    if (!heroDrawn) drawHero();
    // The dark edge: deep blue (never black) from the bottom, up to 35 percent of the height at 0 m.
    if (gap < DARK_FROM || night > 0) {
      const u = Math.max(Math.min(1, (DARK_FROM - gap) / DARK_FROM), night);
      const top = h - DARK_HEIGHT * h * u;
      const grad = g.createLinearGradient(0, top, 0, h);
      grad.addColorStop(0, 'rgba(12, 18, 64, 0)');
      grad.addColorStop(1, 'rgba(12, 18, 64, 0.85)');
      g.fillStyle = grad;
      g.fillRect(0, top, w, h - top);
      if (night > 0) {
        g.fillStyle = `rgba(12, 18, 64, ${(0.6 * night).toFixed(3)})`;
        g.fillRect(0, 0, w, h);
      }
    }
  }
}
