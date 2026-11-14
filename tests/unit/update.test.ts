import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SKIP_WAITING, TAKE_OVER_MS, UpdateState, UpdateWatch, bannerShows, type ContainerLike, type RegistrationLike } from '../../src/update';
import { WORDS } from '../../src/screens/words';

/** A fake navigator.serviceWorker and registration. */
function fakes(controlled: boolean, waiting = false) {
  const container = {
    controller: controlled ? {} : null,
    fns: [] as (() => void)[],
    addEventListener(_t: 'controllerchange', fn: () => void) {
      this.fns.push(fn);
    },
    change() {
      this.controller = {};
      for (const f of this.fns) f();
    },
  };
  const posted: unknown[] = [];
  const installing = Object.assign(new EventTarget(), { state: 'installing' });
  const reg = {
    waiting: waiting ? { postMessage: (m: unknown) => posted.push(m) } : null,
    installing: null as (EventTarget & { state: string }) | null,
    updates: 0,
    found: [] as (() => void)[],
    update() {
      this.updates++;
      return Promise.resolve();
    },
    addEventListener(_t: 'updatefound', fn: () => void) {
      this.found.push(fn);
    },
  };
  const visible: (() => void)[] = [];
  const timers: [() => void, number][] = [];
  let reloads = 0;
  let readies = 0;
  const watch = new UpdateWatch({
    container: container as ContainerLike,
    registration: Promise.resolve(reg as RegistrationLike),
    onReady: () => readies++,
    reload: () => reloads++,
    onVisible: (fn) => visible.push(fn),
    setTimer: (fn, ms) => timers.push([fn, ms]),
  });
  return {
    container,
    reg,
    installing,
    posted,
    visible,
    timers,
    watch,
    reloads: () => reloads,
    readies: () => readies,
  };
}
const tick = () => new Promise((r) => setTimeout(r, 0));

describe('U1 UpdateState', () => {
  it('a first visit: its own worker taking control is not an update', () => {
    const s = new UpdateState(false);
    s.controllerChanged();
    expect(s.ready).toBe(false);
    // A later deploy while the same page is still open is one.
    s.controllerChanged();
    expect(s.ready).toBe(true);
  });

  it('an old worker controlled the page: a new one taking over is an update', () => {
    const s = new UpdateState(true);
    s.controllerChanged();
    expect(s.ready).toBe(true);
  });

  it('a waiting worker counts only with an old one in control', () => {
    const a = new UpdateState(false);
    a.workerWaiting(false);
    expect(a.ready).toBe(false);
    const b = new UpdateState(true);
    b.workerWaiting(true);
    expect(b.ready).toBe(true);
  });
});

describe('U1 bannerShows', () => {
  it('never in a run; on pause, result cards and other screens', () => {
    expect(bannerShows(false, false)).toBe(false);
    expect(bannerShows(true, true)).toBe(false);
    expect(bannerShows(true, false)).toBe(true);
  });
});

describe('U1 UpdateWatch', () => {
  it('first visit: no prompt', async () => {
    const f = fakes(false);
    await tick();
    f.container.change();
    expect(f.watch.state.ready).toBe(false);
    expect(f.readies()).toBe(0);
  });

  it('a new worker takes over: ready once, and a tap reloads', async () => {
    const f = fakes(true);
    await tick();
    f.container.change();
    f.container.change();
    expect(f.watch.state.ready).toBe(true);
    expect(f.readies()).toBe(1);
    f.watch.apply();
    f.watch.apply();
    expect(f.reloads()).toBe(1);
  });

  it('a waiting worker: ready at load; the tap asks it to take over, then reloads', async () => {
    const f = fakes(true, true);
    await tick();
    expect(f.watch.state.ready).toBe(true);
    f.watch.apply();
    expect(f.posted).toEqual([SKIP_WAITING]);
    expect(f.reloads()).toBe(0);
    f.container.change();
    expect(f.reloads()).toBe(1);
    // The fallback timer is there if it never takes over.
    expect(f.timers[0]![1]).toBe(TAKE_OVER_MS);
  });

  it('a new worker installed while an old one controls: ready', async () => {
    const f = fakes(true);
    await tick();
    f.reg.installing = f.installing;
    for (const fn of f.reg.found) fn();
    f.installing.state = 'installed';
    f.installing.dispatchEvent(new Event('statechange'));
    expect(f.watch.state.ready).toBe(true);
  });

  it('checks for a new sw.js when the page comes back to the front', async () => {
    const f = fakes(true);
    await tick();
    expect(f.visible).toHaveLength(1);
    f.visible[0]!();
    expect(f.reg.updates).toBe(1);
  });

  it('an update check that fails (offline) is quiet', async () => {
    const f = fakes(true);
    await tick();
    f.reg.update = () => Promise.reject(new Error('offline'));
    expect(() => f.watch.check()).not.toThrow();
    await tick();
  });
});

describe('U1 words and service worker', () => {
  it('the exact words (decision 52)', () => {
    expect(WORDS.update.ready).toBe('New version ready. Tap to update.');
  });

  it('sw.js takes over when asked, and talks to no other site', () => {
    const sw = readFileSync(new URL('../../src/sw/sw.js', import.meta.url), 'utf8');
    expect(sw).toContain(`'${SKIP_WAITING.type}'`);
    expect(sw).toContain('self.skipWaiting()');
    expect(sw).not.toMatch(/https?:\/\//);
  });
});
