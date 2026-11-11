/**
 * K2: Lagos streets 2 and 3 in play (docs/design.md S2.6). Each street draws its own look from
 * its `theme` (art K1), drums roll and bounce with their own pictures and sounds, wells are
 * drawn (and work since L2), street 3's secret well is reached by walking back, and a simple two-thumb
 * bot (the same moves as the e2e hand bot) gets every street from the start to the bus.
 */
import { afterEach, describe, expect, it } from 'vitest';
import lagos1 from '../../src/data/levels/lagos-1.json';
import lagos2 from '../../src/data/levels/lagos-2.json';
import lagos3 from '../../src/data/levels/lagos-3.json';
import { PARK_SIGNS } from '../../src/art/buspark';
import { DRUM_BODY } from '../../src/art/drum';
import { MARKET_SIGNS } from '../../src/art/market';
import { SHOP_SIGNS } from '../../src/art/street';
import { WELL_COLOURS } from '../../src/art/well';
import { fitView, type View } from '../../src/engine/view';
import { FEATURES } from '../../src/game/features';
import { Game } from '../../src/game/game';
import { parseLevel, type Level } from '../../src/game/level';
import { Run, type RunEvent } from '../../src/game/run';
import { recorder } from './recorder';

const DT = 1 / 60;
const L1 = parseLevel(structuredClone(lagos1));
const L2 = parseLevel(structuredClone(lagos2));
const L3 = parseLevel(structuredClone(lagos3));
const WIDE = fitView(851, 393, 1);
const NARROW = fitView(320, 240, 1);

afterEach(() => {
  FEATURES.wells = true;
});

const snap = (game: Game): void => (game as unknown as { snapCamera(): void }).snapCamera();

/** A game standing at x, camera snapped there, drawn once. */
function drawnAt(level: Level, x: number, view: View = WIDE) {
  const game = new Game(level);
  game.begin(false);
  game.setView(view);
  Object.assign(game.hero, { x });
  snap(game);
  const r = recorder();
  game.render(r.g, view);
  return { game, r };
}

describe('each street draws its own look from its theme (art K1)', () => {
  const cases = [
    { L: L1, theme: 'morning', signs: SHOP_SIGNS },
    { L: L2, theme: 'market', signs: MARKET_SIGNS },
    { L: L3, theme: 'evening', signs: PARK_SIGNS },
  ] as const;
  it.each(cases)('$L.id is $theme, with its own signs, from start to bus with no broken numbers', ({ L, theme, signs }) => {
    expect(L.theme).toBe(theme);
    const seen = new Set<string>();
    for (let x = L.spawnX; x <= L.end!.x; x += 400) {
      const { r } = drawnAt(L, x);
      expect(r.bad, `${L.id} at ${x}`).toEqual([]);
      for (const t of r.texts) seen.add(t);
    }
    for (const s of signs) expect([...seen], `${L.id} shows ${s}`).toContain(s);
    // Another street's signs never show here (VULCANIZER is on both street 1 and street 3).
    const others = cases.filter((c) => c.L !== L).flatMap((c) => c.signs.filter((s) => !(signs as readonly string[]).includes(s)));
    for (const s of others) expect([...seen], `${L.id} does not show ${s}`).not.toContain(s);
  });
});

describe('the rolling drum (S2.6) in play', () => {
  it('draws with art K1 (the blue ridged drum), not the tyre', () => {
    const { r } = drawnAt(L3, 1600);
    expect(r.colours).toContain(DRUM_BODY);
  });

  it('wakes with an event (the "dum" sound) and rolls left at 84 u/s', () => {
    const run = new Run(L3);
    Object.assign(run.hero, { x: 1300 });
    const ev: RunEvent[] = [];
    for (let i = 0; i < 3; i++) ev.push(...run.step(DT));
    const wake = ev.find((e) => e.type === 'wake');
    expect(wake).toMatchObject({ type: 'wake', kind: 'drum', x: 1800 });
    const drum = run.hazards.find((z) => z.kind === 'drum')!;
    expect(drum.vx).toBe(-84);
  });

  it('landing on it bounces (vy -480) and it rolls on into its own sparkle; amala smashes it for +2 kobo', () => {
    const game = new Game(L3);
    game.begin(false);
    const drum = game.run.hazards.find((z) => z.kind === 'drum')!;
    Object.assign(drum, { mode: 'move', vx: -84, x: 1500 });
    Object.assign(game.hero, { x: 1500, y: 268, vy: 300, prevY: 268, grounded: false });
    snap(game);
    const seen: string[] = [];
    game.onEvent = (e) => seen.push(e.type);
    game.update(DT);
    expect(seen).toContain('bounce');
    expect(game.hero.vy).toBe(-480);
    expect(drum.mode).toBe('gone');
    const r = recorder();
    game.render(r.g, WIDE);
    expect(r.colours, 'the clang ring of the drum sparkle').toContain('#d6ecff');

    const smash = new Game(L3);
    smash.begin(false);
    const d2 = smash.run.hazards.find((z) => z.kind === 'drum')!;
    Object.assign(d2, { mode: 'move', vx: -84, x: 1500 });
    smash.run.power.amala = 300;
    Object.assign(smash.hero, { x: 1495, y: 300, vy: 0, grounded: true });
    snap(smash);
    smash.update(DT);
    expect(d2.mode).toBe('gone');
    expect(smash.run.kobo).toBe(2);
  });
});

describe('wells (switched on in L2)', () => {
  it('both wells of street 2 are drawn (art L1), and the hero walks past them', () => {
    for (const x of [2950, 4100]) {
      const { r } = drawnAt(L2, x);
      expect(r.colours, `well at ${x}`).toContain(WELL_COLOURS.plaster);
    }
  });

  it('the "Press Go down" hint stays quiet while the wells switch is off, and shows once it is on', () => {
    const along = (): string[] => {
      const run = new Run(L2);
      const words: string[] = [];
      for (let x = 2700; x <= 2900; x += 20) {
        Object.assign(run.hero, { x, y: L2.groundY, vy: 0 });
        for (const e of run.step(DT)) if (e.type === 'hint' && /well/.test(e.words)) words.push(e.words);
      }
      return words;
    };
    expect(FEATURES.wells).toBe(true);
    expect(along()).toEqual(['A well! Stand by it. Press {down}.']);
    FEATURES.wells = false;
    expect(along()).toEqual([]);
  });
});

describe('street 3: the secret well behind the start (S2.2 Camera rule 5, S2.6)', () => {
  it('just out of view on a 560 u screen at the start; it peeks in on a wide one', () => {
    const narrow = drawnAt(L3, L3.spawnX, NARROW).game;
    expect(narrow.camera).toBeGreaterThan(160 + 50);
    const wide = drawnAt(L3, L3.spawnX, WIDE).game;
    expect(wide.camera).toBeLessThan(160 + 24);
  });

  it('walking back takes the 3 kobo leading to it, the camera turns to show the whole well, and the fence stops the hero', () => {
    const game = new Game(L3);
    game.begin(false);
    game.setView(NARROW);
    game.render(recorder().g, NARROW);
    game.steer(-1);
    let sawWell = false;
    for (let i = 0; i < 60 * 6; i++) {
      game.update(DT);
      game.render(recorder().g, NARROW);
      if (game.camera <= 160 - 50 && game.camera + NARROW.width >= 160 + 50) sawWell = true;
    }
    expect(game.run.kobo).toBe(3);
    expect(sawWell).toBe(true);
    expect(game.cameraLook).toBe(-1);
    expect(game.hero.x).toBe(L3.startWall + 7);
    expect(game.camera).toBeGreaterThanOrEqual(L3.startWall - 40);
    expect(game.run.lives).toBe(3);
    // Then forward again: the street plays on, the kobo taken stay taken.
    game.steer(1);
    for (let i = 0; i < 60 * 4; i++) game.update(DT);
    expect(game.hero.x).toBeGreaterThan(L3.spawnX);
    expect(game.run.coins.filter((c) => c.x < 300).every((c) => c.taken)).toBe(true);
  });
});

/**
 * The e2e hand bot's moves, on the rules alone: hold Forward all the way; at a pothole, a
 * hazard or a gutter's weeds (S2.16 B5) close ahead a held jump; for a pit wider than 110 a
 * held second jump at the top; and once the dash is on, a dash (S2.16 B4) on the road before a
 * dash gap. `dash`: the dash is already on (saved after street 2).
 */
function handBot(level: Level, maxSteps = 60 * 400, dash = false): { run: Run; lostAt: number[] } {
  const run = new Run(level, { dash });
  const gaps = level.ground.slice(1).map((s, i) => [level.ground[i]![1], s[0]] as const);
  const lostAt: number[] = [];
  run.viewLeft = -Infinity;
  run.viewRight = Infinity;
  run.steer(1);
  let holding = false;
  let second = false;
  for (let i = 0; i < maxSteps && run.phase === 'run'; i++) {
    const h = run.hero;
    // A 747 u screen (16:9 phone) for waking and leaving.
    run.viewLeft = h.x - 747 * 0.3;
    run.viewRight = run.viewLeft + 747;
    if (holding && (h.vy >= 0 || h.grounded)) {
      run.release();
      holding = false;
      if (second && !h.grounded) {
        run.press();
        holding = true;
        second = false;
      }
    } else if (!holding && h.grounded) {
      if (run.dashOn && !run.dashing && gaps.some(([a, b]) => b - a >= 250 && a - h.x > 0 && a - h.x < 300)) run.dash(1);
      const big = gaps.find(([a, b]) => b - a >= 160 && a - h.x > -4 && a - h.x < 10 + h.speed * 0.03);
      const gap = big ?? gaps.find(([a, b]) => b - a < 160 && a - h.x > -4 && a - h.x < 32);
      const hazard = run.hazards.find((z) => (z.mode === 'wait' || z.mode === 'move') && z.x - h.x > 0 && z.x - h.x < 80);
      const weeds = run.gutters.find((q) => q.state === 'weeds' && q.x - h.x > 0 && q.x - h.x < 30);
      if (gap || hazard || weeds) {
        run.press();
        holding = true;
        second = !!gap && gap[1] - gap[0] > 110;
      }
    }
    const lives = run.lives;
    run.step(DT);
    if (run.lives < lives) lostAt.push(Math.round(h.x));
    run.steer(1);
  }
  return { run, lostAt };
}

describe('every Lagos street plays from the start to the bus (a two-thumb bot on the rules)', () => {
  it.each([L1, L2, L3])('$id', (L) => {
    // Street 3 comes after street 2, where the dash is turned on (and saved).
    const { run, lostAt } = handBot(L, undefined, L.id === 'lagos-3');
    expect(run.phase, `${L.id}: lost lives at ${lostAt.join(', ')}`).toBe('bus');
    expect(run.lives).toBeGreaterThanOrEqual(2);
    expect(run.checkpointReached).toBe(true);
  });
});
