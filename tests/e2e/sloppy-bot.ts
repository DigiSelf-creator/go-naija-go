/**
 * qa: the boss bot (bot.ts) with human timing error, by real touches. It sees the jump it
 * wants (aiming jitter ms ahead), then each press and each release lands up to jitter ms
 * early or late. Stops at the win, game over, or when `until` says so.
 */
import type { CDPSession, Page } from '@playwright/test';
import { finger, landing, type Arena, type Plan } from './bot';

type Snap = Awaited<ReturnType<typeof snap>>;
const snap = (page: Page) =>
  page.evaluate(() => ({ h: window.__game!.hero, r: window.__game!.run, b: window.__game!.boss, paused: window.__game!.paused }));

export interface SloppyOpts {
  jitterMs: number;
  seed?: number;
  until?: (s: Snap) => boolean;
}

export async function fightBossSloppy(page: Page, cdp: CDPSession, opts: SloppyOpts): Promise<{ presses: number; last: Snap }> {
  const f = finger(cdp);
  const J = opts.jitterMs;
  let seed = opts.seed ?? 7;
  const rand = (): number => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  const late = (): Promise<void> => page.waitForTimeout(rand() * 2 * J); // 0..2J: -J..+J around the aim
  const lv = await page.evaluate(() => window.__game!.level);
  const arena: Arena = {
    terrain: { groundY: lv.groundY, ground: [{ x0: lv.arenaX - 1000, x1: lv.arenaX + 2000 }], platforms: lv.lights.map((l) => ({ ...l })), fallY: lv.groundY + 120 },
    turnLeftX: lv.turnLeftX,
    turnRightX: lv.turnRightX,
  };
  const aheadSteps = Math.round(J / (1000 / 60));
  let presses = 0;

  const jump = async (plan: Plan): Promise<void> => {
    await late();
    await f.down();
    presses++;
    if (plan === 'tap') {
      await f.up();
      return;
    }
    for (let stage = 0; stage < (plan === 'holdAir' ? 2 : 1); stage++) {
      for (let i = 0; i < 300; i++) {
        const h = await page.evaluate(() => window.__game!.hero);
        if (h.vy >= -1152 * (J / 1000) || h.grounded) break;
      }
      await late();
      await f.up();
      if (plan === 'holdAir' && stage === 0) {
        await late();
        await f.down();
        presses++;
      }
    }
  };

  let s = await snap(page);
  for (;;) {
    s = await snap(page);
    if (s.r.phase !== 'arena' || !s.b || s.b.defeated || opts.until?.(s)) break;
    if (s.paused) continue;
    const { h, b } = s;
    if (!h.grounded) continue;
    const dt = J / 1000;
    const tyre = b.throws.find((t) => {
      if (t.kind !== 'tyre') return false;
      const rel = (t.x + t.vx * dt - (h.x + h.dir * h.speed * dt)) * h.dir;
      return (rel > 0 && rel < 75) || (rel <= 0 && rel > -34);
    });
    const honkNear = b.throws.some((t) => t.kind === 'honk' && Math.abs(t.x - h.x) < 110);
    if (tyre && !honkNear) {
      await jump('hold');
      continue;
    }
    const lit = b.litLight;
    if (!lit || honkNear) continue;
    for (const plan of ['tap', 'hold', 'holdAir'] as const) {
      const p = landing(arena, h, plan, aheadSteps);
      if (p && p.x === lit.x && p.y === lit.y) {
        await jump(plan);
        break;
      }
    }
  }
  return { presses, last: s };
}
