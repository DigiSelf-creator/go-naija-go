/**
 * Slice 3 art, steps (a) and (b): the intro frames (src/art/intro.ts) and Lagos from above
 * (src/art/city.ts). Every frame and every look draws without throwing, with no NaN, and
 * leaves the context as it found it.
 */
import { describe, expect, it } from 'vitest';
import {
  BUCKETS,
  CITY_BLOCKS,
  CITY_MAP,
  CITY_SPOTS,
  PIN,
  SPOT_IDS,
  SPOT_LOOKS,
  SPOT_WORDS,
  bucketIconSvg,
  drawBucketIcon,
  drawCity,
  drawCityBlock,
  drawCityBus,
  drawCityCar,
  drawCityGround,
  drawJetty,
  drawPotholeSpot,
  drawProblemPin,
  makeCityCanvas,
  pinHitBox,
  type SpotLooks,
} from '../../src/art/city';
import { AGES, BODIES, HAIRS, OUTFITS, SKINS } from '../../src/art/hero';
import { INTRO_FRAMES, STOPPERS, drawIntroFrame, drawOutlineHero, drawStopper, drawStoryWheel } from '../../src/art/intro';
import { recorder } from './recorder';

function clean(paint: (g: CanvasRenderingContext2D) => void): ReturnType<typeof recorder> {
  const r = recorder();
  paint(r.g);
  expect(r.bad).toEqual([]);
  expect(r.depth()).toBe(0);
  return r;
}

describe('intro frames', () => {
  it('has six frames, each drawing cleanly at phone sizes, with no story words on the canvas', () => {
    expect(INTRO_FRAMES).toBe(6);
    for (let f = 1; f <= INTRO_FRAMES; f++)
      for (const [w, h] of [[320, 240], [851, 393], [393, 851], [180, 100]] as const)
        for (const time of [0, 2.5]) {
          const r = clean((g) => drawIntroFrame(g, f, w, h, { look: { skin: 0, hair: 0, outfit: 0 }, time }));
          expect(r.calls.length).toBeGreaterThan(20);
          // Captions are HTML text (gamedev). The only canvas word is the bus stop's own sign.
          for (const t of r.texts) expect(t).toBe('BUS STOP');
        }
  });

  it('draws with every hero look (every body, age, skin, hair and outfit), and with no hero', () => {
    for (let body = 0; body < BODIES.length; body++)
      for (let age = 0; age < AGES.length; age++)
        for (let skin = 0; skin < SKINS.length; skin++)
          for (let hair = 0; hair < HAIRS.length; hair++)
            for (let outfit = 0; outfit < OUTFITS.length; outfit++)
              for (let f = 1; f <= INTRO_FRAMES; f++) clean((g) => drawIntroFrame(g, f, 320, 180, { look: { skin, hair, outfit, body, age }, time: 1 }));
    clean((g) => drawIntroFrame(g, 5, 320, 180, { look: null }));
    clean((g) => drawIntroFrame(g, 5, 320, 180));
    // A slice 1 look (no body or age) still draws
    clean((g) => drawIntroFrame(g, 5, 320, 180, { look: { skin: 2, hair: 3, outfit: 1 } }));
  });

  it('copes with odd input: frame out of range, NaN, zero size', () => {
    for (const f of [0, -3, 7, 99, Number.NaN, 2.4]) clean((g) => drawIntroFrame(g, f, 320, 180));
    clean((g) => drawIntroFrame(g, 1, 0, 0));
    clean((g) => drawIntroFrame(g, 2, Number.NaN, Number.POSITIVE_INFINITY, { time: Number.NaN }));
  });

  it('the parts draw on their own: the Wheel, the Stoppers, the outline hero', () => {
    for (const missing of [0, 1, 3]) for (const dull of [false, true]) clean((g) => drawStoryWheel(g, 0, 0, 40, 0.3, missing, dull));
    expect(STOPPERS).toEqual(['jam', 'pothole', 'darkLamp', 'redTape']);
    for (const k of STOPPERS) clean((g) => drawStopper(g, k, 50, 100, 1.2));
    clean((g) => drawOutlineHero(g));
  });
});

const ALL_LOOKS: SpotLooks[] = [];
for (const a of SPOT_LOOKS) for (const b of SPOT_LOOKS) for (const c of SPOT_LOOKS) ALL_LOOKS.push({ potholes: a, lightsOut: b, slowInternet: c });

describe('Lagos from above', () => {
  it('has 12 blocks in 3 rows of 4 inside the 1600 x 1000 map, and the three spots', () => {
    expect(CITY_MAP).toEqual({ w: 1600, h: 1000 });
    expect(CITY_BLOCKS).toHaveLength(12);
    for (const b of CITY_BLOCKS) {
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.y).toBeGreaterThanOrEqual(0);
      expect(b.x + b.w).toBeLessThanOrEqual(CITY_MAP.w);
      expect(b.y + b.d).toBeLessThanOrEqual(CITY_MAP.h);
      expect(b.boxes.length).toBeGreaterThan(0);
      for (const q of b.boxes) {
        expect(q.x).toBeGreaterThanOrEqual(b.x);
        expect(q.x + q.w).toBeLessThanOrEqual(b.x + b.w);
        expect(q.y + q.d).toBeLessThanOrEqual(b.y + b.d);
        expect(q.y - q.h).toBeGreaterThanOrEqual(0);
      }
    }
    expect(SPOT_IDS).toEqual(['potholes', 'lightsOut', 'slowInternet']);
    expect(SPOT_WORDS).toEqual({ potholes: 'Potholes', lightsOut: 'Lights out', slowInternet: 'Slow internet' });
    for (const id of SPOT_IDS) {
      const s = CITY_SPOTS[id];
      expect(s.pin.x).toBeGreaterThan(0);
      expect(s.pin.x).toBeLessThan(CITY_MAP.w);
      expect(s.pin.y).toBeGreaterThan(0);
      expect(s.pin.y).toBeLessThan(CITY_MAP.h);
      if (s.block) expect(CITY_BLOCKS.find((b) => b.id === s.block)?.spot).toBe(id);
    }
  });

  it('every block draws in every look', () => {
    for (const b of CITY_BLOCKS) for (const look of SPOT_LOOKS) clean((g) => drawCityBlock(g, b, look));
    for (const look of SPOT_LOOKS) clean((g) => drawPotholeSpot(g, look));
  });

  it('the looks differ: problem, ready and fixed each draw something different', () => {
    for (const id of SPOT_IDS) {
      const b = CITY_BLOCKS.find((q) => q.id === CITY_SPOTS[id].block);
      const sig = SPOT_LOOKS.map((look) => {
        const r = recorder();
        if (b) drawCityBlock(r.g, b, look);
        else drawPotholeSpot(r.g, look);
        return JSON.stringify(r.calls);
      });
      expect(new Set(sig).size).toBe(3);
    }
  });

  it('the whole city draws with every mix of looks, with and without the jetty, and no words on the map', () => {
    for (const looks of ALL_LOOKS) {
      const r = clean((g) => drawCity(g, looks));
      expect(r.texts).toEqual([]);
    }
    clean((g) => drawCity(g, undefined, { jetty: false }));
    clean((g) => drawCityGround(g));
    clean((g) => drawJetty(g, 100, 100));
  });

  it('makeCityCanvas needs a document (null in tests)', () => {
    expect(makeCityCanvas()).toBeNull();
  });

  it('buses and cars draw every way', () => {
    for (const d of ['e', 'w', 'n', 's'] as const) clean((g) => drawCityBus(g, 100, 200, d));
    for (let i = 0; i < 8; i++) clean((g) => drawCityCar(g, 10, 10, i));
  });
});

describe('problem pins and bucket icons', () => {
  it('pins draw with the icon and the word (never colour alone); ready says "Ready"', () => {
    for (const id of SPOT_IDS) {
      const p = clean((g) => drawProblemPin(g, 100, 200, id, 'problem', 1));
      expect(p.texts).toEqual([SPOT_WORDS[id]]);
      const r = clean((g) => drawProblemPin(g, 100, 200, id, 'ready', Number.NaN));
      expect(r.texts).toEqual(['Ready']);
    }
  });

  it('the pin is a 36 px sign and its tap area is at least 48 x 56', () => {
    expect(PIN.r * 2).toBe(36);
    expect(PIN.word).toContain('bold 12px');
    const b = pinHitBox(100, 200);
    expect(b.w).toBeGreaterThanOrEqual(48);
    expect(b.h).toBeGreaterThanOrEqual(56);
    expect(b.y + b.h).toBeGreaterThanOrEqual(200);
  });

  it('bucket icons draw at any size and come as plain SVG too', () => {
    expect(BUCKETS).toEqual(['naira', 'power', 'tech']);
    for (const k of BUCKETS) {
      for (const s of [16, 24, 48, 0, Number.NaN]) clean((g) => drawBucketIcon(g, k, 20, 20, s));
      const svg = bucketIconSvg(k);
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg).toContain('aria-hidden="true"');
      expect(svg).not.toMatch(/script|href|<text/i);
    }
  });
});
