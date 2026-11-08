/**
 * J2: knocking the hanging crates by hand (docs/design.md S2.4), for playStreetByHand's `act`.
 * The left thumb lets go of Forward a little before a crate so the hero stops under it, steps
 * with Forward or Back until it is right under, then the right thumb taps Jump. A roof crate:
 * stop short of the roof, jump onto it with Forward held, then the same. A food crate: stay
 * under it until the food has dropped onto the hero.
 */
import type { Page } from '@playwright/test';
import { buttonCentres, LEFT, RIGHT, snap, type Hands, type Snap } from './hands';

type Crate = Snap['r']['crates'][number];

export interface CrateLog {
  /** Crate x, in the order they opened. */
  opened: number[];
  /** Foods taken from crates. */
  foods: string[];
  /** Called right after a crate opens, and once its kobo are fanning out (for screenshots). */
  onOpen?: (c: Crate, page: Page) => Promise<void>;
}

export async function crateActor(page: Page, log: CrateLog) {
  const level = await page.evaluate(() => window.__game!.level);
  const btn = await buttonCentres(page);
  const roofUnder = (c: Crate) => level.platforms.find((p) => c.x >= p.x && c.x <= p.x + p.w && p.y === c.bottomY + 96) ?? null;
  const tries = new Map<number, number>();

  /** Lift every thumb and wait until the hero stands still on something. */
  const stop = async (h: Hands): Promise<Snap> => {
    await h.up(LEFT);
    for (;;) {
      const s = await snap(page);
      if ((s.h.grounded && s.h.vx === 0) || s.r.phase !== 'run') return s;
    }
  };
  /** Hold Forward or Back until the hero's x is within `near` of x, then stop. */
  const walkTo = async (h: Hands, x: number, near: number): Promise<Snap> => {
    let s = await stop(h);
    for (let i = 0; i < 6 && Math.abs(s.h.x - x) > near; i++) {
      const fwd = x > s.h.x;
      const b = fwd ? btn.forward : btn.back;
      await h.down(LEFT, b.x, b.y);
      for (;;) {
        s = await snap(page);
        // Walking speed is 90 u/s at most here: let go a little early, the hero slides about 3 u.
        if (s.r.phase !== 'run' || (fwd ? s.h.x >= x - 4 : s.h.x <= x + 4)) break;
      }
      s = await stop(h);
    }
    return s;
  };
  /** A tap jump (70 u high), or held for a full jump (139 u high) to reach a tall roof. */
  const tapJump = async (h: Hands, hold = false): Promise<void> => {
    await h.down(RIGHT, btn.jump.x, btn.jump.y);
    if (hold) {
      for (let i = 0; i < 200; i++) {
        const t = await snap(page);
        if (t.h.vy >= 0 && !t.h.grounded) break;
      }
    } else await page.waitForTimeout(40);
    await h.up(RIGHT);
  };

  return async (s: Snap, h: Hands): Promise<boolean> => {
    const c = s.r.crates.find((q) => !q.open && q.x - s.h.x < 140 && q.x - s.h.x > -30);
    if (!c || (tries.get(c.x) ?? 0) >= 4) return false;
    const roof = roofUnder(c);
    const onRoof = roof !== null && s.h.y === roof.y;
    // Running at up to 156 u/s, the hero needs about 12 u to stop: let go in good time.
    const startAt = roof && !onRoof ? roof.x - 60 : c.x - 40;
    if (s.h.x < startAt - 30) return false;
    tries.set(c.x, (tries.get(c.x) ?? 0) + 1);
    if (roof && !onRoof) {
      // Up onto the roof: from 30 u short of its edge, Forward held and a tap jump.
      await walkTo(h, roof.x - 30, 4);
      await h.down(LEFT, btn.forward.x, btn.forward.y);
      await page.waitForTimeout(80);
      // A roof more than a tap jump high (S2.6 street 2: 110 u) takes a held jump.
      await tapJump(h, level.groundY - roof.y > 60);
      for (;;) {
        const t = await snap(page);
        if (t.r.phase !== 'run' || (t.h.grounded && t.h.x > roof.x)) break;
      }
    }
    await walkTo(h, c.x, 6);
    await tapJump(h);
    let opened: Crate | undefined;
    for (let i = 0; i < 200; i++) {
      const t = await snap(page);
      opened = t.r.crates.find((q) => q.x === c.x && q.open);
      if (opened || t.r.phase !== 'run' || (t.h.grounded && i > 10)) break;
    }
    if (opened) {
      log.opened.push(c.x);
      if (log.onOpen) await log.onOpen(opened, page);
      if (c.contents !== 'kobo') {
        // Stay put: the food pops up, drops straight down onto the hero and is taken.
        const kind = await page
          .waitForFunction((x) => {
            const r = window.__game!.run;
            const f = r.crates.find((q) => q.x === x)?.food;
            return f?.taken ? f.kind : r.phase !== 'run' ? 'none' : false;
          }, c.x, { polling: 16, timeout: 5000 })
          .then((v) => v.jsonValue())
          .catch(() => 'none');
        if (kind !== 'none') log.foods.push(kind as string);
      }
    }
    // Back to walking on: land first, then Forward down again.
    for (;;) {
      const t = await snap(page);
      if (t.h.grounded || t.r.phase !== 'run') break;
    }
    await h.down(LEFT, btn.forward.x, btn.forward.y);
    return true;
  };
}
