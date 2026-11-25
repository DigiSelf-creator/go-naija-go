/**
 * qa K4c (docs/kano.md part 10): the Dawanau pass, the rules side.
 * - The shield takes exactly one whirl hit; the next whirl hurts.
 * - Fura da nono ends on time (12 s), and a whirl hurts the step after.
 * - Gamedev's pit ruling: every Dawanau whirl, left alone, puffs at a pit's lip (never over the
 *   hole, never in it), and no whirl ever stands still at a lip waiting for the hero.
 * - Fair to a small child: the tap window (how early or late a tap jump may come and still clear)
 *   for a whirl at run speed, with the tyre's and the goat's beside it (report, and a floor).
 * - Corn: at corn speed a held jump clears a whirl too.
 */
import { describe, expect, it } from 'vitest';
import kano3 from '../../src/data/levels/kano-3.json';
import { parseLevel, type Level } from '../../src/game/level';
import { HAZARD_BOX, RULES, STEPS_PER_SECOND, type RunEvent } from '../../src/game/run';
import { Run } from './kano-run';
import { pitsOf } from '../../src/game/pits';

const DT = 1 / 60;
const GY = 300;
const DAWANAU = parseLevel(structuredClone(kano3));

function street(patch: Record<string, unknown> = {}): Level {
  return parseLevel({
    ...(structuredClone(kano3) as Record<string, unknown>),
    id: 'qa-whirl',
    ground: [[-400, 20000]],
    platforms: [],
    sacks: [],
    springs: [],
    wind: [],
    kobo: [],
    foods: [],
    crates: [],
    hazards: [],
    wells: [],
    hints: [],
    checkpoint: 15000,
    end: { x: 19000, wall: 19200 },
    ...patch,
  });
}

function standAt(run: Run, x: number): void {
  Object.assign(run.hero, { x, y: GY, prevY: GY, vy: 0, vx: 0, speed: 0, grounded: true, on: null, move: 0, runTime: 0 });
}

function steps(run: Run, n: number): RunEvent[] {
  const out: RunEvent[] = [];
  for (let i = 0; i < n; i++) out.push(...run.step(DT));
  return out;
}

/** Tap distances (hero to hazard, 0 to 300 u, 2 u apart) at which one tap jump clears it, at full speed. */
function tapWindow(kind: string, opts: { corn?: boolean; hold?: number } = {}): number[] {
  const ok: number[] = [];
  for (let d = 0; d <= 300; d += 2) {
    const run = new Run(street({ hazards: [[kind, 3000]] }));
    standAt(run, 400);
    if (opts.corn) run.power.corn = RULES.cornSteps;
    run.steer(1);
    const z = run.hazards[0]!;
    let hit = false;
    let tapped = false;
    let held = 0;
    for (let i = 0; i < 3000 && run.hero.x < z.x + 60 && z.mode !== 'gone'; i++) {
      if (!tapped && z.mode === 'move' && z.x - run.hero.x <= d) {
        run.press();
        tapped = true;
      } else if (tapped && ++held > (opts.hold ?? 0)) run.release();
      if (run.step(DT).some((e) => e.type === 'hit')) hit = true;
    }
    if (!hit && tapped) ok.push(d);
  }
  return ok;
}

describe('qa K4c: whirl rules', () => {
  it('the garri shield takes exactly one whirl hit; the next whirl costs a life', () => {
    const run = new Run(street({ hazards: [['whirl', 700], ['whirl', 1300]] }));
    standAt(run, 450);
    run.power.shield = true;
    run.steer(1);
    const ev = steps(run, 600);
    expect(ev.filter((e) => e.type === 'shieldPop')).toHaveLength(1);
    expect(ev.filter((e) => e.type === 'hit')).toHaveLength(1);
    expect(run.lives).toBe(RULES.lives - 1);
  });

  it('fura da nono lasts 12 s to the step; the next whirl after it ends hurts', () => {
    expect(RULES.furaSteps).toBe(12 * STEPS_PER_SECOND);
    const run = new Run(street({ hazards: [['whirl', 5000]] }));
    standAt(run, 450);
    run.power.fura = RULES.furaSteps;
    let endAt = -1;
    for (let i = 1; i <= RULES.furaSteps + 5 && endAt < 0; i++) if (run.step(DT).some((e) => e.type === 'powerEnd' && e.kind === 'fura')) endAt = i;
    expect(endAt).toBe(RULES.furaSteps);
    run.steer(1);
    const ev = steps(run, 2000);
    expect(ev.some((e) => e.type === 'hit')).toBe(true);
    expect(ev.some((e) => e.type === 'whirlPuff')).toBe(false);
  });

  it('gamedev\'s pit ruling: each Dawanau whirl left alone puffs at a lip, never over or in a hole', () => {
    const pits = pitsOf(DAWANAU.ground);
    const report: string[] = [];
    for (const z0 of DAWANAU.hazards.filter((z) => z.kind === 'whirl')) {
      const run = new Run(DAWANAU);
      const z = run.hazards.find((q) => q.kind === 'whirl' && q.x0 === z0.x)!;
      // The hero waits just close enough to wake it, out of its way (high on nothing: held up).
      standAt(run, z0.x - DAWANAU.wakeDistance);
      let ev: RunEvent[] = [];
      let lastX = z.x;
      let still = 0;
      for (let i = 0; i < 60 * 90 && z.mode !== 'puff' && z.mode !== 'gone'; i++) {
        Object.assign(run.hero, { x: z0.x - DAWANAU.wakeDistance, y: GY, vy: 0, grounded: true });
        run.safe = 1e9; // never hurt while it passes (we watch the dust, not the hero)
        const was = z.mode;
        ev = run.step(DT);
        if (was === 'move' && z.mode === 'move' && Math.abs(z.x - lastX) < 1e-6) still++;
        lastX = z.x;
        expect(pits.some((p) => z.x > p.a && z.x < p.b), `whirl ${z0.x} over a hole at ${z.x}`).toBe(false);
      }
      expect(z.mode, `whirl ${z0.x}`).toBe('puff');
      const why = ev.find((e) => e.type === 'whirlPuff');
      const lip = pits.filter((p) => p.b <= z0.x).map((p) => p.b).sort((a, b) => b - a)[0];
      report.push(`${z0.x} -> ${(why as { why?: string })?.why} at ${z.x.toFixed(0)} (lip ${lip})`);
      expect(still, `whirl ${z0.x} stood still`).toBe(0);
      expect(z.y).toBe(GY);
    }
    console.log(`qa K4c pit ruling: ${report.join('; ')}`);
  });
});

describe('qa K4c: fair to a small child', () => {
  it('tap window at run speed: whirl beside tyre and goat (report); the whirl window is 40 u or more', () => {
    const span = (w: number[]) => (w.length ? `${w[0]}..${w[w.length - 1]} (${w.length * 2} u)` : 'none');
    const whirl = tapWindow('whirl');
    const tyre = tapWindow('tyre');
    const goat = tapWindow('goat');
    const corn = tapWindow('whirl', { corn: true });
    const heldCorn = tapWindow('whirl', { corn: true, hold: 20 });
    console.log(`qa K4c tap windows (tap distance u): whirl ${span(whirl)}, tyre ${span(tyre)}, goat ${span(goat)}, whirl on corn ${span(corn)}, held on corn ${span(heldCorn)}`);
    expect(whirl.length * 2).toBeGreaterThanOrEqual(40);
    expect(heldCorn.length * 2).toBeGreaterThanOrEqual(40);
  });

  it('a whirl is at most a little taller than a tap clears: 50 u against a 74 u rise', () => {
    expect(HAZARD_BOX.whirl.h).toBe(50);
    expect(HAZARD_BOX.whirl.halfW * 2).toBe(30);
  });
});
