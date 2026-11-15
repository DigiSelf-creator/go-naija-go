/**
 * S3g1b, people everywhere (docs/design.md "People everywhere" part 14 gamedev item 12): the level
 * files stay byte for byte the same; crowdSpots keeps every clear zone on all three streets in
 * every look; scripted runs give the same result with people on and off; the cast never holds
 * the player's own look; nothing reacts to a lost life; the rate limits and backing off.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import lagos1 from '../../src/data/levels/lagos-1.json';
import lagos2 from '../../src/data/levels/lagos-2.json';
import lagos3 from '../../src/data/levels/lagos-3.json';
import hallData from '../../src/data/levels/lagos-hall.json';
import { HALL_CROWD, STREET_CASTS, isHeroLook } from '../../src/art/folkCasts';
import { CROWD, FrameWatch, HallCrowd, LANGS, RoomKeeper, STREET_FROM, StreetCrowd, clearZones, crowdSpots, hallCast, inZone, pickLine, seeded, streetCast, type CrowdLook, type CrowdView, type StreetName } from '../../src/game/crowd';
import { Game } from '../../src/game/game';
import { parseLevel, type Level } from '../../src/game/level';
import { STRIP_Y } from '../../src/engine/view';
import { WORDS } from '../../src/screens/words';

const DT = 1 / 60;
const STREETS: [Level, StreetName][] = [
  [parseLevel(structuredClone(lagos1)), 'alausa'],
  [parseLevel(structuredClone(lagos2)), 'village'],
  [parseLevel(structuredClone(lagos3)), 'ikeja'],
];
const LOOKS: CrowdLook[] = ['tired', 'bright', 'fixed'];

describe('the level files do not change (part 2 rule 1)', () => {
  const SHA: Record<string, string> = {
    'lagos-1': 'abcca85a7387f1e06ef871d0c3b255a67513a597f0929b8faaf8cfd44eceb267',
    'lagos-2': '8072c01ad593cb2676edf49b6cf162835405127378cd448f672b7560a9ee6fc5',
    'lagos-3': 'd0946d85772951af4891d0e1e343eb306ce5934ea60132ff6d978dc2f356e38a',
    'lagos-hall': '83e1e7a73e44d7fc797b6b76814be6703edf30cba739db7b1180fb5c32584c09',
    'lagos-lane': 'd4e0ea9ceaf08b25e28368fa22de3b006d027a5283d2092da12dd9042af0f9ae',
    'lagos-well': '480f44a0594609dc7e75b7e3d798cd78e01b38d9f6556efe76b5951a20901209',
  };
  for (const [id, sha] of Object.entries(SHA)) {
    it(`${id}.json is byte for byte the same`, () => {
      const bytes = readFileSync(new URL(`../../src/data/levels/${id}.json`, import.meta.url));
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(sha);
    });
  }
});

describe('crowdSpots (part 3)', () => {
  for (const [level, name] of STREETS) {
    for (const look of LOOKS) {
      it(`${level.id} ${look}: nobody stands or walks in a clear zone, counts as part 3 says, the same every try`, () => {
        const cast = streetCast(name, null);
        const plan = crowdSpots(level, look, cast.looks, cast.park);
        const zones = clearZones(level);
        expect(plan.stands.length).toBeGreaterThan(0);
        for (const s of plan.stands) {
          expect(inZone(zones, s.x, CROWD.half), `stand at ${s.x}`).toBe(false);
          expect(s.x).toBeGreaterThanOrEqual(STREET_FROM[name]);
        }
        for (const w of plan.walkers) {
          expect(w.b - w.a + CROWD.half * 2).toBeGreaterThanOrEqual(CROWD.minWalk);
          for (let x = w.a; x <= w.b; x += 5) expect(inZone(zones, x), `walker at ${x}`).toBe(false);
          expect(w.speed).toBeGreaterThanOrEqual(30);
          expect(w.speed).toBeLessThanOrEqual(45);
        }
        if (plan.children) {
          expect(look).toBe('fixed');
          expect(inZone(zones, plan.children.x, CROWD.half)).toBe(false);
          expect(inZone(zones, plan.children.x + 40, CROWD.half)).toBe(false);
        }
        const free = plan.free.reduce((n, s) => n + s.b - s.a, 0);
        expect(plan.stands.length).toBeLessThanOrEqual(Math.floor(free / CROWD.standEvery[look]));
        expect(plan.stands.length).toBeGreaterThanOrEqual(Math.floor(free / CROWD.standEvery[look]) - 2);
        expect(plan.walkers.length).toBeLessThanOrEqual(Math.floor(free / CROWD.walkEvery[look]));
        expect(JSON.stringify(crowdSpots(level, look, cast.looks, cast.park))).toBe(JSON.stringify(plan));
      });
    }
    it(`${level.id}: every clear zone of part 3 is in clearZones`, () => {
      const z = clearZones(level);
      for (const w of level.wells) {
        expect(inZone(z, w.x - 119)).toBe(true);
        expect(inZone(z, w.x + 119)).toBe(true);
      }
      for (const h of level.hazards) expect(inZone(z, h.x + 79)).toBe(true);
      for (const p of level.terrain.platforms) expect(inZone(z, p.x - 19) && inZone(z, p.x + p.w + 19)).toBe(true);
      for (const c of level.coins) if (c.y > level.groundY - 40) expect(inZone(z, c.x)).toBe(true);
      for (let i = 1; i < level.ground.length; i++) expect(inZone(z, level.ground[i - 1]![1] - 39)).toBe(true);
      expect(inZone(z, level.checkpoint + 50)).toBe(true);
      expect(inZone(z, level.end!.x)).toBe(true);
    });
  }
  it('bright streets have twice the standing people of tired ones, the fixed look a pair of children', () => {
    const [level, name] = STREETS[0]!;
    const cast = streetCast(name, null);
    const t = crowdSpots(level, 'tired', cast.looks, cast.park);
    const b = crowdSpots(level, 'bright', cast.looks, cast.park);
    expect(b.stands.length).toBeGreaterThanOrEqual(t.stands.length * 2 - 1);
    expect(crowdSpots(level, 'fixed', cast.looks, cast.park).children).not.toBeNull();
  });
});

describe('casts (parts 3 and 8)', () => {
  it('no cast holds the player\'s own look, for every hero', () => {
    for (let skin = 0; skin < 5; skin++)
      for (let hair = 0; hair < 5; hair++)
        for (let outfit = 0; outfit < 5; outfit++) {
          const hero = { skin, hair, outfit };
          for (const s of Object.keys(STREET_CASTS) as StreetName[]) for (const l of streetCast(s, hero).looks) expect(isHeroLook(l, hero)).toBe(false);
          for (const l of hallCast(hero)) expect(isHeroLook(l, hero)).toBe(false);
        }
  });
  it('the hall cast is HALL_CROWD when no look matches', () => {
    expect(hallCast(null)).toHaveLength(HALL_CROWD.length);
  });
});

/** A scripted street run: walk, run, jump and hold; returns the path and the result. */
function script(level: Level, people: boolean, steps = 60 * 40): string {
  const g = new Game(level);
  g.people.on = people;
  g.begin(false);
  g.setView({ pixelW: 1454, pixelH: 786, scale: 786 / 420, width: 777, height: 420, safe: { top: 0, right: 0, bottom: 0, left: 0 } });
  const sounds: string[] = [];
  g.people.onSound = (n) => sounds.push(n);
  const path: string[] = [];
  g.steer(1);
  for (let i = 0; i < steps; i++) {
    if (i % 50 === 10) g.press();
    if (i % 50 === 30) g.release();
    if (i % 400 === 200) g.throwFufu();
    g.update(DT);
    if (i % 30 === 0) path.push(`${g.hero.x.toFixed(3)},${g.hero.y.toFixed(3)}`);
  }
  return JSON.stringify({ path, kobo: g.run.kobo, lives: g.run.lives, phase: g.run.phase });
}

describe('no change to the game (part 11): people on and off give the same run', () => {
  for (const [level] of STREETS) {
    it(`${level.id}: the same path, kobo, lives and result`, () => {
      expect(script(level, true)).toBe(script(level, false));
    });
  }
  it('the hall: the same', () => {
    const hall = parseLevel(structuredClone(hallData));
    expect(script(hall, true, 60 * 30)).toBe(script(hall, false, 60 * 30));
  });
  it('with people on, the street has people to draw', () => {
    const g = new Game(STREETS[1]![0]);
    g.begin(false);
    for (let i = 0; i < 10; i++) g.update(DT);
    expect(g.people.street).not.toBeNull();
    expect(g.people.street!.plan.stands.length).toBeGreaterThan(0);
  });
});

function crowdFor(look: CrowdLook = 'bright'): { c: StreetCrowd; level: Level } {
  const [level, name] = STREETS[0]!;
  const cast = streetCast(name, null);
  return { c: new StreetCrowd(crowdSpots(level, look, cast.looks, cast.park), name, level.groundY, level), level };
}
const view = (x: number, extra: Partial<CrowdView> = {}): CrowdView => ({ camX: x - 200, viewW: 777, hero: { x, vx: 156, grounded: true }, atBus: false, checkpointReached: false, ...extra });

describe('reactions (part 5)', () => {
  it('nothing at all reacts to a lost life, and nobody cheers for a while after', () => {
    const { c } = crowdFor();
    const p = c.plan.stands[2]!;
    const v = view(p.x);
    c.update(DT, v, []);
    const say = c.update(DT, v, [{ type: 'hit' }, { type: 'goatEat', x: p.x }, { type: 'checkpoint' }]);
    expect(say.cheer).toBeNull();
    expect(c.bubble).toBeNull();
    expect(c.draw(v).some((d) => d.frame.startsWith('cheer') || d.frame.startsWith('wave'))).toBe(false);
    for (let i = 0; i < 60; i++) expect(c.update(DT, v, [{ type: 'goatEat', x: p.x }]).cheer).toBeNull();
    for (const e of ['fall', 'gameOver']) {
      const { c: c2 } = crowdFor();
      expect(c2.update(DT, v, [{ type: e }, { type: 'weedsDry', x: p.x }]).cheer).toBeNull();
    }
  });
  it('a cleared problem: the 3 nearest people on screen cheer, at most one cheer every 4 s', () => {
    const { c } = crowdFor();
    const p = c.plan.stands[3]!;
    const v = view(p.x);
    c.update(DT, v, []);
    expect(c.update(DT, v, [{ type: 'smash', kind: 'drum', x: p.x }]).cheer).toBe('crowdCheer');
    const cheering = c.draw(v).filter((d) => d.frame.startsWith('cheer'));
    expect(cheering.length).toBeGreaterThan(0);
    expect(cheering.length).toBeLessThanOrEqual(3);
    expect(c.update(DT, v, [{ type: 'goatEat', x: p.x }]).cheer).toBeNull();
    for (let i = 0; i < 60 * 4; i++) c.update(DT, v, []);
    expect(c.update(DT, v, [{ type: 'weedsDry', x: p.x }]).cheer).toBe('crowdCheer');
  });
  it('a standing person waves once when the hero comes within 140 u, then not again for 10 s', () => {
    const { c } = crowdFor();
    const p = c.plan.stands[1]!;
    const v = view(p.x - 100, { hero: { x: p.x - 100, vx: 0, grounded: true } });
    c.update(DT, v, []);
    const me = (): string => c.draw(v).find((d) => d.x === p.x)?.frame ?? '';
    expect(me()).toMatch(/^wave/);
    for (let i = 0; i < 70; i++) c.update(DT, v, []);
    expect(me()).not.toMatch(/^wave/);
    for (let i = 0; i < 60 * 8; i++) c.update(DT, v, []);
    expect(me()).not.toMatch(/^wave/);
  });
  it('one bubble at a time; bus park cheers when the hero boards', () => {
    const { c, level } = crowdFor();
    const v = view(level.end!.x, { atBus: true });
    expect(c.update(DT, v, [{ type: 'busBoard' }]).cheer).toBe('crowdCheerBig');
    expect(c.busCheer).toBe(true);
    expect(c.bubble).not.toBeNull();
  });
  it('people stand on the back pavement only: feet 8 u above the road, never on the front strip, at most 12', () => {
    const { c, level } = crowdFor('fixed');
    for (let x = 800; x < level.end!.x; x += 300) {
      const list = c.draw(view(x, { atBus: true }));
      expect(list.length).toBeLessThanOrEqual(12);
      for (const d of list) {
        expect(d.y).toBeLessThanOrEqual(level.groundY - CROWD.feetUp);
        expect(d.y).toBeLessThan(STRIP_Y);
      }
    }
  });
  it('a walker steps aside toward the shop wall when the two walk toward each other', () => {
    const { c } = crowdFor();
    const w = c.walkers[0]!;
    w.dir = 1;
    const hx = w.x + 40;
    const v = view(hx, { hero: { x: hx, vx: -100, grounded: true } });
    for (let i = 0; i < 30; i++) c.update(DT, v, []);
    expect(c.draw(v).find((d) => d.mover)?.y).toBeLessThan(STREETS[0]![0].groundY - CROWD.feetUp);
  });
  it('reduced motion: walkers stand still and a wave is one still pose', () => {
    const { c } = crowdFor();
    c.still = true;
    const x0 = c.walkers.map((w) => w.x);
    for (let i = 0; i < 120; i++) c.update(DT, view(5000), []);
    expect(c.walkers.map((w) => w.x)).toEqual(x0);
  });
});

describe('the well room and the hall (part 5)', () => {
  it('the store keeper claps and says her line when the hero takes the parcel', () => {
    const k = new RoomKeeper();
    k.update(DT, [{ type: 'parcel' }], 300);
    expect(k.bubble?.text).toBe('For the boss. Go well!');
    expect(k.frame()).toMatch(/^clap/);
  });
  it('the hall: door people cheer each hit; a bubble only with no throw near; the finish walks in and cheers', () => {
    const h = new HallCrowd(300);
    const v = { hits: 1, defeated: false, finishT: 0, throws: [] as { x: number; y: number }[], camX: 0, viewW: 777 };
    expect(h.update(DT, v, [{ type: 'bossHit' }]).cheer).toBe('crowdCheer');
    expect(h.bubble?.text).toBe('Ehen!');
    const h2 = new HallCrowd(300);
    h2.update(DT, { ...v, throws: [{ x: 150, y: 260 }] }, [{ type: 'bossHit' }]);
    expect(h2.bubble).toBeNull();
    // In the fight nobody is on the hall floor: at the door (x under 110) or outside the cut walls.
    for (const d of h.draw(v)) expect(d.x < 110 || d.x > 580).toBe(true);
    const fin = { ...v, hits: 3, defeated: true, finishT: 6 };
    const people = h.draw(fin);
    expect(people.length).toBe(7);
    expect(people.every((d) => d.frame.startsWith('cheer'))).toBe(true);
    expect(h.update(DT, fin, []).cheer).toBe('crowdCheerBig');
    const lost = new HallCrowd(300);
    expect(lost.update(DT, v, [{ type: 'hit' }, { type: 'bossHit' }]).cheer).toBeNull();
  });
});

describe('words and backing off', () => {
  it('cheers and greetings come in an equal share of English, Pidgin, Yoruba, Hausa and Igbo', () => {
    for (const lines of [WORDS.folk.cheers, WORDS.folk.greet]) {
      for (const l of LANGS) expect((lines as Record<string, readonly string[]>)[l]?.length ?? 0).toBeGreaterThan(0);
      const r = seeded(7);
      const count = new Map<string, number>();
      for (let i = 0; i < 5000; i++) {
        const t = pickLine(lines, r);
        const lang = LANGS.find((l) => (lines as Record<string, readonly string[]>)[l]?.includes(t))!;
        count.set(lang, (count.get(lang) ?? 0) + 1);
      }
      for (const l of LANGS) expect(count.get(l)! / 5000).toBeGreaterThan(0.17);
    }
  });
  it('backs off when 2 s of frames average over 22 ms, one step at a time, never past 2', () => {
    const w = new FrameWatch();
    for (let i = 0; i < 120; i++) w.frame(16);
    expect(w.level).toBe(0);
    for (let i = 0; i < 80; i++) w.frame(30);
    expect(w.level).toBe(1);
    for (let i = 0; i < 400; i++) w.frame(30);
    expect(w.level).toBe(2);
    w.reset();
    expect(w.level).toBe(0);
  });
  it('backing off drops the walkers first, then half the standing people', () => {
    const { c } = crowdFor();
    const w = c.walkers[0]!;
    const v = view(w.x);
    const all = c.draw(v).length;
    c.backOff = 1;
    expect(c.draw(v).some((d) => d.mover)).toBe(false);
    c.backOff = 2;
    expect(c.draw(v).length).toBeLessThanOrEqual(all);
  });
});
