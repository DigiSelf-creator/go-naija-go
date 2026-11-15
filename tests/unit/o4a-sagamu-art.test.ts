/**
 * O4a: Sagamu's art (docs/ogun.md 2.2, 2.3, 3.3, 3.6, 7; decisions 75 and 78 to 81). The stalls'
 * boards match the traders' calls, the signs are the made-up ones of 3.6, the cast mixes every
 * skin, age and dress with no broom, helmet or uniform, kola is only sold, the gravel's hop keeps
 * 3.3's numbers and holds still with reduced motion, its sounds are short and soft, and every
 * piece draws with good numbers, still or moving.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { OGUN_WORDS } from '../../src/screens/words';
import { isTrader } from '../../src/game/crowd';
import {
  FLYOVER,
  GRAVEL,
  SAGAMU_BUS_STOP,
  SAGAMU_CAST,
  SAGAMU_SIGNS,
  SAGAMU_SOUNDS,
  SAGAMU_STALL_WORDS,
  SAGAMU_TRADERS,
  SAGAMU_TRADER_LOOKS,
  drawFlyoverDeck,
  drawFlyoverStep,
  drawGravel,
  drawGravelCrumble,
  drawGravelDust,
  drawGravelKnocked,
  drawKolaBasket,
  drawLowRoad,
  drawSagamuBackdrop,
  drawSagamuStall,
  drawSagamuTraderStall,
  gravelHop,
} from '../../src/worlds/ogun/sagamu';

function fakeCanvas(): { g: CanvasRenderingContext2D; bad: string[] } {
  const bad: string[] = [];
  const fn = (name: string) => (...args: unknown[]) => {
    for (const a of args) if (typeof a === 'number' && !Number.isFinite(a)) bad.push(`${name}(${args.join(', ')})`);
    return proxy;
  };
  const proxy: object = new Proxy({}, { get: (_t, k) => (typeof k === 'string' ? fn(k) : undefined), set: () => true });
  return { g: proxy as CanvasRenderingContext2D, bad };
}

describe('O4a Sagamu art', () => {
  it("gives each trader a stall whose board matches the trader's call", () => {
    const calls = OGUN_WORDS.folk.traders.sagamu;
    expect(SAGAMU_TRADERS).toHaveLength(calls.length);
    SAGAMU_TRADERS.forEach((kind, i) => {
      const call = (calls[i] ?? '').toUpperCase();
      for (const word of SAGAMU_STALL_WORDS[kind].split(' ')) expect(call, kind).toContain(word);
      expect(isTrader(SAGAMU_TRADER_LOOKS[kind]), kind).toBe(true);
    });
  });

  it('uses only the made-up, everyday signs of 3.6', () => {
    expect([...SAGAMU_SIGNS].sort()).toEqual(['BATTERY CHARGING', 'GARRI IJEBU', 'IKOKORE', 'KOLA NUTS', 'VULCANIZER']);
  });

  it('draws nothing holy, no broken kola, no umbrella, broom, helmet, pipe or block (OG-R1, decision 75)', () => {
    const src = readFileSync('src/worlds/ogun/sagamu.ts', 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '').toLowerCase();
    for (const w of ['shrine', 'altar', 'orisha', 'sango', 'pray', 'masquerade', 'broom', 'helmet', 'umbrella', 'pipe', 'mushroom', 'brick', 'question', 'broken', 'halves', 'cutlass', 'machete', 'anvil', 'blast']) expect(src, w).not.toContain(w);
  });

  it('casts 16 with every skin twice, every age, a wheelchair, glasses, dress from across Nigeria, and no broom or helmet', () => {
    expect(SAGAMU_CAST).toHaveLength(16);
    for (let s = 0; s < 7; s++) expect(SAGAMU_CAST.filter((l) => l.skin === s).length, `skin ${s}`).toBeGreaterThanOrEqual(2);
    for (const age of ['child', 'teen', 'adult', 'elder'] as const) expect(SAGAMU_CAST.some((l) => l.age === age), age).toBe(true);
    expect(SAGAMU_CAST.filter((l) => l.chair)).toHaveLength(1);
    expect(SAGAMU_CAST.some((l) => l.glasses)).toBe(true);
    const dress = new Set(SAGAMU_CAST.map((l) => l.dress));
    expect(dress.size).toBeGreaterThanOrEqual(6);
    for (const d of ['babbanRiga', 'iroBuba', 'isiagu']) expect(dress.has(d as never), d).toBe(true);
    for (const l of SAGAMU_CAST) {
      expect(l.hold).not.toBe('broom');
      expect(l.head).not.toBe('helmet');
      expect(l.chair && l.stool).toBeFalsy();
    }
    expect(SAGAMU_CAST.filter(isTrader)).toHaveLength(3);
    expect(SAGAMU_TRADER_LOOKS.kola).toMatchObject({ dress: 'babbanRiga', head: 'rigaCap' });
    expect(SAGAMU_BUS_STOP).toHaveLength(3);
  });

  it("keeps 3.3's gravel numbers: 18 x 16, 70 u/s, 40 u hop every 0.7 s, 0.35 s up", () => {
    expect(GRAVEL).toMatchObject({ w: 18, h: 16, speed: 70, hop: 40, period: 0.7, air: 0.35 });
    let top = 0;
    let upTime = 0;
    const dt = 0.001;
    for (let t = 0; t < GRAVEL.period; t += dt) {
      const h = gravelHop(t);
      top = Math.max(top, h.lift);
      if (h.lift > 0) upTime += dt;
      expect(h.lift).toBeGreaterThanOrEqual(0);
      expect(h.lift).toBeLessThanOrEqual(GRAVEL.hop);
    }
    expect(top).toBeGreaterThan(GRAVEL.hop - 0.5);
    expect(upTime).toBeCloseTo(GRAVEL.air, 1);
    expect(gravelHop(0).frame).toBe('land');
    expect(gravelHop(0.3).frame).toBe('sit');
    expect(gravelHop(0.525).frame).toBe('top');
  });

  it('holds the gravel still with reduced motion, and on a bad time', () => {
    for (const t of [0, 0.5, 1.37, 1e5]) expect(gravelHop(t, true)).toEqual({ lift: 0, frame: 'sit' });
    expect(gravelHop(NaN)).toEqual({ lift: 0, frame: 'sit' });
  });

  it('keeps the gravel sounds short and soft (no square wave)', () => {
    for (const r of Object.values(SAGAMU_SOUNDS)) {
      for (const t of [...r.tones, ...(r.hiss ?? [])]) {
        expect('wave' in t ? t.wave : 'sine').not.toBe('square');
        expect((t.at ?? 0) + t.len).toBeLessThanOrEqual(0.35);
        expect(t.vol ?? 0).toBeLessThanOrEqual(0.06);
      }
    }
  });

  it('draws every piece with good numbers, moving and still', () => {
    const { g, bad } = fakeCanvas();
    expect(FLYOVER.slab).toBeGreaterThan(0);
    for (const time of [0, 1.37, 1e5, NaN]) {
      for (const still of [false, true]) {
        drawSagamuBackdrop(g, Number.isFinite(time) ? time * 50 : 0, 640, time, 420, 300, still);
        drawLowRoad(g, 4000, 4900, 160, 300, time, still);
        const h = gravelHop(time, still);
        drawGravel(g, 1500, 300 - h.lift, h.frame, 300, 1);
      }
      drawLowRoad(g, 4000, 4000, 160, 300, time);
      drawFlyoverDeck(g, 4000, 160, 900);
      for (const [x, y] of [[3800, 240], [3900, 180], [4950, 200], [5050, 250]] as const) drawFlyoverStep(g, x, y, 100, 300);
      for (const f of ['sit', 'land', 'rise', 'top', 'fall'] as const) drawGravel(g, 1500, 280, f, 300);
      for (const k of [0, 0.5, 1, NaN]) {
        drawGravelDust(g, 1500, 300, k);
        drawGravelCrumble(g, 1500, 300, k);
        drawGravelKnocked(g, 1500, 300, k);
      }
      drawSagamuStall(g, 8940, 245, 120);
      drawKolaBasket(g, 100, 280, 24);
      drawKolaBasket(g, 100, 280, 24, true);
      for (const k of SAGAMU_TRADERS) drawSagamuTraderStall(g, k, 1000, 300, time);
    }
    expect(bad).toEqual([]);
  });
});
