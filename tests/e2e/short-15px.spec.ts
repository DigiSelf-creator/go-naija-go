/**
 * ST-A follow-up (style.md 1.2 rule 4, "Short screens", designer ruling 18 Nov 2026): button
 * words are 15 px on short screens too (320 x 240, 480 x 200, 640 x 200). Settings, the hero
 * builder, the city rows, a street's game over and the lane run's Pause and caught cards.
 * Game over's Gentle mode switch shows its short form there, with "(off)"; Settings' reads like Sound
 * ("Gentle mode: off"). Both keep the full spoken name.
 * With ST_SHOTS=<folder> it saves pictures at 320 x 240 (st-a-15px-*.png).
 */
import { expect, test, type Page } from '@playwright/test';
import { SHORT_SIZES, expectButtonWords15 } from './card-fit';
import { buttonCentres, hands, LEFT } from './hands';
import { PAST_DOUBLE_TAP_MS, screenNow, startRun, storySeen } from './helpers';

const SHOTS = process.env['ST_SHOTS'];
const LOOK = '{"skin":2,"hair":0,"outfit":0,"body":0,"age":1}';
const CITY = { kobo: 0, power: 0, tech: 0, fixed: [], fixes: 0, paid: {}, hints: ['walk', 'bright'] };
const FULL = 'Gentle mode: 5 lives instead of 3';

const settle = (page: Page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 60)))));
const shoot = async (page: Page, name: string, at: string) => {
  if (SHOTS && at === '320x240') await page.screenshot({ path: `${SHOTS}/st-a-15px-${name}.png` });
};

async function openSaved(page: Page, url = './', progress: object = { v: 2, states: {}, city: CITY }, extra: Record<string, string> = {}): Promise<void> {
  await page.goto(url);
  await page.evaluate(
    ({ look, p, extra }) => {
      localStorage.setItem('gidi-look', look);
      localStorage.setItem('gidi-intro', '"seen"');
      localStorage.setItem('gidi-progress', p);
      for (const [k, v] of Object.entries(extra)) localStorage.setItem(k, v);
    },
    { look: LOOK, p: JSON.stringify(progress), extra },
  );
  await page.reload();
}

/** The Gentle mode switch on a short screen: only the short words show, then "(off)"; the spoken name is full. */
async function expectShortGentle(page: Page, short: string, at: string): Promise<void> {
  const sw = page.getByRole('switch', { name: FULL, exact: true });
  await expect(sw, at).toBeVisible();
  await expect(sw.locator('.short'), at).toHaveText(short);
  await expect(sw.locator('.short'), at).toBeVisible();
  await expect(sw.locator('.long'), at).toBeHidden();
  expect(await sw.evaluate((b) => getComputedStyle(b, '::after').content), `${at}: off says off`).toContain('(off)');
}

/** Settings' Gentle mode switch (po polish note): "Gentle mode: off", or "Gentle mode: on" and a tick; the spoken name is full. */
async function expectSettingsGentle(page: Page, on: boolean, at: string): Promise<void> {
  const sw = page.getByRole('dialog', { name: 'Settings' }).getByRole('switch', { name: FULL, exact: true });
  await expect(sw, at).toHaveText(on ? 'Gentle mode: on' : 'Gentle mode: off');
  await expect(sw, at).toHaveAttribute('aria-checked', String(on));
  const after = await sw.evaluate((b) => getComputedStyle(b, '::after').content);
  if (on) expect(after, `${at}: on shows the tick`).toContain('\u2713');
  else expect(after, `${at}: off shows no tick`).toBe('none');
}

test('Settings at each short size: 15 px words, no scroll, Gentle mode reads like Sound ("Gentle mode: off", a tick when on)', async ({ page }) => {
  await storySeen(page);
  await page.goto('./');
  await page.getByRole('button', { name: 'Settings' }).tap();
  const card = page.getByRole('dialog', { name: 'Settings' });
  await expect(card).toBeVisible();
  for (const size of SHORT_SIZES) {
    const at = `${size.width}x${size.height}`;
    await page.setViewportSize(size);
    await settle(page);
    expect(await card.evaluate((el) => el.scrollHeight <= el.clientHeight + 1), `${at}: the card does not scroll`).toBe(true);
    for (const b of await card.locator('button').all()) {
      const r = (await b.boundingBox())!;
      expect(r.height, at).toBeGreaterThanOrEqual(44);
      expect(r.y + r.height, at).toBeLessThanOrEqual(size.height + 0.5);
    }
    await expectButtonWords15(page, '.settings-card', at);
    await expectSettingsGentle(page, false, at);
    await shoot(page, 'settings', at);
  }
  // The same words on a taller screen; on, it says on and shows the tick, as Sound does.
  await page.setViewportSize({ width: 851, height: 393 });
  await settle(page);
  await expectSettingsGentle(page, false, '851x393');
  await page.getByRole('switch', { name: FULL, exact: true }).tap();
  await expectSettingsGentle(page, true, '851x393 on');
  await page.getByRole('switch', { name: FULL, exact: true }).tap();
  await expectSettingsGentle(page, false, '851x393 off again');
});

test('the hero builder at each short size: chip words 15 px; Male or female on one line, Age too at 480 x 200 and 640 x 200', async ({ page }) => {
  await storySeen(page);
  await page.goto('./');
  await page.getByRole('button', { name: 'Make your hero' }).tap();
  const d = page.getByRole('dialog', { name: 'Make your hero' });
  await expect(d).toBeVisible();
  for (const size of SHORT_SIZES) {
    const at = `${size.width}x${size.height}`;
    await page.setViewportSize(size);
    await settle(page);
    await expectButtonWords15(page, '.screen:not([hidden])', at);
    for (const row of ['Male or female', 'Age']) {
      if (row === 'Age' && at === '320x240') continue;
      const ys = await d.getByRole('group', { name: row, exact: true }).locator('button').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().y)));
      expect(new Set(ys).size, `${at}: ${row} on one line`).toBe(1);
    }
    await shoot(page, 'builder', at);
  }
});

test('Lagos from above at each short size: the top and bottom rows keep 15 px words', async ({ page }) => {
  await openSaved(page);
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page)).toBe('city');
  for (const size of SHORT_SIZES) {
    const at = `${size.width}x${size.height}`;
    await page.setViewportSize(size);
    await settle(page);
    // Zoom + and − are signs, not words (style.md 1.2 rule 1); the map's pins are not in the rows.
    await expectButtonWords15(page, '.city-top-right, .city-buttons', at, '.city-zoom button, [aria-label^="Zoom"]');
    await shoot(page, 'city', at);
  }
});

test('game over on a street at each short size: 15 px words, Gentle mode shows "Gentle mode (off)"', async ({ page }) => {
  test.setTimeout(150_000);
  await storySeen(page);
  await page.goto('./');
  await startRun(page);
  const h = hands(await page.context().newCDPSession(page));
  const btn = await buttonCentres(page);
  await h.down(LEFT, btn.forward.x, btn.forward.y);
  const over = page.getByRole('dialog', { name: 'Out of lives' });
  await expect(over).toBeVisible({ timeout: 90_000 });
  await h.upAll();
  for (const size of SHORT_SIZES) {
    const at = `${size.width}x${size.height}`;
    await page.setViewportSize(size);
    await settle(page);
    await expectButtonWords15(page, '.screen .card', at);
    await expectShortGentle(page, 'Gentle mode', at);
    // The green button is never the squeezed one.
    const go = (await over.getByRole('button', { name: 'Play again' }).boundingBox())!;
    expect(go.width, `${at}: Play again at least 80 px wide`).toBeGreaterThanOrEqual(80);
    expect(await over.evaluate((el) => el.scrollHeight <= el.clientHeight + 1), `${at}: the card does not scroll`).toBe(true);
    await shoot(page, 'gameover', at);
  }
});

test('the lane run at each short size: Pause and the caught card keep 15 px words', async ({ page }) => {
  await openSaved(page, './?level=lagos-lane');
  await page.getByRole('button', { name: 'Play' }).tap();
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await expect.poll(() => page.evaluate(() => window.__lane?.stage), { timeout: 15_000 }).toBe('play');
  await page.keyboard.press('KeyP');
  await expect(page.getByRole('dialog', { name: 'Paused' })).toBeVisible();
  for (const size of SHORT_SIZES) {
    const at = `${size.width}x${size.height}`;
    await page.setViewportSize(size);
    await settle(page);
    await expectButtonWords15(page, '.screen:not([hidden]) .card', `${at} pause`);
    await shoot(page, 'lane-pause', at);
  }
  await page.getByRole('dialog', { name: 'Paused' }).getByRole('button', { name: 'Keep playing' }).tap();
  await expect.poll(() => page.evaluate(() => window.__lane?.stage), { timeout: 15_000 }).toBe('play');
  await page.evaluate(() => window.__lane!.setGap(0.2));
  await expect(page.getByRole('dialog', { name: 'The Blackout caught up.' })).toBeVisible({ timeout: 10_000 });
  for (const size of SHORT_SIZES) {
    const at = `${size.width}x${size.height}`;
    await page.setViewportSize(size);
    await settle(page);
    await expectButtonWords15(page, '.lane-card .card', `${at} caught`);
    await shoot(page, 'lane-caught', at);
  }
});
