/**
 * K3b (docs/kano.md 3.3, 3.5, 3.7): springy cloth, the groundnut store and its parcel save, and
 * Kofar Mata's look from the Kano part.
 * - Land on a cloth frame from above: vy -640 (a jump is -576); held it rises higher, as a jump
 *   does; the second jump is still there. Walked into from the side, nothing happens. Never hurts.
 * - A frame never stands over a pit (the level file is refused), and on Kofar Mata no bounce,
 *   held or not, at the fastest speed there, ever comes down in a pit.
 * - The well goes to the groundnut store; the parcel is saved under states.kano with the street.
 * - The skin: cloth frames dip when landed on, roofs are drying shades, the beaters' tok only
 *   while their log is on screen, the yard people 120 u or more from the wells.
 */
import { describe, expect, it, vi } from 'vitest';
import kano1 from '../../src/data/levels/kano-1.json';
import kano2 from '../../src/data/levels/kano-2.json';
import kanoWell from '../../src/data/levels/kano-well.json';
import { PHYSICS, createWalker, groundAt, press, steer, step, type Body, type Terrain } from '../../src/engine/physics';
import { SPRING, parseLevel, type Level } from '../../src/game/level';
import { RULES, Run, STEPS_PER_SECOND, type RunEvent } from '../../src/game/run';
import { WELL_RULES, parseRoom } from '../../src/game/well';
import { KEY_PROGRESS, Progress } from '../../src/game/progress';
import { createStore } from '../../src/storage';
import { KANO_WORDS as FIRST } from '../../src/screens/words';
import { KANO_WORDS } from '../../src/worlds/kano/words';
import type { SkinNow } from '../../src/game/skin';

vi.mock('../../src/worlds/kano/cloth', async (orig) => {
  const m = await orig<typeof import('../../src/worlds/kano/cloth')>();
  return { ...m, drawClothFrame: vi.fn(), drawBounceSign: vi.fn() };
});
const cloth = await import('../../src/worlds/kano/cloth');
const { kofarMataSkin, kofarMataCast, KOFAR_YARD } = await import('../../src/worlds/kano/kofarMataStreet');
const { part } = await import('../../src/worlds/kano');
const art = await import('../../src/worlds/kano/kofarMata');
const store = await import('../../src/worlds/kano/store');

const DT = 1 / 60;
const GY = 300;
const KOFAR = parseLevel(kano2);

/** A plain street with one cloth frame at 1000 (100 wide) on a long road. */
function street(patch: Record<string, unknown> = {}): Level {
  return parseLevel({
    ...structuredClone(kano1),
    id: 'cloth-test',
    ground: [[-400, 20000]],
    platforms: [],
    springs: [[1000, 100]],
    wind: [],
    kobo: [],
    foods: [],
    crates: [],
    hazards: [],
    hints: [],
    checkpoint: 15000,
    end: { x: 19000, wall: 19200 },
    ...patch,
  });
}

/** A hero falling onto the frame's top from `drop` u above it, moving forward at `vx`. */
function dropOn(t: Terrain, x: number, vx = 0, drop = 40): Body {
  const b = createWalker(x, t);
  const y = GY - SPRING.h - drop;
  Object.assign(b, { y, prevY: y, vy: 0, grounded: false, vx, speed: Math.abs(vx), airTop: Math.abs(vx), airDir: vx > 0 ? 1 : 0, airJump: true, coyote: 0 });
  if (vx > 0) steer(b, 1);
  return b;
}

/** Steps until the bounce, then until the top of the rise: how high the feet go above the road. */
function bounceRise(t: Terrain, held: boolean): { top: number; vy: number; body: Body } {
  const b = dropOn(t, 1050);
  b.down = held;
  let vy = 0;
  for (let i = 0; i < 120 && !b.sprung; i++) step(b, t, DT);
  vy = b.vy;
  let top = b.y;
  for (let i = 0; i < 240 && b.vy < 0; i++) {
    step(b, t, DT);
    top = Math.min(top, b.y);
  }
  return { top: GY - top, vy, body: b };
}

describe('K3b springy cloth: the bounce numbers (kano.md 3.3)', () => {
  const L = street();

  it('the level reads springs [x, width] as frames 30 u high, also one-way platforms that bounce at -640', () => {
    expect(SPRING).toMatchObject({ h: 30, vy: -640 });
    expect(L.springs).toEqual([{ x: 1000, w: 100 }]);
    expect(L.terrain.platforms).toContainEqual({ x: 1000, y: 270, w: 100, spring: -640 });
    expect(KOFAR.springs.map((s) => s.x)).toEqual([1250, 1800, 5700, 8800]);
    expect(KOFAR.terrain.platforms.filter((p) => p.spring !== undefined)).toHaveLength(4);
    // A stronger push than a jump from the ground.
    expect(-SPRING.vy).toBeGreaterThan(-PHYSICS.jumpVy);
  });

  it('landing from above bounces at vy -640 and never stands; the "spring" event says which frame', () => {
    const run = new Run(L);
    Object.assign(run.hero, { x: 1040, y: 230, prevY: 230, vy: 0, grounded: false, airJump: true, coyote: 0 });
    let ev: RunEvent[] = [];
    for (let i = 0; i < 60 && !ev.some((e) => e.type === 'spring'); i++) ev = run.step(DT);
    expect(ev).toContainEqual({ type: 'spring', x: 1000 });
    expect(run.hero.vy).toBe(-640);
    expect(run.hero.grounded).toBe(false);
    expect(run.hero.y).toBe(270);
    expect(run.lives).toBe(run.maxLives);
  });

  it('held, it rises higher (as a jump does): about 178 u above the cloth held, about 92 u not', () => {
    const held = bounceRise(L.terrain, true);
    const tap = bounceRise(L.terrain, false);
    expect(held.vy).toBe(-640);
    const riseHeld = held.top - SPRING.h;
    const riseTap = tap.top - SPRING.h;
    expect(riseHeld).toBeGreaterThan(170);
    expect(riseHeld).toBeLessThan(185); // 640² / (2 · 1152) = 178
    expect(riseTap).toBeGreaterThan(85);
    expect(riseTap).toBeLessThan(95); // 640² / (2 · 2232) = 92
    // Higher than a held jump from the road (576² / (2 · 1152) = 144) and the 150 u roofs.
    expect(held.top).toBeGreaterThan(150 + 30);
  });

  it('the second jump is still there after a bounce', () => {
    const { body } = bounceRise(L.terrain, false);
    expect(body.airJump).toBe(true);
    expect(press(body)).toBe('air');
    expect(body.vy).toBe(PHYSICS.airJumpVy);
  });

  it('walked into from the side it is a low step: nothing happens (no bounce, no stop, no hurt)', () => {
    const run = new Run(L);
    Object.assign(run.hero, { x: 900 });
    run.steer(1);
    const ev: RunEvent[] = [];
    for (let i = 0; i < 4 * STEPS_PER_SECOND; i++) ev.push(...run.step(DT));
    expect(run.hero.x).toBeGreaterThan(1150);
    expect(ev.some((e) => e.type === 'spring' || e.type === 'hit' || e.type === 'fall')).toBe(false);
    expect(run.lives).toBe(run.maxLives);
  });

  it('a frame is never over a pit, nor too narrow or wide: the level file is refused with a clear message', () => {
    expect(() => street({ ground: [[-400, 1050], [1090, 20000]] })).toThrow('springs[0] should stand on solid road, never over a pit');
    expect(() => street({ springs: [[1000, 60]] })).toThrow('springs[0][1] should be 80 to 120 wide');
    expect(() => street({ springs: [[1000, 140]] })).toThrow('springs[0][1] should be 80 to 120 wide');
    expect(() => street({ springs: [[1000]] })).toThrow('springs[0] should have 2 items');
  });
});

describe('K3b: no bounce on Kofar Mata ever comes down in a pit (kano.md 3.3 fair rules)', () => {
  const L = KOFAR;
  const corns = [...L.foods.filter((f) => f.kind === 'corn').map((f) => f.x), ...L.crates.filter((c) => c.contents === 'corn').map((c) => c.x)];
  const reach = (RULES.cornSteps / STEPS_PER_SECOND) * L.cornSpeed;
  const windAt = (x: number): number => {
    const w = L.wind.find((q) => x >= q.x && x <= q.x + q.w);
    return !w ? 1 : w.dir === 'back' ? 1 + RULES.tailwind : 1 - RULES.headwind;
  };

  for (const s of L.springs) {
    for (const held of [true, false]) {
      for (const at of [s.x, s.x + s.w - 30]) {
        it(`cloth at ${s.x}, landing at ${at}, ${held ? 'held' : 'tapped'}: lands on road or a roof`, () => {
          const corn = corns.some((c) => at >= c && at <= c + reach);
          const speed = corn ? L.cornSpeed : L.runSpeed;
          const b = dropOn(L.terrain, at, speed, 10);
          b.down = held;
          let sprung = false;
          for (let i = 0; i < 600; i++) {
            b.wind = windAt(b.x);
            step(b, L.terrain, DT);
            if (b.sprung) sprung = true;
            else if (sprung && b.grounded) break;
            if (b.fallen) break;
          }
          expect(sprung).toBe(true);
          expect(b.fallen, `fell at ${b.x.toFixed(0)}`).toBe(false);
          expect(b.grounded).toBe(true);
          expect(b.on !== null || groundAt(L.terrain, b.x)).toBe(true);
        });
      }
    }
  }
});

describe('K3b: the well goes to the groundnut store; the parcel is saved under states.kano', () => {
  const room = parseRoom(kanoWell);

  it('Kofar Mata\'s well at 3600 (exit 4800) opens the kano-well room with the parcel on the middle shelf', () => {
    const run = new Run(KOFAR, { rooms: new Map([[room.id, room]]) });
    Object.assign(run.hero, { x: 3600, y: GY, prevY: GY, vy: 0, vx: 0, grounded: true });
    expect(run.wellHere?.room).toBe('kano-well');
    expect(run.goDown()).toBe(true);
    for (let i = 0; i < WELL_RULES.downSteps + WELL_RULES.arriveSteps; i++) run.step(DT);
    expect(run.phase).toBe('room');
    expect(run.room?.room.id).toBe('kano-well');
    expect(run.room?.gift).toMatchObject({ x: 280, y: 181, kind: 'parcel', taken: false });
    // Taking it: the parcel is carried.
    const gift = run.room!.gift!;
    Object.assign(run.hero, { x: gift.x, y: gift.y + 20, prevY: gift.y + 20, vy: 0, grounded: false });
    const ev = run.step(DT);
    expect(ev.some((e) => e.type === 'parcel')).toBe(true);
    expect(run.parcel).toBe(true);
  });

  it('with a parcel already saved for Kano the room shows 5 kobo instead', () => {
    const run = new Run(KOFAR, { rooms: new Map([[room.id, room]]), parcelSaved: true });
    Object.assign(run.hero, { x: 3600, y: GY, prevY: GY, vy: 0, vx: 0, grounded: true });
    run.goDown();
    for (let i = 0; i < WELL_RULES.downSteps + WELL_RULES.arriveSteps; i++) run.step(DT);
    expect(run.room?.gift).toBeNull();
    expect(run.room!.coins.length).toBe(room.coins.length + 5);
  });

  it('a cleared Kofar Mata with the parcel saves it under states.kano (Lagos and Ogun untouched)', () => {
    const data = new Map<string, string>();
    const storage = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), removeItem: (k: string) => void data.delete(k) } as unknown as Storage;
    const p = new Progress(createStore(() => storage));
    p.finish({ state: 'kano', street: 1, kobo: 900, parcel: false });
    p.finish({ state: 'kano', street: 2, kobo: 1200, parcel: true });
    expect(p.state('kano').parcel).toBe(true);
    expect(p.state('kano').streets[2]).toEqual({ done: true, best: 1200 });
    expect(p.state('lagos').parcel).toBe(false);
    expect(p.state('ogun').parcel).toBe(false);
    const saved = JSON.parse(data.get(`gidi-${KEY_PROGRESS}`)!) as { states: { kano: { parcel: boolean } } };
    expect(saved.states.kano.parcel).toBe(true);
  });

  it('the parcel words and Kofar Mata\'s button ride in the Kano part, handed to the first load', () => {
    expect(part.words).toBe(KANO_WORDS);
    expect(KANO_WORDS.toast.parcel).toBe('Groundnut garri parcel! Shield for the hall.');
    expect(KANO_WORDS.cleared.parcel).toBe('Your garri parcel is saved for Borehole Hall.');
    expect(KANO_WORDS.place.plays[1]).toBe(`Play ${KANO_WORDS.streets[1]}`);
    expect(Object.keys(FIRST)).not.toContain('street');
  });
});

/** A canvas stand-in that takes every call. */
const G = new Proxy({}, { get: () => () => G }) as unknown as CanvasRenderingContext2D;

function now(patch: Partial<SkinNow> = {}): SkinNow {
  const run = new Run(KOFAR);
  return { level: KOFAR, run, camX: 0, viewW: 560, L: -60, R: 620, H: 420, clock: 0, still: false, fixed: false, people: null, stride: 0, look: {} as SkinNow['look'], ...patch };
}

describe('K3b: Kofar Mata\'s look from the Kano part', () => {
  it('kano-2 gets its look, tune and cast; the part adds the cloth\'s boing and the beaters\' tok', () => {
    const skin = part.street!(KOFAR)!;
    expect(skin.tune).toBe(art.KOFAR_MATA_TUNE);
    expect(skin.cast?.looks).toBe(art.KOFAR_MATA_CAST);
    expect(part.sounds).toHaveProperty('clothBoing');
    expect(part.sounds).toHaveProperty('beaterTok');
    expect(part.sounds).toHaveProperty('windWhoosh');
  });

  it('a cloth frame draws as cloth and dips just after a bounce; a roof draws as a drying shade', () => {
    const skin = kofarMataSkin(KOFAR);
    const frame = vi.mocked(cloth.drawClothFrame);
    frame.mockClear();
    skin.back!(G, now({ clock: 5 }));
    skin.stall!(G, 1950, 150, 120, GY);
    expect(frame).not.toHaveBeenCalled();
    skin.stall!(G, 1250, 270, 100, GY);
    expect(frame).toHaveBeenLastCalledWith(expect.anything(), 1250, 100, GY, { dip: 0 });
    skin.hear!([{ type: 'spring', x: 1250 }], now({ clock: 5 }));
    skin.back!(G, now({ clock: 5.05 }));
    skin.stall!(G, 1250, 270, 100, GY);
    const dip = (frame.mock.lastCall![4] as { dip: number }).dip;
    expect(dip).toBeCloseTo(cloth.clothDip(0.05), 6);
    expect(dip).toBeGreaterThan(0);
    // Reduced motion: no dip.
    skin.back!(G, now({ clock: 5.05, still: true }));
    skin.stall!(G, 1250, 270, 100, GY);
    expect(frame).toHaveBeenLastCalledWith(expect.anything(), 1250, 100, GY, { dip: 0 });
    // A fresh play forgets the bounce.
    skin.restart!();
    skin.back!(G, now({ clock: 5.05 }));
    skin.stall!(G, 1250, 270, 100, GY);
    expect(frame).toHaveBeenLastCalledWith(expect.anything(), 1250, 100, GY, { dip: 0 });
  });

  it('the bounce sign stands 40 u before the first frame, drawn while it can be on screen', () => {
    const skin = kofarMataSkin(KOFAR);
    const sign = vi.mocked(cloth.drawBounceSign);
    sign.mockClear();
    skin.ground!(G, now({ L: 5000, R: 5600 }));
    expect(sign).not.toHaveBeenCalled();
    skin.ground!(G, now({ L: 900, R: 1500 }));
    expect(sign).toHaveBeenCalledWith(expect.anything(), 1210, GY);
  });

  it('the beaters\' tok plays once a beat, only while their log is on screen and not in reduced motion', () => {
    const skin = kofarMataSkin(KOFAR);
    const at = (clock: number, camX: number, still = false) => skin.sound!(now({ clock, camX, viewW: 560, still }));
    expect(at(0.0, 0)).toBeNull(); // the log at 1130 is off screen
    expect(at(0.4, 700)).toBe('beaterTok');
    expect(at(0.45, 700)).toBeNull(); // the same beat
    expect(at(0.7, 700)).toBe('beaterTok');
    expect(at(1.1, 1300)).toBeNull(); // passed
    expect(at(1.5, 700, true)).toBeNull();
  });

  it('the yard people: a dyer at each pit, the beaters at the log (sitting, the second turned), the tailor; all 120 u or more from the wells', () => {
    const cast = kofarMataCast();
    const ex = cast.extras!;
    expect(ex.slice(0, 3)).toEqual(KOFAR_YARD.pits.map((x, i) => ({ x: x + art.DYE_PIT.dyerAt, look: art.KOFAR_DYERS[i] })));
    expect(ex[3]).toEqual({ x: KOFAR_YARD.log - 22, look: art.KOFAR_BEATERS[0], stool: true });
    expect(ex[4]).toEqual({ x: KOFAR_YARD.log + 22, look: art.KOFAR_BEATERS[1], flip: true, stool: true });
    expect(ex[5]).toEqual({ x: KOFAR_YARD.tailor - 22, look: art.KOFAR_TAILOR, stool: true });
    for (const e of ex) for (const w of KOFAR.wells) for (const x of [w.x, w.exitX]) expect(Math.abs(e.x - x), `${e.x} by the well at ${x}`).toBeGreaterThanOrEqual(120);
    // The traders call their own lines; the keeper in the store says hers.
    expect(art.KOFAR_TRADERS.map((k) => cast.callOf?.(art.KOFAR_TRADER_LOOKS[k]))).toEqual(['Blue cloth!', 'Fresh fura!', 'Ga fura!']);
    expect(cast.keeper).toEqual({ look: store.KANO_STORE_KEEPER, x: store.KANO_STORE_KEEPER_SPOT.x, words: 'For Borehole Hall. Safe trip!' });
  });

  it('the store draws its own room, shelves, parcel and HUD chip; fura draws if it appears; other foods are the game\'s', () => {
    const skin = kofarMataSkin(KOFAR);
    const room = parseRoom(kanoWell);
    expect(skin.room!(G, room, 0, 560, 0, 420, false)).toBe(true);
    expect(skin.gift!(G, 280, 181, 0)).toBe(true);
    expect(() => skin.parcelIcon!(G, 16, 16, 26)).not.toThrow();
    expect(skin.food!(G, 'fura' as never, 0, 0, 0)).toBe(true);
    expect(skin.icon!(G, 'fura' as never, 0, 0, 1)).toBe(true);
    expect(skin.food!(G, 'amala', 0, 0, 0)).toBe(false);
    expect(skin.icon!(G, 'corn', 0, 0, 1)).toBe(false);
  });
});
