/**
 * Hero physics. Pure functions on plain objects: no drawing, no DOM, no clock.
 * Numbers come from docs/design.md, "Physics feel (task A4)". Units: world units (u) and seconds.
 * y grows downwards; the road top is at y = 300.
 */

export interface PhysicsConfig {
  /** Run speed, u/s. */
  runSpeed: number;
  /** Run speed with roasted corn, u/s. */
  fastRunSpeed: number;
  /** Velocity set by a jump from the ground, u/s (negative = up). */
  jumpVy: number;
  /** Velocity set by the one jump in the air, u/s. */
  airJumpVy: number;
  /** Velocity set by bouncing off a goat or tyre, u/s. */
  bounceVy: number;
  /** Normal gravity, u/s². */
  gravity: number;
  /** Gravity while the press that started the jump is held and the hero is rising, u/s². */
  holdGravity: number;
  /** Fastest fall, u/s. */
  maxFallVy: number;
  /** Steps after leaving an edge in which a ground jump still works. */
  coyoteSteps: number;
  /** Steps a tap is remembered before landing. */
  bufferSteps: number;
  /** Platform edge grace on each side, from the hero's centre x. */
  platformGrace: number;
  /** Feet may be this far below a platform top last step and still land. */
  platformSnap: number;
  /** Feet may be this far below the road top last step and still land. */
  groundSnap: number;
}

export const PHYSICS: PhysicsConfig = {
  runSpeed: 156,
  fastRunSpeed: 228,
  jumpVy: -576,
  airJumpVy: -504,
  bounceVy: -480,
  gravity: 2232,
  holdGravity: 1152,
  maxFallVy: 720,
  coyoteSteps: 5,
  bufferSteps: 6,
  platformGrace: 6,
  platformSnap: 1,
  groundSnap: 2,
};

/** A stretch of road from x0 to x1. Between spans are gaps (potholes). */
export interface GroundSpan {
  x0: number;
  x1: number;
}

/** A one-way platform (stall roof): top edge at y, from x to x + w. */
export interface Platform {
  x: number;
  y: number;
  w: number;
}

export interface Terrain {
  /** Road top. */
  groundY: number;
  ground: readonly GroundSpan[];
  platforms: readonly Platform[];
  /** Below this the hero has fallen into a pothole. */
  fallY: number;
}

export const GROUND_Y = 300;
export const FALL_Y = 420;

export interface Body {
  /** Centre x of the feet. */
  x: number;
  /** Feet y. */
  y: number;
  vy: number;
  /** Feet y one step ago. */
  prevY: number;
  /** Run speed, u/s. */
  speed: number;
  /** 1 runs right, -1 runs left. */
  dir: 1 | -1;
  grounded: boolean;
  /** The platform stood on, or null for the road or the air. */
  on: Platform | null;
  /** The one jump in the air is still there. */
  airJump: boolean;
  /** Steps left in which a ground jump still works after leaving an edge. */
  coyote: number;
  /** Steps left in which a tap made in the air will jump on landing. */
  buffer: number;
  /** Finger (or key) is down. */
  down: boolean;
  /** The current jump was started by the press that is still down: lighter gravity while rising. */
  holding: boolean;
  /** Fell below fallY. */
  fallen: boolean;
}

export function createBody(x: number, terrain: Terrain, cfg: PhysicsConfig = PHYSICS): Body {
  return {
    x,
    y: terrain.groundY,
    vy: 0,
    prevY: terrain.groundY,
    speed: cfg.runSpeed,
    dir: 1,
    grounded: true,
    on: null,
    airJump: true,
    coyote: cfg.coyoteSteps,
    buffer: 0,
    down: false,
    holding: false,
    fallen: false,
  };
}

export function groundAt(terrain: Terrain, x: number): boolean {
  for (const s of terrain.ground) if (x >= s.x0 && x <= s.x1) return true;
  return false;
}

function groundJump(b: Body, cfg: PhysicsConfig): void {
  b.vy = cfg.jumpVy;
  b.grounded = false;
  b.on = null;
  b.coyote = 0;
  b.buffer = 0;
  b.airJump = true;
  b.holding = b.down;
}

/** Finger down (tap anywhere, Space, up arrow). Returns which jump happened, if any. */
export function press(b: Body, cfg: PhysicsConfig = PHYSICS): 'ground' | 'air' | 'buffered' | null {
  if (b.fallen) return null;
  b.down = true;
  if (b.grounded || b.coyote > 0) {
    groundJump(b, cfg);
    return 'ground';
  }
  if (b.airJump) {
    b.vy = cfg.airJumpVy; // set, not added
    b.airJump = false;
    b.holding = true;
    return 'air';
  }
  b.buffer = cfg.bufferSteps;
  return 'buffered';
}

/** Finger up. Gravity goes straight back to normal; no velocity cut. */
export function release(b: Body): void {
  b.down = false;
  b.holding = false;
}

/**
 * Landing on a goat or tyre (later hazards call this). Counts as the first jump,
 * so one jump in the air is left.
 */
export function bounce(b: Body, cfg: PhysicsConfig = PHYSICS): void {
  b.vy = cfg.bounceVy;
  b.grounded = false;
  b.on = null;
  b.coyote = 0;
  b.airJump = true;
  b.holding = false;
}

function land(b: Body, y: number, on: Platform | null, cfg: PhysicsConfig): void {
  b.y = y;
  b.vy = 0;
  b.grounded = true;
  b.on = on;
  b.airJump = true;
  b.coyote = cfg.coyoteSteps;
  b.holding = false;
}

/** One fixed step. dt is always 1/60 s in the game; tests may pass the same. */
export function step(b: Body, terrain: Terrain, dt: number, cfg: PhysicsConfig = PHYSICS): void {
  if (b.fallen) return;

  b.x += b.speed * b.dir * dt;

  if (!(b.down && b.holding && b.vy < 0)) b.holding = false;
  const g = b.holding ? cfg.holdGravity : cfg.gravity;
  b.vy = Math.min(b.vy + g * dt, cfg.maxFallVy);
  b.prevY = b.y;
  b.y += b.vy * dt;

  const wasGrounded = b.grounded;
  b.grounded = false;
  b.on = null;

  if (b.vy >= 0) {
    // One-way platforms: land only if the feet were at or above the top last step.
    // If several are crossed in one step, the highest top is the one met first.
    let best: Platform | null = null;
    for (const p of terrain.platforms) {
      if (
        b.x >= p.x - cfg.platformGrace &&
        b.x <= p.x + p.w + cfg.platformGrace &&
        b.prevY <= p.y + cfg.platformSnap &&
        b.y >= p.y &&
        (best === null || p.y < best.y)
      ) {
        best = p;
      }
    }
    if (best) land(b, best.y, best, cfg);
    else if (groundAt(terrain, b.x) && b.prevY <= terrain.groundY + cfg.groundSnap && b.y >= terrain.groundY) {
      land(b, terrain.groundY, null, cfg);
    }
  }

  if (b.grounded) {
    if (!wasGrounded && b.buffer > 0) groundJump(b, cfg); // tapped just before landing
  } else if (b.coyote > 0 && !wasGrounded) {
    // Counts from the first step in the air.
    b.coyote--;
  }
  if (b.buffer > 0) b.buffer--;

  if (b.y > terrain.fallY) b.fallen = true;
}
