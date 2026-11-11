/**
 * Slice 2 by hand: real fingers through the DevTools protocol, several at once, so one thumb
 * can hold Forward while the other jumps (docs/design.md S2.2, Phone buttons, Fingers).
 */
import type { CDPSession, Page } from '@playwright/test';

export type Snap = Awaited<ReturnType<typeof snap>>;
export const snap = (page: Page) =>
  page.evaluate(() => ({
    h: window.__game!.hero,
    a: window.__game!.anim,
    r: window.__game!.run,
    i: window.__game!.input,
    screen: window.__game!.screen,
    paused: window.__game!.paused,
    steps: window.__game!.steps,
  }));

/** Several fingers on the glass. Each call sends every finger still down. */
export function hands(cdp: CDPSession) {
  const active = new Map<number, { x: number; y: number }>();
  const send = (type: 'touchStart' | 'touchMove' | 'touchEnd') =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: [...active].map(([id, p]) => ({ id, x: p.x, y: p.y })) });
  return {
    down: async (id: number, x: number, y: number) => {
      active.set(id, { x, y });
      await send('touchStart');
    },
    move: async (id: number, x: number, y: number) => {
      active.set(id, { x, y });
      await send('touchMove');
    },
    up: async (id: number) => {
      const p = active.get(id);
      if (!p) return;
      active.delete(id);
      // touchEnd lifts the fingers it lists (an empty list lifts them all).
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [{ id, x: p.x, y: p.y }] });
    },
    /** The phone cancels every touch (a call comes in). */
    cancel: async () => {
      active.clear();
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    },
    upAll: async () => {
      active.clear();
      await send('touchEnd');
    },
    isDown: (id: number) => active.has(id),
  };
}
export type Hands = ReturnType<typeof hands>;

/** Centres of the drawn buttons, CSS px. */
export async function buttonCentres(page: Page) {
  const l = await page.evaluate(() => window.__game!.input.layout);
  const c = (b: { x: number; y: number; w: number; h: number }) => ({ x: Math.round(b.x + b.w / 2), y: Math.round(b.y + b.h / 2) });
  return { back: c(l.back), forward: c(l.forward), jump: c(l.jump), midX: l.midX };
}

export const LEFT = 1;
export const RIGHT = 2;

export interface HandBotOpts {
  /** Big pits (by left edge) to walk into once on purpose, to test the bus stop restart. */
  fallIntoOnce?: (pitStart: number) => boolean;
  /** Called on every poll. */
  onPoll?: (s: Snap, h: Hands) => Promise<void>;
  /** Stop when this is true. */
  until?: (s: Snap) => boolean;
  /**
   * Called when the hero is on the ground and no jump is held, before the bot looks for pits and
   * hazards. Return true when it moved the hero itself (it must put Forward back down if it
   * lifted it); the bot then looks again.
   */
  act?: (s: Snap, h: Hands) => Promise<boolean>;
}

/**
 * S2.16 B4: the left thumb double taps Forward and keeps holding (lift, press, lift, press).
 * Returns true when a dash started.
 */
export async function dashByHand(page: Page, h: Hands): Promise<boolean> {
  const btn = await buttonCentres(page);
  await h.up(LEFT);
  await h.down(LEFT, btn.forward.x, btn.forward.y);
  await h.up(LEFT);
  await h.down(LEFT, btn.forward.x, btn.forward.y);
  return page.evaluate(() => window.__game!.run.dash.dashing);
}

/**
 * Plays a street by hand with two thumbs: the left thumb holds Forward all the way (so the
 * hero walks, then runs), the right thumb presses Jump: a held jump over potholes, hazards and
 * a gutter's weeds (S2.16 B5), and for a big pit a held jump right at the lip with a held second
 * jump at the top. Before a dash gap (S2.16 B4), once the dash is on, the left thumb double
 * taps Forward to dash, and the jump at the lip carries over.
 */
export async function playStreetByHand(page: Page, h: Hands, opts: HandBotOpts = {}) {
  const level = await page.evaluate(() => window.__game!.level);
  const btn = await buttonCentres(page);
  const stats = { presses: 0, lostAt: [] as number[], foods: new Set<string>(), maxSpeed: 0, bigPitJumps: [] as { x: number; speed: number }[] };
  const fellOnce = new Set<number>();
  let holding = false;
  let second = false;
  let lastLives = Infinity;
  let s = await snap(page);
  await h.down(LEFT, btn.forward.x, btn.forward.y);
  for (;;) {
    s = await snap(page);
    if (s.r.phase !== 'run' || s.screen !== 'play' || opts.until?.(s)) break;
    if (opts.onPoll) await opts.onPoll(s, h);
    if (s.r.power.corn) stats.foods.add('corn');
    if (s.r.power.amala) stats.foods.add('amala');
    if (s.r.power.shield) stats.foods.add('garri');
    if (s.r.lives < lastLives && lastLives !== Infinity) stats.lostAt.push(s.h.x);
    lastLives = s.r.lives;
    stats.maxSpeed = Math.max(stats.maxSpeed, s.h.speed);
    const hero = s.h;
    if (holding) {
      if (hero.vy >= 0 || hero.grounded) {
        await h.up(RIGHT);
        holding = false;
        if (second && !hero.grounded) {
          await h.down(RIGHT, btn.jump.x, btn.jump.y);
          stats.presses++;
          holding = true;
          second = false;
        }
      }
      continue;
    }
    if (!hero.grounded) continue;
    if (opts.act && (await opts.act(s, h))) continue;
    const d = s.r.dash;
    if (d.on && !d.dashing && !d.resting && s.r.power.corn === 0 && level.gaps.some(([a, b]) => b - a >= 250 && a - hero.x > 60 && a - hero.x < 300)) {
      await dashByHand(page, h);
      continue;
    }
    const big = level.gaps.find(([a, b]) => b - a >= 160 && a - hero.x > -4 && a - hero.x < 10 + hero.speed * 0.03);
    if (big && opts.fallIntoOnce?.(big[0]) && !fellOnce.has(big[0])) {
      fellOnce.add(big[0]);
      // Walk straight in: no jump.
      for (let i = 0; i < 400; i++) {
        const t = await snap(page);
        if (t.r.lives < s.r.lives || t.h.y > 330) break;
      }
      continue;
    }
    const gap = big ?? level.gaps.find(([a, b]) => b - a < 160 && a - hero.x > -4 && a - hero.x < 32);
    const hazard = s.r.hazards.find((z) => (z.mode === 'wait' || z.mode === 'move') && z.x - hero.x > 0 && z.x - hero.x < 80);
    const weeds = s.r.gutters.find((q) => q.state === 'weeds' && q.x - hero.x > 0 && q.x - hero.x < 30);
    if (gap || hazard || weeds) {
      if (big) stats.bigPitJumps.push({ x: hero.x, speed: hero.speed });
      await h.down(RIGHT, btn.jump.x, btn.jump.y);
      stats.presses++;
      holding = true;
      second = !!gap && gap[1] - gap[0] > 110;
    }
  }
  if (holding) await h.up(RIGHT);
  return { stats, last: s };
}
