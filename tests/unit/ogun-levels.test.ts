/**
 * O0a1: the Ogun street files against docs/ogun.md 3.3 (mud), 3.4 (Ota) and 3.8 (new fields).
 * The S2.6 rules every street keeps run in street.test.ts (Ota is in its STREETS list).
 */
import { describe, expect, it } from 'vitest';
import ogun1 from '../../src/data/levels/ogun-1.json';
import { parseLevel } from '../../src/game/level';
import { RULES, STEPS_PER_SECOND } from '../../src/game/run';
import { OGUN_WORDS, SHORT_AT, SHORT_TOAST, hintWords } from '../../src/screens/words';
import { OGUN_FOODS, playableOgun } from './ogun-level-data';

type Raw = typeof ogun1 & { mud: number[][]; arch?: number };

const STREETS = [{ raw: ogun1 as Raw, key: 'ota' as const, mud: 6, hazards: 6 }];

describe.each(STREETS)('ogun.md 3.3 and 3.4: $raw.id', ({ raw, key, mud: mudCount, hazards }) => {
  const L = parseLevel(playableOgun(raw));
  const pits = L.ground.slice(1).map((s, i) => ({ a: L.ground[i]![1], b: s[0], w: s[0] - L.ground[i]![1] }));
  const big = pits.filter((p) => p.w >= 160 && p.w <= 180);
  const onRoad = (x: number): boolean => L.ground.some(([a, b]) => x >= a && x <= b);
  const nearestPit = (x: number): number => Math.min(...pits.map((p) => (x < p.a ? p.a - x : x > p.b ? x - p.b : 0)));
  const mud = raw.mud.map(([x, w]) => ({ a: x!, b: x! + w!, w: w! }));
  const ogunFoods = raw.foods.filter((f) => OGUN_FOODS.includes(String(f[2]))).map((f) => ({ x: Number(f[0]), kind: String(f[2]) }));
  const reach = (RULES.cornSteps / STEPS_PER_SECOND) * L.cornSpeed;

  it('is an Ogun street with the 3.4 numbers', () => {
    expect(raw).toMatchObject({ state: 'ogun', street: 1, name: 'Ota', theme: 'gateway' });
    expect(L.end!.x - L.spawnX).toBe(11320);
    expect(L.wells).toEqual([]);
    expect(raw.mud).toHaveLength(mudCount);
    expect(L.hazards).toHaveLength(hazards);
    expect(L.hazards.every((z) => z.kind === 'goat' || z.kind === 'tyre')).toBe(true);
  });

  it('mud: 80 to 200 wide, on solid road, in order and apart', () => {
    for (const m of mud) {
      expect(m.w, `mud at ${m.a}`).toBeGreaterThanOrEqual(80);
      expect(m.w, `mud at ${m.a}`).toBeLessThanOrEqual(200);
      expect(L.ground.some(([a, b]) => m.a >= a && m.b <= b), `mud at ${m.a} is on one stretch of road`).toBe(true);
    }
    for (let i = 1; i < mud.length; i++) expect(mud[i]!.a).toBeGreaterThan(mud[i - 1]!.b);
  });

  it('mud ends at least 60 u before any pit lip (take-off is always on firm ground)', () => {
    for (const m of mud) for (const p of pits) if (p.a >= m.b) expect(p.a - m.b, `mud at ${m.a}, pit at ${p.a}`).toBeGreaterThanOrEqual(60);
  });

  it('no mud in a big pit run-up, and at least 300 u of firm road from mud to a big pit', () => {
    for (const p of big) for (const m of mud) if (m.a < p.a) expect(p.a - m.b, `mud at ${m.a}, big pit at ${p.a}`).toBeGreaterThanOrEqual(300);
  });

  it('no mud within 100 u of the spawn, the bus stop, a well or the bus door', () => {
    const spots = [L.spawnX, L.checkpoint, L.end!.x, ...L.wells.flatMap((w) => [w.x, w.exitX])];
    for (const m of mud) for (const x of spots) expect(x < m.a - 100 || x > m.b + 100, `mud at ${m.a}, spot ${x}`).toBe(true);
  });

  it('teaches mud alone: a hint names it first, and no hazard or pit near the first mud', () => {
    const first = mud[0]!;
    const hint = L.hints.filter((h) => h.x < first.a).at(-1);
    expect(hint?.words).toMatch(/mud/i);
    expect(first.a - hint!.x).toBeLessThanOrEqual(200);
    for (const z of L.hazards) expect(Math.abs(z.x - first.a), `${z.kind} at ${z.x}`).toBeGreaterThan(600);
    expect(nearestPit(first.a)).toBeGreaterThanOrEqual(200);
    expect(nearestPit(first.b)).toBeGreaterThanOrEqual(200);
    // The big pit comes after the bus stop, with mud before it (3.2: "1 (after mud)").
    expect(big).toHaveLength(1);
    expect(mud.some((m) => m.b < big[0]!.a && m.a > L.checkpoint)).toBe(true);
  });

  it('Ogun foods keep the S2.6 food rules: on the road, 300 u from a pit, not in a big pit run-up', () => {
    for (const f of ogunFoods) {
      expect(onRoad(f.x)).toBe(true);
      expect(nearestPit(f.x), `${f.kind} at ${f.x}`).toBeGreaterThanOrEqual(300);
      for (const p of big) expect(f.x > p.a - 160 && f.x <= p.a, `${f.kind} at ${f.x}`).toBe(false);
    }
  });

  it('ikokore comes before mud it helps with, after its own hint; mud in the corn fast stretch is fine but no pit lip is near it', () => {
    const iko = ogunFoods.find((f) => f.kind === 'ikokore')!;
    expect(iko).toBeDefined();
    const hint = L.hints.filter((h) => h.x < iko.x).at(-1);
    expect(hint?.words).toMatch(/ikokore/i);
    // Ikokore lasts 12 s: at least one mud patch starts within a walk of 12 s (90 u/s) after it.
    expect(mud.some((m) => m.a > iko.x && m.a - iko.x <= 12 * L.walkSpeed)).toBe(true);
    // The first ikokore comes after the player has met mud without it.
    expect(mud[0]!.a).toBeLessThan(iko.x);
    for (const c of L.foods.filter((f) => f.kind === 'corn').map((f) => f.x)) {
      for (const m of mud) if (m.a >= c && m.a <= c + reach) expect(nearestPit(m.a)).toBeGreaterThanOrEqual(200);
    }
  });

  it('the arch stands near the start, before the first pit, on the road', () => {
    expect(raw.arch).toBeGreaterThan(L.spawnX);
    expect(raw.arch!).toBeLessThan(pits[0]!.a);
    expect(onRoad(raw.arch!)).toBe(true);
  });

  it('hints are the words list, 35 characters or fewer for touch and keys', () => {
    expect(L.hints.map((h) => h.words)).toEqual(OGUN_WORDS.hints[key]);
    for (const h of L.hints) for (const kind of ['touch', 'keys'] as const) expect(hintWords(h.words, kind).length, h.words).toBeLessThanOrEqual(35);
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

  it('one download size everywhere: about 130 KB (OG-R6)', () => {
    expect(OGUN_WORDS.download.line1).toBe('Ogun is ready to download (about 130 KB).');
  });

  it('keeps decisions 76 and 77: "Ota", never "Sango"; the rock is never named; nothing religious', () => {
    const all = JSON.stringify(OGUN_WORDS, (_k, v: unknown) => (typeof v === 'function' ? String((v as (...a: number[]) => string)(2, 1 as never)) : v));
    expect(OGUN_WORDS.streets).toEqual(['Ota', 'Abeokuta', 'Sagamu']);
    expect(all).not.toMatch(/sango|olumo|orisha|shrine|god\b|pray|church|mosque/i);
    expect(JSON.stringify(ogun1)).not.toMatch(/sango|olumo/i);
  });

  it('Win and plop words read right', () => {
    expect(OGUN_WORDS.hall.plop(2)).toBe('Plop! 2 more bags.');
    expect(OGUN_WORDS.hall.plop(1)).toBe('Plop! 1 more bag.');
    expect(OGUN_WORDS.travel.spoken('Lagos', 20, true, false)).toBe('Lagos. Booming 20 of 20. Cog turning.');
    expect(OGUN_WORDS.travel.spoken('Ogun', 4, false, true)).toBe('Ogun. Booming 4 of 20. You are here.');
    expect(OGUN_WORDS.travel.booming(20, true)).toBe('Booming: 20 of 20 ✓');
  });
});
