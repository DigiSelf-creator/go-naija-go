/**
 * L1: the village well and its store room (S2.5, R4, R8). Rope and bucket, never
 * a pipe; no water; timings from S2.5.
 */
import { describe, expect, it } from 'vitest';
import { HAIRS, OUTFITS, SKINS, drawHero } from '../../src/art/hero';
import { WELL, WELL_COLOURS, WELL_DOWN_TIME, WELL_UP_TIME, clipWellMouth, drawFade, drawWell, drawWellBack, drawWellFront, wellArrowBob, wellDownAt, wellUpAt } from '../../src/art/well';
import { ROOM, ROOM_COLOURS, drawGarriParcel, drawParcelIcon, drawRoomRope, drawShelf, drawWellRoom, lampFlicker } from '../../src/art/wellRoom';
import { hsl, recorder } from './recorder';

/** Pipe green: a strong green (hue 90 to 150). Water blue: hue 180 to 240 with colour in it. */
const pipeGreen = (c: string): boolean => {
  const v = hsl(c);
  return v !== null && v.h >= 90 && v.h <= 150 && v.s > 0.4 && v.l > 0.25;
};
const waterBlue = (c: string): boolean => {
  const v = hsl(c);
  return v !== null && v.h >= 180 && v.h <= 240 && v.s > 0.3;
};

describe('the well', () => {
  it('is the S2.5 size: 48 wide, 30 tall wall, frame up to 90', () => {
    expect(WELL).toEqual({ w: 48, wallH: 30, frameH: 90 });
  });

  it('no pipe green and no water blue anywhere in the well', () => {
    for (const [name, c] of Object.entries(WELL_COLOURS)) {
      expect(pipeGreen(c), `${name} ${c}`).toBe(false);
      expect(waterBlue(c), `${name} ${c}`).toBe(false);
    }
  });

  it('entrance and exit wells draw cleanly at every step of going down', () => {
    for (const kind of ['entrance', 'exit'] as const) {
      for (let t = 0; t <= 1.3; t += 0.1) {
        const m = wellDownAt(t);
        const r = recorder();
        drawWell(r.g, 100, 300, { kind, drop: m.drop, crank: m.crank, time: t });
        drawWellBack(r.g, 100, 300, { kind, drop: Number.NaN, crank: Number.NaN });
        r.g.save();
        clipWellMouth(r.g, 100, 300);
        r.g.restore();
        drawWellFront(r.g, 100, 300);
        drawFade(r.g, 600, 420, m.fade);
        expect(r.bad).toEqual([]);
        expect(r.depth()).toBe(0);
        expect(r.texts).toEqual([]);
        for (const c of r.colours) {
          expect(pipeGreen(c), c).toBe(false);
          expect(waterBlue(c), c).toBe(false);
        }
      }
    }
  });

  it('only the entrance well shows the bucket and the arrow', () => {
    const count = (kind: 'entrance' | 'exit'): number => {
      const r = recorder();
      drawWell(r.g, 100, 300, { kind, time: 0 });
      return r.calls.length;
    };
    expect(count('entrance')).toBeGreaterThan(count('exit'));
  });

  it('going down takes 1.2 s: hero up to the rope, then down with the bucket, fading in the last 0.4 s', () => {
    expect(WELL_DOWN_TIME).toBe(1.2);
    const a = wellDownAt(0);
    expect(a).toMatchObject({ toRope: 0, heroDy: 0, fade: 0, done: false });
    expect(wellDownAt(0.25).toRope).toBe(1);
    expect(wellDownAt(0.25).heroDy).toBeCloseTo(-30, 6);
    expect(wellDownAt(0.8).fade).toBeCloseTo(0, 9);
    expect(wellDownAt(1.0).fade).toBeCloseTo(0.5, 6);
    const end = wellDownAt(1.2);
    expect(end.fade).toBe(1);
    expect(end.done).toBe(true);
    expect(end.heroDy).toBeGreaterThan(60); // well below the road top: out of sight
    // Always going down after the step up, and the bucket goes with the hero
    let last = wellDownAt(0.25).heroDy;
    for (let t = 0.3; t <= 1.2; t += 0.05) {
      const m = wellDownAt(t);
      expect(m.heroDy).toBeGreaterThanOrEqual(last);
      last = m.heroDy;
      expect(m.drop - 11 - (m.heroDy + 30)).toBeCloseTo(0, 6);
    }
    expect(wellDownAt(Number.NaN).done).toBe(false);
  });

  it('going up takes 1.0 s and fades in the last 0.4 s', () => {
    expect(WELL_UP_TIME).toBe(1.0);
    expect(wellUpAt(0)).toMatchObject({ heroDy: 0, fade: 0, done: false });
    expect(wellUpAt(0.6).fade).toBe(0);
    expect(wellUpAt(1).fade).toBe(1);
    expect(wellUpAt(1).heroDy).toBeCloseTo(-120, 6);
  });

  it('the arrow bobs once every 2 s', () => {
    expect(wellArrowBob(0.5)).toBeCloseTo(wellArrowBob(2.5), 6);
    expect(wellArrowBob(0.5)).toBeCloseTo(-wellArrowBob(1.5), 6);
  });
});

describe('the store room', () => {
  it('fits a 560 u screen, floor at 300, rope at 500, bucket arrives at 60', () => {
    expect(ROOM).toMatchObject({ w: 560, floorY: 300, arriveX: 60, exitX: 500 });
    expect(ROOM.lamps).toHaveLength(3);
  });

  it('is dry: no water blue in the room colours', () => {
    for (const [name, c] of Object.entries(ROOM_COLOURS)) {
      if (c.startsWith('#')) expect(waterBlue(c), `${name} ${c}`).toBe(false);
    }
  });

  it('room, shelves, ropes and parcel draw cleanly on narrow and wide screens', () => {
    for (const [camX, w] of [
      [0, 480],
      [-200, 960],
      [80, 480],
    ] as const) {
      const r = recorder();
      drawWellRoom(r.g, camX, w, 1.3);
      drawShelf(r.g, 120, 250, 80);
      drawRoomRope(r.g, 500, 236, 2.2);
      drawGarriParcel(r.g, 295, 176, 0.1);
      drawParcelIcon(r.g, 20, 20, 24);
      drawParcelIcon(r.g, 20, 20, Number.NaN);
      expect(r.bad).toEqual([]);
      expect(r.depth()).toBe(0);
      expect(r.texts).toEqual([]);
    }
  });

  it('lamps flicker softly, never out', () => {
    for (let t = 0; t < 10; t += 0.07) {
      for (let i = 0; i < 3; i++) {
        const f = lampFlicker(t, i);
        expect(f).toBeGreaterThan(0.8);
        expect(f).toBeLessThan(1.15);
      }
    }
  });

  it('the rope pose draws for every hero look', () => {
    for (let skin = 0; skin < SKINS.length; skin++) {
      for (let hair = 0; hair < HAIRS.length; hair++) {
        for (let outfit = 0; outfit < OUTFITS.length; outfit++) {
          const r = recorder();
          drawHero(r.g, { skin, hair, outfit }, { phase: 0, inAir: false, facing: 1, glow: false, rope: true });
          expect(r.bad).toEqual([]);
          expect(r.depth()).toBe(0);
        }
      }
    }
  });
});
