/**
 * S3d1a (city.md part 5 step (d)): tired and bright Lagos, the first boom's additions, the
 * Booming meter and the coming-soon pins, plus the four new sounds. Everything draws cleanly,
 * writes no words on the map, matches the d2 table and never puts a kerb sack near food.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  BLOCK_LIFE,
  BRIGHT_BOOST,
  PROUD_KINDS,
  TIRED_COLOURS,
  TIRED_MIX,
  TIRED_ROOF_DIM,
  TIRED_ROOF_DUST,
  TIRED_SAND,
  brightColour,
  drawProudFolk,
  fadeColour,
  tiredColour,
  tiredRoof,
  tiredTotals,
} from '../../src/art/bright';
import { BOOM_BAR, BOOM_EMPTY, BOOM_YELLOW, boomBarParts, boomBarSvg, boomIconSvg, drawBoomBar, drawBoomIcon } from '../../src/art/boomMeter';
import {
  CITY_AREAS,
  CITY_BLOCKS,
  CITY_COLOURS,
  FLATS,
  SOON_IDS,
  SOON_LINE,
  SOON_PINS,
  SOON_WORDS,
  areaBright,
  drawBoomFlats,
  drawBusShelter,
  drawCity,
  drawCityBlock,
  drawCityBus,
  drawCityGround,
  drawComingSoonPin,
  drawSoonIcon,
  flatsBox,
  kerbSackSpot,
  proudSpot,
  soonPinHitBox,
  type CityOpts,
} from '../../src/art/city';
import { Sound, soundLength, type SoundName } from '../../src/engine/sound';
import { boundsContext } from './bounds-context';
import { hsl, recorder } from './recorder';

function clean(paint: (g: CanvasRenderingContext2D) => void): ReturnType<typeof recorder> {
  const r = recorder();
  paint(r.g);
  expect(r.bad).toEqual([]);
  expect(r.depth()).toBe(0);
  return r;
}

/** Relative luminance (0 dark to 1 light) of a #rrggbb colour: what a greyscale picture shows. */
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number): number => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f((n >> 16) & 255) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255);
}

const NONE: readonly string[] = [];
const OPTS: CityOpts[] = [
  {},
  { bright: NONE },
  { bright: CITY_AREAS },
  { bright: ['r0c0', 'r1c0', 'r2c0', 'r1c1', 'r2c2', 'busPark', 'r1c2'] },
  { bright: CITY_AREAS, boom: true },
  { bright: CITY_AREAS, boom: true, flats: false, market: true, jetty: false },
  { bright: NONE, boom: true },
];

describe('tired and bright Lagos (d2)', () => {
  // d2's totals line says 18 shutters, but its block-by-block rows add up to 15 (2+1+0+2+2+1+1+2+2+1+1+0); the rows win.
  it('the d2 table: 12 blocks, 15 shutters (the rows), 9 kerb sacks, 12 tired people, someone proud on every block', () => {
    expect(Object.keys(BLOCK_LIFE).sort()).toEqual(CITY_BLOCKS.map((b) => b.id).sort());
    expect(tiredTotals()).toEqual({ shutters: 15, sacks: 9, people: 12 });
    for (const b of CITY_BLOCKS) {
      const l = BLOCK_LIFE[b.id]!;
      expect(PROUD_KINDS).toContain(l.proud);
      if (!b.kind) expect(l.fronts, b.id).toBe(b.boxes.length);
      expect(l.people).toBeGreaterThan(l.tiredPeople);
    }
    expect(BLOCK_LIFE['r1c3']!.people).toBe(9);
    expect(BLOCK_LIFE['r2c1']!.people).toBe(9);
  });

  it('tired colours lean 50% toward warm sand (Tp, 13 Nov: stronger); the tired-only colours are warm, never blue', () => {
    expect(TIRED_MIX).toBe(0.5);
    expect(TIRED_ROOF_DIM).toBe(0.22);
    expect(BRIGHT_BOOST).toBe(0.18);
    expect(fadeColour('#000000')).toBe(fadeColour('#000000', TIRED_MIX, TIRED_SAND));
    const s = parseInt(TIRED_SAND.slice(1), 16);
    const f = parseInt(fadeColour('#000000').slice(1), 16);
    expect((f >> 16) & 255).toBe(Math.round(((s >> 16) & 255) * 0.5));
    expect(fadeColour(TIRED_SAND)).toBe(TIRED_SAND);
    expect(fadeColour('not a colour')).toBe('not a colour');
    expect(tiredColour('not a colour')).toBe('not a colour');
    expect(brightColour('not a colour')).toBe('not a colour');
    for (const c of [TIRED_COLOURS.window, TIRED_COLOURS.leaves, TIRED_COLOURS.dryGrass, TIRED_COLOURS.lot, TIRED_COLOURS.kerb, TIRED_SAND, TIRED_ROOF_DUST]) {
      const h = hsl(c)!;
      expect(h.h, c).toBeGreaterThanOrEqual(20);
      expect(h.h, c).toBeLessThanOrEqual(70);
      expect(h.s, c).toBeGreaterThan(0.1);
    }
    // Every wall and roof, tired, keeps a warm colour (never grey, never cold)
    for (const b of CITY_BLOCKS)
      for (const q of b.boxes) {
        expect(hsl(tiredColour(q.wall))!.s, q.wall).toBeGreaterThan(0.15);
        const r = hsl(tiredRoof(q.roof))!;
        expect(r.s, q.roof).toBeGreaterThan(0.12);
        expect(r.h, q.roof).toBeGreaterThanOrEqual(10);
        expect(r.h, q.roof).toBeLessThanOrEqual(75);
      }
  });

  it('tired and bright differ in lightness, not hue alone (greyscale and colour-blind safe)', () => {
    let gap = 0;
    let n = 0;
    for (const b of CITY_BLOCKS)
      for (const q of b.boxes) {
        // Roofs are what you see most at far zoom: tired is darker by at least 0.08 (relative luminance)
        const d = luminance(brightColour(q.roof)) - luminance(tiredRoof(q.roof));
        expect(d, q.roof).toBeGreaterThan(0.08);
        gap += d;
        n++;
        // Bright: more colour, same lightness
        const was = hsl(q.wall)!;
        const now = hsl(brightColour(q.wall))!;
        expect(now.s).toBeGreaterThanOrEqual(was.s);
        expect(Math.abs(now.l - was.l)).toBeLessThan(0.01);
      }
    expect(gap / n).toBeGreaterThan(0.15);
    // The tired pavement is a little dustier (darker) than the bright cream
    expect(luminance(CITY_COLOURS.lot) - luminance(TIRED_COLOURS.lot)).toBeGreaterThan(0.08);
  });

  it('the whole city draws cleanly in every state, with no words on the map', () => {
    for (const o of OPTS) {
      const r = clean((g) => drawCity(g, undefined, o));
      expect(r.texts).toEqual([]);
      clean((g) => drawCityGround(g, o));
    }
  });

  it('every block looks different tired and bright, and draws its shutters and sacks as the table says', () => {
    for (const b of CITY_BLOCKS) {
      const tired = clean((g) => drawCityBlock(g, b, b.spot ? 'problem' : 'fixed', { bright: NONE }));
      const bright = clean((g) => drawCityBlock(g, b, 'fixed', { bright: [b.id] }));
      expect(JSON.stringify(tired.calls)).not.toBe(JSON.stringify(bright.calls));
      const l = BLOCK_LIFE[b.id]!;
      const shutters = tired.colours.filter((c) => c === TIRED_COLOURS.shutter).length;
      expect(shutters, b.id).toBe(l.shutters + (l.proud === 'opener' ? 1 : 0) + (b.kind === 'park' ? 1 : 0));
      expect(tired.colours.filter((c) => c === '#e8e0cc').length, b.id).toBe(l.sacks);
      expect(bright.colours.filter((c) => c === '#e8e0cc').length, b.id).toBe(0);
      // Tired windows are warm brown; bright windows get the white glint
      if (!b.spot && !b.kind) {
        expect(tired.colours).toContain(TIRED_COLOURS.window);
        expect(bright.colours).not.toContain(TIRED_COLOURS.window);
      }
    }
  });

  it('kerb sacks are never near food: none on the Mama Put or market blocks, and far from both places', () => {
    expect(kerbSackSpot(CITY_BLOCKS.find((b) => b.id === 'r2c2')!)).toBeNull();
    expect(kerbSackSpot(CITY_BLOCKS.find((b) => b.id === 'r2c3')!)).toBeNull();
    const food = [
      { x: 905, y: 760 }, // Mama Put
      { x: 1320, y: 800 }, // the Market
    ];
    let n = 0;
    for (const b of CITY_BLOCKS) {
      const s = kerbSackSpot(b);
      if (!s) continue;
      n++;
      for (const f of food) expect(Math.hypot(s.x - f.x, s.y - f.y), b.id).toBeGreaterThan(120);
      // On its own lot
      expect(s.x).toBeGreaterThanOrEqual(b.x);
      expect(s.x).toBeLessThanOrEqual(b.x + b.w);
    }
    expect(n).toBe(9);
  });

  it('areas: no list means all bright (the old look); ids are the 12 blocks, the bus park and the shore', () => {
    expect(CITY_AREAS).toHaveLength(14);
    expect(areaBright({}, 'r0c0')).toBe(true);
    expect(areaBright({ bright: [] }, 'r0c0')).toBe(false);
    expect(areaBright({ bright: ['busPark'] }, 'busPark')).toBe(true);
  });

  it('proud people of every kind draw cleanly and stay small, standing on their block', () => {
    for (const k of PROUD_KINDS)
      for (let i = 0; i < 6; i++) {
        const r = boundsContext();
        drawProudFolk(r.g, 0, 0, k, i);
        expect(r.bad).toEqual([]);
        expect(r.depth()).toBe(0);
        expect(r.box.left).toBeGreaterThan(-14);
        expect(r.box.right).toBeLessThan(14);
        expect(r.box.top).toBeGreaterThan(-20);
        expect(r.box.bottom).toBeLessThan(4);
      }
    for (const b of CITY_BLOCKS) {
      const p = proudSpot(b);
      expect(p.x).toBeGreaterThan(b.x);
      expect(p.x).toBeLessThan(b.x + b.w);
      expect(p.y).toBeGreaterThan(b.y);
      expect(p.y).toBeLessThanOrEqual(b.y + b.d);
    }
  });

  it('a faded danfo and the bus shelter draw cleanly', () => {
    for (const d of ['e', 'w', 'n', 's'] as const) clean((g) => drawCityBus(g, 10, 10, d, true));
    clean((g) => drawBusShelter(g, 0, 0, 100));
  });
});

describe('the first boom (d4)', () => {
  it('the flats rise on r1c1 by 48 and draw cleanly while growing', () => {
    expect(FLATS).toEqual({ block: 'r1c1', rise: 48 });
    const b = CITY_BLOCKS.find((q) => q.id === 'r1c1')!;
    expect(b.boxes).toContain(flatsBox());
    for (const k of [0, 0.25, 0.5, 1, Number.NaN, -1, 2]) clean((g) => drawBoomFlats(g, k));
    const before = clean((g) => drawCityBlock(g, b, 'fixed', { bright: ['r1c1'] }));
    const after = clean((g) => drawCityBlock(g, b, 'fixed', { bright: ['r1c1'], boom: true }));
    const noFlats = clean((g) => drawCityBlock(g, b, 'fixed', { bright: ['r1c1'], boom: true, flats: false }));
    expect(JSON.stringify(after.calls)).not.toBe(JSON.stringify(before.calls));
    expect(JSON.stringify(noFlats.calls)).toBe(JSON.stringify(before.calls));
  });

  it('coming-soon pins: the word, then "Coming soon"; a padlock; a tap area of at least 48 x 56', () => {
    expect(SOON_PINS).toEqual({ goSlow: { x: 488, y: 559 }, crowdedBuses: { x: 821, y: 640 } });
    for (const id of SOON_IDS) {
      const r = clean((g) => drawComingSoonPin(g, 100, 200, id, 1));
      expect(r.texts).toEqual([SOON_WORDS[id], SOON_LINE]);
      clean((g) => drawComingSoonPin(g, 100, 200, id, Number.NaN));
      clean((g) => drawSoonIcon(g, id, 0, 0));
      const h = soonPinHitBox(100, 200, id);
      expect(h.w).toBeGreaterThanOrEqual(48);
      expect(h.h).toBeGreaterThanOrEqual(56);
    }
    expect(SOON_LINE).toBe('Coming soon');
    expect(SOON_WORDS).toEqual({ goSlow: 'Go-slow', crowdedBuses: 'Crowded buses' });
  });
});

describe('the Booming meter (d5)', () => {
  it('5 step boxes, 2 px gaps; 18 x 10 wide and 12 x 8 small', () => {
    const w = boomBarParts(0, 4);
    expect(w.steps).toHaveLength(5);
    expect(w.steps[0]!.w).toBe(18);
    expect(w.steps[0]!.h).toBe(10);
    expect(w.steps[1]!.x - w.steps[0]!.x).toBe(20);
    expect(w.w).toBe(98);
    const s = boomBarParts(0, 4, true);
    expect(s.steps[0]!.w).toBe(12);
    expect(s.steps[0]!.h).toBe(8);
    expect(s.w).toBe(68);
    expect(BOOM_BAR.outline).toBe(2);
  });

  it('fills notch by notch; a full step gets a tick; 9 of 20 and 24 of 50 read right', () => {
    const nine = boomBarParts(9, 4);
    expect(nine.steps.flatMap((st) => st.notches).filter((n) => n.filled)).toHaveLength(9);
    expect(nine.steps.map((st) => st.full)).toEqual([true, true, false, false, false]);
    expect(nine.steps.map((st) => st.notches.length)).toEqual([4, 4, 4, 4, 4]);
    const after = boomBarParts(24 - 20, 30 / 5);
    expect(after.steps[0]!.notches).toHaveLength(6);
    expect(after.steps.flatMap((st) => st.notches).filter((n) => n.filled)).toHaveLength(4);
    expect(after.steps.every((st) => !st.full)).toBe(true);
    // Never more than full, never below empty, bad numbers are empty
    expect(boomBarParts(99, 4).steps.every((st) => st.full)).toBe(true);
    expect(boomBarParts(-3, 4).steps.some((st) => st.full)).toBe(false);
    expect(boomBarParts(Number.NaN, Number.NaN).steps.some((st) => st.full)).toBe(false);
  });

  it('draws on a canvas and as SVG with no words (the words are HTML), aria-hidden', () => {
    for (const small of [false, true])
      for (let p = 0; p <= 20; p++) {
        const r = clean((g) => drawBoomBar(g, 4, 4, p, 4, small));
        expect(r.texts).toEqual([]);
      }
    const svg = boomBarSvg(9, 4);
    expect(svg).toContain('aria-hidden="true"');
    expect(svg).not.toContain('<text');
    expect(svg.match(/stroke-width="2"/g)).toHaveLength(5);
    expect(svg.match(/<path/g)).toHaveLength(2);
    expect(svg).toContain(BOOM_YELLOW);
    expect(svg).toContain(BOOM_EMPTY);
    expect(BOOM_YELLOW).toBe('#f2b300');
    expect(BOOM_EMPTY).toBe('#fffaf0');
    clean((g) => drawBoomIcon(g, 0, 0, 16));
    clean((g) => drawBoomIcon(g, 0, 0, Number.NaN));
    expect(boomIconSvg(14)).toContain('width="14"');
    expect(boomIconSvg()).not.toContain('<text');
  });
});

// ---------- Sounds (d7) ----------

let gains: number[] = [];
let oscs = 0;
class FakeParam {
  setValueAtTime(): void {}
  linearRampToValueAtTime(v: number): void {
    gains.push(v);
  }
  exponentialRampToValueAtTime(): void {}
}
class FakeNode {
  connect<T>(n: T): T {
    return n;
  }
}
class FakeAudioContext {
  state = 'running';
  currentTime = 0;
  sampleRate = 8000;
  destination = new FakeNode();
  createOscillator(): unknown {
    oscs++;
    return Object.assign(new FakeNode(), { type: 'sine', frequency: new FakeParam(), start() {}, stop() {} });
  }
  createGain(): unknown {
    return Object.assign(new FakeNode(), { gain: new FakeParam() });
  }
  createBuffer(): unknown {
    return { getChannelData: () => new Float32Array(10) };
  }
  createBufferSource(): unknown {
    return Object.assign(new FakeNode(), { buffer: null, start() {}, stop() {} });
  }
  createBiquadFilter(): unknown {
    return Object.assign(new FakeNode(), { type: 'lowpass', frequency: new FakeParam() });
  }
  resume(): Promise<void> {
    return Promise.resolve();
  }
}

function loudest(name: SoundName): number {
  gains = [];
  const s = new Sound();
  s.unlock();
  gains = [];
  s.play(name);
  return Math.max(0, ...gains.filter((v) => v < 0.5));
}

describe('the Booming sounds (d7)', () => {
  beforeEach(() => {
    (globalThis as unknown as { window: unknown }).window = { AudioContext: FakeAudioContext };
  });
  afterEach(() => {
    delete (globalThis as unknown as { window?: unknown }).window;
  });

  it('are as long as the note says: sting 1.2 s, step 0.5 s, boom 2 s, horn 0.3 s', () => {
    expect(soundLength('sting')).toBeCloseTo(1.2, 1);
    expect(soundLength('step')).toBeGreaterThan(0.4);
    expect(soundLength('step')).toBeLessThanOrEqual(0.5);
    expect(soundLength('boom')).toBeCloseTo(2.0, 1);
    expect(soundLength('horn')).toBeGreaterThan(0.25);
    expect(soundLength('horn')).toBeLessThanOrEqual(0.3);
  });

  it('the horn is soft: quieter than the coin chink', () => {
    expect(loudest('horn')).toBeGreaterThan(0);
    expect(loudest('horn')).toBeLessThan(loudest('payChink'));
  });

  it('all four are silent with Sound off', () => {
    for (const n of ['sting', 'step', 'boom', 'horn'] as const) {
      const s = new Sound();
      s.unlock();
      s.enabled = false;
      oscs = 0;
      s.play(n);
      expect(oscs, n).toBe(0);
      s.enabled = true;
      s.play(n);
      expect(oscs, n).toBeGreaterThan(0);
    }
  });
});
