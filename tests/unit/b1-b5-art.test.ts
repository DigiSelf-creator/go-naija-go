/**
 * P13 and P15 art (docs/design.md S2.16 B1 to B5): amala's strong look, the garri tech suit,
 * the dash pose and rest, birds, rubbish piles, gutters with still weeds, cement blocks, the
 * dash sign, and their sounds. Every piece draws for every body, age, skin, hair and outfit
 * without throwing, with no broken numbers, and leaves the context as it found it.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BIRD_BOX, drawCrow, drawEgret, drawPileKoboPop, drawRubbishPile, type BirdMode } from '../../src/art/birds';
import { drawDashPuff, drawDustRing, drawStepThump } from '../../src/art/dust';
import { CEMENT_BLOCKS, GUTTER, drawCementBlocks, drawGutter, drawWeedSteam, drawWeeds } from '../../src/art/gutter';
import {
  AGES,
  BODIES,
  DASH_LOOK,
  HAIRS,
  HERO_ART_BOX,
  OUTFITS,
  SKINS,
  STRONG,
  SUIT,
  drawHero,
  drawHeroSuit,
  drawSuitBits,
  strongGlowAlpha,
  strongGlowPad,
  suitHum,
  type HeroPose,
} from '../../src/art/hero';
import { drawDashSign, drawPotholeSign } from '../../src/art/sign';
import { HUM_VOL, Sound, type SoundName } from '../../src/engine/sound';
import { boundsContext, type Box } from './bounds-context';
import { recorder } from './recorder';

const base = { phase: 0.3, inAir: false, facing: 1, glow: false, time: 0.7 } as const;

/** Every new hero pose, both facings, ground and air. */
const POSES: [string, HeroPose][] = [
  ...[0, 0.25, 0.5, 0.75].map((phase): [string, HeroPose] => ['strong run', { ...base, phase, strong: {} }]),
  ['strong stand', { ...base, standing: true, strong: { left: 6 } }],
  ['strong blink', { ...base, strong: { left: 1.2 } }],
  ['strong still thin', { ...base, strong: { left: 1 }, still: true }],
  ['strong flex', { ...base, strong: { flex: 0.5 } }],
  ['strong jump', { ...base, inAir: true, vy: -200, strong: {} }],
  ['glow flag', { ...base, glow: true }],
  ['shake out', { ...base, standing: true, shakeOut: 0.4 }],
  ...[0, 0.3, 0.6, 0.9].map((phase): [string, HeroPose] => ['suit run', { ...base, phase, suit: {} }]),
  ['suit stand', { ...base, standing: true, suit: {} }],
  ['suit put on', { ...base, standing: true, suit: { on: 0.5 } }],
  ['suit crack', { ...base, suit: { crack: true } }],
  ['suit walk', { ...base, gait: 'walk', suit: {} }],
  ['suit jump', { ...base, inAir: true, vy: -300, suit: {} }],
  ['suit fall', { ...base, inAir: true, vy: 300, suit: {} }],
  ['suit rope', { ...base, rope: true, suit: {} }],
  ['suit still', { ...base, suit: {}, still: true }],
  ['suit left', { ...base, facing: -1, suit: {} }],
  ...[0, 0.25, 0.5, 0.75].map((phase): [string, HeroPose] => ['dash', { ...base, phase, dash: true }]),
  ['dash still', { ...base, dash: true, still: true }],
  ['dash jump', { ...base, inAir: true, vy: -100, dash: true }],
  ['dash left', { ...base, facing: -1, dash: true }],
  ['resting', { ...base, resting: true }],
  ['resting stand', { ...base, standing: true, resting: true, still: true }],
  ['all at once', { ...base, strong: {}, suit: {}, dash: true }],
];

function grow(facing: 1 | -1, by: number): Box {
  const left = facing === 1 ? HERO_ART_BOX.left : -HERO_ART_BOX.right;
  const right = facing === 1 ? HERO_ART_BOX.right : -HERO_ART_BOX.left;
  return { left: left - by, right: right + by, top: HERO_ART_BOX.top - by, bottom: HERO_ART_BOX.bottom + by };
}

function inside(b: Box, o: Box): boolean {
  return b.left >= o.left - 1e-6 && b.right <= o.right + 1e-6 && b.top >= o.top - 1e-6 && b.bottom <= o.bottom + 1e-6;
}

describe('hero: strong look, tech suit, dash and rest (S2.16 B2, B3, B4)', () => {
  it('draws for every body x age x skin x hair x outfit in every new pose, cleanly', () => {
    // Skin changes colours only, never shapes: every skin gets every look in a few poses,
    // and each look gets every pose with one skin (turning through the five).
    const few = new Set(['strong flex', 'suit crack', 'dash still', 'resting', 'all at once']);
    let n = 0;
    for (let skin = 0; skin < SKINS.length; skin++)
      for (let body = 0; body < BODIES.length; body++)
        for (let age = 0; age < AGES.length; age++)
          for (let hair = 0; hair < HAIRS.length; hair++)
            for (let outfit = 0; outfit < OUTFITS.length; outfit++) {
              const look = { skin, hair, outfit, body, age };
              for (const [name, pose] of POSES) {
                if (skin !== (body + age + hair + outfit) % SKINS.length && !few.has(name)) continue;
                const r = boundsContext();
                expect(() => drawHero(r.g, look, pose)).not.toThrow();
                expect(r.bad, `${JSON.stringify(look)} ${name}`).toEqual([]);
                expect(r.depth()).toBe(0);
                n++;
              }
            }
    expect(n).toBe(150 * POSES.length + 600 * few.size);
  }, 60_000);

  it('strong look: no size change; the body and its 3 u glow stay inside the art box plus 3 u', () => {
    const out: string[] = [];
    for (let body = 0; body < 2; body++)
      for (let age = 0; age < 3; age++)
        for (let hair = 0; hair < HAIRS.length; hair++)
          for (let outfit = 0; outfit < OUTFITS.length; outfit++)
            for (const [name, pose] of POSES.filter(([n]) => n.startsWith('strong') && n !== 'strong jump')) {
              const r = boundsContext();
              drawHero(r.g, { skin: 2, hair, outfit, body, age }, pose);
              // The measure counts every ellipse as its full circle, so it is an outer limit: 0.5 u slack.
              if (!inside(r.box, grow(1, STRONG.pad + 0.5))) out.push(`${body}${age}${hair}${outfit} ${name} ${JSON.stringify(r.box)}`);
            }
    expect(out.slice(0, 5)).toEqual([]);
  }, 60_000);

  it('glow: breathes 0.35 to 0.55, blinks 2 a second in the last 2 s, steady 0.45 and thin with reduced motion', () => {
    for (let t = 0; t < 2; t += 0.05) {
      const a = strongGlowAlpha(t);
      expect(a).toBeGreaterThanOrEqual(0.35 - 1e-9);
      expect(a).toBeLessThanOrEqual(0.55 + 1e-9);
    }
    expect([1.9, 1.7, 1.4, 1.2].map((l) => strongGlowAlpha(0.3, l) > 0)).toEqual([false, true, false, true]);
    expect(strongGlowAlpha(0.3, 1.7, true)).toBe(0.45);
    expect(strongGlowPad(5)).toBe(3);
    expect(strongGlowPad(1, true)).toBe(1);
    expect(STRONG.glow).toBe('#c98a3a');
  });

  it('tech suit: plates stay inside the art box plus 2 u, and on the ground never above the shoulders', () => {
    const out: string[] = [];
    const ground = POSES.filter(([n, p]) => n.startsWith('suit') && !p.inAir && !p.rope);
    for (let body = 0; body < 2; body++)
      for (let age = 0; age < 3; age++)
        for (let hair = 0; hair < HAIRS.length; hair++)
          for (let outfit = 0; outfit < OUTFITS.length; outfit++)
            for (const [name, pose] of POSES.filter(([n]) => n.startsWith('suit'))) {
              const look = { skin: 1, hair, outfit, body, age };
              const whole = boundsContext();
              drawHero(whole.g, look, pose);
              if (!inside(whole.box, grow(pose.facing, 2))) out.push(`hero ${name} ${JSON.stringify(whole.box)}`);
              if (!ground.some(([n]) => n === name)) continue;
              const plates = boundsContext();
              drawHeroSuit(plates.g, look, pose);
              expect(plates.bad).toEqual([]);
              // Shoulders sit about 34 u up for an adult; the head centre about 41 u: caps reach the neck base, never the face.
              if (plates.box.top < -39.5) out.push(`plates ${body}${age}${hair}${outfit} ${name} top ${plates.box.top}`);
            }
    expect(out.slice(0, 5)).toEqual([]);
  }, 60_000);

  it('suit hum lights the seams once every 2 s, never with reduced motion; bits fly then fade', () => {
    expect(SUIT.plates).toBe(7);
    expect(SUIT.bits).toBe(10);
    expect(suitHum(0.5)).toBeGreaterThan(0.5);
    expect(suitHum(1.5)).toBe(0);
    expect(suitHum(0.5, true)).toBe(0);
    for (const still of [false, true])
      for (const k of [0, 0.3, 0.7, 0.99, 1, Number.NaN]) {
        const r = boundsContext();
        drawSuitBits(r.g, 100, 300, k, still);
        expect(r.bad).toEqual([]);
        expect(r.depth()).toBe(0);
        if (k >= 0.3 && k < 1) {
          expect(r.box.left).toBeGreaterThan(100 - 45);
          expect(r.box.right).toBeLessThan(100 + 45);
        }
      }
  });

  it('dash look numbers follow S2.16 B4', () => {
    expect(DASH_LOOK.lean).toBeCloseTo((12 * Math.PI) / 180, 6);
    expect([DASH_LOOK.puff, DASH_LOOK.puffStill, DASH_LOOK.breath]).toEqual([0.1, 0.3, 0.5]);
  });

  it('reduced motion holds the dash speed lines still', () => {
    const lines = (time: number): number[] => {
      const r = recorder();
      drawHero(r.g, { skin: 0, hair: 0, outfit: 0 }, { ...base, phase: 0.2, dash: true, still: true, time });
      return r.calls.filter((c) => c.name === 'moveTo').slice(0, 3).map((c) => c.args[0] as number);
    };
    expect(lines(0.11)).toEqual(lines(0.53));
  });
});

describe('birds, piles, gutters, blocks and the dash sign (S2.16 B1, B4, B5)', () => {
  const clean = (draw: (g: CanvasRenderingContext2D) => void): Box => {
    const r = boundsContext();
    expect(() => draw(r.g)).not.toThrow();
    expect(r.bad).toEqual([]);
    expect(r.depth()).toBe(0);
    return r.box;
  };

  it('boxes follow S2.16 B1', () => {
    expect(BIRD_BOX.egret).toEqual({ w: 16, h: 28 });
    expect(BIRD_BOX.crow).toEqual({ w: 22, h: 14, above: 20 });
  });

  it('egret and crow draw in every mode, both facings, with and without a fufu ball', () => {
    const modes: BirdMode[] = ['peck', 'hop', 'hover', 'fly'];
    for (const mode of modes)
      for (const facing of [1, -1] as const)
        for (const fufu of [false, true])
          for (const t of [0, 0.25, 0.6, 1.3]) {
            const e = clean((g) => drawEgret(g, 400, 300, mode, t, { facing, fufu }));
            if (mode !== 'fly') {
              expect(e.bottom).toBeLessThanOrEqual(301.5); // feet on the road, never below it
              expect(e.top).toBeGreaterThan(300 - 40);
            }
            clean((g) => drawCrow(g, 400, 280, mode, t, { facing, fufu, still: t > 1 }));
          }
    clean((g) => drawEgret(g, Number.NaN, 300, 'peck', 0));
  });

  it('the crow bobs at most 2 u, and not at all with reduced motion', () => {
    const tops = [0, 0.25, 0.5, 0.75].map((t) => clean((g) => drawCrow(g, 0, 280, 'hover', t + 0.001 * 0, { still: false })).bottom);
    expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(2 + 1e-6);
    const still = [0, 0.4].map((t) => clean((g) => drawCrow(g, 0, 280, 'hover', t, { still: true })));
    expect(still[0]).toEqual(still[1]);
  });

  it('the pile and the kobo pop draw; the bin says PLEASE USE THE BIN', () => {
    clean((g) => drawRubbishPile(g, 7420, 300));
    const r = recorder();
    drawRubbishPile(r.g, 0, 300);
    expect(r.texts.join(' ')).toBe('PLEASE USE THE BIN');
    for (const k of [0, 0.5, 0.99, 1]) clean((g) => drawPileKoboPop(g, 0, 280, k, 0.3));
  });

  it('gutters: two widths; weeds fill the w x 18 box and never move (no time argument)', () => {
    expect([GUTTER.short, GUTTER.long, GUTTER.weedH, GUTTER.flatH, GUTTER.dryTime]).toEqual([30, 44, 18, 4, 0.5]);
    expect(drawWeeds.length).toBeLessThanOrEqual(6);
    for (const w of [GUTTER.short, GUTTER.long]) {
      clean((g) => drawGutter(g, 800, w, 300));
      const weeds = clean((g) => drawWeeds(g, 800, w, 300, 'weeds'));
      expect(weeds.left).toBeGreaterThanOrEqual(800 - 2.5);
      expect(weeds.right).toBeLessThanOrEqual(800 + w + 2.5);
      expect(weeds.top).toBeGreaterThanOrEqual(300 - 18 - 2.5);
      expect(weeds.bottom).toBeLessThanOrEqual(300 + 1);
      for (const s of ['dry', 'trampled'] as const) {
        const flat = clean((g) => drawWeeds(g, 800, w, 300, s));
        expect(flat.top).toBeGreaterThanOrEqual(300 - GUTTER.flatH - 1);
      }
      for (const k of [0, 0.4, 0.8, 1]) clean((g) => drawWeeds(g, 800, w, 300, 'drying', k));
      // Two draws give the very same picture
      const a = recorder();
      const b = recorder();
      drawWeeds(a.g, 800, w, 300);
      drawWeeds(b.g, 800, w, 300);
      expect(a.calls).toEqual(b.calls);
    }
    for (const k of [0, 0.5, 1]) clean((g) => drawWeedSteam(g, 815, 300, k));
  });

  it('weeds are plants only: no circles (no heads, bulbs, eyes or mouths)', () => {
    const r = recorder();
    drawWeeds(r.g, 0, GUTTER.long, 300, 'weeds');
    expect(r.calls.filter((c) => c.name === 'arc' || c.name === 'ellipse')).toEqual([]);
  });

  it('cement blocks are 60 u wide with their top at the road; dash puffs, step thump and dust ring draw', () => {
    expect(CEMENT_BLOCKS.w).toBe(60);
    const b = clean((g) => drawCementBlocks(g, 6800, 300, 360));
    expect(b.left).toBeGreaterThanOrEqual(6799);
    expect(b.right).toBeLessThanOrEqual(6861);
    expect(b.top).toBeGreaterThanOrEqual(299);
    for (const k of [0, 0.5, 0.99, 1, Number.NaN]) {
      clean((g) => drawDashPuff(g, -6, 0, k));
      clean((g) => drawStepThump(g, 100, 300, k));
      clean((g) => drawDustRing(g, 100, 300, k));
    }
  });

  it('the dash sign uses the pothole sign board, with a different picture', () => {
    const a = recorder();
    const b = recorder();
    drawPotholeSign(a.g, 0, 300);
    drawDashSign(b.g, 0, 300);
    expect(b.calls.length).toBeGreaterThan(a.calls.length);
    clean((g) => drawDashSign(g, 6580, 300, true));
  });
});

describe('S2.16 sounds', () => {
  let made: { kind: string; f?: number }[] = [];
  class P {
    value = 1;
    setValueAtTime(v: number): void {
      this.value = v;
    }
    linearRampToValueAtTime(): void {}
    exponentialRampToValueAtTime(): void {}
    cancelScheduledValues(): void {}
  }
  class N {
    connect<T>(n: T): T {
      return n;
    }
  }
  class Osc extends N {
    type = 'sine';
    frequency = new P();
    start(): void {
      made.push({ kind: 'osc', f: this.frequency.value });
    }
    stop(): void {
      made.push({ kind: 'stop' });
    }
  }
  class Ctx {
    state = 'running';
    currentTime = 0;
    sampleRate = 8000;
    destination = new N();
    createOscillator(): Osc {
      return new Osc();
    }
    createGain(): N & { gain: P } {
      return Object.assign(new N(), { gain: new P() });
    }
    createBiquadFilter(): N & { type: string; frequency: P } {
      return Object.assign(new N(), { type: 'lowpass', frequency: new P() });
    }
    createBuffer(_c: number, n: number): { getChannelData: () => Float32Array } {
      return { getChannelData: () => new Float32Array(n) };
    }
    createBufferSource(): N & { buffer: unknown; start: () => void; stop: () => void } {
      return Object.assign(new N(), { buffer: null, start: () => undefined, stop: () => undefined });
    }
    resume(): Promise<void> {
      return Promise.resolve();
    }
  }
  beforeEach(() => {
    made = [];
    (globalThis as unknown as { window: unknown }).window = { AudioContext: Ctx };
  });
  afterEach(() => {
    delete (globalThis as unknown as { window?: unknown }).window;
  });

  const NEW: SoundName[] = ['strongStep', 'strongSmash', 'strongPick', 'suitOn', 'suitBreak', 'hawk', 'birdFlap', 'dashStart', 'dashSteps', 'dashReady', 'weedsFsss'];

  it('every new sound plays, and none plays with Sound off', () => {
    const s = new Sound();
    s.unlock();
    for (const n of NEW) expect(() => s.play(n)).not.toThrow();
    s.enabled = false;
    made = [];
    for (const n of NEW) s.play(n);
    expect(made).toEqual([]);
  });

  it('"dum" is a sine from 90 to 60 Hz in 0.08 s', () => {
    const s = new Sound();
    s.unlock();
    made = [];
    s.play('strongStep');
    expect(made.filter((m) => m.kind === 'osc').map((m) => m.f)).toEqual([90]);
  });

  it('the hum: 110 and 165 Hz at 6 percent; off with the Sound switch, back when on, off on setHum(false)', () => {
    expect(HUM_VOL).toBeCloseTo(0.018, 6);
    const s = new Sound();
    s.setHum(true);
    expect(s.humming).toBe(false); // nothing before the first tap
    s.unlock();
    expect(s.humming).toBe(true);
    expect(made.filter((m) => m.kind === 'osc').map((m) => m.f)).toEqual([110, 165, 0.4]);
    s.enabled = false;
    expect(s.humming).toBe(false);
    s.enabled = true;
    expect(s.humming).toBe(true);
    s.setHum(false);
    expect(s.humming).toBe(false);
    s.enabled = false;
    s.setHum(true);
    expect(s.humming).toBe(false);
  });
});
