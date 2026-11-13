/**
 * gamedev, qa fix for "Walk the city" (5W W1): the bridge deck is one joined strip, a straight
 * walk keeps the same "never past a blocked corner" rule as the path search, and a saved spot
 * the bus park cannot reach loads at the nearest spot it can.
 */
import { describe, expect, it } from 'vitest';
import { COLS, GRID, ROWS, cellMid, findPath, lineClear, nearestOpen, tapTarget, walkable } from '../../src/game/walkGrid';

const HOME = { x: 820, y: 700 };

describe('the bridge deck', () => {
  it('every deck row joins the next by a side, not only a corner', () => {
    for (let r = 34; r < ROWS - 1; r++) {
      const here = [...Array(COLS).keys()].filter((c) => GRID[r * COLS + c] === 1);
      const next = [...Array(COLS).keys()].filter((c) => GRID[(r + 1) * COLS + c] === 1);
      if (!here.length || !next.length) continue;
      expect(here.some((c) => next.includes(c)), `row ${r} to ${r + 1}`).toBe(true);
    }
  });

  it('a walk onto the bridge and back to the bus park', () => {
    const on = tapTarget({ x: 1412.5, y: 912.5 });
    expect(walkable(on)).toBe(true);
    expect(findPath({ x: 1280, y: 780 }, on).length).toBeGreaterThan(0);
    expect(findPath(on, HOME).length).toBeGreaterThan(0);
  });
});

describe('lineClear keeps the corner rule', () => {
  it('a line that steps from a cell to the one at its corner needs both cells beside that corner open', () => {
    let checked = 0;
    for (let r = 0; r < ROWS - 1; r++)
      for (let c = 0; c < COLS - 1; c++) {
        // A shut cell with open cells at its two sides along the diagonal: a line across the corner is not clear.
        const a = r * COLS + c;
        const d = (r + 1) * COLS + c + 1;
        const s1 = r * COLS + c + 1;
        const s2 = (r + 1) * COLS + c;
        if (GRID[a] === 1 && GRID[d] === 1 && (GRID[s1] !== 1 || GRID[s2] !== 1)) {
          checked++;
          expect(lineClear(cellMid(a), cellMid(d)), `${c},${r}`).toBe(false);
        }
      }
    // The map has such corners (the shore, the jetty): the rule was really tried.
    expect(checked).toBeGreaterThan(0);
  });

  it('every straight walk that lineClear allows ends where the bus park can be reached', () => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
    for (let i = 0; i < 4000; i++) {
      const a = nearestOpen({ x: rnd() * 1600, y: rnd() * 1000 });
      const b = { x: a.x + (rnd() - 0.5) * 300, y: a.y + (rnd() - 0.5) * 300 };
      if (walkable(b) && lineClear(a, b)) expect(findPath(b, HOME).length > 0 || Math.hypot(b.x - HOME.x, b.y - HOME.y) < 0.5).toBe(true);
    }
  });
});

describe('a saved spot nobody can reach', () => {
  it('the old one-cell bridge islands and the lagoon load at the nearest reachable spot', () => {
    for (const at of [
      { x: 1412, y: 912 },
      { x: 1387, y: 887 },
      { x: 1512, y: 987 },
      { x: 700, y: 950 },
    ]) {
      const p = walkable(at) ? at : nearestOpen(at);
      expect(walkable(p)).toBe(true);
      expect(findPath(p, HOME).length > 0 || Math.hypot(p.x - HOME.x, p.y - HOME.y) < 0.5, JSON.stringify(at)).toBe(true);
    }
  });
});
