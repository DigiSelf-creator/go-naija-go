/**
 * O0a1 to O0a3: the Ogun street files against docs/ogun.md 3.3 (mud, rocks, water, cracks, gravel,
 * two roads), 3.4 (Ota), 3.5 (Abeokuta), 3.6 (Sagamu), 3.7 (the well room) and 3.8 (new fields).
 * The S2.6 rules every street keeps run in street.test.ts (all three are in its STREETS list).
 */
import { describe, expect, it } from 'vitest';
import ogun1 from '../../src/data/levels/ogun-1.json';
import ogun2 from '../../src/data/levels/ogun-2.json';
import ogun3 from '../../src/data/levels/ogun-3.json';
import ogunWell from '../../src/data/levels/ogun-well.json';
import { parseLevel } from '../../src/game/level';
import { RULES, STEPS_PER_SECOND } from '../../src/game/run';
import { parseRoom } from '../../src/game/well';
import { SHORT_AT, SHORT_TOAST, hintWords } from '../../src/screens/words';
import { OGUN_WORDS } from '../../src/worlds/ogun/partWords';
import { OGUN_FOODS, playableOgun } from './ogun-level-data';

type Raw = typeof ogun1 & { mud: number[][]; arch?: number; cracks?: number[][]; rocks?: number[][]; waterPits?: number[] };
type Span = { a: number; b: number; w: number };

const OTA = ogun1 as Raw;
const ABEOKUTA = ogun2 as unknown as Raw;
const SAGAMU = ogun3 as unknown as Raw;

/** One street read the way the rules see it. A crack is a pit too once it opens (ogun.md 3.3). */
function shape(raw: Raw) {
  const L = parseLevel(playableOgun(raw));
  const pits: Span[] = L.ground.slice(1).map((s, i) => ({ a: L.ground[i]![1], b: s[0], w: s[0] - L.ground[i]![1] }));
  const big = pits.filter((p) => p.w >= 160 && p.w <= 180);
  const cracks: Span[] = (raw.cracks ?? []).map(([x, w]) => ({ a: x!, b: x! + w!, w: w! }));
  const holes = [...pits, ...cracks].sort((p, q) => p.a - q.a);
  const onRoad = (x: number): boolean => L.ground.some(([a, b]) => x >= a && x <= b);
  const nearest = (x: number, list: Span[] = holes): number => Math.min(...list.map((p) => (x < p.a ? p.a - x : x > p.b ? x - p.b : 0)));
  const mud: Span[] = raw.mud.map(([x, w]) => ({ a: x!, b: x! + w!, w: w! }));
  const ogunFoods = raw.foods.filter((f) => OGUN_FOODS.includes(String(f[2]))).map((f) => ({ x: Number(f[0]), kind: String(f[2]) }));
  const corns = [...L.foods.filter((f) => f.kind === 'corn').map((f) => f.x), ...L.crates.filter((c) => c.contents === 'corn').map((c) => c.x)];
  const reach = (RULES.cornSteps / STEPS_PER_SECOND) * L.cornSpeed;
  const hintBefore = (x: number) => L.hints.filter((h) => h.x < x).at(-1);
  // The file's own hazards (O4b: the parsed level reads gravel as gravel too).
  const hazards = raw.hazards.map(([kind, x]) => ({ kind: String(kind), x: Number(x) }));
  return { L, pits, big, cracks, holes, onRoad, nearest, mud, ogunFoods, corns, reach, hintBefore, hazards };
}

const STREETS = [
  { raw: OTA, key: 'ota' as const },
  { raw: ABEOKUTA, key: 'abeokuta' as const },
  { raw: SAGAMU, key: 'sagamu' as const },
];

describe.each(STREETS)('ogun.md 3.3, every Ogun street: $raw.id', ({ raw, key }) => {
  const { L, big, cracks, holes, nearest, mud, ogunFoods, corns, reach, onRoad } = shape(raw);

  it('cracks: 40 or 60 wide, inside one stretch of road (60 u from its ends), in order', () => {
    for (const c of cracks) {
      expect([40, 60], `crack at ${c.a}`).toContain(c.w);
      expect(L.ground.some(([a, b]) => c.a >= a + 60 && c.b <= b - 60), `crack at ${c.a}`).toBe(true);
    }
    for (let i = 1; i < cracks.length; i++) expect(cracks[i]!.a).toBeGreaterThan(cracks[i - 1]!.b);
  });

  it('cracks: none within 300 u of the spawn, the bus stop or an exit well (Gentle opens them at 300 u)', () => {
    const spots = [L.spawnX, L.checkpoint, ...L.wells.map((w) => w.exitX)];
    for (const c of cracks) for (const x of spots) expect(x < c.a - 300 || x > c.b + 300, `crack at ${c.a}, spot ${x}`).toBe(true);
  });

  it('cracks: none in a big pit run-up, none in a corn reach, at least 200 u from any other hole', () => {
    for (const c of cracks) {
      for (const p of big) expect(c.b <= p.a - 160 || c.a >= p.b, `crack at ${c.a}, big pit at ${p.a}`).toBe(true);
      for (const k of corns) expect(c.a >= k && c.a <= k + reach, `crack at ${c.a}, corn at ${k}`).toBe(false);
      const others = holes.filter((h) => h.a !== c.a);
      expect(nearest(c.a, others), `crack at ${c.a}`).toBeGreaterThanOrEqual(200);
      expect(nearest(c.b, others), `crack at ${c.a}`).toBeGreaterThanOrEqual(200);
    }
  });

  it('cracks count as holes for the S2.6 rules: hazards 200 u away, foods and food crates 300 u, crates and wells 60 u', () => {
    for (const z of L.hazards) expect(nearest(z.x), `${z.kind} at ${z.x}`).toBeGreaterThanOrEqual(200);
    for (const f of L.foods) expect(nearest(f.x), `${f.kind} at ${f.x}`).toBeGreaterThanOrEqual(300);
    for (const c of L.crates.filter((q) => q.contents !== 'kobo')) expect(nearest(c.x), `crate at ${c.x}`).toBeGreaterThanOrEqual(300);
    for (const c of L.crates) expect(nearest(c.x), `crate at ${c.x}`).toBeGreaterThanOrEqual(60);
    for (const w of L.wells) for (const x of [w.x, w.exitX]) expect(nearest(x), `well at ${x}`).toBeGreaterThanOrEqual(60);
  });

  it('wells: to the Ijebu garri store, clear of mud and cracks, no hazard within 200 u of the way down', () => {
    for (const w of L.wells) {
      expect(w.room).toBe('ogun-well');
      expect(w.x).toBeLessThan(w.exitX);
      expect(w.exitX).toBeLessThan(L.checkpoint);
      for (const x of [w.x, w.exitX]) for (const c of [...cracks, ...mud]) expect(x < c.a - 100 || x > c.b + 100, `well at ${x}`).toBe(true);
      for (const z of L.hazards) expect(Math.abs(z.x - w.x), `${z.kind} at ${z.x}`).toBeGreaterThanOrEqual(200);
    }
  });

  it('mud: 80 to 200 wide, on solid road, in order and apart', () => {
    for (const m of mud) {
      expect(m.w, `mud at ${m.a}`).toBeGreaterThanOrEqual(80);
      expect(m.w, `mud at ${m.a}`).toBeLessThanOrEqual(200);
      expect(L.ground.some(([a, b]) => m.a >= a && m.b <= b), `mud at ${m.a} is on one stretch of road`).toBe(true);
    }
    for (let i = 1; i < mud.length; i++) expect(mud[i]!.a).toBeGreaterThan(mud[i - 1]!.b);
  });

  it('mud ends at least 60 u before any pit or crack lip (take-off is always on firm ground)', () => {
    for (const m of mud) for (const p of holes) if (p.a >= m.b) expect(p.a - m.b, `mud at ${m.a}, hole at ${p.a}`).toBeGreaterThanOrEqual(60);
    for (const m of mud) for (const p of holes) expect(m.b <= p.a || m.a >= p.b, `mud at ${m.a}, hole at ${p.a}`).toBe(true);
  });

  it('no mud in a big pit run-up, and at least 300 u of firm road from mud to a big pit', () => {
    for (const p of big) for (const m of mud) if (m.a < p.a) expect(p.a - m.b, `mud at ${m.a}, big pit at ${p.a}`).toBeGreaterThanOrEqual(300);
  });

  it('no mud within 100 u of the spawn, the bus stop, a well or the bus door', () => {
    const spots = [L.spawnX, L.checkpoint, L.end!.x, ...L.wells.flatMap((w) => [w.x, w.exitX])];
    for (const m of mud) for (const x of spots) expect(x < m.a - 100 || x > m.b + 100, `mud at ${m.a}, spot ${x}`).toBe(true);
  });

  it('Ogun foods keep the S2.6 food rules: on the road, 300 u from a pit or crack, not in a big pit run-up', () => {
    for (const f of ogunFoods) {
      expect(onRoad(f.x)).toBe(true);
      expect(nearest(f.x), `${f.kind} at ${f.x}`).toBeGreaterThanOrEqual(300);
      for (const p of big) expect(f.x > p.a - 160 && f.x <= p.a, `${f.kind} at ${f.x}`).toBe(false);
    }
  });

  it('mud in a corn fast stretch is fine, but no pit or crack lip is near it', () => {
    for (const c of corns) for (const m of mud) if (m.a >= c && m.a <= c + reach) expect(nearest(m.a)).toBeGreaterThanOrEqual(200);
  });

  it('hints are the words list, 35 characters or fewer for touch and keys', () => {
    expect(L.hints.map((h) => h.words)).toEqual(OGUN_WORDS.hints[key]);
    for (const h of L.hints) for (const kind of ['touch', 'keys'] as const) expect(hintWords(h.words, kind).length, h.words).toBeLessThanOrEqual(35);
  });
});

describe('ogun.md 3.4: Ota', () => {
  const raw = OTA;
  const { L, pits, big, nearest, onRoad, mud, ogunFoods, hintBefore } = shape(raw);

  it('is an Ogun street with the 3.4 numbers', () => {
    expect(raw).toMatchObject({ state: 'ogun', street: 1, name: 'Ota', theme: 'gateway' });
    expect(L.end!.x - L.spawnX).toBe(11320);
    expect(L.wells).toEqual([]);
    expect(raw.mud).toHaveLength(6);
    expect(raw.cracks ?? []).toEqual([]);
    expect(L.hazards).toHaveLength(6);
    expect(L.hazards.every((z) => z.kind === 'goat' || z.kind === 'tyre')).toBe(true);
  });

  it('teaches mud alone: a hint names it first, and no hazard or pit near the first mud', () => {
    const first = mud[0]!;
    const hint = hintBefore(first.a);
    expect(hint?.words).toMatch(/mud/i);
    expect(first.a - hint!.x).toBeLessThanOrEqual(200);
    for (const z of L.hazards) expect(Math.abs(z.x - first.a), `${z.kind} at ${z.x}`).toBeGreaterThan(600);
    expect(nearest(first.a)).toBeGreaterThanOrEqual(200);
    expect(nearest(first.b)).toBeGreaterThanOrEqual(200);
    // The big pit comes after the bus stop, with mud before it (3.2: "1 (after mud)").
    expect(big).toHaveLength(1);
    expect(mud.some((m) => m.b < big[0]!.a && m.a > L.checkpoint)).toBe(true);
  });

  it('ikokore comes before mud it helps with, after its own hint', () => {
    const iko = ogunFoods.find((f) => f.kind === 'ikokore')!;
    expect(iko).toBeDefined();
    expect(hintBefore(iko.x)?.words).toMatch(/ikokore/i);
    // Ikokore lasts 12 s: at least one mud patch starts within a walk of 12 s (90 u/s) after it.
    expect(mud.some((m) => m.a > iko.x && m.a - iko.x <= 12 * L.walkSpeed)).toBe(true);
    // The first ikokore comes after the player has met mud without it.
    expect(mud[0]!.a).toBeLessThan(iko.x);
  });

  it('the arch stands near the start, before the first pit, on the road', () => {
    expect(raw.arch).toBeGreaterThan(L.spawnX);
    expect(raw.arch!).toBeLessThan(pits[0]!.a);
    expect(onRoad(raw.arch!)).toBe(true);
  });
});

describe('ogun.md 3.5: Abeokuta', () => {
  const raw = ABEOKUTA;
  const { L, pits, big, cracks, onRoad, mud, ogunFoods, hintBefore } = shape(raw);
  const rocks = raw.rocks!.map(([x, w, h]) => ({ a: x!, b: x! + w!, h: h! }));

  it('is an Ogun street with the 3.5 numbers', () => {
    expect(raw).toMatchObject({ state: 'ogun', street: 2, name: 'Abeokuta', theme: 'adire' });
    expect(L.end!.x - L.spawnX).toBe(11720);
    expect(raw.arch).toBeUndefined();
    expect(mud).toHaveLength(1);
    expect(cracks).toHaveLength(6);
    expect(big).toHaveLength(1);
    expect(L.hazards).toHaveLength(5);
    expect(L.hazards.every((z) => z.kind === 'goat' || z.kind === 'tyre')).toBe(true);
    expect(L.checkpoint).toBe(4900);
  });

  it('rock steps: 150 u high at most, each at most 150 u above the one below, rising from the road', () => {
    const hint = hintBefore(rocks[0]!.a)!;
    expect(hint.words).toMatch(/rock/i);
    expect(rocks[0]!.a - hint.x).toBeLessThanOrEqual(200);
    let below = 0;
    let lastEnd = -Infinity;
    for (const r of rocks) {
      expect(r.h, `rock at ${r.a}`).toBeGreaterThan(0);
      expect(r.h, `rock at ${r.a}`).toBeLessThanOrEqual(150);
      // A step close to the one before climbs from it; a rock on its own climbs from the road.
      const from = r.a - lastEnd <= 60 ? below : 0;
      expect(r.h - from, `rock at ${r.a}`).toBeLessThanOrEqual(150);
      expect(onRoad(r.a), `rock at ${r.a} rises from the road`).toBe(true);
      below = r.h;
      lastEnd = r.b;
    }
    // The first steps teach: the first is a tap or hold from the road, then each one a tap or hold higher.
    expect(rocks[0]!.h).toBeLessThanOrEqual(100);
    for (let i = 1; i < 3; i++) expect(rocks[i]!.h - rocks[i - 1]!.h).toBeLessThanOrEqual(100);
  });

  it('the long ledge spans the wide pothole: over the rock, or double jump the hole', () => {
    const ledge = rocks.find((r) => r.b - r.a >= 200)!;
    const under = pits.find((p) => p.a > ledge.a && p.b < ledge.b)!;
    expect(under.w).toBeGreaterThanOrEqual(90);
    expect(under.w).toBeLessThanOrEqual(110);
    expect(ledge.h).toBeLessThanOrEqual(100);
  });

  it('water potholes: each is the left lip of an ordinary pothole (not a big pit), after their hint', () => {
    const water = raw.waterPits!;
    expect(water.length).toBeGreaterThan(0);
    for (const x of water) {
      const p = pits.find((q) => q.a === x);
      expect(p, `water pit at ${x}`).toBeDefined();
      expect(p!.w).toBeLessThan(160);
    }
    const hint = hintBefore(water[0]!)!;
    expect(hint.words).toMatch(/water/i);
    expect(water[0]! - hint.x).toBeLessThanOrEqual(200);
  });

  it('teaches cracks alone: after the bus stop, a hint names them first, no hazard near the first, kobo over it', () => {
    const first = cracks[0]!;
    expect(first.a).toBeGreaterThan(L.checkpoint);
    const hint = hintBefore(first.a)!;
    expect(hint.words).toMatch(/crack/i);
    expect(first.a - hint.x).toBeLessThanOrEqual(240);
    for (const z of L.hazards) expect(Math.abs(z.x - first.a), `${z.kind} at ${z.x}`).toBeGreaterThan(600);
    expect(L.coins.some((k) => k.x >= first.a && k.x <= first.b && k.y < 250)).toBe(true);
  });

  it('ofada comes after cracks met without it, after its own hint, with a crack within its 12 s', () => {
    const ofada = ogunFoods.find((f) => f.kind === 'ofada')!;
    expect(ofada).toBeDefined();
    const hint = hintBefore(ofada.x)!;
    expect(hint.words).toMatch(/ofada/i);
    expect(ofada.x - hint.x).toBeLessThanOrEqual(200);
    expect(cracks[0]!.a).toBeLessThan(ofada.x);
    expect(cracks.some((c) => c.a > ofada.x && c.a - ofada.x <= 12 * L.walkSpeed)).toBe(true);
  });

  it('one well, in a quiet yard before the bus stop (the shared block checks the rest)', () => {
    expect(L.wells).toEqual([{ x: 3500, exitX: 4700, room: 'ogun-well' }]);
  });
});

describe('ogun.md 3.6: Sagamu', () => {
  const raw = SAGAMU;
  const { L, big, cracks, mud, ogunFoods, corns, reach, hintBefore, hazards } = shape(raw);
  const gravel = hazards.filter((z) => z.kind === 'gravel');
  const plats = [...L.terrain.platforms].sort((p, q) => p.x - q.x);
  const deck = plats.find((p) => p.w >= 800)!;
  const deckAt = plats.indexOf(deck);
  const ups = plats.slice(0, deckAt).filter((p) => p.x >= deck.x - 300);
  const downs = plats.slice(deckAt + 1).filter((p) => p.x <= deck.x + deck.w + 300);

  it('is an Ogun street with the 3.6 numbers', () => {
    expect(raw).toMatchObject({ state: 'ogun', street: 3, name: 'Sagamu', theme: 'interchange' });
    expect(L.end!.x - L.spawnX).toBe(12120);
    expect(raw.arch).toBeUndefined();
    expect(raw.rocks).toBeUndefined();
    expect(mud).toHaveLength(4);
    expect(cracks).toHaveLength(2);
    expect(big).toHaveLength(2);
    expect(hazards).toHaveLength(10);
    expect(gravel).toHaveLength(6);
    expect(hazards.every((z) => ['goat', 'tyre', 'gravel'].includes(z.kind))).toBe(true);
    expect((raw.hazardSpeeds as Record<string, number>)['gravel']).toBe(70);
    expect(L.checkpoint).toBe(5500);
  });

  it('teaches gravel alone: the hint names it first, no other hazard within 600 u of the first', () => {
    const first = gravel[0]!;
    expect(hazards[0]).toEqual(first);
    const hint = hintBefore(first.x)!;
    expect(hint.words).toMatch(/gravel/i);
    expect(first.x - hint.x).toBeLessThanOrEqual(400);
    for (const z of hazards) if (z !== first) expect(Math.abs(z.x - first.x), `${z.kind} at ${z.x}`).toBeGreaterThanOrEqual(600);
  });

  it('gravel keeps the tyre rules: never in a corn fast stretch (S2.2 hazard rule 3)', () => {
    for (const c of corns) for (const z of gravel) expect(z.x - c >= 0 && z.x - c <= reach / 2, `gravel at ${z.x}, corn at ${c}`).toBe(false);
  });

  it('two roads: steps up (a tap or hold each), a long deck 140 high with no gaps, steps down', () => {
    const hint = hintBefore(ups[0]!.x)!;
    expect(hint.words).toMatch(/two roads/i);
    expect(L.groundY - deck.y).toBe(140);
    expect(ups.map((p) => L.groundY - p.y)).toEqual([60, 120]);
    expect(downs.map((p) => L.groundY - p.y)).toEqual([100, 50]);
    let below = L.groundY;
    let end = -Infinity;
    for (const p of [...ups, deck]) {
      expect(below - p.y, `step at ${p.x}`).toBeLessThanOrEqual(100);
      if (end > -Infinity) expect(p.x - end, `step at ${p.x}`).toBeLessThanOrEqual(60);
      below = p.y;
      end = p.x + p.w;
    }
    for (const p of downs) {
      expect(p.x - end, `step at ${p.x}`).toBeLessThanOrEqual(60);
      end = p.x + p.w;
    }
    // The deck has no gaps: one platform, all on solid road under it.
    expect(L.ground.some(([a, b]) => deck.x >= a && deck.x + deck.w <= b)).toBe(true);
  });

  it('two roads: fufu and kobo on top; mud, gravel and the secret well underneath; both roads reach the bus stop', () => {
    const top = { a: deck.x, b: deck.x + deck.w };
    const fufu = L.foods.find((f) => f.kind === 'fufu')!;
    expect(fufu.x).toBeGreaterThan(top.a);
    expect(fufu.x).toBeLessThan(top.b);
    expect(fufu.y).toBe(deck.y - 28);
    expect(L.coins.filter((k) => k.x > top.a && k.x < top.b && k.y === deck.y - 24).length).toBeGreaterThanOrEqual(10);
    expect(mud.some((m) => m.a > top.a && m.b < top.b)).toBe(true);
    expect(gravel.some((z) => z.x > top.a && z.x < top.b)).toBe(true);
    expect(L.wells).toHaveLength(1);
    const w = L.wells[0]!;
    expect(w.x > top.a && w.x < top.b, 'the secret well is under the deck').toBe(true);
    expect(w.exitX).toBeGreaterThan(downs.at(-1)!.x + downs.at(-1)!.w);
    expect(downs.at(-1)!.x + downs.at(-1)!.w).toBeLessThan(L.checkpoint);
    expect(L.hints.some((h) => /well/i.test(h.words)), 'a secret well has no hint').toBe(false);
  });

  it('one big pit comes after mud, with 300 u of firm road; ikokore before that mud', () => {
    const afterMud = big.filter((p) => mud.some((m) => m.b <= p.a && p.a - m.b <= 400));
    expect(afterMud).toHaveLength(1);
    const iko = ogunFoods.find((f) => f.kind === 'ikokore')!;
    const m = mud.find((q) => q.b <= afterMud[0]!.a && afterMud[0]!.a - q.b <= 400)!;
    expect(iko.x).toBeLessThan(m.a);
    expect(m.a - iko.x).toBeLessThanOrEqual(12 * L.walkSpeed);
  });
});


describe('ogun.md 3.7: the Ijebu garri store (ogun-well)', () => {
  const room = parseRoom(structuredClone(ogunWell));
  const shelves = [...room.terrain.platforms].sort((p, q) => p.x - q.x);

  it('reads as a room with the S2.5 shape: 17 kobo, a kobo crate, the parcel on the middle shelf', () => {
    expect(room).toMatchObject({ id: 'ogun-well', width: 560, leftLimit: 30, rightLimit: 530, entryX: 60, exitX: 500, groundY: 300 });
    const inCrates = room.crates.filter((c) => c.contents === 'kobo').length * 3;
    expect(room.coins.length + inCrates).toBe(17);
    expect(shelves).toHaveLength(3);
    const mid = shelves[1]!;
    expect(room.gift).toEqual({ x: mid.x + mid.w / 2, y: mid.y - 24, kind: 'parcel' });
    expect(room.giftIfCarried).toEqual({ x: room.gift.x, y: room.gift.y, count: 5 });
  });

  it('shelves: each a tap or hold (100 u at most) from the floor, inside the walls', () => {
    for (const p of shelves) {
      expect(room.groundY - p.y).toBeLessThanOrEqual(100);
      expect(p.x).toBeGreaterThanOrEqual(room.leftLimit);
      expect(p.x + p.w).toBeLessThanOrEqual(room.rightLimit);
    }
  });

  it('the keeper (back wall, x 60 to 100) is well away from the rope; his words and the toast', () => {
    expect(room.exitX - 100).toBeGreaterThanOrEqual(240);
    expect(OGUN_WORDS.folk.storeKeeper).toBe('For Pothole Hall. Go well!');
    expect(OGUN_WORDS.toast.parcel).toBe('Ijebu garri parcel! Shield for the hall.');
  });

  it('every kobo inside the walls, none inside the crate', () => {
    for (const k of room.coins) {
      expect(k.x).toBeGreaterThanOrEqual(room.leftLimit);
      expect(k.x).toBeLessThanOrEqual(room.rightLimit);
    }
    for (const c of room.crates) for (const k of room.coins) expect(k.x >= c.x - 16 && k.x <= c.x + 16 && k.y >= c.bottomY - 28 && k.y <= c.bottomY).toBe(false);
  });
});

describe('Ogun words (O0a1)', () => {
  it('every hint for the three streets is 35 characters or fewer', () => {
    for (const list of Object.values(OGUN_WORDS.hints)) for (const w of list) expect(w.length, w).toBeLessThanOrEqual(35);
  });

  it('every toast over 35 characters has short words of 35 or fewer', () => {
    const toasts = [...Object.values(OGUN_WORDS.toast), OGUN_WORDS.hall.parcelShield, OGUN_WORDS.hall.start, OGUN_WORDS.hall.pickUp, OGUN_WORDS.hall.jumpOver,
      OGUN_WORDS.hall.cross, OGUN_WORDS.hall.smooth, OGUN_WORDS.hall.open, OGUN_WORDS.hall.plop(2), OGUN_WORDS.hall.plop(1)];
    for (const t of toasts) {
      if (t.length <= SHORT_AT) continue;
      expect(SHORT_TOAST[t], t).toBeDefined();
      expect(SHORT_TOAST[t]!.length).toBeLessThanOrEqual(SHORT_AT);
    }
  });

  it('one download size everywhere: about 80 KB (OG-R6)', () => {
    expect(OGUN_WORDS.download.line1).toBe('Ogun is ready to download (about 80 KB).');
  });

  it('keeps decisions 76 and 77: "Ota", never "Sango"; the rock is never named; nothing religious', () => {
    const all = JSON.stringify(OGUN_WORDS, (_k, v: unknown) => (typeof v === 'function' ? String((v as (...a: number[]) => string)(2, 1 as never)) : v));
    expect(OGUN_WORDS.streets).toEqual(['Ota', 'Abeokuta', 'Sagamu']);
    expect(all).not.toMatch(/sango|olumo|orisha|shrine|god\b|pray|church|mosque/i);
    expect(JSON.stringify([ogun1, ogun2, ogun3, ogunWell])).not.toMatch(/sango|olumo|orisha|shrine/i);
  });

  it('Win and plop words read right', () => {
    expect(OGUN_WORDS.hall.plop(2)).toBe('Plop! 2 more bags.');
    expect(OGUN_WORDS.hall.plop(1)).toBe('Plop! 1 more bag.');
    expect(OGUN_WORDS.travel.spoken('Lagos', 20, true, false)).toBe('Lagos. Booming 20 of 20. Cog turning.');
    expect(OGUN_WORDS.travel.spoken('Ogun', 4, false, true)).toBe('Ogun. Booming 4 of 20. You are here.');
    expect(OGUN_WORDS.travel.booming(20, true)).toBe('Booming: 20 of 20 ✓');
  });
});
