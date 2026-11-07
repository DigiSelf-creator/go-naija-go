/**
 * qa: brows and mouth must show on every skin tone. Whatever face colour touches
 * the skin must be 3:1 or better against it (WCAG contrast ratio), and the dark
 * line must stand out from the rim and lip it sits on.
 */
import { describe, expect, it } from 'vitest';
import { SKINS, drawHero } from '../../src/art/hero';

function luminance(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** Records every colour set while the hero is drawn. */
function coloursUsed(skin: number): Set<string> {
  const used = new Set<string>();
  const g = new Proxy({} as Record<string, unknown>, {
    get(t, k) {
      if (typeof k !== 'string') return undefined;
      if (k in t) return t[k];
      return () => undefined;
    },
    set(t, k, v) {
      if (k === 'fillStyle' || k === 'strokeStyle') used.add(String(v).toLowerCase());
      t[k as string] = v;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  for (const blink of [false, true]) {
    drawHero(g, { skin, hair: 0, outfit: 0 }, { phase: 0, inAir: false, facing: 1, glow: false, standing: true, blink });
  }
  return used;
}

describe('hero face contrast', () => {
  SKINS.forEach((s, i) => {
    it(`${s.label}: brows and mouth stand out at 3:1 or better`, () => {
      const f = s.face;
      const browEdge = f.rim ?? f.line;
      const mouthEdge = f.lipLine ?? f.lip;
      expect(contrast(browEdge, s.base)).toBeGreaterThanOrEqual(3);
      expect(contrast(mouthEdge, s.base)).toBeGreaterThanOrEqual(3);
      // The smile line sits on the lip, and the brow line on its rim
      expect(contrast(f.line, f.lip)).toBeGreaterThanOrEqual(3);
      if (f.rim) expect(contrast(f.line, f.rim)).toBeGreaterThanOrEqual(3);
      // Where the dark line alone is too close to the skin, there must be a rim
      if (contrast(f.line, s.base) < 3) expect(f.rim).toBeDefined();
      // And the drawing really uses these colours
      const used = coloursUsed(i);
      for (const c of [f.line, f.lip, f.rim, f.lipLine]) if (c) expect(used.has(c.toLowerCase())).toBe(true);
    });
  });
});
