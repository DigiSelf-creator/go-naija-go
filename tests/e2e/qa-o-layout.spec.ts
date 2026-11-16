/**
 * qa slice O round (O1c recheck): the short-screen layout (`@media (max-height: 320px)`, commit
 * 6cc56d5) for Ogun's place with one, two and three streets open, the Travel card and the download
 * card, at 320 x 240, 568 x 320, 640 x 200, 851 x 393 and 1280 x 720, with and without 24 px safe
 * edges. Every button 44 x 44 or more, inside the safe edges, no two buttons on top of each other,
 * Ogun's words box whole (not cut off) and clear of the top row (Ogun, Sound, Settings) and the
 * bottom row (Travel, the wheel).
 */
import { expect, test, type Page } from '@playwright/test';
import { PAST_DOUBLE_TAP_MS, screenNow } from './helpers';

const LOOK = '{"skin":2,"hair":0,"outfit":0,"body":0,"age":1}';
const CITY = { kobo: 12345, power: 3, tech: 2, fixed: [], fixes: 0, paid: {}, hints: ['walk', 'bright', 'buka', 'collect', 'road'], boom: 7 };
const DONE = { done: true, best: 100 };
const LAGOS = { streets: { 1: DONE, 2: DONE, 3: DONE }, parcel: false, hall: { done: true, best: 0 } };
const ogunSave = (done: number) => ({
  v: 2,
  states: { lagos: LAGOS, ogun: { arrived: true, streets: Object.fromEntries([1, 2, 3].filter((n) => n <= done).map((n) => [n, DONE])) } },
  city: CITY,
  where: 'ogun',
});
const SIZES = [
  { width: 320, height: 240 },
  { width: 568, height: 320 },
  { width: 640, height: 200 },
  { width: 851, height: 393 },
  { width: 1280, height: 720 },
] as const;

type Box = { t: string; x: number; y: number; w: number; h: number };
const overlaps = (a: Box, b: Box): boolean => a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5;

async function setSafe(page: Page, px: number): Promise<void> {
  await page.evaluate((px) => {
    for (const s of ['top', 'right', 'bottom', 'left']) {
      if (px) document.documentElement.style.setProperty(`--safe-${s}`, `${px}px`);
      else document.documentElement.style.removeProperty(`--safe-${s}`);
    }
    window.dispatchEvent(new Event('resize'));
  }, px);
}
const settle = (page: Page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

/** Every showing button of the top layer, and the Ogun place's three rows. */
async function layout(page: Page) {
  return page.evaluate(() => {
    const box = (e: Element, t?: string) => {
      const r = e.getBoundingClientRect();
      return { t: t ?? ((e.textContent ?? '').trim() || e.getAttribute('aria-label') || '?'), x: r.x, y: r.y, w: r.width, h: r.height };
    };
    const top = [...document.querySelectorAll<HTMLElement>('.travel-dim')].pop() ?? document.querySelector<HTMLElement>('.screen[data-ui]')!;
    const words = top.querySelector('.ogun-words');
    const card = [...top.querySelectorAll<HTMLElement>('.card')].pop();
    return {
      vw: innerWidth,
      vh: innerHeight,
      sw: document.documentElement.scrollWidth,
      buttons: [...top.querySelectorAll<HTMLElement>('button')].filter((b) => b.getClientRects().length > 0).map((b) => box(b)),
      words: words ? { ...box(words, 'words'), sh: words.scrollHeight, ch: words.clientHeight } : null,
      lines: [...(words?.querySelectorAll('p') ?? [])].map((p) => box(p)),
      topRow: top.querySelector('.ogun-top') ? box(top.querySelector('.ogun-top')!, 'top row') : null,
      bottomRow: top.querySelector('.ogun-bottom') ? box(top.querySelector('.ogun-bottom')!, 'bottom row') : null,
      card: card && !card.classList.contains('ogun-screen') ? { ...box(card, 'card'), sh: card.scrollHeight, ch: card.clientHeight } : null,
    };
  });
}

async function check(page: Page, name: string, found: string[]): Promise<void> {
  for (const size of SIZES) {
    for (const safe of [0, 24]) {
      await page.setViewportSize(size);
      await setSafe(page, safe);
      await settle(page);
      const l = await layout(page);
      const at = `${name} ${size.width}x${size.height}${safe ? ' safe 24' : ''}`;
      const bad = (m: string) => found.push(`${at}: ${m}`);
      // QA_SHOTS=<folder>: a picture of every size, for the report.
      if (process.env['QA_SHOTS']) await page.screenshot({ path: `${process.env['QA_SHOTS']}/${at.replace(/[^\w]+/g, '-')}.png` });
      if (l.sw > l.vw + 1) bad('sideways scroll');
      for (const b of l.buttons) {
        if (b.h < 44 || b.w < 44) bad(`"${b.t}" is ${b.w.toFixed(0)}x${b.h.toFixed(0)}`);
        if (b.x < safe - 0.5 || b.x + b.w > l.vw - safe + 0.5 || b.y < safe - 0.5 || b.y + b.h > l.vh - safe + 0.5)
          bad(`"${b.t}" outside the safe area (${b.x.toFixed(0)},${b.y.toFixed(0)} ${b.w.toFixed(0)}x${b.h.toFixed(0)})`);
      }
      for (let i = 0; i < l.buttons.length; i++)
        for (let j = i + 1; j < l.buttons.length; j++) if (overlaps(l.buttons[i]!, l.buttons[j]!)) bad(`"${l.buttons[i]!.t}" overlaps "${l.buttons[j]!.t}"`);
      if (l.words) {
        if (l.words.sh > l.words.ch + 1) bad('words box cut off inside');
        if (l.words.y + l.words.h > l.vh - safe + 0.5) bad(`words box runs off the bottom (${(l.words.y + l.words.h).toFixed(0)} of ${l.vh})`);
        if (l.bottomRow && overlaps(l.words, l.bottomRow)) bad(`words box overlaps the Travel row by ${(l.words.y + l.words.h - l.bottomRow.y).toFixed(0)} px`);
        if (l.topRow && overlaps(l.words, l.topRow)) bad('words box overlaps the top row');
        for (const p of l.lines) if (p.y + p.h > l.vh - safe + 0.5 || p.y < safe - 0.5) bad(`line "${p.t}" off screen`);
      }
      if (l.card && l.card.sh > l.card.ch + 1) bad('card needs a scroll');
    }
  }
  await setSafe(page, 0);
  await page.setViewportSize({ width: 851, height: 393 });
}

async function openOgun(page: Page, done: number): Promise<void> {
  await page.goto('./');
  await page.evaluate(
    ({ look, p }) => {
      localStorage.setItem('gidi-look', look);
      localStorage.setItem('gidi-intro', '"seen"');
      localStorage.setItem('gidi-progress', p);
      localStorage.setItem('gidi-busRide', 'false');
    },
    { look: LOOK, p: JSON.stringify(ogunSave(done)) },
  );
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page)).toMatch(/^(city|ogun)$/);
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  if ((await screenNow(page)) === 'city') {
    await page.getByRole('dialog', { name: 'Lagos' }).getByRole('button', { name: 'Travel' }).tap();
    await page.getByRole('dialog', { name: 'Where to?' }).locator('[data-state="ogun"]').tap();
  }
  const dl = page.locator('.download-card').getByRole('button', { name: 'Download' });
  await expect.poll(async () => (await dl.count()) > 0 || (await screenNow(page)) === 'ogun', { timeout: 15_000 }).toBe(true);
  if ((await dl.count()) > 0) {
    await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
    await dl.tap();
  }
  await expect.poll(() => screenNow(page), { timeout: 15_000 }).toBe('ogun');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
}

for (const done of [0, 1, 2, 3]) {
  test(`qa O: Ogun's place with ${done} street(s) cleared fits every size, nothing on the Travel row`, async ({ page }) => {
    // Game bug QA-O-1b (open): at 320 x 240 with 24 px safe edges the top row wraps ("Settings"
    // under "Sound: on") and Ogun's words box covers "Settings"; at 640 x 200 with safe edges the
    // words box runs under the Travel row.
    // Game bug QA-O-1 (open): with two or three streets open, the small "Play Abeokuta" / "Play Ota"
    // drop to a third grid row under the short-screen rule and sit under "Travel" and "Nigeria's
    // wheel" at 640 x 200 (and at 320 x 240 with safe edges).
    test.fail(true, done === 0 ? 'QA-O-1b: Settings covered by the words box at 320 x 240 with safe edges' : 'QA-O-1: small Play buttons under the Travel row on short screens');
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await openOgun(page, done);
    // O5b: once Sagamu is done, "Go to Pothole Hall" is the big button, so four in all.
    await expect(page.locator('.ogun-play')).toHaveCount(done + 1);
    const found: string[] = [];
    await check(page, `Ogun's place (${done} done)`, found);
    // The Travel card opened from Ogun's place, at the same sizes.
    await page.getByRole('dialog', { name: 'Ogun', exact: true }).getByRole('button', { name: 'Travel' }).tap();
    await expect(page.getByRole('dialog', { name: 'Where to?' })).toBeVisible();
    if (done === 2) await check(page, 'Travel card from Ogun', found);
    test.info().annotations.push({ type: 'layout faults', description: found.join(' | ') || 'none' });
    console.log(`done ${done}: ${found.length} faults\n  ${found.join('\n  ')}`);
    expect(found).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test.describe('download card', () => {
  test.use({ serviceWorkers: 'block' });
  test('qa O: the download card fits every size, with and without safe edges', async ({ page }) => {
    // Game bug QA-O-2 (open, minor): with 24 px safe edges the Travel card (320 x 240) and the
    // download card (320 x 240, 640 x 200) need a small scroll; every button can still be reached.
    test.fail(true, 'QA-O-2: Travel and download cards scroll at 320 x 240 / 640 x 200 with 24 px safe edges');
    await page.goto('./');
    await page.evaluate(
      ({ look, p }) => {
        localStorage.setItem('gidi-look', look);
        localStorage.setItem('gidi-intro', '"seen"');
        localStorage.setItem('gidi-progress', p);
      },
      { look: LOOK, p: JSON.stringify({ v: 2, states: { lagos: LAGOS }, city: CITY }) },
    );
    await page.reload();
    await page.getByRole('button', { name: 'Play' }).tap();
    await expect.poll(() => screenNow(page)).toBe('city');
    await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
    await page.getByRole('dialog', { name: 'Lagos' }).getByRole('button', { name: 'Travel' }).tap();
    const found: string[] = [];
    await check(page, 'Travel card from Lagos', found);
    await page.getByRole('dialog', { name: 'Where to?' }).locator('[data-state="ogun"]').tap();
    await expect(page.locator('.download-card')).toBeVisible();
    await check(page, 'download card', found);
    console.log(`download: ${found.length} faults\n  ${found.join('\n  ')}`);
    expect(found).toEqual([]);
  });
});

for (const [name, id] of [['Play Ota', 'ogun-1'], ['Play Abeokuta', 'ogun-2'], ['Play Sagamu', 'ogun-3']] as const) {
  test(`qa O: with all three streets cleared, "${name}" on Ogun's place starts ${id}`, async ({ page }) => {
    await openOgun(page, 3);
    await page.getByRole('dialog', { name: 'Ogun', exact: true }).getByRole('button', { name }).tap();
    await expect.poll(() => screenNow(page)).toBe('play');
    await expect.poll(() => page.evaluate(() => window.__game!.steps)).toBeGreaterThan(5);
    expect(await page.evaluate(() => window.__game!.level.id)).toBe(id);
    expect(await page.evaluate(() => window.__game!.run.lives)).toBe(3);
  });
}
