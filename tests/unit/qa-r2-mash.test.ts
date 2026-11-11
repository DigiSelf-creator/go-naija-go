/**
 * qa round 2, question 3 (docs/design.md S2.16 B4, "qa round 2 rulings"): twelve very fast taps
 * of Forward and then a hold do not dash. Ruled as intended: a mash is a run of double taps. The
 * first pair starts a dash, the lift right after it ends the dash, and that starts the 2 s rest,
 * so the hold that follows is a normal run, with the breath puffs and, once per play, "Catch
 * your breath! Dash again soon.". After the rest a clean double tap and hold dashes as usual.
 */
import { describe, expect, it } from 'vitest';
import lagos3 from '../../src/data/levels/lagos-3.json';
import { Controls, type TouchAreas } from '../../src/engine/input';
import { parseLevel, type Level } from '../../src/game/level';
import { Run, type RunEvent } from '../../src/game/run';

const DT = 1 / 60;
const L3 = parseLevel(structuredClone(lagos3));
const OPEN: Level = { ...L3, ground: [[-400, 30000]], terrain: { ...L3.terrain, ground: [{ x0: -400, x1: 30000 }] }, hazards: [], gutters: [], wells: [], foods: [], crates: [], hints: [] };
const PHONE: TouchAreas = { width: 727, height: 393, midX: 97, buttons: true };
const FWD = { x: 142, y: 345 };

function rig() {
  let t = 1000;
  const run = new Run(OPEN, { dash: true });
  run.viewLeft = -Infinity;
  run.viewRight = Infinity;
  Object.assign(run.hero, { x: 3000, y: OPEN.groundY, prevY: OPEN.groundY });
  const ev: RunEvent[] = [];
  let dashCalls = 0;
  const c = new Controls(
    {
      onJumpPress: () => {},
      onJumpRelease: () => {},
      onMove: (d) => run.steer(d),
      onDash: (d) => {
        dashCalls++;
        run.dash(d === 1 ? 1 : -1);
      },
    },
    () => PHONE,
    'touch',
    () => t,
  );
  /** Let ms go by, stepping the run at 60 steps a second. */
  const wait = (ms: number): void => {
    for (let i = 0; i < Math.round(ms / (1000 / 60)); i++) ev.push(...run.step(DT));
    t += ms;
  };
  return { c, run, ev, wait, calls: () => dashCalls };
}

describe('qa round 2: a mash of Forward then a hold', () => {
  it('twelve fast taps then a hold: the first pair dashes for a moment, the lift ends it, the rest blocks the hold', () => {
    const { c, run, ev, wait, calls } = rig();
    let id = 1;
    for (let i = 0; i < 12; i++) {
      c.pointerDown(id, FWD.x, FWD.y, true);
      wait(50);
      c.pointerUp(id++);
      wait(50);
    }
    c.pointerDown(id, FWD.x, FWD.y, true); // and hold
    wait(100);
    expect(run.resting).toBe(true); // the hold lands inside the rest
    let fastest = 0;
    for (let i = 0; i < 30; i++) {
      wait(100);
      fastest = Math.max(fastest, run.hero.speed);
    }
    expect(calls()).toBeGreaterThan(1); // every press after a short tap is the second half of a double tap
    expect(ev.filter((e) => e.type === 'dashStart')).toHaveLength(1); // only the first pair dashes
    expect(ev.filter((e) => e.type === 'dashTired')[0]).toEqual({ type: 'dashTired', first: true });
    expect(run.dashing).toBe(false);
    expect(fastest).toBeLessThanOrEqual(156 + 1e-6); // a normal run all through the hold, never the dash's 210
  });

  it('once the 2 s rest is over, a clean double tap and hold dashes', () => {
    const { c, run, ev, wait } = rig();
    let id = 1;
    for (let i = 0; i < 12; i++) {
      c.pointerDown(id, FWD.x, FWD.y, true);
      wait(50);
      c.pointerUp(id++);
      wait(50);
    }
    wait(2200);
    c.pointerDown(id, FWD.x, FWD.y, true);
    wait(100);
    c.pointerUp(id++);
    wait(100);
    c.pointerDown(id, FWD.x, FWD.y, true);
    wait(500);
    expect(ev.filter((e) => e.type === 'dashStart')).toHaveLength(2);
    expect(run.dashing).toBe(true);
  });
});
