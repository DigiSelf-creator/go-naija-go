/**
 * MS3a to MS3c (docs/missions.md, decision 89): the ten quick missions. Every star number is
 * worked out from (or checked against) the level files, so a change to a street can never make
 * a star impossible; a star is kept the moment it fills, pays ₦2 once and survives a reload;
 * the wells' help line shows only after two goes; Ogun's missions stay in the Ogun part.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import lagos1 from '../../src/data/levels/lagos-1.json';
import lagos2 from '../../src/data/levels/lagos-2.json';
import lagos3 from '../../src/data/levels/lagos-3.json';
import lagosLane from '../../src/data/levels/lagos-lane.json';
import lagosWell from '../../src/data/levels/lagos-well.json';
import ogun1 from '../../src/data/levels/ogun-1.json';
import ogun2 from '../../src/data/levels/ogun-2.json';
import ogun3 from '../../src/data/levels/ogun-3.json';
import ogunLane from '../../src/data/levels/ogun-lane.json';
import ogunWell from '../../src/data/levels/ogun-well.json';
import { FUFU_RULES } from '../../src/game/fufu';
import { parseLevel, type Level } from '../../src/game/level';
import { pitsOf } from '../../src/game/pits';
import { RULES, Run, type RunEvent } from '../../src/game/run';
import { LANE, MissionBook, MissionGo, STAR_KOBO, coinStars, helpFor, placeToPlay, readMissions, type MissionDef } from '../../src/game/missions';
import { lagosMissions, withCoins } from '../../src/screens/missions';
import { WORDS } from '../../src/screens/words';
import { BOARD_WORDS } from '../../src/screens/boardWords';
import { OGUN_MISSIONS } from '../../src/worlds/ogun/missions';
import { createStore } from '../../src/storage';

const LEVELS: Record<string, Level> = Object.fromEntries(
  [lagos1, lagos2, lagos3, ogun1, ogun2, ogun3].map((d) => {
    const l = parseLevel(structuredClone(d));
    return [l.id, l];
  }),
);
const levelAt = (d: MissionDef, n: number): Level => LEVELS[`${d.state}-${n}`]!;
const coinsAt = (state: string) => (n: number) => LEVELS[`${state}-${n}`]!.coins.length;
const LAGOS = withCoins(lagosMissions(), coinsAt('lagos'));
const OGUN = withCoins(OGUN_MISSIONS, coinsAt('ogun'));
const ALL = [...LAGOS, ...OGUN];

/** Memory storage, like the phone's, so a "reload" is a new store on the same backing. */
function phone(): { get: () => Storage; data: Map<string, string> } {
  const data = new Map<string, string>();
  const s = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  } as unknown as Storage;
  return { get: () => s, data };
}

describe('the ten missions (part 1)', () => {
  it('five in Lagos, five in Ogun, 28 stars, easiest first, the names and lines of part 1', () => {
    expect(LAGOS.map((d) => d.name)).toEqual(['Coin catch', 'Lunch for Mama Put', 'Goat friends', 'Secret wells', 'Light it up']);
    expect(OGUN.map((d) => d.name)).toEqual(['Coin catch', 'Fill the potholes', 'Garri for the mill', 'Stomp the gravel', 'Tech chips']);
    expect(LAGOS.map((d) => d.line)).toEqual(['Catch coins on Alausa!', 'Mama Put needs corn, fufu and amala!', 'Throw fufu to the hungry goats!', 'Find the secret wells!', 'Catch Power bulbs!']);
    expect(OGUN.map((d) => d.line)).toEqual(['Catch coins on Ota!', 'Throw fufu into the potholes!', 'Bring Ijebu garri to the mill!', 'Jump on the hopping gravel!', 'Catch Tech chips!']);
    expect(LAGOS.reduce((n, d) => n + d.stars.length, 0)).toBe(14);
    expect(OGUN.reduce((n, d) => n + d.stars.length, 0)).toBe(14);
    expect(new Set(ALL.map((d) => d.id)).size).toBe(10);
    // Words a 5 year old reads: short card lines (part 5 says 6 or fewer; Mama Put's, as the note
    // writes it, has 7, so the designer is told).
    for (const d of ALL) expect(d.line.split(' ').length, d.line).toBeLessThanOrEqual(d.id === 'lagos-lunch' ? 7 : 6);
  });

  it('coin stars are 40, 65 and 85 percent of the laid coins, rounded down to a 5 (Alausa 159, Ota 160)', () => {
    expect(LEVELS['lagos-1']!.coins.length).toBe(159);
    expect(LEVELS['ogun-1']!.coins.length).toBe(160);
    expect(coinStars(159)).toEqual([60, 100, 135]);
    expect(coinStars(160)).toEqual([60, 100, 135]);
    for (const d of ALL.filter((x) => x.goal === 'coins')) {
      const laid = levelAt(d, d.at[0]!).coins.length;
      expect(d.stars).toEqual(coinStars(laid));
      expect(d.stars[2]!).toBeLessThanOrEqual(laid);
    }
  });

  it('Lunch for Mama Put: Alausa holds a corn, a fufu and an amala on the road', () => {
    const d = LAGOS[1]!;
    const foods = levelAt(d, 1).foods.map((f) => f.kind);
    for (const f of d.foods!) expect(foods, f).toContain(f);
    expect(d.stars).toEqual([1, 2, 3]);
  });

  it('Goat friends: Computer Village has fufu, enough balls and at least 3 goats after it', () => {
    const l = levelAt(LAGOS[2]!, 2);
    const fufu = l.foods.find((f) => f.kind === 'fufu')!;
    expect(fufu.x).toBe(4800);
    expect(l.hazards.filter((z) => z.kind === 'goat' && z.x > fufu.x).map((z) => z.x)).toEqual([6200, 7500, 9950, 10650]);
    expect(FUFU_RULES.give).toBeGreaterThanOrEqual(LAGOS[2]!.stars.at(-1)!);
  });

  it('Secret wells: Computer Village (x 2950) and Ikeja (x 160, behind the start) each have one', () => {
    const d = LAGOS[3]!;
    expect(d.at).toEqual([2, 3]);
    expect(levelAt(d, 2).wells.map((w) => w.x)).toEqual([2950]);
    expect(levelAt(d, 3).wells.map((w) => w.x)).toEqual([160]);
    expect(levelAt(d, 3).spawnX).toBeGreaterThan(160);
    expect(lagosWell.id).toBe('lagos-well');
  });

  it('Fill the potholes: after Abeokuta\'s fufu, six cracks and three potholes a ball can plug (5 needed)', () => {
    const d = OGUN[1]!;
    const l = levelAt(d, 2);
    const fufu = l.foods.find((f) => f.kind === 'fufu')!.x;
    const pits = pitsOf(l.ground).filter((p) => p.a > fufu && p.w >= FUFU_RULES.plugMin && p.w <= FUFU_RULES.plugMax);
    expect(pits.map((p) => p.a)).toEqual([9400, 9950, 11200]);
    const cracks = l.cracks.filter((c) => c.x > fufu && c.w >= FUFU_RULES.plugMin && c.w <= FUFU_RULES.plugMax);
    expect(cracks).toHaveLength(6);
    expect(pits.length + cracks.length).toBeGreaterThanOrEqual(d.stars.at(-1)!);
    expect(FUFU_RULES.give).toBeGreaterThanOrEqual(d.stars.at(-1)!);
  });

  it('the designer\'s check: a ball plugs an opened crack on the real Abeokuta (so star 3 stays 5)', () => {
    const run = new Run(LEVELS['ogun-2']!);
    const gy = run.level.groundY;
    Object.assign(run.hero, { x: 5030, y: gy, prevY: gy, vy: 0, vx: 0, speed: 0, grounded: true, on: null, move: 0, runTime: 0 });
    run.fufu = 3;
    run.steer(0);
    const ev: RunEvent[] = [];
    for (let i = 0; i < RULES.crackOpenSteps + 10; i++) ev.push(...run.step(1 / 60));
    expect(run.cracks.find((c) => c.x === 5250)!.state).toBe('open');
    for (let t = 0; t < 3 && !ev.some((e) => e.type === 'fufuPlug'); t++) {
      run.throwFufu();
      for (let i = 0; i < 120; i++) ev.push(...run.step(1 / 60));
    }
    expect(ev.find((e) => e.type === 'fufuPlug')).toMatchObject({ a: 5250, b: 5290 });
    expect(OGUN[1]!.stars).toEqual([1, 3, 5]);
  });

  it('Garri for the mill: Abeokuta and Sagamu each have a well to the garri store with a parcel', () => {
    const d = OGUN[2]!;
    expect(levelAt(d, 2).wells.map((w) => [w.x, w.room])).toEqual([[3500, 'ogun-well']]);
    expect(levelAt(d, 3).wells.map((w) => [w.x, w.room])).toEqual([[4700, 'ogun-well']]);
    expect(JSON.stringify(ogunWell)).toMatch(/parcel|gift/);
  });

  it('Stomp the gravel: Sagamu has six gravel (5 for star 3)', () => {
    expect(levelAt(OGUN[3]!, 3).hazards.filter((z) => z.kind === 'gravel')).toHaveLength(6);
    expect(OGUN[3]!.stars).toEqual([1, 3, 5]);
  });

  it('Light it up and Tech chips: each lane run lays enough Power and Tech before the bus stop', () => {
    const before = (lv: typeof lagosLane, what: 'power' | 'tech'): number => {
      const pick = lv.pickups.filter((p) => (p[0] as number) <= lv.goal && p[2] === (what === 'power' ? 'bulb' : 'chip')).length;
      const pops = lv.pops as Record<string, { power?: number; tech?: number }>;
      const burst = lv.things.filter((t) => (t[0] as number) <= lv.goal).reduce((n, t) => n + (pops[t[2] as string]?.[what] ?? 0), 0);
      return pick + burst;
    };
    expect(before(lagosLane, 'power')).toBe(14);
    expect(before(ogunLane as typeof lagosLane, 'tech')).toBe(9);
    expect(LAGOS[4]!.stars.at(-1)!).toBeLessThanOrEqual(before(lagosLane, 'power'));
    expect(OGUN[4]!.stars.at(-1)!).toBeLessThanOrEqual(before(ogunLane as typeof lagosLane, 'tech'));
    expect([LAGOS[4]!.at, OGUN[4]!.at]).toEqual([[LANE], [LANE]]);
  });
});

describe('stars: kept, paid once, saved (parts 1 and 3)', () => {
  const coins = LAGOS[0]!;
  it('a star fills the moment the count reaches it, pays ₦2 once, and stays after a lost run', () => {
    const p = phone();
    const book = new MissionBook(createStore(p.get));
    let paid = 0;
    const go = new MissionGo(coins, 1, book, (n) => (paid += n * STAR_KOBO));
    expect(go.next).toBe(60);
    expect(go.count(59)).toBe(0);
    expect(go.count(61)).toBe(1);
    expect(paid).toBe(200);
    expect(book.stars(coins.id)).toBe(1);
    expect(JSON.parse(p.data.get('gidi-missions')!).stars).toEqual({ 'lagos-coins': 1 });
    go.end(); // game over: nothing goes away
    // A reload, then a weaker go: no new star, nothing paid again.
    const book2 = new MissionBook(createStore(p.get));
    expect(book2.stars(coins.id)).toBe(1);
    expect(book2.save.best[coins.id]).toBe(61);
    const go2 = new MissionGo(coins, 1, book2, (n) => (paid += n * STAR_KOBO));
    go2.count(70);
    expect(go2.next).toBe(100);
    expect(paid).toBe(200);
    // Two stars at once pay ₦4.
    expect(go2.count(140)).toBe(2);
    expect(paid).toBe(600);
    expect(go2.next).toBeNull();
    expect(go2.won).toBe(2);
    expect(WORDS.missions.got(go2.won, go2.stars, 3)).toBe('All 3 stars!');
  });

  it('end card lines', () => {
    const g = WORDS.missions.got;
    expect([g(1, 1, 3), g(2, 2, 3), g(1, 3, 3), g(1, 2, 2), g(1, 1, 2)]).toEqual(['You got a star!', 'You got 2 stars!', 'All 3 stars!', 'Both stars!', 'You got a star!']);
    expect(BOARD_WORDS.every('Ogun')).toBe('Every Ogun star!');
    expect(BOARD_WORDS.everyLine('Lagos')).toBe('You are a Lagos star helper.');
    expect(BOARD_WORDS.everyLine('Ogun')).toBe('You are an Ogun star helper.');
    expect(BOARD_WORDS.tile('Coin catch', 'Alausa', 1, 3)).toBe('Coin catch. Alausa. 1 of 3 stars.');
    expect(BOARD_WORDS.tileLocked('Secret wells', 'Ikeja')).toBe('Secret wells. Locked. Open Ikeja first.');
    expect(WORDS.missions.starSpoken(1, 3)).toBe('Star! 1 of 3.');
  });

  it('Lunch for Mama Put: one star for each food, any order, each once', () => {
    const book = new MissionBook(createStore(phone().get));
    const go = new MissionGo(LAGOS[1]!, 1, book, () => undefined);
    expect(go.food('amala')).toBe(1);
    expect(go.food('amala')).toBe(0);
    expect(go.food('garri')).toBe(0);
    expect(go.food('corn')).toBe(1);
    expect(go.food('fufu')).toBe(1);
    expect(book.stars('lagos-lunch')).toBe(3);
  });

  it('the wells: one star at each place, saved; the help line only after two goes without it', () => {
    const p = phone();
    const book = new MissionBook(createStore(p.get));
    const d = LAGOS[3]!;
    const open = () => true;
    expect(placeToPlay(d, book.save, open)).toBe(2);
    const a = new MissionGo(d, 2, book, () => undefined);
    expect(helpFor(d, book.save, 2)).toBeNull();
    a.end();
    const b = new MissionGo(d, 2, book, () => undefined);
    expect(helpFor(d, book.save, 2)).toBe('Look for a well by the road!');
    expect(b.next).toBe(1);
    expect(b.found()).toBe(1);
    expect(b.found()).toBe(0);
    expect(helpFor(d, book.save, 2)).toBeNull();
    expect(placeToPlay(d, book.save, open)).toBe(3);
    const c = new MissionGo(d, 3, book, () => undefined);
    expect(c.found()).toBe(1);
    expect(book.stars(d.id)).toBe(2);
    expect(new MissionBook(createStore(p.get)).save.found).toEqual({ 'lagos-wells-2': 1, 'lagos-wells-3': 1 });
    // Ikeja's help: after two goes there without its well.
    const d2 = { ...d, id: 'x' };
    new MissionGo(d2, 3, book, () => undefined);
    new MissionGo(d2, 3, book, () => undefined);
    expect(helpFor(d2, book.save, 3)).toBe('Look back, behind the start!');
    // A locked place is never played.
    expect(placeToPlay(d, emptySave(), (n) => n === 2)).toBe(2);
    expect(placeToPlay(d, emptySave(), () => false)).toBeNull();
  });

  it('merge never lowers anything; a broken copy reads as no stars and is left alone until a star fills', () => {
    const a = { v: 1, stars: { x: 2 }, best: { x: 50 }, found: { 'w-2': 1 } };
    const b = { stars: { x: 1, y: 1, z: 'no', q: -3 }, best: { x: 80 }, found: { 'w-3': 1 }, helper: { lagos: 1 }, tries: 'junk' };
    expect(readMissions(a, b)).toEqual({ stars: { x: 2, y: 1 }, best: { x: 80 }, tries: {}, found: { 'w-2': 1, 'w-3': 1 }, helper: { lagos: 1 } });
    expect(readMissions('junk')).toEqual(emptySave());
    const p = phone();
    p.data.set('gidi-missions', '{broken');
    const book = new MissionBook(createStore(p.get));
    expect(book.stars('lagos-coins')).toBe(0);
    const go = new MissionGo(LAGOS[0]!, 1, book, () => undefined);
    go.count(10);
    go.end();
    expect(p.data.get('gidi-missions')).toBe('{broken');
    go.count(60);
    expect(JSON.parse(p.data.get('gidi-missions')!).stars).toEqual({ 'lagos-coins': 1 });
  });

  it('works with storage blocked (stars live in memory)', () => {
    const book = new MissionBook(createStore(() => null));
    const go = new MissionGo(LAGOS[2]!, 2, book, () => undefined);
    expect(go.add()).toBe(1);
    expect(book.stars('lagos-goats')).toBe(1);
  });
});

describe('Ogun\'s missions live in the Ogun part (MS3c)', () => {
  it('src/worlds/ogun/missions.ts takes only types from the first load', () => {
    const src = readFileSync(fileURLToPath(new URL('../../src/worlds/ogun/missions.ts', import.meta.url)), 'utf8');
    for (const [, what, from] of src.matchAll(/^import (type )?[^;]*? from '([^']+)';/gm)) {
      if (!from!.startsWith('./')) expect(what, from).toBe('type ');
    }
  });
});

function emptySave() {
  return readMissions(null);
}
