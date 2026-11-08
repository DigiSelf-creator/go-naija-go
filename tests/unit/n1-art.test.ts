/**
 * N1 art: Nigeria's wheel, the Streets card look, the music icons and the fixed street look
 * (docs/design.md S2.8, S2.10, S2.12 pictures 10 and 14).
 */
import { describe, expect, it } from 'vitest';
import { THEMES, drawBackdrop } from '../../src/art/backdrop';
import { CARD_LOOK, CARD_PICTURES, MUSIC_SVG, cardBadgeSvg, cardSceneSvg, musicIconSvg, padlockSvg, tickSvg, toGrey } from '../../src/art/cards';
import { BUNTING_COLOURS, LAMP_LIGHT, drawFixedLook, fixedTileW } from '../../src/art/fixedLook';
import { PARK_SIGN_BOXES, PARK_TILE_W } from '../../src/art/buspark';
import { MARKET_SIGN_BOXES, MARKET_TILE_W } from '../../src/art/market';
import { FRESH_ROAD, SHOP_SIGN_BOXES, SHOP_TILE_W, drawRoad } from '../../src/art/street';
import { COG_TURN_S, WHEEL_COLOURS, WHEEL_SIZES, WHEEL_STATES, WHEEL_VIEW, cogAngle, cogCentre, wheelSvg } from '../../src/art/wheel';
import { hsl, recorder } from './recorder';

/** Typed out by hand from S2.8, so a slip in the art's list is caught. */
const S28 =
  'Abia, Adamawa, Akwa Ibom, Anambra, Bauchi, Bayelsa, Benue, Borno, Cross River, Delta, Ebonyi, Edo, Ekiti, Enugu, FCT, Gombe, Imo, Jigawa, Kaduna, Kano, Katsina, Kebbi, Kogi, Kwara, Lagos, Nasarawa, Niger, Ogun, Ondo, Osun, Oyo, Plateau, Rivers, Sokoto, Taraba, Yobe, Zamfara'.split(', ');

const isGreen = (c: string): boolean => {
  const h = hsl(c);
  return !!h && h.h >= 75 && h.h <= 165 && h.s > 0.25 && h.l > 0.15 && h.l < 0.9;
};
const isRed = (c: string): boolean => {
  const h = hsl(c);
  return !!h && (h.h <= 12 || h.h >= 345) && h.s > 0.45 && h.l > 0.25 && h.l < 0.7;
};
const isBlue = (c: string): boolean => {
  const h = hsl(c);
  return !!h && h.h >= 190 && h.h <= 250 && h.s > 0.35 && h.l > 0.2 && h.l < 0.8;
};

/** WCAG contrast of two #rrggbb colours. */
function contrast(a: string, b: string): number {
  const lum = (c: string): number => {
    const n = parseInt(c.slice(1), 16);
    const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * ch[0]! + 0.7152 * ch[1]! + 0.0722 * ch[2]!;
  };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
}

describe("Nigeria's wheel", () => {
  it('has all 36 states and the FCT, spelled as S2.8, A to Z, none twice', () => {
    expect(WHEEL_STATES.map((s) => s.name)).toEqual(S28);
    expect(WHEEL_STATES).toHaveLength(37);
    const names = WHEEL_STATES.map((s) => s.name);
    expect([...names].sort((a, b) => a.localeCompare(b, 'en'))).toEqual(names);
    expect(new Set(WHEEL_STATES.map((s) => s.id)).size).toBe(37);
    expect(WHEEL_STATES.find((s) => s.name === 'Lagos')!.id).toBe('lagos');
    expect(WHEEL_STATES.find((s) => s.name === 'Akwa Ibom')!.id).toBe('akwa-ibom');
    expect(WHEEL_STATES.find((s) => s.name === 'FCT')!.id).toBe('fct');
  });

  it('goes clockwise from the top, evenly spaced', () => {
    const top = cogCentre(0);
    expect(top.x).toBeCloseTo(0, 6);
    expect(top.y).toBeLessThan(0);
    // The next cog is to the right of the top one (clockwise on screen)
    expect(cogCentre(1).x).toBeGreaterThan(0);
    // A quarter of the way round is on the right
    expect(Math.cos(cogAngle(9.25))).toBeCloseTo(1, 6);
    for (let i = 1; i < 37; i++) expect(cogAngle(i) - cogAngle(i - 1)).toBeCloseTo((2 * Math.PI) / 37, 9);
  });

  it('every name is drawn once, the same size; only working ones are bold', () => {
    const svg = wheelSvg(['lagos']);
    const texts = [...svg.matchAll(/<text [^>]*>([^<]*)<\/text>/g)];
    expect(texts.map((m) => m[1])).toEqual(S28);
    for (const m of texts) {
      const bold = m[0].includes('font-weight="bold"');
      expect(bold, m[1]).toBe(m[1] === 'Lagos');
    }
    expect(svg.match(/font-size="/g)).toHaveLength(1); // one size for every name
  });

  it('a grey wheel has 37 grey cogs; a working cog turns, is amber and carries a tick', () => {
    const none = wheelSvg([]);
    expect(none.match(/class="gdw-off"/g)).toHaveLength(37);
    expect(none).not.toContain('gdw-turn"');
    const one = wheelSvg(['lagos']);
    expect(one.match(/class="gdw-off"/g)).toHaveLength(36);
    expect(one.match(/class="gdw-on"/g)).toHaveLength(1);
    expect(one).toContain('data-state="lagos"');
    expect(one).toContain('class="gdw-turn"');
    expect(one).toContain(WHEEL_COLOURS.cogOn);
    expect(one).toContain(WHEEL_COLOURS.tick);
    const all = wheelSvg(WHEEL_STATES.map((s) => s.id));
    expect(all.match(/class="gdw-on"/g)).toHaveLength(37);
  });

  it('respects reduced motion, and can be held still', () => {
    const svg = wheelSvg(['lagos']);
    expect(svg).toMatch(/@media \(prefers-reduced-motion: reduce\)\{\.gdw-turn\{animation:none\}\}/);
    expect(svg).toContain(`${COG_TURN_S}s linear infinite`);
    expect(wheelSvg(['lagos'], { turn: false })).not.toContain('class="gdw-turn"');
  });

  it('is a picture, not buttons, and is hidden from screen readers (the screen lists the names)', () => {
    const svg = wheelSvg(['lagos']);
    expect(svg).toContain('aria-hidden="true"');
    expect(svg).not.toMatch(/<(button|a|foreignObject)\b/);
  });

  it('the longest name fits inside the picture, and names never overlap their neighbours', () => {
    // Bold sans-serif is at most about 0.62 em a letter
    const longest = Math.max(...S28.map((n) => n.length));
    expect(WHEEL_SIZES.nameFrom + 3 + longest * 0.62 * WHEEL_SIZES.nameSize).toBeLessThanOrEqual(WHEEL_VIEW / 2);
    // Room between two names where they start, against the letters' height (about 0.75 em)
    const gap = (2 * Math.PI * WHEEL_SIZES.nameFrom) / 37;
    expect(gap).toBeGreaterThan(0.75 * WHEEL_SIZES.nameSize);
    // Grey cogs do not touch
    expect(2 * Math.PI * WHEEL_SIZES.rim / 37).toBeGreaterThan(2 * WHEEL_SIZES.cog);
  });

  it('uses no party colour set: no green, no red, no blue anywhere on the wheel', () => {
    const colours = new Set(wheelSvg(WHEEL_STATES.map((s) => s.id)).match(/#[0-9a-fA-F]{6}/g));
    for (const c of colours) {
      expect(isGreen(c), `${c} reads as green`).toBe(false);
      expect(isRed(c), `${c} reads as red`).toBe(false);
      expect(isBlue(c), `${c} reads as blue`).toBe(false);
    }
    expect(wheelSvg([])).not.toMatch(/\b(star|flag|crest)\b/i);
  });
});

describe('Streets cards', () => {
  it('words are readable on every card face', () => {
    for (const state of ['open', 'done', 'locked'] as const) {
      const face = CARD_LOOK[state].face;
      expect(contrast(CARD_LOOK.ink, face), state).toBeGreaterThan(7);
      expect(contrast(CARD_LOOK.inkSoft, face), state).toBeGreaterThan(4.5);
    }
  });

  it('done has a tick, locked a padlock and a dashed edge, open no badge (never colour alone)', () => {
    expect(cardBadgeSvg('done')).toBe(tickSvg());
    expect(cardBadgeSvg('locked')).toBe(padlockSvg());
    expect(cardBadgeSvg('open')).toBe('');
    expect(CARD_LOOK.locked.edgeStyle).toBe('dashed');
    expect(CARD_LOOK.open.edgeStyle).toBe('solid');
    expect(tickSvg()).toContain('<path d="M6.6 12.4');
    expect(padlockSvg()).toContain('<rect');
  });

  it('every card picture is pale, has no words, keeps its corner in view, and goes grey when locked', () => {
    for (const pic of CARD_PICTURES) {
      for (const state of ['open', 'done', 'locked'] as const) {
        const svg = cardSceneSvg(pic, state);
        expect(svg).not.toContain('<text');
        expect(svg).toContain('preserveAspectRatio="xMaxYMax slice"');
        expect(svg).toContain('aria-hidden="true"');
        const alpha = Number(/opacity="([0-9.]+)"/.exec(svg)![1]);
        expect(alpha).toBeLessThanOrEqual(0.35);
        if (state === 'locked') {
          for (const c of svg.match(/#[0-9a-fA-F]{6}/g)!) {
            // Grey: red, green and blue within a few steps of each other
            const n = parseInt(c.slice(1), 16);
            const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
            expect(Math.max(...ch) - Math.min(...ch), `${pic} ${c}`).toBeLessThanOrEqual(8);
          }
        }
      }
    }
    expect(toGrey('#f6c90e')).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe('music icons', () => {
  it('on and off differ by a slash, use the text colour and are hidden from screen readers', () => {
    expect(musicIconSvg(true)).not.toContain('class="off"');
    expect(musicIconSvg(false)).toContain('class="off"');
    for (const s of [MUSIC_SVG, musicIconSvg(true), musicIconSvg(false)]) {
      expect(s).toContain('currentColor');
      expect(s).toContain('aria-hidden="true"');
      expect(s).not.toContain('<text');
    }
  });
});

describe('the fixed street look', () => {
  it('every street draws its fixed look with no broken numbers and leaves the context as found', () => {
    for (const theme of THEMES) {
      for (const camX of [0, 1234.5, 11000]) {
        const r = recorder();
        drawFixedLook(r.g, theme, camX, 910, 300);
        expect(r.bad, theme).toEqual([]);
        expect(r.depth(), theme).toBe(0);
        const b = recorder();
        drawBackdrop(b.g, theme, camX, 910, 2, 420, 300, true);
        expect(b.bad, theme).toEqual([]);
        expect(b.depth(), theme).toBe(0);
      }
    }
  });

  it('adds lights and bunting only: no words, so no sign, office or name of any kind', () => {
    for (const theme of THEMES) {
      const r = recorder();
      drawFixedLook(r.g, theme, 500, 910, 300);
      expect(r.texts, theme).toEqual([]);
    }
  });

  it('bunting has no green, white or red (no party or flag colours); lamps are warm', () => {
    for (const c of BUNTING_COLOURS) {
      expect(isGreen(c), c).toBe(false);
      expect(isRed(c), c).toBe(false);
      expect(hsl(c)!.l, c).toBeLessThan(0.85);
    }
    expect(hsl(LAMP_LIGHT.bulb)!.h).toBeLessThan(70);
  });

  it('lines up with each row: same tile width, and every lit sign is a real sign board in the tile', () => {
    expect(fixedTileW('morning')).toBe(SHOP_TILE_W);
    expect(fixedTileW('market')).toBe(MARKET_TILE_W);
    expect(fixedTileW('evening')).toBe(PARK_TILE_W);
    for (const [boxes, w] of [[SHOP_SIGN_BOXES, SHOP_TILE_W], [MARKET_SIGN_BOXES, MARKET_TILE_W], [PARK_SIGN_BOXES, PARK_TILE_W]] as const) {
      for (const b of boxes) {
        expect(b.x).toBeGreaterThanOrEqual(0);
        expect(b.x + b.w).toBeLessThanOrEqual(w);
        expect(b.y).toBeLessThan(0);
        expect(b.y + b.h).toBeLessThan(0);
      }
    }
  });

  it('fresh road paint keeps the same holes: tar only on the spans', () => {
    const ground: [number, number][] = [[0, 400], [470, 900]];
    for (const fresh of [false, true]) {
      const r = recorder();
      drawRoad(r.g, 0, 900, ground, 300, 420, fresh);
      expect(r.bad).toEqual([]);
      const rects = r.calls.filter((c) => c.name === 'fillRect').map((c) => c.args as number[]);
      for (const [x, , w] of rects) {
        const inSpan = ground.some(([a, b]) => x! >= a - 1e-9 && x! + w! <= b + 1e-9);
        const inHole = x! >= 400 - 1e-9 && x! + w! <= 470 + 1e-9;
        expect(inSpan || inHole, `rect at ${x} width ${w}`).toBe(true);
      }
    }
    expect(FRESH_ROAD.edge).not.toBe('#d8c27a');
  });
});
