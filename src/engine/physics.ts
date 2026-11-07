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
  /** Player-moved hero (docs/design.md S2.2, Speeds). Speeds up from 0 to walk speed, u/s². */
  walkAccel: number;
  /** Speeds up from walk to run speed, u/s². */
  runAccel: number;
  /** Seconds a direction must be held before the top speed on the ground is run speed. */
  runAfter: number;
  /** Slows down when no direction is held (on the ground), u/s². */
  stopDecel: number;
  /** Slows down when the other direction is held (on the ground), u/s². */
  turnDecel: number;
  /** Speeds up or slows down in the air, u/s². */
  airAccel: number;
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
  walkAccel: 900,
  runAccel: 300,
  runAfter: 0.5,
  stopDecel: 1200,
  turnDecel: 1800,
  airAccel: 600,
};

/** Walk and run speeds for a player-moved hero, u/s (from the level file; corn changes both). */
export interface Gait {
  walk: number;
  run: number;
}

export const GAIT: Gait = { walk: 90, run: 156 };

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
  /**
   * Auto-run (slice 1 levels): run speed, u/s. Player-moved: a copy of |vx| for readers.
   */
  speed: number;
  /** Auto-run: 1 runs right, -1 runs left. Player-moved: the way the hero faces. */
  dir: 1 | -1;
  /** Moved by the player (S2.2) instead of running by itself. */
  manual: boolean;
  /** Player-moved: walk and run speeds right now. */
  gait: Gait;
  /** Player-moved: speed across, u/s (negative = left). */
  vx: number;
  /** Player-moved: the direction held, 0 for none. */
  move: -1 | 0 | 1;
  /** Player-moved: seconds the same direction has been held (the run timer). */
  runTime: number;
  /** Player-moved: speed across when the feet left the ground, u/s. */
  airTop: number;
  /** Player-moved: the way the hero was going when the feet left the ground (0 straight up). */
  airDir: -1 | 0 | 1;
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
    manual: false,
    gait: { ...GAIT },
    vx: 0,
    move: 0,
    runTime: 0,
    airTop: 0,
    airDir: 0,
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

/** A hero the player moves: stands still until a direction is held (S2.2). */
export function createWalker(x: number, terrain: Terrain, gait: Gait = GAIT, cfg: PhysicsConfig = PHYSICS): Body {
  const b = createBody(x, terrain, cfg);
  b.manual = true;
  b.gait = { ...gait };
  b.speed = 0;
  return b;
}

/**
 * The direction held (-1 back, 0 none, 1 forward). Any change starts the run timer again:
 * letting go, or pressing the other way.
 */
export function steer(b: Body, move: -1 | 0 | 1): void {
  if (move !== b.move) b.runTime = 0;
  b.move = move;
}

/** Stops dead (a wall, or a lost life): no speed across, run timer back to 0. */
export function halt(b: Body): void {
  b.vx = 0;
  b.speed = 0;
  b.runTime = 0;
}

function toward(v: number, target: number, by: number): number {
  return v < target ? Math.min(target, v + by) : Math.max(target, v - by);
}

/** Player-moved speed across for one step (S2.2: Speeds, The run timer, In the air). */
function walk(b: Body, dt: number, cfg: PhysicsConfig): void {
  const m = b.move;
  const { walk: walkTop, run: runTop } = b.gait;
  let v = b.vx;
  if (b.grounded) {
    const top = b.runTime >= cfg.runAfter ? runTop : walkTop;
    if (m === 0) v = toward(v, 0, cfg.stopDecel * dt);
    else if (v * m < 0) v = toward(v, 0, cfg.turnDecel * dt); // skid, then walk the other way
    else {
      let s = Math.abs(v);
      if (s < walkTop) s = Math.min(s + cfg.walkAccel * dt, walkTop, top);
      else if (s < top) s = Math.min(s + cfg.runAccel * dt, top);
      else if (s > top) s = Math.max(top, s - cfg.stopDecel * dt); // corn wore off
      v = s * m;
    }
  } else if (m !== 0) {
    // A running jump keeps its speed; turned round in the air, walk speed is the top.
    const top = m === b.airDir ? Math.max(walkTop, b.airTop) : walkTop;
    if (v * m >= 0) {
      const s = Math.abs(v);
      if (s < top) v = Math.min(top, s + cfg.airAccel * dt) * m;
    } else {
      // Pulling back: slows, and may turn into the other direction up to walk speed.
      v += m * cfg.airAccel * dt;
      if (v * m > walkTop) v = m * walkTop;
    }
  } // Nothing held in the air: speed is kept (no air drag).
  if (m !== 0) {
    b.dir = m; // facing follows the direction pressed, on the first step of a turn too
    b.runTime += dt;
  }
  b.vx = v;
  b.speed = Math.abs(v);
}

function leaveGround(b: Body): void {
  b.airTop = Math.abs(b.vx);
  b.airDir = b.vx > 0 ? 1 : b.vx < 0 ? -1 : 0;
}

function groundJump(b: Body, cfg: PhysicsConfig): void {
  leaveGround(b);
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
  if (Math.abs(b.vx) > b.airTop) leaveGround(b);
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

  if (b.manual) {
    walk(b, dt, cfg);
    b.x += b.vx * dt;
  } else b.x += b.speed * b.dir * dt;

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
  } else if (wasGrounded) {
    leaveGround(b); // walked off an edge
  } else if (b.coyote > 0) {
    // Counts from the first step in the air.
    b.coyote--;
  }
  if (b.buffer > 0) b.buffer--;

  if (b.y > terrain.fallY) b.fallen = true;
}
