/**
 * Decisions 60 and 61 (Tp, 14 Nov): the richer hero (one shadow and one highlight per part, a
 * rim light, bolder outlines, a bigger face with moods, smoother running) and the front pose
 * the hero turns to at the end of the intro. Every look still draws, inside the same art box,
 * with the same hitbox; every skin tone gets the same care.
 */
import { describe, expect, it } from 'vitest';
import { AGES, BODIES, HAIRS, HERO_ART_BOX, HeroSprites, OUTFITS, SKINS, drawHero, spriteKey, turnWidth, type HeroFace, type HeroPose } from '../../src/art/hero';
import { drawOutlineHero } from '../../src/art/intro';
import { INTRO_BEATS, TURN5, TURN6, TURN_TIME, heroTurn } from '../../src/art/intro-scene';
import { boundsContext } from './bounds-context';

function luminance(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a: string, b: string): number => {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

/** Counts fills in a colour and records every colour set. */
function watch(): { g: CanvasRenderingContext2D; used: Set<string>; fills: Map<string, number> } {
  const used = new Set<string>();
  const fills = new Map<string, number>();
  const g = new Proxy({} as Record<string, unknown>, {
    get(t, k) {
      if (typeof k !== 'string') return undefined;
      if (k in t) return t[k];
      return () => {
        if (k === 'fill') {
          const c = String(t['fillStyle']).toLowerCase();
          fills.set(c, (fills.get(c) ?? 0) + 1);
        }
        return undefined;
      };
    },
    set(t, k, v) {
      if (k === 'fillStyle' || k === 'strokeStyle') used.add(String(v).toLowerCase());
      t[k as string] = v;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { g, used, fills };
}

const stand: HeroPose = { phase: 0, inAir: false, facing: 1, glow: false, standing: true, time: 0.4 };
const MOODS: HeroFace[] = ['calm', 'run', 'jump', 'hurt', 'win'];

function inside(box: { left: number; right: number; top: number; bottom: number }): boolean {
  return box.left >= HERO_ART_BOX.left && box.right <= HERO_ART_BOX.right && box.top >= HERO_ART_BOX.top && box.bottom <= HERO_ART_BOX.bottom;
}

describe('decision 60: the richer hero', () => {
  it('every skin has its own shadow and highlight, with the same shadow depth on every tone', () => {
    for (const s of SKINS) {
      expect(luminance(s.deep), s.label).toBeLessThan(luminance(s.base));
      expect(luminance(s.glow), s.label).toBeGreaterThan(luminance(s.base));
      // Shadows read the same on light and dark skin; highlights at least as clear as on light skin
      expect(contrast(s.deep, s.base), s.label).toBeGreaterThanOrEqual(1.35);
      expect(contrast(s.deep, s.base), s.label).toBeLessThanOrEqual(1.55);
      expect(contrast(s.glow, s.base), s.label).toBeGreaterThanOrEqual(1.25);
    }
    // Darker skins get a highlight at least as strong as lighter ones (it carries their shape)
    const glows = SKINS.map((s) => contrast(s.glow, s.base));
    for (let i = 1; i < glows.length; i++) expect(glows[i]!).toBeGreaterThanOrEqual(glows[i - 1]! - 0.01);
  });

  it('every skin is drawn with its own shadow and highlight', () => {
    for (const [i, s] of SKINS.entries()) {
      const w = watch();
      drawHero(w.g, { skin: i, hair: 0, outfit: 0, body: 0, age: 1 }, { phase: 0.3, inAir: false, facing: 1, glow: false, time: 0.3 });
      expect(w.used.has(s.deep), s.label).toBe(true);
      expect(w.used.has(s.glow), s.label).toBe(true);
    }
  });

  it('every mood draws on every skin, body and age: the rose lip once, eyes white, no broken numbers', () => {
    for (let skin = 0; skin < SKINS.length; skin++)
      for (let body = 0; body < BODIES.length; body++)
        for (let age = 0; age < AGES.length; age++)
          for (const face of MOODS) {
            const look = { skin, hair: (skin + age) % HAIRS.length, outfit: (body + age) % OUTFITS.length, body, age };
            const w = watch();
            drawHero(w.g, look, { ...stand, face });
            expect(w.fills.get(SKINS[skin]!.face.lip.toLowerCase()), `${face} ${JSON.stringify(look)}`).toBe(1);
            expect(w.used.has('#ffffff')).toBe(true);
            const r = boundsContext();
            drawHero(r.g, look, { ...stand, face });
            expect(r.bad).toEqual([]);
            expect(r.depth()).toBe(0);
            expect(inside(r.box), `${face} ${JSON.stringify(look)}`).toBe(true);
          }
  });

  it('the face follows the body: run, jump, calm; and the moods differ', () => {
    const look = { skin: 3, hair: 0, outfit: 0, body: 0, age: 1 };
    // Every drawing call and its numbers, in order
    const shape = (p: HeroPose): string => {
      const log: string[] = [];
      const g = new Proxy({} as Record<string, unknown>, {
        get: (t, k) => (typeof k !== 'string' ? undefined : k in t ? t[k] : (...a: unknown[]) => void log.push(`${k}(${a.map((x) => (typeof x === 'number' ? x.toFixed(3) : String(x))).join(',')})`)),
        set: (t, k, v) => {
          t[k as string] = v;
          return true;
        },
      }) as unknown as CanvasRenderingContext2D;
      drawHero(g, look, p);
      return log.join(';');
    };
    const faces = new Set(MOODS.map((face) => shape({ ...stand, face })));
    expect(faces.size).toBe(MOODS.length);
    expect(shape({ phase: 0.2, inAir: false, facing: 1, glow: false })).toBe(shape({ phase: 0.2, inAir: false, facing: 1, glow: false, face: 'run' }));
    expect(shape({ phase: 0, inAir: true, facing: 1, glow: false, vy: -100 })).toBe(shape({ phase: 0, inAir: true, facing: 1, glow: false, vy: -100, face: 'jump' }));
  });

  it('stretches taller rising off a jump, never on the ground', () => {
    const look = { skin: 1, hair: 0, outfit: 0, body: 0, age: 1 };
    const tall = (p: HeroPose): number => {
      const r = boundsContext();
      drawHero(r.g, look, p);
      return r.box.bottom - r.box.top;
    };
    const air = { phase: 0, inAir: true, facing: 1 as const, glow: false };
    expect(tall({ ...air, vy: -320 })).toBeGreaterThan(tall({ ...air, vy: -1 }) * 1.04);
  });
});

describe('decision 60: sprites at the screen scale', () => {
  it('only the plain moves are cached, and they fit in a small, fixed number of sprites', () => {
    const keys = new Set<string>();
    for (let i = 0; i < 2000; i++) {
      const phase = (i * 0.0137) % 1;
      for (const p of [
        { phase, inAir: false, facing: 1 as const, glow: false },
        { phase, inAir: false, facing: -1 as const, glow: false, gait: 'walk' as const },
        { phase, inAir: false, facing: 1 as const, glow: false, land: (i % 50) / 50 },
        { phase, inAir: true, facing: 1 as const, glow: false, vy: -500 + (i % 1000) },
      ]) {
        const k = spriteKey(p);
        expect(k).not.toBeNull();
        keys.add(k!);
      }
    }
    expect(keys.size).toBeLessThanOrEqual(24 + 24 + 6 * 8 * 2 + 33);
    // Effects, standing and set moods draw live
    const base: HeroPose = { phase: 0.2, inAir: false, facing: 1, glow: false };
    for (const p of [
      { ...base, glow: true },
      { ...base, fast: true },
      { ...base, dash: true },
      { ...base, suit: {} },
      { ...base, standing: true },
      { ...base, skid: 0.5 },
      { ...base, dust: 0.2 },
      { ...base, throwing: 0.3 },
      { ...base, rope: true },
      { ...base, face: 'hurt' as const },
      { ...base, front: 1 },
      { ...base, push: 0.5 },
    ])
      expect(spriteKey(p), JSON.stringify(p)).toBeNull();
    // Without a page, the sprites fall back to drawing live
    const r = boundsContext();
    new HeroSprites().draw(r.g, { skin: 0, hair: 0, outfit: 0 }, base);
    expect(r.drew()).toBe(true);
  });
});

describe('decision 61: the front pose', () => {
  it('the turn narrows to about half, then widens to full', () => {
    expect(turnWidth(0)).toBe(1);
    expect(turnWidth(0.5)).toBeCloseTo(0.55);
    expect(turnWidth(1)).toBeCloseTo(1);
    expect(turnWidth(Number.NaN)).toBe(1);
  });

  it('every look draws facing us, inside the art box, feet on the ground', () => {
    const outside: string[] = [];
    for (let skin = 0; skin < SKINS.length; skin++)
      for (let body = 0; body < BODIES.length; body++)
        for (let age = 0; age < AGES.length; age++)
          for (let hair = 0; hair < HAIRS.length; hair++)
            for (let outfit = 0; outfit < OUTFITS.length; outfit++)
              for (const front of [0.3, 1]) {
                const look = { skin, hair, outfit, body, age };
                const r = boundsContext();
                drawHero(r.g, look, { ...stand, front, blink: outfit === 2 });
                expect(r.bad).toEqual([]);
                expect(r.depth()).toBe(0);
                if (!inside(r.box)) outside.push(`${JSON.stringify(look)} ${front} ${JSON.stringify(r.box)}`);
                if (front === 1) expect(r.box.bottom).toBeGreaterThan(-0.5);
              }
    expect(outside.slice(0, 5)).toEqual([]);
  }, 30_000);

  it('facing us keeps the face colours, the lip once, elders grey, elder men bearded, women studs', () => {
    for (let skin = 0; skin < SKINS.length; skin++) {
      const f = SKINS[skin]!.face;
      for (let body = 0; body < 2; body++)
        for (let age = 0; age < 3; age++) {
          const w = watch();
          drawHero(w.g, { skin, hair: 0, outfit: 4, body, age }, { ...stand, front: 1 });
          for (const c of [f.line, f.lip, f.lipLine, f.rim, '#ffffff', SKINS[skin]!.base]) if (c) expect(w.used.has(c.toLowerCase()), `${c} ${skin} ${body} ${age}`).toBe(true);
          expect(w.fills.get(f.lip.toLowerCase())).toBe(1);
          expect(w.used.has('#b9b4ac')).toBe(age === 2);
          expect(w.used.has('#f2b300')).toBe(body === 1);
        }
    }
  });

  it('the front pose is its own drawing, not the side view', () => {
    const look = { skin: 2, hair: 3, outfit: 1, body: 1, age: 1 };
    const box = (p: HeroPose): string => {
      const r = boundsContext();
      drawHero(r.g, look, p);
      return JSON.stringify(r.box);
    };
    expect(box({ ...stand, front: 1 })).not.toBe(box(stand));
    expect(box({ ...stand, front: 0 })).toBe(box(stand));
  });

  it('the outline hero turns too', () => {
    for (const front of [0, 0.3, 0.8, 1]) {
      const r = boundsContext();
      drawOutlineHero(r.g, { breathe: 1, front });
      expect(r.bad).toEqual([]);
      expect(r.depth()).toBe(0);
      expect(r.box.top).toBeGreaterThan(-52);
      expect(r.box.bottom).toBeLessThan(1);
    }
  });

  it('the intro turns at "That hero is you." and at the bus door, keeping the beat times', () => {
    expect(INTRO_BEATS).toEqual([0, 11, 19.6, 25.4, 31.6, 39, 44]);
    expect(TURN5).toBeGreaterThanOrEqual(37.5);
    expect(TURN5 + TURN_TIME).toBeLessThan(39);
    expect(TURN6).toBeGreaterThanOrEqual(42.6);
    expect(TURN6 + TURN_TIME).toBeLessThan(44);
    expect(heroTurn(TURN5 - 0.01, TURN5)).toBe(0);
    expect(heroTurn(TURN5 + TURN_TIME, TURN5)).toBe(1);
    expect(heroTurn(38.95, TURN5)).toBe(1);
  });
});
