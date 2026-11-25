/**
 * K6a: Kano from above and Harmattan Road's look (docs/kano.md 6.1 to 6.5 and 7). The map is
 * Lagos's size with 11 blocks and the motor park, every spot and place sits in its own area, the
 * pins keep Lagos's tap size, every piece draws with good numbers and only its pin words, the
 * places hand their people to the people kit (style 1.8), the walkers are the street casts with
 * no child alone, and Harmattan Road's look gives the lane view what it asks for.
 */
import { describe, expect, it } from 'vitest';
import * as lane from '../../src/art/lane';
import * as shade from '../../src/art/lane-shade';
import * as things from '../../src/art/lane-things';
import type { FolkLook } from '../../src/art/folk';
import {
  KANO_AREA_LABELS,
  KANO_BLOCKS,
  KANO_CITY_AREAS,
  KANO_CITY_CAST,
  KANO_CITY_GATE,
  KANO_MAP,
  KANO_PLACES,
  KANO_PLACE_IDS,
  KANO_SPOTS,
  KANO_SPOT_IDS,
  KANO_SPOT_WORDS,
  KANO_START_LOOKS,
  drawKanoCity,
  drawKanoPin,
  drawKanoSpotIcon,
  kanoPinHitBox,
  plot,
} from '../../src/worlds/kano/city';
import { KANO_PLACE_LOOK, drawDyePits, drawGrainMarket, drawLeatherStalls, drawPyramidPlace } from '../../src/worlds/kano/cityPlaces';
import { harmattanLook } from '../../src/worlds/kano/laneLook';

interface Fake {
  g: CanvasRenderingContext2D;
  bad: string[];
  words: string[];
}

/** A canvas stand-in that takes every call and notes bad numbers and words. */
function fakeCanvas(): Fake {
  const f: Fake = { g: null as unknown as CanvasRenderingContext2D, bad: [], words: [] };
  const fn =
    (name: string) =>
    (...args: unknown[]) => {
      for (const a of args) if (typeof a === 'number' && !Number.isFinite(a)) f.bad.push(`${name}(${args.join(', ')})`);
      if (name === 'fillText') f.words.push(String(args[0]));
      if (name === 'measureText') return { width: String(args[0]).length * 7 };
      if (name === 'createLinearGradient') return { addColorStop: () => undefined };
      return proxy;
    };
  const proxy: object = new Proxy({}, { get: (_t, k) => (k === 'globalAlpha' ? 1 : typeof k === 'string' ? fn(k) : undefined), set: () => true });
  f.g = proxy as CanvasRenderingContext2D;
  return f;
}

const inside = (p: { x: number; y: number }, r: { x: number; y: number; w: number; d?: number; h?: number }): boolean => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + (r.d ?? r.h ?? 0);

describe('K6a Kano from above (kano.md 6.1)', () => {
  it('is Lagos and Ogun size: 1600 x 1000, 11 blocks in 3 rows of 4 round the motor park', () => {
    expect(KANO_MAP).toEqual({ w: 1600, h: 1000 });
    expect(KANO_BLOCKS).toHaveLength(11);
    expect(KANO_BLOCKS.find((b) => b.id === 'r1c1')).toBeUndefined();
    for (const b of KANO_BLOCKS) expect(b.x >= 0 && b.y >= 0 && b.x + b.w <= 1600 && b.y + b.d <= 1000).toBe(true);
    expect(KANO_CITY_GATE.y).toBeGreaterThan(900);
  });

  it('has the four problem spots of 6.2, each with a pin in its own area', () => {
    expect([...KANO_SPOT_IDS].sort()).toEqual(['dryTaps', 'lightsOut', 'sandyRoad', 'slowInternet']);
    expect(KANO_SPOT_WORDS).toEqual({ sandyRoad: 'Sandy road', lightsOut: 'Lights out', slowInternet: 'Slow internet', dryTaps: 'Dry taps' });
    for (const id of KANO_SPOT_IDS) {
      const s = KANO_SPOTS[id];
      expect(KANO_CITY_AREAS).toContain(s.area);
      expect(inside(s.pin, s.focus)).toBe(true);
    }
    expect(KANO_BLOCKS.find((b) => b.spot === 'dryTaps')?.kind).toBe('water');
    expect(KANO_BLOCKS.find((b) => b.spot === 'slowInternet')?.kind).toBe('trucks');
  });

  it('puts each tax place on the front of its own block (Kurmi, Kofar Mata, Dawanau)', () => {
    expect([...KANO_PLACE_IDS].sort()).toEqual(['dye', 'grain', 'leather', 'pyramid']);
    const kinds = { leather: 'kurmi', dye: 'dye', grain: 'grain', pyramid: 'trucks' } as const;
    for (const id of KANO_PLACE_IDS) {
      const p = KANO_PLACES[id];
      const b = KANO_BLOCKS.find((k) => k.id === p.block)!;
      expect(b.kind).toBe(kinds[id]);
      expect(inside(p, b)).toBe(true);
    }
    expect(KANO_PLACE_LOOK.leather.time).toBe(8);
    expect(KANO_PLACE_LOOK.dye.time).toBe(12);
    expect(KANO_PLACE_LOOK.grain.time).toBe(15);
    expect(Object.keys(KANO_AREA_LABELS).sort()).toEqual(['dawanau', 'kofarMata', 'kurmi', 'waterYard']);
  });

  it('draws the whole city tired, bright, built and boomed with good numbers and no words but the gate board', () => {
    for (const look of ['problem', 'ready', 'fixed'] as const)
      for (const opts of [{}, { bright: [] }, { boom: true, lit: true, built: KANO_PLACE_IDS }]) {
        const c = fakeCanvas();
        const looks = Object.fromEntries(KANO_SPOT_IDS.map((id) => [id, look])) as typeof KANO_START_LOOKS;
        drawKanoCity(c.g, looks, opts);
        plot(c.g, 100, 100, 90);
        expect(c.bad).toEqual([]);
        expect(new Set(c.words)).toEqual(new Set(['WELCOME TO KANO', 'CENTRE OF COMMERCE']));
      }
  });

  it('pins keep Lagos tap size (48 x 56 or more) and show only their own word or "Ready"', () => {
    for (const id of KANO_SPOT_IDS) {
      const box = kanoPinHitBox(300, 300);
      expect(box.w).toBeGreaterThanOrEqual(48);
      expect(box.h).toBeGreaterThanOrEqual(56);
      for (const state of ['problem', 'ready'] as const)
        for (const bob of [0, 2, Number.NaN]) {
          const c = fakeCanvas();
          drawKanoPin(c.g, 300, 300, id, state, bob);
          drawKanoSpotIcon(c.g, id, 10, 10);
          expect(c.bad).toEqual([]);
          expect(c.words).toEqual([state === 'ready' ? 'Ready' : KANO_SPOT_WORDS[id]]);
        }
    }
  });
});

describe('K6a the tax places (kano.md 6.3, 7)', () => {
  it('draw at every step, build, full and still, and hand every person to the kit', () => {
    for (const draw of [drawLeatherStalls, drawDyePits, drawGrainMarket, drawPyramidPlace])
      for (const st of [{}, { build: 0.5 }, { sale: 0.2 }, { sale: 0.7, served: 3 }, { full: true }, { still: true, sale: 0.9 }, { time: Number.NaN, stock: Number.NaN }]) {
        const c = fakeCanvas();
        const seen: FolkLook[] = [];
        draw(c.g, 400, 400, { ...st, who: (_g, look, x, y) => (seen.push(look), expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true)) });
        expect(c.bad).toEqual([]);
        expect(c.words).toEqual([]);
        if (st.build === undefined) expect(seen.length).toBeGreaterThan(0);
        else expect(seen).toEqual([]);
        // Nobody is ever a child on their own, sitting in a chair at a stall, or carrying a stick
        for (const l of seen) expect(l.age === 'child').toBe(false);
      }
  });
});

describe('K6a city walkers (kano.md 7, style 1.8)', () => {
  it('are 16 looks from the three street casts, no child alone, nobody seated, every skin tone', () => {
    expect(KANO_CITY_CAST).toHaveLength(16);
    for (const l of KANO_CITY_CAST) expect(l.age !== 'child' && !l.chair && !l.stool).toBe(true);
    expect(new Set(KANO_CITY_CAST.map((l) => l.skin)).size).toBe(7);
  });
});

describe('K6a Harmattan Road (kano.md 6.5)', () => {
  const look = harmattanLook({ lane, shade, things });

  it('gives the lane view its sky, road, scenery and fronts, and keeps the danfo box for trucks', () => {
    expect(look.sceneryKeys.length).toBeGreaterThanOrEqual(4);
    const keys = new Set<string>();
    for (let d = 0; d < 400; d += 7) for (const l of [0, 1, 2]) keys.add(look.danfo(d, l, 0));
    expect(keys).toEqual(new Set(['grainTruck#0', 'danfo#0']));
    expect(look.danfo(50, 1, 1).endsWith('#1')).toBe(true);
    const c = fakeCanvas();
    const v = lane.laneView(851, 393);
    for (const dist of [0, 3.3, 250, 999]) look.road(c.g, v, dist);
    look.front?.(c.g, { wall: 3, windows: ['lean', 'glow'], door: 'shut' });
    expect(c.bad).toEqual([]);
    expect(c.words).toEqual([]);
  });
});

describe('K6a stays in the lazy Kano part', () => {
  it('the new files import only types from outside src/worlds/kano/', async () => {
    const { readFileSync } = await import('node:fs');
    for (const f of ['city.ts', 'cityPlaces.ts', 'laneLook.ts']) {
      const src = readFileSync(`src/worlds/kano/${f}`, 'utf8');
      for (const m of src.matchAll(/^(import|export)\s+(type\s+)?[^;]*?from\s+'([^']+)'/gm)) if (!m[2]) expect(m[3], `${f}: ${m[0]}`).toMatch(/^\.\/[^/]+$/);
      expect(src).not.toMatch(/shadowBlur|\.filter\s*=|umbrella\(|mosque|minaret|dome\(|emir|palace\(|durbar/i);
    }
  });
});
