/**
 * K4b (docs/kano.md 3.3, 3.6, 4.1): the dust whirl, fura da nono, sack steps, the secret well and
 * Dawanau's look from the Kano part.
 * - A whirl waits, then drifts left at 50 u/s (Gentle 40), 30 x 50. A jump clears it; landing on
 *   it bounces (vy -480) and it puffs apart; any other touch hurts, like a tyre. It never falls in
 *   a pit: it puffs apart at the lip. A puffing whirl touches no one.
 * - Fura da nono (12 s): a touch puffs it, no hurt and no kobo. Amala smashes it (+2), a fufu ball
 *   puffs it (+1). The garri shield takes a hit as for any hazard.
 * - Corn rules: no whirl in the first half of a corn's reach; on corn, a tap jump still clears one.
 * - Sacks are rocks under another look: one-way steps at their height.
 * - The secret well at 5150 (exit 5480) is before the bus stop, with no hint and no sign, behind
 *   the front stack of sacks.
 */
import { describe, expect, it, vi } from 'vitest';
import kano3 from '../../src/data/levels/kano-3.json';
import kanoWell from '../../src/data/levels/kano-well.json';
import { PHYSICS } from '../../src/engine/physics';
import { parseLevel, type Level } from '../../src/game/level';
import { HAZARD_BOX, RULES, STEPS_PER_SECOND, type HazardState, type RunEvent } from '../../src/game/run';
import { Run, KANO_RUN } from './kano-run';
import { pitsOf } from '../../src/game/pits';
import { parseRoom } from '../../src/game/well';
import type { SkinNow } from '../../src/game/skin';
import { KANO_WORDS as FIRST } from '../../src/screens/words';
import { KANO_WORDS } from '../../src/worlds/kano/words';

vi.mock('../../src/worlds/kano/whirl', async (orig) => {
  const m = await orig<typeof import('../../src/worlds/kano/whirl')>();
  return { ...m, drawDustWhirl: vi.fn() };
});
vi.mock('../../src/worlds/kano/sacks', async (orig) => {
  const m = await orig<typeof import('../../src/worlds/kano/sacks')>();
  return { ...m, drawSackSteps: vi.fn(), drawSackFront: vi.fn() };
});
vi.mock('../../src/worlds/kano/dawanau', async (orig) => {
  const m = await orig<typeof import('../../src/worlds/kano/dawanau')>();
  return { ...m, drawDawanauStall: vi.fn(), drawHeadSack: vi.fn() };
});
vi.mock('../../src/worlds/kano/cloth', async (orig) => {
  const m = await orig<typeof import('../../src/worlds/kano/cloth')>();
  return { ...m, drawClothFrame: vi.fn() };
});
const whirlArt = await import('../../src/worlds/kano/whirl');
const sacksArt = await import('../../src/worlds/kano/sacks');
const art = await import('../../src/worlds/kano/dawanau');
const cloth = await import('../../src/worlds/kano/cloth');
const { dawanauSkin, dawanauCast, DAWANAU_YARD } = await import('../../src/worlds/kano/dawanauStreet');
const { part } = await import('../../src/worlds/kano');

const DT = 1 / 60;
const GY = 300;
const DAWANAU = parseLevel(structuredClone(kano3));

/** A plain street: long flat road, the given hazards and patch, nothing else. */
function street(patch: Record<string, unknown> = {}): Level {
  return parseLevel({
    ...(structuredClone(kano3) as Record<string, unknown>),
    id: 'whirl-test',
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
const one = (x = 600, patch: Record<string, unknown> = {}) => street({ hazards: [['whirl', x]], ...patch });

function steps(run: Run, n: number): RunEvent[] {
  const out: RunEvent[] = [];
  for (let i = 0; i < n; i++) out.push(...run.step(DT));
  return out;
}

function standAt(run: Run, x: number): void {
  Object.assign(run.hero, { x, y: GY, prevY: GY, vy: 0, vx: 0, speed: 0, grounded: true, on: null, move: 0, runTime: 0 });
}

/** Steps until the whirl wakes (the hero stands still); returns it. */
function wake(run: Run): HazardState {
  const z = run.hazards[0]!;
  for (let i = 0; i < 600 && z.mode === 'wait'; i++) run.step(DT);
  expect(z.mode).toBe('move');
  return z;
}

/** Walks the hero into the whirl from 150 u back with the given power; the events on the way. */
function walkInto(patch: Partial<Run['power']> = {}, fufu = false): { run: Run; ev: RunEvent[] } {
  const run = new Run(one(600));
  standAt(run, 450);
  Object.assign(run.power, patch);
  if (fufu) {
    run.fufu = 3;
    run.throwFufu();
  } else run.steer(1);
  return { run, ev: steps(run, 240) };
}

describe('K4b: Dawanau as the game reads it (kano.md 3.6, 3.8)', () => {
  it('reads the whirls as whirls (50 u/s), the sacks as steps, fura on the road', () => {
    expect(DAWANAU.hazards.filter((z) => z.kind === 'whirl').map((z) => z.x)).toEqual([1500, 2200, 4300, 4600, 4900, 8100, 11000]);
    expect(DAWANAU.hazardSpeeds.whirl).toBe(50);
    expect(DAWANAU.foods).toContainEqual({ x: 3900, y: 272, kind: 'fura' });
    expect(DAWANAU.sacks).toEqual([
      { x: 2800, w: 100, h: 50 },
      { x: 2930, w: 100, h: 100 },
      { x: 3060, w: 100, h: 150 },
      { x: 6100, w: 100, h: 60 },
      { x: 6230, w: 100, h: 120 },
    ]);
    // Sacks are rocks under another look: one-way platforms at their height (no bounce).
    for (const k of DAWANAU.sacks) expect(DAWANAU.terrain.platforms).toContainEqual({ x: k.x, y: GY - k.h, w: k.w });
    expect(DAWANAU.rocks).toEqual([]);
  });

  it('the hit box is art\'s 30 x 50, the puff art\'s 0.45 s', () => {
    expect(HAZARD_BOX.whirl).toEqual({ halfW: whirlArt.WHIRL.w / 2, h: whirlArt.WHIRL.h });
    expect(KANO_RUN.whirlPuffSteps).toBe(Math.round(whirlArt.WHIRL.puffS * STEPS_PER_SECOND));
    expect(KANO_RUN.whirlSpeed).toBe(50);
    expect(KANO_RUN.whirlSpeedGentle).toBe(40);
    expect(RULES.furaSteps).toBe(12 * STEPS_PER_SECOND);
  });

  it('a bad sack stack is refused, as a bad rock is', () => {
    expect(() => street({ sacks: [[1000, 0, 50]] })).toThrow('sacks[0] should have a width and height above 0');
  });

  it('the secret well: before the bus stop, the groundnut store, no hint and no sign near it', () => {
    expect(DAWANAU.wells).toEqual([{ x: 5150, exitX: 5480, room: 'kano-well' }]);
    expect(DAWANAU.wells[0]!.exitX).toBeLessThan(DAWANAU.checkpoint);
    expect(parseRoom(kanoWell).id).toBe('kano-well');
    for (const h of DAWANAU.hints) expect(h.words).not.toMatch(/well/i);
    expect(DAWANAU.hints.every((h) => Math.abs(h.x - 5150) > 300 || h.x === DAWANAU.checkpoint)).toBe(true);
    // The front stack is wider than the well's mouth (S2.5's well is about 60 wide).
    expect(sacksArt.SACK_FRONT.w).toBeGreaterThan(60);
  });
});

describe('K4b: the dust whirl (kano.md 3.3)', () => {
  it('waits like any hazard, then drifts left at 50 u/s; Gentle: 40 u/s', () => {
    for (const [gentle, speed] of [[false, 50], [true, 40]] as const) {
      const run = new Run(one(600), { gentle });
      standAt(run, 80);
      const z = wake(run);
      const x0 = z.x;
      steps(run, STEPS_PER_SECOND);
      expect(x0 - z.x).toBeCloseTo(speed, 0);
      expect(z.y).toBe(GY);
    }
  });

  it('any other touch hurts, like a tyre: walking into it costs a life, and it does not puff', () => {
    const { run, ev } = walkInto();
    expect(ev.some((e) => e.type === 'hit')).toBe(true);
    expect(run.lives).toBe(RULES.lives - 1);
    expect(ev.some((e) => e.type === 'whirlPuff')).toBe(false);
  });

  it('landing on it bounces (vy -480) and it puffs apart: no life lost, gone after 0.45 s', () => {
    const run = new Run(one(600));
    standAt(run, 80);
    const z = wake(run);
    const top = z.y - HAZARD_BOX.whirl.h;
    Object.assign(run.hero, { x: z.x, y: top - 3, prevY: top - 6, vy: 200, grounded: false, on: null });
    const ev = steps(run, 1);
    expect(ev).toContainEqual(expect.objectContaining({ type: 'bounce', kind: 'whirl' }));
    expect(ev).toContainEqual({ type: 'whirlPuff', x: z.x, why: 'stomp' });
    expect(run.hero.vy).toBe(PHYSICS.bounceVy);
    expect(PHYSICS.bounceVy).toBe(-480);
    expect(run.hero.airJump).toBe(true);
    expect(z.mode).toBe('puff');
    expect(run.lives).toBe(RULES.lives);
    steps(run, KANO_RUN.whirlPuffSteps - 1);
    expect(z.mode).toBe('puff');
    steps(run, 1);
    expect(z.mode).toBe('gone');
  });

  it('a puffing whirl touches no one', () => {
    const run = new Run(one(600));
    standAt(run, 80);
    const z = wake(run);
    z.mode = 'puff';
    z.t = 0;
    standAt(run, z.x);
    const ev = steps(run, 10);
    expect(ev.some((e) => e.type === 'hit' || e.type === 'bounce')).toBe(false);
    expect(run.lives).toBe(RULES.lives);
  });

  it('dust never falls in a pit: it puffs apart at the lip', () => {
    const run = new Run(one(900, { ground: [[-400, 700], [740, 20000]] }));
    standAt(run, 80);
    const z = wake(run);
    let ev: RunEvent[] = [];
    for (let i = 0; i < 900 && z.mode === 'move'; i++) ev = run.step(DT);
    expect(z.mode).toBe('puff');
    expect(ev).toContainEqual(expect.objectContaining({ type: 'whirlPuff', why: 'pit' }));
    expect(z.x - HAZARD_BOX.whirl.halfW).toBeGreaterThanOrEqual(740 - 1);
    expect(z.y).toBe(GY);
  });

  it('a tap jump clears it from a run (a tap jump rises 74 u, more than its 50)', () => {
    // Up to speed first (the whirl far ahead); then the tap comes when it is d ahead.
    let cleared = 0;
    for (let d = 30; d <= 120; d += 10) {
      const run = new Run(one(2400));
      standAt(run, 400);
      run.steer(1);
      const z = run.hazards[0]!;
      let hit = false;
      let tapped = false;
      for (let i = 0; i < 2400 && run.hero.x < z.x + 40 && z.mode !== 'gone'; i++) {
        if (!tapped && z.mode === 'move' && z.x - run.hero.x <= d) {
          run.press();
          tapped = true;
        } else if (tapped) run.release();
        if (run.step(DT).some((e) => e.type === 'hit')) hit = true;
      }
      if (!hit && run.hero.x >= z.x) cleared++; // over it, or landed on it (a bounce)
    }
    expect(cleared).toBeGreaterThanOrEqual(5);
  });

  it('the garri shield takes the hit as for any hazard', () => {
    const { run, ev } = walkInto({ shield: true });
    expect(ev.some((e) => e.type === 'shieldPop')).toBe(true);
    expect(run.lives).toBe(RULES.lives);
  });

  it('amala smashes it (+2 kobo, no hurt) and it puffs apart', () => {
    const { run, ev } = walkInto({ amala: RULES.amalaSteps });
    expect(ev).toContainEqual(expect.objectContaining({ type: 'smash', kind: 'whirl' }));
    expect(ev).toContainEqual(expect.objectContaining({ type: 'whirlPuff', why: 'amala' }));
    expect(ev.some((e) => e.type === 'hit')).toBe(false);
    expect(run.kobo).toBe(RULES.smashKobo);
  });

  it('a fufu ball puffs it (+1 kobo, as every hazard)', () => {
    const { run, ev } = walkInto({}, true);
    expect(ev).toContainEqual(expect.objectContaining({ type: 'fufuKnock', kind: 'whirl' }));
    expect(ev).toContainEqual(expect.objectContaining({ type: 'whirlPuff', why: 'fufu' }));
    expect(run.kobo).toBe(1);
    expect(['puff', 'gone']).toContain(run.hazards[0]!.mode);
  });
});

describe('K4b: fura da nono (kano.md 4.1)', () => {
  it('picked up: 12 s of cool and calm, the "food" event, and its timer warns in its last 2 s then ends', () => {
    const run = new Run(street({ foods: [[500, 272, 'fura']] }));
    standAt(run, 450);
    run.steer(1);
    const ev = steps(run, 60);
    expect(ev).toContainEqual(expect.objectContaining({ type: 'food', kind: 'fura' }));
    expect(run.power.fura).toBeGreaterThan(RULES.furaSteps - 60);
    run.steer(0);
    const rest = steps(run, RULES.furaSteps);
    expect(rest).toContainEqual(expect.objectContaining({ type: 'wearingOff', kind: 'fura' }));
    expect(rest).toContainEqual({ type: 'powerEnd', kind: 'fura' });
    expect(run.power.fura).toBe(0);
  });

  it('a touch puffs the whirl apart: no hurt, no kobo, no bounce (as OG-R14)', () => {
    const { run, ev } = walkInto({ fura: RULES.furaSteps });
    expect(ev).toContainEqual(expect.objectContaining({ type: 'whirlPuff', why: 'fura' }));
    expect(ev.some((e) => e.type === 'hit' || e.type === 'smash' || e.type === 'bounce')).toBe(false);
    expect(run.lives).toBe(RULES.lives);
    expect(run.kobo).toBe(0);
  });

  it('once it ends, a whirl hurts again; it does nothing to a goat or a tyre', () => {
    expect(walkInto({ fura: 0 }).run.lives).toBe(RULES.lives - 1);
    for (const kind of ['tyre', 'goat']) {
      const run = new Run(street({ hazards: [[kind, 600]] }));
      standAt(run, 450);
      run.power.fura = RULES.furaSteps;
      run.steer(1);
      steps(run, 240);
      expect(run.lives, kind).toBe(RULES.lives - 1);
    }
  });

  it('a fall ends it, as every timed food', () => {
    const run = new Run(street({ ground: [[-400, 700], [900, 20000]] }));
    standAt(run, 650);
    run.power.fura = RULES.furaSteps;
    run.steer(1);
    let fell = false;
    for (let i = 0; i < 300 && !fell; i++) fell = run.step(DT).some((e) => e.type === 'fall');
    expect(fell).toBe(true);
    steps(run, 120);
    expect(run.power.fura).toBe(0);
  });

  it('on Dawanau the three whirls after the fura are met inside its 12 s at walking speed', () => {
    const fura = DAWANAU.foods.find((f) => f.kind === 'fura')!;
    const after = DAWANAU.hazards.filter((z) => z.kind === 'whirl' && z.x > fura.x && z.x < fura.x + 1200);
    expect(after.map((z) => z.x)).toEqual([4300, 4600, 4900]);
    // The whirls drift towards the hero too, so they are met sooner than this.
    for (const z of after) expect((z.x - fura.x) / DAWANAU.walkSpeed).toBeLessThan(RULES.furaSteps / STEPS_PER_SECOND);
  });
});

describe('K4b: whirls and corn (S2.2 hazard rule 3, kano.md 3.3)', () => {
  const corns = [...DAWANAU.foods.filter((f) => f.kind === 'corn').map((f) => f.x), ...DAWANAU.crates.filter((c) => c.contents === 'corn').map((c) => c.x)];
  const reach = (RULES.cornSteps / STEPS_PER_SECOND) * DAWANAU.cornSpeed;
  const whirls = DAWANAU.hazards.filter((z) => z.kind === 'whirl');

  it('no whirl in a corn\'s fast stretch (the first half of its reach); the corn whirl is in the second half', () => {
    expect(corns).toEqual([9300]);
    for (const c of corns) for (const z of whirls) expect(z.x >= c && z.x <= c + reach / 2, `whirl at ${z.x}, corn at ${c}`).toBe(false);
    expect(whirls.filter((z) => z.x > corns[0]! + reach / 2 && z.x <= corns[0]! + reach).map((z) => z.x)).toEqual([11000]);
  });

  it('every whirl is 200 u or more from a pit, as a tyre', () => {
    const pits = pitsOf(DAWANAU.ground);
    for (const z of whirls) for (const p of pits) expect(z.x < p.a - 200 || z.x > p.b + 200, `whirl at ${z.x}, pit at ${p.a}`).toBe(true);
  });

  it('on corn, at corn speed, a tap jump still clears a whirl', () => {
    let cleared = 0;
    for (let d = 40; d <= 140; d += 10) {
      const run = new Run(one(2400));
      standAt(run, 400);
      run.power.corn = RULES.cornSteps;
      run.steer(1);
      const z = run.hazards[0]!;
      let hit = false;
      let tapped = false;
      for (let i = 0; i < 2400 && run.hero.x < z.x + 40 && z.mode !== 'gone'; i++) {
        if (!tapped && z.mode === 'move' && z.x - run.hero.x <= d) {
          run.press();
          tapped = true;
        } else if (tapped) run.release();
        if (run.step(DT).some((e) => e.type === 'hit')) hit = true;
      }
      expect(run.hero.speed).toBeGreaterThan(DAWANAU.runSpeed);
      if (!hit && run.hero.x >= z.x) cleared++; // over it, or landed on it (a bounce)
    }
    expect(cleared).toBeGreaterThanOrEqual(5);
  });
});

/** A canvas stand-in that takes every call. */
const G = new Proxy({}, { get: () => () => G }) as unknown as CanvasRenderingContext2D;

function now(patch: Partial<SkinNow> = {}, run = new Run(DAWANAU)): SkinNow {
  return { level: DAWANAU, run, camX: 0, viewW: 560, L: -60, R: 620, H: 420, clock: 0, still: false, fixed: false, people: null, stride: 0, look: {} as SkinNow['look'], ...patch };
}

describe('K4b: Dawanau\'s look from the Kano part', () => {
  it('kano-3 gets its look, tune and cast; the part adds the whirl\'s fff and pff', () => {
    const skin = part.street!(DAWANAU)!;
    expect(skin.tune).toBe(art.DAWANAU_TUNE);
    expect(skin.cast?.looks).toBe(art.DAWANAU_CAST);
    expect(part.sounds).toHaveProperty('whirlFff');
    expect(part.sounds).toHaveProperty('whirlPuff');
    expect(part.levels['kano-3']).toBeDefined();
  });

  it('roofs: a sack stack draws as sacks at its height, the cloth frame as cloth, the mat roof as a grain shade', () => {
    const skin = dawanauSkin(DAWANAU);
    const steps = vi.mocked(sacksArt.drawSackSteps);
    const frame = vi.mocked(cloth.drawClothFrame);
    const roof = vi.mocked(art.drawDawanauStall);
    skin.stall!(G, 3060, GY - 150, 100, GY);
    expect(steps).toHaveBeenLastCalledWith(expect.anything(), 3060, 100, 150, GY);
    skin.stall!(G, 9700, GY - 30, 100, GY);
    expect(frame).toHaveBeenLastCalledWith(expect.anything(), 9700, 100, GY, { dip: 0 });
    skin.stall!(G, 9850, 150, 120, GY);
    expect(roof).toHaveBeenLastCalledWith(expect.anything(), 9850, 150, 120, GY);
    expect(steps).toHaveBeenCalledTimes(1);
  });

  it('a whirl draws spinning, then puffing apart with art\'s puff; other hazards are the game\'s', () => {
    const skin = dawanauSkin(DAWANAU);
    const draw = vi.mocked(whirlArt.drawDustWhirl);
    const run = new Run(DAWANAU);
    const z = run.hazards.find((q) => q.kind === 'whirl')!;
    expect(skin.hazard!(G, z, now({ clock: 2 }, run))).toBe(true);
    expect(draw).toHaveBeenLastCalledWith(expect.anything(), z.x, GY, 2, { still: false, seed: z.x0 * 0.37 });
    z.mode = 'puff';
    z.t = 9;
    skin.hazard!(G, z, now({ clock: 2 }, run));
    expect(draw).toHaveBeenLastCalledWith(expect.anything(), z.x, GY, 2, { still: false, seed: z.x0 * 0.37, puff: whirlArt.whirlPuffK(9 / 60) });
    draw.mockClear();
    z.t = KANO_RUN.whirlPuffSteps;
    skin.hazard!(G, z, now({}, run));
    expect(draw).not.toHaveBeenCalled();
    const goat = run.hazards.find((q) => q.kind === 'goat')!;
    expect(skin.hazard!(G, goat, now({}, run))).toBe(false);
  });

  it('the soft "fff" only while a whirl is on screen, every 0.5 s at most', () => {
    const skin = dawanauSkin(DAWANAU);
    const run = new Run(DAWANAU);
    const at = (clock: number, camX: number) => skin.sound!(now({ clock, camX, viewW: 560 }, run));
    expect(at(0, 0)).toBeNull(); // the first whirl (1500) is off screen
    expect(at(1, 1100)).toBe('whirlFff');
    expect(at(1.2, 1100)).toBeNull();
    expect(at(1.5, 1100)).toBe('whirlFff');
    run.hazards.find((q) => q.x0 === 1500)!.mode = 'gone';
    expect(at(2.5, 1100)).toBeNull();
  });

  it('the front stack of sacks stands before the secret well, seen through while the hero is behind it', () => {
    const skin = dawanauSkin(DAWANAU);
    const front = vi.mocked(sacksArt.drawSackFront);
    const run = new Run(DAWANAU);
    front.mockClear();
    skin.front!(G, now({ L: 0, R: 600 }, run));
    expect(front).not.toHaveBeenCalled();
    run.hero.x = 4900;
    skin.front!(G, now({ L: 4800, R: 5400 }, run));
    expect(front).toHaveBeenLastCalledWith(expect.anything(), 5150, GY, 1);
    run.hero.x = 5170;
    skin.front!(G, now({ L: 4900, R: 5500 }, run));
    expect(front).toHaveBeenLastCalledWith(expect.anything(), 5150, GY, 0.5);
  });

  it('the people: measurers at their sacks, the oil seller, the driver, the family, the bus stop; 120 u or more from the wells', () => {
    const cast = dawanauCast();
    const ex = cast.extras!;
    expect(ex[0]).toEqual({ x: DAWANAU_YARD.grain[0]![0] + art.GRAIN_SPOT.trader, look: art.DAWANAU_MEASURERS[0] });
    expect(ex[1]).toMatchObject({ look: art.DAWANAU_MEASURERS[1], stool: true });
    for (const look of [art.DAWANAU_OIL_SELLER, art.DAWANAU_DRIVER, ...art.DAWANAU_FAMILY, ...art.DAWANAU_BUS_STOP]) expect(ex.some((e) => e.look === look)).toBe(true);
    for (const e of ex) for (const w of DAWANAU.wells) for (const x of [w.x, w.exitX]) expect(Math.abs(e.x - x), `${e.x} by the well at ${x}`).toBeGreaterThanOrEqual(120);
    expect(art.DAWANAU_TRADERS.map((k) => cast.callOf?.(art.DAWANAU_TRADER_LOOKS[k]))).toEqual(KANO_WORDS.folk.traders.dawanau);
    expect(cast.keeper?.words).toBe('For Borehole Hall. Safe trip!');
  });

  it('a sack on each porter\'s head, over the person drawn; nobody else gets one', () => {
    const skin = dawanauSkin(DAWANAU);
    const sack = vi.mocked(art.drawHeadSack);
    sack.mockClear();
    const looks = [art.DAWANAU_PORTERS[0], art.DAWANAU_CAST[0]!];
    const people = { drawn: [{ look: 0, frame: 'walk1', x: 100, y: 292, flip: false, size: 1 }, { look: 1, frame: 'stand', x: 200, y: 292, flip: false, size: 1 }], lookOf: (i: number) => looks[i] } as unknown as SkinNow['people'];
    skin.ground!(G, now({ people }));
    expect(sack).toHaveBeenCalledTimes(1);
    expect(sack).toHaveBeenCalledWith(expect.anything(), 0, 0, 'adult', -0.6);
  });

  it('fura draws on the road and in the HUD; the store is Kano\'s', () => {
    const skin = dawanauSkin(DAWANAU);
    expect(skin.food!(G, 'fura', 0, 0, 0)).toBe(true);
    expect(skin.icon!(G, 'fura', 0, 0, 1)).toBe(true);
    expect(skin.food!(G, 'fufu', 0, 0, 0)).toBe(false);
    expect(skin.room!(G, parseRoom(kanoWell), 0, 560, 0, 420, false)).toBe(true);
    expect(skin.gift!(G, 280, 181, 0)).toBe(true);
  });

  it('fura\'s words and Dawanau\'s button ride in the Kano part, never the first load', () => {
    expect(KANO_WORDS.toast.fura).toBe("Fura da nono! Dust can't stop you for 12 seconds.");
    expect(KANO_WORDS.toast.furaWearingOff).toBe('Fura is wearing off!');
    expect(KANO_WORDS.hud.fura(7)).toBe('Fura 7');
    expect(KANO_WORDS.place.plays).toEqual(KANO_WORDS.streets.map((n) => `Play ${n}`));
    expect(Object.keys(FIRST)).not.toContain('street');
  });
});
