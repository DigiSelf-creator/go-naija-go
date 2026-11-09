/**
 * N2 on the phone profile, by touch: progress saved on the phone (docs/design.md S2.8), the
 * Streets screen and Nigeria's wheel (S2.10), the fixed street look, the Pause rebuild, P and
 * Escape, the second-finger Pause and Sound fix, and the four M3 bugs (po M4 note).
 * Pictures for the report go to $N2_SHOTS (default test-results/n2-shots).
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { checkCardFits } from './card-fit';
import { LEFT, RIGHT, buttonCentres, hands, playStreetByHand } from './hands';
import { hallSnap, playHall, touchPad, waitForWin } from './hall-play';
import { PAST_DOUBLE_TAP_MS, startRun, waitOutTapLock } from './helpers';

const SHOTS = process.env['N2_SHOTS'] ?? 'test-results/n2-shots';
mkdirSync(SHOTS, { recursive: true });
const BIG = { width: 932, height: 430 };
const TINY = { width: 320, height: 240 };

const LOOK = '{"skin":2,"hair":0,"outfit":0,"body":0,"age":1}';
const progress = (o: object) => JSON.stringify({ v: 1, states: { lagos: o } });
/** Streets 1 to 3 done, the parcel saved, the hall not yet won. */
const READY_FOR_HALL = progress({ streets: { 1: { done: true, best: 120 }, 2: { done: true, best: 113 }, 3: { done: true, best: 98 } }, parcel: true, hall: { done: false, best: 0 } });
/** Lagos switched on. */
const SWITCHED_ON = progress({ streets: { 1: { done: true, best: 120 }, 2: { done: true, best: 113 }, 3: { done: true, best: 98 } }, parcel: true, hall: { done: true, best: 0 } });

function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  return errors;
}

/** Opens the game with a saved hero (and progress, if given) on the title. */
async function openSaved(page: Page, progressJson?: string): Promise<void> {
  await page.goto('./');
  await page.evaluate(
    ([look, p]) => {
      localStorage.setItem('gidi-look', look!);
      if (p) localStorage.setItem('gidi-progress', p);
    },
    [LOOK, progressJson ?? ''],
  );
  await page.reload();
  await expect(page.getByRole('dialog', { name: 'Gbese!' })).toBeVisible();
}

const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('gidi-progress') ?? 'null') as unknown);
const shotAt = async (page: Page, name: string) => page.screenshot({ path: join(SHOTS, `${name}.png`) });

/** Shoots the screen now showing at 320 x 240 and 932 x 430, then puts the size back. */
async function shootBoth(page: Page, name: string): Promise<void> {
  const before = page.viewportSize()!;
  for (const vp of [TINY, BIG]) {
    await page.setViewportSize(vp);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await shotAt(page, `${vp.width}x${vp.height}-${name}`);
  }
  await page.setViewportSize(before);
}

test('street 1 by hand, saved on the bus: the cleared card, Streets, reload, Play opens Streets, street 2 is open', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = watchErrors(page);
  await page.goto('./');
  await startRun(page);
  expect(await page.evaluate(() => window.__game!.level.id)).toBe('lagos-1');
  expect(await saved(page)).toBeNull(); // nothing written mid-street
  const h = hands(await page.context().newCDPSession(page));
  const { last } = await playStreetByHand(page, h);
  await h.upAll();
  expect(last.r.phase).toBe('bus');
  const cleared = page.getByRole('dialog', { name: 'Street cleared!' });
  await expect(cleared).toBeVisible({ timeout: 6000 });
  const kobo = await page.evaluate(() => window.__game!.run.kobo);
  await expect(cleared.getByText(`Alausa is moving again, thanks to you! You got ${kobo} kobo.`)).toBeVisible();
  await expect(cleared.getByText('Your garri parcel is saved for Go-Slow Hall.')).toHaveCount(0); // no parcel on street 1
  await expect(cleared.getByRole('button', { name: 'Next street' })).toBeFocused();
  expect(await saved(page)).toEqual({ v: 1, states: { lagos: { streets: { 1: { done: true, best: kobo } }, parcel: false, hall: { done: false, best: 0 } } } });
  // po M4 bug 1: the cleared card fits the short screens.
  await checkCardFits(page, 'Next street', (at) => shotAt(page, `${at}-cleared-street1`));

  // "Streets" instead of Home.
  await waitOutTapLock(page);
  await cleared.getByRole('button', { name: 'Streets', exact: true }).tap();
  const streets = page.getByRole('dialog', { name: 'Lagos' });
  await expect(streets).toBeVisible();
  await expect(page.locator('.hud')).toBeHidden();
  await expect(streets.locator('[data-where="0"]')).toContainText(`Done ✓ Best: ${kobo} kobo`);
  await expect(streets.locator('[data-where="1"]')).toContainText('Ready to play');
  await expect(streets.locator('[data-where="2"]')).toContainText('Finish street 2 first');
  await expect(streets.locator('[data-where="hall"]')).toContainText('Finish street 3 first');

  // A new visit: Play opens Streets (a street is done), street 2 plays.
  await page.reload();
  await page.getByRole('button', { name: 'Play', exact: true }).tap();
  await expect(page.getByRole('dialog', { name: 'Lagos' })).toBeVisible();
  // A locked card does nothing but the tuk.
  await page.locator('[data-where="2"]').tap({ force: true }); // aria-disabled, still tappable
  await expect(page.getByRole('dialog', { name: 'Lagos' })).toBeVisible();
  await page.locator('[data-where="1"]').tap();
  await expect.poll(() => page.evaluate(() => window.__game!.screen)).toBe('play');
  expect(await page.evaluate(() => window.__game!.level.id)).toBe('lagos-2');
  expect(await page.evaluate(() => window.__game!.fixedLook)).toBe(false);
  expect(errors).toEqual([]);
});

test('the hall from the Streets card with a saved parcel, won: lives left, 1 of 37, the wheel, the list, and the fixed street look', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = watchErrors(page);
  await openSaved(page, READY_FOR_HALL);
  await page.getByRole('button', { name: 'Play', exact: true }).tap();
  const streets = page.getByRole('dialog', { name: 'Lagos' });
  await expect(streets.locator('[data-where="hall"]')).toContainText('Ready to play');
  await expect(streets.locator('[data-where="hall"]')).toContainText('You have a garri parcel.');
  await shootBoth(page, 'streets');
  await streets.locator('[data-where="hall"]').tap();
  await expect.poll(() => page.evaluate(() => window.__game!.level.id)).toBe('lagos-hall');
  // The saved parcel: the shield is on at the start (S2.5 gift rule 5); no Kobo chip in the hall.
  await expect.poll(() => page.evaluate(() => window.__game!.run.power.shield)).toBe(true);
  await expect(page.locator('.hud-kobo')).toBeHidden();

  await playHall(page, await touchPad(page));
  await waitForWin(page);
  const won = page.getByRole('dialog', { name: 'Lagos is switched on!' });
  await expect(won).toBeVisible();
  const lives = (await hallSnap(page)).r.lives;
  await expect(won.getByText(`You cleared General Go-Slow with ${lives} ${lives === 1 ? 'life' : 'lives'} left.`)).toBeVisible();
  await expect(won.getByText("Lagos's cog is turning: 1 of 37.")).toBeVisible();
  await expect(won.getByText(/kobo/)).toHaveCount(0);
  await expect(won.getByRole('button', { name: "See Nigeria's wheel" })).toBeFocused();
  expect(await saved(page)).toMatchObject({ v: 1, states: { lagos: { hall: { done: true }, parcel: true } } });
  await checkCardFits(page, "See Nigeria's wheel", (at) => shotAt(page, `${at}-win`));
  await shootBoth(page, 'win');

  // Space presses the focused big button: the wheel opens, Lagos's cog turns.
  await waitOutTapLock(page);
  await page.keyboard.press('Space');
  const wheel = page.getByRole('dialog', { name: "Nigeria's wheel" });
  await expect(wheel).toBeVisible();
  await expect(page.locator('.hud')).toBeHidden();
  await expect(wheel.getByText('1 of 37 cogs turning.').first()).toBeAttached();
  await expect(wheel.getByText('More states are coming soon.').first()).toBeAttached();
  await expect(wheel.locator('.gdw-on[data-state="lagos"]')).toHaveCount(1);
  await expect(wheel.getByRole('listitem')).toHaveCount(37);
  await expect(wheel.getByRole('listitem').filter({ hasText: 'Lagos, working' })).toHaveCount(1);
  await expect(wheel.getByRole('listitem').filter({ hasText: 'not working yet' })).toHaveCount(36);
  await shootBoth(page, 'wheel');
  // The page never scrolls; "All names" opens the list, focus on its heading; Escape closes it.
  for (const vp of [TINY, BIG]) {
    await page.setViewportSize(vp);
    const s = await page.evaluate(() => ({ h: document.scrollingElement!.scrollHeight, sh: document.querySelector('.screen')!.scrollHeight }));
    expect(s.sh).toBeLessThanOrEqual(vp.height);
    const all = (await wheel.getByRole('button', { name: 'All names' }).boundingBox())!;
    expect(all.y + all.height).toBeLessThanOrEqual(vp.height);
    expect(all.height).toBeGreaterThanOrEqual(44);
    expect(all.width).toBeGreaterThanOrEqual(44);
  }
  await page.setViewportSize(BIG);
  await wheel.getByRole('button', { name: 'All names' }).tap();
  await expect(wheel.getByRole('heading', { name: 'All 36 states and the FCT' })).toBeFocused();
  await expect(wheel.getByText('✓ means its cog is turning.')).toBeVisible();
  await expect(wheel.locator('.names li.on')).toHaveText(['✓Lagos, working']);
  await shootBoth(page, 'wheel-list');
  await page.keyboard.press('Escape');
  await expect(wheel.getByRole('button', { name: 'All names' })).toBeFocused();
  await expect(wheel.getByRole('heading', { name: 'All 36 states and the FCT' })).toBeHidden();
  // Back goes to Streets, where the hall is done.
  await wheel.getByRole('button', { name: 'Back' }).tap();
  await expect(streets).toBeVisible();
  await expect(streets.locator('[data-where="hall"]')).toContainText('Done ✓');

  // Lagos is switched on: its streets draw the fixed look.
  await streets.locator('[data-where="0"]').tap();
  await expect.poll(() => page.evaluate(() => window.__game!.screen)).toBe('play');
  expect(await page.evaluate(() => window.__game!.fixedLook)).toBe(true);
  await page.waitForTimeout(600);
  await shootBoth(page, 'fixed-street');
  expect(errors).toEqual([]);
});

test('Pause rebuilt: words, focus, P and Escape, Sound and Music switches, Streets and Home', async ({ page }) => {
  const errors = watchErrors(page);
  await openSaved(page, SWITCHED_ON);
  await page.getByRole('button', { name: 'Play', exact: true }).tap();
  await page.locator('[data-where="2"]').tap({ force: true }); // aria-disabled, still tappable
  await expect.poll(() => page.evaluate(() => window.__game!.steps)).toBeGreaterThan(10);
  // P pauses; the card's big button has focus.
  await page.keyboard.press('KeyP');
  const card = page.getByRole('dialog', { name: 'Paused' });
  await expect(card).toBeVisible();
  for (const b of ['Keep playing', 'Start again', 'Streets', 'Home', 'Sound: on', 'Music: on']) await expect(card.getByRole('button', { name: b, exact: true })).toBeVisible();
  await expect(card.getByRole('button', { name: 'Keep playing' })).toBeFocused();
  await shootBoth(page, 'pause');
  // At 320 x 240 the four buttons are a 2 x 2 grid and the switches one row, all in sight.
  await page.setViewportSize(TINY);
  const boxes = await card.getByRole('button').evaluateAll((els) => els.map((e) => e.getBoundingClientRect()).map((r) => ({ x: r.x, y: r.y, w: r.width, h: r.height })));
  for (const b of boxes) {
    expect(b.h).toBeGreaterThanOrEqual(44);
    expect(b.y + b.h).toBeLessThanOrEqual(240);
  }
  expect(boxes[0]!.y).toBe(boxes[1]!.y);
  expect(boxes[2]!.y).toBe(boxes[3]!.y);
  expect(boxes[4]!.y).toBe(boxes[5]!.y);
  await page.setViewportSize(BIG);
  // Escape resumes; Escape pauses again; P resumes. Held keys do not flicker it.
  await page.keyboard.press('Escape');
  await expect(card).toBeHidden();
  expect(await page.evaluate(() => window.__game!.paused)).toBe(false);
  await page.keyboard.press('Escape');
  await expect(card).toBeVisible();
  await page.keyboard.press('KeyP');
  await expect(card).toBeHidden();
  // The Sound switch on Pause and the HUD button agree.
  await page.keyboard.press('KeyP');
  await waitOutTapLock(page);
  await card.getByRole('button', { name: 'Sound: on' }).tap();
  await expect(card.getByRole('button', { name: 'Sound: off' })).toBeVisible();
  expect(await page.evaluate(() => window.__game!.sound.enabled)).toBe(false);
  await card.getByRole('button', { name: 'Music: on' }).tap();
  await expect(card.getByRole('button', { name: 'Music: off' })).toBeVisible();
  expect(await page.evaluate(() => [localStorage.getItem('gidi-sound'), localStorage.getItem('gidi-music')])).toEqual(['false', 'false']);
  await card.getByRole('button', { name: 'Keep playing' }).tap();
  await expect(page.locator('.hud-sound')).toHaveAttribute('aria-label', 'Sound: off');
  // Music off stays off after a reload (the player itself comes with O2).
  await page.reload();
  await expect(page.getByRole('button', { name: 'Music: off' })).toBeVisible();
  await page.getByRole('button', { name: 'Play', exact: true }).tap();
  await page.locator('[data-where="0"]').tap();
  await expect.poll(() => page.evaluate(() => window.__game!.steps)).toBeGreaterThan(10);
  // Streets leaves without saving anything; Home goes to the title.
  const before = await saved(page);
  await page.keyboard.press('Escape');
  await waitOutTapLock(page);
  await card.getByRole('button', { name: 'Streets', exact: true }).tap();
  await expect(page.getByRole('dialog', { name: 'Lagos' })).toBeVisible();
  expect(await saved(page)).toEqual(before);
  // P and Escape do nothing on a card.
  await page.keyboard.press('KeyP');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Lagos' })).toBeVisible();
  await page.locator('[data-where="1"]').tap();
  await expect.poll(() => page.evaluate(() => window.__game!.screen)).toBe('play');
  await page.keyboard.press('KeyP');
  await waitOutTapLock(page);
  await card.getByRole('button', { name: 'Home', exact: true }).tap();
  await expect(page.getByRole('dialog', { name: 'Gbese!' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('second finger: with a thumb on Forward, a tap on Pause pauses once and presses nothing under it; Sound switches once', async ({ page }) => {
  const errors = watchErrors(page);
  for (const vp of [TINY, BIG]) {
    await page.setViewportSize(vp);
    await page.goto('./');
    await startRun(page);
    const h = hands(await page.context().newCDPSession(page));
    const btn = await buttonCentres(page);
    const box = async (sel: string) => {
      const b = (await page.locator(sel).boundingBox())!;
      return { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) };
    };
    // Sound, with a thumb holding Forward: one tap, one switch.
    await h.down(LEFT, btn.forward.x, btn.forward.y);
    await expect.poll(() => page.evaluate(() => window.__game!.hero.vx)).toBeGreaterThan(0);
    const sound = await box('.hud-sound');
    const on0 = await page.evaluate(() => window.__game!.sound.enabled);
    await h.down(RIGHT, sound.x, sound.y);
    await h.up(RIGHT);
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => window.__game!.sound.enabled), `${vp.width}: Sound switched once`).toBe(!on0);
    expect(await page.evaluate(() => window.__game!.paused)).toBe(false);
    await page.waitForTimeout(PAST_DOUBLE_TAP_MS);

    // Pause, with the thumb still on Forward: pauses once; nothing under the finger is pressed.
    const pause = await box('.hud-pause');
    const steps0 = await page.evaluate(() => window.__game!.steps);
    await h.down(RIGHT, pause.x, pause.y);
    await expect.poll(() => page.evaluate(() => window.__game!.screen)).toBe('pause');
    await h.up(RIGHT);
    await page.waitForTimeout(600);
    const s = await page.evaluate(() => ({ screen: window.__game!.screen, paused: window.__game!.paused, steps: window.__game!.steps, kobo: window.__game!.run.kobo, sound: window.__game!.sound.enabled }));
    expect(s.screen, `${vp.width}: still paused`).toBe('pause');
    expect(s.paused).toBe(true);
    expect(s.sound).toBe(!on0);
    expect(s.steps - steps0).toBeLessThan(10);
    // The thumb on Forward does nothing until lifted; Keep playing then plays on.
    await h.upAll();
    await page.getByRole('button', { name: 'Keep playing' }).tap();
    await expect.poll(() => page.evaluate(() => window.__game!.screen)).toBe('play');
    expect(await page.evaluate(() => window.__game!.hero.move)).toBe(0);
  }
  expect(errors).toEqual([]);
});

test('the hall HUD at 320 px: no Kobo chip, the shield chip never covers the hit circles', async ({ page }) => {
  const errors = watchErrors(page);
  for (const width of [320, 360, 480, 640]) {
    await page.setViewportSize({ width, height: 240 });
    await openSaved(page, READY_FOR_HALL);
    await page.getByRole('button', { name: 'Play', exact: true }).tap();
    await page.locator('[data-where="hall"]').tap();
    await expect.poll(() => page.evaluate(() => window.__game!.run.power.shield)).toBe(true);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const r = await page.evaluate(() => {
      const right = Math.max(...[...document.querySelectorAll('.hud-left > *')].filter((e) => !(e as HTMLElement).hidden).map((e) => e.getBoundingClientRect().right));
      const tops = [...document.querySelectorAll('.hud-left > *')].filter((e) => !(e as HTMLElement).hidden).map((e) => e.getBoundingClientRect().top);
      const k = document.querySelector('canvas')!.getBoundingClientRect().width / window.__game!.viewW;
      // The hit circles: 3 of radius 8 (+1 edge), 22 u apart, centred.
      const counterLeft = window.innerWidth / 2 - 31 * k;
      return { right, counterLeft, rows: new Set(tops.map((t) => Math.round(t))).size, kobo: (document.querySelector('.hud-kobo') as HTMLElement).hidden };
    });
    expect(r.kobo, `${width}: no Kobo chip`).toBe(true);
    expect(r.rows, `${width}: one row`).toBe(1);
    expect(r.right, `${width}: chips end left of the hit circles`).toBeLessThanOrEqual(r.counterLeft);
    if (width === 320) await shotAt(page, '320x240-hall-hud');
  }
  expect(errors).toEqual([]);
});

test('game over on a street: the street words, focus, Streets and Home; the card fits short screens', async ({ page }) => {
  test.setTimeout(150_000);
  const errors = watchErrors(page);
  await page.goto('./');
  await startRun(page);
  // Hold Forward and never jump: the first pothole three times.
  const h = hands(await page.context().newCDPSession(page));
  const btn = await buttonCentres(page);
  await h.down(LEFT, btn.forward.x, btn.forward.y);
  const over = page.getByRole('dialog', { name: 'Out of lives' });
  await expect(over).toBeVisible({ timeout: 90_000 });
  await h.upAll();
  const kobo = await page.evaluate(() => window.__game!.run.kobo);
  await expect(over.getByText(`You got ${kobo} kobo. The street is still here. Try again!`)).toBeVisible();
  for (const b of ['Play again', 'Streets', 'Home']) await expect(over.getByRole('button', { name: b, exact: true })).toBeVisible();
  await expect(over.getByRole('button', { name: 'Play again' })).toBeFocused();
  // Nothing was saved (no street finished).
  expect(await saved(page)).toBeNull();
  await checkCardFits(page, 'Play again', (at) => shotAt(page, `${at}-gameover-street`));
  // Enter on the focused big button plays again (after the 0.4 s guard).
  await waitOutTapLock(page);
  await page.keyboard.press('Enter');
  await expect(over).toBeHidden();
  expect(await page.evaluate(() => window.__game!.run.lives)).toBe(3);
  expect(errors).toEqual([]);
});

test('game over in the hall: focus on Play again; the card fits short screens', async ({ page }) => {
  test.setTimeout(150_000);
  const errors = watchErrors(page);
  await openSaved(page, progress({ streets: { 1: { done: true }, 2: { done: true }, 3: { done: true } }, parcel: false }));
  await page.getByRole('button', { name: 'Play', exact: true }).tap();
  await page.locator('[data-where="hall"]').tap();
  await expect.poll(() => page.evaluate(() => window.__game!.run.phase)).toBe('arena');
  // Light 1, then stand in the tyres' way until the lives are gone.
  await playHall(page, await touchPad(page), { until: (s) => s.b!.hits >= 1 });
  const pad = await touchPad(page);
  await pad.move(1);
  await expect.poll(async () => (await hallSnap(page)).h.x).toBeGreaterThan(250);
  await pad.done();
  const over = page.getByRole('dialog', { name: 'Out of lives' });
  await expect(over).toBeVisible({ timeout: 40_000 });
  await expect(over.getByText('General Go-Slow is still jamming the hall. Try again!')).toBeVisible();
  await expect(over.getByRole('button', { name: 'Play again' })).toBeFocused();
  await checkCardFits(page, 'Play again', (at) => shotAt(page, `${at}-gameover-hall`));
  // The P key does nothing on a card.
  await page.keyboard.press('KeyP');
  await expect(over).toBeVisible();
  expect(errors).toEqual([]);
});

test('a broken progress copy: Play starts street 1, nothing breaks, the copy is left alone', async ({ page }) => {
  const errors = watchErrors(page);
  await openSaved(page, '{"v":1,"states":[');
  await page.getByRole('button', { name: 'Play', exact: true }).tap();
  await expect.poll(() => page.evaluate(() => window.__game!.screen)).toBe('play');
  expect(await page.evaluate(() => window.__game!.level.id)).toBe('lagos-1');
  expect(await page.evaluate(() => localStorage.getItem('gidi-progress'))).toBe('{"v":1,"states":[');
  // Streets from Pause: every card but street 1 locked.
  await page.keyboard.press('Escape');
  await waitOutTapLock(page);
  await page.getByRole('button', { name: 'Streets', exact: true }).tap();
  await expect(page.locator('.street-card.locked')).toHaveCount(3);
  expect(errors).toEqual([]);
});

test('qa N3: in the hall finish P, Escape, the Pause button, an app switch and the phone upright open nothing; the win is saved at the third hit and kept over a reload mid-finish', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = watchErrors(page);
  await openSaved(page, READY_FOR_HALL);
  await page.getByRole('button', { name: 'Play', exact: true }).tap();
  await page.getByRole('dialog', { name: 'Lagos' }).locator('[data-where="hall"]').tap();
  await expect.poll(() => page.evaluate(() => window.__game!.level.id)).toBe('lagos-hall');
  const pad = await touchPad(page);
  await playHall(page, pad);
  await pad.done();
  const at = await hallSnap(page);
  expect(at.b!.defeated).toBe(true);
  expect(at.r.phase).toBe('arena'); // the kind finish is playing
  // Saved at the third hit, before the Win screen.
  expect(await saved(page)).toMatchObject({ v: 1, states: { lagos: { hall: { done: true }, parcel: true, streets: { 3: { done: true, best: 98 } } } } });

  const card = page.getByRole('dialog', { name: 'Paused' });
  const stillPlaying = async (why: string) => {
    await page.waitForTimeout(150);
    const s = await hallSnap(page);
    expect(s.paused, why).toBe(false);
    expect(s.screen, why).toBe('play');
    await expect(card).toBeHidden();
  };
  await page.keyboard.press('KeyP');
  await stillPlaying('P');
  await page.keyboard.press('Escape');
  await stillPlaying('Escape');
  await page.locator('.hud-pause').tap();
  await stillPlaying('the Pause button');
  // An app switch: the tab says it is hidden.
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await stillPlaying('app switch');
  // The phone turned upright and back.
  const wide = page.viewportSize()!;
  await page.setViewportSize({ width: wide.height, height: wide.width });
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => window.__game!.paused), 'upright').toBe(false);
  await page.setViewportSize(wide);
  await stillPlaying('back sideways');

  // Reload mid-finish: the hall stays done.
  const b = (await hallSnap(page)).b!;
  expect(b.defeated).toBe(true);
  expect(b.modeTime).toBeLessThan(6);
  await page.reload();
  await page.getByRole('button', { name: 'Play', exact: true }).tap();
  const streets = page.getByRole('dialog', { name: 'Lagos' });
  await expect(streets.locator('[data-where="hall"]')).toContainText('Done ✓');
  expect(await saved(page)).toMatchObject({ states: { lagos: { hall: { done: true } } } });
  expect(errors).toEqual([]);
});

test('qa N3: the hall finish never loses the win when it plays on to the Win screen either', async ({ page }) => {
  test.setTimeout(240_000);
  await openSaved(page, READY_FOR_HALL);
  await page.getByRole('button', { name: 'Play', exact: true }).tap();
  await page.getByRole('dialog', { name: 'Lagos' }).locator('[data-where="hall"]').tap();
  await expect.poll(() => page.evaluate(() => window.__game!.level.id)).toBe('lagos-hall');
  const pad = await touchPad(page);
  await playHall(page, pad);
  await pad.done();
  // Pressed again and again through the finish: Pause never opens, the Win screen comes.
  for (let i = 0; i < 8 && (await page.evaluate(() => window.__game!.screen)) === 'play'; i++) {
    await page.keyboard.press(i % 2 ? 'Escape' : 'KeyP');
    expect(await page.evaluate(() => window.__game!.paused)).toBe(false);
    await page.waitForTimeout(250);
  }
  await waitForWin(page);
  expect(await saved(page)).toMatchObject({ states: { lagos: { hall: { done: true } } } });
});
