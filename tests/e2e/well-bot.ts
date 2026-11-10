/**
 * L2 by hand: a thumb bot for the well (docs/design.md S2.5). It walks to a well, taps Go down,
 * plays the room (every kobo, the crate from below, the garri parcel on the middle shelf), then
 * walks under the rope and taps Go up. Real fingers through the DevTools protocol (hands.ts).
 */
import { expect, type Page } from '@playwright/test';
import { buttonCentres, LEFT, RIGHT, snap, type Hands, type Snap } from './hands';

/** A third finger, for the Go down / Go up button. */
const WELL_FINGER = 3;
const MOVING = new Set(['run', 'room']);

export async function wellBot(page: Page, h: Hands) {
  const btn = await buttonCentres(page);

  /** Lift the left thumb and wait until the hero stands still on something. */
  const stop = async (): Promise<Snap> => {
    await h.up(LEFT);
    for (;;) {
      const s = await snap(page);
      if ((s.h.grounded && s.h.vx === 0) || !MOVING.has(s.r.phase)) return s;
    }
  };

  /** Hold Forward or Back until the hero's x is within `near` of x, then stop. */
  const walkTo = async (x: number, near = 6): Promise<Snap> => {
    let s = await stop();
    for (let i = 0; i < 8 && Math.abs(s.h.x - x) > near; i++) {
      const fwd = x > s.h.x;
      const b = fwd ? btn.forward : btn.back;
      await h.down(LEFT, b.x, b.y);
      for (;;) {
        s = await snap(page);
        // Let go a little early: from a walk the hero slides about 3 u, from a run about 12.
        const early = s.h.speed > 100 ? 14 : 4;
        if (!MOVING.has(s.r.phase) || (fwd ? s.h.x >= x - early : s.h.x <= x + early)) break;
      }
      s = await stop();
    }
    return s;
  };

  /** A tap jump (about 70 u high) or a held one (about 139 u), straight up; waits for the landing. */
  const jump = async (hold: boolean): Promise<Snap> => {
    await h.down(RIGHT, btn.jump.x, btn.jump.y);
    if (hold) {
      for (let i = 0; i < 300; i++) {
        const t = await snap(page);
        if (t.h.vy >= 0 && !t.h.grounded) break;
      }
    } else await page.waitForTimeout(40);
    await h.up(RIGHT);
    for (let i = 0; ; i++) {
      const t = await snap(page);
      if ((t.h.grounded && i > 3) || !MOVING.has(t.r.phase)) return t;
    }
  };

  /** The Go down or Go up button: checks it shows with its spoken name, then a finger taps it. */
  const tapWellButton = async (kind: 'down' | 'up'): Promise<void> => {
    await expect.poll(() => page.evaluate(() => window.__game!.wellButton?.kind ?? null)).toBe(kind);
    await expect(page.getByRole('button', { name: kind === 'down' ? 'Go down' : 'Go up' })).toBeVisible();
    const b = (await page.evaluate(() => window.__game!.wellButton))!;
    const x = Math.round(b.x + b.w / 2);
    const y = Math.round(b.y + b.h / 2);
    await h.down(WELL_FINGER, x, y);
    await h.up(WELL_FINGER);
  };

  /** Waits for a run phase. */
  const phase = (p: string, timeout = 8000) => expect.poll(() => page.evaluate(() => window.__game!.run.phase), { timeout }).toBe(p);

  /**
   * The room by hand, every gift: the floor kobo, the arc between shelves 1 and 2, the parcel
   * on the middle shelf, the crate from below, the kobo over and under shelf 3, then under the
   * rope. `shot(name)` is called at each gift for a picture.
   */
  const playRoom = async (shot: (name: string) => Promise<void> = async () => {}): Promise<Snap> => {
    await phase('room');
    // Floor kobo at 80, 104, 128, walking under shelf 1.
    await walkTo(160);
    await shot('room-floor-kobo');
    // Onto shelf 1 with a tap jump; its kobo at 135, 159, 183.
    await jump(false);
    await walkTo(186, 4);
    await walkTo(134, 4);
    // Down off shelf 1's left end, then the arc at 215 and 239 with a held jump from the floor.
    await walkTo(100);
    await walkTo(227, 4);
    await jump(true);
    // The parcel: a held jump from under the middle shelf lands on it.
    await walkTo(295, 4);
    await jump(true);
    await page.waitForTimeout(150);
    await shot('room-parcel');
    // Off the right end of the middle shelf, to the crate: a held jump knocks it from below.
    await walkTo(372);
    await walkTo(370, 4);
    await jump(true);
    await page.waitForTimeout(250);
    await shot('room-crate');
    // The floor kobo under shelf 3 (440, 464, 488), then up onto shelf 3 for 415, 439, 463.
    await walkTo(492, 4);
    await walkTo(440, 4);
    await jump(false);
    await walkTo(463, 4);
    await walkTo(415, 4);
    // Off shelf 3's right end to the rope.
    await walkTo(500, 4);
    return snap(page);
  };

  return { walkTo, jump, stop, tapWellButton, phase, playRoom };
}
