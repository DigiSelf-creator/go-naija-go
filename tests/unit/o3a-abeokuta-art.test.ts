/**
 * O3a: Abeokuta's art and the Ogun well room (docs/ogun.md 3.3, 3.5, 3.7, 4.1, 7; decisions 75
 * and 77). The stalls' boards match the traders' calls, the signs are made up, the cast mixes
 * every skin, age and dress with no broom, helmet or uniform, the crack sound is short and soft,
 * and every piece draws with good numbers, still or moving.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { OGUN_WORDS } from '../../src/screens/words';
import { isTrader } from '../../src/game/crowd';
import {
  ABEOKUTA_CAST,
  ABEOKUTA_SIGNS,
  ABEOKUTA_SOUNDS,
  ABEOKUTA_STALL_WORDS,
  ABEOKUTA_TRADERS,
  ABEOKUTA_TRADER_LOOKS,
  CRACK,
  OGUN_STORE_KEEPER,
  OGUN_STORE_KEEPER_SPOT,
  drawAbeokutaBackdrop,
  drawAbeokutaStall,
  drawAbeokutaTraderStall,
  drawAdireCloth,
  drawCrack,
  drawCrackSign,
  drawIjebuParcel,
  drawIjebuParcelIcon,
  drawOfada,
  drawOfadaIcon,
  drawOgunShelf,
  drawOgunWellRoom,
  drawRock,
  drawSackStack,
  drawTailorTable,
  drawWaterPothole,
} from '../../src/worlds/ogun/abeokuta';

function fakeCanvas(): { g: CanvasRenderingContext2D; bad: string[] } {
  const bad: string[] = [];
  const fn = (name: string) => (...args: unknown[]) => {
    for (const a of args) if (typeof a === 'number' && !Number.isFinite(a)) bad.push(`${name}(${args.join(', ')})`);
    return proxy;
  };
  const proxy: object = new Proxy({}, { get: (_t, k) => (typeof k === 'string' ? fn(k) : undefined), set: () => true });
  return { g: proxy as CanvasRenderingContext2D, bad };
}

describe('O3a Abeokuta art', () => {
  it("gives each trader a stall whose board matches the trader's call", () => {
    const calls = OGUN_WORDS.folk.traders.abeokuta;
    expect(ABEOKUTA_TRADERS).toHaveLength(calls.length);
    ABEOKUTA_TRADERS.forEach((kind, i) => {
      const call = (calls[i] ?? '').toUpperCase();
      for (const word of ABEOKUTA_STALL_WORDS[kind].split(' ')) expect(call, kind).toContain(word);
      expect(isTrader(ABEOKUTA_TRADER_LOOKS[kind]), kind).toBe(true);
    });
  });

  it('uses only the made-up, everyday signs of 3.5', () => {
    expect([...ABEOKUTA_SIGNS]).toEqual(['ADIRE', 'FINE CLOTH', 'OFADA RICE', 'TAILOR', 'PROVISIONS']);
  });

  it('never names the real rock or draws anything holy (decision 77, OG-R1)', () => {
    const src = readFileSync('src/worlds/ogun/abeokuta.ts', 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    for (const w of ['olumo', 'shrine', 'altar', 'orisha', 'sango', 'masquerade', 'broom', 'helmet', 'pipe', 'mushroom']) expect(src.toLowerCase(), w).not.toContain(w);
  });

  it('casts 16 with every skin twice, every age, a wheelchair, glasses, dress from across Nigeria, and no broom or helmet', () => {
    expect(ABEOKUTA_CAST).toHaveLength(16);
    for (let s = 0; s < 7; s++) expect(ABEOKUTA_CAST.filter((l) => l.skin === s).length, `skin ${s}`).toBeGreaterThanOrEqual(2);
    for (const age of ['child', 'teen', 'adult', 'elder'] as const) expect(ABEOKUTA_CAST.some((l) => l.age === age), age).toBe(true);
    expect(ABEOKUTA_CAST.filter((l) => l.chair)).toHaveLength(1);
    expect(ABEOKUTA_CAST.some((l) => l.glasses)).toBe(true);
    const dress = new Set(ABEOKUTA_CAST.map((l) => l.dress));
    expect(dress.size).toBeGreaterThanOrEqual(6);
    expect(['kaftan', 'babbanRiga', 'hijabDress'].some((d) => dress.has(d as never))).toBe(true);
    expect(['iroBuba', 'bubaSokoto', 'agbada'].some((d) => dress.has(d as never))).toBe(true);
    expect(['isiagu', 'etibo', 'anger'].some((d) => dress.has(d as never))).toBe(true);
    for (const l of [...ABEOKUTA_CAST, OGUN_STORE_KEEPER]) {
      expect(l.hold).not.toBe('broom');
      expect(l.head).not.toBe('helmet');
      expect(l.chair && l.stool).toBeFalsy();
    }
    expect(ABEOKUTA_CAST.filter(isTrader)).toHaveLength(3);
  });

  it('seats the store keeper (an elder man in buba and sokoto with a fila) on a stool at room x 60 to 100', () => {
    expect(OGUN_STORE_KEEPER).toMatchObject({ age: 'elder', sex: 'm', dress: 'bubaSokoto', head: 'fila', stool: true });
    expect(OGUN_STORE_KEEPER_SPOT.x).toBeGreaterThanOrEqual(60);
    expect(OGUN_STORE_KEEPER_SPOT.x).toBeLessThanOrEqual(100);
  });

  it('keeps the crack sound short and soft (no square wave)', () => {
    for (const r of Object.values(ABEOKUTA_SOUNDS)) {
      for (const t of [...r.tones, ...(r.hiss ?? [])]) {
        expect('wave' in t ? t.wave : 'sine').not.toBe('square');
        expect((t.at ?? 0) + t.len).toBeLessThanOrEqual(CRACK.openTime + 0.01);
        expect(t.vol ?? 0).toBeLessThanOrEqual(0.08);
      }
    }
  });

  it('draws every piece with good numbers, moving and still', () => {
    const { g, bad } = fakeCanvas();
    for (const time of [0, 1.37, 1e5, NaN]) {
      for (const still of [false, true]) {
        drawAbeokutaBackdrop(g, Number.isFinite(time) ? time * 50 : 0, 640, time, 420, 300, still);
        drawWaterPothole(g, 2600, 2640, 300, 420, time, still);
        for (const k of [0, 0.3, 0.5, 0.8, 1, NaN]) drawCrack(g, 5250, 40, 300, 420, k, time, still);
        drawOgunWellRoom(g, 0, 640, time, 420, still);
      }
      drawRock(g, 1200, 100, 50);
      drawRock(g, 1460, 100, 150);
      drawRock(g, 1900, 300, 90, 300, [2000, 2100]);
      drawCrackSign(g, 5100);
      drawAbeokutaStall(g, 9040, 180, 245);
      drawOfada(g, 6900, 272, time);
      drawOfadaIcon(g, 16, 16, 0.85);
      for (const k of ABEOKUTA_TRADERS) drawAbeokutaTraderStall(g, k, 1000, 300, time);
      drawTailorTable(g, 1200);
      for (let c = 0; c < 4; c++) drawAdireCloth(g, 0, 0, 20, 30, c);
      drawSackStack(g, 110, 240, 90);
      drawSackStack(g, 380, 250, 90);
      drawOgunShelf(g, 240, 200, 90);
      drawIjebuParcel(g, 285, 176, time);
      drawIjebuParcelIcon(g, 16, 16, 24);
    }
    expect(bad).toEqual([]);
  });
});
