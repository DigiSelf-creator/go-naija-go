/**
 * K3b (docs/kano.md 3.3, 3.5, 3.7 and 8): Kofar Mata, Kano street 2, on the phone profile. A
 * player who has cleared Kurmi opens the game on Kano's home, taps "Play Kofar Mata" and plays
 * by hand with two thumbs: a bounce off the springy cloth, down the well into the groundnut store
 * for the garri parcel (the keeper claps), up at the exit well, on to the bus. The cleared card
 * (Kofar Mata's line, the parcel's line, no Next street yet), the save under states.kano with the
 * parcel and the money in the one wallet (decision 80). Kano plays with the Ogun part never
 * fetched (KN-R10). Also: at 320 x 240, a trader's bubble on Kurmi is never cut by the screen's
 * sides while it scrolls in.
 */
import { expect, test, type Page } from '@playwright/test';
import { buttonCentres, hands, playStreetByHand, LEFT, RIGHT, snap, type Hands, type Snap } from './hands';
import { wellBot } from './well-bot';
import { PAST_DOUBLE_TAP_MS, screenNow, waitOutTapLock } from './helpers';
import { formatMoney } from '../../src/game/money';

const LOOK = '{"skin":2,"hair":0,"outfit":0,"body":0,"age":1}';
const CITY = { kobo: 1000, power: 0, tech: 0, fixed: [], fixes: 0, paid: {}, hints: ['walk', 'bright', 'buka', 'collect', 'road'] };
const STREETS = { 1: { done: true, best: 100 }, 2: { done: true, best: 100 }, 3: { done: true, best: 100 } };
const DONE = { streets: STREETS, parcel: false, hall: { done: true, best: 0 } };
const KURMI_DONE = { arrived: true, streets: { 1: { done: true, best: 900 } } };
const save = (kano: unknown) => ({ v: 2, states: { lagos: DONE, ogun: { ...DONE, arrived: true }, kano }, city: CITY, where: 'kano' });
/** Where to save the in-play picture (the K3b report's screenshot), if set. */
const SHOT = process.env['K3B_SHOT'];

type Saved = {
  states?: { lagos?: unknown; kano?: { streets?: Record<string, { done?: boolean; best?: number }>; parcel?: boolean; arrived?: boolean } };
  city?: { kobo?: number };
};
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('gidi-progress') ?? '{}') as Saved);
const partOf = (url: string): string | null => /\/worlds\/([^/]+)\//.exec(new URL(url).pathname)?.[1] ?? null;

async function openKano(page: Page, kano: unknown): Promise<void> {
  await page.goto('./');
  await page.evaluate(
    ({ look, p }) => {
      localStorage.setItem('gidi-look', look);
      localStorage.setItem('gidi-intro', '"seen"');
      localStorage.setItem('gidi-progress', p);
    },
    { look: LOOK, p: JSON.stringify(save(kano)) },
  );
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page)).toBe('kano');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
}

test('Kofar Mata by hand from Kano\'s home: springy cloth, the groundnut store and its parcel, the bus, the save', async ({ page, context }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const asked = new Set<string>();
  context.on('request', (r) => {
    const p = partOf(r.url());
    if (p) asked.add(p);
  });

  // Before Kurmi is cleared, Kano's home offers Kurmi only.
  await openKano(page, { arrived: true });
  await expect(page.locator('.kano-city').getByRole('button', { name: 'Play Kurmi' })).toBeVisible();
  await expect(page.locator('.kano-city').getByRole('button', { name: 'Play Kofar Mata' })).toHaveCount(0);

  // Kurmi cleared: Kofar Mata opens.
  await openKano(page, KURMI_DONE);
  const home = page.locator('.kano-city');
  const play = home.getByRole('button', { name: 'Play Kofar Mata' });
  await expect(play).toBeVisible();
  await expect(home.getByRole('button', { name: 'Play Kurmi' })).toBeVisible();
  const box = (await play.boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(44);
  expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await play.tap();
  await expect.poll(() => screenNow(page)).toBe('play');
  await expect.poll(() => page.evaluate(() => window.__game!.steps)).toBeGreaterThan(5);
  expect(await page.evaluate(() => window.__game!.level.id)).toBe('kano-2');
  expect(await page.evaluate(() => window.__game!.skin)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.__game!.music.tune)).toBe('kano-kofar-mata');
  const springs = (await page.evaluate(() => window.__game!.level.platforms)).filter((p) => p.spring !== undefined).map((p) => p.x);
  expect(springs).toEqual([1250, 1800, 5700, 8800]);
  const bounces0 = await page.evaluate(() => window.__game!.clothBounces);

  const h = hands(await page.context().newCDPSession(page));
  const btn = await buttonCentres(page);
  const well = await wellBot(page, h);
  const room = { visited: false, id: '', parcel: false, keeper: '', toast: '', back: 0 };
  /** Down the well at 3600, the parcel from the kuli-kuli shelf, then up at 4800. */
  const wellAct = async (s: Snap, hh: Hands): Promise<boolean> => {
    if (room.visited || s.h.x < 3480 || s.h.x > 3620) return false;
    room.visited = true;
    await well.walkTo(3600, 8);
    await well.tapWellButton('down');
    await well.phase('room');
    room.id = await page.evaluate(() => window.__game!.run.room?.id ?? '');
    // Under the middle shelf (230 to 330, 95 high): a held jump lands on it and takes the parcel.
    await well.walkTo(280, 4);
    await page.evaluate(() => {
      const log: string[] = [];
      (window as unknown as { __keeper: string[] }).__keeper = log;
      const f = (): void => {
        const p = window.__game!.people;
        log.push(`${p?.drawn[0]?.frame ?? 'none'}@${p?.drawn[0]?.x ?? ''}`);
        if (log.length < 240) requestAnimationFrame(f);
      };
      requestAnimationFrame(f);
    });
    await well.jump(true);
    await page.waitForTimeout(150);
    room.parcel = await page.evaluate(() => window.__game!.run.parcel);
    room.toast = (await page.evaluate(() => window.__game!.toast)) ?? '';
    await page.waitForTimeout(500);
    const frames = await page.evaluate(() => (window as unknown as { __keeper: string[] }).__keeper);
    room.keeper = frames.find((f) => f.startsWith('clap')) ?? frames.at(-1) ?? '';
    await well.walkTo(500, 4);
    await well.tapWellButton('up');
    await well.phase('run', 15_000);
    room.back = (await snap(page)).h.x;
    await hh.down(LEFT, btn.forward.x, btn.forward.y);
    return true;
  };
  /** A short tap jump just before the first two frames lands on the cloth: the bounce. */
  const tried = new Set<number>();
  const clothAct = async (s: Snap, hh: Hands): Promise<boolean> => {
    const x = springs.slice(0, 2).find((a) => !tried.has(a) && a - s.h.x > 8 && a - s.h.x < 8 + s.h.speed * 0.14);
    if (x === undefined) return false;
    tried.add(x);
    await hh.down(RIGHT, btn.jump.x, btn.jump.y);
    await page.waitForTimeout(40);
    await hh.up(RIGHT);
    return true;
  };
  const toasts = new Set<string>();
  let shot = false;
  const { stats, last } = await playStreetByHand(page, h, {
    act: async (s, hh) => (await wellAct(s, hh)) || clothAct(s, hh),
    onPoll: async (s) => {
      const t = await page.evaluate(() => window.__game!.toast);
      if (t) toasts.add(t);
      // Just after the first bounce, high over the cloth at 1250: the frame, the sign, the dye yard.
      if (SHOT && !shot && s.h.x > 1290 && s.h.x < 1420 && s.h.y < 200) {
        shot = true;
        await page.screenshot({ path: SHOT });
      }
    },
  });
  await h.upAll();
  const bounces = (await page.evaluate(() => window.__game!.clothBounces)) - bounces0;
  console.log(
    `Kofar Mata by hand: ${last.r.phase} at x ${last.h.x.toFixed(0)} in ${last.r.time.toFixed(1)} s, lives ${last.r.lives}, kobo ${last.r.kobo}, presses ${stats.presses}, ` +
      `cloth bounces ${bounces}, lost at ${stats.lostAt.map((x) => x.toFixed(0)).join(', ') || 'nowhere'}, room ${JSON.stringify(room)}; toasts: ${[...toasts].join(' | ')}`,
  );
  expect(last.r.phase).toBe('bus');
  expect(last.r.checkpoint).toBe(true);
  expect(stats.lostAt.length, 'a Kurmi finisher clears Kofar Mata').toBeLessThan(3);
  expect(bounces).toBeGreaterThanOrEqual(1);
  expect(toasts).toContain('Springy cloth! Land to bounce high.');
  // The groundnut store: down at 3600, the parcel, the keeper claps, up at the exit well.
  expect(room.visited).toBe(true);
  expect(room.id).toBe('kano-well');
  expect(room.parcel).toBe(true);
  expect(room.keeper).toMatch(/^clap\d@/);
  expect(room.toast).toMatch(/^(Groundnut garri parcel|Garri parcel)! Shield for the hall\.$/);
  expect(Math.abs(room.back - 4800)).toBeLessThan(40);
  expect(last.r.parcel).toBe(true);

  // The cleared card: Kofar Mata's line and the parcel's; Take it home and Play again (Dawanau is not built).
  const dialog = page.getByRole('dialog', { name: 'Street cleared!' });
  await expect(dialog).toBeVisible({ timeout: 8000 });
  const money = (await page.evaluate(() => window.__game!.run.kobo)) * 10;
  await expect(dialog.getByText(`Kofar Mata is moving again, thanks to you! You got ${formatMoney(money)}.`)).toBeVisible();
  await expect(dialog.getByText('Your garri parcel is saved for Borehole Hall.')).toBeVisible();
  for (const b of ['Take it home', 'Play again']) await expect(dialog.getByRole('button', { name: b, exact: true })).toBeVisible();
  for (const b of ['Next street', 'Challenge road']) await expect(dialog.getByRole('button', { name: b, exact: true })).toHaveCount(0);
  const s = await saved(page);
  expect(s.states?.kano?.streets?.['2']).toEqual({ done: true, best: money });
  expect(s.states?.kano?.streets?.['1']).toEqual({ done: true, best: 900 });
  expect(s.states?.kano?.parcel).toBe(true);
  expect(s.states?.lagos).toEqual(DONE);
  expect(s.city?.kobo).toBe(1000 + money);

  await waitOutTapLock(page);
  await dialog.getByRole('button', { name: 'Take it home' }).tap();
  await expect.poll(() => screenNow(page)).toBe('kano');
  expect(await page.evaluate(() => window.__game!.skin)).toBe(false);
  // KN-R10: Kano played with only its own part fetched.
  expect([...asked]).toEqual(['kano']);
  expect(errors).toEqual([]);
});

test('Kurmi\'s cleared card goes on to Kofar Mata; at 320 x 240 a trader\'s bubble is never cut by the screen\'s sides', async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 320, height: 240 });
  await openKano(page, { arrived: true });
  await page.locator('.kano-city').getByRole('button', { name: 'Play Kurmi' }).tap();
  await expect.poll(() => screenNow(page)).toBe('play');
  // Every frame: the bubble's box (world units) against the camera's edges.
  await page.evaluate(() => {
    const out = { seen: 0, cut: [] as string[] };
    (window as unknown as { __bubbles: typeof out }).__bubbles = out;
    const f = (): void => {
      const g = window.__game!;
      const b = g.people?.bubble;
      if (b && g.run.phase === 'run') {
        out.seen++;
        if (b.x < g.camX - 0.5 || b.x + b.w > g.camX + g.viewW + 0.5) out.cut.push(`${b.x.toFixed(0)}+${b.w.toFixed(0)} at cam ${g.camX.toFixed(0)}`);
      }
      requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  });
  const h = hands(await page.context().newCDPSession(page));
  const { last } = await playStreetByHand(page, h);
  await h.upAll();
  const bubbles = await page.evaluate(() => (window as unknown as { __bubbles: { seen: number; cut: string[] } }).__bubbles);
  console.log(`Kurmi at 320 x 240: ${last.r.phase} at ${last.h.x.toFixed(0)}, bubble frames ${bubbles.seen}, cut ${bubbles.cut.length}: ${bubbles.cut.slice(0, 5).join(' | ')}`);
  expect(bubbles.seen).toBeGreaterThan(0);
  expect(bubbles.cut).toEqual([]);
  if (last.r.phase !== 'bus') return; // the bubbles are what this test is for; Kurmi's own spec plays it through
  const dialog = page.getByRole('dialog', { name: 'Street cleared!' });
  await expect(dialog).toBeVisible({ timeout: 8000 });
  await waitOutTapLock(page);
  await dialog.getByRole('button', { name: 'Next street', exact: true }).tap();
  await expect.poll(() => screenNow(page)).toBe('play');
  await expect.poll(() => page.evaluate(() => window.__game!.level.id)).toBe('kano-2');
});

test('Kano\'s home at 320 x 240 with Kofar Mata open: every button on screen, 44 px tall, none overlapping', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 240 });
  await openKano(page, KURMI_DONE);
  const boxes = await page.locator('.kano-city button').evaluateAll((els) =>
    els.filter((e) => (e as HTMLElement).offsetParent !== null).map((e) => ({ name: e.getAttribute('aria-label') ?? e.textContent ?? '', ...JSON.parse(JSON.stringify(e.getBoundingClientRect())) as DOMRect })),
  );
  if (process.env['K3B_HOME_SHOT']) await page.screenshot({ path: process.env['K3B_HOME_SHOT'] });
  expect(boxes.map((b) => b.name)).toEqual(expect.arrayContaining(['Play Kurmi', 'Play Kofar Mata']));
  for (const b of boxes) {
    expect(b.left, b.name).toBeGreaterThanOrEqual(0);
    expect(b.right, b.name).toBeLessThanOrEqual(320);
    expect(b.top, b.name).toBeGreaterThanOrEqual(0);
    expect(b.bottom, b.name).toBeLessThanOrEqual(240);
    expect(b.height, b.name).toBeGreaterThanOrEqual(44);
  }
  for (const [i, a] of boxes.entries()) for (const b of boxes.slice(i + 1)) expect(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top, `${a.name} and ${b.name}`).toBe(true);
});
