/**
 * qa (A6): try to break piece A on the phone profile, by touch.
 * Fast taps, a finger held forever, app switch and rotate mid-jump, tiny and huge screens,
 * no network after load, a real offline second visit, and installability.
 */
import { expect, test, type CDPSession, type Page } from '@playwright/test';
import { PAST_DOUBLE_TAP_MS, startRun, waitOutTapLock } from './helpers';

const hero = (page: Page) => page.evaluate(() => window.__game!.hero);
const paused = (page: Page) => page.evaluate(() => window.__game!.paused);
const steps = (page: Page) => page.evaluate(() => window.__game!.steps);

async function ready(page: Page): Promise<void> {
  await page.goto('./');
  await startRun(page); // B3: the run starts from the title screen
  await expect.poll(() => page.evaluate(() => window.__game?.steps ?? 0)).toBeGreaterThan(5);
  await expect.poll(() => page.evaluate(() => window.__game!.hero.grounded)).toBe(true);
}

/** Real touch events through the DevTools protocol, so a finger can stay down. */
async function touch(cdp: CDPSession, type: 'touchStart' | 'touchEnd', x = 500, y = 150): Promise<void> {
  await cdp.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }],
  });
}

/**
 * C: the pause screen (design.md Screens: Pause). First proves a tap outside its buttons does
 * nothing (still paused, hero frozen), then taps "Keep playing" and reads the hero the instant
 * the game has handled that tap (before any frame can step).
 */
async function keepRunningAndRead(page: Page): Promise<{ vy: number; paused: boolean }> {
  const pauseCard = page.getByRole('dialog', { name: 'Paused' });
  await expect(pauseCard).toBeVisible();
  const frozen = await hero(page);
  await page.touchscreen.tap(20, (page.viewportSize()?.height ?? 300) - 20); // outside the card
  await page.waitForTimeout(150);
  expect(await paused(page)).toBe(true);
  expect(await hero(page)).toEqual(frozen);
  // The pause screen ignores taps for its first 0.4 s.
  await waitOutTapLock(page);
  await page.evaluate(() => {
    // Bubble phase on window: runs after the button's own click handler.
    window.addEventListener(
      'click',
      () => {
        (window as unknown as { __afterTap: unknown }).__afterTap = {
          vy: window.__game!.hero.vy,
          paused: window.__game!.paused,
        };
      },
      { once: true },
    );
  });
  await pauseCard.getByRole('button', { name: 'Keep playing' }).tap();
  await expect(pauseCard).toBeHidden();
  return page.evaluate(() => (window as unknown as { __afterTap: { vy: number; paused: boolean } }).__afterTap);
}

async function midJump(page: Page): Promise<{ x: number; y: number; vy: number; grounded: boolean }> {
  await page.touchscreen.tap(500, 150);
  await expect.poll(() => page.evaluate(() => window.__game!.hero.y), { intervals: [16] }).toBeLessThan(270);
  return hero(page);
}

test('20 taps in 1 s: never more than one jump in the air per airtime', async ({ page }) => {
  await ready(page);
  // Watch every tap and every frame in the page. A tap that sets vy to the air jump speed
  // counts; landing (or a buffered jump at the moment of landing) resets the count.
  await page.evaluate(() => {
    const log = { air: 0, ground: 0, none: 0, worst: 0, impulses: 0 };
    let airThisAirtime = 0;
    let lastVy = window.__game!.hero.vy;
    window.addEventListener('pointerdown', () => {
      const h = window.__game!.hero;
      if (h.vy === -576) {
        log.ground++;
        airThisAirtime = 0;
      } else if (h.vy === -504) {
        log.air++;
        airThisAirtime++;
      } else log.none++;
      log.worst = Math.max(log.worst, airThisAirtime);
      lastVy = h.vy;
    });
    const frame = (): void => {
      const h = window.__game!.hero;
      // Upward kick not caused by a tap: the buffered tap jumping on landing.
      if (h.grounded || (h.vy < 0 && lastVy >= 0)) {
        if (!h.grounded) log.impulses++;
        airThisAirtime = 0;
      }
      lastVy = h.vy;
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    (window as unknown as { __tapLog: typeof log }).__tapLog = log;
  });
  const t0 = Date.now();
  for (let i = 0; i < 20; i++) {
    await page.touchscreen.tap(400 + (i % 5) * 40, 150);
    const wait = t0 + (i + 1) * 50 - Date.now();
    if (wait > 0) await page.waitForTimeout(wait);
  }
  const elapsed = Date.now() - t0;
  const log = await page.evaluate(() => (window as unknown as { __tapLog: { air: number; ground: number; none: number; worst: number; impulses: number } }).__tapLog);
  console.log(`fast taps: 20 taps in ${elapsed} ms ->`, JSON.stringify(log));
  expect(elapsed).toBeLessThan(1300);
  expect(log.ground + log.air + log.none).toBe(20);
  expect(log.ground).toBeGreaterThanOrEqual(1);
  expect(log.none).toBeGreaterThan(0); // some taps were refused
  expect(log.worst).toBeLessThanOrEqual(1);
  // The hero is never higher than two tapped jumps can reach.
  await expect.poll(() => page.evaluate(() => window.__game!.hero.grounded), { timeout: 3000 }).toBe(true);
  expect((await hero(page)).y).toBe(300);
});

test('finger held forever: one jump, then standing on the road', async ({ page }) => {
  await ready(page);
  const cdp = await page.context().newCDPSession(page);
  await touch(cdp, 'touchStart');
  await expect.poll(() => page.evaluate(() => window.__game!.hero.grounded), { intervals: [16] }).toBe(false);
  await expect.poll(() => page.evaluate(() => window.__game!.hero.grounded), { timeout: 3000 }).toBe(true);
  // Still holding for 2 s: no more jumps, feet on the road (or the strip restarted under it).
  const ys: number[] = await page.evaluate(
    () =>
      new Promise<number[]>((done) => {
        const out: number[] = [];
        const t0 = performance.now();
        const f = (): void => {
          out.push(window.__game!.hero.y);
          if (performance.now() - t0 < 2000) requestAnimationFrame(f);
          else done(out);
        };
        requestAnimationFrame(f);
      }),
  );
  expect(Math.min(...ys)).toBeGreaterThanOrEqual(299);
  await touch(cdp, 'touchEnd');
  expect(await paused(page)).toBe(false);
});

test('switching apps mid-jump: pauses in the air, comes back to the same spot', async ({ page }) => {
  await ready(page);
  const before = await midJump(page);
  // Headless Chromium never hides a tab, so do what a phone does on an app switch:
  // the page turns hidden, then Chrome freezes it (no frames, no timers) for a while.
  const setHidden = (hidden: boolean) =>
    page.evaluate((h) => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => h });
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (h ? 'hidden' : 'visible') });
      document.dispatchEvent(new Event('visibilitychange'));
    }, hidden);
  await setHidden(true);
  expect(await paused(page)).toBe(true);
  const frozen = await hero(page);
  const s = await steps(page);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Page.setWebLifecycleState', { state: 'frozen' });
  await page.waitForTimeout(1500);
  await cdp.send('Page.setWebLifecycleState', { state: 'active' });
  await setHidden(false);
  await page.waitForTimeout(300);
  // Still paused on return, hero frozen mid-air, no catch-up steps.
  expect(await paused(page)).toBe(true);
  expect(await steps(page)).toBe(s);
  const back = await hero(page);
  expect(back).toEqual(frozen);
  expect(back.grounded).toBe(false);
  expect(back.y).toBeLessThan(300);
  expect(back.x).toBeGreaterThanOrEqual(before.x);
  // C: only "Keep playing" ends the pause, and it does not jump; the hero carries on the same arc.
  const resumed = await keepRunningAndRead(page);
  expect(resumed.paused).toBe(false);
  expect(resumed.vy).toBe(frozen.vy);
  await expect.poll(() => page.evaluate(() => window.__game!.hero.grounded), { timeout: 3000 }).toBe(true);
  expect((await hero(page)).y).toBe(300);
});

test('turning the phone upright mid-jump pauses; turning back and Keep playing carries on', async ({ page }) => {
  await ready(page);
  const vp = page.viewportSize()!;
  await midJump(page);
  await page.setViewportSize({ width: vp.height, height: vp.width });
  await expect(page.getByText('Turn your phone sideways to play.')).toBeVisible();
  // The note is CSS (instant); the game hears about the turn on the next frame.
  await expect.poll(() => paused(page)).toBe(true);
  const frozen = await hero(page);
  const s = await steps(page);
  // A tap while upright does not unpause or jump.
  await page.touchscreen.tap(150, 300);
  expect(await paused(page)).toBe(true);
  expect(await hero(page)).toEqual(frozen);

  await page.setViewportSize(vp);
  await expect(page.locator('#rotate')).toBeHidden();
  await page.waitForTimeout(200);
  expect(await steps(page)).toBe(s);
  // Canvas follows the new shape.
  const canvas = await page.evaluate(() => {
    const c = document.querySelector('canvas')!;
    return { w: c.width, h: c.height, cw: c.clientWidth, ch: c.clientHeight };
  });
  expect(canvas.cw).toBe(vp.width);
  expect(canvas.ch).toBe(vp.height);
  expect(canvas.w).toBe(Math.round(vp.width * 2));
  // C: once sideways the pause screen shows; "Keep playing" carries on without a jump.
  const resumed = await keepRunningAndRead(page);
  expect(resumed.paused).toBe(false);
  expect(resumed.vy).toBe(frozen.vy);
  await expect.poll(() => page.evaluate(() => window.__game!.hero.grounded), { timeout: 3000 }).toBe(true);
});

for (const size of [
  { width: 320, height: 240 },
  { width: 2560, height: 1440 },
]) {
  test(`plays on a ${size.width}x${size.height} screen`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.setViewportSize(size);
    await ready(page);
    await expect(page.locator('#rotate')).toBeHidden();
    const c = await page.evaluate(() => {
      const el = document.querySelector('canvas')!;
      return {
        w: el.width,
        h: el.height,
        cw: el.clientWidth,
        ch: el.clientHeight,
        sw: document.documentElement.scrollWidth,
        sh: document.documentElement.scrollHeight,
      };
    });
    expect(c.cw).toBe(size.width);
    expect(c.ch).toBe(size.height);
    expect(c.sw).toBeLessThanOrEqual(size.width);
    expect(c.sh).toBeLessThanOrEqual(size.height);
    // Pixel ratio capped at 2.
    expect(c.w).toBe(size.width * 2);
    expect(c.h).toBe(size.height * 2);
    // The hero is drawn where it should be (slice 2: near the start fence, where the camera stops): 30 percent across (C, qa: further left on narrow
    // screens, so the hook says where), standing on the road.
    // B3: the drawn hero (default look: green jersey) replaced the capsule, and arms swing
    // across the body, so look for jersey green anywhere in a short column through the chest.
    const px = await page.evaluate(() => {
      const el = document.querySelector('canvas')!;
      const g = el.getContext('2d')!;
      const x = Math.round(el.width * window.__game!.heroScreenX);
      const out: number[][] = [];
      for (let wy = 266; wy <= 290; wy++) {
        out.push(Array.from(g.getImageData(x, Math.round(el.height * (wy / 420)), 1, 1).data.slice(0, 3)));
      }
      return out;
    });
    expect(px).toContainEqual([0x0e, 0x7a, 0x3e]);
    // qa B4: and the green is the hero's, not the street's: the same column 60 and 90
    // percent across has none of it.
    const elsewhere = await page.evaluate(() => {
      const el = document.querySelector('canvas')!;
      const g = el.getContext('2d')!;
      const out: number[][] = [];
      for (const fx of [0.6, 0.9]) {
        for (let wy = 266; wy <= 290; wy++) {
          out.push(Array.from(g.getImageData(Math.round(el.width * fx), Math.round(el.height * (wy / 420)), 1, 1).data.slice(0, 3)));
        }
      }
      return out;
    });
    expect(elsewhere).not.toContainEqual([0x0e, 0x7a, 0x3e]);
    await page.touchscreen.tap(Math.round(size.width * 0.7), Math.round(size.height / 3));
    await expect.poll(() => page.evaluate(() => window.__game!.hero.grounded), { intervals: [16] }).toBe(false);
    await expect.poll(() => page.evaluate(() => window.__game!.hero.grounded), { timeout: 3000 }).toBe(true);
    expect(errors).toEqual([]);
  });
}

test('no network requests after the first load', async ({ page, context }) => {
  const late: string[] = [];
  let loaded = false;
  context.on('request', (r) => {
    if (loaded) late.push(`${r.method()} ${r.url()}${r.serviceWorker() ? ' (from service worker)' : ''}`);
  });
  await ready(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.waitForLoadState('networkidle');
  loaded = true;
  // Play for 5 s: taps, holds, a pause and a resume.
  for (let i = 0; i < 10; i++) {
    await page.touchscreen.tap(500, 150);
    await page.waitForTimeout(400);
  }
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
  });
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS); // design: Pause ignores taps for its first 0.4 s
  await page.getByRole('button', { name: 'Keep playing' }).tap();
  await page.touchscreen.tap(500, 150);
  await page.waitForTimeout(1000);
  expect(await paused(page)).toBe(false);
  expect(late).toEqual([]);
});

test('offline second visit really comes from the service worker cache', async ({ page, context }) => {
  await ready(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  const cached = await page.evaluate(async () => {
    const keys = await caches.keys();
    const all: string[] = [];
    for (const k of keys) for (const r of await (await caches.open(k)).keys()) all.push(new URL(r.url).pathname);
    return { keys, all };
  });
  expect(cached.keys.some((k) => k.startsWith('gidi-dash-'))).toBe(true);
  for (const f of ['/', '/index.html', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png']) {
    expect(cached.all).toContain(f);
  }
  expect(cached.all.some((p) => /^\/assets\/index-.*\.js$/.test(p))).toBe(true);

  await context.setOffline(true);
  const network: string[] = [];
  const notFromSw: string[] = [];
  context.on('request', (r) => {
    if (r.serviceWorker()) network.push(r.url());
  });
  page.on('response', (r) => {
    if (!r.fromServiceWorker()) notFromSw.push(r.url());
  });
  await page.reload();
  await startRun(page);
  await expect.poll(() => page.evaluate(() => window.__game?.steps ?? 0)).toBeGreaterThan(5);
  expect(notFromSw).toEqual([]);
  expect(network).toEqual([]);
  // The page is controlled by the worker and the game plays: a tap jumps.
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await page.touchscreen.tap(500, 150);
  await expect.poll(() => page.evaluate(() => window.__game!.hero.grounded), { intervals: [16] }).toBe(false);
});

test('offline in a fresh tab of the same browser (cold start from cache)', async ({ page, context }) => {
  await ready(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.close();
  await context.setOffline(true);
  const p2 = await context.newPage();
  await p2.goto('./');
  await startRun(p2);
  await expect.poll(() => p2.evaluate(() => window.__game?.steps ?? 0)).toBeGreaterThan(5);
});

test('installable: manifest and icons pass Chromium checks', async ({ page, context, baseURL }) => {
  await ready(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  const cdp = await context.newCDPSession(page);
  const manifest = (await cdp.send('Page.getAppManifest')) as {
    url: string;
    errors: { message: string; critical: number }[];
    parsed?: unknown;
  };
  console.log('manifest url:', manifest.url, 'errors:', JSON.stringify(manifest.errors));
  expect(manifest.url).toBe(new URL('manifest.webmanifest', baseURL).href);
  expect(manifest.errors).toEqual([]);

  let installErrors: unknown = 'not supported';
  try {
    const r = (await cdp.send('Page.getInstallabilityErrors')) as { installabilityErrors: unknown[] };
    installErrors = r.installabilityErrors;
  } catch (e) {
    installErrors = `not supported: ${(e as Error).message}`;
  }
  console.log('installability errors:', JSON.stringify(installErrors));
  if (Array.isArray(installErrors)) expect(installErrors).toEqual([]);

  // Our own check of the criteria, so this test means something even if the protocol call goes away.
  const m = await (await page.request.get('manifest.webmanifest')).json();
  expect(m.name).toBeTruthy();
  expect(m.short_name).toBeTruthy();
  expect(m.start_url).toBeTruthy();
  expect(['fullscreen', 'standalone', 'minimal-ui']).toContain(m.display);
  const sizes = (m.icons as { sizes: string; src: string; type: string }[]).map((i) => i.sizes);
  expect(sizes).toContain('192x192');
  expect(sizes).toContain('512x512');
  for (const icon of m.icons as { src: string; sizes: string; type: string }[]) {
    const res = await page.request.get(icon.src);
    expect(res.ok()).toBe(true);
    expect(res.headers()['content-type']).toContain(icon.type);
    const dims = await page.evaluate(async (src) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      return `${img.naturalWidth}x${img.naturalHeight}`;
    }, icon.src);
    expect(dims).toBe(icon.sizes);
  }
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
});

test('on a computer: Space and up arrow jump; holding the key does not repeat-jump', async ({ page }) => {
  await ready(page);
  for (const key of ['Space', 'ArrowUp']) {
    await expect.poll(() => page.evaluate(() => window.__game!.hero.grounded), { timeout: 3000 }).toBe(true);
    await page.keyboard.down(key);
    await expect.poll(() => page.evaluate(() => window.__game!.hero.grounded), { intervals: [16] }).toBe(false);
    // Auto-repeat keydowns while held must not use up the air jump.
    for (let i = 0; i < 5; i++) {
      await page.evaluate(
        (code) => window.dispatchEvent(new KeyboardEvent('keydown', { code, repeat: true, cancelable: true })),
        key,
      );
    }
    const vyBefore = (await hero(page)).vy;
    expect(vyBefore).not.toBe(-504);
    await page.keyboard.up(key);
    // A second press in the air is the air jump.
    const r = await page.evaluate((code) => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code, cancelable: true }));
      const vy = window.__game!.hero.vy;
      window.dispatchEvent(new KeyboardEvent('keyup', { code }));
      return vy;
    }, key);
    expect(r).toBe(-504);
  }
});
