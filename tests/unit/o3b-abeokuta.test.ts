/**
 * O3b: Abeokuta (Ogun street 2) and the Ogun well room, the rules (Run) and the look's hookups
 * (docs/ogun.md 3.3, 3.5, 3.7, 3.8, 4.1; decision 77).
 * - Rocks are one-way platforms: the hero lands on their top edge; the long ledge spans its pothole.
 * - Water potholes are pits (look only).
 * - Cracks open (0.4 s) when the hero first comes within 240 u of the left lip (300 in Gentle
 *   mode), become potholes for the rest of the try, and never open under the hero.
 * - Ofada: 12 s; no crack opens while it works, one reached while it works stays shut for good,
 *   and when it wears off the cracks within reach ahead stay shut too.
 * - The well room: the Ijebu garri store, its parcel, the parcel saved for Ogun shows kobo.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ogun2 from '../../src/data/levels/ogun-2.json';
import ogunWell from '../../src/data/levels/ogun-well.json';
import { PHYSICS } from '../../src/engine/physics';
import { RoomKeeper } from '../../src/game/crowd';
import { LevelError, parseLevel, type Level } from '../../src/game/level';
import { RULES, Run, STEPS_PER_SECOND, type RunEvent } from '../../src/game/run';
import type { SkinNow } from '../../src/game/skin';
import { WELL_RULES, parseRoom } from '../../src/game/well';
import { OGUN_WORDS } from '../../src/screens/words';
import * as art from '../../src/worlds/ogun/abeokuta';
import { abeokutaSkin, crackOpen, gapUnder } from '../../src/worlds/ogun/abeokutaStreet';
import { ogunStreet } from '../../src/worlds/ogun/otaStreet';

vi.mock('../../src/worlds/ogun/abeokuta', async (orig) => {
  const real = await orig<typeof import('../../src/worlds/ogun/abeokuta')>();
  // No drawing in the tests: each piece is a spy that records what it was asked to draw.
  const spy = <K extends keyof typeof real>(_k: K) => vi.fn();
  return {
    ...real,
    drawRock: spy('drawRock'),
    drawAbeokutaStall: spy('drawAbeokutaStall'),
    drawWaterPothole: spy('drawWaterPothole'),
    drawCrack: spy('drawCrack'),
    drawCrackSign: spy('drawCrackSign'),
    drawOfada: spy('drawOfada'),
    drawOfadaIcon: spy('drawOfadaIcon'),
    drawOgunWellRoom: spy('drawOgunWellRoom'),
    drawSackStack: spy('drawSackStack'),
    drawOgunShelf: spy('drawOgunShelf'),
    drawIjebuParcel: spy('drawIjebuParcel'),
    drawIjebuParcelIcon: spy('drawIjebuParcelIcon'),
  };
});

const DT = 1 / 60;
const ABK = parseLevel(structuredClone(ogun2));
const ROOM = parseRoom(structuredClone(ogunWell));
const ROOMS = new Map([[ROOM.id, ROOM]]);

/** A plain street: long road with a pit at 3000 to 3040, the given cracks, no hazards. */
function street(patch: Record<string, unknown> = {}): Level {
  return parseLevel({
    ...(structuredClone(ogun2) as Record<string, unknown>),
    id: 'crack-test',
    ground: [
      [-400, 3000],
      [3040, 20000],
    ],
    platforms: [],
    rocks: [],
    waterPits: [],
    mud: [],
    cracks: [[1000, 40]],
    kobo: [],
    foods: [],
    crates: [],
    hazards: [],
    wells: [],
    hints: [],
    checkpoint: 15000,
    end: { x: 19000, wall: 19200 },
    ...patch,
  });
}

function steps(run: Run, n: number): RunEvent[] {
  const out: RunEvent[] = [];
  for (let i = 0; i < n; i++) out.push(...run.step(DT));
  return out;
}

/** Holds forward until the hero reaches x, or loses a life, or `max` steps; returns the events. */
function walkTo(run: Run, x: number, max = 4000): RunEvent[] {
  run.steer(1);
  const out: RunEvent[] = [];
  for (let i = 0; i < max && run.hero.x < x && run.phase === 'run'; i++) {
    const ev = run.step(DT);
    out.push(...ev);
    if (ev.some((e) => e.type === 'fall' || e.type === 'hit')) break;
  }
  return out;
}

function standAt(run: Run, x: number): void {
  const gy = run.below ? run.room!.room.groundY : run.level.groundY;
  Object.assign(run.hero, { x, y: gy, prevY: gy, vy: 0, vx: 0, speed: 0, grounded: true, on: null, move: 0, runTime: 0 });
}

/** A held jump from where the hero stands, until they land again. */
function jumpAndLand(run: Run, max = 200): void {
  run.press();
  for (let i = 0; i < max; i++) {
    run.step(DT);
    if (i > 3 && run.hero.grounded) break;
  }
  run.release();
}

describe('the level file reads rocks, cracks, water potholes and ofada (ogun.md 3.8)', () => {
  it('Abeokuta: four rocks as one-way platforms (their top edge at groundY - height), six cracks, two water potholes, ofada at 6900', () => {
    expect(ABK.rocks).toEqual([
      { x: 1200, w: 100, h: 50 },
      { x: 1330, w: 100, h: 100 },
      { x: 1460, w: 100, h: 150 },
      { x: 1900, w: 300, h: 90 },
    ]);
    for (const r of ABK.rocks) expect(ABK.terrain.platforms).toContainEqual({ x: r.x, y: 300 - r.h, w: r.w });
    // The two stall roofs and the four rocks.
    expect(ABK.terrain.platforms).toHaveLength(6);
    expect(ABK.cracks.map((c) => [c.x, c.w])).toEqual([
      [5250, 40],
      [5700, 60],
      [6000, 40],
      [7300, 40],
      [7900, 60],
      [8300, 40],
    ]);
    // Each water pothole's x is the left lip of a gap in the road.
    expect(ABK.waterPits).toEqual([2600, 2900]);
    for (const x of ABK.waterPits) expect(ABK.ground.some(([, b], i) => b === x && i < ABK.ground.length - 1)).toBe(true);
    expect(ABK.foods.find((f) => f.kind === 'ofada')).toEqual({ x: 6900, y: 272, kind: 'ofada' });
  });

  it('a street without them reads none; a bad crack or rock gives a clear message', () => {
    const raw = structuredClone(ogun2) as Record<string, unknown>;
    for (const k of ['rocks', 'cracks', 'waterPits']) delete raw[k];
    const L = parseLevel(raw);
    expect([L.rocks, L.cracks, L.waterPits]).toEqual([[], [], []]);
    expect(() => street({ cracks: [[1000, 50]] })).toThrow(LevelError);
    expect(() => street({ cracks: [[1000, 50]] })).toThrow(/cracks\[0\]\[1\] should be one of 40, 60/);
    expect(() => street({ rocks: [[1000, 100]] })).toThrow(/rocks\[0\] should have 3 items/);
    expect(() => street({ rocks: [[1000, 0, 50]] })).toThrow(/rocks\[0\] should have a width and height above 0/);
    expect(() => street({ waterPits: ['x'] })).toThrow(/waterPits\[0\] should be a number/);
  });
});

describe('rock steps (ogun.md 3.3: one-way, like the stall roofs)', () => {
  it('a held jump from beside the first step lands on its top edge (y 250); the next two climb from the one before', () => {
    const run = new Run(ABK);
    standAt(run, 1180);
    run.steer(1);
    jumpAndLand(run);
    run.steer(0);
    steps(run, 30);
    expect(run.hero.on).toEqual({ x: 1200, y: 250, w: 100 });
    expect(run.hero.y).toBe(250);
    for (const [from, top] of [
      [1290, 200],
      [1420, 150],
    ] as const) {
      standAt(run, from);
      Object.assign(run.hero, { y: top + 50, prevY: top + 50, on: run.terrain.platforms.find((p) => p.y === top + 50) });
      run.steer(1);
      jumpAndLand(run);
      run.steer(0);
      steps(run, 30);
      expect(run.hero.y).toBe(top);
      expect(run.hero.on?.y).toBe(top);
    }
  });

  it('walking into a rock from the side passes through it on the road (one-way), never a wall', () => {
    const run = new Run(ABK);
    standAt(run, 1150);
    walkTo(run, 1320);
    expect(run.hero.x).toBeGreaterThanOrEqual(1320);
    expect(run.hero.y).toBe(300);
    expect(run.hero.on).toBeNull();
  });

  it('the long ledge (1900 to 2200, 90 high) carries the hero over the wide pothole under it', () => {
    const run = new Run(ABK);
    const ledge = run.terrain.platforms.find((p) => p.x === 1900)!;
    standAt(run, 1910);
    Object.assign(run.hero, { y: ledge.y, prevY: ledge.y, on: ledge });
    const lives = run.lives;
    walkTo(run, 2150);
    expect(run.hero.y).toBe(210);
    expect(run.lives).toBe(lives);
  });
});

describe('water potholes are pits (look only)', () => {
  it('walking into the tap water pothole at 2600 costs a life', () => {
    const run = new Run(ABK);
    standAt(run, 2500);
    const ev = walkTo(run, 2700, 600);
    expect(ev.some((e) => e.type === 'fall')).toBe(true);
    expect(run.lives).toBe(RULES.lives - 1);
  });
});

describe('cracks (ogun.md 3.3)', () => {
  it('shut until the hero comes within 240 u of the left lip; then 0.4 s of rumble, then a pothole', () => {
    const run = new Run(street());
    standAt(run, 700);
    steps(run, 2);
    expect(run.cracks[0]!.state).toBe('shut');
    standAt(run, 759);
    expect(steps(run, 1).some((e) => e.type === 'crackOpen')).toBe(false);
    standAt(run, 760);
    const ev = steps(run, 1);
    expect(ev.filter((e) => e.type === 'crackOpen')).toEqual([{ type: 'crackOpen', x: 1000, w: 40 }]);
    expect(run.cracks[0]!.state).toBe('opening');
    // Still road while it rumbles.
    expect(run.terrain.ground.some((s) => s.x0 <= 1020 && s.x1 >= 1020)).toBe(true);
    steps(run, RULES.crackOpenSteps - 1);
    expect(run.cracks[0]!.state).toBe('opening');
    steps(run, 1);
    expect(run.cracks[0]!.state).toBe('open');
    expect(run.terrain.ground.some((s) => s.x0 < 1040 && s.x1 > 1000)).toBe(false);
    // Only once.
    expect(steps(run, 60).some((e) => e.type === 'crackOpen')).toBe(false);
  });

  it("the open time is art's CRACK.openTime, and at full run speed the warning is at least 1.5 s", () => {
    expect(RULES.crackOpenSteps).toBe(Math.round(art.CRACK.openTime * STEPS_PER_SECOND));
    expect(RULES.crackReach / PHYSICS.runSpeed).toBeGreaterThanOrEqual(1.5);
    // Corn is why no crack sits in a corn's reach: at corn speed the warning is under 1.5 s.
    expect(RULES.crackReach / PHYSICS.fastRunSpeed).toBeLessThan(1.5);
  });

  it('running at it with no jump: it opens before the hero gets there, and the hero falls in (a pothole)', () => {
    const run = new Run(street());
    const ev = walkTo(run, 1100, 2000);
    const opened = ev.findIndex((e) => e.type === 'crackOpen');
    const fell = ev.findIndex((e) => e.type === 'fall');
    expect(opened).toBeGreaterThanOrEqual(0);
    expect(fell).toBeGreaterThan(opened);
  });

  it('a jump over it lands on firm road; it stays open for the rest of the try, a lost life too', () => {
    const run = new Run(street());
    walkTo(run, 960);
    run.press();
    walkTo(run, 1100);
    run.release();
    steps(run, 30);
    expect(run.lives).toBe(RULES.lives);
    expect(run.cracks[0]!.state).toBe('open');
    // A lost life in the pit at 3000: back at the start, the crack is still open.
    walkTo(run, 3100, 2000);
    expect(run.lives).toBe(RULES.lives - 1);
    expect(run.hero.x).toBeLessThan(1000);
    expect(run.cracks[0]!.state).toBe('open');
    expect(run.terrain.ground.some((s) => s.x0 < 1040 && s.x1 > 1000)).toBe(false);
  });

  it('Gentle mode: it opens at 300 u, and a fall into it climbs out 100 u before it', () => {
    const run = new Run(street(), { gentle: true });
    standAt(run, 699);
    expect(steps(run, 1).some((e) => e.type === 'crackOpen')).toBe(false);
    standAt(run, 701);
    expect(steps(run, 1).some((e) => e.type === 'crackOpen')).toBe(true);
    steps(run, RULES.crackOpenSteps + 1);
    const ev = walkTo(run, 1100, 2000);
    expect(ev.find((e) => e.type === 'climbOut')).toEqual({ type: 'climbOut', kind: 'small', x: 900 });
  });

  it('never opens under the hero: one the hero is already at when it comes in reach stays shut for good', () => {
    const run = new Run(street());
    standAt(run, 1010);
    const ev = steps(run, 60);
    expect(ev.some((e) => e.type === 'crackOpen')).toBe(false);
    expect(run.cracks[0]!.state).toBe('sealed');
    expect(run.hero.grounded).toBe(true);
    expect(run.hero.y).toBe(300);
  });

  it('never opens under the hero: one rumbling while the hero stands over it waits until they step off', () => {
    const run = new Run(street());
    standAt(run, 760);
    steps(run, 1);
    expect(run.cracks[0]!.state).toBe('opening');
    standAt(run, 1020);
    steps(run, RULES.crackOpenSteps * 3);
    expect(run.cracks[0]!.state).toBe('opening');
    expect(run.hero.y).toBe(300);
    standAt(run, 1080);
    steps(run, 1);
    expect(run.cracks[0]!.state).toBe('open');
    expect(run.lives).toBe(RULES.lives);
  });

  it('a fufu ball can plug an open crack (it is a pothole)', () => {
    const run = new Run(street({ foods: [[700, 272, 'fufu']] }));
    walkTo(run, 760);
    steps(run, RULES.crackOpenSteps + 2);
    expect(run.cracks[0]!.state).toBe('open');
    run.steer(0);
    steps(run, 40);
    run.throwFufu();
    const ev = steps(run, 120);
    expect(ev.find((e) => e.type === 'fufuPlug')).toMatchObject({ a: 1000, b: 1040 });
    expect(run.terrain.ground.some((s) => s.x0 <= 1020 && s.x1 >= 1020)).toBe(true);
  });
});

describe('ofada (ogun.md 4.1: cracks stay shut for 12 s)', () => {
  const withOfada = (patch: Record<string, unknown> = {}) => street({ foods: [[500, 272, 'ofada']], cracks: [[1000, 40], [2400, 60]], ...patch });

  it('12 s, with the same wearing-off warning and ticks as every timed food', () => {
    const run = new Run(withOfada());
    const ev = walkTo(run, 520);
    expect(ev.find((e) => e.type === 'food')).toMatchObject({ kind: 'ofada' });
    expect(run.power.ofada).toBeGreaterThan(RULES.ofadaSteps - 30);
    expect(RULES.ofadaSteps).toBe(12 * STEPS_PER_SECOND);
    run.steer(0);
    const rest = steps(run, RULES.ofadaSteps);
    expect(rest.filter((e) => e.type === 'wearingOff')).toEqual([{ type: 'wearingOff', kind: 'ofada' }]);
    expect(rest.filter((e) => e.type === 'tick')).toHaveLength(2);
    expect(rest.filter((e) => e.type === 'powerEnd')).toEqual([{ type: 'powerEnd', kind: 'ofada' }]);
    expect(run.power.ofada).toBe(0);
  });

  it('no crack opens while it works; one passed while it works stays shut for good', () => {
    const run = new Run(withOfada());
    const ev = walkTo(run, 1200);
    expect(ev.some((e) => e.type === 'crackOpen')).toBe(false);
    expect(run.cracks[0]!.state).toBe('sealed');
    expect(run.lives).toBe(RULES.lives);
    // After it wears off, the one passed never opens; a later one does as normal.
    run.power.ofada = 1;
    steps(run, 2);
    standAt(run, 1150);
    const later = walkTo(run, 2300);
    expect(later.filter((e) => e.type === 'crackOpen')).toEqual([{ type: 'crackOpen', x: 2400, w: 60 }]);
    expect(run.cracks[0]!.state).toBe('sealed');
  });

  it('when it wears off, a crack within 240 u ahead stays shut for good (none opens right under your feet)', () => {
    const run = new Run(withOfada());
    walkTo(run, 520);
    run.steer(0);
    standAt(run, 850);
    run.power.ofada = 2;
    steps(run, 3);
    expect(run.cracks[0]!.state).toBe('sealed');
    // Farther than 240 u at the moment it ended: it opens as normal later.
    expect(run.cracks[1]!.state).toBe('shut');
    const ev = walkTo(run, 2200);
    expect(ev.filter((e) => e.type === 'crackOpen').map((e) => (e as { x: number }).x)).toEqual([2400]);
    expect(run.lives).toBe(RULES.lives);
  });

  it('a fall ends it (every food does) and it comes back on the road for the next go', () => {
    const run = new Run(withOfada({ cracks: [[3400, 40]] }));
    walkTo(run, 520);
    expect(run.power.ofada).toBeGreaterThan(0);
    walkTo(run, 3100, 2000);
    expect(run.power.ofada).toBe(0);
    expect(run.foods[0]!.taken).toBe(false); // it comes back for the next go, as every food
  });

  it('the HUD and toast words', () => {
    expect(OGUN_WORDS.hud.ofada(12)).toBe('Ofada 12');
    expect(OGUN_WORDS.toast.ofada).toBe('Ofada rice! Cracks stay shut for 12 seconds.');
    expect(OGUN_WORDS.toast.ofadaWearingOff).toBe('Ofada is wearing off!');
  });
});

describe('Abeokuta played through by the rules', () => {
  it('every crack opens (no ofada taken) and each is jumpable: firm road on both sides of every opened crack', () => {
    const run = new Run(ABK);
    const opened: number[] = [];
    for (const c of ABK.cracks) {
      standAt(run, c.x - RULES.crackReach + 2);
      opened.push(...steps(run, 4).flatMap((e) => (e.type === 'crackOpen' ? [e.x] : [])));
      steps(run, RULES.crackOpenSteps + 1);
    }
    expect(opened).toEqual(ABK.cracks.map((c) => c.x));
    for (const c of ABK.cracks) {
      expect(run.terrain.ground.some((s) => s.x1 === c.x && s.x1 - s.x0 >= 60)).toBe(true);
      expect(run.terrain.ground.some((s) => s.x0 === c.x + c.w && s.x1 - s.x0 >= 60)).toBe(true);
    }
  });
});

describe('the Ogun well room: the Ijebu garri store (ogun.md 3.7)', () => {
  it('the room file: three shelves (sacks, plank shelf, sacks), the parcel on the plank shelf, 5 kobo when one is saved', () => {
    expect(ROOM.id).toBe('ogun-well');
    expect(ROOM.terrain.platforms).toEqual([
      { x: 110, y: 240, w: 90 },
      { x: 240, y: 200, w: 90 },
      { x: 380, y: 250, w: 90 },
    ]);
    expect(ROOM.gift).toMatchObject({ x: 285, y: 176 });
    expect(ROOM.giftIfCarried).toEqual({ x: 285, y: 176, count: 5 });
  });

  it("Abeokuta's well at 3500 goes down into it; the parcel is taken from the plank shelf; up at 4700", () => {
    const run = new Run(ABK, { rooms: ROOMS });
    standAt(run, 3500);
    expect(run.goDown()).toBe(true);
    const ev = steps(run, WELL_RULES.downSteps + WELL_RULES.arriveSteps);
    expect(ev.some((e) => e.type === 'room')).toBe(true);
    expect(run.room!.room.id).toBe('ogun-well');
    // A held jump from under the plank shelf lands on it and takes the parcel.
    standAt(run, 285);
    const got: RunEvent[] = [];
    run.press();
    for (let i = 0; i < 120; i++) got.push(...run.step(DT));
    run.release();
    expect(got.find((e) => e.type === 'parcel')).toEqual({ type: 'parcel', x: 285, y: 176 });
    expect(run.parcel).toBe(true);
    standAt(run, ROOM.exitX);
    expect(run.goUp()).toBe(true);
    const up = steps(run, WELL_RULES.upSteps + 2);
    expect(up.some((e) => e.type === 'wellBack')).toBe(true);
    expect(Math.abs(run.hero.x - 4700)).toBeLessThan(40);
    expect(run.parcel).toBe(true);
  });

  it('with a parcel saved for Ogun, the room shows 5 kobo on the shelf instead', () => {
    const run = new Run(ABK, { rooms: ROOMS, parcelSaved: true });
    standAt(run, 3500);
    run.goDown();
    steps(run, WELL_RULES.downSteps + WELL_RULES.arriveSteps);
    expect(run.room!.gift).toBeNull();
    expect(run.room!.coins.filter((c) => c.y === 176)).toHaveLength(5);
  });

  it("the store keeper: Ogun's own, at his spot; he claps with his own words when the parcel is taken", () => {
    const cast = abeokutaSkin().cast!;
    expect(cast.keeper).toEqual({ look: art.OGUN_STORE_KEEPER, x: art.OGUN_STORE_KEEPER_SPOT.x, words: 'For Pothole Hall. Go well!' });
    const k = new RoomKeeper();
    k.update(0.1, [{ type: 'room' }], 300, cast.keeper);
    expect(k.frame()).toMatch(/^wave/);
    k.update(2, [], 300, cast.keeper);
    expect(k.frame()).toBe('sit');
    k.update(0.1, [{ type: 'parcel', x: 285 }], 300, cast.keeper);
    expect(k.frame()).toMatch(/^clap/);
    expect(k.bubble).toMatchObject({ text: 'For Pothole Hall. Go well!', x: art.OGUN_STORE_KEEPER_SPOT.x + 4 });
  });
});

describe("Abeokuta's look (skin.ts hookups from art)", () => {
  const g = new Proxy({} as Record<string, unknown>, { get: () => () => undefined, set: () => true }) as unknown as CanvasRenderingContext2D;
  beforeEach(() => vi.clearAllMocks());
  const now = (run: Run, L: number, R: number): SkinNow =>
    ({ level: run.level, run, camX: L, viewW: R - L, L, R, H: 420, clock: 1, still: false, fixed: false, people: null, stride: 0 }) as SkinNow;

  it('Abeokuta has its own look, cast and every drawing part', () => {
    const k = ogunStreet(ABK)!;
    expect(k.cast?.name).toBe('abeokuta');
    expect(k.cast?.looks).toBe(art.ABEOKUTA_CAST);
    for (const part of ['backdrop', 'back', 'ground', 'stall', 'food', 'crate', 'icon', 'front', 'hear', 'restart', 'room', 'gift', 'parcelIcon'] as const) expect(typeof k[part]).toBe('function');
    // Each trader calls the line on their own stall.
    art.ABEOKUTA_TRADERS.forEach((t, i) => expect(k.cast!.callOf!(art.ABEOKUTA_TRADER_LOOKS[t])).toBe(OGUN_WORDS.folk.traders.abeokuta[i]));
  });

  it('rocks draw as rocks (the ledge open over its pothole: gap [2000, 2100]); roofs as drying sheds', () => {
    const k = abeokutaSkin();
    const run = new Run(ABK);
    k.ground!(g, now(run, 1000, 2400));
    for (const p of ABK.terrain.platforms) k.stall!(g, p.x, p.y, p.w, 300);
    const rocks = vi.mocked(art.drawRock).mock.calls.map((c) => c.slice(1));
    expect(rocks).toEqual([
      [1200, 100, 50, 300, undefined],
      [1330, 100, 100, 300, undefined],
      [1460, 100, 150, 300, undefined],
      [1900, 300, 90, 300, [2000, 2100]],
    ]);
    expect(vi.mocked(art.drawAbeokutaStall).mock.calls.map((c) => c[1])).toEqual([9040, 9640]);
    expect(gapUnder(ABK, 1200, 100)).toBeUndefined();
  });

  it('water potholes draw with water (their whole gap); other potholes stay plain', () => {
    const k = abeokutaSkin();
    k.ground!(g, now(new Run(ABK), 2400, 3100));
    expect(vi.mocked(art.drawWaterPothole).mock.calls.map((c) => [c[1], c[2]])).toEqual([
      [2600, 2640],
      [2900, 2960],
    ]);
  });

  it('cracks draw with their sign 120 u before the left lip; open goes 0, rumbling, 1', () => {
    const k = abeokutaSkin();
    const run = new Run(street());
    const open = (): number => {
      vi.clearAllMocks();
      k.ground!(g, now(run, 700, 1200));
      expect(vi.mocked(art.drawCrackSign).mock.calls[0]!.slice(1)).toEqual([880, 300]);
      const c = vi.mocked(art.drawCrack).mock.calls[0]!;
      expect(c.slice(1, 3)).toEqual([1000, 40]);
      return c[5]!;
    };
    expect(open()).toBe(0);
    standAt(run, 760);
    steps(run, 1 + RULES.crackOpenSteps / 2);
    expect(open()).toBeCloseTo(0.5, 1);
    steps(run, RULES.crackOpenSteps);
    expect(open()).toBe(1);
    expect(crackOpen({ x: 0, w: 40, state: 'sealed', at: 0 }, 99)).toBe(0);
  });

  it('ofada on the road and in the HUD; garri as Ijebu garri; corn is the game\'s own', () => {
    const k = abeokutaSkin();
    expect(k.food!(g, 'ofada', 6900, 272, 0)).toBe(true);
    expect(vi.mocked(art.drawOfada).mock.calls.map((c) => c.slice(1))).toEqual([[6900, 272, 0]]);
    expect(k.icon!(g, 'ofada', 16, 16, 0.85)).toBe(true);
    expect(vi.mocked(art.drawOfadaIcon).mock.calls.map((c) => c.slice(1))).toEqual([[16, 16, 0.85]]);
    expect(k.food!(g, 'garri', 0, 0, 0)).toBe(true);
    expect(k.food!(g, 'corn', 0, 0, 0)).toBe(false);
  });

  it('the room: the store, then the shelves in order (sacks, plank shelf, sacks); the Ijebu parcel and its HUD icon', () => {
    const k = abeokutaSkin();
    expect(k.room!(g, ROOM, 0, 640, 0, 420, true)).toBe(true);
    expect(vi.mocked(art.drawOgunWellRoom).mock.calls.map((c) => c.slice(1))).toEqual([[0, 640, 0, 420, true]]);
    expect(vi.mocked(art.drawSackStack).mock.calls.map((c) => c.slice(1))).toEqual([
      [110, 240, 90],
      [380, 250, 90],
    ]);
    expect(vi.mocked(art.drawOgunShelf).mock.calls.map((c) => c.slice(1))).toEqual([[240, 200, 90]]);
    const order = [vi.mocked(art.drawSackStack).mock.invocationCallOrder[0]!, vi.mocked(art.drawOgunShelf).mock.invocationCallOrder[0]!, vi.mocked(art.drawSackStack).mock.invocationCallOrder[1]!];
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(k.gift!(g, 285, 176, 0)).toBe(true);
    expect(vi.mocked(art.drawIjebuParcel).mock.calls.map((c) => c.slice(1))).toEqual([[285, 176, 0]]);
    k.parcelIcon!(g, 16, 16, 26);
    expect(vi.mocked(art.drawIjebuParcelIcon).mock.calls.map((c) => c.slice(1))).toEqual([[16, 16, 26]]);
  });
});
