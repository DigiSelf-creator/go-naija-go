/**
 * B4 (qa): the hero builder on the phone profile, by touch. Exact words, every combo
 * on screen, fast taps, tap target sizes and spacing, sideways and upright, storage
 * that fails in different ways, and no network.
 */
import { expect, test, type Page } from '@playwright/test';
import { PAST_DOUBLE_TAP_MS } from './helpers';

const look = (page: Page) => page.evaluate(() => window.__game!.look);
const builderDialog = (page: Page) => page.getByRole('dialog', { name: 'Make your hero' });

function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  return errors;
}

/** The visible words of an element, one entry per line, ticks taken out. */
async function lines(page: Page, selector: string): Promise<string[]> {
  const text = await page.locator(selector).innerText();
  return text
    .split('\n')
    .map((l) => l.replace(/✓/g, '').trim())
    .filter(Boolean);
}

test('words on the title and builder match docs/design.md exactly', async ({ page }) => {
  await page.goto('./');
  expect(await lines(page, '.screen .card')).toEqual([
    'Gbese!',
    'Run your street. Clear the jam.',
    'Press the arrows to walk. Keep holding to run. Press Jump to jump. Press it again in the air to jump again. Hold it to jump higher.',
    'Make your hero',
    'Credits',
    'Sound: on',
    'Gentle mode: 5 lives instead of 3',
  ]);
  await page.getByRole('button', { name: 'Make your hero' }).tap();
  const words = (await lines(page, '.screen .card')).join(' | ');
  expect(words).toBe(
    [
      'Make your hero',
      'Male or female',
      'Male',
      'Female',
      'Age',
      'Teen',
      'Adult',
      'Elder',
      'Skin',
      'Hair',
      'Low cut',
      'Afro',
      'Braids',
      'Gele',
      'Headscarf',
      'Outfit',
      'Green jersey',
      'Ankara',
      'School uniform',
      'Agbada',
      'Kaftan',
      'Your hero is saved on this phone only.',
      'Start running',
    ].join(' | '),
  );
  // Spoken names: swatches have no visible words, so each has its own label.
  const d = builderDialog(page);
  for (let i = 1; i <= 5; i++) await expect(d.getByRole('button', { name: `Skin tone ${i}`, exact: true })).toHaveCount(1);
  for (const row of ['Male or female', 'Age', 'Skin', 'Hair', 'Outfit']) await expect(d.getByRole('group', { name: row, exact: true })).toBeVisible();
  // Swatch colours are the design.md colours, in order.
  const colours = await page.$$eval('[data-part="skin"]', (els) => els.map((e) => getComputedStyle(e).backgroundColor));
  expect(colours).toEqual(['rgb(241, 201, 165)', 'rgb(217, 161, 114)', 'rgb(168, 105, 63)', 'rgb(122, 74, 42)', 'rgb(75, 44, 26)']);

  // With a saved hero, the title says "Start running" and offers "Change hero".
  await d.getByRole('button', { name: 'Start running' }).tap();
  await page.reload();
  expect(await lines(page, '.screen .card')).toEqual([
    'Gbese!',
    'Run your street. Clear the jam.',
    'Press the arrows to walk. Keep holding to run. Press Jump to jump. Press it again in the air to jump again. Hold it to jump higher.',
    'Start running',
    'Change hero',
    'Credits',
    'Sound: on',
    'Gentle mode: 5 lives instead of 3',
  ]);
});

test('all 125 looks show in the preview by touch, each one different, no errors', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = watchErrors(page);
  await page.goto('./');
  await page.getByRole('button', { name: 'Make your hero' }).tap();
  const d = builderDialog(page);
  // Hash the preview after two animation frames, so it shows the new look.
  const previewHash = () =>
    page.evaluate(
      () =>
        new Promise<string>((resolve) => {
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              const c = document.querySelector<HTMLCanvasElement>('canvas.preview')!;
              const data = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
              let h = 2166136261;
              let ink = 0;
              for (let i = 0; i < data.length; i += 4) {
                h = Math.imul(h ^ data[i]! ^ (data[i + 1]! << 8) ^ (data[i + 2]! << 16) ^ (data[i + 3]! << 24), 16777619);
                if (data[i + 3]! > 0) ink++;
              }
              resolve(`${h >>> 0}:${ink}`);
            }),
          );
        }),
    );
  const seen = new Map<string, string>();
  for (let s = 0; s < 5; s++) {
    await d.locator(`[data-part="skin"][data-index="${s}"]`).tap();
    for (let hr = 0; hr < 5; hr++) {
      await d.locator(`[data-part="hair"][data-index="${hr}"]`).tap();
      for (let o = 0; o < 5; o++) {
        await d.locator(`[data-part="outfit"][data-index="${o}"]`).tap();
        expect(await look(page)).toEqual({ skin: s, hair: hr, outfit: o, body: 0, age: 1 });
        // (A blink frame only changes the hash of this combo; it cannot make two combos match.)
        const a = await previewHash();
        const ink = Number(a.split(':')[1]);
        expect(ink, `look ${s}/${hr}/${o} drew nothing`).toBeGreaterThan(500);
        const key = `${s}/${hr}/${o}`;
        const clash = seen.get(a);
        expect(clash, `look ${key} looks the same as ${clash}`).toBeUndefined();
        seen.set(a, key);
      }
    }
  }
  expect(seen.size).toBe(125);
  expect(await page.evaluate(() => localStorage.getItem('gidi-look'))).toBe('{"skin":4,"hair":4,"outfit":4,"body":0,"age":1}');
  expect(errors).toEqual([]);
});

test('very fast taps on the options: one choice per row, the last tap wins, saved', async ({ page }) => {
  // A screen tall enough that every option shows without scrolling (the rows scroll on short ones).
  await page.setViewportSize({ width: 900, height: 600 });
  const errors = watchErrors(page);
  await page.goto('./');
  await page.getByRole('button', { name: 'Make your hero' }).tap();
  const d = builderDialog(page);
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS); // so no tap is the second half of a double tap
  const centres = await page.$$eval('[data-part]', (els) =>
    els.map((e) => {
      const r = e.getBoundingClientRect();
      return { part: (e as HTMLElement).dataset['part']!, index: Number((e as HTMLElement).dataset['index']), x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }),
  );
  expect(centres.every((c) => c.y > 0 && c.y < 600)).toBe(true);
  // design.md S2.3 first looks, FIRST_LOOKS[body][age]: until Hair or Outfit is tapped they follow.
  const first = [
    [{ hair: 0, outfit: 2 }, { hair: 0, outfit: 0 }, { hair: 0, outfit: 3 }],
    [{ hair: 2, outfit: 2 }, { hair: 2, outfit: 1 }, { hair: 3, outfit: 1 }],
  ];
  // A fixed, mixed order (no randomness, so a failure repeats).
  const expected: Record<string, number> = { skin: 2, hair: 0, outfit: 0, body: 0, age: 1 };
  let styled = false;
  for (let i = 0; i < 60; i++) {
    const t = centres[(i * 7 + 3) % centres.length]!;
    await page.touchscreen.tap(t.x, t.y); // no waits in between
    expected[t.part] = t.index;
    if (t.part === 'hair' || t.part === 'outfit') styled = true;
    if ((t.part === 'body' || t.part === 'age') && !styled) Object.assign(expected, first[expected['body']!]![expected['age']!]);
  }
  await expect.poll(() => look(page)).toEqual(expected);
  for (const part of ['body', 'age', 'skin', 'hair', 'outfit']) {
    await expect(d.locator(`[data-part="${part}"][aria-pressed="true"]`)).toHaveCount(1);
    await expect(d.locator(`[data-part="${part}"][aria-pressed="true"]`)).toHaveAttribute('data-index', String(expected[part]));
  }
  expect(JSON.parse((await page.evaluate(() => localStorage.getItem('gidi-look')))!)).toEqual(expected);
  // Taps in the builder never start the run or move the hero.
  expect(await page.evaluate(() => window.__game!.screen)).toBe('builder');
  expect(await page.evaluate(() => window.__game!.steps)).toBe(0);
  expect(errors).toEqual([]);
});

test('tap targets: swatches 48 px, chips 44 px tall, all on screen; the pick has a ring and a tick', async ({ page }) => {
  for (const vp of [
    { width: 851, height: 393 },
    { width: 393, height: 851 },
    { width: 568, height: 320 },
  ]) {
    await page.setViewportSize(vp);
    await page.goto('./');
    await page.getByRole('button', { name: 'Make your hero' }).tap();
    const boxes = await page.$$eval('.screen button', (els) =>
      els.map((e) => {
        const r = e.getBoundingClientRect();
        return { name: e.getAttribute('aria-label') ?? e.textContent ?? '', part: (e as HTMLElement).dataset['part'] ?? '', x: r.x, y: r.y, w: r.width, h: r.height };
      }),
    );
    expect(boxes).toHaveLength(21);
    for (const b of boxes) {
      expect(b.w, `${b.name} width at ${vp.width}x${vp.height}`).toBeGreaterThanOrEqual(44);
      expect(b.h, `${b.name} height at ${vp.width}x${vp.height}`).toBeGreaterThanOrEqual(44);
      // Fully on screen, sideways: nothing to scroll to sideways.
      expect(b.x, `${b.name} left`).toBeGreaterThanOrEqual(0);
      expect(b.x + b.w, `${b.name} right`).toBeLessThanOrEqual(vp.width);
    }
    for (const b of boxes.filter((x) => x.part === 'skin')) {
      expect(b.w).toBeCloseTo(48, 0);
      expect(b.h).toBeCloseTo(48, 0);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(vp.width);
  }
  // The chosen one is not only a colour: a thick dark ring and a tick.
  const marks = await page.evaluate(() => {
    const sw = document.querySelector<HTMLElement>('[data-part="skin"][aria-pressed="true"]')!;
    const chip = document.querySelector<HTMLElement>('[data-part="hair"][aria-pressed="true"]')!;
    const off = document.querySelector<HTMLElement>('[data-part="hair"][aria-pressed="false"]')!;
    return {
      swatchTick: getComputedStyle(sw, '::after').content,
      swatchRing: getComputedStyle(sw).borderTopWidth,
      chipTick: getComputedStyle(chip, '::before').content,
      chipRing: getComputedStyle(chip).borderTopWidth,
      offTick: getComputedStyle(off, '::before').content,
    };
  });
  expect(marks.swatchTick).toContain('✓');
  expect(parseFloat(marks.swatchRing)).toBeGreaterThanOrEqual(3);
  expect(marks.chipTick).toContain('✓');
  expect(parseFloat(marks.chipRing)).toBeGreaterThanOrEqual(3);
  expect(marks.offTick).toBe('none');
});

test('builder targets are at least 8 px apart, upright and sideways', async ({ page }) => {
  // design.md, Hero builder, Accessibility: "8 px between targets".
  for (const vp of [
    { width: 851, height: 393 },
    { width: 393, height: 851 },
    { width: 568, height: 320 },
  ]) {
    await page.setViewportSize(vp);
    await page.goto('./');
    await page.getByRole('button', { name: 'Make your hero' }).tap();
    const boxes = await page.$$eval('.screen button', (els) =>
      els.map((e) => {
        const r = e.getBoundingClientRect();
        return { name: e.getAttribute('aria-label') ?? e.textContent ?? '', x: r.x, y: r.y, w: r.width, h: r.height };
      }),
    );
    // No two targets closer than 8 px (edge to edge), design.md Hero builder: Accessibility.
    const tooClose: string[] = [];
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i]!;
        const c = boxes[j]!;
        const gapX = Math.max(c.x - (a.x + a.w), a.x - (c.x + c.w));
        const gapY = Math.max(c.y - (a.y + a.h), a.y - (c.y + c.h));
        const gap = Math.max(gapX, gapY);
        if (gap < 7.5) tooClose.push(`${a.name} / ${c.name}: ${gap.toFixed(1)} px`);
      }
    }
    expect(tooClose, `targets under 8 px apart at ${vp.width}x${vp.height}`).toEqual([]);
  }
});

test('builder fits a tiny 320x240 screen: nothing cut off at the side, Start running reachable', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 240 });
  await page.goto('./');
  await page.getByRole('button', { name: 'Make your hero' }).tap();
  const cut = await page.$$eval('.screen button', (els) =>
    els.filter((e) => e.getBoundingClientRect().right > innerWidth + 0.5).map((e) => e.getAttribute('aria-label') ?? e.textContent),
  );
  expect(cut, 'buttons past the right edge').toEqual([]);
  const card = await page.locator('.screen .card').evaluate((c) => ({ sw: c.scrollWidth, cw: c.clientWidth }));
  expect(card.sw, 'the card scrolls sideways').toBeLessThanOrEqual(card.cw);
  // gamedev (B4 fix): on this tiny screen Start running sits where "Make your hero" was, so an
  // instant tap there is the double-tap guard's case; a person's tap comes later than 300 ms.
  await page.waitForTimeout(350);
  await builderDialog(page).getByRole('button', { name: 'Start running' }).tap();
  await expect.poll(() => page.evaluate(() => window.__game!.screen)).toBe('play');
});

test('a fast double tap on "Make your hero" does not pick an option by itself', async ({ page }) => {
  // The builder opens under the finger; the second tap of an eager double tap must not
  // land on a chip. Checked across the button on a few common phone sizes.
  const picked: string[] = [];
  for (const vp of [
    { width: 851, height: 393 },
    { width: 727, height: 393 },
    { width: 393, height: 851 },
  ]) {
    await page.setViewportSize(vp);
    for (const fx of [0.25, 0.5, 0.75]) {
      await page.goto('./');
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      const box = (await page.getByRole('button', { name: 'Make your hero' }).boundingBox())!;
      const x = box.x + box.width * fx;
      const y = box.y + box.height / 2;
      await page.touchscreen.tap(x, y);
      await page.touchscreen.tap(x, y); // the second tap of a double tap
      await expect(builderDialog(page)).toBeVisible();
      const l = await look(page);
      if (l.skin !== 2 || l.hair !== 0 || l.outfit !== 0) picked.push(`${vp.width}x${vp.height} at ${fx}: ${JSON.stringify(l)}`);
    }
  }
  expect(picked, 'looks changed by the second tap').toEqual([]);
});

test('the builder keeps the look when the phone turns, both ways', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('./');
  await page.getByRole('button', { name: 'Make your hero' }).tap();
  const d = builderDialog(page);
  // gamedev (I2): Skin tone 5 now sits where "Make your hero" was; a person's next tap is later than 300 ms.
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await d.getByRole('button', { name: 'Gele' }).tap();
  await d.getByRole('button', { name: 'Skin tone 5' }).tap();
  await page.setViewportSize({ width: 393, height: 851 });
  // Upright: preview on top, no "turn sideways" note on a menu, choices kept.
  await expect(page.getByText('Turn your phone sideways to play.')).toBeHidden();
  await expect(d).toBeVisible();
  const preview = (await page.locator('canvas.preview').boundingBox())!;
  const skinRow = (await d.getByRole('group', { name: 'Skin' }).boundingBox())!;
  expect(preview.y + preview.height).toBeLessThanOrEqual(skinRow.y);
  await d.getByRole('button', { name: 'Agbada' }).tap();
  await page.setViewportSize({ width: 851, height: 393 });
  // Sideways: preview on the left of the choices.
  const p2 = (await page.locator('canvas.preview').boundingBox())!;
  const r2 = (await d.getByRole('group', { name: 'Skin' }).boundingBox())!;
  expect(p2.x + p2.width).toBeLessThanOrEqual(r2.x);
  expect(await look(page)).toEqual({ skin: 4, hair: 3, outfit: 3, body: 0, age: 1 });
  for (const name of ['Gele', 'Skin tone 5', 'Agbada']) await expect(d.getByRole('button', { name })).toHaveAttribute('aria-pressed', 'true');
  await d.getByRole('button', { name: 'Start running' }).tap();
  await expect.poll(() => page.evaluate(() => window.__game!.screen)).toBe('play');
  await expect.poll(() => page.evaluate(() => window.__game!.steps)).toBeGreaterThan(5);
  expect(errors).toEqual([]);
});

test('the run draws the picked look, not the default', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Make your hero' }).tap();
  const d = builderDialog(page);
  await d.getByRole('button', { name: 'Kaftan' }).tap();
  await d.getByRole('button', { name: 'Headscarf' }).tap();
  await d.getByRole('button', { name: 'Start running' }).tap();
  await expect.poll(() => page.evaluate(() => window.__game!.steps)).toBeGreaterThan(5);
  // Count kaftan blue (#2f5d8a), headscarf teal (#1aa39a) and jersey green (#0e7a3e) on the run canvas.
  const count = await page.evaluate(() => {
    const c = document.querySelector<HTMLCanvasElement>('canvas#game')!;
    const data = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
    const n = { kaftan: 0, scarf: 0, jersey: 0 };
    for (let i = 0; i < data.length; i += 4) {
      const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
      if (r === 0x2f && g === 0x5d && b === 0x8a) n.kaftan++;
      if (r === 0x1a && g === 0xa3 && b === 0x9a) n.scarf++;
      if (r === 0x0e && g === 0x7a && b === 0x3e) n.jersey++;
    }
    return n;
  });
  expect(count.kaftan).toBeGreaterThan(50);
  expect(count.scarf).toBeGreaterThan(20);
  expect(count.jersey).toBe(0);
});

test('storage that fails on write (phone full): the look lasts this visit and the game runs', async ({ page }) => {
  await page.addInitScript(() => {
    const real = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k: string, v: string) {
      if (k.startsWith('gidi-') && k !== 'gidi-probe') throw new DOMException('Quota exceeded', 'QuotaExceededError');
      return real.call(this, k, v);
    };
  });
  const errors = watchErrors(page);
  await page.goto('./');
  await page.getByRole('button', { name: 'Make your hero' }).tap();
  const d = builderDialog(page);
  await d.getByRole('button', { name: 'Braids' }).tap();
  await d.getByRole('button', { name: 'School uniform' }).tap();
  await expect(d.getByRole('button', { name: 'Braids' })).toHaveAttribute('aria-pressed', 'true');
  expect(await look(page)).toEqual({ skin: 2, hair: 2, outfit: 2, body: 0, age: 1 });
  await d.getByRole('button', { name: 'Start running' }).tap();
  await expect.poll(() => page.evaluate(() => window.__game!.steps)).toBeGreaterThan(10);
  await page.touchscreen.tap(600, 150);
  await expect.poll(() => page.evaluate(() => window.__game!.hero.grounded), { intervals: [16] }).toBe(false);
  // Next visit: nothing was saved, so the game opens fresh and still works.
  await page.reload();
  await expect(page.getByRole('button', { name: 'Make your hero' })).toBeVisible();
  expect(await look(page)).toEqual({ skin: 2, hair: 0, outfit: 0, body: 0, age: 1 });
  expect(errors).toEqual([]);
});

test('storage blocked: every visit opens on "Make your hero" and nothing breaks', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      },
    });
  });
  const errors = watchErrors(page);
  for (let visit = 0; visit < 2; visit++) {
    await page.goto('./');
    await expect(page.getByRole('button', { name: 'Make your hero' })).toBeVisible();
    // Settings still toggle for this visit.
    await page.getByRole('button', { name: 'Sound: on' }).tap();
    await expect(page.getByRole('button', { name: 'Sound: off' })).toBeVisible();
    await page.getByRole('button', { name: 'Make your hero' }).tap();
    await builderDialog(page).getByRole('button', { name: 'Afro' }).tap();
    await builderDialog(page).getByRole('button', { name: 'Start running' }).tap();
    await expect.poll(() => page.evaluate(() => window.__game!.steps)).toBeGreaterThan(5);
    expect(await look(page)).toEqual({ skin: 2, hair: 1, outfit: 0, body: 0, age: 1 });
  }
  expect(errors).toEqual([]);
});

test('broken saves on the phone never break the game', async ({ page }) => {
  const errors = watchErrors(page);
  for (const [raw, title] of [
    ['{not json', 'Make your hero'],
    ['null', 'Make your hero'],
    ['[1,2,3]', 'Make your hero'],
    ['{"skin":"x","hair":0,"outfit":0}', 'Make your hero'],
    ['{"skin":99,"hair":-1,"outfit":2}', 'Start running'],
  ] as const) {
    await page.goto('./');
    await page.evaluate((v) => localStorage.setItem('gidi-look', v), raw);
    await page.reload();
    await expect(page.locator('.screen .go'), raw).toHaveText(title);
    const l = await look(page);
    expect(l.skin).toBeGreaterThanOrEqual(0);
    expect(l.skin).toBeLessThan(5);
    expect(l.hair).toBeGreaterThanOrEqual(0);
    expect(l.hair).toBeLessThan(5);
    expect(l.outfit).toBeGreaterThanOrEqual(0);
    expect(l.outfit).toBeLessThan(5);
    await page.locator('.screen .go').tap();
    // "Make your hero", or a slice 1 shaped save (S2.3: the builder opens once with "New!").
    await expect(builderDialog(page)).toBeVisible();
    await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
    await builderDialog(page).getByRole('button', { name: 'Start running' }).tap();
    await expect.poll(() => page.evaluate(() => window.__game!.steps)).toBeGreaterThan(5);
    await page.evaluate(() => localStorage.clear());
  }
  expect(errors).toEqual([]);
});

test('no network requests while using the builder, starting and changing hero', async ({ page, context }) => {
  const late: string[] = [];
  let loaded = false;
  context.on('request', (r) => {
    if (loaded) late.push(`${r.method()} ${r.url()}`);
  });
  await page.goto('./');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.waitForLoadState('networkidle');
  loaded = true;
  await page.getByRole('button', { name: 'Credits' }).tap();
  await page.getByRole('button', { name: 'Back' }).tap();
  await page.getByRole('button', { name: 'Sound: on' }).tap();
  await page.getByRole('button', { name: 'Make your hero' }).tap();
  const d = builderDialog(page);
  for (const name of ['Skin tone 1', 'Gele', 'Agbada', 'Skin tone 5', 'Headscarf', 'Kaftan']) await d.getByRole('button', { name }).tap();
  await d.getByRole('button', { name: 'Start running' }).tap();
  await expect.poll(() => page.evaluate(() => window.__game!.steps)).toBeGreaterThan(30);
  await page.touchscreen.tap(600, 150);
  await page.waitForTimeout(1000);
  expect(late).toEqual([]);
});

test('the double-tap guard never blocks a real tap: elsewhere at once, or the same spot later', async ({ page }) => {
  // Guard (B4 fix): only a tap within 300 ms AND 48 px of the opening tap is ignored.
  for (const vp of [
    { width: 851, height: 393 },
    { width: 727, height: 393 },
    { width: 393, height: 851 },
    { width: 320, height: 240 },
  ]) {
    await page.setViewportSize(vp);
    await page.goto('./');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    const open = (await page.getByRole('button', { name: 'Make your hero' }).boundingBox())!;
    const ox = open.x + open.width / 2;
    const oy = open.y + open.height / 2;
    await page.touchscreen.tap(ox, oy);
    const d = builderDialog(page);
    await expect(d).toBeVisible();
    // A chip far from the opening tap (more than 48 px away), tapped well inside 300 ms.
    const far = await page.$$eval(
      '[data-part]',
      (els, [x, y]) =>
        els
          .map((e) => {
            const r = e.getBoundingClientRect();
            return { part: (e as HTMLElement).dataset['part']!, index: Number((e as HTMLElement).dataset['index']), cx: r.x + r.width / 2, cy: r.y + r.height / 2 };
          })
          .filter((c) => !(c.part === 'skin' && c.index === 2) && !(c.part !== 'skin' && c.index === 0))
          .filter((c) => c.cy >= 0 && c.cy <= innerHeight && Math.hypot(c.cx - x!, c.cy - y!) > 80)[0],
      [ox, oy],
    );
    expect(far, `a chip far from the tap at ${vp.width}x${vp.height}`).toBeTruthy();
    const t0 = Date.now();
    await page.touchscreen.tap(far!.cx, far!.cy);
    expect(Date.now() - t0, 'tap sent inside the guard time').toBeLessThan(300);
    await expect.poll(() => look(page).then((l) => l[far!.part as 'skin'])).toBe(far!.index);
    // The spot under the finger works once the guard time is over (a person's next tap).
    const under = await page.evaluate(([x, y]) => {
      const e = document.elementFromPoint(x!, y!)?.closest<HTMLElement>('[data-part]');
      return e ? { part: e.dataset['part']!, index: Number(e.dataset['index']) } : null;
    }, [ox, oy]);
    if (under) {
      await page.waitForTimeout(350);
      await page.touchscreen.tap(ox, oy);
      await expect.poll(() => look(page).then((l) => l[under.part as 'skin'])).toBe(under.index);
    }
  }
});
