/**
 * S3f1: the lane run's pictures and sounds (design.md S3f0 parts 5, 6, 9, 10, 16, 17 and 21).
 * Every picture draws cleanly (no NaN, save and restore balance) inside its box for baking,
 * the hero from behind shows every built look, things are big enough 1.5 s away at 320 x 240,
 * nothing has words on it, and the sounds play without a square wave and stay short.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AGES, BODIES, HAIRS, OUTFITS, SKINS } from '../../src/art/hero';
import {
  BUS_STOP_BOX,
  LANE_CAMERA,
  LANE_SCENERY,
  SCENERY_BOX,
  blackoutShare,
  drawBlackout,
  drawBlackoutWash,
  drawFootbridge,
  drawLaneBusStop,
  drawLaneLamp,
  drawLaneRoad,
  drawLaneSky,
  drawScenery,
  lampLookAt,
  laneBoost,
  laneCentre,
  laneFade,
  laneView,
  project,
} from '../../src/art/lane';
import { LANE_HERO_BOX, LANE_HERO_FRAMES, LANE_HERO_POSES, bakeLaneHero, drawLaneHero, laneHeroKey, laneRunFrame, laneStumbleFrame, laneTorchFrame } from '../../src/art/lane-hero';
import { LANE_U } from '../../src/art/lane-shade';
import { LANE_SOUNDS, LANE_SOUND_NAMES, addLaneSounds, laneStepFor, laneStepGap, laneTinkFor } from '../../src/art/lane-sounds';
import {
  BURST_TIME,
  LANE_BOXES,
  LANE_FRAMES,
  LANE_PICKUPS,
  LANE_THINGS,
  bakeLaneThings,
  bulbFrame,
  coinFrame,
  drawLaneBurst,
  drawLanePickup,
  drawLaneThing,
  goatChewFrame,
  hazardFrame,
  laneFamily,
  laneKey,
  lanePopAt,
} from '../../src/art/lane-things';
import { Sound, soundLength } from '../../src/engine/sound';
import { boundsContext, type Box } from './bounds-context';
import { recorder } from './recorder';

const inside = (b: Box, u: { l: number; r: number; t: number; b: number }, label: string): void => {
  expect(b.left, `${label} left`).toBeGreaterThanOrEqual(u.l);
  expect(b.right, `${label} right`).toBeLessThanOrEqual(u.r);
  expect(b.top, `${label} top`).toBeGreaterThanOrEqual(u.t);
  expect(b.bottom, `${label} bottom`).toBeLessThanOrEqual(u.b);
};

describe('the hero from behind', () => {
  it('has run 4, jump, slide, stumble 2, torch shrug 2 and wave frames', () => {
    expect(LANE_HERO_FRAMES).toEqual({ run: 4, jump: 1, slide: 1, stumble: 2, torch: 2, wave: 2 });
    expect(LANE_HERO_POSES.length).toBe(12);
  });

  it('every skin, hair, outfit, body and age, in every pose, with and without the suit: clean, inside its box, no words', () => {
    for (let skin = 0; skin < SKINS.length; skin++)
      for (let hair = 0; hair < HAIRS.length; hair++)
        for (let outfit = 0; outfit < OUTFITS.length; outfit++)
          for (let body = 0; body < BODIES.length; body++)
            for (let age = 0; age < AGES.length; age++) {
              const look = { skin, hair, outfit, body, age };
              for (const pose of LANE_HERO_POSES) {
                // Every pose for a spread of looks; every look in two poses (keeps the test quick)
                if ((skin + hair + outfit + body + age) % 3 !== 0 && pose.move !== 'run' && pose.move !== 'torch') continue;
                const c = boundsContext();
                drawLaneHero(c.g, look, { ...pose, suit: (skin + outfit) % 2 === 0 });
                const label = `${JSON.stringify(look)} ${pose.move}${pose.frame}`;
                expect(c.bad, label).toEqual([]);
                expect(c.depth(), label).toBe(0);
                inside(c.box, LANE_HERO_BOX, label);
              }
            }
    const r = recorder();
    drawLaneHero(r.g, { skin: 4, hair: 3, outfit: 3 }, { move: 'torch', frame: 1 });
    expect(r.texts).toEqual([]);
  }, 30_000);

  it('stands about 50 u (1.56 m) tall, so it is 56 px or more at 320 x 240', () => {
    const c = boundsContext();
    drawLaneHero(c.g, { skin: 2, hair: 0, outfit: 0, body: 0, age: 0 }, { move: 'run', frame: 1 });
    const h = c.box.bottom - c.box.top;
    expect(h).toBeGreaterThan(44);
    const v = laneView(320, 240);
    const p = project(v, 0, 0)!;
    expect((h / LANE_U) * p.ppm).toBeGreaterThanOrEqual(56);
  });

  it('a broken look draws as the first choices, not a crash', () => {
    const c = boundsContext();
    drawLaneHero(c.g, { skin: 99, hair: -1, outfit: Number.NaN, body: 7, age: 9 }, { move: 'run', frame: Number.NaN });
    expect(c.bad).toEqual([]);
    expect(c.drew()).toBe(true);
  });

  it('frame helpers', () => {
    expect([0, 0.25, 0.5, 0.75, 0.99, 1.1].map(laneRunFrame)).toEqual([0, 1, 2, 3, 3, 0]);
    expect(laneRunFrame(Number.NaN)).toBe(0);
    expect([laneStumbleFrame(0), laneStumbleFrame(0.6), laneStumbleFrame(Number.NaN)]).toEqual([0, 1, 0]);
    expect([laneTorchFrame(0.2), laneTorchFrame(0.8)]).toEqual([0, 1]);
    expect(laneHeroKey({ move: 'stumble', frame: 3 })).toBe('stumble1');
    expect(laneHeroKey({ move: 'run', frame: 2, suit: true })).toBe('run2Suit');
  });

  it('baking without a canvas (tests, old phones) gives nothing and does not throw', () => {
    expect(bakeLaneHero({ skin: 0, hair: 0, outfit: 0 }, 40).size).toBe(0);
    expect(bakeLaneThings(40).size).toBe(0);
  });
});

describe('road things and pickups', () => {
  it('every kind and frame draws cleanly inside its bake box, with no words (only the goat bubble "MEEH!")', () => {
    for (const k of [...LANE_THINGS, ...LANE_PICKUPS]) {
      const n = LANE_FRAMES[k] ?? 1;
      for (let f = 0; f < n; f++) {
        const c = boundsContext();
        if ((LANE_PICKUPS as readonly string[]).includes(k)) drawLanePickup(c.g, k as (typeof LANE_PICKUPS)[number], { frame: f });
        else drawLaneThing(c.g, k as (typeof LANE_THINGS)[number], { frame: f, time: f * 0.12 });
        expect(c.bad, k).toEqual([]);
        expect(c.depth(), k).toBe(0);
        expect(c.drew(), k).toBe(true);
        inside(c.box, LANE_BOXES[k], `${k} frame ${f}`);
        const r = recorder();
        if ((LANE_PICKUPS as readonly string[]).includes(k)) drawLanePickup(r.g, k as (typeof LANE_PICKUPS)[number], { frame: f });
        else drawLaneThing(r.g, k as (typeof LANE_THINGS)[number], { frame: f });
        for (const s of r.texts) expect(s, k).toBe('MEEH!');
      }
    }
  });

  it('families follow part 6', () => {
    expect(['danfo', 'cones', 'pothole', 'barrier'].map((k) => laneFamily(k as 'danfo'))).toEqual(['dodge', 'dodge', 'dodge', 'dodge']);
    expect(['crate:power', 'crate:tech', 'crate:coins', 'junk', 'sign'].map((k) => laneFamily(k as 'junk'))).toEqual(Array(5).fill('burst'));
    expect(laneFamily('goat')).toBe('goat');
  });

  it('every dodge thing is at least 10 px tall or wide 1.5 s before it arrives at 9, 13 and 16 m/s, at 320 x 240 (part 5)', () => {
    const v = laneView(320, 240);
    for (const speed of [9, 13, 16]) {
      const z = speed * 1.5;
      expect(z).toBeLessThanOrEqual(LANE_CAMERA.ahead);
      for (const k of ['danfo', 'cones', 'pothole', 'barrier'] as const) {
        const b = LANE_BOXES[k];
        const p = project(v, laneCentre(1), z)!;
        const px = (p.ppm * laneBoost(z)) / LANE_U;
        // The pothole lies flat: its width counts
        const size = Math.max((b.r - b.l) * px, k === 'pothole' ? 0 : (b.b - b.t) * px);
        expect(size, `${k} at ${speed} m/s`).toBeGreaterThanOrEqual(10);
      }
    }
  });

  it('frames: hazards blink (steady with reduced motion), goat chews, coin tilts gently, bulb breathes', () => {
    expect(new Set([0, 0.25, 0.5, 0.75].map((t) => hazardFrame(t))).size).toBe(2);
    expect(hazardFrame(0.3, true)).toBe(1);
    expect(new Set([0, 0.2, 0.4].map(goatChewFrame)).size).toBe(2);
    for (let t = 0; t < 4; t += 0.05) {
      expect(coinFrame(t)).toBeGreaterThanOrEqual(0);
      expect(coinFrame(t)).toBeLessThanOrEqual(4);
    }
    expect(coinFrame(1, true)).toBe(2);
    expect(bulbFrame(1, true)).toBe(0);
    expect(laneKey('coin', 7)).toBe('coin#2');
    expect(laneKey('cones', 3)).toBe('cones');
  });

  it('bursts draw cleanly, show nothing after the end, and pops fly to the chip', () => {
    for (const look of ['crate', 'junk', 'sign'] as const) {
      for (const p of [0, 0.3, 0.7, 0.99]) {
        for (const still of [false, true]) {
          const c = boundsContext();
          drawLaneBurst(c.g, look, p, still);
          expect(c.bad).toEqual([]);
          expect(c.depth()).toBe(0);
        }
      }
      const r = recorder();
      drawLaneBurst(r.g, look, 1);
      expect(r.calls.length).toBe(0);
    }
    expect(BURST_TIME).toBeLessThan(0.6);
    expect(lanePopAt(0, 100, 200, 0, 0)).toEqual({ x: 0, y: 100 });
    const end = lanePopAt(0, 100, 200, 0, 1);
    expect(end.x).toBeCloseTo(200);
    expect(end.y).toBeCloseTo(0);
  });
});

describe('the road, camera and Blackout', () => {
  it('camera: horizon 36 percent down, road 86 percent of the width at the hero', () => {
    const v = laneView(320, 240);
    expect(v.horizonY).toBeCloseTo(86.4);
    const l = project(v, -3.75, 0)!;
    const r = project(v, 3.75, 0)!;
    expect((r.x - l.x) / 320).toBeCloseTo(0.86);
    expect(project(v, 0, -5)).toBeNull();
    expect(laneBoost(0)).toBe(1);
    expect(laneBoost(34)).toBeCloseTo(1.6);
    expect(laneBoost(80)).toBeCloseTo(1.6);
    expect(laneFade(60)).toBe(0);
    expect(laneFade(55)).toBe(1);
  });

  it('the Blackout edge: none from 30 m, 35 percent at 0 m, never black', () => {
    expect(blackoutShare(30)).toBe(0);
    expect(blackoutShare(45)).toBe(0);
    expect(blackoutShare(0)).toBeCloseTo(0.35);
    expect(blackoutShare(15)).toBeCloseTo(0.175);
    expect(blackoutShare(Number.NaN)).toBe(0);
    const r = recorder();
    drawBlackout(r.g, 320, 240, 5);
    drawBlackoutWash(r.g, 320, 240, 1);
    expect(r.bad).toEqual([]);
    for (const c of r.colours) expect(c).not.toMatch(/^(#000|#000000|black|rgba\(0,0,0)/);
  });

  it('lamps: on, flicker and off; a flicker holds dim with reduced motion', () => {
    expect(lampLookAt('flicker', 0.3, true)).toBe('dim');
    expect(new Set([0, 0.25, 0.5].map((t) => lampLookAt('flicker', t)))).toEqual(new Set(['on', 'dim']));
    expect(lampLookAt('off', 1)).toBe('off');
  });

  it('sky, road, lamps, footbridge, scenery and the bus stop draw cleanly at 320 x 240 and 851 x 393', () => {
    for (const [w, h] of [[320, 240], [851, 393], [640, 200]] as const) {
      const v = laneView(w, h, 1.5);
      const r = recorder();
      drawLaneSky(r.g, w, v.horizonY);
      for (const d of [0, 3.3, 599.9, 12345]) drawLaneRoad(r.g, v, d);
      for (const z of [-3.9, 0, 10, 59]) for (const side of [-1, 1] as const) for (const look of ['on', 'flicker', 'off', 'dim'] as const) drawLaneLamp(r.g, v, z, side, look, 1.2);
      drawFootbridge(r.g, v, 30);
      drawFootbridge(r.g, v, -10);
      expect(r.bad, `${w} x ${h}`).toEqual([]);
      expect(r.depth()).toBe(0);
      expect(r.texts).toEqual([]);
    }
    for (const k of LANE_SCENERY) {
      const c = boundsContext();
      drawScenery(c.g, k, 0.7);
      expect(c.bad, k).toEqual([]);
      expect(c.depth(), k).toBe(0);
      inside(c.box, SCENERY_BOX, k);
    }
    for (const bright of [false, true]) {
      const c = boundsContext();
      drawLaneBusStop(c.g, 1, bright);
      expect(c.bad).toEqual([]);
      inside(c.box, BUS_STOP_BOX, 'bus stop');
      const r = recorder();
      drawLaneBusStop(r.g, 1, bright);
      expect(r.texts).toEqual([]); // a plain stop sign, no name
    }
  });
});

// ---------------------------------------------------------------- sounds

interface Played {
  wave: string;
  freq: number;
}
let played: Played[] = [];
class FakeParam {
  value = 1;
  constructor(private readonly onSet?: (v: number) => void) {}
  setValueAtTime(v: number): void {
    this.value = v;
    this.onSet?.(v);
  }
  linearRampToValueAtTime(): void {}
  exponentialRampToValueAtTime(): void {}
  cancelScheduledValues(): void {}
}
class FakeNode {
  connect<T>(n: T): T {
    return n;
  }
}
class FakeOsc extends FakeNode {
  type = 'sine';
  frequency = new FakeParam((v) => played.push({ wave: this.type, freq: v }));
  start(): void {}
  stop(): void {}
}
class FakeCtx {
  state = 'running';
  currentTime = 0;
  destination = new FakeNode();
  createOscillator(): FakeOsc {
    return new FakeOsc();
  }
  createGain(): FakeNode & { gain: FakeParam } {
    return Object.assign(new FakeNode(), { gain: new FakeParam() });
  }
  resume(): Promise<void> {
    return Promise.resolve();
  }
}

describe('the lane run sounds (part 17)', () => {
  beforeEach(() => {
    (globalThis as unknown as { window: unknown }).window = { AudioContext: FakeCtx };
    played = [];
  });
  afterEach(() => {
    delete (globalThis as unknown as { window?: unknown }).window;
  });

  it('are silent until added, then each plays, short, with no square wave', () => {
    const s = new Sound();
    s.unlock();
    addLaneSounds();
    expect(LANE_SOUND_NAMES.length).toBe(17);
    for (const name of LANE_SOUND_NAMES) {
      played = [];
      s.play(name);
      const hissOnly = LANE_SOUNDS[name].tones.length === 0;
      if (!hissOnly) expect(played.length, name).toBeGreaterThan(0);
      expect(played.filter((p) => p.wave === 'square'), name).toEqual([]);
      expect(soundLength(name), name).toBeGreaterThan(0);
      expect(soundLength(name), name).toBeLessThan(1.6);
    }
  });

  it('nothing plays with the Sound switch off', () => {
    const s = new Sound();
    s.unlock();
    addLaneSounds();
    s.enabled = false;
    s.play('laneBusStop');
    expect(played).toEqual([]);
  });

  it('the coin is one of three single notes (never a two-note rising coin), steps alternate and quicken', () => {
    expect([0, 0.34, 0.67, 0.999, Number.NaN].map(laneTinkFor)).toEqual(['laneTink0', 'laneTink1', 'laneTink2', 'laneTink2', 'laneTink0']);
    for (const n of ['laneTink0', 'laneTink1', 'laneTink2'] as const) {
      const notes = LANE_SOUNDS[n].tones.filter((t) => (t.at ?? 0) === 0 && t.vol! > 0.02);
      expect(notes.length).toBe(1);
    }
    expect([0, 1, 2, 3].map(laneStepFor)).toEqual(['laneStepA', 'laneStepB', 'laneStepA', 'laneStepB']);
    expect(laneStepGap(16)).toBeLessThan(laneStepGap(9));
    expect(laneStepGap(Number.NaN)).toBe(laneStepGap(9));
  });

  it('the close hum fades in, follows the Sound switch, and stops when asked', () => {
    const s = new Sound();
    s.setCloseHum(true);
    expect(s.closeHumming).toBe(false); // nothing before the first tap
    s.unlock();
    expect(s.closeHumming).toBe(true);
    expect(s.humming).toBe(false); // the suit's hum is separate
    s.enabled = false;
    expect(s.closeHumming).toBe(false);
    s.enabled = true;
    expect(s.closeHumming).toBe(true);
    s.setCloseHum(false);
    expect(s.closeHumming).toBe(false);
  });
});
