/**
 * S3a3: the intro that moves (docs/city.md part 5, (a2)). drawIntroScene is a pure function of
 * time: it draws cleanly at every moment and size, the same t always draws the same picture,
 * and the beats and cues match a2.2 and a2.6.
 */
import { describe, expect, it } from 'vitest';
import { AGES, BODIES, HAIRS, HERO_ART_BOX, OUTFITS, SKINS, drawHero, type HeroLook } from '../../src/art/hero';
import { drawOutlineHero } from '../../src/art/intro';
import { boundsContext } from './bounds-context';
import { INTRO_BEATS, INTRO_CUES, INTRO_HOLD, INTRO_STILL_AFTER, drawIntroScene, introBeatAt, prepareIntroScene, wheelAngle } from '../../src/art/intro-scene';
import { soundLength } from '../../src/engine/sound';
import { recorder } from './recorder';

const LOOK: HeroLook = { skin: 3, hair: 2, outfit: 1, body: 0, age: 1 };

function draw(t: number, w = 851, h = 393, look: HeroLook | null = LOOK): ReturnType<typeof recorder> {
  const r = recorder();
  drawIntroScene(r.g, w, h, t, { look });
  expect(r.bad, `t = ${t}, ${w} x ${h}`).toEqual([]);
  expect(r.depth(), `t = ${t}: save and restore balance`).toBe(0);
  return r;
}

describe('the beats (a2.2)', () => {
  it('has six beat starts, then the hold at 27.8 s', () => {
    expect(INTRO_BEATS).toEqual([0, 6, 11, 15.5, 20, 24.5, 27.8]);
    expect(INTRO_HOLD).toBe(27.8);
    expect(INTRO_STILL_AFTER).toBe(3);
  });

  it('tells which beat a time is in', () => {
    expect(introBeatAt(0)).toBe(0);
    expect(introBeatAt(5.99)).toBe(0);
    expect(introBeatAt(6)).toBe(1);
    expect(introBeatAt(15.5)).toBe(3);
    expect(introBeatAt(24.49)).toBe(4);
    expect(introBeatAt(27.8)).toBe(6);
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

  it('starts the tune soft, stops it with the Wheel at 19.2 s and starts it again at 22.3 s', () => {
    const music = INTRO_CUES.filter((c) => 'music' in c);
    expect(music[0]).toEqual({ t: 0, music: 'start', level: 0.6, ramp: 0 });
    expect(music).toContainEqual({ t: 19.2, music: 'level', level: 0, ramp: 0.3 });
    expect(music).toContainEqual({ t: 22.3, music: 'restart', level: 1, ramp: 0 });
    // One cue per Stopper as it arrives
    const at = (t: number): string[] => INTRO_CUES.filter((c) => c.t === t && 'sound' in c).map((c) => ('sound' in c ? c.sound : ''));
    expect([at(16), at(16.7), at(17.4), at(18.1)]).toEqual([['honk'], ['roomThump'], ['lightClunk'], ['parcel']]);
  });
});

describe('the Wheel turns, sticks and turns again', () => {
  it('turns slowly, then freely, stops from 19.2 s to 22 s, then rolls again', () => {
    expect(wheelAngle(0)).toBe(0);
    expect(wheelAngle(2)).toBeCloseTo(0.4, 5); // 0.2 rad/s while being made
    expect(wheelAngle(10) - wheelAngle(9)).toBeCloseTo(0.5, 5); // turning freely
    expect(wheelAngle(21.9)).toBeCloseTo(wheelAngle(19.5), 9); // stuck
    expect(wheelAngle(24) - wheelAngle(23.5)).toBeCloseTo(0.3, 5); // going again
    // Never jumps
    for (let t = 0; t < 32; t += 0.01) expect(Math.abs(wheelAngle(t + 0.01) - wheelAngle(t))).toBeLessThan(0.05);
  });
});

describe('drawIntroScene', () => {
  it('draws cleanly every 0.1 s from 0 to 32 s, with no words but the bus stop sign', () => {
    for (let t = 0; t <= 32; t += 0.1) {
      const r = draw(t);
      expect(r.calls.length).toBeGreaterThan(30);
      for (const s of r.texts) expect(s).toBe('BUS STOP');
    }
  });

  it('draws at every phone size, the smallest too, and fills the whole area', () => {
    for (const [w, h] of [[320, 240], [568, 320], [640, 360], [851, 393], [393, 851], [180, 100]] as const)
      for (const t of [...INTRO_BEATS, 2, 6.4, 11.4, 15.8, 19.4, 23, 24.9, 25.1, 31]) {
        const r = draw(t, w, h);
        const clip = r.calls.find((c) => c.name === 'rect');
        expect(clip?.args).toEqual([0, 0, w, h]);
      }
  });

  it('the same t always draws the same picture, whatever was drawn before', () => {
    for (const t of [0.7, 3.3, 6.5, 9, 11.5, 12.2, 13.5, 15.9, 18.7, 22.5, 24.7, 25, 26.4, 30]) {
      const a = JSON.stringify(draw(t).calls);
      draw(t + 4.2);
      draw(Math.max(0, t - 2.9), 320, 240);
      const b = JSON.stringify(draw(t).calls);
      expect(b, `t = ${t}`).toBe(a);
    }
  });

  it('moves: each beat start, and moments inside a beat, draw different pictures', () => {
    const seen = new Set<string>();
    for (const t of [...INTRO_BEATS, 2, 4.2, 8.8, 13.6, 17.6, 19.4, 21, 23, 26.3]) seen.add(JSON.stringify(draw(t).calls));
    expect(seen.size).toBe(INTRO_BEATS.length + 9);
  });

  it('holds after 27.8 s: only the idle bob and the breath move', () => {
    const a = draw(31).calls.map((c) => c.name).join();
    const b = draw(40).calls.map((c) => c.name).join();
    expect(b).toBe(a);
  });

  it('prepares the map sums ahead, and the same picture follows', () => {
    const before = JSON.stringify(draw(13.5).calls);
    prepareIntroScene();
    prepareIntroScene();
    expect(JSON.stringify(draw(13.5).calls)).toBe(before);
  });

  it('copes with odd input: NaN or negative time, zero or broken size', () => {
    draw(Number.NaN);
    draw(-5);
    draw(Number.POSITIVE_INFINITY);
    draw(10, 0, 0);
    draw(10, Number.NaN, Number.POSITIVE_INFINITY);
    const r = recorder();
    drawIntroScene(r.g, 320, 240, 21);
    expect(r.bad).toEqual([]);
  });

  it('draws the plain outline hero on a first visit, and every hero look', () => {
    for (const t of [20.5, 21.3, 22.4, 23.8, 26, 27.5, 29]) draw(t, 851, 393, null);
    for (let body = 0; body < BODIES.length; body++)
      for (let age = 0; age < AGES.length; age++)
        for (let skin = 0; skin < SKINS.length; skin++)
          for (const t of [21, 22.5, 26.5, 28]) draw(t, 320, 240, { skin, hair: (skin + age) % HAIRS.length, outfit: (skin + body) % OUTFITS.length, body, age });
    // A slice 1 look (no body or age) still draws
    draw(22.5, 320, 240, { skin: 2, hair: 3, outfit: 1 });
  });

  it('keeps no party colours or flag shapes: the map is land in green and white only', () => {
    // The map beat draws the national green and white inside the outline (clip), never a plain rectangle flag on a pole
    const r = draw(14);
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
