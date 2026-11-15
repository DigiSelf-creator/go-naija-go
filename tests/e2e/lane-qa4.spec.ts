/**
 * qa round 4, the lane run polish (docs/design.md S3f0 parts 9, 11, 14, 15 and 18): the look back
 * only on the very first run (also after a reload), skipped by a key or Enter as well as a tap;
 * the pop-to-chip flights never pile up and the chips end equal to the buckets; the corn count
 * at 320 x 240 with the lane tune ducked under it; the dots, the change chip and the count never
 * overlap the HUD at five sizes.
 */
import { writeFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { PAST_DOUBLE_TAP_MS } from './helpers';

const SHOTS = process.env['LANE_QA_SHOTS'] ?? '';
const LOOK = '{"skin":2,"hair":0,"outfit":0,"body":0,"age":1}';
const CITY = { kobo: 0, power: 0, tech: 0, fixed: [], fixes: 0, paid: {}, hints: ['walk', 'bright'] };
const PLAYED = { best: 0, goals: 0, runs: 1, hints: [] as string[] };

async function open(page: Page, lanePart: object | null): Promise<void> {
  await page.goto('./?level=lagos-lane');
  await page.evaluate(
    ({ look, p }) => {
      localStorage.setItem('gidi-look', look);
      localStorage.setItem('gidi-intro', '"seen"');
      localStorage.setItem('gidi-progress', p);
    },
    { look: LOOK, p: JSON.stringify({ v: 2, states: {}, city: CITY, ...(lanePart ? { lane: lanePart } : {}) }) },
  );
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
}
const hook = (page: Page) => page.evaluate(() => (window.__lane ? { ...window.__lane } : null));
const stage = async (page: Page) => (await hook(page))?.stage;
async function playing(page: Page): Promise<void> {
  await expect.poll(() => stage(page), { timeout: 15_000 }).toBe('play');
}
const city = (page: Page) => page.evaluate(() => (JSON.parse(localStorage.getItem('gidi-progress') ?? '{}') as { city?: { kobo: number; power: number; tech: number } }).city);

test('qa: the look back shows on the first run only, never again after a reload', async ({ page }) => {
  await open(page, null);
  await expect.poll(() => stage(page), { timeout: 15_000 }).toBe('intro');
  await playing(page);
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  const seen: string[] = [];
  for (let i = 0; i < 40; i++) {
    const s = await stage(page);
    if (s) seen.push(s);
    if (s === 'play') break;
    await page.waitForTimeout(100);
  }
  expect(seen).not.toContain('intro');
  expect(seen[seen.length - 1]).toBe('play');
});

for (const key of ['ArrowUp', 'Enter', 'Space']) {
  test(`qa: ${key} skips the look back to "3, 2, 1" and does not also move the hero`, async ({ page }) => {
    await open(page, null);
    await expect.poll(() => stage(page), { timeout: 15_000 }).toBe('intro');
    await page.keyboard.press(key);
    await expect.poll(() => stage(page)).toBe('count');
    expect((await hook(page))!.count).toBe('3');
    await playing(page);
    const h = (await hook(page))!;
    expect(h.jumping).toBe(false);
    expect(h.lane).toBe(1);
  });
}

test('qa: the flights never pile up (16 at most); after they land each chip equals what went into the bucket', async ({ page }) => {
  await open(page, PLAYED);
  await playing(page);
  await page.evaluate(() => window.__lane!.setGap(60));
  // Corn from 418 m bursts the crate, the sign and the goat ahead, on top of the coin lines.
  let most = 0;
  for (const d of [12, 160, 300, 405, 435, 455, 500]) {
    await page.evaluate((x) => {
      window.__lane!.setGap(60);
      window.__lane!.warp(x);
    }, d);
    for (let i = 0; i < 20; i++) {
      most = Math.max(most, (await hook(page))!.flying);
      await page.waitForTimeout(60);
    }
  }
  expect(most).toBeGreaterThan(0);
  expect(most).toBeLessThanOrEqual(16);
  await expect.poll(async () => (await hook(page))!.flying, { timeout: 3000 }).toBe(0);
  const h = (await hook(page))!;
  // Money words N1 to N4: under ₦1 it reads "40 kobo".
  const money = (k: number) => (k < 100 ? `${k} kobo` : `₦${Math.floor(k / 100)}${k % 100 ? '.' + String(k % 100).padStart(2, '0') : ''}`);
  expect(h.chips).toEqual([money(h.haul.kobo), `Power ${h.haul.power}`, `Tech ${h.haul.tech}`]);
  await page.keyboard.press('KeyP');
  await expect(page.getByRole('dialog', { name: 'Paused' })).toBeVisible();
  const c = (await city(page))!;
  expect({ kobo: c.kobo, power: c.power, tech: c.tech }).toEqual(h.haul);
});

test('qa: corn at 320 x 240: the count is readable, fits under row 2 and above the road, and the lane tune ducks under it', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 240 });
  await open(page, PLAYED);
  await playing(page);
  await page.evaluate(() => {
    window.__lane!.setGap(1e6);
    window.__lane!.warp(404);
  });
  // The count shows the last 5 s of the 12 s of corn.
  await expect.poll(async () => (await hook(page))!.cornCount, { timeout: 15_000 }).toBeGreaterThan(0);
  await page.waitForTimeout(300);
  const c = await page.evaluate(() => {
    const g = window.__game!.corn;
    const el = document.querySelector<HTMLElement>('.corn-count')!;
    const r = el.getBoundingClientRect();
    const num = el.querySelector<HTMLElement>('.count-num')!.getBoundingClientRect();
    const row2 = document.querySelector<HTMLElement>('.lane-row2')!.getBoundingClientRect();
    const hud = [...document.querySelectorAll<HTMLElement>('.lane-chip, .lane-pause, .lane-dark, .lane-change, .lane-line')].filter((e) => !e.closest('[hidden]') && e.getBoundingClientRect().width > 0).map((e) => e.getBoundingClientRect());
    const hits = hud.filter((b) => r.left < b.right && b.left < r.right && r.top < b.bottom && b.top < r.bottom).length;
    return { box: { x: r.x, y: r.y, w: r.width, h: r.height }, numH: num.height, font: parseFloat(getComputedStyle(el).fontSize), row2Bottom: row2.bottom, hits, place: g.place, musicLevel: g.musicLevel, level: g.level, spoken: g.spoken };
  });
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/corn-count-320x240.png` });
  expect(c.hits).toBe(0);
  expect(c.box.y).toBeGreaterThanOrEqual(c.row2Bottom - 0.5);
  expect(c.box.x).toBeGreaterThanOrEqual(0);
  expect(c.box.x + c.box.w).toBeLessThanOrEqual(320);
  expect(c.font).toBeGreaterThanOrEqual(16);
  expect(c.place).not.toBeNull();
  // The lane tune ducks under the corn tune.
  expect(c.musicLevel).toBeLessThan(1);
  expect(c.spoken).toBe('Corn ends in 5 seconds');
  if (SHOTS) writeFileSync(`${SHOTS}/corn-320.json`, JSON.stringify(c));
});

for (const [w, hgt] of [
  [320, 240],
  [568, 320],
  [640, 200],
  [851, 393],
  [1920, 1080],
] as const) {
  test(`qa: at ${w} x ${hgt} the dots, the change chip and the corn count overlap nothing`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: hgt });
    await open(page, PLAYED);
    await playing(page);
    const overlaps = () =>
      page.evaluate(() => {
        const els = [...document.querySelectorAll<HTMLElement>('.lane-chip, .lane-pause, .lane-dark, .lane-dots, .lane-change, .lane-line, .lane-best, .lane-hint, .lane-button, .corn-count')].filter(
          (e) => !e.closest('[hidden]') && !e.hidden && e.getBoundingClientRect().width > 0,
        );
        const out: string[] = [];
        const W = window.innerWidth;
        const H = window.innerHeight;
        for (const e of els) {
          const r = e.getBoundingClientRect();
          if (r.left < -0.5 || r.top < -0.5 || r.right > W + 0.5 || r.bottom > H + 0.5) out.push(`${e.className} off screen`);
        }
        for (let i = 0; i < els.length; i++)
          for (let j = i + 1; j < els.length; j++) {
            if (els[i]!.contains(els[j]!) || els[j]!.contains(els[i]!)) continue;
            const a = els[i]!.getBoundingClientRect();
            const b = els[j]!.getBoundingClientRect();
            if (a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5) out.push(`${els[i]!.className} "${els[i]!.textContent}" over ${els[j]!.className} "${els[j]!.textContent}"`);
          }
        return out;
      });
    const bad: string[] = [];
    // A hint, then the "−15 m" chip with the Blackout close ("!"): 20 m back, 5 m after the stumble.
    await page.evaluate(() => {
      window.__lane!.setGap(20);
      window.__lane!.warp(48);
    });
    for (let i = 0; i < 25; i++) {
      bad.push(...(await overlaps()));
      if ((await hook(page))!.change) break;
      await page.waitForTimeout(80);
    }
    expect((await hook(page))!.change).toMatch(/m$/);
    bad.push(...(await overlaps()));
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/change-${w}x${hgt}.png` });
    // The corn count, with a "+5 m" chip as a bulb is taken.
    await page.evaluate(() => {
      window.__lane!.setGap(30);
      window.__lane!.warp(404);
    });
    await expect.poll(async () => (await hook(page))!.corn, { timeout: 5000 }).toBeGreaterThan(0);
    // While the count shows, the bulb in the middle lane at 528 m brings the "+5 m" chip.
    await expect.poll(async () => (await hook(page))!.cornCount, { timeout: 15_000 }).toBeGreaterThan(0);
    await page.evaluate(() => {
      window.__lane!.setGap(30);
      window.__lane!.warp(520);
    });
    for (let i = 0; i < 30; i++) {
      bad.push(...(await overlaps()));
      await page.waitForTimeout(80);
    }
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/corn-${w}x${hgt}.png` });
    expect([...new Set(bad)]).toEqual([]);
  });
}

test('qa: reduced motion: a coin counts up at once with a short "+10 kobo" on the Naira chip', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, PLAYED);
  await playing(page);
  // 4 coins in the middle lane from 50 m, 2 m apart.
  await page.evaluate(() => {
    window.__lane!.setGap(40);
    window.__lane!.warp(40);
  });
  const read = () => page.evaluate(() => ({ kobo: window.__lane!.haul.kobo, plus: window.__lane!.plus[0], flying: window.__lane!.flying, chip: window.__lane!.chips[0] }));
  await expect.poll(async () => (await read()).kobo, { timeout: 5000, intervals: [30] }).toBeGreaterThan(0);
  const r = await read();
  expect(r.flying).toBe(0);
  // Money words N1 to N4 (part 14): under ₦1 it reads in kobo.
  expect(r.plus).toBe('+10 kobo');
  expect(r.chip).toBe(`${r.kobo} kobo`);
});
