/**
 * I1: male and female heroes at three ages (docs/design.md S2.3). Every one of the
 * 5 skins x 2 bodies x 3 ages x 5 hairs x 5 outfits draws in every pose with no
 * error, inside the hero's art box, feet on the same spot. Old looks (no body, no
 * age) draw as Adult, Female if the hair is Gele or Headscarf, else Male.
 */
import { describe, expect, it } from 'vitest';
import {
  AGES,
  BODIES,
  FIRST_LOOKS,
  HAIRS,
  HERO_ART_BOX,
  OUTFITS,
  SKINS,
  ageOf,
  bodyOf,
  clampLook,
  defaultBody,
  drawHero,
  type HeroLook,
  type HeroPose,
} from '../../src/art/hero';
import { RULES } from '../../src/game/run';
import { boundsContext, type Box } from './bounds-context';

/** stand, blink, walk, run, skid, jump, fall, land, rope, and facing left. */
const POSES: [string, HeroPose][] = [
  ['stand', { phase: 0, inAir: false, facing: 1, glow: false, standing: true, time: 0.7 }],
  ['blink', { phase: 0, inAir: false, facing: 1, glow: false, standing: true, blink: true, time: 1.9 }],
  ...[0, 0.3, 0.6, 0.85].map((phase): [string, HeroPose] => ['walk', { phase, inAir: false, facing: 1, glow: false, gait: 'walk', time: phase }]),
  ...[0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875].map((phase): [string, HeroPose] => ['run', { phase, inAir: false, facing: 1, glow: false, time: phase }]),
  // Amala glow (bigger strides), corn speed lines and dust: the effects are outside the art box
  ['run glow', { phase: 0.4, inAir: false, facing: 1, glow: true, fast: true, dust: 0.3, time: 0.4 }],
  ['skid', { phase: 0.2, inAir: false, facing: 1, glow: false, skid: 1, time: 0.3 }],
  ['jump', { phase: 0, inAir: true, facing: 1, glow: false, vy: -320 }],
  ['top of jump', { phase: 0, inAir: true, facing: 1, glow: false, vy: 0 }],
  ['fall', { phase: 0, inAir: true, facing: 1, glow: false, vy: 320 }],
  ['land', { phase: 0.1, inAir: false, facing: 1, glow: false, land: 1 }],
  ['rope', { phase: 0, inAir: false, facing: 1, glow: false, rope: true }],
  ['run left', { phase: 0.45, inAir: false, facing: -1, glow: false, time: 0.45 }],
];

function inside(box: Box, facing: 1 | -1): boolean {
  const left = facing === 1 ? HERO_ART_BOX.left : -HERO_ART_BOX.right;
  const right = facing === 1 ? HERO_ART_BOX.right : -HERO_ART_BOX.left;
  return box.left >= left && box.right <= right && box.top >= HERO_ART_BOX.top && box.bottom <= HERO_ART_BOX.bottom;
}

function drawBox(look: HeroLook, pose: HeroPose): Box {
  const r = boundsContext();
  drawHero(r.g, look, pose);
  return r.box;
}

/** Records every colour set while drawing. */
function colours(look: HeroLook, pose: HeroPose = POSES[0]![1]): Set<string> {
  const r = boundsContext();
  const used = new Set<string>();
  const watch = new Proxy(r.g, {
    set(t, k, v) {
      if (k === 'fillStyle' || k === 'strokeStyle') used.add(String(v).toLowerCase());
      return Reflect.set(t, k, v);
    },
    get: (t, k) => Reflect.get(t, k),
  });
  drawHero(watch, look, pose);
  return used;
}

describe('hero bodies and ages (I1)', () => {
  it('has the rows from design.md S2.3, in order', () => {
    expect(BODIES.map((b) => b.label)).toEqual(['Male', 'Female']);
    expect(AGES.map((a) => a.label)).toEqual(['Teen', 'Adult', 'Elder']);
  });

  it('first looks follow the S2.3 table', () => {
    const name = (f: { hair: number; outfit: number }): string => `${HAIRS[f.hair]!.label}, ${OUTFITS[f.outfit]!.label}`;
    expect(FIRST_LOOKS[0]!.map(name)).toEqual(['Low cut, School uniform', 'Low cut, Green jersey', 'Low cut, Agbada']);
    expect(FIRST_LOOKS[1]!.map(name)).toEqual(['Braids, School uniform', 'Braids, Ankara', 'Gele, Ankara']);
  });

  it('a slice 1 look (no body, no age) is an Adult, Female with Gele or Headscarf, else Male', () => {
    expect(HAIRS.map((_, hair) => defaultBody(hair))).toEqual([0, 0, 0, 1, 1]);
    for (let hair = 0; hair < HAIRS.length; hair++) {
      const old = { skin: 2, hair, outfit: 0 };
      expect(ageOf(old)).toBe(1);
      expect(bodyOf(old)).toBe(hair >= 3 ? 1 : 0);
      // It draws exactly as that Adult does
      const r1 = boundsContext();
      const r2 = boundsContext();
      drawHero(r1.g, old, POSES[0]![1]);
      drawHero(r2.g, { ...old, body: bodyOf(old), age: 1 }, POSES[0]![1]);
      expect(r1.box).toEqual(r2.box);
    }
    // Broken values fall back the same way
    expect(bodyOf({ skin: 0, hair: 3, outfit: 0, body: 7 })).toBe(1);
    expect(bodyOf({ skin: 0, hair: 0, outfit: 0, body: Number.NaN })).toBe(0);
    expect(ageOf({ skin: 0, hair: 0, outfit: 0, age: -1 })).toBe(1);
    expect(ageOf({ skin: 0, hair: 0, outfit: 0, age: 2.5 })).toBe(1);
  });

  it('clampLook keeps a slice 1 look in its slice 1 shape, and fixes body and age when present', () => {
    expect(clampLook({ skin: 4, hair: 3, outfit: 1 })).toEqual({ skin: 4, hair: 3, outfit: 1 });
    expect(clampLook({ skin: 1, hair: 2, outfit: 3, body: 1, age: 2 })).toEqual({ skin: 1, hair: 2, outfit: 3, body: 1, age: 2 });
    expect(clampLook({ skin: 1, hair: 4, outfit: 3, body: 9, age: 9 })).toEqual({ skin: 1, hair: 4, outfit: 3, body: 1, age: 1 });
  });

  it('every hero keeps the same 14 x 44 hitbox (the drawing never sets it)', () => {
    expect(RULES.heroHalfW * 2).toBe(14);
    expect(RULES.heroH).toBe(44);
  });

  it('draws all 750 combos in every pose: no error, no broken numbers, inside the art box', () => {
    let combos = 0;
    let drawn = 0;
    const outside: string[] = [];
    for (let skin = 0; skin < SKINS.length; skin++)
      for (let body = 0; body < BODIES.length; body++)
        for (let age = 0; age < AGES.length; age++)
          for (let hair = 0; hair < HAIRS.length; hair++)
            for (let outfit = 0; outfit < OUTFITS.length; outfit++) {
              combos++;
              const look = { skin, hair, outfit, body, age };
              for (const [name, pose] of POSES) {
                const r = boundsContext();
                expect(() => drawHero(r.g, look, pose)).not.toThrow();
                expect(r.bad, `${JSON.stringify(look)} ${name}`).toEqual([]);
                expect(r.depth()).toBe(0);
                expect(r.drew()).toBe(true);
                if (!pose.glow && !inside(r.box, pose.facing)) outside.push(`${JSON.stringify(look)} ${name} ${JSON.stringify(r.box)}`);
                drawn++;
              }
            }
    expect(combos).toBe(750);
    expect(drawn).toBe(750 * POSES.length);
    expect(outside.slice(0, 5)).toEqual([]);
  });

  it('heights follow S2.3 (Teen 46, Elder 49, Adult 50) with the feet on the same spot', () => {
    const stand = POSES[0]![1];
    for (let body = 0; body < 2; body++) {
      // Low cut sits close to the skull, so the box top is the top of the head
      const [teen, adult, elder] = [0, 1, 2].map((age) => drawBox({ skin: 0, hair: 0, outfit: 0, body, age }, stand)) as [Box, Box, Box];
      const h = (b: Box): number => -b.top;
      expect(h(teen) / h(adult)).toBeGreaterThan(0.9);
      expect(h(teen) / h(adult)).toBeLessThan(0.94);
      expect(h(elder) / h(adult)).toBeGreaterThan(0.97);
      expect(h(elder) / h(adult)).toBeLessThan(0.99);
      for (const b of [teen, elder]) expect(Math.abs(b.bottom - adult.bottom)).toBeLessThan(0.3);
    }
  });

  it('every body is its own drawing, and Elders stand as tall in the run as at rest', () => {
    const seen = new Set<string>();
    for (let body = 0; body < 2; body++)
      for (let age = 0; age < 3; age++) {
        const look = { skin: 2, hair: 1, outfit: 4, body, age };
        seen.add(JSON.stringify([drawBox(look, POSES[0]![1]), [...colours(look)].sort()]));
      }
    expect(seen.size).toBe(6);
    // Elder: back straight. Running head top within 8 percent of standing height
    for (let body = 0; body < 2; body++) {
      const look = { skin: 0, hair: 0, outfit: 0, body, age: 2 };
      const standTop = drawBox(look, POSES[0]![1]).top;
      for (const [name, pose] of POSES.filter(([n]) => n === 'run' || n === 'walk')) {
        expect(drawBox(look, pose).top, name).toBeLessThan(standTop * 0.92);
      }
    }
  });

  it('elders have grey hair (and a grey lock under gele and headscarf); elder men a grey beard; women gold studs', () => {
    const GREY = '#b9b4ac';
    const STUD = '#f2b300';
    for (let hair = 0; hair < HAIRS.length; hair++) {
      for (let body = 0; body < 2; body++) {
        expect(colours({ skin: 3, hair, outfit: 4, body, age: 2 }).has(GREY), `elder hair ${hair}`).toBe(true);
        expect(colours({ skin: 3, hair, outfit: 4, body, age: 1 }).has(GREY), `adult hair ${hair}`).toBe(false);
      }
    }
    // Studs show wherever an ear does (a headscarf covers the ears). Low cut, kaftan: no other gold.
    expect(colours({ skin: 1, hair: 0, outfit: 4, body: 1, age: 1 }).has(STUD)).toBe(true);
    expect(colours({ skin: 1, hair: 0, outfit: 4, body: 0, age: 1 }).has(STUD)).toBe(false);
    // Beard: an elder man in a headscarf still shows grey (the beard and the lock)
    const beardMan = colours({ skin: 4, hair: 4, outfit: 4, body: 0, age: 2 });
    expect(beardMan.has(GREY)).toBe(true);
  });
});
