/**
 * P14 (docs/design.md S2.16 B2, B3): the game hooks up art's strong look and tech suit: the
 * step events (amala's heavy steps), the amala time left (the blink), the pick-up flex and the
 * shake out; the suit's put-on and break; and the dash and rest looks (B4).
 */
import { describe, expect, it } from 'vitest';
import lagos3 from '../../src/data/levels/lagos-3.json';
import lagosHall from '../../src/data/levels/lagos-hall.json';
import { STRONG, SUIT } from '../../src/art/hero';
import { DASH_STEPS_EVERY, Game, type GameEvent } from '../../src/game/game';
import { parseLevel, type Level } from '../../src/game/level';
import { STEPS_PER_SECOND } from '../../src/game/run';

const DT = 1 / 60;
const L3 = parseLevel(structuredClone(lagos3));
const HALL = parseLevel(structuredClone(lagosHall));
const OPEN: Level = {
  ...L3,
  ground: [[-400, 30000]],
  terrain: { ...L3.terrain, ground: [{ x0: -400, x1: 30000 }] },
  hazards: [],
  gutters: [],
  crates: [],
  foods: [{ x: 700, y: 272, kind: 'amala' }, { x: 2600, y: 272, kind: 'garri' }],
  coins: [],
  hints: [],
  end: { x: 29000, wall: 29200 },
};

function play(level: Level = OPEN, opts: Parameters<Game['begin']>[2] = {}): { game: Game; ev: GameEvent[] } {
  const game = new Game(level);
  game.begin(false, level, opts);
  const ev: GameEvent[] = [];
  game.onEvent = (e) => ev.push(e);
  return { game, ev };
}
const tick = (game: Game, n: number): void => {
  for (let i = 0; i < n; i++) game.update(DT);
};

describe('S2.16 B2 amala: the strong look', () => {
  it('pick up: the 0.3 s arm flex, the time left in the pose; heavy steps at most one every 0.18 s', () => {
    const { game, ev } = play();
    game.steer(1);
    for (let i = 0; i < 600 && game.run.power.amala === 0; i++) tick(game, 1);
    const p = game.powerPose();
    expect(p.strong?.flex).toBeGreaterThanOrEqual(0);
    expect(p.strong?.flex).toBeLessThan(1);
    expect(p.strong?.left).toBeCloseTo(12, 1);
    tick(game, Math.round(STRONG.flexTime * 60) + 1);
    expect(game.powerPose().strong).toEqual({ left: game.run.power.amala / STEPS_PER_SECOND });
    ev.length = 0;
    tick(game, 120);
    const thumps = ev.filter((e) => e.type === 'strongStep');
    expect(thumps.length).toBeGreaterThan(4);
    expect(thumps.length).toBeLessThanOrEqual(Math.floor(2 / STRONG.stepGap) + 1);
  });

  it('runs out by itself: the 0.3 s shake out, then nothing; a lost life ends it at once with no shake out', () => {
    const { game } = play();
    game.steer(1);
    for (let i = 0; i < 600 && game.run.power.amala === 0; i++) tick(game, 1);
    game.run.power.amala = 2;
    tick(game, 2);
    expect(game.powerPose().strong).toBeUndefined();
    expect(game.powerPose().shakeOut).toBeGreaterThanOrEqual(0);
    tick(game, Math.round(STRONG.shakeTime * 60) + 1);
    expect(game.powerPose().shakeOut).toBeUndefined();
    // A fall: gone at once.
    const b = play();
    b.game.run.power.amala = 300;
    Object.assign(b.game.run.hero, { y: 500, grounded: false });
    tick(b.game, 2);
    expect(b.game.powerPose().strong).toBeUndefined();
    expect(b.game.powerPose().shakeOut).toBeUndefined();
  });

  it('no strong steps without amala; reduced motion is passed to art', () => {
    const { game, ev } = play();
    game.still = true;
    Object.assign(game.run.hero, { x: 5000 });
    game.steer(1);
    tick(game, 120);
    expect(ev.some((e) => e.type === 'strongStep')).toBe(false);
    expect(game.powerPose().still).toBe(true);
  });
});

describe('S2.16 B3 the garri tech suit', () => {
  it('puts on from the feet up over 0.4 s, then worn; the old bubble is gone', () => {
    const { game } = play();
    Object.assign(game.run.hero, { x: 2500 });
    game.steer(1);
    for (let i = 0; i < 600 && !game.run.power.shield; i++) tick(game, 1);
    const on = game.powerPose().suit?.on;
    expect(on).toBeGreaterThanOrEqual(0);
    expect(on).toBeLessThan(1);
    tick(game, Math.round(SUIT.putOnTime * 60) + 1);
    expect(game.powerPose().suit).toEqual({});
  });

  it('a hit: 0.1 s of crack lines, then the plates burst (no life lost); then no suit', () => {
    const { game, ev } = play();
    game.run.power.shield = true;
    tick(game, 30);
    (game.run as unknown as { hurt(e: unknown[]): void }).hurt((game.run as unknown as { pending: unknown[] }).pending);
    tick(game, 1);
    expect(ev.some((e) => e.type === 'shieldPop')).toBe(true);
    expect(game.run.lives).toBe(3);
    expect(game.powerPose().suit).toEqual({ crack: true });
    tick(game, Math.round(SUIT.crackTime * 60) + 1);
    expect(game.powerPose().suit).toBeUndefined();
  });

  it('the hall parcel: the same suit, put on at the start', () => {
    const { game } = play(HALL, { parcel: true });
    expect(game.run.power.shield).toBe(true);
    expect(game.powerPose().suit?.on).toBe(0);
  });
});

describe('S2.16 B4 the dash look and sounds', () => {
  it('dash pose while dashing, fast footsteps every 0.3 s on the ground, then resting with breath puffs', () => {
    const { game, ev } = play(OPEN, { dash: true });
    Object.assign(game.run.hero, { x: 5000 });
    game.steer(1);
    tick(game, 2);
    expect(game.run.dash(1)).toBe(true);
    tick(game, 1);
    expect(game.powerPose().dash).toBe(true);
    tick(game, 60);
    const n = ev.filter((e) => e.type === 'dashSteps').length;
    expect(n).toBeGreaterThanOrEqual(Math.floor(1 / DASH_STEPS_EVERY));
    expect(n).toBeLessThanOrEqual(Math.ceil(1 / DASH_STEPS_EVERY) + 1);
    tick(game, 100);
    expect(game.powerPose().dash).toBeUndefined();
    expect(game.powerPose().resting).toBe(true);
    tick(game, 125);
    expect(game.powerPose().resting).toBeUndefined();
    expect(ev.some((e) => e.type === 'dashReady')).toBe(true);
  });
});
