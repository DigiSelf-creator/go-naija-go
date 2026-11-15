/**
 * S3e1b: the challenge road (docs/design.md S3e0). stopCards() for a new save, an old
 * Streets-screen save, each fix order and a broken save; every word of the stop card; the
 * scale rule; and W17 C: the first screen's look is scenery only (a scripted Alausa run is the
 * same tired and bright), and the level files do not change.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import lagos1 from '../../src/data/levels/lagos-1.json';
import { FIRST_SCREEN, firstStreetOf } from '../../src/art/firstLook';
import { fitView } from '../../src/engine/view';
import { emptyCity, readCity, type CityState } from '../../src/game/city';
import { Game } from '../../src/game/game';
import { parseLevel } from '../../src/game/level';
import { readState, type StateProgress } from '../../src/game/progress';
import * as ART from '../../src/art/road';
import { CUTS, ROAD_ORDER, STOP_BOX, STOP_PAYS_FIX, openingStop, roadScale, stopCards, type RoadView, type StopInfo } from '../../src/screens/road';
import { recorder } from './recorder';

const names = ['Alausa', 'Computer Village', 'Ikeja'];
const view = (o: { lagos?: object; city?: Partial<CityState>; lane?: { best: number; goals: number } } = {}): RoadView => ({
  lagos: readState(o.lagos ?? {}) as StateProgress,
  names,
  city: { ...emptyCity(), ...o.city },
  lane: o.lane ?? { best: 0, goals: 0 },
});
const byId = (s: StopInfo[]): Record<string, StopInfo> => Object.fromEntries(s.map((x) => [String(x.id), x]));

describe('stopCards (S3e0 parts 2, 3, 5 and 9)', () => {
  it('CR-Q1 is built on answer a', () => {
    expect(STOP_PAYS_FIX).toBe(true);
  });

  it('a new save: Alausa Next, the Lane run open, the rest locked, the ferry 5 fixes off', () => {
    const s = stopCards(view());
    expect(s.map((x) => x.id)).toEqual(ROAD_ORDER);
    expect(s.map((x) => [x.name, x.state, x.status, x.line3])).toEqual([
      ['Alausa', 'next', 'Ready to play', null],
      ['Lane run', 'open', 'Ready to play', null],
      ['Computer Village', 'locked', 'Locked', null],
      ['Ikeja', 'locked', 'Locked', null],
      ['Go-Slow Hall', 'locked', 'Locked', null],
      ['Ferry', 'soon', 'Coming soon', 'Fixes to go: 5'],
    ]);
    expect(s.map((x) => x.spoken)).toEqual([
      'Stop 1, Alausa. Next. Ready to play.',
      'Side road, Lane run. Ready to play.',
      'Stop 2, Computer Village. Locked. Finish Alausa first.',
      'Stop 3, Ikeja. Locked. Finish Computer Village first.',
      'Stop 4, Go-Slow Hall. Locked. Finish Ikeja first.',
      'Ferry. Coming soon. Fixes to go: 5.',
    ]);
    const c = byId(s);
    expect([c['0']!.heading, c['0']!.label, c['0']!.lines, c['0']!.go, c['0']!.forFix]).toEqual(['Stop 1', 'Stop 1: Alausa', ['Potholes on this road.', 'A win pays for the New road (₦10).'], 'Run Alausa', 'road']);
    expect([c['lane']!.label, c['lane']!.lines, c['lane']!.go, c['lane']!.forFix, c['lane']!.cut]).toEqual(['Side road: Lane run', ['Lamps are out here.', 'A win pays for the Lamps (Power 10).'], 'Lane run', 'lamps', 'ikeja']);
    expect([c['1']!.lines, c['1']!.go, c['1']!.forFix]).toEqual([['The internet is slow here.', 'Finish Alausa first.'], null, null]);
    expect([c['2']!.lines, c['2']!.go]).toEqual([['Lamps are out here.', 'Finish Computer Village first.'], null]);
    expect([c['hall']!.label, c['hall']!.lines, c['hall']!.go]).toEqual(['Stop 4: Go-Slow Hall', ['General Go-Slow is jamming the hall.', 'Finish Ikeja first.'], null]);
    expect([c['ferry']!.label, c['ferry']!.lines, c['ferry']!.go]).toEqual(['The ferry', ['A ferry jetty is coming to this shore.', 'It is built when Lagos booms: 0 of 20.'], null]);
  });

  it('an old Streets-screen save (streets 1 and 2 done, bests, a parcel, a lane best) opens the same', () => {
    const s = byId(stopCards(view({ lagos: { streets: { 1: { done: true, best: 870 }, 2: { done: true, best: 90 } }, parcel: true }, city: { boom: 9 }, lane: { best: 840, goals: 1 } })));
    expect([s['0']!.state, s['0']!.status, s['0']!.line3, s['0']!.spoken]).toEqual(['done', 'Done ✓', 'Best: ₦8.70', 'Stop 1, Alausa. Done. Best 8 naira 70 kobo.']);
    expect([s['1']!.state, s['1']!.line3]).toEqual(['done', 'Best: 90 kobo']);
    expect([s['2']!.state, s['2']!.go, s['2']!.lines]).toEqual(['next', 'Run Ikeja', ['Lamps are out here.', 'Earns Naira. Power comes from the Lane run.']]);
    expect(s['2']!.spoken).toBe('Stop 3, Ikeja. Next. Ready to play.');
    expect([s['hall']!.state, s['hall']!.parcel, s['hall']!.spoken]).toEqual(['locked', true, 'Stop 4, Go-Slow Hall. Locked. Finish Ikeja first. You have a garri parcel.']);
    expect([s['lane']!.state, s['lane']!.line3, s['lane']!.spoken]).toEqual(['done', 'Best: 840 m', 'Side road, Lane run. Done. Best 840 metres.']);
    expect(s['lane']!.lines[2]).toBe('Your best: 840 m');
    expect(s['0']!.lines).toEqual(['Potholes on this road.', 'A win pays for the New road (₦10).', 'Your best: ₦8.70']);
    expect([s['ferry']!.line3, s['ferry']!.lines[1]]).toEqual(['Fixes to go: 3', 'It is built when Lagos booms: 9 of 20.']);
  });

  it('only one Next; none once every main stop is done; the lane run is never Next', () => {
    const all = { streets: { 1: { done: true }, 2: { done: true }, 3: { done: true } }, hall: { done: true, best: 0 } };
    expect(stopCards(view()).filter((x) => x.state === 'next')).toHaveLength(1);
    const s = byId(stopCards(view({ lagos: all })));
    expect(Object.values(s).filter((x) => x.state === 'next')).toHaveLength(0);
    expect([s['hall']!.status, s['hall']!.line3, s['hall']!.lines, s['hall']!.go]).toEqual(['Done ✓', null, ['The hall is moving. Lagos is switched on.', 'A win brings ₦15 for Lagos.'], 'Go to Go-Slow Hall']);
    const open = byId(stopCards(view({ lagos: { streets: { 1: { done: true }, 2: { done: true }, 3: { done: true } }, parcel: true } })));
    expect([open['hall']!.state, open['hall']!.lines]).toEqual(['next', ['General Go-Slow is jamming the hall.', 'A win brings ₦15 and switches Lagos on.', 'You have a garri parcel.']]);
  });

  it('part paid: what is still to pay; built: what the stop earns, and a win is for nothing', () => {
    const part = byId(stopCards(view({ city: { paid: { potholes: 400, lightsOut: 6 } } })));
    expect(part['0']!.lines[1]).toBe('A win pays for the New road (₦6 left).');
    expect(part['lane']!.lines[1]).toBe('A win pays for the Lamps (Power 4 left).');
    const built = byId(stopCards(view({ city: { fixed: ['potholes'] }, lagos: { streets: { 1: { done: true, best: 870 } } } })));
    expect([built['0']!.lines, built['0']!.forFix]).toEqual([['New road here. Buses are moving again.', 'Earns Naira for Lagos.', 'Your best: ₦8.70'], null]);
  });

  it('each fix order: the lane run is for the Lamps, then the Mast, then nothing; the cut follows', () => {
    const lamps = byId(stopCards(view({ city: { fixed: ['lightsOut'] }, lagos: { streets: { 1: { done: true }, 2: { done: true } } } })));
    expect([lamps['lane']!.forFix, lamps['lane']!.cut, lamps['lane']!.lines[0], lamps['lane']!.lines[1]]).toEqual(['mast', 'cv', 'The internet is slow here.', 'A win pays for the Mast (Tech 6).']);
    expect(lamps['2']!.lines.slice(0, 2)).toEqual(['The lamps are on. The street is awake.', 'Earns Naira for Lagos.']);
    const mast = byId(stopCards(view({ city: { fixed: ['slowInternet'] }, lagos: { streets: { 1: { done: true } } } })));
    expect([mast['lane']!.forFix, mast['lane']!.cut]).toEqual(['lamps', 'ikeja']);
    expect(mast['1']!.lines.slice(0, 2)).toEqual(['Fast internet here. Shops are busy.', 'Earns Naira for Lagos.']);
    const both = byId(stopCards(view({ city: { fixed: ['lightsOut', 'slowInternet'] } })));
    expect([both['lane']!.forFix, both['lane']!.cut, both['lane']!.lines]).toEqual([null, 'ikeja', ['Lamps on and fast internet here.', 'Earns Naira, Power and Tech.']]);
  });

  it('"See the stop" from the Slow internet card plays for the Mast, even with the Lamps not built', () => {
    const s = byId(stopCards(view(), 'mast'));
    expect([s['lane']!.forFix, s['lane']!.cut, s['lane']!.lines[1]]).toEqual(['mast', 'cv', 'A win pays for the Mast (Tech 6).']);
  });

  it('the ferry after the first boom; fixes to go is at least 1 until then', () => {
    expect(byId(stopCards(view({ city: { boom: 19 } })))['ferry']!.line3).toBe('Fixes to go: 1');
    const f = byId(stopCards(view({ city: { boom: 20, boomSeen: 20 } })))['ferry']!;
    expect([f.state, f.status, f.line3, f.spoken, f.lines]).toEqual(['built', 'Built ✓', 'More soon', 'Ferry. Built. More stops coming soon.', ['The jetty is built. The ferry is here!', 'New stops over the water are coming soon.']]);
  });

  it('a broken save shows every stop as a new player sees it', () => {
    const broken = stopCards({ lagos: readState('nonsense'), names, city: readCity(42), lane: { best: 0, goals: 0 } });
    expect(broken).toEqual(stopCards(view()));
  });

  it('every card line is 44 characters or fewer, and no problem line names a place', () => {
    const saves = [view(), view({ city: { paid: { potholes: 1 } } }), view({ lagos: { streets: { 1: { done: true, best: 123456 }, 2: { done: true }, 3: { done: true } }, parcel: true }, lane: { best: 12345, goals: 3 } })];
    for (const v of saves)
      for (const s of stopCards(v))
        for (const l of s.lines) {
          expect(l.length, l).toBeLessThanOrEqual(44);
          if (/out|slow|Potholes|jamming/.test(l)) for (const n of [...names, 'Lagos']) expect(l).not.toContain(n);
        }
  });

  it('the opening stop: the one asked for, else Next, else the start', () => {
    const s = stopCards(view());
    expect(openingStop(s, 'lane')!.id).toBe('lane');
    expect(openingStop(s, null)!.id).toBe(0);
    const all = stopCards(view({ lagos: { streets: { 1: { done: true }, 2: { done: true }, 3: { done: true } }, hall: { done: true, best: 0 } } }));
    expect(openingStop(all, undefined)).toBeNull();
  });
});

describe('the road layout (S3e0 part 4)', () => {
  it.each([
    // [screen w, h, s]: open width = w - 16, open height = h - 68 (the top row and the edges).
    [320, 240, 1],
    [568, 320, 1],
    [851, 393, 835 / 680],
    [851 - 88, 393, (851 - 88 - 16) / 680],
    [1920, 1080, 2],
  ])('%i x %i: s = %f', (w, h, s) => {
    expect(roadScale(w - 16, h - 68)).toBeCloseTo(s, 5);
  });

  it('the stop boxes are 112 x 64; the side road sits in the gap between Alausa and Computer Village', () => {
    for (const id of ROAD_ORDER) expect(STOP_BOX[id].slice(2)).toEqual([112, 64]);
    expect(STOP_BOX[0][0] + 112).toBe(120);
    expect(STOP_BOX[1][0]).toBe(144);
    for (const id of ROAD_ORDER) expect(STOP_BOX[id][0] + 112).toBeLessThanOrEqual(680);
  });

  it("the boxes and cuts are art's (src/art/road.ts), in the same road order", () => {
    const ids = ['alausa', 'lane', 'computerVillage', 'ikeja', 'hall', 'ferry'] as const;
    expect(ART.ROAD_STOPS).toEqual(ids);
    ROAD_ORDER.forEach((id, i) => expect(STOP_BOX[id]).toEqual(Object.values(ART.STOP_BOX[ids[i]!])));
    expect(Object.values(CUTS).map((c) => [...c])).toEqual(Object.values(ART.CARD_CUTS).map((c) => Object.values(c)));
  });
});

describe('W17 C: the first screen is scenery only (S3e0 part 6)', () => {
  const L1 = parseLevel(structuredClone(lagos1));
  /** A scripted Alausa run: run right, jump now and then (some held), drawn every frame. */
  function scripted(bright: boolean | null): string[] {
    const game = new Game(L1);
    game.begin(false, L1);
    game.firstLook = bright === null ? null : { street: 'alausa', look: bright ? 'bright' : 'tired' };
    const v = fitView(320, 240, 1);
    game.setView(v);
    const out: string[] = [];
    game.steer(1);
    for (let f = 0; f < 1500; f++) {
      if (f % 75 === 10) game.press();
      if (f % 75 === (f % 150 < 75 ? 14 : 30)) game.release();
      game.update(1 / 60);
      if (f % 4 === 0) game.render(recorder().g, v);
      const r = game.run;
      out.push(`${game.hero.x.toFixed(4)},${game.hero.y.toFixed(4)},${r.kobo},${r.lives},${r.phase}`);
    }
    return out;
  }

  it('the same hero path, kobo and lives tired, bright and with no look at all', { timeout: 30_000 }, () => {
    const tired = scripted(false);
    expect(scripted(true)).toEqual(tired);
    expect(scripted(null)).toEqual(tired);
    // It really ran: past the stretch, with jumps.
    expect(Number(tired.at(-1)!.split(',')[0])).toBeGreaterThan(FIRST_SCREEN.alausa.to);
    // Coins taken and a life lost on the way: kobo and lives really change.
    expect(new Set(tired.map((l) => l.split(',').slice(2).join())).size).toBeGreaterThan(5);
  });

  it('each street run reads its first screen; the sign reads the street name', () => {
    expect(['lagos-1', 'lagos-2', 'lagos-3', 'lagos-hall', 'lagos-lane'].map(firstStreetOf)).toEqual(['alausa', 'computerVillage', 'ikeja', null, null]);
    const game = new Game(L1);
    game.begin(false, L1);
    game.firstLook = { street: 'alausa', look: 'tired' };
    const v = fitView(320, 240, 1);
    game.setView(v);
    const r = recorder();
    game.render(r.g, v);
    expect(r.texts).toContain('Alausa');
    expect(r.bad).toEqual([]);
  });

  it('the level files are unchanged', () => {
    const sha = (f: string): string => createHash('sha256').update(JSON.stringify(JSON.parse(readFileSync(new URL(`../../src/data/levels/${f}`, import.meta.url), 'utf8')))).digest('hex').slice(0, 16);
    expect(['lagos-1.json', 'lagos-2.json', 'lagos-3.json'].map(sha)).toEqual(LEVEL_SHAS);
  });
});

/** The level files' content as it was before S3e1b (sha256 of the parsed JSON, first 16 hex). */
const LEVEL_SHAS = ['795f90aca57529e1', 'df4da3c2a0525a4e', 'd40b7ac6146a2321'];
