/**
 * P2 polish (docs/design.md S2.13 part 5): Gentle mode climbs out just before the pothole.
 */
import { describe, expect, it } from 'vitest';
import lagos1 from '../../src/data/levels/lagos-1.json';
import lagos2 from '../../src/data/levels/lagos-2.json';
import lagos3 from '../../src/data/levels/lagos-3.json';
import { parseLevel, type Level } from '../../src/game/level';
import { pitKind, pitsOf, type Pit } from '../../src/game/pits';
import { climbOutX, RULES, Run, type RunEvent } from '../../src/game/run';
import { GENTLE_HINTS, WORDS } from '../../src/screens/words';

const DT = 1 / 60;
const STREETS = [lagos1, lagos2, lagos3].map((raw) => parseLevel(structuredClone(raw)));
const L1 = STREETS[0]!;

/** Drop the hero into the middle of `pit` and step until the fall. */
function fallIn(run: Run, pit: Pit): RunEvent[] {
  Object.assign(run.hero, { x: (pit.a + pit.b) / 2, grounded: false });
  const out: RunEvent[] = [];
  for (let i = 0; i < 600; i++) {
    const ev = run.step(DT);
    out.push(...ev);
    if (ev.some((e) => e.type === 'fall')) break;
  }
  return out;
}

const firstOf = (L: Level, kind: 'small' | 'wide' | 'big'): Pit => pitsOf(L.ground).find((p) => pitKind(p) === kind)!;

describe('S2.13 part 5: the climb-out point', () => {
  const ground = [[0, 1000], [1040, 2000], [2100, 3000], [3170, 4000]] as const;
  it('is 100 u before the left lip of a tap, hold or wide pothole', () => {
    expect(climbOutX(ground, { a: 1000, b: 1040, w: 40 }, 80)).toBe(900);
    expect(climbOutX(ground, { a: 2000, b: 2100, w: 100 }, 80)).toBe(1900);
  });
  it('is 160 u before the left lip of a big pit (its run-up)', () => {
    expect(climbOutX(ground, { a: 3000, b: 3170, w: 170 }, 80)).toBe(2840);
  });
  it('is never behind the Normal mode point (the bus stop once reached, else the start)', () => {
    expect(climbOutX(ground, { a: 1000, b: 1040, w: 40 }, 950)).toBe(950);
    expect(climbOutX(ground, { a: 3000, b: 3170, w: 170 }, 2900)).toBe(2900);
  });
  it('moves to the middle of the road span ending at the lip when the point is not on solid road with 20 u each side', () => {
    const g = [[0, 1000], [1040, 1110], [1150, 3000]] as const;
    // 100 u before the lip at 1150 is 1050: only 10 u of road to its left.
    expect(climbOutX(g, { a: 1110, b: 1150, w: 40 }, 80)).toBe(1075);
  });
  it.each(STREETS)('$id: every restart point stands on solid road with 20 u each side', (L) => {
    for (const p of pitsOf(L.ground)) {
      const x = climbOutX(L.ground, p, L.spawnX);
      expect(x).toBe(p.a - (p.w >= 160 ? 160 : 100));
      expect(L.ground.some(([a, b]) => x - 20 >= a && x + 20 <= b), `pit at ${p.a}`).toBe(true);
    }
  });
});

describe('S2.13 part 5: a fall in Gentle mode', () => {
  it.each(STREETS.flatMap((L) => (['small', 'wide', 'big'] as const).map((kind) => ({ L, kind, id: L.id }))))(
    '$id, $kind pit: back just before it, one life fewer, 1.7 s of safety and the right hint',
    ({ L, kind }) => {
      const pit = firstOf(L, kind);
      const run = new Run(L, { gentle: true });
      if (pit.a > L.checkpoint) {
        run.hero.x = L.checkpoint + 1;
        run.step(DT); // the bus stop is reached
        expect(run.checkpointReached).toBe(true);
      }
      run.power.corn = 100;
      const ev = fallIn(run, pit);
      const want = Math.max(pit.a - (kind === 'big' ? 160 : 100), run.spawnX);
      expect(ev.filter((e) => e.type === 'fall')).toHaveLength(1);
      expect(ev).toContainEqual({ type: 'climbOut', kind, x: want });
      expect(run.lives).toBe(4);
      expect(run.hero.x).toBe(want);
      expect(run.hero.dir).toBe(1);
      expect(run.hero.vx).toBe(0);
      expect(run.power).toEqual({ corn: 0, amala: 0, shield: false });
      expect(run.safe).toBe(RULES.climbSafeSteps);
      expect(RULES.climbSafeSteps).toBe(Math.round(1.7 * 60));
      expect(WORDS.climbOut[kind].length).toBeLessThanOrEqual(35);
    },
  );

  it('the dust off locks the controls for 0.4 s, then a held direction walks on', () => {
    const pit = firstOf(L1, 'small');
    const run = new Run(L1, { gentle: true });
    fallIn(run, pit);
    const x = run.hero.x;
    expect(run.dustOff).toBe(RULES.dustOffSteps);
    expect(RULES.dustOffSteps).toBe(24);
    run.steer(1);
    expect(run.press()).toBe(null);
    for (let i = 0; i < RULES.dustOffSteps - 1; i++) run.step(DT);
    expect(run.hero.x).toBe(x);
    run.step(DT);
    expect(run.dustOff).toBe(0);
    for (let i = 0; i < 30; i++) run.step(DT);
    expect(run.hero.x).toBeGreaterThan(x);
    expect(run.press()).not.toBe(null);
  });

  it('with reduced motion there is no dust off: the hero can go at once', () => {
    const run = new Run(L1, { gentle: true });
    run.still = true;
    fallIn(run, firstOf(L1, 'small'));
    expect(run.dustOff).toBe(0);
    expect(run.press()).not.toBe(null);
  });

  it('foods and hazards at or past the restart point come back; kobo taken stay taken', () => {
    const pit = firstOf(L1, 'wide');
    const run = new Run(L1, { gentle: true });
    const x = pit.a - 100;
    run.foods.forEach((f) => (f.taken = true));
    run.coins.forEach((c) => (c.taken = true));
    run.hazards.forEach((z) => (z.mode = 'gone'));
    fallIn(run, pit);
    for (const f of run.foods) expect(f.taken).toBe(f.x < x);
    for (const z of run.hazards) expect(z.mode === 'gone').toBe(z.x0 < x);
    expect(run.coins.every((c) => c.taken)).toBe(true);
  });

  it('game over still comes at 0 lives', () => {
    const run = new Run(L1, { gentle: true });
    const pit = firstOf(L1, 'small');
    const ev: RunEvent[] = [];
    for (let i = 0; i < 5; i++) ev.push(...fallIn(run, pit));
    expect(ev.filter((e) => e.type === 'climbOut')).toHaveLength(4);
    expect(ev.at(-1)).toEqual({ type: 'gameOver' });
    expect(run.lives).toBe(0);
    expect(run.phase).toBe('over');
  });

  it('Normal mode is unchanged: back at the start, or the bus stop once reached, with no safety and no climb-out', () => {
    const pit = firstOf(L1, 'wide');
    const run = new Run(L1);
    const ev = fallIn(run, pit);
    expect(ev.some((e) => e.type === 'climbOut')).toBe(false);
    expect(run.hero.x).toBe(L1.spawnX);
    expect(run.safe).toBe(0);
    expect(run.dustOff).toBe(0);
    const big = firstOf(L1, 'big');
    run.hero.x = L1.checkpoint + 1;
    run.step(DT);
    fallIn(run, big);
    expect(run.hero.x).toBe(L1.checkpoint);
  });

  it('the bus stop hint says "Halfway there" in Gentle mode, and is unchanged in Normal mode', () => {
    expect(GENTLE_HINTS['Bus stop! Now you start here.']).toBe('Bus stop! Halfway there.');
    for (const gentle of [false, true]) {
      const run = new Run(L1, { gentle });
      run.hero.x = L1.checkpoint + 1;
      const words = run.step(DT).filter((e) => e.type === 'hint').map((e) => (e as { words: string }).words);
      expect(words).toContain(gentle ? 'Bus stop! Halfway there.' : 'Bus stop! Now you start here.');
    }
  });

  it('the Game over offer: a street mentions climbing out, the hall keeps the short words', () => {
    expect(WORDS.gameOver.gentleOffer).toBe('Want more tries? Gentle mode gives you 5 lives, and you climb out of holes.');
    expect(WORDS.gameOver.hallGentleOffer).toBe('Want more tries? Gentle mode gives you 5 lives.');
    expect(WORDS.title.gentle).toBe('Gentle mode: 5 lives instead of 3');
  });
});
