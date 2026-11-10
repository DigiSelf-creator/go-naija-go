/**
 * J2: hanging crates (docs/design.md S2.4). Only a head hit from below opens one; the side and
 * the top never do (amala aside); a kobo crate gives 3 kobo once; a food crate pops its food,
 * which drops to the road and acts like any food; an open crate stays open and empty; after a
 * lost life food crates past the restart point fill up again and kobo crates stay open.
 */
import { describe, expect, it } from 'vitest';
import lagos1 from '../../src/data/levels/lagos-1.json';
import lagos2 from '../../src/data/levels/lagos-2.json';
import lagos3 from '../../src/data/levels/lagos-3.json';
import { CRATE_RULES, freshCrates, headHit, stepCrates, type CrateState } from '../../src/game/crates';
import { FEATURES } from '../../src/game/features';
import { parseLevel, type Level } from '../../src/game/level';
import { RULES, Run, type RunEvent } from '../../src/game/run';
import { createWalker, PHYSICS } from '../../src/engine/physics';

const DT = 1 / 60;
const L1 = parseLevel(structuredClone(lagos1));

/** Street 1 with only the crates (no hazards, no other foods), so nothing else gets in the way. */
function quietLevel(crates: Level['crates'] = L1.crates): Level {
  return { ...L1, hazards: [], foods: [], coins: [], hints: [], crates };
}

function stepRun(run: Run, n: number, until?: (ev: RunEvent[]) => boolean): RunEvent[] {
  const all: RunEvent[] = [];
  for (let i = 0; i < n; i++) {
    const ev = run.step(DT);
    all.push(...ev);
    if (until?.(ev)) break;
  }
  return all;
}

const crateAt = (run: Run, x: number): CrateState => run.crates.find((c) => c.x === x)!;

/** A hero standing still at x on the road, then a tap jump straight up. */
function jumpUnder(x: number, crates?: Level['crates']): { run: Run; ev: RunEvent[] } {
  const run = new Run(quietLevel(crates));
  Object.assign(run.hero, { x, y: L1.groundY, prevY: L1.groundY });
  run.press('test');
  run.release('test');
  const ev = stepRun(run, 60, (e) => e.some((q) => q.type === 'crate' || q.type === 'crateEmpty'));
  return { run, ev };
}

describe('crates are on (J2)', () => {
  it('the switch is on and street 1 has its four crates, garri in the one at 6500', () => {
    expect(FEATURES.crates).toBe(true);
    const run = new Run(L1);
    expect(run.crates.map((c) => [c.x, c.bottomY, c.contents])).toEqual([
      [2000, 204, 'kobo'],
      [2150, 204, 'kobo'],
      [6500, 204, 'garri'],
      [7670, 149, 'kobo'],
    ]);
    expect(run.crates.every((c) => !c.open && c.food === null)).toBe(true);
    // Garri on street 1 comes only out of the crate.
    expect(L1.foods.some((f) => f.kind === 'garri')).toBe(false);
  });
});

describe('hit from below (S2.4 hit rule)', () => {
  it('a tap jump under a road crate opens it: the head stops at its bottom, vy +60, 3 kobo', () => {
    const { run, ev } = jumpUnder(2000);
    const c = crateAt(run, 2000);
    expect(ev.filter((e) => e.type === 'crate')).toEqual([{ type: 'crate', contents: 'kobo', x: 2000, y: 176 }]);
    expect(c.open).toBe(true);
    expect(run.kobo).toBe(CRATE_RULES.kobo);
    expect(run.hero.y - RULES.heroH).toBe(c.bottomY); // the head stopped at the bottom edge
    expect(run.hero.vy).toBe(60);
    expect(run.hero.holding).toBe(false);
    expect(c.knock).toBe('hit');
  });

  it('the second jump is still there after the hit, and the hold for higher ends', () => {
    const run = new Run(quietLevel());
    Object.assign(run.hero, { x: 2000 });
    run.press('thumb'); // held: the hold for higher is on
    expect(run.hero.holding).toBe(true);
    stepRun(run, 60, (e) => e.some((q) => q.type === 'crate'));
    expect(run.hero.holding).toBe(false);
    expect(run.hero.airJump).toBe(true);
    // Still held: the hold does not come back on the way down.
    run.step(DT);
    expect(run.hero.holding).toBe(false);
    expect(run.press('other')).toBe('air');
  });

  it('a second jump used before the hit stays used', () => {
    const run = new Run(quietLevel());
    Object.assign(run.hero, { x: 2000 });
    run.press('t');
    run.release('t');
    stepRun(run, 2);
    expect(run.press('t')).toBe('air');
    run.release('t');
    stepRun(run, 60, (e) => e.some((q) => q.type === 'crate'));
    expect(crateAt(run, 2000).open).toBe(true);
    expect(run.hero.airJump).toBe(false);
  });

  it('corner forgiveness: centre within 16 + 4 of the crate centre opens it, 21 away does not', () => {
    for (const dx of [-20, -16, 0, 16, 20]) expect(crateAt(jumpUnder(2000 + dx).run, 2000).open, `dx ${dx}`).toBe(true);
    for (const dx of [-21, 21, -30]) {
      const { run, ev } = jumpUnder(2000 + dx);
      expect(crateAt(run, 2000).open, `dx ${dx}`).toBe(false);
      expect(ev.some((e) => e.type === 'crate')).toBe(false);
      expect(run.kobo).toBe(0);
    }
  });

  it('a standing hero is 52 u under a road crate; a tap jump reaches 18 u past the bottom', () => {
    const c = L1.crates[0]!;
    expect(c.bottomY - (L1.groundY - RULES.heroH)).toBe(-52);
    // Peak of a tap jump with no crate: head at 186.
    const b = createWalker(0, L1.terrain);
    b.vy = PHYSICS.jumpVy;
    b.grounded = false;
    let top = b.y;
    for (let i = 0; i < 60 && b.vy <= 0; i++) {
      b.vy = Math.min(b.vy + PHYSICS.gravity * DT, PHYSICS.maxFallVy);
      b.y += b.vy * DT;
      top = Math.min(top, b.y);
    }
    expect(Math.round(top - RULES.heroH)).toBeLessThanOrEqual(c.bottomY - 18 + 1);
  });

  it('two crates in reach: the one whose centre is nearest the hero opens', () => {
    const two = [
      { x: 2000, bottomY: 204, contents: 'kobo' as const },
      { x: 2030, bottomY: 204, contents: 'garri' as const },
    ];
    const { run } = jumpUnder(2018, two);
    expect(crateAt(run, 2030).open).toBe(true);
    expect(crateAt(run, 2000).open).toBe(false);
    expect(run.kobo).toBe(0);
  });

  it('headHit needs rising, and the head crossing the bottom this step', () => {
    const crates = freshCrates([{ x: 100, bottomY: 204, contents: 'kobo' }]);
    const h = 44;
    expect(headHit(crates, { x: 100, prevY: 249, y: 247, vy: -100 }, h)).toBe(crates[0]); // 205 -> 203
    expect(headHit(crates, { x: 100, prevY: 248, y: 247, vy: -100 }, h)).toBe(crates[0]); // at the bottom -> above
    expect(headHit(crates, { x: 100, prevY: 249, y: 248, vy: -100 }, h)).toBeNull(); // 205 -> 204: not above yet
    expect(headHit(crates, { x: 100, prevY: 247, y: 245, vy: -100 }, h)).toBeNull(); // already inside
    expect(headHit(crates, { x: 100, prevY: 249, y: 247, vy: 0 }, h)).toBeNull(); // not rising
    expect(headHit(crates, { x: 100, prevY: 249, y: 247, vy: 50 }, h)).toBeNull();
  });
});

describe('the side and the top are not solid', () => {
  it('jumping into the side at head height: no opening, the hero passes in front, a brush swing', () => {
    const run = new Run(quietLevel());
    const c = crateAt(run, 2000);
    // In the air beside the crate, at the top of a jump, moving right into it.
    Object.assign(run.hero, { x: 1975, y: 225, prevY: 225, vy: 0, vx: 156, grounded: false, airTop: 156, airDir: 1, move: 1 });
    const ev = stepRun(run, 20);
    expect(ev.some((e) => e.type === 'crate' || e.type === 'crateEmpty')).toBe(false);
    expect(c.open).toBe(false);
    expect(run.kobo).toBe(0);
    expect(run.hero.x).toBeGreaterThan(2000 + 16); // passed in front, never stopped
    expect(c.knock).toBe('brush');
    expect(c.knockStep).not.toBeNull();
    expect(c.dir).toBe(1);
  });

  it('landing on top: falls straight through, never stands on it, does not open it', () => {
    const run = new Run(quietLevel());
    const c = crateAt(run, 2000);
    Object.assign(run.hero, { x: 2000, y: 160, prevY: 160, vy: 200, grounded: false });
    const ys: number[] = [];
    let grounded = 0;
    for (let i = 0; i < 40; i++) {
      run.step(DT);
      ys.push(run.hero.y);
      if (run.hero.grounded && run.hero.y < L1.groundY) grounded++;
    }
    expect(grounded).toBe(0);
    expect(run.hero.y).toBe(L1.groundY); // on the road
    expect(c.open).toBe(false);
    expect(run.kobo).toBe(0);
    expect(c.knock).toBe('brush'); // it swung a little as the hero passed
  });

  it('a brush swings once per touch, not every step', () => {
    const run = new Run(quietLevel());
    const c = crateAt(run, 2000);
    Object.assign(run.hero, { x: 1990, y: 225, prevY: 225, vy: 0, grounded: false });
    run.step(DT);
    const first = c.knockStep;
    expect(first).not.toBeNull();
    run.step(DT);
    run.step(DT);
    expect(c.knockStep).toBe(first);
  });

  it('amala opens a full crate from any side', () => {
    const run = new Run(quietLevel());
    run.power.amala = RULES.amalaSteps;
    const c = crateAt(run, 2000);
    Object.assign(run.hero, { x: 1975, y: 225, prevY: 225, vy: 0, vx: 156, grounded: false, airTop: 156, airDir: 1, move: 1 });
    const ev = stepRun(run, 20);
    expect(ev.filter((e) => e.type === 'crate')).toHaveLength(1);
    expect(c.open).toBe(true);
    expect(run.kobo).toBe(3);
    // From above too.
    Object.assign(run.hero, { x: 2150, y: 160, prevY: 160, vy: 200, grounded: false, vx: 0 });
    stepRun(run, 20);
    expect(crateAt(run, 2150).open).toBe(true);
    expect(run.kobo).toBe(6);
  });
});

describe('contents', () => {
  it('a kobo crate counts 3 kobo at once', () => {
    const { run, ev } = jumpUnder(2150);
    expect(run.kobo).toBe(3);
    expect(ev.filter((e) => e.type === 'kobo')).toEqual([]); // not three single pickups
  });

  it('the garri crate pops its food 24 u up, drops at 90 u/s to y 272 straight down, and it shields like garri', () => {
    expect(crateAt(jumpUnder(6460).run, 6500).open).toBe(false); // 40 u aside: out of reach
    const r2 = jumpUnder(6500).run;
    const c = crateAt(r2, 6500);
    expect(c.open).toBe(true);
    expect(c.food).not.toBeNull();
    // Walk the hero away so the food is not taken on the way down.
    Object.assign(r2.hero, { x: 6300, y: L1.groundY, prevY: L1.groundY, vy: 0, grounded: true });
    const ys: number[] = [];
    for (let i = 0; i < 120; i++) {
      r2.step(DT);
      ys.push(c.food!.y);
    }
    expect(Math.min(...ys)).toBeCloseTo(176 - 24, 0);
    expect(c.food!.landed).toBe(true);
    expect(c.food!.y).toBe(272);
    expect(c.food!.x).toBe(6500);
    expect(c.food!.taken).toBe(false);
    expect(r2.power.shield).toBe(false);
    // It waits there; walking into it takes it like any garri.
    Object.assign(r2.hero, { x: 6495 });
    const ev = r2.step(DT);
    expect(ev).toContainEqual({ type: 'food', kind: 'garri', x: 6500, y: 272 });
    expect(r2.power.shield).toBe(true);
    expect(c.food!.taken).toBe(true);
  });

  it('standing under the garri crate, the food drops onto the hero and is taken', () => {
    const { run } = jumpUnder(6500);
    const ev = stepRun(run, 120, (e) => e.some((q) => q.type === 'food'));
    expect(ev.filter((e) => e.type === 'food')).toEqual([{ type: 'food', kind: 'garri', x: 6500, y: expect.any(Number) as number }]);
    expect(run.power.shield).toBe(true);
  });

  it('a roof crate food rests 28 u above the roof', () => {
    const roofCrate = [{ x: 7670, bottomY: 149, contents: 'corn' as const }];
    const run = new Run(quietLevel(roofCrate));
    const c = run.crates[0]!;
    // On the roof under it, jump.
    Object.assign(run.hero, { x: 7670, y: 245, prevY: 245, vy: 0, grounded: true });
    run.press('t');
    run.release('t');
    stepRun(run, 60, (e) => e.some((q) => q.type === 'crate'));
    expect(c.open).toBe(true);
    Object.assign(run.hero, { x: 7500, y: L1.groundY, prevY: L1.groundY, vy: 0, grounded: true });
    stepRun(run, 120);
    expect(c.food!.y).toBe(245 - 28);
  });
});

describe('empty state and no double-dip', () => {
  it('an open crate stays open; hitting it again gives a tok and a small swing, nothing else', () => {
    const { run } = jumpUnder(2000);
    expect(run.kobo).toBe(3);
    stepRun(run, 90); // land
    expect(run.hero.grounded).toBe(true);
    for (let k = 0; k < 3; k++) {
      run.press('t');
      run.release('t');
      const ev = stepRun(run, 60, (e) => e.some((q) => q.type === 'crateEmpty'));
      expect(ev.filter((e) => e.type === 'crateEmpty')).toHaveLength(1);
      expect(ev.some((e) => e.type === 'crate')).toBe(false);
      expect(run.hero.vy).toBe(60); // still stops the head
      expect(crateAt(run, 2000).knock).toBe('brush');
      stepRun(run, 90);
    }
    expect(run.kobo).toBe(3);
    expect(crateAt(run, 2000).open).toBe(true);
  });

  it('one jump opens one crate once, even held high and pressed again in the air', () => {
    const run = new Run(quietLevel());
    Object.assign(run.hero, { x: 2000 });
    run.press('t');
    const ev = stepRun(run, 8);
    run.press('u'); // second jump straight up into it again
    ev.push(...stepRun(run, 60));
    expect(ev.filter((e) => e.type === 'crate')).toHaveLength(1);
    expect(ev.filter((e) => e.type === 'crateEmpty')).toHaveLength(1);
    expect(run.kobo).toBe(3);
  });

  it('a food crate gives its food once: a second knock gives nothing and the taken food never comes back', () => {
    const { run } = jumpUnder(6500);
    stepRun(run, 120);
    expect(run.power.shield).toBe(true);
    run.power.shield = false;
    run.press('t');
    run.release('t');
    const ev = stepRun(run, 120);
    expect(ev.filter((e) => e.type === 'crateEmpty')).toHaveLength(1);
    expect(ev.some((e) => e.type === 'food' || e.type === 'crate')).toBe(false);
    expect(run.power.shield).toBe(false);
  });

  it('stepCrates on its own: an open crate hit from below is a crateEmpty, no kobo', () => {
    const crates = freshCrates([{ x: 100, bottomY: 204, contents: 'kobo' }]);
    crates[0]!.open = true;
    const hero = createWalker(100, L1.terrain);
    Object.assign(hero, { prevY: 249, y: 247, vy: -300, grounded: false });
    const out = stepCrates(crates, { hero, heroBox: { l: 93, r: 107, t: 203, b: 247 }, heroH: 44, amala: true, steps: 10, dt: DT });
    expect(out.kobo).toBe(0);
    expect(out.events).toEqual([{ type: 'crateEmpty', x: 100, y: 204 }]);
    expect(hero.y).toBe(248);
    expect(hero.vy).toBe(60);
  });
});

describe('after a lost life', () => {
  it('kobo crates stay open and counted; food crates past the restart point fill up again', () => {
    const run = new Run(quietLevel());
    // Open the first kobo crate and the garri crate (left untaken), then fall into a pit.
    for (const x of [2000, 6500]) {
      Object.assign(run.hero, { x, y: L1.groundY, prevY: L1.groundY, vy: 0, vx: 0, grounded: true });
      run.press('t');
      run.release('t');
      stepRun(run, 60, (e) => e.some((q) => q.type === 'crate'));
      Object.assign(run.hero, { x: x - 150, y: L1.groundY, prevY: L1.groundY, vy: 0, grounded: true });
      stepRun(run, 2);
    }
    expect(run.kobo).toBe(3);
    expect(crateAt(run, 6500).food).not.toBeNull();
    run.checkpointReached = true;
    run.spawnX = L1.checkpoint; // 4400: the garri crate is past it, the kobo crate is not
    Object.assign(run.hero, { x: 2465, y: L1.groundY + 1, prevY: L1.groundY, vy: 300, grounded: false });
    const ev = stepRun(run, 60, (e) => e.some((q) => q.type === 'fall'));
    expect(ev.some((e) => e.type === 'fall')).toBe(true);
    expect(run.lives).toBe(2);
    expect(run.kobo).toBe(3);
    expect(crateAt(run, 2000).open).toBe(true);
    const g = crateAt(run, 6500);
    expect(g.open).toBe(false);
    expect(g.food).toBeNull();
    // It opens again and gives its garri again.
    Object.assign(run.hero, { x: 6500, y: L1.groundY, prevY: L1.groundY, vy: 0, grounded: true });
    run.press('t');
    run.release('t');
    const again = stepRun(run, 120, (e) => e.some((q) => q.type === 'food'));
    expect(again.filter((e) => e.type === 'crate')).toEqual([{ type: 'crate', contents: 'garri', x: 6500, y: 176 }]);
    expect(run.power.shield).toBe(true);
  });

  it('a food crate before the restart point stays open', () => {
    const run = new Run(quietLevel());
    Object.assign(run.hero, { x: 6500 });
    run.press('t');
    run.release('t');
    stepRun(run, 60, (e) => e.some((q) => q.type === 'crate'));
    run.spawnX = 7000;
    Object.assign(run.hero, { x: 7820, y: L1.groundY + 1, prevY: L1.groundY, vy: 300, grounded: false });
    stepRun(run, 60, (e) => e.some((q) => q.type === 'fall'));
    expect(crateAt(run, 6500).open).toBe(true);
  });
});

describe('crates switch off', () => {
  it('no crates in the run, so nothing opens', () => {
    FEATURES.crates = false;
    try {
      const run = new Run(quietLevel());
      expect(run.crates).toEqual([]);
    } finally {
      FEATURES.crates = true;
    }
  });
});

/**
 * S2.4 placement rules for every street file (lagos-2 and lagos-3 are played from piece K2, but
 * their crates are checked now so a data mistake shows up early).
 */
function placementProblems(level: Level): string[] {
  const out: string[] = [];
  const roofs = level.terrain.platforms;
  const pits = level.ground.slice(1).map((s, i) => ({ a: level.ground[i]![1], b: s[0] }));
  const onRoad = (x: number): boolean => level.ground.some(([a, b]) => x >= a && x <= b);
  const nearestPit = (x: number): number => Math.min(Infinity, ...pits.map((p) => (x < p.a ? p.a - x : x > p.b ? x - p.b : 0)));
  const crates = [...level.crates].sort((p, q) => p.x - q.x);
  for (const c of crates) {
    const at = `${level.id} crate at ${c.x}`;
    const roof = roofs.find((p) => c.x >= p.x && c.x <= p.x + p.w);
    const surface = roof ? roof.y : level.groundY;
    if (surface - c.bottomY !== 96) out.push(`${at}: bottom ${surface - c.bottomY} u above the surface, not 96`);
    if (!roof && !onRoad(c.x)) out.push(`${at}: over a pit`);
    if (nearestPit(c.x) < 60) out.push(`${at}: ${nearestPit(c.x)} u from a pit edge (60 or more)`);
    for (const p of roofs) if (p !== roof && p.x + p.w >= c.x - 40 && p.x <= c.x + 40) out.push(`${at}: roof at ${p.x} within 40 u`);
    if (c.contents !== 'kobo') {
      if (nearestPit(c.x) < 300) out.push(`${at}: food crate ${nearestPit(c.x)} u from a pit (300 or more)`);
      for (const z of level.hazards) if (Math.abs(z.x - c.x) < 200) out.push(`${at}: food crate ${Math.abs(z.x - c.x)} u from the ${z.kind} start (200 or more)`);
    }
    for (const k of level.coins) if (k.x >= c.x - 16 && k.x <= c.x + 16 && k.y >= c.bottomY - 28 && k.y <= c.bottomY) out.push(`${at}: kobo at ${k.x}, ${k.y} inside`);
  }
  // At least 64 u apart; never more than three in a row (a row: each one within 160 u of the last).
  let row = 1;
  for (let i = 1; i < crates.length; i++) {
    const gap = crates[i]!.x - crates[i - 1]!.x;
    if (gap < 64) out.push(`${level.id} crates at ${crates[i - 1]!.x} and ${crates[i]!.x}: ${gap} u apart (64 or more)`);
    row = gap < 160 ? row + 1 : 1;
    if (row > 3) out.push(`${level.id} crate at ${crates[i]!.x}: a fourth in a row`);
  }
  return out;
}

describe('crate placement (S2.4) in every street file', () => {
  for (const raw of [lagos1, lagos2, lagos3]) {
    const level = parseLevel(structuredClone(raw));
    it(`${level.id}: 96 u up, clear of pits and other roofs, 64 u apart, food crates clear, no kobo inside`, () => {
      expect(level.crates.length).toBeGreaterThan(0);
      expect(placementProblems(level)).toEqual([]);
    });
  }

  it('the checker catches each broken rule', () => {
    const bad = (crates: Level['crates'], extra: Partial<Level> = {}): string[] => placementProblems({ ...L1, ...extra, crates });
    expect(bad([{ x: 2000, bottomY: 200, contents: 'kobo' }])[0]).toMatch(/not 96/);
    expect(bad([{ x: 2420, bottomY: 204, contents: 'kobo' }])[0]).toMatch(/from a pit edge/);
    expect(bad([{ x: 1120, bottomY: 204, contents: 'kobo' }])[0]).toMatch(/roof at 1150/);
    expect(bad([{ x: 2000, bottomY: 204, contents: 'kobo' }, { x: 2050, bottomY: 204, contents: 'kobo' }])[0]).toMatch(/50 u apart/);
    expect(bad([0, 100, 200, 300].map((d) => ({ x: 1950 + d, bottomY: 204, contents: 'kobo' as const })))).toContain('lagos-1 crate at 2250: a fourth in a row');
    expect(bad([{ x: 5800, bottomY: 204, contents: 'corn' }]).join()).toMatch(/from the goat start/);
    expect(bad([{ x: 2000, bottomY: 204, contents: 'kobo' }], { coins: [{ x: 2000, y: 190 }] })[0]).toMatch(/inside/);
  });
});
