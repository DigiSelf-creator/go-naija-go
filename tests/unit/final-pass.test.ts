/**
 * qa final pass fixes: a used go light goes dark, the hall view stays behind game over,
 * food effects end on any game over, and the view always shows at least 480 u across.
 */
import { describe, expect, it } from 'vitest';
import hallData from '../../src/data/levels/lagos-hall.json';
import { drawGoLight, type GoLightState } from '../../src/art/boss';
import * as P from '../../src/art/palette';
import { MIN_WORLD_W, WORLD_H, fitView } from '../../src/engine/view';
import { Game } from '../../src/game/game';
import { parseLevel } from '../../src/game/level';
import { RULES, Run, type RunEvent } from '../../src/game/run';
import { autoLevel } from './auto-level';

const DT = 1 / 60;

/** Records every fill and stroke colour in use when a shape is drawn. */
function colours(state: GoLightState): { fills: string[]; strokes: string[] } {
  const fills: string[] = [];
  const strokes: string[] = [];
  const props: Record<string, unknown> = { fillStyle: '', strokeStyle: '' };
  const g = new Proxy(props, {
    get(t, k) {
      if (typeof k !== 'string') return undefined;
      if (k in t) return t[k];
      return () => {
        if (k === 'fill') fills.push(String(t['fillStyle']));
        if (k === 'stroke') strokes.push(String(t['strokeStyle']));
      };
    },
    set(t, k, v) {
      if (typeof k === 'string') t[k] = v;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  drawGoLight(g, 0, 200, 90, state, 1.3, 300);
  return { fills, strokes };
}

describe('go light after a hit', () => {
  it('goes dark: lamps off like an unlit light, no green, a small grey tick', () => {
    const done = colours('done');
    const off = colours('off');
    expect(done.fills).toEqual(off.fills);
    expect(done.fills).not.toContain(P.GREEN_GO);
    expect(done.fills).toContain(P.LIGHT_OFF);
    expect(done.strokes).toContain(P.TICK_GREY);
    expect([...done.fills, ...done.strokes]).not.toContain(P.GREEN_GO);
    // Only the lit light shows green.
    expect(colours('lit').fills).toContain(P.GREEN_GO);
  });
});

const hallLevel = () => parseLevel(structuredClone(hallData));

/** Hurt the hero as a honk cloud does (the private rule, called directly). */
function hit(run: Run): RunEvent[] {
  const ev: RunEvent[] = [];
  run.safe = 0;
  (run as unknown as { hurt(ev: RunEvent[]): void }).hurt(ev);
  return ev;
}

describe('game over', () => {
  it('a hit on the last life ends food effects (corn and amala)', () => {
    const run = new Run(hallLevel());
    run.power = { corn: RULES.cornSteps, amala: RULES.amalaSteps, shield: false };
    run.lives = 1;
    const ev = hit(run);
    expect(ev.map((e) => e.type)).toContain('gameOver');
    expect(run.phase).toBe('over');
    expect(run.power).toEqual({ corn: 0, amala: 0, shield: false });
  });

  it('keeps the hall view behind the game over screen: the whole hall, centred', () => {
    const game = new Game(hallLevel());
    game.begin(false);
    const view = fitView(851, 393, 1);
    for (let i = 0; i < 60; i++) game.run.step(DT);
    const centred = (560 - view.width) / 2;
    expect(game.cameraX(view)).toBeCloseTo(centred, 6);
    game.run.lives = 1;
    hit(game.run);
    expect(game.run.phase).toBe('over');
    for (let i = 0; i < 60; i++) expect(game.cameraX(view)).toBeCloseTo(centred, 6);
  });

  it('a screen narrower than the hall (an upright tablet, 480 u) follows the hero, kept inside the hall', () => {
    const game = new Game(hallLevel());
    game.begin(false);
    const view = fitView(768, 1024, 1);
    expect(view.width).toBeLessThan(560);
    expect(game.cameraX(view)).toBe(0);
    game.run.hero.x = 400;
    expect(game.cameraX(view)).toBeCloseTo(560 - view.width, 6);
  });

  it('on a street, the camera still follows the hero after game over', () => {
    const game = new Game(autoLevel());
    game.begin(false);
    for (let i = 0; i < 60; i++) game.run.step(DT);
    game.run.lives = 1;
    hit(game.run);
    expect(game.run.phase).toBe('over');
    const view = fitView(851, 393, 1);
    expect(game.cameraX(view)).toBeLessThan(game.hero.x);
    expect(game.cameraX(view)).toBeGreaterThan(game.hero.x - view.width);
  });
});

describe('view safety net', () => {
  it('shows at least 480 u across on an upright tablet', () => {
    const v = fitView(768, 1024, 2);
    expect(v.width).toBeCloseTo(MIN_WORLD_W, 5);
    expect(v.height).toBeGreaterThanOrEqual(WORLD_H);
    expect(v.pixelW).toBe(1536);
  });
  it('a sideways phone is unchanged: 420 u tall (S2.1)', () => {
    const v = fitView(851, 393, 2);
    expect(v.height).toBe(WORLD_H);
    expect(v.width).toBeGreaterThan(MIN_WORLD_W);
  });
});
