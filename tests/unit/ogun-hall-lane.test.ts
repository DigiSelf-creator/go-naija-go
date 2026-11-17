/**
 * O0a4: Pothole Hall (docs/ogun.md 5.2 to 5.5) and the Expressway run (ogun.md 6.6).
 *
 * The hall file holds King Pothole's block, which the game does not read yet (gamedev O5b adds the
 * reader, as O2b to O4b do for the street fields): so these tests read the file straight, check the
 * S2.7-style safe places, the phases and the gaps ruled in ogun.md 5.6. The Expressway file is a
 * plain `type: "lane"` file, so it goes through parseLane and the same fairness checks as the Lagos
 * lane run (design.md S3f0 parts 7, 9 and 13).
 */
import { describe, expect, it } from 'vitest';
import hallRaw from '../../src/data/levels/ogun-hall.json';
import lagosHall from '../../src/data/levels/lagos-hall.json';
import laneRaw from '../../src/data/levels/ogun-lane.json';
import lagosLaneRaw from '../../src/data/levels/lagos-lane.json';
import { checkChunk, checkFair, chunkRows, freeLanes, isDodge, parseLane, rowsOf, timeTo } from '../../src/lane/level';
import { WORDS } from '../../src/screens/words';
import { OGUN_WORDS } from '../../src/worlds/ogun/partWords';

const H = hallRaw;
const B = H.boss;
/** S2.2: the hero's box is 14 wide, so the feet reach 7 u either side of x. */
const HALF_FEET = 7;

/** King Pothole's lips with his middle at m. */
const lips = (m: number) => ({ a: m - B.pit.width / 2, b: m + B.pit.width / 2 });

/**
 * ogun.md 5.6 (O0a4 ruling): where a mud splat lands. Measured from his near lip, 120 to 200 u
 * toward the hero; the whole 60 u patch inside the walls; its middle never within 40 u of where the
 * hero stands. Returns every allowed middle (10 u steps); an empty list means that throw is gravel.
 */
function mudSpots(middle: number, heroX: number): number[] {
  const l = lips(middle);
  const left = heroX < middle;
  const out: number[] = [];
  for (let d = B.mud.near; d <= B.mud.far; d += 10) {
    const x = left ? l.a - d : l.b + d;
    if (x - B.mud.width / 2 < H.leftLimit || x + B.mud.width / 2 > H.rightLimit) continue;
    if (Math.abs(x - heroX) < B.mud.notByHero) continue;
    out.push(x);
  }
  return out;
}

describe('ogun.md 5.2: Pothole Hall (ogun-hall.json)', () => {
  it('is a hall file in the Go-Slow Hall format with the 5.2 numbers', () => {
    expect(H).toMatchObject({ schema: 2, type: 'hall', id: 'ogun-hall', state: 'ogun', name: 'Pothole Hall' });
    expect(H.name).toBe(OGUN_WORDS.hall.name);
    // The same room as Go-Slow Hall: 560 wide (every landscape screen), floor 300, start 50, left wall 30.
    for (const k of ['schema', 'type', 'groundY', 'width', 'spawnX', 'leftLimit'] as const) expect(H[k], k).toBe(lagosHall[k]);
    expect(H.rightLimit).toBe(530);
    expect(B).toMatchObject({ kind: 'king-pothole', rollerX: 500, lamps: 8, startDelay: 2.0, gulp: 0.5, breakAfterHit: 1.5 });
    expect(B.pit).toEqual({ width: 100, track: [230, 400], startX: 400, dropZone: 40, bumpGap: 30, resumeAfterLand: 0.3 });
    expect(B.bag).toEqual({ pile: [60, 90], x: 80, newAfter: 1.0 });
  });

  it('King Pothole is one wide pothole (S2.2: 90 to 110), the same width all fight, his lips 180 to 450', () => {
    expect(B.pit.width).toBeGreaterThanOrEqual(90);
    expect(B.pit.width).toBeLessThanOrEqual(110);
    expect(JSON.stringify(B.phases)).not.toMatch(/width/);
    expect(lips(B.pit.track[0]!).a).toBe(180);
    expect(lips(B.pit.track[1]!).b).toBe(450);
    expect(B.pit.startX).toBeGreaterThanOrEqual(B.pit.track[0]!);
    expect(B.pit.startX).toBeLessThanOrEqual(B.pit.track[1]!);
    expect(B.fall.pitTo).toBe(B.pit.track[1]);
  });

  it('the drop zone is the middle of the pit, narrower than it (5.3)', () => {
    expect(B.pit.dropZone).toBe(40);
    expect(B.pit.dropZone).toBeLessThan(B.pit.width);
  });

  describe('safe places (as S2.7)', () => {
    const far = lips(B.pit.track[0]!).a;
    const nearRight = lips(B.pit.track[1]!).b;

    it('the start, the road mix pile and the bag are on floor he can never reach', () => {
      for (const x of [H.spawnX, B.bag.x, ...B.bag.pile, B.fall.backTo]) {
        expect(x, `x ${x}`).toBeGreaterThanOrEqual(H.leftLimit);
        expect(far - (x + HALF_FEET), `x ${x}`).toBeGreaterThanOrEqual(B.pit.bumpGap);
      }
      expect(B.bag.x).toBeGreaterThanOrEqual(B.bag.pile[0]!);
      expect(B.bag.x).toBeLessThanOrEqual(B.bag.pile[1]!);
      expect(B.fall.backTo).toBe(H.spawnX);
    });

    it('always at least 80 u of floor past his right lip; the roller stands behind the floor line', () => {
      expect(H.rightLimit - nearRight).toBeGreaterThanOrEqual(80);
      expect(B.rollerX).toBeGreaterThan(nearRight);
      expect(H.rightLimit).toBeLessThanOrEqual(H.width);
    });

    it('he can turn back before any standing hero: the floor left of his track is wider than the bump gap', () => {
      // A hero standing anywhere from the wall to his far-left lip: he turns 10 u before the feet.
      expect(far - H.leftLimit).toBeGreaterThan(B.pit.bumpGap + 2 * HALF_FEET);
      expect(H.rightLimit - nearRight).toBeGreaterThan(B.pit.bumpGap + 2 * HALF_FEET);
    });

    it('a gravel lump is warned in time even from right by his lip (gulp, then the bump gap at gravel speed)', () => {
      // Go-Slow Hall's closest case is 0.4 s of warning plus 53 u at 228 u/s (S2.7 rule 4): about 0.63 s.
      expect(B.gulp).toBeGreaterThanOrEqual(0.4);
      expect(B.gulp + B.pit.bumpGap / B.gravel.speed).toBeGreaterThanOrEqual(0.6);
    });
  });

  describe('5.4: what he does, and how it gets harder', () => {
    const P = B.phases;

    it('one phase per bag, three bags win; the 5.4 table word for word', () => {
      expect(P).toEqual([
        { every: 2.6, slide: 30, pattern: ['gravel'], bpm: 126 },
        { every: 2.2, slide: 40, pattern: ['gravel', 'mud'], bpm: 132 },
        { every: 1.8, slide: 55, pattern: ['gravel', 'gravel', 'mud'], bpm: 138 },
      ]);
      expect(OGUN_WORDS.hall.bagsSpoken(3)).toBe('Bags in: 3 of 3.');
    });

    it('each hit makes it harder: throws sooner, he slides faster, the pattern grows, the music speeds up', () => {
      for (let i = 1; i < P.length; i++) {
        expect(P[i]!.every).toBeLessThan(P[i - 1]!.every);
        expect(P[i]!.slide).toBeGreaterThan(P[i - 1]!.slide);
        expect(P[i]!.pattern.length).toBeGreaterThan(P[i - 1]!.pattern.length);
        expect(P[i]!.bpm).toBeGreaterThan(P[i - 1]!.bpm);
      }
      // Mud only from hit 1; every throw is gravel or mud (what potholes throw).
      expect(P[0]!.pattern).not.toContain('mud');
      for (const p of P) for (const k of p.pattern) expect(['gravel', 'mud']).toContain(k);
    });

    it('still fair at its hardest: two gravel lumps are a whole throw apart, and a throw never comes before the first 2 s', () => {
      const last = P.at(-1)!;
      expect(last.every * B.gravel.speed).toBeGreaterThanOrEqual(120);
      expect(B.startDelay).toBeGreaterThanOrEqual(2);
      expect(B.breakAfterHit).toBeGreaterThanOrEqual(1.5);
    });

    it('the gravel is the Sagamu lump at hall speed; mud never hurts and dries in 4 s', () => {
      expect(B.gravel).toEqual({ speed: 80, hop: 40, hopEvery: 0.7, w: 18, h: 16 });
      expect(B.mud).toEqual({ near: 120, far: 200, notByHero: 40, shadow: 0.6, width: 60, lasts: 4 });
    });

    it('Gentle mode: every slide speed drops by a fifth (part 8)', () => {
      expect(B.gentle.slideScale).toBe(0.8);
      expect(P.map((p) => Math.round(p.slide * B.gentle.slideScale))).toEqual([24, 32, 44]);
    });
  });

  describe('5.6 ruling: where a mud splat lands', () => {
    const middles: number[] = [];
    for (let m = B.pit.track[0]!; m <= B.pit.track[1]!; m += 10) middles.push(m);

    it('never in his opening, never by the hero, always inside the walls', () => {
      for (const m of middles) {
        const l = lips(m);
        const stands = [];
        for (let x = H.leftLimit; x <= l.a - B.pit.bumpGap - HALF_FEET; x += 10) stands.push(x);
        for (let x = l.b + B.pit.bumpGap + HALF_FEET; x <= H.rightLimit; x += 10) stands.push(x);
        for (const x of stands) {
          for (const s of mudSpots(m, x)) {
            expect(s + B.mud.width / 2 <= l.a || s - B.mud.width / 2 >= l.b, `pit ${m}, hero ${x}, mud ${s}`).toBe(true);
            expect(Math.abs(s - x)).toBeGreaterThanOrEqual(B.mud.notByHero);
          }
        }
      }
    });

    it('a hero at the pile mostly gets a mud patch; with no room left, the throw is a gravel lump instead', () => {
      const withRoom = middles.filter((m) => mudSpots(m, B.bag.x).length > 0);
      expect(withRoom.length / middles.length).toBeGreaterThan(0.5);
      // With him at his far-left end and the hero at the bag, no patch fits: that throw is gravel.
      expect(mudSpots(B.pit.track[0]!, B.bag.x)).toEqual([]);
    });
  });

  it('no foods in the hall (no fufu: it would plug him), no lights, nothing of a ruler (decision 78)', () => {
    expect(B).not.toHaveProperty('fufu');
    expect(B).not.toHaveProperty('lights');
    expect(H).not.toHaveProperty('foods');
    expect(JSON.stringify(H)).not.toMatch(/bead|staff|robe|throne|palace|title|chief|oba\b|regalia/i);
  });

  it('every hall word the fight needs is already in OGUN_WORDS', () => {
    const h = OGUN_WORDS.hall;
    for (const w of [h.start, h.pickUp, h.jumpOver, h.cross, h.smooth, h.open, h.parcelShield, h.sign, h.bagTag]) expect(w.length).toBeGreaterThan(0);
    expect(h.pothole).toEqual({ bump: 'Hmph!', hit: 'Oof... hm!', giggle: 'Hee hee, that tickles!' });
    expect(OGUN_WORDS.win.heading).toBe('Ogun is switched on!');
    expect(OGUN_WORDS.gameOver.hallText).toMatch(/King Pothole/);
  });
});

describe('ogun.md 6.6: the Expressway run (ogun-lane.json)', () => {
  const L = parseLane(laneRaw);
  const LAGOS = parseLane(lagosLaneRaw);
  const at = (d: number): number => timeTo(L.speed, L.goal, d);
  const gentleAt = (d: number): number => timeTo(L.gentleSpeed, L.goal, d);

  it('loads as a lane file, named "Expressway" (OG-R2), state ogun', () => {
    expect(laneRaw).toMatchObject({ schema: 1, type: 'lane', id: 'ogun-lane', state: 'ogun', name: 'Expressway', theme: 'expressway' });
    expect(JSON.stringify(laneRaw)).not.toMatch(/ibadan|benin|shagamu|sango/i);
  });

  it('no new rule (6.6): the same speeds, moves, Blackout, prize, pops and endless numbers as Lagos', () => {
    for (const k of ['goal', 'lanes', 'laneWidth', 'speed', 'gentleSpeed', 'move', 'blackout', 'gentleBlackout', 'prize', 'pops', 'spawnAhead', 'endless'] as const) {
      expect(L[k], k).toEqual(LAGOS[k]);
    }
  });

  it('S3f0 part 7 rules 1 to 5 and 8 hold for the fixed 600 m, in Normal and Gentle', () => {
    const rows = rowsOf(L.things);
    expect(checkFair(rows, L.pickups, L.coins, at, { minGap: 1.7, warmUp: [152, 282, 372], foodLane: 1 })).toEqual([]);
    expect(checkFair(rows, L.pickups, L.coins, gentleAt, { minGap: 1.7 })).toEqual([]);
    // Rule 6: nothing to dodge in the first 30 m.
    expect(L.things.filter((t) => isDodge(t.kind) && t.d - 3 < 30)).toEqual([]);
  });

  it("Ogun's own rows: most rows after the teaching part differ from Lagos, and there are more potholes", () => {
    const key = (r: { d: number; lanes: unknown[] }) => `${r.d}:${JSON.stringify(r.lanes)}`;
    const lagosRows = new Set(rowsOf(LAGOS.things).map(key));
    const after = rowsOf(L.things).filter((r) => r.d > 230);
    expect(after.filter((r) => !lagosRows.has(key(r))).length / after.length).toBeGreaterThan(0.75);
    const potholes = (lv: typeof L) => lv.things.filter((t) => t.kind === 'pothole').length;
    expect(potholes(L)).toBeGreaterThan(potholes(LAGOS));
  });

  it('teaches in the Lagos order with the Lagos hint keys and words; hints 1.5 s before their thing and 1.5 s apart', () => {
    expect(L.hints).toEqual(LAGOS.hints);
    const kinds: Record<string, string[]> = {
      lane: ['danfo'], jump: ['cones'], slide: ['barrier'], crate: ['crate:power', 'crate:tech', 'crate:coins'],
      power: ['bulb'], goat: ['goat'], food: ['garri'], tech: ['chip'], pothole: ['pothole'],
    };
    for (const h of L.hints) {
      expect(WORDS.lane.hints[h.key as keyof typeof WORDS.lane.hints], h.key).toBeDefined();
      const next = [...L.things, ...L.pickups].filter((x) => x.d > h.d && kinds[h.key]!.includes(x.kind)).sort((a, b) => a.d - b.d)[0]!;
      expect(next, h.key).toBeDefined();
      expect(at(next.d) - at(h.d), h.key).toBeGreaterThanOrEqual(1.5);
      // The thing a hint names is the first of its kind on the road.
      expect([...L.things, ...L.pickups].filter((x) => x.d <= h.d && kinds[h.key]!.includes(x.kind)), h.key).toEqual([]);
    }
    for (let i = 1; i < L.hints.length; i++) expect(at(L.hints[i]!.d) - at(L.hints[i - 1]!.d)).toBeGreaterThanOrEqual(1.5);
  });

  it('part 9 totals as Lagos (Power 14, Tech 9, 86 coins at most), so one win still pays for a fix', () => {
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
    // ogun.md 6.2: Dry taps Power 10, Lights out Power 8, Slow internet Tech 6. A first-timer's win
    // (Power 8 + 4, Tech 5 + 2, S3f0 part 9) pays for any one of them.
    expect(8 + L.prize.power).toBeGreaterThanOrEqual(10);
    expect(5 + L.prize.tech).toBeGreaterThanOrEqual(6);
  });

  it('one garri and one corn, in the middle lane; no ikokore or ofada (ogun.md 4.1)', () => {
    expect(L.pickups.filter((p) => p.kind === 'garri' || p.kind === 'corn').map((p) => [p.kind, p.lane])).toEqual([['garri', 1], ['corn', 1]]);
    expect(JSON.stringify(laneRaw)).not.toMatch(/ikokore|ofada/);
  });

  it('8 endless chunks of 4 rows, each fair plain and mirrored, ids unique', () => {
    expect(L.chunks).toHaveLength(8);
    expect(new Set(L.chunks.map((c) => c.id)).size).toBe(8);
    for (const c of L.chunks) {
      expect(c.beats).toHaveLength(4);
      expect(checkChunk(c, L.endless.beat), c.id).toEqual([]);
      for (const m of [false, true]) for (const r of chunkRows(c, m)) expect(freeLanes(r).length, c.id).toBeGreaterThan(0);
    }
  });
});
