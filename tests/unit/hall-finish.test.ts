/**
 * qa N3 fix: the hall's 6 s kind finish is not play. From the third hit Pause cannot open (the
 * button, P, Escape, app switch and phone upright all use Run.inPlay), and the hall win is saved
 * at the third hit ('bossDefeat'), so leaving or reloading in the finish never loses it.
 */
import { describe, expect, it } from 'vitest';
import hallData from '../../src/data/levels/lagos-hall.json';
import street1 from '../../src/data/levels/lagos-1.json';
import { pauseKeyAction } from '../../src/engine/input';
import { BOSS_RULES } from '../../src/game/boss';
import { parseLevel } from '../../src/game/level';
import { LAGOS, Progress, mergeFinish, readState } from '../../src/game/progress';
import { Run, type RunEvent, type RunPhase } from '../../src/game/run';
import { createStore } from '../../src/storage';

const DT = 1 / 60;
const HALL = parseLevel(hallData);
const L = HALL.boss!.lights;

function dropOnto(run: Run, p: { x: number; y: number; w: number }): RunEvent[] {
  // S2.14: each light comes on a while after its phase starts; wait for it (kept safe).
  const boss = run.boss!;
  for (let i = 0; i < 60 * 20 && boss.lit !== boss.hits; i++) {
    run.step(DT);
    run.safe = 10;
  }
  const h = run.hero;
  h.x = p.x + p.w / 2;
  h.y = h.prevY = p.y - 20;
  Object.assign(h, { vy: 60, vx: 0, grounded: false, on: null });
  const all: RunEvent[] = [];
  for (let i = 0; i < 30 && !all.some((e) => e.type === 'bossHit'); i++) all.push(...run.step(DT));
  return all;
}

function wait(run: Run, seconds: number): void {
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    run.step(DT);
    run.safe = 10;
  }
}

/** Lands the first two hits, waits for the third light; returns the third hit's step events. */
function toThirdHit(run: Run): RunEvent[] {
  for (let i = 0; i < 2; i++) {
    dropOnto(run, L[i]!);
    wait(run, 1.6);
  }
  return dropOnto(run, L[2]!);
}

function fakeStorage(seed: Record<string, string> = {}): { storage: Storage; data: Map<string, string> } {
  const data = new Map<string, string>(Object.entries(seed));
  const storage = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  } as unknown as Storage;
  return { storage, data };
}

describe('the hall finish is not play (Pause stays shut)', () => {
  it('in play during the fight, through the first two hits', () => {
    const run = new Run(HALL);
    expect(run.inPlay).toBe(true);
    for (let i = 0; i < 2; i++) {
      dropOnto(run, L[i]!);
      expect(run.inPlay).toBe(true);
      wait(run, 1.6);
    }
    expect(run.boss!.hits).toBe(2);
    expect(run.inPlay).toBe(true); // still the fight before the third hit
  });

  it('the third hit step itself already ends play, and it stays ended through the 6 s finish', () => {
    const run = new Run(HALL);
    const hit3 = toThirdHit(run);
    expect(hit3.map((e) => e.type)).toContain('bossDefeat');
    expect(run.phase).toBe('arena');
    expect(run.inPlay).toBe(false);
    let won = false;
    for (let i = 0; i < Math.round(BOSS_RULES.winAt * 60) + 5 && !won; i++) {
      won = run.step(DT).some((e) => e.type === 'win');
      expect(run.inPlay).toBe(false);
    }
    expect(won).toBe(true);
    expect(run.phase).toBe('won');
    expect(run.inPlay).toBe(false);
  });

  it('P and Escape do nothing in the finish (the key rule gets inPlay = false)', () => {
    const run = new Run(HALL);
    toThirdHit(run);
    wait(run, 1.5);
    for (const code of ['KeyP', 'Escape']) expect(pauseKeyAction(code, false, null, run.inPlay)).toBeNull();
  });

  it('street phases: in play on the street, in the well and its room; not in the bus finish or on end cards', () => {
    const run = new Run(parseLevel(street1));
    const want: Record<RunPhase, boolean> = {
      run: true,
      wellDown: true,
      roomIn: true,
      room: true,
      wellUp: true,
      bus: false,
      cleared: false,
      won: false,
      over: false,
      arena: true, // a street run has no boss: never a finish
    };
    for (const [phase, ok] of Object.entries(want)) {
      run.phase = phase as RunPhase;
      expect(run.inPlay, phase).toBe(ok);
    }
  });
});

describe('the hall win is saved at the third hit', () => {
  it('a save made at the third hit is read back after a reload as hall done', () => {
    const ready = { v: 1, states: { lagos: { streets: { 1: { done: true, best: 120 }, 2: { done: true, best: 113 }, 3: { done: true, best: 98 } }, parcel: true, hall: { done: false, best: 0 } } } };
    const { storage, data } = fakeStorage({ 'gidi-progress': JSON.stringify(ready) });
    const run = new Run(HALL, { parcel: true });
    const p = new Progress(createStore(() => storage));
    for (const e of toThirdHit(run)) if (e.type === 'bossDefeat') p.finish({ state: LAGOS, hall: true, kobo: run.kobo });
    // Reload mid-finish (1.5 s in): a fresh read sees the hall done; nothing else changed.
    wait(run, 1.5);
    const after = readState((JSON.parse(data.get('gidi-progress')!) as { states: { lagos: unknown } }).states.lagos);
    expect(after.hall.done).toBe(true);
    expect(new Progress(createStore(() => storage)).state(LAGOS).hall.done).toBe(true);
    expect(after.parcel).toBe(false); // used up by the win (po ruling d)
    // Slice 3 (N3 a): the version 1 copy moved to Naira on load, so its best is times 10.
    expect(after.streets['3']).toEqual({ done: true, best: 980 });
  });

  it("the 'win' save after it changes nothing (merge, never lower)", () => {
    const once = mergeFinish(null, { state: LAGOS, hall: true, kobo: 0 });
    const twice = mergeFinish(once, { state: LAGOS, hall: true, kobo: 0 });
    expect(twice).toEqual(once);
  });
});
