/**
 * KN-R16 (docs/kano.md part 11): Borehole Hall's hint arrows. Once the next valve has said "STUCK"
 * for 8.0 s (Gentle 5.0 s) with no hit, an arrow over the hero's head points to that valve's cloth
 * and a down arrow points at the valve; both hide while the hero is over that cloth and go on the
 * hit; they come back each phase. "Go back! Bounce under the valve!" once a try, with the first arrows.
 * No rule, speed or life changes.
 */
import { describe, expect, it } from 'vitest';
import hallRaw from '../../src/data/levels/kano-hall.json';
import { parseLevel } from '../../src/game/level';
import { STEPS_PER_SECOND, type RunEvent } from '../../src/game/run';
import { Run } from './kano-run';
import { KANO_WORDS } from '../../src/worlds/kano/words';
import { RustyDataError, RustyFight, parseRustyHall, type RustyData } from '../../src/worlds/kano/rustyFight';
import { BH_ARROW, BH_LOOK, hintArrowBox, hintArrows } from '../../src/worlds/kano/boreholeHallSkin';

const DT = 1 / STEPS_PER_SECOND;
const DATA = parseRustyHall(hallRaw);
const LEVEL = parseLevel(hallRaw);
const secs = (s: number): number => Math.round(s * STEPS_PER_SECOND);
const HINT = KANO_WORDS.hall.valveHint;
/** Left of the first cloth (140 +- 40), by the door. */
const DOOR = 60;

interface Play {
  run: Run;
  f: RustyFight;
  ev: RunEvent[];
}
function play(opts: { gentle?: boolean; data?: RustyData } = {}): Play {
  let f: RustyFight | null = null;
  const run = new Run(LEVEL, { gentle: opts.gentle ?? false, arena: (r) => (f = new RustyFight(opts.data ?? DATA, r, { firstTry: false })) });
  return { run, f: f!, ev: [] };
}
const says = (ev: RunEvent[]) => ev.flatMap((e) => (e.type === 'cue' && e.say ? [e.say] : []));
/** One step with the hero standing at x (whirls cleared, so nothing hurts). */
function standAt(p: Play, x: number): void {
  p.run.hero = p.run.newHero(x);
  for (const z of p.run.hazards) if (z.mode === 'move') z.mode = 'gone';
  p.ev.push(...p.run.step(DT));
}
/** Stands at x until the valve to hit says "STUCK"; the step it did. */
function untilStuck(p: Play, x = DOOR): number {
  for (let i = 0; i < 900 && !p.f.ready; i++) standAt(p, x);
  expect(p.f.ready).toBe(true);
  return p.run.steps;
}
/** Stands at x until the arrows are due; steps from `from`. */
function untilDue(p: Play, from: number, x = DOOR): number {
  for (let i = 0; i < secs(20) && !p.f.arrowDue; i++) standAt(p, x);
  expect(p.f.arrowDue).toBe(true);
  return p.run.steps - from;
}
/** A held cloth bounce under the valve to hit, until it glugs. */
function hit(p: Play): void {
  const n = p.f.hits;
  p.run.hero = p.run.newHero(DATA.valves.x[n]!);
  p.run.press('k');
  for (let i = 0; i < 180 && p.f.hits === n; i++) {
    for (const z of p.run.hazards) if (z.mode === 'move') z.mode = 'gone';
    p.ev.push(...p.run.step(DT));
  }
  p.run.release('k');
  expect(p.f.hits).toBe(n + 1);
}

describe('KN-R16: the hall file holds the hint numbers', () => {
  it('boss.valveHint is { after: 8.0, gentleAfter: 5.0 } and is checked', () => {
    expect(DATA.valveHint).toEqual({ after: 8.0, gentleAfter: 5.0 });
    const bad = (v: unknown) => () => {
      const raw = JSON.parse(JSON.stringify(hallRaw)) as { boss: Record<string, unknown> };
      raw.boss['valveHint'] = v;
      parseRustyHall(raw);
    };
    expect(bad({ after: 0, gentleAfter: 5 })).toThrow(RustyDataError);
    expect(bad({ after: 8, gentleAfter: -1 })).toThrow(RustyDataError);
    expect(bad({ after: 8 })).toThrow(RustyDataError);
    expect(bad('8')).toThrow(RustyDataError);
  });
});

describe('KN-R16: the timer', () => {
  it('the arrows come 8.0 s after the valve says "STUCK", not before; the words once, with them', () => {
    const p = play();
    const from = untilStuck(p);
    expect(p.f.arrows).toBe(false);
    for (let i = 0; i < secs(8) - 2; i++) standAt(p, DOOR);
    expect(p.f.arrows).toBe(false);
    expect(says(p.ev)).not.toContain(HINT);
    const t = untilDue(p, from);
    expect(t).toBeGreaterThanOrEqual(secs(8));
    expect(t).toBeLessThanOrEqual(secs(8) + 1);
    expect(p.f.arrows).toBe(true);
    expect(says(p.ev).filter((s) => s === HINT)).toHaveLength(1);
    // They stay (with no hit), and the words are not said again.
    for (let i = 0; i < secs(10); i++) standAt(p, DOOR);
    expect(p.f.arrows).toBe(true);
    expect(says(p.ev).filter((s) => s === HINT)).toHaveLength(1);
    expect(p.f.hits).toBe(0);
  });

  it('Gentle: 5.0 s', () => {
    const p = play({ gentle: true });
    const from = untilStuck(p);
    const t = untilDue(p, from);
    expect(t).toBeGreaterThanOrEqual(secs(5));
    expect(t).toBeLessThanOrEqual(secs(5) + 1);
    expect(p.f.arrows).toBe(true);
    expect(says(p.ev)).toContain(HINT);
  });

  it('no arrows while the valve says "WAIT", however long', () => {
    const p = play();
    // Up on the cloth again and again: he holds his breath, so the valve stays shut.
    p.run.hero = p.run.newHero(DATA.valves.x[0]! + 30);
    for (let i = 0; i < secs(20); i++) {
      if (i % 90 === 0) p.run.press('k');
      if (i % 90 === 70) p.run.release('k');
      p.ev.push(...p.run.step(DT));
    }
    expect(p.f.ready).toBe(false);
    expect(p.f.arrowDue).toBe(false);
    expect(says(p.ev)).not.toContain(HINT);
  });
});

describe('KN-R16: hidden over the cloth, gone on the hit, back each phase', () => {
  it('both hide while the hero is over that valve\'s cloth (and show again off it)', () => {
    const p = play();
    const from = untilStuck(p);
    untilDue(p, from);
    const vx = DATA.valves.x[0]!;
    const half = DATA.springs.w / 2;
    for (const x of [vx, vx - half, vx + half, vx + 10]) {
      standAt(p, x);
      expect(p.f.arrowDue).toBe(true);
      expect(p.f.arrows, `x ${x}`).toBe(false);
      expect(hintArrows(p.f, 1, false)).toBeNull();
    }
    for (const x of [vx - half - 2, vx + half + 2, 300, 420]) {
      standAt(p, x);
      expect(p.f.arrows, `x ${x}`).toBe(true);
    }
  });

  it('the words wait for the arrows to show: due over the cloth says nothing yet', () => {
    const p = play();
    const from = untilStuck(p, DATA.valves.x[0]!);
    untilDue(p, from, DATA.valves.x[0]!);
    for (let i = 0; i < secs(3); i++) standAt(p, DATA.valves.x[0]!);
    expect(says(p.ev)).not.toContain(HINT);
    expect(p.f.arrowPhases).toEqual([]);
    standAt(p, DOOR);
    expect(says(p.ev).filter((s) => s === HINT)).toHaveLength(1);
    expect(p.f.arrowPhases).toEqual([0]);
  });

  it('the hit takes them away; the timer starts again; they come back next phase, without the words', () => {
    const p = play();
    untilDue(p, untilStuck(p));
    expect(p.f.arrows).toBe(true);
    hit(p);
    expect(p.f.arrowDue).toBe(false);
    expect(p.f.arrows).toBe(false);
    // Phase 2: shut until his whirl, then STUCK for 8 s again.
    for (let i = 0; i < secs(1); i++) standAt(p, DOOR);
    expect(p.f.arrows).toBe(false);
    const from = untilStuck(p);
    for (let i = 0; i < secs(8) - 2; i++) standAt(p, DOOR);
    expect(p.f.arrows).toBe(false);
    const t = untilDue(p, from);
    expect(t).toBeLessThanOrEqual(secs(8) + 1);
    expect(p.f.arrows).toBe(true);
    expect(p.f.arrowPhases).toEqual([0, 1]);
    expect(says(p.ev).filter((s) => s === HINT)).toHaveLength(1);
    // After the third valve: none.
    hit(p);
    untilDue(p, untilStuck(p));
    hit(p);
    expect(p.f.defeated).toBe(true);
    expect(p.f.arrows).toBe(false);
  });

  it('a hit before 8 s: no arrows that phase; a new try says the words again', () => {
    const p = play();
    untilStuck(p);
    for (let i = 0; i < secs(5); i++) standAt(p, DOOR);
    hit(p);
    expect(p.f.arrowPhases).toEqual([]);
    const q = play();
    untilDue(q, untilStuck(q));
    expect(says(q.ev).filter((s) => s === HINT)).toHaveLength(1);
  });

  it('the head arrow points from the hero to the cloth and bobs; the down arrow sits over the valve', () => {
    const p = play();
    untilDue(p, untilStuck(p));
    const vx = DATA.valves.x[0]!;
    standAt(p, 400);
    const a = hintArrows(p.f, 0, true)!;
    expect(a.head.dx).toBe(-1);
    expect(a.head.x).toBeLessThan(400);
    expect(a.head.y).toBeLessThan(p.run.hero.y - 44);
    expect(a.valve.x).toBe(vx);
    expect(a.valve.y).toBeLessThan(DATA.valves.bottom - DATA.valves.h);
    // Moving: it bobs toward what it points at.
    const ys = [0, 0.1, 0.2, 0.3].map((c) => hintArrows(p.f, c, false)!);
    expect(new Set(ys.map((b) => b.head.x)).size).toBeGreaterThan(1);
    expect(Math.min(...ys.map((b) => b.head.x))).toBeGreaterThanOrEqual(400 - BH_ARROW.len / 2 - BH_LOOK.arrowBob - 1e-9);
    expect(new Set(ys.map((b) => b.valve.y)).size).toBeGreaterThan(1);
    expect(a.valve.k).toBe(1);
    // A screen whose top is close over the valves: the down arrow is smaller, and stays on screen.
    const screen = (top: number, left = -1e4, right = 1e4, bottom = 1e4) => ({ left, right, top, bottom });
    const inside = (r: { x: number; y: number; w: number; h: number }, v: ReturnType<typeof screen>) => r.x >= v.left && r.x + r.w <= v.right && r.y >= v.top && r.y + r.h <= v.bottom;
    for (const top of [-10, -3]) {
      for (const c of [0, 0.15, 0.3, 0.45]) {
        const b = hintArrows(p.f, c, false, screen(top))!;
        expect(b.valve.dy).toBe(1);
        expect(b.valve.k).toBeLessThan(1);
        expect(b.valve.k).toBeGreaterThanOrEqual(BH_LOOK.arrowSmallest);
        expect(inside(hintArrowBox(b.valve.x, b.valve.y, b.valve.dx, b.valve.dy, b.valve.k), screen(top))).toBe(true);
        expect(b.valve.y).toBeLessThan(DATA.valves.bottom - DATA.valves.h);
      }
    }
    // qa (640 x 200): less room than the smallest down arrow: it stands beside the valve, pointing
    // at it sideways, away from the hero (here on the right), fully on screen, off the valve.
    for (const c of [0, 0.15, 0.3, 0.45]) {
      const v = screen(20);
      const b = hintArrows(p.f, c, false, v)!;
      expect(b.valve.dy).toBe(0);
      expect(b.valve.dx).toBe(1);
      const box = hintArrowBox(b.valve.x, b.valve.y, b.valve.dx, b.valve.dy, b.valve.k);
      expect(inside(box, v)).toBe(true);
      expect(box.x + box.w).toBeLessThanOrEqual(vx - DATA.valves.w / 2 + 4);
      expect(inside(hintArrowBox(b.head.x, b.head.y, b.head.dx, b.head.dy, b.head.k), v)).toBe(true);
      // No room on the left of the screen: the other side, still on screen.
      const tight = screen(20, vx - 30, 1e4);
      const d = hintArrows(p.f, c, false, tight)!;
      expect(d.valve.dx).toBe(-1);
      expect(inside(hintArrowBox(d.valve.x, d.valve.y, d.valve.dx, d.valve.dy, d.valve.k), tight)).toBe(true);
    }
    // Never over the STUCK tag: with the tag hanging right, the arrow stands left, wherever the hero is.
    standAt(p, 60);
    expect(hintArrows(p.f, 0, true, screen(20), 1)!.valve.dx).toBe(1);
    expect(hintArrows(p.f, 0, true, screen(20), -1)!.valve.dx).toBe(-1);
    standAt(p, 400);
    // A hero up high near a screen edge: the head arrow stays on screen.
    const edge = screen(0, 300, 420, 260);
    for (const c of [0, 0.15, 0.3, 0.45]) {
      const b = hintArrows(p.f, c, false, edge)!;
      expect(inside(hintArrowBox(b.head.x, b.head.y, b.head.dx, b.head.dy, b.head.k), edge)).toBe(true);
    }
    standAt(p, 40);
    expect(hintArrows(p.f, 0, true)!.head.dx).toBe(1);
  });
});

describe('KN-R16: no rule, speed or life changes', () => {
  it('a Forward-and-mash bot plays the same steps with the hint as without it', () => {
    const none: RustyData = { ...DATA, valveHint: { after: Infinity, gentleAfter: Infinity } };
    for (const gentle of [false, true]) {
      const a = play({ gentle });
      const b = play({ gentle, data: none });
      for (let i = 0; i < secs(40); i++) {
        for (const p of [a, b]) {
          if (p.run.phase !== 'arena') continue;
          p.run.hero.move = 1;
          if (i % 20 === 0) p.run.press('k');
          if (i % 20 === 12) p.run.release('k');
          p.ev.push(...p.run.step(DT));
        }
      }
      const hero = (p: Play) => ({ x: p.run.hero.x, y: p.run.hero.y, vx: p.run.hero.vx, vy: p.run.hero.vy });
      expect(hero(a)).toEqual(hero(b));
      expect([a.f.hits, a.run.lives, a.f.whirlsOut, a.run.phase]).toEqual([b.f.hits, b.run.lives, b.f.whirlsOut, b.run.phase]);
      expect(a.f.arrowDue || a.f.hits > 0).toBe(true);
      expect(says(a.ev).filter((s) => s !== HINT)).toEqual(says(b.ev));
    }
  });
});
