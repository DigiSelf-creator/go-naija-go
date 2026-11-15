/**
 * qa S3f0 part 7, 10 and 24 checks 1 and 6, played by a simple human-like bot (qa-lane-bot.ts):
 * a sloppy first-timer still reaches the bus stop within 3 tries; a careful player is never forced
 * to stumble, in the fixed 600 m or the endless part; every endless run ends sooner or later.
 * Seeded, so the same every time.
 */
import { describe, expect, it } from 'vitest';
import laneData from '../../src/data/levels/lagos-lane.json';
import { parseLane } from '../../src/lane/level';
import { firstTimer, playOnce } from './qa-lane-bot';

const L = parseLane(laneData);
const SLOPPY = { mistake: 0.4, react: 0.6, reactSd: 0.15, timingSd: 0.1, greed: 0.8 };
const CAREFUL = { mistake: 0, react: 0.3, reactSd: 0, timingSd: 0, greed: 0 };

describe('qa: the lane run played by a human-like bot', () => {
  it('a sloppy first-timer (40 percent mistakes, 0.6 s reactions) reaches the bus stop within 3 tries in 95 percent of 200 tries or more', () => {
    let ok = 0;
    for (let i = 1; i <= 200; i++) if (firstTimer(L, SLOPPY, i).reachedOn !== null) ok++;
    expect(ok / 200).toBeGreaterThanOrEqual(0.95);
  }, 120_000);

  it('a careful player is never forced to stumble, before or after the goal, and the endless part always ends', () => {
    for (const gentle of [false, true]) {
      for (let i = 1; i <= 40; i++) {
        const r = playOnce(L, CAREFUL, i, gentle, 6000);
        expect(r.stumbles, `seed ${i}${gentle ? ' gentle' : ''}`).toBe(0);
        expect(r.dist).toBeLessThan(6000);
        expect(r.dist).toBeGreaterThan(600);
      }
    }
  }, 120_000);

  it('a clean run reaches the bus stop in 54 to 57 s (Gentle 59 to 62 s)', () => {
    const n = playOnce(L, CAREFUL, 1);
    expect(n.won).toBe(true);
    expect(n.time).toBeGreaterThanOrEqual(54);
    expect(n.time).toBeLessThanOrEqual(57);
    const g = playOnce(L, CAREFUL, 1, true);
    expect(g.won).toBe(true);
    expect(g.time).toBeGreaterThanOrEqual(59);
    expect(g.time).toBeLessThanOrEqual(62);
  });
});
