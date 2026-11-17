/**
 * O4b (docs/ogun.md 3.3, 3.6, 4.1 and 8): Sagamu, Ogun street 3, on the phone profile. A player
 * who has cleared Ota and Abeokuta opens Ogun's city (OG-R35), taps the Bad road card's big
 * "Run Sagamu" (OG-R37),
 * and plays by hand with two thumbs: the hopping gravel, the cracks and potholes, the two roads
 * (the bot keeps to the low road, under the flyover), two big pits, the corn stretch, amala and
 * the bus, with no life lost. The cleared card says Sagamu's line with no "Next street" (Sagamu
 * is the last street built), the save goes under states.ogun.streets.3, and the Bad road card
 * then says "Go to Pothole Hall." Before Abeokuta is done, the card's big button is "Run
 * Abeokuta" and the road's Sagamu stop is locked.
 */
import { expect, test, type Page } from '@playwright/test';
import { crateActor, type CrateLog } from './crate-bot';
import { hands, playStreetByHand, snap } from './hands';
import { PAST_DOUBLE_TAP_MS, screenNow, waitOutTapLock } from './helpers';

/** OG-R37: the Bad road pin's card in Ogun's city. */
async function badRoadCard(page: Page) {
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.locator('.ogun-city .city-pin[data-spot="badRoad"]').tap();
  const card = page.getByRole('dialog', { name: 'Bad road' });
  await expect(card).toBeVisible();
  return card;
}
import { formatMoney } from '../../src/game/money';

const LOOK = '{"skin":4,"hair":2,"outfit":1,"body":0,"age":1}';
const CITY = { kobo: 1000, power: 0, tech: 0, fixed: [], fixes: 0, paid: {}, hints: ['walk', 'bright', 'buka', 'collect', 'road'] };
const STREETS = { 1: { done: true, best: 100 }, 2: { done: true, best: 100 }, 3: { done: true, best: 100 } };
const LAGOS = { streets: STREETS, parcel: false, hall: { done: true, best: 0 } };
/** Go-Slow Hall won, Ogun open and arrived, Ota cleared, Abeokuta cleared (or not). */
const save = (abeokutaDone: boolean) => ({
  v: 2,
  states: {
    lagos: LAGOS,
    ogun: { arrived: true, streets: { 1: { done: true, best: 300 }, ...(abeokutaDone ? { 2: { done: true, best: 400 } } : {}) } },
  },
  city: CITY,
  where: 'ogun',
});

type Saved = { states?: { lagos?: unknown; ogun?: { streets?: Record<string, { done?: boolean; best?: number }> } }; city?: { kobo?: number } };
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('gidi-progress') ?? '{}') as Saved);

async function openOgun(page: Page, abeokutaDone: boolean): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto('./');
  await page.evaluate(
    ({ look, p }) => {
      localStorage.setItem('gidi-look', look);
      localStorage.setItem('gidi-intro', '"seen"');
      localStorage.setItem('gidi-progress', p);
    },
    { look: LOOK, p: JSON.stringify(save(abeokutaDone)) },
  );
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page)).toBe('ogun');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  return errors;
}

test('Before Abeokuta is done, Ogun\'s city sends you to Abeokuta; the road\'s Sagamu stop is locked', async ({ page }) => {
  const errors = await openOgun(page, false);
  const card = await badRoadCard(page);
  await expect(card.getByRole('button', { name: 'Run Abeokuta' })).toHaveClass(/\bgo\b/);
  await expect(card.getByRole('button', { name: 'Run Sagamu' })).toHaveCount(0);
  await card.getByRole('button', { name: 'Back' }).tap();
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.locator('.ogun-city').getByRole('button', { name: 'Challenge road' }).tap();
  await expect(page.locator('[data-where="sagamu"]')).toHaveAttribute('aria-label', /Locked/);
  expect(errors).toEqual([]);
});

test('Sagamu by hand from Ogun\'s city: hopping gravel, the low road under the flyover, two big pits, the bus, no life lost, the cleared card and the save', async ({ page }) => {
  test.setTimeout(300_000);
  const errors = await openOgun(page, true);
  // Sagamu is the Bad road card's big button now; Abeokuta and Ota stay open on the road.
  const card = await badRoadCard(page);
  const play = card.getByRole('button', { name: 'Run Sagamu' });
  await expect(play).toHaveClass(/\bgo\b/);
  expect((await play.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await play.tap();
  await expect.poll(() => screenNow(page)).toBe('play');
  await expect.poll(() => page.evaluate(() => window.__game!.steps)).toBeGreaterThan(5);
  expect(await page.evaluate(() => window.__game!.level.id)).toBe('ogun-3');
  expect(await page.evaluate(() => window.__game!.skin)).toBe(true);

  const cdp = await page.context().newCDPSession(page);
  const h = hands(cdp);
  const crates: CrateLog = { opened: [], foods: [] };
  const crateAct = await crateActor(page, crates);
  const toasts = new Set<string>();
  /** Each gravel seen hopping (above the road), and the lowest the hero went under the deck. */
  const hopped = new Set<number>();
  let underDeck = 0;
  const { stats, last } = await playStreetByHand(page, h, {
    act: crateAct,
    onPoll: async (s) => {
      const t = await page.evaluate(() => window.__game!.toast);
      if (t) toasts.add(t);
      for (const z of s.r.hazards) if (z.kind === 'gravel' && z.mode === 'move' && z.y < 299) hopped.add(Math.round(z.x / 1000));
      if (s.h.x > 4050 && s.h.x < 4850 && s.h.y > 290) underDeck++;
    },
  });
  await h.upAll();
  const end = await snap(page);
  const gravel = end.r.hazards.filter((z) => z.kind === 'gravel');
  console.log(
    `Sagamu by hand: ${last.r.phase} at x ${last.h.x.toFixed(0)} in ${last.r.time.toFixed(1)} s, lives ${last.r.lives}, kobo ${last.r.kobo}, presses ${stats.presses}, ` +
      `lost at ${stats.lostAt.map((x) => x.toFixed(0)).join(', ') || 'nowhere'}, crates ${crates.opened.join(', ')}, foods ${[...stats.foods].join(', ')}, ` +
      `gravel ${gravel.map((z) => `${z.x.toFixed(0)}:${z.mode}`).join(' ')}, hopping seen near ${[...hopped].join(', ')}k, under the deck ${underDeck} polls; toasts: ${[...toasts].join(' | ')}`,
  );
  expect(last.r.phase).toBe('bus');
  expect(last.r.checkpoint).toBe(true);
  expect(stats.lostAt, 'no life lost').toEqual([]);
  expect(last.r.lives).toBe(3);
  // The gravel hopped (seen above the road), and the bot took the low road under the flyover.
  expect(hopped.size).toBeGreaterThanOrEqual(3);
  expect(underDeck).toBeGreaterThan(0);
  for (const t of ['Hopping gravel! Jump or bounce.', 'Two roads! Climb up, or stay low.']) expect(toasts).toContain(t);
  expect(crates.opened.length).toBeGreaterThanOrEqual(3);

  // The cleared card: Sagamu's line; Take it home, Go to Pothole Hall (O5b), Play again and Ogun's Challenge road (OG-R35).
  const kobo = last.r.kobo;
  const dialog = page.getByRole('dialog', { name: 'Street cleared!' });
  await expect(dialog).toBeVisible({ timeout: 8000 });
  const money = kobo * 10 + 500;
  await expect(dialog.getByText(`Sagamu is moving again, thanks to you! You got ${formatMoney(money)}.`)).toBeVisible();
  for (const b of ['Take it home', 'Go to Pothole Hall', 'Play again', 'Challenge road']) await expect(dialog.getByRole('button', { name: b, exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Next street', exact: true })).toHaveCount(0);
  // Saved under states.ogun.streets: street 3; the others and Lagos as they were; the one wallet.
  const s = await saved(page);
  expect(s.states?.ogun?.streets?.['3']).toEqual({ done: true, best: kobo * 10 });
  expect(s.states?.ogun?.streets?.['1']).toEqual({ done: true, best: 300 });
  expect(s.states?.ogun?.streets?.['2']).toEqual({ done: true, best: 400 });
  expect(s.states?.lagos).toEqual(LAGOS);
  expect(s.city?.kobo).toBe(1000 + money);

  await waitOutTapLock(page);
  await dialog.getByRole('button', { name: 'Take it home' }).tap();
  await expect.poll(() => screenNow(page)).toBe('ogun');
  // O5b: the hall is open, its button the big one.
  await expect(page.locator('.ogun-city .city-banner')).toContainText('Mission complete!');
  const after = await badRoadCard(page);
  await expect(after.getByText('Go to Pothole Hall.')).toBeVisible();
  await expect(after.getByRole('button', { name: 'Go to Pothole Hall' })).toHaveClass(/\bgo\b/);
  expect(errors).toEqual([]);
});
