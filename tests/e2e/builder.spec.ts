/**
 * B3: hero builder on the phone profile, by touch.
 */
import { expect, test, type Page } from '@playwright/test';
import { PAST_DOUBLE_TAP_MS } from './helpers';

const look = (page: Page) => page.evaluate(() => window.__game!.look);

function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  return errors;
}

async function pickLook(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Make your hero' }).tap();
  const builder = page.getByRole('dialog', { name: 'Make your hero' });
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS); // a chip may sit where the finger was
  await builder.getByRole('button', { name: 'Skin tone 4' }).tap();
  await builder.getByRole('button', { name: 'Afro' }).tap();
  await builder.getByRole('button', { name: 'Kaftan' }).tap();
  await expect(builder.getByRole('button', { name: 'Skin tone 4' })).toHaveAttribute('aria-pressed', 'true');
  await expect(builder.getByRole('button', { name: 'Afro' })).toHaveAttribute('aria-pressed', 'true');
  await expect(builder.getByRole('button', { name: 'Low cut' })).toHaveAttribute('aria-pressed', 'false');
  expect(await look(page)).toEqual({ skin: 3, hair: 1, outfit: 4, body: 0, age: 1 });
}

test('pick a look, reload: the same look comes back', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('./');
  await expect(page.getByText('Fix the streets. Get Nigeria working.')).toBeVisible();
  await pickLook(page);
  expect(await page.evaluate(() => localStorage.getItem('gidi-look'))).toBe('{"skin":3,"hair":1,"outfit":4,"body":0,"age":1}');
  await page.getByRole('button', { name: 'Start running' }).tap();
  await expect.poll(() => page.evaluate(() => window.__game!.screen)).toBe('play');

  await page.reload();
  // A saved hero: the title shows Play, with Change hero beside it.
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Make your hero' })).toHaveCount(0);
  expect(await look(page)).toEqual({ skin: 3, hair: 1, outfit: 4, body: 0, age: 1 });
  await page.getByRole('button', { name: 'Change hero' }).tap();
  const builder = page.getByRole('dialog', { name: 'Make your hero' });
  for (const name of ['Male', 'Adult', 'Skin tone 4', 'Afro', 'Kaftan']) {
    await expect(builder.getByRole('button', { name, exact: true })).toHaveAttribute('aria-pressed', 'true');
  }
  await expect(builder.locator('[aria-pressed="true"]')).toHaveCount(5);
  await builder.getByRole('button', { name: 'Start running' }).tap();
  expect(await look(page)).toEqual({ skin: 3, hair: 1, outfit: 4, body: 0, age: 1 });
  expect(errors).toEqual([]);
});

test('storage blocked: the builder still works and the game starts', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      },
    });
  });
  const errors = watchErrors(page);
  await page.goto('./');
  expect(await look(page)).toEqual({ skin: 2, hair: 0, outfit: 0, body: 0, age: 1 }); // default look
  await pickLook(page);
  await page.getByRole('button', { name: 'Start running' }).tap();
  await expect.poll(() => page.evaluate(() => window.__game!.screen)).toBe('play');
  await expect.poll(() => page.evaluate(() => window.__game!.steps)).toBeGreaterThan(10);
  expect(await look(page)).toEqual({ skin: 3, hair: 1, outfit: 4, body: 0, age: 1 });
  // And it plays: a tap jumps.
  await page.touchscreen.tap(600, 150);
  await expect.poll(() => page.evaluate(() => window.__game!.hero.grounded), { intervals: [16] }).toBe(false);
  expect(errors).toEqual([]);
});

test('every menu button is at least 44 x 44 px', async ({ page }) => {
  await page.goto('./');
  const sizes = async () =>
    page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('.screen button')].map((b) => {
        const r = b.getBoundingClientRect();
        return { name: b.getAttribute('aria-label') ?? b.textContent, w: r.width, h: r.height };
      }),
    );
  const title = await sizes();
  await page.getByRole('button', { name: 'Make your hero' }).tap();
  const builder = await sizes();
  for (const s of [...title, ...builder]) {
    expect(s.w, `${s.name} width`).toBeGreaterThanOrEqual(44);
    expect(s.h, `${s.name} height`).toBeGreaterThanOrEqual(44);
  }
  expect(builder.length).toBe(2 + 3 + 5 + 5 + 5 + 1);
});

test('credits, sound and gentle mode on the title screen', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Credits' }).tap();
  const credits = page.getByRole('dialog', { name: 'Credits' });
  await expect(credits.getByText('Made by CoachNaz.')).toBeVisible();
  await expect(credits.getByText('Every picture, sound and tune is our own.')).toBeVisible();
  await expect(credits.getByText(/wrong premise/)).toHaveCount(0);
  await credits.getByRole('button', { name: 'Back' }).tap();

  await page.getByRole('button', { name: 'Sound: on' }).tap();
  await expect(page.getByRole('button', { name: 'Sound: off' })).toBeVisible();
  const gentle = page.getByRole('switch', { name: 'Gentle mode: 5 lives instead of 3' });
  await expect(gentle).toHaveAttribute('aria-checked', 'false');
  await gentle.tap();
  await expect(gentle).toHaveAttribute('aria-checked', 'true');
  // A tap on a menu never starts or jumps anything.
  expect(await page.evaluate(() => window.__game!.screen)).toBe('title');
  expect(await page.evaluate(() => window.__game!.steps)).toBe(0);

  await page.reload();
  await expect(page.getByRole('button', { name: 'Sound: off' })).toBeVisible();
  await expect(page.getByRole('switch', { name: 'Gentle mode: 5 lives instead of 3' })).toHaveAttribute('aria-checked', 'true');
});

test('the builder works with the phone upright', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 851 });
  await page.goto('./');
  await expect(page.getByText('Turn your phone sideways to play.')).toBeHidden();
  await pickLook(page);
  // Preview sits above the choices when upright.
  const preview = await page.locator('canvas.preview').boundingBox();
  const skinRow = await page.getByRole('group', { name: 'Skin' }).boundingBox();
  expect(preview!.y + preview!.height).toBeLessThanOrEqual(skinRow!.y);
  // Starting upright: the run waits for the phone to turn.
  await page.getByRole('button', { name: 'Start running' }).tap();
  await expect(page.getByText('Turn your phone sideways to play.')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__game!.paused)).toBe(true);
});

test('a fast double tap on "Play" does not jump; a tap elsewhere right away does', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.setItem('gidi-look', '{"skin":1,"hair":1,"outfit":1,"body":0,"age":1}'));
  await page.reload();
  const box = (await page.getByRole('button', { name: 'Play', exact: true }).boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.touchscreen.tap(x, y);
  await page.touchscreen.tap(x, y); // second half of the double tap
  await expect.poll(() => page.evaluate(() => window.__game!.screen)).toBe('play');
  // Watch the hero for half a second: it never leaves the road.
  const minY = await page.evaluate(
    () =>
      new Promise<number>((done) => {
        let m = Infinity;
        const t0 = performance.now();
        const f = (): void => {
          m = Math.min(m, window.__game!.hero.y);
          if (performance.now() - t0 < 500) requestAnimationFrame(f);
          else done(m);
        };
        requestAnimationFrame(f);
      }),
  );
  expect(minY).toBe(300);

  // A quick tap far from the button is a real jump, even straight after starting.
  await page.reload();
  await page.getByRole('button', { name: 'Play', exact: true }).tap();
  await page.touchscreen.tap(700, 60);
  await expect.poll(() => page.evaluate(() => window.__game!.hero.grounded), { intervals: [16] }).toBe(false);
});

test('Space on a focused builder button presses that button, not a jump', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Make your hero' }).tap();
  const afro = page.getByRole('button', { name: 'Afro' });
  await afro.focus();
  await page.keyboard.press('Space');
  await expect(afro).toHaveAttribute('aria-pressed', 'true');
  expect((await page.evaluate(() => window.__game!.look)).hair).toBe(1);
});
