/**
 * K5b: a player's plan for Borehole Hall (docs/kano.md 5.3, 5.4), shared by the unit bot
 * (tests/unit/k5b-borehole-hall.test.ts) and the e2e bot (borehole-hall.spec.ts, by touch). It
 * reads what a player sees (the hero, the STUCK valve, the whirls) and says which way to hold and
 * when to press and lift Jump.
 *
 * The plan, as the hint says ("Bounce, hold, and bump the valve!"): walk under the STUCK valve
 * and press and hold: the jump falls onto the springy cloth, which bounces the held hero high
 * enough to bump the valve with the head. Then, still bouncing on the cloth, steer to the next
 * valve and, near the top of a bounce over it, press again (the jump in the air) to bump it. A
 * whirl coming along the floor: stop, and tap a small jump just in time to land on it (a bounce).
 *
 * KN-R14: the valve to hit is shut tight ("WAIT") until his first whirl of the phase leaves him,
 * and he never coughs while the hero is up after a cloth bounce. So after each glug: let go,
 * steer off the cloth to the floor beside it, walk back under the valve and stand there until it
 * says "STUCK" (his whirl is out), then bounce, hold and bump.
 */

export interface RustyHero {
  x: number;
  y: number;
  vx: number;
  vy: number;
  grounded: boolean;
  airJump: boolean;
}

export interface RustySight {
  hero: RustyHero;
  /** The valve to bump now (index), or -1. */
  stuck: number;
  /** KN-R14: it has shaken loose ("STUCK"); false while it says "WAIT". */
  ready: boolean;
  hits: number;
  valves: readonly number[];
  defeated: boolean;
  /** Whirls rolling (x, vx). */
  whirls: readonly { x: number; vx: number }[];
  time: number;
}

/** What the plan remembers between looks. */
export interface RustyMind {
  holding: boolean;
  holdFrom: number;
  hitsAt: number;
  tapped: boolean;
}

export const newRustyMind = (): RustyMind => ({ holding: false, holdFrom: 0, hitsAt: 0, tapped: false });

export interface RustyDo {
  move: -1 | 0 | 1;
  press: boolean;
  release: boolean;
  why: string;
}

/**
 * The plan's numbers: stand this near under the valve; press in the air this near over it;
 * watch a whirl from this far; tap so the hero comes down on it (a tap jump comes down through
 * the whirl's top about 0.42 s later, while it rolls in at 60 u/s); let go after this long.
 */
export const RUSTY_BOT = { under: 4, overAir: 8, watch: 130, stompAt: 26, fall: 0.42, giveUp: 2.4, offCloth: 55 } as const;

/** What to do now. `late`: seconds between seeing and acting (the plan allows for it). */
export function decideRusty(m: RustyMind, s: RustySight, late = 0): RustyDo {
  const B = RUSTY_BOT;
  const h = s.hero;
  const out = (move: -1 | 0 | 1, why: string, press = false, release = false): RustyDo => ({ move, press, release, why });
  if (s.defeated || s.stuck < 0) {
    const r = m.holding || m.tapped;
    m.holding = m.tapped = false;
    return out(0, 'watch the finish', false, r);
  }
  const target = s.valves[s.stuck]!;
  const dx = target - h.x;
  const toward: -1 | 0 | 1 = Math.abs(dx) <= B.under ? 0 : dx > 0 ? 1 : -1;
  if (m.tapped) {
    m.tapped = false;
    return out(0, 'tap: let go', false, true);
  }
  if (m.holding) {
    if (s.hits > m.hitsAt || s.time - m.holdFrom > B.giveUp || (h.grounded && s.time - m.holdFrom > 0.2)) {
      m.holding = false;
      return out(toward, s.hits > m.hitsAt ? 'glug! let go' : 'missed: let go', false, true);
    }
    return out(toward, 'hold');
  }
  // The nearest whirl rolling at the hero, its middle this far ahead.
  let d = Infinity;
  for (const z of s.whirls) {
    const ahead = z.x - h.x;
    if (z.vx < 0 && ahead > -16 && ahead < d) d = ahead;
  }
  // KN-R14: the valve says "WAIT": come down off the cloth, stand under it on the floor, let him cough.
  if (!s.ready) {
    if (!h.grounded) {
      const off = target - B.offCloth - h.x;
      return out(Math.abs(off) <= B.under ? 0 : off > 0 ? 1 : -1, 'WAIT: come down off the cloth');
    }
    if (d < B.watch && d <= B.stompAt + 60 * late) {
      m.tapped = true;
      return out(0, 'tap: come down on the whirl', true);
    }
    return out(toward, toward === 0 ? 'WAIT: stand under it and let him cough' : 'WAIT: walk under the valve');
  }
  if (h.grounded) {
    if (d < B.watch) {
      const speed = Math.max(0, -(s.whirls.find((z) => z.x - h.x === d)?.vx ?? 60));
      if (d <= B.stompAt + speed * late) {
        m.tapped = true;
        return out(0, 'tap: come down on the whirl', true);
      }
      return out(0, 'wait for the whirl');
    }
    if (toward !== 0) return out(toward, 'walk under the STUCK valve');
    m.holding = true;
    m.holdFrom = s.time;
    m.hitsAt = s.hits;
    return out(0, 'bounce, hold, bump', true);
  }
  // In the air (bouncing on the cloth): steer over the valve; near the top, the jump in the air.
  if (Math.abs(dx) <= B.overAir && h.airJump && h.vy > -140 && h.y < 290) {
    m.holding = true;
    m.holdFrom = s.time;
    m.hitsAt = s.hits;
    return out(toward, 'jump in the air under the valve', true);
  }
  return out(toward, 'steer in the air');
}
