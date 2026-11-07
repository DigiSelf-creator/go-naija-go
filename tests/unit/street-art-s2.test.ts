/**
 * H5 art: phone buttons, the pavement strip, cones, the start fence, the bus park
 * and the end bus, and the new hero poses (walk, dust, skid).
 */
import { describe, expect, it } from 'vitest';
import { CONTROL_ASPECT, CONTROL_WORDS, controlParts, controlSvg, drawControl, type ControlKind } from '../../src/art/controls';
import { HAIRS, OUTFITS, SKINS, drawHero, type HeroPose } from '../../src/art/hero';
import { BUS_END, END_BUS_BACK, END_BUS_FRONT, busEndAt, drawBigPitCones, drawBusPark, drawEndBus, drawEndBusInside, drawPavement, drawStartFence } from '../../src/art/roadside';
import { recorder } from './recorder';

const KINDS: ControlKind[] = ['back', 'forward', 'jump', 'down', 'up'];

describe('phone buttons', () => {
  it('sizes follow S2.2: circles D x D, Jump 1.5 D, well pills 2.2 D', () => {
    expect(CONTROL_ASPECT).toEqual({ back: 1, forward: 1, jump: 1.5, down: 2.2, up: 2.2 });
    expect(CONTROL_WORDS).toEqual({ back: 'Back', forward: 'Forward', jump: 'Jump', down: 'Go down', up: 'Go up' });
  });

  it('every button makes SVG with no question or exclamation mark, hidden from screen readers', () => {
    for (const k of KINDS) {
      for (const pressed of [false, true]) {
        const svg = controlSvg(k, pressed);
        expect(svg.startsWith('<svg')).toBe(true);
        expect(svg).toContain('aria-hidden="true"');
        expect(svg).not.toMatch(/[?!]/);
        // Pressed shrinks to 94 percent (shape, not colour alone)
        expect(svg).toContain(pressed ? 'scale(0.94)' : 'scale(1)');
      }
    }
  });

  it('words are escaped and fit: long computer words get a smaller font', () => {
    const svg = controlSvg('down', false, 'Go down (<↓>)');
    expect(svg).toContain('&lt;↓&gt;');
    const size = (label?: string): number => {
      const t = controlParts('down', label).find((p) => p.t === 'text');
      return t && t.t === 'text' ? t.size : 0;
    };
    expect(size('Go down (↓)')).toBeLessThan(size());
    expect(size('a very very long label indeed')).toBeGreaterThanOrEqual(12);
  });

  it('draws on a canvas with no broken numbers and leaves the context as it found it', () => {
    for (const k of KINDS) {
      const r = recorder();
      drawControl(r.g, k, 50, 50, 80, k === 'jump');
      expect(r.bad).toEqual([]);
      expect(r.depth()).toBe(0);
    }
  });
});

describe('street start and end', () => {
  it('pavement draws only under solid road and keeps clear of pits', () => {
    const r = recorder();
    drawPavement(r.g, 0, 800, [
      [0, 300],
      [470, 900],
    ]);
    expect(r.bad).toEqual([]);
    const rects = r.calls.filter((c) => c.name === 'fillRect').map((c) => c.args as number[]);
    for (const [x, , w] of rects) {
      const inPit = x! + w! > 300 + 0.01 && x! < 470 - 0.01;
      expect(inPit, `rect at ${x} width ${w}`).toBe(false);
    }
  });

  it('cones, fence, bus park and bus draw cleanly', () => {
    const r = recorder();
    drawBigPitCones(r.g, 600, 770);
    drawStartFence(r.g, 40);
    drawBusPark(r.g, 1500, 1720);
    for (const t of [0, 0.1, 0.5, 0.9, 1.5, 2.2, 3]) {
      const f = busEndAt(t);
      drawEndBusInside(r.g, 1500, f);
      drawEndBus(r.g, 1500, f);
    }
    expect(r.bad).toEqual([]);
    expect(r.depth()).toBe(0);
    // Everyday words only
    expect(new Set(r.texts)).toEqual(new Set(['BUS PARK']));
  });

  it('the bus sits from end.x - 40 to end.x + 160 (S2.6)', () => {
    expect([END_BUS_BACK, END_BUS_FRONT]).toEqual([-40, 160]);
  });

  it('bus end timeline: door opens, the hero hops in for 0.6 s, the bus pulls away by 2.2 s', () => {
    expect(busEndAt(0)).toMatchObject({ door: 0, hop: 0, heroShown: true, dx: 0, running: false });
    expect(busEndAt(BUS_END.doorOpen).door).toBe(1);
    expect(BUS_END.hopEnd - BUS_END.doorOpen).toBeCloseTo(0.6, 6);
    expect(busEndAt(0.5).hop).toBeCloseTo(0.5, 6);
    expect(busEndAt(BUS_END.hopEnd)).toMatchObject({ hop: 1, heroShown: false, running: true });
    expect(busEndAt(BUS_END.doorShut).door).toBe(0);
    expect(busEndAt(BUS_END.pullAway).dx).toBeGreaterThan(560); // off the narrowest screen
    // Moves only forward, speeding up
    let last = 0;
    for (let t = 0; t <= 2.2; t += 0.1) {
      const dx = busEndAt(t).dx ?? 0;
      expect(dx).toBeGreaterThanOrEqual(last);
      last = dx;
    }
    expect(busEndAt(Number.NaN).dx).toBe(0);
  });
});

describe('new hero poses', () => {
  const poses: HeroPose[] = [
    ...[0, 0.25, 0.5, 0.75].map((phase): HeroPose => ({ phase, inAir: false, facing: 1, glow: false, gait: 'walk' })),
    { phase: 0.3, inAir: false, facing: -1, glow: false, gait: 'walk' },
    { phase: 0.3, inAir: false, facing: 1, glow: false, dust: 0 },
    { phase: 0.3, inAir: false, facing: 1, glow: false, dust: 0.5 },
    { phase: 0.3, inAir: false, facing: 1, glow: false, dust: 1 },
    { phase: 0.3, inAir: false, facing: 1, glow: false, skid: 1, time: 0.4 },
    { phase: 0.3, inAir: false, facing: -1, glow: false, gait: 'walk', skid: 0.5 },
    { phase: 0.3, inAir: false, facing: 1, glow: false, skid: Number.NaN, dust: Number.NaN },
  ];

  it('every skin, hair and outfit draws every new pose with no broken numbers', () => {
    for (let skin = 0; skin < SKINS.length; skin++) {
      for (let hair = 0; hair < HAIRS.length; hair++) {
        for (let outfit = 0; outfit < OUTFITS.length; outfit++) {
          for (const pose of poses) {
            const r = recorder();
            drawHero(r.g, { skin, hair, outfit }, pose);
            expect(r.bad, `${skin}/${hair}/${outfit} ${JSON.stringify(pose)}`).toEqual([]);
            expect(r.depth()).toBe(0);
          }
        }
      }
    }
  });

  it('the dust puff shows while running starts and is gone at 1', () => {
    const arcs = (dust: number): number => {
      const r = recorder();
      drawHero(r.g, { skin: 0, hair: 0, outfit: 0 }, { phase: 0, inAir: false, facing: 1, glow: false, dust });
      return r.calls.filter((c) => c.name === 'arc').length;
    };
    expect(arcs(0.2)).toBeGreaterThan(arcs(1));
  });
});
