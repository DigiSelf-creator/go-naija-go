/**
 * K2b: wind and kilishi on Kano's streets (docs/kano.md 3.3, 3.4, 3.8 and 4.1), the rules only (Run).
 * - Wind behind you: in the air, your speed forward covers a quarter more, so you jump farther.
 * - Wind in your face: a quarter less (Gentle mode: an eighth). The ground is not changed.
 * - Kilishi: a headwind does nothing for 12 s; a tailwind still helps. It warns, ticks and ends.
 * - The level parser reads `wind`, `gate` and the "kilishi" food; the gate's welcome shows once.
 * - Fair rules on every Kano street: no wide or big pit inside a headwind or 160 u after one,
 *   even with a running jump in Gentle mode the headwind only takes an eighth.
 * - The first load's Kano street words match the Kano part's own.
 */
import { describe, expect, it } from 'vitest';
import kano1 from '../../src/data/levels/kano-1.json';
import kano2 from '../../src/data/levels/kano-2.json';
import kano3 from '../../src/data/levels/kano-3.json';
import ogun1 from '../../src/data/levels/ogun-1.json';
import lagos1 from '../../src/data/levels/lagos-1.json';
import { PHYSICS } from '../../src/engine/physics';
import { LevelError, parseLevel, type Level } from '../../src/game/level';
import { RULES, Run, STEPS_PER_SECOND, type RunEvent } from '../../src/game/run';
import { KANO_WORDS as FIRST } from '../../src/screens/words';
import { KANO_WORDS } from '../../src/worlds/kano/words';
import { formatMoney } from '../../src/game/money';
import { playableKano } from './kano-level-data';

const DT = 1 / 60;

/** A plain Kano street: long road, the given wind and foods, no hazards. */
function street(patch: Record<string, unknown> = {}): Level {
  const base = playableKano(structuredClone(kano1)) as Record<string, unknown>;
  return parseLevel({
    ...base,
    id: 'wind-test',
    ground: [[-400, 20000]],
    platforms: [],
    wind: [],
    kobo: [],
    foods: [],
    crates: [],
    hazards: [],
    hints: [],
    checkpoint: 15000,
    end: { x: 19000, wall: 19200 },
    ...patch,
  });
}

function steps(run: Run, n: number): RunEvent[] {
  const out: RunEvent[] = [];
  for (let i = 0; i < n; i++) out.push(...run.step(DT));
  return out;
}

/** Holds forward to full run speed, then from x = 1000 a tap jump; how far it went in the air. */
function jumpFrom(run: Run, at = 1000): { far: number; landSpeed: number } {
  run.steer(1);
  for (let i = 0; i < 4000 && run.hero.x < at; i++) run.step(DT);
  expect(run.hero.speed).toBe(run.level.runSpeed);
  const x0 = run.hero.x;
  run.press('t');
  run.release('t');
  for (let i = 0; i < 400; i++) {
    run.step(DT);
    if (run.hero.grounded) break;
  }
  expect(run.hero.grounded).toBe(true);
  return { far: run.hero.x - x0, landSpeed: run.hero.speed };
}

/** The wind stretch over the whole jump (900 to 1700). */
const over = (dir: 'back' | 'face'): Record<string, unknown> => ({ wind: [[900, 800, dir]] });

describe('kano.md 3.8: the level file fields', () => {
  it('reads Kurmi\'s wind stretches, its gate and its kilishi', () => {
    const L = parseLevel(kano1);
    expect(L.wind).toEqual([
      { x: 2200, w: 800, dir: 'back' },
      { x: 3600, w: 600, dir: 'face' },
      { x: 6800, w: 800, dir: 'face' },
      { x: 10000, w: 600, dir: 'back' },
    ]);
    expect(L.gate).toBe(200);
    expect(L.foods.filter((f) => f.kind === 'kilishi').map((f) => f.x)).toEqual([6600]);
  });

  it('Lagos and Ogun streets have no wind and no gate', () => {
    for (const raw of [lagos1, ogun1]) {
      const L = parseLevel(raw);
      expect([L.wind, L.gate]).toEqual([[], null]);
    }
  });

  it('a wrong wind is a clear message', () => {
    expect(() => street({ wind: [[900, 800, 'up']] })).toThrow(LevelError);
    expect(() => street({ wind: [[900, 800, 'up']] })).toThrow(/wind\[0\]\[2\] should be one of back, face/);
    expect(() => street({ wind: [[900, 0, 'back']] })).toThrow(/wind\[0\]\[1\] should be above 0/);
    expect(() => street({ wind: [[900, 'x', 'back']] })).toThrow(/wind\[0\]\[1\] should be a number/);
    expect(() => street({ gate: 'x' })).toThrow(/gate should be a number/);
  });
});

describe('kano.md 3.3: wind in the air', () => {
  const still = jumpFrom(new Run(street()));

  it('a running tap jump with no wind lands where physics says', () => {
    const air = (2 * -PHYSICS.jumpVy) / PHYSICS.gravity;
    expect(still.far).toBeGreaterThan(street().runSpeed * air - 6);
    expect(still.far).toBeLessThan(street().runSpeed * air + 6);
  });

  it('wind behind you: a quarter farther', () => {
    const r = jumpFrom(new Run(street(over('back'))));
    expect(r.far / still.far).toBeCloseTo(1 + RULES.tailwind, 1);
    expect(RULES.tailwind).toBe(0.25);
  });

  it('wind in your face: a quarter shorter', () => {
    const r = jumpFrom(new Run(street(over('face'))));
    expect(r.far / still.far).toBeCloseTo(1 - RULES.headwind, 1);
    expect(RULES.headwind).toBe(0.25);
  });

  it('Gentle mode: a headwind takes away only an eighth; a tailwind still gives a quarter', () => {
    expect(RULES.headwindGentle).toBe(0.125);
    const face = jumpFrom(new Run(street(over('face')), { gentle: true }));
    expect(face.far / still.far).toBeCloseTo(1 - 0.125, 1);
    const back = jumpFrom(new Run(street(over('back')), { gentle: true }));
    expect(back.far / still.far).toBeCloseTo(1.25, 1);
  });

  it('the speed is kept: you land at the same speed as without wind', () => {
    for (const dir of ['back', 'face'] as const) expect(jumpFrom(new Run(street(over(dir)))).landSpeed).toBe(still.landSpeed);
  });

  it('walking and running on the ground are not changed', () => {
    for (const dir of ['back', 'face'] as const) {
      const run = new Run(street(over(dir)));
      run.steer(1);
      for (let i = 0; i < 4000 && run.hero.x < 1000; i++) run.step(DT);
      const x0 = run.hero.x;
      steps(run, 60);
      expect(run.hero.grounded).toBe(true);
      expect(run.hero.x - x0).toBeCloseTo(run.level.runSpeed, 0);
    }
  });

  it('going back (left) in the air is not changed', () => {
    const run = new Run(street(over('back')));
    expect(run.windFactor(1000)).toBe(1.25);
    run.hero.x = 1200;
    run.steer(-1);
    steps(run, 90);
    const x0 = run.hero.x;
    run.press('t');
    run.release('t');
    steps(run, 20);
    const inAir = x0 - run.hero.x;
    const plain = new Run(street());
    plain.hero.x = 1200;
    plain.steer(-1);
    steps(plain, 90);
    const p0 = plain.hero.x;
    plain.press('t');
    plain.release('t');
    steps(plain, 20);
    expect(inAir).toBeCloseTo(p0 - plain.hero.x, 6);
  });

  it('only inside a stretch: outside it the air is still', () => {
    const run = new Run(street({ wind: [[2000, 400, 'face']] }));
    expect([run.windFactor(1999), run.windFactor(2000), run.windFactor(2400), run.windFactor(2401)]).toEqual([1, 0.75, 0.75, 1]);
    expect(jumpFrom(run).far).toBeCloseTo(still.far, 6);
  });
});

describe('kano.md 4.1: kilishi', () => {
  const still = jumpFrom(new Run(street()));
  const withKilishi = (patch: Record<string, unknown>, gentle = false): Run => {
    const run = new Run(street({ foods: [[300, 272, 'kilishi']], ...patch }), { gentle });
    return run;
  };

  it('is picked up from the road: 12 s of strong legs', () => {
    const run = withKilishi({});
    run.steer(1);
    let ev: RunEvent[] = [];
    for (let i = 0; i < 400 && run.power.kilishi === 0; i++) ev = run.step(DT);
    expect(ev).toContainEqual({ type: 'food', kind: 'kilishi', x: 300, y: 272 });
    expect(run.power.kilishi).toBe(RULES.kilishiSteps);
    expect(RULES.kilishiSteps).toBe(12 * STEPS_PER_SECOND);
  });

  it('a headwind does nothing while it works (Normal and Gentle)', () => {
    for (const gentle of [false, true]) expect(jumpFrom(withKilishi(over('face'), gentle)).far).toBeCloseTo(still.far, 6);
  });

  it('a tailwind still helps', () => {
    expect(jumpFrom(withKilishi(over('back'))).far / still.far).toBeCloseTo(1.25, 1);
  });

  it('warns 2 s before the end, ticks, ends; then the headwind holds you back again', () => {
    const run = withKilishi(over('face'));
    run.steer(1);
    for (let i = 0; i < 400 && run.power.kilishi === 0; i++) run.step(DT);
    const ev = steps(run, RULES.kilishiSteps);
    expect(ev.filter((e) => e.type === 'wearingOff')).toEqual([{ type: 'wearingOff', kind: 'kilishi' }]);
    expect(ev.filter((e) => e.type === 'tick')).toHaveLength(2);
    expect(ev).toContainEqual({ type: 'powerEnd', kind: 'kilishi' });
    expect(run.power.kilishi).toBe(0);
    expect(run.windFactor(1000)).toBe(0.75);
  });

  it('a fall ends it, like every food', () => {
    const run = withKilishi({});
    run.power.kilishi = 100;
    run.fall([]);
    expect(run.power.kilishi).toBe(0);
  });
});

describe('kano.md 3.3 and 3.4: the whoosh and the gate', () => {
  it('a whoosh as the hero comes into a wind stretch, and every 0.9 s while in it; none outside', () => {
    const run = new Run(street({ wind: [[400, 400, 'back']] }));
    run.steer(1);
    const at: number[] = [];
    for (let i = 0; i < 2000 && run.hero.x < 1100; i++) if (run.step(DT).some((e) => e.type === 'whoosh')) at.push(run.hero.x);
    expect(at.length).toBeGreaterThanOrEqual(2);
    expect(at[0]).toBeGreaterThanOrEqual(400);
    expect(at[0]).toBeLessThan(410);
    for (const x of at) expect(x >= 400 && x <= 800).toBe(true);
    expect(RULES.whooshSteps).toBe(Math.round(0.9 * STEPS_PER_SECOND));
  });

  it('through the gate, "Welcome to Kano!" once a play', () => {
    const run = new Run(parseLevel(kano1));
    run.steer(1);
    const ev: RunEvent[] = [];
    for (let i = 0; i < 2000 && run.hero.x < 700; i++) ev.push(...run.step(DT));
    expect(ev.filter((e) => e.type === 'gate')).toHaveLength(1);
    expect(FIRST.street.gate).toBe(KANO_WORDS.toast.gate);
  });

  it('Lagos streets: no whoosh, no gate', () => {
    const run = new Run(parseLevel(lagos1));
    run.steer(1);
    const ev: RunEvent[] = [];
    for (let i = 0; i < 3000 && run.hero.x < 900; i++) ev.push(...run.step(DT));
    expect(ev.some((e) => e.type === 'whoosh' || e.type === 'gate')).toBe(false);
    expect(run.hero.wind).toBe(1);
  });
});

describe('kano.md 3.3 fair rules on every Kano street (as parsed by the game)', () => {
  for (const raw of [kano1, kano2, kano3]) {
    const L = parseLevel(playableKano(raw));
    const pits = L.ground.slice(1).map((s, i) => ({ a: L.ground[i]![1], b: s[0], w: s[0] - L.ground[i]![1] }));

    it(`${L.id}: no wide or big pit inside a headwind or within 160 u after one ends`, () => {
      for (const s of L.wind.filter((q) => q.dir === 'face')) {
        for (const p of pits.filter((q) => q.w >= 90)) expect(p.b <= s.x || p.a >= s.x + s.w + 160, `pit at ${p.a}, headwind at ${s.x}`).toBe(true);
      }
    });

    it(`${L.id}: every pit in a headwind is still cleared by a held running jump with the headwind (Normal)`, () => {
      // A held ground jump stays up longer (hold gravity while rising); a quarter off still clears a hold pit.
      const up = -PHYSICS.jumpVy / PHYSICS.holdGravity;
      const rise = (PHYSICS.jumpVy * PHYSICS.jumpVy) / (2 * PHYSICS.holdGravity);
      const down = Math.sqrt((2 * rise) / PHYSICS.gravity);
      const far = L.runSpeed * (up + down) * (1 - RULES.headwind);
      for (const s of L.wind.filter((q) => q.dir === 'face')) {
        for (const p of pits.filter((q) => q.a < s.x + s.w + 160 && q.b > s.x)) expect(far, `pit at ${p.a}`).toBeGreaterThan(p.w + 2 * RULES.heroHalfW);
      }
    });

    it(`${L.id}: the first wind is behind you`, () => {
      if (L.wind.length > 0) expect(L.wind[0]!.dir).toBe('back');
    });
  }
});

describe('first-load words for a Kano street match the Kano part', () => {
  it('kilishi toast, wearing off and HUD chip; game over; the home line', () => {
    expect(FIRST.street.kilishi).toBe(KANO_WORDS.toast.kilishi);
    expect(FIRST.street.kilishiWearingOff).toBe(KANO_WORDS.toast.kilishiWearingOff);
    expect(FIRST.street.hud(12)).toBe(KANO_WORDS.hud.kilishi(12));
    expect(FIRST.street.gameOver(1500)).toBe(KANO_WORDS.gameOver.text(formatMoney(1500)));
  });
});

describe('K2b: Kurmi\'s look from the Kano part', async () => {
  const { kanoStreet, kurmiCast } = await import('../../src/worlds/kano/kurmiStreet');
  const { KURMI_TUNE, KURMI_TRADER_LOOKS, KURMI_CAST } = await import('../../src/worlds/kano/kurmi');

  it('kano-1 gets Kurmi\'s look and tune; K3b: kano-2 its own (Kofar Mata\'s); Dawanau none yet', () => {
    const skin = kanoStreet(parseLevel(kano1));
    expect(skin?.tune).toBe(KURMI_TUNE);
    expect(skin?.cast?.looks).toBe(KURMI_CAST);
    expect(kanoStreet(parseLevel(playableKano(kano2)))?.tune?.name).toBe('kano-kofar-mata');
    expect(kanoStreet(parseLevel(playableKano(kano3)))).toBeNull();
  });

  it('its three traders stand at their stalls and call their own lines; the welcome by the gate', () => {
    const cast = kurmiCast(200);
    const traders = KURMI_CAST.filter((l) => cast.isTrader?.(l));
    expect(traders).toEqual([KURMI_TRADER_LOOKS.leather, KURMI_TRADER_LOOKS.sandals, KURMI_TRADER_LOOKS.kosai]);
    expect(traders.map((l) => cast.callOf?.(l))).toEqual(['Fine leather!', 'New sandals!', 'Hot kosai!']);
    expect(cast.welcome).toEqual({ to: 600, lines: KANO_WORDS.folk.welcome });
  });

  it('draws kilishi on the road and in the HUD, and leaves every other food to the game', () => {
    const skin = kanoStreet(parseLevel(kano1))!;
    const g = new Proxy({}, { get: () => () => undefined }) as unknown as CanvasRenderingContext2D;
    expect(skin.food?.(g, 'corn', 0, 0, 0)).toBe(false);
    expect(skin.icon?.(g, 'amala', 0, 0, 1)).toBe(false);
    expect(skin.food?.(g, 'kilishi', 0, 0, 0)).toBe(true);
    expect(skin.icon?.(g, 'kilishi', 0, 0, 1)).toBe(true);
  });
});
