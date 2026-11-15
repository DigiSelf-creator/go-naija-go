/**
 * qa round 5 (S3e1b, S3f0 part 25, W18, S3g1b, 44b0bc6): checks the gamedev specs did not cover.
 *
 * 1. People load late or not at all: a street and the city opened before the
 *    people's chunk arrives (or when it never does) still play, with no page error.
 * 2. An error in people code switches the people off and never stops a run: a fault is put into
 *    the built people code (the chunk is served with one method that throws once a flag is set),
 *    in the street (GamePeople), the city (CityPeople) and the lane run (LaneFolk).
 * 3. Tilt that cannot work never stops the run: no DeviceOrientationEvent at all, and an iPhone
 *    whose requestPermission throws or never answers, each with "Tilt to steer" saved on.
 */
import { expect, test, type Page, type Route } from '@playwright/test';
import { PAST_DOUBLE_TAP_MS, startRun, screenNow } from './helpers';

const LOOK = '{"skin":2,"hair":0,"outfit":0,"body":0,"age":1}';

/** Saved hero and intro seen, so "Play" goes straight on. */
async function hero(page: Page, extra: Record<string, string> = {}): Promise<void> {
  await page.addInitScript(
    ({ look, extra }) => {
      try {
        if (localStorage.getItem('gidi-look') === null) {
          localStorage.setItem('gidi-look', look);
          localStorage.setItem('gidi-intro', '"seen"');
          for (const [k, v] of Object.entries(extra)) localStorage.setItem(k, v);
        }
      } catch {
        /* storage blocked */
      }
    },
    { look: LOOK, extra },
  );
}

/** Serves a built chunk with `name(...) {` made to throw while window.__qaFault is true. */
async function faultIn(page: Page, chunk: RegExp, method: string): Promise<{ patched: () => boolean }> {
  let patched = false;
  await page.route(chunk, async (route: Route) => {
    const res = await route.fetch();
    const body = await res.text();
    const re = new RegExp(`(?<![.\\w$])${method}\\(([\\w$,]*)\\)\\{`, 'g');
    const out = body.replace(re, (m) => {
      patched = true;
      return `${m}if(globalThis.__qaFault)throw new Error("qa: people fault in ${method}");`;
    });
    await route.fulfill({ response: res, body: out, headers: { ...res.headers(), 'content-type': 'text/javascript' } });
  });
  return { patched: () => patched };
}

const steps = (page: Page) => page.evaluate(() => window.__game!.steps);

test.use({ serviceWorkers: 'block' });

test.describe('people load late or never', () => {
  test('a street opened before the people chunk arrives plays; people join when it lands', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    let release: () => void = () => {};
    const held = new Promise<void>((r) => (release = r));
    await page.route(/\/assets\/peopleKit-[^/]*\.js$/, async (route) => {
      await held;
      await route.continue();
    });
    await hero(page);
    await page.goto('./?level=lagos-2');
    await startRun(page);
    expect(await page.evaluate(() => window.__game!.people)).toBeNull();
    const s0 = await steps(page);
    await page.keyboard.down('ArrowRight');
    await expect.poll(() => steps(page)).toBeGreaterThan(s0 + 60);
    expect(await page.evaluate(() => window.__game!.hero.x)).toBeGreaterThan(0);
    release();
    await expect.poll(() => page.evaluate(() => window.__game!.people !== null), { timeout: 10_000 }).toBe(true);
    const s1 = await steps(page);
    await expect.poll(() => steps(page)).toBeGreaterThan(s1 + 60);
    await page.keyboard.up('ArrowRight');
    expect(await page.evaluate(() => window.__game!.people!.on)).toBe(true);
    expect(errors).toEqual([]);
  });

  test('the people chunk never arrives (network gone): the city and a street both work', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.route(/\/assets\/peopleKit-[^/]*\.js$/, (route) => route.abort('internetdisconnected'));
    await hero(page);
    await page.goto('./');
    await page.getByRole('button', { name: 'Play' }).tap();
    await expect.poll(() => screenNow(page)).toBe('city');
    // The city stays usable: a pin opens its card.
    await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
    await page.getByRole('button', { name: /^Potholes, / }).tap();
    const card = page.getByRole('dialog', { name: 'Potholes' });
    await expect(card).toBeVisible();
    await card.getByRole('button', { name: 'Run Alausa' }).tap();
    await expect.poll(() => screenNow(page)).toBe('play');
    const s0 = await steps(page);
    await expect.poll(() => steps(page)).toBeGreaterThan(s0 + 60);
    expect(await page.evaluate(() => window.__game!.people)).toBeNull();
    expect(errors).toEqual([]);
  });
});

test.describe('an error in people code switches people off, never stops the run', () => {
  test('street: GamePeople throws mid-run; the run goes on, people are off', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const f = await faultIn(page, /\/assets\/peopleKit-[^/]*\.js$/, 'updateNow');
    await hero(page);
    await page.goto('./?level=lagos-2');
    await startRun(page);
    await expect.poll(() => page.evaluate(() => window.__game!.people !== null), { timeout: 10_000 }).toBe(true);
    expect(f.patched(), 'the fault went into the people chunk').toBe(true);
    await page.evaluate(() => ((globalThis as { __qaFault?: boolean }).__qaFault = true));
    const s0 = await steps(page);
    await expect.poll(() => steps(page)).toBeGreaterThan(s0 + 120);
    expect(await page.evaluate(() => window.__game!.people!.on)).toBe(false);
    expect(errors).toEqual([]);
  });
});

test.describe('city people fault', () => {
  // Was a game bug (qa round 5): CityPeople had no guard in src/screens/city.ts. Fixed: an error
  // switches the city's people off for the visit (folkFail), as GamePeople does.
  test('city: CityPeople throws; the city keeps drawing and its pins still open', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const f = await faultIn(page, /\/assets\/peopleKit-[^/]*\.js$/, 'step');
    await hero(page, { 'gidi-progress': JSON.stringify({ v: 2, states: {}, city: { kobo: 0, power: 0, tech: 0, fixed: [], fixes: 0, paid: {}, hints: ['walk', 'bright'] } }) });
    await page.goto('./');
    await page.getByRole('button', { name: 'Play' }).tap();
    await expect.poll(() => screenNow(page)).toBe('city');
    await page.waitForTimeout(1500);
    expect(f.patched(), 'the fault went into the people chunk').toBe(true);
    // Walk the hero (a still city draws nothing, W10), first with people working, then broken.
    const vp = page.viewportSize()!;
    const walkDraws = async (fx: number): Promise<number> => {
      await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
      const d0 = await page.evaluate(() => window.__game!.city!.draws);
      await page.touchscreen.tap(vp.width * fx, vp.height * 0.55);
      await page.waitForTimeout(1200);
      return (await page.evaluate(() => window.__game!.city!.draws)) - d0;
    };
    expect(await walkDraws(0.25), 'draws while walking, people working').toBeGreaterThan(10);
    await page.waitForTimeout(3000);
    await page.evaluate(() => ((globalThis as { __qaFault?: boolean }).__qaFault = true));
    const broken = await walkDraws(0.7);
    console.log(`city with a people fault: ${broken} draws in 1.2 s of walking; page errors: ${JSON.stringify(errors.slice(0, 2))}`);
    expect(broken, 'draws while walking, people broken').toBeGreaterThan(10);
    expect(errors).toEqual([]);
  });
});

test.describe('lane people fault', () => {
  // Was a game bug (qa round 5): LaneFolk had no guard in src/lane/view.ts. Fixed: an error
  // switches the lane's people off for the visit (folkFail), as GamePeople does.
  test('lane run: LaneFolk throws mid-run; the run goes on', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const f = await faultIn(page, /\/assets\/session-[^/]*\.js$/, 'drawPeople');
    await hero(page, { 'gidi-progress': JSON.stringify({ v: 2, states: {}, city: { kobo: 0, power: 0, tech: 0, fixed: [], fixes: 0, paid: {}, hints: ['walk', 'bright'] }, lane: { best: 0, goals: 0, runs: 2, hints: [], tiltOffered: true, tiltNoes: 0 } }) });
    await page.goto('./?level=lagos-lane');
    await startRun(page);
    await expect.poll(() => page.evaluate(() => window.__lane?.stage), { timeout: 15_000 }).toBe('play');
    expect(f.patched(), 'the fault went into the lane chunk').toBe(true);
    await page.evaluate(() => ((globalThis as { __qaFault?: boolean }).__qaFault = true));
    const d0 = (await page.evaluate(() => window.__lane!.dist));
    await page.waitForTimeout(2000);
    expect(await page.evaluate(() => window.__lane!.dist)).toBeGreaterThan(d0 + 5);
    expect(errors).toEqual([]);
  });
});

test.describe('tilt that cannot work never stops the run', () => {
  async function laneWithTiltSaved(page: Page, setup: () => void): Promise<string[]> {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(setup);
    await hero(page, { 'gidi-tiltToSteer': 'true' });
    await page.goto('./?level=lagos-lane');
    await startRun(page);
    await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
    // A start card may ask: tap its big button if one shows.
    await expect.poll(() => page.evaluate(() => window.__lane?.stage), { timeout: 15_000 }).toBe('play');
    const d0 = (await page.evaluate(() => window.__lane!.dist));
    await page.waitForTimeout(1500);
    expect(await page.evaluate(() => window.__lane!.dist)).toBeGreaterThan(d0 + 5);
    // Swipes still steer.
    const lane0 = (await page.evaluate(() => window.__lane!.lane));
    await page.keyboard.press(lane0 >= 1 ? 'ArrowLeft' : 'ArrowRight');
    await expect.poll(() => page.evaluate(() => window.__lane!.lane)).not.toBe(lane0);
    return errors;
  }

  test('no DeviceOrientationEvent at all on a touch phone', async ({ page }) => {
    const errors = await laneWithTiltSaved(page, () => {
      delete (window as unknown as { DeviceOrientationEvent?: unknown }).DeviceOrientationEvent;
    });
    expect(errors).toEqual([]);
  });

  test('an iPhone whose requestPermission throws', async ({ page }) => {
    await page.context().addInitScript(() => {
      Object.defineProperty(navigator, 'userAgent', { get: () => 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
    });
    const errors = await laneWithTiltSaved(page, () => {
      (window.DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission = () => {
        throw new Error('NotAllowedError');
      };
    });
    expect(errors).toEqual([]);
  });

  test('an iPhone whose requestPermission never answers', async ({ page }) => {
    await page.context().addInitScript(() => {
      Object.defineProperty(navigator, 'userAgent', { get: () => 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
    });
    const errors = await laneWithTiltSaved(page, () => {
      (window.DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission = () => new Promise<string>(() => {});
    });
    expect(errors).toEqual([]);
  });
});

test.describe('the update prompt is web only (decision 55)', () => {
  test.use({ serviceWorkers: 'allow' });
  test('inside the store app (Capacitor native): no service worker, no update check, no banner', async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { Capacitor: { isNativePlatform: () => boolean } }).Capacitor = { isNativePlatform: () => true };
    });
    await page.goto('./');
    await expect.poll(() => screenNow(page)).toBe('title');
    await page.waitForTimeout(2500);
    expect(await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)).toBe(0);
    expect(await page.evaluate(() => window.__game!.update)).toEqual({ ready: false, shown: false });
    await expect(page.getByText('New version ready. Tap to update.')).toHaveCount(0);
  });
  test('on the web link the service worker does register (so the check above means something)', async ({ page }) => {
    await page.goto('./');
    await expect.poll(() => screenNow(page)).toBe('title');
    await expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length), { timeout: 10_000 }).toBe(1);
  });
});
