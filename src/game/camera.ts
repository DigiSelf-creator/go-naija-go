/**
 * The street camera for a player-moved hero (docs/design.md S2.2, Camera). Pure: no drawing,
 * moved once per fixed step so it is the same at 30 and 60 fps. It only moves sideways.
 */

export const CAMERA = {
  /** The hero must move this far the other way, without stopping, before the camera turns to look. */
  lookSwitch: 48,
  /** Each step the camera moves this share of the way to its target. */
  follow: 0.1,
  /** Never faster than this, u/s. */
  maxSpeed: 480,
  /** Hard rule: the hero's centre stays between these shares of the screen width. */
  keepMin: 0.08,
  keepMax: 0.92,
  /** The camera may show this much past the start fence and the end wall. */
  edgePad: 40,
} as const;

/**
 * The hero's forward place across the screen: 30 percent on wide screens; on narrow ones
 * (under 640 u) it moves left, down to 12 percent, to keep about 448 u of road visible ahead.
 */
export function heroScreenX(viewW: number): number {
  return Math.min(0.3, Math.max(0.12, (viewW - 448) / viewW));
}

export class Camera {
  /** Left edge, world x. */
  x = 0;
  /** The way the camera looks: 1 ahead to the right, -1 to the left. */
  look: 1 | -1 = 1;
  /** Ground covered against the look direction without stopping. */
  private against = 0;
  private lastHeroX = 0;

  constructor(
    readonly startWall: number,
    readonly endWall: number,
  ) {}

  /** Where the camera wants its left edge for this hero place and view width. */
  target(heroX: number, viewW: number): number {
    const f = heroScreenX(viewW);
    return heroX - viewW * (this.look === 1 ? f : 1 - f);
  }

  /** Jumps straight to the hero, looking right (start, and after a lost life). */
  snap(heroX: number, viewW: number): void {
    this.look = 1;
    this.against = 0;
    this.lastHeroX = heroX;
    this.x = this.limit(this.target(heroX, viewW), heroX, viewW);
  }

  /** One fixed step. */
  step(heroX: number, viewW: number, dt: number): void {
    const dx = heroX - this.lastHeroX;
    this.lastHeroX = heroX;
    if (dx * this.look < 0) {
      this.against += Math.abs(dx);
      if (this.against >= CAMERA.lookSwitch) {
        this.look = this.look === 1 ? -1 : 1;
        this.against = 0;
      }
    } else {
      this.against = 0; // stopped, or going the look way
    }
    const max = CAMERA.maxSpeed * dt;
    const move = (this.target(heroX, viewW) - this.x) * CAMERA.follow;
    this.x += Math.max(-max, Math.min(max, move));
    this.x = this.limit(this.x, heroX, viewW);
  }

  private limit(x: number, heroX: number, viewW: number): number {
    // The hero always stays between 8 and 92 percent of the screen.
    let out = Math.min(Math.max(x, heroX - viewW * CAMERA.keepMax), heroX - viewW * CAMERA.keepMin);
    // Never past the start fence or the end wall (by more than 40 u).
    const lo = this.startWall - CAMERA.edgePad;
    const hi = this.endWall + CAMERA.edgePad - viewW;
    out = Math.min(out, hi);
    return Math.max(out, lo);
  }
}
