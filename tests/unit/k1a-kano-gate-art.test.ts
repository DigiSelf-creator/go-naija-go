/**
 * K1a: Kano's wall, gate, "To Kano" stop and the ride north (docs/kano.md 1.3, 1.4, 9.1). The
 * gate says only its two lines, every piece draws with good numbers (still or moving, faded or
 * bright, there and back), the ride is 5 s then 2 s, and the Kano part's art imports no value
 * from outside its own folder (so it stays out of the first load and needs no Ogun part).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { drawKanoGate, drawKanoWall, GATE_WORDS, KANO_GATE, kanoCogTurn, WALL_COLOURS } from '../../src/worlds/kano/gate';
import { drawKanoRide, hazeAt, KANO_RIDE, kanoRideAt } from '../../src/worlds/kano/rideArt';
import { drawKanoGateIcon, drawMiniKanoGate, drawToKanoCard, kanoGateIconSvg } from '../../src/worlds/ogun/toKano';

/** A canvas stand-in that takes every call, notes bad numbers and keeps every text drawn. */
function fakeCanvas(): { g: CanvasRenderingContext2D; bad: string[]; words: string[] } {
  const bad: string[] = [];
  const words: string[] = [];
  const fn = (name: string) => (...args: unknown[]) => {
    for (const a of args) if (typeof a === 'number' && !Number.isFinite(a)) bad.push(`${name}(${args.join(', ')})`);
    if (name === 'fillText' || name === 'strokeText') words.push(String(args[0]));
    return proxy;
  };
  const proxy: object = new Proxy({}, { get: (_t, k) => (typeof k === 'string' ? fn(k) : undefined), set: () => true });
  return { g: proxy as CanvasRenderingContext2D, bad, words };
}

const KANO_DIR = 'src/worlds/kano';

describe('K1a Kano gate and wall', () => {
  it('the board says only "WELCOME TO KANO" and "CENTRE OF COMMERCE", faded or bright, day or night', () => {
    expect([...GATE_WORDS]).toEqual(['WELCOME TO KANO', 'CENTRE OF COMMERCE']);
    for (const lit of [false, true])
      for (const night of [false, true]) {
        const c = fakeCanvas();
        drawKanoGate(c.g, 100, 200, 1.2, { lit, night, time: 3.3, wings: 80, boardX: 60 });
        drawKanoWall(c.g, 0, 400, 200, 0.95, lit);
        expect(c.bad).toEqual([]);
        expect(c.words).toEqual([...GATE_WORDS]);
      }
  });

  it('the cog turns only when bright and not still; faded and bright looks differ', () => {
    expect(kanoCogTurn(false, 4, false)).toBe(0);
    expect(kanoCogTurn(true, 4, true)).toBe(0);
    expect(kanoCogTurn(true, 4, false)).toBeGreaterThan(0);
    expect(WALL_COLOURS.faded.wall).not.toBe(WALL_COLOURS.bright.wall);
    expect(WALL_COLOURS.faded.door).not.toBe(WALL_COLOURS.bright.door);
    expect(KANO_GATE.blockH).toBeGreaterThan(KANO_GATE.wallH);
  });

  it('the small gate, its icon and the "To Kano" card draw with no words', () => {
    for (const lit of [false, true]) {
      const c = fakeCanvas();
      drawMiniKanoGate(c.g, 10, 30, 0.7, lit);
      drawToKanoCard(c.g, 224, 140, lit);
      drawKanoGateIcon(c.g, 0, 0, 24);
      expect(c.bad).toEqual([]);
      expect(c.words).toEqual([]);
    }
    expect(kanoGateIconSvg()).toMatch(/^<svg [^>]*aria-hidden="true"/);
  });
});

describe('K1a the ride north', () => {
  it('is 5 s the first time and 2 s after, and eases to a stop at the gate', () => {
    expect(KANO_RIDE.first).toBe(5);
    expect(KANO_RIDE.again).toBe(2);
    expect(kanoRideAt(0)).toBe(0);
    expect(kanoRideAt(1)).toBe(KANO_RIDE.end);
    let last = -1;
    for (let p = 0; p <= 1.0001; p += 0.05) {
      const d = kanoRideAt(p);
      expect(d).toBeGreaterThanOrEqual(last);
      last = d;
    }
    expect(kanoRideAt(0.9) - kanoRideAt(0.8)).toBeLessThan(kanoRideAt(0.1) - kanoRideAt(0));
  });

  it('passes palms, the bridge, grassland and the haze in that order; the haze is full only near Kano', () => {
    const [b0, b1] = KANO_RIDE.bridge;
    expect(b0).toBeLessThan(b1);
    expect(b1).toBeLessThanOrEqual(KANO_RIDE.grass);
    expect(KANO_RIDE.grass).toBeLessThan(KANO_RIDE.haze[0]);
    expect(KANO_RIDE.wall).toBeLessThan(KANO_RIDE.end);
    expect(hazeAt(0)).toBe(0);
    expect(hazeAt(KANO_RIDE.grass)).toBe(0);
    expect(hazeAt(KANO_RIDE.end)).toBe(1);
  });

  it('draws every frame there and back, still or moving, at phone sizes; only the gate and arch words', () => {
    const sizes: [number, number][] = [[320, 240], [568, 320], [640, 200], [851, 393]];
    for (const [w, h] of sizes)
      for (const back of [false, true])
        for (let p = 0; p <= 1.0001; p += 0.1) {
          const c = fakeCanvas();
          let rider = 0;
          drawKanoRide(c.g, w, h, p, { back, lit: p > 0.5, time: p * 5, rider: () => rider++ });
          expect(c.bad, `${w}x${h} ${back} ${p}`).toEqual([]);
          for (const word of c.words) expect(['SAFE JOURNEY', ...GATE_WORDS]).toContain(word);
          expect(rider).toBe(1);
        }
    const s = fakeCanvas();
    drawKanoRide(s.g, 320, 240, 0.2, { still: true });
    expect(s.words).toEqual([...GATE_WORDS]);
  });
});

describe('K1a stays in the lazy Kano part', () => {
  const files = readdirSync(KANO_DIR).filter((f) => f.endsWith('.ts'));
  it('imports no value from outside src/worlds/kano/ (types only)', () => {
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      const src = readFileSync(join(KANO_DIR, f), 'utf8');
      for (const m of src.matchAll(/^(import|export)\s+(type\s+)?[^;]*?from\s+'([^']+)'/gm)) {
        if (m[2]) continue;
        expect(m[3], `${f}: ${m[0]}`).toMatch(/^\.\/[^/]+$/);
      }
    }
  });

  it('the "To Kano" stop file imports nothing, and no file uses blur, filters or shadows', () => {
    expect(readFileSync('src/worlds/ogun/toKano.ts', 'utf8')).not.toMatch(/^import /m);
    for (const p of [...files.map((f) => join(KANO_DIR, f)), 'src/worlds/ogun/toKano.ts']) {
      const src = readFileSync(p, 'utf8');
      expect(src, p).not.toMatch(/shadowBlur|shadowColor|\.filter\s*=|blur\(/);
      expect(src, p).not.toMatch(/fillText\([^)]*(mosque|emir|palace|durbar)/i);
    }
  });
});
