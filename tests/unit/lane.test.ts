/**
 * S3f2: the lane run (docs/design.md S3f0). The level file against the fairness rules (part 7)
 * and the totals (part 9), the loader, the speed curve (part 4), the moves, the hit rules, the
 * pool and the endless chunks (part 12).
 */
import { describe, expect, it } from 'vitest';
import laneData from '../../src/data/levels/lagos-lane.json';
import { DODGE, HERO_HEIGHT, SIZE, checkChunk, checkFair, chunkRows, freeLanes, isDodge, parseLane, rowsOf, speedAt, timeTo, type LaneLevel } from '../../src/lane/level';
import { CAM_BACK, farBoost, focal, sizeOnScreen } from '../../src/lane/view';
import { SwipeReader, buttonBoxes, keyMove } from '../../src/lane/input';
import { LaneSim, POOL_COINS, POOL_THINGS, seeded, type LaneEvent, type LaneMove } from '../../src/lane/sim';

const L = parseLane(laneData);
const DT = 1 / 60;
const at = (d: number): number => timeTo(L.speed, L.goal, d);

/** A level with nothing on the road, for clean move and hit checks. */
const empty = (extra: Partial<LaneLevel> = {}): LaneLevel => ({ ...L, things: [], pickups: [], coins: [], ...extra });

/** Runs until `until` is true (or `max` seconds), collecting every event. */
function run(sim: LaneSim, max: number, until: (s: LaneSim) => boolean = () => false, moves: Record<number, LaneMove> = {}): LaneEvent[] {
  const events: LaneEvent[] = [];
  const steps = Math.round(max * 60);
  for (let i = 0; i < steps; i++) {
    const m = moves[i];
    if (m) sim.press(m);
    sim.step(DT);
    events.push(...sim.events);
    if (until(sim)) break;
  }
  return events;
}

describe('lane level file (lagos-lane.json, part 13)', () => {
  it('loads as type "lane" with the note numbers', () => {
    expect(L.id).toBe('lagos-lane');
    expect(L.goal).toBe(600);
    expect(L.lanes).toBe(3);
    expect(L.laneWidth).toBe(2.5);
    expect(L.speed).toEqual({ start: 9, atGoal: 13, afterGoalPer100: 1, max: 16 });
    expect(L.gentleSpeed).toEqual({ start: 9, atGoal: 11, afterGoalPer100: 0.5, max: 14 });
    expect(L.move).toMatchObject({ laneChange: 0.18, jumpTime: 0.7, jumpHeight: 1.2, clearFeet: 0.35, slideTime: 0.7, dropTime: 0.12 });
    expect(L.spawnAhead).toBe(60);
    expect(L.chunks).toHaveLength(8);
    expect(L.chunks.every((c) => c.beats.length === 4)).toBe(true);
  });

  it('refuses a broken file with plain words', () => {
    expect(() => parseLane({ ...laneData, type: 'street' })).toThrow(/type must be "lane"/);
    expect(() => parseLane({ ...laneData, things: [[10, 3, 'danfo']] })).toThrow(/lane 0, 1 or 2/);
    expect(() => parseLane({ ...laneData, things: [[10, 1, 'train']] })).toThrow(/not one of/);
    expect(() => parseLane({ ...laneData, speed: { ...laneData.speed, max: 'fast' } })).toThrow(/speed.max must be a number/);
  });

  it('part 7 rules 1 to 5 and 8 hold for the fixed 600 m', () => {
    const rows = rowsOf(L.things);
    const bad = checkFair(rows, L.pickups, L.coins, at, { minGap: 1.7, warmUp: [152, 282, 372], foodLane: 1 });
    expect(bad).toEqual([]);
    // Rule 6: nothing to dodge in the first 30 m.
    expect(L.things.filter((t) => isDodge(t.kind) && t.d - 3 < 30)).toEqual([]);
  });

  it('part 7 also holds in Gentle mode (slower, so more time between rows)', () => {
    const gentle = (d: number): number => timeTo(L.gentleSpeed, L.goal, d);
    expect(checkFair(rowsOf(L.things), L.pickups, L.coins, gentle, { minGap: 1.7 })).toEqual([]);
  });

  it('the fairness check catches broken roads', () => {
    expect(checkFair([{ d: 50, lanes: ['danfo', 'danfo', 'danfo'] }], [], [], at).join()).toMatch(/rule 1/);
    expect(checkFair([{ d: 50, lanes: ['danfo', null, null] }, { d: 55, lanes: [null, 'danfo', null] }], [], [], at).join()).toMatch(/rule 2/);
    expect(checkFair([{ d: 50, lanes: [null, 'cones', null] }, { d: 58, lanes: [null, 'barrier', null] }], [], [], at).join()).toMatch(/rule 4/);
    expect(checkFair([{ d: 50, lanes: [null, 'danfo', null] }], [{ d: 51, lane: 1, kind: 'bulb' }], [], at).join()).toMatch(/rule 5/);
    expect(checkFair([{ d: 50, lanes: [null, 'barrier', null] }], [], [{ d: 50, lane: 1, count: 5, shape: 'arc' }], at).join()).toMatch(/rule 5/);
    expect(checkFair([{ d: 50, lanes: ['danfo', null, null] }], [], [{ d: 46, lane: 0, count: 4, shape: 'line' }], at).join()).toMatch(/rule 5/);
    expect(() => rowsOf([{ d: 5, lane: 0, kind: 'cones' }, { d: 5, lane: 0, kind: 'barrier' }])).toThrow(/two things/);
  });

  it('hints come at least 1.5 s before their thing and 1.5 s apart (part 13)', () => {
    const thingFor: Record<string, number> = { lane: 35, jump: 70, slide: 100, crate: 128, power: 152, goat: 178, food: 204, tech: 240, pothole: 305 };
    for (const h of L.hints) {
      const d = thingFor[h.key];
      expect(d, h.key).toBeDefined();
      expect(at(d!) - at(h.d), h.key).toBeGreaterThanOrEqual(1.5);
    }
    for (let i = 1; i < L.hints.length; i++) expect(at(L.hints[i]!.d) - at(L.hints[i - 1]!.d)).toBeGreaterThanOrEqual(1.5);
  });

  it('every chunk keeps a free lane and the other rules, plain and mirrored', () => {
    for (const c of L.chunks) {
      expect(checkChunk(c, L.endless.beat), c.id).toEqual([]);
      for (const m of [false, true]) for (const r of chunkRows(c, m)) expect(freeLanes(r).length, c.id).toBeGreaterThan(0);
    }
  });

  it('part 9 totals: Power 14, Tech 9 and 86 coins at most in the fixed 600 m', () => {
    let power = 0;
    let tech = 0;
    let coins = 0;
    for (const p of L.pickups) {
      if (p.kind === 'bulb') power++;
      if (p.kind === 'chip') tech++;
    }
    for (const c of L.coins) coins += c.count;
    for (const t of L.things) {
      const pop = L.pops[t.kind];
      if (!pop) continue;
      power += pop.power;
      tech += pop.tech;
      coins += pop.coins;
    }
    expect({ power, tech, coins }).toEqual({ power: 14, tech: 9, coins: 86 });
    expect(L.pickups.filter((p) => p.kind === 'bulb')).toHaveLength(11);
    expect(L.prize).toEqual({ kobo: 500, power: 4, tech: 2 });
  });
});

describe('lane speed (part 4)', () => {
  it('9 m/s at the start, 13 at the bus stop, +1 each 100 m after, up to 16; Gentle 11 and 14', () => {
    expect(speedAt(L.speed, 600, 0)).toBe(9);
    expect(speedAt(L.speed, 600, 300)).toBe(11);
    expect(speedAt(L.speed, 600, 600)).toBe(13);
    expect(speedAt(L.speed, 600, 700)).toBe(14);
    expect(speedAt(L.speed, 600, 5000)).toBe(16);
    expect(speedAt(L.gentleSpeed, 600, 600)).toBe(11);
    expect(speedAt(L.gentleSpeed, 600, 800)).toBe(12);
    expect(speedAt(L.gentleSpeed, 600, 9000)).toBe(14);
  });

  it('the bus stop comes in 54 to 57 s with no stumbles (Gentle 59 to 62 s), in the sim too', () => {
    expect(at(600)).toBeGreaterThan(54);
    expect(at(600)).toBeLessThan(57);
    const g = timeTo(L.gentleSpeed, 600, 600);
    expect(g).toBeGreaterThan(59);
    expect(g).toBeLessThan(62);
    for (const gentle of [false, true]) {
      const sim = new LaneSim(empty(), { gentle });
      run(sim, 70, (s) => s.phase === 'goal');
      expect(sim.phase).toBe('goal');
      expect(sim.time).toBeCloseTo(gentle ? g : at(600), 1);
    }
  });
});

describe('lane moves (part 4)', () => {
  it('a lane change takes 0.18 s, eased; the kerb stops you', () => {
    const sim = new LaneSim(empty());
    sim.press('left');
    expect(sim.lane).toBe(0);
    run(sim, 0.09);
    expect(sim.x).toBeGreaterThan(-2.5);
    expect(sim.x).toBeLessThan(0);
    run(sim, 0.1);
    expect(sim.x).toBe(-2.5);
    sim.press('left');
    run(sim, 0.3);
    expect(sim.lane).toBe(0);
    expect(sim.queued).toBeNull();
  });

  it('a jump is 0.7 s in the air and 1.2 m high; the feet are 0.35 m up for the middle 0.58 s', () => {
    const sim = new LaneSim(empty());
    sim.press('jump');
    let top = 0;
    let up = 0;
    let air = 0;
    run(sim, 1, (s) => {
      if (s.jumpT >= 0) air += DT;
      top = Math.max(top, s.y);
      if (s.y >= 0.35) up += DT;
      return false;
    });
    expect(air).toBeCloseTo(0.7, 1);
    expect(top).toBeCloseTo(1.2, 2);
    expect(up).toBeGreaterThan(0.55);
    expect(up).toBeLessThan(0.62);
  });

  it('a slide is 0.7 s with a 0.8 m body; down in the air drops in 0.12 s then slides; up while sliding jumps', () => {
    const sim = new LaneSim(empty());
    sim.press('slide');
    expect(sim.bodyH).toBe(0.8);
    run(sim, 0.69);
    expect(sim.slideT).toBeGreaterThan(0);
    run(sim, 0.03);
    expect(sim.slideT).toBe(-1);
    sim.press('jump');
    run(sim, 0.3);
    sim.press('slide');
    expect(sim.dropT).toBeGreaterThanOrEqual(0);
    run(sim, 0.13);
    expect(sim.y).toBe(0);
    expect(sim.slideT).toBeGreaterThanOrEqual(0);
    sim.press('jump');
    expect(sim.slideT).toBe(-1);
    expect(sim.jumpT).toBe(0);
  });

  it('lane change in the air is allowed; a move during a lane change or a jump waits (one, the newest)', () => {
    const sim = new LaneSim(empty());
    sim.press('jump');
    run(sim, 0.1);
    sim.press('right');
    expect(sim.lane).toBe(2);
    sim.press('left');
    sim.press('jump');
    expect(sim.queued).toBe('jump');
    run(sim, 0.7, (s) => s.jumpT === -1 && s.queued === null);
    // The waiting jump ran as soon as the hero landed.
    expect(sim.jumpT).toBeGreaterThanOrEqual(0);
    expect(sim.lane).toBe(2);
  });
});

describe('lane hits (part 4 and 6)', () => {
  const one = (kind: string, lane = 1, d = 40): LaneSim => new LaneSim(empty({ things: [{ d, lane, kind: kind as never }] }));

  it('a danfo from the front: a stumble, and a side-step into a free lane in 0.25 s', () => {
    const sim = one('danfo');
    const ev = run(sim, 6);
    expect(ev.filter((e) => e.type === 'stumble')).toHaveLength(1);
    expect(sim.lane).not.toBe(1);
    expect(Math.abs(sim.x)).toBe(2.5);
  });

  it('a stumble: 70 percent speed for 0.5 s, back over 0.4 s, then 1 s safe', () => {
    const sim = new LaneSim(empty({ things: [{ d: 40, lane: 1, kind: 'cones' }, { d: 50, lane: 1, kind: 'cones' }] }));
    run(sim, 10, (s) => s.tripT >= 0);
    const base = speedAt(L.speed, 600, sim.dist);
    run(sim, 0.25);
    expect(sim.speed / speedAt(L.speed, 600, sim.dist)).toBeCloseTo(0.7, 3);
    run(sim, 0.5);
    expect(sim.speed).toBeGreaterThan(base * 0.7);
    // The second cones came inside the safe time: no second stumble.
    const ev = run(sim, 3);
    expect(ev.filter((e) => e.type === 'stumble')).toHaveLength(0);
  });

  it('changing lane into the side of a danfo is a soft bump back, no stumble', () => {
    const sim = one('danfo', 0, 30);
    run(sim, 5, (s) => s.dist > 29);
    sim.press('left');
    const ev = run(sim, 1);
    expect(ev.some((e) => e.type === 'sideBump')).toBe(true);
    expect(ev.some((e) => e.type === 'stumble')).toBe(false);
    expect(sim.lane).toBe(1);
    expect(sim.x).toBe(0);
  });

  it('cones and potholes: a jump clears them, running into them stumbles (and the cones tip)', () => {
    for (const kind of ['cones', 'pothole']) {
      const hit = one(kind);
      expect(run(hit, 6).filter((e) => e.type === 'stumble'), kind).toHaveLength(1);
      expect(hit.things.some((s) => s.used && s.state === 'done') || hit.dist > 45).toBe(true);
      const clear = one(kind);
      // Jump so the top of the jump is over the thing: 0.35 s before at about 9.3 m/s.
      run(clear, 6, (s) => s.dist >= 40 - 0.35 * s.speed);
      clear.press('jump');
      expect(run(clear, 3).filter((e) => e.type === 'stumble'), kind).toHaveLength(0);
    }
  });

  it('the barrier arm: a slide goes under, a jump does not', () => {
    const slide = one('barrier');
    run(slide, 6, (s) => s.dist >= 40 - 0.3 * s.speed);
    slide.press('slide');
    expect(run(slide, 3).filter((e) => e.type === 'stumble')).toHaveLength(0);
    const jump = one('barrier');
    run(jump, 6, (s) => s.dist >= 40 - 0.35 * s.speed);
    jump.press('jump');
    expect(run(jump, 3).filter((e) => e.type === 'stumble')).toHaveLength(1);
  });

  it('crates, junk and signs burst (no stumble); goats bounce you softly (80 percent, 0.3 s), never a stumble', () => {
    for (const kind of ['crate:power', 'crate:tech', 'crate:coins', 'junk', 'sign']) {
      const ev = run(one(kind), 6);
      expect(ev.filter((e) => e.type === 'burst'), kind).toHaveLength(1);
      expect(ev.some((e) => e.type === 'stumble'), kind).toBe(false);
    }
    const sim = one('goat');
    run(sim, 6, (s) => s.events.some((e) => e.type === 'goat'));
    run(sim, 0.1);
    expect(sim.speed / speedAt(L.speed, 600, sim.dist)).toBeCloseTo(0.8, 3);
    const ev = run(sim, 2);
    expect(ev.some((e) => e.type === 'stumble')).toBe(false);
    expect(sim.speed).toBeCloseTo(speedAt(L.speed, 600, sim.dist), 2);
  });

  it('a safe time after a resume (part 7 rule 6): nothing trips you', () => {
    const sim = one('cones', 1, 10);
    sim.fresh(1.5);
    expect(run(sim, 3).some((e) => e.type === 'stumble')).toBe(false);
  });

  it('pickups and coins are taken only in their lane', () => {
    const sim = new LaneSim(empty({ pickups: [{ d: 30, lane: 1, kind: 'bulb' }, { d: 30, lane: 0, kind: 'chip' }], coins: [{ d: 40, lane: 1, count: 4, shape: 'line' }] }));
    const ev = run(sim, 6);
    expect(ev.filter((e) => e.type === 'pickup').map((e) => (e as { kind: string }).kind)).toEqual(['bulb']);
    expect(ev.filter((e) => e.type === 'coin')).toHaveLength(4);
  });
});

/** A bot that reads the road: it picks the nearest free lane and jumps or slides what is in its own. */
function bot(sim: LaneSim): void {
  const ahead = sim.things.filter((s) => s.used && !s.pickup && s.state === 'idle' && s.d > sim.dist && s.d - sim.dist < 1.1 * sim.speed);
  const inLane = (l: number) => ahead.filter((s) => s.lane === l).sort((a, b) => a.d - b.d)[0];
  const mine = inLane(sim.lane);
  if (!mine || mine.kind === 'goat' || mine.kind.includes(':') || mine.kind === 'junk' || mine.kind === 'sign') return;
  const dt = (mine.d - sim.dist) / sim.speed;
  if (mine.kind === 'danfo') {
    if (sim.changing || sim.queued) return;
    // The nearest lane with no danfo coming; one lane at a time.
    const to = [sim.lane - 1, sim.lane + 1, sim.lane - 2, sim.lane + 2].find((l) => l >= 0 && l <= 2 && inLane(l)?.kind !== 'danfo');
    if (to !== undefined) sim.press(to < sim.lane ? 'left' : 'right');
    return;
  }
  if ((mine.kind === 'cones' || mine.kind === 'pothole') && dt < 0.36 && sim.jumpT < 0) sim.press('jump');
  if (mine.kind === 'barrier' && dt < 0.3 && sim.slideT < 0) sim.press('slide');
}

describe('lane pool and endless part (part 12, part 21)', () => {
  it('a bot that reads the road runs the fixed 600 m with no stumble, inside the pool', () => {
    const sim = new LaneSim(L);
    const ev: LaneEvent[] = [];
    for (let i = 0; i < 80 * 60 && sim.phase === 'run'; i++) {
      bot(sim);
      sim.step(DT);
      ev.push(...sim.events);
    }
    expect(sim.phase).toBe('goal');
    expect(ev.filter((e) => e.type === 'stumble')).toEqual([]);
    expect(sim.overflow).toBe(0);
    expect(sim.peak).toBeLessThanOrEqual(POOL_THINGS);
  });

  it('endless chunks: random, never one of the last 2, a food every 400 m, rows one beat apart, never over the pool', () => {
    const sim = new LaneSim(L, { rng: seeded(7) });
    run(sim, 70, (s) => s.phase === 'goal');
    sim.keepRunning();
    expect(sim.phase).toBe('endless');
    // 2.5 s of open road first: nothing within 2.5 s of the bus stop.
    const foods: string[] = [];
    let firstThing = Infinity;
    for (let i = 0; i < 400 * 60; i++) {
      sim.step(DT);
      for (const s of sim.things) if (s.used && !s.pickup && s.d < firstThing) firstThing = s.d;
      for (const s of sim.things) if (s.used && s.pickup && (s.kind === 'garri' || s.kind === 'corn') && !foods.includes(`${s.kind} ${Math.round(s.d)}`)) foods.push(`${s.kind} ${Math.round(s.d)}`);
    }
    expect(firstThing - 600).toBeGreaterThanOrEqual(2.5 * 13 - 0.01);
    const used = sim.chunksUsed;
    expect(used.length).toBeGreaterThan(20);
    for (let i = 2; i < used.length; i++) expect(used.slice(i - 2, i)).not.toContain(used[i]);
    expect(new Set(used).size).toBe(8);
    expect(foods.slice(0, 4).map((f) => f.split(' ')[0])).toEqual(['garri', 'corn', 'garri', 'corn']);
    // Each food comes on its own row once the 400 m mark is passed (the next free row after it).
    const marks = foods.slice(0, 4).map((f) => Number(f.split(' ')[1]));
    marks.forEach((d, i) => {
      expect(d).toBeGreaterThanOrEqual(1000 + 400 * i);
      expect(d).toBeLessThan(1000 + 400 * i + 5 * 1.8 * 16);
    });
    expect(sim.overflow).toBe(0);
    expect(sim.peak).toBeLessThanOrEqual(POOL_THINGS);
    expect(POOL_COINS).toBe(30);
    expect(sim.speed).toBe(16);
  });
});

describe('lane camera (part 5) and controls (part 3)', () => {
  it('at 320 x 240 the hero is 56 px or taller and every dodge thing is 10 px or more 1.5 s away, at 9, 13 and 16 m/s', () => {
    expect(sizeOnScreen(320, 240, HERO_HEIGHT, 0)).toBeGreaterThanOrEqual(56);
    for (const v of [9, 13, 16]) {
      for (const k of DODGE) {
        const z = SIZE[k];
        const px = Math.max(sizeOnScreen(320, 240, z.w, 1.5 * v), sizeOnScreen(320, 240, z.h, 1.5 * v));
        expect(px, `${k} at ${v} m/s`).toBeGreaterThanOrEqual(10);
      }
    }
    // Far things are drawn up to 1.6 times bigger, times 1 at the hero.
    expect(farBoost(0)).toBe(1);
    expect(farBoost(34)).toBeCloseTo(1.6);
    expect(farBoost(60)).toBeCloseTo(1.6);
  });

  it('the road fills 86 percent of the width at the hero (less only on a very wide screen)', () => {
    expect((7.5 * focal(320, 240)) / CAM_BACK / 320).toBeCloseTo(0.86, 2);
    expect((7.5 * focal(851, 393)) / CAM_BACK / 851).toBeLessThan(0.86);
  });

  it('a swipe counts at 24 px within 0.3 s, the bigger direction wins, once per finger', () => {
    const s = new SwipeReader();
    s.down(1, 100, 100, 0);
    expect(s.move(1, 120, 100, 50)).toBeNull();
    expect(s.move(1, 76, 110, 80)).toBe('left');
    expect(s.move(1, 20, 100, 90)).toBeNull();
    s.up(1);
    s.down(2, 100, 100, 1000);
    expect(s.move(2, 110, 75, 1100)).toBe('jump');
    s.up(2);
    s.down(3, 100, 100, 2000);
    expect(s.move(3, 105, 130, 2050)).toBe('slide');
    s.up(3);
    // Too slow: a drag over more than 0.3 s does not count from where it began.
    s.down(4, 100, 100, 3000);
    expect(s.move(4, 120, 100, 3400)).toBeNull();
    expect(s.move(4, 150, 100, 3450)).toBe('right');
    expect(keyMove('KeyA', false)).toBe('left');
    expect(keyMove('Space', false)).toBe('jump');
    expect(keyMove('ArrowDown', true)).toBeNull();
  });

  it('buttons: 56 x 56, 8 px apart and 8 px inside the safe edges; left and right bottom left, jump and slide bottom right', () => {
    const b = buttonBoxes(320, 240, { left: 0, right: 0, bottom: 0 });
    expect(b.left).toEqual({ x: 8, y: 176, w: 56, h: 56 });
    expect(b.right.x).toBe(72);
    expect(b.slide.x + 56).toBe(312);
    expect(b.jump.x).toBe(312 - 56 - 8 - 56);
  });
});
