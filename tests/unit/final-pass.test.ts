/**
 * qa final pass fixes: a used go light goes dark, the arena view stays behind game over,
 * food effects end on any game over, and the view always shows at least 480 u across.
 */
import { describe, expect, it } from 'vitest';
import w1l1 from '../../src/data/levels/w1-l1.json';
import { drawGoLight, type GoLightState } from '../../src/art/boss';
import * as P from '../../src/art/palette';
import { MIN_WORLD_W, WORLD_H, fitView } from '../../src/engine/view';
import { Game } from '../../src/game/game';
import { parseLevel } from '../../src/game/level';
import { RULES, Run, type RunEvent } from '../../src/game/run';

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

function arenaLevel() {
  return parseLevel({ ...structuredClone(w1l1), spawnX: 10980, hazards: [], foods: [], kobo: [], hints: [] });
}

/** Hurt the hero as a honk cloud does (the private rule, called directly). */
function hit(run: Run): RunEvent[] {
  const ev: RunEvent[] = [];
  run.safe = 0;
  (run as unknown as { hurt(ev: RunEvent[]): void }).hurt(ev);
  return ev;
}

describe('game over', () => {
  it('a hit on the last life ends food effects (corn and amala)', () => {
    const run = new Run(arenaLevel());
    run.power = { corn: RULES.cornSteps, amala: RULES.amalaSteps, shield: false };
    run.lives = 1;
    const ev = hit(run);
    expect(ev.map((e) => e.type)).toContain('gameOver');
    expect(run.phase).toBe('over');
    expect(run.power).toEqual({ corn: 0, amala: 0, shield: false });
  });

  it('keeps the arena view behind the game over screen', () => {
    const game = new Game(arenaLevel());
    game.begin(false);
    const view = fitView(851, 393, 1);
    while (game.run.phase === 'run') game.run.step(DT);
    expect(game.run.phase).toBe('arena');
    for (let i = 0; i < 120; i++) game.cameraX(view);
    expect(game.cameraX(view)).toBe(game.level.arena.x);
    game.run.lives = 1;
    hit(game.run);
    expect(game.run.phase).toBe('over');
    for (let i = 0; i < 60; i++) expect(game.cameraX(view)).toBe(game.level.arena.x);
  });

  it('on the street, the camera still follows the hero after game over', () => {
    const game = new Game(parseLevel(structuredClone(w1l1)));
    game.begin(false);
    for (let i = 0; i < 60; i++) game.run.step(DT);
    game.run.lives = 1;
    hit(game.run);
    expect(game.run.phase).toBe('over');
    const view = fitView(851, 393, 1);
    expect(game.cameraX(view)).toBeLessThan(game.hero.x);
    expect(game.cameraX(view)).toBeLessThan(game.level.arena.x - 1000);
  });
});

describe('view safety net', () => {
  it('shows at least 480 u across on an upright tablet', () => {
    const v = fitView(768, 1024, 2);
    expect(v.width).toBeCloseTo(MIN_WORLD_W, 5);
    expect(v.height).toBeGreaterThanOrEqual(WORLD_H);
    expect(v.pixelW).toBe(1536);
  });
  it('a sideways phone is unchanged: 360 u tall', () => {
    const v = fitView(851, 393, 2);
    expect(v.height).toBe(WORLD_H);
    expect(v.width).toBeGreaterThan(MIN_WORLD_W);
  });
});
