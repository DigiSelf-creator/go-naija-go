/**
 * K3a: Kofar Mata's art (docs/kano.md 2.2, 2.3, 3.3, 3.5, 3.7, 4.1, 7 and 9.1). The dye pits are
 * scenery only and the haze stays on the far rooftops; the cloth frame's top is the landing line
 * and its dip springs back; every piece draws with good numbers and only its own made-up words;
 * fura, the parcel and the store draw cleanly; the cast is wide and kind; the sounds are soft;
 * and the new files stay small and inside the lazy Kano part.
 */
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { FOLK_SKINS } from '../../src/art/folk';
import { CLOTH_FRAME, CLOTH_LOOKS, KANO_CLOTH_SOUNDS, clothDip, drawBounceSign, drawClothFrame } from '../../src/worlds/kano/cloth';
import { drawFura, drawFuraIcon } from '../../src/worlds/kano/fura';
import {
  BEATING_LOG,
  DYE_PIT,
  KOFAR,
  KOFAR_BEATERS,
  KOFAR_CHILD,
  KOFAR_DYERS,
  KOFAR_MATA_CAST,
  KOFAR_SIGNS,
  KOFAR_STALL_WORDS,
  KOFAR_TAILOR,
  KOFAR_TRADER_LOOKS,
  KOFAR_TRADERS,
  drawBeatingLog,
  drawDyePit,
  drawKanoTailorTable,
  drawKofarMataBackdrop,
  drawKofarMataFar,
  drawKofarMataRow,
  drawKofarMataStall,
  drawKofarMataTraderStall,
} from '../../src/worlds/kano/kofarMata';
import { KANO_ROOM, KANO_STORE_KEEPER, KANO_STORE_KEEPER_SPOT, drawGroundnutSacks, drawKanoParcel, drawKanoParcelIcon, drawKanoWellRoom, drawKuliShelf } from '../../src/worlds/kano/store';
import { KANO_WORDS } from '../../src/worlds/kano/words';
import kanoWell from '../../src/data/levels/kano-well.json';

interface Fake {
  g: CanvasRenderingContext2D;
  bad: string[];
  words: string[];
  calls: number;
  fills: Set<string>;
  ys: number[];
}

/** A canvas stand-in that takes every call, notes bad numbers, words, fill colours and the y of moveTo/lineTo/fillRect. */
function fakeCanvas(): Fake {
  const f: Fake = { g: null as unknown as CanvasRenderingContext2D, bad: [], words: [], calls: 0, fills: new Set(), ys: [] };
  const fn = (name: string) => (...args: unknown[]) => {
    f.calls++;
    for (const a of args) if (typeof a === 'number' && !Number.isFinite(a)) f.bad.push(`${name}(${args.join(', ')})`);
    if (name === 'fillText' || name === 'strokeText') f.words.push(String(args[0]));
    if (name === 'moveTo' || name === 'lineTo' || name === 'fillRect' || name === 'quadraticCurveTo') f.ys.push(args[1] as number);
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

describe('K3a springy cloth (kano.md 3.3)', () => {
  it('the frame is 30 u high: nothing of it rises above the landing line, at rest or dipping', () => {
    expect(CLOTH_FRAME.h).toBe(30);
    for (const dip of [0, 3, CLOTH_FRAME.dip]) {
      for (let look = 0; look < CLOTH_LOOKS.length; look++) {
        const c = fakeCanvas();
        drawClothFrame(c.g, 1250, 100, 300, { dip, look });
        expect(c.bad).toEqual([]);
        expect(c.words).toEqual([]);
        expect(Math.min(...c.ys)).toBeGreaterThanOrEqual(300 - 30 - 1);
        expect(Math.max(...c.ys)).toBeLessThanOrEqual(300);
      }
    }
    const nan = fakeCanvas();
    drawClothFrame(nan.g, 1800, 100, 300, { dip: Number.NaN });
    expect(nan.bad).toEqual([]);
  });

  it('the dip springs back: 0 before, after and in reduced motion, never deeper than CLOTH_FRAME.dip', () => {
    expect(clothDip(-0.1)).toBe(0);
    expect(clothDip(CLOTH_FRAME.dipS)).toBe(0);
    expect(clothDip(5)).toBe(0);
    expect(clothDip(Number.NaN)).toBe(0);
    expect(clothDip(0.05, true)).toBe(0);
    let most = 0;
    for (let t = 0; t < CLOTH_FRAME.dipS; t += 0.005) most = Math.max(most, Math.abs(clothDip(t)));
    expect(most).toBeGreaterThan(CLOTH_FRAME.dip / 2);
    expect(most).toBeLessThanOrEqual(CLOTH_FRAME.dip);
    expect(clothDip(0.05)).toBeGreaterThan(0);
  });

  it('the cloth is deep dyed blue with a light pattern: readable on the pale pavement in greyscale', () => {
    const lum = (hex: string): number => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
      return 0.299 * r + 0.587 * g + 0.114 * b;
    };
    for (const c of CLOTH_LOOKS) {
      expect(lum(KOFAR.pave) - lum(c.base)).toBeGreaterThan(90);
      expect(lum(c.mark) - lum(c.base)).toBeGreaterThan(60);
    }
  });

  it('the bounce sign is a shape with no words, standing beside the frame', () => {
    const c = fakeCanvas();
    drawBounceSign(c.g, 1210, 300);
    expect(c.bad).toEqual([]);
    expect(c.words).toEqual([]);
  });

  it('the boing and the tok-tok are soft and short', () => {
    for (const r of Object.values(KANO_CLOTH_SOUNDS))
      for (const t of r.tones) {
        expect(t.vol ?? 0).toBeLessThanOrEqual(0.06);
        expect((t.at ?? 0) + t.len).toBeLessThanOrEqual(0.4);
      }
  });
});

describe('K3a Kofar Mata backdrop (kano.md 2.2, 2.5, KN-R4, KN-R6)', () => {
  it('the haze is gold, never grey, and is painted on the far rooftops only', () => {
    const [r, gr, b] = KOFAR.haze.match(/\d+/g)!.map(Number) as [number, number, number];
    expect(r - b).toBeGreaterThan(60);
    expect(gr - b).toBeGreaterThan(40);
    const far = fakeCanvas();
    drawKofarMataFar(far.g, 900, 851, 300);
    expect(far.fills.has(KOFAR.haze)).toBe(true);
    const row = fakeCanvas();
    drawKofarMataRow(row.g, 900, 851, 300);
    expect(row.fills.has(KOFAR.haze)).toBe(false);
    // The dye pits are in the near row, behind its wall (scenery only)
    expect(row.fills.has(KOFAR.pit)).toBe(true);
  });

  it('draws at phone sizes, calm or in wind, still or moving, with only its made-up shop words', () => {
    for (const [w, h] of [[320, 240], [568, 320], [640, 200], [851, 393]] as const) {
      const V = (w * 420) / h;
      for (const wind of [undefined, { dir: 'back' as const, k: 1 }, { dir: 'face' as const, k: 0.4 }, { dir: null, k: 0 }])
        for (const still of [false, true]) {
          const c = fakeCanvas();
          drawKofarMataBackdrop(c.g, 2550, V, 3.1, 420, 300, still, wind);
          expect(c.bad, `${w}x${h}`).toEqual([]);
          for (const word of c.words) expect(KOFAR_SIGNS as readonly string[]).toContain(word);
        }
    }
  });

  it('the dye pit, beating log, tailor table and roof stand on the back pavement and draw with no words', () => {
    for (const [t, still] of [[0, false], [1.3, false], [Number.NaN, false], [2, true]] as const) {
      const c = fakeCanvas();
      drawDyePit(c.g, 1020, 292, t, still);
      drawBeatingLog(c.g, 1130, 292, t, still);
      drawKanoTailorTable(c.g, 5640, 292);
      drawKofarMataStall(c.g, 5850, 150, 300, 300);
      expect(c.bad).toEqual([]);
      expect(c.words).toEqual([]);
    }
    // The pit's dyer and the beaters stand clear of the piece's middle
    expect(DYE_PIT.dyerAt).toBeLessThan(-DYE_PIT.w / 3);
    expect(BEATING_LOG.beaters[0]).toBeLessThan(-15);
    expect(BEATING_LOG.beaters[1]).toBeGreaterThan(15);
  });

  it("each trader's stall board matches their own call, in KANO_WORDS order", () => {
    const calls = KANO_WORDS.folk.traders.kofarMata;
    expect(KOFAR_TRADERS.length).toBe(calls.length);
    KOFAR_TRADERS.forEach((kind, i) => {
      const c = fakeCanvas();
      drawKofarMataTraderStall(c.g, kind, 500, 292);
      expect(c.bad).toEqual([]);
      expect(c.words).toEqual([KOFAR_STALL_WORDS[kind]]);
      expect(KOFAR_STALL_WORDS[kind]).toBe(calls[i]!.replace(/!$/, '').toUpperCase());
    });
  });

  it('every word painted is plain shop words: no script, title, faith or brand', () => {
    for (const w of [...KOFAR_SIGNS, ...Object.values(KOFAR_STALL_WORDS)]) {
      expect(w).toMatch(/^[A-Z ]+$/);
      expect(w).not.toMatch(/MOSQUE|EMIR|PALACE|DURBAR|PRAYER|CHURCH|KING|ROYAL|SULTAN/);
    }
  });
});

describe('K3a fura da nono (kano.md 4.1)', () => {
  it('draws on the road and as a HUD icon with good numbers and no words', () => {
    const c = fakeCanvas();
    drawFura(c.g, 3900, 276, 0.8);
    drawFura(c.g, 3900, 276, Number.NaN);
    for (const s of [0.5, 0.75, 1, Number.NaN]) drawFuraIcon(c.g, 0, 0, s);
    expect(c.bad).toEqual([]);
    expect(c.words).toEqual([]);
  });
});

describe('K3a the groundnut store (kano.md 3.7, KN-R11)', () => {
  it('the room, its shelves in file order and the parcel draw cleanly, with no words', () => {
    expect(KANO_ROOM.w).toBe(kanoWell.width);
    expect(KANO_ROOM.floorY).toBe(kanoWell.groundY);
    expect(KANO_ROOM.arriveX).toBe(kanoWell.entryX);
    expect(KANO_ROOM.exitX).toBe(kanoWell.exitX);
    for (const still of [false, true]) {
      const c = fakeCanvas();
      drawKanoWellRoom(c.g, -100, 851, 2.3, 420, still);
      kanoWell.platforms.forEach(([x, y, w], i) => (i === 1 ? drawKuliShelf : drawGroundnutSacks)(c.g, x!, y!, w!));
      drawKanoParcel(c.g, kanoWell.gift[0] as number, kanoWell.gift[1] as number, 0.1);
      drawKanoParcel(c.g, 280, 181, Number.NaN);
      for (const s of [16, 24, Number.NaN]) drawKanoParcelIcon(c.g, 0, 0, s);
      expect(c.bad).toEqual([]);
      expect(c.words).toEqual([]);
    }
  });

  it('each shelf top is exactly its landing line (nothing drawn above it but the loose nuts)', () => {
    for (const [x, y, w] of kanoWell.platforms) {
      const c = fakeCanvas();
      (x === 230 ? drawKuliShelf : drawGroundnutSacks)(c.g, x!, y!, w!);
      expect(Math.min(...c.ys)).toBeGreaterThanOrEqual(y! - 0.01);
    }
  });

  it('the keeper is an elder woman on a low stool by the back wall, clear of the rope', () => {
    expect(KANO_STORE_KEEPER.age).toBe('elder');
    expect(KANO_STORE_KEEPER.sex).toBe('f');
    expect(KANO_STORE_KEEPER.stool).toBe(true);
    expect(KANO_STORE_KEEPER.dress).toBe('wrapperBlouse');
    expect(KANO_STORE_KEEPER.head).toBe('headscarf');
    expect(KANO_STORE_KEEPER_SPOT.x).toBeGreaterThanOrEqual(60);
    expect(KANO_STORE_KEEPER_SPOT.x).toBeLessThanOrEqual(100);
    expect(Math.abs(KANO_STORE_KEEPER_SPOT.x - KANO_ROOM.arriveX)).toBeGreaterThan(25);
    expect(KANO_WORDS.folk.storeKeeper).toBe('For Borehole Hall. Safe trip!');
  });
});

describe('K3a Kofar Mata cast (kano.md 2.4 and 7)', () => {
  it('16 looks: every skin tone at least twice, every age, a wheelchair user, glasses', () => {
    expect(KOFAR_MATA_CAST.length).toBe(16);
    for (let s = 0; s < FOLK_SKINS.length; s++) expect(KOFAR_MATA_CAST.filter((l) => l.skin === s).length, `skin ${s}`).toBeGreaterThanOrEqual(2);
    for (const age of ['child', 'teen', 'adult', 'elder'] as const) expect(KOFAR_MATA_CAST.some((l) => l.age === age), age).toBe(true);
    expect(KOFAR_MATA_CAST.some((l) => l.chair)).toBe(true);
    expect(KOFAR_MATA_CAST.some((l) => l.glasses)).toBe(true);
    expect(new Set(KOFAR_MATA_CAST.map((l) => l.dress)).size).toBeGreaterThanOrEqual(7);
  });

  it('everyday clothes only: no helmet or uniform, no dress worn as a sign of faith, caps never red, no stick', () => {
    for (const l of [...KOFAR_MATA_CAST, KANO_STORE_KEEPER]) {
      expect(['helmet', 'hijab']).not.toContain(l.head ?? 'none');
      expect(l.dress).not.toBe('hijabDress');
      if (l.head === 'kaftanCap' || l.head === 'rigaCap' || l.head === 'fila') expect((l.h ?? l.a).toLowerCase()).not.toMatch(/^#(e0572b|d6336c|8e2a3a|c8583a|ff0000)$/);
      expect(Object.keys(l)).not.toContain('stick');
    }
  });

  it('the traders, dyers, beaters and tailor are adults or elders in the cast; the child has a parent close by', () => {
    for (const kind of KOFAR_TRADERS) {
      expect(KOFAR_MATA_CAST).toContain(KOFAR_TRADER_LOOKS[kind]);
      expect(KOFAR_TRADER_LOOKS[kind].age).toBe('adult');
    }
    for (const l of [...KOFAR_DYERS, ...KOFAR_BEATERS, KOFAR_TAILOR]) {
      expect(KOFAR_MATA_CAST).toContain(l);
      expect(['adult', 'elder']).toContain(l.age);
    }
    for (const l of [...KOFAR_BEATERS, KOFAR_TAILOR]) expect(l.stool).toBe(true);
    expect(KOFAR_CHILD[0].age).toBe('child');
    expect(KOFAR_CHILD[1].age).toBe('adult');
  });
});

describe('K3a stays light and in the lazy Kano part (kano.md 9.1)', () => {
  const FILES = ['kofarMata.ts', 'cloth.ts', 'fura.ts', 'store.ts'].map((f) => `src/worlds/kano/${f}`);

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
