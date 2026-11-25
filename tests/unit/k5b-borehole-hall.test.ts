/**
 * K5b: Rusty Borehole in Borehole Hall, the rules (docs/kano.md 5.3 to 5.5).
 * - Bump the STUCK valve from below with the head (the crate rule): left, middle, right. A held
 *   cloth bounce or a double jump reaches it; a held jump from the floor or an un-held bounce does not.
 * - Coughs every 2.8 / 2.4 / 2.0 s by phase (whirl; whirl, gust; whirl, whirl, gust), the first at
 *   2.0 s; a 0.5 s wheeze before a whirl, 0.6 s of puffing before a gust; a gust lasts 2 s and
 *   cuts the air speed toward him to 0.75. A whirl rolls at 60 u/s and puffs apart at the left wall.
 * - He holds his breath: no whirl leaves him while the hero is in the air after a cloth bounce.
 * - A hit: every whirl puffs apart, no coughs for 1.5 s, then the next phase ("He's cross!" before 3).
 * - A whirl from the side: a life, back to x 50 (the shield takes one). From above: a bounce.
 * - Gentle: 5 lives, whirls 45 u/s, every cough 0.4 s later, gusts an eighth.
 * - The finish: gargle, sneeze at 1.2, clean at 1.8, taps 2.4 to 3.6, the toast at 4.0, the Win at 6.0.
 * - A plain player's plan (tests/e2e/rusty-brain.ts) wins on the game's own rules.
 */
import { describe, expect, it } from 'vitest';
import hallRaw from '../../src/data/levels/kano-hall.json';
import { parseLevel } from '../../src/game/level';
import { HAZARD_BOX, RULES, Run, STEPS_PER_SECOND, type RunEvent } from '../../src/game/run';
import { CRATE_RULES } from '../../src/game/crates';
import { PHYSICS } from '../../src/engine/physics';
import { KANO_WORDS } from '../../src/worlds/kano/words';
import { BOREHOLE_HALL_TUNE, BH_HALL, RUSTY_FINISH, RUSTY_SOUNDS, rustyTapTimes } from '../../src/worlds/kano/boreholeHall';
import { RUN_NUMBERS, RUSTY_RULES, RustyDataError, RustyFight, newRustyVisit, parseRustyHall } from '../../src/worlds/kano/rustyFight';
import { boreholeHallSkin, gustLook, rustyLook } from '../../src/worlds/kano/boreholeHallSkin';
import { kanoStreet } from '../../src/worlds/kano/kurmiStreet';
import { decideRusty, newRustyMind } from '../e2e/rusty-brain';

const DT = 1 / STEPS_PER_SECOND;
const DATA = parseRustyHall(hallRaw);
const LEVEL = parseLevel(hallRaw);
const secs = (s: number): number => Math.round(s * STEPS_PER_SECOND);

interface Play {
  run: Run;
  f: RustyFight;
  ev: RunEvent[];
}
function play(opts: { gentle?: boolean; parcel?: boolean; firstTry?: boolean | undefined } = {}): Play {
  let f: RustyFight | null = null;
  const run = new Run(LEVEL, { gentle: opts.gentle ?? false, parcel: opts.parcel ?? false, arena: (r) => (f = new RustyFight(DATA, r, 'firstTry' in opts ? (opts.firstTry === undefined ? {} : { firstTry: opts.firstTry }) : { firstTry: false })) });
  return { run, f: f!, ev: [] };
}
function steps(p: Play, n: number, each?: () => void): void {
  for (let i = 0; i < n && p.run.phase === 'arena'; i++) {
    p.ev.push(...p.run.step(DT));
    each?.();
  }
}
const cues = (ev: RunEvent[]) => ev.filter((e): e is Extract<RunEvent, { type: 'cue' }> => e.type === 'cue');
const says = (ev: RunEvent[]) => cues(ev).flatMap((c) => (c.say ? [c.say] : []));
const sounds = (ev: RunEvent[]) => cues(ev).flatMap((c) => (c.sound ? [c.sound] : []));
const rolling = (p: Play) => p.run.hazards.filter((z) => z.kind === 'whirl' && z.mode === 'move');
/** Steps until the next whirl leaves him; the step count it took. */
function untilWhirl(p: Play, max = 600): number {
  const n0 = p.f.whirlsOut;
  let i = 0;
  while (p.f.whirlsOut === n0 && i < max && p.run.phase === 'arena') {
    p.ev.push(...p.run.step(DT));
    i++;
  }
  return i;
}
/** The hero under valve i, standing; then a press held for n steps. */
function heldJumpAt(p: Play, x: number, n: number): void {
  const h = p.run.hero;
  h.x = x;
  h.vx = 0;
  p.run.press('k');
  steps(p, n);
  p.run.release('k');
}
/** Puts the hero under a valve and bumps it with a held cloth bounce (no whirls about). */
function bump(p: Play): void {
  const hits = p.f.hits;
  for (const z of p.run.hazards) z.mode = 'gone';
  p.run.hero = p.run.newHero(DATA.valves.x[hits]!);
  p.run.press('k');
  for (let i = 0; i < 180 && p.f.hits === hits; i++) {
    for (const z of p.run.hazards) if (z.mode === 'move') z.mode = 'gone';
    p.ev.push(...p.run.step(DT));
  }
  p.run.release('k');
  expect(p.f.hits).toBe(hits + 1);
  // Down on the floor again, left of the frames, still.
  p.run.hero = p.run.newHero(60);
}

describe('kano.md 5.2 to 5.5: the hall file, read by the fight', () => {
  it('holds every 5.2 to 5.5 number', () => {
    expect(DATA.valves).toEqual({ x: [140, 250, 360], bottom: 70, w: 36, h: 36 });
    expect(DATA.springs).toEqual({ w: 80, h: 30, vy: -640 });
    expect(DATA.body).toEqual([450, 540]);
    expect([DATA.leftLimit, DATA.rightLimit, DATA.spawnX, DATA.groundY]).toEqual([30, 440, 50, 300]);
    expect([DATA.startDelay, DATA.wheeze, DATA.breakAfterHit, DATA.taps, DATA.holdBreath]).toEqual([2.0, 0.5, 1.5, 8, true]);
    expect(DATA.phases.map((p) => [p.every, p.pattern.join(','), p.bpm])).toEqual([
      [2.8, 'whirl', 120],
      [2.4, 'whirl,gust', 126],
      [2.0, 'whirl,whirl,gust', 132],
    ]);
    expect(DATA.whirl).toEqual({ speed: 60, w: 30, h: 50, fromX: 440, bounceVy: -480 });
    expect(DATA.gust).toEqual({ lasts: 2.0, warn: 0.6, airScale: 0.75 });
    expect(DATA.fall.backTo).toBe(50);
    expect(DATA.gentle).toEqual({ whirlSpeed: 45, later: 0.4, gustAirScale: 0.875 });
    expect(DATA.finish).toEqual({ glugTo: 1.2, sneeze: 1.2, shine: 1.8, tapsFrom: 2.4, tapsTo: 3.6, toast: 4.0, win: 6.0 });
  });

  it("the art's numbers are the file's: the yard, the valves, the finish times and the tune's tempos", () => {
    expect(BH_HALL.valves).toEqual(DATA.valves.x);
    expect(BH_HALL.valveBottom).toBe(DATA.valves.bottom);
    expect(BH_HALL.valveR * 2).toBe(DATA.valves.w);
    expect([BH_HALL.springW, BH_HALL.springH]).toEqual([DATA.springs.w, DATA.springs.h]);
    expect([BH_HALL.heroMinX, BH_HALL.heroMaxX, BH_HALL.floorY]).toEqual([DATA.leftLimit, DATA.rightLimit, DATA.groundY]);
    expect(BH_HALL.taps).toHaveLength(DATA.taps);
    const F = DATA.finish;
    expect([RUSTY_FINISH.glugTo, RUSTY_FINISH.sneeze, RUSTY_FINISH.shine, RUSTY_FINISH.tapsFrom, RUSTY_FINISH.tapsTo, RUSTY_FINISH.toast, RUSTY_FINISH.win]).toEqual([F.glugTo, F.sneeze, F.shine, F.tapsFrom, F.tapsTo, F.toast, F.win]);
    expect(BOREHOLE_HALL_TUNE.bpm).toEqual(DATA.phases.map((p) => p.bpm));
  });

  it("the run's own numbers it copies are the run's", () => {
    expect(RUN_NUMBERS.heroHalfW).toBe(RULES.heroHalfW);
    expect(RUN_NUMBERS.heroH).toBe(RULES.heroH);
    expect(RUN_NUMBERS.parcelWordsSteps).toBe(RULES.parcelWordsSteps);
    expect(RUN_NUMBERS.whirlHalfW).toBe(HAZARD_BOX.whirl.halfW);
    expect(RUN_NUMBERS.headGrace).toBe(CRATE_RULES.grace);
    expect(RUN_NUMBERS.bumpVy).toBe(CRATE_RULES.bumpVy);
    expect(RUN_NUMBERS.steps).toBe(STEPS_PER_SECOND);
  });

  it('a broken file is refused, so the part has no hall rather than a broken one', () => {
    const bad = (f: (b: Record<string, unknown>) => void) => {
      const r = JSON.parse(JSON.stringify(hallRaw)) as { boss: Record<string, unknown> };
      f(r.boss);
      return () => parseRustyHall(r);
    };
    expect(bad((b) => (b['kind'] = 'king-pothole'))).toThrow(RustyDataError);
    expect(bad((b) => (b['phases'] = []))).toThrow(RustyDataError);
    expect(bad((b) => ((b['phases'] as unknown[]).length = 2))).toThrow(RustyDataError);
    expect(bad((b) => ((b['valves'] as { x: number[] }).x = [360, 250, 140]))).toThrow(RustyDataError);
    expect(bad((b) => ((b['gust'] as Record<string, unknown>)['lasts'] = 'long'))).toThrow(RustyDataError);
    expect(() => parseRustyHall(null)).toThrow(RustyDataError);
  });
});

describe('kano.md 5.3: bump each stuck valve from below', () => {
  it('a springy cloth frame stands under each valve: 80 wide, 30 high, a bounce up at vy -640', () => {
    const { run } = play();
    const springs = run.terrain.platforms.filter((p) => p.spring !== undefined);
    expect(springs).toEqual(DATA.valves.x.map((x) => ({ x: x - 40, y: 270, w: 80, spring: -640 })));
  });

  it('press and hold under the valve: the jump falls onto the cloth, the held bounce bumps the valve ("SQUEAK... GLUG!")', () => {
    const p = play();
    const h0 = p.run.hero;
    h0.x = 140;
    p.run.press('k');
    let sprung = 0;
    let headMin = Infinity;
    for (let i = 0; i < 150 && p.f.hits === 0; i++) {
      p.ev.push(...p.run.step(DT));
      if (p.ev.some((e) => e.type === 'spring')) sprung++;
      headMin = Math.min(headMin, p.run.hero.y - RULES.heroH);
    }
    expect(sprung).toBeGreaterThan(0);
    expect(p.f.hits).toBe(1);
    // The head stopped at the valve's bottom: a small push down, the hold ends.
    expect(headMin).toBeCloseTo(DATA.valves.bottom, 0);
    expect(p.run.hero.vy).toBe(RUN_NUMBERS.bumpVy);
    expect(p.run.hero.holding).toBe(false);
    expect(sounds(p.ev)).toEqual(expect.arrayContaining(['valveSqueak', 'valveGlug', 'rustyHic', 'clothBoing'].filter((s) => s !== 'clothBoing')));
    expect(p.ev.filter((e) => e.type === 'spring').length).toBeGreaterThan(0);
    expect(says(p.ev)).toContain('Glug! 2 more valves.');
  });

  it('an un-held bounce and a held jump from the floor fall short; a double jump reaches it', () => {
    // A tap under the valve: down on the cloth, bouncing un-held, never up to the valve.
    const a = play();
    a.run.hero.x = 140;
    a.run.press('k');
    a.run.step(DT);
    a.run.release('k');
    steps(a, 240);
    expect(a.f.hits).toBe(0);
    // A held jump from the floor between the frames (no cloth under): the head stops short.
    const b = play();
    let top = Infinity;
    b.run.hero.x = 195;
    b.run.press('k');
    steps(b, 60, () => (top = Math.min(top, b.run.hero.y - RULES.heroH)));
    // 112 by the formula (kano-levels.test.ts); the fixed steps land a few u lower. Short of 70 either way.
    expect(top).toBeGreaterThanOrEqual(112);
    expect(top).toBeLessThan(120);
    // A double jump from the floor under it, both held: the head reaches up to the valve.
    const c = play();
    c.run.hero.x = 250;
    c.f.hits = 1; // the middle valve is the stuck one
    c.run.press('k');
    for (let i = 0; i < 60 && c.run.hero.vy < 0; i++) c.run.step(DT);
    c.run.release('k');
    c.run.press('k');
    steps(c, 40);
    expect(c.f.hits).toBe(2);
  });

  it('the order is left, middle, right: a waiting valve only stops the head', () => {
    const p = play();
    expect(p.f.stuck).toBe(0);
    heldJumpAt(p, 250, 120);
    expect(p.f.hits).toBe(0);
    expect(sounds(p.ev)).toContain('crateEmpty');
    p.run.hero = p.run.newHero(60);
    bump(p);
    expect(p.f.stuck).toBe(1);
    bump(p);
    expect(p.f.stuck).toBe(2);
    expect(says(p.ev)).toEqual(expect.arrayContaining(['Glug! 2 more valves.', 'Glug! 1 more valve.']));
  });

  it('a head hit needs the middle within the valve and 4 u, rising', () => {
    for (const [dx, hit] of [[0, true], [21, true], [23, false]] as const) {
      const p = play();
      p.run.terrain = { ...p.run.terrain, platforms: [] };
      const h = p.run.hero;
      h.x = 140 + dx;
      h.y = DATA.valves.bottom + RULES.heroH + 4;
      h.prevY = h.y;
      h.vy = -500;
      h.grounded = false;
      steps(p, 2);
      expect(p.f.hits, `dx ${dx}`).toBe(hit ? 1 : 0);
    }
  });
});

describe('kano.md 5.4: coughs, whirls and gusts, phase by phase', () => {
  it('the first cough is a whirl at 2.0 s, after a 0.5 s wheeze; then every 2.8 s', () => {
    const p = play();
    expect(untilWhirl(p)).toBe(secs(2.0));
    const wheeze = p.ev.findIndex((e) => e.type === 'cue' && e.sound === 'rustyWheeze');
    expect(wheeze).toBeGreaterThanOrEqual(0);
    expect(sounds(p.ev)).toContain('rustyCough');
    const p2 = play();
    let warnFrom = -1;
    steps(p2, secs(2.0) - 1, () => {
      if (warnFrom < 0 && p2.f.warn >= 0) warnFrom = p2.run.steps;
    });
    expect(warnFrom).toBe(secs(1.5));
    expect(untilWhirl(p)).toBe(secs(2.8));
    expect(untilWhirl(p)).toBe(secs(2.8));
  });

  it('a whirl rolls from his feet at 60 u/s and puffs apart at the left wall', () => {
    const p = play();
    p.run.hero.x = 200;
    p.run.hero.y = -2000; // out of the way, far above
    p.run.terrain = { ...p.run.terrain, platforms: [] };
    untilWhirl(p);
    const z = rolling(p)[0]!;
    expect(z.x0).toBe(DATA.whirl.fromX);
    expect(z.vx).toBe(-60);
    const x0 = z.x;
    for (let i = 0; i < 60; i++) p.run.step(DT);
    expect(x0 - z.x).toBeCloseTo(60, 5);
    const ev: RunEvent[] = [];
    for (let i = 0; i < 600 && z.mode === 'move'; i++) {
      p.run.hero.y = -2000;
      ev.push(...p.run.step(DT));
    }
    expect(z.mode).toBe('puff');
    expect(z.x - HAZARD_BOX.whirl.halfW).toBeLessThanOrEqual(DATA.leftLimit + 1);
    expect(ev.some((e) => e.type === 'whirlPuff')).toBe(true);
  });

  it('a whirl from the side: a life, back at x 50, the way clear; the parcel shield takes one first', () => {
    for (const parcel of [false, true]) {
      const p = play({ parcel });
      p.run.hero.x = 300;
      untilWhirl(p);
      const lives = p.run.lives;
      steps(p, 200, () => undefined);
      const hit = p.ev.some((e) => e.type === 'hit');
      if (parcel) {
        expect(p.ev.some((e) => e.type === 'shieldPop')).toBe(true);
        expect(hit).toBe(false);
        expect(p.run.lives).toBe(lives);
      } else {
        expect(hit).toBe(true);
        expect(p.run.lives).toBe(lives - 1);
        expect(p.run.hero.x).toBeLessThan(60);
        expect(rolling(p)).toHaveLength(0);
      }
    }
  });

  it('landing on a whirl from above is a bounce (vy -480), never a hurt; it puffs apart', () => {
    const p = play();
    p.run.terrain = { ...p.run.terrain, platforms: [] };
    p.run.hero.x = 60;
    untilWhirl(p);
    const z = rolling(p)[0]!;
    z.x = 64;
    const h = p.run.hero;
    h.y = 240;
    h.prevY = 240;
    h.vy = 300;
    h.grounded = false;
    const ev: RunEvent[] = [];
    for (let i = 0; i < 4; i++) ev.push(...p.run.step(DT));
    expect(ev.some((e) => e.type === 'bounce' && e.kind === 'whirl')).toBe(true);
    expect(ev.some((e) => e.type === 'hit')).toBe(false);
    expect(z.mode).toBe('puff');
    expect(PHYSICS.bounceVy).toBe(DATA.whirl.bounceVy);
  });

  it('a hit: every whirl puffs apart, no coughs for 1.5 s, then phase 2 (whirl, gust every 2.4 s)', () => {
    const p = play();
    untilWhirl(p);
    expect(rolling(p)).toHaveLength(1);
    // Bump without clearing the floor first: the whirl rolling puffs apart at the hit.
    p.run.hero = p.run.newHero(140);
    p.run.press('k');
    steps(p, 150, () => {
      if (p.f.hits === 1) p.run.release('k');
    });
    // (the loop ran on; look at the hit itself)
    const at = p.f.hitAt[0]!;
    expect(at).toBeGreaterThan(0);
    expect(p.f.breakUntil).toBe(at + secs(1.5));
    expect(p.f.nextAt).toBe(at + secs(1.5) + secs(2.4));
    expect(p.ev.filter((e) => e.type === 'whirlPuff').length).toBeGreaterThanOrEqual(1);
    // No cough in the break.
    const q = play();
    bump(q);
    const hitAt = q.f.hitAt[0]!;
    const n0 = q.f.whirlsOut;
    steps(q, secs(1.5) + secs(2.4) - 1 - (q.run.steps - hitAt));
    expect(q.f.whirlsOut).toBe(n0);
    expect(q.f.phase).toBe(1);
    expect(q.f.tempo).toBe(1);
    expect(untilWhirl(q)).toBe(1);
    // Then a gust 2.4 s later, warned by 0.6 s of puffing, for 2 s.
    let warnAt = -1;
    let gustAt = -1;
    steps(q, secs(2.4), () => {
      if (warnAt < 0 && q.f.warn >= 0 && q.f.nextKind === 'gust') warnAt = q.run.steps;
      if (gustAt < 0 && q.f.gusting) gustAt = q.run.steps;
    });
    expect(gustAt - warnAt).toBe(secs(0.6));
    expect(sounds(q.ev)).toContain('rustyGust');
    let lasts = 0;
    steps(q, secs(2.4), () => (lasts += q.f.gusting ? 1 : 0));
    expect(lasts).toBe(secs(2.0) - 1);
  });

  it('in a gust the air speed toward him is a quarter less (Gentle: an eighth); walking and going back are not changed', () => {
    for (const gentle of [false, true]) {
      const q = play({ gentle });
      bump(q);
      while (!q.f.gusting && q.run.phase === 'arena') {
        q.run.hero = q.run.newHero(60);
        q.run.step(DT);
      }
      q.run.step(DT);
      expect(q.run.hero.wind).toBe(gentle ? 0.875 : 0.75);
      // A jump forward covers less ground than the same jump with no gust.
      const fly = (gust: boolean): number => {
        const r = play({ gentle });
        if (gust) {
          bump(r);
          while (!r.f.gusting) r.run.step(DT);
        }
        for (const z of r.run.hazards) z.mode = 'gone';
        r.run.hero = r.run.newHero(40);
        r.run.terrain = { ...r.run.terrain, platforms: [] };
        r.run.steer(1);
        for (let i = 0; i < 30; i++) r.run.step(DT);
        const x0 = r.run.hero.x;
        r.run.press('k');
        r.run.step(DT);
        r.run.release('k');
        for (let i = 0; i < 40 && !r.run.hero.grounded; i++) r.run.step(DT);
        return r.run.hero.x - x0;
      };
      const ratio = fly(true) / fly(false);
      expect(ratio).toBeLessThan(gentle ? 0.93 : 0.82);
      expect(ratio).toBeGreaterThan(gentle ? 0.84 : 0.7);
    }
  });

  it('phase 3: "He\'s cross!" as it starts; whirl, whirl, gust every 2.0 s', () => {
    const p = play();
    bump(p);
    bump(p);
    steps(p, secs(1.5) + 2);
    expect(p.f.phase).toBe(2);
    expect(says(p.ev)).toContain("He's cross! Two whirls now. Jump them both.");
    const kinds: string[] = [];
    let last = p.run.steps;
    const gaps: number[] = [];
    for (let i = 0; i < 6; i++) {
      const out = p.f.whirlsOut;
      const g0 = p.f.gusting;
      for (let j = 0; j < 400; j++) {
        p.run.hero = p.run.newHero(60);
        for (const z of p.run.hazards) z.mode = 'gone';
        p.run.step(DT);
        if (p.f.whirlsOut > out) {
          kinds.push('whirl');
          break;
        }
        if (!g0 && p.f.gusting) {
          kinds.push('gust');
          break;
        }
        if (g0 && !p.f.gusting) break;
      }
      if (kinds.length > gaps.length) {
        gaps.push(p.run.steps - last);
        last = p.run.steps;
      }
    }
    expect(kinds.slice(0, 6)).toEqual(['whirl', 'whirl', 'gust', 'whirl', 'whirl', 'gust']);
    expect(gaps.slice(1)).toEqual(Array(gaps.length - 1).fill(secs(2.0)));
  });
});

describe('kano.md 5.3: he holds his breath while you bounce', () => {
  /** True when a whirl left him this step while the hero was in the air after a cloth bounce. */
  function watch(p: Play): { bad: number; out: number } {
    let air = false;
    let bad = 0;
    let out = 0;
    let n = p.run.hazards.length;
    return {
      get bad() {
        return bad;
      },
      get out() {
        return out;
      },
      step(): void {
        const ev = p.run.step(DT);
        p.ev.push(...ev);
        const h = p.run.hero;
        if (ev.some((e) => e.type === 'spring')) air = true;
        const left = p.run.hazards.length > n;
        if (left) {
          out++;
          if (air && !h.grounded) bad++;
        }
        n = p.run.hazards.length;
        if (h.grounded) air = false;
      },
    } as unknown as { bad: number; out: number; step(): void };
  }

  it('bouncing on the cloth through many coughs, in every phase: no whirl leaves him while the hero is up', () => {
    for (const hits of [0, 1, 2]) {
      for (const gentle of [false, true]) {
        const p = play({ gentle });
        for (let i = 0; i < hits; i++) bump(p);
        const w = watch(p) as unknown as { bad: number; out: number; step(): void };
        // Bounce on the left frame (the first valve stays shut in phase 1, it is not the stuck one later),
        // a held bounce every so often, for 20 s; the hero lands on the floor now and then.
        p.run.hero = p.run.newHero(DATA.valves.x[0]! + 30);
        for (let i = 0; i < secs(20) && p.run.phase === 'arena'; i++) {
          const t = i % secs(5);
          if (t === 0) p.run.press('k');
          if (t === 40) p.run.release('k');
          if (t === secs(3.5)) p.run.steer(-1);
          if (t === secs(4.4)) {
            p.run.steer(0);
            p.run.hero = p.run.newHero(DATA.valves.x[0]! + 30);
          }
          w.step();
        }
        expect(w.bad, `hits ${hits} gentle ${gentle}`).toBe(0);
        expect(p.f.heldBreaks).toBe(0);
        // He did hold a whirl back, and let it go once the hero was down.
        expect(p.f.held, `hits ${hits} gentle ${gentle}`).toBeGreaterThan(0);
        expect(w.out).toBeGreaterThan(0);
      }
    }
  });

  it('a whirl due while the hero bounces waits; it rolls out the step after the hero is down', () => {
    const p = play();
    p.run.hero = p.run.newHero(140);
    p.run.press('k');
    // Hold the jump until the held bounce bumps the valve, then let go: un-held bounces keep the hero up.
    for (let i = 0; i < secs(1.6) && p.f.hits === 0; i++) p.run.step(DT);
    p.run.release('k');
    let upAt = -1;
    while (p.run.steps < secs(2.0) + 30) {
      p.run.step(DT);
      if (upAt < 0 && p.f.holding) upAt = p.run.steps;
    }
    expect(p.f.hits).toBe(1); // that bounce bumped the first valve
    // Now bouncing un-held on the frame: hold the hero there past the next cough.
    const due = p.f.nextAt;
    while (p.run.steps < due + secs(1)) {
      p.run.step(DT);
      expect(p.f.whirlsOut).toBe(0);
    }
    expect(p.f.holding).toBe(true);
    // Off the frame to the floor: the whirl comes out once the feet are down.
    p.run.steer(-1);
    let downAt = -1;
    for (let i = 0; i < secs(3) && p.f.whirlsOut === 0; i++) {
      p.run.step(DT);
      if (downAt < 0 && p.run.hero.grounded) downAt = p.run.steps;
    }
    expect(downAt).toBeGreaterThan(0);
    expect(p.f.whirlsOut).toBe(1);
    expect(p.run.steps - downAt).toBeLessThanOrEqual(1);
  });

  it('a whirl bounce (landing on one) is not a cloth bounce: he breathes as normal', () => {
    const p = play();
    p.run.terrain = { ...p.run.terrain, platforms: [] };
    p.run.hero.x = 60;
    untilWhirl(p);
    const z = rolling(p)[0]!;
    z.x = 64;
    Object.assign(p.run.hero, { y: 240, prevY: 240, vy: 300, grounded: false });
    p.run.step(DT);
    expect(p.f.holding).toBe(false);
  });
});

describe('kano.md 5.4: entry words, Gentle mode and the tune', () => {
  it('"Rusty Borehole has gone dry!", then on the first try of a visit the hint; the parcel first if carried', () => {
    newRustyVisit();
    const a = play({ firstTry: undefined });
    steps(a, secs(5));
    expect(says(a.ev)).toEqual(expect.arrayContaining(['Rusty Borehole has gone dry!', 'Bounce, hold, and bump the valve!']));
    // Play again: the same visit, no hint.
    const b = play({ firstTry: undefined });
    steps(b, secs(5));
    expect(says(b.ev)).not.toContain('Bounce, hold, and bump the valve!');
    const c = play({ parcel: true, firstTry: true });
    steps(c, secs(5));
    const s = says(c.ev);
    expect(s.indexOf('Your garri parcel: the shield is on!')).toBe(0);
    expect(s.indexOf('Rusty Borehole has gone dry!')).toBeGreaterThan(0);
    expect(s.indexOf('Bounce, hold, and bump the valve!')).toBeGreaterThan(s.indexOf('Rusty Borehole has gone dry!'));
    expect(c.run.power.shield).toBe(true);
    expect(sounds(c.ev)[0]).toBe('arena');
  });

  it('Gentle mode: 5 lives, whirls at 45 u/s, every cough 0.4 s later', () => {
    const p = play({ gentle: true });
    expect(p.run.lives).toBe(5);
    expect(untilWhirl(p)).toBe(secs(2.4));
    expect(rolling(p)[0]!.vx).toBe(-45);
    expect(untilWhirl(p)).toBe(secs(3.2));
    const q = play({ gentle: true });
    bump(q);
    expect(q.f.nextAt - q.f.hitAt[0]!).toBe(secs(1.5) + secs(2.8));
    expect(play().run.lives).toBe(3);
  });

  it("the tune's tempo follows the phase (120, 126, 132 BPM)", () => {
    const p = play();
    expect(p.f.tempo).toBe(0);
    bump(p);
    steps(p, secs(1.5) + 2);
    expect(p.f.tempo).toBe(1);
    bump(p);
    steps(p, secs(1.5) + 2);
    expect(p.f.tempo).toBe(2);
  });
});

describe('kano.md 5.5: the funny, kind finish', () => {
  it('from the third valve: whirls puff, nothing hurts, the sounds and words in order, the Win at 6 s', () => {
    const p = play();
    bump(p);
    bump(p);
    // A whirl on the floor as the third valve opens.
    while (p.f.whirlsOut === 0 || rolling(p).length === 0) {
      p.run.hero = p.run.newHero(60);
      p.run.step(DT);
    }
    p.run.hero = p.run.newHero(360);
    p.run.press('k');
    const ev: RunEvent[] = [];
    let at = -1;
    for (let i = 0; i < secs(8) && p.run.phase === 'arena'; i++) {
      const e = p.run.step(DT);
      ev.push(...e);
      if (at < 0 && p.f.defeated) at = p.run.steps;
      if (p.f.defeated) p.run.release('k');
    }
    expect(at).toBeGreaterThan(0);
    expect(ev.some((e) => e.type === 'bossDefeat')).toBe(true);
    expect(rolling(p)).toHaveLength(0);
    expect(ev.filter((e) => e.type === 'hit' || e.type === 'shieldPop')).toHaveLength(0);
    expect(p.run.phase).toBe('won');
    expect(ev.some((e) => e.type === 'win')).toBe(true);
    const timeOf = (sound: string) => p.ev.length >= 0 && ev.findIndex((e) => e.type === 'cue' && e.sound === sound);
    expect(timeOf('rustyGargle')).toBeGreaterThanOrEqual(0);
    expect(sounds(ev).filter((s) => s === 'tapSplash')).toHaveLength(8);
    expect(says(ev)).toContain('The water is flowing! Kano is switched on!');
    // The win is 6.0 s after the third valve (the run counts its steps).
    expect(p.run.steps - at).toBe(secs(6.0));
    expect(p.f.finishT).toBeCloseTo(6.0, 5);
  });

  it('each sound at its time from the third valve (sneeze 1.2, hum 1.8, taps 2.4 to 3.6, toast 4.0)', () => {
    const p = play();
    bump(p);
    bump(p);
    p.run.hero = p.run.newHero(360);
    p.run.press('k');
    while (!p.f.defeated) p.run.step(DT);
    p.run.release('k');
    const at: Record<string, number[]> = {};
    for (let i = 0; i < secs(7) && p.run.phase === 'arena'; i++) {
      for (const c of cues(p.run.step(DT))) if (c.sound) (at[c.sound] ??= []).push(Math.round(p.f.finishT * 100) / 100);
    }
    expect(at['rustySneeze']).toEqual([1.2]);
    expect(at['rustyHum']).toEqual([1.8]);
    expect(at['tapSplash']).toEqual(rustyTapTimes().map((t) => Math.round(secs(t)) / 60).map((t) => Math.round(t * 100) / 100));
    expect(at['bossWin']).toEqual([4.0]);
    expect(rustyTapTimes()[0]).toBe(2.4);
    expect(rustyTapTimes()[7]).toBeCloseTo(3.6, 5);
  });

  it('the hero stands and watches: no jump, no move', () => {
    const p = play();
    bump(p);
    bump(p);
    p.run.hero = p.run.newHero(360);
    p.run.press('k');
    while (!p.f.defeated) p.run.step(DT);
    p.run.release('k');
    for (let i = 0; i < 90; i++) p.run.step(DT);
    expect(p.run.press('k')).toBe(null);
    expect(p.run.inPlay).toBe(false);
  });
});

describe('Borehole Hall in the Kano part', () => {
  it("the part's street look for kano-hall is the hall's, with the hall tune; its sounds are art's", () => {
    const k = kanoStreet(LEVEL);
    expect(k?.tune).toBe(BOREHOLE_HALL_TUNE);
    expect(typeof k?.hall).toBe('function');
    expect(Object.keys(RUSTY_SOUNDS).sort()).toEqual(['rustyCough', 'rustyGargle', 'rustyGust', 'rustyHic', 'rustyHum', 'rustySneeze', 'rustyWheeze', 'tapSplash', 'valveGlug', 'valveSqueak']);
    expect(boreholeHallSkin().backdrop).toBeTypeOf('function');
  });

  it("Rusty's looks: wheeze before a whirl, puff before a gust, blow in it, hiccup after a hit; flakes = hits", () => {
    const p = play();
    steps(p, secs(1.75));
    expect(rustyLook(p.f, 0, false)).toMatchObject({ mood: 'wheeze', flakes: 0 });
    expect(rustyLook(p.f, 0, false).k).toBeCloseTo(0.5, 1);
    bump(p);
    const l = rustyLook(p.f, 0, false);
    expect(l.mood).toBe('hiccup');
    expect(l.flakes).toBe(1);
    while (!(p.f.nextKind === 'gust' && p.f.warn >= 0)) {
      p.run.hero = p.run.newHero(60);
      for (const z of p.run.hazards) z.mode = 'gone';
      p.run.step(DT);
    }
    expect(rustyLook(p.f, 0, false).mood).toBe('puff');
    expect(gustLook(p.f)).toBeGreaterThanOrEqual(0);
    while (!p.f.gusting) p.run.step(DT);
    p.run.step(DT);
    expect(rustyLook(p.f, 0, false).mood).toBe('blow');
    steps(p, 30);
    expect(gustLook(p.f)).toBe(1);
  });

  it('every hall word is the part\'s own (KANO_WORDS); the cues say nothing else', () => {
    const p = play({ parcel: true, firstTry: true });
    bump(p);
    bump(p);
    steps(p, secs(1.6));
    bump(p);
    steps(p, secs(7));
    const W = KANO_WORDS.hall;
    const ok = new Set([W.parcelShield, W.start, W.hint, W.left(2), W.left(1), W.cross, W.open]);
    for (const s of says(p.ev)) expect(ok.has(s), s).toBe(true);
    expect(RUSTY_RULES.toastMs).toBeGreaterThan(0);
  });
});

describe('a plain player wins (the e2e bot plays the same plan by touch)', () => {
  function botTry(opts: { gentle?: boolean; late?: number }): { won: boolean; lost: number; time: number; heldBreaks: number } {
    const p = play({ gentle: opts.gentle ?? false });
    const m = newRustyMind();
    const late = opts.late ?? 0;
    const q: ReturnType<typeof decideRusty>[] = [];
    const lives0 = p.run.lives;
    for (let i = 0; i < secs(150) && p.run.phase === 'arena'; i++) {
      const h = p.run.hero;
      const d = decideRusty(m, {
        hero: { x: h.x, y: h.y, vx: h.vx, vy: h.vy, grounded: h.grounded, airJump: h.airJump },
        stuck: p.f.stuck,
        hits: p.f.hits,
        valves: DATA.valves.x,
        defeated: p.f.defeated,
        whirls: rolling(p).map((z) => ({ x: z.x, vx: z.vx })),
        time: p.run.time,
      }, late / 60);
      q.push(d);
      const act = q.length > late ? q.shift()! : null;
      if (act) {
        p.run.steer(act.move);
        if (act.release) p.run.release('k');
        if (act.press) p.run.press('k');
      }
      p.run.step(DT);
    }
    return { won: p.f.defeated, lost: lives0 - p.run.lives, time: p.run.time, heldBreaks: p.f.heldBreaks };
  }

  for (const [gentle, late] of [[false, 0], [false, 3], [true, 0], [true, 4]] as const) {
    it(`${gentle ? 'Gentle' : 'normal'}, ${late} steps late: wins in one try`, () => {
      const r = botTry({ gentle, late });
      expect(r.won, JSON.stringify(r)).toBe(true);
      expect(r.heldBreaks).toBe(0);
    });
  }
});
