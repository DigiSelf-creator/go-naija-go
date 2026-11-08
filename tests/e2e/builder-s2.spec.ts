/**
 * I2: the hero builder's slice 2 rows (design.md S2.3): "Male or female" and "Age", the first
 * looks, the layout down to 320 x 240 with the button never scrolling off, the once-only
 * "New!" builder for a slice 1 save, and every option by touch and by keys.
 */
import { expect, test, type Page } from '@playwright/test';
import { PAST_DOUBLE_TAP_MS } from './helpers';

const look = (page: Page) => page.evaluate(() => window.__game!.look);
const builderDialog = (page: Page) => page.getByRole('dialog', { name: 'Make your hero' });
const NEW_LINE = 'New! Pick male or female, and your age.';

function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  return errors;
}

/** design.md S2.3 first looks: [body][age] = hair, outfit (labels). */
const FIRST: readonly (readonly [string, string][])[] = [
  [
    ['Low cut', 'School uniform'],
    ['Low cut', 'Green jersey'],
    ['Low cut', 'Agbada'],
  ],
  [
    ['Braids', 'School uniform'],
    ['Braids', 'Ankara'],
    ['Gele', 'Ankara'],
  ],
];
const BODY = ['Male', 'Female'] as const;
const AGE = ['Teen', 'Adult', 'Elder'] as const;
const HAIR = ['Low cut', 'Afro', 'Braids', 'Gele', 'Headscarf'];
const OUTFIT = ['Green jersey', 'Ankara', 'School uniform', 'Agbada', 'Kaftan'];

/** The Start running button is fully on screen and inside the left column. */
async function startOnScreen(page: Page, vp: { width: number; height: number }): Promise<{ x: number; y: number; w: number; h: number }> {
  const b = (await builderDialog(page).getByRole('button', { name: 'Start running' }).boundingBox())!;
  expect(b.y, 'Start running top').toBeGreaterThanOrEqual(0);
  expect(b.y + b.height, 'Start running bottom').toBeLessThanOrEqual(vp.height);
  expect(b.x).toBeGreaterThanOrEqual(0);
  expect(b.x + b.width).toBeLessThanOrEqual(vp.width);
  return { x: b.x, y: b.y, w: b.width, h: b.height };
}

for (const vp of [
  { width: 320, height: 240 },
  { width: 667, height: 375 },
]) {
  test(`${vp.width}x${vp.height}: each of Male, Female and Teen, Adult, Elder by touch, with its first look, then street 1 plays`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize(vp);
    const errors = watchErrors(page);
    for (let body = 0; body < 2; body++) {
      for (let age = 0; age < 3; age++) {
        await page.goto('./');
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await page.getByRole('button', { name: 'Make your hero' }).tap();
        const d = builderDialog(page);
        await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
        const bodyName = BODY[body]!;
        const ageName = AGE[age]!;
        await d.getByRole('button', { name: bodyName, exact: true }).tap();
        await d.getByRole('button', { name: ageName, exact: true }).tap();
        const [hair, outfit] = FIRST[body]![age]!;
        for (const name of [bodyName, ageName, hair, outfit]) {
          await expect(d.getByRole('button', { name, exact: true }), `${bodyName} ${ageName}: ${name}`).toHaveAttribute('aria-pressed', 'true');
        }
        expect(await look(page)).toEqual({ skin: 2, hair: HAIR.indexOf(hair), outfit: OUTFIT.indexOf(outfit), body, age });
        // Male or female and Age each sit on one line.
        for (const row of ['Male or female', 'Age']) {
          const ys = await d.getByRole('group', { name: row, exact: true }).locator('button').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().y)));
          expect(new Set(ys).size, `${row} on one line`).toBe(1);
        }
        await startOnScreen(page, vp);
        await d.getByRole('button', { name: 'Start running' }).tap();
        await expect.poll(() => page.evaluate(() => window.__game!.screen)).toBe('play');
        expect(await page.evaluate(() => window.__game!.level.id)).toBe('lagos-1');
        // Play a little: walk forward with the key, and a tap jumps.
        await page.keyboard.down('ArrowRight');
        await expect.poll(() => page.evaluate(() => window.__game!.hero.x)).toBeGreaterThan(await page.evaluate(() => window.__game!.hero.x + 40));
        await page.keyboard.up('ArrowRight');
        await page.touchscreen.tap(vp.width / 2, vp.height * 0.3);
        await expect.poll(() => page.evaluate(() => window.__game!.hero.grounded), { intervals: [16] }).toBe(false);
        expect(JSON.parse((await page.evaluate(() => localStorage.getItem('gidi-look')))!)).toMatchObject({ body, age });
      }
    }
    expect(errors).toEqual([]);
  });

  test(`${vp.width}x${vp.height}: the rows scroll, the button never does; every option reachable by touch`, async ({ page }) => {
    await page.setViewportSize(vp);
    await page.goto('./');
    await page.getByRole('button', { name: 'Make your hero' }).tap();
    const d = builderDialog(page);
    await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
    const before = await startOnScreen(page, vp);
    // More is below: the fade and our scroll bar show.
    const side = page.locator('.builder-side');
    await expect(side).toHaveClass(/more-below/);
    await expect(page.locator('.side-bar')).toBeVisible();
    await side.evaluate((e) => e.scrollTo(0, e.scrollHeight));
    await expect(side).not.toHaveClass(/more-below/);
    expect(await startOnScreen(page, vp)).toEqual(before);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(vp.width);
    // Every option, tapped by touch (scrolled to first, like a thumb would), is picked.
    await d.getByRole('button', { name: 'Afro', exact: true }).tap(); // pick a hair first, so nothing follows
    const options = await d.locator('[data-part]').evaluateAll((els) => els.map((e) => [(e as HTMLElement).dataset['part']!, Number((e as HTMLElement).dataset['index'])] as const));
    expect(options).toHaveLength(20);
    for (const [part, index] of options) {
      const b = d.locator(`[data-part="${part}"][data-index="${index}"]`);
      await b.scrollIntoViewIfNeeded();
      await b.tap();
      await expect(b).toHaveAttribute('aria-pressed', 'true');
      expect((await look(page))[part as 'skin']).toBe(index);
      // The button stays put, whatever the rows did.
      expect(await startOnScreen(page, vp)).toEqual(before);
    }
    // Targets: chips at least 44 tall, swatches 48, everything inside the screen's sides.
    const boxes = await page.$$eval('.screen button', (els) => els.map((e) => ({ n: e.getAttribute('aria-label') ?? e.textContent, part: (e as HTMLElement).dataset['part'], ...e.getBoundingClientRect().toJSON() })));
    for (const b of boxes) {
      expect(b.height, `${b.n}`).toBeGreaterThanOrEqual(44);
      expect(b.width, `${b.n}`).toBeGreaterThanOrEqual(44);
      expect(b.right, `${b.n}`).toBeLessThanOrEqual(vp.width);
    }
  });
}

test('320x240 layout: preview 104 x 120 and button 104 x 56 on the left, words on two lines', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 240 });
  await page.goto('./');
  await page.getByRole('button', { name: 'Make your hero' }).tap();
  const p = (await page.locator('canvas.preview').boundingBox())!;
  const b = (await builderDialog(page).getByRole('button', { name: 'Start running' }).boundingBox())!;
  const side = (await page.locator('.builder-side').boundingBox())!;
  expect([p.width, p.height]).toEqual([104, 120]);
  expect([b.width, b.height]).toEqual([104, 56]);
  expect(b.y).toBeGreaterThanOrEqual(p.y + p.height + 7.5);
  expect(side.x).toBeGreaterThanOrEqual(p.x + p.width);
  expect(side.width).toBeGreaterThanOrEqual(176);
  // Its words wrap onto two lines.
  const lines = await builderDialog(page)
    .getByRole('button', { name: 'Start running' })
    .evaluate((e) => {
      const r = document.createRange();
      r.selectNodeContents(e);
      return new Set([...r.getClientRects()].map((c) => Math.round(c.top))).size;
    });
  expect(lines).toBe(2);
  // The heading is at the top of the right column.
  const heading = (await builderDialog(page).getByRole('heading', { name: 'Make your hero' }).boundingBox())!;
  expect(heading.x).toBeGreaterThanOrEqual(side.x);
});

test('first looks follow Male or female and Age until Hair or Outfit is tapped, then stay', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Make your hero' }).tap();
  const d = builderDialog(page);
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  // First open: Adult, Male, skin 3, Low cut, Green jersey.
  expect(await look(page)).toEqual({ skin: 2, hair: 0, outfit: 0, body: 0, age: 1 });
  await d.getByRole('button', { name: 'Female', exact: true }).tap();
  expect(await look(page)).toMatchObject({ hair: 2, outfit: 1 });
  await d.getByRole('button', { name: 'Elder', exact: true }).tap();
  expect(await look(page)).toMatchObject({ hair: 3, outfit: 1 });
  // Skin never stops the following.
  await d.getByRole('button', { name: 'Skin tone 5' }).tap();
  await d.getByRole('button', { name: 'Teen', exact: true }).tap();
  expect(await look(page)).toEqual({ skin: 4, hair: 2, outfit: 2, body: 1, age: 0 });
  // Tapping an outfit (even the one already on) stops it for good.
  await d.getByRole('button', { name: 'School uniform', exact: true }).tap();
  await d.getByRole('button', { name: 'Male', exact: true }).tap();
  await d.getByRole('button', { name: 'Elder', exact: true }).tap();
  expect(await look(page)).toEqual({ skin: 4, hair: 2, outfit: 2, body: 0, age: 2 });
  // Every hair and outfit is open to every hero: an Elder Male with Gele and Ankara.
  await d.getByRole('button', { name: 'Gele', exact: true }).tap();
  await d.getByRole('button', { name: 'Ankara', exact: true }).tap();
  expect(await look(page)).toEqual({ skin: 4, hair: 3, outfit: 1, body: 0, age: 2 });

  // Reopened later with a picked hair: still kept.
  await d.getByRole('button', { name: 'Start running' }).tap();
  await page.reload();
  await page.getByRole('button', { name: 'Change hero' }).tap();
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await builderDialog(page).getByRole('button', { name: 'Teen', exact: true }).tap();
  expect(await look(page)).toEqual({ skin: 4, hair: 3, outfit: 1, body: 0, age: 0 });
  await expect(builderDialog(page).getByText(NEW_LINE)).toHaveCount(0);
});

test('the preview and the run draw the chosen body: Elder hair is grey', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Make your hero' }).tap();
  const d = builderDialog(page);
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await d.getByRole('button', { name: 'Afro', exact: true }).tap();
  const grey = (sel: string) =>
    page.evaluate(
      (s) =>
        new Promise<number>((done) =>
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              const c = document.querySelector<HTMLCanvasElement>(s)!;
              const data = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
              let n = 0;
              // Elder hair base #b9b4ac (design.md S2.3).
              for (let i = 0; i < data.length; i += 4) if (data[i] === 0xb9 && data[i + 1] === 0xb4 && data[i + 2] === 0xac) n++;
              done(n);
            }),
          ),
        ),
      sel,
    );
  expect(await grey('canvas.preview')).toBe(0);
  await d.getByRole('button', { name: 'Elder', exact: true }).tap();
  expect(await grey('canvas.preview')).toBeGreaterThan(20);
  await d.getByRole('button', { name: 'Start running' }).tap();
  await expect.poll(() => page.evaluate(() => window.__game!.steps)).toBeGreaterThan(5);
  expect(await grey('canvas#game')).toBeGreaterThan(5);
});

test('a slice 1 save: the builder opens once with "New!", then never by itself again', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('./');
  // Slice 1 shape: skin, hair (Gele), outfit, no body or age.
  await page.evaluate(() => localStorage.setItem('gidi-look', '{"skin":1,"hair":3,"outfit":1}'));
  await page.reload();
  // It loads as Adult, Female (Gele), the old choices kept.
  expect(await look(page)).toEqual({ skin: 1, hair: 3, outfit: 1, body: 1, age: 1 });
  await page.getByRole('button', { name: 'Start running' }).tap();
  const d = builderDialog(page);
  await expect(d).toBeVisible();
  await expect(d.getByText(NEW_LINE, { exact: true })).toBeVisible();
  // The line sits at the top of the right column, under the heading.
  const head = (await d.getByRole('heading', { name: 'Make your hero' }).boundingBox())!;
  const note = (await d.getByText(NEW_LINE).boundingBox())!;
  const row = (await d.getByRole('group', { name: 'Male or female' }).boundingBox())!;
  expect(note.y).toBeGreaterThanOrEqual(head.y + head.height - 1);
  expect(note.y + note.height).toBeLessThanOrEqual(row.y + 1);
  for (const name of ['Female', 'Adult', 'Skin tone 2', 'Gele', 'Ankara']) {
    await expect(d.getByRole('button', { name, exact: true })).toHaveAttribute('aria-pressed', 'true');
  }
  // The old hair and outfit were picked by the player, so a new age keeps them.
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await d.getByRole('button', { name: 'Elder', exact: true }).tap();
  expect(await look(page)).toEqual({ skin: 1, hair: 3, outfit: 1, body: 1, age: 2 });
  await d.getByRole('button', { name: 'Start running' }).tap();
  await expect.poll(() => page.evaluate(() => window.__game!.screen)).toBe('play');
  expect(await page.evaluate(() => localStorage.getItem('gidi-look'))).toBe('{"skin":1,"hair":3,"outfit":1,"body":1,"age":2}');

  // Next visits: the title starts the run at once.
  for (let visit = 0; visit < 2; visit++) {
    await page.reload();
    await page.getByRole('button', { name: 'Start running' }).tap();
    await expect.poll(() => page.evaluate(() => window.__game!.screen)).toBe('play');
  }
  // Change hero shows no "New!" line any more.
  await page.reload();
  await page.getByRole('button', { name: 'Change hero' }).tap();
  await expect(builderDialog(page)).toBeVisible();
  await expect(page.getByText(NEW_LINE)).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('a slice 1 save with Start running pressed and nothing changed saves body and age as shown', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.setItem('gidi-look', '{"skin":4,"hair":1,"outfit":4}'));
  await page.reload();
  await page.getByRole('button', { name: 'Start running' }).tap();
  await expect(builderDialog(page).getByText(NEW_LINE)).toBeVisible();
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await builderDialog(page).getByRole('button', { name: 'Start running' }).tap();
  await expect.poll(() => page.evaluate(() => window.__game!.screen)).toBe('play');
  expect(await page.evaluate(() => localStorage.getItem('gidi-look'))).toBe('{"skin":4,"hair":1,"outfit":4,"body":0,"age":1}');
});

test('keys only: Tab and Enter or Space reach every option and the button; the pick is announced', async ({ page }) => {
  await page.setViewportSize({ width: 667, height: 375 });
  await page.goto('./');
  await page.getByRole('button', { name: 'Make your hero' }).focus();
  await page.keyboard.press('Enter');
  const d = builderDialog(page);
  await expect(d).toBeVisible();
  // Tab order: the rows top to bottom, then Start running.
  const order: string[] = [];
  for (let i = 0; i < 21; i++) {
    await page.keyboard.press('Tab');
    order.push(await page.evaluate(() => {
      const e = document.activeElement as HTMLElement;
      return e.getAttribute('aria-label') ?? e.textContent ?? '';
    }));
  }
  expect(order.slice(0, 5)).toEqual(['Male', 'Female', 'Teen', 'Adult', 'Elder']);
  expect(order[20]).toBe('Start running');
  // Each focused option comes into view in the scrolling column.
  // Shift+Tab back to Elder (16 back from Start running) and press Space; Female with Enter.
  for (let i = 0; i < 16; i++) await page.keyboard.press('Shift+Tab');
  expect(await page.evaluate(() => document.activeElement?.textContent)).toBe('Elder');
  await page.keyboard.press('Space');
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  expect(await page.evaluate(() => document.activeElement?.textContent)).toBe('Female');
  await page.keyboard.press('Enter');
  // Selected state is announced: aria-pressed on the button, inside a named group.
  await expect(d.getByRole('group', { name: 'Male or female' }).getByRole('button', { name: 'Female', pressed: true })).toHaveCount(1);
  await expect(d.getByRole('group', { name: 'Age' }).getByRole('button', { name: 'Elder', pressed: true })).toHaveCount(1);
  await expect(d.getByRole('button', { name: 'Male', exact: true, pressed: false })).toHaveCount(1);
  expect(await look(page)).toEqual({ skin: 2, hair: 3, outfit: 1, body: 1, age: 2 });
  // Tab to an option far below: it scrolls into view.
  for (let i = 0; i < 18; i++) await page.keyboard.press('Tab');
  const kaftan = (await page.evaluate(() => {
    const r = document.activeElement!.getBoundingClientRect();
    return { name: document.activeElement!.textContent, top: r.top, bottom: r.bottom };
  }));
  expect(kaftan.name).toBe('Kaftan');
  const side = (await page.locator('.builder-side').boundingBox())!;
  expect(kaftan.top).toBeGreaterThanOrEqual(side.y - 1);
  expect(kaftan.bottom).toBeLessThanOrEqual(side.y + side.height + 1);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => window.__game!.screen)).toBe('play');
  // Space now jumps.
  await page.keyboard.press('Space');
  await expect.poll(() => page.evaluate(() => window.__game!.hero.grounded), { intervals: [16] }).toBe(false);
});
