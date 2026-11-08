/**
 * L2: the well and its room (docs/design.md S2.5). Going down at an entrance well, the street
 * frozen while below, the room from lagos-well.json (shelves, 17 kobo, the kobo crate, the garri
 * parcel), going up at the exit well with safety and the hazards near it gone, the parcel kept
 * on a lost life and lost on game over or leaving, and the room remembering this play.
 */
import { afterEach, describe, expect, it } from 'vitest';
import lagos2 from '../../src/data/levels/lagos-2.json';
import lagos3 from '../../src/data/levels/lagos-3.json';
import lagosWell from '../../src/data/levels/lagos-well.json';
import { WELL_DOWN_TIME, WELL_UP_TIME, WELL_COLOURS } from '../../src/art/well';
import { ROOM as ART_ROOM, ROOM_COLOURS } from '../../src/art/wellRoom';
import { Controls, WELL_KEYS } from '../../src/engine/input';
import { fitView } from '../../src/engine/view';
import { FEATURES } from '../../src/game/features';
import { Game } from '../../src/game/game';
import { parseLevel, type Level } from '../../src/game/level';
import { RULES, Run, STEPS_PER_SECOND, type RunEvent } from '../../src/game/run';
import { WELL_RULES, freshRoom, parseRoom, roomWalls } from '../../src/game/well';
import { buttonLayout, wellButtonBox } from '../../src/screens/controls';
import { SHORT_AT, WORDS, barWords, hintWords } from '../../src/screens/words';
import { recorder } from './recorder';

const DT = 1 / 60;
const ROOM = parseRoom(structuredClone(lagosWell));
const ROOMS = new Map([[ROOM.id, ROOM]]);
const L2 = parseLevel(structuredClone(lagos2));
const L3 = parseLevel(structuredClone(lagos3));
const WELL2 = L2.wells[0]!;

afterEach(() => {
  FEATURES.wells = true;
});

const newRun = (level: Level = L2, opts: { gentle?: boolean; parcelSaved?: boolean } = {}): Run => new Run(level, { rooms: ROOMS, ...opts });

/** The hero standing still on the ground (or floor) at x. */
function standAt(run: Run, x: number): void {
  const gy = run.below ? run.room!.room.groundY : run.level.groundY;
  Object.assign(run.hero, { x, y: gy, prevY: gy, vy: 0, vx: 0, speed: 0, grounded: true, on: null, move: 0, runTime: 0 });
}

function steps(run: Run, n: number): RunEvent[] {
  const out: RunEvent[] = [];
  for (let i = 0; i < n; i++) out.push(...run.step(DT));
  return out;
}

/** Down the street 2 well and into the room, standing on the floor. */
function goBelow(run: Run): RunEvent[] {
  standAt(run, WELL2.x);
  expect(run.goDown()).toBe(true);
  return steps(run, WELL_RULES.downSteps + WELL_RULES.arriveSteps);
}

/** Up the rope and back on the street. */
function goUp(run: Run): RunEvent[] {
  standAt(run, ROOM.exitX);
  expect(run.goUp()).toBe(true);
  return steps(run, WELL_RULES.upSteps);
}

/** Carries the hero over every coin and the gift in the room (as a hand would). */
function sweepRoom(run: Run): RunEvent[] {
  const out: RunEvent[] = [];
  const play = run.room!;
  const spots = [...play.coins.map((c) => ({ x: c.x, y: c.y })), ...(play.gift ? [play.gift] : [])];
  for (const s of spots) {
    Object.assign(run.hero, { x: s.x, y: s.y + 20, prevY: s.y + 20, vy: 0, grounded: false, on: null });
    out.push(...run.step(DT));
  }
  standAt(run, 300);
  return out;
}

describe('the room file (lagos-well.json, S2.5 The room)', () => {
  it('reads every field: floor at 300, walls at 30 and 530, arrive at 60, the rope at 500', () => {
    expect(ROOM).toMatchObject({ id: 'lagos-well', width: 560, leftLimit: 30, rightLimit: 530, entryX: 60, exitX: 500, groundY: 300 });
    expect(ROOM.terrain.ground).toEqual([{ x0: 0, x1: 560 }]);
    expect(ROOM.terrain.platforms).toEqual([
      { x: 120, y: 250, w: 80 },
      { x: 250, y: 200, w: 90 },
      { x: 400, y: 240, w: 80 },
    ]);
    // Art draws the same room: arrive and exit places, floor and width.
    expect(ART_ROOM).toMatchObject({ w: ROOM.width, floorY: ROOM.groundY, arriveX: ROOM.entryX, exitX: ROOM.exitX });
  });

  it('holds 14 kobo in rows plus one kobo crate at x 370 (3 kobo): 17 in all, and the parcel at (295, 176)', () => {
    expect(ROOM.coins).toHaveLength(14);
    expect(ROOM.crates).toEqual([{ x: 370, bottomY: 204, contents: 'kobo' }]);
    expect(ROOM.gift).toEqual({ x: 295, y: 176, kind: 'parcel' });
    expect(ROOM.giftIfCarried).toEqual({ x: 295, y: 176, count: 5 });
  });

  it('the crate hangs from the room beam (its rope top is the beam)', () => {
    expect(ROOM.crates[0]!.bottomY - 28 - 60).toBe(ART_ROOM.beamY);
  });

  it('every kobo is inside the walls and above the floor; no coin is inside the crate', () => {
    const { lo, hi } = roomWalls(ROOM);
    for (const c of ROOM.coins) {
      expect(c.x).toBeGreaterThanOrEqual(lo);
      expect(c.x).toBeLessThanOrEqual(hi);
      expect(c.y).toBeLessThan(ROOM.groundY);
      const crate = ROOM.crates[0]!;
      const inside = Math.abs(c.x - crate.x) < 16 + 8 && c.y > crate.bottomY - 28 - 8 && c.y < crate.bottomY + 8;
      expect(inside, `coin at ${c.x}, ${c.y}`).toBe(false);
    }
  });

  it('gives a clear message for a broken room file', () => {
    const bad = structuredClone(lagosWell) as Record<string, unknown>;
    bad['exitX'] = 900;
    expect(() => parseRoom(bad)).toThrow('Room lagos-well: exitX should be between leftLimit and rightLimit');
    expect(() => parseRoom({ ...structuredClone(lagosWell), type: 'street' })).toThrow('Room lagos-well: type should be "room"');
    expect(() => parseRoom({ ...structuredClone(lagosWell), gift: [295, 176, 'cake'] })).toThrow('gift[2] should be "parcel"');
  });

  it('every well on every street names a room that exists', () => {
    for (const L of [L2, L3]) for (const w of L.wells) expect(ROOMS.has(w.room), `${L.id} well at ${w.x}`).toBe(true);
  });

  it('a state with a saved parcel shows 5 kobo on the middle shelf instead (gift rule 6, for N2)', () => {
    const play = freshRoom(ROOM, true);
    expect(play.gift).toBeNull();
    const extra = play.coins.slice(ROOM.coins.length);
    expect(extra).toHaveLength(5);
    const shelf = ROOM.terrain.platforms[1]!;
    for (const c of extra) {
      expect(c.y).toBe(176);
      expect(c.x).toBeGreaterThanOrEqual(shelf.x - 4);
      expect(c.x).toBeLessThanOrEqual(shelf.x + shelf.w + 4);
    }
    expect(extra.reduce((s, c) => s + c.x, 0) / 5).toBeCloseTo(295, 6); // centred on 295
    const run = newRun(L2, { parcelSaved: true });
    goBelow(run);
    expect(run.room!.gift).toBeNull();
    expect(run.room!.coins).toHaveLength(19);
  });
});

describe('going down (S2.5 The well on the street)', () => {
  it('Go down shows only on the ground with the centre within the well x plus or minus 20', () => {
    const run = newRun();
    for (const [dx, yes] of [
      [0, true],
      [20, true],
      [-20, true],
      [21, false],
      [-21, false],
    ] as const) {
      standAt(run, WELL2.x + dx);
      expect(run.wellHere === WELL2, `at ${dx}`).toBe(yes);
    }
    standAt(run, WELL2.x);
    Object.assign(run.hero, { grounded: false, y: 250 });
    expect(run.wellHere).toBeNull();
    expect(run.goDown()).toBe(false);
  });

  it('the exit well cannot be used to go down', () => {
    const run = newRun();
    standAt(run, WELL2.exitX);
    expect(run.wellHere).toBeNull();
    expect(run.goDown()).toBe(false);
    expect(run.phase).toBe('run');
  });

  it('nothing happens with the wells switch off, or when the room file is missing', () => {
    FEATURES.wells = false;
    const off = newRun();
    standAt(off, WELL2.x);
    expect(off.goDown()).toBe(false);
    FEATURES.wells = true;
    const noRoom = new Run(L2);
    standAt(noRoom, WELL2.x);
    expect(noRoom.wellHere).toBeNull();
  });

  it('locks the controls: no steering, no jump, the hero moves to the rope; crank clicks, then the room after 1.2 s', () => {
    const run = newRun();
    standAt(run, WELL2.x + 15);
    run.steer(1);
    expect(run.goDown()).toBe(true);
    expect(run.phase).toBe('wellDown');
    expect(run.hero.move).toBe(0);
    const first = run.step(DT);
    expect(first.map((e) => e.type)).toContain('wellDown');
    run.steer(1);
    expect(run.hero.move).toBe(0);
    expect(run.press('k')).toBeNull();
    const evs = steps(run, WELL_RULES.downSteps - 2);
    expect(run.phase).toBe('wellDown');
    expect(run.hero.x).toBeCloseTo(WELL2.x, 6); // on the rope, over the mouth
    expect(run.hero.y).toBeGreaterThan(L2.groundY); // down inside the well
    expect(evs.some((e) => e.type === 'room')).toBe(false);
    expect(WELL_RULES.downSteps).toBe(Math.round(WELL_DOWN_TIME * STEPS_PER_SECOND));
    expect(run.step(DT).map((e) => e.type)).toContain('room');
    expect(run.phase).toBe('roomIn');
  });

  it('the screen fades to dark in the last 0.4 s going down, then back in the room', () => {
    const run = newRun();
    standAt(run, WELL2.x);
    run.goDown();
    const fades: number[] = [];
    for (let i = 0; i < WELL_RULES.downSteps + WELL_RULES.arriveSteps; i++) {
      run.step(DT);
      fades.push(run.fade);
    }
    expect(fades[Math.round(0.7 * 60)]).toBe(0);
    expect(fades[WELL_RULES.downSteps - 1]).toBe(1);
    expect(fades[WELL_RULES.downSteps + WELL_RULES.arriveFadeSteps]).toBe(0);
    expect(run.fade).toBe(0);
  });

  it('the hero arrives at x 60 on the floor, facing right, standing; the room has its toast words', () => {
    const run = newRun();
    goBelow(run);
    expect(run.phase).toBe('room');
    expect(run.below).toBe(true);
    expect(run.hero).toMatchObject({ x: ROOM.entryX, y: ROOM.groundY, dir: 1, vx: 0 });
    run.step(DT);
    expect(run.hero.grounded).toBe(true);
    expect(WORDS.toast.roomArrive).toBe('A secret room! Grab the kobo. Stand under the rope to go back up.');
    expect(barWords(WORDS.toast.roomArrive, 100)).toBe('Secret room! Use the rope to go up.');
  });

  it('the street is frozen while below: hazards, foods, corn and amala timers, the shield all wait', () => {
    const run = newRun();
    // A goat woken near the well, corn and amala running, a shield on.
    const goat = run.hazards.find((z) => z.kind === 'goat' && z.x0 === 3250)!;
    goat.mode = 'move';
    goat.vx = -36;
    goat.x = 3100;
    run.power = { corn: 200, amala: 300, shield: true };
    standAt(run, WELL2.x);
    run.goDown();
    steps(run, WELL_RULES.downSteps + WELL_RULES.arriveSteps + 600); // 10 s in the room
    expect(goat).toMatchObject({ x: 3100, mode: 'move' });
    expect(run.power).toEqual({ corn: 200, amala: 300, shield: true });
    expect(run.lives).toBe(3);
  });

  it('the hint shows "Go down" on touch and "↓" on keys, 35 characters or fewer', () => {
    const hint = L2.hints.find((h) => h.needs === 'wells')!;
    expect(hintWords(hint.words, 'touch')).toBe('A well! Stand by it. Press Go down.');
    expect(hintWords(hint.words, 'keys')).toBe('A well! Stand by it. Press ↓.');
    for (const k of ['touch', 'keys'] as const) expect(hintWords(hint.words, k).length).toBeLessThanOrEqual(35);
  });
});

describe('the room (S2.5 The room, The gift)', () => {
  it('walls keep the hero\'s centre 7 u inside x 30 and 530; the floor is solid wall to wall', () => {
    const run = newRun();
    goBelow(run);
    run.steer(-1);
    steps(run, 120);
    expect(run.hero.x).toBe(37);
    run.steer(1);
    steps(run, 360);
    expect(run.hero.x).toBe(523);
    expect(run.hero.y).toBe(ROOM.groundY);
    expect(run.lives).toBe(3);
  });

  it('a jump works, and a tap jump lands on the first shelf (one-way, 50 high)', () => {
    const run = newRun();
    goBelow(run);
    standAt(run, 160);
    expect(run.press('k')).toBe('ground');
    run.release('k');
    let landed = false;
    for (let i = 0; i < 120; i++) {
      run.step(DT);
      if (run.hero.grounded && run.hero.on?.y === 250) landed = true;
    }
    expect(landed).toBe(true);
  });

  it('the kobo crate opens from below and gives 3 kobo; picking up every coin makes 17', () => {
    const run = newRun();
    goBelow(run);
    standAt(run, 370);
    run.press('k'); // held: the higher jump
    const evs = steps(run, 60);
    run.release('k');
    expect(evs.some((e) => e.type === 'crate' && e.contents === 'kobo')).toBe(true);
    expect(run.room!.crates[0]!.open).toBe(true);
    expect(run.kobo).toBe(3);
    sweepRoom(run);
    expect(run.kobo).toBe(17);
  });

  it('touching the parcel picks it up: "got it", the toast words, the HUD shows it; it is not a shield', () => {
    const run = newRun();
    goBelow(run);
    expect(run.parcel).toBe(false);
    const evs = sweepRoom(run);
    expect(evs.filter((e) => e.type === 'parcel')).toHaveLength(1);
    expect(run.parcel).toBe(true);
    expect(run.power.shield).toBe(false); // it does nothing on the street (gift rule 2)
    expect(WORDS.toast.parcel).toBe('Garri parcel! Shield for the hall.');
    // Short enough for every bar (po ruling, 8 Nov 2026): no short-words row, the full words show.
    expect(WORDS.toast.parcel.length).toBeLessThanOrEqual(SHORT_AT);
    expect(barWords(WORDS.toast.parcel, 78)).toBe('Garri parcel! Shield for the hall.');
    expect(WORDS.hud.parcel).toBe('Parcel');
  });

  it('corn still makes the hero quicker in the room, but its timer waits', () => {
    const run = newRun();
    run.power.corn = 100;
    goBelow(run);
    run.steer(1);
    let top = 0;
    for (let i = 0; i < 200; i++) {
      run.step(DT);
      top = Math.max(top, run.hero.speed);
    }
    expect(top).toBe(L2.cornSpeed);
    expect(run.power.corn).toBe(100);
  });
});

describe('going up (S2.5 Going up)', () => {
  it('Go up shows only on the floor with the centre within the rope x plus or minus 20, never from a shelf', () => {
    const run = newRun();
    goBelow(run);
    for (const [dx, yes] of [
      [0, true],
      [20, true],
      [-20, true],
      [21, false],
      [-21, false],
    ] as const) {
      standAt(run, ROOM.exitX + dx);
      expect(run.underRope, `at ${dx}`).toBe(yes);
    }
    // On the third shelf (400 to 480) at x 480: within reach of the rope, but not on the floor.
    const shelf = ROOM.terrain.platforms[2]!;
    Object.assign(run.hero, { x: 480, y: shelf.y, prevY: shelf.y, grounded: true, on: shelf });
    expect(run.underRope).toBe(false);
    expect(run.goUp()).toBe(false);
  });

  it('only from the room: Go up does nothing on the street', () => {
    const run = newRun();
    standAt(run, WELL2.x);
    expect(run.underRope).toBe(false);
    expect(run.goUp()).toBe(false);
  });

  it('rises 1.0 s with the fade, then the hero is at exitX + 30, standing, facing right, with 1.0 s of blinking safety', () => {
    const run = newRun();
    goBelow(run);
    standAt(run, ROOM.exitX - 12);
    run.steer(-1);
    expect(run.goUp()).toBe(true);
    expect(run.hero.move).toBe(0);
    const up = steps(run, WELL_RULES.upSteps - 1);
    expect(up.map((e) => e.type)).toContain('wellUp');
    expect(run.phase).toBe('wellUp');
    expect(run.hero.x).toBe(ROOM.exitX);
    expect(run.hero.y).toBeLessThan(ROOM.groundY - 100);
    expect(run.fade).toBeGreaterThan(0.9);
    expect(WELL_RULES.upSteps).toBe(Math.round(WELL_UP_TIME * STEPS_PER_SECOND));
    const back = run.step(DT);
    expect(back).toContainEqual({ type: 'wellBack', x: WELL2.exitX });
    expect(run.phase).toBe('run');
    expect(run.below).toBe(false);
    expect(run.hero).toMatchObject({ x: WELL2.exitX + 30, y: L2.groundY, dir: 1, vx: 0, move: 0 });
    expect(run.safe).toBe(WELL_RULES.surfaceSafeSteps);
    expect(run.fade).toBe(1);
    steps(run, WELL_RULES.surfaceFadeSteps);
    expect(run.fade).toBe(0);
    expect(WORDS.toast.backOnStreet).toBe('Back on the street!');
  });

  it('woken hazards within 300 u of the exit are gone; ones further away, and unwoken ones, stay', () => {
    const run = newRun();
    const near = run.hazards.find((z) => z.x0 === 3250)!;
    near.mode = 'move';
    near.x = WELL2.exitX - 300;
    const far = run.hazards.find((z) => z.x0 === 6300)!;
    far.mode = 'move';
    far.x = WELL2.exitX + 301;
    const sleeping = run.hazards.find((z) => z.x0 === 6600)!;
    sleeping.x = WELL2.exitX + 250; // (the level rule keeps them 400 u away; this tests the rule only)
    goBelow(run);
    goUp(run);
    expect(near.mode).toBe('gone');
    expect(far.mode).toBe('move');
    expect(sleeping.mode).toBe('wait');
  });

  it('the blinking safety means a hazard touched at once does no harm', () => {
    const run = newRun();
    goBelow(run);
    goUp(run);
    const z = run.hazards.find((h) => h.x0 === 6300)!;
    Object.assign(z, { mode: 'move', x: run.hero.x, vx: 0 });
    steps(run, 10);
    expect(run.lives).toBe(3);
  });

  it('hints over the road gone under stay quiet, so "Back on the street!" shows', () => {
    const level = parseLevel({ ...structuredClone(lagos2), hints: [[3500, 'Kobo up high!'], [5200, 'Bus stop! Now you start here.']] });
    const run = new Run(level, { rooms: ROOMS });
    goBelow(run);
    goUp(run);
    const evs = steps(run, 30);
    expect(evs.filter((e) => e.type === 'hint')).toEqual([]);
  });

  it('the exit well is before the bus stop on every street, so the stop is never skipped', () => {
    for (const L of [L2, L3]) for (const w of L.wells) expect(w.exitX + WELL_RULES.exitStep).toBeLessThan(L.checkpoint);
  });

  it('street 3: the secret well behind the start comes up at 1330, ahead of the start', () => {
    const run = new Run(L3, { rooms: ROOMS });
    const w = L3.wells[0]!;
    standAt(run, w.x);
    expect(run.goDown()).toBe(true);
    steps(run, WELL_RULES.downSteps + WELL_RULES.arriveSteps);
    standAt(run, ROOM.exitX);
    run.goUp();
    steps(run, WELL_RULES.upSteps);
    expect(run.hero.x).toBe(1330);
  });
});

describe('the room remembers this play; the parcel and lost lives (S2.5 gift rules 3, Going up rule 6)', () => {
  it('going down again: kobo taken stay taken, the crate stays open, the parcel is gone; nothing doubles', () => {
    const run = newRun();
    goBelow(run);
    standAt(run, 370);
    run.press('k');
    steps(run, 60);
    run.release('k');
    sweepRoom(run);
    expect(run.kobo).toBe(17);
    goUp(run);
    // Walk back to the entrance and go down again.
    standAt(run, WELL2.x);
    expect(run.goDown()).toBe(true);
    const evs = steps(run, WELL_RULES.downSteps + WELL_RULES.arriveSteps);
    expect(evs.map((e) => e.type)).toContain('room');
    expect(run.room!.coins.every((c) => c.taken)).toBe(true);
    expect(run.room!.crates[0]!.open).toBe(true);
    expect(run.room!.gift!.taken).toBe(true);
    const again = sweepRoom(run);
    expect(again.filter((e) => e.type === 'kobo' || e.type === 'parcel')).toEqual([]);
    expect(run.kobo).toBe(17);
    expect(run.parcel).toBe(true);
  });

  it('a lost life after the room keeps the parcel and the room as it was; back at the bus stop', () => {
    const run = newRun();
    goBelow(run);
    sweepRoom(run);
    goUp(run);
    expect(run.parcel).toBe(true);
    // Into the big pit after the bus stop (5800 to 5970).
    standAt(run, 5300);
    run.step(DT); // reaches the bus stop
    Object.assign(run.hero, { x: 5880, y: 300, grounded: false, vy: 400 });
    let fell = false;
    for (let i = 0; i < 120 && !fell; i++) fell = run.step(DT).some((e) => e.type === 'fall');
    expect(fell).toBe(true);
    expect(run.lives).toBe(2);
    expect(run.parcel).toBe(true);
    expect(run.hero.x).toBe(L2.checkpoint);
    expect(run.roomPlay(0)!.gift!.taken).toBe(true);
    expect(run.roomPlay(0)!.coins.every((c) => c.taken)).toBe(true);
  });

  it('losing the last life after the room is game over (the next try starts without the parcel)', () => {
    const run = newRun();
    goBelow(run);
    sweepRoom(run);
    goUp(run);
    run.safe = 0;
    const z = run.hazards.find((h) => h.x0 === 6300)!;
    Object.assign(z, { mode: 'move', x: run.hero.x + 2, vx: 0 });
    run.lives = 1; // the last life: game over
    const evs = steps(run, 2);
    expect(evs.map((e) => e.type)).toContain('gameOver');
    expect(run.phase).toBe('over');
  });

  it('game over, "Start again" or leaving the street loses the parcel (a new run); one parcel never stacks', () => {
    const game = new Game(L2);
    game.rooms = ROOMS;
    game.begin(false);
    goBelow(game.run);
    sweepRoom(game.run);
    expect(game.run.parcel).toBe(true);
    game.begin(false); // Start again / Play again
    expect(game.run.parcel).toBe(false);
    expect(game.run.roomPlay(0)).toBeNull();
    goBelow(game.run);
    sweepRoom(game.run);
    game.reset(); // Home
    expect(game.run.parcel).toBe(false);
  });

  it('skipping the well never blocks the street: it plays to the bus without going down', () => {
    const run = newRun();
    standAt(run, WELL2.x);
    run.steer(1);
    for (let i = 0; i < 60; i++) run.step(DT);
    expect(run.phase).toBe('run');
    expect(run.hero.x).toBeGreaterThan(WELL2.x + 20);
    expect(run.wellHere).toBeNull();
  });
});

describe('drawing the well and the room (Game)', () => {
  const WIDE = fitView(851, 393, 1);
  const SQUARE = fitView(1024, 768, 1); // 560 u wide: the whole room
  const NARROW = fitView(500, 420, 1); // 500 u wide: the camera follows inside the room

  function game(view = WIDE): Game {
    const g = new Game(L2);
    g.rooms = ROOMS;
    g.begin(false);
    g.setView(view);
    return g;
  }

  it('going down draws the well (back, the hero clipped at the rim, front) and the fade, with no broken numbers', () => {
    const g = game();
    standAt(g.run, WELL2.x);
    (g as unknown as { snapCamera(): void }).snapCamera();
    g.goDown();
    for (let i = 0; i < WELL_RULES.downSteps - 1; i++) {
      g.update(DT);
      const r = recorder();
      g.render(r.g, WIDE);
      expect(r.bad).toEqual([]);
      expect(r.depth()).toBe(0);
      if (i === 40) {
        expect(r.colours).toContain(WELL_COLOURS.plaster);
        expect(r.calls.some((c) => c.name === 'clip')).toBe(true);
      }
    }
  });

  it('in the room: earth walls and lamps (no water, no blue bricks), shelves, the parcel; the room centred on a wide screen', () => {
    const g = game(WIDE);
    goBelow(g.run);
    g.update(DT);
    const r = recorder();
    g.render(r.g, WIDE);
    expect(r.bad).toEqual([]);
    expect(r.colours).toContain(ROOM_COLOURS.wall);
    expect(r.colours).toContain(ROOM_COLOURS.leaf); // the parcel
    expect(g.camera).toBeCloseTo((ROOM.width - WIDE.width) / 2, 6);
  });

  it('the room exactly fills a 560 u screen; a narrower one follows the hero, kept inside the room', () => {
    const sq = game(SQUARE);
    goBelow(sq.run);
    sq.update(DT);
    expect(SQUARE.width).toBeCloseTo(560, 6);
    expect(sq.camera).toBeCloseTo(0, 6);
    const n = game(NARROW);
    goBelow(n.run);
    n.update(DT);
    expect(n.camera).toBe(0); // at the left, by the arriving bucket
    n.steer(1);
    for (let i = 0; i < 300; i++) n.update(DT);
    expect(n.camera).toBeCloseTo(ROOM.width - NARROW.width, 1);
    expect(n.camera).toBeLessThanOrEqual(ROOM.width - NARROW.width);
  });

  it('back on the street the camera jumps to the hero at the exit well', () => {
    const g = game();
    goBelow(g.run);
    standAt(g.run, ROOM.exitX);
    g.goUp();
    for (let i = 0; i < WELL_RULES.upSteps; i++) g.update(DT);
    expect(g.run.phase).toBe('run');
    expect(g.camera).toBeLessThan(WELL2.exitX + 30);
    expect(g.camera + WIDE.width).toBeGreaterThan(WELL2.exitX + 30);
  });

  it('reduced motion: the arrow does not bob and the room\'s lamps, rope and parcel hold still', () => {
    const a = game();
    a.still = true;
    standAt(a.run, WELL2.x - 300);
    (a as unknown as { snapCamera(): void }).snapCamera();
    /** The drawing calls of the moving parts: the well's arrow at x 2950; the lamps, rope and parcel below. */
    const marks = new Set([WELL2.x, ...ART_ROOM.lamps, ROOM.exitX, ROOM.gift.x]);
    const draw = (t: number): string => {
      a.clock = t;
      const r = recorder();
      a.render(r.g, WIDE);
      return JSON.stringify(r.calls.filter((c) => ['moveTo', 'lineTo', 'arc', 'translate', 'quadraticCurveTo'].includes(c.name) && marks.has(c.args[0] as number)));
    };
    expect(draw(0.3)).toBe(draw(1.1));
    a.still = false;
    expect(draw(0.3)).not.toBe(draw(1.1)); // (it does move with motion on)
    a.still = true;
    goBelow(a.run);
    a.update(DT);
    standAt(a.run, 200);
    expect(draw(0.3)).toBe(draw(1.1));
    a.still = false;
    expect(draw(0.3)).not.toBe(draw(1.1));
  });
});

describe('the Go down and Go up button and keys (S2.2, S2.5, S2.10)', () => {
  it('Down, S, Enter and E are well keys; key repeat is ignored; they never jump or steer', () => {
    const keys: string[] = [];
    const jumps: unknown[] = [];
    const c = new Controls(
      { onJumpPress: (b) => jumps.push(b), onJumpRelease: () => {}, onMove: () => {}, onWellKey: (k) => keys.push(k) },
      () => ({ width: 800, height: 400, midX: 100, buttons: true }),
    );
    for (const k of ['ArrowDown', 'KeyS', 'Enter', 'KeyE']) expect(c.keyDown(k, false)).toBe(true);
    expect(c.keyDown('Enter', true)).toBe(true);
    expect(keys).toEqual(['ArrowDown', 'KeyS', 'Enter', 'KeyE']);
    expect(jumps).toEqual([]);
    expect(c.dir).toBe(0);
    expect(c.lastKind).toBe('keys');
    expect([...WELL_KEYS]).toEqual(['ArrowDown', 'KeyS', 'Enter', 'KeyE']);
  });

  it('the button is max(56, D) tall and 2.2 D wide, its bottom 8 px above the crank top, centred on the well', () => {
    const layout = buttonLayout(851, 393);
    const b = wellButtonBox({ x: 400, y: 200 }, 851, layout);
    expect(b.h).toBe(Math.max(56, layout.d));
    expect(b.w).toBe(Math.round(2.2 * layout.d));
    expect(b.y + b.h).toBe(192);
    expect(b.x + b.w / 2).toBeCloseTo(400, 0);
  });

  it('kept inside the screen and below the top 56 px', () => {
    const layout = buttonLayout(320, 240);
    const left = wellButtonBox({ x: 5, y: 120 }, 320, layout);
    expect(left.x).toBe(4);
    const right = wellButtonBox({ x: 318, y: 120 }, 320, layout);
    expect(right.x + right.w).toBe(316);
    const high = wellButtonBox({ x: 160, y: 60 }, 320, layout);
    expect(high.y).toBe(56);
  });

  it('words: "Go down" / "Go up" on touch; "Go down (↓)" / "Go up (Enter)" on a computer', () => {
    expect(WORDS.well).toEqual({ down: 'Go down', downKeys: 'Go down (↓)', up: 'Go up', upKeys: 'Go up (Enter)' });
  });
});

describe('numbers match the design', () => {
  it('reach 20, down 1.2 s, up 1.0 s, out at exit + 30, 1.0 s safety, hazards cleared within 300 u', () => {
    expect(WELL_RULES).toMatchObject({ reach: 20, downSteps: 72, upSteps: 60, exitStep: 30, surfaceSafeSteps: 60, clearRadius: 300 });
    expect(RULES.wallGap).toBe(WELL_RULES.wallGap);
  });
});
