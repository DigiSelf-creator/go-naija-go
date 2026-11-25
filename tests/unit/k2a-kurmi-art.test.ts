/**
 * K2a: Kurmi's art (docs/kano.md 2.2, 2.3, 3.3, 3.4, 4.1, 7 and 9.1). The wind shows by shape
 * (sign arrow, pennants, streaks) and points the right way; the haze is gold and only on the far
 * rooftops; every piece draws with good numbers and only its own made-up words; the cast is wide
 * and kind; and the new files stay small and inside the lazy Kano part.
 */
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { FOLK_SKINS } from '../../src/art/folk';
import {
  drawHoop,
  drawKilishi,
  drawKilishiIcon,
  drawKurmiBackdrop,
  drawKurmiFar,
  drawKurmiRow,
  drawKurmiStall,
  drawKurmiTraderStall,
  KURMI,
  KURMI_CAST,
  KURMI_HOOP,
  KURMI_SIGNS,
  KURMI_STALL_WORDS,
  KURMI_TRADER_LOOKS,
  KURMI_TRADERS,
} from '../../src/worlds/kano/kurmi';
import { drawDustStreaks, drawWindSign, drawWindStreamers, KANO_WIND_SOUNDS, WIND_LOOK, windFrame, windShow, windSign, type WindStretch } from '../../src/worlds/kano/wind';
import { KANO_WORDS } from '../../src/worlds/kano/words';

interface Fake {
  g: CanvasRenderingContext2D;
  bad: string[];
  words: string[];
  calls: number;
  fills: Set<string>;
  lineX: number[];
}

/** A canvas stand-in that takes every call, notes bad numbers, words, fill colours and lineTo x's. */
function fakeCanvas(): Fake {
  const f: Fake = { g: null as unknown as CanvasRenderingContext2D, bad: [], words: [], calls: 0, fills: new Set(), lineX: [] };
  const fn = (name: string) => (...args: unknown[]) => {
    f.calls++;
    for (const a of args) if (typeof a === 'number' && !Number.isFinite(a)) f.bad.push(`${name}(${args.join(', ')})`);
    if (name === 'fillText' || name === 'strokeText') f.words.push(String(args[0]));
    if (name === 'lineTo') f.lineX.push(Math.round((args[0] as number) * 1000) / 1000 + 0);
    if (name === 'createLinearGradient') return { addColorStop: () => undefined };
    return proxy;
  };
  const proxy: object = new Proxy(
    {},
    {
      get: (_t, k) => (k === 'globalAlpha' ? 1 : typeof k === 'string' ? fn(k) : undefined),
      set: (_t, k, v) => {
        if (k === 'fillStyle' && typeof v === 'string') f.fills.add(v);
        return true;
      },
    },
  );
  f.g = proxy as CanvasRenderingContext2D;
  return f;
}

const WINDS: readonly WindStretch[] = [[2200, 800, 'back'], [3600, 600, 'face'], [6800, 800, 'face'], [10000, 600, 'back']];

describe('K2a the wind shows by shape and points the right way (kano.md 3.3)', () => {
  it('windShow: full inside a stretch, fading over WIND_LOOK.fade either side, nothing far off', () => {
    expect(windShow(WINDS, 2500)).toEqual({ dir: 'back', k: 1 });
    expect(windShow(WINDS, 3900)).toEqual({ dir: 'face', k: 1 });
    const near = windShow(WINDS, 2200 - WIND_LOOK.fade / 2);
    expect(near.dir).toBe('back');
    expect(near.k).toBeCloseTo(0.5, 5);
    expect(windShow(WINDS, 5000)).toEqual({ dir: null, k: 0 });
    expect(windShow(WINDS, Number.NaN)).toEqual({ dir: null, k: 0 });
    expect(windShow([], 2500)).toEqual({ dir: null, k: 0 });
    // Between two close stretches the nearer one wins
    expect(windShow(WINDS, 3010).dir).toBe('back');
    expect(windShow(WINDS, 3590).dir).toBe('face');
  });

  it('behind you blows to +x, in your face to -x; reduced motion holds one flutter frame', () => {
    expect(windSign('back')).toBe(1);
    expect(windSign('face')).toBe(-1);
    expect(windFrame(0.3, true)).toBe(0);
    expect(windFrame(Number.NaN)).toBe(0);
    expect(new Set([0, 0.1, 0.2, 0.3].map((t) => windFrame(t))).size).toBe(2);
  });

  it('the sign, the pennants and the streaks are mirror images for the two ways, with no words', () => {
    for (const t of [0, 0.11]) {
      const back = fakeCanvas();
      const face = fakeCanvas();
      drawWindSign(back.g, 400, 300, 'back', t);
      drawWindSign(face.g, 400, 300, 'face', t);
      expect(back.bad).toEqual([]);
      expect(back.words).toEqual([]);
      expect(back.lineX.length).toBeGreaterThan(6);
      expect(face.lineX).toEqual(back.lineX.map((x) => -x + 0));
      // The arrow's tip and the streamer's end point the way the wind blows
      expect(Math.max(...back.lineX)).toBeGreaterThan(10);
      expect(Math.min(...face.lineX)).toBeLessThan(-10);
    }
    for (const dir of ['back', 'face'] as const) {
      const s = fakeCanvas();
      drawWindStreamers(s.g, 2200, 3000, 300, dir, 1.7, false);
      drawWindStreamers(s.g, 2200, 3000, 300, dir, 1.7, true, 2500, 2900);
      expect(s.bad).toEqual([]);
      expect(s.words).toEqual([]);
      const d = fakeCanvas();
      drawDustStreaks(d.g, 851, dir, 0.7, 2.2, false, 2400);
      drawDustStreaks(d.g, 320, dir, 1, 0, true);
      expect(d.bad).toEqual([]);
      expect(d.words).toEqual([]);
      const none = fakeCanvas();
      drawDustStreaks(none.g, 851, dir, 0, 2.2);
      expect(none.calls).toBe(0);
    }
  });

  it('the streaks stay in the sky, well above the play line and the near row', () => {
    expect(WIND_LOOK.streakTop).toBeGreaterThanOrEqual(0);
    expect(WIND_LOOK.streakBottom).toBeLessThanOrEqual(110);
    // The rope of pennants hangs above people's heads (37 u) and the roof platforms (55 u)
    expect(WIND_LOOK.ropeH).toBeGreaterThan(60);
  });

  it('the whoosh is soft and short', () => {
    const r = KANO_WIND_SOUNDS.windWhoosh;
    for (const t of r.tones) expect(t.vol ?? 0).toBeLessThanOrEqual(0.02);
    for (const h of r.hiss ?? []) expect((h.at ?? 0) + h.len).toBeLessThanOrEqual(1);
  });
});

describe('K2a Kurmi backdrop (kano.md 2.2, 2.5, KN-R6)', () => {
  it('the haze is gold, never grey, and is painted on the far rooftops only', () => {
    const [r, gr, b] = KURMI.haze.match(/\d+/g)!.map(Number) as [number, number, number];
    expect(r - b).toBeGreaterThan(60);
    expect(gr - b).toBeGreaterThan(40);
    const far = fakeCanvas();
    drawKurmiFar(far.g, 900, 851, 300);
    expect(far.fills.has(KURMI.haze)).toBe(true);
    const row = fakeCanvas();
    drawKurmiRow(row.g, 900, 851, 300);
    expect(row.fills.has(KURMI.haze)).toBe(false);
  });

  it('draws at phone sizes, calm or in wind, still or moving, with only its made-up shop words', () => {
    for (const [w, h] of [[320, 240], [568, 320], [640, 200], [851, 393]] as const) {
      const V = (w * 420) / h;
      for (const wind of [undefined, { dir: 'back' as const, k: 1 }, { dir: 'face' as const, k: 0.4 }, { dir: null, k: 0 }])
        for (const still of [false, true]) {
          const c = fakeCanvas();
          drawKurmiBackdrop(c.g, 2350, V, 3.1, 420, 300, still, wind);
          expect(c.bad, `${w}x${h}`).toEqual([]);
          for (const word of c.words) expect(KURMI_SIGNS as readonly string[]).toContain(word);
        }
    }
  });

  it('the roof platform, the hoop and kilishi draw with no words', () => {
    const c = fakeCanvas();
    drawKurmiStall(c.g, 8500, 245, 120, 300);
    drawHoop(c.g, 900, 292, 1.2);
    drawHoop(c.g, 900, 292, Number.NaN, true);
    drawKilishi(c.g, 6600, 276, 0.8);
    drawKilishi(c.g, 6600, 276, Number.NaN);
    for (const s of [0.5, 0.75, 1]) drawKilishiIcon(c.g, 0, 0, s);
    expect(c.bad).toEqual([]);
    expect(c.words).toEqual([]);
  });

  it("each trader's stall board matches their own call, in KANO_WORDS order", () => {
    const calls = KANO_WORDS.folk.traders.kurmi;
    expect(KURMI_TRADERS.length).toBe(calls.length);
    KURMI_TRADERS.forEach((kind, i) => {
      const c = fakeCanvas();
      drawKurmiTraderStall(c.g, kind, 500, 292, 2);
      expect(c.bad).toEqual([]);
      expect(c.words).toEqual([KURMI_STALL_WORDS[kind]]);
      expect(KURMI_STALL_WORDS[kind]).toBe(calls[i]!.replace(/!$/, '').toUpperCase());
    });
  });

  it('every word painted is plain English shop words: no script, title, faith or brand', () => {
    for (const w of [...KURMI_SIGNS, ...Object.values(KURMI_STALL_WORDS)]) {
      expect(w).toMatch(/^[A-Z ]+$/);
      expect(w).not.toMatch(/MOSQUE|EMIR|PALACE|DURBAR|PRAYER|CHURCH|KING|ROYAL/);
    }
  });
});

describe('K2a Kurmi cast (kano.md 2.4 and 7)', () => {
  it('16 looks: every skin tone at least twice, every age, a wheelchair user, glasses', () => {
    expect(KURMI_CAST.length).toBe(16);
    for (let s = 0; s < FOLK_SKINS.length; s++) expect(KURMI_CAST.filter((l) => l.skin === s).length, `skin ${s}`).toBeGreaterThanOrEqual(2);
    for (const age of ['child', 'teen', 'adult', 'elder'] as const) expect(KURMI_CAST.some((l) => l.age === age), age).toBe(true);
    expect(KURMI_CAST.some((l) => l.chair)).toBe(true);
    expect(KURMI_CAST.some((l) => l.glasses)).toBe(true);
    expect(new Set(KURMI_CAST.map((l) => l.dress)).size).toBeGreaterThanOrEqual(7);
  });

  it('everyday clothes only: no helmet or uniform, no dress worn as a sign of faith, caps never red', () => {
    for (const l of KURMI_CAST) {
      expect(['helmet', 'hijab']).not.toContain(l.head ?? 'none');
      expect(l.dress).not.toBe('hijabDress');
      if (l.head === 'kaftanCap' || l.head === 'rigaCap' || l.head === 'fila') expect((l.h ?? l.a).toLowerCase()).not.toMatch(/^#(e0572b|d6336c|8e2a3a|c8583a|ff0000)$/);
      // No walking stick (decision 21) and no held broom (decision 75)
      expect(Object.keys(l)).not.toContain('stick');
    }
  });

  it('the traders are adults in the cast; the hoop children have a parent close by', () => {
    for (const kind of KURMI_TRADERS) {
      expect(KURMI_CAST).toContain(KURMI_TRADER_LOOKS[kind]);
      expect(KURMI_TRADER_LOOKS[kind].age).toBe('adult');
    }
    expect(KURMI_HOOP[0].age).toBe('child');
    expect(KURMI_HOOP[1].age).toBe('child');
    expect(KURMI_HOOP[2].age).toBe('adult');
  });
});

describe('K2a stays light and in the lazy Kano part (kano.md 9.1)', () => {
  const FILES = ['layer.ts', 'wind.ts', 'kurmi.ts'].map((f) => `src/worlds/kano/${f}`);

  it('imports no value from outside src/worlds/kano/ (types only)', () => {
    for (const p of FILES) {
      const src = readFileSync(p, 'utf8');
      for (const m of src.matchAll(/^(import|export)\s+(type\s+)?[^;]*?from\s+'([^']+)'/gm)) {
        if (m[2]) continue;
        expect(m[3], `${p}: ${m[0]}`).toMatch(/^\.\/[^/]+$/);
      }
    }
  });

  it('no blur, filters or shadows; the code is within its 12 KB gzip budget', () => {
    let all = '';
    for (const p of FILES) {
      const src = readFileSync(p, 'utf8');
      expect(src, p).not.toMatch(/shadowBlur|shadowColor|\.filter\s*=|blur\(/);
      all += src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    }
    expect(gzipSync(all).length).toBeLessThan(12 * 1024);
  });
});
