/**
 * Walk the city art (city.md part 5W, step c1): the hero from above, pay spots, money, signs
 * and the working places. Everything draws without NaN, leaves the context as it found it,
 * stays in its box, keeps 48 px tap areas and writes only our own words.
 */
import { describe, expect, it } from 'vitest';
import { AGES, BODIES, HAIRS, OUTFITS, SKINS } from '../../src/art/hero';
import {
  BUILD_IDS,
  BUILDS,
  EDGE_ARROW,
  MAT,
  PAY,
  boardWobble,
  drawBuildOutline,
  drawCollectLine,
  drawEdgeArrow,
  drawFlyingMoney,
  drawPayMat,
  drawPriceBoard,
  drawRoadBuild,
  drawTrayBubble,
  edgeArrowPlace,
  flyingCount,
  moneyArc,
  payTime,
  priceBoardBox,
  priceWords,
  trayBubbleBox,
  trayWords,
} from '../../src/art/payspot';
import { FOLK, MAMA_PUT, danfoTrip, drawFolk, drawMamaPut, drawMarketDanfo, drawMarketPlace, drawPlate, drawPorter } from '../../src/art/places';
import { WALKER, WALKER_BOX, busArrivalHero, drawBusArrival, drawCityHero, drawWalkRing, walkDir, walkFrame, walkerSize, type WalkDir } from '../../src/art/walker';
import { boundsContext } from './bounds-context';
import { recorder } from './recorder';

function clean(paint: (g: CanvasRenderingContext2D) => void): ReturnType<typeof recorder> {
  const r = recorder();
  paint(r.g);
  expect(r.bad).toEqual([]);
  expect(r.depth()).toBe(0);
  return r;
}

const DIRS: WalkDir[] = ['n', 's', 'e', 'w'];

describe('the hero from above', () => {
  it('every skin, hair, outfit, body and age, in every view and frame, draws cleanly inside WALKER_BOX', () => {
    for (let s = 0; s < SKINS.length; s++)
      for (let h = 0; h < HAIRS.length; h++)
        for (let o = 0; o < OUTFITS.length; o++)
          for (let b = 0; b < BODIES.length; b++)
            for (let a = 0; a < AGES.length; a++)
              for (const dir of DIRS)
                for (const pose of [{ phase: 0 }, { phase: 0.3 }, { phase: 0.55 }, { phase: 0.8 }, { moving: false, time: 1.3 }]) {
                  const r = boundsContext();
                  drawCityHero(r.g, { skin: s, hair: h, outfit: o, body: b, age: a }, 0, 0, { dir, ...pose });
                  expect(r.bad).toEqual([]);
                  expect(r.depth()).toBe(0);
                  expect(r.box.left).toBeGreaterThanOrEqual(WALKER_BOX.left);
                  expect(r.box.right).toBeLessThanOrEqual(WALKER_BOX.right);
                  expect(r.box.top).toBeGreaterThanOrEqual(WALKER_BOX.top);
                  // The flat shadow ellipse is counted as a circle here (r 7.5), so allow for it below the feet
                  expect(r.box.bottom).toBeLessThanOrEqual(WALKER_BOX.bottom + 5);
                }
  });

  it('a broken or old look still draws, and draws no words', () => {
    for (const look of [{ skin: 99, hair: -1, outfit: 2.5 }, { skin: 0, hair: 0, outfit: 0 }]) {
      const r = clean((g) => drawCityHero(g, look, 10, 10, { dir: 's', phase: NaN, time: NaN, size: NaN }));
      expect(r.texts).toEqual([]);
    }
  });

  it('has 4 walk frames, faces the way it walks, and stays 24 px or more on screen', () => {
    expect([0, 0.25, 0.5, 0.75, 0.99, 1.1, -0.2].map(walkFrame)).toEqual([0, 1, 2, 3, 3, 0, 3]);
    expect(walkFrame(NaN)).toBe(0);
    expect(walkDir(5, 1)).toBe('e');
    expect(walkDir(-5, 1)).toBe('w');
    expect(walkDir(0, 3)).toBe('s');
    expect(walkDir(1, -3)).toBe('n');
    expect(walkDir(0, 0, 'n')).toBe('n');
    for (const z of [0.1, 0.25, 0.5, 1, 2, 4]) expect(walkerSize(z) * z).toBeGreaterThanOrEqual(WALKER.minPx - 1e-9);
    expect(walkerSize(2)).toBe(WALKER.h);
  });

  it('gets off the bus: hidden while the bus moves, then on the pavement; the tap ring fades', () => {
    expect(busArrivalHero(0.1).visible).toBe(false);
    expect(busArrivalHero(1).visible).toBe(true);
    expect(busArrivalHero(1).y).toBeGreaterThan(busArrivalHero(0.5).y);
    for (const k of [0, 0.2, 0.4, 0.5, 0.7, 0.9, 1, NaN]) clean((g) => drawBusArrival(g, { skin: 2, hair: 3, outfit: 1 }, 100, 100, k));
    for (const k of [0, 0.5, 0.99, 1, NaN]) clean((g) => drawWalkRing(g, 0, 0, k));
  });
});

describe('pay spots', () => {
  it('the five boards say the W2 prices and names', () => {
    expect(BUILD_IDS.map((id) => `${priceWords(BUILDS[id].bucket, BUILDS[id].price)} / ${BUILDS[id].name}`)).toEqual([
      '₦10 / New road',
      '₦4 / Mama Put',
      '₦8 / Market',
      'Power 10 / Lamps',
      'Tech 6 / Mast',
    ]);
  });

  it('boards show the price, "left" when part paid, and "Done" with a drawn tick; tap areas 48 px to 96 px wide', () => {
    for (const id of BUILD_IDS) {
      const full = BUILDS[id].price;
      for (const left of [full, Math.ceil(full / 2), 1, 0]) {
        const r = clean((g) => drawPriceBoard(g, 160, 240, id, left, { wobble: boardWobble(0.1) }));
        const want = left === 0 ? 'Done' : left < full ? `${priceWords(BUILDS[id].bucket, left)} left` : priceWords(BUILDS[id].bucket, left);
        expect(r.texts).toEqual([want, BUILDS[id].name]);
        const box = priceBoardBox(recorder().g, 160, 240, id, left);
        expect(box.w).toBeGreaterThanOrEqual(48);
        expect(box.w).toBeLessThanOrEqual(96);
        expect(box.h).toBeGreaterThanOrEqual(48);
      }
    }
  });

  it('a board on its short stick (W15, tiny screens): the same words, 48 px tall, 48 px to 84 px wide', () => {
    for (const id of BUILD_IDS) {
      const full = BUILDS[id].price;
      for (const left of [full, Math.ceil(full / 2), 1, 0]) {
        const r = clean((g) => drawPriceBoard(g, 160, 240, id, left, { short: true }));
        const want = left === 0 ? 'Done' : left < full ? `${priceWords(BUILDS[id].bucket, left)} left` : priceWords(BUILDS[id].bucket, left);
        expect(r.texts).toEqual([want, BUILDS[id].name]);
        const box = priceBoardBox(recorder().g, 160, 240, id, left, { short: true });
        expect(box.h).toBe(48);
        expect(box.w).toBeGreaterThanOrEqual(48);
        expect(box.w).toBeLessThanOrEqual(84);
        // The foot stays where the stick stands.
        expect(box.y + box.h).toBe(242);
      }
    }
  });

  it('the mat, the chalk outlines and the road build draw cleanly', () => {
    expect(MAT).toEqual({ w: 80, h: 56 });
    clean((g) => drawPayMat(g, 0, 0));
    clean((g) => drawPayMat(g, 0, 0, true));
    for (const id of BUILD_IDS) for (const f of [0, 0.5, 1, NaN]) clean((g) => drawBuildOutline(g, id, 500, 500, f));
    for (const k of [0, 0.3, 1, NaN]) clean((g) => drawRoadBuild(g, k, 2));
  });

  it('paying takes 0.8 s plus 0.1 s a unit, at most 1.6 s, with at most 12 pieces flying', () => {
    expect(payTime(4)).toBeCloseTo(1.2);
    expect(payTime(10)).toBe(PAY.max);
    expect(flyingCount(0)).toBe(1);
    expect(flyingCount(10)).toBe(10);
    expect(flyingCount(40)).toBe(12);
    const mid = moneyArc(0, 100, 200, 100, 0.5);
    expect(mid.y).toBeLessThan(100); // up and over
    expect(moneyArc(0, 100, 200, 100, 1)).toEqual({ x: 200, y: 100 });
    for (const kind of ['naira', 'power', 'tech'] as const) for (const k of [0, 0.4, 0.99, 1]) clean((g) => drawFlyingMoney(g, kind, 0, 0, 100, 50, k));
    expect(boardWobble(1)).toBe(0);
  });
});

describe('trays, collect line and edge arrows', () => {
  it('tray words follow W3', () => {
    expect(trayWords(80)).toBe('80 kobo');
    expect(trayWords(120)).toBe('₦1.20');
    expect(trayWords(150)).toBe('₦1.50');
    expect(trayWords(240)).toBe('₦2.40');
  });

  it('bubbles draw the amount and the word "Full", with a 48 px tap area', () => {
    for (const full of [false, true]) {
      const r = clean((g) => drawTrayBubble(g, 100, 100, 'naira', '₦1.50', full, 1));
      expect(r.texts).toEqual(full ? ['₦1.50', 'Full'] : ['₦1.50']);
      const b = trayBubbleBox(recorder().g, 100, 100, '80 kobo', full);
      expect(b.w).toBeGreaterThanOrEqual(48);
      expect(b.h).toBeGreaterThanOrEqual(48);
    }
    const r = clean((g) => drawCollectLine(g, 50, 50, '+₦1.20 from Mama Put', 0.5));
    expect(r.texts).toEqual(['+₦1.20 from Mama Put']);
    clean((g) => drawCollectLine(g, 50, 50, 'x', 0.2, true));
  });

  it('an edge arrow shows only for things off the screen, inside the edges, 44 px or more across', () => {
    expect(edgeArrowPlace(100, 100, 320, 240)).toBeNull();
    const left = edgeArrowPlace(-300, 120, 320, 240)!;
    expect(left.x).toBeCloseTo(EDGE_ARROW.inset);
    expect(Math.abs(left.angle)).toBeGreaterThan(Math.PI / 2);
    const below = edgeArrowPlace(160, 900, 320, 240, 40)!;
    expect(below.y).toBeCloseTo(240 - EDGE_ARROW.inset);
    expect(EDGE_ARROW.r * 2).toBeGreaterThanOrEqual(44);
    for (const icon of ['potholes', 'lightsOut', 'slowInternet', 'naira', 'power', 'tech'] as const) clean((g) => drawEdgeArrow(g, 30, 30, 1, icon));
  });
});

describe('the working places', () => {
  it('the Mama Put draws every step of a plate, full, still and going up; its only words are MAMA PUT', () => {
    for (const plate of [0, 0.2, 0.4, 0.7, 0.9, 1])
      for (const queue of [0, 1, 4])
        for (const full of [false, true]) {
          const r = clean((g) => drawMamaPut(g, 905, 760, { time: 3, plate, served: 7, queue, full }));
          expect(r.texts).toEqual(['MAMA PUT']);
        }
    for (const build of [0, 0.2, 0.5, 0.8, 1]) clean((g) => drawMamaPut(g, 0, 0, { build, still: true }));
    expect(MAMA_PUT.plateTime).toBe(6);
  });

  it('the market, danfo, porter, folk and plates draw cleanly with no words', () => {
    for (const stock of [0, 0.5, 1]) for (const build of [0.3, 0.6, 1]) expect(clean((g) => drawMarketPlace(g, 1320, 800, { stock, build })).texts).toEqual([]);
    for (let t = 0; t <= 1; t += 0.05) {
      const trip = danfoTrip(t);
      expect(trip.load).toBeGreaterThanOrEqual(0);
      expect(trip.stock).toBeGreaterThanOrEqual(0);
      expect(trip.stock).toBeLessThanOrEqual(1);
      clean((g) => drawMarketDanfo(g, 1320 + trip.dx, 818, trip.load, trip.door));
      if (trip.carry >= 0) clean((g) => drawPorter(g, 0, 0, 20, 20, trip.carry));
    }
    expect(danfoTrip(0.3, true)).toMatchObject({ dx: 0, load: 1, door: true, stock: 1 });
    FOLK.forEach((f) => {
      clean((g) => drawFolk(g, f, 0, 0, { step: 0.3, plate: true, happy: true }));
      clean((g) => drawFolk(g, f, 0, 0, { back: true }));
    });
    clean((g) => drawPlate(g, 0, 0));
  });
});
