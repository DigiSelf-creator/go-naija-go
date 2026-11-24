/**
 * ST-H3 (docs/style.md 1.8 part 5 and 6): the hero and the people are baked at the screen's own
 * device pixels and copied 1:1 at whole device pixels, never stretched; a cast that does not fit
 * one 1024 x 1024 sheet goes on into a second instead of being baked smaller; the hero's run
 * steps, jump and fall can be made ahead; outlines are set for the ratio the bake is shown at.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FOLK_BOX } from '../../src/art/folk';
import { folkFramesFor, folkSheetLayout } from '../../src/art/folkBake';
import { HALL_CROWD, STREET_CASTS } from '../../src/art/folkCasts';
import { HeroSprites, type HeroPose } from '../../src/art/hero';
import { inkAtLeast, inkRatio } from '../../src/art/ink';
import { CastSheet } from '../../src/game/crowdDraw';
import { HallCrowd } from '../../src/game/crowd';
import { hallCells } from '../../src/game/people';

interface Img {
  width: number;
  height: number;
}
interface Call {
  k: string;
  a: unknown[];
  m: { a: number; b: number; c: number; d: number; e: number; f: number };
}

/** A stand-in 2D context: keeps its transform (setTransform, translate, scale), records drawImage and setTransform. */
function fakeContext(canvas: Img | null, calls: Call[] = []): CanvasRenderingContext2D {
  let m = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  const stack: (typeof m)[] = [];
  const t: Record<string, unknown> = { lineWidth: 1, canvas };
  return new Proxy(t, {
    get(o, k) {
      if (typeof k !== 'string') return undefined;
      if (k in o) return o[k];
      if (k === 'getTransform') return () => ({ ...m });
      if (k === 'setTransform') return (a: number, b: number, c: number, d: number, e: number, f: number) => (m = { a, b, c, d, e, f });
      if (k === 'save') return () => stack.push({ ...m });
      if (k === 'restore') return () => (m = stack.pop() ?? m);
      if (k === 'translate') return (x: number, y: number) => (m = { ...m, e: m.e + m.a * x + m.c * y, f: m.f + m.b * x + m.d * y });
      if (k === 'scale') return (x: number, y: number) => (m = { ...m, a: m.a * x, b: m.b * x, c: m.c * y, d: m.d * y });
      if (k === 'drawImage') return (...a: unknown[]) => calls.push({ k, a, m: { ...m } });
      if (k === 'stroke') return () => strokes.push(Number(o['lineWidth']) * Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)));
      if (k === 'measureText') return () => ({ width: 10 });
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => ({ addColorStop: () => undefined });
      return () => undefined;
    },
    set(o, k, v) {
      o[k as string] = v;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
}

const made: Img[] = [];
/** Every stroke's width in device px. */
const strokes: number[] = [];
beforeEach(() => {
  made.length = 0;
  (globalThis as { document?: unknown }).document = {
    createElement: () => {
      const c: Img & { getContext?: () => CanvasRenderingContext2D } = { width: 300, height: 150 };
      c.getContext = () => fakeContext(c);
      made.push(c);
      return c;
    },
  };
});
afterEach(() => {
  delete (globalThis as { document?: unknown }).document;
});

/** The sprites a HeroSprites keeps now. */
const kept = (s: HeroSprites): HTMLCanvasElement[] => [...(s as unknown as { frames: Map<string, HTMLCanvasElement> }).frames.values()];
const isWhole = (v: number): boolean => Math.abs(v - Math.round(v)) < 1e-9;

describe('ST-H3: people sheets', () => {
  it('never lower the pixels per unit: a big cast takes a second sheet, each within 1024 x 1024', () => {
    for (const p of [0.9, 1.87, 2.57, 3.6]) {
      const L = folkSheetLayout(170, p);
      expect(L.pxPerU).toBe(p);
      expect(L.cellW).toBe(Math.ceil((FOLK_BOX.r - FOLK_BOX.l) * p) + 2);
      expect(L.width).toBeLessThanOrEqual(1024);
      for (const h of L.heights) expect(h).toBeLessThanOrEqual(1024);
      expect(L.sheets * L.perSheet).toBeGreaterThanOrEqual(170);
      expect(L.heights.length).toBe(L.sheets);
    }
    expect(folkSheetLayout(120, 2.57).sheets).toBe(2);
    expect(folkSheetLayout(10, 2).sheets).toBe(1);
  });

  it('a street cast at a 2x phone (851 x 393, view.scale 1.87) fits in at most 2 sheets', () => {
    for (const cast of Object.values(STREET_CASTS)) {
      const cells = cast.reduce((n, l) => n + folkFramesFor(l).length, 0);
      expect(folkSheetLayout(cells, 786 / 420).sheets).toBeLessThanOrEqual(2);
    }
  });

  it('street people are copied 1:1 at whole device pixels, both ways round', () => {
    const scale = 786 / 420;
    const sheet = new CastSheet();
    const looks = STREET_CASTS.alausa!.slice(0, 6);
    for (let i = 0; i < 400 && !sheet.done; i++) sheet.ready(looks, scale, 'test', 2);
    expect(sheet.done).toBe(true);
    const calls: Call[] = [];
    const g = fakeContext(null, calls);
    for (const flip of [false, true]) sheet.drawDevice(g, { look: 2, frame: 'walk1', flip, size: 1 }, 123.37, 250.81, scale);
    expect(calls.length).toBe(2);
    for (const c of calls) {
      const [, , , sw, sh, dx, dy, dw, dh] = c.a as number[];
      expect(dw).toBe(sw);
      expect(dh).toBe(sh);
      expect(isWhole(dx!) && isWhole(dy!) && isWhole(c.m.e)).toBe(true);
    }
  });

  it("the hall's people are baked at every size they are drawn at: never stretched", () => {
    const scale = 786 / 420;
    const sheet = new CastSheet(hallCells);
    const looks = HALL_CROWD.slice();
    for (let i = 0; i < 800 && !sheet.done; i++) sheet.ready(looks, scale, 'hall', 2);
    expect(sheet.done).toBe(true);
    const hall = new HallCrowd(300);
    const draws = [
      ...hall.draw({ hits: 0, defeated: false, finishT: 0, throws: [], camX: -120, viewW: 900 }),
      ...hall.draw({ hits: 3, defeated: true, finishT: 30, throws: [], camX: 0, viewW: 900 }),
    ];
    expect(new Set(draws.map((d) => d.size))).toEqual(new Set([0.9, 0.95, 1]));
    const calls: Call[] = [];
    const g = fakeContext(null, calls);
    for (const d of draws) sheet.drawDevice(g, d, d.x * scale, d.y * scale, scale);
    expect(calls.length).toBe(draws.length);
    for (const c of calls) {
      const [, , , sw, sh, , , dw, dh] = c.a as number[];
      expect([dw, dh]).toEqual([sw, sh]);
    }
  });

  it('bakes with the outline set for the ratio it is shown at, and hands the page ratio back after', () => {
    const widest = (ratio: number): number => {
      strokes.length = 0;
      const sheet = new CastSheet((l) => folkFramesFor(l).slice(0, 1));
      for (let i = 0; i < 50 && !sheet.done; i++) sheet.ready(STREET_CASTS.alausa!.slice(0, 1), 2, `r${ratio}`, ratio);
      return Math.max(...strokes);
    };
    // 2 device px a unit: the people's outline is 1.2 u (2.4 device px) at 1x, but 1.5 px (3 device px) at 2x
    expect(widest(2)).toBeGreaterThan(widest(1));
    expect(inkRatio()).toBe(1);
  });
});

describe('ST-H3: the hero', () => {
  const look = { skin: 2, hair: 1, outfit: 1, body: 1, age: 1 };
  const run: HeroPose = { phase: 0.31, inAir: false, vy: 0, land: 0, facing: 1, glow: false, gait: 'run' };

  it('is copied 1:1 at whole device pixels, never stretched, facing either way', () => {
    const s = new HeroSprites();
    s.ratio = 2;
    const calls: Call[] = [];
    const g = fakeContext(null, calls);
    for (const facing of [1, -1] as const) {
      g.setTransform(1.87, 0, 0, 1.87, 0, 0);
      g.translate(101.3, 288.7);
      s.draw(g, look, { ...run, facing });
    }
    expect(calls.length).toBe(2);
    for (const c of calls) {
      // drawImage(sprite, x, y): no size, so no stretching
      expect(c.a.length).toBe(3);
      expect(isWhole(c.m.e) && isWhole(c.m.f) && isWhole(c.a[1] as number) && isWhole(c.a[2] as number)).toBe(true);
      expect(Math.abs(c.m.a)).toBe(1);
      expect(c.m.d).toBe(1);
    }
    expect(calls[1]!.m.a).toBe(-1);
  });

  it('makes the run steps, the jump and the fall ahead, a few at a time, then draws them without making more', () => {
    const s = new HeroSprites();
    let rounds = 0;
    while (!s.prewarm(look, 1.87, 0) && rounds < 200) rounds++;
    expect(kept(s).length).toBe(24 + 33);
    expect(rounds).toBeGreaterThan(1);
    const before = made.length;
    const g = fakeContext(null, []);
    g.setTransform(1.87, 0, 0, 1.87, 40, 60);
    for (let i = 0; i < 24; i++) s.draw(g, look, { ...run, phase: i / 24 });
    for (let v = -400; v <= 400; v += 25) s.draw(g, look, { ...run, inAir: true, vy: v });
    expect(made.length).toBe(before);
    // Memory (style 1.8 part 6): at most 6 MB at a 2x phone's scale
    expect(kept(s).reduce((n, c) => n + c.width * c.height * 4, 0)).toBeLessThanOrEqual(6 * 1024 * 1024);
  });

  it('keeps at most 6 MB of sprites at a 2x phone, letting the least used go first', () => {
    const s = new HeroSprites();
    const g = fakeContext(null, []);
    g.setTransform(1.87, 0, 0, 1.87, 0, 0);
    for (let k = 0; k < 400; k++) {
      // a new frame of time each draw, so the 2-a-frame limit lets every one be made
      const pose: HeroPose = k % 3 === 0 ? { ...run, inAir: true, vy: ((k % 33) - 16) * 25 } : { ...run, land: (k % 7) / 6, phase: (k % 24) / 24, gait: k % 2 ? 'walk' : 'run' };
      (s as unknown as { madeAt: number }).madeAt = -Infinity;
      s.draw(g, look, pose);
    }
    expect(kept(s).reduce((n, c) => n + c.width * c.height * 4, 0)).toBeLessThanOrEqual(6 * 1024 * 1024);
    expect(kept(s).length).toBeGreaterThanOrEqual(60);
  });
});

describe('ST-H3: animals and bosses', () => {
  it('outline widths reach the 1.8 minimum in screen pixels, in whole device pixels', () => {
    const g = fakeContext(null);
    // 320 x 240 at 1x: 0.57 device px a unit, so 1.5 px is about 2.6 u
    g.setTransform(240 / 420, 0, 0, 240 / 420, 0, 0);
    const w = inkAtLeast(g, 1.4, 1.5);
    expect(w * (240 / 420)).toBe(2);
    expect(inkAtLeast(g, 1.6, 2) * (240 / 420)).toBe(2);
    // A big screen: the unit width is kept (rounded to device px)
    g.setTransform(4, 0, 0, 4, 0, 0);
    expect(inkAtLeast(g, 1.4, 1.5)).toBeCloseTo(1.5);
  });
});
