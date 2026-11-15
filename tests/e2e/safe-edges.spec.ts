/**
 * ST0 part 4 (Tp's Android phone, sideways): the picture goes edge to edge, under the camera
 * cutout too; only things you tap or read keep inside the safe edges. The native app sets
 * --safe-* from the real cutout plus 8 px and lays the game out again (src/native/app.ts); these
 * tests do the same with a 60 px cutout on the left, then check that each full screen covers
 * x = 0 and that no stale street shows there. The web link keeps its env() insets (0 here).
 */
import { expect, test, type Page } from '@playwright/test';
import { PAST_DOUBLE_TAP_MS, screenNow, startRun, storySeen } from './helpers';

const CUT = 60;
/** The page's own dark colour (--bg, #0f1a12): what the game canvas is painted over with. */
const BG = [15, 26, 18];
type RGB = readonly number[];

/** As applyInsets in src/native/app.ts: the CSS insets, then a new layout. */
async function cutoutLeft(page: Page): Promise<void> {
  await page.evaluate((cut) => {
    const root = document.documentElement.style;
    root.setProperty('--safe-top', '8px');
    root.setProperty('--safe-right', '8px');
    root.setProperty('--safe-bottom', '8px');
    root.setProperty('--safe-left', `${cut}px`);
    window.dispatchEvent(new Event('resize'));
  }, CUT);
}

/** The game canvas's own pixels at these CSS points, as [r, g, b]. */
const gamePixels = (page: Page, points: readonly { x: number; y: number }[]) =>
  page.evaluate((points) => {
    const c = document.getElementById('game') as HTMLCanvasElement;
    const k = c.width / window.innerWidth;
    const g = c.getContext('2d')!;
    return points.map((p) => [...g.getImageData(Math.round(p.x * k), Math.round(p.y * k), 1, 1).data.slice(0, 3)]);
  }, points);

/** Points across the cutout strip (x 0 to CUT), top to bottom. */
const stripPoints = (h: number) => [0, 15, 30, 45, CUT - 1].flatMap((x) => [0.05, 0.2, 0.4, 0.6, 0.8, 0.95].map((y) => ({ x, y: Math.floor(h * y) })));

/** What the screen really shows at these CSS points (from a screenshot), as [r, g, b]. */
async function shown(page: Page, points: readonly { x: number; y: number }[]): Promise<number[][]> {
  const png = (await page.screenshot()).toString('base64');
  return page.evaluate(
    async ({ png, points }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${png}`;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const g = c.getContext('2d')!;
      g.drawImage(img, 0, 0);
      const k = img.width / window.innerWidth;
      return points.map((p) => [...g.getImageData(Math.round(p.x * k), Math.round(p.y * k), 1, 1).data.slice(0, 3)]);
    },
    { png, points },
  );
}

const near = (a: RGB, b: RGB, tol: number): boolean => a.every((v, i) => Math.abs(v - b[i]!) <= tol);

test('the moving intro fills the cutout strip; Skip, the subtitle words and "Let\'s go" stay inside the safe edges; no stale street', async ({ page }) => {
  await page.goto('./');
  await expect.poll(() => screenNow(page)).toBe('title');
  await cutoutLeft(page);
  const h = await page.evaluate(() => window.innerHeight);
  // The street behind the title is drawn on the game canvas first (as on Tp's phone).
  await expect.poll(async () => (await gamePixels(page, stripPoints(h))).some((p) => !near(p, BG, 2))).toBe(true);
  await page.getByRole('button', { name: 'Make your hero' }).tap();
  await expect.poll(async () => page.evaluate(() => window.__game?.intro?.mode)).toBe('moving');
  await page.waitForTimeout(300);
  const box = await page.evaluate(() => {
    const r = (s: string) => {
      const b = document.querySelector(s)!.getBoundingClientRect();
      return { left: b.left, right: b.right, top: b.top, bottom: b.bottom };
    };
    return { w: window.innerWidth, h: window.innerHeight, pic: r('.intro-pic'), strip: r('.intro-strip'), sub: r('.intro-sub'), skip: r('.intro-skip'), card: r('.intro-card') };
  });
  // The picture and the strip's dark band: edge to edge.
  expect(box.card.left).toBe(0);
  expect(box.pic).toEqual({ left: 0, right: box.w, top: 0, bottom: box.h });
  expect(box.strip.left).toBe(0);
  expect(box.strip.right).toBe(box.w);
  expect(box.strip.bottom).toBe(box.h);
  // The words and Skip: inside the safe edges.
  expect(box.sub.left).toBeGreaterThanOrEqual(CUT);
  expect(box.sub.right).toBeLessThanOrEqual(box.w - 8);
  expect(box.skip.right).toBeLessThanOrEqual(box.w - 8);
  expect(box.skip.top).toBeGreaterThanOrEqual(8);
  // No stale street: the game canvas under the intro is painted over...
  await expect.poll(async () => (await gamePixels(page, stripPoints(h))).every((p) => near(p, BG, 2))).toBe(true);
  // ...and what shows in the strip is the intro's own picture: its sky at the edge is the sky
  // just inside, and the strip's dark band at the bottom left is the band further in.
  const y = Math.round(h * 0.15);
  const [edge, inside, bandEdge, bandMid] = await shown(page, [
    { x: 4, y },
    { x: CUT + 30, y },
    { x: 4, y: h - 4 },
    { x: box.w / 2, y: h - 4 },
  ]);
  expect(near(edge!, BG, 20)).toBe(false);
  expect(near(edge!, inside!, 24)).toBe(true);
  expect(near(bandEdge!, bandMid!, 10)).toBe(true);

  // "Let's go" in the hold: inside the safe edges too.
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  for (let b = 1; b <= 6; b++) {
    await page.locator('.intro-card').tap({ position: { x: box.w / 2, y: 120 } });
    await expect.poll(async () => page.evaluate(() => window.__game?.intro?.beat)).toBe(b);
  }
  const go = await page.getByRole('button', { name: "Let's go" }).boundingBox();
  expect(go!.x + go!.width).toBeLessThanOrEqual(box.w - 8);
  expect(go!.y + go!.height).toBeLessThanOrEqual(box.h - 8);
});

test('Lagos from above: the sea fills the cutout strip, its buttons stay inside the safe edges, no stale street', async ({ page }) => {
  await storySeen(page);
  await page.goto('./');
  await expect.poll(() => screenNow(page)).toBe('title');
  await cutoutLeft(page);
  await page.getByRole('button', { name: 'Make your hero' }).tap();
  await expect.poll(() => screenNow(page)).toBe('builder');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.getByRole('dialog', { name: 'Make your hero' }).getByRole('button', { name: 'Start running' }).tap();
  await expect.poll(() => screenNow(page)).toBe('city');
  await page.waitForTimeout(400);
  const h = await page.evaluate(() => window.innerHeight);
  // The strip shows the sea (#5fb3c9), never the street or the page colour.
  for (const p of await shown(page, stripPoints(h))) expect(near(p, [0x5f, 0xb3, 0xc9], 12)).toBe(true);
  await expect.poll(async () => (await gamePixels(page, stripPoints(h))).every((p) => near(p, BG, 2))).toBe(true);
  // Every button and chip on the city is inside the safe edges.
  const lefts = await page.evaluate(() =>
    [...document.querySelectorAll('.city-top button, .city-bottom button, .city-chip')]
      .map((e) => e.getBoundingClientRect())
      .filter((b) => b.width > 0)
      .map((b) => b.left),
  );
  expect(lefts.length).toBeGreaterThan(0);
  for (const l of lefts) expect(l).toBeGreaterThanOrEqual(CUT);
});

test('the lane run draws its own picture in the cutout strip; its rows and buttons stay inside the safe edges', async ({ page }) => {
  await storySeen(page);
  await page.goto('./?level=lagos-lane');
  await expect.poll(() => screenNow(page)).toBe('title');
  await cutoutLeft(page);
  const h = await page.evaluate(() => window.innerHeight);
  const street = await gamePixels(page, stripPoints(h));
  await startRun(page);
  await expect.poll(async () => page.evaluate(() => window.__lane?.stage), { timeout: 15_000 }).toBe('play');
  await page.waitForTimeout(300);
  // At x = 0 the lane's own picture: never the page colour, and not the street left over from
  // before (at least most points changed).
  const now = await gamePixels(page, stripPoints(h));
  expect(now.every((p) => !near(p, BG, 4))).toBe(true);
  expect(now.filter((p, i) => !near(p, street[i]!, 4)).length).toBeGreaterThan(now.length / 2);
  // And the screen shows the canvas there (nothing drawn over the strip but the picture).
  // S3g1b: the upper half shows the house fronts and people moving past with the run, so the
  // canvas read and the screenshot (frames apart) can differ there; the road and pavement below
  // change slowly and show the same picture.
  const pts = [0.7, 0.8, 0.9].map((y) => ({ x: 2, y: Math.round(h * y) }));
  await expect
    .poll(async () => {
      const [cv, sc] = [await gamePixels(page, pts), await shown(page, pts)];
      return cv.every((p, i) => near(p, sc[i]!, 40));
    })
    .toBe(true);
  const lefts = await page.evaluate(() =>
    [...document.querySelectorAll('.lane-hud button, .lane-chips, .lane-left, .lane-buttons button')]
      .map((e) => e.getBoundingClientRect())
      .filter((b) => b.width > 0)
      .map((b) => b.left),
  );
  expect(lefts.length).toBeGreaterThan(0);
  for (const l of lefts) expect(l).toBeGreaterThanOrEqual(CUT);
});

/** The colour most of the strip shows (screenshot), and whether every point is near it. */
const stripIs = async (page: Page, rgb: RGB, tol: number): Promise<boolean> => {
  const h = await page.evaluate(() => window.innerHeight);
  return (await shown(page, stripPoints(h))).every((p) => near(p, rgb, tol));
};

test('qa round 5, Nigeria\'s wheel: the cream fills the cutout strip, its buttons stay inside the safe edges, no stale street', async ({ page }) => {
  await storySeen(page);
  await page.goto('./');
  await expect.poll(() => screenNow(page)).toBe('title');
  await cutoutLeft(page);
  await page.getByRole('button', { name: 'Make your hero' }).tap();
  await expect.poll(() => screenNow(page)).toBe('builder');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.getByRole('dialog', { name: 'Make your hero' }).getByRole('button', { name: 'Start running' }).tap();
  await expect.poll(() => screenNow(page)).toBe('city');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.getByRole('dialog', { name: 'Lagos' }).getByRole('button', { name: "Nigeria's wheel" }).tap();
  await expect.poll(() => screenNow(page)).toBe('wheel');
  await page.waitForTimeout(400);
  // The strip shows the wheel's cream (#fffaf0), never the street or the page colour.
  await expect.poll(() => stripIs(page, [0xff, 0xfa, 0xf0], 6)).toBe(true);
  const lefts = await page.evaluate(() =>
    [...document.querySelectorAll('.wheel-card button, .wheel-card h2, .wheel-card svg')]
      .map((e) => e.getBoundingClientRect())
      .filter((b) => b.width > 0)
      .map((b) => b.left),
  );
  expect(lefts.length).toBeGreaterThan(0);
  for (const l of lefts) expect(l).toBeGreaterThanOrEqual(CUT);
});

test('qa round 5, the challenge road: its picture fills the cutout strip with no stale street; its buttons and stops stay inside the safe edges', async ({ page }) => {
  await storySeen(page);
  await page.goto('./');
  await expect.poll(() => screenNow(page)).toBe('title');
  await cutoutLeft(page);
  await page.getByRole('button', { name: 'Make your hero' }).tap();
  await expect.poll(() => screenNow(page)).toBe('builder');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.getByRole('dialog', { name: 'Make your hero' }).getByRole('button', { name: 'Start running' }).tap();
  await expect.poll(() => screenNow(page)).toBe('city');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.getByRole('dialog', { name: 'Lagos' }).getByRole('button', { name: 'Challenge road' }).tap();
  await expect.poll(() => screenNow(page)).toBe('road');
  await page.waitForTimeout(400);
  // The strip shows the road screen's own sky-to-sand backdrop: the screen's own colour at x = CUT + 2.
  const h = await page.evaluate(() => window.innerHeight);
  const pts = stripPoints(h);
  const inside = pts.map((p) => ({ x: CUT + 2, y: p.y }));
  await expect
    .poll(async () => {
      const [a, b] = [await shown(page, pts), await shown(page, inside)];
      return a.every((p, i) => near(p, b[i]!, 24));
    })
    .toBe(true);
  const lefts = await page.evaluate(() =>
    [...document.querySelectorAll('.road-top button, .road-stop')]
      .map((e) => e.getBoundingClientRect())
      .filter((b) => b.width > 0 && b.right > 0)
      .map((b) => b.left),
  );
  expect(lefts.length).toBeGreaterThan(0);
  for (const l of lefts) expect(l).toBeGreaterThanOrEqual(CUT);
});
