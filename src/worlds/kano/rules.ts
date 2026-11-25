/**
 * K-size (kano.md 9.1): Kano's own street rules, out of the first load: the Harmattan wind on the
 * hero's air speed and its whoosh (K2b), the gate's welcome (kano.md 3.4), and the dust whirl's
 * speed, drift and puff (K4b). The run (src/game/run.ts) calls them through its small StreetRules
 * hook, made for each play (Run's `rules` option); every number is as it was in the run.
 * Like every file in this folder it imports only types from outside it (KN-R10).
 */
import type { Body } from '../../engine/physics';
import type { WindData } from '../../game/level';
import type { HazardState, Run, RunEvent, StreetRules, WhirlWhy } from '../../game/run';

const secs = (s: number): number => Math.round(s * 60);

export const KANO_RUN = {
  /**
   * K4b (kano.md 3.3): a dust whirl drifts left at 50 u/s (Gentle: 40) and puffs apart over 0.45 s
   * (art's WHIRL.puffS): landed on, touched with fura, smashed with amala, hit by a fufu ball, or
   * at a pit's lip (dust never falls in).
   */
  whirlSpeed: 50,
  whirlSpeedGentle: 40,
  whirlPuffSteps: secs(0.45),
  /** The whirl's half width (run.ts HAZARD_BOX.whirl): the lip is met by its front edge. */
  whirlHalfW: 15,
  /**
   * K2b (kano.md 3.3): in the air, a wind behind you adds a quarter to your speed forward; one in
   * your face takes a quarter away (Gentle mode: an eighth; kilishi: nothing). The ground is not changed.
   */
  tailwind: 0.25,
  headwind: 0.25,
  headwindGentle: 0.125,
  /** The soft "whoosh" plays again this often while the hero is in a wind stretch. */
  whooshSteps: secs(0.9),
} as const;

/** The wind stretch at x (its start to its end), or null. */
export function windAt(run: Run, x: number): WindData | null {
  for (const w of run.level.wind) if (x >= w.x && x <= w.x + w.w) return w;
  return null;
}

/**
 * How much of the air speed forward the hero covers at x (physics Body.wind): 1.25 in a wind
 * behind you, 0.75 in your face (Gentle: 0.875), 1 with kilishi in your face or with no wind.
 */
export function windFactor(run: Run, x: number): number {
  const w = windAt(run, x);
  if (!w) return 1;
  if (w.dir === 'back') return 1 + KANO_RUN.tailwind;
  if (run.power.kilishi > 0) return 1;
  return 1 - (run.gentle ? KANO_RUN.headwindGentle : KANO_RUN.headwind);
}

/** K4b: a dust whirl puffs apart where it is (no box from now on; gone after 0.45 s). */
function puff(z: HazardState, why: WhirlWhy, ev: RunEvent[]): void {
  z.mode = 'puff';
  z.t = 0;
  ev.push({ type: 'whirlPuff', x: z.x, why });
}

const onGround = (run: Run, x: number): boolean => run.terrain.ground.some((s) => x >= s.x0 && x <= s.x1);

/** Kano's rules for one play of a street (its gate shown once, its whoosh clock). */
export function kanoRules(run: Run): StreetRules {
  let gateShown = false;
  let whooshIn = 0;
  const wind = run.level.wind.length > 0;
  return {
    before(h: Body) {
      if (h.manual && wind) h.wind = windFactor(run, h.x);
    },
    after(ev) {
      const x = run.hero.x;
      // K2b (kano.md 3.4): through the gate in the old wall, "Welcome to Kano!" (once a play).
      const gate = run.level.gate;
      if (gate !== null && !gateShown && x >= gate) {
        gateShown = true;
        ev.push({ type: 'gate' });
      }
      if (!wind) return;
      if (!windAt(run, x)) whooshIn = 0;
      else if (--whooshIn <= 0) {
        whooshIn = KANO_RUN.whooshSteps;
        ev.push({ type: 'whoosh' });
      }
    },
    speed(z) {
      return z.kind === 'whirl' ? (run.gentle ? KANO_RUN.whirlSpeedGentle : (run.level.hazardSpeeds.whirl ?? KANO_RUN.whirlSpeed)) : undefined;
    },
    move(z, nx, ev) {
      if (z.kind !== 'whirl') return false;
      // K4b: dust never falls in a pit; it puffs apart at the lip.
      if (!onGround(run, nx - KANO_RUN.whirlHalfW)) puff(z, 'pit', ev);
      else z.x = nx;
      return true;
    },
    hit(z, how, ev) {
      if (z.kind !== 'whirl') return false;
      // K4b (kano.md 4.1): with fura da nono a touch puffs it apart, no hurt, no kobo (as OG-R14).
      if (how === 'touch' && run.power.fura <= 0) return false;
      puff(z, how === 'touch' ? 'fura' : how, ev);
      return true;
    },
    tick(z) {
      if (z.mode === 'puff' && ++z.t >= KANO_RUN.whirlPuffSteps) z.mode = 'gone';
    },
  };
}
