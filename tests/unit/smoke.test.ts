import { describe, expect, it } from 'vitest';
import { FixedLoop, MAX_STEPS, STEP_MS, accumulate } from '../../src/engine/loop';
import { WORLD_H, fitView } from '../../src/engine/view';
import { createStore } from '../../src/storage';

describe('fixed time step', () => {
  it('runs the same number of steps per second at 30 and 60 fps', () => {
    const run = (fps: number): number => {
      let acc = 0;
      let steps = 0;
      for (let i = 0; i < fps; i++) {
        const r = accumulate(acc, 1000 / fps);
        acc = r.acc;
        steps += r.steps;
      }
      return steps;
    };
    expect(run(60)).toBe(60);
    expect(run(30)).toBe(60);
  });

  it('drops time after a long stall instead of running hundreds of steps', () => {
    const r = accumulate(0, 5000);
    expect(r.steps).toBe(MAX_STEPS);
    expect(r.acc).toBeLessThan(STEP_MS);
  });

  it('does not step while paused', () => {
    const frames: FrameRequestCallback[] = [];
    let updates = 0;
    const loop = new FixedLoop(
      { update: () => updates++, render: () => {} },
      (cb) => frames.push(cb),
      () => {},
    );
    loop.start(0);
    frames.shift()!(1000 / 30);
    expect(updates).toBe(2);
    loop.pause();
    frames.shift()!(2000 / 30);
    expect(updates).toBe(2);
    loop.resume();
    frames.shift()!(3000 / 30);
    expect(updates).toBe(4);
  });
});

describe('view', () => {
  it('keeps the world 360 units tall and caps pixel ratio at 2', () => {
    const v = fitView(851, 393, 2.75);
    expect(v.height).toBe(WORLD_H);
    expect(v.pixelH).toBe(786);
    expect(v.width).toBeCloseTo((851 / 393) * WORLD_H, 0);
  });
});

describe('storage', () => {
  it('still works when storage is blocked', () => {
    const store = createStore(() => {
      throw new Error('SecurityError');
    });
    expect(store.persistent).toBe(false);
    expect(store.save('look', { skin: 2 })).toBe(false);
    expect(store.load('look')).toEqual({ skin: 2 });
  });

  it('ignores broken or invalid saved data', () => {
    const data = new Map<string, string>();
    const fake = {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
      removeItem: (k: string) => void data.delete(k),
    } as unknown as Storage;
    const store = createStore(() => fake);
    data.set('gidi-dash:look', '{not json');
    expect(store.load('look')).toBeUndefined();
    store.save('look', 'x');
    const isObj = (v: unknown): v is object => typeof v === 'object' && v !== null;
    expect(store.load('look', isObj)).toBeUndefined();
  });
});
