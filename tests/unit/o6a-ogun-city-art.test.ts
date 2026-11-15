/**
 * O6a: Ogun's city map, challenge road and Expressway art (docs/ogun.md 6.1 to 6.6, part 7;
 * decisions 75, 77, 80). Pins, places and stops sit where they should, every vehicle look uses
 * the danfo's box, a spot's vehicle never changes, the pin words are 6.2's, no umbrella, broom or
 * holy thing is drawn, and every piece draws with good numbers, still or moving.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { LANE_BOXES } from '../../src/art/lane-things';
import { laneView } from '../../src/art/lane';
import * as city from '../../src/worlds/ogun/city';
import * as places from '../../src/worlds/ogun/places';
import * as road from '../../src/worlds/ogun/road';
import * as xw from '../../src/worlds/ogun/expressway';

function fakeCanvas(): { g: CanvasRenderingContext2D; bad: string[] } {
  const bad: string[] = [];
  const fn = (name: string) => (...args: unknown[]) => {
    for (const a of args) if (typeof a === 'number' && !Number.isFinite(a)) bad.push(`${name}(${args.join(', ')})`);
    return proxy;
  };
  const proxy: object = new Proxy({}, { get: (_t, k) => (typeof k === 'string' ? fn(k) : undefined), set: () => true });
  return { g: proxy as CanvasRenderingContext2D, bad };
}

const inMap = (p: { x: number; y: number }): boolean => p.x >= 0 && p.x <= city.OGUN_MAP.w && p.y >= 0 && p.y <= city.OGUN_MAP.h;

describe('O6a Ogun city map', () => {
  it("uses 6.2's pin words and keeps every pin, place and label on the map", () => {
    expect(city.OGUN_SPOT_WORDS).toEqual({ potholes: 'Potholes', dryTaps: 'Dry taps', lightsOut: 'Lights out', slowInternet: 'Slow internet', badRoad: 'Bad road' });
    for (const id of city.OGUN_SPOT_IDS) {
      const s = city.OGUN_SPOTS[id];
      expect(inMap(s.pin), id).toBe(true);
      if (s.area) expect(city.OGUN_CITY_AREAS, id).toContain(s.area);
    }
    for (const p of Object.values(city.OGUN_PLACES)) {
      const b = city.OGUN_BLOCKS.find((q) => q.id === p.block)!;
      expect(p.x).toBeGreaterThan(b.x);
      expect(p.x).toBeLessThan(b.x + b.w);
      expect(p.y).toBeLessThanOrEqual(b.y + b.d);
    }
    expect(inMap(city.BORDER_PIN)).toBe(true);
    for (const l of Object.values(city.OGUN_AREA_LABELS)) expect(inMap(l)).toBe(true);
  });

  it('has 11 blocks and a motor park and water point, none overlapping', () => {
    const boxes = [...city.OGUN_BLOCKS.map((b) => ({ id: b.id, x: b.x, y: b.y, w: b.w, h: b.d })), { id: 'park', ...city.MOTOR_PARK }, { id: 'water', ...city.WATER_POINT }];
    expect(city.OGUN_BLOCKS).toHaveLength(11);
    for (const a of boxes)
      for (const b of boxes) {
        if (a === b) continue;
        const apart = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
        expect(apart, `${a.id} ${b.id}`).toBe(true);
      }
  });

  it('draws the whole city, its pins and places with good numbers, tired, ready, bright and still', () => {
    const { g, bad } = fakeCanvas();
    for (const look of ['problem', 'ready', 'fixed'] as const) {
      const looks = Object.fromEntries(city.OGUN_SPOT_IDS.map((k) => [k, look])) as city.OgunSpotLooks;
      city.drawOgunCity(g, looks, { bright: look === 'fixed' ? city.OGUN_CITY_AREAS : [], boom: look === 'fixed', built: look === 'fixed' ? ['adire', 'mill', 'kola'] : [] });
      for (const id of city.OGUN_SPOT_IDS) city.drawOgunPin(g, 100, 100, id, look === 'ready' ? 'ready' : 'problem', 2);
    }
    city.drawBorderIcon(g, 10, 10);
    for (const t of [0, 1.3, 7.9, NaN])
      for (const still of [false, true]) {
        const st = { time: t, sale: t / 8, stock: 0.5, still, served: 3 };
        places.drawAdireMarket(g, 0, 0, st);
        places.drawGarriMill(g, 0, 0, st);
        places.drawKolaMarket(g, 0, 0, st);
        places.drawAdireMarket(g, 0, 0, { build: t / 2 });
      }
    for (const k of ['tipper', 'lorry', 'tanker'] as const) for (const d of ['e', 'w', 'n', 's'] as const) city.drawOgunTruck(g, 0, 0, d, k, true, 0.4);
    expect(bad).toEqual([]);
  });
});

describe('O6a Ogun challenge road', () => {
  it('lays out the stops of 6.5 as 112 x 64 plates inside the picture, never overlapping in a row', () => {
    expect([...road.OGUN_ROAD_STOPS].sort()).toEqual(['abeokuta', 'border', 'expressway', 'hall', 'ota', 'sagamu', 'toLagos', 'wayOn']);
    const boxes = road.OGUN_ROAD_STOPS.map((id) => ({ id, ...road.OGUN_STOP_BOX[id] }));
    for (const b of boxes) {
      expect(b.w).toBe(112);
      expect(b.h).toBe(64);
      expect(b.x + b.w).toBeLessThanOrEqual(road.OGUN_ROAD.w);
      expect(b.y + b.h).toBeLessThanOrEqual(road.OGUN_ROAD.h);
    }
    for (const a of boxes) for (const b of boxes) if (a !== b && a.y === b.y) expect(a.x + a.w <= b.x || b.x + b.w <= a.x, `${a.id} ${b.id}`).toBe(true);
  });

  it('draws the road picture and the card pictures with good numbers', () => {
    const { g, bad } = fakeCanvas();
    for (const lit of [false, true]) for (const next of [null, ...road.OGUN_ROAD_STOPS]) road.drawOgunRoadPicture(g, { lit, next });
    for (const id of ['toLagos', 'wayOn', 'border'] as const) road.drawOgunCardPicture(g, id, 112, 84, 1.2, false);
    for (const cut of Object.values(road.OGUN_CARD_CUTS)) expect(cut.w / cut.h).toBeCloseTo(4 / 3, 5);
    expect(bad).toEqual([]);
  });
});

describe('O6a Expressway', () => {
  it("draws tippers, tankers and danfos in the danfo's box, and a spot keeps its look", () => {
    expect(xw.VEHICLE_BOX).toEqual(LANE_BOXES.danfo);
    const seen = new Set<string>();
    for (let m = 0; m < 600; m += 7) for (let lane = 0; lane < 3; lane++) {
      const v = xw.expresswayVehicleAt(m, lane);
      expect(xw.expresswayVehicleAt(m, lane)).toBe(v);
      seen.add(v);
    }
    expect([...seen].sort()).toEqual(['danfo', 'tanker', 'tipper']);
  });

  it('draws the sky, road, vehicles, pickups, scenery, fronts, bus stop and a whole frame with good numbers', () => {
    const { g, bad } = fakeCanvas();
    xw.drawExpresswaySky(g, 640, 150);
    for (const d of [0, 3.3, 599]) xw.drawExpresswayRoad(g, laneView(640, 420), d);
    for (const v of xw.EXPRESSWAY_VEHICLES) for (const lit of [false, true]) xw.drawExpresswayVehicle(g, v, lit);
    xw.drawExpresswayPickup(g, 'garri');
    xw.drawExpresswayPickup(g, 'corn');
    for (const k of xw.EXPRESSWAY_SCENERY) for (const t of [0, 1.7]) xw.drawExpresswayScenery(g, k, t);
    for (const w of ['empty', 'lean', 'wave0', 'wave1', 'glow'] as const) xw.drawExpresswayFront(g, { wall: 3, windows: [w, w], door: w === 'glow' ? 'shut' : 'open' });
    for (const bright of [false, true]) xw.drawExpresswayBusStop(g, 0.5, bright);
    for (const still of [false, true]) xw.drawExpresswayDemo(g, 640, 420, 42, 1.1, still);
    expect(bad).toEqual([]);
    expect(xw.vehicleKey('tipper', 3)).toBe('tipper#1');
  });
});

describe('O6a originality and pride', () => {
  const src = ['city', 'places', 'road', 'expressway'].map((f) => readFileSync(`src/worlds/ogun/${f}.ts`, 'utf8')).join('\n');
  // Code only: comments may say what we never draw.
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  it('draws no umbrella, broom, shrine, crest, flag, pipe or mushroom, and no brand words', () => {
    expect(code).not.toMatch(/umbrella|broom|shrine|crest|flag|pipe|mushroom|question/i);
    expect(code).not.toMatch(/drawFoldedUmbrella|drawFruitUmbrella|drawProudFolk/);
  });
  it('writes only the made-up words: the pin words, BORDER MARKET and the gallery plates', () => {
    const words = [...code.matchAll(/fillText\('([^']+)'/g)].map((m) => m[1]);
    expect(words).toEqual(['BORDER MARKET']);
  });
});
