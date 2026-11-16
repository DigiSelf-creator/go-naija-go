/**
 * O3b (docs/ogun.md 3.3, 3.5, 3.7, 4.1 and 8): Abeokuta, Ogun street 2, on the phone profile.
 * A player who has cleared Ota opens Ogun's city (OG-R35), taps the Bad road pin's big "Run
 * Abeokuta" (OG-R37), and plays by hand with
 * two thumbs: the rock steps and the ledge over its pothole, the water potholes, down the well
 * into the Ijebu garri store for the parcel and back up, the cracks that rumble open, ofada that
 * keeps the next ones shut, the corn stretch and the bus. The cleared card says Abeokuta's line
 * and the parcel's, the save goes under states.ogun (street 2 and the parcel), and Ogun's city's
 * Bad road card then says "Run Sagamu" (O4b). Before Ota is done, its card says "Run Ota" and the
 * road's Abeokuta stop is locked.
 */
import { expect, test, type Page } from '@playwright/test';
import { crateActor, type CrateLog } from './crate-bot';
import { LEFT, buttonCentres, hands, playStreetByHand, snap, type Hands, type Snap } from './hands';
import { PAST_DOUBLE_TAP_MS, screenNow, waitOutTapLock } from './helpers';

/** OG-R37: the Bad road pin's card in Ogun's city. */
async function badRoadCard(page: Page) {
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.locator('.ogun-city [data-spot="badRoad"]').tap();
  const card = page.getByRole('dialog', { name: 'Bad road' });
  await expect(card).toBeVisible();
  return card;
}
import { wellBot } from './well-bot';
import { formatMoney } from '../../src/game/money';

const LOOK = '{"skin":2,"hair":0,"outfit":0,"body":0,"age":1}';
const CITY = { kobo: 1000, power: 0, tech: 0, fixed: [], fixes: 0, paid: {}, hints: ['walk', 'bright', 'buka', 'collect', 'road'] };
const STREETS = { 1: { done: true, best: 100 }, 2: { done: true, best: 100 }, 3: { done: true, best: 100 } };
const LAGOS = { streets: STREETS, parcel: false, hall: { done: true, best: 0 } };
/** Go-Slow Hall won, Ogun open and arrived, Ota cleared (or not), Ogun the city last used. */
const save = (otaDone: boolean) => ({
  v: 2,
  states: { lagos: LAGOS, ogun: { arrived: true, ...(otaDone ? { streets: { 1: { done: true, best: 300 } } } : {}) } },
  city: CITY,
  where: 'ogun',
});

type Saved = { states?: { lagos?: unknown; ogun?: { streets?: Record<string, { done?: boolean; best?: number }>; parcel?: boolean } }; city?: { kobo?: number } };
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('gidi-progress') ?? '{}') as Saved);

async function openOgun(page: Page, otaDone: boolean): Promise<string[]> {
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
    { look: LOOK, p: JSON.stringify(save(otaDone)) },
  );
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page)).toBe('ogun');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  return errors;
}

test('Before Ota is done, Ogun\'s city sends you to Ota and the road\'s Abeokuta stop is locked', async ({ page }) => {
  const errors = await openOgun(page, false);
  const card = await badRoadCard(page);
  await expect(card.getByRole('button', { name: 'Run Ota' })).toHaveClass(/\bgo\b/);
  await expect(card.getByRole('button', { name: 'Run Abeokuta' })).toHaveCount(0);
  await card.getByRole('button', { name: 'Back' }).tap();
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.locator('.ogun-city').getByRole('button', { name: 'Challenge road' }).tap();
  await expect(page.locator('[data-where="abeokuta"]')).toHaveAttribute('aria-label', /Locked/);
  await expect(page.locator('[data-where="ota"]')).toHaveAttribute('aria-label', /Next/);
  expect(errors).toEqual([]);
});

test('Abeokuta by hand from Ogun\'s city: rocks, water, the well room and its parcel, cracks, ofada, the bus, the cleared card and the save', async ({ page }) => {
  test.setTimeout(300_000);
  const errors = await openOgun(page, true);
  // Abeokuta is the Bad road card's big button now; Ota stays playable (its pin and road stop).
  const card = await badRoadCard(page);
  await expect(card.getByText('Clear Ota, Abeokuta and Sagamu to reach Pothole Hall.')).toBeVisible();
  const play = card.getByRole('button', { name: 'Run Abeokuta' });
  await expect(play).toHaveClass(/\bgo\b/);
  expect((await play.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await play.tap();
  await expect.poll(() => screenNow(page)).toBe('play');
  await expect.poll(() => page.evaluate(() => window.__game!.steps)).toBeGreaterThan(5);
  expect(await page.evaluate(() => window.__game!.level.id)).toBe('ogun-2');
  expect(await page.evaluate(() => window.__game!.skin)).toBe(true);

  const cdp = await page.context().newCDPSession(page);
  const h = hands(cdp);
  const crates: CrateLog = { opened: [], foods: [] };
  const crateAct = await crateActor(page, crates);
  const well = await wellBot(page, h);
  const btn = await buttonCentres(page);
  const room = { visited: false, id: '', parcel: false, keeper: '', bubble: false, toast: '', back: 0 };
  /** Down the well at 3500, the parcel from the plank shelf, then up at 4700. */
  const wellAct = async (s: Snap, hh: Hands): Promise<boolean> => {
    if (room.visited || s.h.x < 3380 || s.h.x > 3520) return false;
    room.visited = true;
    await well.walkTo(3500, 8);
    await well.tapWellButton('down');
    await well.phase('room');
    room.id = await page.evaluate(() => window.__game!.run.room?.id ?? '');
    // Under the plank shelf (240 to 330, 100 high): a held jump lands on it and takes the parcel.
    await well.walkTo(285, 4);
    // Every frame from here: the keeper's pose and whether a bubble shows.
    await page.evaluate(() => {
      const log: string[] = [];
      (window as unknown as { __keeper: string[] }).__keeper = log;
      const f = (): void => {
        const p = window.__game!.people;
        log.push(`${p?.drawn[0]?.frame ?? 'none'}@${p?.drawn[0]?.x ?? ''}${p?.bubble ? '+bubble' : ''}`);
        if (log.length < 240) requestAnimationFrame(f);
      };
      requestAnimationFrame(f);
    });
    await well.jump(true);
    await page.waitForTimeout(150);
    room.parcel = await page.evaluate(() => window.__game!.run.parcel);
    room.toast = (await page.evaluate(() => window.__game!.toast)) ?? '';
    // The store keeper by the back wall claps. His bubble shows only where it covers nothing the
    // player needs (people part 6), so it is logged here; its words are checked in the unit tests.
    await page.waitForTimeout(500);
    const frames = await page.evaluate(() => (window as unknown as { __keeper: string[] }).__keeper);
    room.keeper = frames.find((f) => f.startsWith('clap')) ?? frames.at(-1) ?? '';
    room.bubble = frames.some((f) => f.endsWith('+bubble'));
    // Off the shelf's right end and to the rope, then up.
    await well.walkTo(500, 4);
    await well.tapWellButton('up');
    await well.phase('run', 15_000);
    room.back = (await snap(page)).h.x;
    await hh.down(LEFT, btn.forward.x, btn.forward.y);
    return true;
  };
  const toasts = new Set<string>();
  let ofadaChip = '';
  const { stats, last } = await playStreetByHand(page, h, {
    act: async (s, hh) => (await wellAct(s, hh)) || crateAct(s, hh),
    onPoll: async (s) => {
      const t = await page.evaluate(() => window.__game!.toast);
      if (t) toasts.add(t);
      if (!ofadaChip && (s.r.power as { ofada?: number }).ofada) {
        ofadaChip = await page.evaluate(() => [...document.querySelectorAll('.hud-food')].find((e) => !(e as HTMLElement).hidden && /Ofada/.test(e.textContent ?? ''))?.textContent ?? '');
      }
    },
  });
  await h.upAll();
  const cracks = (await snap(page)).r.cracks;
  console.log(
    `Abeokuta by hand: ${last.r.phase} at x ${last.h.x.toFixed(0)} in ${last.r.time.toFixed(1)} s, lives ${last.r.lives}, kobo ${last.r.kobo}, presses ${stats.presses}, ` +
      `lost at ${stats.lostAt.map((x) => x.toFixed(0)).join(', ') || 'nowhere'}, crates ${crates.opened.join(', ')}, room ${JSON.stringify(room)}, ` +
      `cracks ${cracks.map((c) => `${c.x}:${c.state}`).join(' ')}, ofada chip "${ofadaChip}"; toasts: ${[...toasts].join(' | ')}`,
  );
  expect(last.r.phase).toBe('bus');
  expect(last.r.checkpoint).toBe(true);
  expect(stats.lostAt.length, 'a Lagos finisher clears Abeokuta on the first try').toBeLessThan(3);
  // The well room: down at 3500, the Ijebu garri parcel, the keeper's words, up at the exit well.
  expect(room.visited).toBe(true);
  expect(room.id).toBe('ogun-well');
  expect(room.parcel).toBe(true);
  expect(room.keeper).toMatch(/^clap\d@86/);
  expect(room.toast).toBe('Ijebu garri parcel! Shield for the hall.');
  expect(Math.abs(room.back - 4700)).toBeLessThan(40);
  expect(last.r.parcel).toBe(true);
  // The hints, the ofada words and chip, the parcel's toast.
  for (const t of [
    'Rocks! Jump up from step to step.',
    'Water pothole! Jump over it too.',
    'Crack! It opens up. Jump over it.',
    'Ofada! Cracks stay shut now.',
    'Ofada rice! Cracks stay shut for 12 seconds.',
  ])
    expect(toasts).toContain(t);
  expect(ofadaChip).toMatch(/^Ofada\s*\d+$/);
  // The first three cracks rumbled open; the ones met with ofada stayed shut.
  expect(cracks.slice(0, 3).map((c) => c.state)).toEqual(['open', 'open', 'open']);
  expect(cracks.find((c) => c.x === 7300)!.state).toBe('sealed');
  expect(crates.opened.length).toBeGreaterThanOrEqual(3);

  // The cleared card: Abeokuta's line and the parcel's; Take it home and Play again (Sagamu is not built).
  const kobo = last.r.kobo;
  const dialog = page.getByRole('dialog', { name: 'Street cleared!' });
  await expect(dialog).toBeVisible({ timeout: 8000 });
  const money = kobo * 10 + 500;
  await expect(dialog.getByText(`Abeokuta is moving again, thanks to you! You got ${formatMoney(money)}.`)).toBeVisible();
  await expect(dialog.getByText('Your Ijebu garri parcel is saved for Pothole Hall.')).toBeVisible();
  // O4b: Abeokuta's card goes on to Sagamu.
  for (const b of ['Take it home', 'Next street', 'Play again', 'Challenge road']) await expect(dialog.getByRole('button', { name: b, exact: true })).toBeVisible();
  // Saved under states.ogun: street 2 and the parcel; Lagos as it was; the money in the one wallet.
  const s = await saved(page);
  expect(s.states?.ogun?.streets?.['2']).toEqual({ done: true, best: kobo * 10 });
  expect(s.states?.ogun?.streets?.['1']?.done).toBe(true);
  expect(s.states?.ogun?.parcel).toBe(true);
  expect(s.states?.lagos).toEqual(LAGOS);
  expect(s.city?.kobo).toBe(1000 + money);

  await waitOutTapLock(page);
  await dialog.getByRole('button', { name: 'Take it home' }).tap();
  await expect.poll(() => screenNow(page)).toBe('ogun');
  await expect(page.locator('.ogun-city .city-banner')).toContainText('Mission complete!');
  // O4b: Sagamu is the Bad road card's big button now.
  const after = await badRoadCard(page);
  await expect(after.getByRole('button', { name: 'Run Sagamu' })).toHaveClass(/\bgo\b/);
  expect(errors).toEqual([]);
});
