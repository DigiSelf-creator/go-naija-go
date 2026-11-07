/**
 * A bot that plays level 1 by real touches (DevTools touch events, so a finger can be held).
 * Street: a held jump over every pothole and hazard, plus a second jump on wide potholes.
 * Boss: it predicts each jump with the game's own physics and jumps when the landing will
 * be on the lit light; it hops tyres and keeps off the ground near honk clouds.
 */
import type { CDPSession, Page } from '@playwright/test';
import { createBody, press, release, step, type Platform, type Terrain } from '../../src/engine/physics';

type Hero = NonNullable<Window['__game']>['hero'];

export function finger(cdp: CDPSession) {
  return {
    down: () => cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 600, y: 220, id: 1 }] }),
    up: () => cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }),
  };
}

const snapshot = (page: Page) =>
  page.evaluate(() => ({ h: window.__game!.hero, r: window.__game!.run, b: window.__game!.boss, screen: window.__game!.screen, paused: window.__game!.paused }));

/** Plays the street until the boss fight starts (or the run ends). Returns presses made. */
export async function playStreet(page: Page, cdp: CDPSession): Promise<number> {
  const level = await page.evaluate(() => window.__game!.level);
  const f = finger(cdp);
  let holding = false;
  let secondJump = false;
  let presses = 0;
  for (;;) {
    const s = await snapshot(page);
    if (s.r.phase !== 'run' || s.screen !== 'play') break;
    const { h } = s;
    if (holding) {
      if (h.vy >= 0) {
        await f.up();
        holding = false;
        if (secondJump) {
          await f.down();
          presses++;
          holding = true;
          secondJump = false;
        }
      }
      continue;
    }
    if (!h.grounded) continue;
    const gap = level.gaps.find(([a]) => a - h.x > -4 && a - h.x < 32);
    const hazard = s.r.hazards.find((z) => (z.mode === 'wait' || z.mode === 'move') && z.x - h.x > 0 && z.x - h.x < 80);
    if (gap || hazard) {
      await f.down();
      presses++;
      holding = true;
      secondJump = !!gap && gap[1] - gap[0] > 110;
    }
  }
  if (holding) await f.up();
  return presses;
}

/** The arena, read from the game (so the bot follows the level data). */
export interface Arena {
  terrain: Terrain;
  turnLeftX: number;
  turnRightX: number;
}

export type Plan = 'tap' | 'hold' | 'holdAir';

/**
 * Where does this jump land? Simulated with the game's physics and the arena's turn-around.
 * delay: steps before the press arrives; lag: steps late on each release.
 */
export function landing(a: Arena, h: Hero, plan: Plan, delay = 0, lag = 0): Platform | null {
  const { terrain: arenaTerrain, turnLeftX, turnRightX } = a;
  const b = createBody(h.x, arenaTerrain);
  Object.assign(b, { y: h.y, prevY: h.y, vy: h.vy, dir: h.dir, speed: h.speed, grounded: h.grounded, airJump: h.airJump, coyote: h.grounded ? 5 : 0 });
  const tick = (): void => {
    if (b.dir === 1 && b.x >= turnRightX) b.dir = -1;
    else if (b.dir === -1 && b.x <= turnLeftX) b.dir = 1;
    step(b, arenaTerrain, 1 / 60);
  };
  for (let i = 0; i < delay; i++) tick();
  if (!b.grounded) return null;
  press(b);
  let stage = 0;
  let wait = -1;
  for (let i = 0; i < 240; i++) {
    if (plan === 'tap' && stage === 0) {
      release(b);
      stage = 2;
    }
    if (stage < 2 && b.vy >= 0 && wait < 0) wait = lag;
    if (wait === 0) {
      release(b);
      wait = -1;
      if (stage === 0 && plan === 'holdAir') {
        press(b);
        stage = 1;
      } else stage = 2;
    } else if (wait > 0) wait--;
    tick();
    if (b.grounded) return b.on;
  }
  return null;
}

async function jump(page: Page, f: ReturnType<typeof finger>, plan: Plan): Promise<void> {
  await f.down();
  if (plan === 'tap') {
    await f.up();
    return;
  }
  for (let stage = 0; stage < (plan === 'holdAir' ? 2 : 1); stage++) {
    for (let i = 0; i < 200; i++) {
      const h = await page.evaluate(() => window.__game!.hero);
      if (h.vy >= 0) break;
    }
    await f.up();
    if (plan === 'holdAir' && stage === 0) await f.down();
  }
}

/** Fights General Go-Slow until the win screen (or game over). Returns presses made. */
export async function fightBoss(page: Page, cdp: CDPSession): Promise<number> {
  const f = finger(cdp);
  const lv = await page.evaluate(() => window.__game!.level);
  const arena: Arena = {
    terrain: { groundY: lv.groundY, ground: [{ x0: lv.arenaX - 1000, x1: lv.arenaX + 2000 }], platforms: lv.lights.map((l) => ({ ...l })), fallY: lv.groundY + 120 },
    turnLeftX: lv.turnLeftX,
    turnRightX: lv.turnRightX,
  };
  let presses = 0;
  for (;;) {
    const s = await snapshot(page);
    if (s.r.phase !== 'arena' || !s.b || s.b.defeated || s.paused) {
      if (s.r.phase !== 'arena' || s.b?.defeated) break;
      continue;
    }
    const { h, b } = s;
    if (!h.grounded) continue;
    // A tyre about to touch: hop it (landing on it is fine too).
    const tyre = b.throws.find((t) => {
      if (t.kind !== 'tyre') return false;
      const ahead = (t.x - h.x) * h.dir; // > 0: in front
      return (ahead > 0 && ahead < 75) || (ahead <= 0 && ahead > -34);
    });
    const honkNear = b.throws.some((t) => t.kind === 'honk' && Math.abs(t.x - h.x) < 110);
    if (tyre && !honkNear) {
      await jump(page, f, 'hold');
      presses++;
      continue;
    }
    const lit = b.litLight;
    if (!lit || honkNear) continue;
    const target = (p: Platform | null): boolean => !!p && p.x === lit.x && p.y === lit.y;
    for (const plan of ['tap', 'hold', 'holdAir'] as const) {
      // Only jump if the landing holds up with the touch arriving a step late too.
      if (target(landing(arena, h, plan)) && target(landing(arena, h, plan, 1, 2))) {
        await jump(page, f, plan);
        presses++;
        break;
      }
    }
  }
  return presses;
}
