/**
 * O1c (docs/ogun.md 1.2, 1.3, 1.4, part 8): from a Go-Slow Hall win, by touch, to Ogun. The Win
 * card with "On to Ogun" at 320 x 240, 568 x 320, 640 x 200, 851 x 393 and wide screens (nothing
 * cut off, no scroll, every button 44 px or more, inside 24 px safe edges too), then the download
 * card, the bus ride and the arrival card. Pictures for Tp go to O1C_SHOTS when it is set.
 * Plays the hall in real time, so it runs in the timing project (playwright.config.ts TIMING).
 */
import { expect, test, type Page } from '@playwright/test';
import { HALL_URL, playHall, touchPad, waitForWin } from './hall-play';
import { PAST_DOUBLE_TAP_MS, screenNow, storySeen, waitOutTapLock } from './helpers';

test.beforeEach(({ page }) => storySeen(page));

const SHOTS = process.env['O1C_SHOTS'] ?? '';
const SIZES = [
  { width: 320, height: 240 },
  { width: 568, height: 320 },
  { width: 640, height: 200 },
  { width: 851, height: 393 },
  { width: 1280, height: 720 },
  { width: 1920, height: 1080 },
] as const;

async function winFits(page: Page, at: string, safe: number): Promise<void> {
  const l = await page.evaluate(() => {
    const card = document.querySelector<HTMLElement>('.screen[data-ui] .card')!;
    const box = (e: Element) => {
      const r = e.getBoundingClientRect();
      return { t: (e.textContent ?? '').trim(), x: r.x, y: r.y, w: r.width, h: r.height };
    };
    return {
      vw: window.innerWidth,
      vh: window.innerHeight,
      scroll: { h: card.scrollHeight, ch: card.clientHeight, w: card.scrollWidth, cw: card.clientWidth },
      parts: [...card.querySelectorAll('button, h2, p')].map(box),
      buttons: [...card.querySelectorAll('button')].map(box),
      focused: (document.activeElement?.textContent ?? '').trim(),
    };
  });
  expect(l.scroll.h, `${at}: the card does not scroll`).toBeLessThanOrEqual(l.scroll.ch + 1);
  expect(l.scroll.w, `${at}: nothing off the side`).toBeLessThanOrEqual(l.scroll.cw + 1);
  for (const b of l.parts) {
    expect(b.y, `${at}: "${b.t}" top in sight`).toBeGreaterThanOrEqual(safe - 0.5);
    expect(b.y + b.h, `${at}: "${b.t}" bottom in sight`).toBeLessThanOrEqual(l.vh - safe + 0.5);
    expect(b.x, `${at}: "${b.t}" left in sight`).toBeGreaterThanOrEqual(safe - 0.5);
    expect(b.x + b.w, `${at}: "${b.t}" right in sight`).toBeLessThanOrEqual(l.vw - safe + 0.5);
  }
  for (const b of l.buttons) {
    expect(b.h, `${at}: "${b.t}" at least 44 px tall`).toBeGreaterThanOrEqual(44);
    expect(b.w, `${at}: "${b.t}" at least 44 px wide`).toBeGreaterThanOrEqual(44);
  }
  expect(l.focused, `${at}: focus on the big button`).toBe('On to Ogun');
}

const frame = (page: Page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

test('o1c: the hall won by touch; "On to Ogun" fits every size; the download card, the ride and the arrival card', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(HALL_URL);
  await page.getByRole('button', { name: 'Make your hero' }).tap();
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.getByRole('dialog', { name: 'Make your hero' }).getByRole('button', { name: 'Start running' }).tap();
  await expect.poll(() => screenNow(page)).toBe('play');
  await playHall(page, await touchPad(page));
  await waitForWin(page);
  const won = page.getByRole('dialog', { name: 'Lagos is switched on!' });
  await expect(won.getByText('The road to Ogun is open. Ogun is the gateway to the rest of Nigeria.')).toBeVisible();
  await expect(won.getByRole('button', { name: 'On to Ogun' })).toBeFocused();

  for (const size of SIZES) {
    await page.setViewportSize(size);
    await frame(page);
    await winFits(page, `${size.width}x${size.height}`, 0);
  }
  // Notch and rounded corners: 24 px safe edges, on the two small phone sizes.
  for (const size of [SIZES[1], SIZES[3]]) {
    await page.setViewportSize(size);
    await page.evaluate(() => {
      for (const s of ['top', 'right', 'bottom', 'left']) document.documentElement.style.setProperty(`--safe-${s}`, '24px');
    });
    await frame(page);
    await winFits(page, `${size.width}x${size.height} with 24 px safe edges`, 24);
  }
  await page.evaluate(() => {
    for (const s of ['top', 'right', 'bottom', 'left']) document.documentElement.style.removeProperty(`--safe-${s}`);
  });
  await page.setViewportSize({ width: 851, height: 393 });
  await frame(page);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/o1c-win-851x393.png` });

  await waitOutTapLock(page);
  await won.getByRole('button', { name: 'On to Ogun' }).tap();
  const dl = page.locator('.download-card');
  await expect(dl.getByText('Ogun is ready to download (about 80 KB).')).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/o1c-download-card.png` });
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await dl.getByRole('button', { name: 'Download' }).tap();
  await expect.poll(() => screenNow(page)).toBe('ride');
  await page.waitForTimeout(2600);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/o1c-ride.png` });
  await expect.poll(() => screenNow(page), { timeout: 15_000 }).toBe('ogun');
  const arrival = page.getByRole('dialog', { name: 'Welcome to Ogun, the Gateway State!' });
  await expect(arrival).toBeVisible();
  await page.waitForTimeout(300);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/o1c-arrival-card.png` });
  await arrival.getByRole('button', { name: "Let's go" }).tap();
  await expect(arrival).toHaveCount(0);
  expect(errors).toEqual([]);
});
