/**
 * A player's plan for Pothole Hall (docs/ogun.md 5.3, 5.4), shared by the unit bot and the e2e
 * bot. It reads what a player sees (the hero, King Pothole's opening, the bag, the gravel) and
 * says which way to hold and when to jump.
 *
 * The plan: walk into the bag on the pile; walk at him and, just before his near lip, jump and
 * jump again in the air (a held jump and a held second jump) to carry the bag over his middle;
 * come back the same way, with no bag. Jump over any gravel lump about to touch, towards it (so
 * it passes under quickly; he holds still while the hero is in the air). Never start over him
 * with a lump close. With no bag ready, wait by the pile.
 */

export interface PotHero {
  x: number;
  y: number;
  vx: number;
  vy: number;
  grounded: boolean;
}

export interface PotSight {
  hero: PotHero;
  pitX: number;
  lips: readonly [number, number];
  carrying: boolean;
  bagReady: boolean;
  defeated: boolean;
  /** Gravel lumps moving (x, vx). */
  gravel: readonly { x: number; vx: number }[];
  /** He is gulping: a throw comes out of his near lip in a moment. */
  gulp?: boolean;
}

export type PotJump = 'hop' | 'cross';

export interface PotDecision {
  move: -1 | 0 | 1;
  jump: PotJump | null;
  why: string;
}

/**
 * The plan's numbers: jump a lump when it is this close (u, middle to middle, plus the ground
 * both close in the reaction time); take off this far before his lip; keep this far from a lump
 * before starting over him; wait here for a bag; the bag's middle.
 */
export const POT_BOT = { hopAt: 52, crossAt: 14, holdOff: 120, waitX: 130, bagX: 80, gulpBack: 60, gulpCross: 30, hopRoom: 90 } as const;

/** What to do now. `late`: seconds between seeing and acting (the plan allows for it). */
export function decidePothole(s: PotSight, late = 0): PotDecision {
  const h = s.hero;
  if (s.defeated) return { move: 0, jump: null, why: 'watch the finish' };
  const speed = Math.abs(h.vx);
  // The nearest lump coming at the hero: its middle this far ahead.
  let near: { d: number; x: number; vx: number } | null = null;
  for (const z of s.gravel) {
    const d = (z.x - h.x) * (z.vx < 0 ? 1 : -1);
    if (d > -8 && (!near || d < near.d)) near = { d, x: z.x, vx: z.vx };
  }
  const [l, r] = s.lips;
  const lipGap = h.x > s.pitX ? h.x - r : l - h.x;
  if (h.grounded && near && near.d < POT_BOT.hopAt + (speed + Math.abs(near.vx)) * late) {
    // Towards the lump (it passes under quickly), but straight up if that would land in him.
    const toward: -1 | 1 = near.x > h.x ? 1 : -1;
    const intoHim = (toward === 1) === h.x < s.pitX && lipGap < POT_BOT.hopRoom;
    return { move: intoHim ? 0 : toward, jump: 'hop', why: 'jump the gravel' };
  }
  // He gulps with the hero by his lip: go over him now (the lump comes out behind), or stop.
  const bound = s.carrying || h.x > s.pitX;
  if (s.gulp && h.grounded && lipGap < POT_BOT.gulpBack) {
    if (bound && lipGap <= POT_BOT.gulpCross) return { move: h.x > s.pitX ? -1 : 1, jump: 'cross', why: 'over him before the throw' };
    return { move: 0, jump: null, why: 'stop for the gulp' };
  }
  const lumpNear = near !== null && near.d < POT_BOT.holdOff;
  const crossAt = POT_BOT.crossAt + speed * late;
  if (h.x > s.pitX) {
    // Back over him to the pile side (with or without a bag).
    if (lumpNear) return { move: 0, jump: null, why: 'wait for the gravel' };
    if (h.x - r <= crossAt && h.grounded) return { move: -1, jump: 'cross', why: 'jump back over him' };
    return { move: -1, jump: null, why: 'walk back to him' };
  }
  if (s.carrying) {
    if (lumpNear) return { move: 0, jump: null, why: 'wait for the gravel' };
    if (l - h.x <= crossAt && h.grounded) return { move: 1, jump: 'cross', why: 'jump over him with the bag' };
    return { move: 1, jump: null, why: 'carry the bag to him' };
  }
  if (s.bagReady) return { move: h.x < POT_BOT.bagX ? 1 : -1, jump: null, why: 'walk into the bag' };
  const d = POT_BOT.waitX - h.x;
  return { move: Math.abs(d) < 8 ? 0 : d > 0 ? 1 : -1, jump: null, why: 'wait by the pile' };
}
