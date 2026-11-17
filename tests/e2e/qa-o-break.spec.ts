/**
 * qa slice O (O2c, O3c, O4c): trying to break the Ogun streets on the phone profile, by touch.
 * - switching apps while a crack rumbles (Abeokuta): the rumble waits, nothing opens under the hero;
 * - turning the phone upright mid-jump on Sagamu's flyover, then on to the bus;
 * - 20 taps in 1 s in Ota's mud;
 * - Gentle mode on Ota: 5 lives and "Bus stop! Halfway there.";
 * - Sound and Music off with reduced motion on Sagamu: no sound made at all, gravel still plays;
 * - offline after the Ogun download: Ota plays from the phone, no network request while playing.
 */
import { expect, test, type Page } from '@playwright/test';
import { crateActor, type CrateLog } from './crate-bot';
import { buttonCentres, hands, playStreetByHand } from './hands';
import { PAST_DOUBLE_TAP_MS, screenNow, startRun, waitOutTapLock } from './helpers';

const LOOK = '{"skin":1,"hair":3,"outfit":2,"body":1,"age":1}';
const CITY = { kobo: 1000, power: 0, tech: 0, fixed: [], fixes: 0, paid: {}, hints: ['walk', 'bright', 'buka', 'collect', 'road'] };
const DONE = { done: true, best: 100 };
const LAGOS = { streets: { 1: DONE, 2: DONE, 3: DONE }, parcel: false, hall: { done: true, best: 0 } };

function errorsOf(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  return errors;
}

/** A street by URL (the Ogun part loads from the site), with a saved hero and these keys. */
async function street(page: Page, id: string, extra: Record<string, string> = {}): Promise<void> {
  await page.goto('./');
  await page.evaluate(
    ({ look, extra }) => {
      localStorage.setItem('gidi-look', look);
      localStorage.setItem('gidi-intro', '"seen"');
      for (const [k, v] of Object.entries(extra)) localStorage.setItem(k, v);
    },
    { look: LOOK, extra },
  );
  await page.goto(`./?level=${id}`);
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await startRun(page);
  await expect.poll(() => page.evaluate(() => window.__game!.steps), { timeout: 20_000 }).toBeGreaterThan(5);
  expect(await page.evaluate(() => window.__game!.level.id)).toBe(id);
}

const setHidden = (page: Page, hidden: boolean) =>
  page.evaluate((h) => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => h });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (h ? 'hidden' : 'visible') });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);

async function keepPlaying(page: Page): Promise<void> {
  const card = page.getByRole('dialog', { name: 'Paused' });
  await expect(card).toBeVisible();
  await waitOutTapLock(page);
  await card.getByRole('button', { name: 'Keep playing' }).tap();
  await expect(card).toBeHidden();
}

test('qa O break: switching apps while Abeokuta\'s first crack rumbles: it waits, then the hero clears it', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = errorsOf(page);
  await street(page, 'ogun-2');
  const cdp = await page.context().newCDPSession(page);
  const h = hands(cdp);
  const crack = () => page.evaluate(() => window.__game!.run.cracks.find((c) => c.x === 5250)!.state);
  // Up to the moment the crack at 5250 starts to rumble (hero within 240 u of its lip).
  const first = await playStreetByHand(page, h, { until: (s) => (s.r as unknown as { cracks: { x: number; state: string }[] }).cracks.some((c) => c.x === 5250 && c.state !== 'shut') });
  const livesBefore = first.last.r.lives;
  await setHidden(page, true);
  await h.upAll();
  expect(await page.evaluate(() => window.__game!.paused)).toBe(true);
  const stateHidden = await crack();
  const steps = await page.evaluate(() => window.__game!.steps);
  await cdp.send('Page.setWebLifecycleState', { state: 'frozen' });
  await page.waitForTimeout(1500);
  await cdp.send('Page.setWebLifecycleState', { state: 'active' });
  await setHidden(page, false);
  await page.waitForTimeout(400);
  // Twenty fast taps on Jump while paused do nothing.
  const btn = await buttonCentres(page);
  for (let i = 0; i < 20; i++) await page.touchscreen.tap(btn.jump.x, btn.jump.y);
  expect(await page.evaluate(() => window.__game!.steps)).toBe(steps);
  expect(await crack()).toBe(stateHidden);
  await keepPlaying(page);
  const rest = await playStreetByHand(page, h, { act: await crateActor(page, { opened: [], foods: [] } as CrateLog) });
  await h.upAll();
  console.log(`crack at hide: ${stateHidden}; lives ${livesBefore} -> ${rest.last.r.lives}; lost at ${rest.stats.lostAt.join(', ') || 'nowhere'}; end ${rest.last.r.phase}`);
  expect(rest.stats.lostAt.filter((x) => x > 5000 && x < 5400), 'no life lost at the crack after the pause').toEqual([]);
  expect(rest.last.r.phase).toBe('bus');
  expect(errors).toEqual([]);
});

test('qa O break: turning the phone upright mid-jump on Sagamu by the flyover, then on to the bus', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = errorsOf(page);
  await street(page, 'ogun-3');
  const cdp = await page.context().newCDPSession(page);
  const h = hands(cdp);
  const crates: CrateLog = { opened: [], foods: [] };
  await playStreetByHand(page, h, { act: await crateActor(page, crates), until: (s) => s.h.x >= 4300 && s.h.grounded });
  const btn = await buttonCentres(page);
  await h.down(2, btn.jump.x, btn.jump.y);
  await expect.poll(() => page.evaluate(() => window.__game!.hero.grounded), { intervals: [16] }).toBe(false);
  const vp = page.viewportSize()!;
  await page.setViewportSize({ width: vp.height, height: vp.width });
  await expect(page.getByText('Turn your phone sideways to play.')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__game!.paused)).toBe(true);
  await h.upAll();
  const frozen = await page.evaluate(() => window.__game!.hero);
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__game!.hero)).toEqual(frozen);
  await page.setViewportSize(vp);
  await expect(page.locator('#rotate')).toBeHidden();
  await keepPlaying(page);
  const rest = await playStreetByHand(page, h, { act: await crateActor(page, crates) });
  await h.upAll();
  console.log(`Sagamu after the turn at x ${frozen.x.toFixed(0)} y ${frozen.y.toFixed(0)}: ${rest.last.r.phase}, lives ${rest.last.r.lives}, lost at ${rest.stats.lostAt.join(', ') || 'nowhere'}`);
  expect(rest.last.r.phase).toBe('bus');
  expect(errors).toEqual([]);
});

test('qa O break: 20 taps in 1 s in Ota\'s mud: no jump beyond the air jump', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = errorsOf(page);
  await street(page, 'ogun-1');
  const cdp = await page.context().newCDPSession(page);
  const h = hands(cdp);
  await playStreetByHand(page, h, { until: (s) => s.h.x >= 2110 });
  const btn = await buttonCentres(page);
  // An extra jump: in the air with the air jump already used, vy jumps up sharply and the air
  // jump is still used (a landing and a fresh jump would give the air jump back).
  await page.evaluate(() => {
    const w = window as unknown as { __extra: number; __jumps: number };
    w.__extra = 0;
    w.__jumps = 0;
    let prev = { ...window.__game!.hero };
    const f = (): void => {
      const cur = { ...window.__game!.hero };
      if (cur.vy < prev.vy - 150) {
        w.__jumps++;
        if (!prev.grounded && !prev.airJump && !cur.airJump) w.__extra++;
      }
      prev = cur;
      requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  });
  for (let i = 0; i < 20; i++) {
    await page.touchscreen.tap(btn.jump.x, btn.jump.y);
    await page.waitForTimeout(50);
  }
  const offs = await page.evaluate(() => ({ extra: (window as unknown as { __extra: number }).__extra, jumps: (window as unknown as { __jumps: number }).__jumps }));
  await expect.poll(() => page.evaluate(() => window.__game!.hero.grounded)).toBe(true);
  const r = await page.evaluate(() => window.__game!.run);
  console.log(`20 taps in mud: ${offs.jumps} jumps, ${offs.extra} beyond the air jump; lives ${r.lives}`);
  expect(offs.jumps).toBeGreaterThan(0);
  expect(offs.extra, 'never a jump after the air jump is used').toBe(0);
  await h.upAll();
  expect(errors).toEqual([]);
});

test('qa O break: Gentle mode on Ota: 5 lives and "Bus stop! Halfway there."', async ({ page }) => {
  test.setTimeout(180_000);
  const errors = errorsOf(page);
  await street(page, 'ogun-1', { 'gidi-gentle': 'true' });
  expect(await page.evaluate(() => window.__game!.run.lives)).toBe(5);
  const cdp = await page.context().newCDPSession(page);
  const h = hands(cdp);
  const toasts = new Set<string>();
  await playStreetByHand(page, h, {
    until: (s) => s.h.x >= 4700,
    onPoll: async () => {
      const t = await page.evaluate(() => window.__game!.toast);
      if (t) toasts.add(t);
    },
  });
  await h.upAll();
  expect(toasts).toContain('Bus stop! Halfway there.');
  expect(toasts).not.toContain('Bus stop! Now you start here.');
  expect(errors).toEqual([]);
});

test('qa O break: Sound and Music off with reduced motion: Sagamu makes no sound and still plays', async ({ page }) => {
  test.setTimeout(240_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    const w = window as unknown as { __nodes: number };
    w.__nodes = 0;
    for (const name of ['createOscillator', 'createBufferSource'] as const) {
      const make = AudioContext.prototype[name] as (this: AudioContext) => AudioNode;
      (AudioContext.prototype as unknown as Record<string, unknown>)[name] = function (this: AudioContext) {
        w.__nodes++;
        return make.call(this);
      };
    }
  });
  const errors = errorsOf(page);
  await street(page, 'ogun-3', { 'gidi-sound': 'false', 'gidi-music': 'false' });
  // The silent audio unlock (src/engine/audio-unlock.ts, one empty buffer) is not a sound.
  const atStart = await page.evaluate(() => (window as unknown as { __nodes: number }).__nodes);
  const cdp = await page.context().newCDPSession(page);
  const h = hands(cdp);
  const { last } = await playStreetByHand(page, h, { until: (s) => s.h.x >= 2700 });
  await h.upAll();
  const nodes = await page.evaluate(() => (window as unknown as { __nodes: number }).__nodes);
  const gravel = last.r.hazards.filter((z) => z.kind === 'gravel').length;
  console.log(`sound nodes with Sound and Music off: ${nodes} (${atStart} at the start); gravel left ${gravel}; lives ${last.r.lives}`);
  expect(atStart).toBeLessThanOrEqual(1);
  expect(nodes - atStart).toBe(0);
  expect(errors).toEqual([]);
});

test('qa O break: offline after the Ogun download, Ota plays from the phone with no network request', async ({ page, context }) => {
  test.setTimeout(180_000);
  const errors = errorsOf(page);
  await page.goto('./');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.evaluate(
    ({ look, p }) => {
      localStorage.setItem('gidi-look', look);
      localStorage.setItem('gidi-intro', '"seen"');
      localStorage.setItem('gidi-progress', p);
      localStorage.setItem('gidi-busRide', 'false');
    },
    { look: LOOK, p: JSON.stringify({ v: 2, states: { lagos: LAGOS, ogun: { arrived: true } }, city: CITY }) },
  );
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  // Online once: Travel to Ogun, download it.
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page)).toBe('city');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.getByRole('dialog', { name: 'Lagos' }).getByRole('button', { name: 'Travel' }).tap();
  await page.getByRole('dialog', { name: 'Where to?' }).locator('[data-state="ogun"]').tap();
  const dl = page.locator('.download-card').getByRole('button', { name: 'Download' });
  await expect.poll(async () => (await dl.count()) > 0 || (await screenNow(page)) === 'ogun').toBe(true);
  if (await dl.count()) {
    await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
    await dl.tap();
  }
  await expect.poll(() => screenNow(page), { timeout: 15_000 }).toBe('ogun');
  // Offline, a fresh load: the game opens on Ogun's city (OG-R35), and Ota plays from its Potholes card.
  await context.setOffline(true);
  await page.reload();
  const asked: string[] = [];
  page.on('request', (r) => {
    if (!r.url().startsWith('data:')) asked.push(r.url());
  });
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page), { timeout: 15_000 }).toBe('ogun');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  const before = asked.length;
  await page.getByRole('dialog', { name: 'Ogun', exact: true }).locator('.city-pin[data-spot="potholes"]').tap();
  await page.getByRole('dialog', { name: 'Potholes' }).getByRole('button', { name: 'Run Ota' }).tap();
  await expect.poll(() => screenNow(page)).toBe('play');
  await expect.poll(() => page.evaluate(() => window.__game!.steps)).toBeGreaterThan(5);
  const cdp = await page.context().newCDPSession(page);
  const h = hands(cdp);
  const { last } = await playStreetByHand(page, h, { until: (s) => s.h.x >= 2500 });
  await h.upAll();
  const during = asked.slice(before);
  console.log(`offline: requests before play ${before} (${asked.slice(0, before).map((u) => new URL(u).pathname).join(', ')}), during play ${during.length}`);
  expect(last.h.x).toBeGreaterThanOrEqual(2500);
  expect(during, 'no network request while playing Ota').toEqual([]);
  expect(errors.filter((e) => !/ERR_INTERNET_DISCONNECTED|Failed to load resource/.test(e))).toEqual([]);
});
