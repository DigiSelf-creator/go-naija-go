/**
 * B4 (qa): every hero combo (5 skins x 5 hairs x 5 outfits) draws in every pose
 * with no error and no broken numbers, and the lists match docs/design.md.
 */
import { describe, expect, it } from 'vitest';
import { HAIRS, OUTFITS, SKINS, clampLook, drawHero, type HeroPose } from '../../src/art/hero';

/**
 * A stand-in 2D context that records every call. Any NaN or Infinity passed to a
 * drawing call is a bug (the canvas would silently skip it on a phone).
 */
function recordingContext(): { g: CanvasRenderingContext2D; calls: { name: string; args: unknown[] }[]; bad: string[]; saves: () => number } {
  const calls: { name: string; args: unknown[] }[] = [];
  const bad: string[] = [];
  let depth = 0;
  const props: Record<string, unknown> = { globalAlpha: 1, lineWidth: 1 };
  const g = new Proxy(props, {
    get(target, key) {
      if (typeof key !== 'string') return undefined;
      if (key in target) return target[key];
      return (...args: unknown[]) => {
        calls.push({ name: key, args });
        if (key === 'save') depth++;
        if (key === 'restore') depth--;
        for (const a of args) {
          if (typeof a === 'number' && !Number.isFinite(a)) bad.push(`${key}(${args.join(', ')})`);
        }
        return undefined;
      };
    },
    set(target, key, value) {
      if (typeof key === 'string') {
        if (typeof value === 'number' && !Number.isFinite(value)) bad.push(`${key} = ${value}`);
        if (value === undefined || value === '') bad.push(`${key} = ${String(value)}`);
        target[key] = value;
      }
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { g, calls, bad, saves: () => depth };
}

const POSES: HeroPose[] = [
  { phase: 0, inAir: false, facing: 1, glow: false, standing: true, blink: false, time: 0 },
  { phase: 0, inAir: false, facing: 1, glow: false, standing: true, blink: true, time: 1.2 },
  ...[0, 0.25, 0.5, 0.75, 0.999].map((phase): HeroPose => ({ phase, inAir: false, facing: 1, glow: false, time: phase })),
  { phase: 0.3, inAir: true, facing: 1, glow: false },
  { phase: 0.3, inAir: false, facing: -1, glow: false },
  { phase: 0.6, inAir: false, facing: 1, glow: true, time: 2.5 },
  { phase: 0.6, inAir: true, facing: 1, glow: false, fast: true, time: 3.1 },
];

describe('hero art', () => {
  it('has the lists from docs/design.md, in order', () => {
    expect(SKINS.map((s) => s.label)).toEqual(['Skin tone 1', 'Skin tone 2', 'Skin tone 3', 'Skin tone 4', 'Skin tone 5']);
    expect(SKINS.map((s) => s.base)).toEqual(['#f1c9a5', '#d9a172', '#a8693f', '#7a4a2a', '#4b2c1a']);
    expect(HAIRS.map((h) => h.label)).toEqual(['Low cut', 'Afro', 'Braids', 'Gele', 'Headscarf']);
    expect(OUTFITS.map((o) => o.label)).toEqual(['Green jersey', 'Ankara', 'School uniform', 'Agbada', 'Kaftan']);
    expect(OUTFITS.map((o) => [o.a, o.b])).toEqual([
      ['#0e7a3e', '#ffffff'],
      ['#e0572b', '#2b59c3'],
      ['#f4f4f4', '#7b2d26'],
      ['#5a3e8f', '#f2b300'],
      ['#2f5d8a', '#e9e1cf'],
    ]);
  });

  it('draws all 125 combos in every pose with no error and no broken numbers', () => {
    let combos = 0;
    const signatures = new Set<string>();
    for (let skin = 0; skin < SKINS.length; skin++) {
      for (let hair = 0; hair < HAIRS.length; hair++) {
        for (let outfit = 0; outfit < OUTFITS.length; outfit++) {
          combos++;
          for (const pose of POSES) {
            const { g, calls, bad, saves } = recordingContext();
            expect(() => drawHero(g, { skin, hair, outfit }, pose)).not.toThrow();
            expect(bad, `look ${skin}/${hair}/${outfit}`).toEqual([]);
            // It actually drew something, and left the context as it found it.
            expect(calls.some((c) => c.name === 'fill' || c.name === 'stroke')).toBe(true);
            expect(saves()).toBe(0);
          }
          // The standing preview of each combo is a different drawing.
          const { g, calls } = recordingContext();
          const colours: string[] = [];
          const watch = new Proxy(g, {
            set(t, k, v) {
              if (k === 'fillStyle' || k === 'strokeStyle') colours.push(String(v));
              return Reflect.set(t, k, v);
            },
            get: (t, k) => Reflect.get(t, k),
          });
          drawHero(watch, { skin, hair, outfit }, POSES[0]!);
          signatures.add(`${calls.map((c) => `${c.name}(${c.args.join(',')})`).join(';')}|${colours.join(',')}`);
        }
      }
    }
    expect(combos).toBe(125);
    expect(signatures.size).toBe(125);
  });

  it('draws broken or future saves without throwing', () => {
    for (const look of [
      { skin: 99, hair: -1, outfit: 2.5 },
      { skin: Number.NaN, hair: Infinity, outfit: -0 },
    ]) {
      const { g, bad } = recordingContext();
      expect(() => drawHero(g, look, POSES[2]!)).not.toThrow();
      expect(bad).toEqual([]);
      const c = clampLook(look);
      expect(c.skin).toBeGreaterThanOrEqual(0);
      expect(c.skin).toBeLessThan(SKINS.length);
      expect(c.hair).toBeLessThan(HAIRS.length);
      expect(c.outfit).toBeLessThan(OUTFITS.length);
    }
  });
});
