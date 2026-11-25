/**
 * K0a: the Kano level files against docs/kano.md 3.3 (wind, springy cloth, dust whirls, sack
 * steps), 3.4 (Kurmi), 3.5 (Kofar Mata), 3.6 (Dawanau), 3.7 (the groundnut store), 3.8 (new
 * fields), 4.1 (kilishi and fura da nono), 5.2 to 5.5 (Borehole Hall), 6.2 (the KM mission tops)
 * and 6.5 (Harmattan Road). The S2.6 rules every street keeps run in street.test.ts (all three
 * Kano streets are in its STREETS list, read through playableKano).
 */
import { describe, expect, it } from 'vitest';
import kano1 from '../../src/data/levels/kano-1.json';
import kano2 from '../../src/data/levels/kano-2.json';
import kano3 from '../../src/data/levels/kano-3.json';
import kanoWell from '../../src/data/levels/kano-well.json';
import kanoHall from '../../src/data/levels/kano-hall.json';
import kanoLaneRaw from '../../src/data/levels/kano-lane.json';
import ogunLaneRaw from '../../src/data/levels/ogun-lane.json';
import lagosHall from '../../src/data/levels/lagos-hall.json';
import { PHYSICS } from '../../src/engine/physics';
import { parseLevel } from '../../src/game/level';
import { RULES, STEPS_PER_SECOND } from '../../src/game/run';
import { parseRoom } from '../../src/game/well';
import { checkChunk, checkFair, chunkRows, freeLanes, isDodge, parseLane, rowsOf, timeTo } from '../../src/lane/level';
import { SHORT_AT, SHORT_TOAST, hintWords } from '../../src/screens/words';
import { formatMoney } from '../../src/game/money';
import { KANO_WORDS } from '../../src/worlds/kano/words';
import { KANO_FOODS, playableKano } from './kano-level-data';

type Raw = typeof kano1 & { springs?: number[][]; sacks?: number[][]; gate?: number; wind?: (number | string)[][] };
type Span = { a: number; b: number; w: number };

const KURMI = kano1 as Raw;
const KOFAR_MATA = kano2 as unknown as Raw;
const DAWANAU = kano3 as unknown as Raw;

/** kano.md 3.3: a springy cloth frame is 30 u high and bounces at vy -640. */
const FRAME_H = 30;
const SPRING_VY = -640;
/** kano.md 3.3: a wind changes air speed forward by a quarter (Gentle: a headwind an eighth). */
const WIND = 0.25;

/** Height a jump started at vy rises, held or not (S2.2: holding lowers gravity while rising). */
const rise = (vy: number, held: boolean): number => (vy * vy) / (2 * (held ? PHYSICS.holdGravity : PHYSICS.gravity));
/** Seconds in the air for a held cloth bounce, from the cloth top down to the road. */
const bounceAir = (): number => -SPRING_VY / PHYSICS.holdGravity + Math.sqrt((2 * (rise(SPRING_VY, true) + FRAME_H)) / PHYSICS.gravity);

function shape(raw: Raw) {
  const L = parseLevel(playableKano(raw));
  const pits: Span[] = L.ground.slice(1).map((s, i) => ({ a: L.ground[i]![1], b: s[0], w: s[0] - L.ground[i]![1] }));
  const big = pits.filter((p) => p.w >= 160 && p.w <= 180);
  const onRoad = (x: number): boolean => L.ground.some(([a, b]) => x >= a && x <= b);
  const nearest = (x: number): number => Math.min(...pits.map((p) => (x < p.a ? p.a - x : x > p.b ? x - p.b : 0)));
  const wind = (raw.wind ?? []).map(([x, w, dir]) => ({ a: Number(x), b: Number(x) + Number(w), w: Number(w), dir: String(dir) }));
  const springs: Span[] = (raw.springs ?? []).map(([x, w]) => ({ a: x!, b: x! + w!, w: w! }));
  const sacks = (raw.sacks ?? []).map(([x, w, h]) => ({ a: x!, b: x! + w!, h: h! }));
  const kanoFoods = raw.foods.filter((f) => KANO_FOODS.includes(String(f[2]))).map((f) => ({ x: Number(f[0]), kind: String(f[2]) }));
  const corns = [...L.foods.filter((f) => f.kind === 'corn').map((f) => f.x), ...L.crates.filter((c) => c.contents === 'corn').map((c) => c.x)];
  const reach = (RULES.cornSteps / STEPS_PER_SECOND) * L.cornSpeed;
  const hintBefore = (x: number) => L.hints.filter((h) => h.x < x).at(-1);
  const hazards = raw.hazards.map(([kind, x]) => ({ kind: String(kind), x: Number(x) }));
  const whirls = hazards.filter((z) => z.kind === 'whirl');
  return { L, pits, big, onRoad, nearest, wind, springs, sacks, kanoFoods, corns, reach, hintBefore, hazards, whirls };
}

const STREETS = [
  { raw: KURMI, key: 'kurmi' as const },
  { raw: KOFAR_MATA, key: 'kofarMata' as const },
  { raw: DAWANAU, key: 'dawanau' as const },
];

describe.each(STREETS)('kano.md 3.3, every Kano street: $raw.id', ({ raw, key }) => {
  const { L, pits, onRoad, nearest, wind, springs, sacks, kanoFoods, corns, reach, hazards } = shape(raw);

  it('is schema 2, state kano, and uses none of Ogun\'s mud, cracks, gravel or foods (KN-R10)', () => {
    expect(raw).toMatchObject({ schema: 2, type: 'street', state: 'kano' });
    const r = raw as Record<string, unknown>;
    for (const k of ['mud', 'cracks', 'rocks', 'waterPits', 'arch']) expect(r[k], k).toBeUndefined();
    expect(JSON.stringify(raw.hazards)).not.toMatch(/gravel/);
    expect(JSON.stringify(raw.foods)).not.toMatch(/ikokore|ofada/);
  });

  it('wind: 300 to 800 wide, "back" or "face", in order and apart, the first one behind you', () => {
    for (const s of wind) {
      expect(s.w, `wind at ${s.a}`).toBeGreaterThanOrEqual(300);
      expect(s.w, `wind at ${s.a}`).toBeLessThanOrEqual(800);
      expect(['back', 'face']).toContain(s.dir);
    }
    for (let i = 1; i < wind.length; i++) expect(wind[i]!.a).toBeGreaterThan(wind[i - 1]!.b);
    if (wind.length > 0) expect(wind[0]!.dir).toBe('back');
  });

  it('wind: no wide or big pit inside a headwind or within 160 u after it ends', () => {
    for (const s of wind.filter((q) => q.dir === 'face')) {
      for (const p of pits.filter((q) => q.w >= 90)) expect(p.b <= s.a || p.a >= s.b + 160, `pit at ${p.a}, headwind at ${s.a}`).toBe(true);
    }
  });

  it('wind: none within 100 u of the spawn, the bus stop, a well or the bus door', () => {
    const spots = [L.spawnX, L.checkpoint, L.end!.x, ...L.wells.flatMap((w) => [w.x, w.exitX])];
    for (const s of wind) for (const x of spots) expect(x < s.a - 100 || x > s.b + 100, `wind at ${s.a}, spot ${x}`).toBe(true);
  });

  it('springy cloth: 80 to 120 wide, on solid road, at least 200 u from any pit', () => {
    for (const s of springs) {
      expect(s.w).toBeGreaterThanOrEqual(80);
      expect(s.w).toBeLessThanOrEqual(120);
      expect(L.ground.some(([a, b]) => s.a >= a && s.b <= b), `cloth at ${s.a}`).toBe(true);
      expect(nearest(s.a), `cloth at ${s.a}`).toBeGreaterThanOrEqual(200);
      expect(nearest(s.b), `cloth at ${s.a}`).toBeGreaterThanOrEqual(200);
    }
  });

  it('springy cloth: a held bounce at the fastest speed there never carries you over a pit', () => {
    for (const s of springs) {
      const corn = corns.some((c) => s.a >= c && s.a <= c + reach);
      const tail = wind.some((q) => q.dir === 'back' && s.b > q.a && s.a < q.b);
      const speed = (corn ? L.cornSpeed : L.runSpeed) * (tail ? 1 + WIND : 1);
      const far = speed * bounceAir();
      expect(nearest(s.b), `cloth at ${s.a} (${Math.round(far)} u in the air)`).toBeGreaterThan(far);
      expect(nearest(s.a), `cloth at ${s.a}`).toBeGreaterThan(far);
    }
  });

  it('springy cloth: a roof a bounce is for is 170 u high at most and is reached by a held bounce', () => {
    for (const s of springs) {
      for (const p of L.terrain.platforms.filter((q) => q.x >= s.b && q.x - s.b <= 200)) {
        const h = L.groundY - p.y;
        expect(h, `roof at ${p.x}`).toBeLessThanOrEqual(170);
        expect(FRAME_H + rise(SPRING_VY, true), `roof at ${p.x}`).toBeGreaterThan(h);
      }
    }
  });

  it('sack steps keep the rock rules: 150 high at most, each step 150 above the one below (first ones 100), from the road', () => {
    let below = 0;
    let lastEnd = -Infinity;
    for (const [i, r] of sacks.entries()) {
      expect(r.h).toBeGreaterThan(0);
      expect(r.h).toBeLessThanOrEqual(150);
      const from = r.a - lastEnd <= 60 ? below : 0;
      expect(r.h - from, `sacks at ${r.a}`).toBeLessThanOrEqual(i < 3 ? 100 : 150);
      expect(onRoad(r.a), `sacks at ${r.a}`).toBe(true);
      below = r.h;
      lastEnd = r.b;
    }
  });

  it('dust whirls: a jump clears one (a tap jump rises more than its 50 u)', () => {
    if (!hazards.some((z) => z.kind === 'whirl')) return;
    expect(rise(PHYSICS.jumpVy, false)).toBeGreaterThan(50);
    expect((raw.hazardSpeeds as Record<string, number>)['whirl']).toBe(50);
  });

  it('Kano foods keep the S2.6 food rules: on the road, 300 u from a pit, not in a big pit run-up', () => {
    for (const f of kanoFoods) {
      expect(onRoad(f.x)).toBe(true);
      expect(nearest(f.x), `${f.kind} at ${f.x}`).toBeGreaterThanOrEqual(300);
      for (const p of pits.filter((q) => q.w >= 160)) expect(f.x > p.a - 160 && f.x <= p.a, `${f.kind} at ${f.x}`).toBe(false);
    }
  });

  it('hints are the words list, 35 characters or fewer for touch and keys; no hint between a well and its exit', () => {
    expect(L.hints.map((h) => h.words)).toEqual(KANO_WORDS.hints[key]);
    for (const h of L.hints) for (const kind of ['touch', 'keys'] as const) expect(hintWords(h.words, kind).length, h.words).toBeLessThanOrEqual(35);
    for (const w of L.wells) expect(L.hints.filter((h) => h.x > w.x && h.x < w.exitX)).toEqual([]);
  });
});

describe('kano.md 3.4: Kurmi', () => {
  const { L, pits, big, onRoad, wind, kanoFoods, hintBefore, hazards } = shape(KURMI);

  it('is the first Kano street with the 3.4 numbers', () => {
    expect(KURMI).toMatchObject({ street: 1, name: 'Kurmi', theme: 'walls' });
    expect(L.end!.x - L.spawnX).toBe(11720);
    expect(L.checkpoint).toBe(4700);
    expect(L.wells).toEqual([]);
    expect(big).toHaveLength(1);
    expect(hazards.every((z) => z.kind === 'goat' || z.kind === 'tyre')).toBe(true);
    expect(wind.map((s) => s.dir)).toEqual(['back', 'face', 'face', 'back']);
  });

  it('the gate stands near the start, before the first pit, on the road', () => {
    expect(KURMI.gate).toBeGreaterThan(L.spawnX);
    expect(KURMI.gate!).toBeLessThan(pits[0]!.a);
    expect(onRoad(KURMI.gate!)).toBe(true);
  });

  it('teaches wind one way at a time: each first is named by a hint just before it, no hazard inside it', () => {
    const tail = wind[0]!;
    const head = wind.find((s) => s.dir === 'face')!;
    expect(hintBefore(tail.a)!.words).toMatch(/wind behind/i);
    expect(hintBefore(head.a)!.words).toMatch(/wind in your face/i);
    for (const s of [tail, head]) {
      expect(s.a - hintBefore(s.a)!.x).toBeLessThanOrEqual(200);
      for (const z of hazards) expect(z.x < s.a - 200 || z.x > s.b, `${z.kind} at ${z.x}`).toBe(true);
    }
    // The tailwind carries you over a wide pit (the kobo arc shows the longer jump).
    expect(pits.some((p) => p.w >= 90 && p.w <= 110 && p.a > tail.a && p.b < tail.b)).toBe(true);
  });

  it('kilishi comes after a headwind met without it, after its own hint, with a headwind inside its 12 s', () => {
    const k = kanoFoods.find((f) => f.kind === 'kilishi')!;
    expect(k).toBeDefined();
    const hint = hintBefore(k.x)!;
    expect(hint.words).toMatch(/kilishi/i);
    expect(k.x - hint.x).toBeLessThanOrEqual(200);
    expect(wind.some((s) => s.dir === 'face' && s.b < k.x)).toBe(true);
    expect(wind.some((s) => s.dir === 'face' && s.a > k.x && s.a - k.x <= 12 * L.walkSpeed)).toBe(true);
  });

  it('KM2 Ride the wind: two pits inside a tailwind, each with a kobo arc over it', () => {
    const inTail = pits.filter((p) => wind.some((s) => s.dir === 'back' && p.a > s.a && p.b < s.b));
    expect(inTail.length).toBeGreaterThanOrEqual(2);
    for (const p of inTail) expect(L.coins.some((k) => k.x >= p.a - 12 && k.x <= p.b + 12 && k.y < 250), `pit at ${p.a}`).toBe(true);
  });

  it('KM1 Coin catch: 135 coins is 85 percent of the coins laid (stars 60, 100, 135)', () => {
    const laid = L.coins.length;
    const star = (p: number) => Math.floor((laid * p) / 5) * 5;
    expect([star(0.4), star(0.65), star(0.85)]).toEqual([60, 100, 135]);
  });
});

describe('kano.md 3.5: Kofar Mata', () => {
  const { L, pits, big, springs, hintBefore, hazards } = shape(KOFAR_MATA);

  it('is the second Kano street with the 3.5 numbers', () => {
    expect(KOFAR_MATA).toMatchObject({ street: 2, name: 'Kofar Mata', theme: 'dyepits' });
    expect(L.end!.x - L.spawnX).toBe(12120);
    expect(L.checkpoint).toBe(5000);
    expect(big).toHaveLength(1);
    expect(L.wells).toEqual([{ x: 3600, exitX: 4800, room: 'kano-well' }]);
    expect(KOFAR_MATA.gate).toBeUndefined();
  });

  it('teaches springy cloth alone: a hint names it, the first frame has no hazard within 600 u', () => {
    const first = springs[0]!;
    const hint = hintBefore(first.a)!;
    expect(hint.words).toMatch(/springy cloth/i);
    expect(first.a - hint.x).toBeLessThanOrEqual(200);
    for (const z of hazards) expect(Math.abs(z.x - first.a), `${z.kind} at ${z.x}`).toBeGreaterThan(600);
    expect(L.coins.some((k) => k.x >= first.a && k.x <= first.b && k.y < 250), 'a line of kobo above it').toBe(true);
  });

  it('the long roof reaches over a wide pit: bounce up to it, or double jump the hole', () => {
    const roof = L.terrain.platforms.find((p) => p.w >= 300)!;
    const under = pits.find((p) => p.a > roof.x && p.b < roof.x + roof.w)!;
    expect(under.w).toBeGreaterThanOrEqual(90);
    expect(under.w).toBeLessThanOrEqual(110);
    expect(L.groundY - roof.y).toBe(150);
    expect(springs.some((s) => roof.x - s.b >= 0 && roof.x - s.b <= 100)).toBe(true);
  });

  it('a 150 u roof needs a bounce or a double jump: a held jump from the road falls short', () => {
    expect(rise(PHYSICS.jumpVy, true)).toBeLessThan(150);
    expect(FRAME_H + rise(SPRING_VY, true)).toBeGreaterThan(150);
    expect(rise(PHYSICS.jumpVy, true) + rise(PHYSICS.airJumpVy, true)).toBeGreaterThan(150);
  });

  it('KM3 Bounce high: four frames along the street (8 bounces is two on each, or more on one)', () => {
    expect(springs).toHaveLength(4);
  });
});

describe('kano.md 3.6: Dawanau', () => {
  const { L, big, sacks, whirls, kanoFoods, corns, reach, hintBefore, hazards } = shape(DAWANAU);

  it('is the third Kano street with the 3.6 numbers', () => {
    expect(DAWANAU).toMatchObject({ street: 3, name: 'Dawanau', theme: 'grain' });
    expect(L.end!.x - L.spawnX).toBe(12520);
    expect(L.checkpoint).toBe(5600);
    expect(big).toHaveLength(1);
    expect(sacks.map((s) => s.h)).toEqual([50, 100, 150, 60, 120]);
    expect(hazards.every((z) => ['goat', 'tyre', 'whirl'].includes(z.kind))).toBe(true);
  });

  it('teaches whirls alone: the hint names it first, no other hazard within 600 u of the first', () => {
    const first = whirls[0]!;
    expect(hazards[0]).toEqual(first);
    const hint = hintBefore(first.x)!;
    expect(hint.words).toMatch(/whirl/i);
    expect(first.x - hint.x).toBeLessThanOrEqual(400);
    for (const z of hazards) if (z !== first) expect(Math.abs(z.x - first.x), `${z.kind} at ${z.x}`).toBeGreaterThanOrEqual(600);
  });

  it('whirls keep the tyre rules: never in the first half of a corn reach', () => {
    for (const c of corns) for (const z of whirls) expect(z.x - c >= 0 && z.x - c <= reach / 2, `whirl at ${z.x}, corn at ${c}`).toBe(false);
  });

  it('fura da nono comes after whirls met without it, after its own hint, with whirls inside its 12 s', () => {
    const f = kanoFoods.find((q) => q.kind === 'fura')!;
    expect(f).toBeDefined();
    const hint = hintBefore(f.x)!;
    expect(hint.words).toMatch(/fura/i);
    expect(f.x - hint.x).toBeLessThanOrEqual(200);
    expect(whirls.some((z) => z.x < f.x)).toBe(true);
    expect(whirls.filter((z) => z.x > f.x && z.x - f.x <= 12 * L.walkSpeed)).toHaveLength(3);
  });

  it('one secret well, before the bus stop, with no hint', () => {
    expect(L.wells).toEqual([{ x: 5150, exitX: 5480, room: 'kano-well' }]);
    expect(L.hints.some((h) => /well/i.test(h.words))).toBe(false);
  });

  it('KM4 Puff the dust: at least 5 whirls to puff', () => {
    expect(whirls.length).toBeGreaterThanOrEqual(5);
  });
});

describe('kano.md 3.7: the groundnut store (kano-well)', () => {
  const room = parseRoom(structuredClone(kanoWell));
  const shelves = [...room.terrain.platforms].sort((p, q) => p.x - q.x);

  it('reads as a room with the S2.5 shape: 17 kobo, a kobo crate, the parcel on the middle shelf', () => {
    expect(room).toMatchObject({ id: 'kano-well', width: 560, leftLimit: 30, rightLimit: 530, entryX: 60, exitX: 500, groundY: 300 });
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

  it('every kobo inside the walls, none inside the crate or on the parcel', () => {
    for (const k of room.coins) {
      expect(k.x).toBeGreaterThanOrEqual(room.leftLimit);
      expect(k.x).toBeLessThanOrEqual(room.rightLimit);
      expect(Math.abs(k.x - room.gift.x) < 20 && Math.abs(k.y - room.gift.y) < 20).toBe(false);
    }
    for (const c of room.crates) for (const k of room.coins) expect(k.x >= c.x - 16 && k.x <= c.x + 16 && k.y >= c.bottomY - 28 && k.y <= c.bottomY).toBe(false);
  });

  it('the keeper\'s words and the toast', () => {
    expect(KANO_WORDS.folk.storeKeeper).toBe('For Borehole Hall. Safe trip!');
    expect(KANO_WORDS.toast.parcel).toBe('Groundnut garri parcel! Shield for the hall.');
  });
});

describe('kano.md 5.2 to 5.5: Borehole Hall (kano-hall.json)', () => {
  const H = kanoHall;
  const B = H.boss;
  const headY = (feetY: number, up: number) => feetY - up - RULES.heroH;

  it('is a hall file in the Go-Slow Hall room with the 5.2 numbers', () => {
    expect(H).toMatchObject({ schema: 2, type: 'hall', id: 'kano-hall', state: 'kano', name: 'Borehole Hall' });
    expect(H.name).toBe(KANO_WORDS.hall.name);
    for (const k of ['schema', 'type', 'groundY', 'width', 'spawnX', 'leftLimit'] as const) expect(H[k], k).toBe(lagosHall[k]);
    expect(B.kind).toBe('rusty-borehole');
    expect(B.body).toEqual([450, 540]);
    expect(H.rightLimit).toBe(440);
    expect(B.valves.x).toEqual([140, 250, 360]);
    expect(B.valves.bottom).toBe(70);
  });

  it('a valve takes a double jump or a held cloth bounce; a held jump from the floor falls short (5.2)', () => {
    const floor = H.groundY;
    expect(headY(floor, rise(PHYSICS.jumpVy, true))).toBe(112);
    expect(headY(floor, rise(PHYSICS.jumpVy, true))).toBeGreaterThan(B.valves.bottom);
    expect(Math.round(headY(floor, rise(PHYSICS.jumpVy, true) + rise(PHYSICS.airJumpVy, true)))).toBe(2);
    expect(headY(floor - B.springs.h, rise(B.springs.vy, true))).toBeLessThan(B.valves.bottom);
    expect(Math.round(headY(floor - B.springs.h, rise(B.springs.vy, true)))).toBe(48);
    // An un-held bounce falls short too, so the "hold" in the hint matters.
    expect(headY(floor - B.springs.h, rise(B.springs.vy, false))).toBeGreaterThan(B.valves.bottom);
  });

  it('the frames: the Kofar Mata cloth, one under each valve, apart, inside the walls, clear of the start', () => {
    expect(B.springs).toEqual({ w: 80, h: FRAME_H, vy: SPRING_VY });
    const frames = B.valves.x.map((x) => ({ a: x - B.springs.w / 2, b: x + B.springs.w / 2 }));
    for (const f of frames) {
      expect(f.a).toBeGreaterThan(H.leftLimit);
      expect(f.b).toBeLessThan(H.rightLimit);
      expect(H.spawnX < f.a - 7 || H.spawnX > f.b + 7).toBe(true);
    }
    for (let i = 1; i < frames.length; i++) expect(frames[i]!.a).toBeGreaterThan(frames[i - 1]!.b);
    for (const x of B.valves.x) expect(x + B.valves.w / 2).toBeLessThan(B.body[0]!);
  });

  it('one phase per valve, three valves win; the 5.4 table word for word', () => {
    expect(B.phases).toEqual([
      { every: 2.8, pattern: ['whirl'], bpm: 120 },
      { every: 2.4, pattern: ['whirl', 'gust'], bpm: 126, adds: 'shaker' },
      { every: 2.0, pattern: ['whirl', 'whirl', 'gust'], bpm: 132, adds: 'drum' },
    ]);
    expect(B.phases).toHaveLength(B.valves.x.length);
  });

  it('each hit makes it harder: coughs sooner, more in the pattern, faster music', () => {
    for (let i = 1; i < B.phases.length; i++) {
      expect(B.phases[i]!.every).toBeLessThan(B.phases[i - 1]!.every);
      expect(B.phases[i]!.pattern.length).toBeGreaterThan(B.phases[i - 1]!.pattern.length);
      expect(B.phases[i]!.bpm).toBeGreaterThan(B.phases[i - 1]!.bpm);
    }
    expect(B.phases[0]!.pattern).not.toContain('gust');
  });

  it('fair: warned coughs, a jump clears a whirl, he holds his breath while you bounce, a gust never hurts', () => {
    expect(B.wheeze).toBe(0.5);
    expect(B.startDelay).toBe(2.0);
    expect(B.breakAfterHit).toBe(1.5);
    expect(B.holdBreath).toBe(true);
    expect(rise(PHYSICS.jumpVy, false)).toBeGreaterThan(B.whirl.h);
    expect(B.whirl).toEqual({ speed: 60, w: 30, h: 50, fromX: H.rightLimit, bounceVy: PHYSICS.bounceVy, clearGap: 11 });
    expect(B.gust).toEqual({ lasts: 2.0, warn: 0.6, airScale: 1 - WIND });
    // A whirl from his feet takes over 6 s to cross the yard to the start: time to see it.
    expect((B.whirl.fromX - H.spawnX) / B.whirl.speed).toBeGreaterThan(6);
    expect(B.fall.backTo).toBe(H.spawnX);
  });

  it('Gentle mode (5.4): slower whirls, later coughs, gusts take an eighth', () => {
    expect(B.gentle).toEqual({ whirlSpeed: 45, later: 0.4, gustAirScale: 1 - WIND / 2 });
  });

  it('the funny, kind finish runs in order and ends on the Win screen at 6 s (5.5)', () => {
    const f = B.finish;
    const order = [f.sneeze, f.shine, f.tapsFrom, f.tapsTo, f.toast, f.win];
    for (let i = 1; i < order.length; i++) expect(order[i]!).toBeGreaterThan(order[i - 1]!);
    expect(f.glugTo).toBe(f.sneeze);
    expect(f.win).toBe(6.0);
    expect(B.taps).toBe(8);
  });

  it('no foods in the hall; nothing of a person or a ruler (5.1, 2.3)', () => {
    expect(JSON.stringify(H)).not.toMatch(/corn|fufu|amala|kilishi|fura|emir|king|chief|palace/i);
  });

  it('every hall word is in KANO_WORDS; long toasts have short words', () => {
    const W = KANO_WORDS.hall;
    expect(W.left(2)).toBe('Glug! 2 more valves.');
    expect(W.left(1)).toBe('Glug! 1 more valve.');
    expect(W.glug).toBe('SQUEAK... GLUG!');
    expect(W.stuckTag).toBe('STUCK');
    expect(KANO_WORDS.win.heading).toBe('Kano is switched on!');
  });
});

describe('kano.md 6.5: Harmattan Road (kano-lane.json)', () => {
  const L = parseLane(kanoLaneRaw);
  const OGUN = parseLane(ogunLaneRaw);
  const at = (d: number): number => timeTo(L.speed, L.goal, d);
  const gentleAt = (d: number): number => timeTo(L.gentleSpeed, L.goal, d);

  it('loads as a lane file named "Harmattan Road" (KN-R12), state kano', () => {
    expect(kanoLaneRaw).toMatchObject({ schema: 1, type: 'lane', id: 'kano-lane', state: 'kano', name: 'Harmattan Road', theme: 'harmattan' });
  });

  it('no new rule: the Expressway\'s speeds, moves, Blackout, prize, pops, hints and endless numbers', () => {
    for (const k of ['goal', 'lanes', 'laneWidth', 'speed', 'gentleSpeed', 'move', 'blackout', 'gentleBlackout', 'prize', 'pops', 'spawnAhead', 'endless', 'hints'] as const) {
      expect(L[k], k).toEqual(OGUN[k]);
    }
  });

  it('S3f0 part 7 rules hold for the fixed 600 m, in Normal and Gentle', () => {
    const rows = rowsOf(L.things);
    expect(checkFair(rows, L.pickups, L.coins, at, { minGap: 1.7, warmUp: [152, 282, 372], foodLane: 1 })).toEqual([]);
    expect(checkFair(rows, L.pickups, L.coins, gentleAt, { minGap: 1.7 })).toEqual([]);
    expect(L.things.filter((t) => isDodge(t.kind) && t.d - 3 < 30)).toEqual([]);
  });

  it("Kano's own rows after the teaching part: most differ from the Expressway's", () => {
    const key = (r: { d: number; lanes: unknown[] }) => `${r.d}:${JSON.stringify(r.lanes)}`;
    const ogunRows = new Set(rowsOf(OGUN.things).map(key));
    const after = rowsOf(L.things).filter((r) => r.d > 230);
    expect(after.filter((r) => !ogunRows.has(key(r))).length / after.length).toBeGreaterThan(0.75);
  });

  it('KM5 Power for the market: 12 Power before the goal (bulbs and Power crates)', () => {
    const bulbs = L.pickups.filter((p) => p.kind === 'bulb' && p.d <= L.goal).length;
    const burst = L.things.filter((t) => t.d <= L.goal).reduce((n, t) => n + (L.pops[t.kind]?.power ?? 0), 0);
    expect(bulbs + burst).toBeGreaterThanOrEqual(12);
  });

  it('8 endless chunks of 4 rows with Kano names, each fair plain and mirrored', () => {
    expect(L.chunks).toHaveLength(8);
    expect(new Set(L.chunks.map((c) => c.id)).size).toBe(8);
    for (const c of L.chunks) {
      expect(OGUN.chunks.map((o) => o.id)).not.toContain(c.id);
      expect(checkChunk(c, L.endless.beat), c.id).toEqual([]);
      for (const m of [false, true]) for (const r of chunkRows(c, m)) expect(freeLanes(r).length, c.id).toBeGreaterThan(0);
    }
  });
});

describe('Kano words (K0a)', () => {
  it('the three street names (decision 91), in order', () => {
    expect(KANO_WORDS.streets).toEqual([KURMI.name, KOFAR_MATA.name, DAWANAU.name]);
    expect(KANO_WORDS.streets).toEqual(['Kurmi', 'Kofar Mata', 'Dawanau']);
    expect(KANO_WORDS.cleared.text('Kurmi', formatMoney(1500))).toMatch(/^Kurmi is moving again, thanks to you! You got .+15\.$/);
  });

  it('every toast and hall line over 35 characters has short words of 35 or fewer', () => {
    const lines = [...Object.values(KANO_WORDS.toast), KANO_WORDS.hall.parcelShield, KANO_WORDS.hall.start, KANO_WORDS.hall.hint, KANO_WORDS.hall.cross,
      KANO_WORDS.hall.open, KANO_WORDS.hall.left(2), KANO_WORDS.hall.left(1)];
    // The Kano part adds its short words when it loads (load.ts); the Lagos ones are there already.
    const table: Record<string, string> = { ...SHORT_TOAST, ...KANO_WORDS.short };
    for (const t of lines) {
      if (t.length <= SHORT_AT) continue;
      expect(table[t], t).toBeDefined();
      expect(table[t]!.length).toBeLessThanOrEqual(SHORT_AT);
    }
  });

  it('nothing religious, no ruler, no script but ours (KN-R3, KN-R7, KN-R8), in the words and the files', () => {
    const all = JSON.stringify(KANO_WORDS, (_k, v: unknown) => (typeof v === 'function' ? String((v as (...a: unknown[]) => string)('Kurmi', 2)) : v));
    const bad = /allah|god\b|pray|mosque|minaret|imam|emir|sultan|palace|durbar|church|shrine|insha|masha/i;
    expect(all).not.toMatch(bad);
    expect(JSON.stringify([kano1, kano2, kano3, kanoWell, kanoHall, kanoLaneRaw])).not.toMatch(bad);
    expect(all).not.toMatch(/[؀-ۿ]/);
  });

  it('mission card lines are six words or fewer', () => {
    for (const l of Object.values(KANO_WORDS.missions)) expect(l.split(' ').length, l).toBeLessThanOrEqual(6);
  });
});
