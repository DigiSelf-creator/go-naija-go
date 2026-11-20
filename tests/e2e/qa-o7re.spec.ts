/**
 * qa O7fix re-check (QA-O7-1, QA-O7-2, QA-O2-4): every card and city row at every size, with and
 * without 24 px safe edges, Lagos and Ogun: buttons at least 44 px, inside the safe area and the
 * card, apart; no sideways scroll; and which words a card hides under its buttons until scrolled.
 * With QA_SHOTS=<folder> it saves pictures (o7re-*.png).
 */
import { expect, test, type Page } from '@playwright/test';
import { keyPad, HALL_URL, playHall, waitForWin } from './hall-play';
import { buttonCentres, hands, LEFT } from './hands';
import { PAST_DOUBLE_TAP_MS, screenNow, startRun, waitOutTapLock } from './helpers';
import { playPothole } from './pothole-play';

const SHOTS = process.env['QA_SHOTS'];
const LOOK = '{"skin":3,"hair":1,"outfit":2,"body":1,"age":1}';
const D = { done: true, best: 100 };
const STREETS = { 1: D, 2: D, 3: D };
const HALL = { done: true, best: 0 };
const SIZES = [
  { width: 320, height: 240 },
  { width: 568, height: 320 },
  { width: 640, height: 200 },
  { width: 851, height: 393 },
  { width: 1280, height: 720 },
  { width: 1920, height: 1080 },
] as const;
const PHONE = { width: 851, height: 393 };
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
const settle = (page: Page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 60)))));

/** The buttons and words of `sel` (a card, or the city when sel is a city screen). */
const probe = (page: Page, sel: string) =>
  page.evaluate((sel) => {
    const root = [...document.querySelectorAll<HTMLElement>(sel)].filter((e) => e.getClientRects().length > 0).pop();
    if (!root) return null;
    const vis = (e: Element) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
    const box = (e: Element) => {
      const r = e.getBoundingClientRect();
      return { t: ((e.textContent ?? '').trim() || e.getAttribute('aria-label') || '?').slice(0, 60), x: r.x, y: r.y, w: r.width, h: r.height };
    };
    const buttons = [...root.querySelectorAll('button')].filter(vis).filter((b) => !b.closest('.city-stage, .city-map')).map((b) => {
      const q = b.getBoundingClientRect();
      const hit = document.elementFromPoint(q.x + q.width / 2, q.y + q.height / 2);
      return { ...box(b), tap: !!hit && b.contains(hit) };
    });
    // The visible window of each word: clipped by every scrolling parent up to the root.
    const clipOf = (e: Element) => {
      let top = 0, bottom = innerHeight;
      for (let p = e.parentElement; p; p = p.parentElement) {
        const cs = getComputedStyle(p);
        if (/(auto|scroll|hidden)/.test(cs.overflowY)) {
          const r = p.getBoundingClientRect();
          top = Math.max(top, r.top);
          bottom = Math.min(bottom, r.bottom);
        }
        if (p === root) break;
      }
      return { top, bottom };
    };
    const words = [...root.querySelectorAll('h2, p, li')].filter(vis).filter((e) => !e.querySelector('p') && (e.textContent ?? '').trim()).map((e) => ({ ...box(e), clip: clipOf(e) }));
    const hidden: string[] = [];
    for (const wd of words) {
      const visTop = Math.max(wd.y, wd.clip.top);
      let visBottom = Math.min(wd.y + wd.h, wd.clip.bottom);
      // Under a button (a sticky bar), it is not seen either.
      for (const b of buttons) if (b.x < wd.x + wd.w && wd.x < b.x + b.w && b.y < visBottom && b.y + b.h > visTop && b.y > visTop) visBottom = Math.min(visBottom, b.y);
      const seen = Math.max(0, visBottom - visTop) / Math.max(1, wd.h);
      // The room this word can be seen in at most: its scrolling window, less any button over it.
      const cover = Math.min(wd.clip.bottom, ...buttons.filter((b) => b.x < wd.x + wd.w && wd.x < b.x + b.w && b.y > wd.clip.top && b.y < wd.clip.bottom).map((b) => b.y));
      const fits = wd.h <= cover - wd.clip.top + 0.5;
      if (seen < 0.9) hidden.push(`"${wd.t}" ${Math.round(seen * 100)}% seen${fits ? '' : ' (taller than its window)'}`);
    }
    const scroller = [root, ...root.querySelectorAll<HTMLElement>('*')].find((e) => e.scrollHeight > e.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(e).overflowY));
    return { vw: innerWidth, vh: innerHeight, sw: document.documentElement.scrollWidth, buttons, hidden, scrolls: !!scroller, root: box(root) };
  }, sel);

type Report = { faults: string[]; notes: string[] };
async function sweep(page: Page, name: string, sel: string, rep: Report): Promise<void> {
  for (const size of SIZES) {
    for (const safe of [0, 24]) {
      await page.setViewportSize(size);
      await setSafe(page, safe);
      await settle(page);
      const at = `${name} ${size.width}x${size.height}${safe ? ' safe24' : ''}`;
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/o7re-${at.replace(/[^\w]+/g, '-')}.png` });
      const l = await probe(page, sel);
      if (!l) {
        rep.faults.push(`${at}: ${sel} not showing`);
        continue;
      }
      const bad = (m: string) => rep.faults.push(`${at}: ${m}`);
      if (l.sw > l.vw + 1) bad('sideways scroll');
      for (const b of l.buttons) {
        if (b.h < 43.5 || b.w < 43.5) bad(`"${b.t}" is ${b.w.toFixed(0)}x${b.h.toFixed(0)}`);
        if (!b.tap) bad(`"${b.t}" not tappable at its centre`);
        if (b.x < safe - 0.5 || b.x + b.w > l.vw - safe + 0.5 || b.y < safe - 0.5 || b.y + b.h > l.vh - safe + 0.5) bad(`"${b.t}" outside the safe area (${b.x.toFixed(0)},${b.y.toFixed(0)} ${b.w.toFixed(0)}x${b.h.toFixed(0)})`);
        if (!sel.includes('city') || sel.includes('card')) if (b.y < l.root.y - 0.5 || b.y + b.h > l.root.y + l.root.h + 0.5) bad(`"${b.t}" scrolled out of the card`);
      }
      for (let i = 0; i < l.buttons.length; i++) for (let j = i + 1; j < l.buttons.length; j++) if (overlaps(l.buttons[i]!, l.buttons[j]!)) bad(`"${l.buttons[i]!.t}" overlaps "${l.buttons[j]!.t}"`);
      if (l.hidden.length) rep.notes.push(`${at}: scroll ${l.scrolls}; hidden until scrolled: ${l.hidden.join('; ')}`);
      if (l.hidden.length && l.scrolls) {
        // Scrolled to the end, every word hidden at the top can be read, and the buttons stay in the card.
        const roll = (end: boolean) =>
          page.evaluate(
            ({ sel, end }) => {
              const root = [...document.querySelectorAll<HTMLElement>(sel)].filter((e) => e.getClientRects().length > 0).pop()!;
              for (const e of [root, ...root.querySelectorAll<HTMLElement>('*')]) if (e.scrollHeight > e.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(e).overflowY)) e.scrollTop = end ? e.scrollHeight : 0;
            },
            { sel, end },
          );
        await roll(true);
        await settle(page);
        if (SHOTS) await page.screenshot({ path: `${SHOTS}/o7re-${at.replace(/[^\w]+/g, '-')}-scrolled.png` });
        const e = (await probe(page, sel))!;
        // A word is readable when what shows of it at the top and at the end covers it (each line seen at one of the two).
        const pct = (x: string) => Number(/ (\d+)% seen/.exec(x)?.[1] ?? 100);
        const key = (x: string) => x.replace(/ \d+% seen.*$/, '');
        const both = l.hidden.filter((x) => { const y = e.hidden.find((z) => key(z) === key(x)); return y !== undefined && pct(x) + pct(y) < 95; }).map(key);
        if (both.length) bad(`never fully seen, even scrolled: ${both.join('; ')}`);
        for (const b of e.buttons) if (b.y < e.root.y - 0.5 || b.y + b.h > e.root.y + e.root.h + 0.5 || b.y + b.h > e.vh - safe + 0.5) bad(`scrolled: "${b.t}" out of view`);
        await roll(false);
      }
    }
  }
  await setSafe(page, 0);
  await page.setViewportSize(PHONE);
  await settle(page);
}

function errorsOf(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  return errors;
}
async function openWith(page: Page, progress: object, url = './'): Promise<void> {
  await page.goto(url);
  await page.evaluate(
    ({ look, p }) => {
      localStorage.setItem('gidi-look', look);
      localStorage.setItem('gidi-intro', '"seen"');
      localStorage.setItem('gidi-busRide', 'false');
      localStorage.setItem('gidi-progress', p);
    },
    { look: LOOK, p: JSON.stringify(progress) },
  );
  await page.reload();
}
const report = (name: string, rep: Report) => {
  console.log(`== ${name}\nFAULTS (${rep.faults.length}):\n  ${rep.faults.join('\n  ')}\nHIDDEN WORDS (${rep.notes.length}):\n  ${rep.notes.join('\n  ')}`);
  test.info().annotations.push({ type: 'hidden words', description: rep.notes.join(' | ') || 'none' });
};

const CITY = { kobo: 5000, power: 3, tech: 1, fixed: ['potholes'], fixes: 1, built: ['buka'], trays: {}, boom: 8, hints: ['walk', 'bright', 'buka', 'collect', 'road', 'tax'] };
const DONE = { v: 2, states: { lagos: { streets: STREETS, parcel: false, hall: HALL }, ogun: { arrived: true, streets: STREETS, hall: HALL } }, city: CITY, lane: { best: 700, goals: 1 } };

for (const where of ['lagos', 'ogun'] as const) {
  test(`qa O7re: ${where}'s road stop cards at every size`, async ({ page }) => {
    test.setTimeout(300_000);
    const errors = errorsOf(page);
    await openWith(page, { ...DONE, where });
    await page.getByRole('button', { name: 'Play' }).tap();
    await expect.poll(() => screenNow(page)).toBe(where === 'lagos' ? 'city' : 'ogun');
    await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
    await page.locator(where === 'lagos' ? '[role=dialog][aria-label="Lagos"]' : '.ogun-city').getByRole('button', { name: 'Challenge road' }).first().tap();
    await expect.poll(() => screenNow(page)).toBe('road');
    const road = page.getByRole('region', { name: 'Challenge road' });
    const stops = await road.locator('[data-where]').evaluateAll((els) => els.map((e) => e.getAttribute('data-where')!));
    const rep: Report = { faults: [], notes: [] };
    for (const s of stops) {
      await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
      await road.locator(`[data-where="${s}"]`).tap();
      const card = page.locator('.road-card');
      if (!(await card.isVisible().catch(() => false))) continue;
      await sweep(page, `${where} road ${s}`, '.road-card', rep);
      await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
      await card.getByRole('button', { name: 'Back' }).tap();
      await expect(card).toBeHidden();
    }
    report(`${where} road`, rep);
    expect(rep.faults).toEqual([]);
    expect(errors).toEqual([]);
  });

  test(`qa O7re: ${where}'s city rows and first-visit hint at every size`, async ({ page }) => {
    test.setTimeout(180_000);
    const errors = errorsOf(page);
    const fresh = where === 'lagos'
      ? { v: 2, states: {}, city: { kobo: 0, power: 0, tech: 0, fixed: [], fixes: 0, hints: [] } }
      : { v: 2, states: { lagos: { streets: STREETS, parcel: false, hall: HALL }, ogun: { arrived: true } }, city: { kobo: 500, power: 0, tech: 0, fixed: [], fixes: 0, hints: ['walk', 'bright', 'buka', 'collect', 'road'] }, where: 'ogun' };
    await openWith(page, fresh);
    await page.getByRole('button', { name: 'Play' }).tap();
    await expect.poll(() => screenNow(page)).toBe(where === 'lagos' ? 'city' : 'ogun');
    const sel = where === 'lagos' ? '[role=dialog][aria-label="Lagos"]' : '.ogun-city';
    const rep: Report = { faults: [], notes: [] };
    const hintNotes: string[] = [];
    for (const size of SIZES)
      for (const safe of [0, 24]) {
        await page.setViewportSize(size);
        await setSafe(page, safe);
        await settle(page);
        const at = `${size.width}x${size.height}${safe ? ' safe24' : ''}`;
        const r = await page.evaluate((sel) => {
          const root = document.querySelector(sel)!;
          const btns = [...root.querySelectorAll<HTMLElement>('.city-top button, .city-bottom button')].filter((b) => b.getClientRects().length && getComputedStyle(b).visibility !== 'hidden').map((b) => {
            const q = b.getBoundingClientRect();
            const hit = document.elementFromPoint(q.x + q.width / 2, q.y + q.height / 2);
            return { t: (b.textContent ?? '').trim() || b.getAttribute('aria-label') || '?', x: q.x, y: q.y, w: q.width, h: q.height, tap: !!hit && b.contains(hit) };
          });
          const hint = root.querySelector<HTMLElement>('.city-hint');
          const hv = hint && !hint.hidden && getComputedStyle(hint).visibility !== 'hidden' && hint.getClientRects().length ? hint.getBoundingClientRect() : null;
          const head = root.querySelector<HTMLElement>('.city-head, .city-top h2')?.getBoundingClientRect();
          return { btns, hint: hv ? { t: 'hint', x: hv.x, y: hv.y, w: hv.width, h: hv.height, text: hint!.textContent } : null, head: head ? { t: 'head', x: head.x, y: head.y, w: head.width, h: head.height } : null, vw: innerWidth, vh: innerHeight };
        }, sel);
        if (SHOTS) await page.screenshot({ path: `${SHOTS}/o7re-${where}-city-${at.replace(/[^\w]+/g, '-')}.png` });
        for (const b of r.btns) {
          if (b.h < 43.5 || b.w < 43.5) rep.faults.push(`${at}: "${b.t}" ${b.w.toFixed(0)}x${b.h.toFixed(0)}`);
          if (!b.tap) rep.faults.push(`${at}: "${b.t}" not tappable at its centre`);
          if (b.x < safe - 0.5 || b.x + b.w > r.vw - safe + 0.5 || b.y < safe - 0.5 || b.y + b.h > r.vh - safe + 0.5) rep.faults.push(`${at}: "${b.t}" outside safe area`);
        }
        for (let i = 0; i < r.btns.length; i++) for (let j = i + 1; j < r.btns.length; j++) if (overlaps(r.btns[i]!, r.btns[j]!)) rep.faults.push(`${at}: "${r.btns[i]!.t}" overlaps "${r.btns[j]!.t}"`);
        if (r.hint) {
          for (const b of r.btns) if (overlaps(b, r.hint)) rep.faults.push(`${at}: hint over "${b.t}"`);
          if (r.hint.y < safe - 0.5 || r.hint.y + r.hint.h > r.vh - safe + 0.5) rep.faults.push(`${at}: hint off the safe area`);
          hintNotes.push(`${at}: hint "${r.hint.text}" at y ${r.hint.y.toFixed(0)}${r.head && overlaps(r.head, r.hint) ? ' (over the heading)' : ''}`);
        } else hintNotes.push(`${at}: hint NOT SHOWN`);
      }
    console.log(`== ${where} city\nFAULTS:\n  ${rep.faults.join('\n  ')}\nHINT:\n  ${hintNotes.join('\n  ')}`);
    test.info().annotations.push({ type: 'hint', description: hintNotes.join(' | ') });
    // QA-O7re-1 (fixed): no size is let off, 640 x 200 with safe edges included.
    expect(rep.faults).toEqual([]);
    expect(errors).toEqual([]);
  });

  test(`qa O7re: ${where}'s street run cards (Pause, Out of lives) at every size`, async ({ page }) => {
    test.setTimeout(240_000);
    const errors = errorsOf(page);
    await openWith(page, { ...DONE, where }, where === 'lagos' ? './?level=lagos-1' : './?level=ogun-1');
    await page.getByRole('button', { name: 'Play' }).tap();
    await expect.poll(() => screenNow(page), { timeout: 20_000 }).toBe('play');
    await expect.poll(() => page.evaluate(() => window.__game!.steps)).toBeGreaterThan(5);
    const rep: Report = { faults: [], notes: [] };
    await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
    await page.keyboard.press('Escape');
    await expect.poll(() => screenNow(page)).toBe('pause');
    await sweep(page, `${where} pause`, '.screen .card', rep);
    await waitOutTapLock(page);
    await page.getByRole('button', { name: /^Keep playing$/ }).first().tap();
    await expect.poll(() => screenNow(page)).toBe('play');
    const h = hands(await page.context().newCDPSession(page));
    const btn = await buttonCentres(page);
    await h.down(LEFT, btn.forward.x, btn.forward.y);
    await expect(page.getByRole('dialog', { name: 'Out of lives' })).toBeVisible({ timeout: 120_000 });
    await h.upAll();
    await sweep(page, `${where} out of lives`, '.screen .card', rep);
    report(`${where} run cards`, rep);
    expect(rep.faults).toEqual([]);
    expect(errors).toEqual([]);
  });

  test(`qa O7re: ${where}'s boom card at every size`, async ({ page }) => {
    test.setTimeout(180_000);
    const errors = errorsOf(page);
    if (where === 'lagos') {
      await openWith(page, { v: 2, states: {}, city: { kobo: 0, power: 10, tech: 0, fixed: ['potholes'], fixes: 1, built: ['buka', 'market'], trays: {}, boom: 16, boomCollect: 4, hints: ['walk', 'buka', 'collect', 'bright'], at: { x: 640, y: 760 } } });
      await page.getByRole('button', { name: 'Play' }).tap();
      await expect.poll(() => screenNow(page)).toBe('city');
      await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
      await page.locator('[data-build="lamps"]').tap();
    } else {
      const ogunCity = { fixed: ['potholes', 'dryTaps', 'lightsOut'], fixes: 3, built: ['adire'], trays: {}, boom: 16, hints: ['walk', 'taxOgun', 'road', 'collect', 'bright', 'buka', 'tax'] };
      await openWith(page, { v: 2, states: { lagos: { streets: STREETS, parcel: false, hall: HALL }, ogun: { arrived: true, streets: STREETS, hall: HALL, city: ogunCity } }, city: { ...CITY, tech: 20, power: 20, kobo: 50000 }, where: 'ogun' });
      await page.getByRole('button', { name: 'Play' }).tap();
      await expect.poll(() => screenNow(page)).toBe('ogun');
      const b = page.locator('.ogun-city [data-build="slowInternet"]');
      await expect(b).toBeVisible({ timeout: 10_000 });
      await page.waitForTimeout(2600);
      await b.tap();
    }
    const name = where === 'lagos' ? 'Lagos is booming!' : 'Ogun is booming!';
    const card = page.getByRole('dialog', { name });
    await expect(card).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(800);
    const rep: Report = { faults: [], notes: [] };
    await sweep(page, `${where} boom card`, '.city-card-spot:not([hidden]) .card, [role="dialog"][aria-label$="booming!"] .card, .city-problem', rep);
    report(`${where} boom card`, rep);
    expect(rep.faults).toEqual([]);
    expect(errors).toEqual([]);
  });

  test(`qa O7re: ${where}'s hall win card at every size`, async ({ page }) => {
    test.setTimeout(600_000);
    const errors = errorsOf(page);
    let won = false;
    if (where === 'lagos') {
      await openWith(page, { v: 2, states: { lagos: { streets: STREETS, parcel: false } }, city: CITY }, HALL_URL);
      await startRun(page);
      for (let i = 0; i < 4 && !won; i++) {
        await playHall(page, keyPad(page));
        try {
          await waitForWin(page);
          won = true;
        } catch {
          const over = page.getByRole('dialog', { name: 'Out of lives' });
          await waitOutTapLock(page);
          await over.getByRole('button', { name: 'Play again' }).tap();
        }
      }
    } else {
      await openWith(page, { v: 2, states: { lagos: { streets: STREETS, parcel: false, hall: HALL }, ogun: { arrived: true, streets: STREETS, parcel: true } }, city: CITY, where: 'ogun' });
      await page.getByRole('button', { name: 'Play' }).tap();
      await expect.poll(() => screenNow(page)).toBe('ogun');
      await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
      await page.locator('.ogun-city .city-pin[data-spot="badRoad"]').tap();
      await page.getByRole('dialog', { name: 'Bad road' }).getByRole('button', { name: 'Go to Pothole Hall' }).tap();
      await expect.poll(() => screenNow(page)).toBe('play');
      for (let i = 0; i < 4 && !won; i++) {
        const r = await playPothole(page, keyPad(page));
        if (r.last.a?.defeated) {
          for (let k = 0; k < 900 && (await screenNow(page)) !== 'win'; k++) await page.waitForTimeout(16);
          won = true;
        } else {
          await waitOutTapLock(page);
          await page.getByRole('dialog', { name: 'Out of lives' }).getByRole('button', { name: 'Play again' }).tap();
          await expect.poll(() => screenNow(page)).toBe('play');
        }
      }
    }
    expect(won).toBe(true);
    await expect.poll(() => screenNow(page)).toBe('win');
    await page.waitForTimeout(600);
    const rep: Report = { faults: [], notes: [] };
    await sweep(page, `${where} hall win`, '.screen .card', rep);
    report(`${where} hall win`, rep);
    expect(rep.faults).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test('qa O7re QA-O7re-1 (fixed, Lagos): the first-visit hint at 640 x 200 with 24 px safe edges sits over no bottom-row button', async ({ page }) => {
  await openWith(page, { v: 2, states: {}, city: { kobo: 0, power: 0, tech: 0, fixed: [], fixes: 0, hints: [] } });
  await page.setViewportSize({ width: 640, height: 200 });
  await setSafe(page, 24);
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page)).toBe('city');
  const city = page.getByRole('dialog', { name: 'Lagos', exact: true });
  const hint = city.locator('.city-hint');
  await expect(hint).toBeVisible({ timeout: 10_000 });
  await settle(page);
  const hb = (await hint.boundingBox())!;
  const boxes = await city.locator('.city-top button:visible, .city-bottom button:visible').evaluateAll((els) =>
    els.map((b) => {
      const r = b.getBoundingClientRect();
      return { t: (b.textContent ?? '').trim() || b.getAttribute('aria-label') || '?', x: r.x, y: r.y, w: r.width, h: r.height };
    }),
  );
  expect(boxes.filter((b) => overlaps(b, { t: 'hint', x: hb.x, y: hb.y, w: hb.width, h: hb.height })).map((b) => b.t)).toEqual([]);
});
