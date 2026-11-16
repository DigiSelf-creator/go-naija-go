/**
 * O2a: Ota's art (docs/ogun.md 3.3, 3.4, 4.1, 7). The stalls' boards match the traders' calls,
 * the cast mixes every skin, age and dress with no broom, no helmet or uniform, the mud step
 * sounds are short and soft, and every piece draws with good numbers, still or moving.
 */
import { describe, expect, it } from 'vitest';
import { OGUN_WORDS } from '../../src/screens/words';
import { isTrader } from '../../src/game/crowd';
import { POTHOLE, POTHOLE_RIM, ROAD } from '../../src/art/palette';
import { ABK } from '../../src/worlds/ogun/abeokuta';
import {
  MUD,
  MUD_INK,
  OTA,
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

  describe('OG-R33: mud never looks like a pothole', () => {
    const grey = (hex: string): number => {
      const n = parseInt(hex.slice(1), 16);
      return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
    };
    /** A canvas that keeps a log of every call, and notes each stroked path holding a closed ring. */
    function logCanvas(): { g: CanvasRenderingContext2D; log: string[]; rings: string[]; pts: [string, number][] } {
      const log: string[] = [];
      const rings: string[] = [];
      const pts: [string, number][] = [];
      let ringInPath = false;
      const st: Record<string, unknown> = {};
      const g = new Proxy(st, {
        get: (_t, k) => {
          if (typeof k !== 'string') return undefined;
          if (k in st) return st[k];
          return (...a: number[]) => {
            log.push(`${k}(${a.map((v) => (typeof v === 'number' ? v.toFixed(2) : v)).join(',')})`);
            if (k === 'beginPath') ringInPath = false;
            if ((k === 'ellipse' && Math.abs((a[6] ?? 0) - (a[5] ?? 0)) >= Math.PI * 2 - 1e-6) || (k === 'arc' && Math.abs((a[4] ?? 0) - (a[3] ?? 0)) >= Math.PI * 2 - 1e-6)) ringInPath = true;
            if (k === 'stroke' && ringInPath && st.strokeStyle === OTA.shine) rings.push(String(st.strokeStyle));
            if (k === 'moveTo' || k === 'lineTo') pts.push([k, a[1]!]);
            if (k === 'quadraticCurveTo') pts.push([k, a[3]!]);
            if (k === 'ellipse') pts.push([k, a[1]! - a[3]!]);
          };
        },
        set: (_t, k, v) => {
          st[k as string] = v;
          log.push(`${String(k)}=${v}`);
          return true;
        },
      }) as unknown as CanvasRenderingContext2D;
      return { g, log, rings, pts };
    }

    it('is a mid brown, lighter in grey than the tar, every pothole and pothole water', () => {
      const fill = grey(MUD_INK.fill);
      for (const dark of [ROAD, POTHOLE, POTHOLE_RIM, ABK.water, ABK.waterDeep]) expect(fill - grey(dark), dark).toBeGreaterThan(15);
      expect(fill).toBeLessThan(170); // still a brown, not a pale sand
    });

    it('lies level with the road: the edge band stays clear, only clods sit on top', () => {
      for (const w of [80, 130, 200]) {
        const { g, pts } = logCanvas();
        drawMud(g, 2000, w, 300, 1.3, false);
        expect(MUD.top).toBeGreaterThanOrEqual(5); // the road's edge band (5 u) runs on unbroken
        for (const [k, y] of pts) {
          // Clods are drawn as ellipses resting on the road line, no taller than 6 u
          if (k === 'ellipse') expect(y).toBeGreaterThanOrEqual(300 - 6.01);
          else if (y < 300 + MUD.top) expect(y).toBe(300); // a clod's foot on the line
        }
      }
    });

    it('has boot prints from the start and shine streaks, never rings', () => {
      for (const [w, boots] of [[80, 2], [160, 3]] as const) {
        const { g, log, rings } = logCanvas();
        drawMud(g, 2000, w, 300, 0.7, false);
        expect(log.filter((c) => c.startsWith('roundRect(')).length).toBe(boots * 2); // sole + heel each
        expect(rings).toEqual([]);
      }
    });

    it('holds still under reduced motion', () => {
      const a = logCanvas();
      const b = logCanvas();
      drawMud(a.g, 2000, 150, 300, 0, true);
      drawMud(b.g, 2000, 150, 300, 9.37, true);
      expect(a.log).toEqual(b.log);
      const c = logCanvas();
      drawMud(c.g, 2000, 150, 300, 9.37, false);
      expect(c.log).not.toEqual(b.log);
    });
  });
});
