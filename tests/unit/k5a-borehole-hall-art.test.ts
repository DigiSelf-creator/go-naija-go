/**
 * K5a: Borehole Hall and Rusty Borehole (docs/kano.md 5.1 to 5.5, 7 and 9.1; decision 91). The
 * yard matches the hall file; Rusty is only an old pump (no title, nothing royal, holy or from
 * another game); his outline keeps the boss minimum; the finish follows 5.5 and holds still with
 * reduced motion; the door people are kind and everyday; sounds are soft and short; the tune
 * follows the phases; and the file stays light and inside the lazy Kano part.
 */
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import hallFile from '../../src/data/levels/kano-hall.json';
import {
  BH_CAN_X,
  BH_CART_X,
  BH_CHEER_SPOTS,
  BH_DOOR_CHEERS,
  BH_DOOR_PEOPLE,
  BH_DOOR_SPOTS,
  BH_HALL,
  BH_SIGN,
  BH_STUCK,
  BOREHOLE_HALL_TUNE,
  RUSTY_FINISH,
  RUSTY_SOUNDS,
  drawBoreholeHall,
  drawBoreholeHallFront,
  drawBoreholeLine,
  drawRustyBorehole,
  drawRustyWord,
  drawSneezePuff,
  drawTapWater,
  drawValve,
  drawValveCounter,
  drawWashLine,
  drawWaterCan,
  drawWaterCart,
  rustyFinishAt,
  rustyTapTimes,
  type RustyMood,
  type ValveState,
} from '../../src/worlds/kano/boreholeHall';
import { KANO_WORDS } from '../../src/worlds/kano/words';

interface Fake {
  g: CanvasRenderingContext2D;
  bad: string[];
  words: string[];
  widths: number[];
}

/** A canvas stand-in that notes bad numbers, words and line widths; `scale` gives it a transform. */
function fakeCanvas(scale?: number): Fake {
  const f: Fake = { g: null as unknown as CanvasRenderingContext2D, bad: [], words: [], widths: [] };
  const fn = (name: string) => (...args: unknown[]) => {
    for (const a of args) if (typeof a === 'number' && !Number.isFinite(a)) f.bad.push(`${name}(${args.join(', ')})`);
    if (name === 'fillText') f.words.push(String(args[0]));
    if (name === 'createLinearGradient') return { addColorStop: () => undefined };
    if (name === 'getTransform' && scale !== undefined) return { a: scale, b: 0, c: 0, d: scale, e: 0, f: 0 };
    return proxy;
  };
  const proxy: object = new Proxy(
    {},
    {
      get: (_t, k) => (k === 'globalAlpha' ? 1 : typeof k === 'string' ? fn(k) : undefined),
      set: (_t, k, v) => {
        if (k === 'lineWidth') {
          if (!Number.isFinite(v)) f.bad.push(`lineWidth ${String(v)}`);
          f.widths.push(v as number);
        }
        return true;
      },
    },
  );
  f.g = proxy as CanvasRenderingContext2D;
  return f;
}

const MOODS: RustyMood[] = ['grumpy', 'wheeze', 'puff', 'blow', 'hiccup', 'gargle', 'sneeze', 'clean'];
const src = (p: string): string => readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');

describe('K5a the yard matches kano-hall.json (kano.md 5.2)', () => {
  it('room, limits, Rusty, valves, frames, taps', () => {
    const b = hallFile.boss;
    expect(BH_HALL.w).toBe(hallFile.width);
    expect(BH_HALL.floorY).toBe(hallFile.groundY);
    expect(BH_HALL.heroMinX).toBe(hallFile.leftLimit);
    expect(BH_HALL.heroMaxX).toBe(hallFile.rightLimit);
    expect([...BH_HALL.body]).toEqual(b.body);
    expect(BH_HALL.cx).toBe((b.body[0]! + b.body[1]!) / 2);
    expect([...BH_HALL.valves]).toEqual(b.valves.x);
    expect(BH_HALL.valveBottom).toBe(b.valves.bottom);
    expect(BH_HALL.valveR * 2).toBe(b.valves.w);
    expect(BH_HALL.valveR * 2).toBe(b.valves.h);
    expect(BH_HALL.springW).toBe(b.springs.w);
    expect(BH_HALL.springH).toBe(b.springs.h);
    expect(BH_HALL.taps).toHaveLength(b.taps);
    // The valves hang from the water line; the hero walks in through the left door
    expect(BH_HALL.lineY).toBe(b.valves.bottom - BH_HALL.valveR);
    expect(hallFile.spawnX).toBeGreaterThan(BH_HALL.leftDoor.x0);
    expect(hallFile.spawnX).toBeLessThan(BH_HALL.leftDoor.x1);
  });

  it('the finish times are the file\'s', () => {
    const f = hallFile.boss.finish;
    expect(RUSTY_FINISH.glugTo).toBe(f.glugTo);
    expect(RUSTY_FINISH.sneeze).toBe(f.sneeze);
    expect(RUSTY_FINISH.shine).toBe(f.shine);
    expect(RUSTY_FINISH.tapsFrom).toBe(f.tapsFrom);
    expect(RUSTY_FINISH.tapsTo).toBe(f.tapsTo);
    expect(RUSTY_FINISH.toast).toBe(f.toast);
    expect(RUSTY_FINISH.win).toBe(f.win);
  });
});

describe('K5a Rusty Borehole is a problem, never a person (5.1, decision 91)', () => {
  it('writes only the hall words: the sign, the STUCK tag and his own sound words', () => {
    expect(BH_SIGN).toBe('BOREHOLE HALL');
    expect(BH_STUCK).toBe('STUCK');
    const texts = [...src('src/worlds/kano/boreholeHall.ts').matchAll(/fillText\(([^,]+),/g)].map((m) => m[1]!.trim());
    expect(texts.sort()).toEqual(['BH_SIGN', 'BH_STUCK', 'text']);
  });

  it('has nothing royal, holy, dangerous or from another game', () => {
    const s = src('src/worlds/kano/boreholeHall.ts').toLowerCase();
    for (const w of ['crown', 'throne', 'palace', 'emir', 'king', 'chief', 'turban', 'robe', 'sceptre', 'staff', 'royal', 'mosque', 'minaret', 'dome', 'pray', 'bead', 'arabic', 'ajami', 'mushroom', 'question', 'brick', 'plumber', 'stick', 'cane', 'police', 'soldier', 'gun', 'fire', 'flame', 'blood', 'teeth', 'fang']) {
      expect(s, w).not.toContain(w);
    }
  });

  it('every mood draws with good numbers, still or moving, and with no words', () => {
    for (const mood of MOODS)
      for (const k of [0, 0.3, 1, Number.NaN])
        for (const still of [false, true]) {
          const c = fakeCanvas();
          drawRustyBorehole(c.g, 495, 300, { mood, k, flakes: 2, fall: k, fountain: k, time: 1.3, still });
          drawRustyBorehole(c.g, 495, 300, { mood, time: Number.NaN, flakes: Number.NaN });
          expect(c.bad, `${mood} ${k}`).toEqual([]);
          expect(c.words).toEqual([]);
        }
  });

  it('his outline keeps the boss minimum (style 1.8: the larger of 1.6 u and 2 px) at every size', () => {
    for (const dpu of [0.57, 0.94, 2.75]) {
      const c = fakeCanvas(dpu);
      drawRustyBorehole(c.g, 495, 300, { mood: 'grumpy' });
      const want = Math.max(1.6, 2 / dpu) - 1e-9;
      expect(Math.max(...c.widths) * dpu, `dpu ${dpu}`).toBeGreaterThanOrEqual(Math.round(want * dpu) - 1e-9);
      expect(c.widths.some((w) => w >= want), `dpu ${dpu}`).toBe(true);
    }
  });
});

describe('K5a the hall pieces draw at phone sizes', () => {
  it('back, front, line, valves, counter, cloth, taps, cans, cart, puff and words', () => {
    for (const [w, h] of [[320, 240], [568, 320], [640, 200], [851, 393]] as const) {
      const V = (w * 420) / h;
      const camX = V >= 560 ? (560 - V) / 2 : 0;
      const c = fakeCanvas();
      drawBoreholeHall(c.g, 420);
      drawBoreholeHallFront(c.g, camX, V, 420);
      expect(c.bad, `${w}x${h}`).toEqual([]);
      expect(c.words.every((x) => x === BH_SIGN)).toBe(true);
    }
    const c = fakeCanvas();
    for (const still of [false, true]) {
      for (const open of [0, 1, 2, 3]) drawBoreholeLine(c.g, open, open / 3, 2.1, still);
      for (const st of ['wait', 'stuck', 'open'] as ValveState[]) for (const freed of [-1, 0.3, 2, Number.NaN]) drawValve(c.g, 250, st, { time: 1.1, still, freed });
      for (const k of [0, 0.5, 1, Number.NaN]) drawWashLine(c.g, k, 0.7, still);
      drawTapWater(c.g, [-1, 0, 0.1, 0.5, 2, Number.NaN, 9, 0.3], 1.2, still);
    }
    for (let n = 0; n <= 3; n++) drawValveCounter(c.g, 400, 66, n);
    drawWaterCan(c.g, 42, 297);
    drawWaterCart(c.g, 82, 298, Number.NaN);
    for (const k of [-1, 0, 0.5, 1, Number.NaN]) drawSneezePuff(c.g, k);
    for (const w of Object.values(KANO_WORDS.hall.rusty)) drawRustyWord(c.g, w, 400, 120);
    expect(c.bad).toEqual([]);
    expect(new Set(c.words)).toEqual(new Set([BH_STUCK, ...Object.values(KANO_WORDS.hall.rusty)]));
  });

  it('the STUCK tag hangs beside the valve, never under it where the head bumps', () => {
    // drawValve's tag box starts 21 u right of the middle: clear of the 36 u wide hit box
    expect(21).toBeGreaterThan(BH_HALL.valveR);
    expect(BH_HALL.valves[1]! - BH_HALL.valves[0]! - 21 - 46).toBeGreaterThan(BH_HALL.valveR);
  });
});

describe('K5a the funny, kind finish (5.5)', () => {
  it('gargle, A... a... ACHOO!, clean shine, taps one by one, then the cheer', () => {
    const a = rustyFinishAt(0.6);
    expect(a.rusty.mood).toBe('gargle');
    expect(a.say).toBe('gargle');
    expect(a.wave).toBeCloseTo(0.5);
    expect(a.puff).toBe(0);
    const b = rustyFinishAt(1.4);
    expect(b.rusty.mood).toBe('sneeze');
    expect(b.say).toBe('sneeze');
    expect(rustyFinishAt(1.7).puff).toBeGreaterThan(0);
    const c = rustyFinishAt(2.0);
    expect(c.rusty.mood).toBe('clean');
    expect(c.say).toBe('hum');
    expect(c.rusty.fountain).toBeGreaterThan(0);
    expect(c.wave).toBe(1);
    const taps = rustyTapTimes();
    expect(taps).toHaveLength(8);
    expect(taps[0]).toBe(RUSTY_FINISH.tapsFrom);
    expect(taps[7]).toBeCloseTo(RUSTY_FINISH.tapsTo);
    for (let i = 1; i < 8; i++) expect(taps[i]!).toBeGreaterThan(taps[i - 1]!);
    expect(rustyFinishAt(2.3).taps.every((x) => x < 0)).toBe(true);
    expect(rustyFinishAt(3.0).taps.filter((x) => x >= 0).length).toBe(4);
    expect(rustyFinishAt(3.99).cheer).toBe(false);
    expect(rustyFinishAt(4.0).cheer).toBe(true);
    expect(rustyFinishAt(5.9).taps.every((x) => x >= 0)).toBe(true);
  });

  it('holds still with reduced motion: no wave, no floating puff, the rust simply gone', () => {
    for (const t of [0, 1.4, 2, 3, 5]) {
      const f = rustyFinishAt(t, true);
      expect(f.wave).toBe(1);
      expect(f.puff).toBe(0);
      expect(f.rusty.still).toBe(true);
    }
    expect(rustyFinishAt(2, true).rusty.fall).toBe(1);
    expect(rustyFinishAt(Number.NaN).rusty.mood).toBe('gargle');
  });
});

describe('K5a the door people (kano.md 7)', () => {
  it('three everyday people of different skin tones, an elder with no stick, caps never red', () => {
    expect(BH_DOOR_PEOPLE).toHaveLength(3);
    expect(new Set(BH_DOOR_PEOPLE.map((l) => l.skin)).size).toBe(3);
    expect(BH_DOOR_PEOPLE.some((l) => l.age === 'elder')).toBe(true);
    for (const l of BH_DOOR_PEOPLE) {
      expect(l.age).not.toBe('child');
      expect(['helmet', 'hijab']).not.toContain(l.head ?? 'none');
      expect(l.dress).not.toBe('hijabDress');
      expect(Object.keys(l)).not.toContain('stick');
      if (l.head === 'kaftanCap' || l.head === 'fila' || l.head === 'rigaCap') expect((l.h ?? l.a).toLowerCase()).not.toMatch(/^#(e0572b|d6336c|8e2a3a|c8583a|ff0000)$/);
    }
    expect([...BH_DOOR_CHEERS]).toEqual(['Yauwa!', 'Well done!']);
  });

  it('they wait in the left door with the can and the cart, then come in to the taps', () => {
    const d = BH_HALL.leftDoor;
    for (const x of [...BH_DOOR_SPOTS, BH_CAN_X, BH_CART_X]) {
      expect(x).toBeGreaterThan(d.x0);
      expect(x).toBeLessThan(d.x1);
    }
    for (const x of BH_CHEER_SPOTS) {
      expect(x).toBeGreaterThan(d.x1);
      expect(x).toBeLessThan(BH_HALL.heroMaxX);
    }
    // The cart pusher fills up first, at the tap nearest the door
    expect(Math.min(...BH_CHEER_SPOTS)).toBe(BH_CHEER_SPOTS[1]);
  });
});

describe('K5a sounds and the hall tune', () => {
  it('every sound is soft and short', () => {
    for (const [name, r] of Object.entries(RUSTY_SOUNDS)) {
      for (const t of r.tones) {
        expect(t.vol ?? 0, name).toBeLessThanOrEqual(0.08);
        expect((t.at ?? 0) + t.len, name).toBeLessThanOrEqual(1.3);
      }
      for (const h of r.hiss ?? []) expect((h.at ?? 0) + h.len, name).toBeLessThanOrEqual(1.3);
    }
  });

  it('the tune follows the phases: tempos, the shaker from hit 1, a second drum from hit 2', () => {
    const t = BOREHOLE_HALL_TUNE;
    expect([...t.bpm]).toEqual(hallFile.boss.phases.map((p) => p.bpm));
    expect(t.loop).toBe(true);
    expect(t.tracks.find((x) => x.inst === 'shekere')?.from).toBe(1);
    expect(t.tracks.filter((x) => x.inst === 'drum').map((x) => x.from ?? 0)).toEqual([0, 2]);
    expect(t.tracks.some((x) => x.inst === 'horn')).toBe(false);
  });
});

describe('K5a stays light and in the lazy Kano part (kano.md 9.1)', () => {
  const FILE = 'src/worlds/kano/boreholeHall.ts';

  it('imports no value from outside src/worlds/kano/ (types only)', () => {
    for (const m of readFileSync(FILE, 'utf8').matchAll(/^(import|export)\s+(type\s+)?[^;]*?from\s+'([^']+)'/gm)) {
      if (m[2]) continue;
      expect(m[3], m[0]).toMatch(/^\.\/[^/]+$/);
    }
  });

  it('no blur, filters or shadows; within its 10 KB gzip budget', () => {
    const s = readFileSync(FILE, 'utf8');
    expect(s).not.toMatch(/shadowBlur|shadowColor|\.filter\s*=|blur\(/);
    expect(gzipSync(s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')).length).toBeLessThan(10 * 1024);
  });
});
