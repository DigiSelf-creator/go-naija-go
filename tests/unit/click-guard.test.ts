/**
 * qa L3: on a narrow screen a Go up press also opened Pause. The well button acts on
 * pointerdown and then hides; the phone's follow-up click landed on whatever was under it.
 * ClickGuard drops clicks for WELL_CLICK_GUARD_MS after a well press (src/screens/controls.ts).
 */
import { describe, expect, it } from 'vitest';
import { ClickGuard, WELL_CLICK_GUARD_MS, wellButtonBox, buttonLayout } from '../../src/screens/controls';
import { HUD_TIGHT } from '../../src/screens/hud';

describe('well button click guard', () => {
  it('blocks nothing before any press', () => {
    const g = new ClickGuard();
    expect(g.blocks(0)).toBe(false);
    expect(g.blocks(1e9)).toBe(false);
  });

  it('blocks clicks for about 400 ms after a press, then lets them through', () => {
    expect(WELL_CLICK_GUARD_MS).toBe(400);
    const g = new ClickGuard();
    g.press(1000);
    expect(g.blocks(1000)).toBe(true);
    expect(g.blocks(1100)).toBe(true); // the phone's click after a tap comes well inside this
    expect(g.blocks(1399)).toBe(true);
    expect(g.blocks(1400)).toBe(false);
    expect(g.blocks(5000)).toBe(false); // Pause and Sound work again
  });

  it('a second press starts the wait again', () => {
    const g = new ClickGuard();
    g.press(0);
    g.press(300);
    expect(g.blocks(650)).toBe(true);
    expect(g.blocks(700)).toBe(false);
  });
});

describe('the HUD row and the well button (design.md HUD: one row, inside the top 56 px)', () => {
  for (const [w, h] of [
    [320, 236],
    [340, 240],
    [400, 240],
  ] as const) {
    it(`${w}x${h}: the well button never reaches into the HUD row, so a one-row HUD is never under it`, () => {
      const layout = buttonLayout(w, h);
      // Anchors right up at the top of the screen and at both sides.
      for (const x of [0, w / 2, w])
        for (const y of [0, 30, 120]) {
          const b = wellButtonBox({ x, y }, w, layout);
          expect(b.y, `${x},${y}`).toBeGreaterThanOrEqual(56);
        }
    });
  }

  it('the HUD has a roomy step and tighter steps', () => {
    expect(HUD_TIGHT[0]).toBe('');
    expect(HUD_TIGHT.length).toBeGreaterThanOrEqual(2);
  });
});
