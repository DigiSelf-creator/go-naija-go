/**
 * Fixed time step loop. Physics always moves in steps of exactly STEP_MS, so a jump is
 * the same height at 30 and 60 frames a second. Drawing happens once per screen frame.
 */
export const STEP_MS = 1000 / 60;
/** After a long stall (slow phone, tab switch) we drop time instead of running many steps at once. */
export const MAX_FRAME_MS = 100;

export interface Accumulated {
  /** How many fixed steps to run this frame. */
  steps: number;
  /** Time left over for the next frame, in ms. */
  acc: number;
}

/** Pure helper: add a frame's elapsed time and work out how many fixed steps to run. */
export function accumulate(acc: number, elapsedMs: number, stepMs = STEP_MS, maxFrameMs = MAX_FRAME_MS): Accumulated {
  let total = acc + Math.min(Math.max(elapsedMs, 0), maxFrameMs);
  let steps = 0;
  // Small epsilon so 1000/60 rounding never loses a step.
  while (total + 1e-9 >= stepMs) {
    total -= stepMs;
    steps++;
  }
  return { steps, acc: Math.max(total, 0) };
}

export interface LoopHooks {
  /** One fixed physics step. dt is always STEP_MS / 1000 seconds. */
  update(dt: number): void;
  /** Draw. alpha (0..1) is how far we are between the last step and the next. */
  render(alpha: number): void;
}

export class FixedLoop {
  private acc = 0;
  private last = 0;
  private frame = 0;
  private running = false;
  paused = false;
  /** Total fixed steps run since start; handy for tests. */
  stepCount = 0;

  constructor(
    private readonly hooks: LoopHooks,
    private readonly raf: (cb: FrameRequestCallback) => number = (cb) => requestAnimationFrame(cb),
    private readonly caf: (id: number) => void = (id) => cancelAnimationFrame(id),
  ) {}

  start(now = performance.now()): void {
    if (this.running) return;
    this.running = true;
    this.last = now;
    this.acc = 0;
    this.frame = this.raf(this.tick);
  }

  stop(): void {
    this.running = false;
    this.caf(this.frame);
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
    this.acc = 0; // never "catch up" on time spent paused
  }

  private readonly tick = (now: number): void => {
    if (!this.running) return;
    const elapsed = now - this.last;
    this.last = now;
    if (!this.paused) {
      const { steps, acc } = accumulate(this.acc, elapsed);
      this.acc = acc;
      for (let i = 0; i < steps; i++) {
        this.hooks.update(STEP_MS / 1000);
        this.stepCount++;
      }
    }
    this.hooks.render(this.paused ? 0 : this.acc / STEP_MS);
    this.frame = this.raf(this.tick);
  };
}
