/**
 * S3a3: the intro that moves (docs/city.md part 5, (a2)). drawIntroScene is a pure function of
 * time: it draws cleanly at every moment and size, the same t always draws the same picture,
 * and the beats and cues match the a2.12 times (which replace a2.2 and a2.6).
 */
import { describe, expect, it } from 'vitest';
import { AGES, BODIES, HAIRS, HERO_ART_BOX, OUTFITS, SKINS, drawHero, type HeroLook } from '../../src/art/hero';
import { drawOutlineHero } from '../../src/art/intro';
import { boundsContext } from './bounds-context';
import { INTRO_BEATS, INTRO_CUES, INTRO_HOLD, INTRO_STILL_AFTER, drawIntroScene, introBeatAt, prepareIntroScene, wheelAngle } from '../../src/art/intro-scene';
import { soundLength } from '../../src/engine/sound';
import { recorder } from './recorder';

const LOOK: HeroLook = { skin: 3, hair: 2, outfit: 1, body: 0, age: 1 };

function draw(t: number, w = 851, h = 393, look: HeroLook | null = LOOK, inset = 0): ReturnType<typeof recorder> {
  const r = recorder();
  drawIntroScene(r.g, w, h, t, { look, inset });
  expect(r.bad, `t = ${t}, ${w} x ${h}`).toEqual([]);
  expect(r.depth(), `t = ${t}: save and restore balance`).toBe(0);
  return r;
}

describe('the beats (a2.2)', () => {
  it('has six beat starts, then the hold at 44 s (a2.12)', () => {
    expect(INTRO_BEATS).toEqual([0, 11, 19.6, 25.4, 31.6, 39, 44]);
    expect(INTRO_HOLD).toBe(44);
    expect(INTRO_STILL_AFTER).toBe(3);
  });

  it('tells which beat a time is in', () => {
    expect(introBeatAt(0)).toBe(0);
    expect(introBeatAt(10.99)).toBe(0);
    expect(introBeatAt(11)).toBe(1);
    expect(introBeatAt(25.4)).toBe(3);
    expect(introBeatAt(38.99)).toBe(4);
    expect(introBeatAt(44)).toBe(6);
    expect(introBeatAt(99)).toBe(6);
    expect(introBeatAt(-1)).toBe(0);
    expect(introBeatAt(Number.NaN)).toBe(0);
  });
});

describe('the cues (a2.6)', () => {
  it('are in time order, inside the scene, with real sound names and sensible music levels', () => {
    for (let i = 1; i < INTRO_CUES.length; i++) expect(INTRO_CUES[i]!.t).toBeGreaterThanOrEqual(INTRO_CUES[i - 1]!.t);
    for (const c of INTRO_CUES) {
      expect(c.t).toBeGreaterThanOrEqual(0);
      expect(c.t).toBeLessThanOrEqual(INTRO_HOLD);
      if ('sound' in c) expect(soundLength(c.sound), c.sound).toBeGreaterThan(0);
      else {
        expect(c.level).toBeGreaterThanOrEqual(0);
        expect(c.level).toBeLessThanOrEqual(1);
        expect(c.ramp).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('starts the tune soft, stops it with the Wheel at 30.2 s and starts it again at 34.6 s', () => {
    const music = INTRO_CUES.filter((c) => 'music' in c);
    expect(music[0]).toEqual({ t: 0, music: 'start', level: 0.6, ramp: 0 });
    expect(music).toContainEqual({ t: 30.2, music: 'level', level: 0, ramp: 0.3 });
    expect(music).toContainEqual({ t: 34.6, music: 'restart', level: 1, ramp: 0 });
    // One cue per Stopper as it arrives, in the caption's order
    const at = (t: number): string[] => INTRO_CUES.filter((c) => c.t === t && 'sound' in c).map((c) => ('sound' in c ? c.sound : ''));
    expect([at(26), at(26.9), at(27.8), at(28.7)]).toEqual([['honk'], ['roomThump'], ['lightClunk'], ['parcel']]);
    // The sting comes with "Let's go"
    expect(at(INTRO_HOLD)).toEqual(['sting']);
  });
});

describe('the Wheel turns, sticks and turns again', () => {
  it('turns slowly, then freely, stops from 30.2 s to 34.3 s, then rolls again', () => {
    expect(wheelAngle(0)).toBe(0);
    expect(wheelAngle(2)).toBeCloseTo(0.4, 5); // 0.2 rad/s while being made
    expect(wheelAngle(10) - wheelAngle(9)).toBeCloseTo(0.5, 5); // turning freely
    expect(wheelAngle(34.2)).toBeCloseTo(wheelAngle(30.5), 9); // stuck
    expect(wheelAngle(37) - wheelAngle(36.5)).toBeCloseTo(0.3, 5); // going again
    // Never jumps
    for (let t = 0; t < 48; t += 0.01) expect(Math.abs(wheelAngle(t + 0.01) - wheelAngle(t))).toBeLessThan(0.05);
  });
});

describe('drawIntroScene', () => {
  it('draws cleanly every 0.1 s from 0 to 48 s, with no words but the bus stop sign', () => {
    for (let t = 0; t <= 48; t += 0.1) {
      const r = draw(t);
      expect(r.calls.length).toBeGreaterThan(30);
      for (const s of r.texts) expect(s).toBe('BUS STOP');
    }
  });

  it('draws at every phone size, the smallest too, and fills the whole area', () => {
    for (const [w, h] of [[320, 240], [568, 320], [640, 360], [851, 393], [393, 851], [180, 100]] as const)
      for (const t of [...INTRO_BEATS, 2, 8, 11.4, 20, 25.7, 30, 35, 39.2, 39.6, 47])
        for (const inset of [0, 78]) {
          const r = draw(t, w, h, LOOK, inset);
          const clip = r.calls.find((c) => c.name === 'rect');
          expect(clip?.args).toEqual([0, 0, w, h]);
        }
  });

  it('a2.12: with a strip at the bottom the picture fits above it, and the ground carries on under it', () => {
    // 320 x 240 with a 78 px strip: the 320 x 180 picture at 0.9 (162 px tall), centred above it
    const r = draw(29, 320, 240, LOOK, 78);
    const scale = r.calls.find((c) => c.name === 'scale');
    expect(scale?.args[0]).toBeCloseTo(0.9, 5);
    const move = r.calls.find((c) => c.name === 'translate');
    expect(move?.args).toEqual([16, 0]);
    // Without a strip it fills as before; a silly strip is held to at most 60 % of the height
    expect(draw(29, 320, 240, LOOK, 0).calls.find((c) => c.name === 'scale')?.args[0]).toBeCloseTo(1, 5);
    expect(draw(29, 320, 240, LOOK, 1e6).calls.find((c) => c.name === 'scale')?.args[0]).toBeCloseTo(96 / 180, 5);
    draw(29, 320, 240, LOOK, Number.NaN);
  });

  it('the same t always draws the same picture, whatever was drawn before', () => {
    for (const t of [0.7, 5.3, 6.5, 9, 11.5, 12.8, 20, 22.4, 25.7, 29.6, 34.8, 39.2, 39.6, 41, 46]) {
      const a = JSON.stringify(draw(t).calls);
      draw(t + 4.2);
      draw(Math.max(0, t - 2.9), 320, 240);
      const b = JSON.stringify(draw(t).calls);
      expect(b, `t = ${t}`).toBe(a);
    }
  });

  it('moves: each beat start, and moments inside a beat, draw different pictures', () => {
    const seen = new Set<string>();
    for (const t of [...INTRO_BEATS, 2, 5.5, 8.8, 13.6, 18, 22, 30, 35, 41.5]) seen.add(JSON.stringify(draw(t).calls));
    expect(seen.size).toBe(INTRO_BEATS.length + 9);
  });

  it('holds after 44 s: only the idle bob and the breath move', () => {
    const a = draw(47).calls.map((c) => c.name).join();
    const b = draw(55).calls.map((c) => c.name).join();
    expect(b).toBe(a);
  });

  it('prepares the map sums ahead, and the same picture follows', () => {
    const before = JSON.stringify(draw(22.4).calls);
    prepareIntroScene();
    prepareIntroScene();
    expect(JSON.stringify(draw(22.4).calls)).toBe(before);
  });

  it('copes with odd input: NaN or negative time, zero or broken size', () => {
    draw(Number.NaN);
    draw(-5);
    draw(Number.POSITIVE_INFINITY);
    draw(10, 0, 0);
    draw(10, Number.NaN, Number.POSITIVE_INFINITY);
    const r = recorder();
    drawIntroScene(r.g, 320, 240, 33);
    expect(r.bad).toEqual([]);
  });

  it('draws the plain outline hero on a first visit, and every hero look', () => {
    for (const t of [32.1, 33.4, 34.7, 36.4, 40.6, 42, 45]) draw(t, 851, 393, null);
    for (let body = 0; body < BODIES.length; body++)
      for (let age = 0; age < AGES.length; age++)
        for (let skin = 0; skin < SKINS.length; skin++)
          for (const t of [32.5, 34.8, 41.2, 43]) draw(t, 320, 240, { skin, hair: (skin + age) % HAIRS.length, outfit: (skin + body) % OUTFITS.length, body, age });
    // A slice 1 look (no body or age) still draws
    draw(34.8, 320, 240, { skin: 2, hair: 3, outfit: 1 });
  });

  it('keeps no party colours or flag shapes: the map is land in green and white only', () => {
    // The map beat draws the national green and white inside the outline (clip), never a plain rectangle flag on a pole
    const r = draw(23);
    const names = r.calls.map((c) => c.name);
    expect(names).toContain('clip');
    expect(r.colours).toContain('#008751');
    // No pole: nothing on this beat draws a long thin upright rectangle beside the map
    const poles = r.calls.filter((c) => c.name === 'fillRect' && (c.args[2] as number) < 4 && (c.args[3] as number) > 60);
    expect(poles).toEqual([]);
  });
});

describe('the new poses', () => {
  it('the hero pushing stays inside the hero art box, for every body, age and look', () => {
    for (let body = 0; body < BODIES.length; body++)
      for (let age = 0; age < AGES.length; age++)
        for (let hair = 0; hair < HAIRS.length; hair++)
          for (const push of [0.3, 1]) {
            const b = boundsContext();
            drawHero(b.g, { skin: 1, hair, outfit: (hair + body) % OUTFITS.length, body, age }, { phase: 0, inAir: false, facing: 1, glow: false, standing: true, push, time: 1 });
            expect(b.bad).toEqual([]);
            expect(b.depth()).toBe(0);
            expect(b.box.left).toBeGreaterThanOrEqual(HERO_ART_BOX.left);
            expect(b.box.right).toBeLessThanOrEqual(HERO_ART_BOX.right);
            expect(b.box.top).toBeGreaterThanOrEqual(HERO_ART_BOX.top);
            expect(b.box.bottom).toBeLessThanOrEqual(HERO_ART_BOX.bottom);
          }
  });

  it('the outline hero walks, pushes and breathes cleanly; with no pose it is the still frame drawing', () => {
    for (const pose of [{ step: 0 }, { step: 2.1 }, { push: 0.5 }, { push: 1 }, { breathe: 3 }, { step: Number.NaN, push: Number.NaN }]) {
      const r = recorder();
      drawOutlineHero(r.g, pose);
      expect(r.bad).toEqual([]);
      expect(r.depth()).toBe(0);
    }
    const a = recorder();
    drawOutlineHero(a.g);
    expect(a.calls.map((c) => c.name)).toContain('quadraticCurveTo');
  });
});
