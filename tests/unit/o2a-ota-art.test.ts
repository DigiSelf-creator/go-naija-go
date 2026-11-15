/**
 * O2a: Ota's art (docs/ogun.md 3.3, 3.4, 4.1, 7). The stalls' boards match the traders' calls,
 * the cast mixes every skin, age and dress with no broom, no helmet or uniform, the mud step
 * sounds are short and soft, and every piece draws with good numbers, still or moving.
 */
import { describe, expect, it } from 'vitest';
import { OGUN_WORDS } from '../../src/screens/words';
import { isTrader } from '../../src/game/crowd';
import {
  OTA_CAST,
  OTA_SIGNS,
  OTA_SOUNDS,
  OTA_STALL_WORDS,
  OTA_TRADERS,
  OTA_TRADER_LOOKS,
  drawIjebuGarriCrate,
  drawIjebuGarriIcon,
  drawIkokore,
  drawIkokoreIcon,
  drawMud,
  drawMudPrint,
  drawMudSplash,
  drawOtaBackdrop,
  drawOtaStall,
  drawOtaTraderStall,
} from '../../src/worlds/ogun/ota';

/** A canvas stand-in that takes every call and notes any number that is not finite. */
function fakeCanvas(): { g: CanvasRenderingContext2D; bad: string[] } {
  const bad: string[] = [];
  const fn = (name: string) => (...args: unknown[]) => {
    for (const a of args) if (typeof a === 'number' && !Number.isFinite(a)) bad.push(`${name}(${args.join(', ')})`);
    return proxy;
  };
  const proxy: object = new Proxy({}, { get: (_t, k) => (typeof k === 'string' ? fn(k) : undefined), set: () => true });
  return { g: proxy as CanvasRenderingContext2D, bad };
}

describe('O2a Ota art', () => {
  it("gives each trader a stall whose board matches the trader's call", () => {
    const calls = OGUN_WORDS.folk.traders.ota;
    expect(OTA_TRADERS).toHaveLength(calls.length);
    OTA_TRADERS.forEach((kind, i) => {
      const call = (calls[i] ?? '').toUpperCase();
      for (const word of OTA_STALL_WORDS[kind].split(' ')) expect(call, kind).toContain(word);
      expect(isTrader(OTA_TRADER_LOOKS[kind]), kind).toBe(true);
    });
  });

  it('uses only made-up, everyday signs', () => {
    expect([...OTA_SIGNS]).toEqual(['OFADA RICE', 'VULCANIZER', 'POS HERE', 'PROVISIONS', 'BUKA']);
  });

  it('casts 16 with every skin twice, every age, a wheelchair, glasses, dress from across Nigeria, and no broom, helmet or red cap', () => {
    expect(OTA_CAST).toHaveLength(16);
    for (let s = 0; s < 7; s++) expect(OTA_CAST.filter((l) => l.skin === s).length, `skin ${s}`).toBeGreaterThanOrEqual(2);
    for (const age of ['child', 'teen', 'adult', 'elder'] as const) expect(OTA_CAST.some((l) => l.age === age), age).toBe(true);
    expect(OTA_CAST.filter((l) => l.chair)).toHaveLength(1);
    expect(OTA_CAST.some((l) => l.glasses)).toBe(true);
    const dress = new Set(OTA_CAST.map((l) => l.dress));
    expect(dress.size).toBeGreaterThanOrEqual(6);
    expect(['kaftan', 'babbanRiga', 'hijabDress'].some((d) => dress.has(d as never))).toBe(true);
    expect(['iroBuba', 'bubaSokoto', 'agbada'].some((d) => dress.has(d as never))).toBe(true);
    expect(['isiagu', 'etibo', 'anger'].some((d) => dress.has(d as never))).toBe(true);
    for (const l of OTA_CAST) {
      expect(l.hold).not.toBe('broom');
      expect(l.head).not.toBe('helmet');
      expect(l.chair && l.stool).toBeFalsy();
    }
    // Exactly the three traders call out (children never work)
    expect(OTA_CAST.filter(isTrader)).toHaveLength(3);
  });

  it('keeps the mud step short and soft (no square wave)', () => {
    for (const r of Object.values(OTA_SOUNDS)) {
      for (const t of r.tones) {
        expect(t.wave).not.toBe('square');
        expect((t.at ?? 0) + t.len).toBeLessThanOrEqual(0.2);
        expect(t.vol ?? 0).toBeLessThanOrEqual(0.08);
      }
    }
  });

  it('draws every piece with good numbers, moving and still', () => {
    const { g, bad } = fakeCanvas();
    for (const time of [0, 1.37, 1e5]) {
      for (const still of [false, true]) {
        drawOtaBackdrop(g, time * 50, 640, time, 420, 300, still);
        drawMud(g, 2100, 120, 300, time, still);
      }
      drawOtaStall(g, 3440, 240, 140);
      drawIkokore(g, 5700, 272, time);
      drawIkokoreIcon(g, 16, 16, 0.85);
      drawIjebuGarriCrate(g, 3900, 204, { open: time > 1, angle: Math.sin(time) * 0.1 });
      drawIjebuGarriIcon(g, 16, 16, 1);
      for (const k of OTA_TRADERS) drawOtaTraderStall(g, k, 1000, 300, time);
      for (const k of [0, 0.5, 0.99, 1, NaN]) {
        drawMudPrint(g, 2120, 300, k);
        drawMudSplash(g, 2120, 300, k);
      }
    }
    expect(bad).toEqual([]);
  });
});
