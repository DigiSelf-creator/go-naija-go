/**
 * L2 on the phone profile (docs/design.md S2.5): street 2 by hand with two thumbs to the well,
 * Go down, every gift in the room (17 kobo, the crate, the garri parcel), Go up at the exit
 * well, a lost life after the room that keeps the parcel, and on to the bus. Then the same well
 * by keys on a computer (Down to go down, Enter or E to go up), and street 3's secret well.
 * Screenshots go to $L2_SHOTS (default test-results/l2-shots).
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { hands, playStreetByHand, snap } from './hands';
import { PAST_DOUBLE_TAP_MS, startRun, waitOutTapLock, storySeen } from './helpers';
import { wellBot } from './well-bot';
import { checkCardFits } from './card-fit';
import { formatMoney } from '../../src/game/money';

// Slice 3 (city.md (a)): the intro story is not what these tests are about; it is marked seen.
test.beforeEach(({ page }) => storySeen(page));

const SHOTS = process.env['L2_SHOTS'] ?? 'test-results/l2-shots';
mkdirSync(SHOTS, { recursive: true });
const N2_SHOTS = process.env['N2_SHOTS'] ?? 'test-results/n2-shots';
mkdirSync(N2_SHOTS, { recursive: true });
const shoot = async (page: Page, name: string): Promise<void> => {
  await page.screenshot({ path: join(SHOTS, `${name}.png`) });
};

/** On every drawn frame while a hint shows: anything playable under the bar (S2.2), street or room. */
async function watchBar(page: Page): Promise<void> {
  await page.evaluate(() => {
    const log = { frames: 0, hits: [] as string[], words: [] as string[], button: [] as string[] };
    (window as unknown as { __bar: typeof log }).__bar = log;
    const hit = (a: { x: number; y: number; w: number; h: number }, b: typeof a) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    const frame = (): void => {
      const g = window.__game!;
      const bar = g.hintBar;
      if (bar.words && g.screen === 'play') {
        log.frames++;
        if (!log.words.includes(bar.words)) log.words.push(bar.words);
        for (const d of g.drawn) if (hit(bar, d) && log.hits.length < 20) log.hits.push(`${d.what} at step ${g.steps} under "${bar.words}"`);
        const wb = g.wellButton;
        if (wb && hit(bar, wb) && log.button.length < 5) log.button.push(`${wb.kind} at step ${g.steps}`);
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
}
const barLog = (page: Page) => page.evaluate(() => (window as unknown as { __bar: { frames: number; hits: string[]; words: string[]; button: string[] } }).__bar);

async function openStreet(page: Page, id: string) {
  await page.goto(`./?level=${id}`);
  await startRun(page);
  await expect.poll(() => page.evaluate(() => window.__game!.steps)).toBeGreaterThan(5);
  expect(await page.evaluate(() => window.__game!.level.id)).toBe(id);
}

test('street 2 by touch: to the well, Go down, every gift in the room, Go up at the exit, a lost life keeps the parcel, on to the bus', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await openStreet(page, 'lagos-2');
  await watchBar(page);
  const level = await page.evaluate(() => window.__game!.level);
  const well = level.wells[0]!;
  expect(well).toEqual({ x: 2950, exitX: 4100, room: 'lagos-well' });
  const cdp = await page.context().newCDPSession(page);
  const h = hands(cdp);
  const bot = await wellBot(page, h);

  // Two thumbs to just short of the well (the pits before it jumped), then walk up to it.
  let arrowShot = false;
  await playStreetByHand(page, h, {
    until: (s) => s.h.x >= well.x - 150,
    onPoll: async (s) => {
      if (!arrowShot && s.h.x >= well.x - 380) {
        arrowShot = true;
        await shoot(page, '1-entrance-arrow');
      }
    },
  });
  expect(await page.evaluate(() => window.__game!.wellButton)).toBeNull(); // not at the well yet
  const hint = await page.evaluate(() => window.__game!.toast);
  const at = await bot.walkTo(well.x, 10);
  expect(Math.abs(at.h.x - well.x)).toBeLessThanOrEqual(20);
  expect(at.r.atWell).toBe(well.x);
  // The well hint, touch words (S2.2 Words in hints).
  const bar0 = await barLog(page);
  expect([...bar0.words, hint]).toContain('A well! Stand by it. Press Go down.');
  const btn = (await page.evaluate(() => window.__game!.wellButton))!;
  expect(btn.label).toBe('Go down');
  // S2.5: 8 px above the crank top, below the top 56 px, at least 56 tall, 2.2 D wide.
  const layout = await page.evaluate(() => window.__game!.input.layout);
  expect(btn.h).toBe(Math.max(56, layout.d));
  expect(btn.w).toBe(Math.round(2.2 * layout.d));
  expect(btn.y).toBeGreaterThanOrEqual(56);
  await shoot(page, '2-go-down-button');

  // Go down: the controls lock, the screen fades, the room.
  await bot.tapWellButton('down');
  await expect.poll(() => page.evaluate(() => window.__game!.run.phase)).toBe('wellDown');
  const before = await snap(page);
  const frozen = before.r.hazards.map((z) => `${z.kind}@${z.x.toFixed(1)}:${z.mode}`);
  await page.waitForTimeout(550);
  await shoot(page, '3-going-down');
  expect(await page.evaluate(() => window.__game!.wellButton)).toBeNull();
  await bot.phase('room');
  await expect(page.getByText('A secret room! Grab the kobo. Stand under the rope to go back up.')).toBeVisible();
  await page.waitForTimeout(300);
  await shoot(page, '4-room-arrive');
  const inRoom = await snap(page);
  expect(inRoom.r.below).toBe(true);
  expect(inRoom.r.room!.id).toBe('lagos-well');
  expect(inRoom.h.x).toBe(60);
  // The street waits exactly as it was.
  await page.waitForTimeout(1000);
  const still = await snap(page);
  expect(still.r.hazards.map((z) => `${z.kind}@${z.x.toFixed(1)}:${z.mode}`)).toEqual(frozen);

  // Every gift.
  const kobo0 = still.r.kobo;
  const room = await bot.playRoom(async (name) => shoot(page, `5-${name}`));
  console.log(`room by hand: kobo ${room.r.kobo - kobo0}, crate open ${room.r.room!.crates[0]!.open}, parcel ${room.r.parcel}, hero x ${room.h.x}`);
  expect(room.r.room!.coins.filter((c) => !c.taken)).toEqual([]);
  expect(room.r.room!.crates[0]!.open).toBe(true);
  expect(room.r.room!.gift!.taken).toBe(true);
  expect(room.r.parcel).toBe(true);
  expect(room.r.kobo - kobo0).toBe(17);
  await expect(page.locator('.hud-parcel')).toBeVisible();
  await expect(page.locator('.hud-parcel')).toHaveText('Parcel');
  expect(room.r.power.shield).toBe(false); // not a shield on the street
  expect(room.r.lives).toBe(room.r.maxLives);
  expect(room.r.underRope).toBe(true);
  await shoot(page, '6-go-up-button');

  // Go up: out at the exit well + 30, blinking safety, "Back on the street!".
  await bot.tapWellButton('up');
  await expect.poll(() => page.evaluate(() => window.__game!.run.phase)).toBe('wellUp');
  await page.waitForTimeout(500);
  await shoot(page, '7-going-up');
  await bot.phase('run');
  const up = await snap(page);
  expect(up.h.x).toBe(well.exitX + 30);
  expect(up.h.dir).toBe(1);
  expect(up.r.safe).toBeGreaterThan(0);
  expect(up.r.below).toBe(false);
  for (const z of up.r.hazards) if (z.mode === 'move') expect(Math.abs(z.x - well.exitX)).toBeGreaterThan(300);
  await expect(page.getByText('Back on the street!')).toBeVisible();
  await page.waitForTimeout(400);
  await shoot(page, '8-back-on-street');

  // On to the bus, walking into the first big pit once: the lost life keeps the parcel.
  const { stats, last } = await playStreetByHand(page, h, { fallIntoOnce: (x) => x === 5800 });
  await h.upAll();
  console.log(`street 2 after the room: ${last.r.phase} at x ${last.h.x.toFixed(0)}, lives ${last.r.lives}, kobo ${last.r.kobo}, lost at ${stats.lostAt.map((x) => x.toFixed(0)).join(', ')}, parcel ${last.r.parcel}`);
  expect(stats.lostAt.length).toBeGreaterThanOrEqual(1);
  expect(last.r.parcel).toBe(true);
  expect(last.r.phase).toBe('bus');
  const cleared = page.getByRole('dialog', { name: 'Street cleared!' });
  await expect(cleared).toBeVisible({ timeout: 6000 });
  // N2: the parcel is saved on the bus, and the cleared card says so (S2.10).
  await expect(cleared.getByText(`Computer Village is moving again, thanks to you! You got ${formatMoney(last.r.kobo * 10)}.`)).toBeVisible();
  await expect(cleared.getByText('Your garri parcel is saved for Go-Slow Hall.')).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('gidi-progress')!))).toEqual({
    // Version 2 (slice 3, N3): bests are whole kobo, 10 a coin.
    v: 2,
    states: { lagos: { streets: { 2: { done: true, best: last.r.kobo * 10 } }, parcel: true, hall: { done: false, best: 0 } } },
  });
  // The longest case (Computer Village, the parcel line) fits the short screens (po M4 bug 1).
  await checkCardFits(page, 'Next street', async (at) => {
    await page.screenshot({ path: join(N2_SHOTS, `${at}-cleared-parcel.png`) });
  });
  for (const vp of [{ width: 932, height: 430 }]) {
    const before = page.viewportSize()!;
    await page.setViewportSize(vp);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await page.screenshot({ path: join(N2_SHOTS, `${vp.width}x${vp.height}-cleared-parcel.png`) });
    await page.setViewportSize(before);
  }

  const bar = await barLog(page);
  console.log(`hint bar: ${bar.frames} frames, words ${bar.words.join(' | ')}; covered: ${bar.hits.join('; ') || 'nothing'}`);
  expect(bar.hits, 'nothing playable under the hint bar, street or room').toEqual([]);
  expect(bar.button, 'the hint bar never over Go down or Go up').toEqual([]);
  expect(bar.words).toContain('A secret room! Grab the kobo. Stand under the rope to go back up.');
  expect(bar.words).toContain('Garri parcel! Shield for the hall.');
  expect(errors).toEqual([]);
});

test('the room by touch: pause and keep playing below; Start again loses the parcel and the room is full again', async ({ page }) => {
  test.setTimeout(200_000);
  await openStreet(page, 'lagos-2');
  const h = hands(await page.context().newCDPSession(page));
  const bot = await wellBot(page, h);
  await playStreetByHand(page, h, { until: (s) => s.h.x >= 2950 - 150 });
  await bot.walkTo(2950, 10);
  await bot.tapWellButton('down');
  await bot.phase('room');
  // The parcel only: from under the middle shelf, a held jump.
  await bot.walkTo(295, 4);
  await bot.jump(true);
  await expect.poll(() => page.evaluate(() => window.__game!.run.parcel)).toBe(true);
  // Pause below: the pause screen, then back in the room as it was.
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.getByRole('button', { name: 'Pause' }).tap();
  const paused = page.getByRole('dialog', { name: 'Paused' });
  await expect(paused).toBeVisible();
  expect(await page.evaluate(() => window.__game!.wellButton)).toBeNull();
  await waitOutTapLock(page);
  await paused.getByRole('button', { name: /^Keep (running|playing)$/ }).tap();
  await expect.poll(() => page.evaluate(() => window.__game!.screen)).toBe('play');
  expect((await snap(page)).r.phase).toBe('room');
  // Start again: a fresh street, no parcel, the room full again.
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.getByRole('button', { name: 'Pause' }).tap();
  await waitOutTapLock(page);
  await page.getByRole('dialog', { name: 'Paused' }).getByRole('button', { name: /^Start (the level )?again$/ }).tap();
  await expect.poll(() => page.evaluate(() => window.__game!.screen)).toBe('play');
  const fresh = await snap(page);
  expect(fresh.r.parcel).toBe(false);
  expect(fresh.r.below).toBe(false);
  expect(fresh.r.kobo).toBe(0);
  await expect(page.locator('.hud-parcel')).toBeHidden();
});

test.describe('by keys on a computer', () => {
  test.use({ viewport: { width: 1280, height: 720 }, hasTouch: false, isMobile: false });

  /** Holds a key until the hero's x passes x (or within `near` of it), then lets go and waits to stop. */
  async function keyTo(page: Page, x: number, near = 8): Promise<void> {
    for (let i = 0; i < 8; i++) {
      const s = await snap(page);
      if (Math.abs(s.h.x - x) <= near) return;
      const fwd = x > s.h.x;
      await page.keyboard.down(fwd ? 'ArrowRight' : 'ArrowLeft');
      await page.waitForFunction(
        ({ x, fwd }) => {
          const g = window.__game!;
          const early = g.hero.speed > 100 ? 14 : 4;
          return fwd ? g.hero.x >= x - early : g.hero.x <= x + early;
        },
        { x, fwd },
        { polling: 'raf', timeout: 20_000 },
      );
      await page.keyboard.up(fwd ? 'ArrowRight' : 'ArrowLeft');
      await page.waitForFunction(() => window.__game!.hero.vx === 0 && window.__game!.hero.grounded, null, { polling: 'raf' });
    }
  }

  test('street 3: back to the secret well, Down goes down; in the room S does nothing, E goes up at 1330', async ({ page }) => {
    test.setTimeout(120_000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('./?level=lagos-3');
    await page.getByRole('button', { name: /^(Make your hero|Play)$/ }).click();
    const builder = page.getByRole('dialog', { name: 'Make your hero' });
    if (await builder.isVisible()) await builder.getByRole('button', { name: 'Start running' }).click();
    await expect.poll(() => page.evaluate(() => window.__game!.screen)).toBe('play');
    await keyTo(page, 160);
    const at = await snap(page);
    expect(at.r.atWell).toBe(160);
    const btn = (await page.evaluate(() => window.__game!.wellButton))!;
    expect(btn.label).toBe('Go down (↓)');
    await page.screenshot({ path: join(SHOTS, 'k1-keys-go-down.png') });
    // Enter would also go down here; Down does.
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => page.evaluate(() => window.__game!.run.phase)).toBe('wellDown');
    await expect.poll(() => page.evaluate(() => window.__game!.run.phase), { timeout: 5000 }).toBe('room');
    // Enter at the arriving bucket does nothing: not under the rope.
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    expect((await snap(page)).r.phase).toBe('room');
    await keyTo(page, 500, 6);
    const under = await snap(page);
    expect(under.r.underRope).toBe(true);
    expect((await page.evaluate(() => window.__game!.wellButton))!.label).toBe('Go up (Enter)');
    await page.screenshot({ path: join(SHOTS, 'k2-keys-go-up.png') });
    // Down and S do nothing under the rope; E goes up.
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('KeyS');
    await page.waitForTimeout(200);
    expect((await snap(page)).r.phase).toBe('room');
    await page.keyboard.press('KeyE');
    await expect.poll(() => page.evaluate(() => window.__game!.run.phase)).toBe('wellUp');
    await expect.poll(() => page.evaluate(() => window.__game!.run.phase), { timeout: 5000 }).toBe('run');
    const out = await snap(page);
    expect(out.h.x).toBe(1330);
    await expect(page.getByText('Back on the street!')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('street 2 by keys: the well hint says ↓, Enter goes down, Enter comes up', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('./?level=lagos-2');
    await page.getByRole('button', { name: /^(Make your hero|Play)$/ }).click();
    const builder = page.getByRole('dialog', { name: 'Make your hero' });
    if (await builder.isVisible()) await builder.getByRole('button', { name: 'Start running' }).click();
    await expect.poll(() => page.evaluate(() => window.__game!.screen)).toBe('play');
    // The run to the well needs the pits jumped: Space at each lip, held for the wider ones.
    const level = await page.evaluate(() => window.__game!.level);
    const words: string[] = [];
    await page.keyboard.down('ArrowRight');
    for (;;) {
      const s = await snap(page);
      const t = await page.evaluate(() => window.__game!.toast);
      if (t && !words.includes(t)) words.push(t);
      if (s.h.x >= 2950 - 150 || s.r.phase !== 'run') break;
      const gap = level.gaps.find(([a]) => a - s.h.x > -4 && a - s.h.x < 32);
      const hz = s.r.hazards.find((z) => (z.mode === 'wait' || z.mode === 'move') && z.x - s.h.x > 0 && z.x - s.h.x < 80);
      if (s.h.grounded && (gap || hz)) {
        await page.keyboard.down('Space');
        await page.waitForFunction(() => window.__game!.hero.vy >= 0 && !window.__game!.hero.grounded, null, { polling: 'raf' });
        await page.keyboard.up('Space');
      }
    }
    await page.keyboard.up('ArrowRight');
    await page.waitForFunction(() => window.__game!.hero.vx === 0 && window.__game!.hero.grounded, null, { polling: 'raf' });
    await keyTo(page, 2950);
    const t = await page.evaluate(() => window.__game!.toast);
    if (t) words.push(t);
    expect(words).toContain('A well! Stand by it. Press ↓.');
    await page.keyboard.press('Enter');
    await expect.poll(() => page.evaluate(() => window.__game!.run.phase), { timeout: 5000 }).toBe('room');
    await keyTo(page, 500, 6);
    await page.keyboard.press('Enter');
    await expect.poll(() => page.evaluate(() => window.__game!.run.phase), { timeout: 5000 }).toBe('run');
    expect((await snap(page)).h.x).toBe(4130);
  });
});

test('skipping the well never blocks the street: a thumb walks past it to the bus', async ({ page }) => {
  test.setTimeout(200_000);
  await openStreet(page, 'lagos-2');
  const h = hands(await page.context().newCDPSession(page));
  let sawButton = false;
  const { last } = await playStreetByHand(page, h, {
    onPoll: async (s) => {
      if (s.r.atWell !== null && (await page.evaluate(() => window.__game!.wellButton?.kind)) === 'down') sawButton = true;
    },
  });
  await h.upAll();
  expect(last.r.phase).toBe('bus');
  expect(last.r.parcel).toBe(false);
  // Running past, the hero was in the well's zone for a moment.
  console.log(`walked past the well: Go down seen ${sawButton}`);
});

/** Boxes of everything in the HUD row that shows now, CSS px. */
async function hudBoxes(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('.hud-left > span, .hud-btn')]
      .filter((e) => !e.hidden && e.offsetParent !== null)
      .map((e) => {
        const r = e.getBoundingClientRect();
        return { what: e.className, text: e.textContent ?? '', x: r.x, y: r.y, w: r.width, h: r.height };
      }),
  );
}
type Box = { x: number; y: number; w: number; h: number };
const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** design.md HUD: one row, inside the top 56 px; Sound and Pause never under a well button. */
async function expectOneRow(page: Page, label: string): Promise<void> {
  const boxes = await hudBoxes(page);
  const chips = boxes.filter((b) => !b.what.includes('hud-btn'));
  const btns = boxes.filter((b) => b.what.includes('hud-btn'));
  expect(btns, `${label}: Sound and Pause`).toHaveLength(2);
  for (const b of boxes) expect(b.y + b.h, `${label}: ${b.what} "${b.text}" inside the top 56 px`).toBeLessThanOrEqual(56);
  const mid = (b: Box) => b.y + b.h / 2;
  for (const b of boxes) expect(Math.abs(mid(b) - mid(boxes[0]!)), `${label}: ${b.what} "${b.text}" on the one row`).toBeLessThanOrEqual(8);
  // Nothing overlaps, and the chips end before Sound starts.
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) expect(overlaps(boxes[i]!, boxes[j]!), `${label}: ${boxes[i]!.what} over ${boxes[j]!.what}`).toBe(false);
  expect(Math.max(...chips.map((c) => c.x + c.w))).toBeLessThanOrEqual(Math.min(...btns.map((b) => b.x)));
}

/**
 * qa L3: on a narrow screen with the parcel, the HUD wrapped to two rows; Sound and Pause dropped
 * under the Go up button, and the tap on Go up also opened Pause. Both causes, at three sizes:
 * (a) the HUD stays one row with every chip; (b) a well press never presses what is under it.
 */
test.describe('the HUD row and the well button on narrow phones (qa L3)', () => {
  for (const [width, height] of [
    [320, 236],
    [340, 240],
    [400, 240],
    [932, 430],
  ] as const) {
    test(`${width}x${height}: every HUD chip at once (kobo 999, parcel, shield, fast, strong) stays on one row`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await openStreet(page, 'lagos-3');
      // The hero stands still at the start (street 3 is walked by hand), so the HUD does not
      // change by itself: show every chip, the longest kobo count, and let the HUD fit again.
      await page.evaluate(() => {
        for (const e of document.querySelectorAll<HTMLElement>('.hud-food')) e.hidden = false;
        document.querySelector('.hud-kobo .hud-text')!.innerHTML = '<span class="hud-word">Kobo </span>999';
        // The food slots in HUD order: garri (shield), corn (fast), amala (strong).
        const [garri, corn, amala] = document.querySelectorAll<HTMLElement>('.hud-food:not(.hud-parcel) .hud-text');
        garri!.innerHTML = '<span class="hud-word">Shield</span>';
        // The widest counts: corn and amala both start at 12 s.
        corn!.innerHTML = '<span class="hud-word">Fast </span>12';
        amala!.innerHTML = '<span class="hud-word">Strong </span>12';
        window.dispatchEvent(new Event('resize'));
      });
      await page.waitForTimeout(50);
      await expectOneRow(page, `${width}x${height} every chip`);
      // Each chip keeps its words for screen readers, even when only its icon shows.
      await expect(page.locator('.hud-parcel')).toContainText('Parcel');
    });
  }

  for (const [width, height] of [
    [320, 236],
    [340, 240],
    [400, 240],
    [932, 430],
  ] as const) {
    test(`${width}x${height}: Go down over Pause does not pause; with the parcel the HUD is one row, Go up does not pause and the hero comes out; Pause and Sound still work`, async ({ page }) => {
      test.setTimeout(240_000);
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.setViewportSize({ width, height });
      await openStreet(page, 'lagos-3');
      const h = hands(await page.context().newCDPSession(page));
      const bot = await wellBot(page, h);
      const paused = page.getByRole('dialog', { name: 'Paused' });

      // (b) Back to the secret well at 160. Put Pause right under Go down, then tap Go down: the
      // phone's click after the tap must not press Pause.
      await bot.walkTo(160, 10);
      await expect.poll(() => page.evaluate(() => window.__game!.wellButton?.kind ?? null)).toBe('down');
      const down = (await page.evaluate(() => window.__game!.wellButton))!;
      await page.addStyleTag({
        content: `.hud-pause{position:fixed;left:${Math.round(down.x + down.w / 2 - 22)}px;top:${Math.round(down.y + down.h / 2 - 22)}px}`,
      });
      await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
      await bot.tapWellButton('down');
      await expect.poll(() => page.evaluate(() => window.__game!.run.phase)).toBe('wellDown');
      await page.waitForTimeout(500);
      await expect(paused).toBeHidden();
      expect(await page.evaluate(() => window.__game!.paused)).toBe(false);
      // The test is fair: once the button hid, Pause was what lay under the finger.
      const under = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest('button')?.className ?? '', { x: down.x + down.w / 2, y: down.y + down.h / 2 });
      expect(under).toContain('hud-pause');
      await page.evaluate(() => document.querySelectorAll('style').forEach((s) => s.textContent?.startsWith('.hud-pause{position:fixed') && s.remove()));

      // (a) Every gift in the room (about 20 kobo and the parcel), then under the rope.
      await bot.playRoom();
      const s = await snap(page);
      expect(s.r.parcel).toBe(true);
      expect(s.r.underRope).toBe(true);
      expect(s.r.kobo).toBeGreaterThanOrEqual(10);
      await expect(page.locator('.hud-parcel')).toBeVisible();
      await expect.poll(() => page.evaluate(() => window.__game!.wellButton?.kind ?? null)).toBe('up');
      await expectOneRow(page, `${width}x${height} parcel and kobo ${s.r.kobo}`);
      const up = (await page.evaluate(() => window.__game!.wellButton))!;
      for (const b of (await hudBoxes(page)).filter((b) => b.what.includes('hud-btn'))) expect(overlaps(b, up), `${b.what} under Go up`).toBe(false);
      await page.screenshot({ path: join(SHOTS, `hud-one-row-parcel-${width}x${height}.png`) });

      // Tap the middle of Go up: up the rope, no Pause, out on the street at the exit well.
      await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
      await bot.tapWellButton('up');
      await expect.poll(() => page.evaluate(() => window.__game!.run.phase)).toBe('wellUp');
      await page.waitForTimeout(500);
      await expect(paused).toBeHidden();
      await expect.poll(() => page.evaluate(() => window.__game!.run.phase), { timeout: 5000 }).toBe('run');
      expect((await snap(page)).h.x).toBe(1330);
      expect(await page.evaluate(() => window.__game!.paused)).toBe(false);

      // At other times Sound and Pause work as before.
      const sound = page.locator('.hud-sound');
      const was = await sound.getAttribute('aria-label');
      await sound.tap();
      await expect(sound).not.toHaveAttribute('aria-label', was!);
      await sound.tap();
      await expect(sound).toHaveAttribute('aria-label', was!);
      await page.getByRole('button', { name: 'Pause' }).tap();
      await expect(paused).toBeVisible();
      await waitOutTapLock(page);
      await paused.getByRole('button', { name: /^Keep (running|playing)$/ }).tap();
      await expect.poll(() => page.evaluate(() => window.__game!.screen)).toBe('play');
      expect(errors).toEqual([]);
    });
  }
});
