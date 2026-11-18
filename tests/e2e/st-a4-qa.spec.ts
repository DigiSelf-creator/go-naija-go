/**
 * qa ST-A4 (docs/style.md part 5, the phase 1 button pass): every changed screen at 851 x 393,
 * 640 x 360, 320 x 240 and 640 x 200. Each button: inside the screen, apart from the others, its
 * words not cut off, 44 px tap size (52 px for a big .go), a visible focus ring, words that meet
 * 4.5 to 1, icon discs hidden from screen readers; switches say on or off in words; one green
 * button per screen. Words under the 15 px floor are listed (known open point, designer's short
 * screen notes) but do not fail. With QA_SHOTS=<folder> it saves colour and greyscale pictures;
 * with QA_NAMES=<file> it writes each screen's spoken names, to compare with the base build.
 */
import { appendFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { PAST_DOUBLE_TAP_MS, screenNow, waitOutTapLock } from './helpers';

const SHOTS = process.env['QA_SHOTS'];
const NAMES = process.env['QA_NAMES'];
const LOOK = '{"skin":4,"hair":1,"outfit":2,"body":1,"age":1}';
const D = { done: true, best: 100 };
const STREETS = { 1: D, 2: D, 3: D };
const HALL = { done: true, best: 0 };
const CITY = { kobo: 125000, power: 3, tech: 1, fixed: ['potholes'], fixes: 1, built: ['buka'], trays: {}, boom: 8, hints: ['walk', 'bright', 'buka', 'collect', 'road', 'tax', 'taxOgun'] };
const DONE = { v: 2, states: { lagos: { streets: STREETS, parcel: false, hall: HALL }, ogun: { arrived: true, streets: STREETS, hall: HALL } }, city: CITY, lane: { best: 700, goals: 1, runs: 2, hints: [] } };
const SIZES = [
  { width: 851, height: 393 },
  { width: 640, height: 360 },
  { width: 320, height: 240 },
  { width: 640, height: 200 },
] as const;
const PHONE = SIZES[0];
/** style.md 4.2: these stay as they are (and are not menu buttons). */
const EXEMPT = '.hud-btn, .lane-hud, .city-stage, .city-map, .city-pin, .city-sign, [data-where], .well-btn, .throw-btn, .lane-btn, .lane-pad, canvas';

type Btn = { t: string; name: string; cls: string; scrolled: boolean; x: number; y: number; w: number; h: number; tap: boolean; clipX: boolean; clipY: boolean; font: number; green: boolean; contrast: number | null; discsHidden: boolean; switchWords: string | null; ring: string };
const overlaps = (a: Btn, b: Btn): boolean => a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5;
const settle = (page: Page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 80)))));

const probe = (page: Page) =>
  page.evaluate((EXEMPT) => {
    const vis = (e: Element) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden' && !e.closest('[hidden], [aria-hidden="true"]');
    const rgb = (s: string) => (s.match(/[\d.]+/g) ?? []).map(Number);
    const lum = (c: number[]) => {
      const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
      return 0.2126 * f(c[0]!) + 0.7152 * f(c[1]!) + 0.0722 * f(c[2]!);
    };
    const spoken = (b: HTMLElement): string => {
      const l = b.getAttribute('aria-label');
      if (l) return l;
      const walk = (n: Node): string => {
        if (n.nodeType === 3) return n.textContent ?? '';
        if (n instanceof Element && n.getAttribute('aria-hidden') === 'true') return '';
        return [...n.childNodes].map(walk).join('');
      };
      return walk(b).replace(/\s+/g, ' ').trim();
    };
    const all = [...document.querySelectorAll<HTMLElement>('button')].filter(vis);
    const buttons = all.filter((b) => !b.closest(EXEMPT) && !b.matches(EXEMPT)).map((b): Btn => {
      const q = b.getBoundingClientRect();
      // Inside a panel that scrolls (the builder's choices): out of its window is scrolled away, not lost.
      let scrolled = false;
      for (let p = b.parentElement; p; p = p.parentElement) {
        const ps = getComputedStyle(p);
        if (/(auto|scroll)/.test(ps.overflowY + ps.overflowX) && (p.scrollHeight > p.clientHeight + 1 || p.scrollWidth > p.clientWidth + 1)) {
          const r = p.getBoundingClientRect();
          if (q.top < r.top - 0.5 || q.bottom > r.bottom + 0.5 || q.left < r.left - 0.5 || q.right > r.right + 0.5) scrolled = true;
        }
      }
      const hit = document.elementFromPoint(q.x + q.width / 2, q.y + q.height / 2);
      // Behind a card that is open over its screen (the city row under the Travel card): not on this screen now.
      const over = hit && !b.contains(hit) ? hit.closest('.card, .road-card, [role="dialog"], .travel-dim, .road-dim') : null;
      if (over && !over.contains(b)) scrolled = true;
      const cs = getComputedStyle(b);
      // The smallest words on it, from each piece of text (not the hidden disc).
      let font = Infinity;
      const tw = document.createTreeWalker(b, NodeFilter.SHOW_TEXT);
      for (let n = tw.nextNode(); n; n = tw.nextNode()) {
        const p = n.parentElement!;
        if ((n.textContent ?? '').trim() && !p.closest('[aria-hidden="true"]') && vis(p)) font = Math.min(font, parseFloat(getComputedStyle(p).fontSize));
      }
      const after = getComputedStyle(b, '::after').content;
      if (after && after !== 'none' && /\w/.test(after)) font = Math.min(font, parseFloat(getComputedStyle(b, '::after').fontSize));
      const words = b.querySelector<HTMLElement>('.w') ?? b;
      const bg = rgb(cs.backgroundColor);
      const fg = rgb(cs.color);
      const opaque = bg.length === 3 || (bg.length === 4 && bg[3] === 1);
      const contrast = opaque && font !== Infinity ? (Math.max(lum(fg), lum(bg)) + 0.05) / (Math.min(lum(fg), lum(bg)) + 0.05) : null;
      const isSwitch = b.getAttribute('role') === 'switch' || b.hasAttribute('data-on') || b.classList.contains('music-switch');
      const shown = (b.innerText + ' ' + (after && after !== 'none' ? after : '')).toLowerCase();
      return {
        t: (b.textContent ?? '').trim().slice(0, 40) || b.getAttribute('aria-label') || '?',
        name: spoken(b),
        cls: b.className,
        scrolled,
        x: q.x, y: q.y, w: q.width, h: q.height,
        tap: !!hit && b.contains(hit),
        clipX: words.scrollWidth > words.clientWidth + 1,
        clipY: words.scrollHeight > words.clientHeight + 1,
        font,
        green: cs.backgroundColor === 'rgb(14, 122, 62)',
        contrast,
        discsHidden: [...b.querySelectorAll('.ic, svg')].every((d) => d.closest('[aria-hidden="true"]') !== null),
        switchWords: isSwitch ? (/\bon\b/.test(shown) ? 'on' : /\boff\b/.test(shown) ? 'off' : '') : null,
        ring: '',
      };
    });
    return { vw: innerWidth, vh: innerHeight, sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight, buttons };
  }, EXEMPT);

/** The focus ring each button gets from a keyboard (Tab first, so :focus-visible applies). */
async function rings(page: Page): Promise<string[]> {
  await page.keyboard.press('Shift');
  return page.evaluate((EXEMPT) => {
    const vis = (e: Element) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden' && !e.closest('[hidden], [aria-hidden="true"]');
    const out: string[] = [];
    const was = document.activeElement as HTMLElement | null;
    for (const b of [...document.querySelectorAll<HTMLElement>('button')].filter(vis).filter((b) => !b.closest(EXEMPT) && !b.matches(EXEMPT))) {
      b.focus({ focusVisible: true } as FocusOptions);
      const cs = getComputedStyle(b);
      if (!(cs.outlineStyle === 'solid' && parseFloat(cs.outlineWidth) >= 3 && cs.outlineColor === 'rgb(43, 89, 195)')) out.push(`"${(b.textContent ?? '').trim() || b.getAttribute('aria-label')}" ring ${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`);
    }
    was?.focus();
    return out;
  }, EXEMPT);
}

type Report = { faults: string[]; small: string[]; short: string[] };
const rep: Report = { faults: [], small: [], short: [] };

async function audit(page: Page, name: string, sizes: readonly { width: number; height: number }[] = SIZES): Promise<void> {
  for (const size of sizes) {
    await page.setViewportSize(size);
    await settle(page);
    const at = `${name} ${size.width}x${size.height}`;
    const file = at.replace(/[^\w]+/g, '-');
    if (SHOTS) {
      await page.screenshot({ path: `${SHOTS}/st-a4-${file}.png` });
      await page.evaluate(() => (document.documentElement.style.filter = 'grayscale(1)'));
      await page.screenshot({ path: `${SHOTS}/st-a4-${file}-grey.png` });
      await page.evaluate(() => (document.documentElement.style.filter = ''));
    }
    const l = await probe(page);
    const bad = (m: string) => rep.faults.push(`${at}: ${m}`);
    if (l.sw > l.vw + 1) bad(`sideways scroll ${l.sw} > ${l.vw}`);
    if (NAMES && size === PHONE) appendFileSync(NAMES, `${name}: ${l.buttons.map((b) => b.name).join(' | ')}\n`);
    let greens = 0;
    for (const b of l.buttons) {
      const big = /(^|\s)go(\s|$)/.test(b.cls) && !/intro-go|update/.test(b.cls);
      if (b.h < 43.5 || b.w < 43.5) bad(`"${b.t}" is ${b.w.toFixed(1)}x${b.h.toFixed(1)} (needs 44)`);
      // A big button under 52 px: older rules (the 2 x 2 Pause grid is 48 px, short screens 44 px), listed, not failed.
      else if (big && b.h < 51.5) rep.short.push(`${at}: big "${b.t}" is ${b.h.toFixed(1)} px tall (52 wanted)`);
      if (b.scrolled) continue;
      if (!b.tap) bad(`"${b.t}" not tappable at its centre`);
      if (b.x < -0.5 || b.y < -0.5 || b.x + b.w > l.vw + 0.5 || b.y + b.h > l.vh + 0.5) bad(`"${b.t}" off screen (${b.x.toFixed(0)},${b.y.toFixed(0)} ${b.w.toFixed(0)}x${b.h.toFixed(0)})`);
      if (b.clipX || b.clipY) bad(`"${b.t}" words cut off (${b.clipX ? 'sideways' : ''}${b.clipY ? ' down' : ''})`);
      if (!b.discsHidden) bad(`"${b.t}" has a picture not hidden from screen readers`);
      if (b.contrast !== null && b.contrast < 4.5) bad(`"${b.t}" contrast ${b.contrast.toFixed(2)}`);
      if (b.switchWords === '') bad(`switch "${b.t}" does not say on or off in words`);
      if (b.font < 15 && b.font !== Infinity) rep.small.push(`${at}: "${b.t}" ${b.font}px`);
      if (b.green) greens++;
    }
    if (greens > 1) bad(`${greens} green buttons: ${l.buttons.filter((b) => b.green).map((b) => b.t).join(', ')}`);
    const seen = l.buttons.filter((b) => !b.scrolled);
    for (let i = 0; i < seen.length; i++) for (let j = i + 1; j < seen.length; j++) if (overlaps(seen[i]!, seen[j]!)) bad(`"${seen[i]!.t}" overlaps "${seen[j]!.t}"`);
    for (const r of await rings(page)) bad(r);
  }
  await page.setViewportSize(PHONE);
  await settle(page);
}

function errorsOf(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}
async function openWith(page: Page, progress: object | null, url = './', intro = true): Promise<void> {
  await page.goto(url);
  await page.evaluate(
    ({ look, p, intro }) => {
      localStorage.clear();
      if (p) {
        localStorage.setItem('gidi-look', look);
        localStorage.setItem('gidi-progress', p);
      }
      if (intro) localStorage.setItem('gidi-intro', '"seen"');
      localStorage.setItem('gidi-busRide', 'false');
    },
    { look: LOOK, p: progress ? JSON.stringify(progress) : null, intro },
  );
  await page.reload();
}
const done = (title: string) => {
  console.log(`== ${title}\nFAULTS (${rep.faults.length}):\n  ${rep.faults.join('\n  ')}\nUNDER 15 PX (${rep.small.length}, known open point):\n  ${rep.small.join('\n  ')}\nBIG BUTTONS UNDER 52 PX (${rep.short.length}):\n  ${rep.short.join('\n  ')}`);
  test.info().annotations.push({ type: 'big under 52 px', description: rep.short.join(' | ') || 'none' });
  test.info().annotations.push({ type: 'under 15 px (known)', description: rep.small.join(' | ') || 'none' });
  const f = [...rep.faults];
  rep.faults.length = 0;
  rep.small.length = 0;
  rep.short.length = 0;
  expect(f).toEqual([]);
};

test.describe.configure({ mode: 'parallel' });

test('qa ST-A4: title, Settings, builder and the intro', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = errorsOf(page);
  await openWith(page, DONE);
  await expect.poll(() => screenNow(page)).toBe('title');
  await audit(page, 'title');
  await page.getByRole('button', { name: 'Settings' }).tap();
  const settings = page.getByRole('dialog', { name: 'Settings' });
  await expect(settings).toBeVisible();
  await audit(page, 'settings');
  // Switches on: their tick, edge and words.
  await waitOutTapLock(page);
  await settings.getByRole('switch', { name: 'Gentle mode: 5 lives instead of 3' }).tap();
  await expect(settings.getByRole('switch', { name: 'Gentle mode: 5 lives instead of 3' })).toHaveAttribute('aria-checked', 'true');
  await audit(page, 'settings gentle on', [PHONE, SIZES[2]]);
  await settings.getByRole('switch', { name: 'Gentle mode: 5 lives instead of 3' }).tap();
  await settings.getByRole('button', { name: 'Back' }).tap();
  await expect.poll(() => screenNow(page)).toBe('title');
  // Builder (a saved hero opens it from "Hero" in the city; a fresh visit from the title).
  await openWith(page, null);
  await page.getByRole('button', { name: 'Make your hero' }).tap();
  await expect.poll(() => screenNow(page)).toBe('builder');
  await audit(page, 'builder');
  // The intro story, first visit: Skip, then Go at the end.
  await openWith(page, null, './', false);
  await page.getByRole('button', { name: 'Make your hero' }).tap();
  await expect.poll(() => screenNow(page)).toBe('intro');
  await audit(page, 'intro');
  done('title, settings, builder, intro');
  expect(errors).toEqual([]);
});

for (const where of ['lagos', 'ogun'] as const) {
  test(`qa ST-A4: ${where} city, Travel card, Nigeria's wheel, road and a stop card`, async ({ page }) => {
    test.setTimeout(300_000);
    const errors = errorsOf(page);
    await openWith(page, { ...DONE, where });
    await page.getByRole('button', { name: 'Play' }).tap();
    const home = where === 'lagos' ? 'city' : 'ogun';
    await expect.poll(() => screenNow(page)).toBe(home);
    await page.waitForTimeout(2500); // first-visit lines and the place box settle
    await audit(page, `${where} city`);
    const city = where === 'lagos' ? page.getByRole('dialog', { name: 'Lagos', exact: true }) : page.locator('.ogun-city');
    // Sound switch: words say on and off.
    const sound = city.getByRole('button', { name: /^Sound: (on|off)$/ });
    const before = await sound.textContent();
    await waitOutTapLock(page);
    await sound.tap();
    await expect(sound).not.toHaveText(before!);
    await audit(page, `${where} city sound flipped`, [PHONE, SIZES[2]]);
    await sound.tap();
    await waitOutTapLock(page);
    await city.getByRole('button', { name: 'Travel' }).tap();
    await expect(page.locator('.travel-place').first()).toBeVisible();
    await audit(page, `${where} travel card`);
    await page.getByRole('button', { name: /^(Back|Close|Not now)$/ }).first().tap();
    await expect.poll(() => screenNow(page)).toBe(home);
    await waitOutTapLock(page);
    await city.getByRole('button', { name: "Nigeria's wheel" }).tap();
    await expect.poll(() => screenNow(page)).not.toBe(home);
    await page.waitForTimeout(600);
    await audit(page, `${where} wheel`);
    await page.getByRole('button', { name: /^(Back|Close)$/ }).first().tap();
    await expect.poll(() => screenNow(page)).toBe(home);
    await waitOutTapLock(page);
    await city.getByRole('button', { name: 'Challenge road' }).first().tap();
    await expect.poll(() => screenNow(page)).toBe('road');
    await page.waitForTimeout(600);
    await audit(page, `${where} road`);
    const road = page.getByRole('region', { name: 'Challenge road' });
    const first = await road.locator('[data-where]').first().getAttribute('data-where');
    await waitOutTapLock(page);
    await road.locator(`[data-where="${first}"]`).tap();
    await expect(page.locator('.road-card')).toBeVisible();
    await audit(page, `${where} stop card`);
    done(`${where} city screens`);
    expect(errors).toEqual([]);
  });
}

test('qa ST-A4: street Pause card and the run HUD counters', async ({ page }) => {
  test.setTimeout(180_000);
  const errors = errorsOf(page);
  await openWith(page, DONE, './?level=lagos-1');
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page), { timeout: 20_000 }).toBe('play');
  await expect.poll(() => page.evaluate(() => window.__game!.steps)).toBeGreaterThan(5);
  // HUD counters: cream chips, no taller than the old 32 px box, hard lip only.
  for (const size of SIZES) {
    await page.setViewportSize(size);
    await settle(page);
    const chips = await page.locator('.hud-left > span:visible').evaluateAll((els) =>
      els.map((e) => {
        const r = e.getBoundingClientRect();
        const cs = getComputedStyle(e);
        return { h: r.height, w: r.width, shadow: cs.boxShadow };
      }),
    );
    expect(chips.length, `${size.width}x${size.height} HUD chips`).toBeGreaterThan(0);
    for (const c of chips) {
      expect(c.h, `${size.width}x${size.height} chip height`).toBeLessThanOrEqual(32.5);
      expect(c.shadow, 'no soft lip on a HUD chip').not.toContain('8px');
    }
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/st-a4-hud-${size.width}x${size.height}.png` });
  }
  await page.setViewportSize(PHONE);
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.keyboard.press('Escape');
  await expect.poll(() => screenNow(page)).toBe('pause');
  await audit(page, 'street pause');
  done('street pause');
  expect(errors).toEqual([]);
});

test('qa ST-A4: lane Pause card', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = errorsOf(page);
  await openWith(page, DONE, './?level=lagos-lane');
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => page.evaluate(() => window.__lane?.stage), { timeout: 20_000 }).toBe('play');
  await page.keyboard.press('KeyP');
  await expect(page.getByRole('dialog', { name: 'Paused' })).toBeVisible();
  await audit(page, 'lane pause');
  done('lane pause');
  expect(errors).toEqual([]);
});

test('qa ST-A4 break: the shared Sound and Music switches hammered by touch and the phone turned mid-way agree with what is saved', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = errorsOf(page);
  await openWith(page, DONE);
  await expect.poll(() => screenNow(page)).toBe('title');
  const state = () =>
    page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('button')].filter((b) => /^(Sound|Music): /.test(b.textContent ?? '')).map((b) => ({
        words: (b.textContent ?? '').trim(),
        on: b.dataset['on'],
        tick: getComputedStyle(b, '::after').content.includes('✓'),
        edge: parseFloat(getComputedStyle(b).borderTopWidth),
        // A plain cream button beside it: the off edge (Chrome snaps 2.5 and 3.5 px to the screen's pixels).
        plain: parseFloat(getComputedStyle(document.querySelector<HTMLElement>('button.minor:not([data-on]):not([role])')!).borderTopWidth),
        discs: b.querySelectorAll('.ic').length,
        sound: localStorage.getItem('gidi-sound'),
        music: localStorage.getItem('gidi-music'),
      })),
    );
  for (const [i, name] of ['Sound', 'Music'].entries()) {
    const sw = page.getByRole('button', { name: new RegExp(`^${name}: (on|off)$`) });
    const box = (await sw.boundingBox())!;
    // 13 taps, 40 ms apart (most land inside the tap lock), the phone turned after the sixth.
    for (let t = 0; t < 13; t++) {
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
      if (t === 5) await page.setViewportSize({ width: 393, height: 851 });
      if (t === 6) await page.setViewportSize(PHONE);
      await page.waitForTimeout(40);
    }
    await waitOutTapLock(page);
    const s = (await state())[i]!;
    const on = s.words.endsWith(': on');
    expect(s.on, `${name}: data-on matches the words`).toBe(String(on));
    expect(s.tick, `${name}: tick only when on`).toBe(on);
    if (on) expect(s.edge, `${name}: on, a thicker edge`).toBeGreaterThan(s.plain);
    else expect(s.edge, `${name}: off, the plain edge`).toBe(s.plain);
    expect(s.discs, `${name}: one disc, not two`).toBe(1);
    expect(i === 0 ? s.sound : s.music, `${name}: saved`).toBe(String(on));
  }
  expect(errors).toEqual([]);
});
