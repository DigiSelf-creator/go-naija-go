/**
 * KM1 to KM5 (docs/kano.md 6.2, decision 89): Kano's five quick missions, with the shape, stars
 * and saves of docs/missions.md. Every star number is checked against the level files and the
 * real run's events, a star is kept the moment it fills (MS-R3), pays ₦2 once (MS-R2) and stays
 * after a lost run, and the missions live in the Kano part (types only from outside it).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import kano1 from '../../src/data/levels/kano-1.json';
import kano2 from '../../src/data/levels/kano-2.json';
import kano3 from '../../src/data/levels/kano-3.json';
import kanoLane from '../../src/data/levels/kano-lane.json';
import { parseLevel, type Level } from '../../src/game/level';
import { STEPS_PER_SECOND, type RunEvent } from '../../src/game/run';
import { Run } from './kano-run';
import { LANE, MissionBook, MissionGo, STAR_KOBO, placeToPlay, readMissions, type MissionDef } from '../../src/game/missions';
import { withCoins } from '../../src/screens/missions';
import { BOARD_WORDS } from '../../src/screens/boardWords';
import { KANO_MISSIONS, arcOf, isBounce, isPuff, tailwindPits } from '../../src/worlds/kano/missions';
import { parseLane } from '../../src/lane/level';
import { createStore } from '../../src/storage';

const DT = 1 / STEPS_PER_SECOND;
const LEVELS: Level[] = [kano1, kano2, kano3].map((d) => parseLevel(structuredClone(d)));
const [KURMI, KOFAR, DAWANAU] = LEVELS as [Level, Level, Level];
const KANO = withCoins(KANO_MISSIONS, (n) => LEVELS[n - 1]!.coins.length);
const def = (id: string): MissionDef => KANO.find((d) => d.id === `kano-${id}`)!;

function phone(): { get: () => Storage; data: Map<string, string> } {
  const data = new Map<string, string>();
  const s = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  } as unknown as Storage;
  return { get: () => s, data };
}

/** A go at `d` fed with `events` on `level`; returns the go and the kobo paid. */
function feed(d: MissionDef, level: Level, events: readonly RunEvent[], book = new MissionBook(createStore(phone().get))): { go: MissionGo; paid: number; book: MissionBook } {
  let paid = 0;
  const go = new MissionGo(d, d.at[0]!, book, (n) => (paid += n * STAR_KOBO));
  for (const e of events) go.tally(e, level);
  return { go, paid, book };
}

describe('KM1 to KM5: the five (kano.md 6.2)', () => {
  it('ids, names, places, card lines and stars as the table, easiest first, 14 stars', () => {
    expect(KANO.map((d) => d.id)).toEqual(['kano-coins', 'kano-wind', 'kano-bounce', 'kano-dust', 'kano-power']);
    expect(KANO.map((d) => d.name)).toEqual(['Coin catch', 'Ride the wind', 'Bounce high', 'Puff the dust', 'Power for the market']);
    expect(KANO.map((d) => d.line)).toEqual(['Catch coins on Kurmi!', 'Jump far with the wind!', 'Bounce on the springy cloth!', 'Puff the dust whirls!', 'Catch Power bulbs!']);
    expect(KANO.map((d) => d.places)).toEqual([['Kurmi'], ['Kurmi'], ['Kofar Mata'], ['Dawanau'], ['Harmattan Road']]);
    expect(KANO.map((d) => d.at)).toEqual([[1], [1], [2], [3], [LANE]]);
    expect(KANO.map((d) => d.stars)).toEqual([[60, 100, 135], [1, 2], [3, 5, 8], [1, 3, 5], [4, 8, 12]]);
    expect(KANO.reduce((n, d) => n + d.stars.length, 0)).toBe(14);
    for (const d of KANO) {
      expect(d.state).toBe('kano');
      expect(d.line.split(' ').length, d.line).toBeLessThanOrEqual(6);
    }
  });

  it('KM1 Coin catch: stars are 40, 65 and 85 percent of Kurmi\'s 160 laid coins', () => {
    expect(KURMI.coins.length).toBe(160);
    expect(def('coins').stars).toEqual([60, 100, 135]);
  });

  it('KM2 Ride the wind: Kurmi has two pits inside a tailwind, each with a kobo arc over it', () => {
    const pits = tailwindPits(KURMI);
    expect(pits).toEqual([[2700, 2800], [10400, 10460]]);
    for (const [a, b] of pits) expect(KURMI.coins.some((c) => arcOf({ type: 'kobo', x: c.x, y: c.y }, KURMI) === `arc${a}` && c.x >= a - 12 && c.x <= b + 12)).toBe(true);
  });

  it('KM2: a held running jump over each tailwind pit on the real Kurmi picks up its arc', () => {
    const run = new Run(KURMI);
    const arcs = new Set<string>();
    run.steer(1);
    for (const [a] of tailwindPits(KURMI)) {
      Object.assign(run.hero, { x: a - 420 });
      for (let i = 0; i < 2000 && run.hero.x < a - 40; i++) run.step(DT);
      run.press('t');
      for (let i = 0; i < 400 && !(run.hero.grounded && run.hero.x > a + 120); i++) {
        if (i === 18) run.release('t');
        for (const e of run.step(DT)) {
          const k = arcOf(e, KURMI);
          if (k) arcs.add(k);
        }
      }
    }
    expect([...arcs].sort()).toEqual(['arc10400', 'arc2700']);
  });

  it('KM2: each arc counts once; a kobo over a headwind pit or on the road counts nothing', () => {
    const over = (x: number): RunEvent => ({ type: 'kobo', x, y: 200 });
    const { go, paid } = feed(def('wind'), KURMI, [over(2750), over(2760), over(2770)]);
    expect(go.have).toBe(1);
    expect(paid).toBe(STAR_KOBO);
    expect(arcOf(over(6080), KURMI)).toBe(false); // the big pit, in no wind
    expect(arcOf({ type: 'kobo', x: 2750, y: 270 }, KURMI)).toBe(false); // low, not the arc
    go.tally(over(10430), KURMI);
    expect(go.stars).toBe(2);
    expect(go.next).toBeNull();
  });

  it('KM3 Bounce high: Kofar Mata has four frames; each bounce on the real street counts one', () => {
    expect(KOFAR.springs).toHaveLength(4);
    const run = new Run(KOFAR);
    const ev: RunEvent[] = [];
    for (const s of KOFAR.springs) {
      Object.assign(run.hero, { x: s.x + s.w / 2, y: 200, prevY: 200, vy: 0, grounded: false, airJump: true, coyote: 0 });
      for (let i = 0; i < 60 && !ev.some((e) => e.type === 'spring' && e.x === s.x); i++) ev.push(...run.step(DT));
    }
    const { go } = feed(def('bounce'), KOFAR, ev);
    expect(go.have).toBe(4);
    expect(go.stars).toBe(1);
    expect(isBounce({ type: 'bounce', kind: 'goat', x: 0, y: 0 })).toBe(false);
  });

  it('KM4 Puff the dust: Dawanau has at least 5 whirls; landing, fura and amala count, a pit or a ball does not', () => {
    expect(DAWANAU.hazards.filter((z) => z.kind === 'whirl').length).toBeGreaterThanOrEqual(5);
    const puff = (why: 'stomp' | 'fura' | 'amala' | 'fufu' | 'pit'): RunEvent => ({ type: 'whirlPuff', x: 0, why });
    expect(['stomp', 'fura', 'amala', 'fufu', 'pit'].map((w) => isPuff(puff(w as 'pit')))).toEqual([true, true, true, false, false]);
    const { go } = feed(def('dust'), DAWANAU, [puff('stomp'), puff('pit'), puff('fura'), puff('fufu'), puff('amala'), puff('stomp'), puff('stomp')]);
    expect(go.have).toBe(5);
    expect(go.stars).toBe(3);
  });

  it('KM4: landing on a whirl on the real Dawanau puffs it and counts', () => {
    const run = new Run(DAWANAU);
    const z = run.hazards.find((q) => q.kind === 'whirl')!;
    run.hero.x = z.x - 300;
    for (let i = 0; i < 300 && z.mode === 'wait'; i++) run.step(DT);
    const top = z.y - 50;
    Object.assign(run.hero, { x: z.x, y: top - 20, prevY: top - 20, vy: 200, grounded: false });
    const ev: RunEvent[] = [];
    for (let i = 0; i < 10 && z.mode !== 'puff'; i++) ev.push(...run.step(DT));
    expect(ev).toContainEqual(expect.objectContaining({ type: 'whirlPuff', why: 'stomp' }));
    expect(feed(def('dust'), DAWANAU, ev).go.have).toBe(1);
  });

  it('KM5 Power for the market: Harmattan Road lays 12 Power before the goal; the top star is 12', () => {
    const L = parseLane(structuredClone(kanoLane));
    const bulbs = L.pickups.filter((p) => p.kind === 'bulb' && p.d <= L.goal).length;
    const burst = L.things.filter((t) => t.d <= L.goal).reduce((n, t) => n + (L.pops[t.kind]?.power ?? 0), 0);
    expect(bulbs + burst).toBeGreaterThanOrEqual(def('power').stars.at(-1)!);
    expect(def('power').goal).toBe('bulbs');
  });

  it('Play goes to the mission\'s street, or the lane run (always open)', () => {
    const save = readMissions(null);
    expect(placeToPlay(def('bounce'), save, (n) => n <= 2)).toBe(2);
    expect(placeToPlay(def('dust'), save, (n) => n <= 2)).toBeNull();
    expect(placeToPlay(def('power'), save, (n) => n === LANE)).toBe(LANE);
  });
});

describe('Kano stars: saved, paid once, kept (MS-R1 to MS-R5)', () => {
  it('a star saves under gidi-missions, pays ₦2 once, and stays after a lost run and a reload', () => {
    const p = phone();
    const d = def('bounce');
    const spring: RunEvent = { type: 'spring', x: 1250 };
    const one = feed(d, KOFAR, [spring, spring, spring], new MissionBook(createStore(p.get)));
    expect(one.paid).toBe(STAR_KOBO);
    expect(JSON.parse(p.data.get('gidi-missions')!).stars).toEqual({ 'kano-bounce': 1 });
    one.go.end(); // out of lives: nothing goes away
    expect(BOARD_WORDS.got(one.go.won, one.go.stars, 3)).toBe('You got a star!');
    const book = new MissionBook(createStore(p.get));
    expect(book.stars(d.id)).toBe(1);
    expect(book.save.best[d.id]).toBe(3);
    // The same three again: nothing new, nothing paid.
    const two = feed(d, KOFAR, [spring, spring, spring], book);
    expect(two.paid).toBe(0);
    // Eight in one go: two new stars, ₦4.
    const three = feed(d, KOFAR, Array(8).fill(spring), book);
    expect(three.paid).toBe(2 * STAR_KOBO);
    expect(book.total(KANO)).toEqual([3, 14]);
  });

  it('"Every Kano star!" words', () => {
    expect(BOARD_WORDS.every('Kano')).toBe('Every Kano star!');
    expect(BOARD_WORDS.everyLine('Kano')).toBe('You are a Kano star helper.');
  });
});

describe('Kano\'s missions live in the Kano part', () => {
  it('src/worlds/kano/missions.ts takes only types from outside the folder', () => {
    const src = readFileSync(fileURLToPath(new URL('../../src/worlds/kano/missions.ts', import.meta.url)), 'utf8');
    for (const [, what, from] of src.matchAll(/^import (type )?[^;]*? from '([^']+)';/gm)) {
      if (!from!.startsWith('./')) expect(what, from).toBe('type ');
    }
  });

  it('the part hands its five and their pictures to the board', async () => {
    const { part } = await import('../../src/worlds/kano');
    expect(part.missions?.list).toBe(KANO_MISSIONS);
    expect(typeof part.missions?.icon).toBe('function');
  });
});
