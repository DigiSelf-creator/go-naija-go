import { describe, expect, it } from 'vitest';
import { DOUBLE_TAP_MS, DOUBLE_TAP_PX, isSecondTap } from '../../src/screens/menus';

describe('double tap guard', () => {
  const first = { x: 100, y: 100, t: 1000 };
  it('ignores a tap soon after and close to the first', () => {
    expect(isSecondTap(first, { x: 110, y: 95 }, 1000 + 120)).toBe(true);
  });
  it('lets a tap through once the time is up, or when it lands somewhere else', () => {
    expect(isSecondTap(first, { x: 100, y: 100 }, 1000 + DOUBLE_TAP_MS)).toBe(false);
    expect(isSecondTap(first, { x: 100 + DOUBLE_TAP_PX, y: 100 }, 1000 + 50)).toBe(false);
  });
  it('never blocks keys (no position) or when nothing opened by tap', () => {
    expect(isSecondTap(first, null, 1001)).toBe(false);
    expect(isSecondTap(null, { x: 100, y: 100 }, 1001)).toBe(false);
  });
});
