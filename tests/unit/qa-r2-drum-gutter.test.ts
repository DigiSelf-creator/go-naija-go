/**
 * qa round 2, question 1 (docs/design.md S2.16 B5, "qa round 2 rulings"): on street 3 the drum
 * used to roll over the long gutter at 6150, so a normal running jump over it landed in the
 * weeds. The drum now starts at 6280 and the gutter is at 6306, past where any normal drum jump
 * lands. This plays the real street from just after the fufu: the hero runs, jumps the goat and
 * then the drum with a running tap or a running held jump, pressed when the hazard is 60 to 120 u
 * ahead, on every screen width from the narrowest to a wide 19.5:9 phone (hazards wake just off
 * the right edge, so a wider screen wakes the drum earlier). It never loses a life, and every
 * landing from the drum jump is on safe road.
 */
import { describe, expect, it } from 'vitest';
import lagos3 from '../../src/data/levels/lagos-3.json';
import { heroScreenX } from '../../src/game/camera';
import { parseLevel } from '../../src/game/level';
import { Run, type HazardState } from '../../src/game/run';

const DT = 1 / 60;
const L3 = parseLevel(structuredClone(lagos3));
const GUTTER = L3.gutters.find((q) => q.w === 44)!;
const DRUM = L3.hazards.find((z) => z.kind === 'drum' && z.x > 6000 && z.x < 6400)!;

function play(viewW: number, react: number, style: 'tap' | 'hold'): { lost: number[]; landings: number[] } {
  const run = new Run(L3, { dash: true, gentle: false });
  Object.assign(run.hero, { x: 5600, vx: 156, speed: 156, runTime: 5 });
  run.steer(1);
  const done = new Set<object>();
  const lost: number[] = [];
  const landings: number[] = [];
  let holdFor = 0;
  let overDrum = false;
  for (let i = 0; i < 60 * 8 && run.hero.x < 6440; i++) {
    const h = run.hero;
    const f = heroScreenX(viewW);
    run.viewAhead = viewW * (1 - f);
    run.viewLeft = h.x - viewW * f;
    run.viewRight = run.viewLeft + viewW;
    if (holdFor === 0 && h.grounded) {
      const z = run.hazards.find((k: HazardState) => !done.has(k) && (k.mode === 'wait' || k.mode === 'move') && k.x - h.x > 0 && k.x - h.x < react);
      const q = run.gutters.find((k) => !done.has(k) && k.state === 'weeds' && k.x - h.x > 0 && k.x - h.x < 25);
      const what = z ?? q;
      if (what) {
        done.add(what);
        overDrum = z?.kind === 'drum';
        run.press();
        holdFor = style === 'tap' ? 2 : 30;
      }
    } else if (holdFor > 0) {
      holdFor--;
      if (holdFor === 0 || (style === 'hold' && h.vy >= 0)) {
        run.release();
        holdFor = 0;
      }
    }
    const wasUp = !h.grounded;
    const lives = run.lives;
    run.step(DT);
    if (wasUp && h.grounded && overDrum) {
      landings.push(h.x);
      overDrum = false;
    }
    if (run.lives < lives) lost.push(Math.round(h.x));
    run.steer(1);
  }
  return { lost, landings };
}

describe('qa round 2: street 3, the drum and the long gutter', () => {
  it('the drum starts left of the gutter, so it never rolls over it; the gutter keeps every B5 spacing rule (checked in s216-birds-gutters)', () => {
    expect(DRUM.x).toBe(6280);
    expect(GUTTER).toEqual({ x: 6306, w: 44 });
    expect(DRUM.x).toBeLessThan(GUTTER.x);
  });

  for (const viewW of [560, 640, 747, 820, 909]) {
    it.each(['tap', 'hold'] as const)(`a ${viewW} u wide screen: a running %s over the drum lands on safe road and costs no life`, (style) => {
      for (let react = 60; react <= 120; react += 10) {
        const r = play(viewW, react, style);
        expect(r.lost, `pressed ${react} u before`).toEqual([]);
        expect(r.landings.length, `pressed ${react} u before`).toBe(1);
        const x = r.landings[0]!;
        // Never in the weeds (the hero is 14 u wide), and at least 40 u of road before them.
        expect(x + 7, `landed at ${x.toFixed(0)}`).toBeLessThan(GUTTER.x - 40);
      }
    });
  }
});
