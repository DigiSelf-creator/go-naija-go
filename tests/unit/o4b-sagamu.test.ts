/**
 * O4b: Sagamu (Ogun street 3), the rules (Run) and the look's hookups (docs/ogun.md 3.3, 3.6, 3.7,
 * 3.8, 4.1).
 * - Hopping gravel: wakes like any hazard, hops left at 70 u/s, 40 u high every 0.7 s (0.35 s on
 *   the road, 0.35 s in the air), "tk" as it lands, drops into potholes. A tap jump clears it;
 *   landing on it bounces (vy -480) and it crumbles; amala smashes it; with ikokore a touch
 *   crumbles it, no hurt; fufu knocks it off the road; any other touch hurts.
 * - Two roads: the flyover deck and its steps are plain one-way platforms; either road reaches
 *   the bus stop; the look finds the deck and its steps and draws the low road under it.
 * - Sagamu's place button, its Cleared words, the save under states.ogun.streets.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ogun3 from '../../src/data/levels/ogun-3.json';
import ogunWell from '../../src/data/levels/ogun-well.json';
import { PHYSICS } from '../../src/engine/physics';
import { parseLevel, type Level } from '../../src/game/level';
import { HAZARD_BOX, RULES, Run, STEPS_PER_SECOND, type HazardState, type RunEvent } from '../../src/game/run';
import type { SkinNow } from '../../src/game/skin';
import { parseRoom } from '../../src/game/well';
import { OGUN_WORDS } from '../../src/screens/words';
import * as art from '../../src/worlds/ogun/sagamu';
import { flyoversOf, sagamuSkin, SAGAMU_LOOK } from '../../src/worlds/ogun/sagamuStreet';
import { ogunStreet } from '../../src/worlds/ogun/otaStreet';
import { OGUN_CITY_WORDS } from '../../src/worlds/ogun/cityWords';

vi.mock('../../src/worlds/ogun/sagamu', async (orig) => {
  const real = await orig<typeof import('../../src/worlds/ogun/sagamu')>();
  // No drawing in the tests: each piece is a spy that records what it was asked to draw.
  return {
    ...real,
    drawSagamuBackdrop: vi.fn(),
    drawSagamuStall: vi.fn(),
    drawSagamuTraderStall: vi.fn(),
    drawFlyoverDeck: vi.fn(),
    drawFlyoverStep: vi.fn(),
    drawLowRoad: vi.fn(),
    drawGravel: vi.fn(),
    drawGravelDust: vi.fn(),
    drawGravelCrumble: vi.fn(),
    drawGravelKnocked: vi.fn(),
  };
});

const DT = 1 / 60;
const GY = 300;
const SAG = parseLevel(structuredClone(ogun3));
const ROOM = parseRoom(structuredClone(ogunWell));

/** A plain street: long flat road, the given hazards and patch, nothing else. */
function street(patch: Record<string, unknown> = {}): Level {
  return parseLevel({
    ...(structuredClone(ogun3) as Record<string, unknown>),
    id: 'gravel-test',
    ground: [[-400, 20000]],
    platforms: [],
    mud: [],
    cracks: [],
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

function steps(run: Run, n: number): RunEvent[] {
  const out: RunEvent[] = [];
  for (let i = 0; i < n; i++) out.push(...run.step(DT));
  return out;
}

function standAt(run: Run, x: number): void {
  Object.assign(run.hero, { x, y: GY, prevY: GY, vy: 0, vx: 0, speed: 0, grounded: true, on: null, move: 0, runTime: 0 });
}

/** Steps until the gravel wakes (the hero stands still); returns the gravel. */
function wake(run: Run): HazardState {
  const z = run.hazards[0]!;
  for (let i = 0; i < 600 && z.mode === 'wait'; i++) run.step(DT);
  expect(z.mode).toBe('move');
  return z;
}

describe('the level file reads hopping gravel and the two roads (ogun.md 3.6, 3.8)', () => {
  it('Sagamu: six gravel at the file x, gravel speed 70, two goats and two tyres', () => {
    const gravel = SAG.hazards.filter((z) => z.kind === 'gravel').map((z) => z.x);
    expect(gravel).toEqual([1500, 2100, 4450, 6600, 10400, 11500]);
    expect(SAG.hazards).toHaveLength(10);
    expect(SAG.hazardSpeeds.gravel).toBe(70);
    expect(HAZARD_BOX.gravel).toEqual({ halfW: 9, h: 16 });
  });

  it('a file without a gravel speed moves its gravel at 70 u/s (ogun.md 3.3)', () => {
    const raw = structuredClone(ogun3) as { hazardSpeeds: Record<string, number> };
    delete raw.hazardSpeeds['gravel'];
    const L = street({ hazardSpeeds: raw.hazardSpeeds, hazards: [['gravel', 600]] });
    expect(L.hazardSpeeds.gravel).toBeUndefined();
    const run = new Run(L);
    standAt(run, 80);
    const z = wake(run);
    expect(z.vx).toBe(-RULES.gravelSpeed);
  });

  it('the flyover is found from the platforms: the deck 140 high from 4000 to 4900, steps up 60 and 120, down 100 and 50', () => {
    const [f, ...more] = flyoversOf(SAG);
    expect(more).toEqual([]);
    expect(f!.deck).toEqual({ x: 4000, y: 160, w: 900 });
    expect(f!.steps.map((p) => [p.x, GY - p.y])).toEqual([
      [3800, 60],
      [3900, 120],
      [4950, 100],
      [5050, 50],
    ]);
    // The kola shade roofs are not part of it.
    expect(SAG.terrain.platforms).toHaveLength(7);
  });

  it('each step is at most 60 u above the one before (a walking jump climbs it), and the deck has no gaps', () => {
    const f = flyoversOf(SAG)[0]!;
    const up = f.steps.filter((p) => p.x < f.deck.x);
    let h = 0;
    for (const p of [...up, f.deck]) {
      expect(GY - p.y - h).toBeLessThanOrEqual(60);
      h = GY - p.y;
    }
    // One platform from 4000 to 4900: nowhere on top to fall through.
    expect(SAG.terrain.platforms.filter((p) => p.y === 160)).toEqual([{ x: 4000, y: 160, w: 900 }]);
  });

  it('the deck holds the kobo line and the pepper fufu; the low road has the mud, a gravel and the secret well', () => {
    const f = flyoversOf(SAG)[0]!;
    const onDeck = (x: number) => x >= f.deck.x && x <= f.deck.x + f.deck.w;
    expect(SAG.foods.find((q) => q.kind === 'fufu')).toEqual({ x: 4600, y: 132, kind: 'fufu' });
    expect(SAG.coins.filter((c) => onDeck(c.x) && c.y < f.deck.y).length).toBeGreaterThanOrEqual(14);
    expect(SAG.mud.some((m) => onDeck(m.x))).toBe(true);
    expect(SAG.hazards.some((z) => z.kind === 'gravel' && onDeck(z.x))).toBe(true);
    expect(SAG.wells).toEqual([{ x: 4700, exitX: 5300, room: 'ogun-well' }]);
    expect(onDeck(SAG.wells[0]!.x)).toBe(true);
    expect(ROOM.id).toBe('ogun-well');
  });
});

describe('hopping gravel (ogun.md 3.3)', () => {
  const one = (x = 600, patch: Record<string, unknown> = {}) => street({ hazards: [['gravel', x]], ...patch });

  it('waits like any hazard, then hops left at 70 u/s', () => {
    const run = new Run(one(9000));
    standAt(run, 80);
    run.viewRight = 880; // a phone's view ahead
    const z = run.hazards[0]!;
    steps(run, 30);
    expect(z.mode).toBe('wait');
    expect(z.x).toBe(9000);
    run.hero.x = 9000 - SAG.wakeDistance;
    run.viewLeft = run.hero.x - 200;
    run.viewRight = run.hero.x + 600;
    steps(run, 1);
    expect(z.mode).toBe('move');
    const x0 = z.x;
    steps(run, STEPS_PER_SECOND);
    expect(x0 - z.x).toBeCloseTo(70, 0);
  });

  it('hops 40 u high every 0.7 s: 0.35 s on the road, then 0.35 s in the air, a "tk" each landing', () => {
    const run = new Run(one(600));
    standAt(run, 80);
    const z = wake(run);
    const ys: number[] = [];
    const ev: RunEvent[] = [];
    for (let i = 0; i < RULES.gravelPeriodSteps * 5; i++) {
      ev.push(...run.step(DT));
      ys.push(GY - z.y);
    }
    const P = RULES.gravelPeriodSteps;
    expect(P).toBe(42);
    expect(RULES.gravelAirSteps).toBe(21);
    // The first half of each period on the road, the second in an arc that tops out at 40.
    for (let i = 0; i < ys.length; i++) {
      const p = (i + 1 + (run.hazards[0]!.t - ys.length)) % P;
      if (p <= P - RULES.gravelAirSteps) expect(ys[i]).toBe(0);
      else expect(ys[i]).toBeGreaterThan(0);
    }
    expect(Math.max(...ys)).toBeGreaterThan(39);
    expect(Math.max(...ys)).toBeLessThanOrEqual(40);
    expect(ev.filter((e) => e.type === 'gravelHop')).toHaveLength(5);
  });

  it('the run and the art agree on the hop (art gravelHop at the same time gives the same height)', () => {
    const run = new Run(one(600));
    standAt(run, 80);
    const z = wake(run);
    for (let i = 0; i < 84; i++) {
      run.step(DT);
      expect(GY - z.y).toBeCloseTo(art.gravelHop(z.t / STEPS_PER_SECOND).lift, 6);
    }
    expect(art.GRAVEL).toMatchObject({ speed: RULES.gravelSpeed, hop: RULES.gravelHop, period: 0.7, air: 0.35 });
  });

  it('drops into a pothole as it lands over it, and is gone', () => {
    const run = new Run(one(900, { ground: [[-400, 700], [740, 20000]] }));
    standAt(run, 80);
    const z = wake(run);
    for (let i = 0; i < 600 && z.mode === 'move'; i++) run.step(DT);
    expect(z.mode).toBe('falling');
    expect(z.x).toBeGreaterThan(700 - 1);
    expect(z.x).toBeLessThan(740 + 1);
    steps(run, 60);
    expect(z.mode).toBe('gone');
  });

  it('any other touch hurts: walking into it costs a life', () => {
    const run = new Run(one(600));
    standAt(run, 450);
    run.steer(1);
    const ev = steps(run, 240);
    expect(ev.some((e) => e.type === 'hit')).toBe(true);
    expect(run.lives).toBe(RULES.lives - 1);
    expect(ev.some((e) => e.type === 'crumble')).toBe(false);
  });

  it('landing on it bounces (vy -480) and it crumbles into dust: no life lost', () => {
    const run = new Run(one(600));
    standAt(run, 80);
    const z = wake(run);
    // Wait for it to sit on the road, then drop the hero onto it from just above.
    while (z.y !== GY || z.t % RULES.gravelPeriodSteps > 4) run.step(DT);
    const top = z.y - HAZARD_BOX.gravel.h;
    Object.assign(run.hero, { x: z.x, y: top - 3, prevY: top - 6, vy: 200, grounded: false, on: null });
    const ev = steps(run, 1);
    expect(ev).toContainEqual(expect.objectContaining({ type: 'bounce', kind: 'gravel' }));
    expect(ev).toContainEqual(expect.objectContaining({ type: 'crumble' }));
    expect(run.hero.vy).toBeLessThan(0);
    expect(PHYSICS.bounceVy).toBe(-480);
    expect(z.mode).toBe('gone');
    expect(run.lives).toBe(RULES.lives);
  });

  it('landing on it while it rises still bounces (its stomp check is a little kinder)', () => {
    const run = new Run(one(600));
    standAt(run, 80);
    const z = wake(run);
    // Just after take-off: it is rising about 7 u a step.
    while (z.t % RULES.gravelPeriodSteps !== RULES.gravelAirSteps + 2) run.step(DT);
    const top = z.y - HAZARD_BOX.gravel.h;
    Object.assign(run.hero, { x: z.x, y: top + 2, prevY: top + 10, vy: 120, grounded: false, on: null });
    const ev = steps(run, 1);
    expect(ev.some((e) => e.type === 'hit')).toBe(false);
    expect(ev).toContainEqual(expect.objectContaining({ type: 'crumble' }));
  });

  it('amala smashes it (+2 kobo, no hurt)', () => {
    const run = new Run(one(600));
    standAt(run, 450);
    run.power.amala = RULES.amalaSteps;
    run.steer(1);
    const ev = steps(run, 240);
    expect(ev).toContainEqual(expect.objectContaining({ type: 'smash', kind: 'gravel' }));
    expect(ev).toContainEqual(expect.objectContaining({ type: 'crumble' }));
    expect(ev.some((e) => e.type === 'hit')).toBe(false);
    expect(run.kobo).toBe(RULES.smashKobo);
  });

  it('ikokore: touching it crumbles it, no hurt and no kobo', () => {
    const run = new Run(one(600));
    standAt(run, 450);
    run.power.ikokore = RULES.ikokoreSteps;
    run.steer(1);
    const ev = steps(run, 240);
    expect(ev).toContainEqual(expect.objectContaining({ type: 'crumble' }));
    expect(ev.some((e) => e.type === 'hit' || e.type === 'smash' || e.type === 'bounce')).toBe(false);
    expect(run.lives).toBe(RULES.lives);
    expect(run.kobo).toBe(0);
    expect(run.hazards[0]!.mode).toBe('gone');
  });

  it('the garri shield takes the hit as for any hazard', () => {
    const run = new Run(one(600));
    standAt(run, 450);
    run.power.shield = true;
    run.steer(1);
    const ev = steps(run, 240);
    expect(ev.some((e) => e.type === 'shieldPop')).toBe(true);
    expect(run.lives).toBe(RULES.lives);
  });

  it('fufu knocks it off the road (+1 kobo, no crumble)', () => {
    const run = new Run(one(900, { foods: [[300, 272, 'fufu']] }));
    standAt(run, 250);
    run.steer(1);
    steps(run, 60);
    run.steer(0);
    expect(run.fufu).toBeGreaterThan(0);
    steps(run, 30);
    run.throwFufu();
    const ev = steps(run, 240);
    expect(ev).toContainEqual(expect.objectContaining({ type: 'fufuKnock', kind: 'gravel' }));
    expect(ev.some((e) => e.type === 'crumble' || e.type === 'hit')).toBe(false);
    expect(run.hazards[0]!.mode).not.toBe('move');
  });

  it('a tap jump clears it, whatever its hop, from a run (ogun.md 3.3: "a tap clears it")', () => {
    // The hero runs at it from far back; the tap comes when the gravel is `d` ahead. For every
    // starting hop phase, some take-off point in a wide band clears it with no hurt.
    for (let phase = 0; phase < RULES.gravelPeriodSteps; phase += 6) {
      let cleared = 0;
      for (let d = 40; d <= 120; d += 10) {
        const run = new Run(one(1400));
        standAt(run, 400);
        run.steer(1);
        const z = run.hazards[0]!;
        // Run until it wakes, then shift its clock to this phase.
        for (let i = 0; i < 600 && z.mode === 'wait'; i++) run.step(DT);
        z.t += phase;
        let hit = false;
        let tapped = false;
        for (let i = 0; i < 900 && run.hero.x < z.x + 60 && z.mode === 'move'; i++) {
          if (!tapped && z.x - run.hero.x <= d) {
            run.press();
            tapped = true;
          } else if (tapped) run.release();
          if (run.step(DT).some((e) => e.type === 'hit')) hit = true;
        }
        if (!hit && run.hero.x >= z.x) cleared++;
      }
      expect(cleared, `phase ${phase}`).toBeGreaterThanOrEqual(3);
    }
  });

  it('comes back after a fall when it was past the bus stop restart point (like every hazard)', () => {
    const run = new Run(one(1500, { ground: [[-400, 1000], [1200, 20000]] }));
    standAt(run, 900);
    run.steer(1);
    const z = run.hazards[0]!;
    let fell = false;
    for (let i = 0; i < 300 && !fell; i++) fell = run.step(DT).some((e) => e.type === 'fall');
    expect(fell).toBe(true);
    expect(z.mode).not.toBe('wait');
    // Back at the start: it sits again where the file put it, asleep.
    for (let i = 0; i < 300 && run.hazards[0]!.mode !== 'wait'; i++) run.step(DT);
    expect(run.hazards[0]).toMatchObject({ kind: 'gravel', x: 1500, y: GY, mode: 'wait' });
  });
});

describe('two roads: either one reaches the bus stop (ogun.md 3.3)', () => {
  /** Holds right with an auto jumper, stopping at x or a lost life. */
  function ride(run: Run, to: number, high: boolean): RunEvent[] {
    run.steer(1);
    const out: RunEvent[] = [];
    for (let i = 0; i < 3000 && run.hero.x < to; i++) {
      const h = run.hero;
      // On the high road: jump at each step's foot. On the low road: walk under.
      if (high && h.grounded && [3770, 3870, 3970].some((x) => h.x >= x && h.x < x + 8)) run.press();
      else run.release();
      const ev = run.step(DT);
      out.push(...ev);
      if (ev.some((e) => e.type === 'hit' || e.type === 'fall')) break;
    }
    return out;
  }
  const quiet = () => street({ platforms: (ogun3 as { platforms: number[][] }).platforms, ground: [[-400, 20000]] });

  it('the high road: up the steps, along the deck, down the steps to the road', () => {
    const run = new Run(quiet());
    standAt(run, 3600);
    let top = Infinity;
    run.steer(1);
    for (let i = 0; i < 3000 && run.hero.x < 5300; i++) {
      const h = run.hero;
      if (h.grounded && h.on === null && h.x >= 3740 && h.x < 3760) run.press();
      else if (h.grounded && h.on !== null && h.y > 170 && h.x > 3820 && h.x < 3990) run.press();
      else run.release();
      run.step(DT);
      if (h.x > 4100 && h.x < 4800) top = Math.min(top, h.y);
    }
    expect(top).toBe(160);
    expect(run.hero.x).toBeGreaterThanOrEqual(5300);
    expect(run.hero.y).toBe(GY);
  });

  it('the low road: walk straight under the deck to the bus stop side', () => {
    const run = new Run(quiet());
    standAt(run, 3600);
    const ev = ride(run, 5300, false);
    expect(ev.some((e) => e.type === 'hit' || e.type === 'fall')).toBe(false);
    expect(run.hero.x).toBeGreaterThanOrEqual(5300);
  });
});

describe("Sagamu's look (skin.ts hookups from art)", () => {
  const g = new Proxy({} as Record<string, unknown>, { get: () => () => undefined, set: () => true }) as unknown as CanvasRenderingContext2D;
  beforeEach(() => vi.clearAllMocks());
  const now = (run: Run, L: number, R: number, patch: Partial<SkinNow> = {}): SkinNow =>
    ({ level: run.level, run, camX: L, viewW: R - L, L, R, H: 420, clock: 1, still: false, fixed: false, people: null, stride: 0, ...patch }) as SkinNow;

  it('Sagamu has its own look, cast, keeper and every drawing part', () => {
    const k = ogunStreet(SAG)!;
    expect(k.cast?.name).toBe('sagamu');
    expect(k.cast?.looks).toBe(art.SAGAMU_CAST);
    expect(k.cast?.keeper?.words).toBe(OGUN_WORDS.folk.storeKeeper);
    for (const part of ['backdrop', 'back', 'ground', 'stall', 'hazard', 'food', 'crate', 'icon', 'front', 'hear', 'restart', 'room', 'gift', 'parcelIcon'] as const) expect(typeof k[part]).toBe('function');
    art.SAGAMU_TRADERS.forEach((t, i) => expect(k.cast!.callOf!(art.SAGAMU_TRADER_LOOKS[t])).toBe(OGUN_WORDS.folk.traders.sagamu[i]));
  });

  it('the deck draws as the flyover deck, its steps as steps, the other roofs as kola shades', () => {
    const k = sagamuSkin();
    const run = new Run(SAG);
    k.ground!(g, now(run, 3600, 5400));
    for (const p of SAG.terrain.platforms) k.stall!(g, p.x, p.y, p.w, GY);
    expect(vi.mocked(art.drawFlyoverDeck).mock.calls.map((c) => c.slice(1))).toEqual([[4000, 160, 900]]);
    expect(vi.mocked(art.drawFlyoverStep).mock.calls.map((c) => c.slice(1, 4))).toEqual([
      [3800, 240, 100],
      [3900, 180, 100],
      [4950, 200, 100],
      [5050, 250, 100],
    ]);
    expect(vi.mocked(art.drawSagamuStall).mock.calls.map((c) => c[1])).toEqual([8940, 9540]);
    // The low road under the deck: once, the deck's ends and top.
    expect(vi.mocked(art.drawLowRoad).mock.calls.map((c) => c.slice(1, 5))).toEqual([[4000, 4900, 160, GY]]);
  });

  it('the low road is not drawn when the deck is off screen', () => {
    const k = sagamuSkin();
    const run = new Run(SAG);
    k.ground!(g, now(run, 6000, 7000));
    expect(art.drawLowRoad).not.toHaveBeenCalled();
  });

  it('gravel draws in its hop frame at the run\'s height; knocked flips away; other hazards are the game\'s', () => {
    const k = sagamuSkin();
    const run = new Run(street({ hazards: [['gravel', 600], ['goat', 900]] }));
    const s = now(run, 0, 1000);
    const [z, goat] = run.hazards as [HazardState, HazardState];
    Object.assign(z, { mode: 'move', t: 30, y: GY - 20 });
    expect(k.hazard!(g, z, s)).toBe(true);
    expect(vi.mocked(art.drawGravel).mock.calls[0]!.slice(1)).toEqual([600, GY - 20, art.gravelHop(0.5).frame, GY, 600]);
    expect(k.hazard!(g, goat, s)).toBe(false);
    Object.assign(z, { mode: 'knocked', t: 12 });
    k.hazard!(g, z, s);
    expect(vi.mocked(art.drawGravelKnocked).mock.calls[0]!.slice(1)).toEqual([600, GY - 20, 0.5]);
    // Reduced motion: it sits (its height still the run's).
    vi.clearAllMocks();
    Object.assign(z, { mode: 'move', t: 30, y: GY });
    k.hazard!(g, z, now(run, 0, 1000, { still: true }));
    expect(vi.mocked(art.drawGravel).mock.calls[0]![3]).toBe('sit');
  });

  it('a dust puff at each landing and a crumble cloud, then gone; none under reduced motion; restart clears', () => {
    const k = sagamuSkin();
    const run = new Run(SAG);
    const s = now(run, 0, 3000);
    k.hear!([{ type: 'gravelHop', x: 1400 }, { type: 'crumble', x: 1500, y: GY }], s);
    k.front!(g, now(run, 0, 3000, { clock: 1.1 }));
    expect(vi.mocked(art.drawGravelDust).mock.calls[0]!.slice(1, 3)).toEqual([1400, GY]);
    expect(vi.mocked(art.drawGravelCrumble).mock.calls[0]!.slice(1, 3)).toEqual([1500, GY]);
    vi.clearAllMocks();
    k.front!(g, now(run, 0, 3000, { still: true }));
    expect(art.drawGravelDust).not.toHaveBeenCalled();
    // Past their time they are dropped.
    k.hear!([], now(run, 0, 3000, { clock: 1 + SAGAMU_LOOK.crumble + 0.01 }));
    k.front!(g, now(run, 0, 3000, { clock: 1.5 }));
    expect(art.drawGravelDust).not.toHaveBeenCalled();
    expect(art.drawGravelCrumble).not.toHaveBeenCalled();
    k.hear!([{ type: 'gravelHop', x: 1400 }], s);
    k.restart!();
    k.front!(g, s);
    expect(art.drawGravelDust).not.toHaveBeenCalled();
  });

  it('never keeps more than a handful of puffs', () => {
    const k = sagamuSkin();
    const run = new Run(SAG);
    const s = now(run, 0, 3000);
    k.hear!(Array.from({ length: 30 }, (_, i) => ({ type: 'gravelHop' as const, x: 100 + i })), s);
    k.front!(g, s);
    expect(vi.mocked(art.drawGravelDust).mock.calls.length).toBe(SAGAMU_LOOK.puffs);
  });
});

describe("Sagamu's words and place", () => {
  it('the city\'s Bad road card says "Run Sagamu" once Abeokuta is done (OG-R35/R37: the place screen is retired), and plain lines', () => {
    expect(OGUN_CITY_WORDS.badRoad.run(3)).toBe('Run Sagamu');
    expect(OGUN_CITY_WORDS.badRoad.run(2)).toBe('Run Abeokuta');
    expect(OGUN_CITY_WORDS.badRoad.clear).toBe('Clear Ota, Abeokuta and Sagamu to reach Pothole Hall.');
    expect(OGUN_CITY_WORDS.road.sagamuLines[1]).toBe('Sagamu is moving again.');
    expect(OGUN_WORDS.streets[2]).toBe('Sagamu');
    // Every hint fits the hint bar (35 characters or fewer) and matches the file word for word.
    expect(SAG.hints.map((h) => h.words)).toEqual(OGUN_WORDS.hints.sagamu);
    for (const h of SAG.hints) expect(h.words.length).toBeLessThanOrEqual(35);
  });
});
