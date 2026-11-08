/**
 * K1 art: the Market road and Bus park road backdrops, their platforms, and the rolling drum
 * (docs/design.md S2.6, S2.12 pictures 7 and 9).
 */
import { describe, expect, it } from 'vitest';
import { THEMES, asTheme, drawBackdrop, drawThemeStall } from '../../src/art/backdrop';
import { HALL_SIGN, PARK_SIGNS, PARK_TILE_W, SUYA_GRILL_X, parkTiles } from '../../src/art/buspark';
import { DRUM, drawDrum, drawDrumSmash, drawDrumSparkle, drumCentres, lidTurn } from '../../src/art/drum';
import { TYRE_R } from '../../src/art/hazards';
import { MARKET_SIGNS, UMBRELLA_COLOURS } from '../../src/art/market';
import { SHOP_SIGNS } from '../../src/art/street';
import { hsl, recorder } from './recorder';

describe('street looks', () => {
  it('maps each level theme to its look; anything else is the morning street', () => {
    expect(THEMES).toEqual(['morning', 'market', 'evening']);
    expect(asTheme('market')).toBe('market');
    expect(asTheme('evening')).toBe('evening');
    expect(asTheme('night')).toBe('morning');
    expect(asTheme('')).toBe('morning');
  });

  it('every look draws with no broken numbers, leaves the context as found, and shows its own signs', () => {
    const want: Record<string, readonly string[]> = { morning: SHOP_SIGNS, market: MARKET_SIGNS, evening: [...PARK_SIGNS, HALL_SIGN] };
    for (const theme of THEMES) {
      for (const camX of [0, 1234.5, 11000]) {
        const r = recorder();
        drawBackdrop(r.g, theme, camX, 910, 3.3, 420, 300);
        expect(r.bad, theme).toEqual([]);
        expect(r.depth(), theme).toBe(0);
        for (const s of want[theme]!) expect(r.texts, `${theme} shows ${s}`).toContain(s);
      }
    }
  });

  it('signs are the made-up everyday words of S2.6, plain capitals, no brands', () => {
    expect(MARKET_SIGNS).toEqual(['FABRICS', 'PEPPER AND TOMATOES', 'PROVISIONS', 'PHONE ACCESSORIES', 'TAILOR']);
    expect(PARK_SIGNS).toEqual(['VULCANIZER', 'SUYA SPOT', 'TICKETS', 'BATTERY CHARGING', 'BUKA', 'PHONE REPAIRS']);
    expect(HALL_SIGN).toBe('GO-SLOW HALL');
    for (const s of [...MARKET_SIGNS, ...PARK_SIGNS, HALL_SIGN]) expect(s).toMatch(/^[A-Z -]+$/);
  });

  it('umbrellas carry no green (no green, white and red party look), and each has two colours', () => {
    for (const pair of UMBRELLA_COLOURS) {
      expect(pair[0]).not.toBe(pair[1]);
      for (const c of pair) {
        const h = hsl(c);
        expect(h, c).not.toBeNull();
        const green = h!.h >= 75 && h!.h <= 165 && h!.s > 0.25 && h!.l > 0.15 && h!.l < 0.9;
        expect(green, `${c} reads as green`).toBe(false);
      }
    }
  });

  it('the bus park row repeats with no gaps, and the suya smoke rises inside its own row', () => {
    for (const camX of [0, 777, 5000.25, 11500]) {
      const xs = parkTiles(camX, 910);
      expect(xs[0]).toBeLessThanOrEqual(0);
      expect(xs.at(-1)! + PARK_TILE_W).toBeGreaterThanOrEqual(910);
      for (let i = 1; i < xs.length; i++) expect(xs[i]! - xs[i - 1]!).toBeCloseTo(PARK_TILE_W, 6);
    }
    expect(SUYA_GRILL_X).toBeGreaterThan(0);
    expect(SUYA_GRILL_X).toBeLessThan(PARK_TILE_W);
  });

  it('a stall or shed roof in every look has its top edge exactly on the landing line', () => {
    for (const theme of THEMES) {
      for (const [x, topY, w] of [
        [1100, 240, 140],
        [1500, 190, 120],
        [1650, 280, 120], // low roof: no table under it
      ] as const) {
        const r = recorder();
        drawThemeStall(r.g, theme, x, topY, w, 300);
        expect(r.bad).toEqual([]);
        expect(r.depth()).toBe(0);
        const roofs = r.calls.filter((c) => c.name === 'roundRect' && c.args[0] === x && c.args[2] === w);
        expect(roofs.length, theme).toBeGreaterThan(0);
        for (const c of roofs) expect(c.args[1], theme).toBe(topY);
        // Nothing of the stall pokes above the landing line
        for (const c of r.calls) {
          if (c.name === 'fillRect' || c.name === 'roundRect') expect(c.args[1] as number, `${theme} ${c.name}`).toBeGreaterThanOrEqual(topY);
        }
      }
    }
  });
});

describe('rolling drum', () => {
  it('fits the S2.6 box (26 wide, 30 tall, feet on the road), taller than the tyre', () => {
    expect([DRUM.w, DRUM.h]).toEqual([26, 30]);
    const { fx, fy, bx, by } = drumCentres(100, 300);
    expect(fx - DRUM.r).toBeCloseTo(100 - 13, 6); // lid's left edge
    expect(fy + DRUM.r).toBeCloseTo(300, 6); // lid sits on the road
    expect(bx + DRUM.r).toBeCloseTo(100 + 13, 6); // back end's right edge
    expect(by - DRUM.r).toBeCloseTo(300 - 30, 6); // back end's top
    expect(DRUM.h).toBeGreaterThan(2 * TYRE_R);
  });

  it('the lid turns without slipping for the game roll angle (distance / 11)', () => {
    const dist = 37;
    expect(lidTurn(dist / DRUM.rollR) * DRUM.r).toBeCloseTo(dist, 6);
    expect(lidTurn(Number.NaN)).toBe(0);
  });

  it('draws rolling, squashed and with bad numbers, never leaving NaN or a saved state behind', () => {
    for (const [rot, look] of [
      [0, {}],
      [-12.7, { squash: 0.5 }],
      [Number.NaN, { squash: Number.NaN, lines: false }],
      [3, { squash: 7 }],
    ] as const) {
      const r = recorder();
      drawDrum(r.g, 200, 300, rot, look);
      expect(r.bad).toEqual([]);
      expect(r.depth()).toBe(0);
      expect(r.texts).toEqual([]); // no writing, no brand
    }
  });

  it('sparkle and smash draw only while running (k from 0 to 1)', () => {
    for (const f of [drawDrumSparkle, drawDrumSmash]) {
      for (const k of [-0.1, 1, 1.5, Number.NaN]) {
        const r = recorder();
        f(r.g, 200, 300, k);
        expect(r.calls).toEqual([]);
      }
      for (const k of [0, 0.3, 0.99]) {
        const r = recorder();
        f(r.g, 200, 300, k);
        expect(r.calls.length).toBeGreaterThan(0);
        expect(r.bad).toEqual([]);
        expect(r.depth()).toBe(0);
      }
    }
  });
});
