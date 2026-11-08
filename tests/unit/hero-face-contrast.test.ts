/**
 * qa: brows and mouth must show on every skin tone, and every skin gets its face
 * built the same way. The brow (or its light rim) and the lip (or its outline)
 * must be 3:1 or better against the skin (WCAG contrast ratio). Every skin has a
 * deep-toned lip outline, so the lip has an edge and the same size everywhere
 * (ink on lighter skins, a brown on darker ones). The dark brow stays the main shape.
 */
import { describe, expect, it } from 'vitest';
import { AGES, BODIES, SKINS, drawHero, type HeroLook } from '../../src/art/hero';

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
function coloursUsed(skin: number, body?: number, age?: number): Set<string> {
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
  const look: HeroLook = { skin, hair: 0, outfit: 0 };
  if (body !== undefined) look.body = body;
  if (age !== undefined) look.age = age;
  for (const blink of [false, true]) {
    drawHero(g, look, { phase: 0, inAir: false, facing: 1, glow: false, standing: true, blink });
  }
  return used;
}

describe('hero face contrast', () => {
  SKINS.forEach((s, i) => {
    it(`${s.label}: brows and mouth stand out at 3:1 or better`, () => {
      const f = s.face;
      // Brow: the ink line itself, or its light brow-ridge rim, reads on the skin
      expect(Math.max(contrast(f.line, s.base), f.rim ? contrast(f.rim, s.base) : 0)).toBeGreaterThanOrEqual(3);
      if (contrast(f.line, s.base) < 3) {
        expect(f.rim).toBeDefined();
        // The ink brow is a little heavier there, so it stays the main shape
        expect(f.brow ?? 0.8).toBeGreaterThan(0.8);
      }
      if (f.rim) expect(contrast(f.line, f.rim)).toBeGreaterThanOrEqual(3);
      // Mouth: lip or its outline reads on the skin
      expect(Math.max(contrast(f.lip, s.base), contrast(f.lipLine, s.base))).toBeGreaterThanOrEqual(3);
      // Every skin has a lip outline, deeper than the lip, so the lip has an edge
      expect(luminance(f.lipLine)).toBeLessThan(luminance(f.lip));
      expect(contrast(f.lipLine, f.lip)).toBeGreaterThanOrEqual(2);
      // Where ink would be harsh on the skin (under 3:1), the outline is a brown, not ink
      if (contrast(f.line, s.base) < 3) expect(f.lipLine.toLowerCase()).not.toBe(f.line.toLowerCase());
      // The smile line sits on the lip
      expect(contrast(f.line, f.lip)).toBeGreaterThanOrEqual(3);
      // And the drawing really uses these colours, on every head: Male and Female,
      // Teen, Adult and Elder (I1), and a slice 1 look with neither
      const heads: [number | undefined, number | undefined][] = [[undefined, undefined]];
      for (let body = 0; body < BODIES.length; body++) for (let age = 0; age < AGES.length; age++) heads.push([body, age]);
      for (const [body, age] of heads) {
        const used = coloursUsed(i, body, age);
        for (const c of [f.line, f.lip, f.rim, f.lipLine]) if (c) expect(used.has(c.toLowerCase()), `${c} body ${body} age ${age}`).toBe(true);
        // Same eyes (white, ink pupil) and the skin itself on every head
        for (const c of ['#ffffff', s.base]) expect(used.has(c.toLowerCase()), `${c} body ${body} age ${age}`).toBe(true);
      }
    });
  });

  it('every head shows the rose lip exactly once (no beard or hair hides or doubles it)', () => {
    // The face is one shared drawing; bodies and ages only add to it (lash, smile
    // lines, beard, studs) or scale it.
    const faceStrokes = (body: number, age: number): number => {
      let lipFills = 0;
      const g = new Proxy({} as Record<string, unknown>, {
        get(t, k) {
          if (typeof k !== 'string') return undefined;
          if (k in t) return t[k];
          return () => {
            if (k === 'fill' && t['fillStyle'] === SKINS[2]!.face.lip) lipFills++;
          };
        },
        set(t, k, v) {
          t[k as string] = v;
          return true;
        },
      }) as unknown as CanvasRenderingContext2D;
      drawHero(g, { skin: 2, hair: 0, outfit: 0, body, age }, { phase: 0, inAir: false, facing: 1, glow: false, standing: true });
      return lipFills;
    };
    for (let body = 0; body < BODIES.length; body++) for (let age = 0; age < AGES.length; age++) expect(faceStrokes(body, age)).toBe(1);
  });
});
