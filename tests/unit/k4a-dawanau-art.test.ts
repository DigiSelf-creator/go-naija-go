/**
 * K4a: Dawanau's art (docs/kano.md 2.2, 2.3, 3.3, 3.6, 5.4, 7 and 9.1). The dust whirl fits its
 * 30 x 50 box, spins and puffs apart, and reads on every ground it meets (Dawanau's road and
 * pavement, Borehole Hall's floor) in greyscale; sack steps' tops are their landing lines; the
 * front stack hides the well but not its arrow; the pyramid and every piece draw with good numbers
 * and only their own made-up words; the haze stays on the far strip; the cast is wide and kind; the
 * sounds are soft; and the new files stay small and inside the lazy Kano part.
 */
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { FOLK_SKINS } from '../../src/art/folk';
import { WELL } from '../../src/art/well';
import { BH, BH_HALL } from '../../src/worlds/kano/boreholeHall';
import {
  DAWANAU,
  DAWANAU_BUS_STOP,
  DAWANAU_CAST,
  DAWANAU_DRIVER,
  DAWANAU_FAMILY,
  DAWANAU_MEASURERS,
  DAWANAU_OIL_SELLER,
  DAWANAU_PORTERS,
  DAWANAU_SIGNS,
  DAWANAU_STALL_WORDS,
  DAWANAU_TRADER_LOOKS,
  DAWANAU_TRADERS,
  GRAIN,
  drawDawanauBackdrop,
  drawDawanauFar,
  drawDawanauRow,
  drawDawanauStall,
  drawDawanauTraderStall,
  drawGrainSack,
  drawHeadSack,
  drawOilTable,
  drawTeaBox,
  type GrainKind,
} from '../../src/worlds/kano/dawanau';
import { SACK, SACK_FRONT, drawGroundnutPyramid, drawSackFront, drawSackSteps } from '../../src/worlds/kano/sacks';
import { KANO_WHIRL_SOUNDS, WHIRL, WHIRL_COL, drawDustWhirl, drawWhirlIcon, whirlPuffK, whirlSway } from '../../src/worlds/kano/whirl';
import { KANO_WORDS } from '../../src/worlds/kano/words';
import kano3 from '../../src/data/levels/kano-3.json';
import kanoHall from '../../src/data/levels/kano-hall.json';

interface Fake {
  g: CanvasRenderingContext2D;
  bad: string[];
  words: string[];
  fills: Set<string>;
  xs: number[];
  ys: number[];
}

/** A canvas stand-in that takes every call, notes bad numbers, words, fill colours and the points of paths and rects. */
function fakeCanvas(): Fake {
  const f: Fake = { g: null as unknown as CanvasRenderingContext2D, bad: [], words: [], fills: new Set(), xs: [], ys: [] };
  const fn = (name: string) => (...args: unknown[]) => {
    for (const a of args) if (typeof a === 'number' && !Number.isFinite(a)) f.bad.push(`${name}(${args.join(', ')})`);
    if (name === 'fillText' || name === 'strokeText') f.words.push(String(args[0]));
    if (name === 'moveTo' || name === 'lineTo' || name === 'fillRect' || name === 'quadraticCurveTo' || name === 'roundRect' || name === 'rect') {
      f.xs.push(args[0] as number);
      f.ys.push(args[1] as number);
    }
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

const lum = (hex: string): number => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
  return 0.299 * r + 0.587 * g + 0.114 * b;
};

describe('K4a the dust whirl (kano.md 3.3, 5.4)', () => {
  it('is 30 wide and 50 tall, as the level and hall files say', () => {
    expect(WHIRL.w).toBe(30);
    expect(WHIRL.h).toBe(50);
    expect(kanoHall.boss.whirl.w).toBe(WHIRL.w);
    expect(kanoHall.boss.whirl.h).toBe(WHIRL.h);
    expect(kano3.hazards.filter(([k]) => k === 'whirl').length).toBeGreaterThanOrEqual(7);
  });

  it('stays inside its box (plus the small sway) at any time, still or moving, on the street and in the hall', () => {
    for (const [x, gy] of [[1500, 300], [BH_HALL.heroMaxX, BH_HALL.floorY]] as const)
      for (const t of [0, 0.31, 1.7, 4.4, Number.NaN])
        for (const still of [false, true]) {
          const c = fakeCanvas();
          drawDustWhirl(c.g, x, gy, t, { still });
          expect(c.bad).toEqual([]);
          expect(c.words).toEqual([]);
          expect(Math.min(...c.ys)).toBeGreaterThanOrEqual(gy - WHIRL.h - 0.01);
          expect(Math.max(...c.ys)).toBeLessThanOrEqual(gy);
          expect(Math.min(...c.xs)).toBeGreaterThanOrEqual(x - WHIRL.w / 2 - WHIRL.sway - 0.01);
          expect(Math.max(...c.xs)).toBeLessThanOrEqual(x + WHIRL.w / 2 + WHIRL.sway + 0.01);
        }
  });

  it('sways a little (look only) and never in reduced motion', () => {
    expect(whirlSway(1.2, 0, true)).toBe(0);
    expect(whirlSway(Number.NaN)).toBe(0);
    let most = 0;
    for (let t = 0; t < 3; t += 0.05) most = Math.max(most, Math.abs(whirlSway(t, 0.4)));
    expect(most).toBeGreaterThan(1);
    expect(most).toBeLessThanOrEqual(WHIRL.sway);
  });

  it('puffs apart over a short time, then is gone; the puff draws cleanly', () => {
    expect(whirlPuffK(-0.1)).toBeNull();
    expect(whirlPuffK(Number.NaN)).toBeNull();
    expect(whirlPuffK(0)).toBe(0);
    expect(whirlPuffK(WHIRL.puffS / 2)).toBeCloseTo(0.5);
    expect(whirlPuffK(WHIRL.puffS)).toBeNull();
    expect(WHIRL.puffS).toBeLessThanOrEqual(0.6);
    for (const k of [0, 0.4, 1, Number.NaN]) {
      const c = fakeCanvas();
      drawDustWhirl(c.g, 4300, 300, 1, { puff: k });
      expect(c.bad).toEqual([]);
    }
  });

  it('reads on every ground it meets and in greyscale: pale dust, dark streaks and an ink outline', () => {
    // Dawanau's road (grey), its pavement, and Borehole Hall's sandy floor
    for (const ground of ['#6e6a66', DAWANAU.pave, BH.floor]) expect(Math.abs(lum(WHIRL_COL.dust) - lum(ground)), ground).toBeGreaterThan(40);
    expect(lum(WHIRL_COL.dust) - lum(WHIRL_COL.streak)).toBeGreaterThan(120);
    for (const leaf of [WHIRL_COL.leaf, WHIRL_COL.leaf2]) expect(lum(WHIRL_COL.dust) - lum(leaf)).toBeGreaterThan(80);
    // The hall's floor is the closest; the outline and streaks carry it there
    expect(lum(BH.floor) - lum(WHIRL_COL.streak)).toBeGreaterThan(80);
  });

  it('draws as a small icon at card sizes', () => {
    for (const s of [16, 24, 32, Number.NaN]) {
      const c = fakeCanvas();
      drawWhirlIcon(c.g, 20, 20, s);
      expect(c.bad).toEqual([]);
    }
  });

  it('its "fff" and puff are soft and short', () => {
    for (const r of Object.values(KANO_WHIRL_SOUNDS)) {
      for (const t of r.tones) {
        expect(t.vol ?? 0).toBeLessThanOrEqual(0.04);
        expect((t.at ?? 0) + t.len).toBeLessThanOrEqual(0.5);
      }
      for (const h of r.hiss ?? []) {
        expect(h.vol).toBeLessThanOrEqual(0.05);
        expect((h.at ?? 0) + h.len).toBeLessThanOrEqual(0.5);
      }
    }
  });
});

describe('K4a sacks (kano.md 3.3, 3.6, KN-R5)', () => {
  it("each sack step's top is exactly its landing line; nothing drawn above it or below the road", () => {
    for (const [x, w, h] of kano3.sacks) {
      const c = fakeCanvas();
      drawSackSteps(c.g, x!, w!, h!, 300);
      expect(c.bad).toEqual([]);
      expect(c.words).toEqual([]);
      expect(Math.min(...c.ys)).toBeGreaterThanOrEqual(300 - h! - 0.01);
      expect(Math.min(...c.ys)).toBeLessThanOrEqual(300 - h! + 0.01);
      expect(Math.max(...c.ys)).toBeLessThanOrEqual(300);
      expect(Math.min(...c.xs)).toBeGreaterThanOrEqual(x! - 0.01);
      expect(Math.max(...c.xs)).toBeLessThanOrEqual(x! + w! + 0.01);
    }
  });

  it("the front stack hides the well's frame but not its down arrow", () => {
    expect(SACK_FRONT.h).toBeGreaterThan(WELL.frameH);
    // The arrow's lowest point (its tip at the bottom of its bob) stays above the stack
    expect(WELL.frameH + 26 - 6 - 4).toBeGreaterThan(SACK_FRONT.h);
    expect(SACK_FRONT.w).toBeGreaterThan(WELL.w + 20);
    for (const a of [1, 0.5, Number.NaN]) {
      const c = fakeCanvas();
      drawSackFront(c.g, kano3.wells[0]!.x, 300, a);
      expect(c.bad).toEqual([]);
      expect(c.words).toEqual([]);
      expect(Math.min(...c.ys)).toBeGreaterThanOrEqual(300 - SACK_FRONT.h - 0.01);
    }
  });

  it('the groundnut pyramid is plain sacks with no words, faded or bright, at any size', () => {
    for (const lit of [false, true])
      for (const s of [0.5, 0.8, 1, 2, Number.NaN]) {
        const c = fakeCanvas();
        drawGroundnutPyramid(c.g, 400, 200, s, lit);
        expect(c.bad).toEqual([]);
        expect(c.words).toEqual([]);
      }
    expect(SACK.bands.length).toBe(3);
  });
});

describe('K4a Dawanau backdrop (kano.md 2.2, 2.5, 3.6, KN-R6)', () => {
  it('the haze is gold, never grey, and is painted on the far strip (with the pyramid) only', () => {
    const [r, gr, b] = DAWANAU.haze.match(/\d+/g)!.map(Number) as [number, number, number];
    expect(r - b).toBeGreaterThan(60);
    expect(gr - b).toBeGreaterThan(40);
    const far = fakeCanvas();
    drawDawanauFar(far.g, 900, 851, 300);
    expect(far.fills.has(DAWANAU.haze)).toBe(true);
    const row = fakeCanvas();
    drawDawanauRow(row.g, 900, 851, 300);
    expect(row.fills.has(DAWANAU.haze)).toBe(false);
    // The near row has the market: sacks and grain
    expect(row.fills.has(SACK.body)).toBe(true);
    expect(row.fills.has(GRAIN.maize[0])).toBe(true);
  });

  it('draws at phone sizes, calm or in wind, still or moving, with only its made-up shop words', () => {
    for (const [w, h] of [[320, 240], [568, 320], [640, 200], [851, 393]] as const) {
      const V = (w * 420) / h;
      for (const wind of [undefined, { dir: 'back' as const, k: 1 }, { dir: null, k: 0 }])
        for (const still of [false, true]) {
          const c = fakeCanvas();
          drawDawanauBackdrop(c.g, 8700, V, 3.1, 420, 300, still, wind);
          expect(c.bad, `${w}x${h}`).toEqual([]);
          for (const word of c.words) expect(DAWANAU_SIGNS as readonly string[]).toContain(word);
        }
    }
  });

  it('the roof, grain sacks, oil table, tea box and head sack draw with good numbers and no words', () => {
    for (const [t, still] of [[0, false], [1.3, false], [Number.NaN, false], [2, true]] as const) {
      const c = fakeCanvas();
      for (const k of Object.keys(GRAIN) as GrainKind[]) drawGrainSack(c.g, 1400, 292, k, t, still);
      drawOilTable(c.g, 1600, 292);
      drawTeaBox(c.g, 1700, 292, t, still);
      drawHeadSack(c.g, 2760, 292, 'adult', still ? 0 : -1.2);
      drawHeadSack(c.g, 2760, 292, 'adult', Number.NaN);
      expect(c.bad).toEqual([]);
      expect(c.words).toEqual([]);
    }
    const roof = fakeCanvas();
    drawDawanauStall(roof.g, 9850, 150, 120, 300);
    expect(roof.bad).toEqual([]);
    expect(roof.words).toEqual([]);
    expect(Math.min(...roof.ys)).toBeGreaterThanOrEqual(150 - 0.01);
    // Anything hanging under the roof stays well above a standing hero (50 u)
    const hang = roof.ys.filter((y) => y > 150 + 7 && y < 300 - 60);
    expect(Math.max(...hang)).toBeLessThan(150 + 30);
  });

  it("each trader's stall board matches their own call, in KANO_WORDS order", () => {
    const calls = KANO_WORDS.folk.traders.dawanau;
    expect(DAWANAU_TRADERS.length).toBe(calls.length);
    DAWANAU_TRADERS.forEach((kind, i) => {
      const c = fakeCanvas();
      drawDawanauTraderStall(c.g, kind, 500, 292);
      expect(c.bad).toEqual([]);
      expect(c.words).toEqual([DAWANAU_STALL_WORDS[kind]]);
      expect(DAWANAU_STALL_WORDS[kind]).toBe(calls[i]!.replace(/!$/, '').toUpperCase());
    });
  });

  it('every word painted is plain shop words: no script, title, faith or brand', () => {
    for (const w of [...DAWANAU_SIGNS, ...Object.values(DAWANAU_STALL_WORDS)]) {
      expect(w).toMatch(/^[A-Z -]+$/);
      expect(w).not.toMatch(/MOSQUE|EMIR|PALACE|DURBAR|PRAYER|CHURCH|KING|ROYAL|SULTAN|ALLAH|GOD/);
    }
  });
});

describe('K4a Dawanau cast (kano.md 2.4 and 7)', () => {
  it('16 looks: every skin tone at least twice, every age, a wheelchair user, glasses', () => {
    expect(DAWANAU_CAST.length).toBe(16);
    for (let s = 0; s < FOLK_SKINS.length; s++) expect(DAWANAU_CAST.filter((l) => l.skin === s).length, `skin ${s}`).toBeGreaterThanOrEqual(2);
    for (const age of ['child', 'teen', 'adult', 'elder'] as const) expect(DAWANAU_CAST.some((l) => l.age === age), age).toBe(true);
    expect(DAWANAU_CAST.some((l) => l.chair)).toBe(true);
    expect(DAWANAU_CAST.some((l) => l.glasses)).toBe(true);
    expect(new Set(DAWANAU_CAST.map((l) => l.dress)).size).toBeGreaterThanOrEqual(7);
  });

  it('everyday clothes only: no helmet or uniform, no dress worn as a sign of faith, caps never red, no stick', () => {
    for (const l of DAWANAU_CAST) {
      expect(['helmet', 'hijab']).not.toContain(l.head ?? 'none');
      expect(l.dress).not.toBe('hijabDress');
      if (l.head === 'kaftanCap' || l.head === 'rigaCap' || l.head === 'fila') expect((l.h ?? l.a).toLowerCase()).not.toMatch(/^#(e0572b|d6336c|8e2a3a|c8583a|d23b2a|ff0000)$/);
      expect(Object.keys(l)).not.toContain('stick');
    }
  });

  it('traders, grain traders, porters, the driver and the oil seller are grown-ups; the child is with the family', () => {
    for (const kind of DAWANAU_TRADERS) {
      expect(DAWANAU_CAST).toContain(DAWANAU_TRADER_LOOKS[kind]);
      expect(DAWANAU_TRADER_LOOKS[kind].age).toBe('adult');
    }
    for (const l of [...DAWANAU_MEASURERS, ...DAWANAU_PORTERS, DAWANAU_DRIVER, DAWANAU_OIL_SELLER, ...DAWANAU_BUS_STOP]) {
      expect(DAWANAU_CAST).toContain(l);
      expect(l.age === 'child').toBe(false);
    }
    // Porters carry on the head (the arm steadies it); never a child or elder carrying sacks
    for (const p of DAWANAU_PORTERS) {
      expect(p.hold).toBe('box');
      expect(p.age).toBe('adult');
    }
    expect(DAWANAU_DRIVER.stool).toBe(true);
    expect(DAWANAU_FAMILY[2].age).toBe('child');
    expect(DAWANAU_FAMILY[0].age).toBe('adult');
    expect(DAWANAU_FAMILY[1].age).toBe('adult');
    expect(DAWANAU_CAST.filter((l) => l.age === 'child').length).toBe(1);
  });
});

describe('K4a stays light and in the lazy Kano part (kano.md 9.1)', () => {
  const FILES = ['dawanau.ts', 'sacks.ts', 'whirl.ts'].map((f) => `src/worlds/kano/${f}`);

  it('imports no value from outside src/worlds/kano/ (types only)', () => {
    for (const p of FILES) {
      const src = readFileSync(p, 'utf8');
      for (const m of src.matchAll(/^(import|export)\s+(type\s+)?[^;]*?from\s+'([^']+)'/gm)) {
        if (m[2]) continue;
        expect(m[3], `${p}: ${m[0]}`).toMatch(/^\.\/[^/]+$/);
      }
    }
  });

  it('no blur, filters or shadows; the code is within its 9 KB gzip budget', () => {
    let all = '';
    for (const p of FILES) {
      const src = readFileSync(p, 'utf8');
      expect(src, p).not.toMatch(/shadowBlur|shadowColor|\.filter\s*=|blur\(/);
      all += src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    }
    expect(gzipSync(all).length).toBeLessThan(9 * 1024);
  });
});
