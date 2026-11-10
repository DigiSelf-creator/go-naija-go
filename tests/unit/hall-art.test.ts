/**
 * M1 art: Go-Slow Hall, the high "PEEP!" honk, the high-throw attack marks, the cones and the
 * kind finish timeline (docs/design.md S2.7, S2.12 picture 13).
 */
import { describe, expect, it } from 'vitest';
import { HIGH_HONK_H, HIGH_HONK_W, drawBoss, drawHighHonk, drawHonkCloud } from '../../src/art/boss';
import {
  HALL,
  HALL_COLOURS,
  HALL_CONES,
  HALL_FINISH,
  HALL_SIGN_TEXT,
  drawHall,
  drawHallCones,
  drawHallFront,
  hallConesAt,
  hallDoors,
  hallFinishAt,
  hallLampTimes,
} from '../../src/art/hall';
import { boundsContext } from './bounds-context';
import { hsl, recorder } from './recorder';

describe('Go-Slow Hall', () => {
  it('fits the S2.7 layout: 560 wide, floor 300, cone line at 400, drain at the left wall, 8 roof lamps', () => {
    expect(HALL.w).toBe(560);
    expect(HALL.floorY).toBe(300);
    expect(HALL.heroMinX).toBe(30);
    expect(HALL.heroMaxX).toBe(400);
    expect(HALL.bossX).toBe(500);
    expect(HALL.throwX).toBe(470);
    expect(HALL.drain).toEqual([0, 20]);
    expect(HALL.lamps).toHaveLength(8);
    for (const x of HALL.lamps) {
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(HALL.w);
    }
    // Lamps hang well above the high honk (top y 160) and every light (top y 180)
    expect(HALL.lampY + 10).toBeLessThan(160);
    // The hero starts in the left doorway; the name board hangs over it, inside the 560 u every screen shows
    expect(HALL.leftDoor.x0).toBeLessThan(50);
    expect(HALL.leftDoor.x1).toBeGreaterThan(50);
    expect(HALL.sign.x).toBeGreaterThanOrEqual(0);
    expect(HALL.sign.x + HALL.sign.w).toBeLessThanOrEqual(HALL.w);
    expect(HALL.sign.y + HALL.sign.h).toBeLessThan(HALL.leftDoor.top - 8);
    // The right doors are behind the jam
    expect(HALL.rightDoors.x0).toBeLessThan(HALL.bossX);
    expect(HALL.rightDoors.x1).toBeGreaterThan(HALL.bossX);
  });

  it('the only writing is the hall name, and it is our own made-up name', () => {
    expect(HALL_SIGN_TEXT).toBe('GO-SLOW HALL');
    for (const look of [{}, { lamps: hallLampTimes().map(() => 1), doors: 1, arrows: 1, time: 3 }]) {
      const r = recorder();
      drawHall(r.g, -186, 932, 420, look);
      expect(r.texts).toEqual([HALL_SIGN_TEXT]);
    }
    for (const word of ['temple', 'castle', 'shrine', 'church', 'mosque']) expect(HALL_SIGN_TEXT.toLowerCase()).not.toContain(word);
  });

  it('draws in every state with no broken numbers and leaves the context as found', () => {
    const looks = [
      {},
      { doors: 0.5, arrows: 0.4, lamps: [0.05, 0.2, -1], time: 1.2 },
      { doors: Number.NaN, arrows: Number.NaN, lamps: [Number.NaN, Number.POSITIVE_INFINITY], time: Number.NaN, still: true },
      { doors: 7, arrows: -3 },
    ];
    for (const look of looks) {
      for (const [camX, viewW, viewH] of [
        [0, 560, 420],
        [-186, 932, 420],
        [-40, 640, 480],
        [Number.NaN, Number.NaN, Number.NaN],
      ] as const) {
        const r = recorder();
        drawHall(r.g, camX, viewW, viewH, look);
        expect(r.bad, JSON.stringify(look)).toEqual([]);
        expect(r.depth()).toBe(0);
        const f = recorder();
        drawHallFront(f.g, camX, viewW, viewH);
        expect(f.bad).toEqual([]);
        expect(f.depth()).toBe(0);
        expect(f.texts).toEqual([]);
      }
    }
  });

  it('the front walls cover what drives out to the right, and fill a wide screen to its edges', () => {
    const b = boundsContext();
    drawHallFront(b.g, -186, 932, 420);
    expect(b.bad).toEqual([]);
    expect(b.box.left).toBeLessThanOrEqual(-186);
    expect(b.box.right).toBeGreaterThanOrEqual(-186 + 932);
    expect(b.box.bottom).toBeGreaterThanOrEqual(420);
  });

  it('hall colours carry no green, so the go lights are the only green in the room', () => {
    for (const [name, c] of Object.entries(HALL_COLOURS)) {
      const h = hsl(c);
      if (!h) continue;
      const green = h.h >= 75 && h.h <= 165 && h.s > 0.25 && h.l > 0.15 && h.l < 0.9;
      expect(green, `${name} ${c}`).toBe(false);
    }
  });
});

describe('the kind finish', () => {
  it('lamps click on one by one, 0.15 s apart, inside 3.0 to 4.2 s', () => {
    const at = hallLampTimes();
    expect(at).toHaveLength(8);
    expect(at[0]).toBeCloseTo(3.0, 9);
    for (let i = 1; i < at.length; i++) expect(at[i]! - at[i - 1]!).toBeCloseTo(0.15, 9);
    expect(at.at(-1)!).toBeLessThanOrEqual(4.2);
    expect(hallFinishAt(2.99).lamps.every((a) => a < 0)).toBe(true);
    expect(hallFinishAt(3.1).lamps.filter((a) => a >= 0)).toHaveLength(1);
    expect(hallFinishAt(4.2).lamps.every((a) => a >= 0)).toBe(true);
  });

  it('doors open as the cars leave (from 1.4 s); cones slide and arrows light from 3.0 to 4.2 s', () => {
    expect(hallFinishAt(1.3).doors).toBe(0);
    expect(hallFinishAt(1.6).doors).toBeGreaterThan(0.5);
    expect(hallFinishAt(1.7).doors).toBe(1);
    expect(HALL_FINISH.doorsOpen + HALL_FINISH.doorSwing).toBeLessThanOrEqual(1.7); // open before the first car (1.6 s) is through
    expect(hallFinishAt(3.0).cones).toBe(0);
    expect(hallFinishAt(3.6).cones).toBeGreaterThan(0);
    expect(hallFinishAt(4.2).cones).toBe(1);
    expect(hallFinishAt(3.0).arrows).toBe(0);
    expect(hallFinishAt(4.2).arrows).toBe(1);
    expect(hallFinishAt(9).cones).toBe(1);
  });

  it('reduced motion: doors and cones jump instead of swinging and sliding; lamps still come on in turn', () => {
    for (const t of [0, 1.39, 1.45, 2, 3.01, 3.5, 4.5]) {
      const f = hallFinishAt(t, true);
      expect([0, 1]).toContain(f.doors);
      expect([0, 1]).toContain(f.cones);
      expect(f.lamps).toEqual(hallFinishAt(t).lamps);
    }
    const n = hallFinishAt(Number.NaN);
    expect([n.doors, n.cones, n.arrows]).toEqual([0, 0, 0]);
  });

  it('the doors open to let a car out after a hit, then shut; on defeat they stay open', () => {
    expect(hallDoors('idle', 5)).toBe(0);
    expect(hallDoors('attack', 0.2)).toBe(0);
    expect(hallDoors('hit', 0)).toBe(0);
    expect(hallDoors('hit', 0.5)).toBe(1);
    expect(hallDoors('hit', 1.0)).toBe(1);
    expect(hallDoors('hit', 1.5)).toBe(0);
    expect(hallDoors('defeat', 1.0)).toBe(0);
    expect(hallDoors('defeat', 6)).toBe(1);
    expect(hallDoors('hit', 0.3, true)).toBe(1);
    expect(hallDoors('hit', Number.NaN)).toBe(0);
  });

  it('cones stand at the cone line (none left of x 400) and slide back and aside', () => {
    const line = hallConesAt(0);
    for (const c of line) {
      expect(c.x - 8).toBeGreaterThanOrEqual(HALL.heroMaxX);
      expect(c.y).toBe(HALL.floorY);
    }
    const aside = hallConesAt(1);
    aside.forEach((c, i) => {
      expect(c.x).toBe(HALL_CONES[i]!.toX);
      expect(c.y).toBeLessThan(HALL.floorY);
      expect(c.s).toBeLessThan(1);
    });
    // A gap opens in the middle of the line
    expect(aside[2]!.x - aside[1]!.x).toBeGreaterThan(line[2]!.x - line[1]!.x + 40);
    for (const k of [0, 0.5, 1, Number.NaN, -2]) {
      const r = recorder();
      drawHallCones(r.g, k);
      expect(r.bad).toEqual([]);
      expect(r.depth()).toBe(0);
    }
  });
});

describe('high honk "PEEP!"', () => {
  it('is about the size of its 36 x 20 hurt box, says PEEP!, and draws cleanly', () => {
    for (const t of [0, 1.7, Number.NaN]) {
      const b = boundsContext();
      drawHighHonk(b.g, 300, 170, t);
      expect(b.bad).toEqual([]);
      expect(b.depth()).toBe(0);
      expect(b.box.right - b.box.left).toBeLessThanOrEqual(HIGH_HONK_W + 16);
      expect(b.box.right - b.box.left).toBeGreaterThanOrEqual(36);
      expect(b.box.bottom - b.box.top).toBeLessThanOrEqual(HIGH_HONK_H + 6);
      expect(b.box.bottom - b.box.top).toBeGreaterThanOrEqual(20);
      // Stays on its own height band: a hero on the floor (head at 256) is never under it
      expect(b.box.bottom).toBeLessThan(256 - 60);
    }
    const r = recorder();
    drawHighHonk(r.g, 300, 170, 0);
    expect(r.texts).toEqual(['PEEP!']);
  });

  it('tells apart from the low "POOO!" honk by shape (long and flat) and word', () => {
    const hi = boundsContext();
    drawHighHonk(hi.g, 0, 0, 0);
    const lo = boundsContext();
    drawHonkCloud(lo.g, 0, 0, 0);
    const h = (b: typeof hi.box): number => b.bottom - b.top;
    const w = (b: typeof hi.box): number => b.right - b.left;
    expect(h(hi.box)).toBeLessThanOrEqual(h(lo.box) - 8); // flatter
    expect(w(hi.box) / h(hi.box)).toBeGreaterThan(2); // long and thin
    const a = recorder();
    drawHonkCloud(a.g, 0, 0, 0);
    expect(a.texts).toEqual(['POOO!']);
  });

  it('the boss shows a high throw coming: honk marks up round the light, not at the heap', () => {
    const marksTop = (aim: 'low' | 'high' | undefined): number => {
      const r = recorder();
      drawBoss(r.g, 0, 0, { mode: 'attack', t: 0.1, hits: 2, time: 0, aim });
      expect(r.bad).toEqual([]);
      expect(r.depth()).toBe(0);
      // honk marks are 4-point zigzags drawn with lineTo after a moveTo; find their y values
      const ys: number[] = [];
      r.calls.forEach((c, i) => {
        const next = r.calls[i + 1];
        if (c.name === 'moveTo' && next?.name === 'lineTo' && r.calls[i + 2]?.name === 'lineTo' && r.calls[i + 3]?.name === 'lineTo' && r.calls[i + 4]?.name === 'stroke') {
          ys.push(c.args[1] as number);
        }
      });
      return Math.min(...ys);
    };
    expect(marksTop('high')).toBeLessThan(-120);
    expect(marksTop('low')).toBeGreaterThan(-80);
    expect(marksTop(undefined)).toBe(marksTop('low'));
  });
});
