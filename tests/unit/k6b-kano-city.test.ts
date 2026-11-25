/**
 * K6b (docs/kano.md 6.2 to 6.5; decisions 71, 80): Kano's city rules, its trays, its Booming
 * meter, its challenge road and Harmattan Road, with no page. Money adds up: nothing is lost or
 * made in any order of pays and collects; the wallet never goes below 0; a board never takes more
 * than its price; Kano's own part never holds money.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import * as LAGOS from '../../src/game/city';
import { markReached, meterOf } from '../../src/game/boom';
import { KANO, KANO_TRAYS, StateCity } from '../../src/game/states';
import { CityLife } from '../../src/game/cityLife';
import { WORDS } from '../../src/screens/words';
import { formatMoney, spokenMoney } from '../../src/game/money';
import { part as kanoPart } from '../../src/worlds/kano';
import * as R from '../../src/worlds/kano/cityRules';
import { KANO_CITY_WORDS as KW } from '../../src/worlds/kano/cityWords';
import { KANO_MATS } from '../../src/worlds/kano/cityScreen';
import { KANO_HOME, kanoPath, kanoWalkable, kanoNearest } from '../../src/worlds/kano/walk';
import { KANO_CITY_AREAS, KANO_SPOTS } from '../../src/worlds/kano/city';
import { KANO_STOP_BOX, kanoStops, type KanoRoadView } from '../../src/worlds/kano/roadPlan';
import type { StateProgress } from '../../src/game/progress';

const W0 = { kobo: 0, power: 0, tech: 0 };
const empty = (): R.KanoCityState => R.readKanoCity({});

describe('K6b: the Kano part copies only numbers it may not import (KN-R10), pinned to the first load', () => {
  it('W4 and W6 numbers and the Booming marks are Lagos\'s', () => {
    expect([R.TRAY_MIN, R.BOOM_BUILD, R.BOOM_COLLECT, R.COLLECT_MAX, R.FIRST_BOOM]).toEqual([LAGOS.TRAY_MIN, LAGOS.BOOM_BUILD, LAGOS.BOOM_COLLECT, LAGOS.COLLECT_MAX, LAGOS.FIRST_BOOM]);
    for (let p = 0; p < 400; p += 3) {
      expect(R.nextBoom(p)).toBe(LAGOS.nextBoom(p));
      expect(R.markReached(p)).toBe(markReached(p));
      for (const seen of [0, 20, 50, Infinity]) {
        const m = meterOf(p, seen);
        expect(R.meterOf(p, seen)).toEqual({ points: m.points, next: m.next, per: m.per, filled: m.filled });
      }
    }
  });
  it('the part\'s tax places are the first load\'s KANO_TRAYS (the trays fill before the part loads)', () => {
    for (const p of R.KANO_PLACE_LIST) {
      const t = R.KANO_TAX[p];
      expect(KANO_TRAYS[p]).toEqual([t.every, t.each, t.cap, t.needs ?? '']);
    }
    expect(Object.keys(KANO_TRAYS).sort()).toEqual([...R.KANO_PLACE_LIST].sort());
  });
  it('no file in the Kano folder imports a value from outside it', () => {
    for (const f of readdirSync('src/worlds/kano')) {
      const src = readFileSync(`src/worlds/kano/${f}`, 'utf8');
      for (const m of src.matchAll(/^(import|export)\s+(type\s+)?[^;]*?from\s+'([^']+)'/gm)) if (!m[3]!.startsWith('./')) expect(m[2], `${f}: ${m[3]}`).toBe('type ');
    }
  });
});

describe('K6b: 6.2 and 6.3 numbers', () => {
  it('prices: road ₦12, leather ₦6, lamps Power 8, mast Tech 6, dye ₦8, grain ₦8, pyramid ₦10', () => {
    expect(R.KANO_PRICES).toEqual({
      sandyRoad: { bucket: 'naira', price: 1200 },
      leather: { bucket: 'naira', price: 600 },
      lightsOut: { bucket: 'power', price: 8 },
      slowInternet: { bucket: 'tech', price: 6 },
      dye: { bucket: 'naira', price: 800 },
      grain: { bucket: 'naira', price: 800 },
      pyramid: { bucket: 'naira', price: 1000 },
    });
  });
  it('trays: 10 kobo / 8 s cap ₦1.20, 20 / 12 s cap ₦1.20, 30 / 15 s cap ₦2.40 (needs the road), pyramid 20 / 12 s cap ₦1.20', () => {
    expect(R.KANO_TAX).toEqual({
      leather: { every: 8, each: 10, cap: 120, needs: null },
      dye: { every: 12, each: 20, cap: 120, needs: null },
      grain: { every: 15, each: 30, cap: 240, needs: 'sandyRoad' },
      pyramid: { every: 12, each: 20, cap: 120, needs: null },
    });
    // W3: all of Kano's trays before the boom (₦4.80) are under half of a street win's prize top-up and a street's coins: under ₦5.
    const before = R.KANO_TAX.leather.cap + R.KANO_TAX.dye.cap + R.KANO_TAX.grain.cap;
    expect(before).toBe(480);
    expect(before).toBeLessThan(LAGOS.WIN_PRIZE);
  });
  it('6 places before the first boom make 24 points, so 20 is always reachable; Dry taps (the hall) earns none', () => {
    let c = empty();
    let w = { kobo: 1_000_000, power: 100, tech: 100 };
    const before = R.kanoBoards(c);
    expect(before).toEqual(['sandyRoad', 'leather', 'lightsOut', 'slowInternet', 'dye']);
    for (const b of ['sandyRoad', 'leather', 'lightsOut', 'slowInternet', 'dye', 'grain'] as const) {
      const r = R.payKanoBoard(c, w, b)!;
      expect(r.done).toBe(true);
      c = r.city;
      w = r.wallet;
    }
    expect(c.boom).toBe(24);
    expect(R.kanoBoomDue(c)).toBe(20);
    expect(R.kanoBoards(c)).toEqual([]);
    expect(R.kanoBoards({ ...c, boomSeen: 20 })).toEqual(['pyramid']);
    expect(R.kanoLooks(c, w, false).dryTaps).toBe('problem');
    expect(R.kanoLooks(c, w, true).dryTaps).toBe('fixed');
  });
  it('the grain market\'s board waits for the clean road, and its tray fills only then', () => {
    expect(R.kanoBoards(empty())).not.toContain('grain');
    expect(R.kanoBoards({ ...empty(), fixed: ['sandyRoad'] })).toContain('grain');
    const s = new StateCity(() => ({ built: ['grain'] }), () => undefined, KANO_TRAYS);
    s.tick(60);
    expect((s.own['trays'] as Record<string, number> | undefined)?.['grain'] ?? 0).toBe(0);
    s.set({ built: ['grain'], fixed: ['sandyRoad'] });
    s.tick(60);
    expect((s.own['trays'] as Record<string, number>)['grain']).toBe(120);
  });
});

describe('K6b: money adds up (decision 80; city.md W2 to W5)', () => {
  it('part pay: only the right bucket, the board keeps it, never more than the price', () => {
    const r = R.payKanoBoard(empty(), { kobo: 500, power: 3, tech: 9 }, 'sandyRoad')!;
    expect(r).toMatchObject({ amount: 500, left: 700, done: false });
    expect(r.wallet).toEqual({ kobo: 0, power: 3, tech: 9 });
    expect(R.leftOn(r.city, 'sandyRoad')).toBe(700);
    expect(R.payKanoBoard(r.city, r.wallet, 'sandyRoad')).toBeNull();
    const t = R.payKanoBoard(r.city, { kobo: 5000, power: 0, tech: 0 }, 'sandyRoad')!;
    expect(t).toMatchObject({ amount: 700, left: 0, done: true });
    expect(t.wallet.kobo).toBe(4300);
    expect(t.city.fixed).toEqual(['sandyRoad']);
    expect(t.city.paid).toEqual({});
    expect(R.payKanoBoard(empty(), { kobo: 999, power: 0, tech: 5 }, 'slowInternet')).toMatchObject({ amount: 5, left: 1, wallet: { kobo: 999, power: 0, tech: 0 } });
  });
  it('10 000 random pays, collects and fills: never below 0, never over a price, nothing lost or made', () => {
    let seed = 7;
    const rnd = (): number => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let run = 0; run < 20; run++) {
      let c = empty();
      let w = { kobo: Math.floor(rnd() * 3000), power: Math.floor(rnd() * 12), tech: Math.floor(rnd() * 8) };
      const start = { ...w };
      let earned = 0;
      for (let i = 0; i < 500; i++) {
        const k = rnd();
        if (k < 0.5) {
          const b = R.KANO_BOARDS[Math.floor(rnd() * R.KANO_BOARDS.length)]!;
          const r = R.payKanoBoard(c, w, b);
          if (r) {
            c = r.city;
            w = r.wallet;
          }
        } else if (k < 0.75) {
          const p = R.KANO_PLACE_LIST[Math.floor(rnd() * 4)]!;
          if (c.built.includes(p)) c = { ...c, trays: { ...c.trays, [p]: Math.min(R.KANO_TAX[p].cap, (c.trays[p] ?? 0) + 10 * Math.floor(rnd() * 6)) } };
        } else if (k < 0.9) {
          const p = R.KANO_PLACE_LIST[Math.floor(rnd() * 4)]!;
          const before = c.trays[p] ?? 0;
          const r = R.collectKanoTray(c, w, p);
          if (r) {
            expect(r.amount).toBe(before);
            earned += r.amount;
            c = r.city;
            w = r.wallet;
          }
        } else w = { ...w, kobo: w.kobo + 100, power: w.power + 1, tech: w.tech + 1 }, (start.kobo += 100, start.power += 1, start.tech += 1);
        expect(Math.min(w.kobo, w.power, w.tech)).toBeGreaterThanOrEqual(0);
        // What the wallet lost is exactly what the boards hold (paid in part or done).
        const spent = { naira: 0, power: 0, tech: 0 };
        for (const b of R.KANO_BOARDS) {
          const held = R.isDone(c, b) ? R.KANO_PRICES[b].price : (c.paid[b] ?? 0);
          expect(held).toBeLessThanOrEqual(R.KANO_PRICES[b].price);
          spent[R.KANO_PRICES[b].bucket] += held;
        }
        expect(w.kobo).toBe(start.kobo + earned - spent.naira);
        expect(w.power).toBe(start.power - spent.power);
        expect(w.tech).toBe(start.tech - spent.tech);
        // The own part as saved never holds money; reading it back gives the same city.
        const saved = R.writeKanoCity(c);
        for (const key of ['kobo', 'power', 'tech']) expect(saved).not.toHaveProperty(key);
        // (An empty tray reads back as no tray.)
        expect({ ...R.readKanoCity(saved), trays: {} }).toEqual({ ...c, trays: {} });
      }
    }
  });
  it('a full tray fills the meter by 1, at most 4 from collecting until the next mark', () => {
    let c: R.KanoCityState = { ...empty(), built: ['leather'], boom: 4 };
    for (let i = 0; i < 6; i++) c = R.collectKanoTray({ ...c, trays: { leather: 120 } }, W0, 'leather')!.city;
    expect(c.boom).toBe(8);
    expect(R.collectKanoTray({ ...c, trays: { leather: 9 } }, W0, 'leather')).toBeNull();
  });
  it('the trays fill in play time anywhere: Lagos\'s CityLife tick fills Kano\'s too; never money in Kano\'s part', () => {
    const k = new StateCity(() => ({ built: ['leather', 'dye'], kobo: 999 }), () => undefined, KANO_TRAYS);
    const life = new CityLife({ load: () => ({ kobo: 100 }), save: () => true });
    life.also = (dt) => void k.tick(dt);
    for (let i = 0; i < 100; i++) life.tick(1);
    expect(k.own['trays']).toEqual({ leather: 120, dye: 120 });
    expect(k.own).not.toHaveProperty('kobo');
    expect(life.state.kobo).toBe(100);
  });
});

describe('K6b: bright areas (decision 47)', () => {
  it('each fix lights its own area; the steps light from the middle out, never a problem\'s own area; the boom lights the rest', () => {
    expect(R.kanoBright(empty())).toEqual([]);
    expect(R.kanoBright({ ...empty(), fixed: ['sandyRoad'], boom: 4 })).toEqual(expect.arrayContaining(['gate', 'r2c1', 'motorPark']));
    const all = { ...empty(), boom: 20, boomSeen: 20 };
    const lit = R.kanoBright(all);
    for (const a of ['gate', 'market', 'r2c3', 'r0c3']) expect(lit).not.toContain(a);
    expect(R.kanoBright(all, true)).toContain('r0c3');
    expect(lit.length).toBe(KANO_CITY_AREAS.length - 4);
    for (const a of R.KANO_STEP_ORDER) expect(Object.values(R.KANO_SPOT_AREA)).not.toContain(a);
  });
});

describe('K6b: walking Kano from above', () => {
  it('the motor park, every mat and every pin can be walked to', () => {
    expect(kanoWalkable(KANO_HOME)).toBe(true);
    for (const [b, m] of Object.entries(KANO_MATS)) {
      expect(kanoWalkable(m), b).toBe(true);
      expect(kanoPath(KANO_HOME, m).at(-1), b).toEqual(m);
    }
    for (const s of Object.values(KANO_SPOTS)) expect(kanoPath(KANO_HOME, kanoNearest(s.pin)).length).toBeGreaterThan(0);
  });
  it('nobody walks into a dye yard (KN-R4) or onto the savanna past the wall', () => {
    expect(kanoWalkable({ x: 640, y: 230 })).toBe(false);
    expect(kanoWalkable({ x: 800, y: 50 })).toBe(false);
    expect(kanoWalkable({ x: 800, y: 995 })).toBe(false);
  });
});

describe('K6b: words (6.2 to 6.4, 8; W18 with Kano\'s names)', () => {
  it('cards, boards, the built lines, the tax lines and the boom', () => {
    expect(KW.cards.sandyRoad).toEqual({ line1: "Sand is on the road. Carts can't get through.", line2: 'Run Kurmi to earn Naira.', go: 'Run Kurmi' });
    expect(KW.board).toEqual({ sandyRoad: 'Clean road', leather: 'Leather stalls', lightsOut: 'Lamps', slowInternet: 'Mast', dye: 'Dye pits', grain: 'Grain market', pyramid: 'Groundnut pyramid' });
    expect(WORDS.city.collectLine(formatMoney(120), KW.placeName.leather)).toBe('The leather stalls paid ₦1.20 tax!');
    expect(WORDS.city.collectLine(formatMoney(240), KW.placeName.grain)).toBe('The grain market paid ₦2.40 tax!');
    expect(KW.hintTax).toBe('Busy shops pay a small tax. Kano uses it to fix more.');
    expect(KW.boom).toEqual({ heading: 'Kano is booming!', body: 'New shops are opening. More traders are coming to Kano.', cog: "Kano's cog is turning on Nigeria's wheel!", go: 'See Kano' });
    expect(KW.built.pyramid).toBe('The groundnut pyramid is back! Long ago, Kano piled sacks as tall as hills.');
    expect(KW.dryTaps.clear).toBe('Clear Kurmi, Kofar Mata and Dawanau to reach Borehole Hall.');
    expect(KW.earnLane('tech')).toBe('Run the Harmattan Road to earn Tech.');
    expect(JSON.stringify(KW)).not.toMatch(/Lagos uses|Ogun uses|Ota\b|Expressway/);
    expect(kanoPart.words?.laneHome).toBe('Back to Kano');
  });
});

describe('K6b: Kano\'s challenge road (6.4)', () => {
  const prog = (n: number, hall = false): StateProgress => ({ streets: Object.fromEntries([1, 2, 3].filter((k) => k <= n).map((k) => [String(k), { done: true, best: 500 }])), parcel: false, hall: { done: hall, best: 0 } });
  const view = (n: number, c = empty(), hall = false): KanoRoadView => ({ words: WORDS, money: (k) => formatMoney(k), spoken: spokenMoney, kano: prog(n, hall), city: c, wallet: W0, lane: { best: 0, goals: 0 } });
  it('stops in road order, plates in KANO_STOP_BOX; To Ogun is a link; the way on cannot be played', () => {
    const st = kanoStops(view(0));
    expect(st.map((s) => s.id)).toEqual(['toOgun', 'kurmi', 'lane', 'kofarMata', 'dawanau', 'hall', 'wayOn']);
    for (const s of st) expect(KANO_STOP_BOX[String(s.id)]).toBeTruthy();
    expect(st[0]).toMatchObject({ go: 'Go to Ogun', forFix: null });
    expect(st.at(-1)).toMatchObject({ state: 'soon', go: null, status: 'Coming soon', lines: ['More of Nigeria', 'Coming soon'] });
  });
  it('Kurmi always, then each street after the one before, Borehole Hall after Dawanau; Kurmi pays for the clean road', () => {
    const st = (n: number) => Object.fromEntries(kanoStops(view(n)).map((s) => [s.id, s]));
    expect([st(0)['kurmi']!.state, st(0)['kofarMata']!.state, st(0)['hall']!.state]).toEqual(['next', 'locked', 'locked']);
    expect(st(0)['kurmi']!.forFix).toBe('sandyRoad');
    expect(st(0)['kurmi']!.lines[1]).toBe('A win pays for the Clean road (₦12).');
    expect(st(1)['kofarMata']!.state).toBe('next');
    expect(st(3)['hall']).toMatchObject({ state: 'next', go: 'Go to Borehole Hall', lines: ['The taps are dry. Rusty Borehole is clogged with dust.', 'A win brings ₦15 and gets the water flowing.'] });
    expect(kanoStops(view(1, { ...empty(), fixed: ['sandyRoad'] }))[1]!.forFix).toBeNull();
  });
  it('Harmattan Road is always open and pays for the lamps, then the mast', () => {
    const lane = (c: R.KanoCityState) => kanoStops(view(0, c)).find((s) => s.id === 'lane')!;
    expect(lane(empty())).toMatchObject({ state: 'open', forFix: 'lightsOut', go: 'Run the Harmattan Road' });
    expect(lane({ ...empty(), fixed: ['lightsOut'] }).forFix).toBe('slowInternet');
    expect(lane({ ...empty(), fixed: ['lightsOut', 'slowInternet'] }).forFix).toBeNull();
  });
});

describe('K6b: the Kano part gives the city, the road and Harmattan Road', () => {
  it('city, road, lane (kano-lane.json, theme harmattan, a look made from the lane pieces) and what is left on a spot', () => {
    expect(typeof kanoPart.city).toBe('function');
    expect(typeof kanoPart.road).toBe('function');
    expect((kanoPart.lane!.level as { theme: string }).theme).toBe('harmattan');
    expect(typeof kanoPart.lane!.look).toBe('function');
    expect(kanoPart.lane!.forFix({}, W0)).toEqual({ fix: 'lightsOut', bucket: 'power', left: 8 });
    expect(kanoPart.lane!.forFix({ fixed: ['lightsOut'] }, W0)).toEqual({ fix: 'slowInternet', bucket: 'tech', left: 6 });
    expect(kanoPart.left!({ paid: { sandyRoad: 200 } }, 'sandyRoad')).toBe(1000);
    expect(kanoPart.left!({}, 'potholes')).toBe(0);
    expect(KANO).toBe('kano');
  });
});
