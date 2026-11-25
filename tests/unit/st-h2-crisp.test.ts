/**
 * ST-H2 (docs/style.md 1.8): crisp characters. Outlines are set in screen px from the context's
 * transform, rounded to device px; the hero's is the thickest; faces have solid eyes with a
 * catch-light; no see-through cloth shade.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { drawFolkFrame } from '../../src/art/folk';
import { STREET_CASTS } from '../../src/art/folkCasts';
import { SKINS, drawHero, type HeroPose } from '../../src/art/hero';
import { EYE_INK, FOLK_INK, HERO_INK, folkInkPx, heroInkPx, setInkRatio } from '../../src/art/ink';

interface Stroke {
  w: number;
  c: string;
  dpu: number;
}

/** A stand-in context with a real scale (getTransform), recording strokes and fills. */
function scaled(dpu: number): { g: CanvasRenderingContext2D; strokes: Stroke[]; fills: string[] } {
  const strokes: Stroke[] = [];
  const fills: string[] = [];
  let s = dpu;
  const stack: number[] = [];
  const t: Record<string, unknown> = { lineWidth: 1, strokeStyle: '#000', fillStyle: '#000' };
  const g = new Proxy(t, {
    get(o, k) {
      if (typeof k !== 'string') return undefined;
      if (k in o) return o[k];
      if (k === 'getTransform') return () => ({ a: s, b: 0, c: 0, d: s });
      if (k === 'save') return () => stack.push(s);
      if (k === 'restore') return () => (s = stack.pop() ?? s);
      if (k === 'scale') return (x: number, y: number) => (s *= Math.sqrt(Math.abs(x * y)));
      if (k === 'stroke') return () => strokes.push({ w: Number(o['lineWidth']), c: String(o['strokeStyle']).toLowerCase(), dpu: s });
      if (k === 'fill') return () => fills.push(String(o['fillStyle']).toLowerCase());
      return () => undefined;
    },
    set(o, k, v) {
      o[k as string] = v;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { g, strokes, fills };
}

const run: HeroPose = { phase: 0.3, inAir: false, facing: 1, glow: false, time: 0.3 };

afterEach(() => setInkRatio(null));

describe('ST-H2 crisp characters (style 1.8)', () => {
  it('outline widths: hero max(1.6 u, 2 px), people max(1.2 u, 1.5 px) and 1 device px thinner', () => {
    setInkRatio(1);
    expect(heroInkPx(393 / 420)).toBe(2);
    expect(heroInkPx(240 / 420)).toBe(2);
    expect(folkInkPx(393 / 420)).toBe(1);
    setInkRatio(2);
    expect(heroInkPx((393 / 420) * 2)).toBe(4);
    expect(folkInkPx((393 / 420) * 2)).toBe(3);
    expect(heroInkPx(3 * 2)).toBe(10);
    for (const d of [0.5, 1, 1.9, 3, 6]) expect(folkInkPx(d)).toBeLessThan(heroInkPx(d));
  });

  it('the hero silhouette is hero ink at the full outline width in device px', () => {
    setInkRatio(1);
    const dpu = 393 / 420;
    const r = scaled(dpu);
    drawHero(r.g, { skin: 4, hair: 0, outfit: 0 }, run);
    const thick = Math.max(...r.strokes.filter((s) => s.c === HERO_INK).map((s) => s.w * s.dpu));
    // Drawn under the fill, so the visible outline is half: 2 device px
    expect(thick).toBeCloseTo(4, 5);
    // In the run the head is under 20 px: solid eyes, catch-lights, no rose lip
    expect(r.fills).toContain(EYE_INK);
    expect(r.fills).toContain('#ffffff');
    expect(r.fills).not.toContain(SKINS[4]!.face.lip.toLowerCase());
  });

  it('street people: warm ink outline, hero ink head on the darkest skins, no see-through shade', () => {
    setInkRatio(1);
    for (const look of STREET_CASTS.alausa) {
      const r = scaled(393 / 420);
      drawFolkFrame(r.g, look, 'stand');
      expect(r.strokes.some((s) => s.c === FOLK_INK)).toBe(true);
      expect(r.fills).toContain(EYE_INK);
      expect(r.fills.some((f) => f.startsWith('rgba(42,28,56'))).toBe(false);
      const widest = Math.max(...r.strokes.filter((s) => s.c === FOLK_INK || s.c === HERO_INK).map((s) => s.w * s.dpu));
      expect(widest).toBeGreaterThan(0);
    }
    const dark = scaled(393 / 420);
    drawFolkFrame(dark.g, { ...STREET_CASTS.alausa[0]!, skin: 6 }, 'stand');
    expect(dark.strokes.some((s) => s.c === HERO_INK)).toBe(true);
  });
});
