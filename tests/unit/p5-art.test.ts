/**
 * P6 and P7 art (docs/design.md S2.14 part 3, S2.15): the hall light's last-second blink and
 * its reduced-motion look, the pepper fufu bowl, balls, plug, HUD icon, the throw pose for
 * every body, the goat eating, a tyre and drum knocked off the road, and the Throw button.
 */
import { describe, expect, it } from 'vitest';
import { GO_LIGHT_END, drawGoLight, goLightBlinkOn, goLightTickTimes } from '../../src/art/boss';
import { CONTROL_LOOK, controlParts, controlSvg, drawControl, throwLabel } from '../../src/art/controls';
import { FUFU, drawDrumKnocked, drawFufuBall, drawFufuIcon, drawFufuPlug, drawFufuSettle, drawFufuSteamPuff, drawTyreKnocked } from '../../src/art/fufu';
import { GOAT_EAT_TIME, drawGoat, drawGoatEating, drawMeehBubble, goatEatFrame } from '../../src/art/hazards';
import { AGES, BODIES, HAIRS, HERO_ART_BOX, OUTFITS, SKINS, THROW_TIME, drawHero, throwFrame, type HeroPose } from '../../src/art/hero';
import { drawFood, drawFoodIcon } from '../../src/art/items';
import { boundsContext } from './bounds-context';
import { hsl, recorder } from './recorder';

const GREEN = '#22c55e';

describe('hall light: the last second (S2.14 part 3)', () => {
  it('blinks 2 times a second in the last 1.0 s, and never with reduced motion', () => {
    expect(GO_LIGHT_END).toEqual({ warn: 1, perSecond: 2 });
    expect(goLightBlinkOn(3)).toBe(true);
    expect(goLightBlinkOn(1.2)).toBe(true);
    // Dark, lit, dark, lit: each a quarter second
    expect([0.95, 0.7, 0.45, 0.2].map((l) => goLightBlinkOn(l))).toEqual([false, true, false, true]);
    for (const l of [0.95, 0.7, 0.45, 0.2]) expect(goLightBlinkOn(l, true)).toBe(true);
    expect(goLightBlinkOn(Number.NaN)).toBe(true);
    // Never faster than 2 a second: count the changes over the last second
    let flips = 0;
    let last = goLightBlinkOn(1);
    for (let l = 1; l > 0; l -= 0.01) {
      const on = goLightBlinkOn(l);
      if (on !== last) flips++;
      last = on;
    }
    expect(flips).toBeLessThanOrEqual(4);
    expect(goLightTickTimes()).toEqual([1, 0.5]);
  });

  const lampFills = (left: number | undefined, still = false): string[] => {
    const r = recorder();
    drawGoLight(r.g, 0, 200, 90, 'lit', 1.3, 300, left === undefined ? undefined : { left, still });
    expect(r.bad).toEqual([]);
    return r.colours;
  };

  it('draws: green with the arrow and GO; blink dark in the off quarter; still look keeps GO, hides the arrow', () => {
    const greens = (left: number | undefined, still = false): number => lampFills(left, still).filter((c) => c === GREEN).length;
    expect(greens(undefined)).toBe(4); // three lamps and the arrow
    expect(greens(0.95)).toBe(1); // lamps dark, the arrow still shows...
    expect(greens(0.7)).toBe(4);
    expect(greens(0.95, true)).toBe(4); // reduced motion: lamps stay lit, a GO tag in place of the arrow
    // ...held still in the last second
    const arrowYs = (time: number, left: number): number[] => {
      const r = recorder();
      drawGoLight(r.g, 0, 200, 90, 'lit', time, 300, { left });
      return r.calls.filter((c) => c.name === 'moveTo').map((c) => c.args[1] as number);
    };
    expect(arrowYs(0.1, 0.7)).toEqual(arrowYs(0.4, 0.7));
    const r = recorder();
    drawGoLight(r.g, 0, 200, 90, 'lit', 1, 300, { left: 0.95, still: true });
    expect(r.texts).toEqual(['GO']);
    expect(r.calls.filter((c) => c.name === 'lineTo').length).toBe(0); // no arrow shape
    expect(r.colours).toContain('#22c55e');
  });
});

describe('pepper fufu art (S2.15)', () => {
  it('sizes: a ball 12 u across, the bowl 20 x 16, settle 0.3 s, knock 0.4 s', () => {
    expect(FUFU.ballR * 2).toBe(12);
    expect([FUFU.bowlW, FUFU.bowlH]).toEqual([20, 16]);
    expect(FUFU.settleTime).toBe(0.3);
    expect(FUFU.knockTime).toBe(0.4);
  });

  it('every piece draws cleanly and leaves the context as it found it', () => {
    const draws: ((g: CanvasRenderingContext2D) => void)[] = [
      (g) => drawFood(g, 'fufu', 100, 272, 1.2),
      (g) => drawFoodIcon(g, 'fufu', 16, 16, 0.85),
      (g) => drawFufuIcon(g, 16, 16, 26),
      (g) => drawFufuPlug(g, 9150, 9250, 300, 360),
      (g) => drawFufuPlug(g, 10, 10, 300, 360),
    ];
    for (const sq of [0, 0.5, 1, Number.NaN]) for (const spin of [0, 2, Number.NaN]) draws.push((g) => drawFufuBall(g, 50, 260, { squash: sq, spin, time: 1.1 }));
    draws.push((g) => drawFufuBall(g, 50, 260, { still: true, steam: false, pepper: false }));
    for (const k of [0, 0.3, 0.69, 0.71, 0.99, 1, 2, Number.NaN]) {
      draws.push((g) => drawFufuSettle(g, 50, 300, k));
      draws.push((g) => drawFufuSteamPuff(g, 50, 300, k));
      draws.push((g) => drawTyreKnocked(g, 50, 300, k, 1));
      draws.push((g) => drawDrumKnocked(g, 50, 300, k, 1));
    }
    for (const d of draws) {
      const r = recorder();
      expect(() => d(r.g)).not.toThrow();
      expect(r.bad).toEqual([]);
      expect(r.depth()).toBe(0);
      expect(r.g.globalAlpha).toBe(1);
      expect(r.texts).toEqual([]);
    }
  });

  it('soft white and cream, never flame colours: no orange, yellow or red over a small dot', () => {
    // Every colour used by the ball and its steam is near white or ink, except the small pepper dot.
    const r = recorder();
    drawFufuBall(r.g, 0, 0, { squash: 0.4, time: 1 });
    drawFufuSettle(r.g, 0, 0, 0.5);
    drawFufuIcon(r.g, 0, 0, 26);
    for (const c of r.colours) {
      if (c === FUFU.pepper) continue;
      const h = hsl(c);
      if (!h) continue;
      expect(h.l < 0.2 || h.l > 0.65, `${c} is not white, cream, grey or ink`).toBe(true);
      expect(h.l > 0.65 && h.s > 0.5 && h.l < 0.9, `${c} looks like a glow`).toBe(false);
    }
    // The pepper dot is tiny: radius under 1.5 u of a 6 u ball
    const dots = r.calls.filter((c) => c.name === 'arc' && (c.args[2] as number) < 2);
    expect(dots.length).toBeGreaterThan(0);
  });

  it('the bowl and HUD icon stay inside their boxes', () => {
    const b = boundsContext();
    drawFoodIcon(b.g, 'fufu', 0, 0, 1);
    // Bowl and balls 20 x 16 (the egusi dish and steam add a little round it)
    expect(b.box.left).toBeGreaterThanOrEqual(-11.5);
    expect(b.box.right).toBeLessThanOrEqual(15);
    expect(b.box.bottom).toBeLessThanOrEqual(11.5);
    expect(b.box.top).toBeGreaterThanOrEqual(-18);
    const i = boundsContext();
    drawFufuIcon(i.g, 16, 16, 26);
    expect(i.box.left).toBeGreaterThanOrEqual(3);
    expect(i.box.right).toBeLessThanOrEqual(29);
    expect(i.box.top).toBeGreaterThanOrEqual(3);
    expect(i.box.bottom).toBeLessThanOrEqual(29);
  });

  it('the plug sits level with the road: at most a little dome above groundY', () => {
    const b = boundsContext();
    drawFufuPlug(b.g, 9150, 9250, 300, 360);
    expect(b.box.top).toBeGreaterThanOrEqual(300 - 4.01);
    expect(b.box.left).toBeGreaterThanOrEqual(9147);
    expect(b.box.right).toBeLessThanOrEqual(9253);
  });
});

describe('throw pose (S2.15): every body, age, skin, hair and outfit, on the ground and in the air', () => {
  it('lasts 0.15 s in two frames', () => {
    expect(THROW_TIME).toBe(0.15);
    expect([0, 0.3, 0.6, 0.99].map(throwFrame)).toEqual([0, 0, 1, 1]);
    expect(throwFrame(Number.NaN)).toBe(0);
  });

  const poses = (p: number): HeroPose[] => [
    { phase: 0.3, inAir: false, facing: 1, glow: false, throwing: p },
    { phase: 0.3, inAir: false, facing: -1, glow: false, gait: 'walk', throwing: p },
    { phase: 0, inAir: false, facing: 1, glow: false, standing: true, time: 1, throwing: p },
    { phase: 0, inAir: true, facing: 1, glow: false, vy: -200, throwing: p },
    { phase: 0, inAir: true, facing: -1, glow: true, fast: true, vy: 300, throwing: p },
  ];

  it('draws both frames for every look without throwing, inside the hero art box', () => {
    for (let body = 0; body < BODIES.length; body++)
      for (let age = 0; age < AGES.length; age++)
        for (let skin = 0; skin < SKINS.length; skin++)
          for (let hair = 0; hair < HAIRS.length; hair++)
            for (let outfit = 0; outfit < OUTFITS.length; outfit++)
              for (const p of [0.2, 0.7])
                for (const pose of poses(p)) {
                  const r = recorder();
                  expect(() => drawHero(r.g, { skin, hair, outfit, body, age }, pose)).not.toThrow();
                  expect(r.bad).toEqual([]);
                  expect(r.depth()).toBe(0);
                  if (pose.glow || pose.fast) continue; // effects round the hero are not counted
                  const b = boundsContext();
                  drawHero(b.g, { skin, hair, outfit, body, age }, pose);
                  const left = pose.facing === 1 ? HERO_ART_BOX.left : -HERO_ART_BOX.right;
                  const right = pose.facing === 1 ? HERO_ART_BOX.right : -HERO_ART_BOX.left;
                  const at = `body ${body} age ${age} hair ${hair} outfit ${outfit} p ${p} ${JSON.stringify(b.box)}`;
                  expect(b.box.left, at).toBeGreaterThanOrEqual(left - 0.01);
                  expect(b.box.right, at).toBeLessThanOrEqual(right + 0.01);
                  expect(b.box.top, at).toBeGreaterThanOrEqual(HERO_ART_BOX.top - 0.01);
                }
    // 750 looks x 2 frames x 6 poses through stand-in contexts: the lit hero (decision 60) has more parts.
  }, 30_000);

  it('frame 0 holds a ball (one more circle); frame 1 and no throw draw the same as before', () => {
    const look = { skin: 3, hair: 2, outfit: 1, body: 1, age: 1 };
    const arcs = (pose: HeroPose): number => {
      const r = recorder();
      drawHero(r.g, look, pose);
      return r.calls.filter((c) => c.name === 'arc').length;
    };
    const base: HeroPose = { phase: 0.2, inAir: false, facing: 1, glow: false };
    expect(arcs({ ...base, throwing: 0.2 })).toBe(arcs(base) + 1);
    expect(arcs({ ...base, throwing: 0.7 })).toBe(arcs(base));
    expect(arcs({ ...base, throwing: 1 })).toBe(arcs(base));
    expect(arcs({ ...base, throwing: Number.NaN })).toBe(arcs(base));
  });
});

describe('the goat eats a ball (S2.15)', () => {
  it('chews for 0.6 s in two frames, three chews', () => {
    expect(GOAT_EAT_TIME).toBe(0.6);
    const frames = [0.05, 0.2, 0.4, 0.55, 0.7, 0.9].map(goatEatFrame);
    expect(frames).toEqual([0, 1, 0, 1, 0, 1]);
  });

  it('draws every frame, both ways; the MEEH bubble shows only at the end of the eating', () => {
    for (const facing of [1, -1] as const) {
      for (const k of [0, 0.1, 0.3, 0.5, 0.79, 0.8, 1, Number.NaN]) {
        const r = recorder();
        expect(() => drawGoatEating(r.g, 200, 300, k, facing)).not.toThrow();
        expect(r.bad).toEqual([]);
        expect(r.depth()).toBe(0);
        expect(r.texts).toEqual(k >= 0.8 ? ['MEEH!'] : []);
      }
    }
    const r = recorder();
    drawMeehBubble(r.g, 0, 0);
    expect(r.texts).toEqual(['MEEH!']);
    // The run away keeps its bubble, walking has none
    const run = recorder();
    drawGoat(run.g, 0, 300, 1, 'runAway');
    expect(run.texts).toEqual(['MEEH!']);
    const walk = recorder();
    drawGoat(walk.g, 0, 300, 1, 'walk');
    expect(walk.texts).toEqual([]);
  });
});

describe('Throw button (S2.15)', () => {
  it('a circle with a ball, steam curls, an arrow and the word; spoken label with the count', () => {
    const parts = controlParts('throw');
    expect(parts[0]).toMatchObject({ t: 'circle', r: 46 });
    expect(parts.filter((p) => p.t === 'dot').length).toBe(1);
    expect(parts.filter((p) => p.t === 'arc').length).toBe(2);
    expect(parts.find((p) => p.t === 'text')).toMatchObject({ text: 'Throw' });
    expect(throwLabel(8)).toBe('Throw fufu, 8 left');
    expect(throwLabel(-2)).toBe('Throw fufu, 0 left');
    expect(throwLabel(Number.NaN)).toBe('Throw fufu, 0 left');
  });

  it('SVG and canvas, plain and pressed: icon white then dark, 94 percent when pressed', () => {
    const up = controlSvg('throw', false);
    const down = controlSvg('throw', true);
    expect(up).toContain(`fill="${CONTROL_LOOK.icon}"`);
    expect(down).toContain(`fill="${CONTROL_LOOK.iconPressed}"`);
    expect(down).toContain('scale(0.94)');
    expect(up).toContain('<circle cx="44"');
    for (const pressed of [false, true]) {
      const r = recorder();
      drawControl(r.g, 'throw', 40, 40, 64, pressed);
      expect(r.bad).toEqual([]);
      expect(r.depth()).toBe(0);
      expect(r.texts).toContain('Throw');
    }
  });
});
