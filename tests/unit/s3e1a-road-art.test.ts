/**
 * S3e1a (docs/design.md S3e0 parts 3 to 6 and 10): the challenge road's pictures, plates, icons
 * and the stop card overlay; W17 C's tired and bright first screens and the plain street sign.
 * Everything draws cleanly, writes only the words it should, and the first-screen pieces stay off
 * the walking line and away from food.
 */
import { describe, expect, it } from 'vitest';
import { drawBackdrop } from '../../src/art/backdrop';
import {
  ALAUSA_CRACKS,
  FIRST_BLEND,
  FIRST_SCREEN,
  FIRST_STREETS,
  MAST,
  STREET_SIGN,
  drawFirstBack,
  drawFirstGround,
  drawFirstRow,
  drawFixedLookPast,
  drawStreetSign,
  firstPieces,
  firstStreetOf,
  firstWeight,
  paintFirstRow,
  signLines,
} from '../../src/art/firstLook';
import { MARKET_SIGNS } from '../../src/art/market';
import { HALL_SIGN, PARK_SIGNS } from '../../src/art/buspark';
import {
  CARD_CUTS,
  PLATE,
  ROAD,
  ROAD_ICONS,
  ROAD_STOPS,
  SHELTER_STOPS,
  STOP_BOX,
  cardOverlayLayout,
  drawCardFallback,
  drawCardOverlay,
  drawRoadPicture,
  drawStopPlate,
  edgeArrowSvg,
  nextPennantSvg,
  plateFill,
  plateIcon,
  roadIconSvg,
  tickBadgeSvg,
  type PlateState,
} from '../../src/art/road';
import { SHOP_SIGNS } from '../../src/art/street';
import { recorder } from './recorder';

function clean(paint: (g: CanvasRenderingContext2D) => void): ReturnType<typeof recorder> {
  const r = recorder();
  paint(r.g);
  expect(r.bad).toEqual([]);
  expect(r.depth()).toBe(0);
  return r;
}

describe('the challenge road (part 4)', () => {
  it('has part 4 sizes, stops in road order and the button boxes of the table', () => {
    expect(ROAD).toEqual({ w: 680, h: 168 });
    expect(ROAD_STOPS).toEqual(['alausa', 'lane', 'computerVillage', 'ikeja', 'hall', 'ferry']);
    expect(STOP_BOX).toEqual({
      alausa: { x: 8, y: 92, w: 112, h: 64 },
      lane: { x: 76, y: 4, w: 112, h: 64 },
      computerVillage: { x: 144, y: 92, w: 112, h: 64 },
      ikeja: { x: 280, y: 92, w: 112, h: 64 },
      hall: { x: 416, y: 92, w: 112, h: 64 },
      ferry: { x: 552, y: 92, w: 112, h: 64 },
    });
    for (const id of ROAD_STOPS) {
      const b = STOP_BOX[id];
      expect(b.x + b.w <= ROAD.w && b.y + b.h <= ROAD.h, id).toBe(true);
    }
    expect(SHELTER_STOPS).toEqual(['alausa', 'computerVillage', 'ikeja', 'hall']);
  });

  it('the picture draws cleanly with no writing at all, for both jetty looks and every Next', () => {
    for (const jetty of ['before', 'after'] as const) {
      for (const next of [...ROAD_STOPS, null]) {
        const r = clean((g) => drawRoadPicture(g, { jetty, next }));
        expect(r.texts).toEqual([]);
      }
    }
  });

  it('plates read without colour: each state has its own icon shape and its words', () => {
    const states: PlateState[] = ['locked', 'open', 'next', 'done', 'soon', 'built'];
    expect(plateIcon('locked')).toBe('padlock');
    expect(plateIcon('open')).toBe('bus');
    expect(plateIcon('next')).toBe('bus');
    expect(plateIcon('done')).toBe('tick');
    expect(plateIcon('soon')).toBe('ferry');
    expect(plateIcon('built')).toBe('ferry');
    expect(plateFill('locked')).toBe(PLATE.locked);
    expect(plateFill('open')).toBe(PLATE.open);
    expect(PLATE.open).toBe('#f2b300');
    expect(PLATE.locked).toBe('#e6d4ae');
    for (const st of states) {
      const r = clean((g) => drawStopPlate(g, STOP_BOX.computerVillage, st, { name: 'Computer Village', status: 'Ready to play', line3: 'Best: ₦8.70', parcel: true }, 2));
      expect(r.texts).toContain('Computer Village');
      expect(r.texts).toContain('Ready to play');
      expect(r.texts).toContain('Best: ₦8.70');
      // Only Next carries the pennant's word
      expect(r.texts.includes('Next'), st).toBe(st === 'next');
    }
  });

  it('icons are aria-hidden SVG for HTML, every one of them', () => {
    expect(ROAD_ICONS).toEqual(['padlock', 'bus', 'tick', 'ferry', 'parcel', 'house', 'soundOn', 'soundOff', 'left', 'right']);
    for (const icon of ROAD_ICONS) {
      const svg = roadIconSvg(icon);
      expect(svg).toMatch(/^<svg [^>]*aria-hidden="true"/);
      expect(svg).toContain('width="16"');
      expect(svg).toContain('<path d="M');
      expect(svg).not.toMatch(/NaN|undefined/);
    }
    expect(roadIconSvg('soundOn')).not.toBe(roadIconSvg('soundOff'));
    for (const svg of [nextPennantSvg(), tickBadgeSvg(), edgeArrowSvg('left'), edgeArrowSvg('right')]) {
      expect(svg).toContain('aria-hidden="true"');
      expect(svg).not.toMatch(/NaN|undefined/);
    }
    expect(nextPennantSvg()).toContain('>Next<');
  });
});

describe('the stop card picture (part 5)', () => {
  it('has the cuts of part 5, each 4 by 3', () => {
    expect(CARD_CUTS.alausa).toEqual({ x: 0, y: 335, w: 240, h: 180 });
    expect(CARD_CUTS.computerVillage).toEqual({ x: 1163, y: 301, w: 320, h: 240 });
    expect(CARD_CUTS.ikeja).toEqual({ x: 536, y: 579, w: 320, h: 240 });
    expect(CARD_CUTS.ferry).toEqual({ x: 290, y: 760, w: 320, h: 240 });
    for (const c of Object.values(CARD_CUTS)) expect(c.w * 3).toBe(c.h * 4);
  });

  it('the overlay writes only the stop name, at every card size and for every hero', () => {
    for (const [w, h] of [[112, 84], [160, 120], [240, 180]] as const) {
      for (let i = 0; i < 10; i++) {
        const hero = { skin: i % 5, hair: (i * 2) % 5, outfit: (i * 3) % 5, body: i % 2, age: i % 3 };
        const r = clean((g) => drawCardOverlay(g, w, h, { name: 'Computer Village', hero, time: 1.2, still: i % 2 === 0 }));
        expect(r.texts).toEqual(['Computer Village']);
      }
      const L = cardOverlayLayout(w, h);
      // The hero is about 30 px tall at 112 wide (HERO_HEIGHT 50 x 0.56 = 28) and stands inside the card
      expect(50 * L.hero.scale * (112 / w)).toBeGreaterThan(26);
      expect(50 * L.hero.scale * (112 / w)).toBeLessThan(34);
      expect(L.hero.y).toBeLessThan(h);
      expect(L.sign.x + L.sign.w).toBeLessThanOrEqual(w);
    }
    const r = clean((g) => drawCardOverlay(g, 160, 120, { name: 'Ferry', hero: { skin: 0, hair: 0, outfit: 0 }, bus: false }));
    expect(r.texts).toEqual(['Ferry']);
    clean((g) => drawCardFallback(g, 112, 84));
  });
});

describe('W17 C: the first screens (part 6)', () => {
  it('has part 6 stretches and signs, and blends over the last 120 units', () => {
    expect(FIRST_STREETS).toEqual(['alausa', 'computerVillage', 'ikeja']);
    expect(FIRST_SCREEN.alausa).toMatchObject({ level: 'lagos-1', from: 20, to: 760, sign: 260, name: 'Alausa' });
    expect(FIRST_SCREEN.computerVillage).toMatchObject({ level: 'lagos-2', from: 20, to: 1000, sign: 260, name: 'Computer Village' });
    expect(FIRST_SCREEN.ikeja).toMatchObject({ level: 'lagos-3', from: 20, to: 1000, sign: 600, name: 'Ikeja' });
    expect(firstStreetOf('lagos-2')).toBe('computerVillage');
    expect(firstStreetOf('lagos-hall')).toBeNull();
    expect(firstStreetOf('lagos-lane')).toBeNull();
    expect(FIRST_BLEND).toBe(120);
    expect(firstWeight('alausa', 300)).toBe(1);
    expect(firstWeight('alausa', 640)).toBe(1);
    expect(firstWeight('alausa', 700)).toBeGreaterThan(0);
    expect(firstWeight('alausa', 700)).toBeLessThan(1);
    expect(firstWeight('alausa', 760)).toBe(0);
    expect(firstWeight('alausa', 2000)).toBe(0);
    expect(firstWeight('ikeja', Number.NaN)).toBe(0);
  });

  it('tired has 1 proud person, 2 shutters on the first fronts and one sack far from food; bright has 4 people', () => {
    for (const s of FIRST_STREETS) {
      const p = firstPieces(s);
      expect(p.tiredPeople).toBe(1);
      expect(p.brightPeople).toBe(4);
      expect(p.shutters).toBe(2);
      // Nobody stands where the hero starts (x 80 on streets 1 and 2, 420 on street 3)
      const start = s === 'ikeja' ? 420 : 80;
      for (const x of p.people) expect(Math.abs(x - start), `${s} person at ${x}`).toBeGreaterThan(50);
      // Pieces sit inside the stretch, before the blend
      for (const x of [...p.people, p.sack]) expect(x).toBeLessThan(FIRST_SCREEN[s].to - FIRST_BLEND);
    }
    // Food: the Mama Put shop (street 1, x 4 to 120), the pepper stall (street 2, 196 to 328), the suya spot (street 3, 176 to 292)
    expect(firstPieces('alausa').sack - 120).toBeGreaterThan(100);
    expect(firstPieces('computerVillage').sack - 328).toBeGreaterThan(100);
    expect(firstPieces('ikeja').sack - 292).toBeGreaterThan(100);
  });

  it('the row layers draw cleanly; bright adds no words, tired only repaints the row signs', () => {
    const rowSigns: Record<string, readonly string[]> = { alausa: SHOP_SIGNS, computerVillage: MARKET_SIGNS, ikeja: [...PARK_SIGNS, HALL_SIGN] };
    for (const s of FIRST_STREETS) {
      const bright = clean((g) => paintFirstRow(g, s, 'bright'));
      expect(bright.texts).toEqual([]);
      const tired = clean((g) => paintFirstRow(g, s, 'tired'));
      for (const t of tired.texts) expect(rowSigns[s], `${s}: ${t}`).toContain(t);
      for (const look of ['tired', 'bright'] as const) {
        clean((g) => drawFirstRow(g, { street: s, look }, 0, 560, 300));
        clean((g) => drawFirstBack(g, { street: s, look, still: true }, 0, 560, 300, 3.1));
        clean((g) => drawFixedLookPast(g, FIRST_SCREEN[s].theme, { street: s, look }, 100, 560, 420, 300));
        // drawBackdrop with the first look, at the start and far past the stretch
        for (const camX of [-32, 308, 4000]) clean((g) => drawBackdrop(g, FIRST_SCREEN[s].theme, camX, 560, 2, 420, 300, true, { street: s, look }));
      }
    }
    expect(MAST.h).toBeGreaterThan(150);
  });

  it('Alausa cracks sit on the road front between y 306 and 330, never on the walking line', () => {
    expect(ALAUSA_CRACKS).toHaveLength(5);
    const r = recorder();
    drawFirstGround(r.g, { street: 'alausa', look: 'tired' }, 0, 900, 300, 420);
    expect(r.bad).toEqual([]);
    const ys = r.calls.filter((c) => c.name === 'moveTo' || c.name === 'lineTo').map((c) => c.args[1] as number);
    // The cracks' points (the sign's pole is drawn with rects, its plate with roundRect)
    expect(ys.length).toBeGreaterThanOrEqual(20);
    for (const y of ys) {
      expect(y).toBeGreaterThanOrEqual(306);
      expect(y).toBeLessThanOrEqual(330);
    }
    for (const [x, len] of ALAUSA_CRACKS) {
      expect(len).toBeGreaterThanOrEqual(10);
      expect(len).toBeLessThanOrEqual(24);
      expect(x + len).toBeLessThan(FIRST_SCREEN.alausa.to - FIRST_BLEND);
    }
    // Bright: no cracks, fresh tarmac instead
    const b = recorder();
    drawFirstGround(b.g, { street: 'alausa', look: 'bright' }, 0, 900, 300, 420);
    expect(b.calls.filter((c) => c.name === 'lineTo')).toEqual([]);
  });

  it('the street sign is a plain cream plate with only the name, in words at least 12 screen px', () => {
    expect(STREET_SIGN.plate).toBe('#fffaf0');
    expect(STREET_SIGN.minPx).toBe(12);
    expect(signLines('Alausa')).toEqual(['Alausa']);
    expect(signLines('Ikeja')).toEqual(['Ikeja']);
    expect(signLines('Computer Village')).toEqual(['Computer', 'Village']);
    for (const s of FIRST_STREETS) {
      const r = clean((g) => drawStreetSign(g, FIRST_SCREEN[s].sign, 300, FIRST_SCREEN[s].name));
      expect(r.texts.join(' ')).toBe(FIRST_SCREEN[s].name);
      expect(r.colours).toContain('#fffaf0');
      const font = r.calls.length > 0 ? String((r.g as unknown as { font: string }).font) : '';
      // At scale 1 (the recorder) the words are 14 units: never below 12 px
      expect(Number(/(\d+(\.\d+)?)px/.exec(font)?.[1])).toBeGreaterThanOrEqual(12);
    }
  });
});
