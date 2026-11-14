/**
 * S3f3 the lane run game (docs/design.md S3f0 parts 2, 8 to 15, 20): the Blackout words, the
 * buckets going home as you pick them up, the hints, the goal card with the prize, the caught
 * cards, the city links (the Lights out card, the Not enough card, the Streets card) and Mission
 * complete for the Lamps. Test hooks: warp along the road, set the Blackout's distance.
 */
import { expect, test, type Page } from '@playwright/test';
import { PAST_DOUBLE_TAP_MS, screenNow } from './helpers';

const LOOK = '{"skin":2,"hair":0,"outfit":0,"body":0,"age":1}';
const lane = (page: Page) =>
  page.evaluate(() => {
    const l = window.__lane;
    if (!l) return null;
    const { stage, phase, dist, gap, blackout, hint, chips, haul, prize, best, shield, line } = l;
    return { stage, phase, dist, gap, blackout, hint, chips, haul, prize, best, shield, line };
  });
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('gidi-progress') ?? '{}') as { city?: { kobo?: number; power?: number; tech?: number; fixed?: string[] }; lane?: { best: number; goals: number; runs: number; hints: string[] } });

/** A saved hero and city, then Lagos from above (or the lane run straight away with ?level=lagos-lane). */
async function open(page: Page, city: object, url = './'): Promise<void> {
  await page.goto(url);
  await page.evaluate(
    ({ look, p }) => {
      localStorage.setItem('gidi-look', look);
      localStorage.setItem('gidi-intro', '"seen"');
      localStorage.setItem('gidi-progress', p);
    },
    { look: LOOK, p: JSON.stringify({ v: 2, states: {}, city }) },
  );
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
}
const CITY = { kobo: 0, power: 0, tech: 0, fixed: [], fixes: 0, paid: {}, hints: ['walk', 'bright'] };

async function playing(page: Page): Promise<void> {
  await expect.poll(async () => (await lane(page))?.stage, { timeout: 15_000 }).toBe('play');
}

test('the HUD: three chips, the Blackout words, the bus stop; the first hint shows until its danfo is passed', async ({ page }) => {
  await open(page, CITY, './?level=lagos-lane');
  await playing(page);
  const l = (await lane(page))!;
  expect(l.chips).toEqual(['₦0', 'Power 0', 'Tech 0']);
  expect(l.blackout).toMatch(/^Blackout: (40|39) m behind/);
  await expect.poll(async () => (await lane(page))!.hint, { timeout: 5000 }).toBe('Swipe left or right to change lane.');
  // Close: "!" (not colour alone).
  await page.evaluate(() => window.__lane!.setGap(10));
  await expect.poll(async () => (await lane(page))!.blackout).toMatch(/^Blackout: (10|9) m behind!/);
});

test('a bulb: Power 1 in its chip and in the city bucket at once (LR-Q1), and the Blackout goes back 5 m', async ({ page }) => {
  await open(page, CITY, './?level=lagos-lane');
  await playing(page);
  await page.evaluate(() => {
    window.__lane!.warp(140);
    window.__lane!.setGap(30);
  });
  await expect.poll(async () => (await lane(page))!.haul.power, { timeout: 5000 }).toBe(1);
  const l = (await lane(page))!;
  expect(l.chips[1]).toBe('Power 1');
  expect(l.gap).toBeGreaterThan(32);
  // Pause writes the save: Power 1 is already home.
  await page.keyboard.press('KeyP');
  await expect(page.getByRole('dialog', { name: 'Paused' }).getByText(/^So far: .*Power 1/)).toBeVisible();
  expect((await saved(page)).city?.power).toBe(1);
});

test('caught before the bus stop: "You keep it all", how far it was, the Gentle offer; "Run again" starts at 0 m', async ({ page }) => {
  await open(page, CITY, './?level=lagos-lane');
  await playing(page);
  await page.evaluate(() => window.__lane!.setGap(0.2));
  const card = page.getByRole('dialog', { name: 'The Blackout caught up.' });
  await expect(card).toBeVisible({ timeout: 10_000 });
  await expect(card.getByText(/^You keep it all: /)).toBeVisible();
  await expect(card.getByText(/^The bus stop was \d+ m away\.$/)).toBeVisible();
  await expect(card.getByText('Want more tries? Gentle mode keeps the Blackout further back.')).toBeVisible();
  await expect(card.getByRole('switch', { name: 'Gentle mode: off' })).toBeVisible();
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await card.getByRole('button', { name: 'Run again' }).tap();
  await playing(page);
  const l = (await lane(page))!;
  expect(l.dist).toBeLessThan(30);
  expect(l.gap).toBeGreaterThan(35);
  expect((await saved(page)).lane?.runs).toBe(2);
});

test('the goal: the prize, "Keep running", caught after the goal is a win with the new best', async ({ page }) => {
  await open(page, CITY, './?level=lagos-lane');
  await playing(page);
  await page.evaluate(() => {
    window.__lane!.setGap(60);
    window.__lane!.warp(590);
  });
  const goal = page.getByRole('dialog', { name: 'You made it to the bus stop!' });
  await expect(goal).toBeVisible({ timeout: 10_000 });
  // The prize: ₦5, Power 4 and Tech 2 (a run from nowhere: no top-up).
  const l = (await lane(page))!;
  expect(l.prize).toEqual({ kobo: 500, power: 4, tech: 2 });
  await expect(goal.getByText(/^You got ₦\d.*, Power \d+ and Tech \d+\.$/)).toBeVisible();
  const s = await saved(page);
  expect(s.lane?.goals).toBe(1);
  expect(s.lane?.best).toBe(600);
  expect(s.city?.kobo).toBeGreaterThanOrEqual(500);
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await goal.getByRole('button', { name: 'Keep running for more' }).tap();
  await playing(page);
  await expect.poll(async () => (await lane(page))!.dist, { timeout: 15_000 }).toBeGreaterThan(640);
  expect((await lane(page))!.line).toMatch(/^\d+ m$/);
  await page.evaluate(() => window.__lane!.setGap(0.2));
  const caught = page.getByRole('dialog', { name: /^The Blackout caught up at \d+ m\.$/ });
  await expect(caught).toBeVisible({ timeout: 10_000 });
  await expect(caught.getByText(/^Your win is safe\. You got /)).toBeVisible();
  await expect(caught.getByText(/^New best: \d+ m!$/)).toBeVisible();
  expect((await saved(page)).lane!.best).toBeGreaterThan(640);
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await caught.getByRole('button', { name: 'Take it home' }).tap();
  await expect.poll(() => screenNow(page)).toBe('city');
});

test('Lights out card: "Lane run" starts it for the Lamps; a win brings Power 10 or more and Mission complete fixes them', async ({ page }) => {
  await open(page, CITY);
  await expect.poll(() => screenNow(page)).toBe('city');
  await page.getByRole('button', { name: 'Lights out, problem' }).tap();
  const card = page.getByRole('dialog', { name: 'Lights out' });
  await card.getByRole('button', { name: 'Lane run' }).tap();
  await playing(page);
  await page.evaluate(() => {
    window.__lane!.setGap(60);
    window.__lane!.warp(592);
  });
  const goal = page.getByRole('dialog', { name: 'You made it to the bus stop!' });
  await expect(goal).toBeVisible({ timeout: 10_000 });
  // Decision 45: the prize grows so the run brings home the fix's price.
  expect((await lane(page))!.haul.power).toBeGreaterThanOrEqual(10);
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await goal.getByRole('button', { name: 'Take it home' }).tap();
  await expect.poll(() => screenNow(page)).toBe('city');
  await expect(page.getByText('Mission complete!')).toBeVisible();
  await expect.poll(async () => (await saved(page)).city?.fixed ?? [], { timeout: 30_000 }).toContain('lightsOut');
});

test('the Not enough card for the Mast has "Lane run"; the Streets card starts a lane run', async ({ page: first }) => {
  let page = first;
  await open(page, { ...CITY, paid: { slowInternet: 2 } });
  await expect.poll(() => screenNow(page)).toBe('city');
  await page.locator('[data-build="mast"]').tap();
  const card = page.getByRole('dialog', { name: 'Mast' });
  await expect(card).toBeVisible({ timeout: 15_000 });
  await expect(card.getByText('Lane runs earn Tech.')).toBeVisible();
  await card.getByRole('button', { name: 'Lane run' }).tap();
  await playing(page);
  await page.keyboard.press('Escape');
  const pause = page.getByRole('dialog', { name: 'Paused' });
  await expect(pause).toBeVisible();
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await pause.getByRole('button', { name: 'Back to Lagos' }).tap();
  await expect.poll(() => screenNow(page)).toBe('city');
  // The Streets screen's last card: "Done ✓ Best: 840 m" after a goal, and it starts a run.
  // (A fresh page: the old one writes its own save as it closes.)
  const ctx = page.context();
  await page.close();
  page = await ctx.newPage();
  await page.goto('./');
  await page.evaluate(() => {
    localStorage.setItem('gidi-progress', JSON.stringify({ ...JSON.parse(localStorage.getItem('gidi-progress')!), lane: { best: 840, goals: 1, runs: 3, hints: [] } }));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page)).toBe('city');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.getByRole('button', { name: 'Streets', exact: true }).tap();
  const laneCard = page.locator('[data-where="lane"]');
  await expect(laneCard).toContainText('Lane run');
  await expect(laneCard).toContainText('Run to the bus stop for Naira, Power and Tech.');
  await expect(laneCard).toContainText('Done ✓ Best: 840 m');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await laneCard.tap();
  await playing(page);
});
